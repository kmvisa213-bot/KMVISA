"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>تسجيل دخول المالك</h1>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          البريد الإلكتروني
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          كلمة المرور
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {loading ? "جار التحقق..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
