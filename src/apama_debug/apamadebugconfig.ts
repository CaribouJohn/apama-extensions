import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken, DebugConfigurationProvider, workspace, OutputChannel } from 'vscode';
import * as Net from 'net';
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
    // todo do we need folder here
    provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        const config = workspace.getConfiguration("softwareag.apama");
        return [ {
            type: "apama",
            name: "Debug Apama Application",
            request: "launch",
            correlator: {
                port: config.get("debugport"),
                host: config.get("debughost"),
                args: ["-g"]
            }
        }];
    }

	/**
	 * Add all missing config setting just before launch
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        // Can't continue if there's no workspace
        if (!folder) {
            this.logger.appendLine("no folder");
            return undefined;
        }

        // // If an empty config has been provided (because there's no existing launch.json) then we can delegate to provideDebugConfigurations by returning
        // if (Object.keys(config).length === 0) {
        //     this.logger.appendLine("empty config");
        //     let configList= await this.provideDebugConfigurations(folder);
        //     if( configList )
        //     {
        //         config = Object.assign(configList[0]);
        //     }
        // }
    // if launch.json is missing or empty

    if (!config.type && !config.request && !config.name) {
        config.type = "apama";
        config.name = "Debug Apama Application";
        config.request = "launch";
        config.injectionList = getInjectionList(this.apamaEnv, folder.uri.fsPath);
        config.correlator =  {};
        config.correlator.host = "127.0.0.1";
        config.correlator.port = workspace.getConfiguration("softwareag.apama").get("debugport");
        config.correlator.args = ["-g"];
    }


        if (!this._server) {
            console.log("starting listening server");
            this._server = Net.createServer(socket => {
                const session = new CorrelatorDebugSession(this.logger, this.apamaEnv, config.correlator);
                session.setRunAsServer(true);
                session.start(<NodeJS.ReadableStream>socket, socket);
            }).listen(0);
        }
        else {
            console.log("Reusing previous instance");
        }

        config.debugServer = (<Net.AddressInfo>this._server.address()).port;
        //config.debugServer = this._server.address();

		return config;
	}

	dispose(): void  {
		if (this._server) {
            this._server.close();
		}
	}
}

function getInjectionList(apamaEnv: ApamaEnvironment, workspaceFolderPath: string) {

    const cmd : string = apamaEnv.getDeployCmdline();
    const output: string = execFileSync(cmd , ['--outputList', 'stdout', workspaceFolderPath], {
        encoding: 'utf8'
    });

    //split the lines, remove blanks and then normalise for the correlator
    return output.split(/\r?\n/).filter( filename => filename !== '' ).map( normalizeCorrelatorFilePath );
}
