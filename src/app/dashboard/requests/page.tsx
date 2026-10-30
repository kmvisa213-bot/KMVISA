"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Client = { id: string; full_name: string };

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  client_id: string | null;
  created_at: string;
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

export default function RequestsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [serviceType, setServiceType] = useState("visa");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    const [clientRes, reqRes] = await Promise.all([
      supabase.from("clients").select("id, full_name").order("full_name", { ascending: true }),
      supabase
        .from("service_requests")
        .select("id, reference, service_type, status, client_id, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const error = clientRes.error ?? reqRes.error;
    if (error) {
      setMessage("تعذّر تحميل البيانات: " + error.message);
      return;
    }

    setClients((clientRes.data as Client[]) ?? []);
    setRequests((reqRes.data as RequestRow[]) ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function clientName(id: string | null): string {
    if (!id) return "بدون ملف بعد";
    return clients.find((c) => c.id === id)?.full_name ?? "—";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const { error } = await supabase.from("service_requests").insert({
      service_type: serviceType,
      client_id: clientId || null,
      source: "manual",
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (error) {
      setMessage("تعذّر الحفظ: " + error.message);
      return;
    }

    setClientId("");
    setNotes("");
    setMessage("تم إنشاء الاستفسار.");
    loadAll();
  }

  async function convertToRequest(row: RequestRow) {
    setMessage(null);

    if (!row.client_id) {
      setMessage("لا يمكن التحويل إلى طلب قبل ربط الاستفسار بملف زبون.");
      return;
    }

    const { error } = await supabase
      .from("service_requests")
      .update({ status: "request" })
      .eq("id", row.id);

    if (error) {
      setMessage("تعذّر التحويل: " + error.message);
      return;
    }
    loadAll();
  }

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>الطلبات</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          نوع الخدمة
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {Object.entries(SERVICE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          الزبون (اختياري)
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            <option value="">بدون ملف بعد</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          ملاحظات
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {loading ? "جار الحفظ..." : "إنشاء استفسار"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {requests.map((row) => (
          <li
            key={row.id}
            style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}
          >
            <strong>{row.reference}</strong>
            <div>{SERVICE_LABELS[row.service_type] ?? row.service_type}</div>
            <div>الزبون: {clientName(row.client_id)}</div>
            <div>الحالة: {STATUS_LABELS[row.status] ?? row.status}</div>

            <button
              onClick={() => router.push(`/dashboard/requests/${row.id}`)}
              style={{ marginTop: "0.5rem", marginRight: "0.5rem", padding: "0.4rem 0.8rem" }}
            >
              التفاصيل
            </button>

            {row.status === "inquiry" && (
              <button
                onClick={() => convertToRequest(row)}
                style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
              >
                تحويل إلى طلب (وافق الزبون)
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
