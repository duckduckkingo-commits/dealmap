import { requireRole } from "@/lib/auth";
import AdminCollector from "@/components/collector/AdminCollector";

export const metadata = { title: "Collector — Admin", robots: { index: false } };

export default async function CollectorAdminPage() {
  try {
    await requireRole(["ADMIN", "OWNER"]);
  } catch {
    return (
      <>
        <h1>Collector</h1>
        <p className="alert error" role="alert">Forbidden — ADMIN or OWNER only.</p>
      </>
    );
  }
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Data Collector & Smart Deals</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Sources, offers, runs, submissions, freshness and score weights.</p>
      <AdminCollector />
    </>
  );
}
