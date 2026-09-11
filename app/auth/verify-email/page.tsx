export const metadata = { title: "Verify email — DEALMAP", robots: { index: false } };
export default function Verify() {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "24px auto" }}>
      <h1>Verify your email</h1>
      <p>Check your inbox for a verification link. If no email provider is configured (local dev), your account still works — see <code>docs/deployment.md</code> to configure SMTP/Supabase Auth email.</p>
    </div>
  );
}
