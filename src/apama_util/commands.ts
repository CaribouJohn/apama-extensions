import { ApamaRunner, ApamaAsyncRunner } from '../apama_util/apamarunner';
import { OutputChannel,ExtensionContext, workspace, commands, window } from 'vscode';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import { ChildProcess, spawn } from 'child_process';
import { Writable } from 'stream';

export class ApamaCommandProvider {
  private injectCmd: ApamaRunner;
  private sendCmd: ApamaRunner;
  private deleteCmd: ApamaRunner;
  private engineWatchCmd: ApamaAsyncRunner;

  public constructor(private logger: OutputChannel, private apamaEnv: ApamaEnvironment,
    private context: ExtensionContext) {
    this.injectCmd = new ApamaRunner("engine_inject", apamaEnv.getInjectCmdline(), logger);
    this.sendCmd = new ApamaRunner("engine_send", apamaEnv.getSendCmdLine(), logger);
    this.deleteCmd = new ApamaRunner("engine_delete", apamaEnv.getDeleteCmdLine(), logger);
    this.engineWatchCmd = new ApamaAsyncRunner("engine_watch", apamaEnv.getEngineWatchCmdline(), logger);
    this.registerCommands();
  }

  registerCommands(): void {

    if (this.context !== undefined) {
      let port: any = workspace.getConfiguration("softwareag.apama").get("debugport");
      this.context.subscriptions.push.apply(this.context.subscriptions,
        [
          //
          // engine_inject command
          //
          commands.registerCommand('extension.apama.engine_inject', (monFile) => {
            if (monFile !== undefined) {
              this.injectCmd.run('.', ['-p', port.toString()].concat(monFile.fsPath))
            }
            // TODO?: add option to specify mon file name to inject in command palette 
          }),
          //
          // engine_send command
          //
          commands.registerCommand('extension.apama.engine_send', async (evtFile?) => {
            // From explorer/context menu 
            if (evtFile !== undefined) {
              // Specify engine_send command WITH evt file 
              this.sendCmd.run('.', ['-p', port.toString()].concat(evtFile.fsPath))
            }
            // Calling engine send from command palette
            else {
              // Display prompt to receive user input
              const userInput = await window.showInputBox({
                value: "\"send_channel\", event_type(event_fields)",
                placeHolder: "Specify event to send"
              });
              if (userInput !== undefined) {
                // Specify engine_send command with NO evt files (but specify port) 
                const childProcess = spawn(this.apamaEnv.getSendCmdLine() + ' -p ' + port.toString(), {
                  shell: true,
                  stdio: ['pipe', 'pipe', 'pipe']
                });
                // When no evt files are specified in engine_send command 
                // the correlator reads user-specified events from stdin 
                // (see 'Sending events to correlatyeah ors' in 'Deploying and Managing Apama Applications' p.169).
                //  => write userInput to stdin of child process:
                await this.streamWrite(childProcess.stdin, userInput + "\n");
                await this.streamEnd(childProcess.stdin);
                await this.onExit(childProcess);
                this.logger.appendLine('engine_send ' + userInput);
              }
            }
          }),
          //
          // engine_delete command
          //
          commands.registerCommand('extension.apama.engine_delete', async () => {
            const userInput = await window.showInputBox({
              value: " [ options ] [ name1 [ name2 ... ] ]",
              placeHolder: "Specify the names of zero or more EPL, JMon, monitors and/or event types to delete from correlator."
            });
            if (userInput !== undefined) {
              this.deleteCmd.run('.', ['-p', port.toString()].concat(userInput));
            }
          }),
          //
          // engine_watch command
          //
          commands.registerCommand('extension.apama.engine_watch', async () => {
            // receive user input
            const userInput = await window.showInputBox({
              value: " -p " + port.toString() + " ",
              placeHolder: "Specify engine_watch options"
            });
            if (userInput !== undefined) {
              const options = userInput.split(' ');
              this.engineWatchCmd.start(options, true, true);
            }
          })
        ]
      );
    }
  }


  dispose() {
    return;
  }

  //https://2ality.com/2018/05/child-process-streams.html
  streamWrite(stream: Writable, chunk: string | Buffer | Uint8Array, encoding = 'utf8'): Promise<void> {
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

  streamEnd(stream: Writable): Promise<void> {
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
      stream.end(callback);
    });
  }

  onExit(childProcess: ChildProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      childProcess.once('exit', (code: number, signal: string) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error('Exit with error code: ' + code));
        }
      });
      childProcess.once('error', (err: Error) => {
        reject(err);
      });
    });
  }

}

