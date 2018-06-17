import {
    DebugSession,
    InitializedEvent,
	OutputEvent,
	TerminatedEvent,
	Breakpoint,
	StoppedEvent,
	Thread,
	StackFrame,
	Source
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { CorrelatorRuntime } from './correlatorRuntime';
import { Uri } from 'vscode';
import { CorrelatorHttpInterface, CorrelatorBreakpoint } from './correlatorHttpInterface';
import { basename } from 'path';

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** Path to Apama Home directory. */
    apamaHome: string;
    /** Argument list to provide to the correlator at startup */
	correlatorArgs: string[];
	/** List of files to inject ionto the correlator */
	injectionList: string[];
}

/**
 * Handles debug requests from the frontend
 * Order of events received:
 * - Initialize
 * - Launch
 * (After Initialized sent back to client)
 * - SetBreakpoint (Zero or more)
 * - ConfigurationDone
 */
export class CorrelatorDebugSession extends DebugSession {
	private _runtime: CorrelatorRuntime;
	private correlatorHttp: CorrelatorHttpInterface;

	public constructor() {
		super();
		this._runtime = new CorrelatorRuntime();
		
		this.correlatorHttp = new CorrelatorHttpInterface('http://localhost', 15903);
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        console.log("Initialize called");

		response.body = {
			supportsConfigurationDoneRequest: true,
			supportsFunctionBreakpoints: false
		};

		this.sendResponse(response);
	}

    /**
     * Frontend requested that the application be launched
     */
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
        console.log("Launch requested");

		const correlatorProcess = this._runtime.start(args.apamaHome, args.correlatorArgs);

        correlatorProcess.stderr.setEncoding('utf8');
        correlatorProcess.stderr.on('data', (data: string) => this.sendEvent(new OutputEvent(data, 'stderr')));
        correlatorProcess.once('exit', (exitCode) => {
			this.sendEvent(new OutputEvent("Correlator terminated with exit code: " + exitCode, 'console'));
			this.sendEvent(new TerminatedEvent());
        });

		this.correlatorHttp.enableDebugging()
			.then(() => this.correlatorHttp.pause()) // Pause correlator while we wait for the configuration to finish, we want breakpoints to be set first
			.then(() => this._runtime.injectFiles(args.apamaHome, args.injectionList))
			.then(() => this.sendEvent(new InitializedEvent())) // We're ready to start recieving breakpoints
			.then(() => this.sendResponse(response));
	}

    /**
     * Frontend requested that breakpoints be set
     */
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		console.log('Breakpoints requested');
		// TODO: It'll probably set the breakpoints twice in a file if a new breakpoint is added while running - so we should fix that
		if (args.source.path) {
			const filePath = normalizeCorrelatorFilePath(args.source.path);

			// Attempt to set all of the breakpoints
			const breakpointIds = (args.lines || [])
				.map(lineNumber => this.correlatorHttp.setBreakpoint(filePath, lineNumber).catch((e) => null));
			Promise.all(breakpointIds)
				// Ask the correlator which breakpoints have been set
				.then(breakpointIds => {
					return this.correlatorHttp.getAllSetBreakpoints()
						.then(setBreakpoints => setBreakpoints.reduce((acc, breakpoint) => {
								acc[breakpoint.id] = breakpoint;
								return acc;
							}, {} as { [key: string]: CorrelatorBreakpoint }))
						.then(setBreakpointsById => ({ setBreakpointsById, breakpointIds }));
				})
				// Compare the attempted and the actually set to determine whether they've actually been set (and on which line)
				.then(({setBreakpointsById, breakpointIds}) => {
					response.body = {
						breakpoints: breakpointIds.map(id => {
							if (id && setBreakpointsById[id]) {
								// Successful breakpoint
								return new Breakpoint(true, setBreakpointsById[id].line);
							} else {
								// Breakpoint failed to be set
								return new Breakpoint(false);
							}
						})
					};
					// Send the response with the list of breakpoints
					this.sendResponse(response);
				})
				.catch(() => {
					debugger;
				});
		} else {
			console.error("Unable to set breakpoints, no file path provided");
			this.sendResponse(response);
		}
	}

	/**
	 * Indication that the frontend is done setting breakpoints etc
	 */
    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		console.log('Configuration done');
		this.correlatorHttp.resume()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}
	
	/**
	 * Frontend requested that the application terminate
	 */
	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		console.log("Stop requested");
		this._runtime.stop().then(() => this.sendResponse(response));
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		console.log("Threads requested");
		this.correlatorHttp.getContextStatus()
			.then(contextStatuses => contextStatuses.map(status => new Thread(status.contextid, status.context)))
			.then(threads => {
				response.body = {
					threads
				};
				this.sendResponse(response);
			});		
	}

	/**
	 * Frontend requested stacktrace
	 */
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		console.log("Stacktrace requested");
		this.correlatorHttp.getStackTrace(args.threadId)
			.catch((e) => {debugger; throw e;})
			.then(correlatorStackFrames => correlatorStackFrames.stackframes.map((stackframe, i) => new StackFrame(correlatorStackFrames.contextid * 1000 + i, stackframe.action, this.createSource(stackframe.filename), stackframe.lineno)))
			.then(stackFrames => {
				response.body = {
					stackFrames
				};
				this.sendResponse(response);
			});
	}

    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		console.log("Variables requested");
		this.sendResponse(response);
	}

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		console.log("Continue requested");
		this.correlatorHttp.resume()
			.then(() => this.sendResponse(response));
	}

	private waitForCorrelatorPause() {
		this.correlatorHttp.awaitPause()
			.then(paused => this.sendEvent(new StoppedEvent(paused.reason, paused.contextid)));
	}

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), normalizeCorrelatorFilePath(filePath), undefined, undefined, 'hello');
	}
}

export function normalizeCorrelatorFilePath(filePath: string): string {
	return Uri.parse(filePath).fsPath;
}