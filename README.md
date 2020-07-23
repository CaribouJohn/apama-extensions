# epl-syntax-highlighting README

This is a community developed VSCode extension to support development of Apama Streaming Analytics applications.  Initially it offered syntax highlighting for EPL (Event Programming Language) files. EPL files are used by the Apama Streaming Analytics product to define applications that are executed within a runtime process called the 'correlator'. The language is a domain specific language centered around events and event processing.  As the extension has grown, additional capabilities are being added beyond only syntax highlighting, such as launching the correlator runtime with files from your project.

For more information about Apama and EPL please visit the [Apama Community](http://www.apamacommunity.com/) website.

* [Apama Community - blog](http://www.apamacommunity.com/blog/)
* [Apama Community - downloads](http://www.apamacommunity.com/downloads/)
* [Apama Community - documentation](http://www.apamacommunity.com/docs/)

Users of this extension may also find the early-stage new [vscode extension for PySys testing](https://marketplace.visualstudio.com/items?itemName=CaribouJohn.pysys-vscode-extension) helpful, as [PySys](https://pypi.org/project/PySys/) is the primary framework for testing Apama applications.

## Features of the epl-syntax-highlighting extension

* Enables features of the extension for correct matching versions of Apama.
* Supports EPL language diagnostics from Apama 10.5.3+
* Support for debugging and launching pure single-file and multi-file EPL applications in a correlator.
* Supports use of the apama_project tool.
* Apama based settings for current and upcoming changes live.

## Limitations

* Debug of deployed projects only.
* Diagnostics are limited to EPL files currently (imported packages may not work).
* Completion is currently only snippet and history based.

## Theme based syntax highlighting

Based on the theme you choose the EPL code will be highlighted and easier to read than plain text files. This has been the case since the beginning of this extension, but it is more complete now (v1.0) and won't change significantly from here onward.

![example code](images/mainpage.PNG)

## Settings

There are various settings available for the extension now. All the Apama configuration entries are prefixed 'SoftwareAG.Apama', and searching for 'Apama' will show all of them.

* ApamaHome contains the path to the installation directory of the version you wish to use.
* DebugHost is the default host for a correlator started for debug (allowing remote instance).
* DebugPort is the default port for a correlator started for debug.
* LangserverType is a dropdown that controls the LSP for vscode, it can be local (starts and attaches), remote (attaches) or disabled.
  * Langserver.Host is the host that vscode should connect to the Langserver on.
  * Langserver.Port is the port the Langserver is running on.
  * Langserver.MaxErrors is the maximum number of diagnostics that should be returned by the LSP (INACTIVE)

There are also some placeholders for using EPL with [Cumulocity IoT](https://www.softwareag.cloud/site/product/cumulocity-iot.html). these will become active in a later release (>v1.0).

![settings](images/settings.png)

## Diagnostics

If you have enabled the Language Server and are using Apama full version 10.5.3+ then you will have access to live diagnostics. These diagnostics are limited to the file currently being edited but will become more fully featured as future releases are produced. Specifically, if you write EPL that uses external bundles or code, then the diagnostics may not take these into account.

![tasks](images/11-diagnostics.gif)

## Snippets

There are various snippets defined in the extension to make writing code easier.

![Snippets](images/1-snippets.gif)

## Tasks: correlator, inject monitor, and send event

Tasks can be created for running correlators on specific ports. The commands to inject EPL and send events also support these ports. Additionally there are tasks for engine_watch and engine_recieve that can also be set up. In future releases there will be a more coherent interface for this allowing a suite of tasks to be set up in one operation.

The animation below shows the default operation of the tasks.

![correlator](images/2-runcorr-inject.gif)

## Send Event file

Once you have a correlator executing some EPL then you can send event files to it with a right-click.

![events](images/3-evtfile-send.gif)

## Create Tasks

The animation below shows how to create a non-default tasks (allowing multiple correlators on different ports for example).

![tasks](images/5-tasks-create.gif)

## Create Project

The apama_project tool can be used to create projects which are compatible with the eclipse-based 'Software Ag Designer' IDE, and will also allow you to edit Designer created projects in vscode.

![project support](images/4-project-create.gif)

## Add bundles

You can add Bundles and instances to the project using the UI.

![tasks](images/6-project-addbundle.gif)

## Remove bundles

You can remove Bundles and instances from the project using the UI.

![tasks](images/7-project-rmbundle.gif)

## Deploy project

You can deploy the project using the UI and then run that project in a correlator. N.B. currently you may need to create or move a configuration file into the root of the deployed directory.

![tasks](images/8-project-deploy.gif)

## Add breakpoints

You can add breakpoints to the code for debugging. These are limited to line-based breakpoints currently.

![tasks](images/9-set-breakpoints.gif)

## Debug

Debugging the application also follows the standard vscode patterns.

![tasks](images/10-debug.gif)

## Requirements

To use the diagnostics capability you must have version 10.5.3 or later of Apama installed.

## Known Issues

There are a number of issues that will be fixed, but please do raise issues in <https://github.com/CaribouJohn/vscode-apama-extensions/issues> if you come accross things. I am very open to pull requests to fix things also :)

## Development

Users are welcome to make pull requests with fixes and enhancements but I reserve the right to control what and when goes into released versions of the extention.

## Release Notes

## v1.0.1 (June 2020)

* Finished syntax highlighting.
* Documentation.
* Apama EPL diagnostics (via LSP support in eplbuddy tool).
* Integration with apama_project tool.
* Fixed small bug when starting the Language Server.
* Preparation for future support of integration with [EPL Apps](https://cumulocity.com/guides/apama/analytics-introduction/#apama-epl-apps) feature of Cumulocity IoT.

## v0.2.0 to v0.9.0 (February 2020)

* Better syntax highlighting, Snippets, Apama EPL debugging
* Snippets support and further syntax highlighting added
* Cleanup of code and rewrite of the tmLanguage file
* Small readme change and addition of image dir.

## v0.1.0 (February 2020)

* Initial release (started June 2018)
* Basic highlighting with some support for more complex code structures.
* Placeholder for command functionality
