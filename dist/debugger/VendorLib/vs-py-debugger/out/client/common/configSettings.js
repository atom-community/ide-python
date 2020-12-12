'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

const child_process = require("child_process");

const events_1 = require("events");

const path = require("path");

const vscode_1 = require("vscode");

const telemetry_1 = require("../telemetry");

const constants_1 = require("../telemetry/constants");

const constants_2 = require("./constants");

const systemVariables_1 = require("./variables/systemVariables"); // tslint:disable-next-line:no-require-imports no-var-requires


const untildify = require('untildify');

exports.IS_WINDOWS = /^win/.test(process.platform); // tslint:disable-next-line:completed-docs

class PythonSettings extends events_1.EventEmitter {
  constructor(workspaceFolder) {
    super();
    this.downloadLanguageServer = true;
    this.jediEnabled = true;
    this.jediPath = '';
    this.jediMemoryLimit = 1024;
    this.envFile = '';
    this.venvPath = '';
    this.venvFolders = [];
    this.condaPath = '';
    this.devOptions = [];
    this.disableInstallationChecks = false;
    this.globalModuleInstallation = false;
    this.autoUpdateLanguageServer = true;
    this.disposables = []; // tslint:disable-next-line:variable-name

    this._pythonPath = '';
    this.workspaceRoot = workspaceFolder ? workspaceFolder : vscode_1.Uri.file(__dirname);
    this.initialize();
  } // tslint:disable-next-line:function-name


  static getInstance(resource) {
    const workspaceFolderUri = PythonSettings.getSettingsUriAndTarget(resource).uri;
    const workspaceFolderKey = workspaceFolderUri ? workspaceFolderUri.fsPath : '';

    if (!PythonSettings.pythonSettings.has(workspaceFolderKey)) {
      const settings = new PythonSettings(workspaceFolderUri);
      PythonSettings.pythonSettings.set(workspaceFolderKey, settings);
      const formatOnType = vscode_1.workspace.getConfiguration('editor', resource ? resource : null).get('formatOnType', false);
      telemetry_1.sendTelemetryEvent(constants_1.COMPLETION_ADD_BRACKETS, undefined, {
        enabled: settings.autoComplete.addBrackets
      });
      telemetry_1.sendTelemetryEvent(constants_1.FORMAT_ON_TYPE, undefined, {
        enabled: formatOnType
      });
    } // tslint:disable-next-line:no-non-null-assertion


    return PythonSettings.pythonSettings.get(workspaceFolderKey);
  } // tslint:disable-next-line:type-literal-delimiter


  static getSettingsUriAndTarget(resource) {
    const workspaceFolder = resource ? vscode_1.workspace.getWorkspaceFolder(resource) : undefined;
    let workspaceFolderUri = workspaceFolder ? workspaceFolder.uri : undefined;

    if (!workspaceFolderUri && Array.isArray(vscode_1.workspace.workspaceFolders) && vscode_1.workspace.workspaceFolders.length > 0) {
      workspaceFolderUri = vscode_1.workspace.workspaceFolders[0].uri;
    }

    const target = workspaceFolderUri ? vscode_1.ConfigurationTarget.WorkspaceFolder : vscode_1.ConfigurationTarget.Global;
    return {
      uri: workspaceFolderUri,
      target
    };
  } // tslint:disable-next-line:function-name


  static dispose() {
    if (!constants_2.isTestExecution()) {
      throw new Error('Dispose can only be called from unit tests');
    } // tslint:disable-next-line:no-void-expression


    PythonSettings.pythonSettings.forEach(item => item.dispose());
    PythonSettings.pythonSettings.clear();
  }

  dispose() {
    // tslint:disable-next-line:no-unsafe-any
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  } // tslint:disable-next-line:cyclomatic-complexity max-func-body-length


