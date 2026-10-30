import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { hasNoLogins } from "@/lib/logins";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await getCurrentUser();
  const { e } = await searchParams;
  if (user && e !== "nostructure") redirect("/");
  if (await hasNoLogins()) redirect("/setup");
  const t = await getTranslations("login");
  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <header className="topbar">
        <span className="brand">Gestionale Flussi</span>
      </header>
      <h1 className="title">{t("title")}</h1>
      {e === "nostructure" && <p className="notice warn">{t("noStructure")}</p>}
      <LoginForm />
    </main>
  );
}
