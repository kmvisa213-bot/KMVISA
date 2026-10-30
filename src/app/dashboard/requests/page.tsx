"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

type Client = { id: string; full_name: string };

type RequestRow = {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  client_id: string | null;
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

export default function RequestsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [visaByRequest, setVisaByRequest] = useState<Record<string, VisaInfo>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Common form fields
  const [serviceType, setServiceType] = useState("visa");
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");

  // Visa form fields
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState("");
  const [applicationType, setApplicationType] = useState("");
  const [extraValues, setExtraValues] = useState<Record<string, string | boolean>>({});

  const selectedVisa = getVisaType(visaType);

  async function loadAll() {
    const [clientRes, reqRes, visaRes] = await Promise.all([
      supabase.from("clients").select("id, full_name").order("full_name", { ascending: true }),
      supabase
        .from("service_requests")
        .select("id, reference, service_type, status, client_id, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("visa_details")
        .select("request_id, country, visa_category, application_type"),
    ]);

    const error = clientRes.error ?? reqRes.error ?? visaRes.error;
    if (error) {
      setMessage("تعذّر تحميل البيانات: " + error.message);
      return;
    }

    setClients((clientRes.data as Client[]) ?? []);
    setRequests((reqRes.data as RequestRow[]) ?? []);

    const map: Record<string, VisaInfo> = {};
    for (const row of (visaRes.data as VisaInfo[]) ?? []) {
      map[row.request_id] = row;
    }
    setVisaByRequest(map);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function clientName(id: string | null): string {
    if (!id) return "بدون ملف بعد";
    return clients.find((c) => c.id === id)?.full_name ?? "—";
  }

  function visaTypeLabel(value: string | null): string {
    if (!value) return "—";
    return getVisaType(value)?.labelAr ?? value;
  }

  function applicationTypeLabel(value: string | null): string {
    if (!value) return "—";
    return APPLICATION_TYPES.find((t) => t.value === value)?.labelAr ?? value;
  }

  function countryLabel(code: string | null): string {
    if (!code) return "—";
    return getCountryByCode(code)?.nameAr ?? code;
  }

  function resetForm() {
    setClientId("");
    setNotes("");
    setDestination("");
    setVisaType("");
    setApplicationType("");
    setExtraValues({});
  }

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
    setMessage(null);

    if (serviceType === "visa" && (!destination || !visaType || !applicationType)) {
      setMessage("اختر الوجهة ونوع التأشيرة ونوع الطلب.");
      return;
    }

    setLoading(true);

    const { data: created, error: requestError } = await supabase
      .from("service_requests")
      .insert({
        service_type: serviceType,
        client_id: clientId || null,
        source: "manual",
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (requestError || !created) {
      setLoading(false);
      setMessage("تعذّر الحفظ: " + (requestError?.message ?? "خطأ غير معروف"));
      return;
    }

    if (serviceType === "visa") {
      const { error: visaError } = await supabase.from("visa_details").insert({
        request_id: created.id,
        country: destination,
        visa_category: visaType,
        application_type: applicationType,
        extra_fields: buildExtraFields(),
      });

      if (visaError) {
        setLoading(false);
        setMessage("تم إنشاء الطلب، لكن تعذّر حفظ تفاصيل التأشيرة: " + visaError.message);
        loadAll();
        return;
      }
    }

    setLoading(false);
    resetForm();
    setMessage("تم إنشاء الطلب بحالة استفسار.");
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

  // Destination dropdown: priority countries first, then the rest by group.
  const priorityCountries = PRIORITY_DESTINATION_CODES
    .map((code) => getCountryByCode(code))
    .filter((c): c is CountryOption => c !== undefined);
  const prioritySet = new Set(PRIORITY_DESTINATION_CODES);

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
        {requests.map((row) => {
          const visa = visaByRequest[row.id];
          return (
            <li
              key={row.id}
              style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}
            >
              <strong>{row.reference}</strong>
              <div>{SERVICE_LABELS[row.service_type] ?? row.service_type}</div>
              {visa && (
                <>
                  <div>الوجهة: {countryLabel(visa.country)}</div>
                  <div>نوع التأشيرة: {visaTypeLabel(visa.visa_category)}</div>
                  <div>نوع الطلب: {applicationTypeLabel(visa.application_type)}</div>
                </>
              )}
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
          );
        })}
      </ul>
    </main>
  );
}
