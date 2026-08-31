"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { setBlobOrigin } from "@/lib/blobOrigin";
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

      const next = searchParams.get("next") || "/admin/prehled";
      router.replace(next.startsWith("/admin") ? next : "/admin/prehled");
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

        <button
          type="submit"
          className="login-submit"
          disabled={loading}
          onMouseEnter={setBlobOrigin}
        >
          <svg
            className="login-submit-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinejoin="round"
            width="18"
            height="18"
            aria-hidden
          >
            <path d="M141.66,133.66l-40,40a8,8,0,0,1-11.32-11.32L116.69,136H24a8,8,0,0,1,0-16h92.69L90.34,93.66a8,8,0,0,1,11.32-11.32l40,40A8,8,0,0,1,141.66,133.66ZM200,32H136a8,8,0,0,0,0,16h56V208H136a8,8,0,0,0,0,16h64a8,8,0,0,0,8-8V40A8,8,0,0,0,200,32Z" />
          </svg>
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
