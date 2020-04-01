import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken, DebugConfigurationProvider, workspace, OutputChannel } from 'vscode';
import * as Net from 'net';
import { platform } from 'os';
import { execFileSync } from 'child_process';
import { CorrelatorDebugSession, normalizeCorrelatorFilePath } from './correlatorDebugSession';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';

export class ApamaDebugConfigurationProvider implements DebugConfigurationProvider {

    private _server?: Net.Server;
    
    constructor( private logger:OutputChannel , private apamaEnv: ApamaEnvironment ) {
        
    }

    /**
     *  Return an initial debug configuration
     */
    provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        this.logger.appendLine("provideDebugConfigurations");
        let config = workspace.getConfiguration("softwareag.apama");
        return [ {
            type: "apama",
            name: "Debug Apama Application",
            request: "launch",
            correlator: {
                port: config.get("debugport"),
                args: ["-g"]
            }
        }];
    }

	/**
	 * Add all missing config setting just before launch
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        this.logger.appendLine("resolveDebugConfiguration");
        // Can't continue if there's no workspace
        if (!folder) {
            this.logger.appendLine("no folder");
            return undefined;
        }

        // If an empty config has been provided (because there's no existing launch.json) then we can delegate to provideDebugConfigurations by returning
        if (Object.keys(config).length === 0) {
            this.logger.appendLine("empty config");
            return config;
        }


        config = Object.assign({
            injectionList: getInjectionList(this.apamaEnv, folder.uri.fsPath),
            correlator: { /* Defaulted below */ }
        }, config);

        config.correlator = Object.assign({
            host: "localhost",
            port: workspace.getConfiguration("softwareag.apama").get("debugport"),
            args: ["-g"]
        }, config.correlator);

        config.correlator.port = Math.floor(config.correlator.port);


        if (!this._server) {
            this.logger.appendLine("starting server");
            this._server = Net.createServer(socket => {
                const session = new CorrelatorDebugSession(this.logger, this.apamaEnv, config.correlator);
                session.setRunAsServer(true);
                session.start(<NodeJS.ReadableStream>socket, socket);
            }).listen(0);
        }

        config.debugServer = (<Net.AddressInfo>this._server.address()).port;
        //config.debugServer = this._server.address();

        this.logger.appendLine("config - ");
        this.logger.appendLine( JSON.stringify(config));
		return config;
	}

	dispose() {
		if (this._server) {
			this._server.close();
		}
	}
}

function getInjectionList(apamaEnv: ApamaEnvironment, workspaceFolderPath: string) {

    let cmd : string = apamaEnv.getDeployCmdline();
    let output: string = execFileSync(cmd , ['--outputList', 'stdout', workspaceFolderPath], {
        encoding: 'utf8'
    });

    //split the lines, remove blanks and then normalise for the correlator
    return output.split(/\r?\n/).filter( filename => filename !== '' ).map( normalizeCorrelatorFilePath );
}
