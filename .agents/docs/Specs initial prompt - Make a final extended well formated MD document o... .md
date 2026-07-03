# **PRODUCTION SPECIFICATION MATRIX: GENÈRIC (MUSICMATH CUSTOM)**

## **PART 1: FULL ARCHITECTURAL SPECIFICATION**

### **1\. SYSTEM ARCHITECTURE & TARGET ENVIRONMENT**

The application must be configured as a zero-dependency, standalone Progressive Web Application (PWA) built on top of SvelteKit. The deployment objective is a static application capable of executing client-side with zero server runtimes.

* **Framework Setup:** SvelteKit running @sveltejs/adapter-static with prerendering explicitly enforced (export const prerender \= true;).  
* **Reactivity System:** Native Svelte stores (writable, derived) act as the central reactive data bus. Cross-component updates are driven by subscription changes across shared global metrics: $globalBpm, $diapason, and $sampleRate.  
* **Offline Lifecycle:** A custom Service Worker (src/service-worker.js) intercepts network requests, establishing a cache-first strategy for all core application assets (HTML, compiled JavaScript, compiled vanilla CSS).  
* **State Serialization:** Application preferences, historical arithmetic outputs, and microtonal temperament models are persisted across reboots via synchronous localStorage writes triggered by store mutations.

### **2\. MOBILE-FIRST COMPONENT DESIGN & VANILLA CSS SPECIFICATION**

Layout implementation mandates standard native Vanilla CSS layouts utilizing modern layout properties (display: grid, display: flex). The design workflow must execute mobile-first, targeting tiny viewport form factors natively before media query expansion overrides are initialized.

CSS  
/\* Base Layout Architecture (\<360px Viewport Core) \*/  
:root {  
  \--bg-main: \#090a0f;  
  \--surface-card: \#121420;  
  \--accent-blue: \#1a56db;  
  \--text-primary: \#f3f4f6;  
  \--text-muted: \#9ca3af;  
  \--font\-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;  
}

body {  
  background-color: var(--bg-main);  
  color: var(--text-primary);  
  font-family: system-ui, \-apple-system, BlinkMacSystemFont, sans-serif;  
  margin: 0;  
  padding: 0;  
  overflow-x: hidden;  
}

.module-grid {  
  display: flex;  
  flex-direction: column;  
  gap: 1rem;  
  padding: 1rem;  
}

/\* Framework-Free Mobile-First Media Query Pipeline \*/  
@media (min-width: 22.5em) {  
  /\* 360px \*/  
  .module-grid { padding: 1.25rem; }  
}  
@media (min-width: 37.5em) {  
  /\* 600px \*/  
  .module-grid {  
    display: grid;  
    grid-template-columns: repeat(2, 1fr);  
  }  
}  
@media (min-width: 50em) {  
  /\* 800px \*/  
  .module-grid { grid-template-columns: repeat(3, 1fr); }  
}  
@media (min-width: 56.25em) {  
  /\* 900px \*/  
}  
@media (min-width: 64em) {  
  /\* 1024px \*/  
  .module-grid { grid-template-columns: repeat(4, 1fr); }  
}  
@media (min-width: 68.75em) {  
  /\* 1100px \*/  
}  
@media (min-width: 70em) {  
  /\* 1120px \*/  
}  
@media (min-width: 75em) {  
  /\* 1200px \*/  
}  
@media (min-width: 85.37em) {  
  /\* 1366px \*/  
}  
@media (min-width: 87.5em) {  
  /\* 1400px \*/  
}  
@media (min-width: 100em) {  
  /\* 1600px \*/  
}  
@media (min-width: 112.5em) {  
  /\* 1800px \*/  
}  
@media (min-width: 120em) {  
  /\* 1920px \*/  
}  
@media (min-width: 160em) {  
  /\* 2560px \*/  
}

### **3\. ENGINE LOGIC & CORE COMPUTATIONAL MODULES**

#### **Module 1: Timecode Calculator**

Processes mathematical operations over frame-accurate time strings. Suppress all input masks in favor of standard alphanumeric sanitized regex extractions.

* **Supported Core Frame Rates:** $23.976, 24, 25, 29.94, 29.97, 30, 50, 59.94, 60$.  
* **Drop-Frame Formulation:** For NTSC formats ($29.97\\text{ DF}$ and $59.94\\text{ DF}$), drop the first two frame numbers (indices $0$ and $1$) at the start of every minute, except frames occurring when the minute value satisfies $M \\pmod{10} \== 0$.  
* **Core Math Engine Snippet:**

JavaScript  
const tcToFrames \= (tc, fps, isDrop) \=\> {  
  const \[h, m, s, f\] \= tc.split(':').map(Number);  
  const baseFrames \= (h \* 3600 \+ m \* 60 \+ s) \* Math.ceil(fps) \+ f;  
  if (\!isDrop) return baseFrames;  
  const totalMinutes \= h \* 60 \+ m;  
  return baseFrames \- 2 \* (totalMinutes \- Math.floor(totalMinutes / 10));  
};

