import { workspace, WorkspaceConfiguration, OutputChannel } from 'vscode';
import { platform } from 'os';
import { join } from 'path';



const confignode = 'softwareag.apama';
const default_linux_correlator = 'correlator';
const default_windows_correlator = 'correlator.exe';
const default_linux_deploy = 'engine_deploy';
const default_windows_deploy = 'engine_deploy.exe';
const default_linux_inject = 'engine_inject';
const default_windows_inject = 'engine_inject.exe';
const default_linux_project = 'apama_project';
const default_windows_project = 'apama_project.exe';
const default_linux_management = 'engine_management';
const default_windows_management = 'engine_management.exe';
const default_linux_eplbuddy = 'eplbuddy';
const default_windows_eplbuddy = 'eplbuddy.exe';
const default_linux_env = 'apama_env';
const default_windows_env = 'apama_env.bat';
const default_linux_send = 'engine_send';
const default_windows_send = 'engine_send.exe';
const default_linux_delete = 'engine_delete';
const default_windows_delete = 'engine_delete.exe';
const default_linux_watch = 'engine_watch'; 
const default_windows_watch = 'engine_watch.exe';
const default_linux_receive = 'engine_receive'; 
const default_windows_receive = 'engine_receive.exe';
const default_linux_inspect = 'engine_inspect'; 
const default_windows_inspect = 'engine_inspect.exe';
const default_linux_source = '. ';
const default_windows_source = '';


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
  private cmd_watch: string;
  private cmd_receive: string;
  private cmd_inspect: string;

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
      this.cmd_watch = '';
      this.cmd_receive = '';
      this.cmd_inspect = '';
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
      this.cmd_watch = join(this.apamaHome, 'bin', default_linux_watch);
      this.cmd_receive = join(this.apamaHome, 'bin', default_linux_receive);
      this.cmd_inspect = join(this.apamaHome, 'bin', default_linux_inspect);
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
      this.cmd_watch = join(this.apamaHome, 'bin', default_windows_watch);
      this.cmd_receive = join(this.apamaHome, 'bin', default_windows_receive);
      this.cmd_inspect = join(this.apamaHome, 'bin', default_windows_inspect);
    }


  }

  sourceEnv(): string {
    this.updateCommands();
    return this.cmd_source + this.cmd_env + ' ';
  }

  getCorrelatorCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_correlator + ' '; 
    //this.logger.appendLine('startCorrelator ' + r);
    return r;
  }

  //doesn't need environment
  getDeployCmdline(): string {
    this.updateCommands();
    const r = this.cmd_deploy + ' '; 
    //this.logger.appendLine('startDeploy ' + r);
    return r;
  }

  getInjectCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_inject + ' '; 
    //this.logger.appendLine('startInject ' + r);
    return r;
  }

  getSendCmdLine(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_send + ' '; 
    //this.logger.appendLine('startSend ' + r);
    return r;

  }

  getDeleteCmdLine(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_delete + ' '; 
    //this.logger.appendLine('startDelete ' + r);
    return r;
  }

  getApamaProjectCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_project + ' '; 
    //this.logger.appendLine('startProject ' + r);
    return r;
  }

  getManagerCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_management + ' '; 
    //this.logger.appendLine('startManager ' + r);
    return r;
  }

  getEplBuddyCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_eplbuddy + ' '; 
    //this.logger.appendLine('starteplBuddy ' + r);
    return r;
  }

  getEngineWatchCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_watch + ' '; 
    //this.logger.appendLine('startWatch ' + r);
    return r;
  }

  getEngineReceiveCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_receive + ' '; 
    return r;
  }

  getEngineInspectCmdline(): string {
    this.updateCommands();
    const r = this.sourceEnv() + ' && ' + this.cmd_inspect + ' '; 
    return r;
  }

}
