// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

var __decorate = void 0 && (void 0).__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var __param = void 0 && (void 0).__param || function (paramIndex, decorator) {
  return function (target, key) {
    decorator(target, key, paramIndex);
  };
};

var __awaiter = void 0 && (void 0).__awaiter || function (thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : new P(function (resolve) {
        resolve(result.value);
      }).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

const inversify_1 = require("inversify");

const path = require("path");

const vscode_languageclient_1 = require("vscode-languageclient");

const types_1 = require("../../common/application/types"); // tslint:disable-next-line:ordered-imports


const constants_1 = require("../../common/constants");

const types_2 = require("../../common/platform/types");

const types_3 = require("../../common/types");

const async_1 = require("../../common/utils/async");

const stopWatch_1 = require("../../common/utils/stopWatch");

const types_4 = require("../../common/variables/types");

const types_5 = require("../../ioc/types");

const symbolProvider_1 = require("../../providers/symbolProvider");

const telemetry_1 = require("../../telemetry");

const constants_2 = require("../../telemetry/constants");

const types_6 = require("../../unittests/types");

const downloader_1 = require("../downloader");

const interpreterDataService_1 = require("../interpreterDataService");

const platformData_1 = require("../platformData");

const progress_1 = require("../progress");

const types_7 = require("../types");

const PYTHON = 'python';
const dotNetCommand = 'dotnet';
const languageClientName = 'Python Tools';
const loadExtensionCommand = 'python._loadLanguageServerExtension';
const buildSymbolsCmdDeprecatedInfo = {
  doNotDisplayPromptStateKey: 'SHOW_DEPRECATED_FEATURE_PROMPT_BUILD_WORKSPACE_SYMBOLS',
  message: 'The command \'Python: Build Workspace Symbols\' is deprecated when using the Python Language Server. The Python Language Server builds symbols in the workspace in the background.',
  moreInfoUrl: 'https://github.com/Microsoft/vscode-python/issues/2267#issuecomment-408996859',
  commands: ['python.buildWorkspaceSymbols']
};
let LanguageServerExtensionActivator = class LanguageServerExtensionActivator {
  constructor(services) {
    this.services = services;
    this.sw = new stopWatch_1.StopWatch();
    this.disposables = [];
    this.interpreterHash = '';
    this.excludedFiles = [];
    this.typeshedPaths = [];
    this.context = this.services.get(types_3.IExtensionContext);
    this.configuration = this.services.get(types_3.IConfigurationService);
    this.appShell = this.services.get(types_1.IApplicationShell);
    this.output = this.services.get(types_3.IOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
    this.fs = this.services.get(types_2.IFileSystem);
    this.platformData = new platformData_1.PlatformData(services.get(types_2.IPlatformService), this.fs);
    this.workspace = this.services.get(types_1.IWorkspaceService);
    this.languageServerFolderService = this.services.get(types_7.ILanguageServerFolderService);
    const deprecationManager = this.services.get(types_3.IFeatureDeprecationManager); // Currently only a single root. Multi-root support is future.

    this.root = this.workspace && this.workspace.hasWorkspaceFolders ? this.workspace.workspaceFolders[0].uri : undefined;
    this.startupCompleted = async_1.createDeferred();
    const commandManager = this.services.get(types_1.ICommandManager);
    this.disposables.push(commandManager.registerCommand(loadExtensionCommand, args => __awaiter(this, void 0, void 0, function* () {
      if (this.languageClient) {
        yield this.startupCompleted.promise;
        this.languageClient.sendRequest('python/loadExtension', args);
      } else {
        this.loadExtensionArgs = args;
      }
    })));
    deprecationManager.registerDeprecation(buildSymbolsCmdDeprecatedInfo);
    this.surveyBanner = services.get(types_3.IPythonExtensionBanner, types_3.BANNER_NAME_LS_SURVEY);
    this.configuration.getSettings().addListener('change', this.onSettingsChanged.bind(this));
  }

  activate() {
    return __awaiter(this, void 0, void 0, function* () {
      this.sw.reset();
      this.languageServerFolder = yield this.languageServerFolderService.getLanguageServerFolderName();
      const clientOptions = yield this.getAnalysisOptions();

      if (!clientOptions) {
        return false;
      }

      this.startupCompleted.promise.then(() => {
        const testManagementService = this.services.get(types_6.IUnitTestManagementService);
        testManagementService.activate().then(() => testManagementService.activateCodeLenses(new symbolProvider_1.LanguageServerSymbolProvider(this.languageClient))).catch(ex => this.services.get(types_3.ILogger).logError('Failed to activate Unit Tests', ex));
      }).ignoreErrors();
      return this.startLanguageServer(clientOptions);
    });
  }

  deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.languageClient) {
        // Do not await on this
        this.languageClient.stop();
      }

      for (const d of this.disposables) {
        d.dispose();
      }

      this.configuration.getSettings().removeListener('change', this.onSettingsChanged.bind(this));
    });
  }

  startLanguageServer(clientOptions) {
    return __awaiter(this, void 0, void 0, function* () {
      // Determine if we are running MSIL/Universal via dotnet or self-contained app.
      telemetry_1.sendTelemetryEvent(constants_2.PYTHON_LANGUAGE_SERVER_ENABLED);
      const settings = this.configuration.getSettings();

      if (!settings.downloadLanguageServer) {
        // Depends on .NET Runtime or SDK. Typically development-only case.
        this.languageClient = this.createSimpleLanguageClient(clientOptions);
        yield this.startLanguageClient();
        return true;
      }

      const mscorlib = path.join(this.context.extensionPath, this.languageServerFolder, 'mscorlib.dll');

      if (!(yield this.fs.fileExists(mscorlib))) {
        const downloader = new downloader_1.LanguageServerDownloader(this.platformData, this.languageServerFolder, this.services);
        yield downloader.downloadLanguageServer(this.context);
      }

      const serverModule = path.join(this.context.extensionPath, this.languageServerFolder, this.platformData.getEngineExecutableName());
      this.languageClient = this.createSelfContainedLanguageClient(serverModule, clientOptions);

      try {
        yield this.startLanguageClient();
        this.languageClient.onTelemetry(telemetryEvent => {
          const eventName = telemetryEvent.EventName ? telemetryEvent.EventName : constants_2.PYTHON_LANGUAGE_SERVER_TELEMETRY;
          telemetry_1.sendTelemetryEvent(eventName, telemetryEvent.Measurements, telemetryEvent.Properties);
        });
        return true;
      } catch (ex) {
        this.appShell.showErrorMessage(`Language server failed to start. Error ${ex}`);
        telemetry_1.sendTelemetryEvent(constants_2.PYTHON_LANGUAGE_SERVER_ERROR, undefined, {
          error: 'Failed to start (platform)'
        });
        return false;
      }
    });
  }

  startLanguageClient() {
    return __awaiter(this, void 0, void 0, function* () {
      this.context.subscriptions.push(this.languageClient.start());
      yield this.serverReady();
      const disposables = this.services.get(types_3.IDisposableRegistry);
      const progressReporting = new progress_1.ProgressReporting(this.languageClient);
      disposables.push(progressReporting);
    });
  }

  serverReady() {
    return __awaiter(this, void 0, void 0, function* () {
      while (!this.languageClient.initializeResult) {
        yield new Promise(resolve => setTimeout(resolve, 100));
      }

      if (this.loadExtensionArgs) {
        this.languageClient.sendRequest('python/loadExtension', this.loadExtensionArgs);
      }

      this.startupCompleted.resolve();
    });
  }

  createSimpleLanguageClient(clientOptions) {
    const commandOptions = {
      stdio: 'pipe'
    };
    const serverModule = path.join(this.context.extensionPath, this.languageServerFolder, this.platformData.getEngineDllName());
    const serverOptions = {
      run: {
        command: dotNetCommand,
        args: [serverModule],
        options: commandOptions
      },
      debug: {
        command: dotNetCommand,
        args: [serverModule, '--debug'],
        options: commandOptions
      }
    };
    return new vscode_languageclient_1.LanguageClient(PYTHON, languageClientName, serverOptions, clientOptions);
  }

  createSelfContainedLanguageClient(serverModule, clientOptions) {
    const options = {
      stdio: 'pipe'
    };
    const serverOptions = {
      run: {
        command: serverModule,
        rgs: [],
        options: options
      },
      debug: {
        command: serverModule,
        args: ['--debug'],
        options
      }
    };
    return new vscode_languageclient_1.LanguageClient(PYTHON, languageClientName, serverOptions, clientOptions);
  } // tslint:disable-next-line:member-ordering


  getAnalysisOptions() {
    return __awaiter(this, void 0, void 0, function* () {
      const properties = new Map();
      let interpreterData;
      let pythonPath = '';

      try {
        const interpreterDataService = new interpreterDataService_1.InterpreterDataService(this.context, this.services);
        interpreterData = yield interpreterDataService.getInterpreterData();
      } catch (ex) {
        this.appShell.showWarningMessage('Unable to determine path to the Python interpreter. IntelliSense will be limited.');
      }

      this.interpreterHash = interpreterData ? interpreterData.hash : '';

      if (interpreterData) {
        pythonPath = path.dirname(interpreterData.path); // tslint:disable-next-line:no-string-literal

        properties['InterpreterPath'] = interpreterData.path; // tslint:disable-next-line:no-string-literal

        properties['Version'] = interpreterData.version;
      } // tslint:disable-next-line:no-string-literal


      properties['DatabasePath'] = path.join(this.context.extensionPath, this.languageServerFolder);
      let searchPaths = interpreterData ? interpreterData.searchPaths.split(path.delimiter) : [];
      const settings = this.configuration.getSettings();

      if (settings.autoComplete) {
        const extraPaths = settings.autoComplete.extraPaths;

        if (extraPaths && extraPaths.length > 0) {
          searchPaths.push(...extraPaths);
        }
      }

      const envVarsProvider = this.services.get(types_4.IEnvironmentVariablesProvider);
      const vars = yield envVarsProvider.getEnvironmentVariables();

      if (vars.PYTHONPATH && vars.PYTHONPATH.length > 0) {
        const pathUtils = this.services.get(types_3.IPathUtils);
        const paths = vars.PYTHONPATH.split(pathUtils.delimiter).filter(item => item.trim().length > 0);
        searchPaths.push(...paths);
      } // Make sure paths do not contain multiple slashes so file URIs
      // in VS Code (Node.js) and in the language server (.NET) match.
      // Note: for the language server paths separator is always ;


      searchPaths.push(pythonPath);
      searchPaths = searchPaths.map(p => path.normalize(p));
      const selector = [{
        language: PYTHON,
        scheme: 'file'
      }];
      this.excludedFiles = this.getExcludedFiles();
      this.typeshedPaths = this.getTypeshedPaths(settings); // Options to control the language client

      return {
        // Register the server for Python documents
        documentSelector: selector,
        synchronize: {
          configurationSection: PYTHON
        },
        outputChannel: this.output,
        initializationOptions: {
          interpreter: {
            properties
          },
          displayOptions: {
            preferredFormat: 'markdown',
            trimDocumentationLines: false,
            maxDocumentationLineLength: 0,
            trimDocumentationText: false,
            maxDocumentationTextLength: 0
          },
          searchPaths,
          typeStubSearchPaths: this.typeshedPaths,
          excludeFiles: this.excludedFiles,
          testEnvironment: constants_1.isTestExecution(),
          analysisUpdates: true,
          traceLogging: true,
          asyncStartup: true
        },
        middleware: {
          provideCompletionItem: (document, position, context, token, next) => {
            if (this.surveyBanner) {
              this.surveyBanner.showBanner().ignoreErrors();
            }

            return next(document, position, context, token);
          }
        }
      };
    });
  }

  getExcludedFiles() {
    const list = ['**/Lib/**', '**/site-packages/**'];
    this.getVsCodeExcludeSection('search.exclude', list);
    this.getVsCodeExcludeSection('files.exclude', list);
    this.getVsCodeExcludeSection('files.watcherExclude', list);
    this.getPythonExcludeSection(list);
    return list;
  }

  getVsCodeExcludeSection(setting, list) {
    const states = this.workspace.getConfiguration(setting, this.root);

    if (states) {
      Object.keys(states).filter(k => (k.indexOf('*') >= 0 || k.indexOf('/') >= 0) && states[k]).forEach(p => list.push(p));
    }
  }

  getPythonExcludeSection(list) {
    const pythonSettings = this.configuration.getSettings(this.root);
    const paths = pythonSettings && pythonSettings.linting ? pythonSettings.linting.ignorePatterns : undefined;

    if (paths && Array.isArray(paths)) {
      paths.filter(p => p && p.length > 0).forEach(p => list.push(p));
    }
  }

  getTypeshedPaths(settings) {
    return settings.analysis.typeshedPaths && settings.analysis.typeshedPaths.length > 0 ? settings.analysis.typeshedPaths : [path.join(this.context.extensionPath, this.languageServerFolder, 'Typeshed')];
  }

  onSettingsChanged() {
    return __awaiter(this, void 0, void 0, function* () {
      const ids = new interpreterDataService_1.InterpreterDataService(this.context, this.services);
      const idata = yield ids.getInterpreterData();

      if (!idata || idata.hash !== this.interpreterHash) {
        this.interpreterHash = idata ? idata.hash : '';
        yield this.restartLanguageServer();
        return;
      }

      const excludedFiles = this.getExcludedFiles();
      yield this.restartLanguageServerIfArrayChanged(this.excludedFiles, excludedFiles);
      const settings = this.configuration.getSettings();
      const typeshedPaths = this.getTypeshedPaths(settings);
      yield this.restartLanguageServerIfArrayChanged(this.typeshedPaths, typeshedPaths);
    });
  }

  restartLanguageServerIfArrayChanged(oldArray, newArray) {
    return __awaiter(this, void 0, void 0, function* () {
      if (newArray.length !== oldArray.length) {
        yield this.restartLanguageServer();
        return;
      }

      for (let i = 0; i < oldArray.length; i += 1) {
        if (oldArray[i] !== newArray[i]) {
          yield this.restartLanguageServer();
          return;
        }
      }
    });
  }

  restartLanguageServer() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.context) {
        return;
      }

      yield this.deactivate();
      yield this.activate();
    });
  }

};
LanguageServerExtensionActivator = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_5.IServiceContainer))], LanguageServerExtensionActivator);
exports.LanguageServerExtensionActivator = LanguageServerExtensionActivator;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxhbmd1YWdlU2VydmVyLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIl9fcGFyYW0iLCJwYXJhbUluZGV4IiwiZGVjb3JhdG9yIiwiX19hd2FpdGVyIiwidGhpc0FyZyIsIl9hcmd1bWVudHMiLCJQIiwiZ2VuZXJhdG9yIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJ2YWx1ZSIsInN0ZXAiLCJuZXh0IiwiZSIsInJlamVjdGVkIiwicmVzdWx0IiwiZG9uZSIsInRoZW4iLCJhcHBseSIsImV4cG9ydHMiLCJpbnZlcnNpZnlfMSIsInJlcXVpcmUiLCJwYXRoIiwidnNjb2RlX2xhbmd1YWdlY2xpZW50XzEiLCJ0eXBlc18xIiwiY29uc3RhbnRzXzEiLCJ0eXBlc18yIiwidHlwZXNfMyIsImFzeW5jXzEiLCJzdG9wV2F0Y2hfMSIsInR5cGVzXzQiLCJ0eXBlc181Iiwic3ltYm9sUHJvdmlkZXJfMSIsInRlbGVtZXRyeV8xIiwiY29uc3RhbnRzXzIiLCJ0eXBlc182IiwiZG93bmxvYWRlcl8xIiwiaW50ZXJwcmV0ZXJEYXRhU2VydmljZV8xIiwicGxhdGZvcm1EYXRhXzEiLCJwcm9ncmVzc18xIiwidHlwZXNfNyIsIlBZVEhPTiIsImRvdE5ldENvbW1hbmQiLCJsYW5ndWFnZUNsaWVudE5hbWUiLCJsb2FkRXh0ZW5zaW9uQ29tbWFuZCIsImJ1aWxkU3ltYm9sc0NtZERlcHJlY2F0ZWRJbmZvIiwiZG9Ob3REaXNwbGF5UHJvbXB0U3RhdGVLZXkiLCJtZXNzYWdlIiwibW9yZUluZm9VcmwiLCJjb21tYW5kcyIsIkxhbmd1YWdlU2VydmVyRXh0ZW5zaW9uQWN0aXZhdG9yIiwiY29uc3RydWN0b3IiLCJzZXJ2aWNlcyIsInN3IiwiU3RvcFdhdGNoIiwiZGlzcG9zYWJsZXMiLCJpbnRlcnByZXRlckhhc2giLCJleGNsdWRlZEZpbGVzIiwidHlwZXNoZWRQYXRocyIsImNvbnRleHQiLCJnZXQiLCJJRXh0ZW5zaW9uQ29udGV4dCIsImNvbmZpZ3VyYXRpb24iLCJJQ29uZmlndXJhdGlvblNlcnZpY2UiLCJhcHBTaGVsbCIsIklBcHBsaWNhdGlvblNoZWxsIiwib3V0cHV0IiwiSU91dHB1dENoYW5uZWwiLCJTVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCIsImZzIiwiSUZpbGVTeXN0ZW0iLCJwbGF0Zm9ybURhdGEiLCJQbGF0Zm9ybURhdGEiLCJJUGxhdGZvcm1TZXJ2aWNlIiwid29ya3NwYWNlIiwiSVdvcmtzcGFjZVNlcnZpY2UiLCJsYW5ndWFnZVNlcnZlckZvbGRlclNlcnZpY2UiLCJJTGFuZ3VhZ2VTZXJ2ZXJGb2xkZXJTZXJ2aWNlIiwiZGVwcmVjYXRpb25NYW5hZ2VyIiwiSUZlYXR1cmVEZXByZWNhdGlvbk1hbmFnZXIiLCJyb290IiwiaGFzV29ya3NwYWNlRm9sZGVycyIsIndvcmtzcGFjZUZvbGRlcnMiLCJ1cmkiLCJ1bmRlZmluZWQiLCJzdGFydHVwQ29tcGxldGVkIiwiY3JlYXRlRGVmZXJyZWQiLCJjb21tYW5kTWFuYWdlciIsIklDb21tYW5kTWFuYWdlciIsInB1c2giLCJyZWdpc3RlckNvbW1hbmQiLCJhcmdzIiwibGFuZ3VhZ2VDbGllbnQiLCJwcm9taXNlIiwic2VuZFJlcXVlc3QiLCJsb2FkRXh0ZW5zaW9uQXJncyIsInJlZ2lzdGVyRGVwcmVjYXRpb24iLCJzdXJ2ZXlCYW5uZXIiLCJJUHl0aG9uRXh0ZW5zaW9uQmFubmVyIiwiQkFOTkVSX05BTUVfTFNfU1VSVkVZIiwiZ2V0U2V0dGluZ3MiLCJhZGRMaXN0ZW5lciIsIm9uU2V0dGluZ3NDaGFuZ2VkIiwiYmluZCIsImFjdGl2YXRlIiwicmVzZXQiLCJsYW5ndWFnZVNlcnZlckZvbGRlciIsImdldExhbmd1YWdlU2VydmVyRm9sZGVyTmFtZSIsImNsaWVudE9wdGlvbnMiLCJnZXRBbmFseXNpc09wdGlvbnMiLCJ0ZXN0TWFuYWdlbWVudFNlcnZpY2UiLCJJVW5pdFRlc3RNYW5hZ2VtZW50U2VydmljZSIsImFjdGl2YXRlQ29kZUxlbnNlcyIsIkxhbmd1YWdlU2VydmVyU3ltYm9sUHJvdmlkZXIiLCJjYXRjaCIsImV4IiwiSUxvZ2dlciIsImxvZ0Vycm9yIiwiaWdub3JlRXJyb3JzIiwic3RhcnRMYW5ndWFnZVNlcnZlciIsImRlYWN0aXZhdGUiLCJzdG9wIiwiZGlzcG9zZSIsInJlbW92ZUxpc3RlbmVyIiwic2VuZFRlbGVtZXRyeUV2ZW50IiwiUFlUSE9OX0xBTkdVQUdFX1NFUlZFUl9FTkFCTEVEIiwic2V0dGluZ3MiLCJkb3dubG9hZExhbmd1YWdlU2VydmVyIiwiY3JlYXRlU2ltcGxlTGFuZ3VhZ2VDbGllbnQiLCJzdGFydExhbmd1YWdlQ2xpZW50IiwibXNjb3JsaWIiLCJqb2luIiwiZXh0ZW5zaW9uUGF0aCIsImZpbGVFeGlzdHMiLCJkb3dubG9hZGVyIiwiTGFuZ3VhZ2VTZXJ2ZXJEb3dubG9hZGVyIiwic2VydmVyTW9kdWxlIiwiZ2V0RW5naW5lRXhlY3V0YWJsZU5hbWUiLCJjcmVhdGVTZWxmQ29udGFpbmVkTGFuZ3VhZ2VDbGllbnQiLCJvblRlbGVtZXRyeSIsInRlbGVtZXRyeUV2ZW50IiwiZXZlbnROYW1lIiwiRXZlbnROYW1lIiwiUFlUSE9OX0xBTkdVQUdFX1NFUlZFUl9URUxFTUVUUlkiLCJNZWFzdXJlbWVudHMiLCJQcm9wZXJ0aWVzIiwic2hvd0Vycm9yTWVzc2FnZSIsIlBZVEhPTl9MQU5HVUFHRV9TRVJWRVJfRVJST1IiLCJlcnJvciIsInN1YnNjcmlwdGlvbnMiLCJzdGFydCIsInNlcnZlclJlYWR5IiwiSURpc3Bvc2FibGVSZWdpc3RyeSIsInByb2dyZXNzUmVwb3J0aW5nIiwiUHJvZ3Jlc3NSZXBvcnRpbmciLCJpbml0aWFsaXplUmVzdWx0Iiwic2V0VGltZW91dCIsImNvbW1hbmRPcHRpb25zIiwic3RkaW8iLCJnZXRFbmdpbmVEbGxOYW1lIiwic2VydmVyT3B0aW9ucyIsInJ1biIsImNvbW1hbmQiLCJvcHRpb25zIiwiZGVidWciLCJMYW5ndWFnZUNsaWVudCIsInJncyIsInByb3BlcnRpZXMiLCJNYXAiLCJpbnRlcnByZXRlckRhdGEiLCJweXRob25QYXRoIiwiaW50ZXJwcmV0ZXJEYXRhU2VydmljZSIsIkludGVycHJldGVyRGF0YVNlcnZpY2UiLCJnZXRJbnRlcnByZXRlckRhdGEiLCJzaG93V2FybmluZ01lc3NhZ2UiLCJoYXNoIiwiZGlybmFtZSIsInZlcnNpb24iLCJzZWFyY2hQYXRocyIsInNwbGl0IiwiZGVsaW1pdGVyIiwiYXV0b0NvbXBsZXRlIiwiZXh0cmFQYXRocyIsImVudlZhcnNQcm92aWRlciIsIklFbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyIiwidmFycyIsImdldEVudmlyb25tZW50VmFyaWFibGVzIiwiUFlUSE9OUEFUSCIsInBhdGhVdGlscyIsIklQYXRoVXRpbHMiLCJwYXRocyIsImZpbHRlciIsIml0ZW0iLCJ0cmltIiwibWFwIiwicCIsIm5vcm1hbGl6ZSIsInNlbGVjdG9yIiwibGFuZ3VhZ2UiLCJzY2hlbWUiLCJnZXRFeGNsdWRlZEZpbGVzIiwiZ2V0VHlwZXNoZWRQYXRocyIsImRvY3VtZW50U2VsZWN0b3IiLCJzeW5jaHJvbml6ZSIsImNvbmZpZ3VyYXRpb25TZWN0aW9uIiwib3V0cHV0Q2hhbm5lbCIsImluaXRpYWxpemF0aW9uT3B0aW9ucyIsImludGVycHJldGVyIiwiZGlzcGxheU9wdGlvbnMiLCJwcmVmZXJyZWRGb3JtYXQiLCJ0cmltRG9jdW1lbnRhdGlvbkxpbmVzIiwibWF4RG9jdW1lbnRhdGlvbkxpbmVMZW5ndGgiLCJ0cmltRG9jdW1lbnRhdGlvblRleHQiLCJtYXhEb2N1bWVudGF0aW9uVGV4dExlbmd0aCIsInR5cGVTdHViU2VhcmNoUGF0aHMiLCJleGNsdWRlRmlsZXMiLCJ0ZXN0RW52aXJvbm1lbnQiLCJpc1Rlc3RFeGVjdXRpb24iLCJhbmFseXNpc1VwZGF0ZXMiLCJ0cmFjZUxvZ2dpbmciLCJhc3luY1N0YXJ0dXAiLCJtaWRkbGV3YXJlIiwicHJvdmlkZUNvbXBsZXRpb25JdGVtIiwiZG9jdW1lbnQiLCJwb3NpdGlvbiIsInRva2VuIiwic2hvd0Jhbm5lciIsImxpc3QiLCJnZXRWc0NvZGVFeGNsdWRlU2VjdGlvbiIsImdldFB5dGhvbkV4Y2x1ZGVTZWN0aW9uIiwic2V0dGluZyIsInN0YXRlcyIsImdldENvbmZpZ3VyYXRpb24iLCJrZXlzIiwiayIsImluZGV4T2YiLCJmb3JFYWNoIiwicHl0aG9uU2V0dGluZ3MiLCJsaW50aW5nIiwiaWdub3JlUGF0dGVybnMiLCJBcnJheSIsImlzQXJyYXkiLCJhbmFseXNpcyIsImlkcyIsImlkYXRhIiwicmVzdGFydExhbmd1YWdlU2VydmVyIiwicmVzdGFydExhbmd1YWdlU2VydmVySWZBcnJheUNoYW5nZWQiLCJvbGRBcnJheSIsIm5ld0FycmF5IiwiaW5qZWN0YWJsZSIsImluamVjdCIsIklTZXJ2aWNlQ29udGFpbmVyIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ25GLE1BQUlDLENBQUMsR0FBR0MsU0FBUyxDQUFDQyxNQUFsQjtBQUFBLE1BQTBCQyxDQUFDLEdBQUdILENBQUMsR0FBRyxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLElBQUksS0FBSyxJQUFULEdBQWdCQSxJQUFJLEdBQUdLLE1BQU0sQ0FBQ0Msd0JBQVAsQ0FBZ0NSLE1BQWhDLEVBQXdDQyxHQUF4QyxDQUF2QixHQUFzRUMsSUFBckg7QUFBQSxNQUEySE8sQ0FBM0g7QUFDQSxNQUFJLE9BQU9DLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0IsT0FBT0EsT0FBTyxDQUFDQyxRQUFmLEtBQTRCLFVBQS9ELEVBQTJFTCxDQUFD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V0FBVyxDQUFDc08sTUFBWixDQUFtQjNOLE9BQU8sQ0FBQzROLGlCQUEzQixDQUFKLENBRm1DLENBQUQsRUFHMUN6TSxnQ0FIMEMsQ0FBN0M7QUFJQS9CLE9BQU8sQ0FBQytCLGdDQUFSLEdBQTJDQSxnQ0FBM0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbid1c2Ugc3RyaWN0JztcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCB2c2NvZGVfbGFuZ3VhZ2VjbGllbnRfMSA9IHJlcXVpcmUoXCJ2c2NvZGUtbGFuZ3VhZ2VjbGllbnRcIik7XG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9hcHBsaWNhdGlvbi90eXBlc1wiKTtcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvcmRlcmVkLWltcG9ydHNcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9jb25zdGFudHNcIik7XG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9wbGF0Zm9ybS90eXBlc1wiKTtcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL3R5cGVzXCIpO1xuY29uc3QgYXN5bmNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vdXRpbHMvYXN5bmNcIik7XG5jb25zdCBzdG9wV2F0Y2hfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vdXRpbHMvc3RvcFdhdGNoXCIpO1xuY29uc3QgdHlwZXNfNCA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vdmFyaWFibGVzL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfNSA9IHJlcXVpcmUoXCIuLi8uLi9pb2MvdHlwZXNcIik7XG5jb25zdCBzeW1ib2xQcm92aWRlcl8xID0gcmVxdWlyZShcIi4uLy4uL3Byb3ZpZGVycy9zeW1ib2xQcm92aWRlclwiKTtcbmNvbnN0IHRlbGVtZXRyeV8xID0gcmVxdWlyZShcIi4uLy4uL3RlbGVtZXRyeVwiKTtcbmNvbnN0IGNvbnN0YW50c18yID0gcmVxdWlyZShcIi4uLy4uL3RlbGVtZXRyeS9jb25zdGFudHNcIik7XG5jb25zdCB0eXBlc182ID0gcmVxdWlyZShcIi4uLy4uL3VuaXR0ZXN0cy90eXBlc1wiKTtcbmNvbnN0IGRvd25sb2FkZXJfMSA9IHJlcXVpcmUoXCIuLi9kb3dubG9hZGVyXCIpO1xuY29uc3QgaW50ZXJwcmV0ZXJEYXRhU2VydmljZV8xID0gcmVxdWlyZShcIi4uL2ludGVycHJldGVyRGF0YVNlcnZpY2VcIik7XG5jb25zdCBwbGF0Zm9ybURhdGFfMSA9IHJlcXVpcmUoXCIuLi9wbGF0Zm9ybURhdGFcIik7XG5jb25zdCBwcm9ncmVzc18xID0gcmVxdWlyZShcIi4uL3Byb2dyZXNzXCIpO1xuY29uc3QgdHlwZXNfNyA9IHJlcXVpcmUoXCIuLi90eXBlc1wiKTtcbmNvbnN0IFBZVEhPTiA9ICdweXRob24nO1xuY29uc3QgZG90TmV0Q29tbWFuZCA9ICdkb3RuZXQnO1xuY29uc3QgbGFuZ3VhZ2VDbGllbnROYW1lID0gJ1B5dGhvbiBUb29scyc7XG5jb25zdCBsb2FkRXh0ZW5zaW9uQ29tbWFuZCA9ICdweXRob24uX2xvYWRMYW5ndWFnZVNlcnZlckV4dGVuc2lvbic7XG5jb25zdCBidWlsZFN5bWJvbHNDbWREZXByZWNhdGVkSW5mbyA9IHtcbiAgICBkb05vdERpc3BsYXlQcm9tcHRTdGF0ZUtleTogJ1NIT1dfREVQUkVDQVRFRF9GRUFUVVJFX1BST01QVF9CVUlMRF9XT1JLU1BBQ0VfU1lNQk9MUycsXG4gICAgbWVzc2FnZTogJ1RoZSBjb21tYW5kIFxcJ1B5dGhvbjogQnVpbGQgV29ya3NwYWNlIFN5bWJvbHNcXCcgaXMgZGVwcmVjYXRlZCB3aGVuIHVzaW5nIHRoZSBQeXRob24gTGFuZ3VhZ2UgU2VydmVyLiBUaGUgUHl0aG9uIExhbmd1YWdlIFNlcnZlciBidWlsZHMgc3ltYm9scyBpbiB0aGUgd29ya3NwYWNlIGluIHRoZSBiYWNrZ3JvdW5kLicsXG4gICAgbW9yZUluZm9Vcmw6ICdodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L3ZzY29kZS1weXRob24vaXNzdWVzLzIyNjcjaXNzdWVjb21tZW50LTQwODk5Njg1OScsXG4gICAgY29tbWFuZHM6IFsncHl0aG9uLmJ1aWxkV29ya3NwYWNlU3ltYm9scyddXG59O1xubGV0IExhbmd1YWdlU2VydmVyRXh0ZW5zaW9uQWN0aXZhdG9yID0gY2xhc3MgTGFuZ3VhZ2VTZXJ2ZXJFeHRlbnNpb25BY3RpdmF0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VzKSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICAgICAgdGhpcy5zdyA9IG5ldyBzdG9wV2F0Y2hfMS5TdG9wV2F0Y2goKTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IFtdO1xuICAgICAgICB0aGlzLmludGVycHJldGVySGFzaCA9ICcnO1xuICAgICAgICB0aGlzLmV4Y2x1ZGVkRmlsZXMgPSBbXTtcbiAgICAgICAgdGhpcy50eXBlc2hlZFBhdGhzID0gW107XG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzMuSUV4dGVuc2lvbkNvbnRleHQpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24gPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklDb25maWd1cmF0aW9uU2VydmljZSk7XG4gICAgICAgIHRoaXMuYXBwU2hlbGwgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18xLklBcHBsaWNhdGlvblNoZWxsKTtcbiAgICAgICAgdGhpcy5vdXRwdXQgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklPdXRwdXRDaGFubmVsLCBjb25zdGFudHNfMS5TVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCk7XG4gICAgICAgIHRoaXMuZnMgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18yLklGaWxlU3lzdGVtKTtcbiAgICAgICAgdGhpcy5wbGF0Zm9ybURhdGEgPSBuZXcgcGxhdGZvcm1EYXRhXzEuUGxhdGZvcm1EYXRhKHNlcnZpY2VzLmdldCh0eXBlc18yLklQbGF0Zm9ybVNlcnZpY2UpLCB0aGlzLmZzKTtcbiAgICAgICAgdGhpcy53b3Jrc3BhY2UgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18xLklXb3Jrc3BhY2VTZXJ2aWNlKTtcbiAgICAgICAgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlclNlcnZpY2UgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc183LklMYW5ndWFnZVNlcnZlckZvbGRlclNlcnZpY2UpO1xuICAgICAgICBjb25zdCBkZXByZWNhdGlvbk1hbmFnZXIgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklGZWF0dXJlRGVwcmVjYXRpb25NYW5hZ2VyKTtcbiAgICAgICAgLy8gQ3VycmVudGx5IG9ubHkgYSBzaW5nbGUgcm9vdC4gTXVsdGktcm9vdCBzdXBwb3J0IGlzIGZ1dHVyZS5cbiAgICAgICAgdGhpcy5yb290ID0gdGhpcy53b3Jrc3BhY2UgJiYgdGhpcy53b3Jrc3BhY2UuaGFzV29ya3NwYWNlRm9sZGVyc1xuICAgICAgICAgICAgPyB0aGlzLndvcmtzcGFjZS53b3Jrc3BhY2VGb2xkZXJzWzBdLnVyaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zdGFydHVwQ29tcGxldGVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xuICAgICAgICBjb25zdCBjb21tYW5kTWFuYWdlciA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzEuSUNvbW1hbmRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5wdXNoKGNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyQ29tbWFuZChsb2FkRXh0ZW5zaW9uQ29tbWFuZCwgKGFyZ3MpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlQ2xpZW50KSB7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zdGFydHVwQ29tcGxldGVkLnByb21pc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZUNsaWVudC5zZW5kUmVxdWVzdCgncHl0aG9uL2xvYWRFeHRlbnNpb24nLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZEV4dGVuc2lvbkFyZ3MgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkpO1xuICAgICAgICBkZXByZWNhdGlvbk1hbmFnZXIucmVnaXN0ZXJEZXByZWNhdGlvbihidWlsZFN5bWJvbHNDbWREZXByZWNhdGVkSW5mbyk7XG4gICAgICAgIHRoaXMuc3VydmV5QmFubmVyID0gc2VydmljZXMuZ2V0KHR5cGVzXzMuSVB5dGhvbkV4dGVuc2lvbkJhbm5lciwgdHlwZXNfMy5CQU5ORVJfTkFNRV9MU19TVVJWRVkpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uZ2V0U2V0dGluZ3MoKS5hZGRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5vblNldHRpbmdzQ2hhbmdlZC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgYWN0aXZhdGUoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN3LnJlc2V0KCk7XG4gICAgICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyID0geWllbGQgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlclNlcnZpY2UuZ2V0TGFuZ3VhZ2VTZXJ2ZXJGb2xkZXJOYW1lKCk7XG4gICAgICAgICAgICBjb25zdCBjbGllbnRPcHRpb25zID0geWllbGQgdGhpcy5nZXRBbmFseXNpc09wdGlvbnMoKTtcbiAgICAgICAgICAgIGlmICghY2xpZW50T3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhcnR1cENvbXBsZXRlZC5wcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VtZW50U2VydmljZSA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzYuSVVuaXRUZXN0TWFuYWdlbWVudFNlcnZpY2UpO1xuICAgICAgICAgICAgICAgIHRlc3RNYW5hZ2VtZW50U2VydmljZS5hY3RpdmF0ZSgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHRlc3RNYW5hZ2VtZW50U2VydmljZS5hY3RpdmF0ZUNvZGVMZW5zZXMobmV3IHN5bWJvbFByb3ZpZGVyXzEuTGFuZ3VhZ2VTZXJ2ZXJTeW1ib2xQcm92aWRlcih0aGlzLmxhbmd1YWdlQ2xpZW50KSkpXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChleCA9PiB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklMb2dnZXIpLmxvZ0Vycm9yKCdGYWlsZWQgdG8gYWN0aXZhdGUgVW5pdCBUZXN0cycsIGV4KSk7XG4gICAgICAgICAgICB9KS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoY2xpZW50T3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VDbGllbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBEbyBub3QgYXdhaXQgb24gdGhpc1xuICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VDbGllbnQuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBkIG9mIHRoaXMuZGlzcG9zYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBkLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5nZXRTZXR0aW5ncygpLnJlbW92ZUxpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uU2V0dGluZ3NDaGFuZ2VkLmJpbmQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgc3RhcnRMYW5ndWFnZVNlcnZlcihjbGllbnRPcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgd2UgYXJlIHJ1bm5pbmcgTVNJTC9Vbml2ZXJzYWwgdmlhIGRvdG5ldCBvciBzZWxmLWNvbnRhaW5lZCBhcHAuXG4gICAgICAgICAgICB0ZWxlbWV0cnlfMS5zZW5kVGVsZW1ldHJ5RXZlbnQoY29uc3RhbnRzXzIuUFlUSE9OX0xBTkdVQUdFX1NFUlZFUl9FTkFCTEVEKTtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5jb25maWd1cmF0aW9uLmdldFNldHRpbmdzKCk7XG4gICAgICAgICAgICBpZiAoIXNldHRpbmdzLmRvd25sb2FkTGFuZ3VhZ2VTZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXBlbmRzIG9uIC5ORVQgUnVudGltZSBvciBTREsuIFR5cGljYWxseSBkZXZlbG9wbWVudC1vbmx5IGNhc2UuXG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZUNsaWVudCA9IHRoaXMuY3JlYXRlU2ltcGxlTGFuZ3VhZ2VDbGllbnQoY2xpZW50T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zdGFydExhbmd1YWdlQ2xpZW50KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtc2NvcmxpYiA9IHBhdGguam9pbih0aGlzLmNvbnRleHQuZXh0ZW5zaW9uUGF0aCwgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlciwgJ21zY29ybGliLmRsbCcpO1xuICAgICAgICAgICAgaWYgKCEoeWllbGQgdGhpcy5mcy5maWxlRXhpc3RzKG1zY29ybGliKSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZGVyID0gbmV3IGRvd25sb2FkZXJfMS5MYW5ndWFnZVNlcnZlckRvd25sb2FkZXIodGhpcy5wbGF0Zm9ybURhdGEsIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJGb2xkZXIsIHRoaXMuc2VydmljZXMpO1xuICAgICAgICAgICAgICAgIHlpZWxkIGRvd25sb2FkZXIuZG93bmxvYWRMYW5ndWFnZVNlcnZlcih0aGlzLmNvbnRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgc2VydmVyTW9kdWxlID0gcGF0aC5qb2luKHRoaXMuY29udGV4dC5leHRlbnNpb25QYXRoLCB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyLCB0aGlzLnBsYXRmb3JtRGF0YS5nZXRFbmdpbmVFeGVjdXRhYmxlTmFtZSgpKTtcbiAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VDbGllbnQgPSB0aGlzLmNyZWF0ZVNlbGZDb250YWluZWRMYW5ndWFnZUNsaWVudChzZXJ2ZXJNb2R1bGUsIGNsaWVudE9wdGlvbnMpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnN0YXJ0TGFuZ3VhZ2VDbGllbnQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxhbmd1YWdlQ2xpZW50Lm9uVGVsZW1ldHJ5KHRlbGVtZXRyeUV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnROYW1lID0gdGVsZW1ldHJ5RXZlbnQuRXZlbnROYW1lID8gdGVsZW1ldHJ5RXZlbnQuRXZlbnROYW1lIDogY29uc3RhbnRzXzIuUFlUSE9OX0xBTkdVQUdFX1NFUlZFUl9URUxFTUVUUlk7XG4gICAgICAgICAgICAgICAgICAgIHRlbGVtZXRyeV8xLnNlbmRUZWxlbWV0cnlFdmVudChldmVudE5hbWUsIHRlbGVtZXRyeUV2ZW50Lk1lYXN1cmVtZW50cywgdGVsZW1ldHJ5RXZlbnQuUHJvcGVydGllcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcFNoZWxsLnNob3dFcnJvck1lc3NhZ2UoYExhbmd1YWdlIHNlcnZlciBmYWlsZWQgdG8gc3RhcnQuIEVycm9yICR7ZXh9YCk7XG4gICAgICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGNvbnN0YW50c18yLlBZVEhPTl9MQU5HVUFHRV9TRVJWRVJfRVJST1IsIHVuZGVmaW5lZCwgeyBlcnJvcjogJ0ZhaWxlZCB0byBzdGFydCAocGxhdGZvcm0pJyB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdGFydExhbmd1YWdlQ2xpZW50KCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLmxhbmd1YWdlQ2xpZW50LnN0YXJ0KCkpO1xuICAgICAgICAgICAgeWllbGQgdGhpcy5zZXJ2ZXJSZWFkeSgpO1xuICAgICAgICAgICAgY29uc3QgZGlzcG9zYWJsZXMgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklEaXNwb3NhYmxlUmVnaXN0cnkpO1xuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3NSZXBvcnRpbmcgPSBuZXcgcHJvZ3Jlc3NfMS5Qcm9ncmVzc1JlcG9ydGluZyh0aGlzLmxhbmd1YWdlQ2xpZW50KTtcbiAgICAgICAgICAgIGRpc3Bvc2FibGVzLnB1c2gocHJvZ3Jlc3NSZXBvcnRpbmcpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2VydmVyUmVhZHkoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICB3aGlsZSAoIXRoaXMubGFuZ3VhZ2VDbGllbnQuaW5pdGlhbGl6ZVJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHlpZWxkIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmxvYWRFeHRlbnNpb25BcmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZUNsaWVudC5zZW5kUmVxdWVzdCgncHl0aG9uL2xvYWRFeHRlbnNpb24nLCB0aGlzLmxvYWRFeHRlbnNpb25BcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhcnR1cENvbXBsZXRlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjcmVhdGVTaW1wbGVMYW5ndWFnZUNsaWVudChjbGllbnRPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbW1hbmRPcHRpb25zID0geyBzdGRpbzogJ3BpcGUnIH07XG4gICAgICAgIGNvbnN0IHNlcnZlck1vZHVsZSA9IHBhdGguam9pbih0aGlzLmNvbnRleHQuZXh0ZW5zaW9uUGF0aCwgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlciwgdGhpcy5wbGF0Zm9ybURhdGEuZ2V0RW5naW5lRGxsTmFtZSgpKTtcbiAgICAgICAgY29uc3Qgc2VydmVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHJ1bjogeyBjb21tYW5kOiBkb3ROZXRDb21tYW5kLCBhcmdzOiBbc2VydmVyTW9kdWxlXSwgb3B0aW9uczogY29tbWFuZE9wdGlvbnMgfSxcbiAgICAgICAgICAgIGRlYnVnOiB7IGNvbW1hbmQ6IGRvdE5ldENvbW1hbmQsIGFyZ3M6IFtzZXJ2ZXJNb2R1bGUsICctLWRlYnVnJ10sIG9wdGlvbnM6IGNvbW1hbmRPcHRpb25zIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG5ldyB2c2NvZGVfbGFuZ3VhZ2VjbGllbnRfMS5MYW5ndWFnZUNsaWVudChQWVRIT04sIGxhbmd1YWdlQ2xpZW50TmFtZSwgc2VydmVyT3B0aW9ucywgY2xpZW50T3B0aW9ucyk7XG4gICAgfVxuICAgIGNyZWF0ZVNlbGZDb250YWluZWRMYW5ndWFnZUNsaWVudChzZXJ2ZXJNb2R1bGUsIGNsaWVudE9wdGlvbnMpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgc3RkaW86ICdwaXBlJyB9O1xuICAgICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgcnVuOiB7IGNvbW1hbmQ6IHNlcnZlck1vZHVsZSwgcmdzOiBbXSwgb3B0aW9uczogb3B0aW9ucyB9LFxuICAgICAgICAgICAgZGVidWc6IHsgY29tbWFuZDogc2VydmVyTW9kdWxlLCBhcmdzOiBbJy0tZGVidWcnXSwgb3B0aW9ucyB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBuZXcgdnNjb2RlX2xhbmd1YWdlY2xpZW50XzEuTGFuZ3VhZ2VDbGllbnQoUFlUSE9OLCBsYW5ndWFnZUNsaWVudE5hbWUsIHNlcnZlck9wdGlvbnMsIGNsaWVudE9wdGlvbnMpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWVtYmVyLW9yZGVyaW5nXG4gICAgZ2V0QW5hbHlzaXNPcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIGxldCBpbnRlcnByZXRlckRhdGE7XG4gICAgICAgICAgICBsZXQgcHl0aG9uUGF0aCA9ICcnO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlckRhdGFTZXJ2aWNlID0gbmV3IGludGVycHJldGVyRGF0YVNlcnZpY2VfMS5JbnRlcnByZXRlckRhdGFTZXJ2aWNlKHRoaXMuY29udGV4dCwgdGhpcy5zZXJ2aWNlcyk7XG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXJEYXRhID0geWllbGQgaW50ZXJwcmV0ZXJEYXRhU2VydmljZS5nZXRJbnRlcnByZXRlckRhdGEoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwU2hlbGwuc2hvd1dhcm5pbmdNZXNzYWdlKCdVbmFibGUgdG8gZGV0ZXJtaW5lIHBhdGggdG8gdGhlIFB5dGhvbiBpbnRlcnByZXRlci4gSW50ZWxsaVNlbnNlIHdpbGwgYmUgbGltaXRlZC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXJIYXNoID0gaW50ZXJwcmV0ZXJEYXRhID8gaW50ZXJwcmV0ZXJEYXRhLmhhc2ggOiAnJztcbiAgICAgICAgICAgIGlmIChpbnRlcnByZXRlckRhdGEpIHtcbiAgICAgICAgICAgICAgICBweXRob25QYXRoID0gcGF0aC5kaXJuYW1lKGludGVycHJldGVyRGF0YS5wYXRoKTtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tc3RyaW5nLWxpdGVyYWxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzWydJbnRlcnByZXRlclBhdGgnXSA9IGludGVycHJldGVyRGF0YS5wYXRoO1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdHJpbmctbGl0ZXJhbFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXNbJ1ZlcnNpb24nXSA9IGludGVycHJldGVyRGF0YS52ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXN0cmluZy1saXRlcmFsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzWydEYXRhYmFzZVBhdGgnXSA9IHBhdGguam9pbih0aGlzLmNvbnRleHQuZXh0ZW5zaW9uUGF0aCwgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlcik7XG4gICAgICAgICAgICBsZXQgc2VhcmNoUGF0aHMgPSBpbnRlcnByZXRlckRhdGEgPyBpbnRlcnByZXRlckRhdGEuc2VhcmNoUGF0aHMuc3BsaXQocGF0aC5kZWxpbWl0ZXIpIDogW107XG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuY29uZmlndXJhdGlvbi5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmF1dG9Db21wbGV0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4dHJhUGF0aHMgPSBzZXR0aW5ncy5hdXRvQ29tcGxldGUuZXh0cmFQYXRocztcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmFQYXRocyAmJiBleHRyYVBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoUGF0aHMucHVzaCguLi5leHRyYVBhdGhzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBlbnZWYXJzUHJvdmlkZXIgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc180LklFbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyKTtcbiAgICAgICAgICAgIGNvbnN0IHZhcnMgPSB5aWVsZCBlbnZWYXJzUHJvdmlkZXIuZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXMoKTtcbiAgICAgICAgICAgIGlmICh2YXJzLlBZVEhPTlBBVEggJiYgdmFycy5QWVRIT05QQVRILmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoVXRpbHMgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklQYXRoVXRpbHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGhzID0gdmFycy5QWVRIT05QQVRILnNwbGl0KHBhdGhVdGlscy5kZWxpbWl0ZXIpLmZpbHRlcihpdGVtID0+IGl0ZW0udHJpbSgpLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgICAgIHNlYXJjaFBhdGhzLnB1c2goLi4ucGF0aHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHBhdGhzIGRvIG5vdCBjb250YWluIG11bHRpcGxlIHNsYXNoZXMgc28gZmlsZSBVUklzXG4gICAgICAgICAgICAvLyBpbiBWUyBDb2RlIChOb2RlLmpzKSBhbmQgaW4gdGhlIGxhbmd1YWdlIHNlcnZlciAoLk5FVCkgbWF0Y2guXG4gICAgICAgICAgICAvLyBOb3RlOiBmb3IgdGhlIGxhbmd1YWdlIHNlcnZlciBwYXRocyBzZXBhcmF0b3IgaXMgYWx3YXlzIDtcbiAgICAgICAgICAgIHNlYXJjaFBhdGhzLnB1c2gocHl0aG9uUGF0aCk7XG4gICAgICAgICAgICBzZWFyY2hQYXRocyA9IHNlYXJjaFBhdGhzLm1hcChwID0+IHBhdGgubm9ybWFsaXplKHApKTtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gW3sgbGFuZ3VhZ2U6IFBZVEhPTiwgc2NoZW1lOiAnZmlsZScgfV07XG4gICAgICAgICAgICB0aGlzLmV4Y2x1ZGVkRmlsZXMgPSB0aGlzLmdldEV4Y2x1ZGVkRmlsZXMoKTtcbiAgICAgICAgICAgIHRoaXMudHlwZXNoZWRQYXRocyA9IHRoaXMuZ2V0VHlwZXNoZWRQYXRocyhzZXR0aW5ncyk7XG4gICAgICAgICAgICAvLyBPcHRpb25zIHRvIGNvbnRyb2wgdGhlIGxhbmd1YWdlIGNsaWVudFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgc2VydmVyIGZvciBQeXRob24gZG9jdW1lbnRzXG4gICAgICAgICAgICAgICAgZG9jdW1lbnRTZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgc3luY2hyb25pemU6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhdGlvblNlY3Rpb246IFBZVEhPTlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3V0cHV0Q2hhbm5lbDogdGhpcy5vdXRwdXQsXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25PcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmZXJyZWRGb3JtYXQ6ICdtYXJrZG93bicsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmltRG9jdW1lbnRhdGlvbkxpbmVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heERvY3VtZW50YXRpb25MaW5lTGVuZ3RoOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJpbURvY3VtZW50YXRpb25UZXh0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heERvY3VtZW50YXRpb25UZXh0TGVuZ3RoOiAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFBhdGhzLFxuICAgICAgICAgICAgICAgICAgICB0eXBlU3R1YlNlYXJjaFBhdGhzOiB0aGlzLnR5cGVzaGVkUGF0aHMsXG4gICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVGaWxlczogdGhpcy5leGNsdWRlZEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICB0ZXN0RW52aXJvbm1lbnQ6IGNvbnN0YW50c18xLmlzVGVzdEV4ZWN1dGlvbigpLFxuICAgICAgICAgICAgICAgICAgICBhbmFseXNpc1VwZGF0ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHRyYWNlTG9nZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmNTdGFydHVwOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtaWRkbGV3YXJlOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVDb21wbGV0aW9uSXRlbTogKGRvY3VtZW50LCBwb3NpdGlvbiwgY29udGV4dCwgdG9rZW4sIG5leHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN1cnZleUJhbm5lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3VydmV5QmFubmVyLnNob3dCYW5uZXIoKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXh0KGRvY3VtZW50LCBwb3NpdGlvbiwgY29udGV4dCwgdG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldEV4Y2x1ZGVkRmlsZXMoKSB7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBbJyoqL0xpYi8qKicsICcqKi9zaXRlLXBhY2thZ2VzLyoqJ107XG4gICAgICAgIHRoaXMuZ2V0VnNDb2RlRXhjbHVkZVNlY3Rpb24oJ3NlYXJjaC5leGNsdWRlJywgbGlzdCk7XG4gICAgICAgIHRoaXMuZ2V0VnNDb2RlRXhjbHVkZVNlY3Rpb24oJ2ZpbGVzLmV4Y2x1ZGUnLCBsaXN0KTtcbiAgICAgICAgdGhpcy5nZXRWc0NvZGVFeGNsdWRlU2VjdGlvbignZmlsZXMud2F0Y2hlckV4Y2x1ZGUnLCBsaXN0KTtcbiAgICAgICAgdGhpcy5nZXRQeXRob25FeGNsdWRlU2VjdGlvbihsaXN0KTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGdldFZzQ29kZUV4Y2x1ZGVTZWN0aW9uKHNldHRpbmcsIGxpc3QpIHtcbiAgICAgICAgY29uc3Qgc3RhdGVzID0gdGhpcy53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbihzZXR0aW5nLCB0aGlzLnJvb3QpO1xuICAgICAgICBpZiAoc3RhdGVzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihrID0+IChrLmluZGV4T2YoJyonKSA+PSAwIHx8IGsuaW5kZXhPZignLycpID49IDApICYmIHN0YXRlc1trXSlcbiAgICAgICAgICAgICAgICAuZm9yRWFjaChwID0+IGxpc3QucHVzaChwKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0UHl0aG9uRXhjbHVkZVNlY3Rpb24obGlzdCkge1xuICAgICAgICBjb25zdCBweXRob25TZXR0aW5ncyA9IHRoaXMuY29uZmlndXJhdGlvbi5nZXRTZXR0aW5ncyh0aGlzLnJvb3QpO1xuICAgICAgICBjb25zdCBwYXRocyA9IHB5dGhvblNldHRpbmdzICYmIHB5dGhvblNldHRpbmdzLmxpbnRpbmcgPyBweXRob25TZXR0aW5ncy5saW50aW5nLmlnbm9yZVBhdHRlcm5zIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAocGF0aHMgJiYgQXJyYXkuaXNBcnJheShwYXRocykpIHtcbiAgICAgICAgICAgIHBhdGhzXG4gICAgICAgICAgICAgICAgLmZpbHRlcihwID0+IHAgJiYgcC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5mb3JFYWNoKHAgPT4gbGlzdC5wdXNoKHApKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXRUeXBlc2hlZFBhdGhzKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncy5hbmFseXNpcy50eXBlc2hlZFBhdGhzICYmIHNldHRpbmdzLmFuYWx5c2lzLnR5cGVzaGVkUGF0aHMubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyBzZXR0aW5ncy5hbmFseXNpcy50eXBlc2hlZFBhdGhzXG4gICAgICAgICAgICA6IFtwYXRoLmpvaW4odGhpcy5jb250ZXh0LmV4dGVuc2lvblBhdGgsIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJGb2xkZXIsICdUeXBlc2hlZCcpXTtcbiAgICB9XG4gICAgb25TZXR0aW5nc0NoYW5nZWQoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBpZHMgPSBuZXcgaW50ZXJwcmV0ZXJEYXRhU2VydmljZV8xLkludGVycHJldGVyRGF0YVNlcnZpY2UodGhpcy5jb250ZXh0LCB0aGlzLnNlcnZpY2VzKTtcbiAgICAgICAgICAgIGNvbnN0IGlkYXRhID0geWllbGQgaWRzLmdldEludGVycHJldGVyRGF0YSgpO1xuICAgICAgICAgICAgaWYgKCFpZGF0YSB8fCBpZGF0YS5oYXNoICE9PSB0aGlzLmludGVycHJldGVySGFzaCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXJIYXNoID0gaWRhdGEgPyBpZGF0YS5oYXNoIDogJyc7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlZEZpbGVzID0gdGhpcy5nZXRFeGNsdWRlZEZpbGVzKCk7XG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcklmQXJyYXlDaGFuZ2VkKHRoaXMuZXhjbHVkZWRGaWxlcywgZXhjbHVkZWRGaWxlcyk7XG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuY29uZmlndXJhdGlvbi5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY29uc3QgdHlwZXNoZWRQYXRocyA9IHRoaXMuZ2V0VHlwZXNoZWRQYXRocyhzZXR0aW5ncyk7XG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcklmQXJyYXlDaGFuZ2VkKHRoaXMudHlwZXNoZWRQYXRocywgdHlwZXNoZWRQYXRocyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXJJZkFycmF5Q2hhbmdlZChvbGRBcnJheSwgbmV3QXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmIChuZXdBcnJheS5sZW5ndGggIT09IG9sZEFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVyKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvbGRBcnJheS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChvbGRBcnJheVtpXSAhPT0gbmV3QXJyYXlbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlc3RhcnRMYW5ndWFnZVNlcnZlcigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeWllbGQgdGhpcy5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB5aWVsZCB0aGlzLmFjdGl2YXRlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5MYW5ndWFnZVNlcnZlckV4dGVuc2lvbkFjdGl2YXRvciA9IF9fZGVjb3JhdGUoW1xuICAgIGludmVyc2lmeV8xLmluamVjdGFibGUoKSxcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc181LklTZXJ2aWNlQ29udGFpbmVyKSlcbl0sIExhbmd1YWdlU2VydmVyRXh0ZW5zaW9uQWN0aXZhdG9yKTtcbmV4cG9ydHMuTGFuZ3VhZ2VTZXJ2ZXJFeHRlbnNpb25BY3RpdmF0b3IgPSBMYW5ndWFnZVNlcnZlckV4dGVuc2lvbkFjdGl2YXRvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxhbmd1YWdlU2VydmVyLmpzLm1hcCJdfQ==