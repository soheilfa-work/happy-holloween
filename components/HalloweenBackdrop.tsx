/**
 * Purely decorative Halloween atmosphere that sits *behind* the ASCII effect.
 * No state, no randomness at render time (deterministic → no hydration drift).
 */

const STARS = Array.from({ length: 70 }, (_, i) => {
  // tiny seeded PRNG so server and client render identical stars
  const r = (n: number) => {
    const x = Math.sin((i + 1) * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  return {
    left: r(1) * 100,
    top: r(2) * 70,
    size: 1 + r(3) * 1.8,
    delay: r(4) * 6,
    dur: 3 + r(5) * 4,
    hue: r(6) > 0.8 ? "var(--hw-slate)" : "#ffffff",
  };
});

const BATS = [
  { top: "14%", size: 46, dur: 26, delay: 0, flap: 0.28 },
  { top: "26%", size: 30, dur: 34, delay: -11, flap: 0.22 },
  { top: "8%", size: 36, dur: 30, delay: -19, flap: 0.25 },
  { top: "38%", size: 24, dur: 40, delay: -6, flap: 0.2 },
];

function Bat({ size, flap }: { size: number; flap: number }) {
  return (
    <svg
      width={size}
      height={size / 2}
      viewBox="0 0 64 32"
      className="hw-bat-flap"
      style={{ animationDuration: `${flap}s` }}
      aria-hidden
    >
      <path
        fill="#07051a"
        d="M32 10 C30 6 28 4 27 2 L26 8 C22 4 14 2 2 6 C8 8 10 12 10 16 C13 13 17 13 20 16 C22 14 26 14 28 17 L32 22 L36 17 C38 14 42 14 44 16 C47 13 51 13 54 16 C54 12 56 8 62 6 C50 2 42 4 38 8 L37 2 C36 4 34 6 32 10 Z"
      />
    </svg>
  );
}

export default function HalloweenBackdrop() {
  return (
    <div className="hw-backdrop" aria-hidden>
      {/* sky */}
      <div className="hw-sky" />

      {/* stars */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="hw-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.hue,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}

      {/* moon */}
      <div className="hw-moon">
        <div className="hw-moon-disc" />
      </div>

      {/* bats */}
      {BATS.map((b, i) => (
        <div
          key={i}
          className="hw-bat"
          style={{
            top: b.top,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <Bat size={b.size} flap={b.flap} />
        </div>
      ))}

      {/* drifting fog */}
      <div className="hw-fog hw-fog-a" />
      <div className="hw-fog hw-fog-b" />

      {/* vignette */}
      <div className="hw-vignette" />
    </div>
  );
}
