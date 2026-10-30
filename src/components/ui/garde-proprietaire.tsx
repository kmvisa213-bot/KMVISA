"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Même contrôle que /dashboard : seul le propriétaire connecté voit ces pages.
export function GardeProprietaire({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();
      if (!actif) return;
      if (!role) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      setPret(true);
    })();
    return () => {
      actif = false;
    };
  }, [router]);

  if (!pret) return <p className="py-10 text-center text-sm text-muted">Vérification de l'accès…</p>;
  return <>{children}</>;
}
