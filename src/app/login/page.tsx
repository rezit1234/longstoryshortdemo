"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import "./login.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError("Neplatné přihlašovací údaje.");
        setLoading(false);
        return;
      }

      const next = searchParams.get("next") || "/admin";
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Přihlášení se nepovedlo. Zkuste to znovu.");
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <Image
          src="/logo.png"
          alt="Long Story Short"
          width={180}
          height={36}
          className="login-logo"
          priority
        />
        <h1>Přihlášení do administrace</h1>
        <p>Zadejte přístupové údaje pro správu poukazů.</p>

        <label className="login-field">
          <span>Uživatelské jméno</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className="login-field">
          <span>Heslo</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="login-error">{error}</p> : null}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? "Přihlašuji…" : "Přihlásit se"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card">
            <p>Načítám…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
