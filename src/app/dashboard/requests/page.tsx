"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCountryByCode } from "@/lib/countries";
import { APPLICATION_TYPES, getVisaType } from "@/lib/visa-catalog";

type Category = "b2c" | "b2b";

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

export default function RequestsPage() {
  const router = useRouter();

  const [category, setCategory] = useState<Category>("b2c");
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
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "b2b") setCategory("b2b");
    loadAll();
  }, []);

  // Each category shows only its own requests
  const visibleRequests = requests.filter((row) =>
    category === "b2b" ? row.agency_id !== null : row.agency_id === null
  );

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

  // Approval (decision D2). B2C: creates the customer file if name+phone is new.
  // B2B: the agency is already known, so only the status changes.
  async function approveInquiry(row: RequestRow) {
    setMessage(null);

    if (row.agency_id) {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: "request" })
        .eq("id", row.id);

      if (error) {
        setMessage("تعذّر تحويل الطلب: " + error.message);
        return;
      }
      setMessage("تمت الموافقة على طلب الوكالة.");
      loadAll();
      return;
    }

    let clientIdToLink = row.client_id;

    if (!clientIdToLink) {
      const name = row.contact_name?.trim();
      const phone = row.contact_phone?.trim();
      if (!name || !phone) {
        setMessage("لا توجد بيانات اتصال كافية لإنشاء ملف الزبون.");
        return;
      }

      const existing = clients.find(
        (c) => c.phone === phone && c.full_name.trim().toLowerCase() === name.toLowerCase()
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

  const isB2b = category === "b2b";

  return (
    <main style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1rem" }}>
      <button onClick={() => router.push("/dashboard")} style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem" }}>
        رجوع إلى الأقسام
      </button>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setCategory("b2c")}
          style={{
            flex: 1,
            padding: "0.6rem",
            fontWeight: category === "b2c" ? "bold" : "normal",
            background: category === "b2c" ? "#eef" : "white",
          }}
        >
          طلبات B2C
        </button>
        <button
          onClick={() => setCategory("b2b")}
          style={{
            flex: 1,
            padding: "0.6rem",
            fontWeight: category === "b2b" ? "bold" : "normal",
            background: category === "b2b" ? "#eef" : "white",
          }}
        >
          طلبات B2B
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{isB2b ? "طلبات B2B (الوكالات)" : "طلبات B2C (الأفراد)"}</h1>
        <button
          onClick={() => router.push(`/dashboard/requests/new?type=${category}`)}
          style={{ padding: "0.5rem 0.9rem" }}
        >
          طلب جديد
        </button>
      </div>

      {message && <p>{message}</p>}

      {visibleRequests.length === 0 && <p>لا توجد طلبات في هذا القسم بعد.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {visibleRequests.map((row) => {
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

              <div>{isB2b ? "الوكالة والممثل" : "الزبون"}: {customerName(row)}</div>
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

              <div>تاريخ الطلب: {row.created_at.slice(0, 10)}</div>

              <div style={{ marginTop: "0.5rem" }}>
                <button
                  onClick={() => router.push(`/dashboard/requests/${row.id}`)}
                  style={{ marginRight: "0.5rem", padding: "0.4rem 0.8rem" }}
                >
                  فتح الطلب
                </button>

                {row.status === "inquiry" && (
                  <button onClick={() => approveInquiry(row)} style={{ padding: "0.4rem 0.8rem" }}>
                    موافقة
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
