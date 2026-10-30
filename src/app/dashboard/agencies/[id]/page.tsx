"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCountryByCode } from "@/lib/countries";
import { APPLICATION_TYPES, getVisaType } from "@/lib/visa-catalog";

type Agency = {
  id: string;
  name: string;
  approval_status: string;
  notes: string | null;
};

type Representative = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  representative_id: string | null;
  created_at: string;
};

type VisaInfo = {
  request_id: string;
  country: string | null;
  visa_category: string | null;
  application_type: string | null;
};

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

export default function AgencyProfilePage() {
  const params = useParams<{ id: string }>();
  const agencyId = params.id;
  const router = useRouter();

  const [agency, setAgency] = useState<Agency | null>(null);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [visaByRequest, setVisaByRequest] = useState<Record<string, VisaInfo>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: a, error: aError } = await supabase
        .from("agencies")
        .select("id, name, approval_status, notes")
        .eq("id", agencyId)
        .single();

      if (aError || !a) {
        setMessage("تعذّر تحميل ملف الوكالة.");
        return;
      }
      setAgency(a as Agency);

      const [repRes, reqRes] = await Promise.all([
        supabase
          .from("agency_representatives")
          .select("id, full_name, phone, is_active")
          .eq("agency_id", agencyId)
          .order("full_name", { ascending: true }),
        supabase
          .from("service_requests")
          .select("id, reference, service_type, status, representative_id, created_at")
          .eq("agency_id", agencyId)
          .order("created_at", { ascending: false }),
      ]);

      const error = repRes.error ?? reqRes.error;
      if (error) {
        setMessage("تعذّر تحميل البيانات: " + error.message);
        return;
      }

      setRepresentatives((repRes.data as Representative[]) ?? []);
      const reqRows = (reqRes.data as RequestRow[]) ?? [];
      setRequests(reqRows);

      if (reqRows.length > 0) {
        const { data: visaData } = await supabase
          .from("visa_details")
          .select("request_id, country, visa_category, application_type")
          .in("request_id", reqRows.map((r) => r.id));

        const map: Record<string, VisaInfo> = {};
        for (const row of (visaData as VisaInfo[]) ?? []) {
          map[row.request_id] = row;
        }
        setVisaByRequest(map);
      }
    }

    load();
  }, [agencyId]);

  function representativeName(id: string | null): string {
    if (!id) return "—";
    return representatives.find((r) => r.id === id)?.full_name ?? "—";
  }

  if (!agency) {
    return (
      <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
        <p>{message ?? "جار التحميل..."}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <button
        onClick={() => router.push("/dashboard/agencies")}
        style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem" }}
      >
        رجوع إلى الوكالات
      </button>

      <h1>{agency.name}</h1>
      <div>الحالة: {agency.approval_status === "approved" ? "معتمدة" : "موقوفة"}</div>
      {agency.notes && <p>{agency.notes}</p>}

      <h2>الممثلون ({representatives.length})</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {representatives.map((rep) => (
          <li key={rep.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            <strong>{rep.full_name}</strong>
            {rep.phone && <div style={{ direction: "ltr", textAlign: "right" }}>{rep.phone}</div>}
            <div>{rep.is_active ? "نشط" : "موقوف"}</div>
          </li>
        ))}
      </ul>
      <button
        onClick={() => router.push("/dashboard/representatives")}
        style={{ marginBottom: "1.5rem", padding: "0.4rem 0.8rem" }}
      >
        إدارة الممثلين
      </button>

      <h2>طلبات الوكالة ({requests.length})</h2>
      {requests.length === 0 && <p>لا توجد طلبات لهذه الوكالة بعد.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {requests.map((row) => {
          const visa = visaByRequest[row.id];
          const category = visa?.visa_category ? getVisaType(visa.visa_category) : undefined;

          return (
            <li
              key={row.id}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem", marginBottom: "0.75rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{row.reference}</strong>
                <span>{STATUS_LABELS[row.status] ?? row.status}</span>
              </div>
              <div>الممثل: {representativeName(row.representative_id)}</div>
              <div>الخدمة: {SERVICE_LABELS[row.service_type] ?? row.service_type}</div>
              {row.service_type === "visa" && visa && (
                <>
                  <div>الوجهة: {visa.country ? getCountryByCode(visa.country)?.nameAr ?? visa.country : "—"}</div>
                  <div>نوع التأشيرة: {category?.labelAr ?? "—"}</div>
                  <div>
                    نوع الطلب:{" "}
                    {APPLICATION_TYPES.find((t) => t.value === visa.application_type)?.labelAr ?? "—"}
                  </div>
                </>
              )}
              <div>تاريخ الطلب: {row.created_at.slice(0, 10)}</div>
              <button
                onClick={() => router.push(`/dashboard/requests/${row.id}`)}
                style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
              >
                فتح الطلب
              </button>
            </li>
          );
        })}
      </ul>

      {message && <p>{message}</p>}
    </main>
  );
}
