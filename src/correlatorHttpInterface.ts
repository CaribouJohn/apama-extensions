import * as requestPromise from 'request-promise-native';
import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';

export interface CorrelatorBreakpoint {
    filename: string;
    filehash: string;
    action: string;
    owner: string;
    line: number;
    id: string;
    breakonce: boolean;
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
}