import {
    DebugSession,
    InitializedEvent,
	OutputEvent,
	TerminatedEvent,
	Breakpoint,
	StoppedEvent,
	Thread,
	StackFrame,
	Source,
	Scope,
	Variable
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { CorrelatorRuntime } from './correlatorRuntime';
import { Uri } from 'vscode';
import { CorrelatorHttpInterface, CorrelatorBreakpoint, CorrelatorPaused } from './correlatorHttpInterface';
import { basename } from 'path';

const MAX_STACK_SIZE = 1000;

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

		if (!response.body) {
			response.body = {};
		}

		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsFunctionBreakpoints = false;
		response.body.exceptionBreakpointFilters = [
			{
				label: "Uncaught Exceptions",
				filter: 'uncaught',
				default: true
			}
		];

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
		this.correlatorHttp.getContextStatuses()
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
			.then(correlatorStackFrames => correlatorStackFrames.stackframes.map((stackframe, i) => new StackFrame(this.createFrameId(correlatorStackFrames.contextid, i), stackframe.action, this.createSource(stackframe.filename), stackframe.lineno)))
			.then(stackFrames => {
				response.body = {
					stackFrames
				};
				this.sendResponse(response);
			});
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		console.log("Scopes requested");
		response.body = {
			scopes: [
				new Scope("Local", this.createVariablesRef(args.frameId, 'local')),
				new Scope("Monitor", this.createVariablesRef(args.frameId, 'monitor'))
			] 
		}
		this.sendResponse(response);		
	}

    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		console.log("Variables requested");
		const { contextid, frameidx, type } = this.parseVariablesRef(args.variablesReference);

		this.getVariablesForType(type, contextid, frameidx)
			.then(locals => locals
				.filter(local => local.value !== '<uninitialized>')
				.filter(local => !local.name.startsWith("::"))
				// Can end up with duplicate names for variables when locals hide variables in other scopes (which is super annoying), so we number them.
				.map((local, i, locals) => {
					const count = locals.slice(0, i + 1).filter(otherLocal => otherLocal.name === local.name).length;
					if (count > 1) {
						local.name = `${local.name}#${count}`;
					}
					return local;
				})
			)
			.then(locals => locals.map(local => new Variable(local.name, local.value)))
			.then(variables => {
				response.body = {
					variables
				}
				this.sendResponse(response);
			});
	}

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		console.log("Continue requested");
		this.correlatorHttp.resume()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		console.log("Next requested");
		this.correlatorHttp.stepOver()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		console.log("Step In requested");
		this.correlatorHttp.stepIn()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		console.log("Step Out requested");
		this.correlatorHttp.stepOut()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

    protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments): void {
		console.log("Exception breakpoint requested");
		const breakOnUncaught = args.filters.indexOf('uncaught') !== -1;
		this.correlatorHttp.setBreakOnErrors(breakOnUncaught)
			.then(() => this.sendResponse(response));
	}

	private waitForCorrelatorPause() {
		this.correlatorHttp.awaitPause()
			.then(paused => this.sendEvent(new StoppedEvent(paused.reason, paused.contextid)));
	}

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), normalizeCorrelatorFilePath(filePath), undefined, undefined, 'hello');
	}

	private createFrameId(contextId: number, frameidx: number): number {
		return contextId * MAX_STACK_SIZE + frameidx;
	}

	private parseFrameId(frameid: number): { contextid: number, frameidx: number} {
		const frameidx = frameid % MAX_STACK_SIZE;
		const contextid = (frameid - frameidx) / MAX_STACK_SIZE;
		return {
			contextid,
			frameidx
		}
	}

	private createVariablesRef(frameId: number, variableType: 'monitor' | 'local'): number {
		return frameId * 10 + (variableType === 'monitor' ? 1 : 0);
	}

	private parseVariablesRef(variablesRef: number): { type: 'monitor' | 'local', contextid: number, frameidx: number } {
		const typeNumber = variablesRef % 10;
		const type = typeNumber === 1 ? 'monitor' : 'local';
		const { contextid, frameidx } = this.parseFrameId((variablesRef - typeNumber) / 10);
		return {
			type,
			contextid,
			frameidx
		};
	}

	private getVariablesForType(type: 'monitor' | 'local', contextid: number, frameidx: number) {
		if (type === 'monitor') {
			return this.correlatorHttp.getContextStatuses()
				.then(contextStatuses => contextStatuses.find(contextStatus => contextStatus.contextid === contextid))
				.then(possiblePause => {
					if (!possiblePause) { 
						throw Error("Trying to read variables from non existent context: " + contextid);
				   	} 
					if (!possiblePause.paused) { 
						 throw Error("Trying to read variables from unpaused context: " + contextid);
					} 
					return possiblePause as CorrelatorPaused; 
				})
				.then(pause => this.correlatorHttp.getMonitorVariables(contextid, pause.instance));
		} else {
			return this.correlatorHttp.getLocalVariables(contextid, frameidx);
		}
	}
}

export function normalizeCorrelatorFilePath(filePath: string): string {
	return Uri.parse(filePath).fsPath;
}