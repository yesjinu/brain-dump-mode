import { randomInt } from 'crypto';
import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface BrainDumpSettings {
	backspaceDisabled: boolean;
	runnerModeEnabled: boolean;
}

const DEFAULT_SETTINGS: BrainDumpSettings = {
	backspaceDisabled: false,
	runnerModeEnabled: false,
}

export default class BrainDumpMode extends Plugin {
	settings: BrainDumpSettings;
	statusBarItemEl: HTMLElement;
	lastSnapshot: string | undefined = undefined;
	wordTimestamps: number[] = [];

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('brain', 'Brain Dump Mode', (evt: MouseEvent) => {
			this.toggleBrainDumpMode();
		});
		ribbonIconEl.addClass('brain-dump-ribbon-class');

		this.statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar();

		this.addCommand({
			id: 'toggle-brain-dump-mode',
			name: 'Toggle',
			callback: () => {
				this.toggleBrainDumpMode();
			}
		});

		this.addSettingTab(new BrainDumpSettingTab(this.app, this));


		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (this.settings.runnerModeEnabled) {
				const currentTime = Date.now();
				this.wordTimestamps.push(currentTime);
			}

			if (this.settings.backspaceDisabled) {
				if (evt.key === 'ArrowLeft' || evt.key === 'ArrowUp') {
					// Disable moving cursor to left or up
					this.app.workspace.activeEditor?.editor?.setCursor(Number.MAX_SAFE_INTEGER)
					this.alertBrainDumpModeIsOn();
					return;
				}

				if (evt.key === 'Backspace' || evt.key === 'Delete') {
					// Disable backspace and delete by recovering last snapshot
					this.app.workspace.activeEditor?.editor?.setValue(`${this.lastSnapshot}`)
					this.app.workspace.activeEditor?.editor?.setCursor(Number.MAX_SAFE_INTEGER)
					this.alertBrainDumpModeIsOn();
					return;
				}

				// Save content snapshot every key press
				const lastWord = (evt.key === 'Enter') ? '' : evt.key
				this.lastSnapshot = `${this.app.workspace.activeEditor?.editor?.getValue()}${lastWord}`
			}
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// FIXME: Trigger only when click on editor
			if (this.settings.backspaceDisabled) {
				this.app.workspace.activeEditor?.editor?.setCursor(Number.MAX_SAFE_INTEGER)
				this.alertBrainDumpModeIsOn();
			}
		})

		this.registerInterval(
			window.setInterval(() => {
				if (this.settings.runnerModeEnabled) {
					this.calculateRecentWPT();
				}
			}, 100)
		);

	}

	calculateRecentWPT() {
		const SLIDING_WINDOW = 5000
		const SLIDING_WINDOW_IN_SECONDS = SLIDING_WINDOW / 1000;
		const MULTIIPLE = 60 / SLIDING_WINDOW_IN_SECONDS;
		const sometimeAgo = Date.now() - SLIDING_WINDOW;
		this.wordTimestamps = this.wordTimestamps.filter(timestamp => timestamp > sometimeAgo);
		const wordsInLastSeconds = this.wordTimestamps.length;
		this.statusBarItemEl.setText(`Typing Speed: ${wordsInLastSeconds * MULTIIPLE} TPM`);
	}

	alertBrainDumpModeIsOn() {
		const messages = [
			`Brain Dump Mode is ON 🔥`,
			// `There's no going back. Move FORWARD!`,
			// `You can do this!`,
			// TODO: Get from user
		]

		new Notice(this.randomSelect(messages));
	}

	randomSelect(arr: string[]): string {
		return arr[randomInt(0, arr.length)]
	}

	onunload() {
		// Clean up any resources if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	toggleBrainDumpMode() {
		this.settings.backspaceDisabled = !this.settings.backspaceDisabled;
		this.settings.runnerModeEnabled = !this.settings.runnerModeEnabled;
		this.saveSettings();
		this.updateStatusBar();
		this.displayNotice();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	updateStatusBar() {
		this.statusBarItemEl.setText(`Brain Dump Mode ${this.settings.backspaceDisabled ? '✅' : '❌'}`);
	}

	displayNotice() {
		const status = this.settings.backspaceDisabled ? '✅' : '❌';
		new Notice(`Brain Dump Mode ${status}`);
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
			.setName('Enable brain dump mode')
			.setDesc("If turned on, delete key will be disabled")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.backspaceDisabled)
				.onChange(async (value) => {
					this.plugin.settings.backspaceDisabled = value;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBar();
					this.plugin.displayNotice();
				}
				)
			);

		new Setting(containerEl)
			.setName('Enable runner mode')
			.setDesc("If turned on, runner mode enabled")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.runnerModeEnabled)
				.onChange(async (value) => {
					this.plugin.settings.runnerModeEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBar();
					this.plugin.displayNotice();
				}
				)
			);
	}
}
