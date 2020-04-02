import { TaskProvider, CancellationToken, ProviderResult, Task, ProcessExecution, TaskDefinition, ShellExecution, ShellExecutionOptions, OutputChannel, TaskScope, InputBoxOptions } from 'vscode';
import { ApamaEnvironment } from './apamaenvironment';
import { window, workspace } from 'vscode';

export class ApamaTaskProvider implements TaskProvider {

  constructor(private logger: OutputChannel, private apamaEnv: ApamaEnvironment) {

  }

  provideTasks(): ProviderResult<Task[]> {
    return [
        this.runCorrelator(),
        this.runEngineWatch()
    ];
  }

  private runCorrelator(): Task {
    let correlator = new Task(
      {type: "shell", task: ""},
      "Run Correlator",
      "correlator",
      new ShellExecution(this.apamaEnv.getCorrelatorCmdline()),
      []
    );
    correlator.group = 'test';
    return correlator;
  }

  resolveTask(task: Task, token?: CancellationToken | undefined): ProviderResult<Task> {
    throw new Error("Method not implemented.");
  }

   runEngineWatch(): Task {
     //TODO: get user defined options?
     //let options = windows.showInputBox(...etc...);
    let engine_watch = new Task(
      {type: "shell", task: ""},
      "engine_watch",
      "correlator",
      new ShellExecution(this.apamaEnv.getEngineWatchCmdline()/* + options */),
      []
    );
    engine_watch.group = 'test';
    return engine_watch;
  }

}