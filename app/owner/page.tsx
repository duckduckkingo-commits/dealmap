"use client";
import { useEffect, useState } from "react";

export default function OwnerPage() {
  const [data, setData] = useState<{ users?: number; observations?: number; contributions?: number; audit?: { id: string; action: string; createdAt: string; result: string }[]; usersList?: { id: string; email: string; name: string; role: string }[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/admin?scope=overview").then(async (r) => {
      if (r.status === 403) { setErr("Forbidden — OWNER only."); return; }
      if (r.status === 401) { setErr("Please log in as OWNER."); return; }
      setData(await r.json());
    }).catch(() => setErr("Network error"));
  }, []);
  async function makeAdmin(userId: string) {
    if (!confirm(`Make ${userId} an ADMIN?`)) return;
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "make-admin", userId }) });
    location.reload();
  }
  if (err) return <><h1>Owner</h1><p className="alert error" role="alert">{err}</p></>;
  if (!data) return <><h1>Owner</h1><p>Loading…</p></>;
  return (
    <>
      <h1>Owner dashboard</h1>
      <div className="grid cols3">
        <div className="card"><h3>Users</h3><p>{data.users}</p></div>
        <div className="card"><h3>Observations</h3><p>{data.observations}</p></div>
        <div className="card"><h3>Contributions</h3><p>{data.contributions}</p></div>
      </div>
      <h2>Users & admins</h2>
      <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
      <tbody>{(data.usersList ?? []).map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.role === "USER" && <button className="btn secondary" onClick={() => makeAdmin(u.id)}>Make admin</button>}</td></tr>)}</tbody></table>
      <h2>Security events</h2>
      {(data.audit ?? []).length === 0 ? <p>No events yet.</p> : (
        <table><thead><tr><th>Action</th><th>Result</th><th>Time</th></tr></thead>
        <tbody>{(data.audit ?? []).slice(0, 30).map((e) => <tr key={e.id}><td>{e.action}</td><td>{e.result}</td><td>{e.createdAt}</td></tr>)}</tbody></table>
      )}
      <p><a href="/owner/settings">Owner settings</a></p>
    </>
  );
}
