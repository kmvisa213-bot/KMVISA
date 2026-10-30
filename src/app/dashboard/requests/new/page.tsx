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

type Category = "b2c" | "b2b";
type Client = { id: string; full_name: string; phone: string };
type Agency = { id: string; name: string; approval_status: string };
type Representative = { id: string; full_name: string; agency_id: string; is_active: boolean };

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

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+213" + digits.slice(1);
  return "+" + digits;
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

export default function NewRequestPage() {
  const router = useRouter();

  const [category, setCategory] = useState<Category>("b2c");
  const [clients, setClients] = useState<Client[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [serviceType, setServiceType] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [representativeId, setRepresentativeId] = useState("");
  const [notes, setNotes] = useState("");

  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState("");
  const [applicationType, setApplicationType] = useState("");
  const [extraValues, setExtraValues] = useState<Record<string, string | boolean>>({});

  const selectedVisa = getVisaType(visaType);

  const priorityCountries = PRIORITY_DESTINATION_CODES
    .map((code) => getCountryByCode(code))
    .filter((c): c is CountryOption => c !== undefined);
  const prioritySet = new Set(PRIORITY_DESTINATION_CODES);

  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "b2b") setCategory("b2b");

    async function load() {
      const [clientRes, agencyRes, repRes] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone").order("full_name", { ascending: true }),
        supabase.from("agencies").select("id, name, approval_status").order("name", { ascending: true }),
        supabase.from("agency_representatives").select("id, full_name, agency_id, is_active").order("full_name", { ascending: true }),
      ]);

      const error = clientRes.error ?? agencyRes.error ?? repRes.error;
      if (error) {
        setMessage("تعذّر تحميل البيانات: " + error.message);
        return;
      }

      setClients((clientRes.data as Client[]) ?? []);
      setAgencies((agencyRes.data as Agency[]) ?? []);
      setRepresentatives((repRes.data as Representative[]) ?? []);
    }

    load();
  }, []);

  function switchCategory(next: Category) {
    setCategory(next);
    setClientId("");
    setContactName("");
    setContactPhone("");
    setAgencyId("");
    setRepresentativeId("");
    setMessage(null);
  }

  const agencyRepresentatives = representatives.filter(
    (r) => r.agency_id === agencyId && r.is_active
  );

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

  // B2C identity = name AND phone together (decision D234)
  async function findExistingClient(name: string, phone: string): Promise<string | null> {
    const { data } = await supabase.from("clients").select("id, full_name").eq("phone", phone);
    const match = ((data as { id: string; full_name: string }[]) ?? []).find(
      (c) => c.full_name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    return match ? match.id : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!serviceType) {
      setMessage("Select Service Type");
      return;
    }

    if (serviceType === "visa" && (!destination || !visaType || !applicationType)) {
      setMessage("اختر الوجهة ونوع التأشيرة ونوع الطلب.");
      return;
    }

    let resolvedClientId: string | null = null;
    let savedContactName: string | null = null;
    let savedContactPhone: string | null = null;
    let savedAgencyId: string | null = null;
    let savedRepId: string | null = null;

    if (category === "b2b") {
      if (!agencyId || !representativeId) {
        setMessage("اختر الوكالة والممثل.");
        return;
      }
      savedAgencyId = agencyId;
      savedRepId = representativeId;
    } else {
      if (clientId) {
        resolvedClientId = clientId;
      } else {
        if (!contactName.trim() || !contactPhone.trim()) {
          setMessage("اختر زبوناً، أو أدخل الاسم والهاتف.");
          return;
        }

        const normalized = normalizePhone(contactPhone);
        if (!/^\+[0-9]{8,15}$/.test(normalized)) {
          setMessage("صيغة الرقم غير صحيحة. مثال: 0550123456");
          return;
        }

        resolvedClientId = await findExistingClient(contactName, normalized);
        savedContactName = contactName.trim();
        savedContactPhone = normalized;
      }
    }

    setLoading(true);

    const { data: created, error: requestError } = await supabase
      .from("service_requests")
      .insert({
        service_type: serviceType,
        client_id: resolvedClientId,
        agency_id: savedAgencyId,
        representative_id: savedRepId,
        source: "manual",
        notes: notes.trim() || null,
        contact_name: savedContactName,
        contact_phone: savedContactPhone,
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
        return;
      }
    }

    setLoading(false);
    router.push(category === "b2b" ? "/dashboard/requests?type=b2b" : "/dashboard/requests?type=b2c");
  }

  const isB2b = category === "b2b";

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <button
        onClick={() => router.push(`/dashboard/requests?type=${category}`)}
        style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem" }}
      >
        رجوع
      </button>

      <h1>طلب جديد</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => switchCategory("b2c")}
          style={{ flex: 1, padding: "0.6rem", fontWeight: !isB2b ? "bold" : "normal" }}
        >
          B2C (فرد)
        </button>
        <button
          type="button"
          onClick={() => switchCategory("b2b")}
          style={{ flex: 1, padding: "0.6rem", fontWeight: isB2b ? "bold" : "normal" }}
        >
          B2B (وكالة)
        </button>
      </div>

      <form onSubmit={handleSubmit}>
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
            {Object.entries(SERVICE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {!isB2b && (
          <>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              الزبون الموجود (اختياري)
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                <option value="">زبون جديد أو غير مسجّل</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} · {client.phone}
                  </option>
                ))}
              </select>
            </label>

            {!clientId && (
              <>
                <label style={{ display: "block", marginBottom: "1rem" }}>
                  الاسم الكامل
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    style={{ display: "block", width: "100%", padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "block", marginBottom: "1rem" }}>
                  رقم الهاتف
                  <input
                    inputMode="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={{ display: "block", width: "100%", padding: "0.5rem" }}
                  />
                </label>
              </>
            )}
          </>
        )}

        {isB2b && (
          <>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              الوكالة
              <select
                required
                value={agencyId}
                onChange={(e) => {
                  setAgencyId(e.target.value);
                  setRepresentativeId("");
                }}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                <option value="">اختر الوكالة</option>
                {agencies
                  .filter((a) => a.approval_status === "approved")
                  .map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              الممثل
              <select
                required
                value={representativeId}
                onChange={(e) => setRepresentativeId(e.target.value)}
                disabled={!agencyId}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              >
                <option value="">اختر الممثل</option>
                {agencyRepresentatives.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.full_name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

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

        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem" }}>
          {loading ? "جار الحفظ..." : "حفظ الطلب"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}
