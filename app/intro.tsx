"use client";

import { useEffect, useState } from "react";

export default function Intro() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) { setVisible(false); return; }
    const timer = window.setTimeout(() => setVisible(false), 3400);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="intro-screen" aria-hidden="true">
    <div className="intro-glow intro-glow-one"/><div className="intro-glow intro-glow-two"/>
    <div className="intro-logo" aria-label="To Do">
      {Array.from("ToDo").map((letter, index) => <span className={`intro-letter intro-letter-${index}`} key={index} style={{ "--letter-index": index } as React.CSSProperties}><span className="intro-shape"/><span className="intro-character" data-letter={letter}>{letter}</span></span>)}
    </div>
  </div>;
}
