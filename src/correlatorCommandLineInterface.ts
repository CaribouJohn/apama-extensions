import { spawn, ChildProcess, execFileSync } from 'child_process';
import * as vscode from 'vscode';

export interface CorrelatorConfig {
    host: string;
    port: number;
    args: string[];
}

export class CorrelatorCommandLineInterface {
    correlatorProcess?: ChildProcess;
    stdoutChannel?: vscode.OutputChannel;

    constructor(private apamaHome: string, private config: CorrelatorConfig) {}

	/**
	 * Start the correlator
	 */
	public start(): ChildProcess {
        if (this.correlatorProcess && !this.correlatorProcess.killed) {
            console.log("Correlator already started, stopping...");
            this.correlatorProcess.kill('SIGKILL');
        }

        console.log("Starting Correlator");

        this.stdoutChannel = vscode.window.createOutputChannel('Apama Correlator');
        this.stdoutChannel.show();

        this.correlatorProcess = spawn(this.apamaHome + '/bin/correlator', ["-p", this.config.port.toString()].concat(this.config.args), {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        console.log("Correlator started, PID:" + this.correlatorProcess.pid);
        this.correlatorProcess.once('exit', (exitCode) => console.log("Correlator stopped, exit code: " + exitCode));

        this.correlatorProcess.stdout.setEncoding('utf8');
        this.correlatorProcess.stdout.on('data', (data: string) => {
            if (this.stdoutChannel) {
                this.stdoutChannel.append(data);
            }
        });

        return this.correlatorProcess;
    }

    /**
     * Inject files into the correlator
     */
    public injectFiles(files: string[]) {
        execFileSync(this.apamaHome + '/bin/engine_inject', files);
    }

    /**
	 * Stop the correlator
	 */
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.correlatorProcess && !this.correlatorProcess.killed) {
                this.correlatorProcess.once('exit', () => {
                    if (this.stdoutChannel) {
                        this.stdoutChannel.dispose();
                    }
                    resolve();
                });
                
                console.log("Correlator stopping...");
                this.correlatorProcess.kill();
                const attemptedToKill = this.correlatorProcess;
                setTimeout(() => {
                    if (!attemptedToKill.killed) {
                        console.log("Failed to stop correlator in 5 seconds, killing...");
                        attemptedToKill.kill('SIGKILL');
                    }
                }, 5000);
            } else {
                resolve();
            }
        });
    }
}