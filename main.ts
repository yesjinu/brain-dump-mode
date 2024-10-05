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
  el: HTMLElement | undefined;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  resetView() {
    this.updateStatusBar(`---------------------------`);
  }

  updateView(tpm: number) {
    this.updateStatusBar(`Typing Speed: ${tpm} TPM`);
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
    const targetWindow = 5000;
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
  }
}
