import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

interface BrainDumpSettings {
  backspaceDisabled: boolean;
  runnerModeEnabled: boolean;
}

const DEFAULT_SETTINGS: BrainDumpSettings = {
  backspaceDisabled: false,
  runnerModeEnabled: false,
};

class StatusBarManager {
  private el: HTMLElement | undefined;
  private targetSpeed: number;

  constructor(el: HTMLElement, targetSpeed = 500) {
    this.el = el;
    this.targetSpeed = targetSpeed;
  }

  resetView() {
    this.updateStatusBar(`🏊----------🦈: 0 types/min`);
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
    let distance = 10;

    const speedPercentage = (speed / targetSpeed) * 100;

    if (speedPercentage < 100) {
      distance = Math.round((speedPercentage / 100) * 10);
    }

    return `${swimmer}${"-".repeat(distance)}${shark}${"-".repeat(
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

export default class BrainDumpMode extends Plugin {
  settings: BrainDumpSettings;
  statusBarManager: StatusBarManager;
  lastSnapshot: string | undefined = undefined;
  wordTimestamps: number[] = [];
  isBrainDumpModeOn = false;

  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };

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
        const currentTime = Date.now();
        this.wordTimestamps.push(currentTime);
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
          const tpm = this.calculateTPM();
          this.statusBarManager.updateView(tpm);
        }
      }, 100)
    );
  }

  calculateTPM(): number {
    const targetWindow = 1000;
    const targetWindowSec = targetWindow / 1000;
    const multipleForMinute = 60 / targetWindowSec;
    const from = Date.now() - targetWindow;
    this.wordTimestamps = this.wordTimestamps.filter(
      (timestamp) => timestamp > from
    );
    const wordsInLastSeconds = this.wordTimestamps.length;

    return wordsInLastSeconds * multipleForMinute;
  }

  noticeBrainDumpModeIsOn() {
    new Notice(`Brain Dump Mode 🔥 Backspace DISABLED`);
  }

  toggleBrainDumpMode() {
    this.isBrainDumpModeOn = !this.isBrainDumpModeOn;
    this.settings.backspaceDisabled = this.isBrainDumpModeOn;
    this.settings.runnerModeEnabled = this.isBrainDumpModeOn;
    if (!this.isBrainDumpModeOn) {
      this.statusBarManager.resetView();
    }
    this.saveSettings();
    this.showNoticeTurnedOn();
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
    this.statusBarManager.setTargetSpeed(speed);
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
            this.plugin.settings.backspaceDisabled = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable runner mode")
      .setDesc("If turned on, runner mode enabled")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.runnerModeEnabled)
          .onChange(async (value) => {
            this.plugin.settings.runnerModeEnabled = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Target speed")
      .setDesc("Target speed for Brain Dump Mode")
      .addSlider((slider) =>
        slider
          .setLimits(0, 2000, 50)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.setTargetSpeed(value);
          })
      );
  }
}