const framesToTc \= (frames, fps, isDrop) \=\> {  
  const cFps \= Math.ceil(fps);  
  if (isDrop) {  
    const dropPerFrames \= 17982; // 10 minutes frame count at 29.97DF  
    const d \= Math.floor(frames / dropPerFrames);  
    let m \= Math.floor((frames % dropPerFrames) / 1798);  
    frames \+= 2 \* (d \* 9 \+ m) \- (frames % dropPerFrames \=== 0 && m \> 0 ? 2 : 0);  
  }  
  const f \= frames % cFps;  
  const s \= Math.floor(frames / cFps) % 60;  
  const m \= Math.floor(frames / (cFps \* 60)) % 60;  
  const h \= Math.floor(frames / (cFps \* 3600));  
  return \[h, m, s, f\].map(v \=\> String(v).padStart(2, '0')).join(':');  
};

#### **Module 2: Tap Tempo & Metronome**

Captures accurate physical input intervals and handles sample-accurate synchronization triggers.

* **Adaptive Tap Smoothing:** Utilizes an asynchronous buffer collection array capped at 8 entries. Variations in delta changes exceeding $15\\%$ of the system mean are stripped instantly via array filters.  
* **Metronome Core Implementation:**

JavaScript  
let audioCtx \= null;  
const initAudio \= () \=\> audioCtx \= audioCtx || new (window.AudioContext || window.webkitAudioContext)();

const scheduleClick \= (time, freq) \=\> {  
  const osc \= audioCtx.createOscillator();  
  const gain \= audioCtx.createGain();  
  osc.type \= 'sine';  
  osc.frequency.setValueAtTime(freq, time);  
  gain.gain.setValueAtTime(0.5, time);  
  gain.gain.exponentialRampToValueAtTime(0.001, time \+ 0.05);  
  osc.connect(gain);  
  gain.connect(audioCtx.destination);  
  osc.start(time);  
  osc.stop(time \+ 0.05);  
};

#### **Module 3: Tempo to Delay Converter**

Generates a static calculated array of delay metrics in milliseconds and frequencies based on the active global $globalBpm.

* **Formulas:**  
  * Base Duration:  
    T\_base \= (60000 / BPM) \* 4 \* Length  
  * Dotted Duration Modifier:  
    T\_dotted \= T\_base \* 1.5  
  * Triplet Duration Modifier:  
    T\_triplet \= T\_base \* (2/3)  
  * Frequency Equivalent Calculation:  
    f \= 1000 / T\_ms

#### **Module 4: Note to Frequency Table Converter**

Converts raw standard MIDI notes to absolute output frequencies under customizable acoustic conditions.

* **Dynamic Temperament Offset Processing:** Evaluates custom historical temperament offset matrices ($c\_{\\text{offset}}$) scaled in cents.  
* **Core Math Conversion Equation:**  
  f(n) \= A4 \* Math.pow(2, (n \- 69 \+ (c\_offset / 100)) / 12\)

#### **Module 5: Sample Length Converter**

Maintains non-cyclical tri-directional computation blocks balancing hardware constraints with temporal structures.

* **State Conflict Management Logic:**

JavaScript  
const syncSampleMetrics \= (triggerField, payload, bpm, sampleRate) \=\> {  
  const msToBeats \= ms \=\> (ms \* bpm) / 60000;  
  const beatsToMs \= beats \=\> (beats \* 60000) / bpm;  
  const msToSamples \= ms \=\> Math.round((ms \* sampleRate) / 1000);  
  const samplesToMs \= samples \=\> (samples \* 1000) / sampleRate;

  return triggerField \=== 'samples'   
    ? { samples: payload, ms: samplesToMs(payload), beats: msToBeats(samplesToMs(payload)) }  
    : triggerField \=== 'ms'  
    ? { samples: msToSamples(payload), ms: payload, beats: msToBeats(payload) }  
    : { samples: msToSamples(beatsToMs(payload)), ms: beatsToMs(payload), beats: payload };  
};

#### **Module 6: Tempo Change Converter**

Tracks proportional relationships between shifting global project arrangements.

* **Mathematical Processing Rules:**  
  * Warp Ratio Percentage:  
    Ratio\_percent \= (BPM\_target / BPM\_source) \* 100  
  * Varispeed Audio Transposition Formula:  
    S\_semitones \= 12 \* Math.log2(BPM\_target / BPM\_source)

#### **Module 7: Frequency to Note Converter**

Processes continuous absolute scalar numeric values into structured discrete musical note metrics.

* **Algorithmic Quantization Flow:**  
  n\_raw \= 12 \* Math.log2(f / A4) \+ 69  
  n \= Math.round(n\_raw)  
  Offset\_cents \= (n\_raw \- n) \* 100

## **PART 2: SHORT VERSION (SPECIFICATION ABSTRACT)**

* **Architecture Stack:** Client-side SvelteKit Single Page Application (@sveltejs/adapter-static). Configured for local-only, offline-first execution via Progressive Web Application (PWA) assets cached by custom service workers. State variable storage is bound securely to native localStorage schemas.  
* **Visual Layout Blueprint:** Custom semantic HTML elements styled via native component-scoped Vanilla CSS rules. Responsive transitions follow a hardcoded mobile-first scale spanning exactly from $22.5\\text{em}$ ($360\\text{px}$) through $160\\text{em}$ ($2560\\text{px}$). Zero external framework UI libraries or layouts are used.  
* **Operational Execution Core:** A shared store infrastructure drives mathematical utility layers to calculate Drop-Frame video timecodes, process filtered moving-average rhythmic tap arrays, evaluate 100 independent microtonal tuning temperaments via custom root calculations ($A\_4$), and solve structural relationships linking audio samples, absolute milliseconds, pitch changes, and musical notations. Audio click elements and tuning frequency updates execute securely outside UI blocks using native low-latency Web Audio API threads.