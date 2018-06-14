import {
    DebugSession,
    InitializedEvent,
	OutputEvent,
	TerminatedEvent
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { CorrelatorRuntime } from './correlatorRuntime';

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** Path to Apama Home directory. */
    apamaHome: string;
    /** Path to correlator executable. */
    correlatorPath: string;
    /** Argument list to provide to the correlator at startup */
    correlatorArgs: string[];
}

export class CorrelatorDebugSession extends DebugSession {
	private _runtime: CorrelatorRuntime;

	public constructor() {
		super();

		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this._runtime = new CorrelatorRuntime();
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        console.log("Initialize called");

		this.sendEvent(new InitializedEvent());

		this.sendResponse(response);
	}

    /**
     * Frontend requested that the application be launched
     */
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
        console.log("Launch requested");

		const correlatorProcess = this._runtime.start(args.correlatorPath, []/*args.correlatorArgs*/);

        correlatorProcess.stdout.setEncoding('utf8');
        correlatorProcess.stderr.setEncoding('utf8');
		correlatorProcess.stdout.on('data', (data: string) => this.sendEvent(new OutputEvent(data, 'stdout')));
        correlatorProcess.stderr.on('data', (data: string) => this.sendEvent(new OutputEvent(data, 'stderr')));
        correlatorProcess.once('close', (exitCode) => {
			this.sendEvent(new OutputEvent("Correlator terminated with exit code: " + exitCode, 'console'));
			this.sendEvent(new TerminatedEvent());
        });

		this.sendResponse(response);
	}
	
	/**
	 * Frontend requested that the application terminate
	 */
	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		console.log("Stop requested");
		
		this._runtime.stop(() => {
			this.sendResponse(response);
		});
	}
}