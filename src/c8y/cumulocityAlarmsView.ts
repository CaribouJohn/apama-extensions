
import * as vscode from 'vscode';
import axios from 'axios';

export class Alarm extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        private text: string,
        private severity: string      ) {
        super(label, vscode.TreeItemCollapsibleState.None);
      }

      get tooltip(): string {
          return `${this.severity}: ${this.text}`;
      }

      get description(): string {
        return this.id;
      }
}

export class CumulocityAlarmsView implements vscode.TreeDataProvider<Alarm> {

    constructor(private context?: vscode.ExtensionContext) {
        this.registerCommands();
        this.refresh();

        vscode.workspace.onDidChangeConfiguration(async e => {
			if(e.affectsConfiguration('softwareag.c8yAlarms.enabled')) {
				await this.refresh();
			}
		});
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
					const setting: vscode.Uri = vscode.Uri.parse("untitled:" + element.id + ".json" );
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
                
                vscode.commands.registerCommand('extension.c8yAlarms.toggleEnabled', async () => {
					const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8yAlarms');
					config.update("enabled", !config.get("enabled"), true);
				})
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
        let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8yAlarms');
        if(config.get("enabled") === true) {
            try {
                config = vscode.workspace.getConfiguration('softwareag.c8y');
                const url: string = config.get('url',"") + "alarm/alarms?dateFrom=1970-01-01&resolved=false";
    
                const result = await axios.get(url, {
                    auth: {
                        username: config.get("user", ""),
                        password: config.get("password", "")
                    }
                });
    
                const alarms = result.data.alarms;
                for(const alarm of alarms) {
                    this.alarmList.push(new Alarm(
                        alarm.id,
                        //alarm.type, 
                        alarm.text, 
                        alarm.severity,
                        JSON.stringify(alarm, null, 4)
                    ));
                }
    
            } catch (error) {
                // eslint-disable-next-line no-debugger
                debugger;
            }
        }

        this._onDidChangeTreeData.fire(undefined);
    }
}