export interface SampleMetrics {
  samples: number;
  ms: number;
  beats: number;
}

/**
 * Synchronizes metrics when one of them (samples, ms, beats) is changed.
 * @param triggerField 'samples' | 'ms' | 'beats'
 * @param value The mutated input value
 * @param bpm Active global BPM
 * @param sampleRate Active hardware sample rate in Hz
 */
export const syncSampleMetrics = (
  triggerField: 'samples' | 'ms' | 'beats',
  value: number,
  bpm: number,
  sampleRate: number
): SampleMetrics => {
  const msToSamples = (ms: number) => Math.round((ms * sampleRate) / 1000);
  const samplesToMs = (samples: number) => (samples * 1000) / sampleRate;
  const msToBeats = (ms: number) => (ms * bpm) / 60000;
  const beatsToMs = (beats: number) => (beats * 60000) / bpm;

  switch (triggerField) {
    case 'samples': {
      const ms = samplesToMs(value);
      return { samples: value, ms, beats: msToBeats(ms) };
    }
    case 'ms': {
      const samples = msToSamples(value);
      return { samples, ms: value, beats: msToBeats(value) };
    }
    case 'beats': {
      const ms = beatsToMs(value);
      return { samples: msToSamples(ms), ms, beats: value };
    }
    default:
      return { samples: 0, ms: 0, beats: 0 };
  }
};
