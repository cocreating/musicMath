/**
 * Track manual tempo tapping intervals, filter out anomalies, and return smoothed BPM.
 */
export class TapTempoTracker {
  private tapTimes: number[] = [];

  /**
   * Registers a tap timestamp (in ms) and returns the calculated BPM.
   * Returns null if not enough taps have been registered.
   */
  public registerTap(timestampMs: number): number | null {
    if (this.tapTimes.length > 0) {
      const lastDelta = timestampMs - this.tapTimes[this.tapTimes.length - 1];
      // Reset if user paused for more than 3 seconds
      if (lastDelta > 3000) {
        this.tapTimes = [];
      }
    }

    this.tapTimes.push(timestampMs);
    if (this.tapTimes.length > 8) {
      this.tapTimes.shift();
    }
    
    if (this.tapTimes.length < 2) {
      return null;
    }

    const deltas: number[] = [];
    for (let i = 1; i < this.tapTimes.length; i++) {
      deltas.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }

    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    
    // Filter out delta anomalies that deviate by more than 15% from the mean
    const filtered = deltas.filter(d => Math.abs(d - mean) / mean <= 0.15);

    // Fallback to simple mean if all got filtered out (e.g. erratic tapping)
    const finalMean = filtered.length > 0
      ? filtered.reduce((a, b) => a + b, 0) / filtered.length
      : mean;

    return Math.round((60000 / finalMean) * 100) / 100;
  }

  /**
   * Clears the current tap history buffer.
   */
  public reset(): void {
    this.tapTimes = [];
  }

  /**
   * Returns the count of registered taps in the buffer.
   */
  public getTapCount(): number {
    return this.tapTimes.length;
  }
}
export default TapTempoTracker;
