import { describe, it, expect } from 'vitest';
import { timecodeToFrames, framesToTimecode } from './timecode';
import { TapTempoTracker } from './tapTempo';
import { calculateDelayTable } from './delay';
import { midiToFrequency, TEMPERAMENT_PRESETS } from './temperament';
import { syncSampleMetrics } from './sampleLength';
import { calculateTempoChange } from './tempoChange';
import { frequencyToMidi } from './frequencyToNote';

describe('MusicMath Computational Engines', () => {
  
  describe('Module 1: Timecode Calculator', () => {
    it('should convert timecode to frames correctly for non-drop frames', () => {
      // 24 fps
      expect(timecodeToFrames('00:01:00:00', 24, false)).toBe(1440);
      expect(timecodeToFrames('00:01:02:12', 24, false)).toBe(1440 + 48 + 12);
      
      // 30 fps
      expect(timecodeToFrames('01:00:00:00', 30, false)).toBe(108000);
    });

    it('should convert frames to timecode correctly for non-drop frames', () => {
      // 24 fps
      expect(framesToTimecode(1440, 24, false)).toBe('00:01:00:00');
      expect(framesToTimecode(1500, 24, false)).toBe('00:01:02:12');
      
      // 30 fps
      expect(framesToTimecode(108000, 30, false)).toBe('01:00:00:00');
    });

    it('should correctly skip frames at 29.97 DF (drops 2 frames per min except every 10th min)', () => {
      // Frame 1799 should be 00:00:59;29
      expect(framesToTimecode(1799, 29.97, true)).toBe('00:00:59;29');
      // Frame 1800 should skip to 00:01:00;02
      expect(framesToTimecode(1800, 29.97, true)).toBe('00:01:00;02');

      // Check conversion back
      expect(timecodeToFrames('00:00:59;29', 29.97, true)).toBe(1799);
      expect(timecodeToFrames('00:01:00;02', 29.97, true)).toBe(1800);
    });

    it('should correctly skip frames at 59.94 DF (drops 4 frames per min except every 10th min)', () => {
      // Frame 3599 should be 00:00:59;59
      expect(framesToTimecode(3599, 59.94, true)).toBe('00:00:59;59');
      // Frame 3600 should skip to 00:01:00;04
      expect(framesToTimecode(3600, 59.94, true)).toBe('00:01:00;04');

      // Check conversion back
      expect(timecodeToFrames('00:00:59;59', 59.94, true)).toBe(3599);
      expect(timecodeToFrames('00:01:00;04', 59.94, true)).toBe(3600);
    });

    it('should NOT drop frames on 10-minute boundaries', () => {
      // For 29.97 DF, 10 minutes frame count is 17982
      expect(framesToTimecode(17982, 29.97, true)).toBe('00:10:00;00');
      expect(timecodeToFrames('00:10:00;00', 29.97, true)).toBe(17982);

      // For 59.94 DF, 10 minutes frame count is 35964
      expect(framesToTimecode(35964, 59.94, true)).toBe('00:10:00;00');
      expect(timecodeToFrames('00:10:00;00', 59.94, true)).toBe(35964);
    });

    it('should maintain 100% roundtrip accuracy for 100,000 frames', () => {
      const rates = [
        { fps: 23.976, isDrop: false },
        { fps: 24, isDrop: false },
        { fps: 25, isDrop: false },
        { fps: 29.97, isDrop: true },
        { fps: 30, isDrop: false },
        { fps: 59.94, isDrop: true },
        { fps: 60, isDrop: false }
      ];

      for (const rate of rates) {
        for (let f = 0; f < 100000; f += 250) { // check every 250 frames for speed
          const tc = framesToTimecode(f, rate.fps, rate.isDrop);
          const back = timecodeToFrames(tc, rate.fps, rate.isDrop);
          expect(back).toBe(f);
        }
      }
    });
  });

  describe('Module 2: Tap Tempo & Metronome Tracker', () => {
    it('should filter out tap anomalies exceeding 15% deviation', () => {
      const tracker = new TapTempoTracker();
      
      // Simulate 5 taps with roughly 500ms intervals (120 BPM)
      // Tap intervals: 500ms, 500ms, 800ms (anomaly!), 500ms
      // Timestamps:
      tracker.registerTap(1000);
      expect(tracker.getTapCount()).toBe(1);
      
      tracker.registerTap(1500); // delta = 500
      tracker.registerTap(2000); // delta = 500
      tracker.registerTap(2800); // delta = 800 (this is an anomaly!)
      const bpm = tracker.registerTap(3300); // delta = 500
      
      // Delat mean initially is (500+500+800+500)/4 = 575ms
      // 800 is (800-575)/575 = 39% deviation (filtered out)
      // Remaining: 500, 500, 500
      // BPM should be 60000 / 500 = 120
      expect(bpm).toBe(120);
    });

    it('should reset buffer if delta exceeds 3 seconds', () => {
      const tracker = new TapTempoTracker();
      tracker.registerTap(1000);
      tracker.registerTap(1500);
      expect(tracker.getTapCount()).toBe(2);
      
      // 4 seconds gap
      tracker.registerTap(5500);
      expect(tracker.getTapCount()).toBe(1); // buffer was reset
    });
  });

  describe('Module 3: Tempo to Delay Converter', () => {
    it('should calculate delay times correctly for a given BPM', () => {
      const table = calculateDelayTable(120); // 120 BPM -> 500ms per quarter note (1/4)
      
      const quarterNote = table.find(d => d.division === '1/4');
      expect(quarterNote).toBeDefined();
      expect(quarterNote?.standard.ms).toBe(500);
      expect(quarterNote?.standard.hz).toBe(2); // 1000 / 500 ms = 2 Hz
      
      expect(quarterNote?.dotted.ms).toBe(750); // 500 * 1.5 = 750
      expect(quarterNote?.triplet.ms).toBeCloseTo(333.333, 2); // 500 * 2/3 = 333.33
    });
  });

  describe('Module 4: Note to Frequency Table Converter', () => {
    it('should convert MIDI notes to frequency correctly (12-TET)', () => {
      // Note 69 is A4 and should be exactly 440 Hz
      const a4 = midiToFrequency(69, 440, TEMPERAMENT_PRESETS.EQUAL);
      expect(a4.name).toBe('A4');
      expect(a4.frequency).toBe(440);

      // Note 60 is C4 and should be ~261.63 Hz
      const c4 = midiToFrequency(60, 440, TEMPERAMENT_PRESETS.EQUAL);
      expect(c4.name).toBe('C4');
      expect(c4.frequency).toBeCloseTo(261.626, 2);
    });

    it('should apply historical temperament offsets relative to A4 = 0 cents', () => {
      // In Werckmeister III, A is 0.0, C is 12.0
      // Check that A4 remains exactly 440 Hz (since its offset relative to A is 0)
      const a4 = midiToFrequency(69, 440, TEMPERAMENT_PRESETS.WERCKMEISTER_III);
      expect(a4.frequency).toBe(440);

      // Check C4 with Werckmeister III offsets
      // Offset of C = 12.0 cents, Offset of A = 0.0 cents
      // Relative offset = 12.0 - 0.0 = 12.0 cents
      // C4 frequency = 440 * 2^((60 - 69 + 12/100) / 12) = 440 * 2^(-8.88 / 12) = ~263.45 Hz
      const c4 = midiToFrequency(60, 440, TEMPERAMENT_PRESETS.WERCKMEISTER_III);
      expect(c4.frequency).toBeCloseTo(263.447, 2);
    });
  });

  describe('Module 5: Sample Length Converter', () => {
    it('should sync metrics triggered by samples', () => {
      // 120 BPM, 44100 Hz sample rate
      const result = syncSampleMetrics('samples', 44100, 120, 44100);
      expect(result.ms).toBe(1000); // 44100 samples at 44.1kHz = 1 second
      expect(result.beats).toBe(2); // 1 sec at 120 BPM = 2 beats
    });

    it('should sync metrics triggered by ms', () => {
      const result = syncSampleMetrics('ms', 500, 120, 48000);
      expect(result.samples).toBe(24000); // 0.5 sec at 48kHz = 24000 samples
      expect(result.beats).toBe(1); // 0.5 sec at 120 BPM = 1 beat
    });

    it('should sync metrics triggered by beats', () => {
      const result = syncSampleMetrics('beats', 1, 60, 48000);
      expect(result.ms).toBe(1000); // 1 beat at 60 BPM = 1 second
      expect(result.samples).toBe(48000); // 1 sec at 48kHz = 48000 samples
    });
  });

  describe('Module 6: Tempo Change Converter', () => {
    it('should calculate warp ratio and varispeed pitch shift correctly', () => {
      // Doubling the tempo (60 to 120 BPM)
      const double = calculateTempoChange(60, 120);
      expect(double.ratio).toBe(200); // 200% speed
      expect(double.semitones).toBe(12); // +12 semitones pitch shift

      // Halving the tempo (120 to 60 BPM)
      const half = calculateTempoChange(120, 60);
      expect(half.ratio).toBe(50); // 50% speed
      expect(half.semitones).toBe(-12); // -12 semitones pitch shift
    });
  });

  describe('Module 7: Frequency to Note Converter', () => {
    it('should convert frequency to MIDI note and cents offset correctly', () => {
      // 440 Hz is exactly A4 (note 69) with 0 cents offset
      const a4 = frequencyToMidi(440, 440);
      expect(a4.note).toBe(69);
      expect(a4.name).toBe('A4');
      expect(a4.centsOffset).toBe(0);

      // 450 Hz should be A4 (note 69) with some positive cents offset
      // centsOffset = 1200 * log2(450/440) = ~38.9 cents
      const a4Plus = frequencyToMidi(450, 440);
      expect(a4Plus.note).toBe(69);
      expect(a4Plus.name).toBe('A4');
      expect(a4Plus.centsOffset).toBeCloseTo(38.91, 1);

      // 261.63 Hz is C4 (note 60)
      const c4 = frequencyToMidi(261.63, 440);
      expect(c4.note).toBe(60);
      expect(c4.name).toBe('C4');
      expect(c4.centsOffset).toBeCloseTo(0, 1);
    });
  });

});
