"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

// Financial controls for a single request:
// - Agreed price: a contractual price. It is NOT revenue until the service is completed.
// - Expenses: registered as supplier invoices linked to this request. A booking is not an expense.

type Supplier = { id: string; name: string; type: string };

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

type AgreedPrice = {
  agreed_price: number | null;
  agreed_currency: string;
  agreed_exchange_rate: number;
  agreed_price_dzd: number | null;
};

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  airline: "شركة طيران",
  hotel: "فندق",
  visa_intermediary: "وسيط تأشيرات",
  other: "أخرى",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "غير مسددة",
  paid: "مسددة",
  disputed: "متنازع عليها",
};

const CURRENCIES = ["DZD", "EUR", "USD"];

function formatDzd(value: number): string {
  return `${Math.round(Number(value)).toLocaleString("ar-DZ")} د.ج`;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RequestFinance({ requestId }: { requestId: string }) {
  const [agreed, setAgreed] = useState<AgreedPrice | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Price form
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("DZD");
  const [priceRate, setPriceRate] = useState("1");

  // Expense form
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
    const [reqRes, supRes, invRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select("agreed_price, agreed_currency, agreed_exchange_rate, agreed_price_dzd")
        .eq("id", requestId)
        .single(),
      supabase.from("suppliers").select("id, name, type").order("name", { ascending: true }),
      supabase
        .from("supplier_invoices")
        .select("id, supplier_id, invoice_number, amount, currency, amount_dzd, issue_date, due_date, status")
        .eq("linked_order_id", requestId)
        .order("issue_date", { ascending: false }),
    ]);

    const error = reqRes.error ?? supRes.error ?? invRes.error;
    if (error) {
      setMessage({ type: "error", text: "تعذّر تحميل البيانات المالية: " + error.message });
      return;
    }

    const a = reqRes.data as AgreedPrice;
    setAgreed(a);
    setPriceAmount(a.agreed_price === null ? "" : String(a.agreed_price));
    setPriceCurrency(a.agreed_currency);
    setPriceRate(String(a.agreed_exchange_rate));
    setSuppliers((supRes.data as Supplier[]) ?? []);
    setInvoices((invRes.data as SupplierInvoice[]) ?? []);
  }

  useEffect(() => {
    loadAll();
  }, [requestId]);

  function supplierName(id: string): string {
    return suppliers.find((s) => s.id === id)?.name ?? "—";
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const amount = Number(priceAmount);
    if (priceAmount.trim() === "" || Number.isNaN(amount) || amount < 0) {
      setMessage({ type: "error", text: "أدخل سعراً صحيحاً." });
      return;
    }

    const rate = priceCurrency === "DZD" ? 1 : Number(priceRate);
    if (!rate || rate <= 0) {
      setMessage({ type: "error", text: "أدخل سعر صرف صحيحاً." });
      return;
    }

    const { error } = await supabase
      .from("service_requests")
      .update({ agreed_price: amount, agreed_currency: priceCurrency, agreed_exchange_rate: rate })
      .eq("id", requestId);

    if (error) {
      setMessage({ type: "error", text: "تعذّر حفظ السعر: " + error.message });
      return;
    }

    setMessage({ type: "ok", text: "تم حفظ السعر المتفق عليه." });
    loadAll();
  }

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
      setMessage({ type: "error", text: "تعذّر إضافة المورد: " + (error?.message ?? "خطأ غير معروف") });
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

    const rate = invCurrency === "DZD" ? 1 : Number(invRate);
    if (!rate || rate <= 0) {
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
    setMessage({ type: "ok", text: "تم تسجيل المصروف كفاتورة مورد." });
    loadAll();
  }

  const buttonStyle = { padding: "0.5rem 0.9rem", marginTop: "0.5rem" };

  return (
    <section style={{ marginTop: "2rem", borderTop: "2px solid #ddd", paddingTop: "1rem" }}>
      <h2>السعر والمصاريف</h2>

      {message && (
        <p style={{ color: message.type === "error" ? "red" : "green" }}>{message.text}</p>
      )}

      <h3>السعر المتفق عليه</h3>
      <p style={{ color: "#666" }}>هذا السعر تعاقدي، ولا يُحتسب إيراداً إلا بعد اكتمال الخدمة.</p>

      {agreed?.agreed_price !== null && agreed?.agreed_price !== undefined && (
        <p>
          السعر الحالي: {Number(agreed.agreed_price).toLocaleString("ar-DZ")} {agreed.agreed_currency}
          {agreed.agreed_currency !== "DZD" && agreed.agreed_price_dzd !== null
            ? ` (≈ ${formatDzd(agreed.agreed_price_dzd)})`
            : ""}
        </p>
      )}

      <form onSubmit={savePrice}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          المبلغ
          <input
            inputMode="decimal"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          العملة
          <select
            value={priceCurrency}
            onChange={(e) => setPriceCurrency(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        {priceCurrency !== "DZD" && (
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            سعر الصرف إلى الدينار
            <input
              inputMode="decimal"
              value={priceRate}
              onChange={(e) => setPriceRate(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </label>
        )}
        <button type="submit" style={{ ...buttonStyle, width: "100%" }}>حفظ السعر</button>
      </form>

      <h3 style={{ marginTop: "2rem" }}>المصاريف (فواتير الموردين)</h3>
      <p style={{ color: "#666" }}>
        المصروف يُعترف به عند تسجيل فاتورة المورد، ولا يُحسب عند الحجز.
      </p>

      {invoices.length === 0 && <p>لا توجد فواتير موردين لهذا الطلب.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {invoices.map((inv) => (
          <li key={inv.id} style={{ borderBottom: "1px solid #ddd", padding: "0.5rem 0" }}>
            <div>{supplierName(inv.supplier_id)} · {inv.invoice_number}</div>
            <div>
              {formatDzd(inv.amount_dzd)}
              {inv.currency !== "DZD" ? ` (${Number(inv.amount).toLocaleString("ar-DZ")} ${inv.currency})` : ""}
            </div>
            <div>
              {INVOICE_STATUS_LABELS[inv.status] ?? inv.status} · تاريخ الفاتورة: {inv.issue_date}
              {inv.due_date ? ` · الاستحقاق: ${inv.due_date}` : ""}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={addExpense} style={{ marginTop: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          المورد
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            <option value="">مورد جديد</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        {!supplierId && (
          <>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              اسم المورد الجديد
              <input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              نوع المورد
              <select
                value={newSupplierType}
                onChange={(e) => setNewSupplierType(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                {Object.entries(SUPPLIER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          رقم فاتورة المورد
          <input
            value={invNumber}
            onChange={(e) => setInvNumber(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          المبلغ
          <input
            inputMode="decimal"
            value={invAmount}
            onChange={(e) => setInvAmount(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          العملة
          <select
            value={invCurrency}
            onChange={(e) => setInvCurrency(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        {invCurrency !== "DZD" && (
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            سعر الصرف إلى الدينار
            <input
              inputMode="decimal"
              value={invRate}
              onChange={(e) => setInvRate(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </label>
        )}
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          تاريخ الفاتورة
          <input
            type="date"
            value={invIssue}
            onChange={(e) => setInvIssue(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          تاريخ الاستحقاق (اختياري)
          <input
            type="date"
            value={invDue}
            onChange={(e) => setInvDue(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <button type="submit" style={{ ...buttonStyle, width: "100%" }}>تسجيل المصروف</button>
      </form>
    </section>
  );
}
