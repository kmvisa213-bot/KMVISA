"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Visa fields
  const [country, setCountry] = useState("");
  const [visaType, setVisaType] = useState("");
  const [expectedTravelDate, setExpectedTravelDate] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [previousVisaHistory, setPreviousVisaHistory] = useState("");

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
        if (data) {
          setCountry(data.country ?? "");
          setVisaType(data.visa_type ?? "");
          setExpectedTravelDate(data.expected_travel_date ?? "");
          setAppointmentDate(data.appointment_date ?? "");
          setPreviousVisaHistory(data.previous_visa_history ?? "");
        }
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

    setSaving(true);
    setMessage(null);

    let saveError: { message: string } | null = null;

    if (request.service_type === "visa") {
      const res = await supabase.from("visa_details").upsert({
        request_id: requestId,
        country: toNull(country),
        visa_type: toNull(visaType),
        expected_travel_date: toNull(expectedTravelDate),
        appointment_date: toNull(appointmentDate),
        previous_visa_history: toNull(previousVisaHistory),
      });
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

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>{request.reference}</h1>
      <p>نوع الخدمة: {SERVICE_LABELS[request.service_type] ?? request.service_type}</p>

      <form onSubmit={handleSave}>
        {request.service_type === "visa" && (
          <>
            <Field label="الدولة" value={country} onChange={setCountry} />
            <Field label="نوع التأشيرة" value={visaType} onChange={setVisaType} />
            <Field label="تاريخ السفر المتوقع" value={expectedTravelDate} onChange={setExpectedTravelDate} type="date" />
            <Field label="تاريخ الموعد" value={appointmentDate} onChange={setAppointmentDate} type="date" />
            <Field label="سجل التأشيرات السابقة" value={previousVisaHistory} onChange={setPreviousVisaHistory} />
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
    </main>
  );
}
