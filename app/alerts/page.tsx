"use client";
import AlertsClient from "@/components/AlertsClient";

export default function AlertsPage({ searchParams }: { searchParams: { product?: string } }) {
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Alerts</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Price-drop & deal alerts · create, pause or delete anytime.</p>
      <AlertsClient initialProduct={searchParams.product} />
    </>
  );
}
