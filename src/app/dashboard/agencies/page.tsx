"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { confirmDelete, deleteAgency, setArchived } from "@/lib/record-actions";

type Agency = {
  id: string;
  name: string;
  approval_status: "approved" | "suspended";
  notes: string | null;
  archived_at: string | null;
};

const DUPLICATE_MESSAGE = "اسم الوكالة مسجّل مسبقاً.";

export default function AgenciesPage() {
  const router = useRouter();

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Creation form
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function loadAgencies() {
    const { data, error } = await supabase
      .from("agencies")
      .select("id, name, approval_status, notes, archived_at")
      .order("name", { ascending: true });

    if (error) {
      setMessage({ type: "error", text: "تعذّر تحميل الوكالات: " + error.message });
      return;
    }
    setAgencies((data as Agency[]) ?? []);
  }

  useEffect(() => {
    loadAgencies();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const { error } = await supabase.from("agencies").insert({
      name: name.trim(),
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

    setName("");
    setNotes("");
    setMessage({ type: "ok", text: "تمت إضافة الوكالة." });
    loadAgencies();
  }

  function startEdit(agency: Agency) {
    setEditingId(agency.id);
    setEditName(agency.name);
    setEditNotes(agency.notes ?? "");
    setMessage(null);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setMessage(null);

    if (!editName.trim()) {
      setMessage({ type: "error", text: "اسم الوكالة مطلوب." });
      return;
    }

    const { error } = await supabase
      .from("agencies")
      .update({ name: editName.trim(), notes: editNotes.trim() || null })
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
    loadAgencies();
  }

  async function toggleStatus(agency: Agency) {
    setMessage(null);
    const next = agency.approval_status === "approved" ? "suspended" : "approved";

    const { error } = await supabase
      .from("agencies")
      .update({ approval_status: next })
      .eq("id", agency.id);

    if (error) {
      setMessage({ type: "error", text: "تعذّر تحديث الاعتماد: " + error.message });
      return;
    }
    setMessage({ type: "ok", text: next === "approved" ? "تم تفعيل الاعتماد." : "تم إيقاف الاعتماد." });
    loadAgencies();
  }

  async function toggleArchive(agency: Agency) {
    setMessage(null);
    const archive = agency.archived_at === null;
    const result = await setArchived("agencies", agency.id, archive);

    if (!result.ok) {
      setMessage({ type: "error", text: "تعذّر تنفيذ الإجراء: " + result.error });
      return;
    }
    setMessage({ type: "ok", text: archive ? "تمت أرشفة الوكالة." : "تمت استعادة الوكالة." });
    loadAgencies();
  }

  async function handleDelete(agency: Agency) {
    setMessage(null);
    if (!confirmDelete(`الوكالة ${agency.name}`)) return;

    const result = await deleteAgency(agency.id);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "ok", text: "تم حذف الوكالة نهائياً." });
    loadAgencies();
  }

  const visibleAgencies = agencies.filter((a) =>
    view === "active" ? a.archived_at === null : a.archived_at !== null
  );

  const buttonStyle = { padding: "0.4rem 0.8rem", marginRight: "0.5rem", marginTop: "0.5rem" };

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <button onClick={() => router.push("/dashboard")} style={buttonStyle}>
        رجوع إلى الأقسام
      </button>

      <h1>وكالات B2B</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setView("active")}
          style={{ flex: 1, padding: "0.5rem", fontWeight: view === "active" ? "bold" : "normal" }}
        >
          النشطة
        </button>
        <button
          onClick={() => setView("archived")}
          style={{ flex: 1, padding: "0.5rem", fontWeight: view === "archived" ? "bold" : "normal" }}
        >
          المؤرشفة
        </button>
      </div>

      {view === "active" && (
        <form onSubmit={handleCreate} style={{ marginBottom: "2rem" }}>
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
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem" }}>
            {loading ? "جار الحفظ..." : "إضافة وكالة"}
          </button>
        </form>
      )}

      {message && (
        <p style={{ color: message.type === "error" ? "red" : "green" }}>{message.text}</p>
      )}

      {visibleAgencies.length === 0 && (
        <p>{view === "active" ? "لا توجد وكالات نشطة." : "لا توجد وكالات مؤرشفة."}</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {visibleAgencies.map((agency) => (
          <li key={agency.id} style={{ borderBottom: "1px solid #ddd", padding: "0.75rem 0" }}>
            {editingId === agency.id ? (
              <form onSubmit={(e) => saveEdit(e, agency.id)}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  اسم الوكالة
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
                <strong>{agency.name}</strong>
                <div>الحالة: {agency.approval_status === "approved" ? "معتمدة" : "موقوفة"}</div>
                {agency.notes && <div>{agency.notes}</div>}

                <div>
                  <button onClick={() => router.push(`/dashboard/agencies/${agency.id}`)} style={buttonStyle}>
                    فتح الملف
                  </button>
                  <button onClick={() => startEdit(agency)} style={buttonStyle}>
                    تعديل
                  </button>
                  <button onClick={() => toggleStatus(agency)} style={buttonStyle}>
                    {agency.approval_status === "approved" ? "إيقاف الاعتماد" : "تفعيل الاعتماد"}
                  </button>
                  <button onClick={() => toggleArchive(agency)} style={buttonStyle}>
                    {agency.archived_at === null ? "أرشفة" : "استعادة"}
                  </button>
                  <button onClick={() => handleDelete(agency)} style={{ ...buttonStyle, color: "red" }}>
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
