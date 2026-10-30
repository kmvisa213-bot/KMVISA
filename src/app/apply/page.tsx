"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const SERVICE_OPTIONS = [
  { value: "visa", label: "تأشيرة" },
  { value: "flight_ticket", label: "تذكرة طيران" },
  { value: "hotel_booking", label: "حجز فندق" },
  { value: "other", label: "خدمة أخرى" },
];

// Generic messages only: never reveal which agencies or names exist.
function errorMessage(raw: string): string {
  if (raw.includes("invalid_agency_pair")) {
    return "تعذّر التحقق من بيانات الوكالة. تأكد من الاسم كما هو مسجّل لدينا.";
  }
  if (raw.includes("invalid_phone")) {
    return "رقم الهاتف غير صحيح. مثال: 0550123456";
  }
  if (raw.includes("invalid_name")) {
    return "الرجاء كتابة الاسم الكامل.";
  }
  if (raw.includes("invalid_service_type")) {
    return "نوع الخدمة غير معروف.";
  }
  return "حدث خطأ أثناء الإرسال. حاول مرة أخرى.";
}

export default function ApplyPage() {
  const [isAgency, setIsAgency] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("visa");
  const [notes, setNotes] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc("submit_public_request", {
      p_full_name: fullName,
      p_phone: phone,
      p_service_type: serviceType,
      p_notes: notes,
      p_is_agency: isAgency,
      p_agency_name: agencyName,
      p_representative_name: representativeName,
    });

    setLoading(false);

    if (rpcError) {
      setError(errorMessage(rpcError.message));
      return;
    }

    setReference(data as string);
  }

  if (reference) {
    return (
      <main style={{ maxWidth: 480, margin: "3rem auto", padding: "0 1rem", textAlign: "center" }}>
        <h1>تم استلام طلبك</h1>
        <p>احتفظ بالرقم المرجعي التالي لمتابعة طلبك:</p>
        <p style={{ fontSize: "1.75rem", fontWeight: "bold", direction: "ltr" }}>{reference}</p>
        <p>سنتواصل معك قريباً.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>طلب خدمة</h1>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={isAgency}
            onChange={(e) => setIsAgency(e.target.checked)}
          />
          أنا أقدّم الطلب باسم وكالة
        </label>

        {isAgency ? (
          <>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              اسم الوكالة
              <input
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              اسم الممثل
              <input
                required
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
          </>
        ) : (
          <>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              الاسم الكامل
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              رقم الهاتف
              <input
                required
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
          </>
        )}

        <label style={{ display: "block", marginBottom: "1rem" }}>
          نوع الخدمة
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {SERVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          ملاحظات (اختياري)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem" }}>
          {loading ? "جار الإرسال..." : "إرسال الطلب"}
        </button>
      </form>
    </main>
  );
}
