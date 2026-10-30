"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Agency = {
  id: string;
  name: string;
  approval_status: "approved" | "suspended";
  notes: string | null;
};

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAgencies() {
    const { data, error } = await supabase
      .from("agencies")
      .select("id, name, approval_status, notes")
      .order("name", { ascending: true });

    if (error) {
      setMessage("تعذّر تحميل الوكالات: " + error.message);
      return;
    }
    setAgencies((data as Agency[]) ?? []);
  }

  useEffect(() => {
    loadAgencies();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const { error } = await supabase.from("agencies").insert({
      name: name.trim(),
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "اسم الوكالة مسجّل مسبقاً."
          : "تعذّر الحفظ: " + error.message
      );
      return;
    }

    setName("");
    setNotes("");
    setMessage("تمت إضافة الوكالة.");
    loadAgencies();
  }

  async function toggleStatus(agency: Agency) {
    const next = agency.approval_status === "approved" ? "suspended" : "approved";

    const { error } = await supabase
      .from("agencies")
      .update({ approval_status: next })
      .eq("id", agency.id);

    if (error) {
      setMessage("تعذّر تحديث الحالة: " + error.message);
      return;
    }
    loadAgencies();
  }

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>الوكالات</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          اسم الوكالة
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          {loading ? "جار الحفظ..." : "إضافة وكالة"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {agencies.map((agency) => (
          <li
            key={agency.id}
            style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}
          >
            <strong>{agency.name}</strong>
            <div>
              الحالة: {agency.approval_status === "approved" ? "معتمدة" : "موقوفة"}
            </div>
            {agency.notes && <div>{agency.notes}</div>}
            <button
              onClick={() => toggleStatus(agency)}
              style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem" }}
            >
              {agency.approval_status === "approved" ? "إيقاف الاعتماد" : "تفعيل الاعتماد"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
