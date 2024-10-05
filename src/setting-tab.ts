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
      .setName("Enable shark mode")
      .setDesc("Escape from the shark by typing fast 🦈")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.sharkMode.enabled)
          .onChange(async (value) => {
            this.plugin.setSharkModeEnabled(value);
          })
      );

    new Setting(containerEl)
      .setName("Your speed goal (minute)")
      .setDesc("How fast can you type?")
      .addSlider((slider) =>
        slider
          .setLimits(0, 2000, 50)
          .setValue(this.plugin.settings.sharkMode.speedGoal)
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
          .setValue(this.plugin.settings.sharkMode.tpmWindow)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.setWindow(value);
          })
      );
  }
}
