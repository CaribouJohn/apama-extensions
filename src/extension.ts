"use_strict";

import * as net from 'net';

import * as vscode from 'vscode';

import {
	LanguageClient, LanguageClientOptions, ServerOptions,
	TransportKind, ForkOptions, MessageTransports
} from 'vscode-languageclient';


import { ApamaEnvironment } from './apama_util/apamaenvironment';
import { ApamaTaskProvider } from './apama_util/apamataskprovider';
import { ApamaDebugConfigurationProvider } from './apama_debug/apamadebugconfig';
import { ApamaProjectView } from './apama_project/apamaProjectView';
import { ApamaCommandProvider } from './apama_util/commands';//MY CHANGES
import { cumulocityView } from './c8y/cumulocityView';
//
// client activation function, this is the entrypoint for the client
//
export function activate(context: vscode.ExtensionContext): void {
	let commands: vscode.Disposable[] = [];
	const logger = vscode.window.createOutputChannel('Apama Extension');
	logger.show();
	logger.appendLine('Started EPL Extension');

	let apamaEnv:ApamaEnvironment = new ApamaEnvironment(logger);
	const taskprov = new ApamaTaskProvider(logger,apamaEnv);
	context.subscriptions.push(vscode.tasks.registerTaskProvider( "apama" , taskprov ));

	const provider = new ApamaDebugConfigurationProvider(logger,apamaEnv);

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('apama', provider));

  context.subscriptions.push(provider);

	const commandprov = new ApamaCommandProvider(logger, apamaEnv, context);

	//this needs a workspace folder which under some circumstances can be undefined. 
	//but we can ignore in that case and things shjould still work
	if (vscode.workspace.workspaceFolders !== undefined) 
	{
		const projView = new ApamaProjectView(apamaEnv, logger, vscode.workspace.workspaceFolders, context);
	}

	const c8yView = new cumulocityView(apamaEnv, logger, context);

	//---------------------------------
	// Language server start-up and support
	//---------------------------------

		// Start the command in a shell - note that the current EPL buddy doesn't repond 
		// so this will fail until we do have a working lang-server app
		// https://github.com/Microsoft/vscode-languageserver-node/issues/358


		//start with the connection to the server
		let langServer: vscode.Disposable = startLangServerTCP(12346).start();
	


	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	commands.forEach(command => context.subscriptions.push(command));
}


function startLangServerTCP(addr: number): LanguageClient {
	const serverOptions: ServerOptions = () => {
	  return new Promise((resolve, reject) => {
		const clientSocket = new net.Socket();
		clientSocket.connect(12346, "127.1.0.0", () => {
		  resolve({
			reader: clientSocket,
			writer: clientSocket,
		  });
		});
	  });
	};
	
	// Options of the language client
	let clientOptions: LanguageClientOptions = {
		// Activate the server for epl files
		documentSelector: [ 'epl' ],
		synchronize: {
			// Synchronize the section 'eplLanguageServer' of the settings to the server
			configurationSection: 'eplLanguageServer',
			// Notify the server about file changes to epl files contained in the workspace
			// need to think about this
			// fileEvents: workspace.createFileSystemWatcher('**/.epl')
		}
	};

	return new LanguageClient(`tcp lang server (port ${addr})`, serverOptions, clientOptions);
}


// this method is called when your extension is deactivated
export function deactivate() { }
