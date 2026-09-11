import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Owner settings — DEALMAP", robots: { index: false } };

export default async function OwnerSettings() {
  const s = await getSession();
  if (!s) redirect("/auth/login");
  if (s.role !== "OWNER") redirect("/dashboard");
  return (
    <>
      <h1>Owner settings</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        <p><strong>{s.name}</strong> · {s.email}</p>
        <p>Manage password and sessions in <a href="/settings">Settings</a>.</p>
        <p>2FA: prepared architecture (TOTP + recovery codes + WebAuthn). Not faked — enable <code>TWO_FACTOR_ENABLED</code> only when a real provider is wired.</p>
        <p>Recovery: use password reset + rotate <code>INITIAL_OWNER_SETUP_SECRET</code>. Never create master passwords or backdoors.</p>
      </div>
    </>
  );
}
