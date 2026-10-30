"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
};

// Converts a local Algerian number (0XXXXXXXXX) or 00-prefixed number to +213 format.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+213" + digits.slice(1);
  return "+" + digits;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadClients() {
    const [clientRes, requestRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, phone, notes, created_at")
        .order("full_name", { ascending: true }),
      supabase.from("service_requests").select("client_id").not("client_id", "is", null),
    ]);

    const error = clientRes.error ?? requestRes.error;
    if (error) {
      setMessage("تعذّر تحميل الزبائن: " + error.message);
      return;
    }

    setClients((clientRes.data as Client[]) ?? []);

    const counts: Record<string, number> = {};
    for (const row of (requestRes.data as { client_id: string }[]) ?? []) {
      counts[row.client_id] = (counts[row.client_id] ?? 0) + 1;
    }
    setRequestCounts(counts);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const normalized = normalizePhone(phone);
    if (!/^\+[0-9]{8,15}$/.test(normalized)) {
      setMessage("صيغة الرقم غير صحيحة. مثال: 0550123456");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("clients").insert({
      full_name: fullName.trim(),
      phone: normalized,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "هذا الزبون مسجّل مسبقاً بنفس الاسم والرقم."
          : "تعذّر الحفظ: " + error.message
      );
      return;
    }

    setFullName("");
    setPhone("");
    setNotes("");
    setMessage("تم حفظ الزبون.");
    loadClients();
  }

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>الزبائن</h1>

      <p>
        <button onClick={() => router.push("/dashboard/requests")} style={{ padding: "0.4rem 0.8rem" }}>
          كل الطلبات
        </button>
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
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
          الهاتف
          <input
            required
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

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
          {loading ? "جار الحفظ..." : "إضافة زبون"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {clients.map((client) => (
          <li
            key={client.id}
            style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}
          >
            <strong>{client.full_name}</strong>
            <div style={{ direction: "ltr", textAlign: "right" }}>{client.phone}</div>
            <div>عدد الطلبات: {requestCounts[client.id] ?? 0}</div>
            {client.notes && <div>{client.notes}</div>}
            <button
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
            >
              فتح الملف
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
