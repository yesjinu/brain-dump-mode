import { App, PluginSettingTab, Setting } from "obsidian";
import BrainDumpMode from "../main";

export class BrainDumpSettingTab extends PluginSettingTab {
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
          .setValue(this.plugin.settings.noBackspaceMode.enabled)
          .onChange(async (value) => {
            this.plugin.setBackspaceDisabled(value);
          })
      );

    new Setting(containerEl)
      .setName("Enable runner mode")
      .setDesc("If turned on, runner mode enabled")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.runnerMode.enabled)
          .onChange(async (value) => {
            this.plugin.setRunnerModeEnabled(value);
          })
      );

    new Setting(containerEl)
      .setName("Your speed goal (minute)")
      .setDesc("How fast can you type?")
      .addSlider((slider) =>
        slider
          .setLimits(0, 2000, 50)
          .setValue(this.plugin.settings.runnerMode.speedGoal)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.setTargetSpeed(value);
          })
      );

    new Setting(containerEl)
      .setName("Speed measure window (milliseconds)")
      .setDesc("Lower, the harder.")
      .addSlider((slider) =>
        slider
          .setLimits(500, 1500, 500)
          .setValue(this.plugin.settings.runnerMode.tpmWindow)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.setWindow(value);
          })
      );
  }
}
