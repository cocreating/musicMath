# MusicMath — Reactive Production & Acoustic Calculation Toolkit

MusicMath is a zero-dependency, standalone Progressive Web Application (PWA) built on top of SvelteKit (using Svelte 5 and TypeScript). It is designed to run completely offline-first, providing high-precision rhythmic, temporal, and acoustic conversion utilities for audio engineers, music producers, and microtonal musicians.

---

## 🚀 Key Features & Computational Modules

MusicMath packs 7 highly accurate calculation engines that synchronize reactively:

1. **Timecode Calculator**: Formulates conversions between timecode labels (HH:MM:SS:FF) and absolute frame counts. Fully supports sub-minute NTSC drop-frame standards ($29.97\text{ DF}$ and $59.94\text{ DF}$) and standard non-drop frame rates.
2. **Tap Tempo & Metronome**: Features an adaptive tap tempo averaging engine with a $15\%$ outlier anomaly rejection window, backed by a high-precision, low-latency metronome scheduler running on the Web Audio API audio thread.
3. **Tempo to Delay Table**: Generates delay times in milliseconds and frequency equivalents in Hertz for straight, dotted, and triplet divisions from Whole (1/1) down to Sixty-Fourth (1/64) notes.
4. **Note to Frequency Matrix**: Translates MIDI notes (0–127) to absolute frequencies with custom diapasons ($A_4 = 400\text{--}480\text{ Hz}$) and microtonal tuning temperaments (presets for 12-TET, Pythagorean, Werckmeister III, Kirnberger III).
5. **Sample Length Converter**: Translates and synchronizes audio sample counts, milliseconds, and rhythmic beats in real-time.
6. **Tempo Change & Varispeed**: Computes speed warp ratio percentages and varispeed pitch transpositions in semitones when shifting from a source to a target tempo.
7. **Frequency to Note Quantizer**: Maps arbitrary input frequencies ($Hz$) to the nearest MIDI note, standard pitch name, and cents deviation offset.

---

## 🛠 Tech Stack & Architecture

* **Framework**: [SvelteKit](https://svelte.dev/) (Svelte 5 runes + TypeScript).
* **Static adapter**: Configured with `@sveltejs/adapter-static` for fully prerendered client-side hosting.
* **State Management**: Persisted Svelte writable stores synced automatically to `localStorage`.
* **Audio Engine**: Sample-accurate oscillator scheduling via the browser's [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).
* **Styling**: Component-scoped and global Vanilla CSS built using HSL variables, responsive media grids, and a modern glassmorphism UI aesthetic.
* **Testing**: Comprehensive unit test coverage configured with [Vitest](https://vitest.dev/).

---

## 📂 Codebase Structure

```
musicMath/
├── .agents/
│   └── docs/
│       ├── Specs.md              # Detailed Production Specification Matrix
│       └── Specs initial...      # Raw specification prompt
├── src/
│   ├── app.css                   # Global Vanilla CSS Design System
│   ├── lib/
│   │   ├── engines/              # Rhythmic & Acoustic Calculation Engines
│   │   │   ├── delay.ts
│   │   │   ├── frequencyToNote.ts
│   │   │   ├── sampleLength.ts
│   │   │   ├── tapTempo.ts
│   │   │   ├── temperament.ts
│   │   │   ├── tempoChange.ts
│   │   │   └── timecode.ts
│   │   ├── audio.ts              # Web Audio Metronome scheduler
│   │   └── stores.ts             # Persisted Svelte stores
│   └── routes/
│       ├── +layout.svelte        # Outer layout and SEO metadata
│       ├── +layout.ts            # Enforces client prerendering
│       └── +page.svelte          # Reactive dashboard layout assembly
├── vite.config.ts                # SvelteKit and Vitest configuration
└── package.json
```

---

## 🏁 Getting Started

### Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### Development Server

Start a local development server with hot-module reloading:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application in your browser.

### Run Unit Tests

Execute the automated Vitest test suite checking engine math and conversions:

```bash
npm run test
```

### Static Production Build

Compile the application to highly optimized, static, and offline-capable HTML, CSS, and JS files:

```bash
npm run build
```

The compiled assets will be written to the `build/` directory, ready to be hosted on any static hosting provider (GitHub Pages, Vercel, Netlify, Cloudflare Pages, etc.).

---

## 📄 Specifications Document
For deep mathematical explanations, code implementation guidelines, and low-latency audio scheduler details, see the production spec sheet in [.agents/docs/Specs.md](file://.agents/docs/Specs.md).
