import { VersionedTextDocumentIdentifier } from "vscode-languageclient";

import * as vscode from 'vscode';
import axios from 'axios';

export class Alarm extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        private type: string,
        private text: string,
        private severity: string,
        private contents: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
      ) {
        super(label, collapsibleState);
      }

      get tooltip(): string {
          return `${this.severity}: ${this.text}`;
      }

      get description(): string {
        return this.id;
      }
}

export class CumulocityAlarmsView implements vscode.TreeDataProvider<Alarm> {
    private treeView: vscode.TreeView<{}>;

    constructor(private logger: vscode.OutputChannel, private context?: vscode.ExtensionContext) {
        this.registerCommands();
        this.refresh();
        this.treeView = vscode.window.createTreeView('c8yAlarms', { treeDataProvider: this });
    }
    
    private _onDidChangeTreeData: vscode.EventEmitter<Alarm | undefined> = new vscode.EventEmitter<Alarm | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Alarm | undefined> = this._onDidChangeTreeData.event;
    private alarmList: Alarm[] = [];

    registerCommands(): void {
        if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [
                vscode.commands.registerCommand('extension.c8yAlarms.refresh', async () => {
					await this.refresh();
                }),

				vscode.commands.registerCommand('extension.c8yAlarms.openAlarm', async (element) => {
					let setting: vscode.Uri = vscode.Uri.parse("untitled:" + element.id + ".json" );
					vscode.workspace.openTextDocument(setting)
						.then(doc => {
							vscode.window.showTextDocument(doc)
								.then(e => {
									e.edit(edit => {
                                        edit.insert(new vscode.Position(0, 0), element.contents);
								});
						});
					});
				}),
            ]);
        }
    }

    getTreeItem(element: Alarm): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: Alarm): Promise<undefined | Alarm[]> {
        if(!element) {
            return this.alarmList;
        }
    }

    async refresh(): Promise<void> {
        this.alarmList = [];
        try {
            let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8y');
            let url: string = config.get('url',"") + "alarm/alarms?dateFrom=1970-01-01&resolved=false";

            const result = await axios.get(url, {
                auth: {
                    username: config.get("user", ""),
                    password: config.get("password", "")
                }
            });

            const alarms = result.data.alarms;
            for(let alarm of alarms) {
                this.alarmList.push(new Alarm(
                    alarm.id,
                    alarm.type, 
                    alarm.type, 
                    alarm.text, 
                    alarm.severity,
                    JSON.stringify(alarm, null, 4),
                    vscode.TreeItemCollapsibleState.None
                ));
            }

        } catch (error) {
            debugger;
        }

        this._onDidChangeTreeData.fire(undefined);
    }
}