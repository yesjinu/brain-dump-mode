import { randomInt } from 'crypto';
import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface BrainDumpSettings {
	isEnabled: boolean;
}

const DEFAULT_SETTINGS: BrainDumpSettings = {
	isEnabled: false
}

export default class BrainDumpMode extends Plugin {
	settings: BrainDumpSettings;
	statusBarItemEl: HTMLElement;
	lastContent: string | undefined = undefined;

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

		/**
		 * [HOW IT WORKS]
		 * Everytime normal keydown event is detected, whole editor content will be saved in `lastContent` variable.
		 * If 'Backspace' or 'Delete' event is detected, the saved `lastContent` will be replace the whole content so that nothing seems deleted.
		 */
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (this.settings.isEnabled) {
				if (evt.key === 'ArrowLeft' || evt.key === 'ArrowUp') {
					this.app.workspace.activeEditor?.editor?.setCursor(Number.MAX_SAFE_INTEGER)
					evt.preventDefault();
					this.alertBrainDumpModeIsOn();
					return;
				}
				
				if (evt.key === 'Backspace' || evt.key === 'Delete') {
					this.app.workspace.activeEditor?.editor?.setValue(`${this.lastContent}`)
					this.app.workspace.activeEditor?.editor?.setCursor(Number.MAX_SAFE_INTEGER)
					evt.preventDefault();
					this.alertBrainDumpModeIsOn();
					return;
				}
				
				const lastWord = (evt.key === 'Enter') ? '' : evt.key
				this.lastContent = `${this.app.workspace.activeEditor?.editor?.getValue()}${lastWord}`
			}
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (this.settings.isEnabled) {
				this.app.workspace.activeEditor?.editor?.setCursor(Number.MAX_SAFE_INTEGER)
				this.alertBrainDumpModeIsOn();
			}
		})

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
		this.settings.isEnabled = !this.settings.isEnabled;
		this.saveSettings();
		this.updateStatusBar();
		this.displayNotice();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	updateStatusBar() {
		this.statusBarItemEl.setText(`Brain Dump Mode ${this.settings.isEnabled ? '✅' : '❌'}`);
	}

	displayNotice() {
		const status = this.settings.isEnabled ? '✅' : '❌';
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
			.setName('Enable Brain Dump Mode')
			.setDesc("If turned on, delete key will be disabled")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBar();
					this.plugin.displayNotice();
				}
				)
			);
	}
}
