/**
 * Converts a timecode string to an absolute frame count.
 * Supports NDF formats (using ":") and DF formats (using ";").
 * Timecode format must be HH:MM:SS:FF or HH:MM:SS;FF.
 */
export const timecodeToFrames = (timecode: string, fps: number, isDrop: boolean): number => {
  const parts = timecode.split(/[:;]/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  
  const [h, m, s, f] = parts;
  const cFps = Math.ceil(fps);
  const baseFrames = (h * 3600 + m * 60 + s) * cFps + f;
  
  if (!isDrop) return baseFrames;
  
  const dropFrames = fps > 30 ? 4 : 2;
  const totalMinutes = h * 60 + m;
  const dropCount = dropFrames * (totalMinutes - Math.floor(totalMinutes / 10));
  return baseFrames - dropCount;
};

/**
 * Converts an absolute frame count to a standard timecode string.
 */
export const framesToTimecode = (frames: number, fps: number, isDrop: boolean): string => {
  const cFps = Math.ceil(fps);
  let adjustedFrames = frames;
  
  if (isDrop) {
    const dropFrames = fps > 30 ? 4 : 2;
    const nominalMinFrames = cFps * 60;
    const framesPer10Mins = nominalMinFrames * 10 - dropFrames * 9;
    const framesPerMin = nominalMinFrames - dropFrames;
    
    const d = Math.floor(frames / framesPer10Mins);
    const m = frames % framesPer10Mins;
    
    let dropsIn10Min = 0;
    if (m >= nominalMinFrames) {
      dropsIn10Min = dropFrames * (1 + Math.floor((m - nominalMinFrames) / framesPerMin));
    }
    adjustedFrames += dropFrames * 9 * d + dropsIn10Min;
  }
  
  const f = adjustedFrames % cFps;
  const s = Math.floor(adjustedFrames / cFps) % 60;
  const m = Math.floor(adjustedFrames / (cFps * 60)) % 60;
  const h = Math.floor(adjustedFrames / (cFps * 3600));
  
  const separator = isDrop ? ';' : ':';
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(f)}`;
};
