import { VersionedTextDocumentIdentifier } from "vscode-languageclient";

import * as vscode from 'vscode';
import axios from 'axios';

export class Alarm extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private type: string,
        private text: string,
        private severity: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
      ) {
        super(label, collapsibleState);
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
        try {
            let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8y');
            let url: string = config.get('url',"") + "alarm/alarms?dateFrom=1970-01-01";

            const result = await axios.get(url, {
                auth: {
                    username: config.get("user", ""),
                    password: config.get("password", "")
                }
            });

            const alarms = result.data.alarms;
            for(let alarm of alarms) {
                this.alarmList.push(new Alarm(
                    alarm.type, 
                    alarm.type, 
                    alarm.text, 
                    alarm.severity,
                    vscode.TreeItemCollapsibleState.Collapsed));
            }

        } catch (error) {
            debugger;
        }

        this._onDidChangeTreeData.fire(undefined);
    }
}