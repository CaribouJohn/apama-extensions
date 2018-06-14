import { spawn, ChildProcess } from 'child_process';

/**
 * A Mock runtime with minimal debugger functionality.
 */
export class CorrelatorRuntime {
    correlatorProcess?: ChildProcess;

	/**
	 * Start executing the given program.
	 */
	public start(correlatorPath: string, correlatorArgs: string[]): ChildProcess {
        if (this.correlatorProcess && !this.correlatorProcess.killed) {
            console.log("Correlator already started, stopping...");
            this.correlatorProcess.kill('SIGKILL');
        }

        console.log("Starting Correlator");

        this.correlatorProcess = spawn(correlatorPath, correlatorArgs, {
            //cwd: process.cwd(),
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        console.log("Correlator started, PID:" + this.correlatorProcess.pid);
        this.correlatorProcess.once('close', (exitCode) => console.log("Correlator stopped, exit code: " + exitCode));

        return this.correlatorProcess;
    }

    public stop(onStop?: Function) {
        if (this.correlatorProcess && !this.correlatorProcess.killed) {
            if (onStop) {
                this.correlatorProcess.once('close', () => onStop());
            }
            
            console.log("Correlator stopping...");
            this.correlatorProcess.kill();
            const attemptedToKill = this.correlatorProcess;
            setTimeout(() => {
                if (!attemptedToKill.killed) {
                    console.log("Failed to stop correlator in 5 seconds, killing...");
                    attemptedToKill.kill('SIGKILL');
                }
            }, 5000);
        } else if (onStop) {
            onStop();
        }
    }
}