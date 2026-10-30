"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: ownerRow, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();

      if (!active) return;

      if (error || !ownerRow) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setStatus("allowed");
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (status === "checking") {
    return (
      <main style={{ padding: "2rem" }}>
        <p>جار التحقق من الصلاحيات...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>لوحة التحكم</h1>
      <p>تم تسجيل دخولك كمالك بنجاح.</p>
      <button onClick={handleLogout} style={{ padding: "0.5rem 1rem" }}>
        تسجيل الخروج
      </button>
    </main>
  );
}
