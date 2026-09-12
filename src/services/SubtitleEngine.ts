export interface SubtitleCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export class SubtitleEngine {
  private cues: SubtitleCue[] = [];
  private delayMs: number = 0; // Delay adjustment in milliseconds (+ / -)

  public parseSRT(srtContent: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const blocks = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n');

    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        let timeLineIndex = 1;
        if (!lines[0].includes('-->')) {
          timeLineIndex = 1;
        } else {
          timeLineIndex = 0;
        }

        const timeLine = lines[timeLineIndex];
        if (timeLine && timeLine.includes('-->')) {
          const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
          const start = this.parseTimestamp(startStr);
          const end = this.parseTimestamp(endStr);
          const text = lines.slice(timeLineIndex + 1).join('\n');

          if (text) {
            cues.push({
              id: `cue-${index}`,
              start,
              end,
              text: text.replace(/<[^>]*>/g, ''), // Strip simple HTML tags
            });
          }
        }
      }
    });

    this.cues = cues;
    return cues;
  }

  public parseVTT(vttContent: string): SubtitleCue[] {
    const cleanVtt = vttContent.replace(/^WEBVTT[^\n]*\n/, '');
    return this.parseSRT(cleanVtt);
  }

  private parseTimestamp(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.replace(',', '.').split(':');
    if (parts.length === 3) {
      const hours = parseFloat(parts[0]);
      const minutes = parseFloat(parts[1]);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const minutes = parseFloat(parts[0]);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  public setDelayMs(ms: number): void {
    this.delayMs = ms;
  }

  public getDelayMs(): number {
    return this.delayMs;
  }

  public getActiveCue(currentTimeInSeconds: number): SubtitleCue | null {
    const adjustedTime = currentTimeInSeconds - this.delayMs / 1000;
    return (
      this.cues.find(
        (cue) => adjustedTime >= cue.start && adjustedTime <= cue.end
      ) || null
    );
  }

  public setCues(cues: SubtitleCue[]): void {
    this.cues = cues;
  }

  public getCues(): SubtitleCue[] {
    return this.cues;
  }
}
