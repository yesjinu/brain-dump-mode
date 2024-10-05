import { MINUTE_IN_MS, SECOND_IN_MS } from "./constants";

export class SpeedMeter {
  private wordTimestamps: number[] = [];
  private window: number;

  constructor(window: number = SECOND_IN_MS) {
    this.window = window;
  }

  collectTypeEvt() {
    const currentTime = Date.now();
    this.wordTimestamps.push(currentTime);
  }

  getTpm(): number {
    const multipleForMinute = MINUTE_IN_MS / this.window;
    const diff = Date.now() - this.window;
    this.wordTimestamps = this.wordTimestamps.filter(
      (timestamp) => timestamp > diff
    );
    const wordsInLastSeconds = this.wordTimestamps.length;

    return wordsInLastSeconds * multipleForMinute;
  }

  setWindow(window: number) {
    this.window = window;
  }
}
