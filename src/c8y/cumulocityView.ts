import { window, commands, Disposable, workspace, OutputChannel, TreeDataProvider, EventEmitter, Event, TreeView, FileSystemWatcher, ExtensionContext, QuickPickItem, TextDocument, Uri, TreeItemCollapsibleState, TreeItem, WorkspaceFolder, RelativePattern, WorkspaceConfiguration } from 'vscode';
import { ApamaProject, ApamaProjectWorkspace, ApamaTreeItem, BundleItem } from '../apama_project/apamaProject';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import {Client, BasicAuth} from '@c8y/client';



export class cumulocityView implements TreeDataProvider<string> {
	private _onDidChangeTreeData: EventEmitter<string | undefined> = new EventEmitter<string | undefined>();
	readonly onDidChangeTreeData: Event<string | undefined> = this._onDidChangeTreeData.event;

	private treeView: TreeView<{}>;

	//
	// Added facilities for multiple workspaces - this will hopefully allow 
	// ssh remote etc to work better later on, plus allows some extra organisational
	// facilities....
	constructor(private apamaEnv: ApamaEnvironment, private logger: OutputChannel, private context?: ExtensionContext) {
		let subscriptions: Disposable[] = [];
		
		//project commands 
		this.registerCommands();

		//the component
		this.treeView = window.createTreeView('c8y', { treeDataProvider: this });
	}
	processResponse(resp:any): void {
		this.logger.appendLine("Status:" + resp.res.status + " " + resp.res.statusText);
	}

	processError(resp:any): void {

		if( 'res' in resp )
		{
			this.logger.appendLine("Status:" + resp.res.status + " " + resp.res.statusText);
		}
		else
		{
			this.logger.appendLine("Status: Error " + resp.message);
		}
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// Create project 
				//
				commands.registerCommand('extension.c8y.login', async () => {
					let config:WorkspaceConfiguration = workspace.getConfiguration('softwareag.c8y');

					if( config ) {
						let tenant:string = config.get('tenant',"");
						let user:string = config.get('user',"");
						//let userpw:string = config.get('password',"IfAtFirstYouDon'tSucceed2");
						let password:string = "IfAtFirstYouDon'tSucceed2";
						let baseurl:any = config.get('url',"");
						this.logger.appendLine("Logging into c8y");

						let x = new BasicAuth({
							tenant,
							user,
							password
						});

						let client = new Client(x,baseurl);

						try {
							let y = await client.inventory.list();
							let z = y.data;
						}
						catch (err) {
							debugger;
						}
							
				}}),

			]);
		}
	}

	//
	// Trigger refresh of the tree
	//
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	//
	// get the children of the current item (group or item)
	// made this async so we can avoid race conditions on updates
	//
	async getChildren(item?: string | undefined): Promise<undefined | string[] > {

		//if this is a bundle - then there are no children
		return [];
	}



	//
	// interface requirement
	//
	getTreeItem(element: BundleItem | ApamaProject | string): TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			this.logger.appendLine("ERROR ???? getTreeItem -- " + element.toString());
			return new TreeItem(element, TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
		return <TreeItem>element;
	}
}


