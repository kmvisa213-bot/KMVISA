"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

// Financial controls for a single request.
// - Billing (section "price"): agreed price, invoices issued from it, customer payments, client advances.
// - Expenses (section "expenses"): supplier invoices linked to this request, marked paid when settled.
// Revenue is recognized only when the service is completed (handled by the database).

type Section = "price" | "expenses" | "both";

type RequestRow = {
  id: string;
  client_id: string | null;
  agency_id: string | null;
  agreed_price: number | null;
  agreed_currency: string;
  agreed_exchange_rate: number;
  agreed_price_dzd: number | null;
};

type Invoice = {
  id: string;
  invoice_number: string | null;
  amount: number;
  currency: string;
  exchange_rate_to_dzd: number;
  amount_dzd: number;
  status: string;
  issued_at: string | null;
};

type Balance = { invoice_id: string; paid_dzd: number; balance_dzd: number; payment_state: string };

type SupplierInvoice = {
  id: string;
  supplier_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  amount_dzd: number;
  issue_date: string;
  due_date: string | null;
  status: string;
};

type Supplier = { id: string; name: string; type: string };

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  airline: "شركة طيران",
  hotel: "فندق",
  visa_intermediary: "وسيط تأشيرات",
  other: "أخرى",
};

const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  pending: "غير مسددة",
  paid: "مسددة",
  disputed: "متنازع عليها",
};

const PAYMENT_STATE_LABELS: Record<string, string> = {
  unpaid: "غير مسددة",
  partial: "مسددة جزئياً",
  paid: "مسددة بالكامل",
};

const CURRENCIES = ["DZD", "EUR", "USD"];

