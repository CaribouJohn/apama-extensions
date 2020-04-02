import * as vscode from 'vscode';
import { ApamaProject, ApamaProjectWorkspace, ApamaTreeItem, BundleItem } from '../apama_project/apamaProject';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import {Client, BasicAuth} from '@c8y/client';



export class cumulocityView implements vscode.TreeDataProvider<string> {
	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	private treeView: vscode.TreeView<{}>;

	//
	// Added facilities for multiple workspaces - this will hopefully allow 
	// ssh remote etc to work better later on, plus allows some extra organisational
	// facilities....
	constructor(private apamaEnv: ApamaEnvironment, private logger: vscode.OutputChannel, private context?: vscode.ExtensionContext) {
		let subscriptions: vscode.Disposable[] = [];
		
		//project commands 
		this.registerCommands();

		//the component
		this.treeView = vscode.window.createTreeView('c8y', { treeDataProvider: this });
	}
	processResponse(resp: any): void {
		this.logger.appendLine("Status:" + resp.res.status + " " + resp.res.statusText);
	}

	processError(resp:any): void {
		if('res' in resp){
			this.logger.appendLine("Status:" + resp.res.status + " " + resp.res.statusText);
		} else {
			this.logger.appendLine("Status: Error " + resp.message);
		}
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// inventory
				//
				vscode.commands.registerCommand('extension.c8y.login', async () => {
					let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8y');

					if( config ) {
						let tenant:string = config.get('tenant',"");
						let user:string = config.get('user',"");
						let password:string = config.get('password',"");
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
							
					}
				}),
				
				vscode.commands.registerCommand('extension.c8y.upload_epl_app', async () => {
					vscode.window.showInformationMessage("Not yet implemented!");
				}),
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
	getTreeItem(element: BundleItem | ApamaProject | string): vscode.TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			this.logger.appendLine("ERROR ???? getTreeItem -- " + element.toString());
			return new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
		return <vscode.TreeItem>element;
	}
}
