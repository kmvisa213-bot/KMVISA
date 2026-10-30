"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCountryByCode } from "@/lib/countries";
import { APPLICATION_TYPES, getVisaType } from "@/lib/visa-catalog";

type Client = { id: string; full_name: string; phone: string };

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  source: string;
  client_id: string | null;
  agency_id: string | null;
  representative_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
};

type VisaInfo = {
  request_id: string;
  country: string | null;
  visa_category: string | null;
  application_type: string | null;
};

type Agency = { id: string; name: string };
type Representative = { id: string; full_name: string };

const SERVICE_LABELS: Record<string, string> = {
  visa: "تأشيرة",
  flight_ticket: "تذكرة طيران",
  hotel_booking: "حجز فندق",
  other: "أخرى",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "استفسار",
  closed_no_request: "مغلق بدون طلب",
  request: "طلب",
  quoted: "مُسعَّر",
  confirmed: "مؤكد",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "يدوي",
  public_intake: "من الموقع",
};

export default function AllRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [visaByRequest, setVisaByRequest] = useState<Record<string, VisaInfo>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll() {
    const [reqRes, clientRes, agencyRes, repRes, visaRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select(
          "id, reference, service_type, status, source, client_id, agency_id, representative_id, contact_name, contact_phone, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, full_name, phone"),
      supabase.from("agencies").select("id, name"),
      supabase.from("agency_representatives").select("id, full_name"),
      supabase
        .from("visa_details")
        .select("request_id, country, visa_category, application_type"),
    ]);

    const error =
      reqRes.error ?? clientRes.error ?? agencyRes.error ?? repRes.error ?? visaRes.error;
    if (error) {
      setMessage("تعذّر تحميل البيانات: " + error.message);
      return;
    }

    setRequests((reqRes.data as RequestRow[]) ?? []);
    setClients((clientRes.data as Client[]) ?? []);
    setAgencies((agencyRes.data as Agency[]) ?? []);
    setRepresentatives((repRes.data as Representative[]) ?? []);

    const map: Record<string, VisaInfo> = {};
    for (const row of (visaRes.data as VisaInfo[]) ?? []) {
      map[row.request_id] = row;
    }
    setVisaByRequest(map);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Customer name and phone come from the customer file when linked,
  // otherwise from the contact details entered on the website.
  function customerName(row: RequestRow): string {
    if (row.agency_id) {
      const agency = agencies.find((a) => a.id === row.agency_id)?.name ?? "—";
      const rep = representatives.find((r) => r.id === row.representative_id)?.full_name ?? "—";
      return `${agency} · ${rep}`;
    }
    if (row.client_id) {
      return clients.find((c) => c.id === row.client_id)?.full_name ?? "—";
    }
    return row.contact_name ?? "—";
  }

  function customerPhone(row: RequestRow): string {
    if (row.client_id) {
      return clients.find((c) => c.id === row.client_id)?.phone ?? "—";
    }
    return row.contact_phone ?? "—";
  }

  function countryLabel(code: string | null): string {
    if (!code) return "—";
    return getCountryByCode(code)?.nameAr ?? code;
  }

  function visaTypeLabel(value: string | null): string {
    if (!value) return "—";
    return getVisaType(value)?.labelAr ?? value;
  }

  function applicationTypeLabel(value: string | null): string {
    if (!value) return "—";
    return APPLICATION_TYPES.find((t) => t.value === value)?.labelAr ?? value;
  }

  function formatDate(value: string): string {
    return value.slice(0, 10);
  }

  // Approval (decision D2): creates the customer file if name+phone is new,
  // then links this request to it and moves it to "request".
  async function approveInquiry(row: RequestRow) {
    setMessage(null);

    let clientIdToLink = row.client_id;

    if (!clientIdToLink) {
      const name = row.contact_name?.trim();
      const phone = row.contact_phone?.trim();
      if (!name || !phone) {
        setMessage("لا توجد بيانات اتصال كافية لإنشاء ملف الزبون.");
        return;
      }

      const existing = clients.find(
        (c) =>
          c.phone === phone && c.full_name.trim().toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        clientIdToLink = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("clients")
          .insert({ full_name: name, phone })
          .select("id")
          .single();

        if (createError || !created) {
          setMessage("تعذّر إنشاء ملف الزبون: " + (createError?.message ?? "خطأ غير معروف"));
          return;
        }
        clientIdToLink = created.id;
      }
    }

    const { error } = await supabase
      .from("service_requests")
      .update({ client_id: clientIdToLink, status: "request" })
      .eq("id", row.id);

    if (error) {
      setMessage("تعذّر تحويل الطلب: " + error.message);
      return;
    }

    setMessage("تمت الموافقة، وربط الطلب بملف الزبون.");
    loadAll();
  }

  return (
    <main style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>كل الطلبات</h1>
        <button
          onClick={() => router.push("/dashboard/requests/new")}
          style={{ padding: "0.5rem 0.9rem" }}
        >
          طلب جديد
        </button>
      </div>

      <p>
        <button onClick={() => router.push("/dashboard/clients")} style={{ padding: "0.4rem 0.8rem" }}>
          صفحة الزبائن
        </button>
      </p>

      {message && <p>{message}</p>}

      {requests.length === 0 && <p>لا توجد طلبات بعد.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {requests.map((row) => {
          const visa = visaByRequest[row.id];

          return (
            <li
              key={row.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{row.reference}</strong>
                <span>{STATUS_LABELS[row.status] ?? row.status}</span>
              </div>

              <div>الزبون: {customerName(row)}</div>
              <div style={{ direction: "ltr", textAlign: "right" }}>
                الهاتف: {customerPhone(row)}
              </div>

              <div>
                الخدمة: {SERVICE_LABELS[row.service_type] ?? row.service_type} ·{" "}
                {SOURCE_LABELS[row.source] ?? row.source}
              </div>

              {row.service_type === "visa" && (
                <>
                  <div>الوجهة: {countryLabel(visa?.country ?? null)}</div>
                  <div>نوع التأشيرة: {visaTypeLabel(visa?.visa_category ?? null)}</div>
                  <div>نوع الطلب: {applicationTypeLabel(visa?.application_type ?? null)}</div>
                </>
              )}

              <div>تاريخ الطلب: {formatDate(row.created_at)}</div>

              <div style={{ marginTop: "0.5rem" }}>
                <button
                  onClick={() => router.push(`/dashboard/requests/${row.id}`)}
                  style={{ marginRight: "0.5rem", padding: "0.4rem 0.8rem" }}
                >
                  فتح الطلب
                </button>

                {row.status === "inquiry" && (
                  <button onClick={() => approveInquiry(row)} style={{ padding: "0.4rem 0.8rem" }}>
                    موافقة الزبون
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
