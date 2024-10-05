import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { MINUTE_IN_MS, SECOND_IN_MS } from "./src/constants";

interface BrainDumpSettings {
  backspaceDisabled: boolean;
  runnerModeEnabled: boolean;
  speedGoal: number;
  tpmWindow: number;
}

const DEFAULT_SETTINGS: BrainDumpSettings = {
  backspaceDisabled: false,
  runnerModeEnabled: false,
  speedGoal: 1000,
  tpmWindow: SECOND_IN_MS,
};

class StatusBarManager {
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
    const swimmer = "🏊‍♂️";
    const wave = "~";
    const totalDistance = 10;

    const speedPercentage = (speed / targetSpeed) * 100;

    const distance =
      speedPercentage > 100
        ? totalDistance
        : Math.round(speedPercentage / totalDistance);

    return `${swimmer}${wave.repeat(distance)}${shark}${wave.repeat(
      10 - distance
    )}`;
  }

  setTargetSpeed(speed: number) {
    this.targetSpeed = speed;
  }

  private updateStatusBar(text: string) {
    this.el?.setText(text);
  }
}

class SpeedMeter {
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

export default class BrainDumpMode extends Plugin {
  settings: BrainDumpSettings;
  speedMeter: SpeedMeter;
  statusBarManager: StatusBarManager;
  lastSnapshot: string | undefined = undefined;
  isBrainDumpModeOn = false;

  async onload() {
    this.settings = await { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.speedMeter = new SpeedMeter(this.settings.tpmWindow);
    // status bar
    this.statusBarManager = new StatusBarManager(this.addStatusBarItem());

    // ribbon
    this.addRibbonIcon(
      "train-front", // https://lucide.dev/icons/
      "Activate Brain Dump Mode",
      (evt: MouseEvent) => {
        this.toggleBrainDumpMode();
      }
    );

    // command palette
    this.addCommand({
      id: "toggle-brain-dump-mode",
      name: "Activate",
      callback: () => {
        this.toggleBrainDumpMode();
      },
    });

    // setting tab
    this.addSettingTab(new BrainDumpSettingTab(this.app, this));

    // register 'keydown' event listeners
    this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
      if (this.settings.runnerModeEnabled) {
        this.speedMeter.collectTypeEvt();
      }

      if (this.settings.backspaceDisabled) {
        if (evt.key === "ArrowLeft" || evt.key === "ArrowUp") {
          // Disable moving cursor to left or up
          this.app.workspace.activeEditor?.editor?.setCursor(
            Number.MAX_SAFE_INTEGER
          );
          this.noticeBrainDumpModeIsOn();
          return;
        }

        if (evt.key === "Backspace" || evt.key === "Delete") {
          // Disable backspace and delete by recovering last snapshot
          this.app.workspace.activeEditor?.editor?.setValue(
            `${this.lastSnapshot}`
          );
          this.app.workspace.activeEditor?.editor?.setCursor(
            Number.MAX_SAFE_INTEGER
          );
          this.noticeBrainDumpModeIsOn();
          return;
        }

        // Save content snapshot every key press
        const lastWord = evt.key === "Enter" ? "" : evt.key;
        this.lastSnapshot = `${this.app.workspace.activeEditor?.editor?.getValue()}${lastWord}`;
      }
    });

    // register interval for calculating typing speed
    this.registerInterval(
      window.setInterval(() => {
        if (this.settings.runnerModeEnabled) {
          const tpm = this.speedMeter.getTpm();
          this.statusBarManager.updateView(tpm);
        }
      }, 100)
    );
  }

  noticeBrainDumpModeIsOn() {
    new Notice(`Brain Dump Mode 🔥 Backspace DISABLED`);
  }

  toggleBrainDumpMode() {
    this.isBrainDumpModeOn = !this.isBrainDumpModeOn;

    this.setBackspaceDisabled(this.isBrainDumpModeOn);
    this.setRunnerModeEnabled(this.isBrainDumpModeOn);

    this.saveSettings();
    this.showNoticeTurnedOn();
  }

  setBackspaceDisabled(newValue: boolean) {
    this.settings.backspaceDisabled = newValue;
    this.saveSettings();
  }

  setRunnerModeEnabled(newValue: boolean) {
    this.settings.runnerModeEnabled = newValue;
    if (newValue == false) {
      this.statusBarManager.resetView();
    }
    this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  showNoticeTurnedOn() {
    new Notice(
      `Brain Dump Mode ${this.settings.backspaceDisabled ? "✅" : "❌"}`
    );
  }

  setTargetSpeed(speed: number) {
    this.settings.speedGoal = speed;
    this.statusBarManager.setTargetSpeed(speed);
  }

  setWindow(window: number) {
    this.settings.tpmWindow = window;
    this.speedMeter.setWindow(window);
  }
}

class BrainDumpSettingTab extends PluginSettingTab {
  plugin: BrainDumpMode;

  constructor(app: App, plugin: BrainDumpMode) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Enable brain dump mode")
      .setDesc("If turned on, delete key will be disabled")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.backspaceDisabled)
          .onChange(async (value) => {
            this.plugin.setBackspaceDisabled(value);
          })
      );

    new Setting(containerEl)
      .setName("Enable runner mode")
      .setDesc("If turned on, runner mode enabled")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.runnerModeEnabled)
          .onChange(async (value) => {
            this.plugin.setRunnerModeEnabled(value);
          })
      );

    new Setting(containerEl)
      .setName("Your speed goal in minutes")
      .setDesc("Set your typing speed goal in minutes.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 2000, 50)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.setTargetSpeed(value);
          })
      );

    new Setting(containerEl)
      .setName("Speed measure window (milliseconds)")
      .setDesc("Set the window for measuring typing speed in milliseconds.")
      .addSlider((slider) =>
        slider
          .setLimits(500, 1500, 500)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.setWindow(value);
          })
      );
  }
}
