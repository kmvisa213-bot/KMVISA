"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SECTIONS = [
  {
    title: "طلبات B2C",
    description: "طلبات الأفراد، من الموقع أو المسجلة يدوياً",
    href: "/dashboard/requests?type=b2c",
  },
  {
    title: "زبائن B2C",
    description: "ملفات الأفراد، واسم كل زبون ورقمه وطلباته",
    href: "/dashboard/clients",
  },
  {
    title: "طلبات B2B",
    description: "طلبات الوكالات وممثليها، من الموقع أو المسجلة يدوياً",
    href: "/dashboard/requests?type=b2b",
  },
  {
    title: "المالية",
    description: "الإيرادات والمدفوعات والمتبقي والمصاريف والأرباح",
    href: "/dashboard/finance",
  },
  {
    title: "وكالات B2B",
    description: "ملفات الوكالات، وممثليها، وطلباتها",
    href: "/dashboard/agencies",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>لوحة التحكم</h1>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
        {SECTIONS.map((section) => (
          <button
            key={section.href}
            onClick={() => router.push(section.href)}
            style={{
              textAlign: "right",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "1rem",
              background: "white",
            }}
          >
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>{section.title}</strong>
            <span style={{ color: "#555" }}>{section.description}</span>
          </button>
        ))}
      </div>

      <button onClick={handleLogout} style={{ padding: "0.5rem 1rem" }}>
        تسجيل الخروج
      </button>
    </main>
  );
}