  update(pythonSettings) {
    const workspaceRoot = this.workspaceRoot.fsPath;
    const systemVariables = new systemVariables_1.SystemVariables(this.workspaceRoot ? this.workspaceRoot.fsPath : undefined); // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    this.pythonPath = systemVariables.resolveAny(pythonSettings.get('pythonPath'));
    this.pythonPath = getAbsolutePath(this.pythonPath, workspaceRoot); // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    this.venvPath = systemVariables.resolveAny(pythonSettings.get('venvPath'));
    this.venvFolders = systemVariables.resolveAny(pythonSettings.get('venvFolders'));
    const condaPath = systemVariables.resolveAny(pythonSettings.get('condaPath'));
    this.condaPath = condaPath && condaPath.length > 0 ? getAbsolutePath(condaPath, workspaceRoot) : condaPath;
    this.downloadLanguageServer = systemVariables.resolveAny(pythonSettings.get('downloadLanguageServer', true));
    this.jediEnabled = systemVariables.resolveAny(pythonSettings.get('jediEnabled', true));
    this.autoUpdateLanguageServer = systemVariables.resolveAny(pythonSettings.get('autoUpdateLanguageServer', true));

    if (this.jediEnabled) {
      // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion
      this.jediPath = systemVariables.resolveAny(pythonSettings.get('jediPath'));

      if (typeof this.jediPath === 'string' && this.jediPath.length > 0) {
        this.jediPath = getAbsolutePath(systemVariables.resolveAny(this.jediPath), workspaceRoot);
      } else {
        this.jediPath = '';
      }

      this.jediMemoryLimit = pythonSettings.get('jediMemoryLimit');
    } // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion


    this.envFile = systemVariables.resolveAny(pythonSettings.get('envFile')); // tslint:disable-next-line:no-any
    // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion no-any

    this.devOptions = systemVariables.resolveAny(pythonSettings.get('devOptions'));
    this.devOptions = Array.isArray(this.devOptions) ? this.devOptions : []; // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const lintingSettings = systemVariables.resolveAny(pythonSettings.get('linting'));

    if (this.linting) {
      Object.assign(this.linting, lintingSettings);
    } else {
      this.linting = lintingSettings;
    } // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion


    const analysisSettings = systemVariables.resolveAny(pythonSettings.get('analysis'));

    if (this.analysis) {
      Object.assign(this.analysis, analysisSettings);
    } else {
      this.analysis = analysisSettings;
    }

    this.disableInstallationChecks = pythonSettings.get('disableInstallationCheck') === true;
    this.globalModuleInstallation = pythonSettings.get('globalModuleInstallation') === true; // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const sortImportSettings = systemVariables.resolveAny(pythonSettings.get('sortImports'));

    if (this.sortImports) {
      Object.assign(this.sortImports, sortImportSettings);
    } else {
      this.sortImports = sortImportSettings;
    } // Support for travis.


    this.sortImports = this.sortImports ? this.sortImports : {
      path: '',
      args: []
    }; // Support for travis.

    this.linting = this.linting ? this.linting : {
      enabled: false,
      ignorePatterns: [],
      flake8Args: [],
      flake8Enabled: false,
      flake8Path: 'flake',
      lintOnSave: false,
      maxNumberOfProblems: 100,
      mypyArgs: [],
      mypyEnabled: false,
      mypyPath: 'mypy',
      banditArgs: [],
      banditEnabled: false,
      banditPath: 'bandit',
      pep8Args: [],
      pep8Enabled: false,
      pep8Path: 'pep8',
      pylamaArgs: [],
      pylamaEnabled: false,
      pylamaPath: 'pylama',
      prospectorArgs: [],
      prospectorEnabled: false,
      prospectorPath: 'prospector',
      pydocstyleArgs: [],
      pydocstyleEnabled: false,
      pydocstylePath: 'pydocstyle',
      pylintArgs: [],
      pylintEnabled: false,
      pylintPath: 'pylint',
      pylintCategorySeverity: {
        convention: vscode_1.DiagnosticSeverity.Hint,
        error: vscode_1.DiagnosticSeverity.Error,
        fatal: vscode_1.DiagnosticSeverity.Error,
        refactor: vscode_1.DiagnosticSeverity.Hint,
        warning: vscode_1.DiagnosticSeverity.Warning
      },
      pep8CategorySeverity: {
        E: vscode_1.DiagnosticSeverity.Error,
        W: vscode_1.DiagnosticSeverity.Warning
      },
      flake8CategorySeverity: {
        E: vscode_1.DiagnosticSeverity.Error,
        W: vscode_1.DiagnosticSeverity.Warning,
        // Per http://flake8.pycqa.org/en/latest/glossary.html#term-error-code
        // 'F' does not mean 'fatal as in PyLint but rather 'pyflakes' such as
        // unused imports, variables, etc.
        F: vscode_1.DiagnosticSeverity.Warning
      },
      mypyCategorySeverity: {
        error: vscode_1.DiagnosticSeverity.Error,
        note: vscode_1.DiagnosticSeverity.Hint
      },
      pylintUseMinimalCheckers: false
    };
    this.linting.pylintPath = getAbsolutePath(systemVariables.resolveAny(this.linting.pylintPath), workspaceRoot);
    this.linting.flake8Path = getAbsolutePath(systemVariables.resolveAny(this.linting.flake8Path), workspaceRoot);
    this.linting.pep8Path = getAbsolutePath(systemVariables.resolveAny(this.linting.pep8Path), workspaceRoot);
    this.linting.pylamaPath = getAbsolutePath(systemVariables.resolveAny(this.linting.pylamaPath), workspaceRoot);
    this.linting.prospectorPath = getAbsolutePath(systemVariables.resolveAny(this.linting.prospectorPath), workspaceRoot);
    this.linting.pydocstylePath = getAbsolutePath(systemVariables.resolveAny(this.linting.pydocstylePath), workspaceRoot);
    this.linting.mypyPath = getAbsolutePath(systemVariables.resolveAny(this.linting.mypyPath), workspaceRoot);
    this.linting.banditPath = getAbsolutePath(systemVariables.resolveAny(this.linting.banditPath), workspaceRoot); // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const formattingSettings = systemVariables.resolveAny(pythonSettings.get('formatting'));

    if (this.formatting) {
      Object.assign(this.formatting, formattingSettings);
    } else {
      this.formatting = formattingSettings;
    } // Support for travis.


    this.formatting = this.formatting ? this.formatting : {
      autopep8Args: [],
      autopep8Path: 'autopep8',
      provider: 'autopep8',
      blackArgs: [],
      blackPath: 'black',
      yapfArgs: [],
      yapfPath: 'yapf'
    };
    this.formatting.autopep8Path = getAbsolutePath(systemVariables.resolveAny(this.formatting.autopep8Path), workspaceRoot);
    this.formatting.yapfPath = getAbsolutePath(systemVariables.resolveAny(this.formatting.yapfPath), workspaceRoot);
    this.formatting.blackPath = getAbsolutePath(systemVariables.resolveAny(this.formatting.blackPath), workspaceRoot); // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const autoCompleteSettings = systemVariables.resolveAny(pythonSettings.get('autoComplete'));

    if (this.autoComplete) {
      Object.assign(this.autoComplete, autoCompleteSettings);
    } else {
      this.autoComplete = autoCompleteSettings;
    } // Support for travis.


    this.autoComplete = this.autoComplete ? this.autoComplete : {
      extraPaths: [],
      addBrackets: false,
      showAdvancedMembers: false,
      typeshedPaths: []
    }; // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const workspaceSymbolsSettings = systemVariables.resolveAny(pythonSettings.get('workspaceSymbols'));

    if (this.workspaceSymbols) {
      Object.assign(this.workspaceSymbols, workspaceSymbolsSettings);
    } else {
      this.workspaceSymbols = workspaceSymbolsSettings;
    } // Support for travis.


    this.workspaceSymbols = this.workspaceSymbols ? this.workspaceSymbols : {
      ctagsPath: 'ctags',
      enabled: true,
      exclusionPatterns: [],
      rebuildOnFileSave: true,
      rebuildOnStart: true,
      tagFilePath: path.join(workspaceRoot, 'tags')
    };
    this.workspaceSymbols.tagFilePath = getAbsolutePath(systemVariables.resolveAny(this.workspaceSymbols.tagFilePath), workspaceRoot); // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const unitTestSettings = systemVariables.resolveAny(pythonSettings.get('unitTest'));

    if (this.unitTest) {
      Object.assign(this.unitTest, unitTestSettings);
    } else {
      this.unitTest = unitTestSettings;

      if (constants_2.isTestExecution() && !this.unitTest) {
        // tslint:disable-next-line:prefer-type-cast
        // tslint:disable-next-line:no-object-literal-type-assertion
        this.unitTest = {
          nosetestArgs: [],
          pyTestArgs: [],
          unittestArgs: [],
          promptToConfigure: true,
          debugPort: 3000,
          nosetestsEnabled: false,
          pyTestEnabled: false,
          unittestEnabled: false,
          nosetestPath: 'nosetests',
          pyTestPath: 'pytest',
          autoTestDiscoverOnSaveEnabled: true
        };
      }
    } // Support for travis.


    this.unitTest = this.unitTest ? this.unitTest : {
      promptToConfigure: true,
      debugPort: 3000,
      nosetestArgs: [],
      nosetestPath: 'nosetest',
      nosetestsEnabled: false,
      pyTestArgs: [],
      pyTestEnabled: false,
      pyTestPath: 'pytest',
      unittestArgs: [],
      unittestEnabled: false,
      autoTestDiscoverOnSaveEnabled: true
    };
    this.unitTest.pyTestPath = getAbsolutePath(systemVariables.resolveAny(this.unitTest.pyTestPath), workspaceRoot);
    this.unitTest.nosetestPath = getAbsolutePath(systemVariables.resolveAny(this.unitTest.nosetestPath), workspaceRoot);

    if (this.unitTest.cwd) {
      this.unitTest.cwd = getAbsolutePath(systemVariables.resolveAny(this.unitTest.cwd), workspaceRoot);
    } // Resolve any variables found in the test arguments.


    this.unitTest.nosetestArgs = this.unitTest.nosetestArgs.map(arg => systemVariables.resolveAny(arg));
    this.unitTest.pyTestArgs = this.unitTest.pyTestArgs.map(arg => systemVariables.resolveAny(arg));
    this.unitTest.unittestArgs = this.unitTest.unittestArgs.map(arg => systemVariables.resolveAny(arg)); // tslint:disable-next-line:no-backbone-get-set-outside-model no-non-null-assertion

    const terminalSettings = systemVariables.resolveAny(pythonSettings.get('terminal'));

    if (this.terminal) {
      Object.assign(this.terminal, terminalSettings);
    } else {
      this.terminal = terminalSettings;

      if (constants_2.isTestExecution() && !this.terminal) {
        // tslint:disable-next-line:prefer-type-cast
        // tslint:disable-next-line:no-object-literal-type-assertion
        this.terminal = {};
      }
    } // Support for travis.


    this.terminal = this.terminal ? this.terminal : {
      executeInFileDir: true,
      launchArgs: [],
      activateEnvironment: true
    };
    const dataScienceSettings = systemVariables.resolveAny(pythonSettings.get('dataScience'));

    if (this.datascience) {
      Object.assign(this.datascience, dataScienceSettings);
    } else {
      this.datascience = dataScienceSettings;
    }
  }

  get pythonPath() {
    return this._pythonPath;
  }

  set pythonPath(value) {
    if (this._pythonPath === value) {
      return;
    } // Add support for specifying just the directory where the python executable will be located.
    // E.g. virtual directory name.


    try {
      this._pythonPath = getPythonExecutable(value);
    } catch (ex) {
      this._pythonPath = value;
    }
  }

  initialize() {
    this.disposables.push(vscode_1.workspace.onDidChangeConfiguration(() => {
      const currentConfig = vscode_1.workspace.getConfiguration('python', this.workspaceRoot);
      this.update(currentConfig); // If workspace config changes, then we could have a cascading effect of on change events.
      // Let's defer the change notification.

      setTimeout(() => this.emit('change'), 1);
    }));
    const initialConfig = vscode_1.workspace.getConfiguration('python', this.workspaceRoot);
    this.update(initialConfig);
  }

}

PythonSettings.pythonSettings = new Map();
exports.PythonSettings = PythonSettings;

