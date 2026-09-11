"use client";
import { useState } from "react";
export default function Reset({ searchParams }: { searchParams: { token?: string } }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "reset", token: searchParams.token, password }) });
    const data = await res.json();
    setMsg(res.ok ? "Password updated. You can log in now." : (data.error || "Failed"));
  }
  return (
    <div className="card" style={{ maxWidth: 460, margin: "24px auto" }}>
      <h1>Reset password</h1>
      <form onSubmit={submit}>
        <label htmlFor="pw">New password</label>
        <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        <div style={{ marginTop: 12 }}><button className="btn" type="submit">Set new password</button></div>
      </form>
      {msg && <p className="alert" role="status">{msg}</p>}
    </div>
  );
}
