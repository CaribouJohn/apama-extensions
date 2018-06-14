import {
    DebugSession,
    InitializedEvent
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

		this._runtime.start(args.correlatorPath, args.correlatorArgs);

		this.sendResponse(response);
    }
}