function getAbsolutePath(pathToCheck, rootDir) {
  // tslint:disable-next-line:prefer-type-cast no-unsafe-any
  pathToCheck = untildify(pathToCheck);

  if (constants_2.isTestExecution() && !pathToCheck) {
    return rootDir;
  }

  if (pathToCheck.indexOf(path.sep) === -1) {
    return pathToCheck;
  }

  return path.isAbsolute(pathToCheck) ? pathToCheck : path.resolve(rootDir, pathToCheck);
}

function getPythonExecutable(pythonPath) {
  // tslint:disable-next-line:prefer-type-cast no-unsafe-any
  pythonPath = untildify(pythonPath); // If only 'python'.

  if (pythonPath === 'python' || pythonPath.indexOf(path.sep) === -1 || path.basename(pythonPath) === path.dirname(pythonPath)) {
    return pythonPath;
  }

  if (isValidPythonPath(pythonPath)) {
    return pythonPath;
  } // Keep python right on top, for backwards compatibility.
  // tslint:disable-next-line:variable-name


  const KnownPythonExecutables = ['python', 'python4', 'python3.6', 'python3.5', 'python3', 'python2.7', 'python2'];

  for (let executableName of KnownPythonExecutables) {
    // Suffix with 'python' for linux and 'osx', and 'python.exe' for 'windows'.
    if (exports.IS_WINDOWS) {
      executableName = `${executableName}.exe`;

      if (isValidPythonPath(path.join(pythonPath, executableName))) {
        return path.join(pythonPath, executableName);
      }

      if (isValidPythonPath(path.join(pythonPath, 'scripts', executableName))) {
        return path.join(pythonPath, 'scripts', executableName);
      }
    } else {
      if (isValidPythonPath(path.join(pythonPath, executableName))) {
        return path.join(pythonPath, executableName);
      }

      if (isValidPythonPath(path.join(pythonPath, 'bin', executableName))) {
        return path.join(pythonPath, 'bin', executableName);
      }
    }
  }

  return pythonPath;
}

