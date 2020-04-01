"use_strict";

import * as path from 'path';

import * as vscode from 'vscode';

import {
	LanguageClient, LanguageClientOptions, ServerOptions,
	TransportKind, ForkOptions
} from 'vscode-languageclient';


import { ApamaEnvironment } from './apama_util/apamaenvironment';
import { ApamaTaskProvider } from './apama_util/apamataskprovider';
import { ApamaDebugConfigurationProvider } from './apama_debug/apamadebugconfig';
import { ApamaProjectView } from './apama_project/apamaProjectView';
import { ApamaCommandProvider } from './apama_util/commands';//MY CHANGES

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

	context.subscriptions.push(debug.registerDebugConfigurationProvider('apama', provider));

  context.subscriptions.push(provider);

	const commandprov = new ApamaCommandProvider(logger, apamaEnv, context);

	//this needs a workspace folder which under some circumstances can be undefined. 
	//but we can ignore in that case and things shjould still work
	if (vscode.workspace.workspaceFolders !== undefined) 
	{
		const projView = new ApamaProjectView(apamaEnv, logger, vscode.workspace.workspaceFolders, context);
	}


	//---------------------------------
	// Language server start-up and support
	//---------------------------------

		// This is the EPL Buddy application
		//let serverModule: string = context.asAbsolutePath(path.join('out', 'server.js'));
		let serverModule: string = apamaEnv.getEplBuddyCmdline(); //needs changing once we have the correct name....
		


		// The debug options for the server
		//let debugOptions: ForkOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
		let debugOptions: ForkOptions = { execArgv: [] };
	
		// Start the command in a shell - note that the current EPL buddy doesn't repond 
		// so this will fail until we do have a working lang-server app
		// https://github.com/Microsoft/vscode-languageserver-node/issues/358
		let serverOptions: ServerOptions = {
			command: serverModule,
			args: [],
			options: {
				shell: true
			}
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
	
		// Create the language client and start the client.
		let langServer: vscode.Disposable = new LanguageClient('eplLanguageServer', 'Language Server', serverOptions, clientOptions).start();
	


	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	commands.forEach(command => context.subscriptions.push(command));
}


// this method is called when your extension is deactivated
export function deactivate() { }
