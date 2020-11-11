"use strict";

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

const vscode_1 = require("vscode");

const types_1 = require("../common/application/types");

const registry_1 = require("../common/platform/registry");

const types_2 = require("../common/platform/types");

const types_3 = require("../common/process/types");

const types_4 = require("../common/types");

const types_5 = require("../ioc/types");

const types_6 = require("./configuration/types");

const contracts_1 = require("./contracts");

const types_7 = require("./virtualEnvs/types");

const EXPITY_DURATION = 24 * 60 * 60 * 1000;
let InterpreterService = class InterpreterService {
  constructor(serviceContainer) {
    this.serviceContainer = serviceContainer;
    this.didChangeInterpreterEmitter = new vscode_1.EventEmitter();

    this.onConfigChanged = () => {
      this.didChangeInterpreterEmitter.fire();
      const interpreterDisplay = this.serviceContainer.get(contracts_1.IInterpreterDisplay);
      interpreterDisplay.refresh().catch(ex => console.error('Python Extension: display.refresh', ex));
    };

    this.locator = serviceContainer.get(contracts_1.IInterpreterLocatorService, contracts_1.INTERPRETER_LOCATOR_SERVICE);
    this.helper = serviceContainer.get(contracts_1.IInterpreterHelper);
    this.pythonPathUpdaterService = this.serviceContainer.get(types_6.IPythonPathUpdaterServiceManager);
    this.fs = this.serviceContainer.get(types_2.IFileSystem);
    this.persistentStateFactory = this.serviceContainer.get(types_4.IPersistentStateFactory);
  }

  refresh(resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const interpreterDisplay = this.serviceContainer.get(contracts_1.IInterpreterDisplay);
      return interpreterDisplay.refresh(resource);
    });
  }

  initialize() {
    const disposables = this.serviceContainer.get(types_4.IDisposableRegistry);
    const documentManager = this.serviceContainer.get(types_1.IDocumentManager);
    disposables.push(documentManager.onDidChangeActiveTextEditor(e => e ? this.refresh(e.document.uri) : undefined));
    const configService = this.serviceContainer.get(types_4.IConfigurationService);
    configService.getSettings().addListener('change', this.onConfigChanged);
  }

  getInterpreters(resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const interpreters = yield this.locator.getInterpreters(resource);
      yield Promise.all(interpreters.filter(item => !item.displayName).map(item => __awaiter(this, void 0, void 0, function* () {
        return item.displayName = yield this.getDisplayName(item, resource);
      })));
      return interpreters;
    });
  }

  autoSetInterpreter() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!(yield this.shouldAutoSetInterpreter())) {
        return;
      }

      const activeWorkspace = this.helper.getActiveWorkspaceUri();

      if (!activeWorkspace) {
        return;
      } // Check pipenv first.


      const pipenvService = this.serviceContainer.get(contracts_1.IInterpreterLocatorService, contracts_1.PIPENV_SERVICE);
      let interpreters = yield pipenvService.getInterpreters(activeWorkspace.folderUri);

      if (interpreters.length > 0) {
        yield this.pythonPathUpdaterService.updatePythonPath(interpreters[0].path, activeWorkspace.configTarget, 'load', activeWorkspace.folderUri);
        return;
      } // Now check virtual environments under the workspace root


      const virtualEnvInterpreterProvider = this.serviceContainer.get(contracts_1.IInterpreterLocatorService, contracts_1.WORKSPACE_VIRTUAL_ENV_SERVICE);
      interpreters = yield virtualEnvInterpreterProvider.getInterpreters(activeWorkspace.folderUri);
      const workspacePathUpper = activeWorkspace.folderUri.fsPath.toUpperCase();
      const interpretersInWorkspace = interpreters.filter(interpreter => vscode_1.Uri.file(interpreter.path).fsPath.toUpperCase().startsWith(workspacePathUpper));

      if (interpretersInWorkspace.length === 0) {
        return;
      } // Always pick the highest version by default.


      interpretersInWorkspace.sort((a, b) => a.version > b.version ? 1 : -1);
      const pythonPath = interpretersInWorkspace[0].path; // Ensure this new environment is at the same level as the current workspace.
      // In windows the interpreter is under scripts/python.exe on linux it is under bin/python.
      // Meaning the sub directory must be either scripts, bin or other (but only one level deep).

      const relativePath = path.dirname(pythonPath).substring(activeWorkspace.folderUri.fsPath.length);

      if (relativePath.split(path.sep).filter(l => l.length > 0).length === 2) {
        yield this.pythonPathUpdaterService.updatePythonPath(pythonPath, activeWorkspace.configTarget, 'load', activeWorkspace.folderUri);
      }
    });
  }

  dispose() {
    this.locator.dispose();
    const configService = this.serviceContainer.get(types_4.IConfigurationService);
    configService.getSettings().removeListener('change', this.onConfigChanged);
    this.didChangeInterpreterEmitter.dispose();
  }

  get onDidChangeInterpreter() {
    return this.didChangeInterpreterEmitter.event;
  }

  getActiveInterpreter(resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const pythonExecutionFactory = this.serviceContainer.get(types_3.IPythonExecutionFactory);
      const pythonExecutionService = yield pythonExecutionFactory.create({
        resource
      });
      const fullyQualifiedPath = yield pythonExecutionService.getExecutablePath().catch(() => undefined); // Python path is invalid or python isn't installed.

      if (!fullyQualifiedPath) {
        return;
      }

      return this.getInterpreterDetails(fullyQualifiedPath, resource);
    });
  }

  getInterpreterDetails(pythonPath, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      // If we don't have the fully qualified path, then get it.
      if (path.basename(pythonPath) === pythonPath) {
        const pythonExecutionFactory = this.serviceContainer.get(types_3.IPythonExecutionFactory);
        const pythonExecutionService = yield pythonExecutionFactory.create({
          resource
        });
        pythonPath = yield pythonExecutionService.getExecutablePath().catch(() => ''); // Python path is invalid or python isn't installed.

        if (!pythonPath) {
          return;
        }
      }

      let fileHash = yield this.fs.getFileHash(pythonPath).catch(() => '');
      fileHash = fileHash ? fileHash : '';
      const store = this.persistentStateFactory.createGlobalPersistentState(`${pythonPath}.interpreter.details.v5`, undefined, EXPITY_DURATION);

      if (store.value && fileHash && store.value.fileHash === fileHash) {
        return store.value;
      }

      const fs = this.serviceContainer.get(types_2.IFileSystem);
      const interpreters = yield this.getInterpreters(resource);
      let interpreterInfo = interpreters.find(i => fs.arePathsSame(i.path, pythonPath));

      if (!interpreterInfo) {
        const interpreterHelper = this.serviceContainer.get(contracts_1.IInterpreterHelper);
        const virtualEnvManager = this.serviceContainer.get(types_7.IVirtualEnvironmentManager);
        const [info, type] = yield Promise.all([interpreterHelper.getInterpreterInformation(pythonPath), virtualEnvManager.getEnvironmentType(pythonPath)]);

        if (!info) {
          return;
        }

        const details = Object.assign({}, info, {
          path: pythonPath,
          type: type
        });
        const envName = type === contracts_1.InterpreterType.Unknown ? undefined : yield virtualEnvManager.getEnvironmentName(pythonPath, resource);
        interpreterInfo = Object.assign({}, details, {
          envName
        });
        interpreterInfo.displayName = yield this.getDisplayName(interpreterInfo, resource);
      }

      yield store.updateValue(Object.assign({}, interpreterInfo, {
        path: pythonPath,
        fileHash
      }));
      return interpreterInfo;
    });
  }
  /**
   * Gets the display name of an interpreter.
   * The format is `Python <Version> <bitness> (<env name>: <env type>)`
   * E.g. `Python 3.5.1 32-bit (myenv2: virtualenv)`
   * @param {Partial<PythonInterpreter>} info
   * @returns {string}
   * @memberof InterpreterService
   */


  getDisplayName(info, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const store = this.persistentStateFactory.createGlobalPersistentState(`${info.path}.interpreter.displayName.v5`, undefined, EXPITY_DURATION);

      if (store.value) {
        return store.value;
      }

      const displayNameParts = ['Python'];
      const envSuffixParts = [];

      if (info.version_info && info.version_info.length > 0) {
        displayNameParts.push(info.version_info.slice(0, 3).join('.'));
      }

      if (info.architecture) {
        displayNameParts.push(registry_1.getArchitectureDisplayName(info.architecture));
      }

      if (!info.envName && info.path && info.type && info.type === contracts_1.InterpreterType.PipEnv) {
        // If we do not have the name of the environment, then try to get it again.
        // This can happen based on the context (i.e. resource).
        // I.e. we can determine if an environment is PipEnv only when giving it the right workspacec path (i.e. resource).
        const virtualEnvMgr = this.serviceContainer.get(types_7.IVirtualEnvironmentManager);
        info.envName = yield virtualEnvMgr.getEnvironmentName(info.path, resource);
      }

      if (info.envName && info.envName.length > 0) {
        envSuffixParts.push(`'${info.envName}'`);
      }

      if (info.type) {
        const interpreterHelper = this.serviceContainer.get(contracts_1.IInterpreterHelper);
        const name = interpreterHelper.getInterpreterTypeDisplayName(info.type);

        if (name) {
          envSuffixParts.push(name);
        }
      }

      const envSuffix = envSuffixParts.length === 0 ? '' : `(${envSuffixParts.join(': ')})`;
      const displayName = `${displayNameParts.join(' ')} ${envSuffix}`.trim(); // If dealing with cached entry, then do not store the display name in cache.

      if (!info.cachedEntry) {
        yield store.updateValue(displayName);
      }

      return displayName;
    });
  }

  shouldAutoSetInterpreter() {
    return __awaiter(this, void 0, void 0, function* () {
      const activeWorkspace = this.helper.getActiveWorkspaceUri();

      if (!activeWorkspace) {
        return false;
      }

      const workspaceService = this.serviceContainer.get(types_1.IWorkspaceService);
      const pythonConfig = workspaceService.getConfiguration('python', activeWorkspace.folderUri);
      const pythonPathInConfig = pythonConfig.inspect('pythonPath'); // If we have a value in user settings, then don't auto set the interpreter path.

      if (pythonPathInConfig && pythonPathInConfig.globalValue !== undefined && pythonPathInConfig.globalValue !== 'python') {
        return false;
      }

      if (activeWorkspace.configTarget === vscode_1.ConfigurationTarget.Workspace) {
        return pythonPathInConfig.workspaceValue === undefined || pythonPathInConfig.workspaceValue === 'python';
      }

      if (activeWorkspace.configTarget === vscode_1.ConfigurationTarget.WorkspaceFolder) {
        return pythonPathInConfig.workspaceFolderValue === undefined || pythonPathInConfig.workspaceFolderValue === 'python';
      }

      return false;
    });
  }

};
InterpreterService = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_5.IServiceContainer))], InterpreterService);
exports.InterpreterService = InterpreterService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImludGVycHJldGVyU2VydmljZS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX3BhcmFtIiwicGFyYW1JbmRleCIsImRlY29yYXRvciIsIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJleHBvcnRzIiwiaW52ZXJzaWZ5XzEiLCJyZXF1aXJlIiwicGF0aCIsInZzY29kZV8xIiwidHlwZXNfMSIsInJlZ2lzdHJ5XzEiLCJ0eXBlc18yIiwidHlwZXNfMyIsInR5cGVzXzQiLCJ0eXBlc181IiwidHlwZXNfNiIsImNvbnRyYWN0c18xIiwidHlwZXNfNyIsIkVYUElUWV9EVVJBVElPTiIsIkludGVycHJldGVyU2VydmljZSIsImNvbnN0cnVjdG9yIiwic2VydmljZUNvbnRhaW5lciIsImRpZENoYW5nZUludGVycHJldGVyRW1pdHRlciIsIkV2ZW50RW1pdHRlciIsIm9uQ29uZmlnQ2hhbmdlZCIsImZpcmUiLCJpbnRlcnByZXRlckRpc3BsYXkiLCJnZXQiLCJJSW50ZXJwcmV0ZXJEaXNwbGF5IiwicmVmcmVzaCIsImNhdGNoIiwiZXgiLCJjb25zb2xlIiwiZXJyb3IiLCJsb2NhdG9yIiwiSUludGVycHJldGVyTG9jYXRvclNlcnZpY2UiLCJJTlRFUlBSRVRFUl9MT0NBVE9SX1NFUlZJQ0UiLCJoZWxwZXIiLCJJSW50ZXJwcmV0ZXJIZWxwZXIiLCJweXRob25QYXRoVXBkYXRlclNlcnZpY2UiLCJJUHl0aG9uUGF0aFVwZGF0ZXJTZXJ2aWNlTWFuYWdlciIsImZzIiwiSUZpbGVTeXN0ZW0iLCJwZXJzaXN0ZW50U3RhdGVGYWN0b3J5IiwiSVBlcnNpc3RlbnRTdGF0ZUZhY3RvcnkiLCJyZXNvdXJjZSIsImluaXRpYWxpemUiLCJkaXNwb3NhYmxlcyIsIklEaXNwb3NhYmxlUmVnaXN0cnkiLCJkb2N1bWVudE1hbmFnZXIiLCJJRG9jdW1lbnRNYW5hZ2VyIiwicHVzaCIsIm9uRGlkQ2hhbmdlQWN0aXZlVGV4dEVkaXRvciIsImRvY3VtZW50IiwidXJpIiwidW5kZWZpbmVkIiwiY29uZmlnU2VydmljZSIsIklDb25maWd1cmF0aW9uU2VydmljZSIsImdldFNldHRpbmdzIiwiYWRkTGlzdGVuZXIiLCJnZXRJbnRlcnByZXRlcnMiLCJpbnRlcnByZXRlcnMiLCJhbGwiLCJmaWx0ZXIiLCJpdGVtIiwiZGlzcGxheU5hbWUiLCJtYXAiLCJnZXREaXNwbGF5TmFtZSIsImF1dG9TZXRJbnRlcnByZXRlciIsInNob3VsZEF1dG9TZXRJbnRlcnByZXRlciIsImFjdGl2ZVdvcmtzcGFjZSIsImdldEFjdGl2ZVdvcmtzcGFjZVVyaSIsInBpcGVudlNlcnZpY2UiLCJQSVBFTlZfU0VSVklDRSIsImZvbGRlclVyaSIsInVwZGF0ZVB5dGhvblBhdGgiLCJjb25maWdUYXJnZXQiLCJ2aXJ0dWFsRW52SW50ZXJwcmV0ZXJQcm92aWRlciIsIldPUktTUEFDRV9WSVJUVUFMX0VOVl9TRVJWSUNFIiwid29ya3NwYWNlUGF0aFVwcGVyIiwiZnNQYXRoIiwidG9VcHBlckNhc2UiLCJpbnRlcnByZXRlcnNJbldvcmtzcGFjZSIsImludGVycHJldGVyIiwiVXJpIiwiZmlsZSIsInN0YXJ0c1dpdGgiLCJzb3J0IiwiYSIsImIiLCJ2ZXJzaW9uIiwicHl0aG9uUGF0aCIsInJlbGF0aXZlUGF0aCIsImRpcm5hbWUiLCJzdWJzdHJpbmciLCJzcGxpdCIsInNlcCIsImwiLCJkaXNwb3NlIiwicmVtb3ZlTGlzdGVuZXIiLCJvbkRpZENoYW5nZUludGVycHJldGVyIiwiZXZlbnQiLCJnZXRBY3RpdmVJbnRlcnByZXRlciIsInB5dGhvbkV4ZWN1dGlvbkZhY3RvcnkiLCJJUHl0aG9uRXhlY3V0aW9uRmFjdG9yeSIsInB5dGhvbkV4ZWN1dGlvblNlcnZpY2UiLCJjcmVhdGUiLCJmdWxseVF1YWxpZmllZFBhdGgiLCJnZXRFeGVjdXRhYmxlUGF0aCIsImdldEludGVycHJldGVyRGV0YWlscyIsImJhc2VuYW1lIiwiZmlsZUhhc2giLCJnZXRGaWxlSGFzaCIsInN0b3JlIiwiY3JlYXRlR2xvYmFsUGVyc2lzdGVudFN0YXRlIiwiaW50ZXJwcmV0ZXJJbmZvIiwiZmluZCIsImFyZVBhdGhzU2FtZSIsImludGVycHJldGVySGVscGVyIiwidmlydHVhbEVudk1hbmFnZXIiLCJJVmlydHVhbEVudmlyb25tZW50TWFuYWdlciIsImluZm8iLCJ0eXBlIiwiZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbiIsImdldEVudmlyb25tZW50VHlwZSIsImRldGFpbHMiLCJhc3NpZ24iLCJlbnZOYW1lIiwiSW50ZXJwcmV0ZXJUeXBlIiwiVW5rbm93biIsImdldEVudmlyb25tZW50TmFtZSIsInVwZGF0ZVZhbHVlIiwiZGlzcGxheU5hbWVQYXJ0cyIsImVudlN1ZmZpeFBhcnRzIiwidmVyc2lvbl9pbmZvIiwic2xpY2UiLCJqb2luIiwiYXJjaGl0ZWN0dXJlIiwiZ2V0QXJjaGl0ZWN0dXJlRGlzcGxheU5hbWUiLCJQaXBFbnYiLCJ2aXJ0dWFsRW52TWdyIiwibmFtZSIsImdldEludGVycHJldGVyVHlwZURpc3BsYXlOYW1lIiwiZW52U3VmZml4IiwidHJpbSIsImNhY2hlZEVudHJ5Iiwid29ya3NwYWNlU2VydmljZSIsIklXb3Jrc3BhY2VTZXJ2aWNlIiwicHl0aG9uQ29uZmlnIiwiZ2V0Q29uZmlndXJhdGlvbiIsInB5dGhvblBhdGhJbkNvbmZpZyIsImluc3BlY3QiLCJnbG9iYWxWYWx1ZSIsIkNvbmZpZ3VyYXRpb25UYXJnZXQiLCJXb3Jrc3BhY2UiLCJ3b3Jrc3BhY2VWYWx1ZSIsIldvcmtzcGFjZUZvbGRlciIsIndvcmtzcGFjZUZvbGRlclZhbHVlIiwiaW5qZWN0YWJsZSIsImluamVjdCIsIklTZXJ2aWNlQ29udGFpbmVyIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQSxJQUFJQSxVQUFVLEdBQUksVUFBUSxTQUFLQSxVQUFkLElBQTZCLFVBQVVDLFVBQVYsRUFBc0JDLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0MsSUFBbkMsRUFBeUM7QUFDbkYsTUFBSUMsQ0FBQyxHQUFHQyxTQUFTLENBQUNDLE1BQWxCO0FBQUEsTUFBMEJDLENBQUMsR0FBR0gsQ0FBQyxHQUFHLENBQUosR0FBUUgsTUFBUixHQUFpQkUsSUFBSSxLQUFLLElBQVQsR0FBZ0JBLElBQUksR0FBR0ssTUFBTSxDQUFDQyx3QkFBUCxDQUFnQ1IsTUFBaEMsRUFBd0NDLEdBQXhDLENBQXZCLEdBQXNFQyxJQUFySDtBQUFBLE1BQTJITyxDQUEzSDtBQUNBLE1BQUksT0FBT0MsT0FBUCxLQUFtQixRQUFuQixJQUErQixPQUFPQSxPQUFPLENBQUNDLFFBQWYsS0FBNEIsVUFBL0QsRUFBMkVMLENBQUMsR0FBR0ksT0FBTyxDQUFDQyxRQUFSLENBQWlCWixVQUFqQixFQUE2QkMsTUFBN0IsRUFBcUNDLEdBQXJDLEVBQTBDQyxJQUExQyxDQUFKLENBQTNFLEtBQ0ssS0FBSyxJQUFJVSxDQUFDLEdBQUdiLFVBQVUsQ0FBQ00sTUFBWCxHQUFvQixDQUFqQyxFQUFvQ08sQ0FBQyxJQUFJLENBQXpDLEVBQTRDQSxDQUFDLEVBQTdDLEVBQWlELElBQUlILENBQUMsR0FBR1YsVUFBVSxDQUFDYSxDQUFELENBQWxCLEVBQXVCTixDQUFDLEdBQUcsQ0FBQ0gsQ0FBQyxHQUFHLENBQUosR0FBUU0sQ0FBQyxDQUFDSCxDQUFELENBQVQsR0FBZUgsQ0FBQyxHQUFHLENBQUosR0FBUU0sQ0FBQyxDQUFDVCxNQUFELEVBQVNDLEdBQVQsRUFBY0ssQ0FBZCxDQUFULEdBQTRCRyxDQUFDLENB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Q0QsYUFBTyxLQUFQO0FBQ0gsS0FuQmUsQ0FBaEI7QUFvQkg7O0FBN002QyxDQUFsRDtBQStNQTFJLGtCQUFrQixHQUFHcEQsVUFBVSxDQUFDLENBQzVCc0MsV0FBVyxDQUFDeUosVUFBWixFQUQ0QixFQUU1Qi9LLE9BQU8sQ0FBQyxDQUFELEVBQUlzQixXQUFXLENBQUMwSixNQUFaLENBQW1CakosT0FBTyxDQUFDa0osaUJBQTNCLENBQUosQ0FGcUIsQ0FBRCxFQUc1QjdJLGtCQUg0QixDQUEvQjtBQUlBZixPQUFPLENBQUNlLGtCQUFSLEdBQTZCQSxrQkFBN0IiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxudmFyIF9fcGFyYW0gPSAodGhpcyAmJiB0aGlzLl9fcGFyYW0pIHx8IGZ1bmN0aW9uIChwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59O1xyXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGludmVyc2lmeV8xID0gcmVxdWlyZShcImludmVyc2lmeVwiKTtcclxuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5jb25zdCB2c2NvZGVfMSA9IHJlcXVpcmUoXCJ2c2NvZGVcIik7XHJcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2FwcGxpY2F0aW9uL3R5cGVzXCIpO1xyXG5jb25zdCByZWdpc3RyeV8xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9wbGF0Zm9ybS9yZWdpc3RyeVwiKTtcclxuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi4vY29tbW9uL3Byb2Nlc3MvdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi4vY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc181ID0gcmVxdWlyZShcIi4uL2lvYy90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfNiA9IHJlcXVpcmUoXCIuL2NvbmZpZ3VyYXRpb24vdHlwZXNcIik7XHJcbmNvbnN0IGNvbnRyYWN0c18xID0gcmVxdWlyZShcIi4vY29udHJhY3RzXCIpO1xyXG5jb25zdCB0eXBlc183ID0gcmVxdWlyZShcIi4vdmlydHVhbEVudnMvdHlwZXNcIik7XHJcbmNvbnN0IEVYUElUWV9EVVJBVElPTiA9IDI0ICogNjAgKiA2MCAqIDEwMDA7XHJcbmxldCBJbnRlcnByZXRlclNlcnZpY2UgPSBjbGFzcyBJbnRlcnByZXRlclNlcnZpY2Uge1xyXG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lcikge1xyXG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICAgICAgdGhpcy5kaWRDaGFuZ2VJbnRlcnByZXRlckVtaXR0ZXIgPSBuZXcgdnNjb2RlXzEuRXZlbnRFbWl0dGVyKCk7XHJcbiAgICAgICAgdGhpcy5vbkNvbmZpZ0NoYW5nZWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlkQ2hhbmdlSW50ZXJwcmV0ZXJFbWl0dGVyLmZpcmUoKTtcclxuICAgICAgICAgICAgY29uc3QgaW50ZXJwcmV0ZXJEaXNwbGF5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJEaXNwbGF5KTtcclxuICAgICAgICAgICAgaW50ZXJwcmV0ZXJEaXNwbGF5LnJlZnJlc2goKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGV4ID0+IGNvbnNvbGUuZXJyb3IoJ1B5dGhvbiBFeHRlbnNpb246IGRpc3BsYXkucmVmcmVzaCcsIGV4KSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmxvY2F0b3IgPSBzZXJ2aWNlQ29udGFpbmVyLmdldChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJMb2NhdG9yU2VydmljZSwgY29udHJhY3RzXzEuSU5URVJQUkVURVJfTE9DQVRPUl9TRVJWSUNFKTtcclxuICAgICAgICB0aGlzLmhlbHBlciA9IHNlcnZpY2VDb250YWluZXIuZ2V0KGNvbnRyYWN0c18xLklJbnRlcnByZXRlckhlbHBlcik7XHJcbiAgICAgICAgdGhpcy5weXRob25QYXRoVXBkYXRlclNlcnZpY2UgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzYuSVB5dGhvblBhdGhVcGRhdGVyU2VydmljZU1hbmFnZXIpO1xyXG4gICAgICAgIHRoaXMuZnMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSUZpbGVTeXN0ZW0pO1xyXG4gICAgICAgIHRoaXMucGVyc2lzdGVudFN0YXRlRmFjdG9yeSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNC5JUGVyc2lzdGVudFN0YXRlRmFjdG9yeSk7XHJcbiAgICB9XHJcbiAgICByZWZyZXNoKHJlc291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgaW50ZXJwcmV0ZXJEaXNwbGF5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJEaXNwbGF5KTtcclxuICAgICAgICAgICAgcmV0dXJuIGludGVycHJldGVyRGlzcGxheS5yZWZyZXNoKHJlc291cmNlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgY29uc3QgZGlzcG9zYWJsZXMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzQuSURpc3Bvc2FibGVSZWdpc3RyeSk7XHJcbiAgICAgICAgY29uc3QgZG9jdW1lbnRNYW5hZ2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklEb2N1bWVudE1hbmFnZXIpO1xyXG4gICAgICAgIGRpc3Bvc2FibGVzLnB1c2goZG9jdW1lbnRNYW5hZ2VyLm9uRGlkQ2hhbmdlQWN0aXZlVGV4dEVkaXRvcigoZSkgPT4gZSA/IHRoaXMucmVmcmVzaChlLmRvY3VtZW50LnVyaSkgOiB1bmRlZmluZWQpKTtcclxuICAgICAgICBjb25zdCBjb25maWdTZXJ2aWNlID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc180LklDb25maWd1cmF0aW9uU2VydmljZSk7XHJcbiAgICAgICAgY29uZmlnU2VydmljZS5nZXRTZXR0aW5ncygpLmFkZExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uQ29uZmlnQ2hhbmdlZCk7XHJcbiAgICB9XHJcbiAgICBnZXRJbnRlcnByZXRlcnMocmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB0aGlzLmxvY2F0b3IuZ2V0SW50ZXJwcmV0ZXJzKHJlc291cmNlKTtcclxuICAgICAgICAgICAgeWllbGQgUHJvbWlzZS5hbGwoaW50ZXJwcmV0ZXJzXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGl0ZW0gPT4gIWl0ZW0uZGlzcGxheU5hbWUpXHJcbiAgICAgICAgICAgICAgICAubWFwKChpdGVtKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7IHJldHVybiBpdGVtLmRpc3BsYXlOYW1lID0geWllbGQgdGhpcy5nZXREaXNwbGF5TmFtZShpdGVtLCByZXNvdXJjZSk7IH0pKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnByZXRlcnM7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhdXRvU2V0SW50ZXJwcmV0ZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgaWYgKCEoeWllbGQgdGhpcy5zaG91bGRBdXRvU2V0SW50ZXJwcmV0ZXIoKSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBhY3RpdmVXb3Jrc3BhY2UgPSB0aGlzLmhlbHBlci5nZXRBY3RpdmVXb3Jrc3BhY2VVcmkoKTtcclxuICAgICAgICAgICAgaWYgKCFhY3RpdmVXb3Jrc3BhY2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBDaGVjayBwaXBlbnYgZmlyc3QuXHJcbiAgICAgICAgICAgIGNvbnN0IHBpcGVudlNlcnZpY2UgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KGNvbnRyYWN0c18xLklJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlLCBjb250cmFjdHNfMS5QSVBFTlZfU0VSVklDRSk7XHJcbiAgICAgICAgICAgIGxldCBpbnRlcnByZXRlcnMgPSB5aWVsZCBwaXBlbnZTZXJ2aWNlLmdldEludGVycHJldGVycyhhY3RpdmVXb3Jrc3BhY2UuZm9sZGVyVXJpKTtcclxuICAgICAgICAgICAgaWYgKGludGVycHJldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnB5dGhvblBhdGhVcGRhdGVyU2VydmljZS51cGRhdGVQeXRob25QYXRoKGludGVycHJldGVyc1swXS5wYXRoLCBhY3RpdmVXb3Jrc3BhY2UuY29uZmlnVGFyZ2V0LCAnbG9hZCcsIGFjdGl2ZVdvcmtzcGFjZS5mb2xkZXJVcmkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIE5vdyBjaGVjayB2aXJ0dWFsIGVudmlyb25tZW50cyB1bmRlciB0aGUgd29ya3NwYWNlIHJvb3RcclxuICAgICAgICAgICAgY29uc3QgdmlydHVhbEVudkludGVycHJldGVyUHJvdmlkZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KGNvbnRyYWN0c18xLklJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlLCBjb250cmFjdHNfMS5XT1JLU1BBQ0VfVklSVFVBTF9FTlZfU0VSVklDRSk7XHJcbiAgICAgICAgICAgIGludGVycHJldGVycyA9IHlpZWxkIHZpcnR1YWxFbnZJbnRlcnByZXRlclByb3ZpZGVyLmdldEludGVycHJldGVycyhhY3RpdmVXb3Jrc3BhY2UuZm9sZGVyVXJpKTtcclxuICAgICAgICAgICAgY29uc3Qgd29ya3NwYWNlUGF0aFVwcGVyID0gYWN0aXZlV29ya3NwYWNlLmZvbGRlclVyaS5mc1BhdGgudG9VcHBlckNhc2UoKTtcclxuICAgICAgICAgICAgY29uc3QgaW50ZXJwcmV0ZXJzSW5Xb3Jrc3BhY2UgPSBpbnRlcnByZXRlcnMuZmlsdGVyKGludGVycHJldGVyID0+IHZzY29kZV8xLlVyaS5maWxlKGludGVycHJldGVyLnBhdGgpLmZzUGF0aC50b1VwcGVyQ2FzZSgpLnN0YXJ0c1dpdGgod29ya3NwYWNlUGF0aFVwcGVyKSk7XHJcbiAgICAgICAgICAgIGlmIChpbnRlcnByZXRlcnNJbldvcmtzcGFjZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBBbHdheXMgcGljayB0aGUgaGlnaGVzdCB2ZXJzaW9uIGJ5IGRlZmF1bHQuXHJcbiAgICAgICAgICAgIGludGVycHJldGVyc0luV29ya3NwYWNlLnNvcnQoKGEsIGIpID0+IGEudmVyc2lvbiA+IGIudmVyc2lvbiA/IDEgOiAtMSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHB5dGhvblBhdGggPSBpbnRlcnByZXRlcnNJbldvcmtzcGFjZVswXS5wYXRoO1xyXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhpcyBuZXcgZW52aXJvbm1lbnQgaXMgYXQgdGhlIHNhbWUgbGV2ZWwgYXMgdGhlIGN1cnJlbnQgd29ya3NwYWNlLlxyXG4gICAgICAgICAgICAvLyBJbiB3aW5kb3dzIHRoZSBpbnRlcnByZXRlciBpcyB1bmRlciBzY3JpcHRzL3B5dGhvbi5leGUgb24gbGludXggaXQgaXMgdW5kZXIgYmluL3B5dGhvbi5cclxuICAgICAgICAgICAgLy8gTWVhbmluZyB0aGUgc3ViIGRpcmVjdG9yeSBtdXN0IGJlIGVpdGhlciBzY3JpcHRzLCBiaW4gb3Igb3RoZXIgKGJ1dCBvbmx5IG9uZSBsZXZlbCBkZWVwKS5cclxuICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gcGF0aC5kaXJuYW1lKHB5dGhvblBhdGgpLnN1YnN0cmluZyhhY3RpdmVXb3Jrc3BhY2UuZm9sZGVyVXJpLmZzUGF0aC5sZW5ndGgpO1xyXG4gICAgICAgICAgICBpZiAocmVsYXRpdmVQYXRoLnNwbGl0KHBhdGguc2VwKS5maWx0ZXIobCA9PiBsLmxlbmd0aCA+IDApLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5weXRob25QYXRoVXBkYXRlclNlcnZpY2UudXBkYXRlUHl0aG9uUGF0aChweXRob25QYXRoLCBhY3RpdmVXb3Jrc3BhY2UuY29uZmlnVGFyZ2V0LCAnbG9hZCcsIGFjdGl2ZVdvcmtzcGFjZS5mb2xkZXJVcmkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBkaXNwb3NlKCkge1xyXG4gICAgICAgIHRoaXMubG9jYXRvci5kaXNwb3NlKCk7XHJcbiAgICAgICAgY29uc3QgY29uZmlnU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNC5JQ29uZmlndXJhdGlvblNlcnZpY2UpO1xyXG4gICAgICAgIGNvbmZpZ1NlcnZpY2UuZ2V0U2V0dGluZ3MoKS5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5vbkNvbmZpZ0NoYW5nZWQpO1xyXG4gICAgICAgIHRoaXMuZGlkQ2hhbmdlSW50ZXJwcmV0ZXJFbWl0dGVyLmRpc3Bvc2UoKTtcclxuICAgIH1cclxuICAgIGdldCBvbkRpZENoYW5nZUludGVycHJldGVyKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpZENoYW5nZUludGVycHJldGVyRW1pdHRlci5ldmVudDtcclxuICAgIH1cclxuICAgIGdldEFjdGl2ZUludGVycHJldGVyKHJlc291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgcHl0aG9uRXhlY3V0aW9uRmFjdG9yeSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JUHl0aG9uRXhlY3V0aW9uRmFjdG9yeSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHB5dGhvbkV4ZWN1dGlvblNlcnZpY2UgPSB5aWVsZCBweXRob25FeGVjdXRpb25GYWN0b3J5LmNyZWF0ZSh7IHJlc291cmNlIH0pO1xyXG4gICAgICAgICAgICBjb25zdCBmdWxseVF1YWxpZmllZFBhdGggPSB5aWVsZCBweXRob25FeGVjdXRpb25TZXJ2aWNlLmdldEV4ZWN1dGFibGVQYXRoKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgLy8gUHl0aG9uIHBhdGggaXMgaW52YWxpZCBvciBweXRob24gaXNuJ3QgaW5zdGFsbGVkLlxyXG4gICAgICAgICAgICBpZiAoIWZ1bGx5UXVhbGlmaWVkUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEludGVycHJldGVyRGV0YWlscyhmdWxseVF1YWxpZmllZFBhdGgsIHJlc291cmNlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldEludGVycHJldGVyRGV0YWlscyhweXRob25QYXRoLCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgdGhlIGZ1bGx5IHF1YWxpZmllZCBwYXRoLCB0aGVuIGdldCBpdC5cclxuICAgICAgICAgICAgaWYgKHBhdGguYmFzZW5hbWUocHl0aG9uUGF0aCkgPT09IHB5dGhvblBhdGgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHB5dGhvbkV4ZWN1dGlvbkZhY3RvcnkgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSVB5dGhvbkV4ZWN1dGlvbkZhY3RvcnkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHl0aG9uRXhlY3V0aW9uU2VydmljZSA9IHlpZWxkIHB5dGhvbkV4ZWN1dGlvbkZhY3RvcnkuY3JlYXRlKHsgcmVzb3VyY2UgfSk7XHJcbiAgICAgICAgICAgICAgICBweXRob25QYXRoID0geWllbGQgcHl0aG9uRXhlY3V0aW9uU2VydmljZS5nZXRFeGVjdXRhYmxlUGF0aCgpLmNhdGNoKCgpID0+ICcnKTtcclxuICAgICAgICAgICAgICAgIC8vIFB5dGhvbiBwYXRoIGlzIGludmFsaWQgb3IgcHl0aG9uIGlzbid0IGluc3RhbGxlZC5cclxuICAgICAgICAgICAgICAgIGlmICghcHl0aG9uUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZmlsZUhhc2ggPSB5aWVsZCB0aGlzLmZzLmdldEZpbGVIYXNoKHB5dGhvblBhdGgpLmNhdGNoKCgpID0+ICcnKTtcclxuICAgICAgICAgICAgZmlsZUhhc2ggPSBmaWxlSGFzaCA/IGZpbGVIYXNoIDogJyc7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdGhpcy5wZXJzaXN0ZW50U3RhdGVGYWN0b3J5LmNyZWF0ZUdsb2JhbFBlcnNpc3RlbnRTdGF0ZShgJHtweXRob25QYXRofS5pbnRlcnByZXRlci5kZXRhaWxzLnY1YCwgdW5kZWZpbmVkLCBFWFBJVFlfRFVSQVRJT04pO1xyXG4gICAgICAgICAgICBpZiAoc3RvcmUudmFsdWUgJiYgZmlsZUhhc2ggJiYgc3RvcmUudmFsdWUuZmlsZUhhc2ggPT09IGZpbGVIYXNoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RvcmUudmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZnMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSUZpbGVTeXN0ZW0pO1xyXG4gICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB0aGlzLmdldEludGVycHJldGVycyhyZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIGxldCBpbnRlcnByZXRlckluZm8gPSBpbnRlcnByZXRlcnMuZmluZChpID0+IGZzLmFyZVBhdGhzU2FtZShpLnBhdGgsIHB5dGhvblBhdGgpKTtcclxuICAgICAgICAgICAgaWYgKCFpbnRlcnByZXRlckluZm8pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGludGVycHJldGVySGVscGVyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJIZWxwZXIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmlydHVhbEVudk1hbmFnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzcuSVZpcnR1YWxFbnZpcm9ubWVudE1hbmFnZXIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgW2luZm8sIHR5cGVdID0geWllbGQgUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldGVySGVscGVyLmdldEludGVycHJldGVySW5mb3JtYXRpb24ocHl0aG9uUGF0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgdmlydHVhbEVudk1hbmFnZXIuZ2V0RW52aXJvbm1lbnRUeXBlKHB5dGhvblBhdGgpXHJcbiAgICAgICAgICAgICAgICBdKTtcclxuICAgICAgICAgICAgICAgIGlmICghaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBPYmplY3QuYXNzaWduKHt9LCBpbmZvLCB7IHBhdGg6IHB5dGhvblBhdGgsIHR5cGU6IHR5cGUgfSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbnZOYW1lID0gdHlwZSA9PT0gY29udHJhY3RzXzEuSW50ZXJwcmV0ZXJUeXBlLlVua25vd24gPyB1bmRlZmluZWQgOiB5aWVsZCB2aXJ0dWFsRW52TWFuYWdlci5nZXRFbnZpcm9ubWVudE5hbWUocHl0aG9uUGF0aCwgcmVzb3VyY2UpO1xyXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXJJbmZvID0gT2JqZWN0LmFzc2lnbih7fSwgZGV0YWlscywgeyBlbnZOYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXJJbmZvLmRpc3BsYXlOYW1lID0geWllbGQgdGhpcy5nZXREaXNwbGF5TmFtZShpbnRlcnByZXRlckluZm8sIHJlc291cmNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB5aWVsZCBzdG9yZS51cGRhdGVWYWx1ZShPYmplY3QuYXNzaWduKHt9LCBpbnRlcnByZXRlckluZm8sIHsgcGF0aDogcHl0aG9uUGF0aCwgZmlsZUhhc2ggfSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJwcmV0ZXJJbmZvO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIHRoZSBkaXNwbGF5IG5hbWUgb2YgYW4gaW50ZXJwcmV0ZXIuXHJcbiAgICAgKiBUaGUgZm9ybWF0IGlzIGBQeXRob24gPFZlcnNpb24+IDxiaXRuZXNzPiAoPGVudiBuYW1lPjogPGVudiB0eXBlPilgXHJcbiAgICAgKiBFLmcuIGBQeXRob24gMy41LjEgMzItYml0IChteWVudjI6IHZpcnR1YWxlbnYpYFxyXG4gICAgICogQHBhcmFtIHtQYXJ0aWFsPFB5dGhvbkludGVycHJldGVyPn0gaW5mb1xyXG4gICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAqIEBtZW1iZXJvZiBJbnRlcnByZXRlclNlcnZpY2VcclxuICAgICAqL1xyXG4gICAgZ2V0RGlzcGxheU5hbWUoaW5mbywgcmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHRoaXMucGVyc2lzdGVudFN0YXRlRmFjdG9yeS5jcmVhdGVHbG9iYWxQZXJzaXN0ZW50U3RhdGUoYCR7aW5mby5wYXRofS5pbnRlcnByZXRlci5kaXNwbGF5TmFtZS52NWAsIHVuZGVmaW5lZCwgRVhQSVRZX0RVUkFUSU9OKTtcclxuICAgICAgICAgICAgaWYgKHN0b3JlLnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RvcmUudmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZGlzcGxheU5hbWVQYXJ0cyA9IFsnUHl0aG9uJ107XHJcbiAgICAgICAgICAgIGNvbnN0IGVudlN1ZmZpeFBhcnRzID0gW107XHJcbiAgICAgICAgICAgIGlmIChpbmZvLnZlcnNpb25faW5mbyAmJiBpbmZvLnZlcnNpb25faW5mby5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZVBhcnRzLnB1c2goaW5mby52ZXJzaW9uX2luZm8uc2xpY2UoMCwgMykuam9pbignLicpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaW5mby5hcmNoaXRlY3R1cmUpIHtcclxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lUGFydHMucHVzaChyZWdpc3RyeV8xLmdldEFyY2hpdGVjdHVyZURpc3BsYXlOYW1lKGluZm8uYXJjaGl0ZWN0dXJlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFpbmZvLmVudk5hbWUgJiYgaW5mby5wYXRoICYmIGluZm8udHlwZSAmJiBpbmZvLnR5cGUgPT09IGNvbnRyYWN0c18xLkludGVycHJldGVyVHlwZS5QaXBFbnYpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGRvIG5vdCBoYXZlIHRoZSBuYW1lIG9mIHRoZSBlbnZpcm9ubWVudCwgdGhlbiB0cnkgdG8gZ2V0IGl0IGFnYWluLlxyXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBjYW4gaGFwcGVuIGJhc2VkIG9uIHRoZSBjb250ZXh0IChpLmUuIHJlc291cmNlKS5cclxuICAgICAgICAgICAgICAgIC8vIEkuZS4gd2UgY2FuIGRldGVybWluZSBpZiBhbiBlbnZpcm9ubWVudCBpcyBQaXBFbnYgb25seSB3aGVuIGdpdmluZyBpdCB0aGUgcmlnaHQgd29ya3NwYWNlYyBwYXRoIChpLmUuIHJlc291cmNlKS5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHZpcnR1YWxFbnZNZ3IgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzcuSVZpcnR1YWxFbnZpcm9ubWVudE1hbmFnZXIpO1xyXG4gICAgICAgICAgICAgICAgaW5mby5lbnZOYW1lID0geWllbGQgdmlydHVhbEVudk1nci5nZXRFbnZpcm9ubWVudE5hbWUoaW5mby5wYXRoLCByZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGluZm8uZW52TmFtZSAmJiBpbmZvLmVudk5hbWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZW52U3VmZml4UGFydHMucHVzaChgJyR7aW5mby5lbnZOYW1lfSdgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaW5mby50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlckhlbHBlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQoY29udHJhY3RzXzEuSUludGVycHJldGVySGVscGVyKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBpbnRlcnByZXRlckhlbHBlci5nZXRJbnRlcnByZXRlclR5cGVEaXNwbGF5TmFtZShpbmZvLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbnZTdWZmaXhQYXJ0cy5wdXNoKG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGVudlN1ZmZpeCA9IGVudlN1ZmZpeFBhcnRzLmxlbmd0aCA9PT0gMCA/ICcnIDpcclxuICAgICAgICAgICAgICAgIGAoJHtlbnZTdWZmaXhQYXJ0cy5qb2luKCc6ICcpfSlgO1xyXG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGAke2Rpc3BsYXlOYW1lUGFydHMuam9pbignICcpfSAke2VudlN1ZmZpeH1gLnRyaW0oKTtcclxuICAgICAgICAgICAgLy8gSWYgZGVhbGluZyB3aXRoIGNhY2hlZCBlbnRyeSwgdGhlbiBkbyBub3Qgc3RvcmUgdGhlIGRpc3BsYXkgbmFtZSBpbiBjYWNoZS5cclxuICAgICAgICAgICAgaWYgKCFpbmZvLmNhY2hlZEVudHJ5KSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCBzdG9yZS51cGRhdGVWYWx1ZShkaXNwbGF5TmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGRpc3BsYXlOYW1lO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc2hvdWxkQXV0b1NldEludGVycHJldGVyKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFjdGl2ZVdvcmtzcGFjZSA9IHRoaXMuaGVscGVyLmdldEFjdGl2ZVdvcmtzcGFjZVVyaSgpO1xyXG4gICAgICAgICAgICBpZiAoIWFjdGl2ZVdvcmtzcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHdvcmtzcGFjZVNlcnZpY2UgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSVdvcmtzcGFjZVNlcnZpY2UpO1xyXG4gICAgICAgICAgICBjb25zdCBweXRob25Db25maWcgPSB3b3Jrc3BhY2VTZXJ2aWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicsIGFjdGl2ZVdvcmtzcGFjZS5mb2xkZXJVcmkpO1xyXG4gICAgICAgICAgICBjb25zdCBweXRob25QYXRoSW5Db25maWcgPSBweXRob25Db25maWcuaW5zcGVjdCgncHl0aG9uUGF0aCcpO1xyXG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgaW4gdXNlciBzZXR0aW5ncywgdGhlbiBkb24ndCBhdXRvIHNldCB0aGUgaW50ZXJwcmV0ZXIgcGF0aC5cclxuICAgICAgICAgICAgaWYgKHB5dGhvblBhdGhJbkNvbmZpZyAmJiBweXRob25QYXRoSW5Db25maWcuZ2xvYmFsVmFsdWUgIT09IHVuZGVmaW5lZCAmJiBweXRob25QYXRoSW5Db25maWcuZ2xvYmFsVmFsdWUgIT09ICdweXRob24nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGFjdGl2ZVdvcmtzcGFjZS5jb25maWdUYXJnZXQgPT09IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHl0aG9uUGF0aEluQ29uZmlnLndvcmtzcGFjZVZhbHVlID09PSB1bmRlZmluZWQgfHwgcHl0aG9uUGF0aEluQ29uZmlnLndvcmtzcGFjZVZhbHVlID09PSAncHl0aG9uJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlV29ya3NwYWNlLmNvbmZpZ1RhcmdldCA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2VGb2xkZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBweXRob25QYXRoSW5Db25maWcud29ya3NwYWNlRm9sZGVyVmFsdWUgPT09IHVuZGVmaW5lZCB8fCBweXRob25QYXRoSW5Db25maWcud29ya3NwYWNlRm9sZGVyVmFsdWUgPT09ICdweXRob24nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuSW50ZXJwcmV0ZXJTZXJ2aWNlID0gX19kZWNvcmF0ZShbXHJcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXHJcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc181LklTZXJ2aWNlQ29udGFpbmVyKSlcclxuXSwgSW50ZXJwcmV0ZXJTZXJ2aWNlKTtcclxuZXhwb3J0cy5JbnRlcnByZXRlclNlcnZpY2UgPSBJbnRlcnByZXRlclNlcnZpY2U7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWludGVycHJldGVyU2VydmljZS5qcy5tYXAiXX0=