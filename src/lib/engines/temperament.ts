export interface NoteFrequencyInfo {
  note: number;
  name: string;
  frequency: number;
}

export const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Preset historical temperament cents deviations
export const TEMPERAMENT_PRESETS = {
  EQUAL: Array(12).fill(0),
  PYTHAGOREAN: [0, 9.8, 3.9, 13.7, 7.8, -2.0, 7.8, 2.0, 11.7, 5.9, 15.6, 9.8],
  WERCKMEISTER_III: [12.0, 2.0, 4.0, 6.0, 2.0, 8.0, 0.0, 8.0, 4.0, 0.0, 6.0, 2.0],
  KIRNBERGER_III: [10.1, 0.9, 3.9, 6.0, 2.0, 8.1, 0.0, 6.0, 4.0, 0.0, 6.0, 2.0]
};

/**
 * Calculates note name and frequency for a MIDI note with custom temperament offsets.
 * @param note MIDI note number (0 to 127)
 * @param diapason Reference frequency of A4 (default: 440)
 * @param temperamentOffsets Chromatic cents offsets for C through B (12 items)
 */
export const midiToFrequency = (
  note: number,
  diapason = 440,
  temperamentOffsets: number[] = TEMPERAMENT_PRESETS.EQUAL
): NoteFrequencyInfo => {
  const pitchClass = note % 12;
  const octave = Math.floor(note / 12) - 1;
  const noteName = `${PITCH_NAMES[pitchClass]}${octave}`;
  
  // Calculate relative cent offset comparing current pitch class with A (index 9)
  const relativeCentOffset = temperamentOffsets[pitchClass] - temperamentOffsets[9];
  const frequency = diapason * Math.pow(2, (note - 69 + relativeCentOffset / 100) / 12);
  
  return {
    note,
    name: noteName,
    frequency: Math.round(frequency * 1000) / 1000 // 3 decimal places
  };
};
