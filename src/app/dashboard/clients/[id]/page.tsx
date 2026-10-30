"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCountryByCode } from "@/lib/countries";
import { APPLICATION_TYPES, getVisaType } from "@/lib/visa-catalog";
import RequestFinance from "@/components/request-finance";

type Client = {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
};

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  created_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  label: string | null;
  agreed_price_dzd: number | null;
};

type VisaInfo = {
  request_id: string;
  country: string | null;
  visa_category: string | null;
  application_type: string | null;
  appointment_date: string | null;
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

export default function ClientFilePage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [linked, setLinked] = useState<RequestRow[]>([]);
  const [expenseByRequest, setExpenseByRequest] = useState<Record<string, number>>({});
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [openPanel, setOpenPanel] = useState<{ id: string; section: "price" | "expenses" } | null>(null);
  const [pending, setPending] = useState<RequestRow[]>([]);
  const [visaByRequest, setVisaByRequest] = useState<Record<string, VisaInfo>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: c, error: clientError } = await supabase
        .from("clients")
        .select("id, full_name, phone, notes")
        .eq("id", clientId)
        .single();

      if (clientError || !c) {
        setMessage("تعذّر تحميل ملف الزبون.");
        return;
      }
      const clientRow = c as Client;
      setClient(clientRow);

      // Requests already linked to this customer file
      const { data: linkedData, error: linkedError } = await supabase
        .from("service_requests")
        .select("id, reference, service_type, status, created_at, contact_name, contact_phone, label, agreed_price_dzd")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      // Website requests with the same phone that are not linked yet
      const { data: pendingData, error: pendingError } = await supabase
        .from("service_requests")
        .select("id, reference, service_type, status, created_at, contact_name, contact_phone")
        .is("client_id", null)
        .is("archived_at", null)
        .eq("contact_phone", clientRow.phone)
        .order("created_at", { ascending: false });

      if (linkedError || pendingError) {
        setMessage("تعذّر تحميل الطلبات: " + (linkedError?.message ?? pendingError?.message));
        return;
      }

      const linkedRows = (linkedData as RequestRow[]) ?? [];
      // Only requests with the same name AND phone belong to this customer (decision D234)
      const pendingRows = ((pendingData as RequestRow[]) ?? []).filter(
        (r) =>
          (r.contact_name ?? "").trim().toLowerCase() ===
          clientRow.full_name.trim().toLowerCase()
      );
      setLinked(linkedRows);
      setPending(pendingRows);

      // Supplier costs per request (registered supplier invoices only)
      if (linkedRows.length > 0) {
        const { data: supData } = await supabase
          .from("supplier_invoices")
          .select("linked_order_id, amount_dzd")
          .in("linked_order_id", linkedRows.map((r) => r.id))
          .in("status", ["pending", "paid"]);

        const totals: Record<string, number> = {};
        for (const row of (supData as { linked_order_id: string; amount_dzd: number }[]) ?? []) {
          totals[row.linked_order_id] = (totals[row.linked_order_id] ?? 0) + Number(row.amount_dzd);
        }
        setExpenseByRequest(totals);
      }

      const ids = [...linkedRows, ...pendingRows].map((r) => r.id);
      if (ids.length > 0) {
        const { data: visaData } = await supabase
          .from("visa_details")
          .select("request_id, country, visa_category, application_type, appointment_date")
          .in("request_id", ids);

        const map: Record<string, VisaInfo> = {};
        for (const row of (visaData as VisaInfo[]) ?? []) {
          map[row.request_id] = row;
        }
        setVisaByRequest(map);
      }
    }

    load();
  }, [clientId]);

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

  async function saveLabel(row: RequestRow) {
    const value = (labelDrafts[row.id] ?? row.label ?? "").trim();
    const { error } = await supabase
      .from("service_requests")
      .update({ label: value || null })
      .eq("id", row.id);

    if (error) {
      setMessage("تعذّر حفظ الاسم: " + error.message);
      return;
    }
    setLinked((prev) => prev.map((r) => (r.id === row.id ? { ...r, label: value || null } : r)));
    setMessage("تم حفظ اسم الخدمة.");
  }

  function renderRequest(row: RequestRow) {
    const visa = visaByRequest[row.id];
    const price = Number(row.agreed_price_dzd ?? 0);
    const expenses = expenseByRequest[row.id] ?? 0;
    const margin = price - expenses;
    const panelOpen = openPanel?.id === row.id;

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

        <div>{SERVICE_LABELS[row.service_type] ?? row.service_type}</div>

        <div style={{ marginTop: "0.5rem" }}>
          <input
            placeholder="اسم الخدمة (يدوياً)"
            value={labelDrafts[row.id] ?? row.label ?? ""}
            onChange={(e) => setLabelDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
            style={{ width: "100%", padding: "0.4rem" }}
          />
          <button onClick={() => saveLabel(row)} style={{ marginTop: "0.3rem", padding: "0.3rem 0.7rem" }}>
            حفظ الاسم
          </button>
        </div>

        <div style={{ marginTop: "0.5rem", direction: "ltr", textAlign: "right" }}>
          السعر: {price.toLocaleString("ar-DZ")} د.ج · المصاريف: {expenses.toLocaleString("ar-DZ")} د.ج ·
          هامش الربح الإجمالي: {margin.toLocaleString("ar-DZ")} د.ج
        </div>

        {row.service_type === "visa" && visa && (
          <>
            <div>الوجهة: {countryLabel(visa.country)}</div>
            <div>نوع التأشيرة: {visaTypeLabel(visa.visa_category)}</div>
            <div>نوع الطلب: {applicationTypeLabel(visa.application_type)}</div>
            <div>تاريخ الموعد: {visa.appointment_date ?? "—"}</div>
          </>
        )}

        {row.service_type === "visa" && !visa && (
          <div style={{ color: "#888" }}>تفاصيل التأشيرة لم تُسجَّل بعد.</div>
        )}

        <button
          onClick={() => router.push(`/dashboard/requests/${row.id}`)}
          style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
        >
          فتح الطلب
        </button>

        <button
          onClick={() => setOpenPanel({ id: row.id, section: "price" })}
          style={{ marginTop: "0.5rem", marginRight: "0.5rem", padding: "0.4rem 0.8rem" }}
        >
          تسعيرة
        </button>
        <button
          onClick={() => setOpenPanel({ id: row.id, section: "expenses" })}
          style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
        >
          مصاريف
        </button>

        {panelOpen && openPanel && (
          <div style={{ marginTop: "0.75rem" }}>
            <RequestFinance requestId={row.id} section={openPanel.section} />
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
            >
              إغلاق وتحديث الإجماليات
            </button>
          </div>
        )}
      </li>
    );
  }

  if (!client) {
    return (
      <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
        <p>{message ?? "جار التحميل..."}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <button
        onClick={() => router.push("/dashboard/clients")}
        style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem" }}
      >
        رجوع إلى الزبائن
      </button>

      <h1>{client.full_name}</h1>
      <div style={{ direction: "ltr", textAlign: "right" }}>{client.phone}</div>
      {client.notes && <p>{client.notes}</p>}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem", marginBottom: "1rem" }}>
        <strong>إجمالي هذا الملف</strong>
        <div>إجمالي الأسعار: {linked.reduce((s, r) => s + Number(r.agreed_price_dzd ?? 0), 0).toLocaleString("ar-DZ")} د.ج</div>
        <div>إجمالي المصاريف: {linked.reduce((s, r) => s + (expenseByRequest[r.id] ?? 0), 0).toLocaleString("ar-DZ")} د.ج</div>
        <div>
          هامش الربح الإجمالي للملف: {(
            linked.reduce((s, r) => s + Number(r.agreed_price_dzd ?? 0), 0) -
            linked.reduce((s, r) => s + (expenseByRequest[r.id] ?? 0), 0)
          ).toLocaleString("ar-DZ")} د.ج
        </div>
      </div>

      <h2>الطلبات المرتبطة بهذا الملف ({linked.length})</h2>
      {linked.length === 0 && <p>لا توجد طلبات مرتبطة بعد.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>{linked.map(renderRequest)}</ul>

      {pending.length > 0 && (
        <>
          <h2>طلبات من الموقع بنفس الرقم، بانتظار الربط ({pending.length})</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>{pending.map(renderRequest)}</ul>
        </>
      )}

      {message && <p>{message}</p>}
    </main>
  );
}
