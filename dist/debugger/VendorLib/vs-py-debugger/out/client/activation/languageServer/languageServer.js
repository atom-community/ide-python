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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxhbmd1YWdlU2VydmVyLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIl9fcGFyYW0iLCJwYXJhbUluZGV4IiwiZGVjb3JhdG9yIiwiX19hd2FpdGVyIiwidGhpc0FyZyIsIl9hcmd1bWVudHMiLCJQIiwiZ2VuZXJhdG9yIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJ2YWx1ZSIsInN0ZXAiLCJuZXh0IiwiZSIsInJlamVjdGVkIiwicmVzdWx0IiwiZG9uZSIsInRoZW4iLCJhcHBseSIsImV4cG9ydHMiLCJpbnZlcnNpZnlfMSIsInJlcXVpcmUiLCJwYXRoIiwidnNjb2RlX2xhbmd1YWdlY2xpZW50XzEiLCJ0eXBlc18xIiwiY29uc3RhbnRzXzEiLCJ0eXBlc18yIiwidHlwZXNfMyIsImFzeW5jXzEiLCJzdG9wV2F0Y2hfMSIsInR5cGVzXzQiLCJ0eXBlc181Iiwic3ltYm9sUHJvdmlkZXJfMSIsInRlbGVtZXRyeV8xIiwiY29uc3RhbnRzXzIiLCJ0eXBlc182IiwiZG93bmxvYWRlcl8xIiwiaW50ZXJwcmV0ZXJEYXRhU2VydmljZV8xIiwicGxhdGZvcm1EYXRhXzEiLCJwcm9ncmVzc18xIiwidHlwZXNfNyIsIlBZVEhPTiIsImRvdE5ldENvbW1hbmQiLCJsYW5ndWFnZUNsaWVudE5hbWUiLCJsb2FkRXh0ZW5zaW9uQ29tbWFuZCIsImJ1aWxkU3ltYm9sc0NtZERlcHJlY2F0ZWRJbmZvIiwiZG9Ob3REaXNwbGF5UHJvbXB0U3RhdGVLZXkiLCJtZXNzYWdlIiwibW9yZUluZm9VcmwiLCJjb21tYW5kcyIsIkxhbmd1YWdlU2VydmVyRXh0ZW5zaW9uQWN0aXZhdG9yIiwiY29uc3RydWN0b3IiLCJzZXJ2aWNlcyIsInN3IiwiU3RvcFdhdGNoIiwiZGlzcG9zYWJsZXMiLCJpbnRlcnByZXRlckhhc2giLCJleGNsdWRlZEZpbGVzIiwidHlwZXNoZWRQYXRocyIsImNvbnRleHQiLCJnZXQiLCJJRXh0ZW5zaW9uQ29udGV4dCIsImNvbmZpZ3VyYXRpb24iLCJJQ29uZmlndXJhdGlvblNlcnZpY2UiLCJhcHBTaGVsbCIsIklBcHBsaWNhdGlvblNoZWxsIiwib3V0cHV0IiwiSU91dHB1dENoYW5uZWwiLCJTVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCIsImZzIiwiSUZpbGVTeXN0ZW0iLCJwbGF0Zm9ybURhdGEiLCJQbGF0Zm9ybURhdGEiLCJJUGxhdGZvcm1TZXJ2aWNlIiwid29ya3NwYWNlIiwiSVdvcmtzcGFjZVNlcnZpY2UiLCJsYW5ndWFnZVNlcnZlckZvbGRlclNlcnZpY2UiLCJJTGFuZ3VhZ2VTZXJ2ZXJGb2xkZXJTZXJ2aWNlIiwiZGVwcmVjYXRpb25NYW5hZ2VyIiwiSUZlYXR1cmVEZXByZWNhdGlvbk1hbmFnZXIiLCJyb290IiwiaGFzV29ya3NwYWNlRm9sZGVycyIsIndvcmtzcGFjZUZvbGRlcnMiLCJ1cmkiLCJ1bmRlZmluZWQiLCJzdGFydHVwQ29tcGxldGVkIiwiY3JlYXRlRGVmZXJyZWQiLCJjb21tYW5kTWFuYWdlciIsIklDb21tYW5kTWFuYWdlciIsInB1c2giLCJyZWdpc3RlckNvbW1hbmQiLCJhcmdzIiwibGFuZ3VhZ2VDbGllbnQiLCJwcm9taXNlIiwic2VuZFJlcXVlc3QiLCJsb2FkRXh0ZW5zaW9uQXJncyIsInJlZ2lzdGVyRGVwcmVjYXRpb24iLCJzdXJ2ZXlCYW5uZXIiLCJJUHl0aG9uRXh0ZW5zaW9uQmFubmVyIiwiQkFOTkVSX05BTUVfTFNfU1VSVkVZIiwiZ2V0U2V0dGluZ3MiLCJhZGRMaXN0ZW5lciIsIm9uU2V0dGluZ3NDaGFuZ2VkIiwiYmluZCIsImFjdGl2YXRlIiwicmVzZXQiLCJsYW5ndWFnZVNlcnZlckZvbGRlciIsImdldExhbmd1YWdlU2VydmVyRm9sZGVyTmFtZSIsImNsaWVudE9wdGlvbnMiLCJnZXRBbmFseXNpc09wdGlvbnMiLCJ0ZXN0TWFuYWdlbWVudFNlcnZpY2UiLCJJVW5pdFRlc3RNYW5hZ2VtZW50U2VydmljZSIsImFjdGl2YXRlQ29kZUxlbnNlcyIsIkxhbmd1YWdlU2VydmVyU3ltYm9sUHJvdmlkZXIiLCJjYXRjaCIsImV4IiwiSUxvZ2dlciIsImxvZ0Vycm9yIiwiaWdub3JlRXJyb3JzIiwic3RhcnRMYW5ndWFnZVNlcnZlciIsImRlYWN0aXZhdGUiLCJzdG9wIiwiZGlzcG9zZSIsInJlbW92ZUxpc3RlbmVyIiwic2VuZFRlbGVtZXRyeUV2ZW50IiwiUFlUSE9OX0xBTkdVQUdFX1NFUlZFUl9FTkFCTEVEIiwic2V0dGluZ3MiLCJkb3dubG9hZExhbmd1YWdlU2VydmVyIiwiY3JlYXRlU2ltcGxlTGFuZ3VhZ2VDbGllbnQiLCJzdGFydExhbmd1YWdlQ2xpZW50IiwibXNjb3JsaWIiLCJqb2luIiwiZXh0ZW5zaW9uUGF0aCIsImZpbGVFeGlzdHMiLCJkb3dubG9hZGVyIiwiTGFuZ3VhZ2VTZXJ2ZXJEb3dubG9hZGVyIiwic2VydmVyTW9kdWxlIiwiZ2V0RW5naW5lRXhlY3V0YWJsZU5hbWUiLCJjcmVhdGVTZWxmQ29udGFpbmVkTGFuZ3VhZ2VDbGllbnQiLCJvblRlbGVtZXRyeSIsInRlbGVtZXRyeUV2ZW50IiwiZXZlbnROYW1lIiwiRXZlbnROYW1lIiwiUFlUSE9OX0xBTkdVQUdFX1NFUlZFUl9URUxFTUVUUlkiLCJNZWFzdXJlbWVudHMiLCJQcm9wZXJ0aWVzIiwic2hvd0Vycm9yTWVzc2FnZSIsIlBZVEhPTl9MQU5HVUFHRV9TRVJWRVJfRVJST1IiLCJlcnJvciIsInN1YnNjcmlwdGlvbnMiLCJzdGFydCIsInNlcnZlclJlYWR5IiwiSURpc3Bvc2FibGVSZWdpc3RyeSIsInByb2dyZXNzUmVwb3J0aW5nIiwiUHJvZ3Jlc3NSZXBvcnRpbmciLCJpbml0aWFsaXplUmVzdWx0Iiwic2V0VGltZW91dCIsImNvbW1hbmRPcHRpb25zIiwic3RkaW8iLCJnZXRFbmdpbmVEbGxOYW1lIiwic2VydmVyT3B0aW9ucyIsInJ1biIsImNvbW1hbmQiLCJvcHRpb25zIiwiZGVidWciLCJMYW5ndWFnZUNsaWVudCIsInJncyIsInByb3BlcnRpZXMiLCJNYXAiLCJpbnRlcnByZXRlckRhdGEiLCJweXRob25QYXRoIiwiaW50ZXJwcmV0ZXJEYXRhU2VydmljZSIsIkludGVycHJldGVyRGF0YVNlcnZpY2UiLCJnZXRJbnRlcnByZXRlckRhdGEiLCJzaG93V2FybmluZ01lc3NhZ2UiLCJoYXNoIiwiZGlybmFtZSIsInZlcnNpb24iLCJzZWFyY2hQYXRocyIsInNwbGl0IiwiZGVsaW1pdGVyIiwiYXV0b0NvbXBsZXRlIiwiZXh0cmFQYXRocyIsImVudlZhcnNQcm92aWRlciIsIklFbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyIiwidmFycyIsImdldEVudmlyb25tZW50VmFyaWFibGVzIiwiUFlUSE9OUEFUSCIsInBhdGhVdGlscyIsIklQYXRoVXRpbHMiLCJwYXRocyIsImZpbHRlciIsIml0ZW0iLCJ0cmltIiwibWFwIiwicCIsIm5vcm1hbGl6ZSIsInNlbGVjdG9yIiwibGFuZ3VhZ2UiLCJzY2hlbWUiLCJnZXRFeGNsdWRlZEZpbGVzIiwiZ2V0VHlwZXNoZWRQYXRocyIsImRvY3VtZW50U2VsZWN0b3IiLCJzeW5jaHJvbml6ZSIsImNvbmZpZ3VyYXRpb25TZWN0aW9uIiwib3V0cHV0Q2hhbm5lbCIsImluaXRpYWxpemF0aW9uT3B0aW9ucyIsImludGVycHJldGVyIiwiZGlzcGxheU9wdGlvbnMiLCJwcmVmZXJyZWRGb3JtYXQiLCJ0cmltRG9jdW1lbnRhdGlvbkxpbmVzIiwibWF4RG9jdW1lbnRhdGlvbkxpbmVMZW5ndGgiLCJ0cmltRG9jdW1lbnRhdGlvblRleHQiLCJtYXhEb2N1bWVudGF0aW9uVGV4dExlbmd0aCIsInR5cGVTdHViU2VhcmNoUGF0aHMiLCJleGNsdWRlRmlsZXMiLCJ0ZXN0RW52aXJvbm1lbnQiLCJpc1Rlc3RFeGVjdXRpb24iLCJhbmFseXNpc1VwZGF0ZXMiLCJ0cmFjZUxvZ2dpbmciLCJhc3luY1N0YXJ0dXAiLCJtaWRkbGV3YXJlIiwicHJvdmlkZUNvbXBsZXRpb25JdGVtIiwiZG9jdW1lbnQiLCJwb3NpdGlvbiIsInRva2VuIiwic2hvd0Jhbm5lciIsImxpc3QiLCJnZXRWc0NvZGVFeGNsdWRlU2VjdGlvbiIsImdldFB5dGhvbkV4Y2x1ZGVTZWN0aW9uIiwic2V0dGluZyIsInN0YXRlcyIsImdldENvbmZpZ3VyYXRpb24iLCJrZXlzIiwiayIsImluZGV4T2YiLCJmb3JFYWNoIiwicHl0aG9uU2V0dGluZ3MiLCJsaW50aW5nIiwiaWdub3JlUGF0dGVybnMiLCJBcnJheSIsImlzQXJyYXkiLCJhbmFseXNpcyIsImlkcyIsImlkYXRhIiwicmVzdGFydExhbmd1YWdlU2VydmVyIiwicmVzdGFydExhbmd1YWdlU2VydmVySWZBcnJheUNoYW5nZWQiLCJvbGRBcnJheSIsIm5ld0FycmF5IiwiaW5qZWN0YWJsZSIsImluamVjdCIsIklTZXJ2aWNlQ29udGFpbmVyIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ25GLE1BQUlDLENBQUMsR0FBR0MsU0FBUyxDQUFDQyxNQUFsQjtBQUFBLE1BQTBCQyxDQUFDLEdBQUdILENBQUMsR0FBRyxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLElBQUksS0FBSyxJQUFULEdBQWdCQSxJQUFJLEdBQUdLLE1BQU0sQ0FBQ0Msd0JBQVAsQ0FBZ0NSLE1BQWhDLEVBQXdDQyxHQUF4QyxDQUF2QixHQUFzRUMsSUFBckg7QUFBQSxNQUEySE8sQ0FBM0g7QUFDQSxNQUFJLE9BQU9DLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0IsT0FBT0EsT0FBTyxDQUFDQyxRQUFmLEtBQTRCLFVBQS9ELEVBQTJFTCxDQUFD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V0FBVyxDQUFDc08sTUFBWixDQUFtQjNOLE9BQU8sQ0FBQzROLGlCQUEzQixDQUFKLENBRm1DLENBQUQsRUFHMUN6TSxnQ0FIMEMsQ0FBN0M7QUFJQS9CLE9BQU8sQ0FBQytCLGdDQUFSLEdBQTJDQSxnQ0FBM0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufTtcclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuY29uc3QgdnNjb2RlX2xhbmd1YWdlY2xpZW50XzEgPSByZXF1aXJlKFwidnNjb2RlLWxhbmd1YWdlY2xpZW50XCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9hcHBsaWNhdGlvbi90eXBlc1wiKTtcclxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9yZGVyZWQtaW1wb3J0c1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vY29uc3RhbnRzXCIpO1xyXG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9wbGF0Zm9ybS90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IGFzeW5jXzEgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL3V0aWxzL2FzeW5jXCIpO1xyXG5jb25zdCBzdG9wV2F0Y2hfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vdXRpbHMvc3RvcFdhdGNoXCIpO1xyXG5jb25zdCB0eXBlc180ID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi92YXJpYWJsZXMvdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzUgPSByZXF1aXJlKFwiLi4vLi4vaW9jL3R5cGVzXCIpO1xyXG5jb25zdCBzeW1ib2xQcm92aWRlcl8xID0gcmVxdWlyZShcIi4uLy4uL3Byb3ZpZGVycy9zeW1ib2xQcm92aWRlclwiKTtcclxuY29uc3QgdGVsZW1ldHJ5XzEgPSByZXF1aXJlKFwiLi4vLi4vdGVsZW1ldHJ5XCIpO1xyXG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuLi8uLi90ZWxlbWV0cnkvY29uc3RhbnRzXCIpO1xyXG5jb25zdCB0eXBlc182ID0gcmVxdWlyZShcIi4uLy4uL3VuaXR0ZXN0cy90eXBlc1wiKTtcclxuY29uc3QgZG93bmxvYWRlcl8xID0gcmVxdWlyZShcIi4uL2Rvd25sb2FkZXJcIik7XHJcbmNvbnN0IGludGVycHJldGVyRGF0YVNlcnZpY2VfMSA9IHJlcXVpcmUoXCIuLi9pbnRlcnByZXRlckRhdGFTZXJ2aWNlXCIpO1xyXG5jb25zdCBwbGF0Zm9ybURhdGFfMSA9IHJlcXVpcmUoXCIuLi9wbGF0Zm9ybURhdGFcIik7XHJcbmNvbnN0IHByb2dyZXNzXzEgPSByZXF1aXJlKFwiLi4vcHJvZ3Jlc3NcIik7XHJcbmNvbnN0IHR5cGVzXzcgPSByZXF1aXJlKFwiLi4vdHlwZXNcIik7XHJcbmNvbnN0IFBZVEhPTiA9ICdweXRob24nO1xyXG5jb25zdCBkb3ROZXRDb21tYW5kID0gJ2RvdG5ldCc7XHJcbmNvbnN0IGxhbmd1YWdlQ2xpZW50TmFtZSA9ICdQeXRob24gVG9vbHMnO1xyXG5jb25zdCBsb2FkRXh0ZW5zaW9uQ29tbWFuZCA9ICdweXRob24uX2xvYWRMYW5ndWFnZVNlcnZlckV4dGVuc2lvbic7XHJcbmNvbnN0IGJ1aWxkU3ltYm9sc0NtZERlcHJlY2F0ZWRJbmZvID0ge1xyXG4gICAgZG9Ob3REaXNwbGF5UHJvbXB0U3RhdGVLZXk6ICdTSE9XX0RFUFJFQ0FURURfRkVBVFVSRV9QUk9NUFRfQlVJTERfV09SS1NQQUNFX1NZTUJPTFMnLFxyXG4gICAgbWVzc2FnZTogJ1RoZSBjb21tYW5kIFxcJ1B5dGhvbjogQnVpbGQgV29ya3NwYWNlIFN5bWJvbHNcXCcgaXMgZGVwcmVjYXRlZCB3aGVuIHVzaW5nIHRoZSBQeXRob24gTGFuZ3VhZ2UgU2VydmVyLiBUaGUgUHl0aG9uIExhbmd1YWdlIFNlcnZlciBidWlsZHMgc3ltYm9scyBpbiB0aGUgd29ya3NwYWNlIGluIHRoZSBiYWNrZ3JvdW5kLicsXHJcbiAgICBtb3JlSW5mb1VybDogJ2h0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvdnNjb2RlLXB5dGhvbi9pc3N1ZXMvMjI2NyNpc3N1ZWNvbW1lbnQtNDA4OTk2ODU5JyxcclxuICAgIGNvbW1hbmRzOiBbJ3B5dGhvbi5idWlsZFdvcmtzcGFjZVN5bWJvbHMnXVxyXG59O1xyXG5sZXQgTGFuZ3VhZ2VTZXJ2ZXJFeHRlbnNpb25BY3RpdmF0b3IgPSBjbGFzcyBMYW5ndWFnZVNlcnZlckV4dGVuc2lvbkFjdGl2YXRvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlcykge1xyXG4gICAgICAgIHRoaXMuc2VydmljZXMgPSBzZXJ2aWNlcztcclxuICAgICAgICB0aGlzLnN3ID0gbmV3IHN0b3BXYXRjaF8xLlN0b3BXYXRjaCgpO1xyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMgPSBbXTtcclxuICAgICAgICB0aGlzLmludGVycHJldGVySGFzaCA9ICcnO1xyXG4gICAgICAgIHRoaXMuZXhjbHVkZWRGaWxlcyA9IFtdO1xyXG4gICAgICAgIHRoaXMudHlwZXNoZWRQYXRocyA9IFtdO1xyXG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzMuSUV4dGVuc2lvbkNvbnRleHQpO1xyXG4gICAgICAgIHRoaXMuY29uZmlndXJhdGlvbiA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzMuSUNvbmZpZ3VyYXRpb25TZXJ2aWNlKTtcclxuICAgICAgICB0aGlzLmFwcFNoZWxsID0gdGhpcy5zZXJ2aWNlcy5nZXQodHlwZXNfMS5JQXBwbGljYXRpb25TaGVsbCk7XHJcbiAgICAgICAgdGhpcy5vdXRwdXQgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklPdXRwdXRDaGFubmVsLCBjb25zdGFudHNfMS5TVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCk7XHJcbiAgICAgICAgdGhpcy5mcyA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzIuSUZpbGVTeXN0ZW0pO1xyXG4gICAgICAgIHRoaXMucGxhdGZvcm1EYXRhID0gbmV3IHBsYXRmb3JtRGF0YV8xLlBsYXRmb3JtRGF0YShzZXJ2aWNlcy5nZXQodHlwZXNfMi5JUGxhdGZvcm1TZXJ2aWNlKSwgdGhpcy5mcyk7XHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2UgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18xLklXb3Jrc3BhY2VTZXJ2aWNlKTtcclxuICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyU2VydmljZSA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzcuSUxhbmd1YWdlU2VydmVyRm9sZGVyU2VydmljZSk7XHJcbiAgICAgICAgY29uc3QgZGVwcmVjYXRpb25NYW5hZ2VyID0gdGhpcy5zZXJ2aWNlcy5nZXQodHlwZXNfMy5JRmVhdHVyZURlcHJlY2F0aW9uTWFuYWdlcik7XHJcbiAgICAgICAgLy8gQ3VycmVudGx5IG9ubHkgYSBzaW5nbGUgcm9vdC4gTXVsdGktcm9vdCBzdXBwb3J0IGlzIGZ1dHVyZS5cclxuICAgICAgICB0aGlzLnJvb3QgPSB0aGlzLndvcmtzcGFjZSAmJiB0aGlzLndvcmtzcGFjZS5oYXNXb3Jrc3BhY2VGb2xkZXJzXHJcbiAgICAgICAgICAgID8gdGhpcy53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgdGhpcy5zdGFydHVwQ29tcGxldGVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmRNYW5hZ2VyID0gdGhpcy5zZXJ2aWNlcy5nZXQodHlwZXNfMS5JQ29tbWFuZE1hbmFnZXIpO1xyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMucHVzaChjb21tYW5kTWFuYWdlci5yZWdpc3RlckNvbW1hbmQobG9hZEV4dGVuc2lvbkNvbW1hbmQsIChhcmdzKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlQ2xpZW50KSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnN0YXJ0dXBDb21wbGV0ZWQucHJvbWlzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VDbGllbnQuc2VuZFJlcXVlc3QoJ3B5dGhvbi9sb2FkRXh0ZW5zaW9uJywgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRFeHRlbnNpb25BcmdzID0gYXJncztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pKSk7XHJcbiAgICAgICAgZGVwcmVjYXRpb25NYW5hZ2VyLnJlZ2lzdGVyRGVwcmVjYXRpb24oYnVpbGRTeW1ib2xzQ21kRGVwcmVjYXRlZEluZm8pO1xyXG4gICAgICAgIHRoaXMuc3VydmV5QmFubmVyID0gc2VydmljZXMuZ2V0KHR5cGVzXzMuSVB5dGhvbkV4dGVuc2lvbkJhbm5lciwgdHlwZXNfMy5CQU5ORVJfTkFNRV9MU19TVVJWRVkpO1xyXG4gICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5nZXRTZXR0aW5ncygpLmFkZExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uU2V0dGluZ3NDaGFuZ2VkLmJpbmQodGhpcykpO1xyXG4gICAgfVxyXG4gICAgYWN0aXZhdGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgdGhpcy5zdy5yZXNldCgpO1xyXG4gICAgICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyID0geWllbGQgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlclNlcnZpY2UuZ2V0TGFuZ3VhZ2VTZXJ2ZXJGb2xkZXJOYW1lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudE9wdGlvbnMgPSB5aWVsZCB0aGlzLmdldEFuYWx5c2lzT3B0aW9ucygpO1xyXG4gICAgICAgICAgICBpZiAoIWNsaWVudE9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnN0YXJ0dXBDb21wbGV0ZWQucHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VtZW50U2VydmljZSA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzYuSVVuaXRUZXN0TWFuYWdlbWVudFNlcnZpY2UpO1xyXG4gICAgICAgICAgICAgICAgdGVzdE1hbmFnZW1lbnRTZXJ2aWNlLmFjdGl2YXRlKClcclxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB0ZXN0TWFuYWdlbWVudFNlcnZpY2UuYWN0aXZhdGVDb2RlTGVuc2VzKG5ldyBzeW1ib2xQcm92aWRlcl8xLkxhbmd1YWdlU2VydmVyU3ltYm9sUHJvdmlkZXIodGhpcy5sYW5ndWFnZUNsaWVudCkpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChleCA9PiB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklMb2dnZXIpLmxvZ0Vycm9yKCdGYWlsZWQgdG8gYWN0aXZhdGUgVW5pdCBUZXN0cycsIGV4KSk7XHJcbiAgICAgICAgICAgIH0pLmlnbm9yZUVycm9ycygpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGFydExhbmd1YWdlU2VydmVyKGNsaWVudE9wdGlvbnMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZGVhY3RpdmF0ZSgpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sYW5ndWFnZUNsaWVudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gRG8gbm90IGF3YWl0IG9uIHRoaXNcclxuICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VDbGllbnQuc3RvcCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZCBvZiB0aGlzLmRpc3Bvc2FibGVzKSB7XHJcbiAgICAgICAgICAgICAgICBkLmRpc3Bvc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uZ2V0U2V0dGluZ3MoKS5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5vblNldHRpbmdzQ2hhbmdlZC5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoY2xpZW50T3B0aW9ucykge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIC8vIERldGVybWluZSBpZiB3ZSBhcmUgcnVubmluZyBNU0lML1VuaXZlcnNhbCB2aWEgZG90bmV0IG9yIHNlbGYtY29udGFpbmVkIGFwcC5cclxuICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGNvbnN0YW50c18yLlBZVEhPTl9MQU5HVUFHRV9TRVJWRVJfRU5BQkxFRCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5jb25maWd1cmF0aW9uLmdldFNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgIGlmICghc2V0dGluZ3MuZG93bmxvYWRMYW5ndWFnZVNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgLy8gRGVwZW5kcyBvbiAuTkVUIFJ1bnRpbWUgb3IgU0RLLiBUeXBpY2FsbHkgZGV2ZWxvcG1lbnQtb25seSBjYXNlLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZUNsaWVudCA9IHRoaXMuY3JlYXRlU2ltcGxlTGFuZ3VhZ2VDbGllbnQoY2xpZW50T3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnN0YXJ0TGFuZ3VhZ2VDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG1zY29ybGliID0gcGF0aC5qb2luKHRoaXMuY29udGV4dC5leHRlbnNpb25QYXRoLCB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyLCAnbXNjb3JsaWIuZGxsJyk7XHJcbiAgICAgICAgICAgIGlmICghKHlpZWxkIHRoaXMuZnMuZmlsZUV4aXN0cyhtc2NvcmxpYikpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZGVyID0gbmV3IGRvd25sb2FkZXJfMS5MYW5ndWFnZVNlcnZlckRvd25sb2FkZXIodGhpcy5wbGF0Zm9ybURhdGEsIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJGb2xkZXIsIHRoaXMuc2VydmljZXMpO1xyXG4gICAgICAgICAgICAgICAgeWllbGQgZG93bmxvYWRlci5kb3dubG9hZExhbmd1YWdlU2VydmVyKHRoaXMuY29udGV4dCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgc2VydmVyTW9kdWxlID0gcGF0aC5qb2luKHRoaXMuY29udGV4dC5leHRlbnNpb25QYXRoLCB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyLCB0aGlzLnBsYXRmb3JtRGF0YS5nZXRFbmdpbmVFeGVjdXRhYmxlTmFtZSgpKTtcclxuICAgICAgICAgICAgdGhpcy5sYW5ndWFnZUNsaWVudCA9IHRoaXMuY3JlYXRlU2VsZkNvbnRhaW5lZExhbmd1YWdlQ2xpZW50KHNlcnZlck1vZHVsZSwgY2xpZW50T3B0aW9ucyk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnN0YXJ0TGFuZ3VhZ2VDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VDbGllbnQub25UZWxlbWV0cnkodGVsZW1ldHJ5RXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50TmFtZSA9IHRlbGVtZXRyeUV2ZW50LkV2ZW50TmFtZSA/IHRlbGVtZXRyeUV2ZW50LkV2ZW50TmFtZSA6IGNvbnN0YW50c18yLlBZVEhPTl9MQU5HVUFHRV9TRVJWRVJfVEVMRU1FVFJZO1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbGVtZXRyeV8xLnNlbmRUZWxlbWV0cnlFdmVudChldmVudE5hbWUsIHRlbGVtZXRyeUV2ZW50Lk1lYXN1cmVtZW50cywgdGVsZW1ldHJ5RXZlbnQuUHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBTaGVsbC5zaG93RXJyb3JNZXNzYWdlKGBMYW5ndWFnZSBzZXJ2ZXIgZmFpbGVkIHRvIHN0YXJ0LiBFcnJvciAke2V4fWApO1xyXG4gICAgICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGNvbnN0YW50c18yLlBZVEhPTl9MQU5HVUFHRV9TRVJWRVJfRVJST1IsIHVuZGVmaW5lZCwgeyBlcnJvcjogJ0ZhaWxlZCB0byBzdGFydCAocGxhdGZvcm0pJyB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc3RhcnRMYW5ndWFnZUNsaWVudCgpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRleHQuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMubGFuZ3VhZ2VDbGllbnQuc3RhcnQoKSk7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuc2VydmVyUmVhZHkoKTtcclxuICAgICAgICAgICAgY29uc3QgZGlzcG9zYWJsZXMgPSB0aGlzLnNlcnZpY2VzLmdldCh0eXBlc18zLklEaXNwb3NhYmxlUmVnaXN0cnkpO1xyXG4gICAgICAgICAgICBjb25zdCBwcm9ncmVzc1JlcG9ydGluZyA9IG5ldyBwcm9ncmVzc18xLlByb2dyZXNzUmVwb3J0aW5nKHRoaXMubGFuZ3VhZ2VDbGllbnQpO1xyXG4gICAgICAgICAgICBkaXNwb3NhYmxlcy5wdXNoKHByb2dyZXNzUmVwb3J0aW5nKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHNlcnZlclJlYWR5KCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHdoaWxlICghdGhpcy5sYW5ndWFnZUNsaWVudC5pbml0aWFsaXplUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMubG9hZEV4dGVuc2lvbkFyZ3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VDbGllbnQuc2VuZFJlcXVlc3QoJ3B5dGhvbi9sb2FkRXh0ZW5zaW9uJywgdGhpcy5sb2FkRXh0ZW5zaW9uQXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zdGFydHVwQ29tcGxldGVkLnJlc29sdmUoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNyZWF0ZVNpbXBsZUxhbmd1YWdlQ2xpZW50KGNsaWVudE9wdGlvbnMpIHtcclxuICAgICAgICBjb25zdCBjb21tYW5kT3B0aW9ucyA9IHsgc3RkaW86ICdwaXBlJyB9O1xyXG4gICAgICAgIGNvbnN0IHNlcnZlck1vZHVsZSA9IHBhdGguam9pbih0aGlzLmNvbnRleHQuZXh0ZW5zaW9uUGF0aCwgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlciwgdGhpcy5wbGF0Zm9ybURhdGEuZ2V0RW5naW5lRGxsTmFtZSgpKTtcclxuICAgICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xyXG4gICAgICAgICAgICBydW46IHsgY29tbWFuZDogZG90TmV0Q29tbWFuZCwgYXJnczogW3NlcnZlck1vZHVsZV0sIG9wdGlvbnM6IGNvbW1hbmRPcHRpb25zIH0sXHJcbiAgICAgICAgICAgIGRlYnVnOiB7IGNvbW1hbmQ6IGRvdE5ldENvbW1hbmQsIGFyZ3M6IFtzZXJ2ZXJNb2R1bGUsICctLWRlYnVnJ10sIG9wdGlvbnM6IGNvbW1hbmRPcHRpb25zIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBuZXcgdnNjb2RlX2xhbmd1YWdlY2xpZW50XzEuTGFuZ3VhZ2VDbGllbnQoUFlUSE9OLCBsYW5ndWFnZUNsaWVudE5hbWUsIHNlcnZlck9wdGlvbnMsIGNsaWVudE9wdGlvbnMpO1xyXG4gICAgfVxyXG4gICAgY3JlYXRlU2VsZkNvbnRhaW5lZExhbmd1YWdlQ2xpZW50KHNlcnZlck1vZHVsZSwgY2xpZW50T3B0aW9ucykge1xyXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IHN0ZGlvOiAncGlwZScgfTtcclxuICAgICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xyXG4gICAgICAgICAgICBydW46IHsgY29tbWFuZDogc2VydmVyTW9kdWxlLCByZ3M6IFtdLCBvcHRpb25zOiBvcHRpb25zIH0sXHJcbiAgICAgICAgICAgIGRlYnVnOiB7IGNvbW1hbmQ6IHNlcnZlck1vZHVsZSwgYXJnczogWyctLWRlYnVnJ10sIG9wdGlvbnMgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIG5ldyB2c2NvZGVfbGFuZ3VhZ2VjbGllbnRfMS5MYW5ndWFnZUNsaWVudChQWVRIT04sIGxhbmd1YWdlQ2xpZW50TmFtZSwgc2VydmVyT3B0aW9ucywgY2xpZW50T3B0aW9ucyk7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWVtYmVyLW9yZGVyaW5nXHJcbiAgICBnZXRBbmFseXNpc09wdGlvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICAgICAgbGV0IGludGVycHJldGVyRGF0YTtcclxuICAgICAgICAgICAgbGV0IHB5dGhvblBhdGggPSAnJztcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGludGVycHJldGVyRGF0YVNlcnZpY2UgPSBuZXcgaW50ZXJwcmV0ZXJEYXRhU2VydmljZV8xLkludGVycHJldGVyRGF0YVNlcnZpY2UodGhpcy5jb250ZXh0LCB0aGlzLnNlcnZpY2VzKTtcclxuICAgICAgICAgICAgICAgIGludGVycHJldGVyRGF0YSA9IHlpZWxkIGludGVycHJldGVyRGF0YVNlcnZpY2UuZ2V0SW50ZXJwcmV0ZXJEYXRhKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFwcFNoZWxsLnNob3dXYXJuaW5nTWVzc2FnZSgnVW5hYmxlIHRvIGRldGVybWluZSBwYXRoIHRvIHRoZSBQeXRob24gaW50ZXJwcmV0ZXIuIEludGVsbGlTZW5zZSB3aWxsIGJlIGxpbWl0ZWQuJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlckhhc2ggPSBpbnRlcnByZXRlckRhdGEgPyBpbnRlcnByZXRlckRhdGEuaGFzaCA6ICcnO1xyXG4gICAgICAgICAgICBpZiAoaW50ZXJwcmV0ZXJEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBweXRob25QYXRoID0gcGF0aC5kaXJuYW1lKGludGVycHJldGVyRGF0YS5wYXRoKTtcclxuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdHJpbmctbGl0ZXJhbFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1snSW50ZXJwcmV0ZXJQYXRoJ10gPSBpbnRlcnByZXRlckRhdGEucGF0aDtcclxuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdHJpbmctbGl0ZXJhbFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1snVmVyc2lvbiddID0gaW50ZXJwcmV0ZXJEYXRhLnZlcnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXN0cmluZy1saXRlcmFsXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXNbJ0RhdGFiYXNlUGF0aCddID0gcGF0aC5qb2luKHRoaXMuY29udGV4dC5leHRlbnNpb25QYXRoLCB0aGlzLmxhbmd1YWdlU2VydmVyRm9sZGVyKTtcclxuICAgICAgICAgICAgbGV0IHNlYXJjaFBhdGhzID0gaW50ZXJwcmV0ZXJEYXRhID8gaW50ZXJwcmV0ZXJEYXRhLnNlYXJjaFBhdGhzLnNwbGl0KHBhdGguZGVsaW1pdGVyKSA6IFtdO1xyXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuY29uZmlndXJhdGlvbi5nZXRTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuYXV0b0NvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBleHRyYVBhdGhzID0gc2V0dGluZ3MuYXV0b0NvbXBsZXRlLmV4dHJhUGF0aHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmFQYXRocyAmJiBleHRyYVBhdGhzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hQYXRocy5wdXNoKC4uLmV4dHJhUGF0aHMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGVudlZhcnNQcm92aWRlciA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzQuSUVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIpO1xyXG4gICAgICAgICAgICBjb25zdCB2YXJzID0geWllbGQgZW52VmFyc1Byb3ZpZGVyLmdldEVudmlyb25tZW50VmFyaWFibGVzKCk7XHJcbiAgICAgICAgICAgIGlmICh2YXJzLlBZVEhPTlBBVEggJiYgdmFycy5QWVRIT05QQVRILmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGhVdGlscyA9IHRoaXMuc2VydmljZXMuZ2V0KHR5cGVzXzMuSVBhdGhVdGlscyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRocyA9IHZhcnMuUFlUSE9OUEFUSC5zcGxpdChwYXRoVXRpbHMuZGVsaW1pdGVyKS5maWx0ZXIoaXRlbSA9PiBpdGVtLnRyaW0oKS5sZW5ndGggPiAwKTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaFBhdGhzLnB1c2goLi4ucGF0aHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBwYXRocyBkbyBub3QgY29udGFpbiBtdWx0aXBsZSBzbGFzaGVzIHNvIGZpbGUgVVJJc1xyXG4gICAgICAgICAgICAvLyBpbiBWUyBDb2RlIChOb2RlLmpzKSBhbmQgaW4gdGhlIGxhbmd1YWdlIHNlcnZlciAoLk5FVCkgbWF0Y2guXHJcbiAgICAgICAgICAgIC8vIE5vdGU6IGZvciB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHBhdGhzIHNlcGFyYXRvciBpcyBhbHdheXMgO1xyXG4gICAgICAgICAgICBzZWFyY2hQYXRocy5wdXNoKHB5dGhvblBhdGgpO1xyXG4gICAgICAgICAgICBzZWFyY2hQYXRocyA9IHNlYXJjaFBhdGhzLm1hcChwID0+IHBhdGgubm9ybWFsaXplKHApKTtcclxuICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBbeyBsYW5ndWFnZTogUFlUSE9OLCBzY2hlbWU6ICdmaWxlJyB9XTtcclxuICAgICAgICAgICAgdGhpcy5leGNsdWRlZEZpbGVzID0gdGhpcy5nZXRFeGNsdWRlZEZpbGVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMudHlwZXNoZWRQYXRocyA9IHRoaXMuZ2V0VHlwZXNoZWRQYXRocyhzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIC8vIE9wdGlvbnMgdG8gY29udHJvbCB0aGUgbGFuZ3VhZ2UgY2xpZW50XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgc2VydmVyIGZvciBQeXRob24gZG9jdW1lbnRzXHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudFNlbGVjdG9yOiBzZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIHN5bmNocm9uaXplOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhdGlvblNlY3Rpb246IFBZVEhPTlxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG91dHB1dENoYW5uZWw6IHRoaXMub3V0cHV0LFxyXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25PcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheU9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVycmVkRm9ybWF0OiAnbWFya2Rvd24nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmltRG9jdW1lbnRhdGlvbkxpbmVzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4RG9jdW1lbnRhdGlvbkxpbmVMZW5ndGg6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyaW1Eb2N1bWVudGF0aW9uVGV4dDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heERvY3VtZW50YXRpb25UZXh0TGVuZ3RoOiAwXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hQYXRocyxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlU3R1YlNlYXJjaFBhdGhzOiB0aGlzLnR5cGVzaGVkUGF0aHMsXHJcbiAgICAgICAgICAgICAgICAgICAgZXhjbHVkZUZpbGVzOiB0aGlzLmV4Y2x1ZGVkRmlsZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdGVzdEVudmlyb25tZW50OiBjb25zdGFudHNfMS5pc1Rlc3RFeGVjdXRpb24oKSxcclxuICAgICAgICAgICAgICAgICAgICBhbmFseXNpc1VwZGF0ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2VMb2dnaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jU3RhcnR1cDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1pZGRsZXdhcmU6IHtcclxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlQ29tcGxldGlvbkl0ZW06IChkb2N1bWVudCwgcG9zaXRpb24sIGNvbnRleHQsIHRva2VuLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN1cnZleUJhbm5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdXJ2ZXlCYW5uZXIuc2hvd0Jhbm5lcigpLmlnbm9yZUVycm9ycygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXh0KGRvY3VtZW50LCBwb3NpdGlvbiwgY29udGV4dCwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldEV4Y2x1ZGVkRmlsZXMoKSB7XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IFsnKiovTGliLyoqJywgJyoqL3NpdGUtcGFja2FnZXMvKionXTtcclxuICAgICAgICB0aGlzLmdldFZzQ29kZUV4Y2x1ZGVTZWN0aW9uKCdzZWFyY2guZXhjbHVkZScsIGxpc3QpO1xyXG4gICAgICAgIHRoaXMuZ2V0VnNDb2RlRXhjbHVkZVNlY3Rpb24oJ2ZpbGVzLmV4Y2x1ZGUnLCBsaXN0KTtcclxuICAgICAgICB0aGlzLmdldFZzQ29kZUV4Y2x1ZGVTZWN0aW9uKCdmaWxlcy53YXRjaGVyRXhjbHVkZScsIGxpc3QpO1xyXG4gICAgICAgIHRoaXMuZ2V0UHl0aG9uRXhjbHVkZVNlY3Rpb24obGlzdCk7XHJcbiAgICAgICAgcmV0dXJuIGxpc3Q7XHJcbiAgICB9XHJcbiAgICBnZXRWc0NvZGVFeGNsdWRlU2VjdGlvbihzZXR0aW5nLCBsaXN0KSB7XHJcbiAgICAgICAgY29uc3Qgc3RhdGVzID0gdGhpcy53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbihzZXR0aW5nLCB0aGlzLnJvb3QpO1xyXG4gICAgICAgIGlmIChzdGF0ZXMpIHtcclxuICAgICAgICAgICAgT2JqZWN0LmtleXMoc3RhdGVzKVxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihrID0+IChrLmluZGV4T2YoJyonKSA+PSAwIHx8IGsuaW5kZXhPZignLycpID49IDApICYmIHN0YXRlc1trXSlcclxuICAgICAgICAgICAgICAgIC5mb3JFYWNoKHAgPT4gbGlzdC5wdXNoKHApKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBnZXRQeXRob25FeGNsdWRlU2VjdGlvbihsaXN0KSB7XHJcbiAgICAgICAgY29uc3QgcHl0aG9uU2V0dGluZ3MgPSB0aGlzLmNvbmZpZ3VyYXRpb24uZ2V0U2V0dGluZ3ModGhpcy5yb290KTtcclxuICAgICAgICBjb25zdCBwYXRocyA9IHB5dGhvblNldHRpbmdzICYmIHB5dGhvblNldHRpbmdzLmxpbnRpbmcgPyBweXRob25TZXR0aW5ncy5saW50aW5nLmlnbm9yZVBhdHRlcm5zIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIGlmIChwYXRocyAmJiBBcnJheS5pc0FycmF5KHBhdGhzKSkge1xyXG4gICAgICAgICAgICBwYXRoc1xyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihwID0+IHAgJiYgcC5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICAgICAgLmZvckVhY2gocCA9PiBsaXN0LnB1c2gocCkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGdldFR5cGVzaGVkUGF0aHMoc2V0dGluZ3MpIHtcclxuICAgICAgICByZXR1cm4gc2V0dGluZ3MuYW5hbHlzaXMudHlwZXNoZWRQYXRocyAmJiBzZXR0aW5ncy5hbmFseXNpcy50eXBlc2hlZFBhdGhzLmxlbmd0aCA+IDBcclxuICAgICAgICAgICAgPyBzZXR0aW5ncy5hbmFseXNpcy50eXBlc2hlZFBhdGhzXHJcbiAgICAgICAgICAgIDogW3BhdGguam9pbih0aGlzLmNvbnRleHQuZXh0ZW5zaW9uUGF0aCwgdGhpcy5sYW5ndWFnZVNlcnZlckZvbGRlciwgJ1R5cGVzaGVkJyldO1xyXG4gICAgfVxyXG4gICAgb25TZXR0aW5nc0NoYW5nZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgaWRzID0gbmV3IGludGVycHJldGVyRGF0YVNlcnZpY2VfMS5JbnRlcnByZXRlckRhdGFTZXJ2aWNlKHRoaXMuY29udGV4dCwgdGhpcy5zZXJ2aWNlcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkYXRhID0geWllbGQgaWRzLmdldEludGVycHJldGVyRGF0YSgpO1xyXG4gICAgICAgICAgICBpZiAoIWlkYXRhIHx8IGlkYXRhLmhhc2ggIT09IHRoaXMuaW50ZXJwcmV0ZXJIYXNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVySGFzaCA9IGlkYXRhID8gaWRhdGEuaGFzaCA6ICcnO1xyXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBleGNsdWRlZEZpbGVzID0gdGhpcy5nZXRFeGNsdWRlZEZpbGVzKCk7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVySWZBcnJheUNoYW5nZWQodGhpcy5leGNsdWRlZEZpbGVzLCBleGNsdWRlZEZpbGVzKTtcclxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmNvbmZpZ3VyYXRpb24uZ2V0U2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgY29uc3QgdHlwZXNoZWRQYXRocyA9IHRoaXMuZ2V0VHlwZXNoZWRQYXRocyhzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVySWZBcnJheUNoYW5nZWQodGhpcy50eXBlc2hlZFBhdGhzLCB0eXBlc2hlZFBhdGhzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJlc3RhcnRMYW5ndWFnZVNlcnZlcklmQXJyYXlDaGFuZ2VkKG9sZEFycmF5LCBuZXdBcnJheSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChuZXdBcnJheS5sZW5ndGggIT09IG9sZEFycmF5Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9sZEFycmF5Lmxlbmd0aDsgaSArPSAxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob2xkQXJyYXlbaV0gIT09IG5ld0FycmF5W2ldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJlc3RhcnRMYW5ndWFnZVNlcnZlcigpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29udGV4dCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuZGVhY3RpdmF0ZSgpO1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmFjdGl2YXRlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcbkxhbmd1YWdlU2VydmVyRXh0ZW5zaW9uQWN0aXZhdG9yID0gX19kZWNvcmF0ZShbXHJcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXHJcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc181LklTZXJ2aWNlQ29udGFpbmVyKSlcclxuXSwgTGFuZ3VhZ2VTZXJ2ZXJFeHRlbnNpb25BY3RpdmF0b3IpO1xyXG5leHBvcnRzLkxhbmd1YWdlU2VydmVyRXh0ZW5zaW9uQWN0aXZhdG9yID0gTGFuZ3VhZ2VTZXJ2ZXJFeHRlbnNpb25BY3RpdmF0b3I7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxhbmd1YWdlU2VydmVyLmpzLm1hcCJdfQ==