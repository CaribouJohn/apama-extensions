import { EventEmitter } from 'events';
import { execFile } from 'process-promises';

/**
 * A Mock runtime with minimal debugger functionality.
 */
export class CorrelatorRuntime extends EventEmitter {
	constructor() {
		super();
	}

	/**
	 * Start executing the given program.
	 */
	public start(correlatorPath: string, correlatorArgs: string[]) {
        console.log("Starting Correlator");

        execFile(correlatorPath, correlatorArgs)
            .on('process', (process: any) => console.log('Pid: ', process.pid))
            .then(() => {
                console.log("Correlator terminated");
            })
            .catch((e: Error) => {
                console.error("Correlator terminated with error: " + e);
            });
	}
}