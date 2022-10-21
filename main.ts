import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	Vault
} from 'obsidian';

interface ObsidianPrintWithIncludesPluginSettings {
	fileExtension: string;
	outputPrefix: string;
	cleanupNewlines: boolean;
}

const DEFAULT_SETTINGS: ObsidianPrintWithIncludesPluginSettings = {
	fileExtension: '.md',
	outputPrefix: 'P_W_I_',
	cleanupNewlines: true,
}

export default class ObsidianPrintWithIncludesPlugin extends Plugin {
	settings: ObsidianPrintWithIncludesPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PrintWithIncludesPluginSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item
						.setTitle("Print this file with includes 👈")
						.setIcon("document")
						.onClick(async () => {
							// TODO: add test for markdown file
							if (file instanceof TFile) {
								let result = new PrintWithIncludesResult(this.settings.cleanupNewlines);
								await new FilePrintWithIncludes(file, this.app.vault, result, this.settings.fileExtension)
									.run();
								// TODO: make output path configurable
								let path = file.parent.path + "/" + this.settings.outputPrefix + file.name;
								result.print(path, this.app.vault);
							}
						});
				});
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FilePrintWithIncludes {
	file: TFile;
	folder: TFolder;
	vault: Vault;
	result: PrintWithIncludesResult;
	fileExtension: string;

	constructor(file: TFile, vault: Vault, result: PrintWithIncludesResult, fileExtension: string) {
		this.file = file;
		this.folder = file.parent;
		this.vault = vault;
		this.result = result;
		this.fileExtension = fileExtension;
	}

	async run(): Promise<void> {
		const content = await this.readContentWithoutFrontMatter(this.file);
		for (let line of content) {
			if (line.startsWith("#") && line.includes("[[") && line.includes("]]") && line.includes("|")) {
				await this.parseInclude(line);
			} else {
				this.result.addLine(line);
			}
		}
	}

	async parseInclude(value: string) : Promise<void> {
		let head = /^(#+)*/.exec(value);
		if (!head || head.length != 2) {
			console.log("Error: cannot parse header level");
			return;
		}
		let link = /\[\[([^\|]*)\|(.*)\]\]/.exec(value);
		if (!link || link.length != 3) {
			console.log("Error: cannot parse link :-(")
			return;
		}
		let result = head[1] + " " + link[2];
		this.result.addLine(result);
		this.result.addLine("");
		await this.include(link[1]);
	}

	async include(path: string) : Promise<void> {
		console.log("include", path);
		const file = this.vault.getAbstractFileByPath(path + this.fileExtension);
		if (file instanceof TFile) {
			await new FilePrintWithIncludes(file, this.vault, this.result, this.fileExtension)
				.run();
		}
	}

	async readContent(file: TFile) : Promise<string[]> {
		console.log('readContent', this.file.path);
		const content = await this.vault.cachedRead(file);
		const lines = content.split("\n");
		return lines;
	}

	async readContentWithoutFrontMatter(file: TFile) : Promise<string[]> {
		console.log('readContentWithoutFrontMatter', this.file.path);
		let lines = await this.readContent(file);
		let frontMatterCache = app.metadataCache.getFileCache(file)?.frontmatter;
		if (frontMatterCache) {
			let end = frontMatterCache.position.end.line + 1
			lines = lines.slice(end)
		}
		return lines;
	}
}

class PrintWithIncludesResult {
	lines: string[] = []
	cleanupNewlines: boolean;

	constructor(cleanupNewlines: boolean) {
		this.cleanupNewlines = cleanupNewlines;
	}

	addLine(line: string) : void {
		console.log(line);
		this.lines.push(line);
	}

	print(path: string, vault: Vault) : void {
		console.log("print", path);
		let content = this.lines.join("\n");
		if (this.cleanupNewlines) {
			content = content.replace(/\n{2,}/g,"\n\n");
		}
		vault.create(path, content);
	}
}

class PrintWithIncludesPluginSettingTab extends PluginSettingTab {
	plugin: ObsidianPrintWithIncludesPlugin;

	constructor(app: App, plugin: ObsidianPrintWithIncludesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Print With Includes plugin.'});

		new Setting(containerEl)
			.setName("File extension")
			.setDesc("File extension used for Markdown files (for including, output...).")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.fileExtension)
					.setValue(this.plugin.settings.fileExtension)
					.onChange(async (value) => {
						this.plugin.settings.fileExtension = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Output file prefix")
			.setDesc("The prefix used for the output file.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.outputPrefix)
					.setValue(this.plugin.settings.outputPrefix)
					.onChange(async (value) => {
						this.plugin.settings.outputPrefix = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Cleanup newlines")
			.setDesc("Check this to clean up unnecessary multiple newlines in Markdown output.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.cleanupNewlines)
					.onChange(async (value) => {
						this.plugin.settings.cleanupNewlines = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
