import { Notice, Plugin } from "obsidian";
import { SECOND_IN_MS } from "./src/constants";
import { SpeedMeter } from "./src/speed-meter";
import { StatusBarManager } from "./src/status-bar-manager";
import { BrainDumpSettingTab } from "./src/setting-tab";

interface BrainDumpSettings {
  noBackspaceMode: {
    enabled: boolean;
  };
  sharkMode: {
    enabled: boolean;
    speedGoal: number;
    tpmWindow: number;
  };
}

const DEFAULT_SETTINGS: BrainDumpSettings = {
  noBackspaceMode: {
    enabled: false,
  },
  sharkMode: {
    enabled: false,
    speedGoal: 1000,
    tpmWindow: SECOND_IN_MS,
  },
};

export default class BrainDumpMode extends Plugin {
  settings: BrainDumpSettings;
  speedMeter: SpeedMeter;
  statusBarManager: StatusBarManager;
  lastSnapshot: string | undefined = undefined;
  isBrainDumpModeOn = false;

  async onload() {
    this.settings = await { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.speedMeter = new SpeedMeter(this.settings.sharkMode.tpmWindow);
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
      if (this.settings.sharkMode.enabled) {
        this.speedMeter.collectTypeEvt();
      }

      if (this.settings.noBackspaceMode.enabled) {
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
        if (this.settings.sharkMode.enabled) {
          const tpm = this.speedMeter.getTpm();
          this.statusBarManager.updateView(tpm);
        }
      }, 100)
    );
  }

  noticeBrainDumpModeIsOn() {
    new Notice(`Backspace DISABLED`);
  }

  toggleBrainDumpMode() {
    this.isBrainDumpModeOn = !this.isBrainDumpModeOn;

    this.setBackspaceDisabled(this.isBrainDumpModeOn);
    this.setSharkModeEnabled(this.isBrainDumpModeOn);

    this.saveSettings();
    this.showNoticeTurnedOn();
  }

  setBackspaceDisabled(newValue: boolean) {
    this.settings.noBackspaceMode.enabled = newValue;
    this.saveSettings();
  }

  setSharkModeEnabled(newValue: boolean) {
    this.settings.sharkMode.enabled = newValue;
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
      `Brain Dump Mode ${this.settings.noBackspaceMode.enabled ? "✅" : "❌"}`
    );
  }

  setTargetSpeed(speed: number) {
    this.settings.sharkMode.speedGoal = speed;
    this.statusBarManager.setTargetSpeed(speed);
  }

  setWindow(window: number) {
    this.settings.sharkMode.tpmWindow = window;
    this.speedMeter.setWindow(window);
  }
}
