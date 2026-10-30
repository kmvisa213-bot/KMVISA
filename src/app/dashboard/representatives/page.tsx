"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Agency = { id: string; name: string };

type Representative = {
  id: string;
  agency_id: string;
  full_name: string;
  phone: string | null;
};

// Converts a local Algerian number (0XXXXXXXXX) or 00-prefixed number to +213 format.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+213" + digits.slice(1);
  return "+" + digits;
}

export default function RepresentativesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    const [agencyRes, repRes] = await Promise.all([
      supabase.from("agencies").select("id, name").order("name", { ascending: true }),
      supabase
        .from("agency_representatives")
        .select("id, agency_id, full_name, phone")
        .order("full_name", { ascending: true }),
    ]);

    const error = agencyRes.error ?? repRes.error;
    if (error) {
      setMessage("تعذّر تحميل البيانات: " + error.message);
      return;
    }

    setAgencies((agencyRes.data as Agency[]) ?? []);
    setRepresentatives((repRes.data as Representative[]) ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function agencyName(id: string): string {
    return agencies.find((a) => a.id === id)?.name ?? "—";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!agencyId) {
      setMessage("اختر وكالة أولاً.");
      return;
    }

    let normalizedPhone: string | null = null;
    if (phone.trim()) {
      normalizedPhone = normalizePhone(phone);
      if (!/^\+[0-9]{8,15}$/.test(normalizedPhone)) {
        setMessage("صيغة الرقم غير صحيحة. مثال: 0550123456");
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.from("agency_representatives").insert({
      agency_id: agencyId,
      full_name: fullName.trim(),
      phone: normalizedPhone,
    });

    setLoading(false);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "هذا الممثل مسجّل مسبقاً في الوكالة نفسها."
          : "تعذّر الحفظ: " + error.message
      );
      return;
    }

    setFullName("");
    setPhone("");
    setMessage("تمت إضافة الممثل.");
    loadAll();
  }

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>ممثلو الوكالات</h1>

      {agencies.length === 0 && (
        <p>لا توجد وكالات بعد. أضف وكالة من صفحة الوكالات أولاً.</p>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          الوكالة
          <select
            required
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            <option value="">اختر وكالة</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          اسم الممثل
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          الهاتف (اختياري)
          <input
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {loading ? "جار الحفظ..." : "إضافة ممثل"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {representatives.map((rep) => (
          <li
            key={rep.id}
            style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}
          >
            <strong>{rep.full_name}</strong>
            <div>الوكالة: {agencyName(rep.agency_id)}</div>
            {rep.phone && <div>{rep.phone}</div>}
          </li>
        ))}
      </ul>
    </main>
  );
}
