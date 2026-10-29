<div align="center">

# 🎃 ASCII Logo Animation — Halloween Edition

**An interactive, canvas-rendered ASCII wordmark that reacts to your cursor, scatters on click, drops like candy from a pumpkin, and pulls itself back together.**

[![Live Demo](https://img.shields.io/badge/🎃_Live_Demo-click_here-f35b04?style=for-the-badge&labelColor=3d348b)](https://happy-holloween.vercel.app)
&nbsp;
![Next.js](https://img.shields.io/badge/Next.js-16-f7b801?style=for-the-badge&labelColor=3d348b)
![React](https://img.shields.io/badge/React-19-f18701?style=for-the-badge&labelColor=3d348b)
![TypeScript](https://img.shields.io/badge/TypeScript-5-7678ed?style=for-the-badge&labelColor=3d348b)

<!-- 📸 Add a preview GIF/screenshot here once you have one:
<img src="./docs/preview.gif" alt="Happy Halloween ASCII animation" width="860" />
-->

</div>

---

## 🔴 Live Demo

> **👉 [happy-holloween.vercel.app](https://happy-holloween.vercel.app)**

| Try this                          | What happens                                                   |
| --------------------------------- | -------------------------------------------------------------- |
| **Move your mouse** over the text | Glyphs are pushed away from the cursor and ease back           |
| **Click once**                    | Glyphs scatter into a loose cloud                              |
| **Click again**                   | Gravity pulls them down; they bounce and pile up at the bottom |
| **Click again**                   | They stagger back and reassemble into the wordmark             |

> 💡 The effect needs a viewport at least **720 px** wide. On narrower screens the app falls back to the plain SVG wordmark.

---

## ✨ Features

- **Canvas ASCII renderer** — every lit cell of the wordmark is drawn as a random glyph.
- **Hover repulsion** — smooth, eased push away from the cursor.
- **Click cycle** — `logo → scattered → fallen → returning → logo`, with staggered timing.
- **Supersampled sampling** — text is painted at 4× resolution and averaged into the grid so letter bodies stay solid.
- **Halloween theme** — flame-gradient glyphs, ghostly blue glyphs, candle flicker, moon, stars, bats, and drifting fog.
- **Responsive & resize-safe** — the grid is rebuilt on window resize and when fonts finish loading.
- **Reduced-motion friendly** — decorative animations switch off with `prefers-reduced-motion`.

## 🎨 Color Palette

| Swatch | Name              | Hex       | Role                                     |
| ------ | ----------------- | --------- | ---------------------------------------- |
| 🟪     | Indigo Velvet     | `#3d348b` | Sky glow, fog, night shades              |
| 🟦     | Medium Slate Blue | `#7678ed` | "Ghost" glyphs, fog highlights           |
| 🟨     | Amber Flame       | `#f7b801` | Top of the flame gradient, moon, caption |
| 🟧     | Tiger Orange      | `#f18701` | Middle of the flame gradient             |
| 🟥     | Cayenne Red       | `#f35b04` | Bottom of the flame gradient, glow       |

## 🚀 Getting Started

**Requirements:** Node.js 20+ and npm (or pnpm / yarn / bun).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open <http://localhost:3000> and play with it.

| Script          | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Create a production build    |
| `npm run start` | Serve the production build   |
| `npm run lint`  | Run ESLint                   |

> **Note:** this project uses a newer Next.js version than many tutorials cover. See [`AGENTS.md`](./AGENTS.md) and `node_modules/next/dist/docs/` if an API behaves differently than you expect.

## 🗂 Project Structure

```
app/
  layout.tsx               Fonts (JetBrains Mono, Geist Mono, Creepster) + metadata
  page.tsx                 Renders <AsciiLogoDemo />
  globals.css              Theme variables + Halloween backdrop styles
components/
  AsciiLogoDemo.tsx        Picks the wordmark, composes backdrop + effect
  InteractiveAscii.tsx     ⭐ The core effect (sampling, physics, drawing)
  HalloweenBackdrop.tsx    Decorative moon / stars / bats / fog (purely visual)
public/logos/              SVG fallbacks for narrow screens
```

## 🧠 How It Works

1. **Sample** – the wordmark is painted onto a hidden canvas (supersampled), then averaged down to one pixel per grid cell.
2. **Light up** – any cell brighter than `BRIGHTNESS_THRESHOLD` becomes a particle with a random ASCII glyph.
3. **Simulate** – each frame, every particle eases toward a target depending on the current phase (hover, scatter, gravity, return).
4. **Draw** – particles are painted to a full-viewport canvas as monospace text, colored per glyph.

## 🛠 Customization

**Change the text** — edit `LOGOS` in `components/AsciiLogoDemo.tsx`:

```ts
{
  id: "my-text",
  label: "my text",
  text: "YOUR TEXT HERE",       // what gets sampled into ASCII
  src: "/logos/my-text.svg",    // fallback for narrow screens
}
```

Then set it as the default in `useState<LogoId>("my-text")`.

**Tune the effect** — constants at the top of `components/InteractiveAscii.tsx`:

| Constant                      | Default          | Effect                                  |
| ----------------------------- | ---------------- | --------------------------------------- |
| `CELL_SIZE` / `CELL_GAP`      | `7` / `1`        | Glyph size and spacing (density)        |
| `BRIGHTNESS_THRESHOLD`        | `0.38`           | Higher = thinner letters                |
| `HOVER_RADIUS` / `HOVER_PUSH` | `20` / `7`       | Size and strength of cursor repulsion   |
| `SCATTER_RANGE`               | `20`             | How far glyphs spread on first click    |
| `GRAVITY` / `BOUNCE`          | `0.05` / `0.25`  | Fall speed and bounciness               |
| `ASCII_MIN_WIDTH`             | `720`            | Below this width the effect is disabled |
| `ASCII_CHARS`                 | `A–Z 0–9 @#%†Ω∆` | Glyph pool                              |

**Re-color it** — edit `HALLOWEEN` / `FLAME_STOPS` / `GHOST_CHANCE` in `InteractiveAscii.tsx` and the `--hw-*` variables in `app/globals.css`.

## ☁️ Deploy

The easiest path is [Vercel](https://vercel.com/new):

1. Push this repo to GitHub.
2. Import it on Vercel (framework preset: **Next.js**, no extra config needed).
3. Update the **Live Demo** badge and link at the top of this README if your URL changes.

Any host that supports Next.js (Netlify, Cloudflare Pages, a Node server via `npm run start`) works too.

## 🧩 Browser Support

Any modern browser with Canvas 2D, `requestAnimationFrame`, and `document.fonts`. Best experience on desktop (the effect is mouse-driven).

## 🙌 Credits

- Concept inspired by the Codegrid interactive ASCII logo technique.
- Fonts: [JetBrains Mono](https://www.jetbrains.com/lp/mono/), [Geist Mono](https://vercel.com/font), [Creepster](https://fonts.google.com/specimen/Creepster).
- Color palette: Indigo Velvet · Medium Slate Blue · Amber Flame · Tiger Orange · Cayenne Red.

---

<div align="center">

**Happy Halloween! 🎃👻🦇**

</div>
