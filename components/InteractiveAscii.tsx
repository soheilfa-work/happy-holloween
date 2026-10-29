"use client";

import { useEffect, useRef } from "react";

/** Tighter cells so long wordmarks stay dense and readable. */
const CELL_SIZE = 7;
const CELL_GAP = 1;
/**
 * 🎃 Halloween theme — palette: Indigo Velvet, Medium Slate Blue,
 * Amber Flame, Tiger Orange, Cayenne Red. (Colour only, no effect logic.)
 */
const HALLOWEEN = {
  indigo: "#3d348b",
  slate: "#7678ed",
  amber: "#f7b801",
  orange: "#f18701",
  cayenne: "#f35b04",
} as const;
/** Flame ramp painted top → bottom across the wordmark. */
const FLAME_STOPS = [HALLOWEEN.amber, HALLOWEEN.orange, HALLOWEEN.cayenne];
/** Share of glyphs that glow as pale "ghost" blue instead of flame. */
const GHOST_CHANCE = 0.09;
const RAMP_STEPS = 32;
const ASCII_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#%†Ω∆";
const ASCII_FONT_FAMILY =
  "var(--font-jetbrains-mono), ui-monospace, Menlo, Consolas, monospace";
/** Keep holes open, but not so high that thin strokes disappear. */
const BRIGHTNESS_THRESHOLD = 0.38;
/** Codegrid uses 1000; slightly lower so the effect still runs in typical desktop panes. */
const ASCII_MIN_WIDTH = 720;
/** Cap on sample width when falling back to the image source. */
const LOGO_COLS = 260;

/** Hover repulsion */
const HOVER_RADIUS = 20;
const HOVER_PUSH = 7;
const HOVER_EASE = 0.1;

/** Click phases */
const SCATTER_RANGE = 20;
const SCATTER_EASE = 0.075;
const GRAVITY = 0.05;
const BOUNCE = 0.25;
const RESET_EASE = 0.05;
const STAGGER_FRAMES = 18;

const DEFAULT_STATES: AsciiState[] = ["logo", "scattered", "fallen"];

export type AsciiState = "logo" | "scattered" | "fallen";
type Phase = AsciiState | "returning";

export interface InteractiveAsciiProps {
  src: string;
  /** Wordmark painted into the sampler (preferred over the image for clarity). */
  text?: string;
  alt?: string;
  logoCols?: number;
  cellSize?: number;
  cellGap?: number;
  states?: AsciiState[];
}

const WORDMARK_FONT =
  '900 1px "Arial Black", Impact, Haettenschweiler, Arial, sans-serif';
/** Supersample factor — paint text larger, then average into each grid cell. */
const SUPERSAMPLE = 4;

interface AsciiCell {
  col: number;
  row: number;
  char: string;
  offsetX: number;
  offsetY: number;
  fallSpeed: number;
  wait: number;
  scatterX: number;
  scatterY: number;
  /** Themed fill colour, fixed per glyph so it travels with it. */
  color: string;
}

interface Cursor {
  col: number;
  row: number;
}

function randomAsciiChar(): string {
  return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]!;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Pre-computed amber → orange → cayenne gradient (as CSS colour strings). */
const FLAME_RAMP: string[] = Array.from({ length: RAMP_STEPS }, (_, i) => {
  const t = i / (RAMP_STEPS - 1);
  const scaled = t * (FLAME_STOPS.length - 1);
  const a = Math.min(Math.floor(scaled), FLAME_STOPS.length - 2);
  const k = scaled - a;
  const from = hexToRgb(FLAME_STOPS[a]!);
  const to = hexToRgb(FLAME_STOPS[a + 1]!);
  const mix = from.map((v, c) => Math.round(v + (to[c]! - v) * k));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
});

function easeToward(
  cell: AsciiCell,
  targetX: number,
  targetY: number,
  ease: number,
): void {
  cell.offsetX += (targetX - cell.offsetX) * ease;
  cell.offsetY += (targetY - cell.offsetY) * ease;
}

/**
 * Codegrid-style interactive ASCII logo:
 * 1) Sample a hidden logo image into a brightness grid
 * 2) Draw each lit cell as a random ASCII glyph
 * 3) Hover pushes glyphs away; click cycles logo → scatter → fall → return
 */
