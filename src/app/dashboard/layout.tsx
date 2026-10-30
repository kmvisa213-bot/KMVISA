"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Guards every page under /dashboard: only a signed-in owner can see them.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: ownerRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();

      if (!active) return;

      if (!ownerRow) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setReady(true);
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>جار التحقق من الصلاحيات...</p>
      </main>
    );
  }

  return <>{children}</>;
}
