"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// All figures come from the finance_summary view, which reads the ledger tables directly.
// Revenue is recognized only when a service is completed. Invoices and advances are not revenue.

type Summary = {
  cash_balance_dzd: number;
  recognized_revenue_dzd: number;
  receivables_dzd: number;
  payables_dzd: number;
  client_advances_dzd: number;
  recognized_expenses_dzd: number;
  net_profit_dzd: number;
  projected_profit_dzd: number;
};

type Recognition = {
  request_id: string;
  recognized_dzd: number;
  recognized_at: string;
};

type Advance = {
  id: string;
  request_id: string | null;
  client_id: string | null;
  agency_id: string | null;
  amount: number;
  currency: string;
  amount_dzd: number;
  date_received: string;
};

type SupplierInvoice = {
  id: string;
  supplier_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  amount_dzd: number;
  due_date: string | null;
  status: string;
};

type RequestLite = { id: string; reference: string };
type Named = { id: string; name?: string; full_name?: string };

function formatDzd(value: number): string {
  return `${Math.round(Number(value)).toLocaleString("ar-DZ")} د.ج`;
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "0.75rem",
  flex: "1 1 45%",
  minWidth: 140,
};

export default function FinancePage() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [requestRefs, setRequestRefs] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [agencyNames, setAgencyNames] = useState<Record<string, string>>({});
  const [supplierNames, setSupplierNames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll() {
    const [sumRes, recRes, advRes, supRes, reqRes, cliRes, agRes, supplierRes] = await Promise.all([
      supabase.from("finance_summary").select("*").single(),
      supabase.from("revenue_recognitions").select("request_id, recognized_dzd, recognized_at").order("recognized_at", { ascending: false }),
      supabase.from("client_advances").select("id, request_id, client_id, agency_id, amount, currency, amount_dzd, date_received").eq("status", "held"),
      supabase.from("supplier_invoices").select("id, supplier_id, invoice_number, amount, currency, amount_dzd, due_date, status").eq("status", "pending"),
      supabase.from("service_requests").select("id, reference"),
      supabase.from("clients").select("id, full_name"),
      supabase.from("agencies").select("id, name"),
      supabase.from("suppliers").select("id, name"),
    ]);

    const error =
      sumRes.error ?? recRes.error ?? advRes.error ?? supRes.error ?? reqRes.error ?? cliRes.error ?? agRes.error ?? supplierRes.error;
    if (error) {
      setMessage("تعذّر تحميل البيانات المالية: " + error.message);
      return;
    }

    setSummary(sumRes.data as Summary);
    setRecognitions((recRes.data as Recognition[]) ?? []);
    setAdvances((advRes.data as Advance[]) ?? []);
    setSupplierInvoices((supRes.data as SupplierInvoice[]) ?? []);

    const refs: Record<string, string> = {};
    for (const r of (reqRes.data as RequestLite[]) ?? []) refs[r.id] = r.reference;
    setRequestRefs(refs);

    const toMap = (rows: Named[] | null) => {
      const m: Record<string, string> = {};
      for (const row of rows ?? []) m[row.id] = row.full_name ?? row.name ?? "—";
      return m;
    };
    setClientNames(toMap((cliRes.data as Named[]) ?? []));
    setAgencyNames(toMap((agRes.data as Named[]) ?? []));
    setSupplierNames(toMap((supplierRes.data as Named[]) ?? []));
  }

  useEffect(() => {
    loadAll();
  }, []);

  function partyName(advance: Advance): string {
    if (advance.client_id) return clientNames[advance.client_id] ?? "—";
    if (advance.agency_id) return agencyNames[advance.agency_id] ?? "—";
    return "—";
  }

  const buttonStyle = { padding: "0.3rem 0.7rem", marginTop: "0.4rem" };

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <button onClick={() => router.push("/dashboard")} style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem" }}>
        رجوع إلى الأقسام
      </button>

      <h1>المالية</h1>

      {message && <p style={{ color: "red" }}>{message}</p>}

      {summary && (
        <>
          <h2>الوضع المالي</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={cardStyle}>
              <div>رصيد النقدية</div>
              <strong>{formatDzd(summary.cash_balance_dzd)}</strong>
            </div>
            <div style={cardStyle}>
              <div>الإيرادات المحققة (خدمات مكتملة)</div>
              <strong>{formatDzd(summary.recognized_revenue_dzd)}</strong>
            </div>
            <div style={cardStyle}>
              <div>ذمم العملاء المدينة</div>
              <strong>{formatDzd(summary.receivables_dzd)}</strong>
            </div>
            <div style={cardStyle}>
              <div>ذمم الموردين الدائنة</div>
              <strong>{formatDzd(summary.payables_dzd)}</strong>
            </div>
            <div style={cardStyle}>
              <div>دفعات مقدمة من العملاء (التزام)</div>
              <strong>{formatDzd(summary.client_advances_dzd)}</strong>
            </div>
            <div style={cardStyle}>
              <div>الربح المتوقع (تقريبي)</div>
              <strong>{formatDzd(summary.projected_profit_dzd)}</strong>
            </div>
          </div>

          <h2>الربح والخسارة</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={cardStyle}>
              <div>المصاريف المعترف بها</div>
              <strong>{formatDzd(summary.recognized_expenses_dzd)}</strong>
            </div>
            <div style={cardStyle}>
              <div>صافي الربح (إيرادات محققة − مصاريف معترف بها)</div>
              <strong>{formatDzd(summary.net_profit_dzd)}</strong>
            </div>
          </div>
        </>
      )}

      <h2>الإيرادات المحققة</h2>
      {recognitions.length === 0 && <p>لا توجد خدمات مكتملة بعد.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {recognitions.map((r) => (
          <li key={r.request_id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            <div>{requestRefs[r.request_id] ?? "—"} · {formatDzd(r.recognized_dzd)}</div>
            <div>تاريخ الاكتمال: {r.recognized_at.slice(0, 10)}</div>
            <button onClick={() => router.push(`/dashboard/requests/${r.request_id}`)} style={buttonStyle}>
              فتح الطلب
            </button>
          </li>
        ))}
      </ul>

      <h2>دفعات مقدمة محجوزة (التزام)</h2>
      {advances.length === 0 && <p>لا توجد دفعات مقدمة محجوزة.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {advances.map((a) => (
          <li key={a.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            <div>{partyName(a)} · {formatDzd(a.amount_dzd)}</div>
            <div>
              {a.currency !== "DZD" ? `${Number(a.amount).toLocaleString("ar-DZ")} ${a.currency} · ` : ""}
              تاريخ الاستلام: {a.date_received.slice(0, 10)}
            </div>
            {a.request_id && (
              <button onClick={() => router.push(`/dashboard/requests/${a.request_id}`)} style={buttonStyle}>
                فتح الطلب
              </button>
            )}
          </li>
        ))}
      </ul>

      <h2>فواتير موردين غير مسددة</h2>
      {supplierInvoices.length === 0 && <p>لا توجد فواتير موردين غير مسددة.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {supplierInvoices.map((s) => (
          <li key={s.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            <div>{supplierNames[s.supplier_id] ?? "—"} · {s.invoice_number}</div>
            <div>
              {formatDzd(s.amount_dzd)}
              {s.due_date ? ` · تاريخ الاستحقاق: ${s.due_date}` : ""}
            </div>
          </li>
        ))}
      </ul>

      <p style={{ color: "#666", marginTop: "2rem" }}>
        ملاحظة: الربح المتوقع تقريبي، وسيُدقَّق في المرحلة التالية لربط الهامش بكل خدمة.
      </p>
    </main>
  );
}
