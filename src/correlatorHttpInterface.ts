import * as requestPromise from 'request-promise-native';
import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';
import { ETIMEDOUT } from 'constants';

export interface CorrelatorBreakpoint {
    filename: string;
    filehash: string;
    action: string;
    owner: string;
    line: number;
    id: string;
    breakonce: boolean;
}

export interface CorrelatorContextState {
    context: string;
    contextid: number;
    paused: boolean;
}

export interface CorrelatorPaused extends CorrelatorContextState {
    owner: string;
    type: string;
    action: string;
    instance: string;
    monitor: string;
    filename: string;
    filehash: string;
    reason: string;
    line: number;
}

export interface CorrelatorStackFrame {
    owner: string;
    type: string;
    action: string;
    lineno: number;
    filename: string;
    filehash: string;
}

export interface CorrelatorStackTrace {
    contextid: number;
    monitor: string;
    stackframes: CorrelatorStackFrame[];
}

export class CorrelatorHttpInterface {
    constructor(private host: string, private port: number) {}

    /** Sets a breakpoint and returns the id of the breakpoint. Throws an exception on error or failure. */
    public async setBreakpoint(filepath: string, line: number): Promise<string> {
        const body = '<map name="apama-request">' +
            `<prop name="filename">${filepath}</prop>` +
            `<prop name="line">${line}</prop>` +
            '<prop name="breakonce">true</prop>' +
        '</map>';

        return requestPromise.put(`${this.host}:${this.port}/correlator/debug/breakpoint/location`, { body })
            .then(response => new DOMParser().parseFromString(response, 'text/xml'))
            .then(dom => xpath.select1('string(/map[@name="apama-response"]/list[@name="ids"]/prop[@name="id"]//text())', dom));
    }

    public async getAllSetBreakpoints(): Promise<CorrelatorBreakpoint[]> {
        return requestPromise.get(`${this.host}:${this.port}/correlator/debug/breakpoint`)
            .then(response => new DOMParser().parseFromString(response, 'text/xml'))
            .then(dom => xpath.select('/map[@name="apama-response"]/list[@name="breakpoints"]/map[@name="filebreakpoint"]', dom))
            // Have to convert the found breakpointNodes back to a string and then back to dom because this xpath implementation only finds from root node
            .then(breakpointNodes => breakpointNodes.map(breakpointNode => breakpointNode.toString()))
            .then(bpStrings => bpStrings.map(bpString => new DOMParser().parseFromString(bpString, 'text/xml')))
            .then(breakpointDoms => breakpointDoms.map((breakpointDom) => ({
                    filename: xpath.select1('string(/map/prop[@name="filename"])', breakpointDom),
                    filehash: xpath.select1('string(/map/prop[@name="filehash"])', breakpointDom),
                    action: xpath.select1('string(/map/prop[@name="action"])', breakpointDom),
                    owner: xpath.select1('string(/map/prop[@name="owner"])', breakpointDom),
                    line: parseInt(xpath.select1('string(/map/prop[@name="line"])', breakpointDom)),
                    id: xpath.select1('string(/map/prop[@name="id"])', breakpointDom),
                    breakonce: xpath.select1('string(/map/prop[@name="breakonce"])', breakpointDom) === 'true'
                })
            ));
    }

    public async enableDebugging(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return requestPromise.put(`${this.host}:${this.port}/correlator/debug/state`, { body });
    }

    public async pause(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return requestPromise.put(`${this.host}:${this.port}/correlator/debug/progress/stop`, { body });
    }

    public async resume(): Promise<void> {
        const body = '<map name="apama-request"></map>';
        return requestPromise.put(`${this.host}:${this.port}/correlator/debug/progress/run`, { body });
    }

    public async awaitPause(): Promise<CorrelatorPaused> {
        return requestPromise.get(`${this.host}:${this.port}/correlator/debug/progress/wait`)
            .catch(e => {
                // If the await timed out (but not during connection) then just recreate it
                if (e.code === ETIMEDOUT && !e.connect) {
                    return this.awaitPause();
                } else {
                    throw e;
                }
            })
            .then(response => new DOMParser().parseFromString(response, 'text/xml'))
            .then(dom => ({
                context: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="context"]//text())', dom),
                contextid: parseInt(xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="contextid"]//text())', dom)),
                paused: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="paused"]//text())', dom) === 'true',
                owner: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="owner"]//text())', dom),
                type: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="type"]//text())', dom),
                action: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="action"]//text())', dom),
                instance: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="instance"]//text())', dom),
                monitor: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="monitor"]//text())', dom),
                filename: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="filename"]//text())', dom),
                filehash: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="filehash"]//text())', dom),
                reason: xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="reason"]//text())', dom),
                line: parseInt(xpath.select1('string(/map[@name="apama-response"]/map[@name="contextprogress"]/prop[@name="context"]//text())', dom))
            }));
    }

    public async getContextStatus(): Promise<CorrelatorContextState[]> {
        return requestPromise.get(`${this.host}:${this.port}/correlator/debug/progress`)
            .then(response => new DOMParser().parseFromString(response, 'text/xml'))
            .then(dom => xpath.select('/map[@name="apama-response"]/list[@name="progress"]/map[@name="contextprogress"]', dom))
            // Have to convert back to a string and then back to dom because this xpath implementation only finds from root node
            .then(contextStatusNodes => contextStatusNodes.map(contextStatusNode => contextStatusNode.toString()))
            .then(contextStatusStrings => contextStatusStrings.map(contextStatusString => new DOMParser().parseFromString(contextStatusString, 'text/xml')))
            .then(doms => doms.map(dom => ({
                    context: xpath.select1('string(/map/prop[@name="context"]//text())', dom),
                    contextid: parseInt(xpath.select1('string(/map/prop[@name="contextid"]//text())', dom)),
                    paused: xpath.select1('string(/map/prop[@name="paused"]//text())', dom) === 'true'
                })
            ));
    }

    public async getStackTrace(contextid: number): Promise<CorrelatorStackTrace> {
        return requestPromise.get(`${this.host}:${this.port}/correlator/debug/progress/stack/id:${contextid}`)
            .then(response => new DOMParser().parseFromString(response, 'text/xml'))
            .then(dom => ({
                contextid: parseInt(xpath.select1('string(/map[@name="apama-response"]/list[@name="stack"]/prop[@name="contextid"]//text())', dom)),
                monitor: xpath.select1('string(/map[@name="apama-response"]/list[@name="stack"]/prop[@name="monitor"]//text())', dom),
                stackframes: xpath.select('/map[@name="apama-response"]/list[@name="stack"]/map[@name="stackframe"]', dom)
                    // Have to convert back to a string and then back to dom because this xpath implementation only finds from root node
                    .map(node => node.toString())
                    .map(nodeString => new DOMParser().parseFromString(nodeString, 'text/xml'))
                    .map(dom => ({
                        owner: xpath.select1('string(/map/prop[@name="owner"]//text())', dom),
                        type:  xpath.select1('string(/map/prop[@name="type"]//text())', dom),
                        action:  xpath.select1('string(/map/prop[@name="action"]//text())', dom),
                        lineno: parseInt(xpath.select1('string(/map/prop[@name="lineno"]//text())', dom)),
                        filename: xpath.select1('string(/map/prop[@name="filename"]//text())', dom),
                        filehash: xpath.select1('string(/map/prop[@name="filehash"]//text())', dom)
                    }))
            }));
    }
}