function isValidPythonPath(pythonPath) {
  try {
    const output = child_process.execFileSync(pythonPath, ['-c', 'print(1234)'], {
      encoding: 'utf8'
    });
    return output.startsWith('1234');
  } catch (ex) {
    return false;
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmZpZ1NldHRpbmdzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiY2hpbGRfcHJvY2VzcyIsInJlcXVpcmUiLCJldmVudHNfMSIsInBhdGgiLCJ2c2NvZGVfMSIsInRlbGVtZXRyeV8xIiwiY29uc3RhbnRzXzEiLCJjb25zdGFudHNfMiIsInN5c3RlbVZhcmlhYmxlc18xIiwidW50aWxkaWZ5IiwiSVNfV0lORE9XUyIsInRlc3QiLCJwcm9jZXNzIiwicGxhdGZvcm0iLCJQeXRob25TZXR0aW5ncyIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwid29ya3NwYWNlRm9sZGVyIiwiZG93bmxvYWRMYW5ndWFnZVNlcnZlciIsImplZGlFbmFibGVkIiwiamVkaVBhdGgiLCJqZWRpTWVtb3J5TGltaXQiLCJlbnZGaWxlIiwidmVudlBhdGgiLCJ2ZW52Rm9sZGVycyIsImNvbmRhUGF0aCIsImRldk9wdGlvbnMiLCJkaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2tzIiwiZ2xvYmFsTW9kdWxlSW5zdGFsbGF0aW9uIiwiYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyIiwiZGlzcG9zYWJsZXMiLCJfcHl0aG9uUGF0aCIsIndvcmtzcGFjZVJvb3QiLCJVcmkiLCJmaWxlIiwiX19kaXJuYW1lIiwiaW5pdGlhbGl6ZSIsImdldEluc3RhbmNlIiwicmVzb3VyY2UiLCJ3b3Jrc3BhY2VGb2xkZXJVcmkiLCJnZXRTZXR0aW5nc1VyaUFuZFRhcmdldCIsInVyaSIsIndvcmtzcGFjZUZvbGRlcktleSIsImZzUGF0aCIsInB5dGhvblNldHRpbmdzIiwiaGFzIiwic2V0dGluZ3MiLCJzZXQiLCJmb3JtYXRPblR5cGUiLCJ3b3Jrc3BhY2UiLCJnZXRDb25maWd1cmF0aW9uIiwiZ2V0Iiwic2VuZFRlbGVtZXRyeUV2ZW50IiwiQ09NUExFVElPTl9BRERfQlJBQ0tFVFMiLCJ1bmRlZmluZWQiLCJlbmFibGVkIiwiYXV0b0NvbXBsZXRlIiwiYWRkQnJhY2tldHMiLCJGT1JNQVRfT05fVFlQRSIsImdldFdvcmtzcGFjZUZvbGRlciIsIkFycmF5IiwiaXNBcnJheSIsIndvcmtzcGFjZUZvbGRlcnMiLCJsZW5ndGgiLCJ0YXJnZXQiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiV29ya3NwYWNlRm9sZGVyIiwiR2xvYmFsIiwiZGlzcG9zZSIsImlzVGVzdEV4ZWN1dGlvbiIsIkVycm9yIiwiZm9yRWFjaCIsIml0ZW0iLCJjbGVhciIsImRpc3Bvc2FibGUiLCJ1cGRhdGUiLCJzeXN0ZW1WYXJpYWJsZXMiLCJTeXN0ZW1WYXJpYWJsZXMiLCJweXRob25QYXRoIiwicmVzb2x2ZUFueSIsImdldEFic29sdXRlUGF0aCIsImxpbnRpbmdTZXR0aW5ncyIsImxpbnRpbmciLCJhc3NpZ24iLCJhbmFseXNpc1NldHRpbmdzIiwiYW5hbHlzaXMiLCJzb3J0SW1wb3J0U2V0dGluZ3MiLCJzb3J0SW1wb3J0cyIsImFyZ3MiLCJpZ25vcmVQYXR0ZXJucyIsImZsYWtlOEFyZ3MiLCJmbGFrZThFbmFibGVkIiwiZmxha2U4UGF0aCIsImxpbnRPblNhdmUiLCJtYXhOdW1iZXJPZlByb2JsZW1zIiwibXlweUFyZ3MiLCJteXB5RW5hYmxlZCIsIm15cHlQYXRoIiwiYmFuZGl0QXJncyIsImJhbmRpdEVuYWJsZWQiLCJiYW5kaXRQYXRoIiwicGVwOEFyZ3MiLCJwZXA4RW5hYmxlZCIsInBlcDhQYXRoIiwicHlsYW1hQXJncyIsInB5bGFtYUVuYWJsZWQiLCJweWxhbWFQYXRoIiwicHJvc3BlY3RvckFyZ3MiLCJwcm9zcGVjdG9yRW5hYmxlZCIsInByb3NwZWN0b3JQYXRoIiwicHlkb2NzdHlsZUFyZ3MiLCJweWRvY3N0eWxlRW5hYmxlZCIsInB5ZG9jc3R5bGVQYXRoIiwicHlsaW50QXJncyIsInB5bGludEVuYWJsZWQiLCJweWxpbnRQYXRoIiwicHlsaW50Q2F0ZWdvcnlTZXZlcml0eSIsImNvbnZlbnRpb24iLCJEaWFnbm9zdGljU2V2ZXJpdHkiLCJIaW50IiwiZXJyb3IiLCJmYXRhbCIsInJlZmFjdG9yIiwid2FybmluZyIsIldhcm5pbmciLCJwZXA4Q2F0ZWdvcnlTZXZlcml0eSIsIkUiLCJXIiwiZmxha2U4Q2F0ZWdvcnlTZXZlcml0eSIsIkYiLCJteXB5Q2F0ZWdvcnlTZXZlcml0eSIsIm5vdGUiLCJweWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnMiLCJmb3JtYXR0aW5nU2V0dGluZ3MiLCJmb3JtYXR0aW5nIiwiYXV0b3BlcDhBcmdzIiwiYXV0b3BlcDhQYXRoIiwicHJvdmlkZXIiLCJibGFja0FyZ3MiLCJibGFja1BhdGgiLCJ5YXBmQXJncyIsInlhcGZQYXRoIiwiYXV0b0NvbXBsZXRlU2V0dGluZ3MiLCJleHRyYVBhdGhzIiwic2hvd0FkdmFuY2VkTWVtYmVycyIsInR5cGVzaGVkUGF0aHMiLCJ3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3MiLCJ3b3Jrc3BhY2VTeW1ib2xzIiwiY3RhZ3NQYXRoIiwiZXhjbHVzaW9uUGF0dGVybnMiLCJyZWJ1aWxkT25GaWxlU2F2ZSIsInJlYnVpbGRPblN0YXJ0IiwidGFnRmlsZVBhdGgiLCJqb2luIiwidW5pdFRlc3RTZXR0aW5ncyIsInVuaXRUZXN0Iiwibm9zZXRlc3RBcmdzIiwicHlUZXN0QXJncyIsInVuaXR0ZXN0QXJncyIsInByb21wdFRvQ29uZmlndXJlIiwiZGVidWdQb3J0Iiwibm9zZXRlc3RzRW5hYmxlZCIsInB5VGVzdEVuYWJsZWQiLCJ1bml0dGVzdEVuYWJsZWQiLCJub3NldGVzdFBhdGgiLCJweVRlc3RQYXRoIiwiYXV0b1Rlc3REaXNjb3Zlck9uU2F2ZUVuYWJsZWQiLCJjd2QiLCJtYXAiLCJhcmciLCJ0ZXJtaW5hbFNldHRpbmdzIiwidGVybWluYWwiLCJleGVjdXRlSW5GaWxlRGlyIiwibGF1bmNoQXJncyIsImFjdGl2YXRlRW52aXJvbm1lbnQiLCJkYXRhU2NpZW5jZVNldHRpbmdzIiwiZGF0YXNjaWVuY2UiLCJnZXRQeXRob25FeGVjdXRhYmxlIiwiZXgiLCJwdXNoIiwib25EaWRDaGFuZ2VDb25maWd1cmF0aW9uIiwiY3VycmVudENvbmZpZyIsInNldFRpbWVvdXQiLCJlbWl0IiwiaW5pdGlhbENvbmZpZyIsIk1hcCIsInBhdGhUb0NoZWNrIiwicm9vdERpciIsImluZGV4T2YiLCJzZXAiLCJpc0Fic29sdXRlIiwicmVzb2x2ZSIsImJhc2VuYW1lIiwiZGlybmFtZSIsImlzVmFsaWRQeXRob25QYXRoIiwiS25vd25QeXRob25FeGVjdXRhYmxlcyIsImV4ZWN1dGFibGVOYW1lIiwib3V0cHV0IiwiZXhlY0ZpbGVTeW5jIiwiZW5jb2RpbmciLCJzdGFydHNXaXRoIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxhQUFhLEdBQUdDLE9BQU8sQ0FBQyxlQUFELENBQTdCOztBQUNBLE1BQU1DLFFBQVEsR0FBR0QsT0FBTyxDQUFDLFFBQUQsQ0FBeEI7O0FBQ0EsTUFBTUUsSUFBSSxHQUFHRixPQUFPLENBQUMsTUFBRCxDQUFwQjs7QUFDQSxNQUFNRyxRQUFRLEdBQUdILE9BQU8sQ0FBQyxRQUFELENBQXhCOztBQUNBLE1BQU1JLFdBQVcsR0FBR0osT0FBTyxDQUFDLGNBQUQsQ0FBM0I7O0FBQ0EsTUFBTUssV0FBVyxHQUFHTCxPQUFPLENBQUMsd0JBQUQsQ0FBM0I7O0FBQ0EsTUFBTU0sV0FBVyxHQUFHTixPQUFPLENBQUMsYUFBRCxDQUEzQjs7QUFDQSxNQUFNTyxpQkFBaUIsR0FBR1AsT0FBTyxDQUFDLDZCQUFELENBQWpDLEMsQ0FDQTs7O0FBQ0EsTUFBTVEsU0FBUyxHQUFHUixPQUFPLENBQUMsV0FBRCxDQUF6Qjs7QUFDQUgsT0FBTyxDQUFDWSxVQUFSLEdBQXFCLE9BQU9DLElBQVAsQ0FBWUMsT0FBTyxDQUFDQyxRQUFwQixDQUFyQixDLENBQ0E7O0FBQ0EsTUFBTUMsY0FBTixTQUE2QlosUUFBUSxDQUFDYSxZQUF0QyxDQUFt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dUMsQ0FBQyxJQUFELEVBQU8sYUFBUCxDQUF2QyxFQUE4RDtBQUFFeUgsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBOUQsQ0FBZjtBQUNBLFdBQU9GLE1BQU0sQ0FBQ0csVUFBUCxDQUFrQixNQUFsQixDQUFQO0FBQ0gsR0FIRCxDQUlBLE9BQU90QixFQUFQLEVBQVc7QUFDUCxXQUFPLEtBQVA7QUFDSDtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNoaWxkX3Byb2Nlc3MgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTtcclxuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgdGVsZW1ldHJ5XzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5XCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi90ZWxlbWV0cnkvY29uc3RhbnRzXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3Qgc3lzdGVtVmFyaWFibGVzXzEgPSByZXF1aXJlKFwiLi92YXJpYWJsZXMvc3lzdGVtVmFyaWFibGVzXCIpO1xyXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzIG5vLXZhci1yZXF1aXJlc1xyXG5jb25zdCB1bnRpbGRpZnkgPSByZXF1aXJlKCd1bnRpbGRpZnknKTtcclxuZXhwb3J0cy5JU19XSU5ET1dTID0gL153aW4vLnRlc3QocHJvY2Vzcy5wbGF0Zm9ybSk7XHJcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjb21wbGV0ZWQtZG9jc1xyXG5jbGFzcyBQeXRob25TZXR0aW5ncyBleHRlbmRzIGV2ZW50c18xLkV2ZW50RW1pdHRlciB7XHJcbiAgICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VGb2xkZXIpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuZG93bmxvYWRMYW5ndWFnZVNlcnZlciA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5qZWRpRW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5qZWRpUGF0aCA9ICcnO1xyXG4gICAgICAgIHRoaXMuamVkaU1lbW9yeUxpbWl0ID0gMTAyNDtcclxuICAgICAgICB0aGlzLmVudkZpbGUgPSAnJztcclxuICAgICAgICB0aGlzLnZlbnZQYXRoID0gJyc7XHJcbiAgICAgICAgdGhpcy52ZW52Rm9sZGVycyA9IFtdO1xyXG4gICAgICAgIHRoaXMuY29uZGFQYXRoID0gJyc7XHJcbiAgICAgICAgdGhpcy5kZXZPcHRpb25zID0gW107XHJcbiAgICAgICAgdGhpcy5kaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2tzID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5nbG9iYWxNb2R1bGVJbnN0YWxsYXRpb24gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmF1dG9VcGRhdGVMYW5ndWFnZVNlcnZlciA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IFtdO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTp2YXJpYWJsZS1uYW1lXHJcbiAgICAgICAgdGhpcy5fcHl0aG9uUGF0aCA9ICcnO1xyXG4gICAgICAgIHRoaXMud29ya3NwYWNlUm9vdCA9IHdvcmtzcGFjZUZvbGRlciA/IHdvcmtzcGFjZUZvbGRlciA6IHZzY29kZV8xLlVyaS5maWxlKF9fZGlybmFtZSk7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6ZnVuY3Rpb24tbmFtZVxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKHJlc291cmNlKSB7XHJcbiAgICAgICAgY29uc3Qgd29ya3NwYWNlRm9sZGVyVXJpID0gUHl0aG9uU2V0dGluZ3MuZ2V0U2V0dGluZ3NVcmlBbmRUYXJnZXQocmVzb3VyY2UpLnVyaTtcclxuICAgICAgICBjb25zdCB3b3Jrc3BhY2VGb2xkZXJLZXkgPSB3b3Jrc3BhY2VGb2xkZXJVcmkgPyB3b3Jrc3BhY2VGb2xkZXJVcmkuZnNQYXRoIDogJyc7XHJcbiAgICAgICAgaWYgKCFQeXRob25TZXR0aW5ncy5weXRob25TZXR0aW5ncy5oYXMod29ya3NwYWNlRm9sZGVyS2V5KSkge1xyXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IG5ldyBQeXRob25TZXR0aW5ncyh3b3Jrc3BhY2VGb2xkZXJVcmkpO1xyXG4gICAgICAgICAgICBQeXRob25TZXR0aW5ncy5weXRob25TZXR0aW5ncy5zZXQod29ya3NwYWNlRm9sZGVyS2V5LCBzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdE9uVHlwZSA9IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdlZGl0b3InLCByZXNvdXJjZSA/IHJlc291cmNlIDogbnVsbCkuZ2V0KCdmb3JtYXRPblR5cGUnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHRlbGVtZXRyeV8xLnNlbmRUZWxlbWV0cnlFdmVudChjb25zdGFudHNfMS5DT01QTEVUSU9OX0FERF9CUkFDS0VUUywgdW5kZWZpbmVkLCB7IGVuYWJsZWQ6IHNldHRpbmdzLmF1dG9Db21wbGV0ZS5hZGRCcmFja2V0cyB9KTtcclxuICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGNvbnN0YW50c18xLkZPUk1BVF9PTl9UWVBFLCB1bmRlZmluZWQsIHsgZW5hYmxlZDogZm9ybWF0T25UeXBlIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tbm9uLW51bGwtYXNzZXJ0aW9uXHJcbiAgICAgICAgcmV0dXJuIFB5dGhvblNldHRpbmdzLnB5dGhvblNldHRpbmdzLmdldCh3b3Jrc3BhY2VGb2xkZXJLZXkpO1xyXG4gICAgfVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOnR5cGUtbGl0ZXJhbC1kZWxpbWl0ZXJcclxuICAgIHN0YXRpYyBnZXRTZXR0aW5nc1VyaUFuZFRhcmdldChyZXNvdXJjZSkge1xyXG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZUZvbGRlciA9IHJlc291cmNlID8gdnNjb2RlXzEud29ya3NwYWNlLmdldFdvcmtzcGFjZUZvbGRlcihyZXNvdXJjZSkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgbGV0IHdvcmtzcGFjZUZvbGRlclVyaSA9IHdvcmtzcGFjZUZvbGRlciA/IHdvcmtzcGFjZUZvbGRlci51cmkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKCF3b3Jrc3BhY2VGb2xkZXJVcmkgJiYgQXJyYXkuaXNBcnJheSh2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycykgJiYgdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB3b3Jrc3BhY2VGb2xkZXJVcmkgPSB2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHdvcmtzcGFjZUZvbGRlclVyaSA/IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlRm9sZGVyIDogdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5HbG9iYWw7XHJcbiAgICAgICAgcmV0dXJuIHsgdXJpOiB3b3Jrc3BhY2VGb2xkZXJVcmksIHRhcmdldCB9O1xyXG4gICAgfVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmZ1bmN0aW9uLW5hbWVcclxuICAgIHN0YXRpYyBkaXNwb3NlKCkge1xyXG4gICAgICAgIGlmICghY29uc3RhbnRzXzIuaXNUZXN0RXhlY3V0aW9uKCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEaXNwb3NlIGNhbiBvbmx5IGJlIGNhbGxlZCBmcm9tIHVuaXQgdGVzdHMnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXZvaWQtZXhwcmVzc2lvblxyXG4gICAgICAgIFB5dGhvblNldHRpbmdzLnB5dGhvblNldHRpbmdzLmZvckVhY2goaXRlbSA9PiBpdGVtLmRpc3Bvc2UoKSk7XHJcbiAgICAgICAgUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MuY2xlYXIoKTtcclxuICAgIH1cclxuICAgIGRpc3Bvc2UoKSB7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVuc2FmZS1hbnlcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzLmZvckVhY2goZGlzcG9zYWJsZSA9PiBkaXNwb3NhYmxlLmRpc3Bvc2UoKSk7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eSBtYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG4gICAgdXBkYXRlKHB5dGhvblNldHRpbmdzKSB7XHJcbiAgICAgICAgY29uc3Qgd29ya3NwYWNlUm9vdCA9IHRoaXMud29ya3NwYWNlUm9vdC5mc1BhdGg7XHJcbiAgICAgICAgY29uc3Qgc3lzdGVtVmFyaWFibGVzID0gbmV3IHN5c3RlbVZhcmlhYmxlc18xLlN5c3RlbVZhcmlhYmxlcyh0aGlzLndvcmtzcGFjZVJvb3QgPyB0aGlzLndvcmtzcGFjZVJvb3QuZnNQYXRoIDogdW5kZWZpbmVkKTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIHRoaXMucHl0aG9uUGF0aCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgncHl0aG9uUGF0aCcpKTtcclxuICAgICAgICB0aGlzLnB5dGhvblBhdGggPSBnZXRBYnNvbHV0ZVBhdGgodGhpcy5weXRob25QYXRoLCB3b3Jrc3BhY2VSb290KTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIHRoaXMudmVudlBhdGggPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3ZlbnZQYXRoJykpO1xyXG4gICAgICAgIHRoaXMudmVudkZvbGRlcnMgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3ZlbnZGb2xkZXJzJykpO1xyXG4gICAgICAgIGNvbnN0IGNvbmRhUGF0aCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnY29uZGFQYXRoJykpO1xyXG4gICAgICAgIHRoaXMuY29uZGFQYXRoID0gY29uZGFQYXRoICYmIGNvbmRhUGF0aC5sZW5ndGggPiAwID8gZ2V0QWJzb2x1dGVQYXRoKGNvbmRhUGF0aCwgd29ya3NwYWNlUm9vdCkgOiBjb25kYVBhdGg7XHJcbiAgICAgICAgdGhpcy5kb3dubG9hZExhbmd1YWdlU2VydmVyID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdkb3dubG9hZExhbmd1YWdlU2VydmVyJywgdHJ1ZSkpO1xyXG4gICAgICAgIHRoaXMuamVkaUVuYWJsZWQgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2plZGlFbmFibGVkJywgdHJ1ZSkpO1xyXG4gICAgICAgIHRoaXMuYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdhdXRvVXBkYXRlTGFuZ3VhZ2VTZXJ2ZXInLCB0cnVlKSk7XHJcbiAgICAgICAgaWYgKHRoaXMuamVkaUVuYWJsZWQpIHtcclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cclxuICAgICAgICAgICAgdGhpcy5qZWRpUGF0aCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnamVkaVBhdGgnKSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5qZWRpUGF0aCA9PT0gJ3N0cmluZycgJiYgdGhpcy5qZWRpUGF0aC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmplZGlQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMuamVkaVBhdGgpLCB3b3Jrc3BhY2VSb290KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuamVkaVBhdGggPSAnJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmplZGlNZW1vcnlMaW1pdCA9IHB5dGhvblNldHRpbmdzLmdldCgnamVkaU1lbW9yeUxpbWl0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXHJcbiAgICAgICAgdGhpcy5lbnZGaWxlID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdlbnZGaWxlJykpO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvbiBuby1hbnlcclxuICAgICAgICB0aGlzLmRldk9wdGlvbnMgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2Rldk9wdGlvbnMnKSk7XHJcbiAgICAgICAgdGhpcy5kZXZPcHRpb25zID0gQXJyYXkuaXNBcnJheSh0aGlzLmRldk9wdGlvbnMpID8gdGhpcy5kZXZPcHRpb25zIDogW107XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cclxuICAgICAgICBjb25zdCBsaW50aW5nU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2xpbnRpbmcnKSk7XHJcbiAgICAgICAgaWYgKHRoaXMubGludGluZykge1xyXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMubGludGluZywgbGludGluZ1NldHRpbmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubGludGluZyA9IGxpbnRpbmdTZXR0aW5ncztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cclxuICAgICAgICBjb25zdCBhbmFseXNpc1NldHRpbmdzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdhbmFseXNpcycpKTtcclxuICAgICAgICBpZiAodGhpcy5hbmFseXNpcykge1xyXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuYW5hbHlzaXMsIGFuYWx5c2lzU2V0dGluZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hbmFseXNpcyA9IGFuYWx5c2lzU2V0dGluZ3M7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZGlzYWJsZUluc3RhbGxhdGlvbkNoZWNrcyA9IHB5dGhvblNldHRpbmdzLmdldCgnZGlzYWJsZUluc3RhbGxhdGlvbkNoZWNrJykgPT09IHRydWU7XHJcbiAgICAgICAgdGhpcy5nbG9iYWxNb2R1bGVJbnN0YWxsYXRpb24gPSBweXRob25TZXR0aW5ncy5nZXQoJ2dsb2JhbE1vZHVsZUluc3RhbGxhdGlvbicpID09PSB0cnVlO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXHJcbiAgICAgICAgY29uc3Qgc29ydEltcG9ydFNldHRpbmdzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdzb3J0SW1wb3J0cycpKTtcclxuICAgICAgICBpZiAodGhpcy5zb3J0SW1wb3J0cykge1xyXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuc29ydEltcG9ydHMsIHNvcnRJbXBvcnRTZXR0aW5ncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNvcnRJbXBvcnRzID0gc29ydEltcG9ydFNldHRpbmdzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXHJcbiAgICAgICAgdGhpcy5zb3J0SW1wb3J0cyA9IHRoaXMuc29ydEltcG9ydHMgPyB0aGlzLnNvcnRJbXBvcnRzIDogeyBwYXRoOiAnJywgYXJnczogW10gfTtcclxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXHJcbiAgICAgICAgdGhpcy5saW50aW5nID0gdGhpcy5saW50aW5nID8gdGhpcy5saW50aW5nIDoge1xyXG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgaWdub3JlUGF0dGVybnM6IFtdLFxyXG4gICAgICAgICAgICBmbGFrZThBcmdzOiBbXSwgZmxha2U4RW5hYmxlZDogZmFsc2UsIGZsYWtlOFBhdGg6ICdmbGFrZScsXHJcbiAgICAgICAgICAgIGxpbnRPblNhdmU6IGZhbHNlLCBtYXhOdW1iZXJPZlByb2JsZW1zOiAxMDAsXHJcbiAgICAgICAgICAgIG15cHlBcmdzOiBbXSwgbXlweUVuYWJsZWQ6IGZhbHNlLCBteXB5UGF0aDogJ215cHknLFxyXG4gICAgICAgICAgICBiYW5kaXRBcmdzOiBbXSwgYmFuZGl0RW5hYmxlZDogZmFsc2UsIGJhbmRpdFBhdGg6ICdiYW5kaXQnLFxyXG4gICAgICAgICAgICBwZXA4QXJnczogW10sIHBlcDhFbmFibGVkOiBmYWxzZSwgcGVwOFBhdGg6ICdwZXA4JyxcclxuICAgICAgICAgICAgcHlsYW1hQXJnczogW10sIHB5bGFtYUVuYWJsZWQ6IGZhbHNlLCBweWxhbWFQYXRoOiAncHlsYW1hJyxcclxuICAgICAgICAgICAgcHJvc3BlY3RvckFyZ3M6IFtdLCBwcm9zcGVjdG9yRW5hYmxlZDogZmFsc2UsIHByb3NwZWN0b3JQYXRoOiAncHJvc3BlY3RvcicsXHJcbiAgICAgICAgICAgIHB5ZG9jc3R5bGVBcmdzOiBbXSwgcHlkb2NzdHlsZUVuYWJsZWQ6IGZhbHNlLCBweWRvY3N0eWxlUGF0aDogJ3B5ZG9jc3R5bGUnLFxyXG4gICAgICAgICAgICBweWxpbnRBcmdzOiBbXSwgcHlsaW50RW5hYmxlZDogZmFsc2UsIHB5bGludFBhdGg6ICdweWxpbnQnLFxyXG4gICAgICAgICAgICBweWxpbnRDYXRlZ29yeVNldmVyaXR5OiB7XHJcbiAgICAgICAgICAgICAgICBjb252ZW50aW9uOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuSGludCxcclxuICAgICAgICAgICAgICAgIGVycm9yOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IsXHJcbiAgICAgICAgICAgICAgICBmYXRhbDogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yLFxyXG4gICAgICAgICAgICAgICAgcmVmYWN0b3I6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5IaW50LFxyXG4gICAgICAgICAgICAgICAgd2FybmluZzogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5Lldhcm5pbmdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGVwOENhdGVnb3J5U2V2ZXJpdHk6IHtcclxuICAgICAgICAgICAgICAgIEU6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5FcnJvcixcclxuICAgICAgICAgICAgICAgIFc6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZsYWtlOENhdGVnb3J5U2V2ZXJpdHk6IHtcclxuICAgICAgICAgICAgICAgIEU6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5FcnJvcixcclxuICAgICAgICAgICAgICAgIFc6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nLFxyXG4gICAgICAgICAgICAgICAgLy8gUGVyIGh0dHA6Ly9mbGFrZTgucHljcWEub3JnL2VuL2xhdGVzdC9nbG9zc2FyeS5odG1sI3Rlcm0tZXJyb3ItY29kZVxyXG4gICAgICAgICAgICAgICAgLy8gJ0YnIGRvZXMgbm90IG1lYW4gJ2ZhdGFsIGFzIGluIFB5TGludCBidXQgcmF0aGVyICdweWZsYWtlcycgc3VjaCBhc1xyXG4gICAgICAgICAgICAgICAgLy8gdW51c2VkIGltcG9ydHMsIHZhcmlhYmxlcywgZXRjLlxyXG4gICAgICAgICAgICAgICAgRjogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5Lldhcm5pbmdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbXlweUNhdGVnb3J5U2V2ZXJpdHk6IHtcclxuICAgICAgICAgICAgICAgIGVycm9yOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IsXHJcbiAgICAgICAgICAgICAgICBub3RlOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuSGludFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBweWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnM6IGZhbHNlXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmxpbnRpbmcucHlsaW50UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcucHlsaW50UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgIHRoaXMubGludGluZy5mbGFrZThQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5mbGFrZThQYXRoKSwgd29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgdGhpcy5saW50aW5nLnBlcDhQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5wZXA4UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgIHRoaXMubGludGluZy5weWxhbWFQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5weWxhbWFQYXRoKSwgd29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgdGhpcy5saW50aW5nLnByb3NwZWN0b3JQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5wcm9zcGVjdG9yUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgIHRoaXMubGludGluZy5weWRvY3N0eWxlUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcucHlkb2NzdHlsZVBhdGgpLCB3b3Jrc3BhY2VSb290KTtcclxuICAgICAgICB0aGlzLmxpbnRpbmcubXlweVBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLm15cHlQYXRoKSwgd29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgdGhpcy5saW50aW5nLmJhbmRpdFBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLmJhbmRpdFBhdGgpLCB3b3Jrc3BhY2VSb290KTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIGNvbnN0IGZvcm1hdHRpbmdTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnZm9ybWF0dGluZycpKTtcclxuICAgICAgICBpZiAodGhpcy5mb3JtYXR0aW5nKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5mb3JtYXR0aW5nLCBmb3JtYXR0aW5nU2V0dGluZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5mb3JtYXR0aW5nID0gZm9ybWF0dGluZ1NldHRpbmdzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXHJcbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nID0gdGhpcy5mb3JtYXR0aW5nID8gdGhpcy5mb3JtYXR0aW5nIDoge1xyXG4gICAgICAgICAgICBhdXRvcGVwOEFyZ3M6IFtdLCBhdXRvcGVwOFBhdGg6ICdhdXRvcGVwOCcsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiAnYXV0b3BlcDgnLFxyXG4gICAgICAgICAgICBibGFja0FyZ3M6IFtdLCBibGFja1BhdGg6ICdibGFjaycsXHJcbiAgICAgICAgICAgIHlhcGZBcmdzOiBbXSwgeWFwZlBhdGg6ICd5YXBmJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nLmF1dG9wZXA4UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmZvcm1hdHRpbmcuYXV0b3BlcDhQYXRoKSwgd29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nLnlhcGZQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMuZm9ybWF0dGluZy55YXBmUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgIHRoaXMuZm9ybWF0dGluZy5ibGFja1BhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5mb3JtYXR0aW5nLmJsYWNrUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXHJcbiAgICAgICAgY29uc3QgYXV0b0NvbXBsZXRlU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2F1dG9Db21wbGV0ZScpKTtcclxuICAgICAgICBpZiAodGhpcy5hdXRvQ29tcGxldGUpIHtcclxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLmF1dG9Db21wbGV0ZSwgYXV0b0NvbXBsZXRlU2V0dGluZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hdXRvQ29tcGxldGUgPSBhdXRvQ29tcGxldGVTZXR0aW5ncztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgdHJhdmlzLlxyXG4gICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlID0gdGhpcy5hdXRvQ29tcGxldGUgPyB0aGlzLmF1dG9Db21wbGV0ZSA6IHtcclxuICAgICAgICAgICAgZXh0cmFQYXRoczogW10sXHJcbiAgICAgICAgICAgIGFkZEJyYWNrZXRzOiBmYWxzZSxcclxuICAgICAgICAgICAgc2hvd0FkdmFuY2VkTWVtYmVyczogZmFsc2UsXHJcbiAgICAgICAgICAgIHR5cGVzaGVkUGF0aHM6IFtdXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZVN5bWJvbHNTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnd29ya3NwYWNlU3ltYm9scycpKTtcclxuICAgICAgICBpZiAodGhpcy53b3Jrc3BhY2VTeW1ib2xzKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy53b3Jrc3BhY2VTeW1ib2xzLCB3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy53b3Jrc3BhY2VTeW1ib2xzID0gd29ya3NwYWNlU3ltYm9sc1NldHRpbmdzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VTeW1ib2xzID0gdGhpcy53b3Jrc3BhY2VTeW1ib2xzID8gdGhpcy53b3Jrc3BhY2VTeW1ib2xzIDoge1xyXG4gICAgICAgICAgICBjdGFnc1BhdGg6ICdjdGFncycsXHJcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGV4Y2x1c2lvblBhdHRlcm5zOiBbXSxcclxuICAgICAgICAgICAgcmVidWlsZE9uRmlsZVNhdmU6IHRydWUsXHJcbiAgICAgICAgICAgIHJlYnVpbGRPblN0YXJ0OiB0cnVlLFxyXG4gICAgICAgICAgICB0YWdGaWxlUGF0aDogcGF0aC5qb2luKHdvcmtzcGFjZVJvb3QsICd0YWdzJylcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMud29ya3NwYWNlU3ltYm9scy50YWdGaWxlUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLndvcmtzcGFjZVN5bWJvbHMudGFnRmlsZVBhdGgpLCB3b3Jrc3BhY2VSb290KTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIGNvbnN0IHVuaXRUZXN0U2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3VuaXRUZXN0JykpO1xyXG4gICAgICAgIGlmICh0aGlzLnVuaXRUZXN0KSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy51bml0VGVzdCwgdW5pdFRlc3RTZXR0aW5ncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnVuaXRUZXN0ID0gdW5pdFRlc3RTZXR0aW5ncztcclxuICAgICAgICAgICAgaWYgKGNvbnN0YW50c18yLmlzVGVzdEV4ZWN1dGlvbigpICYmICF0aGlzLnVuaXRUZXN0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6cHJlZmVyLXR5cGUtY2FzdFxyXG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVuaXRUZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vc2V0ZXN0QXJnczogW10sIHB5VGVzdEFyZ3M6IFtdLCB1bml0dGVzdEFyZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb21wdFRvQ29uZmlndXJlOiB0cnVlLCBkZWJ1Z1BvcnQ6IDMwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9zZXRlc3RzRW5hYmxlZDogZmFsc2UsIHB5VGVzdEVuYWJsZWQ6IGZhbHNlLCB1bml0dGVzdEVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vc2V0ZXN0UGF0aDogJ25vc2V0ZXN0cycsIHB5VGVzdFBhdGg6ICdweXRlc3QnLCBhdXRvVGVzdERpc2NvdmVyT25TYXZlRW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXHJcbiAgICAgICAgdGhpcy51bml0VGVzdCA9IHRoaXMudW5pdFRlc3QgPyB0aGlzLnVuaXRUZXN0IDoge1xyXG4gICAgICAgICAgICBwcm9tcHRUb0NvbmZpZ3VyZTogdHJ1ZSxcclxuICAgICAgICAgICAgZGVidWdQb3J0OiAzMDAwLFxyXG4gICAgICAgICAgICBub3NldGVzdEFyZ3M6IFtdLCBub3NldGVzdFBhdGg6ICdub3NldGVzdCcsIG5vc2V0ZXN0c0VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBweVRlc3RBcmdzOiBbXSwgcHlUZXN0RW5hYmxlZDogZmFsc2UsIHB5VGVzdFBhdGg6ICdweXRlc3QnLFxyXG4gICAgICAgICAgICB1bml0dGVzdEFyZ3M6IFtdLCB1bml0dGVzdEVuYWJsZWQ6IGZhbHNlLCBhdXRvVGVzdERpc2NvdmVyT25TYXZlRW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy51bml0VGVzdC5weVRlc3RQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMudW5pdFRlc3QucHlUZXN0UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgIHRoaXMudW5pdFRlc3Qubm9zZXRlc3RQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMudW5pdFRlc3Qubm9zZXRlc3RQYXRoKSwgd29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgaWYgKHRoaXMudW5pdFRlc3QuY3dkKSB7XHJcbiAgICAgICAgICAgIHRoaXMudW5pdFRlc3QuY3dkID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMudW5pdFRlc3QuY3dkKSwgd29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFJlc29sdmUgYW55IHZhcmlhYmxlcyBmb3VuZCBpbiB0aGUgdGVzdCBhcmd1bWVudHMuXHJcbiAgICAgICAgdGhpcy51bml0VGVzdC5ub3NldGVzdEFyZ3MgPSB0aGlzLnVuaXRUZXN0Lm5vc2V0ZXN0QXJncy5tYXAoYXJnID0+IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KGFyZykpO1xyXG4gICAgICAgIHRoaXMudW5pdFRlc3QucHlUZXN0QXJncyA9IHRoaXMudW5pdFRlc3QucHlUZXN0QXJncy5tYXAoYXJnID0+IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KGFyZykpO1xyXG4gICAgICAgIHRoaXMudW5pdFRlc3QudW5pdHRlc3RBcmdzID0gdGhpcy51bml0VGVzdC51bml0dGVzdEFyZ3MubWFwKGFyZyA9PiBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShhcmcpKTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIGNvbnN0IHRlcm1pbmFsU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3Rlcm1pbmFsJykpO1xyXG4gICAgICAgIGlmICh0aGlzLnRlcm1pbmFsKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy50ZXJtaW5hbCwgdGVybWluYWxTZXR0aW5ncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnRlcm1pbmFsID0gdGVybWluYWxTZXR0aW5ncztcclxuICAgICAgICAgICAgaWYgKGNvbnN0YW50c18yLmlzVGVzdEV4ZWN1dGlvbigpICYmICF0aGlzLnRlcm1pbmFsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6cHJlZmVyLXR5cGUtY2FzdFxyXG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXHJcbiAgICAgICAgICAgICAgICB0aGlzLnRlcm1pbmFsID0ge307XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgdHJhdmlzLlxyXG4gICAgICAgIHRoaXMudGVybWluYWwgPSB0aGlzLnRlcm1pbmFsID8gdGhpcy50ZXJtaW5hbCA6IHtcclxuICAgICAgICAgICAgZXhlY3V0ZUluRmlsZURpcjogdHJ1ZSxcclxuICAgICAgICAgICAgbGF1bmNoQXJnczogW10sXHJcbiAgICAgICAgICAgIGFjdGl2YXRlRW52aXJvbm1lbnQ6IHRydWVcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IGRhdGFTY2llbmNlU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2RhdGFTY2llbmNlJykpO1xyXG4gICAgICAgIGlmICh0aGlzLmRhdGFzY2llbmNlKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5kYXRhc2NpZW5jZSwgZGF0YVNjaWVuY2VTZXR0aW5ncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmRhdGFzY2llbmNlID0gZGF0YVNjaWVuY2VTZXR0aW5ncztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBnZXQgcHl0aG9uUGF0aCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fcHl0aG9uUGF0aDtcclxuICAgIH1cclxuICAgIHNldCBweXRob25QYXRoKHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3B5dGhvblBhdGggPT09IHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIHNwZWNpZnlpbmcganVzdCB0aGUgZGlyZWN0b3J5IHdoZXJlIHRoZSBweXRob24gZXhlY3V0YWJsZSB3aWxsIGJlIGxvY2F0ZWQuXHJcbiAgICAgICAgLy8gRS5nLiB2aXJ0dWFsIGRpcmVjdG9yeSBuYW1lLlxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3B5dGhvblBhdGggPSBnZXRQeXRob25FeGVjdXRhYmxlKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3B5dGhvblBhdGggPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMucHVzaCh2c2NvZGVfMS53b3Jrc3BhY2Uub25EaWRDaGFuZ2VDb25maWd1cmF0aW9uKCgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY3VycmVudENvbmZpZyA9IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdweXRob24nLCB0aGlzLndvcmtzcGFjZVJvb3QpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZShjdXJyZW50Q29uZmlnKTtcclxuICAgICAgICAgICAgLy8gSWYgd29ya3NwYWNlIGNvbmZpZyBjaGFuZ2VzLCB0aGVuIHdlIGNvdWxkIGhhdmUgYSBjYXNjYWRpbmcgZWZmZWN0IG9mIG9uIGNoYW5nZSBldmVudHMuXHJcbiAgICAgICAgICAgIC8vIExldCdzIGRlZmVyIHRoZSBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZW1pdCgnY2hhbmdlJyksIDEpO1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBjb25zdCBpbml0aWFsQ29uZmlnID0gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicsIHRoaXMud29ya3NwYWNlUm9vdCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGUoaW5pdGlhbENvbmZpZyk7XHJcbiAgICB9XHJcbn1cclxuUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MgPSBuZXcgTWFwKCk7XHJcbmV4cG9ydHMuUHl0aG9uU2V0dGluZ3MgPSBQeXRob25TZXR0aW5ncztcclxuZnVuY3Rpb24gZ2V0QWJzb2x1dGVQYXRoKHBhdGhUb0NoZWNrLCByb290RGlyKSB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6cHJlZmVyLXR5cGUtY2FzdCBuby11bnNhZmUtYW55XHJcbiAgICBwYXRoVG9DaGVjayA9IHVudGlsZGlmeShwYXRoVG9DaGVjayk7XHJcbiAgICBpZiAoY29uc3RhbnRzXzIuaXNUZXN0RXhlY3V0aW9uKCkgJiYgIXBhdGhUb0NoZWNrKSB7XHJcbiAgICAgICAgcmV0dXJuIHJvb3REaXI7XHJcbiAgICB9XHJcbiAgICBpZiAocGF0aFRvQ2hlY2suaW5kZXhPZihwYXRoLnNlcCkgPT09IC0xKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGhUb0NoZWNrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhdGguaXNBYnNvbHV0ZShwYXRoVG9DaGVjaykgPyBwYXRoVG9DaGVjayA6IHBhdGgucmVzb2x2ZShyb290RGlyLCBwYXRoVG9DaGVjayk7XHJcbn1cclxuZnVuY3Rpb24gZ2V0UHl0aG9uRXhlY3V0YWJsZShweXRob25QYXRoKSB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6cHJlZmVyLXR5cGUtY2FzdCBuby11bnNhZmUtYW55XHJcbiAgICBweXRob25QYXRoID0gdW50aWxkaWZ5KHB5dGhvblBhdGgpO1xyXG4gICAgLy8gSWYgb25seSAncHl0aG9uJy5cclxuICAgIGlmIChweXRob25QYXRoID09PSAncHl0aG9uJyB8fFxyXG4gICAgICAgIHB5dGhvblBhdGguaW5kZXhPZihwYXRoLnNlcCkgPT09IC0xIHx8XHJcbiAgICAgICAgcGF0aC5iYXNlbmFtZShweXRob25QYXRoKSA9PT0gcGF0aC5kaXJuYW1lKHB5dGhvblBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHB5dGhvblBhdGg7XHJcbiAgICB9XHJcbiAgICBpZiAoaXNWYWxpZFB5dGhvblBhdGgocHl0aG9uUGF0aCkpIHtcclxuICAgICAgICByZXR1cm4gcHl0aG9uUGF0aDtcclxuICAgIH1cclxuICAgIC8vIEtlZXAgcHl0aG9uIHJpZ2h0IG9uIHRvcCwgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOnZhcmlhYmxlLW5hbWVcclxuICAgIGNvbnN0IEtub3duUHl0aG9uRXhlY3V0YWJsZXMgPSBbJ3B5dGhvbicsICdweXRob240JywgJ3B5dGhvbjMuNicsICdweXRob24zLjUnLCAncHl0aG9uMycsICdweXRob24yLjcnLCAncHl0aG9uMiddO1xyXG4gICAgZm9yIChsZXQgZXhlY3V0YWJsZU5hbWUgb2YgS25vd25QeXRob25FeGVjdXRhYmxlcykge1xyXG4gICAgICAgIC8vIFN1ZmZpeCB3aXRoICdweXRob24nIGZvciBsaW51eCBhbmQgJ29zeCcsIGFuZCAncHl0aG9uLmV4ZScgZm9yICd3aW5kb3dzJy5cclxuICAgICAgICBpZiAoZXhwb3J0cy5JU19XSU5ET1dTKSB7XHJcbiAgICAgICAgICAgIGV4ZWN1dGFibGVOYW1lID0gYCR7ZXhlY3V0YWJsZU5hbWV9LmV4ZWA7XHJcbiAgICAgICAgICAgIGlmIChpc1ZhbGlkUHl0aG9uUGF0aChwYXRoLmpvaW4ocHl0aG9uUGF0aCwgZXhlY3V0YWJsZU5hbWUpKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihweXRob25QYXRoLCBleGVjdXRhYmxlTmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzVmFsaWRQeXRob25QYXRoKHBhdGguam9pbihweXRob25QYXRoLCAnc2NyaXB0cycsIGV4ZWN1dGFibGVOYW1lKSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmpvaW4ocHl0aG9uUGF0aCwgJ3NjcmlwdHMnLCBleGVjdXRhYmxlTmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChpc1ZhbGlkUHl0aG9uUGF0aChwYXRoLmpvaW4ocHl0aG9uUGF0aCwgZXhlY3V0YWJsZU5hbWUpKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihweXRob25QYXRoLCBleGVjdXRhYmxlTmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzVmFsaWRQeXRob25QYXRoKHBhdGguam9pbihweXRob25QYXRoLCAnYmluJywgZXhlY3V0YWJsZU5hbWUpKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihweXRob25QYXRoLCAnYmluJywgZXhlY3V0YWJsZU5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHB5dGhvblBhdGg7XHJcbn1cclxuZnVuY3Rpb24gaXNWYWxpZFB5dGhvblBhdGgocHl0aG9uUGF0aCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBvdXRwdXQgPSBjaGlsZF9wcm9jZXNzLmV4ZWNGaWxlU3luYyhweXRob25QYXRoLCBbJy1jJywgJ3ByaW50KDEyMzQpJ10sIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KTtcclxuICAgICAgICByZXR1cm4gb3V0cHV0LnN0YXJ0c1dpdGgoJzEyMzQnKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChleCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb25maWdTZXR0aW5ncy5qcy5tYXAiXX0=