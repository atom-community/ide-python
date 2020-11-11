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
}); // tslint:disable:no-duplicate-imports no-unnecessary-callback-wrapper

const inversify_1 = require("inversify");

const vscode = require("vscode");

const types_1 = require("../common/application/types");

const constants = require("../common/constants");

const types_2 = require("../common/types");

const types_3 = require("../ioc/types");

const constants_1 = require("../telemetry/constants");

const index_1 = require("../telemetry/index");

const main_1 = require("./codeLenses/main");

const constants_2 = require("./common/constants");

const testUtils_1 = require("./common/testUtils");

const types_4 = require("./common/types");

const types_5 = require("./types");

let UnitTestManagementService = class UnitTestManagementService {
  constructor(serviceContainer) {
    this.serviceContainer = serviceContainer;
    this.onDidChange = new vscode.EventEmitter();
    this.disposableRegistry = serviceContainer.get(types_2.IDisposableRegistry);
    this.outputChannel = serviceContainer.get(types_2.IOutputChannel, constants_2.TEST_OUTPUT_CHANNEL);
    this.workspaceService = serviceContainer.get(types_1.IWorkspaceService);
    this.documentManager = serviceContainer.get(types_1.IDocumentManager);
    this.disposableRegistry.push(this);
  }

  dispose() {
    if (this.workspaceTestManagerService) {
      this.workspaceTestManagerService.dispose();
    }
  }

  activate() {
    return __awaiter(this, void 0, void 0, function* () {
      this.workspaceTestManagerService = this.serviceContainer.get(types_4.IWorkspaceTestManagerService);
      this.registerHandlers();
      this.registerCommands();
      this.autoDiscoverTests().catch(ex => this.serviceContainer.get(types_2.ILogger).logError('Failed to auto discover tests upon activation', ex));
    });
  }

  activateCodeLenses(symboldProvider) {
    return __awaiter(this, void 0, void 0, function* () {
      const testCollectionStorage = this.serviceContainer.get(types_4.ITestCollectionStorageService);
      this.disposableRegistry.push(main_1.activateCodeLenses(this.onDidChange, symboldProvider, testCollectionStorage));
    });
  }

  getTestManager(displayTestNotConfiguredMessage, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      let wkspace;

      if (resource) {
        const wkspaceFolder = this.workspaceService.getWorkspaceFolder(resource);
        wkspace = wkspaceFolder ? wkspaceFolder.uri : undefined;
      } else {
        wkspace = yield testUtils_1.selectTestWorkspace();
      }

      if (!wkspace) {
        return;
      }

      const testManager = this.workspaceTestManagerService.getTestManager(wkspace);

      if (testManager) {
        return testManager;
      }

      if (displayTestNotConfiguredMessage) {
        const configurationService = this.serviceContainer.get(types_5.IUnitTestConfigurationService);
        yield configurationService.displayTestFrameworkError(wkspace);
      }
    });
  }

  configurationChangeHandler(e) {
    return __awaiter(this, void 0, void 0, function* () {
      // If there's one workspace, then stop the tests and restart,
      // else let the user do this manually.
      if (!this.workspaceService.hasWorkspaceFolders || this.workspaceService.workspaceFolders.length > 1) {
        return;
      }

      const workspaceUri = this.workspaceService.workspaceFolders[0].uri;

      if (!e.affectsConfiguration('python.unitTest', workspaceUri)) {
        return;
      }

      const settings = this.serviceContainer.get(types_2.IConfigurationService).getSettings(workspaceUri);

      if (!settings.unitTest.nosetestsEnabled && !settings.unitTest.pyTestEnabled && !settings.unitTest.unittestEnabled) {
        if (this.testResultDisplay) {
          this.testResultDisplay.enabled = false;
        } // tslint:disable-next-line:no-suspicious-comment
        // TODO: Why are we disposing, what happens when tests are enabled.


        if (this.workspaceTestManagerService) {
          this.workspaceTestManagerService.dispose();
        }

        return;
      }

      if (this.testResultDisplay) {
        this.testResultDisplay.enabled = true;
      }

      this.autoDiscoverTests().catch(ex => this.serviceContainer.get(types_2.ILogger).logError('Failed to auto discover tests upon activation', ex));
    });
  }

  discoverTestsForDocument(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(false, doc.uri);

      if (!testManager) {
        return;
      }

      const tests = yield testManager.discoverTests(constants_2.CommandSource.auto, false, true);

      if (!tests || !Array.isArray(tests.testFiles) || tests.testFiles.length === 0) {
        return;
      }

      if (tests.testFiles.findIndex(f => f.fullPath === doc.uri.fsPath) === -1) {
        return;
      }

      if (this.autoDiscoverTimer) {
        clearTimeout(this.autoDiscoverTimer);
      }

      this.autoDiscoverTimer = setTimeout(() => this.discoverTests(constants_2.CommandSource.auto, doc.uri, true, false, true), 1000);
    });
  }

  autoDiscoverTests() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.workspaceService.hasWorkspaceFolders) {
        return;
      }

      const configurationService = this.serviceContainer.get(types_2.IConfigurationService);
      const settings = configurationService.getSettings();

      if (!settings.unitTest.nosetestsEnabled && !settings.unitTest.pyTestEnabled && !settings.unitTest.unittestEnabled) {
        return;
      } // No need to display errors.
      // tslint:disable-next-line:no-empty


      this.discoverTests(constants_2.CommandSource.auto, this.workspaceService.workspaceFolders[0].uri, true).catch(() => {});
    });
  }

  discoverTests(cmdSource, resource, ignoreCache, userInitiated, quietMode) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true, resource);

      if (!testManager) {
        return;
      }

      if (testManager.status === types_4.TestStatus.Discovering || testManager.status === types_4.TestStatus.Running) {
        return;
      }

      if (!this.testResultDisplay) {
        this.testResultDisplay = this.serviceContainer.get(types_5.ITestResultDisplay);
        this.testResultDisplay.onDidChange(() => this.onDidChange.fire());
      }

      const discoveryPromise = testManager.discoverTests(cmdSource, ignoreCache, quietMode, userInitiated);
      this.testResultDisplay.displayDiscoverStatus(discoveryPromise, quietMode).catch(ex => console.error('Python Extension: displayDiscoverStatus', ex));
      yield discoveryPromise;
    });
  }

  stopTests(resource) {
    return __awaiter(this, void 0, void 0, function* () {
      index_1.sendTelemetryEvent(constants_1.UNITTEST_STOP);
      const testManager = yield this.getTestManager(true, resource);

      if (testManager) {
        testManager.stop();
      }
    });
  }

  displayStopUI(message) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true);

      if (!testManager) {
        return;
      }

      const testDisplay = this.serviceContainer.get(types_5.ITestDisplay);
      testDisplay.displayStopTestUI(testManager.workspaceFolder, message);
    });
  }

  displayUI(cmdSource) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true);

      if (!testManager) {
        return;
      }

      const testDisplay = this.serviceContainer.get(types_5.ITestDisplay);
      testDisplay.displayTestUI(cmdSource, testManager.workspaceFolder);
    });
  }

  displayPickerUI(cmdSource, file, testFunctions, debug) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true, file);

      if (!testManager) {
        return;
      }

      const testDisplay = this.serviceContainer.get(types_5.ITestDisplay);
      testDisplay.displayFunctionTestPickerUI(cmdSource, testManager.workspaceFolder, testManager.workingDirectory, file, testFunctions, debug);
    });
  }

  viewOutput(cmdSource) {
    index_1.sendTelemetryEvent(constants_1.UNITTEST_VIEW_OUTPUT);
    this.outputChannel.show();
  }

  selectAndRunTestMethod(cmdSource, resource, debug) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true, resource);

      if (!testManager) {
        return;
      }

      try {
        yield testManager.discoverTests(cmdSource, true, true, true);
      } catch (ex) {
        return;
      }

      const testCollectionStorage = this.serviceContainer.get(types_4.ITestCollectionStorageService);
      const tests = testCollectionStorage.getTests(testManager.workspaceFolder);
      const testDisplay = this.serviceContainer.get(types_5.ITestDisplay);
      const selectedTestFn = yield testDisplay.selectTestFunction(testManager.workspaceFolder.fsPath, tests);

      if (!selectedTestFn) {
        return;
      } // tslint:disable-next-line:prefer-type-cast no-object-literal-type-assertion


      yield this.runTestsImpl(cmdSource, testManager.workspaceFolder, {
        testFunction: [selectedTestFn.testFunction]
      }, false, debug);
    });
  }

  selectAndRunTestFile(cmdSource) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true);

      if (!testManager) {
        return;
      }

      try {
        yield testManager.discoverTests(cmdSource, true, true, true);
      } catch (ex) {
        return;
      }

      const testCollectionStorage = this.serviceContainer.get(types_4.ITestCollectionStorageService);
      const tests = testCollectionStorage.getTests(testManager.workspaceFolder);
      const testDisplay = this.serviceContainer.get(types_5.ITestDisplay);
      const selectedFile = yield testDisplay.selectTestFile(testManager.workspaceFolder.fsPath, tests);

      if (!selectedFile) {
        return;
      }

      yield this.runTestsImpl(cmdSource, testManager.workspaceFolder, {
        testFile: [selectedFile]
      });
    });
  }

  runCurrentTestFile(cmdSource) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.documentManager.activeTextEditor) {
        return;
      }

      const testManager = yield this.getTestManager(true, this.documentManager.activeTextEditor.document.uri);

      if (!testManager) {
        return;
      }

      try {
        yield testManager.discoverTests(cmdSource, true, true, true);
      } catch (ex) {
        return;
      }

      const testCollectionStorage = this.serviceContainer.get(types_4.ITestCollectionStorageService);
      const tests = testCollectionStorage.getTests(testManager.workspaceFolder);
      const testFiles = tests.testFiles.filter(testFile => {
        return testFile.fullPath === this.documentManager.activeTextEditor.document.uri.fsPath;
      });

      if (testFiles.length < 1) {
        return;
      }

      yield this.runTestsImpl(cmdSource, testManager.workspaceFolder, {
        testFile: [testFiles[0]]
      });
    });
  }

  runTestsImpl(cmdSource, resource, testsToRun, runFailedTests, debug = false) {
    return __awaiter(this, void 0, void 0, function* () {
      const testManager = yield this.getTestManager(true, resource);

      if (!testManager) {
        return;
      }

      if (!this.testResultDisplay) {
        this.testResultDisplay = this.serviceContainer.get(types_5.ITestResultDisplay);
        this.testResultDisplay.onDidChange(() => this.onDidChange.fire());
      }

      const promise = testManager.runTest(cmdSource, testsToRun, runFailedTests, debug).catch(reason => {
        if (reason !== constants_2.CANCELLATION_REASON) {
          this.outputChannel.appendLine(`Error: ${reason}`);
        }

        return Promise.reject(reason);
      });
      this.testResultDisplay.displayProgressStatus(promise, debug);
      yield promise;
    });
  }

  registerCommands() {
    const disposablesRegistry = this.serviceContainer.get(types_2.IDisposableRegistry);
    const commandManager = this.serviceContainer.get(types_1.ICommandManager);
    const disposables = [commandManager.registerCommand(constants.Commands.Tests_Discover, (_, cmdSource = constants_2.CommandSource.commandPalette, resource) => {
      // Ignore the exceptions returned.
      // This command will be invoked from other places of the extension.
      this.discoverTests(cmdSource, resource, true, true).ignoreErrors();
    }), commandManager.registerCommand(constants.Commands.Tests_Run_Failed, (_, cmdSource = constants_2.CommandSource.commandPalette, resource) => this.runTestsImpl(cmdSource, resource, undefined, true)), commandManager.registerCommand(constants.Commands.Tests_Run, (_, cmdSource = constants_2.CommandSource.commandPalette, file, testToRun) => this.runTestsImpl(cmdSource, file, testToRun)), commandManager.registerCommand(constants.Commands.Tests_Debug, (_, cmdSource = constants_2.CommandSource.commandPalette, file, testToRun) => this.runTestsImpl(cmdSource, file, testToRun, false, true)), commandManager.registerCommand(constants.Commands.Tests_View_UI, () => this.displayUI(constants_2.CommandSource.commandPalette)), commandManager.registerCommand(constants.Commands.Tests_Picker_UI, (_, cmdSource = constants_2.CommandSource.commandPalette, file, testFunctions) => this.displayPickerUI(cmdSource, file, testFunctions)), commandManager.registerCommand(constants.Commands.Tests_Picker_UI_Debug, (_, cmdSource = constants_2.CommandSource.commandPalette, file, testFunctions) => this.displayPickerUI(cmdSource, file, testFunctions, true)), commandManager.registerCommand(constants.Commands.Tests_Stop, (_, resource) => this.stopTests(resource)), commandManager.registerCommand(constants.Commands.Tests_ViewOutput, (_, cmdSource = constants_2.CommandSource.commandPalette) => this.viewOutput(cmdSource)), commandManager.registerCommand(constants.Commands.Tests_Ask_To_Stop_Discovery, () => this.displayStopUI('Stop discovering tests')), commandManager.registerCommand(constants.Commands.Tests_Ask_To_Stop_Test, () => this.displayStopUI('Stop running tests')), commandManager.registerCommand(constants.Commands.Tests_Select_And_Run_Method, (_, cmdSource = constants_2.CommandSource.commandPalette, resource) => this.selectAndRunTestMethod(cmdSource, resource)), commandManager.registerCommand(constants.Commands.Tests_Select_And_Debug_Method, (_, cmdSource = constants_2.CommandSource.commandPalette, resource) => this.selectAndRunTestMethod(cmdSource, resource, true)), commandManager.registerCommand(constants.Commands.Tests_Select_And_Run_File, (_, cmdSource = constants_2.CommandSource.commandPalette) => this.selectAndRunTestFile(cmdSource)), commandManager.registerCommand(constants.Commands.Tests_Run_Current_File, (_, cmdSource = constants_2.CommandSource.commandPalette) => this.runCurrentTestFile(cmdSource))];
    disposablesRegistry.push(...disposables);
  }

  onDocumentSaved(doc) {
    const settings = this.serviceContainer.get(types_2.IConfigurationService).getSettings(doc.uri);

    if (!settings.unitTest.autoTestDiscoverOnSaveEnabled) {
      return;
    }

    this.discoverTestsForDocument(doc).ignoreErrors();
  }

  registerHandlers() {
    const documentManager = this.serviceContainer.get(types_1.IDocumentManager);
    this.disposableRegistry.push(documentManager.onDidSaveTextDocument(this.onDocumentSaved.bind(this)));
    this.disposableRegistry.push(this.workspaceService.onDidChangeConfiguration(e => {
      if (this.configChangedTimer) {
        clearTimeout(this.configChangedTimer);
      }

      this.configChangedTimer = setTimeout(() => this.configurationChangeHandler(e), 1000);
    }));
  }

};
UnitTestManagementService = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_3.IServiceContainer))], UnitTestManagementService);
exports.UnitTestManagementService = UnitTestManagementService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImludmVyc2lmeV8xIiwicmVxdWlyZSIsInZzY29kZSIsInR5cGVzXzEiLCJjb25zdGFudHMiLCJ0eXBlc18yIiwidHlwZXNfMyIsImNvbnN0YW50c18xIiwiaW5kZXhfMSIsIm1haW5fMSIsImNvbnN0YW50c18yIiwidGVzdFV0aWxzXzEiLCJ0eXBlc180IiwidHlwZXNfNSIsIlVuaXRUZXN0TWFuYWdlbWVudFNlcnZpY2UiLCJjb25zdHJ1Y3RvciIsInNlcnZpY2VDb250YWluZXIiLCJvbkRpZENoYW5nZSIsIkV2ZW50RW1pdHRlciIsImRpc3Bvc2FibGVSZWdpc3RyeSIsImdldCIsIklEaXNwb3NhYmxlUmVnaXN0cnkiLCJvdXRwdXRDaGFubmVsIiwiSU91dHB1dENoYW5uZWwiLCJURVNUX09VVFBVVF9DSEFOTkVMIiwid29ya3NwYWNlU2VydmljZSIsIklXb3Jrc3BhY2VTZXJ2aWNlIiwiZG9jdW1lbnRNYW5hZ2VyIiwiSURvY3VtZW50TWFuYWdlciIsInB1c2giLCJkaXNwb3NlIiwid29ya3NwYWNlVGVzdE1hbmFnZXJTZXJ2aWNlIiwiYWN0aXZhdGUiLCJJV29ya3NwYWNlVGVzdE1hbmFnZXJTZXJ2aWNlIiwicmVnaXN0ZXJIYW5kbGVycyIsInJlZ2lzdGVyQ29tbWFuZHMiLCJhdXRvRGlzY292ZXJUZXN0cyIsImNhdGNoIiwiZXgiLCJJTG9nZ2VyIiwibG9nRXJyb3IiLCJhY3RpdmF0ZUNvZGVMZW5zZXMiLCJzeW1ib2xkUHJvdmlkZXIiLCJ0ZXN0Q29sbGVjdGlvblN0b3JhZ2UiLCJJVGVzdENvbGxlY3Rpb25TdG9yYWdlU2VydmljZSIsImdldFRlc3RNYW5hZ2VyIiwiZGlzcGxheVRlc3ROb3RDb25maWd1cmVkTWVzc2FnZSIsInJlc291cmNlIiwid2tzcGFjZSIsIndrc3BhY2VGb2xkZXIiLCJnZXRXb3Jrc3BhY2VGb2xkZXIiLCJ1cmkiLCJ1bmRlZmluZWQiLCJzZWxlY3RUZXN0V29ya3NwYWNlIiwidGVzdE1hbmFnZXIiLCJjb25maWd1cmF0aW9uU2VydmljZSIsIklVbml0VGVzdENvbmZpZ3VyYXRpb25TZXJ2aWNlIiwiZGlzcGxheVRlc3RGcmFtZXdvcmtFcnJvciIsImNvbmZpZ3VyYXRpb25DaGFuZ2VIYW5kbGVyIiwiaGFzV29ya3NwYWNlRm9sZGVycyIsIndvcmtzcGFjZUZvbGRlcnMiLCJ3b3Jrc3BhY2VVcmkiLCJhZmZlY3RzQ29uZmlndXJhdGlvbiIsInNldHRpbmdzIiwiSUNvbmZpZ3VyYXRpb25TZXJ2aWNlIiwiZ2V0U2V0dGluZ3MiLCJ1bml0VGVzdCIsIm5vc2V0ZXN0c0VuYWJsZWQiLCJweVRlc3RFbmFibGVkIiwidW5pdHRlc3RFbmFibGVkIiwidGVzdFJlc3VsdERpc3BsYXkiLCJlbmFibGVkIiwiZGlzY292ZXJUZXN0c0ZvckRvY3VtZW50IiwiZG9jIiwidGVzdHMiLCJkaXNjb3ZlclRlc3RzIiwiQ29tbWFuZFNvdXJjZSIsImF1dG8iLCJBcnJheSIsImlzQXJyYXkiLCJ0ZXN0RmlsZXMiLCJmaW5kSW5kZXgiLCJmIiwiZnVsbFBhdGgiLCJmc1BhdGgiLCJhdXRvRGlzY292ZXJUaW1lciIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJjbWRTb3VyY2UiLCJpZ25vcmVDYWNoZSIsInVzZXJJbml0aWF0ZWQiLCJxdWlldE1vZGUiLCJzdGF0dXMiLCJUZXN0U3RhdHVzIiwiRGlzY292ZXJpbmciLCJSdW5uaW5nIiwiSVRlc3RSZXN1bHREaXNwbGF5IiwiZmlyZSIsImRpc2NvdmVyeVByb21pc2UiLCJkaXNwbGF5RGlzY292ZXJTdGF0dXMiLCJjb25zb2xlIiwiZXJyb3IiLCJzdG9wVGVzdHMiLCJzZW5kVGVsZW1ldHJ5RXZlbnQiLCJVTklUVEVTVF9TVE9QIiwic3RvcCIsImRpc3BsYXlTdG9wVUkiLCJtZXNzYWdlIiwidGVzdERpc3BsYXkiLCJJVGVzdERpc3BsYXkiLCJkaXNwbGF5U3RvcFRlc3RVSSIsIndvcmtzcGFjZUZvbGRlciIsImRpc3BsYXlVSSIsImRpc3BsYXlUZXN0VUkiLCJkaXNwbGF5UGlja2VyVUkiLCJmaWxlIiwidGVzdEZ1bmN0aW9ucyIsImRlYnVnIiwiZGlzcGxheUZ1bmN0aW9uVGVzdFBpY2tlclVJIiwid29ya2luZ0RpcmVjdG9yeSIsInZpZXdPdXRwdXQiLCJVTklUVEVTVF9WSUVXX09VVFBVVCIsInNob3ciLCJzZWxlY3RBbmRSdW5UZXN0TWV0aG9kIiwiZ2V0VGVzdHMiLCJzZWxlY3RlZFRlc3RGbiIsInNlbGVjdFRlc3RGdW5jdGlvbiIsInJ1blRlc3RzSW1wbCIsInRlc3RGdW5jdGlvbiIsInNlbGVjdEFuZFJ1blRlc3RGaWxlIiwic2VsZWN0ZWRGaWxlIiwic2VsZWN0VGVzdEZpbGUiLCJ0ZXN0RmlsZSIsInJ1bkN1cnJlbnRUZXN0RmlsZSIsImFjdGl2ZVRleHRFZGl0b3IiLCJkb2N1bWVudCIsImZpbHRlciIsInRlc3RzVG9SdW4iLCJydW5GYWlsZWRUZXN0cyIsInByb21pc2UiLCJydW5UZXN0IiwicmVhc29uIiwiQ0FOQ0VMTEFUSU9OX1JFQVNPTiIsImFwcGVuZExpbmUiLCJkaXNwbGF5UHJvZ3Jlc3NTdGF0dXMiLCJkaXNwb3NhYmxlc1JlZ2lzdHJ5IiwiY29tbWFuZE1hbmFnZXIiLCJJQ29tbWFuZE1hbmFnZXIiLCJkaXNwb3NhYmxlcyIsInJlZ2lzdGVyQ29tbWFuZCIsIkNvbW1hbmRzIiwiVGVzdHNfRGlzY292ZXIiLCJfIiwiY29tbWFuZFBhbGV0dGUiLCJpZ25vcmVFcnJvcnMiLCJUZXN0c19SdW5fRmFpbGVkIiwiVGVzdHNfUnVuIiwidGVzdFRvUnVuIiwiVGVzdHNfRGVidWciLCJUZXN0c19WaWV3X1VJIiwiVGVzdHNfUGlja2VyX1VJIiwiVGVzdHNfUGlja2VyX1VJX0RlYnVnIiwiVGVzdHNfU3RvcCIsIlRlc3RzX1ZpZXdPdXRwdXQiLCJUZXN0c19Bc2tfVG9fU3RvcF9EaXNjb3ZlcnkiLCJUZXN0c19Bc2tfVG9fU3RvcF9UZXN0IiwiVGVzdHNfU2VsZWN0X0FuZF9SdW5fTWV0aG9kIiwiVGVzdHNfU2VsZWN0X0FuZF9EZWJ1Z19NZXRob2QiLCJUZXN0c19TZWxlY3RfQW5kX1J1bl9GaWxlIiwiVGVzdHNfUnVuX0N1cnJlbnRfRmlsZSIsIm9uRG9jdW1lbnRTYXZlZCIsImF1dG9UZXN0RGlzY292ZXJPblNhdmVFbmFibGVkIiwib25EaWRTYXZlVGV4dERvY3VtZW50IiwiYmluZCIsIm9uRGlkQ2hhbmdlQ29uZmlndXJhdGlvbiIsImNvbmZpZ0NoYW5nZWRUaW1lciIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ25GLE1BQUlDLENBQUMsR0FBR0MsU0FBUyxDQUFDQyxNQUFsQjtBQUFBLE1BQTBCQyxDQUFDLEdBQUdILENBQUMsR0FBRyxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLElBQUksS0FBSyxJQUFULEdBQWdCQSxJQUFJLEdBQUdLLE1BQU0sQ0FBQ0Msd0JBQVAsQ0FBZ0NSLE1BQWhDLEVBQXdDQyxHQUF4QyxDQUF2QixHQUFzRUMs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TixDQUFaO0FBQ0g7O0FBQ0QsV0FBS0Esa0JBQUwsR0FBMEJ4RixVQUFVLENBQUMsTUFBTSxLQUFLN0IsMEJBQUwsQ0FBZ0NqRSxDQUFoQyxDQUFQLEVBQTJDLElBQTNDLENBQXBDO0FBQ0gsS0FMNEIsQ0FBN0I7QUFNSDs7QUF6VDJELENBQWhFO0FBMlRBcUIseUJBQXlCLEdBQUdwRCxVQUFVLENBQUMsQ0FDbkNzQyxXQUFXLENBQUNnTCxVQUFaLEVBRG1DLEVBRW5DdE0sT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQ2lMLE1BQVosQ0FBbUIzSyxPQUFPLENBQUM0SyxpQkFBM0IsQ0FBSixDQUY0QixDQUFELEVBR25DcEsseUJBSG1DLENBQXRDO0FBSUFmLE9BQU8sQ0FBQ2UseUJBQVIsR0FBb0NBLHlCQUFwQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxudmFyIF9fcGFyYW0gPSAodGhpcyAmJiB0aGlzLl9fcGFyYW0pIHx8IGZ1bmN0aW9uIChwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59O1xyXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbi8vIHRzbGludDpkaXNhYmxlOm5vLWR1cGxpY2F0ZS1pbXBvcnRzIG5vLXVubmVjZXNzYXJ5LWNhbGxiYWNrLXdyYXBwZXJcclxuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xyXG5jb25zdCB2c2NvZGUgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9hcHBsaWNhdGlvbi90eXBlc1wiKTtcclxuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZShcIi4uL2NvbW1vbi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uL2lvYy90eXBlc1wiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5L2NvbnN0YW50c1wiKTtcclxuY29uc3QgaW5kZXhfMSA9IHJlcXVpcmUoXCIuLi90ZWxlbWV0cnkvaW5kZXhcIik7XHJcbmNvbnN0IG1haW5fMSA9IHJlcXVpcmUoXCIuL2NvZGVMZW5zZXMvbWFpblwiKTtcclxuY29uc3QgY29uc3RhbnRzXzIgPSByZXF1aXJlKFwiLi9jb21tb24vY29uc3RhbnRzXCIpO1xyXG5jb25zdCB0ZXN0VXRpbHNfMSA9IHJlcXVpcmUoXCIuL2NvbW1vbi90ZXN0VXRpbHNcIik7XHJcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzUgPSByZXF1aXJlKFwiLi90eXBlc1wiKTtcclxubGV0IFVuaXRUZXN0TWFuYWdlbWVudFNlcnZpY2UgPSBjbGFzcyBVbml0VGVzdE1hbmFnZW1lbnRTZXJ2aWNlIHtcclxuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VDb250YWluZXIpIHtcclxuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIgPSBzZXJ2aWNlQ29udGFpbmVyO1xyXG4gICAgICAgIHRoaXMub25EaWRDaGFuZ2UgPSBuZXcgdnNjb2RlLkV2ZW50RW1pdHRlcigpO1xyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZVJlZ2lzdHJ5ID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JRGlzcG9zYWJsZVJlZ2lzdHJ5KTtcclxuICAgICAgICB0aGlzLm91dHB1dENoYW5uZWwgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklPdXRwdXRDaGFubmVsLCBjb25zdGFudHNfMi5URVNUX09VVFBVVF9DSEFOTkVMKTtcclxuICAgICAgICB0aGlzLndvcmtzcGFjZVNlcnZpY2UgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklXb3Jrc3BhY2VTZXJ2aWNlKTtcclxuICAgICAgICB0aGlzLmRvY3VtZW50TWFuYWdlciA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSURvY3VtZW50TWFuYWdlcik7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlUmVnaXN0cnkucHVzaCh0aGlzKTtcclxuICAgIH1cclxuICAgIGRpc3Bvc2UoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMud29ya3NwYWNlVGVzdE1hbmFnZXJTZXJ2aWNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMud29ya3NwYWNlVGVzdE1hbmFnZXJTZXJ2aWNlLmRpc3Bvc2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhY3RpdmF0ZSgpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmtzcGFjZVRlc3RNYW5hZ2VyU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNC5JV29ya3NwYWNlVGVzdE1hbmFnZXJTZXJ2aWNlKTtcclxuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckhhbmRsZXJzKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJDb21tYW5kcygpO1xyXG4gICAgICAgICAgICB0aGlzLmF1dG9EaXNjb3ZlclRlc3RzKClcclxuICAgICAgICAgICAgICAgIC5jYXRjaChleCA9PiB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSUxvZ2dlcikubG9nRXJyb3IoJ0ZhaWxlZCB0byBhdXRvIGRpc2NvdmVyIHRlc3RzIHVwb24gYWN0aXZhdGlvbicsIGV4KSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhY3RpdmF0ZUNvZGVMZW5zZXMoc3ltYm9sZFByb3ZpZGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgdGVzdENvbGxlY3Rpb25TdG9yYWdlID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc180LklUZXN0Q29sbGVjdGlvblN0b3JhZ2VTZXJ2aWNlKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlUmVnaXN0cnkucHVzaChtYWluXzEuYWN0aXZhdGVDb2RlTGVuc2VzKHRoaXMub25EaWRDaGFuZ2UsIHN5bWJvbGRQcm92aWRlciwgdGVzdENvbGxlY3Rpb25TdG9yYWdlKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRUZXN0TWFuYWdlcihkaXNwbGF5VGVzdE5vdENvbmZpZ3VyZWRNZXNzYWdlLCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGxldCB3a3NwYWNlO1xyXG4gICAgICAgICAgICBpZiAocmVzb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdrc3BhY2VGb2xkZXIgPSB0aGlzLndvcmtzcGFjZVNlcnZpY2UuZ2V0V29ya3NwYWNlRm9sZGVyKHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgIHdrc3BhY2UgPSB3a3NwYWNlRm9sZGVyID8gd2tzcGFjZUZvbGRlci51cmkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB3a3NwYWNlID0geWllbGQgdGVzdFV0aWxzXzEuc2VsZWN0VGVzdFdvcmtzcGFjZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghd2tzcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0gdGhpcy53b3Jrc3BhY2VUZXN0TWFuYWdlclNlcnZpY2UuZ2V0VGVzdE1hbmFnZXIod2tzcGFjZSk7XHJcbiAgICAgICAgICAgIGlmICh0ZXN0TWFuYWdlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlc3RNYW5hZ2VyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaXNwbGF5VGVzdE5vdENvbmZpZ3VyZWRNZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb25maWd1cmF0aW9uU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNS5JVW5pdFRlc3RDb25maWd1cmF0aW9uU2VydmljZSk7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCBjb25maWd1cmF0aW9uU2VydmljZS5kaXNwbGF5VGVzdEZyYW1ld29ya0Vycm9yKHdrc3BhY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjb25maWd1cmF0aW9uQ2hhbmdlSGFuZGxlcihlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgLy8gSWYgdGhlcmUncyBvbmUgd29ya3NwYWNlLCB0aGVuIHN0b3AgdGhlIHRlc3RzIGFuZCByZXN0YXJ0LFxyXG4gICAgICAgICAgICAvLyBlbHNlIGxldCB0aGUgdXNlciBkbyB0aGlzIG1hbnVhbGx5LlxyXG4gICAgICAgICAgICBpZiAoIXRoaXMud29ya3NwYWNlU2VydmljZS5oYXNXb3Jrc3BhY2VGb2xkZXJzIHx8IHRoaXMud29ya3NwYWNlU2VydmljZS53b3Jrc3BhY2VGb2xkZXJzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB3b3Jrc3BhY2VVcmkgPSB0aGlzLndvcmtzcGFjZVNlcnZpY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmk7XHJcbiAgICAgICAgICAgIGlmICghZS5hZmZlY3RzQ29uZmlndXJhdGlvbigncHl0aG9uLnVuaXRUZXN0Jywgd29ya3NwYWNlVXJpKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklDb25maWd1cmF0aW9uU2VydmljZSkuZ2V0U2V0dGluZ3Mod29ya3NwYWNlVXJpKTtcclxuICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy51bml0VGVzdC5ub3NldGVzdHNFbmFibGVkICYmICFzZXR0aW5ncy51bml0VGVzdC5weVRlc3RFbmFibGVkICYmICFzZXR0aW5ncy51bml0VGVzdC51bml0dGVzdEVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlc3RSZXN1bHREaXNwbGF5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXN0UmVzdWx0RGlzcGxheS5lbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tc3VzcGljaW91cy1jb21tZW50XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBXaHkgYXJlIHdlIGRpc3Bvc2luZywgd2hhdCBoYXBwZW5zIHdoZW4gdGVzdHMgYXJlIGVuYWJsZWQuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy53b3Jrc3BhY2VUZXN0TWFuYWdlclNlcnZpY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLndvcmtzcGFjZVRlc3RNYW5hZ2VyU2VydmljZS5kaXNwb3NlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMudGVzdFJlc3VsdERpc3BsYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGVzdFJlc3VsdERpc3BsYXkuZW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5hdXRvRGlzY292ZXJUZXN0cygpXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXggPT4gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklMb2dnZXIpLmxvZ0Vycm9yKCdGYWlsZWQgdG8gYXV0byBkaXNjb3ZlciB0ZXN0cyB1cG9uIGFjdGl2YXRpb24nLCBleCkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZGlzY292ZXJUZXN0c0ZvckRvY3VtZW50KGRvYykge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0geWllbGQgdGhpcy5nZXRUZXN0TWFuYWdlcihmYWxzZSwgZG9jLnVyaSk7XHJcbiAgICAgICAgICAgIGlmICghdGVzdE1hbmFnZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0ZXN0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLmRpc2NvdmVyVGVzdHMoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS5hdXRvLCBmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGlmICghdGVzdHMgfHwgIUFycmF5LmlzQXJyYXkodGVzdHMudGVzdEZpbGVzKSB8fCB0ZXN0cy50ZXN0RmlsZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRlc3RzLnRlc3RGaWxlcy5maW5kSW5kZXgoKGYpID0+IGYuZnVsbFBhdGggPT09IGRvYy51cmkuZnNQYXRoKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5hdXRvRGlzY292ZXJUaW1lcikge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuYXV0b0Rpc2NvdmVyVGltZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYXV0b0Rpc2NvdmVyVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZGlzY292ZXJUZXN0cyhjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmF1dG8sIGRvYy51cmksIHRydWUsIGZhbHNlLCB0cnVlKSwgMTAwMCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhdXRvRGlzY292ZXJUZXN0cygpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMud29ya3NwYWNlU2VydmljZS5oYXNXb3Jrc3BhY2VGb2xkZXJzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgY29uZmlndXJhdGlvblNlcnZpY2UgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSUNvbmZpZ3VyYXRpb25TZXJ2aWNlKTtcclxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBjb25maWd1cmF0aW9uU2VydmljZS5nZXRTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICBpZiAoIXNldHRpbmdzLnVuaXRUZXN0Lm5vc2V0ZXN0c0VuYWJsZWQgJiYgIXNldHRpbmdzLnVuaXRUZXN0LnB5VGVzdEVuYWJsZWQgJiYgIXNldHRpbmdzLnVuaXRUZXN0LnVuaXR0ZXN0RW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gZGlzcGxheSBlcnJvcnMuXHJcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eVxyXG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyVGVzdHMoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS5hdXRvLCB0aGlzLndvcmtzcGFjZVNlcnZpY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmksIHRydWUpLmNhdGNoKCgpID0+IHsgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBkaXNjb3ZlclRlc3RzKGNtZFNvdXJjZSwgcmVzb3VyY2UsIGlnbm9yZUNhY2hlLCB1c2VySW5pdGlhdGVkLCBxdWlldE1vZGUpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IHlpZWxkIHRoaXMuZ2V0VGVzdE1hbmFnZXIodHJ1ZSwgcmVzb3VyY2UpO1xyXG4gICAgICAgICAgICBpZiAoIXRlc3RNYW5hZ2VyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRlc3RNYW5hZ2VyLnN0YXR1cyA9PT0gdHlwZXNfNC5UZXN0U3RhdHVzLkRpc2NvdmVyaW5nIHx8IHRlc3RNYW5hZ2VyLnN0YXR1cyA9PT0gdHlwZXNfNC5UZXN0U3RhdHVzLlJ1bm5pbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMudGVzdFJlc3VsdERpc3BsYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGVzdFJlc3VsdERpc3BsYXkgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzUuSVRlc3RSZXN1bHREaXNwbGF5KTtcclxuICAgICAgICAgICAgICAgIHRoaXMudGVzdFJlc3VsdERpc3BsYXkub25EaWRDaGFuZ2UoKCkgPT4gdGhpcy5vbkRpZENoYW5nZS5maXJlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc2NvdmVyeVByb21pc2UgPSB0ZXN0TWFuYWdlci5kaXNjb3ZlclRlc3RzKGNtZFNvdXJjZSwgaWdub3JlQ2FjaGUsIHF1aWV0TW9kZSwgdXNlckluaXRpYXRlZCk7XHJcbiAgICAgICAgICAgIHRoaXMudGVzdFJlc3VsdERpc3BsYXkuZGlzcGxheURpc2NvdmVyU3RhdHVzKGRpc2NvdmVyeVByb21pc2UsIHF1aWV0TW9kZSlcclxuICAgICAgICAgICAgICAgIC5jYXRjaChleCA9PiBjb25zb2xlLmVycm9yKCdQeXRob24gRXh0ZW5zaW9uOiBkaXNwbGF5RGlzY292ZXJTdGF0dXMnLCBleCkpO1xyXG4gICAgICAgICAgICB5aWVsZCBkaXNjb3ZlcnlQcm9taXNlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc3RvcFRlc3RzKHJlc291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgaW5kZXhfMS5zZW5kVGVsZW1ldHJ5RXZlbnQoY29uc3RhbnRzXzEuVU5JVFRFU1RfU1RPUCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0geWllbGQgdGhpcy5nZXRUZXN0TWFuYWdlcih0cnVlLCByZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIGlmICh0ZXN0TWFuYWdlcikge1xyXG4gICAgICAgICAgICAgICAgdGVzdE1hbmFnZXIuc3RvcCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBkaXNwbGF5U3RvcFVJKG1lc3NhZ2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IHlpZWxkIHRoaXMuZ2V0VGVzdE1hbmFnZXIodHJ1ZSk7XHJcbiAgICAgICAgICAgIGlmICghdGVzdE1hbmFnZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0ZXN0RGlzcGxheSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNS5JVGVzdERpc3BsYXkpO1xyXG4gICAgICAgICAgICB0ZXN0RGlzcGxheS5kaXNwbGF5U3RvcFRlc3RVSSh0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIsIG1lc3NhZ2UpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZGlzcGxheVVJKGNtZFNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0geWllbGQgdGhpcy5nZXRUZXN0TWFuYWdlcih0cnVlKTtcclxuICAgICAgICAgICAgaWYgKCF0ZXN0TWFuYWdlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3REaXNwbGF5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc181LklUZXN0RGlzcGxheSk7XHJcbiAgICAgICAgICAgIHRlc3REaXNwbGF5LmRpc3BsYXlUZXN0VUkoY21kU291cmNlLCB0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZGlzcGxheVBpY2tlclVJKGNtZFNvdXJjZSwgZmlsZSwgdGVzdEZ1bmN0aW9ucywgZGVidWcpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IHlpZWxkIHRoaXMuZ2V0VGVzdE1hbmFnZXIodHJ1ZSwgZmlsZSk7XHJcbiAgICAgICAgICAgIGlmICghdGVzdE1hbmFnZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0ZXN0RGlzcGxheSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNS5JVGVzdERpc3BsYXkpO1xyXG4gICAgICAgICAgICB0ZXN0RGlzcGxheS5kaXNwbGF5RnVuY3Rpb25UZXN0UGlja2VyVUkoY21kU291cmNlLCB0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIsIHRlc3RNYW5hZ2VyLndvcmtpbmdEaXJlY3RvcnksIGZpbGUsIHRlc3RGdW5jdGlvbnMsIGRlYnVnKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHZpZXdPdXRwdXQoY21kU291cmNlKSB7XHJcbiAgICAgICAgaW5kZXhfMS5zZW5kVGVsZW1ldHJ5RXZlbnQoY29uc3RhbnRzXzEuVU5JVFRFU1RfVklFV19PVVRQVVQpO1xyXG4gICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbC5zaG93KCk7XHJcbiAgICB9XHJcbiAgICBzZWxlY3RBbmRSdW5UZXN0TWV0aG9kKGNtZFNvdXJjZSwgcmVzb3VyY2UsIGRlYnVnKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgdGVzdE1hbmFnZXIgPSB5aWVsZCB0aGlzLmdldFRlc3RNYW5hZ2VyKHRydWUsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgaWYgKCF0ZXN0TWFuYWdlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0ZXN0TWFuYWdlci5kaXNjb3ZlclRlc3RzKGNtZFNvdXJjZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgdGVzdENvbGxlY3Rpb25TdG9yYWdlID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc180LklUZXN0Q29sbGVjdGlvblN0b3JhZ2VTZXJ2aWNlKTtcclxuICAgICAgICAgICAgY29uc3QgdGVzdHMgPSB0ZXN0Q29sbGVjdGlvblN0b3JhZ2UuZ2V0VGVzdHModGVzdE1hbmFnZXIud29ya3NwYWNlRm9sZGVyKTtcclxuICAgICAgICAgICAgY29uc3QgdGVzdERpc3BsYXkgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzUuSVRlc3REaXNwbGF5KTtcclxuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRUZXN0Rm4gPSB5aWVsZCB0ZXN0RGlzcGxheS5zZWxlY3RUZXN0RnVuY3Rpb24odGVzdE1hbmFnZXIud29ya3NwYWNlRm9sZGVyLmZzUGF0aCwgdGVzdHMpO1xyXG4gICAgICAgICAgICBpZiAoIXNlbGVjdGVkVGVzdEZuKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOnByZWZlci10eXBlLWNhc3Qgbm8tb2JqZWN0LWxpdGVyYWwtdHlwZS1hc3NlcnRpb25cclxuICAgICAgICAgICAgeWllbGQgdGhpcy5ydW5UZXN0c0ltcGwoY21kU291cmNlLCB0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIsIHsgdGVzdEZ1bmN0aW9uOiBbc2VsZWN0ZWRUZXN0Rm4udGVzdEZ1bmN0aW9uXSB9LCBmYWxzZSwgZGVidWcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc2VsZWN0QW5kUnVuVGVzdEZpbGUoY21kU291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgdGVzdE1hbmFnZXIgPSB5aWVsZCB0aGlzLmdldFRlc3RNYW5hZ2VyKHRydWUpO1xyXG4gICAgICAgICAgICBpZiAoIXRlc3RNYW5hZ2VyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIHRlc3RNYW5hZ2VyLmRpc2NvdmVyVGVzdHMoY21kU291cmNlLCB0cnVlLCB0cnVlLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0ZXN0Q29sbGVjdGlvblN0b3JhZ2UgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzQuSVRlc3RDb2xsZWN0aW9uU3RvcmFnZVNlcnZpY2UpO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXN0cyA9IHRlc3RDb2xsZWN0aW9uU3RvcmFnZS5nZXRUZXN0cyh0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIpO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXN0RGlzcGxheSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNS5JVGVzdERpc3BsYXkpO1xyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZEZpbGUgPSB5aWVsZCB0ZXN0RGlzcGxheS5zZWxlY3RUZXN0RmlsZSh0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIuZnNQYXRoLCB0ZXN0cyk7XHJcbiAgICAgICAgICAgIGlmICghc2VsZWN0ZWRGaWxlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeWllbGQgdGhpcy5ydW5UZXN0c0ltcGwoY21kU291cmNlLCB0ZXN0TWFuYWdlci53b3Jrc3BhY2VGb2xkZXIsIHsgdGVzdEZpbGU6IFtzZWxlY3RlZEZpbGVdIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVuQ3VycmVudFRlc3RGaWxlKGNtZFNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5kb2N1bWVudE1hbmFnZXIuYWN0aXZlVGV4dEVkaXRvcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0geWllbGQgdGhpcy5nZXRUZXN0TWFuYWdlcih0cnVlLCB0aGlzLmRvY3VtZW50TWFuYWdlci5hY3RpdmVUZXh0RWRpdG9yLmRvY3VtZW50LnVyaSk7XHJcbiAgICAgICAgICAgIGlmICghdGVzdE1hbmFnZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgeWllbGQgdGVzdE1hbmFnZXIuZGlzY292ZXJUZXN0cyhjbWRTb3VyY2UsIHRydWUsIHRydWUsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RDb2xsZWN0aW9uU3RvcmFnZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNC5JVGVzdENvbGxlY3Rpb25TdG9yYWdlU2VydmljZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RzID0gdGVzdENvbGxlY3Rpb25TdG9yYWdlLmdldFRlc3RzKHRlc3RNYW5hZ2VyLndvcmtzcGFjZUZvbGRlcik7XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RGaWxlcyA9IHRlc3RzLnRlc3RGaWxlcy5maWx0ZXIodGVzdEZpbGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlc3RGaWxlLmZ1bGxQYXRoID09PSB0aGlzLmRvY3VtZW50TWFuYWdlci5hY3RpdmVUZXh0RWRpdG9yLmRvY3VtZW50LnVyaS5mc1BhdGg7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAodGVzdEZpbGVzLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJ1blRlc3RzSW1wbChjbWRTb3VyY2UsIHRlc3RNYW5hZ2VyLndvcmtzcGFjZUZvbGRlciwgeyB0ZXN0RmlsZTogW3Rlc3RGaWxlc1swXV0gfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBydW5UZXN0c0ltcGwoY21kU291cmNlLCByZXNvdXJjZSwgdGVzdHNUb1J1biwgcnVuRmFpbGVkVGVzdHMsIGRlYnVnID0gZmFsc2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IHlpZWxkIHRoaXMuZ2V0VGVzdE1hbmFnZXIodHJ1ZSwgcmVzb3VyY2UpO1xyXG4gICAgICAgICAgICBpZiAoIXRlc3RNYW5hZ2VyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRlc3RSZXN1bHREaXNwbGF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRlc3RSZXN1bHREaXNwbGF5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc181LklUZXN0UmVzdWx0RGlzcGxheSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRlc3RSZXN1bHREaXNwbGF5Lm9uRGlkQ2hhbmdlKCgpID0+IHRoaXMub25EaWRDaGFuZ2UuZmlyZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBwcm9taXNlID0gdGVzdE1hbmFnZXIucnVuVGVzdChjbWRTb3VyY2UsIHRlc3RzVG9SdW4sIHJ1bkZhaWxlZFRlc3RzLCBkZWJ1ZylcclxuICAgICAgICAgICAgICAgIC5jYXRjaChyZWFzb24gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlYXNvbiAhPT0gY29uc3RhbnRzXzIuQ0FOQ0VMTEFUSU9OX1JFQVNPTikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbC5hcHBlbmRMaW5lKGBFcnJvcjogJHtyZWFzb259YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QocmVhc29uKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMudGVzdFJlc3VsdERpc3BsYXkuZGlzcGxheVByb2dyZXNzU3RhdHVzKHByb21pc2UsIGRlYnVnKTtcclxuICAgICAgICAgICAgeWllbGQgcHJvbWlzZTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJlZ2lzdGVyQ29tbWFuZHMoKSB7XHJcbiAgICAgICAgY29uc3QgZGlzcG9zYWJsZXNSZWdpc3RyeSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JRGlzcG9zYWJsZVJlZ2lzdHJ5KTtcclxuICAgICAgICBjb25zdCBjb21tYW5kTWFuYWdlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JQ29tbWFuZE1hbmFnZXIpO1xyXG4gICAgICAgIGNvbnN0IGRpc3Bvc2FibGVzID0gW1xyXG4gICAgICAgICAgICBjb21tYW5kTWFuYWdlci5yZWdpc3RlckNvbW1hbmQoY29uc3RhbnRzLkNvbW1hbmRzLlRlc3RzX0Rpc2NvdmVyLCAoXywgY21kU291cmNlID0gY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS5jb21tYW5kUGFsZXR0ZSwgcmVzb3VyY2UpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSB0aGUgZXhjZXB0aW9ucyByZXR1cm5lZC5cclxuICAgICAgICAgICAgICAgIC8vIFRoaXMgY29tbWFuZCB3aWxsIGJlIGludm9rZWQgZnJvbSBvdGhlciBwbGFjZXMgb2YgdGhlIGV4dGVuc2lvbi5cclxuICAgICAgICAgICAgICAgIHRoaXMuZGlzY292ZXJUZXN0cyhjbWRTb3VyY2UsIHJlc291cmNlLCB0cnVlLCB0cnVlKS5pZ25vcmVFcnJvcnMoKTtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyQ29tbWFuZChjb25zdGFudHMuQ29tbWFuZHMuVGVzdHNfUnVuX0ZhaWxlZCwgKF8sIGNtZFNvdXJjZSA9IGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UuY29tbWFuZFBhbGV0dGUsIHJlc291cmNlKSA9PiB0aGlzLnJ1blRlc3RzSW1wbChjbWRTb3VyY2UsIHJlc291cmNlLCB1bmRlZmluZWQsIHRydWUpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19SdW4sIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlLCBmaWxlLCB0ZXN0VG9SdW4pID0+IHRoaXMucnVuVGVzdHNJbXBsKGNtZFNvdXJjZSwgZmlsZSwgdGVzdFRvUnVuKSksXHJcbiAgICAgICAgICAgIGNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyQ29tbWFuZChjb25zdGFudHMuQ29tbWFuZHMuVGVzdHNfRGVidWcsIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlLCBmaWxlLCB0ZXN0VG9SdW4pID0+IHRoaXMucnVuVGVzdHNJbXBsKGNtZFNvdXJjZSwgZmlsZSwgdGVzdFRvUnVuLCBmYWxzZSwgdHJ1ZSkpLFxyXG4gICAgICAgICAgICBjb21tYW5kTWFuYWdlci5yZWdpc3RlckNvbW1hbmQoY29uc3RhbnRzLkNvbW1hbmRzLlRlc3RzX1ZpZXdfVUksICgpID0+IHRoaXMuZGlzcGxheVVJKGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UuY29tbWFuZFBhbGV0dGUpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19QaWNrZXJfVUksIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlLCBmaWxlLCB0ZXN0RnVuY3Rpb25zKSA9PiB0aGlzLmRpc3BsYXlQaWNrZXJVSShjbWRTb3VyY2UsIGZpbGUsIHRlc3RGdW5jdGlvbnMpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19QaWNrZXJfVUlfRGVidWcsIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlLCBmaWxlLCB0ZXN0RnVuY3Rpb25zKSA9PiB0aGlzLmRpc3BsYXlQaWNrZXJVSShjbWRTb3VyY2UsIGZpbGUsIHRlc3RGdW5jdGlvbnMsIHRydWUpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19TdG9wLCAoXywgcmVzb3VyY2UpID0+IHRoaXMuc3RvcFRlc3RzKHJlc291cmNlKSksXHJcbiAgICAgICAgICAgIGNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyQ29tbWFuZChjb25zdGFudHMuQ29tbWFuZHMuVGVzdHNfVmlld091dHB1dCwgKF8sIGNtZFNvdXJjZSA9IGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UuY29tbWFuZFBhbGV0dGUpID0+IHRoaXMudmlld091dHB1dChjbWRTb3VyY2UpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19Bc2tfVG9fU3RvcF9EaXNjb3ZlcnksICgpID0+IHRoaXMuZGlzcGxheVN0b3BVSSgnU3RvcCBkaXNjb3ZlcmluZyB0ZXN0cycpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19Bc2tfVG9fU3RvcF9UZXN0LCAoKSA9PiB0aGlzLmRpc3BsYXlTdG9wVUkoJ1N0b3AgcnVubmluZyB0ZXN0cycpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19TZWxlY3RfQW5kX1J1bl9NZXRob2QsIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlLCByZXNvdXJjZSkgPT4gdGhpcy5zZWxlY3RBbmRSdW5UZXN0TWV0aG9kKGNtZFNvdXJjZSwgcmVzb3VyY2UpKSxcclxuICAgICAgICAgICAgY29tbWFuZE1hbmFnZXIucmVnaXN0ZXJDb21tYW5kKGNvbnN0YW50cy5Db21tYW5kcy5UZXN0c19TZWxlY3RfQW5kX0RlYnVnX01ldGhvZCwgKF8sIGNtZFNvdXJjZSA9IGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UuY29tbWFuZFBhbGV0dGUsIHJlc291cmNlKSA9PiB0aGlzLnNlbGVjdEFuZFJ1blRlc3RNZXRob2QoY21kU291cmNlLCByZXNvdXJjZSwgdHJ1ZSkpLFxyXG4gICAgICAgICAgICBjb21tYW5kTWFuYWdlci5yZWdpc3RlckNvbW1hbmQoY29uc3RhbnRzLkNvbW1hbmRzLlRlc3RzX1NlbGVjdF9BbmRfUnVuX0ZpbGUsIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlKSA9PiB0aGlzLnNlbGVjdEFuZFJ1blRlc3RGaWxlKGNtZFNvdXJjZSkpLFxyXG4gICAgICAgICAgICBjb21tYW5kTWFuYWdlci5yZWdpc3RlckNvbW1hbmQoY29uc3RhbnRzLkNvbW1hbmRzLlRlc3RzX1J1bl9DdXJyZW50X0ZpbGUsIChfLCBjbWRTb3VyY2UgPSBjb25zdGFudHNfMi5Db21tYW5kU291cmNlLmNvbW1hbmRQYWxldHRlKSA9PiB0aGlzLnJ1bkN1cnJlbnRUZXN0RmlsZShjbWRTb3VyY2UpKVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgZGlzcG9zYWJsZXNSZWdpc3RyeS5wdXNoKC4uLmRpc3Bvc2FibGVzKTtcclxuICAgIH1cclxuICAgIG9uRG9jdW1lbnRTYXZlZChkb2MpIHtcclxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JQ29uZmlndXJhdGlvblNlcnZpY2UpLmdldFNldHRpbmdzKGRvYy51cmkpO1xyXG4gICAgICAgIGlmICghc2V0dGluZ3MudW5pdFRlc3QuYXV0b1Rlc3REaXNjb3Zlck9uU2F2ZUVuYWJsZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmRpc2NvdmVyVGVzdHNGb3JEb2N1bWVudChkb2MpLmlnbm9yZUVycm9ycygpO1xyXG4gICAgfVxyXG4gICAgcmVnaXN0ZXJIYW5kbGVycygpIHtcclxuICAgICAgICBjb25zdCBkb2N1bWVudE1hbmFnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSURvY3VtZW50TWFuYWdlcik7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlUmVnaXN0cnkucHVzaChkb2N1bWVudE1hbmFnZXIub25EaWRTYXZlVGV4dERvY3VtZW50KHRoaXMub25Eb2N1bWVudFNhdmVkLmJpbmQodGhpcykpKTtcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGVSZWdpc3RyeS5wdXNoKHRoaXMud29ya3NwYWNlU2VydmljZS5vbkRpZENoYW5nZUNvbmZpZ3VyYXRpb24oZSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZ0NoYW5nZWRUaW1lcikge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY29uZmlnQ2hhbmdlZFRpbWVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0NoYW5nZWRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5jb25maWd1cmF0aW9uQ2hhbmdlSGFuZGxlcihlKSwgMTAwMCk7XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG59O1xyXG5Vbml0VGVzdE1hbmFnZW1lbnRTZXJ2aWNlID0gX19kZWNvcmF0ZShbXHJcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXHJcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklTZXJ2aWNlQ29udGFpbmVyKSlcclxuXSwgVW5pdFRlc3RNYW5hZ2VtZW50U2VydmljZSk7XHJcbmV4cG9ydHMuVW5pdFRlc3RNYW5hZ2VtZW50U2VydmljZSA9IFVuaXRUZXN0TWFuYWdlbWVudFNlcnZpY2U7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1haW4uanMubWFwIl19