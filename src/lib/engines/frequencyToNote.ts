export interface PitchInfo {
  note: number;
  name: string;
  centsOffset: number;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Quantizes an absolute frequency to the nearest MIDI note, note name, and cent deviation offset.
 * @param frequency The input frequency in Hz
 * @param diapason Reference frequency of A4 (default: 440)
 */
export const frequencyToMidi = (frequency: number, diapason = 440): PitchInfo => {
  if (frequency <= 0 || isNaN(frequency)) {
    return { note: 0, name: 'Invalid', centsOffset: 0 };
  }
  
  const rawNote = 12 * Math.log2(frequency / diapason) + 69;
  const quantizedNote = Math.round(rawNote);
  const centsOffset = (rawNote - quantizedNote) * 100;
  
  // Clamp MIDI notes to range [0, 127]
  const noteVal = Math.max(0, Math.min(127, quantizedNote));
  const pitchClass = noteVal % 12;
  const octave = Math.floor(noteVal / 12) - 1;
  
  return {
    note: noteVal,
    name: `${NOTE_NAMES[pitchClass]}${octave}`,
    centsOffset: Math.round(centsOffset * 100) / 100
  };
};
