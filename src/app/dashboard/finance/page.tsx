"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Invoice = {
  id: string;
  request_id: string;
  invoice_number: string | null;
  status: string;
  amount_dzd: number;
  issued_at: string | null;
};

type Balance = {
  invoice_id: string;
  request_id: string;
  amount_dzd: number;
  paid_dzd: number;
  balance_dzd: number;
  payment_state: string;
  status: string;
};

type Payment = {
  id: string;
  request_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  amount_dzd: number;
  status: string;
  paid_at: string;
  receipt_number: string | null;
};

type Expense = {
  id: string;
  request_id: string | null;
  description: string;
  category: string;
  amount_dzd: number;
  payment_status: string;
  status: string;
  incurred_at: string;
};

type RequestLite = { id: string; client_id: string | null; agency_id: string | null };

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  office: "مكتب",
  transport: "نقل",
  communication: "اتصالات",
  supplies: "لوازم",
  bank_fees: "عمولات بنكية",
  government_fees: "رسوم حكومية",
  salaries: "رواتب",
  visa_fees: "رسوم تأشيرات",
  ticket_cost: "تكلفة تذاكر",
  hotel_cost: "تكلفة فنادق",
  supplier_cost: "موردون",
  other: "أخرى",
};

function formatDzd(value: number): string {
  return `${Math.round(value).toLocaleString("ar-DZ")} د.ج`;
}

function dateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export default function FinancePage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [requests, setRequests] = useState<RequestLite[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Date filters apply to the transaction date of each record
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function loadAll() {
    const [invRes, balRes, payRes, expRes, reqRes] = await Promise.all([
      supabase.from("invoices").select("id, request_id, invoice_number, status, amount_dzd, issued_at"),
      supabase.from("invoice_balances").select("invoice_id, request_id, amount_dzd, paid_dzd, balance_dzd, payment_state, status"),
      supabase.from("payments").select("id, request_id, invoice_id, amount, currency, amount_dzd, status, paid_at, receipt_number"),
      supabase.from("expenses").select("id, request_id, description, category, amount_dzd, payment_status, status, incurred_at"),
      supabase.from("service_requests").select("id, client_id, agency_id"),
    ]);

    const error = invRes.error ?? balRes.error ?? payRes.error ?? expRes.error ?? reqRes.error;
    if (error) {
      setMessage("تعذّر تحميل البيانات المالية: " + error.message);
      return;
    }

    setInvoices((invRes.data as Invoice[]) ?? []);
    setBalances((balRes.data as Balance[]) ?? []);
    setPayments((payRes.data as Payment[]) ?? []);
    setExpenses((expRes.data as Expense[]) ?? []);
    setRequests((reqRes.data as RequestLite[]) ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function inRange(date: string): boolean {
    const d = dateOnly(date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  const requestById = useMemo(() => {
    const map: Record<string, RequestLite> = {};
    for (const r of requests) map[r.id] = r;
    return map;
  }, [requests]);

  function segmentOf(requestId: string | null): "b2b" | "b2c" | "none" {
    if (!requestId) return "none";
    const r = requestById[requestId];
    if (!r) return "none";
    return r.agency_id ? "b2b" : "b2c";
  }

  // Revenue: issued invoices only (an invoice is not income until issued, and cash is counted from payments)
  const issuedInRange = invoices.filter(
    (i) => i.status === "issued" && i.issued_at && inRange(i.issued_at)
  );
  const revenue = issuedInRange.reduce((sum, i) => sum + Number(i.amount_dzd), 0);
  const revenueB2c = issuedInRange
    .filter((i) => segmentOf(i.request_id) === "b2c")
    .reduce((sum, i) => sum + Number(i.amount_dzd), 0);
  const revenueB2b = issuedInRange
    .filter((i) => segmentOf(i.request_id) === "b2b")
    .reduce((sum, i) => sum + Number(i.amount_dzd), 0);

  // Collected: confirmed payments only (refunds are negative and reduce the total)
  const confirmedInRange = payments.filter(
    (p) => p.status === "confirmed" && inRange(p.paid_at)
  );
  const collected = confirmedInRange.reduce((sum, p) => sum + Number(p.amount_dzd), 0);

  // Outstanding: current balance of issued invoices (not date-filtered: it is a current position)
  const outstandingBalances = balances.filter((b) => {
    const inv = invoices.find((i) => i.id === b.invoice_id);
    return inv?.status === "issued";
  });
  const outstanding = outstandingBalances.reduce((sum, b) => sum + Math.max(Number(b.balance_dzd), 0), 0);
  const unpaidInvoicesCount = outstandingBalances.filter((b) => Number(b.balance_dzd) > 0).length;

  // Expenses: active records in range
  const activeExpensesInRange = expenses.filter(
    (e) => e.status === "active" && inRange(e.incurred_at)
  );
  const totalExpenses = activeExpensesInRange.reduce((sum, e) => sum + Number(e.amount_dzd), 0);
  const paidExpenses = activeExpensesInRange
    .filter((e) => e.payment_status === "paid")
    .reduce((sum, e) => sum + Number(e.amount_dzd), 0);

  const expectedProfit = revenue - totalExpenses;
  const actualProfit = collected - paidExpenses;
  const cashBalance = collected - paidExpenses;

  const expensesByCategory: Record<string, number> = {};
  for (const e of activeExpensesInRange) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount_dzd);
  }

  // Financial history: payments and expenses together, newest first
  const history = [
    ...confirmedInRange.map((p) => ({
      key: "p-" + p.id,
      date: dateOnly(p.paid_at),
      kind: "دفعة",
      label: `${p.receipt_number ?? "—"} · ${p.currency === "DZD" ? "" : p.currency + " "}${Number(p.amount).toLocaleString("ar-DZ")}`,
      amount: Number(p.amount_dzd),
      requestId: p.request_id,
      sign: 1,
    })),
    ...activeExpensesInRange.map((e) => ({
      key: "e-" + e.id,
      date: dateOnly(e.incurred_at),
      kind: "مصروف",
      label: `${EXPENSE_CATEGORY_LABELS[e.category] ?? e.category} · ${e.description}`,
      amount: Number(e.amount_dzd),
      requestId: e.request_id,
      sign: -1,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "0.75rem",
    flex: "1 1 45%",
    minWidth: 140,
  };

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <button onClick={() => router.push("/dashboard")} style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem" }}>
        رجوع إلى الأقسام
      </button>

      <h1>المالية</h1>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <label>
          من
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ marginRight: "0.5rem", padding: "0.3rem" }} />
        </label>
        <label>
          إلى
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ marginRight: "0.5rem", padding: "0.3rem" }} />
        </label>
        <button onClick={() => { setFrom(""); setTo(""); }} style={{ padding: "0.3rem 0.6rem" }}>
          كل الفترات
        </button>
      </div>

      {message && <p style={{ color: "red" }}>{message}</p>}

      <h2>الوضع المالي العام</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={cardStyle}>
          <div>الإيرادات المستحقة</div>
          <strong>{formatDzd(revenue)}</strong>
        </div>
        <div style={cardStyle}>
          <div>المبالغ المحصّلة</div>
          <strong>{formatDzd(collected)}</strong>
        </div>
        <div style={cardStyle}>
          <div>المتبقي على الزبائن (حالياً)</div>
          <strong>{formatDzd(outstanding)}</strong>
        </div>
        <div style={cardStyle}>
          <div>فواتير غير مسددة (حالياً)</div>
          <strong>{unpaidInvoicesCount}</strong>
        </div>
        <div style={cardStyle}>
          <div>إجمالي المصاريف</div>
          <strong>{formatDzd(totalExpenses)}</strong>
        </div>
        <div style={cardStyle}>
          <div>الرصيد النقدي للفترة</div>
          <strong>{formatDzd(cashBalance)}</strong>
        </div>
      </div>

      <h2>الربح والخسارة</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={cardStyle}>
          <div>الربح المتوقع (إيرادات مستحقة − مصاريف)</div>
          <strong>{formatDzd(expectedProfit)}</strong>
        </div>
        <div style={cardStyle}>
          <div>الربح الفعلي (محصّل − مصاريف مدفوعة)</div>
          <strong>{formatDzd(actualProfit)}</strong>
        </div>
      </div>

      <h2>الإيرادات حسب القسم</h2>
      <ul>
        <li>B2C (الأفراد): {formatDzd(revenueB2c)}</li>
        <li>B2B (الوكالات): {formatDzd(revenueB2b)}</li>
      </ul>

      <h2>المصاريف حسب الفئة</h2>
      {Object.keys(expensesByCategory).length === 0 && <p>لا توجد مصاريف في هذه الفترة.</p>}
      <ul>
        {Object.entries(expensesByCategory).map(([category, amount]) => (
          <li key={category}>
            {EXPENSE_CATEGORY_LABELS[category] ?? category}: {formatDzd(amount)}
          </li>
        ))}
      </ul>

      <h2>سجل الحركات المالية</h2>
      {history.length === 0 && <p>لا توجد حركات في هذه الفترة.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {history.slice(0, 100).map((item) => (
          <li key={item.key} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {item.date} · {item.kind}
              </span>
              <strong style={{ color: item.sign > 0 ? "green" : "red" }}>
                {item.sign > 0 ? "+" : "−"} {formatDzd(item.amount)}
              </strong>
            </div>
            <div>{item.label}</div>
            {item.requestId && (
              <button
                onClick={() => router.push(`/dashboard/requests/${item.requestId}`)}
                style={{ marginTop: "0.25rem", padding: "0.2rem 0.6rem" }}
              >
                فتح الطلب
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
