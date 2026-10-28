"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const t = useTranslations("login");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(false);
    const res = await authClient.signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
      rememberMe: true,
    });
    setBusy(false);
    if (res.error) {
      setError(true);
      return;
    }
    window.location.href = "/";
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        {t("email")}
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label>
        {t("password")}
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p className="form-error">{t("error")}</p>}
      <button className="btn-primary" style={{ marginTop: 8 }} disabled={busy}>
        {t("submit")}
      </button>
    </form>
  );
}
