"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card" style={{ maxWidth: 460, margin: "24px auto" }}><h1>{title}</h1>{children}</div>;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Failed"); return; }
      router.push(data.role === "OWNER" ? "/owner" : "/dashboard");
      router.refresh();
    } catch { setErr("Network error"); } finally { setLoading(false); }
  }
  return (
    <Card title={mode === "login" ? "Log in" : "Create account"}>
      <form onSubmit={submit}>
        {mode === "register" && <><label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" /></>}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {err && <p className="alert error" role="alert">{err}</p>}
        <div style={{ marginTop: 12 }}><button className="btn" disabled={loading} type="submit">{loading ? "Loading…" : mode === "login" ? "Log in" : "Create account"}</button></div>
      </form>
      <p>{mode === "login" ? <><Link href="/auth/register">Need an account?</Link> · <Link href="/auth/forgot-password">Forgot password?</Link></> : <Link href="/auth/login">Have an account? Log in</Link>}</p>
    </Card>
  );
}