function formatDzd(value: number): string {
  return `${Math.round(Number(value)).toLocaleString("ar-DZ")} د.ج`;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function rateFor(currency: string, rateText: string): number | null {
  if (currency === "DZD") return 1;
  const rate = Number(rateText);
  return rate > 0 ? rate : null;
}

const inputStyle = { display: "block", width: "100%", padding: "0.5rem" };
const labelStyle = { display: "block", marginBottom: "0.5rem" };
const buttonStyle = { padding: "0.5rem 0.9rem", marginTop: "0.5rem" };

export default function RequestFinance({
  requestId,
  section = "both",
}: {
  requestId: string;
  section?: Section;
}) {
  const showBilling = section !== "expenses";
  const showExpenses = section !== "price";

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Price form
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("DZD");
  const [priceRate, setPriceRate] = useState("1");

  // Payment form (per invoice)
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(todayString());
  const [payNote, setPayNote] = useState("");

  // Advance form
  const [advAmount, setAdvAmount] = useState("");
  const [advCurrency, setAdvCurrency] = useState("DZD");
  const [advRate, setAdvRate] = useState("1");
  const [advDate, setAdvDate] = useState(todayString());

  // Supplier expense form
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierType, setNewSupplierType] = useState("other");
  const [invNumber, setInvNumber] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invCurrency, setInvCurrency] = useState("DZD");
  const [invRate, setInvRate] = useState("1");
  const [invIssue, setInvIssue] = useState(todayString());
  const [invDue, setInvDue] = useState("");

  async function loadAll() {
    const [reqRes, invRes, balRes, supInvRes, supRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select("id, client_id, agency_id, agreed_price, agreed_currency, agreed_exchange_rate, agreed_price_dzd")
        .eq("id", requestId)
        .single(),
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, exchange_rate_to_dzd, amount_dzd, status, issued_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoice_balances")
        .select("invoice_id, paid_dzd, balance_dzd, payment_state")
        .eq("request_id", requestId),
      supabase
        .from("supplier_invoices")
        .select("id, supplier_id, invoice_number, amount, currency, amount_dzd, issue_date, due_date, status")
        .eq("linked_order_id", requestId)
        .order("issue_date", { ascending: false }),
      supabase.from("suppliers").select("id, name, type").order("name", { ascending: true }),
    ]);

    const error = reqRes.error ?? invRes.error ?? balRes.error ?? supInvRes.error ?? supRes.error;
    if (error) {
      setMessage({ type: "error", text: "تعذّر تحميل البيانات المالية: " + error.message });
      return;
    }

    const r = reqRes.data as RequestRow;
    setRequest(r);
    setPriceAmount(r.agreed_price === null ? "" : String(r.agreed_price));
    setPriceCurrency(r.agreed_currency);
    setPriceRate(String(r.agreed_exchange_rate));

    setInvoices((invRes.data as Invoice[]) ?? []);

    const bmap: Record<string, Balance> = {};
    for (const b of (balRes.data as Balance[]) ?? []) bmap[b.invoice_id] = b;
    setBalances(bmap);

    setSupplierInvoices((supInvRes.data as SupplierInvoice[]) ?? []);
    setSuppliers((supRes.data as Supplier[]) ?? []);
  }

  useEffect(() => {
    loadAll();
  }, [requestId]);

  function supplierName(id: string): string {
    return suppliers.find((s) => s.id === id)?.name ?? "—";
  }

  // ---------- Agreed price ----------
  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const amount = Number(priceAmount);
    if (priceAmount.trim() === "" || Number.isNaN(amount) || amount < 0) {
      setMessage({ type: "error", text: "أدخل سعراً صحيحاً." });
      return;
    }
    const rate = rateFor(priceCurrency, priceRate);
    if (rate === null) {
      setMessage({ type: "error", text: "أدخل سعر صرف صحيحاً." });
      return;
    }

    const { error } = await supabase
      .from("service_requests")
      .update({ agreed_price: amount, agreed_currency: priceCurrency, agreed_exchange_rate: rate })
      .eq("id", requestId);

    if (error) {
      setMessage({
        type: "error",
        text:
          error.message.includes("credit_limit_exceeded")
            ? "تجاوز هذا السعر حد الائتمان المسموح للوكالة."
            : "تعذّر حفظ السعر: " + error.message,
      });
      return;
    }

    setMessage({ type: "ok", text: "تم حفظ السعر المتفق عليه." });
    loadAll();
  }

  // ---------- Invoices ----------
  async function issueInvoice() {
    setMessage(null);

    if (!request || request.agreed_price === null) {
      setMessage({ type: "error", text: "حدد السعر المتفق عليه أولاً." });
      return;
    }

    const { data: number, error: numError } = await supabase.rpc("next_invoice_number");
    if (numError || !number) {
      setMessage({ type: "error", text: "تعذّر توليد رقم الفاتورة: " + (numError?.message ?? "") });
      return;
    }

    const { error } = await supabase.from("invoices").insert({
      request_id: requestId,
      invoice_number: number,
      amount: request.agreed_price,
      currency: request.agreed_currency,
      exchange_rate_to_dzd: request.agreed_exchange_rate,
      status: "issued",
      issued_at: new Date().toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: "تعذّر إصدار الفاتورة: " + error.message });
      return;
    }

    setMessage({ type: "ok", text: "تم إصدار الفاتورة " + number + "." });
    loadAll();
  }

  function openPayment(invoice: Invoice) {
    const bal = balances[invoice.id];
    const remainingDzd = bal ? Number(bal.balance_dzd) : Number(invoice.amount_dzd);
    const remainingOriginal = invoice.exchange_rate_to_dzd > 0
      ? Math.round((remainingDzd / Number(invoice.exchange_rate_to_dzd)) * 100) / 100
      : 0;
    setPayingInvoiceId(invoice.id);
    setPayAmount(String(remainingOriginal));
    setPayMethod("cash");
    setPayDate(todayString());
    setPayNote("");
    setMessage(null);
  }

  async function savePayment(event: FormEvent<HTMLFormElement>, invoice: Invoice) {
    event.preventDefault();
    setMessage(null);

    const amount = Number(payAmount);
    if (payAmount.trim() === "" || Number.isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "أدخل مبلغ دفعة صحيحاً." });
      return;
    }

    const bal = balances[invoice.id];
    const remainingDzd = bal ? Number(bal.balance_dzd) : Number(invoice.amount_dzd);
    const paymentDzd = Math.round(amount * Number(invoice.exchange_rate_to_dzd) * 100) / 100;
    if (paymentDzd > remainingDzd + 0.01) {
      setMessage({ type: "error", text: "المبلغ أكبر من المتبقي على هذه الفاتورة." });
      return;
    }

    const { error } = await supabase.from("payments").insert({
      request_id: requestId,
      invoice_id: invoice.id,
      amount,
      currency: invoice.currency,
      exchange_rate_to_dzd: invoice.exchange_rate_to_dzd,
      method: payMethod,
      note: payNote.trim() || null,
      paid_at: new Date(payDate).toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: "تعذّر تسجيل الدفعة: " + error.message });
      return;
    }

    setPayingInvoiceId(null);
    setMessage({ type: "ok", text: "تم تسجيل الدفعة." });
    loadAll();
  }

  // ---------- Client advances ----------
  async function saveAdvance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!request || (!request.client_id && !request.agency_id)) {
      setMessage({ type: "error", text: "لا يمكن تسجيل دفعة مقدمة لطلب بلا زبون أو وكالة." });
      return;
    }

    const amount = Number(advAmount);
    if (advAmount.trim() === "" || Number.isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "أدخل مبلغاً صحيحاً." });
      return;
    }
    const rate = rateFor(advCurrency, advRate);
    if (rate === null) {
      setMessage({ type: "error", text: "أدخل سعر صرف صحيحاً." });
      return;
    }

    const { error } = await supabase.from("client_advances").insert({
      request_id: requestId,
      client_id: request.client_id,
      agency_id: request.agency_id,
      amount,
      currency: advCurrency,
      exchange_rate: rate,
      date_received: new Date(advDate).toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: "تعذّر تسجيل الدفعة المقدمة: " + error.message });
      return;
    }

    setAdvAmount("");
    setMessage({ type: "ok", text: "تم تسجيل الدفعة المقدمة كالتزام حتى اكتمال الخدمة." });
    loadAll();
  }

  // ---------- Supplier invoices ----------
  async function resolveSupplier(): Promise<string | null> {
    if (supplierId) return supplierId;

    if (!newSupplierName.trim()) {
      setMessage({ type: "error", text: "اختر المورد أو أدخل اسمه." });
      return null;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({ name: newSupplierName.trim(), type: newSupplierType })
      .select("id")
      .single();

    if (error || !data) {
      setMessage({ type: "error", text: "تعذّر إضافة المورد: " + (error?.message ?? "") });
      return null;
    }
    return data.id;
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!invNumber.trim()) {
      setMessage({ type: "error", text: "أدخل رقم فاتورة المورد." });
      return;
    }
    const amount = Number(invAmount);
    if (invAmount.trim() === "" || Number.isNaN(amount) || amount < 0) {
      setMessage({ type: "error", text: "أدخل مبلغ الفاتورة." });
      return;
    }
    const rate = rateFor(invCurrency, invRate);
    if (rate === null) {
      setMessage({ type: "error", text: "أدخل سعر صرف صحيحاً." });
      return;
    }
    if (invDue && invDue < invIssue) {
      setMessage({ type: "error", text: "تاريخ الاستحقاق يسبق تاريخ الفاتورة." });
      return;
    }

    const sid = await resolveSupplier();
    if (!sid) return;

    const { error } = await supabase.from("supplier_invoices").insert({
      supplier_id: sid,
      invoice_number: invNumber.trim(),
      amount,
      currency: invCurrency,
      exchange_rate: rate,
      issue_date: invIssue,
      due_date: invDue || null,
      linked_order_id: requestId,
    });

    if (error) {
      setMessage({
        type: "error",
        text:
          error.code === "23505"
            ? "رقم هذه الفاتورة مسجّل مسبقاً لهذا المورد."
            : "تعذّر حفظ المصروف: " + error.message,
      });
      return;
    }

    setSupplierId("");
    setNewSupplierName("");
    setInvNumber("");
    setInvAmount("");
    setInvDue("");
    setMessage({ type: "ok", text: "تم تسجيل فاتورة المورد." });
    loadAll();
  }

  async function markSupplierPaid(inv: SupplierInvoice) {
    setMessage(null);
    const { error } = await supabase
      .from("supplier_invoices")
      .update({ status: "paid" })
      .eq("id", inv.id);

    if (error) {
      setMessage({ type: "error", text: "تعذّر تحديث الحالة: " + error.message });
      return;
    }
    setMessage({ type: "ok", text: "تم تسجيل سداد فاتورة المورد." });
    loadAll();
  }

  // ---------- Render ----------
  return (
    <section style={{ marginTop: "2rem", borderTop: "2px solid #ddd", paddingTop: "1rem" }}>
      <h2>السعر والمالية</h2>

      {message && (
        <p style={{ color: message.type === "error" ? "red" : "green" }}>{message.text}</p>
      )}

      {showBilling && (
        <>
          <h3>السعر المتفق عليه</h3>
          <p style={{ color: "#666" }}>سعر تعاقدي، ولا يُحسب إيراداً إلا بعد اكتمال الخدمة.</p>

          {request?.agreed_price !== null && request?.agreed_price !== undefined && (
            <p>
              السعر الحالي: {Number(request.agreed_price).toLocaleString("ar-DZ")} {request.agreed_currency}
              {request.agreed_currency !== "DZD" && request.agreed_price_dzd !== null
                ? ` (≈ ${formatDzd(request.agreed_price_dzd)})`
                : ""}
            </p>
          )}

          <form onSubmit={savePrice}>
            <label style={labelStyle}>
              المبلغ
              <input inputMode="decimal" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              العملة
              <select value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {priceCurrency !== "DZD" && (
              <label style={labelStyle}>
                سعر الصرف إلى الدينار
                <input inputMode="decimal" value={priceRate} onChange={(e) => setPriceRate(e.target.value)} style={inputStyle} />
              </label>
            )}
            <button type="submit" style={{ ...buttonStyle, width: "100%" }}>حفظ السعر</button>
          </form>

          <h3 style={{ marginTop: "2rem" }}>فواتير الزبون</h3>
          <button onClick={issueInvoice} style={{ ...buttonStyle, width: "100%" }}>
            إصدار فاتورة من السعر المتفق عليه
          </button>

          {invoices.length === 0 && <p>لا توجد فواتير لهذه الخدمة.</p>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {invoices.map((inv) => {
              const bal = balances[inv.id];
              const stateLabel = bal ? PAYMENT_STATE_LABELS[bal.payment_state] ?? bal.payment_state : "—";
              return (
                <li key={inv.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
                  <div>{inv.invoice_number ?? "مسودة"} · {inv.status === "issued" ? "صادرة" : inv.status}</div>
                  <div>
                    المبلغ: {formatDzd(inv.amount_dzd)} · المدفوع: {formatDzd(bal?.paid_dzd ?? 0)} · المتبقي: {formatDzd(bal?.balance_dzd ?? inv.amount_dzd)}
                  </div>
                  <div>الحالة: {stateLabel}</div>

                  {inv.status === "issued" && Number(bal?.balance_dzd ?? inv.amount_dzd) > 0 && (
                    <>
                      {payingInvoiceId !== inv.id ? (
                        <button onClick={() => openPayment(inv)} style={buttonStyle}>تسجيل دفعة</button>
                      ) : (
                        <form onSubmit={(e) => savePayment(e, inv)} style={{ marginTop: "0.5rem" }}>
                          <label style={labelStyle}>
                            المبلغ ({inv.currency})
                            <input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={inputStyle} />
                          </label>
                          <label style={labelStyle}>
                            طريقة الدفع
                            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={inputStyle}>
                              <option value="cash">نقداً</option>
                              <option value="bank">تحويل بنكي</option>
                              <option value="card">بطاقة</option>
                              <option value="other">أخرى</option>
                            </select>
                          </label>
                          <label style={labelStyle}>
                            تاريخ الدفع
                            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={inputStyle} />
                          </label>
                          <label style={labelStyle}>
                            ملاحظة
                            <input value={payNote} onChange={(e) => setPayNote(e.target.value)} style={inputStyle} />
                          </label>
                          <button type="submit" style={buttonStyle}>حفظ الدفعة</button>
                          <button type="button" onClick={() => setPayingInvoiceId(null)} style={buttonStyle}>إلغاء</button>
                        </form>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          <h3 style={{ marginTop: "2rem" }}>دفعة مقدمة من الزبون</h3>
          <p style={{ color: "#666" }}>تُسجَّل كالتزام حتى تكتمل الخدمة، ولا تُحسب إيراداً.</p>
          <form onSubmit={saveAdvance}>
            <label style={labelStyle}>
              المبلغ
              <input inputMode="decimal" value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              العملة
              <select value={advCurrency} onChange={(e) => setAdvCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {advCurrency !== "DZD" && (
              <label style={labelStyle}>
                سعر الصرف إلى الدينار
                <input inputMode="decimal" value={advRate} onChange={(e) => setAdvRate(e.target.value)} style={inputStyle} />
              </label>
            )}
            <label style={labelStyle}>
              تاريخ الاستلام
              <input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)} style={inputStyle} />
            </label>
            <button type="submit" style={{ ...buttonStyle, width: "100%" }}>تسجيل الدفعة المقدمة</button>
          </form>
        </>
      )}

      {showExpenses && (
        <>
          <h3 style={{ marginTop: "2rem" }}>المصاريف (فواتير الموردين)</h3>
          <p style={{ color: "#666" }}>المصروف يُعترف به عند تسجيل فاتورة المورد، ولا يُحسب عند الحجز.</p>

          {supplierInvoices.length === 0 && <p>لا توجد فواتير موردين لهذه الخدمة.</p>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {supplierInvoices.map((inv) => (
              <li key={inv.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
                <div>{supplierName(inv.supplier_id)} · {inv.invoice_number}</div>
                <div>
                  {formatDzd(inv.amount_dzd)}
                  {inv.currency !== "DZD" ? ` (${Number(inv.amount).toLocaleString("ar-DZ")} ${inv.currency})` : ""}
                </div>
                <div>
                  {SUPPLIER_STATUS_LABELS[inv.status] ?? inv.status} · تاريخ الفاتورة: {inv.issue_date}
                  {inv.due_date ? ` · الاستحقاق: ${inv.due_date}` : ""}
                </div>
                {inv.status === "pending" && (
                  <button onClick={() => markSupplierPaid(inv)} style={buttonStyle}>تم السداد</button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={addExpense} style={{ marginTop: "1rem" }}>
            <label style={labelStyle}>
              المورد
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={inputStyle}>
                <option value="">مورد جديد</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            {!supplierId && (
              <>
                <label style={labelStyle}>
                  اسم المورد الجديد
                  <input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  نوع المورد
                  <select value={newSupplierType} onChange={(e) => setNewSupplierType(e.target.value)} style={inputStyle}>
                    {Object.entries(SUPPLIER_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label style={labelStyle}>
              رقم فاتورة المورد
              <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              المبلغ
              <input inputMode="decimal" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              العملة
              <select value={invCurrency} onChange={(e) => setInvCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {invCurrency !== "DZD" && (
              <label style={labelStyle}>
                سعر الصرف إلى الدينار
                <input inputMode="decimal" value={invRate} onChange={(e) => setInvRate(e.target.value)} style={inputStyle} />
              </label>
            )}
            <label style={labelStyle}>
              تاريخ الفاتورة
              <input type="date" value={invIssue} onChange={(e) => setInvIssue(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              تاريخ الاستحقاق (اختياري)
              <input type="date" value={invDue} onChange={(e) => setInvDue(e.target.value)} style={inputStyle} />
            </label>
            <button type="submit" style={{ ...buttonStyle, width: "100%" }}>تسجيل فاتورة المورد</button>
          </form>
        </>
      )}
    </section>
  );
}
