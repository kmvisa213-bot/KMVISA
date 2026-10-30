"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RequestFinance from "@/components/request-finance";
import {
  COUNTRIES,
  COUNTRY_GROUP_LABELS,
  getCountryByCode,
  type CountryGroup,
} from "@/lib/countries";
import {
  APPLICATION_TYPES,
  PRIORITY_DESTINATION_CODES,
  VISA_TYPES,
  getVisaType,
  type FieldDef,
} from "@/lib/visa-catalog";
import {
  EMPTY_VISA_FORM,
  visaFormToRow,
  visaRowToForm,
  type VisaDetailsRow,
  type VisaFormValues,
} from "@/lib/visa-form";

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
};

const SERVICE_LABELS: Record<string, string> = {
  visa: "تأشيرة",
  flight_ticket: "تذكرة طيران",
  hotel_booking: "حجز فندق",
  other: "أخرى",
};

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

function toNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label style={{ display: "block", marginBottom: "1rem" }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ display: "block", width: "100%", padding: "0.5rem" }}
      />
    </label>
  );
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

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Visa section: same mapping as the requests page (src/lib/visa-form.ts)
  const [visa, setVisa] = useState<VisaFormValues>(EMPTY_VISA_FORM);

  // Flight fields
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("");

  // Hotel fields
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");
  const [roomType, setRoomType] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");

  function updateVisa(patch: Partial<VisaFormValues>) {
    setVisa((prev) => ({ ...prev, ...patch }));
  }

  function setExtra(key: string, value: string | boolean) {
    setVisa((prev) => ({ ...prev, extra: { ...prev.extra, [key]: value } }));
  }

  useEffect(() => {
    async function load() {
      const { data: req, error } = await supabase
        .from("service_requests")
        .select("id, reference, service_type, status")
        .eq("id", requestId)
        .single();

      if (error || !req) {
        setMessage("تعذّر تحميل الطلب.");
        return;
      }
      setRequest(req as RequestRow);

      if (req.service_type === "visa") {
        const { data } = await supabase
          .from("visa_details")
          .select("*")
          .eq("request_id", requestId)
          .maybeSingle();
        setVisa(visaRowToForm((data as VisaDetailsRow | null) ?? null));
      }

      if (req.service_type === "flight_ticket") {
        const { data } = await supabase
          .from("flight_details")
          .select("*")
          .eq("request_id", requestId)
          .maybeSingle();
        if (data) {
          setOrigin(data.origin ?? "");
          setDestination(data.destination ?? "");
          setDepartureDate(data.departure_date ?? "");
          setReturnDate(data.return_date ?? "");
          setPassengers(data.passengers?.toString() ?? "");
        }
      }

      if (req.service_type === "hotel_booking") {
        const { data } = await supabase
          .from("hotel_details")
          .select("*")
          .eq("request_id", requestId)
          .maybeSingle();
        if (data) {
          setHotelName(data.hotel_name ?? "");
          setCity(data.city ?? "");
          setCheckIn(data.check_in ?? "");
          setCheckOut(data.check_out ?? "");
          setGuests(data.guests?.toString() ?? "");
          setRoomType(data.room_type ?? "");
          setConfirmationCode(data.confirmation_code ?? "");
        }
      }
    }

    load();
  }, [requestId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;

    setMessage(null);

    if (request.service_type === "visa") {
      if (!visa.country || !visa.visaCategory || !visa.applicationType) {
        setMessage("اختر الوجهة ونوع التأشيرة ونوع الطلب قبل الحفظ.");
        return;
      }
    }

    setSaving(true);

    let saveError: { message: string } | null = null;

    if (request.service_type === "visa") {
      const res = await supabase
        .from("visa_details")
        .upsert(visaFormToRow(requestId, visa));
      saveError = res.error;
    }

    if (request.service_type === "flight_ticket") {
      const res = await supabase.from("flight_details").upsert({
        request_id: requestId,
        origin: toNull(origin),
        destination: toNull(destination),
        departure_date: toNull(departureDate),
        return_date: toNull(returnDate),
        passengers: toNumberOrNull(passengers),
      });
      saveError = res.error;
    }

    if (request.service_type === "hotel_booking") {
      const res = await supabase.from("hotel_details").upsert({
        request_id: requestId,
        hotel_name: toNull(hotelName),
        city: toNull(city),
        check_in: toNull(checkIn),
        check_out: toNull(checkOut),
        guests: toNumberOrNull(guests),
        room_type: toNull(roomType),
        confirmation_code: toNull(confirmationCode),
      });
      saveError = res.error;
    }

    setSaving(false);
    setMessage(saveError ? "تعذّر الحفظ: " + saveError.message : "تم حفظ التفاصيل.");
  }

  if (!request) {
    return (
      <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
        <p>{message ?? "جار التحميل..."}</p>
      </main>
    );
  }

  const selectedCategory = getVisaType(visa.visaCategory);

  const priorityCountries = PRIORITY_DESTINATION_CODES
    .map((code) => getCountryByCode(code))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  const prioritySet = new Set(PRIORITY_DESTINATION_CODES);

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>{request.reference}</h1>
      <p>نوع الخدمة: {SERVICE_LABELS[request.service_type] ?? request.service_type}</p>

      <form onSubmit={handleSave}>
        {request.service_type === "visa" && (
          <>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              الوجهة
              <select
                required
                value={visa.country}
                onChange={(e) => updateVisa({ country: e.target.value })}
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
                value={visa.visaCategory}
                onChange={(e) => updateVisa({ visaCategory: e.target.value, extra: {} })}
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
                value={visa.applicationType}
                onChange={(e) => updateVisa({ applicationType: e.target.value })}
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

            <Field
              label="تاريخ السفر المتوقع"
              value={visa.expectedTravelDate}
              onChange={(v) => updateVisa({ expectedTravelDate: v })}
              type="date"
            />
            <Field
              label="تاريخ الموعد"
              value={visa.appointmentDate}
              onChange={(v) => updateVisa({ appointmentDate: v })}
              type="date"
            />
            <Field
              label="سجل التأشيرات السابقة"
              value={visa.previousVisaHistory}
              onChange={(v) => updateVisa({ previousVisaHistory: v })}
            />

            {selectedCategory &&
              selectedCategory.fields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={visa.extra[field.key]}
                  onChange={(value) => setExtra(field.key, value)}
                />
              ))}
          </>
        )}

        {request.service_type === "flight_ticket" && (
          <>
            <Field label="مدينة المغادرة" value={origin} onChange={setOrigin} />
            <Field label="الوجهة" value={destination} onChange={setDestination} />
            <Field label="تاريخ الذهاب" value={departureDate} onChange={setDepartureDate} type="date" />
            <Field label="تاريخ العودة" value={returnDate} onChange={setReturnDate} type="date" />
            <Field label="عدد المسافرين" value={passengers} onChange={setPassengers} type="number" />
          </>
        )}

        {request.service_type === "hotel_booking" && (
          <>
            <Field label="اسم الفندق" value={hotelName} onChange={setHotelName} />
            <Field label="المدينة" value={city} onChange={setCity} />
            <Field label="تاريخ الدخول" value={checkIn} onChange={setCheckIn} type="date" />
            <Field label="تاريخ الخروج" value={checkOut} onChange={setCheckOut} type="date" />
            <Field label="عدد الضيوف" value={guests} onChange={setGuests} type="number" />
            <Field label="نوع الغرفة" value={roomType} onChange={setRoomType} />
            <Field label="رقم التأكيد" value={confirmationCode} onChange={setConfirmationCode} />
          </>
        )}

        {(request.service_type === "visa" ||
          request.service_type === "flight_ticket" ||
          request.service_type === "hotel_booking") && (
          <button type="submit" disabled={saving} style={{ width: "100%", padding: "0.75rem" }}>
            {saving ? "جار الحفظ..." : "حفظ التفاصيل"}
          </button>
        )}
      </form>

      {message && <p>{message}</p>}

      <RequestFinance requestId={requestId} />
    </main>
  );
}
