"use client";

import { useState } from "react";
import HalloweenBackdrop from "./HalloweenBackdrop";
import InteractiveAscii from "./InteractiveAscii";

const LOGOS = [
  {
    id: "happy-halloween",
    label: "happy halloween",
    text: "HAPPY HALLOWEEN",
    src: "/logos/happy-halloween.svg",
  },
] as const;

type LogoId = (typeof LOGOS)[number]["id"];

export default function AsciiLogoDemo() {
  const [active, setActive] = useState<LogoId>("happy-halloween");
  const current = LOGOS.find((logo) => logo.id === active) ?? LOGOS[0];

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#06041a] text-[#ffe9b8]">
      <HalloweenBackdrop />
      <p className="hw-hint">☠ click to scatter the spirits ☠</p>

      {/* Remount on switch so sampling + particles rebuild cleanly */}
      <div className="relative z-10">
        <InteractiveAscii
          key={current.id}
          src={current.src}
          text={current.text}
          alt={current.label}
        />
      </div>
    </div>
  );
}
