"use client";
import { useState } from "react";
export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "forgot", email }) });
    setMsg("If this email exists, a reset link was sent.");
  }
  return (
    <div className="card" style={{ maxWidth: 460, margin: "24px auto" }}>
      <h1>Forgot password</h1>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div style={{ marginTop: 12 }}><button className="btn" type="submit">Send reset link</button></div>
      </form>
      {msg && <p className="alert" role="status">{msg}</p>}
    </div>
  );
}