export default function InteractiveAscii({
  src,
  text = "",
  alt = "",
  logoCols = LOGO_COLS,
  cellSize = CELL_SIZE,
  cellGap = CELL_GAP,
  states = DEFAULT_STATES,
}: InteractiveAsciiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const statesRef = useRef(states);
  statesRef.current = states.length > 0 ? states : DEFAULT_STATES;

  useEffect(() => {
    const canvas = canvasRef.current;
    const logo = logoRef.current;
    if (!canvas || !logo) return;

    const cellStep = cellSize + cellGap;
    const asciiFont = `700 ${cellSize}px ${ASCII_FONT_FAMILY}`;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const wordmark = text.trim().toUpperCase();

    let phase: Phase = statesRef.current[0]!;
    let stateIndex = 0;
    let gridCols = 0;
    let gridRows = 0;
    let asciiCells: AsciiCell[] = [];
    let frameId = 0;
    const cursor: Cursor = { col: -999, row: -999 };

    /** Paint the wordmark at supersample resolution, then average into grid cells. */
    const paintWordmark = (
      target: CanvasRenderingContext2D,
      cols: number,
      rows: number,
    ): void => {
      const sw = cols * SUPERSAMPLE;
      const sh = rows * SUPERSAMPLE;
      const hiRes = document.createElement("canvas");
      hiRes.width = sw;
      hiRes.height = sh;
      const hi = hiRes.getContext("2d");
      if (!hi) return;

      hi.clearRect(0, 0, sw, sh);
      hi.fillStyle = "#fff";
      hi.textAlign = "center";
      hi.textBaseline = "middle";

      // Tall + wide wordmark so each letter spans many grid cells.
      const maxW = sw * 0.94;
      const maxH = sh * 0.55;
      let fontSize = maxH;
      hi.font = WORDMARK_FONT.replace("1px", `${fontSize}px`);
      const measured = hi.measureText(wordmark).width;
      if (measured > maxW && measured > 0) {
        fontSize *= maxW / measured;
        hi.font = WORDMARK_FONT.replace("1px", `${fontSize}px`);
      }

      const x = sw / 2;
      const y = sh / 2 + fontSize * 0.03;
      // Slight stroke fattens glyphs so downsampling keeps solid letter bodies.
      hi.lineJoin = "round";
      hi.strokeStyle = "#fff";
      hi.lineWidth = Math.max(2, fontSize * 0.045);
      hi.strokeText(wordmark, x, y);
      hi.fillText(wordmark, x, y);

      target.clearRect(0, 0, cols, rows);
      target.imageSmoothingEnabled = true;
      target.drawImage(hiRes, 0, 0, cols, rows);
    };

    /** Step 1 — rasterize the logo into lit grid cells. */
    const buildAsciiFromLogo = (): void => {
      if (window.innerWidth < ASCII_MIN_WIDTH) {
        asciiCells = [];
        canvas.style.display = "none";
        logo.style.visibility = "visible";
        return;
      }

      canvas.style.display = "block";
      logo.style.visibility = "hidden";

      gridCols = Math.floor(window.innerWidth / cellStep);
      gridRows = Math.floor(window.innerHeight / cellStep);
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const sampler = document.createElement("canvas");
      sampler.width = gridCols;
      sampler.height = gridRows;
      const samplerContext = sampler.getContext("2d", {
        willReadFrequently: true,
      });
      if (!samplerContext) return;

      if (wordmark) {
        paintWordmark(samplerContext, gridCols, gridRows);
      } else {
        if (!logo.naturalWidth) return;

        const sampleCols = Math.min(
          logoCols,
          Math.max(40, Math.floor(gridCols * 0.92)),
        );
        const sampleRows = Math.round(
          (sampleCols * logo.naturalHeight) / logo.naturalWidth,
        );
        const originCol = Math.floor((gridCols - sampleCols) / 2);
        const originRow = Math.floor((gridRows - sampleRows) / 2);

        samplerContext.clearRect(0, 0, gridCols, gridRows);
        samplerContext.imageSmoothingEnabled = false;
        samplerContext.drawImage(
          logo,
          originCol,
          originRow,
          sampleCols,
          sampleRows,
        );
      }

      const { data } = samplerContext.getImageData(0, 0, gridCols, gridRows);
      const litCells: AsciiCell[] = [];

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const pixel = (row * gridCols + col) * 4;
          const alpha = data[pixel + 3]! / 255;
          const brightness =
            ((data[pixel]! * 0.299 +
              data[pixel + 1]! * 0.587 +
              data[pixel + 2]! * 0.114) /
              255) *
            alpha;

          if (brightness > BRIGHTNESS_THRESHOLD) {
            litCells.push({
              col,
              row,
              char: randomAsciiChar(),
              offsetX: 0,
              offsetY: 0,
              fallSpeed: 0,
              wait: 0,
              scatterX: (Math.random() - 0.5) * SCATTER_RANGE,
              scatterY: (Math.random() - 0.5) * SCATTER_RANGE,
              color: HALLOWEEN.amber,
            });
          }
        }
      }

      // Halloween paint job: flame gradient by row, with a few ghostly glyphs.
      if (litCells.length > 0) {
        let minRow = Infinity;
        let maxRow = -Infinity;
        for (const c of litCells) {
          if (c.row < minRow) minRow = c.row;
          if (c.row > maxRow) maxRow = c.row;
        }
        const span = Math.max(1, maxRow - minRow);
        for (const c of litCells) {
          if (Math.random() < GHOST_CHANCE) {
            c.color = HALLOWEEN.slate;
            continue;
          }
          const t = (c.row - minRow) / span + (Math.random() - 0.5) * 0.18;
          const idx = Math.round(Math.min(1, Math.max(0, t)) * (RAMP_STEPS - 1));
          c.color = FLAME_RAMP[idx]!;
        }
      }

      asciiCells = litCells;
    };

    const staggerCells = (): void => {
      for (const cell of asciiCells) {
        cell.wait = Math.floor(Math.random() * STAGGER_FRAMES);
      }
    };

    /** Step 2 — physics: hover / scatter / gravity / return. */
    const updateAsciiCells = (): void => {
      let everyoneHome = phase === "returning";

      for (const cell of asciiCells) {
        if (cell.wait > 0) {
          cell.wait--;
          everyoneHome = false;
          continue;
        }

        if (phase === "scattered") {
          easeToward(cell, cell.scatterX, cell.scatterY, SCATTER_EASE);
        } else if (phase === "fallen") {
          const floorOffset = gridRows - 1 - cell.row;
          cell.fallSpeed += GRAVITY;
          cell.offsetY += cell.fallSpeed;

          if (cell.offsetY > floorOffset) {
            cell.offsetY = floorOffset;
            cell.fallSpeed *= -BOUNCE;
          }
        } else if (phase === "returning") {
          easeToward(cell, 0, 0, RESET_EASE);
          if (Math.abs(cell.offsetX) > 0.05 || Math.abs(cell.offsetY) > 0.05) {
            everyoneHome = false;
          }
        } else {
          let targetX = 0;
          let targetY = 0;
          const distX = cell.col - cursor.col;
          const distY = cell.row - cursor.row;
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < HOVER_RADIUS && distance > 0) {
            const push = (1 - distance / HOVER_RADIUS) * HOVER_PUSH;
            targetX = (distX / distance) * push;
            targetY = (distY / distance) * push;
          }
          easeToward(cell, targetX, targetY, HOVER_EASE);
        }
      }

      if (everyoneHome) phase = "logo";
    };

    /** Step 3 — paint every particle as an ASCII glyph. */
    const drawAscii = (): void => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.font = asciiFont;
      context.textBaseline = "middle";
      context.textAlign = "center";

      // Soft candle-like flicker over the whole wordmark.
      const now = performance.now() / 1000;
      context.globalAlpha =
        0.9 + 0.07 * Math.sin(now * 2.1) + 0.03 * Math.sin(now * 7.3);

      let lastColor = "";
      for (const { col, row, char, offsetX, offsetY, color } of asciiCells) {
        if (color !== lastColor) {
          context.fillStyle = color;
          lastColor = color;
        }
        const x = (col + offsetX) * cellStep + cellStep * 0.5;
        const y = (row + offsetY) * cellStep + cellStep * 0.5;
        context.fillText(char, x, y);
      }
      context.globalAlpha = 1;
    };

    const renderLoop = (): void => {
      if (asciiCells.length > 0) {
        updateAsciiCells();
        drawAscii();
      }
      frameId = requestAnimationFrame(renderLoop);
    };

    const handleMouseMove = (event: MouseEvent): void => {
      cursor.col = event.clientX / cellStep;
      cursor.row = event.clientY / cellStep;
    };

    /** Click cycle: logo → scattered → fallen → returning → logo */
    const handleClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-ascii-hud]")) return;
      if (asciiCells.length === 0 || phase === "returning") return;

      const sequence = statesRef.current;
      stateIndex = (stateIndex + 1) % sequence.length;
      const next = sequence[stateIndex]!;

      if (next === "logo") {
        phase = "returning";
        staggerCells();
      } else if (next === "scattered") {
        phase = "scattered";
        staggerCells();
      } else if (next === "fallen") {
        phase = "fallen";
        for (const cell of asciiCells) cell.fallSpeed = 0;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    window.addEventListener("resize", buildAsciiFromLogo);
    logo.addEventListener("load", buildAsciiFromLogo);
    if (logo.complete) buildAsciiFromLogo();

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) buildAsciiFromLogo();
    });

    frameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("resize", buildAsciiFromLogo);
      logo.removeEventListener("load", buildAsciiFromLogo);
    };
  }, [src, text, logoCols, cellSize, cellGap]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          filter: "drop-shadow(0 0 5px rgba(243, 91, 4, 0.55))",
        }}
      />
      {/* Fallback image on narrow screens; sampling prefers the `text` prop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={logoRef}
        src={src}
        alt={alt}
        width={1500}
        height={420}
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          height: "auto",
          objectFit: "contain",
          visibility: "hidden",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}
