"use client";
import { useEffect, useRef, useState } from "react";
import RobotFace from "./RobotFace";

type Msg = { from: "bot" | "user"; text: string };

const TIPS: Record<string, string> = {
  deals: "A Deal Score of 75+ is a Good deal, 90+ is Excellent. Below 35 the price is likely overpriced vs the market median.",
  history: "Price history shows observed market prices over time. A flat line means a stable market; sudden jumps may be outliers.",
  compare: "Open Compare from the bottom bar, add 2–3 products, and check median prices side by side before you buy.",
  alerts: "On any product page, tap “Create alert” and set your target price. You’ll be notified in Alerts when the market drops.",
  save: "Tap the heart on any product card to save it. Your saved products live in the Saved tab (watchlist).",
};

const QUICK = [
  { k: "deals", label: "Deal Scores?" },
  { k: "history", label: "Price history?" },
  { k: "compare", label: "Compare?" },
  { k: "alerts", label: "Alerts?" },
];

export default function RobotAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [min, setMin] = useState(false);
  const [happy, setHappy] = useState(false);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem("dm_robot_off") === "1"; } catch {}
    if (!dismissed) {
      const t = setTimeout(() => {
        setMsgs([{ from: "bot", text: "Hi! I’m your DealMap assistant. I’ll help you find the best deal and avoid overpaying." }]);
        setOpen(true);
        cheer();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 9999, behavior: "smooth" }); }, [msgs, open, min, typing]);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  function cheer() {
    setHappy(true);
    later(() => setHappy(false), 1400);
  }

  function toggle() {
    cheer();
    if (open) {
      setOpen(false);
      try { localStorage.setItem("dm_robot_off", "1"); } catch {}
    } else {
      setOpen(true);
      if (msgs.length === 0) {
        setTyping(true);
        later(() => {
          setTyping(false);
          setMsgs([{ from: "bot", text: "Hi! I’m your DealMap assistant. Ask me about deal scores, price history, comparisons or savings." }]);
          cheer();
        }, 700);
      }
    }
  }

  function ask(k: string, label: string) {
    if (typing) return;
    setMsgs((m) => [...m, { from: "user", text: label }]);
    setTyping(true);
    later(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: "bot", text: TIPS[k] ?? "Check the product page: median price, Deal Score and history tell you if it’s a fair deal." }]);
      cheer();
    }, 650);
  }

  return (
    <>
      <button className="robot-fab" onClick={toggle} aria-expanded={open} aria-label={open ? "Close DealMap assistant" : "Open DealMap assistant"} title="DealMap assistant">
        <span className="bob" aria-hidden="true"><RobotFace size={38} happy={happy} /></span>
      </button>
      {open && (
        <section className="robot-panel" role="dialog" aria-label="DealMap assistant" aria-live="polite">
          <div className="robot-head">
            <RobotFace size={34} happy={happy} />
            <div style={{ flex: 1 }}>
              <b>DealMap Assistant</b>
              <small>{typing ? "typing…" : "Tips to avoid overpaying"}</small>
            </div>
            <button onClick={() => setMin(!min)} aria-label={min ? "Expand assistant" : "Minimize assistant"} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontWeight: 800 }}>{min ? "+" : "–"}</button>
          </div>
          {!min && (
            <>
              <div className="robot-body" ref={bodyRef}>
                {msgs.map((m, i) => <div key={i} className={`robot-msg${m.from === "user" ? " user" : ""}`}>{m.text}</div>)}
                {typing && <div className="robot-msg r-typing" aria-label="Assistant is typing"><i /><i /><i /></div>}
              </div>
              <div className="robot-quick">
                {QUICK.map((q) => <button key={q.k} onClick={() => ask(q.k, q.label)}>{q.label}</button>)}
                <button onClick={() => ask("save", "How do I save?")}>Save?</button>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
