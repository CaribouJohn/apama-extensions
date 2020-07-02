import { OutputChannel, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, Uri, RelativePattern, workspace } from 'vscode';
import * as path from 'path';
import { ApamaRunner } from '../apama_util/apamarunner';



export interface ApamaTreeItem {
	logger:OutputChannel;
	label: string;
	fsDir: string;
	items: ApamaTreeItem[];
	contextValue: string;
	instance: boolean;
	ws: WorkspaceFolder;
	apama_project: ApamaRunner;
}

export class ApamaProjectWorkspace extends TreeItem implements ApamaTreeItem {

	constructor(
		public logger:OutputChannel,
		public readonly label: string,
		public readonly fsDir: string,
		public ws: WorkspaceFolder,
		public apama_project: ApamaRunner
    ) {
		super(label, TreeItemCollapsibleState.Collapsed);
	}

	items: ApamaProject[] = [];
    contextValue = 'workspace';
	instance = false;

	//
	// Find all the projects 
	//
	async scanProjects(): Promise<ApamaProject[]> {

		const result: ApamaProject[] = [];

		//find .projects, but exclude anything with _deployed suffix
		//also covers all roots of a multi root workspace
		const projectsPattern: RelativePattern = new RelativePattern( this.ws , "**/.project" );
		const ignorePattern: RelativePattern = new RelativePattern( this.ws , "**/*_deployed/**" );
		const projectNames = await workspace.findFiles( projectsPattern, ignorePattern);
		
		for (let index = 0; index < projectNames.length; index++) {
			const project: Uri = projectNames[index];
			const current: ApamaProject = new ApamaProject(this.logger,
				path.relative(this.ws.uri.fsPath, path.dirname(project.fsPath)),
				path.dirname(project.fsPath),
				this.ws,
				this.apama_project
			);
			result.push(current);
		}
		return result;
	}
}


export class ApamaProject extends TreeItem  implements ApamaTreeItem {
	constructor(
		public logger:OutputChannel,
		public readonly label: string,
		public readonly fsDir: string,
		public ws: WorkspaceFolder,
		public apama_project: ApamaRunner
    ) {
		super(label,TreeItemCollapsibleState.Collapsed);
	}
	items: BundleItem[] = [];
	contextValue = 'project';	
	instance = false;


	//
	// Use apama project tool to populate ApamaProject objects list of Bundles
	//
	async getBundlesFromProject(): Promise<BundleItem[]> {
		const items : BundleItem[] = [];
		const result = await this.apama_project.run(this.fsDir, ['list','bundles']);
		let withinInstalledRegion = false;
		const lines: string[] = result.stdout.split(/\r?\n/);
		let previousBundle: BundleItem;
		lines.forEach((item) => {
			//skipped until "Bundles that have already been added:"
			//Then processes until "Bundles that can be added:"
			//indentation implies bundle and instance
			if (withinInstalledRegion && item.search("Bundles that can be added:") === -1) {
				if( item.length > 0 ) {
					//on the raw string, count the indentation
					let current = item.trimRight();
					let indentation = current.length;
					current = item.trimLeft();
					indentation = indentation - current.length;

					if( indentation === 12) {
						previousBundle.instance = true; //TODO : this is wrong the thing im creating here is an instance...
						previousBundle.items.push(new BundleItem(this.logger, current, this.fsDir,this.ws,this.apama_project));
					} else {
						if( previousBundle !== undefined) {
							items.push( previousBundle );
						}
						//this.logger.appendLine(`Creating : ${current}`);
						previousBundle = new BundleItem(this.logger, current, this.fsDir,this.ws,this.apama_project);
					}

				}
			} else {
				//hacky way to capture the installed bundles.
				if (item.search("Bundles that have already been added:") > -1) {
					withinInstalledRegion = true;
				} else if (item.search("Bundles that can be added:") > -1) {
					//if we have dropped out add the last bundle 
					if( previousBundle !== undefined ){
						//this.logger.appendLine(`Adding : ${previousBundle.label}`);
						items.push( previousBundle );
					}
					withinInstalledRegion = false;
				}
			}
		});
		//this.logger.appendLine(`Bundles Added : ${this.label} => ${items.length}`);
		return items;
	}
}

export class BundleItem extends TreeItem implements ApamaTreeItem {
	constructor(public logger:OutputChannel,
							public readonly label: string,
							public fsDir: string,
							public ws: WorkspaceFolder,
							public apama_project: ApamaRunner) {
		super(label, TreeItemCollapsibleState.Collapsed);
	}
	items: BundleItem[] = [];
	contextValue = 'bundle';
	instance = false;
}
