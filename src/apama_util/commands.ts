import { ApamaRunner, ApamaAsyncRunner } from '../apama_util/apamarunner';
import * as vscode from 'vscode';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import { Writable } from 'stream';

export class ApamaCommandProvider{
    private injectCmd: ApamaRunner;
    private sendCmd: ApamaRunner;
    private sendCmdAsync: ApamaAsyncRunner;
    private deleteCmd: ApamaRunner;
    private apamaEnv: ApamaEnvironment;

    public constructor(private logger: vscode.OutputChannel, apamaEnv: ApamaEnvironment, private context: vscode.ExtensionContext) {
        this.injectCmd = new ApamaRunner("engine_inject", apamaEnv.getInjectCmdline(), logger);
        this.sendCmd = new ApamaRunner("engine_send", apamaEnv.getSendCmdLine(), logger);
        this.sendCmdAsync = new ApamaAsyncRunner("engine_send", apamaEnv.getSendCmdLine(), logger);
        this.deleteCmd = new ApamaRunner("engine_delete", apamaEnv.getDeleteCmdLine(), logger);
        this.apamaEnv = apamaEnv;
        this.registerCommands();
    }

    registerCommands(): void {

        if (this.context !== undefined) {
            let port:any = vscode.workspace.getConfiguration("softwareag.apama").get("debugport");
            this.context.subscriptions.push.apply(this.context.subscriptions, 
                [
                //
                // engine_inject command
                //
		        vscode.commands.registerCommand('extension.apama.engine_inject', (monFile) => {
                    this.injectCmd.run('.',['-p', port.toString()].concat(monFile.fsPath))
                }),
                //
                // engine_send command
                //
                vscode.commands.registerCommand('extension.apama.engine_send', async(evtFile?) => {
                    // From explorer/context menu 
                    if(evtFile !== undefined){
                        // Specify engine_send command WITH evt file 
                       this.sendCmd.run('.',['-p', port.toString()].concat(evtFile.fsPath)) 
                    }
                    // Calling engine send from command palette
                    else{
                        // Display prompt to receive user input
                        const userInput = await vscode.window.showInputBox({
						    value: "\"SEND_CHANNEL\", EVENT_TYPE(EVENT_FIELDS)",
						    placeHolder: "Specify event to send"
                        });
						if (userInput !== undefined) {
                            // Specify engine_send command with NO evt files  
                            const child = this.sendCmdAsync.start(['-p',port.toString()], true, true);
                            // When no evt files are specified in engine_send command 
                            // the correlator reads user-specified events from stdin 
                            // (see 'Sending events to correlators' in 'Deploying and Managing Apama Applications' p.169).
                            //  => write userInput to stdin of child process:
                            await this.streamWrite(child.stdin, userInput+"\n");
                            this.logger.appendLine('engine_send '+userInput);
                        }
                    }
                }),
                //
                // engine_delete command
                //
		        vscode.commands.registerCommand('extension.apama.engine_delete', async() => {
                    const userInput = await vscode.window.showInputBox({
                        value: "",
                        placeHolder: "Specify the names of zero or more EPL, JMon, monitors and/or event types to delete from correlator."
                    });
                    if(userInput !== undefined){
                        this.deleteCmd.run('.', ['-p',port.toString()].concat(userInput));
                    }
                })  
                ]
        );
        }
    }

    
	dispose() {
		return;
    }
    
    streamWrite(stream: Writable,chunk: string|Buffer|Uint8Array, encoding='utf8'): Promise<void> {
          return new Promise((resolve, reject) => {
            const errListener = (err: Error) => {
              stream.removeListener('error', errListener);
              reject(err);
            };
            stream.addListener('error', errListener);
            const callback = () => {
              stream.removeListener('error', errListener);
              resolve(undefined);
            };
            stream.write(chunk, encoding, callback);
          });
      }

}

