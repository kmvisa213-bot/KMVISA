"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { confirmDelete, deleteClient, setArchived } from "@/lib/record-actions";

type Client = {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  archived_at: string | null;
};

// Converts a local Algerian number (0XXXXXXXXX) or 00-prefixed number to +213 format.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+213" + digits.slice(1);
  return "+" + digits;
}

const DUPLICATE_MESSAGE = "هذا الزبون مسجّل مسبقاً بنفس الاسم والرقم.";

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [view, setView] = useState<"active" | "archived">("active");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Creation form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function loadClients() {
    const [clientRes, requestRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, phone, notes, archived_at")
        .order("full_name", { ascending: true }),
      supabase.from("service_requests").select("client_id").not("client_id", "is", null),
    ]);

    const error = clientRes.error ?? requestRes.error;
    if (error) {
      setMessage({ type: "error", text: "تعذّر تحميل الزبائن: " + error.message });
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const normalized = normalizePhone(phone);
    if (!/^\+[0-9]{8,15}$/.test(normalized)) {
      setMessage({ type: "error", text: "صيغة الرقم غير صحيحة. مثال: 0550123456" });
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
      setMessage({
        type: "error",
        text: error.code === "23505" ? DUPLICATE_MESSAGE : "تعذّر الحفظ: " + error.message,
      });
      return;
    }

    setFullName("");
    setPhone("");
    setNotes("");
    setMessage({ type: "ok", text: "تم حفظ الزبون." });
    loadClients();
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setEditName(client.full_name);
    setEditPhone(client.phone);
    setEditNotes(client.notes ?? "");
    setMessage(null);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setMessage(null);

    if (!editName.trim()) {
      setMessage({ type: "error", text: "الاسم مطلوب." });
      return;
    }

    const normalized = normalizePhone(editPhone);
    if (!/^\+[0-9]{8,15}$/.test(normalized)) {
      setMessage({ type: "error", text: "صيغة الرقم غير صحيحة. مثال: 0550123456" });
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update({
        full_name: editName.trim(),
        phone: normalized,
        notes: editNotes.trim() || null,
      })
      .eq("id", id);

    if (error) {
      setMessage({
        type: "error",
        text: error.code === "23505" ? DUPLICATE_MESSAGE : "تعذّر التعديل: " + error.message,
      });
      return;
    }

    setEditingId(null);
    setMessage({ type: "ok", text: "تم حفظ التعديلات." });
    loadClients();
  }

  async function toggleArchive(client: Client) {
    setMessage(null);
    const archive = client.archived_at === null;
    const result = await setArchived("clients", client.id, archive);

    if (!result.ok) {
      setMessage({ type: "error", text: "تعذّر تنفيذ الإجراء: " + result.error });
      return;
    }
    setMessage({
      type: "ok",
      text: archive ? "تمت أرشفة الزبون." : "تمت استعادة الزبون.",
    });
    loadClients();
  }

  async function handleDelete(client: Client) {
    setMessage(null);
    if (!confirmDelete(`الزبون ${client.full_name}`)) return;

    const result = await deleteClient(client.id);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "ok", text: "تم حذف الزبون نهائياً." });
    loadClients();
  }

  const visibleClients = clients.filter((c) =>
    view === "active" ? c.archived_at === null : c.archived_at !== null
  );

  const buttonStyle = { padding: "0.4rem 0.8rem", marginRight: "0.5rem", marginTop: "0.5rem" };

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <button onClick={() => router.push("/dashboard")} style={buttonStyle}>
        رجوع إلى الأقسام
      </button>

      <h1>زبائن B2C</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setView("active")}
          style={{ flex: 1, padding: "0.5rem", fontWeight: view === "active" ? "bold" : "normal" }}
        >
          النشطون
        </button>
        <button
          onClick={() => setView("archived")}
          style={{ flex: 1, padding: "0.5rem", fontWeight: view === "archived" ? "bold" : "normal" }}
        >
          المؤرشفون
        </button>
      </div>

      {view === "active" && (
        <form onSubmit={handleCreate} style={{ marginBottom: "2rem" }}>
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
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem" }}>
            {loading ? "جار الحفظ..." : "إضافة زبون"}
          </button>
        </form>
      )}

      {message && (
        <p style={{ color: message.type === "error" ? "red" : "green" }}>{message.text}</p>
      )}

      {visibleClients.length === 0 && (
        <p>{view === "active" ? "لا يوجد زبائن نشطون." : "لا يوجد زبائن مؤرشفون."}</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {visibleClients.map((client) => (
          <li key={client.id} style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}>
            {editingId === client.id ? (
              <form onSubmit={(e) => saveEdit(e, client.id)}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  الاسم الكامل
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ display: "block", width: "100%", padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  الهاتف
                  <input
                    required
                    inputMode="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{ display: "block", width: "100%", padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  ملاحظات
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    style={{ display: "block", width: "100%", padding: "0.5rem" }}
                  />
                </label>
                <button type="submit" style={buttonStyle}>حفظ التعديل</button>
                <button type="button" onClick={() => setEditingId(null)} style={buttonStyle}>
                  إلغاء
                </button>
              </form>
            ) : (
              <>
                <strong>{client.full_name}</strong>
                <div style={{ direction: "ltr", textAlign: "right" }}>{client.phone}</div>
                <div>عدد الطلبات: {requestCounts[client.id] ?? 0}</div>
                {client.notes && <div>{client.notes}</div>}

                <div>
                  <button onClick={() => router.push(`/dashboard/clients/${client.id}`)} style={buttonStyle}>
                    فتح الملف
                  </button>
                  <button onClick={() => startEdit(client)} style={buttonStyle}>
                    تعديل
                  </button>
                  <button onClick={() => toggleArchive(client)} style={buttonStyle}>
                    {client.archived_at === null ? "أرشفة" : "استعادة"}
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    style={{ ...buttonStyle, color: "red" }}
                  >
                    حذف
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
