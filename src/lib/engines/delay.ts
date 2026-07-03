export interface DelayMetric {
  ms: number;
  hz: number;
}

export interface DelayDivision {
  division: string;
  standard: DelayMetric;
  dotted: DelayMetric;
  triplet: DelayMetric;
}

/**
 * Calculates a table of delay values (in ms and Hz equivalent) for a given BPM.
 * Divisions span from Whole note (1/1) down to Sixty-Fourth note (1/64).
 */
export const calculateDelayTable = (bpm: number): DelayDivision[] => {
  if (bpm <= 0) return [];
  
  const divisions = [
    { name: '1/1', length: 1.0 },
    { name: '1/2', length: 0.5 },
    { name: '1/4', length: 0.25 },
    { name: '1/8', length: 0.125 },
    { name: '1/16', length: 0.0625 },
    { name: '1/32', length: 0.03125 },
    { name: '1/64', length: 0.015625 }
  ];
  
  return divisions.map(div => {
    const tBase = (60000 / bpm) * 4 * div.length;
    
    return {
      division: div.name,
      standard: { ms: tBase, hz: 1000 / tBase },
      dotted: { ms: tBase * 1.5, hz: 1000 / (tBase * 1.5) },
      triplet: { ms: tBase * (2 / 3), hz: 1000 / (tBase * (2 / 3)) }
    };
  });
};
