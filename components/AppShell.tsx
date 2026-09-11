"use client";
import { useEffect, useState } from "react";
import Splash from "./Splash";
import Onboarding from "./Onboarding";
import BottomNav from "./BottomNav";
import RobotAssistant from "./RobotAssistant";
import { ToastZone } from "./ui-helpers";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem("dm_onboarded") === "1");
    } catch { setOnboarded(true); }
  }, []);

  return (
    <>
      <Splash />
      {onboarded === false && <Onboarding onDone={() => setOnboarded(true)} />}
      {children}
      <BottomNav />
      <RobotAssistant />
      <ToastZone />
    </>
  );
}
