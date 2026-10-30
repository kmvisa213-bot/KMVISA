"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCountryByCode } from "@/lib/countries";
import { APPLICATION_TYPES, getVisaType } from "@/lib/visa-catalog";
import {
  confirmDelete,
  deleteRepresentative,
  deleteRequest,
  setArchived,
} from "@/lib/record-actions";

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
  archived_at: string | null;
};

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  representative_id: string | null;
  archived_at: string | null;
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

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+213" + digits.slice(1);
  return "+" + digits;
}

const buttonStyle = { padding: "0.4rem 0.8rem", marginRight: "0.5rem", marginTop: "0.5rem" };

export default function AgencyProfilePage() {
  const params = useParams<{ id: string }>();
  const agencyId = params.id;
  const router = useRouter();

  const [agency, setAgency] = useState<Agency | null>(null);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [visaByRequest, setVisaByRequest] = useState<Record<string, VisaInfo>>({});
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Representative form and edit state
  const [repName, setRepName] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [editRepName, setEditRepName] = useState("");
  const [editRepPhone, setEditRepPhone] = useState("");

  async function loadAll() {
    const { data: a, error: aError } = await supabase
      .from("agencies")
      .select("id, name, approval_status, notes")
      .eq("id", agencyId)
      .single();

    if (aError || !a) {
      setMessage({ type: "error", text: "تعذّر تحميل ملف الوكالة." });
      return;
    }
    setAgency(a as Agency);

    const [repRes, reqRes] = await Promise.all([
      supabase
        .from("agency_representatives")
        .select("id, full_name, phone, is_active, archived_at")
        .eq("agency_id", agencyId)
        .order("full_name", { ascending: true }),
      supabase
        .from("service_requests")
        .select("id, reference, service_type, status, representative_id, archived_at, created_at")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false }),
    ]);

    const error = repRes.error ?? reqRes.error;
    if (error) {
      setMessage({ type: "error", text: "تعذّر تحميل البيانات: " + error.message });
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

  useEffect(() => {
    loadAll();
  }, [agencyId]);

  async function addRepresentative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    let phoneValue: string | null = null;
    if (repPhone.trim()) {
      phoneValue = normalizePhone(repPhone);
      if (!/^\+[0-9]{8,15}$/.test(phoneValue)) {
        setMessage({ type: "error", text: "صيغة الرقم غير صحيحة. مثال: 0550123456" });
        return;
      }
    }

    const { error } = await supabase.from("agency_representatives").insert({
      agency_id: agencyId,
      full_name: repName.trim(),
      phone: phoneValue,
    });

    if (error) {
      setMessage({
        type: "error",
        text:
          error.code === "23505"
            ? "هذا الممثل مسجّل مسبقاً في هذه الوكالة."
            : "تعذّر الحفظ: " + error.message,
      });
      return;
    }

    setRepName("");
    setRepPhone("");
    setMessage({ type: "ok", text: "تمت إضافة الممثل." });
    loadAll();
  }

  function startEditRep(rep: Representative) {
    setEditingRepId(rep.id);
    setEditRepName(rep.full_name);
    setEditRepPhone(rep.phone ?? "");
    setMessage(null);
  }

  async function saveEditRep(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setMessage(null);

    let phoneValue: string | null = null;
    if (editRepPhone.trim()) {
      phoneValue = normalizePhone(editRepPhone);
      if (!/^\+[0-9]{8,15}$/.test(phoneValue)) {
        setMessage({ type: "error", text: "صيغة الرقم غير صحيحة. مثال: 0550123456" });
        return;
      }
    }

    const { error } = await supabase
      .from("agency_representatives")
      .update({ full_name: editRepName.trim(), phone: phoneValue })
      .eq("id", id);

    if (error) {
      setMessage({
        type: "error",
        text:
          error.code === "23505"
            ? "هذا الممثل مسجّل مسبقاً في هذه الوكالة."
            : "تعذّر التعديل: " + error.message,
      });
      return;
    }

    setEditingRepId(null);
    setMessage({ type: "ok", text: "تم حفظ تعديلات الممثل." });
    loadAll();
  }

  async function toggleRepArchive(rep: Representative) {
    setMessage(null);
    const archive = rep.archived_at === null;
    const result = await setArchived("agency_representatives", rep.id, archive);

    if (!result.ok) {
      setMessage({ type: "error", text: "تعذّر تنفيذ الإجراء: " + result.error });
      return;
    }
    setMessage({ type: "ok", text: archive ? "تمت أرشفة الممثل." : "تمت استعادة الممثل." });
    loadAll();
  }

  async function handleRepDelete(rep: Representative) {
    setMessage(null);
    if (!confirmDelete(`الممثل ${rep.full_name}`)) return;

    const result = await deleteRepresentative(rep.id);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "ok", text: "تم حذف الممثل نهائياً." });
    loadAll();
  }

  async function toggleRequestArchive(row: RequestRow) {
    setMessage(null);
    const archive = row.archived_at === null;
    const result = await setArchived("service_requests", row.id, archive);

    if (!result.ok) {
      setMessage({ type: "error", text: "تعذّر تنفيذ الإجراء: " + result.error });
      return;
    }
    setMessage({ type: "ok", text: archive ? "تمت أرشفة الطلب." : "تمت استعادة الطلب." });
    loadAll();
  }

  async function handleRequestDelete(row: RequestRow) {
    setMessage(null);
    if (!confirmDelete(`الطلب ${row.reference}`)) return;

    const result = await deleteRequest(row.id);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "ok", text: "تم حذف الطلب نهائياً." });
    loadAll();
  }

  function representativeName(id: string | null): string {
    if (!id) return "—";
    return representatives.find((r) => r.id === id)?.full_name ?? "—";
  }

  if (!agency) {
    return (
      <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
        <p>{message?.text ?? "جار التحميل..."}</p>
      </main>
    );
  }

  const activeReps = representatives.filter((r) => r.archived_at === null);
  const archivedReps = representatives.filter((r) => r.archived_at !== null);
  const activeRequests = requests.filter((r) => r.archived_at === null);
  const archivedRequests = requests.filter((r) => r.archived_at !== null);

  function renderRequest(row: RequestRow) {
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
              نوع الطلب: {APPLICATION_TYPES.find((t) => t.value === visa.application_type)?.labelAr ?? "—"}
            </div>
          </>
        )}
        <div>تاريخ الطلب: {row.created_at.slice(0, 10)}</div>
        <button onClick={() => router.push(`/dashboard/requests/${row.id}`)} style={buttonStyle}>
          فتح الطلب
        </button>
        <button onClick={() => toggleRequestArchive(row)} style={buttonStyle}>
          {row.archived_at === null ? "أرشفة" : "استعادة"}
        </button>
        <button onClick={() => handleRequestDelete(row)} style={{ ...buttonStyle, color: "red" }}>
          حذف
        </button>
      </li>
    );
  }

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <button onClick={() => router.push("/dashboard/agencies")} style={buttonStyle}>
        رجوع إلى الوكالات
      </button>

      <h1>{agency.name}</h1>
      <div>الحالة: {agency.approval_status === "approved" ? "معتمدة" : "موقوفة"}</div>
      {agency.notes && <p>{agency.notes}</p>}

      {message && (
        <p style={{ color: message.type === "error" ? "red" : "green" }}>{message.text}</p>
      )}

      <h2>الممثلون النشطون ({activeReps.length})</h2>
      <form onSubmit={addRepresentative} style={{ marginBottom: "1rem" }}>
        <input
          required
          placeholder="اسم الممثل"
          value={repName}
          onChange={(e) => setRepName(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <input
          inputMode="tel"
          placeholder="الهاتف (اختياري)"
          value={repPhone}
          onChange={(e) => setRepPhone(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <button type="submit" style={{ width: "100%", padding: "0.6rem" }}>
          إضافة ممثل
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {activeReps.map((rep) => (
          <li key={rep.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            {editingRepId === rep.id ? (
              <form onSubmit={(e) => saveEditRep(e, rep.id)}>
                <input
                  required
                  value={editRepName}
                  onChange={(e) => setEditRepName(e.target.value)}
                  style={{ display: "block", width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
                />
                <input
                  inputMode="tel"
                  value={editRepPhone}
                  onChange={(e) => setEditRepPhone(e.target.value)}
                  style={{ display: "block", width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
                />
                <button type="submit" style={buttonStyle}>حفظ</button>
                <button type="button" onClick={() => setEditingRepId(null)} style={buttonStyle}>
                  إلغاء
                </button>
              </form>
            ) : (
              <>
                <strong>{rep.full_name}</strong>
                {rep.phone && <div style={{ direction: "ltr", textAlign: "right" }}>{rep.phone}</div>}
                <div>{rep.is_active ? "نشط" : "موقوف"}</div>
                <button onClick={() => startEditRep(rep)} style={buttonStyle}>تعديل</button>
                <button onClick={() => toggleRepArchive(rep)} style={buttonStyle}>أرشفة</button>
                <button onClick={() => handleRepDelete(rep)} style={{ ...buttonStyle, color: "red" }}>
                  حذف
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {archivedReps.length > 0 && (
        <>
          <h3>الممثلون المؤرشفون ({archivedReps.length})</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {archivedReps.map((rep) => (
              <li key={rep.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
                <strong>{rep.full_name}</strong>
                <button onClick={() => toggleRepArchive(rep)} style={buttonStyle}>استعادة</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>طلبات الوكالة النشطة ({activeRequests.length})</h2>
      {activeRequests.length === 0 && <p>لا توجد طلبات نشطة لهذه الوكالة.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>{activeRequests.map(renderRequest)}</ul>

      {archivedRequests.length > 0 && (
        <>
          <h3>الطلبات المؤرشفة ({archivedRequests.length})</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>{archivedRequests.map(renderRequest)}</ul>
        </>
      )}
    </main>
  );
}
