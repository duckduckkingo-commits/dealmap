"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (<><h1>Something went wrong</h1><p className="alert error" role="alert">{error.message || "Server error"}</p><button className="btn" onClick={reset} type="button">Try again</button></>);
}
