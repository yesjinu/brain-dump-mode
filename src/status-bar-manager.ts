export class StatusBarManager {
  private el: HTMLElement | undefined;
  private targetSpeed: number;

  constructor(el: HTMLElement, targetSpeed = 500) {
    this.el = el;
    this.targetSpeed = targetSpeed;
  }

  resetView() {
    this.updateStatusBar(`🏊~~~~~~~~~~|🦈: 0 types/min`);
  }

  updateView(speed: number) {
    this.updateStatusBar(
      `${this.renderSharkChasingSwimmer(
        this.targetSpeed,
        speed
      )}: ${speed} types/min`
    );
  }

  renderSharkChasingSwimmer(targetSpeed: number, speed: number): string {
    const shark = "🦈";
    const aliveSwimmer = "🏊‍♂️";
    const deadSwimmer = "🩸";
    const wave = "~";
    const totalDistance = 10;

    const speedPercentage = (speed / targetSpeed) * 100;

    const distance =
      speedPercentage > 100
        ? totalDistance
        : Math.round(speedPercentage / totalDistance);

    const swimmer = distance === 0 ? deadSwimmer : aliveSwimmer;

    return `${swimmer}${wave.repeat(distance)}${shark}${wave.repeat(
      totalDistance - distance
    )}`;
  }

  setTargetSpeed(speed: number) {
    this.targetSpeed = speed;
  }

  private updateStatusBar(text: string) {
    this.el?.setText(text);
  }
}
