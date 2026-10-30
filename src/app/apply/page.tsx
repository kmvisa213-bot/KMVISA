"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  COUNTRIES,
  COUNTRY_GROUP_LABELS,
  getCountryByCode,
  type CountryGroup,
  type CountryOption,
} from "@/lib/countries";
import {
  APPLICATION_TYPES,
  PRIORITY_DESTINATION_CODES,
  VISA_TYPES,
  getVisaType,
  type FieldDef,
} from "@/lib/visa-catalog";

const SERVICE_OPTIONS = [
  { value: "visa", label: "تأشيرة" },
  { value: "flight_ticket", label: "تذكرة طيران" },
  { value: "hotel_booking", label: "حجز فندق" },
  { value: "other", label: "خدمة أخرى" },
];

const GROUP_ORDER: CountryGroup[] = [
  "schengen",
  "europe",
  "north_america",
  "middle_east",
  "africa",
  "asia",
  "oceania",
  "south_america",
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
  if (raw.includes("invalid_visa_details")) {
    return "اختر الوجهة ونوع التأشيرة ونوع الطلب.";
  }
  if (raw.includes("invalid_service_type")) {
    return "نوع الخدمة غير معروف.";
  }
  return "حدث خطأ أثناء الإرسال. حاول مرة أخرى.";
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  const text = typeof value === "string" ? value : "";

  return (
    <label style={{ display: "block", marginBottom: "1rem" }}>
      {field.label}
      {field.type === "textarea" ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.5rem" }}
        />
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.5rem" }}
        />
      )}
    </label>
  );
}

export default function ApplyPage() {
  const [isAgency, setIsAgency] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");

  // Visa section
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState("");
  const [applicationType, setApplicationType] = useState("");
  const [extraValues, setExtraValues] = useState<Record<string, string | boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const selectedVisa = getVisaType(visaType);

  const priorityCountries = PRIORITY_DESTINATION_CODES
    .map((code) => getCountryByCode(code))
    .filter((c): c is CountryOption => c !== undefined);
  const prioritySet = new Set(PRIORITY_DESTINATION_CODES);

  function buildExtraFields(): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    if (!selectedVisa) return result;

    for (const field of selectedVisa.fields) {
      const raw = extraValues[field.key];
      if (raw === undefined || raw === "") continue;
      result[field.key] = field.type === "number" ? Number(raw) : raw;
    }
    return result;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!serviceType) {
      setError("Select Service Type");
      return;
    }

    if (serviceType === "visa" && (!destination || !visaType || !applicationType)) {
      setError("اختر الوجهة ونوع التأشيرة ونوع الطلب.");
      return;
    }

    setLoading(true);

    const isVisa = serviceType === "visa";

    const { data, error: rpcError } = await supabase.rpc("submit_public_request_v2", {
      p_full_name: fullName,
      p_phone: phone,
      p_service_type: serviceType,
      p_notes: notes,
      p_is_agency: isAgency,
      p_agency_name: agencyName,
      p_representative_name: representativeName,
      p_country: isVisa ? destination : null,
      p_visa_category: isVisa ? visaType : null,
      p_application_type: isVisa ? applicationType : null,
      p_visa_extra: isVisa ? buildExtraFields() : {},
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
            <option value="" disabled>
              Select Service Type
            </option>
            {SERVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {serviceType === "visa" && (
          <>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              الوجهة
              <select
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                <option value="">اختر الوجهة</option>
                <optgroup label="الوجهات الأكثر طلباً">
                  {priorityCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.nameAr}
                    </option>
                  ))}
                </optgroup>
                {GROUP_ORDER.map((group) => {
                  const items = COUNTRIES.filter(
                    (c) => c.group === group && !prioritySet.has(c.code)
                  );
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={group} label={COUNTRY_GROUP_LABELS[group]}>
                      {items.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.nameAr}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              نوع التأشيرة
              <select
                required
                value={visaType}
                onChange={(e) => {
                  setVisaType(e.target.value);
                  setExtraValues({});
                }}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                <option value="">اختر نوع التأشيرة</option>
                {VISA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.labelAr}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              نوع الطلب
              <select
                required
                value={applicationType}
                onChange={(e) => setApplicationType(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                <option value="">اختر نوع الطلب</option>
                {APPLICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.labelAr}
                  </option>
                ))}
              </select>
            </label>

            {selectedVisa &&
              selectedVisa.fields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={extraValues[field.key]}
                  onChange={(value) =>
                    setExtraValues((prev) => ({ ...prev, [field.key]: value }))
                  }
                />
              ))}
          </>
        )}

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
