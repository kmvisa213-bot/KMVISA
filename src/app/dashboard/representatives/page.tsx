"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Representatives are now managed inside each agency's profile.
export default function RepresentativesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/agencies");
  }, [router]);

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <p>إدارة الممثلين أصبحت داخل ملف كل وكالة. جار التحويل...</p>
    </main>
  );
}
