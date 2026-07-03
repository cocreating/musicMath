<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { globalBpm, diapason, sampleRate } from '$lib/stores';
  import { MetronomeScheduler } from '$lib/audio';
  import { TapTempoTracker } from '$lib/engines/tapTempo';
  import { timecodeToFrames, framesToTimecode } from '$lib/engines/timecode';
  import { calculateDelayTable } from '$lib/engines/delay';
  import { midiToFrequency, TEMPERAMENT_PRESETS, PITCH_NAMES } from '$lib/engines/temperament';
  import { syncSampleMetrics } from '$lib/engines/sampleLength';
  import { calculateTempoChange } from '$lib/engines/tempoChange';
  import { frequencyToMidi } from '$lib/engines/frequencyToNote';

  // Instantiate classes
  const tapTracker = new TapTempoTracker();
  const metronome = new MetronomeScheduler();

  // --- Svelte 5 Local UI State Runes ---
  
  // Metronome Visual State
  let activeBeat = $state(-1);
  let isMetronomePlaying = $state(false);

  // Timecode Calculator State
  let tcInput = $state('00:01:00;02');
  let tcFps = $state(29.97);
  let tcIsDrop = $state(true);
  let tcFramesOutput = $derived(timecodeToFrames(tcInput, tcFps, tcIsDrop));

  let framesInput = $state(1800);
  let framesFps = $state(29.97);
  let framesIsDrop = $state(true);
  let framesTcOutput = $derived(framesToTimecode(framesInput, framesFps, framesIsDrop));

  // Delay Table State
  let delayTable = $derived(calculateDelayTable($globalBpm));

  // Note to Frequency Table State
  let selectedTemperament = $state('EQUAL');
  let noteRangeStart = $state(36); // C2
  let noteRangeEnd = $state(84);   // C6
  let temperamentOffsets = $derived(TEMPERAMENT_PRESETS[selectedTemperament as keyof typeof TEMPERAMENT_PRESETS]);
  let noteList = $derived(
    Array.from({ length: noteRangeEnd - noteRangeStart + 1 }, (_, i) => 
      midiToFrequency(noteRangeStart + i, $diapason, temperamentOffsets)
    )
  );

  // Sample Length Converter State
  let slSamples = $state(48000);
  let slMs = $state(1000);
  let slBeats = $state(2);

  // Tempo Change State
  let tcSourceBpm = $state(120);
  let tcTargetBpm = $state(128);
  let tcResult = $derived(calculateTempoChange(tcSourceBpm, tcTargetBpm));

  // Frequency to Note State
  let fnFrequency = $state(440);
  let fnResult = $derived(frequencyToMidi(fnFrequency, $diapason));

  // --- Effects & Subscriptions ---
  
  // Sync global BPM to the metronome scheduler
  $effect(() => {
    metronome.setBpm($globalBpm);
  });

  // Re-sync Sample Length metrics when global stores (BPM, Sample Rate) update
  $effect(() => {
    const synced = syncSampleMetrics('samples', slSamples, $globalBpm, $sampleRate);
    slMs = synced.ms;
    slBeats = Math.round(synced.beats * 1000) / 1000;
  });

  // --- Functions / Callbacks ---

  const handleTap = () => {
    const now = performance.now();
    const detectedBpm = tapTracker.registerTap(now);
    if (detectedBpm !== null) {
      globalBpm.set(detectedBpm);
    }
  };

  const toggleMetronome = () => {
    if (isMetronomePlaying) {
      metronome.stop();
      isMetronomePlaying = false;
      activeBeat = -1;
    } else {
      metronome.start();
      isMetronomePlaying = true;
    }
  };

  const handleSlChange = (field: 'samples' | 'ms' | 'beats', value: number) => {
    const synced = syncSampleMetrics(field, value, $globalBpm, $sampleRate);
    slSamples = synced.samples;
    slMs = synced.ms;
    slBeats = Math.round(synced.beats * 1000) / 1000;
  };

  // Metronome initialization
  onMount(() => {
    metronome.setOnBeat((beat) => {
      activeBeat = beat;
    });
  });

  onDestroy(() => {
    metronome.stop();
  });
