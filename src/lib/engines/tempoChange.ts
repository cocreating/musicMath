export interface TempoChangeResult {
  ratio: number;
  semitones: number;
}

/**
 * Calculates warp speed ratio percentage and pitch transposition semitones (varispeed).
 * @param srcBpm Source tempo
 * @param tgtBpm Target tempo
 */
export const calculateTempoChange = (srcBpm: number, tgtBpm: number): TempoChangeResult => {
  if (srcBpm <= 0 || tgtBpm <= 0) {
    return { ratio: 100, semitones: 0 };
  }
  
  const ratio = (tgtBpm / srcBpm) * 100;
  const semitones = 12 * Math.log2(tgtBpm / srcBpm);
  
  return {
    ratio: Math.round(ratio * 1000) / 1000,
    semitones: Math.round(semitones * 100) / 100
  };
};
