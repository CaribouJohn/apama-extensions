import { workspace, WorkspaceConfiguration, OutputChannel } from 'vscode';
import { platform } from 'os';
import { join } from 'path';



const confignode: string = 'softwareag.apama';
const default_linux_correlator: string = 'correlator';
const default_windows_correlator: string = 'correlator.exe';
const default_linux_deploy: string = 'engine_deploy';
const default_windows_deploy: string = 'engine_deploy.exe';
const default_linux_inject: string = 'engine_inject';
const default_windows_inject: string = 'engine_inject.exe';
const default_linux_project: string = 'apama_project';
const default_windows_project: string = 'apama_project.exe';
const default_linux_management: string = 'engine_management';
const default_windows_management: string = 'engine_management.exe';
const default_linux_eplbuddy: string = 'eplbuddy';
const default_windows_eplbuddy: string = 'eplbuddy.exe';
const default_linux_env: string = 'apama_env';
const default_windows_env: string = 'apama_env.bat';
const default_linux_send: string = 'engine_send';
const default_windows_send: string = 'engine_send.exe';
const default_linux_delete:string = 'engine_delete';
const default_windows_delete:string = 'engine_delete.exe';
const default_linux_source: string = '. ';
const default_windows_source: string = '';


export class ApamaEnvironment {

  private workspaceConfig: WorkspaceConfiguration;
  private isLinux: boolean;

  //apama installation dir
  private apamaHome: string;

  //applications
  private cmd_source: string;
  private cmd_env: string;
  private cmd_correlator: string;
  private cmd_deploy: string;
  private cmd_inject: string;
  private cmd_project: string;
  private cmd_management: string;
  private cmd_eplbuddy: string;
  private cmd_send: string;
  private cmd_delete: string;

  constructor( private logger:OutputChannel ) { 
    this.workspaceConfig = workspace.getConfiguration(confignode);
    this.isLinux = (platform() === 'linux');
    this.apamaHome = '';

    //applications
    //make sure separators correct for paths 
      this.cmd_source = '';
      this.cmd_env = '';
      this.cmd_correlator = '';
      this.cmd_deploy = '';
      this.cmd_inject =  '';
      this.cmd_project = '';
      this.cmd_management = '';
      this.cmd_eplbuddy = '';
      this.cmd_send = '';
      this.cmd_delete = '';
      this.updateCommands();
  }

  private updateCommands() {
    this.workspaceConfig = workspace.getConfiguration(confignode);
   //overridden in config? 
    if (this.workspaceConfig.has('apamahome')) {
      //shouldn't be undefined here because has checks, but for linting need to cover
      this.apamaHome = this.workspaceConfig.get('apamahome') || this.apamaHome;
    }
    else {
      //otherwise set default in config
      this.workspaceConfig.update('apamaHome', this.apamaHome, true);
    }

    
    //applications
    //make sure separators correct for paths 
    if (this.isLinux) {
      this.cmd_source = default_linux_source;
      this.cmd_env = join(this.apamaHome, 'bin', default_linux_env);
      this.cmd_correlator = join(this.apamaHome, 'bin', default_linux_correlator);
      this.cmd_deploy = join(this.apamaHome, 'bin', default_linux_deploy);
      this.cmd_inject = join(this.apamaHome, 'bin', default_linux_inject);
      this.cmd_project = join(this.apamaHome, 'bin', default_linux_project);
      this.cmd_management = join(this.apamaHome, 'bin', default_linux_management);
      this.cmd_eplbuddy = join(this.apamaHome, 'bin', default_linux_eplbuddy);
      this.cmd_send = join(this.apamaHome, 'bin', default_linux_send);
      this.cmd_delete = join(this.apamaHome, 'bin', default_linux_delete);
    }
    else {
      this.cmd_source = default_windows_source;
      this.cmd_env = join(this.apamaHome, 'bin', default_windows_env);
      this.cmd_correlator = join(this.apamaHome, 'bin', default_windows_correlator);
      this.cmd_deploy = join(this.apamaHome, 'bin', default_windows_deploy);
      this.cmd_inject = join(this.apamaHome, 'bin', default_windows_inject);
      this.cmd_project = join(this.apamaHome, 'bin', default_windows_project);
      this.cmd_management = join(this.apamaHome, 'bin', default_windows_management);
      this.cmd_eplbuddy = join(this.apamaHome, 'bin', default_windows_eplbuddy);
      this.cmd_send = join(this.apamaHome, 'bin', default_windows_send);
      this.cmd_delete = join(this.apamaHome, 'bin', default_windows_delete);
    }


  }

  sourceEnv(): string {
    this.updateCommands();
    return this.cmd_source + this.cmd_env + ' ';
  }

  getCorrelatorCmdline(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_correlator + ' '; 
    this.logger.appendLine('startCorrelator ' + r);
    return r;
  }

  //doesn't need environment
  getDeployCmdline(): string {
    this.updateCommands();
    let r = this.cmd_deploy + ' '; 
    this.logger.appendLine('startDeploy ' + r);
    return r;
  }

  getInjectCmdline(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_inject + ' '; 
    this.logger.appendLine('startInject ' + r);
    return r;
  }

  getSendCmdLine(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_send + ' '; 
    this.logger.appendLine('startSend ' + r);
    return r;

  }

  getDeleteCmdLine(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_delete + ' '; 
    this.logger.appendLine('startDelete ' + r);
    return r;
  }

  getApamaProjectCmdline(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_project + ' '; 
    this.logger.appendLine('startProject ' + r);
    return r;
  }

  getManagerCmdline(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_management + ' '; 
    this.logger.appendLine('startManager ' + r);
    return r;
  }

  getEplBuddyCmdline(): string {
    this.updateCommands();
    let r = this.sourceEnv() + ' && ' + this.cmd_eplbuddy + ' '; 
    this.logger.appendLine('starteplBuddy ' + r);
    return r;
  }
}