</script>

<div class="module-grid">
  <!-- SETTINGS HUD CARD (Global State Controls) -->
  <div class="card settings-hud">
    <!-- Global BPM Slider -->
    <div class="control-group">
      <div class="control-label">Global Tempo (BPM): {$globalBpm}</div>
      <div class="control-input-wrapper">
        <input 
          type="range" 
          min="20" 
          max="300" 
          step="0.5" 
          value={$globalBpm} 
          oninput={(e) => globalBpm.set(Number(e.currentTarget.value))}
        />
        <input 
          type="number" 
          min="20" 
          max="300" 
          step="0.1" 
          style="width: 80px;"
          value={$globalBpm} 
          oninput={(e) => globalBpm.set(Number(e.currentTarget.value))}
        />
      </div>
    </div>

    <!-- Global Diapason (A4 reference) -->
    <div class="control-group">
      <div class="control-label">A4 Reference Diapason (Hz): {$diapason}</div>
      <div class="control-input-wrapper">
        <input 
          type="range" 
          min="400" 
          max="480" 
          step="1" 
          value={$diapason} 
          oninput={(e) => diapason.set(Number(e.currentTarget.value))}
        />
        <input 
          type="number" 
          min="400" 
          max="480" 
          style="width: 80px;"
          value={$diapason} 
          oninput={(e) => diapason.set(Number(e.currentTarget.value))}
        />
      </div>
    </div>

    <!-- Global Audio Sample Rate -->
    <div class="control-group">
      <div class="control-label">Hardware Sample Rate:</div>
      <select 
        value={$sampleRate} 
        onchange={(e) => sampleRate.set(Number(e.currentTarget.value))}
      >
        <option value={44100}>44.1 kHz (CD Quality)</option>
        <option value={48000}>48.0 kHz (Video Standard)</option>
        <option value={88200}>88.2 kHz</option>
        <option value={96000}>96.0 kHz (Studio HD)</option>
        <option value={176400}>176.4 kHz</option>
        <option value={192000}>192.0 kHz</option>
      </select>
    </div>
  </div>

  <!-- MODULE 1: TIMECODE CALCULATOR CARD -->
  <div class="card">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      Timecode Calculator
    </h2>
    <div class="calc-row">
      <div class="calc-group">
        <label for="tc-in">Timecode Input</label>
        <input id="tc-in" type="text" bind:value={tcInput} placeholder="e.g. 00:01:00;02" />
      </div>
      <div class="calc-group" style="flex: 0.6;">
        <label for="tc-fps">FPS</label>
        <select id="tc-fps" bind:value={tcFps}>
          <option value={23.976}>23.976</option>
          <option value={24}>24</option>
          <option value={25}>25</option>
          <option value={29.97}>29.97</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={59.94}>59.94</option>
          <option value={60}>60</option>
        </select>
      </div>
      <div class="calc-group" style="flex: 0.5; align-items: center; justify-content: center; height: 38px;">
        <label style="margin-bottom: 2px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          DF
          <input type="checkbox" bind:checked={tcIsDrop} style="width: 20px; height: 20px; margin-top: 4px; cursor: pointer;" />
        </label>
      </div>
    </div>
    <div class="display-box" style="margin-bottom: 1.5rem;">
      {tcFramesOutput} frames
    </div>

    <div class="calc-row">
      <div class="calc-group">
        <label for="frames-in">Frames Input</label>
        <input id="frames-in" type="number" min="0" bind:value={framesInput} />
      </div>
      <div class="calc-group" style="flex: 0.6;">
        <label for="frames-fps">FPS</label>
        <select id="frames-fps" bind:value={framesFps}>
          <option value={23.976}>23.976</option>
          <option value={24}>24</option>
          <option value={25}>25</option>
          <option value={29.97}>29.97</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={59.94}>59.94</option>
          <option value={60}>60</option>
        </select>
      </div>
      <div class="calc-group" style="flex: 0.5; align-items: center; justify-content: center; height: 38px;">
        <label style="margin-bottom: 2px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          DF
          <input type="checkbox" bind:checked={framesIsDrop} style="width: 20px; height: 20px; margin-top: 4px; cursor: pointer;" />
        </label>
      </div>
    </div>
    <div class="display-box">
      {framesTcOutput}
    </div>
  </div>

  <!-- MODULE 2: TAP TEMPO & METRONOME CARD -->
  <div class="card">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      Tap Tempo & Metronome
    </h2>
    
    <div class="metro-visualizer">
      <div class="metro-dot accent-beat" class:active={activeBeat === 0}></div>
      <div class="metro-dot" class:active={activeBeat === 1}></div>
      <div class="metro-dot" class:active={activeBeat === 2}></div>
      <div class="metro-dot" class:active={activeBeat === 3}></div>
    </div>

    <button 
      class="btn" 
      style="height: 90px; font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; text-transform: uppercase;"
      onclick={handleTap}
    >
      Tap Tempo
    </button>

    <div class="calc-row">
      <button 
        class="btn" 
        class:btn-danger={isMetronomePlaying}
        class:btn-accent={!isMetronomePlaying}
        style="flex: 1; text-transform: uppercase;"
        onclick={toggleMetronome}
      >
        {isMetronomePlaying ? 'Stop Click' : 'Start Click'}
      </button>
      <button 
        class="btn btn-secondary" 
        style="width: 80px;"
        onclick={() => { tapTracker.reset(); }}
      >
        Reset
      </button>
    </div>
  </div>

  <!-- MODULE 3: TEMPO TO DELAY CARD -->
  <div class="card" style="grid-column: span 1;">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"/><path d="M12 6v8l4 2"/></svg>
      Tempo to Delay Table
    </h2>
    <div class="table-container">
      <table class="delay-table">
        <thead>
          <tr>
            <th>Rate</th>
            <th>Straight (ms / Hz)</th>
            <th>Dotted (ms / Hz)</th>
            <th>Triplet (ms / Hz)</th>
          </tr>
        </thead>
        <tbody>
          {#each delayTable as row}
            <tr>
              <td><strong>{row.division}</strong></td>
              <td>
                <span class="ms">{Math.round(row.standard.ms)} ms</span><br/>
                <span class="hz">{row.standard.hz.toFixed(2)} Hz</span>
              </td>
              <td>
                <span class="ms">{Math.round(row.dotted.ms)} ms</span><br/>
                <span class="hz">{row.dotted.hz.toFixed(2)} Hz</span>
              </td>
              <td>
                <span class="ms">{Math.round(row.triplet.ms)} ms</span><br/>
                <span class="hz">{row.triplet.hz.toFixed(2)} Hz</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <!-- MODULE 4: NOTE TO FREQUENCY TABLE CARD -->
  <div class="card">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      Note to Frequency Matrix
    </h2>
    <div class="calc-row">
      <div class="calc-group">
        <label for="temp-sel">Tuning Temperament</label>
        <select id="temp-sel" bind:value={selectedTemperament}>
          <option value="EQUAL">12-TET (Standard Equal)</option>
          <option value="PYTHAGOREAN">Pythagorean Tuning</option>
          <option value="WERCKMEISTER_III">Werckmeister III</option>
          <option value="KIRNBERGER_III">Kirnberger III</option>
        </select>
      </div>
    </div>
    <div class="calc-row">
      <div class="calc-group">
        <label for="range-start">Start Note</label>
        <select id="range-start" bind:value={noteRangeStart}>
          {#each Array(84) as _, i}
            <option value={i + 12}>{PITCH_NAMES[(i + 12) % 12]}{Math.floor((i + 12) / 12) - 1} (MIDI {i + 12})</option>
          {/each}
        </select>
      </div>
      <div class="calc-group">
        <label for="range-end">End Note</label>
        <select id="range-end" bind:value={noteRangeEnd}>
          {#each Array(84) as _, i}
            {#if i + 12 >= noteRangeStart}
              <option value={i + 12}>{PITCH_NAMES[(i + 12) % 12]}{Math.floor((i + 12) / 12) - 1} (MIDI {i + 12})</option>
            {/if}
          {/each}
        </select>
      </div>
    </div>
    <div class="note-grid-container">
      {#each noteList as item}
        <div class="note-row">
          <span class="midi-num">#{item.note}</span>
          <span class="note-name">{item.name}</span>
          <span class="freq-val">{item.frequency.toFixed(3)} Hz</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- MODULE 5: SAMPLE LENGTH CONVERTER CARD -->
  <div class="card">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M3 20v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8"/><path d="M11 20V10a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10"/></svg>
      Sample Length Converter
    </h2>
    <div class="calc-row">
      <div class="calc-group">
        <label for="sl-samples">Samples</label>
        <input 
          id="sl-samples" 
          type="number" 
          min="0"
          value={slSamples} 
          oninput={(e) => handleSlChange('samples', Number(e.currentTarget.value))}
        />
      </div>
    </div>
    <div class="calc-row">
      <div class="calc-group">
        <label for="sl-ms">Milliseconds (ms)</label>
        <input 
          id="sl-ms" 
          type="number" 
          min="0"
          value={slMs} 
          oninput={(e) => handleSlChange('ms', Number(e.currentTarget.value))}
        />
      </div>
    </div>
    <div class="calc-row">
      <div class="calc-group">
        <label for="sl-beats">Rhythmic Beats</label>
        <input 
          id="sl-beats" 
          type="number" 
          min="0" 
          step="0.001"
          value={slBeats} 
          oninput={(e) => handleSlChange('beats', Number(e.currentTarget.value))}
        />
      </div>
    </div>
  </div>

  <!-- MODULE 6: TEMPO CHANGE CONVERTER CARD -->
  <div class="card">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      Tempo Change & Varispeed
    </h2>
    <div class="calc-row">
      <div class="calc-group">
        <label for="src-bpm">Source BPM</label>
        <input id="src-bpm" type="number" min="10" max="400" bind:value={tcSourceBpm} />
      </div>
      <div class="calc-group">
        <label for="tgt-bpm">Target BPM</label>
        <input id="tgt-bpm" type="number" min="10" max="400" bind:value={tcTargetBpm} />
      </div>
    </div>
    
    <div class="calc-row" style="margin-top: 1rem;">
      <div class="calc-group">
        <span class="control-label" style="text-align: center;">Warp Speed Ratio</span>
        <div class="display-box" style="font-size: 1.35rem; color: var(--accent-purple);">
          {tcResult.ratio}%
        </div>
      </div>
      <div class="calc-group">
        <span class="control-label" style="text-align: center;">Pitch Transposition</span>
        <div class="display-box" style="font-size: 1.35rem; color: var(--accent-coral);">
          {tcResult.semitones > 0 ? '+' : ''}{tcResult.semitones} st
        </div>
      </div>
    </div>
  </div>

  <!-- MODULE 7: FREQUENCY TO NOTE CONVERTER CARD -->
  <div class="card">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c5.523 0 10 4.477 10 10S17.523 22 12 22 2 17.523 2 12 6.477 2 12 2zm0 5v10M7 12h10"/></svg>
      Frequency to Note Quantizer
    </h2>
    <div class="calc-row">
      <div class="calc-group">
        <label for="fn-freq">Input Frequency (Hz)</label>
        <input id="fn-freq" type="number" min="1" step="0.01" bind:value={fnFrequency} />
      </div>
    </div>
    <div class="calc-row" style="margin-top: 1rem;">
      <div class="calc-group">
        <span class="control-label" style="text-align: center;">Nearest Pitch</span>
        <div class="display-box" style="font-size: 1.35rem; color: var(--accent-teal);">
          {fnResult.name} (MIDI #{fnResult.note})
        </div>
      </div>
      <div class="calc-group">
        <span class="control-label" style="text-align: center;">Cents Offset</span>
        <div class="display-box" style="font-size: 1.35rem; color: var(--accent-coral);">
          {fnResult.centsOffset > 0 ? '+' : ''}{fnResult.centsOffset} ¢
        </div>
      </div>
    </div>
  </div>
</div>
