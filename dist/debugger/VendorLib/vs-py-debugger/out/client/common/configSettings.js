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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmZpZ1NldHRpbmdzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiY2hpbGRfcHJvY2VzcyIsInJlcXVpcmUiLCJldmVudHNfMSIsInBhdGgiLCJ2c2NvZGVfMSIsInRlbGVtZXRyeV8xIiwiY29uc3RhbnRzXzEiLCJjb25zdGFudHNfMiIsInN5c3RlbVZhcmlhYmxlc18xIiwidW50aWxkaWZ5IiwiSVNfV0lORE9XUyIsInRlc3QiLCJwcm9jZXNzIiwicGxhdGZvcm0iLCJQeXRob25TZXR0aW5ncyIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwid29ya3NwYWNlRm9sZGVyIiwiZG93bmxvYWRMYW5ndWFnZVNlcnZlciIsImplZGlFbmFibGVkIiwiamVkaVBhdGgiLCJqZWRpTWVtb3J5TGltaXQiLCJlbnZGaWxlIiwidmVudlBhdGgiLCJ2ZW52Rm9sZGVycyIsImNvbmRhUGF0aCIsImRldk9wdGlvbnMiLCJkaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2tzIiwiZ2xvYmFsTW9kdWxlSW5zdGFsbGF0aW9uIiwiYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyIiwiZGlzcG9zYWJsZXMiLCJfcHl0aG9uUGF0aCIsIndvcmtzcGFjZVJvb3QiLCJVcmkiLCJmaWxlIiwiX19kaXJuYW1lIiwiaW5pdGlhbGl6ZSIsImdldEluc3RhbmNlIiwicmVzb3VyY2UiLCJ3b3Jrc3BhY2VGb2xkZXJVcmkiLCJnZXRTZXR0aW5nc1VyaUFuZFRhcmdldCIsInVyaSIsIndvcmtzcGFjZUZvbGRlcktleSIsImZzUGF0aCIsInB5dGhvblNldHRpbmdzIiwiaGFzIiwic2V0dGluZ3MiLCJzZXQiLCJmb3JtYXRPblR5cGUiLCJ3b3Jrc3BhY2UiLCJnZXRDb25maWd1cmF0aW9uIiwiZ2V0Iiwic2VuZFRlbGVtZXRyeUV2ZW50IiwiQ09NUExFVElPTl9BRERfQlJBQ0tFVFMiLCJ1bmRlZmluZWQiLCJlbmFibGVkIiwiYXV0b0NvbXBsZXRlIiwiYWRkQnJhY2tldHMiLCJGT1JNQVRfT05fVFlQRSIsImdldFdvcmtzcGFjZUZvbGRlciIsIkFycmF5IiwiaXNBcnJheSIsIndvcmtzcGFjZUZvbGRlcnMiLCJsZW5ndGgiLCJ0YXJnZXQiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiV29ya3NwYWNlRm9sZGVyIiwiR2xvYmFsIiwiZGlzcG9zZSIsImlzVGVzdEV4ZWN1dGlvbiIsIkVycm9yIiwiZm9yRWFjaCIsIml0ZW0iLCJjbGVhciIsImRpc3Bvc2FibGUiLCJ1cGRhdGUiLCJzeXN0ZW1WYXJpYWJsZXMiLCJTeXN0ZW1WYXJpYWJsZXMiLCJweXRob25QYXRoIiwicmVzb2x2ZUFueSIsImdldEFic29sdXRlUGF0aCIsImxpbnRpbmdTZXR0aW5ncyIsImxpbnRpbmciLCJhc3NpZ24iLCJhbmFseXNpc1NldHRpbmdzIiwiYW5hbHlzaXMiLCJzb3J0SW1wb3J0U2V0dGluZ3MiLCJzb3J0SW1wb3J0cyIsImFyZ3MiLCJpZ25vcmVQYXR0ZXJucyIsImZsYWtlOEFyZ3MiLCJmbGFrZThFbmFibGVkIiwiZmxha2U4UGF0aCIsImxpbnRPblNhdmUiLCJtYXhOdW1iZXJPZlByb2JsZW1zIiwibXlweUFyZ3MiLCJteXB5RW5hYmxlZCIsIm15cHlQYXRoIiwiYmFuZGl0QXJncyIsImJhbmRpdEVuYWJsZWQiLCJiYW5kaXRQYXRoIiwicGVwOEFyZ3MiLCJwZXA4RW5hYmxlZCIsInBlcDhQYXRoIiwicHlsYW1hQXJncyIsInB5bGFtYUVuYWJsZWQiLCJweWxhbWFQYXRoIiwicHJvc3BlY3RvckFyZ3MiLCJwcm9zcGVjdG9yRW5hYmxlZCIsInByb3NwZWN0b3JQYXRoIiwicHlkb2NzdHlsZUFyZ3MiLCJweWRvY3N0eWxlRW5hYmxlZCIsInB5ZG9jc3R5bGVQYXRoIiwicHlsaW50QXJncyIsInB5bGludEVuYWJsZWQiLCJweWxpbnRQYXRoIiwicHlsaW50Q2F0ZWdvcnlTZXZlcml0eSIsImNvbnZlbnRpb24iLCJEaWFnbm9zdGljU2V2ZXJpdHkiLCJIaW50IiwiZXJyb3IiLCJmYXRhbCIsInJlZmFjdG9yIiwid2FybmluZyIsIldhcm5pbmciLCJwZXA4Q2F0ZWdvcnlTZXZlcml0eSIsIkUiLCJXIiwiZmxha2U4Q2F0ZWdvcnlTZXZlcml0eSIsIkYiLCJteXB5Q2F0ZWdvcnlTZXZlcml0eSIsIm5vdGUiLCJweWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnMiLCJmb3JtYXR0aW5nU2V0dGluZ3MiLCJmb3JtYXR0aW5nIiwiYXV0b3BlcDhBcmdzIiwiYXV0b3BlcDhQYXRoIiwicHJvdmlkZXIiLCJibGFja0FyZ3MiLCJibGFja1BhdGgiLCJ5YXBmQXJncyIsInlhcGZQYXRoIiwiYXV0b0NvbXBsZXRlU2V0dGluZ3MiLCJleHRyYVBhdGhzIiwic2hvd0FkdmFuY2VkTWVtYmVycyIsInR5cGVzaGVkUGF0aHMiLCJ3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3MiLCJ3b3Jrc3BhY2VTeW1ib2xzIiwiY3RhZ3NQYXRoIiwiZXhjbHVzaW9uUGF0dGVybnMiLCJyZWJ1aWxkT25GaWxlU2F2ZSIsInJlYnVpbGRPblN0YXJ0IiwidGFnRmlsZVBhdGgiLCJqb2luIiwidW5pdFRlc3RTZXR0aW5ncyIsInVuaXRUZXN0Iiwibm9zZXRlc3RBcmdzIiwicHlUZXN0QXJncyIsInVuaXR0ZXN0QXJncyIsInByb21wdFRvQ29uZmlndXJlIiwiZGVidWdQb3J0Iiwibm9zZXRlc3RzRW5hYmxlZCIsInB5VGVzdEVuYWJsZWQiLCJ1bml0dGVzdEVuYWJsZWQiLCJub3NldGVzdFBhdGgiLCJweVRlc3RQYXRoIiwiYXV0b1Rlc3REaXNjb3Zlck9uU2F2ZUVuYWJsZWQiLCJjd2QiLCJtYXAiLCJhcmciLCJ0ZXJtaW5hbFNldHRpbmdzIiwidGVybWluYWwiLCJleGVjdXRlSW5GaWxlRGlyIiwibGF1bmNoQXJncyIsImFjdGl2YXRlRW52aXJvbm1lbnQiLCJkYXRhU2NpZW5jZVNldHRpbmdzIiwiZGF0YXNjaWVuY2UiLCJnZXRQeXRob25FeGVjdXRhYmxlIiwiZXgiLCJwdXNoIiwib25EaWRDaGFuZ2VDb25maWd1cmF0aW9uIiwiY3VycmVudENvbmZpZyIsInNldFRpbWVvdXQiLCJlbWl0IiwiaW5pdGlhbENvbmZpZyIsIk1hcCIsInBhdGhUb0NoZWNrIiwicm9vdERpciIsImluZGV4T2YiLCJzZXAiLCJpc0Fic29sdXRlIiwicmVzb2x2ZSIsImJhc2VuYW1lIiwiZGlybmFtZSIsImlzVmFsaWRQeXRob25QYXRoIiwiS25vd25QeXRob25FeGVjdXRhYmxlcyIsImV4ZWN1dGFibGVOYW1lIiwib3V0cHV0IiwiZXhlY0ZpbGVTeW5jIiwiZW5jb2RpbmciLCJzdGFydHNXaXRoIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxhQUFhLEdBQUdDLE9BQU8sQ0FBQyxlQUFELENBQTdCOztBQUNBLE1BQU1DLFFBQVEsR0FBR0QsT0FBTyxDQUFDLFFBQUQsQ0FBeEI7O0FBQ0EsTUFBTUUsSUFBSSxHQUFHRixPQUFPLENBQUMsTUFBRCxDQUFwQjs7QUFDQSxNQUFNRyxRQUFRLEdBQUdILE9BQU8sQ0FBQyxRQUFELENBQXhCOztBQUNBLE1BQU1JLFdBQVcsR0FBR0osT0FBTyxDQUFDLGNBQUQsQ0FBM0I7O0FBQ0EsTUFBTUssV0FBVyxHQUFHTCxPQUFPLENBQUMsd0JBQUQsQ0FBM0I7O0FBQ0EsTUFBTU0sV0FBVyxHQUFHTixPQUFPLENBQUMsYUFBRCxDQUEzQjs7QUFDQSxNQUFNTyxpQkFBaUIsR0FBR1AsT0FBTyxDQUFDLDZCQUFELENBQWpDLEMsQ0FDQTs7O0FBQ0EsTUFBTVEsU0FBUyxHQUFHUixPQUFPLENBQUMsV0FBRCxDQUF6Qjs7QUFDQUgsT0FBTyxDQUFDWSxVQUFSLEdBQXFCLE9BQU9DLElBQVAsQ0FBWUMsT0FBTyxDQUFDQyxRQUFwQixDQUFyQixDLENBQ0E7O0FBQ0EsTUFBTUMsY0FBTixTQUE2QlosUUFBUSxDQUFDYSxZQUF0QyxDQUFt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QUMsSUFBRCxFQUFPLGFBQVAsQ0FBdkMsRUFBOEQ7QUFBRXlILE1BQUFBLFFBQVEsRUFBRTtBQUFaLEtBQTlELENBQWY7QUFDQSxXQUFPRixNQUFNLENBQUNHLFVBQVAsQ0FBa0IsTUFBbEIsQ0FBUDtBQUNILEdBSEQsQ0FJQSxPQUFPdEIsRUFBUCxFQUFXO0FBQ1AsV0FBTyxLQUFQO0FBQ0g7QUFDSiIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IGNoaWxkX3Byb2Nlc3MgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTtcbmNvbnN0IGV2ZW50c18xID0gcmVxdWlyZShcImV2ZW50c1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcbmNvbnN0IHRlbGVtZXRyeV8xID0gcmVxdWlyZShcIi4uL3RlbGVtZXRyeVwiKTtcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uL3RlbGVtZXRyeS9jb25zdGFudHNcIik7XG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcbmNvbnN0IHN5c3RlbVZhcmlhYmxlc18xID0gcmVxdWlyZShcIi4vdmFyaWFibGVzL3N5c3RlbVZhcmlhYmxlc1wiKTtcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1yZXF1aXJlLWltcG9ydHMgbm8tdmFyLXJlcXVpcmVzXG5jb25zdCB1bnRpbGRpZnkgPSByZXF1aXJlKCd1bnRpbGRpZnknKTtcbmV4cG9ydHMuSVNfV0lORE9XUyA9IC9ed2luLy50ZXN0KHByb2Nlc3MucGxhdGZvcm0pO1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmNvbXBsZXRlZC1kb2NzXG5jbGFzcyBQeXRob25TZXR0aW5ncyBleHRlbmRzIGV2ZW50c18xLkV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3Iod29ya3NwYWNlRm9sZGVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuZG93bmxvYWRMYW5ndWFnZVNlcnZlciA9IHRydWU7XG4gICAgICAgIHRoaXMuamVkaUVuYWJsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmplZGlQYXRoID0gJyc7XG4gICAgICAgIHRoaXMuamVkaU1lbW9yeUxpbWl0ID0gMTAyNDtcbiAgICAgICAgdGhpcy5lbnZGaWxlID0gJyc7XG4gICAgICAgIHRoaXMudmVudlBhdGggPSAnJztcbiAgICAgICAgdGhpcy52ZW52Rm9sZGVycyA9IFtdO1xuICAgICAgICB0aGlzLmNvbmRhUGF0aCA9ICcnO1xuICAgICAgICB0aGlzLmRldk9wdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5kaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2tzID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZ2xvYmFsTW9kdWxlSW5zdGFsbGF0aW9uID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IFtdO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6dmFyaWFibGUtbmFtZVxuICAgICAgICB0aGlzLl9weXRob25QYXRoID0gJyc7XG4gICAgICAgIHRoaXMud29ya3NwYWNlUm9vdCA9IHdvcmtzcGFjZUZvbGRlciA/IHdvcmtzcGFjZUZvbGRlciA6IHZzY29kZV8xLlVyaS5maWxlKF9fZGlybmFtZSk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6ZnVuY3Rpb24tbmFtZVxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZShyZXNvdXJjZSkge1xuICAgICAgICBjb25zdCB3b3Jrc3BhY2VGb2xkZXJVcmkgPSBQeXRob25TZXR0aW5ncy5nZXRTZXR0aW5nc1VyaUFuZFRhcmdldChyZXNvdXJjZSkudXJpO1xuICAgICAgICBjb25zdCB3b3Jrc3BhY2VGb2xkZXJLZXkgPSB3b3Jrc3BhY2VGb2xkZXJVcmkgPyB3b3Jrc3BhY2VGb2xkZXJVcmkuZnNQYXRoIDogJyc7XG4gICAgICAgIGlmICghUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MuaGFzKHdvcmtzcGFjZUZvbGRlcktleSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gbmV3IFB5dGhvblNldHRpbmdzKHdvcmtzcGFjZUZvbGRlclVyaSk7XG4gICAgICAgICAgICBQeXRob25TZXR0aW5ncy5weXRob25TZXR0aW5ncy5zZXQod29ya3NwYWNlRm9sZGVyS2V5LCBzZXR0aW5ncyk7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXRPblR5cGUgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbignZWRpdG9yJywgcmVzb3VyY2UgPyByZXNvdXJjZSA6IG51bGwpLmdldCgnZm9ybWF0T25UeXBlJywgZmFsc2UpO1xuICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGNvbnN0YW50c18xLkNPTVBMRVRJT05fQUREX0JSQUNLRVRTLCB1bmRlZmluZWQsIHsgZW5hYmxlZDogc2V0dGluZ3MuYXV0b0NvbXBsZXRlLmFkZEJyYWNrZXRzIH0pO1xuICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGNvbnN0YW50c18xLkZPUk1BVF9PTl9UWVBFLCB1bmRlZmluZWQsIHsgZW5hYmxlZDogZm9ybWF0T25UeXBlIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgcmV0dXJuIFB5dGhvblNldHRpbmdzLnB5dGhvblNldHRpbmdzLmdldCh3b3Jrc3BhY2VGb2xkZXJLZXkpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6dHlwZS1saXRlcmFsLWRlbGltaXRlclxuICAgIHN0YXRpYyBnZXRTZXR0aW5nc1VyaUFuZFRhcmdldChyZXNvdXJjZSkge1xuICAgICAgICBjb25zdCB3b3Jrc3BhY2VGb2xkZXIgPSByZXNvdXJjZSA/IHZzY29kZV8xLndvcmtzcGFjZS5nZXRXb3Jrc3BhY2VGb2xkZXIocmVzb3VyY2UpIDogdW5kZWZpbmVkO1xuICAgICAgICBsZXQgd29ya3NwYWNlRm9sZGVyVXJpID0gd29ya3NwYWNlRm9sZGVyID8gd29ya3NwYWNlRm9sZGVyLnVyaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF3b3Jrc3BhY2VGb2xkZXJVcmkgJiYgQXJyYXkuaXNBcnJheSh2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycykgJiYgdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgd29ya3NwYWNlRm9sZGVyVXJpID0gdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnNbMF0udXJpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHdvcmtzcGFjZUZvbGRlclVyaSA/IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlRm9sZGVyIDogdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5HbG9iYWw7XG4gICAgICAgIHJldHVybiB7IHVyaTogd29ya3NwYWNlRm9sZGVyVXJpLCB0YXJnZXQgfTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmZ1bmN0aW9uLW5hbWVcbiAgICBzdGF0aWMgZGlzcG9zZSgpIHtcbiAgICAgICAgaWYgKCFjb25zdGFudHNfMi5pc1Rlc3RFeGVjdXRpb24oKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEaXNwb3NlIGNhbiBvbmx5IGJlIGNhbGxlZCBmcm9tIHVuaXQgdGVzdHMnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdm9pZC1leHByZXNzaW9uXG4gICAgICAgIFB5dGhvblNldHRpbmdzLnB5dGhvblNldHRpbmdzLmZvckVhY2goaXRlbSA9PiBpdGVtLmRpc3Bvc2UoKSk7XG4gICAgICAgIFB5dGhvblNldHRpbmdzLnB5dGhvblNldHRpbmdzLmNsZWFyKCk7XG4gICAgfVxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bnNhZmUtYW55XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMuZm9yRWFjaChkaXNwb3NhYmxlID0+IGRpc3Bvc2FibGUuZGlzcG9zZSgpKTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IFtdO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5IG1heC1mdW5jLWJvZHktbGVuZ3RoXG4gICAgdXBkYXRlKHB5dGhvblNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZVJvb3QgPSB0aGlzLndvcmtzcGFjZVJvb3QuZnNQYXRoO1xuICAgICAgICBjb25zdCBzeXN0ZW1WYXJpYWJsZXMgPSBuZXcgc3lzdGVtVmFyaWFibGVzXzEuU3lzdGVtVmFyaWFibGVzKHRoaXMud29ya3NwYWNlUm9vdCA/IHRoaXMud29ya3NwYWNlUm9vdC5mc1BhdGggOiB1bmRlZmluZWQpO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICB0aGlzLnB5dGhvblBhdGggPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3B5dGhvblBhdGgnKSk7XG4gICAgICAgIHRoaXMucHl0aG9uUGF0aCA9IGdldEFic29sdXRlUGF0aCh0aGlzLnB5dGhvblBhdGgsIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICB0aGlzLnZlbnZQYXRoID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCd2ZW52UGF0aCcpKTtcbiAgICAgICAgdGhpcy52ZW52Rm9sZGVycyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgndmVudkZvbGRlcnMnKSk7XG4gICAgICAgIGNvbnN0IGNvbmRhUGF0aCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnY29uZGFQYXRoJykpO1xuICAgICAgICB0aGlzLmNvbmRhUGF0aCA9IGNvbmRhUGF0aCAmJiBjb25kYVBhdGgubGVuZ3RoID4gMCA/IGdldEFic29sdXRlUGF0aChjb25kYVBhdGgsIHdvcmtzcGFjZVJvb3QpIDogY29uZGFQYXRoO1xuICAgICAgICB0aGlzLmRvd25sb2FkTGFuZ3VhZ2VTZXJ2ZXIgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2Rvd25sb2FkTGFuZ3VhZ2VTZXJ2ZXInLCB0cnVlKSk7XG4gICAgICAgIHRoaXMuamVkaUVuYWJsZWQgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2plZGlFbmFibGVkJywgdHJ1ZSkpO1xuICAgICAgICB0aGlzLmF1dG9VcGRhdGVMYW5ndWFnZVNlcnZlciA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyJywgdHJ1ZSkpO1xuICAgICAgICBpZiAodGhpcy5qZWRpRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIHRoaXMuamVkaVBhdGggPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2plZGlQYXRoJykpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmplZGlQYXRoID09PSAnc3RyaW5nJyAmJiB0aGlzLmplZGlQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmplZGlQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMuamVkaVBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuamVkaVBhdGggPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuamVkaU1lbW9yeUxpbWl0ID0gcHl0aG9uU2V0dGluZ3MuZ2V0KCdqZWRpTWVtb3J5TGltaXQnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICB0aGlzLmVudkZpbGUgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2VudkZpbGUnKSk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb24gbm8tYW55XG4gICAgICAgIHRoaXMuZGV2T3B0aW9ucyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnZGV2T3B0aW9ucycpKTtcbiAgICAgICAgdGhpcy5kZXZPcHRpb25zID0gQXJyYXkuaXNBcnJheSh0aGlzLmRldk9wdGlvbnMpID8gdGhpcy5kZXZPcHRpb25zIDogW107XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IGxpbnRpbmdTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnbGludGluZycpKTtcbiAgICAgICAgaWYgKHRoaXMubGludGluZykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLmxpbnRpbmcsIGxpbnRpbmdTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxpbnRpbmcgPSBsaW50aW5nU2V0dGluZ3M7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgYW5hbHlzaXNTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnYW5hbHlzaXMnKSk7XG4gICAgICAgIGlmICh0aGlzLmFuYWx5c2lzKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuYW5hbHlzaXMsIGFuYWx5c2lzU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hbmFseXNpcyA9IGFuYWx5c2lzU2V0dGluZ3M7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2tzID0gcHl0aG9uU2V0dGluZ3MuZ2V0KCdkaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2snKSA9PT0gdHJ1ZTtcbiAgICAgICAgdGhpcy5nbG9iYWxNb2R1bGVJbnN0YWxsYXRpb24gPSBweXRob25TZXR0aW5ncy5nZXQoJ2dsb2JhbE1vZHVsZUluc3RhbGxhdGlvbicpID09PSB0cnVlO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBjb25zdCBzb3J0SW1wb3J0U2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3NvcnRJbXBvcnRzJykpO1xuICAgICAgICBpZiAodGhpcy5zb3J0SW1wb3J0cykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnNvcnRJbXBvcnRzLCBzb3J0SW1wb3J0U2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zb3J0SW1wb3J0cyA9IHNvcnRJbXBvcnRTZXR0aW5ncztcbiAgICAgICAgfVxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXG4gICAgICAgIHRoaXMuc29ydEltcG9ydHMgPSB0aGlzLnNvcnRJbXBvcnRzID8gdGhpcy5zb3J0SW1wb3J0cyA6IHsgcGF0aDogJycsIGFyZ3M6IFtdIH07XG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIHRyYXZpcy5cbiAgICAgICAgdGhpcy5saW50aW5nID0gdGhpcy5saW50aW5nID8gdGhpcy5saW50aW5nIDoge1xuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgICAgICBpZ25vcmVQYXR0ZXJuczogW10sXG4gICAgICAgICAgICBmbGFrZThBcmdzOiBbXSwgZmxha2U4RW5hYmxlZDogZmFsc2UsIGZsYWtlOFBhdGg6ICdmbGFrZScsXG4gICAgICAgICAgICBsaW50T25TYXZlOiBmYWxzZSwgbWF4TnVtYmVyT2ZQcm9ibGVtczogMTAwLFxuICAgICAgICAgICAgbXlweUFyZ3M6IFtdLCBteXB5RW5hYmxlZDogZmFsc2UsIG15cHlQYXRoOiAnbXlweScsXG4gICAgICAgICAgICBiYW5kaXRBcmdzOiBbXSwgYmFuZGl0RW5hYmxlZDogZmFsc2UsIGJhbmRpdFBhdGg6ICdiYW5kaXQnLFxuICAgICAgICAgICAgcGVwOEFyZ3M6IFtdLCBwZXA4RW5hYmxlZDogZmFsc2UsIHBlcDhQYXRoOiAncGVwOCcsXG4gICAgICAgICAgICBweWxhbWFBcmdzOiBbXSwgcHlsYW1hRW5hYmxlZDogZmFsc2UsIHB5bGFtYVBhdGg6ICdweWxhbWEnLFxuICAgICAgICAgICAgcHJvc3BlY3RvckFyZ3M6IFtdLCBwcm9zcGVjdG9yRW5hYmxlZDogZmFsc2UsIHByb3NwZWN0b3JQYXRoOiAncHJvc3BlY3RvcicsXG4gICAgICAgICAgICBweWRvY3N0eWxlQXJnczogW10sIHB5ZG9jc3R5bGVFbmFibGVkOiBmYWxzZSwgcHlkb2NzdHlsZVBhdGg6ICdweWRvY3N0eWxlJyxcbiAgICAgICAgICAgIHB5bGludEFyZ3M6IFtdLCBweWxpbnRFbmFibGVkOiBmYWxzZSwgcHlsaW50UGF0aDogJ3B5bGludCcsXG4gICAgICAgICAgICBweWxpbnRDYXRlZ29yeVNldmVyaXR5OiB7XG4gICAgICAgICAgICAgICAgY29udmVudGlvbjogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkhpbnQsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5FcnJvcixcbiAgICAgICAgICAgICAgICBmYXRhbDogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yLFxuICAgICAgICAgICAgICAgIHJlZmFjdG9yOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuSGludCxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuV2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBlcDhDYXRlZ29yeVNldmVyaXR5OiB7XG4gICAgICAgICAgICAgICAgRTogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yLFxuICAgICAgICAgICAgICAgIFc6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmxha2U4Q2F0ZWdvcnlTZXZlcml0eToge1xuICAgICAgICAgICAgICAgIEU6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5FcnJvcixcbiAgICAgICAgICAgICAgICBXOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuV2FybmluZyxcbiAgICAgICAgICAgICAgICAvLyBQZXIgaHR0cDovL2ZsYWtlOC5weWNxYS5vcmcvZW4vbGF0ZXN0L2dsb3NzYXJ5Lmh0bWwjdGVybS1lcnJvci1jb2RlXG4gICAgICAgICAgICAgICAgLy8gJ0YnIGRvZXMgbm90IG1lYW4gJ2ZhdGFsIGFzIGluIFB5TGludCBidXQgcmF0aGVyICdweWZsYWtlcycgc3VjaCBhc1xuICAgICAgICAgICAgICAgIC8vIHVudXNlZCBpbXBvcnRzLCB2YXJpYWJsZXMsIGV0Yy5cbiAgICAgICAgICAgICAgICBGOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuV2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG15cHlDYXRlZ29yeVNldmVyaXR5OiB7XG4gICAgICAgICAgICAgICAgZXJyb3I6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5FcnJvcixcbiAgICAgICAgICAgICAgICBub3RlOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuSGludFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHB5bGludFVzZU1pbmltYWxDaGVja2VyczogZmFsc2VcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5saW50aW5nLnB5bGludFBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLnB5bGludFBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy5saW50aW5nLmZsYWtlOFBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLmZsYWtlOFBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy5saW50aW5nLnBlcDhQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5wZXA4UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmxpbnRpbmcucHlsYW1hUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcucHlsYW1hUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmxpbnRpbmcucHJvc3BlY3RvclBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLnByb3NwZWN0b3JQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIHRoaXMubGludGluZy5weWRvY3N0eWxlUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcucHlkb2NzdHlsZVBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy5saW50aW5nLm15cHlQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5teXB5UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmxpbnRpbmcuYmFuZGl0UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcuYmFuZGl0UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBjb25zdCBmb3JtYXR0aW5nU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2Zvcm1hdHRpbmcnKSk7XG4gICAgICAgIGlmICh0aGlzLmZvcm1hdHRpbmcpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5mb3JtYXR0aW5nLCBmb3JtYXR0aW5nU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5mb3JtYXR0aW5nID0gZm9ybWF0dGluZ1NldHRpbmdzO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIHRyYXZpcy5cbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nID0gdGhpcy5mb3JtYXR0aW5nID8gdGhpcy5mb3JtYXR0aW5nIDoge1xuICAgICAgICAgICAgYXV0b3BlcDhBcmdzOiBbXSwgYXV0b3BlcDhQYXRoOiAnYXV0b3BlcDgnLFxuICAgICAgICAgICAgcHJvdmlkZXI6ICdhdXRvcGVwOCcsXG4gICAgICAgICAgICBibGFja0FyZ3M6IFtdLCBibGFja1BhdGg6ICdibGFjaycsXG4gICAgICAgICAgICB5YXBmQXJnczogW10sIHlhcGZQYXRoOiAneWFwZidcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nLmF1dG9wZXA4UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmZvcm1hdHRpbmcuYXV0b3BlcDhQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIHRoaXMuZm9ybWF0dGluZy55YXBmUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmZvcm1hdHRpbmcueWFwZlBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nLmJsYWNrUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmZvcm1hdHRpbmcuYmxhY2tQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IGF1dG9Db21wbGV0ZVNldHRpbmdzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdhdXRvQ29tcGxldGUnKSk7XG4gICAgICAgIGlmICh0aGlzLmF1dG9Db21wbGV0ZSkge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLmF1dG9Db21wbGV0ZSwgYXV0b0NvbXBsZXRlU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ29tcGxldGUgPSBhdXRvQ29tcGxldGVTZXR0aW5ncztcbiAgICAgICAgfVxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXG4gICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlID0gdGhpcy5hdXRvQ29tcGxldGUgPyB0aGlzLmF1dG9Db21wbGV0ZSA6IHtcbiAgICAgICAgICAgIGV4dHJhUGF0aHM6IFtdLFxuICAgICAgICAgICAgYWRkQnJhY2tldHM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd0FkdmFuY2VkTWVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICB0eXBlc2hlZFBhdGhzOiBbXVxuICAgICAgICB9O1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBjb25zdCB3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3dvcmtzcGFjZVN5bWJvbHMnKSk7XG4gICAgICAgIGlmICh0aGlzLndvcmtzcGFjZVN5bWJvbHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy53b3Jrc3BhY2VTeW1ib2xzLCB3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53b3Jrc3BhY2VTeW1ib2xzID0gd29ya3NwYWNlU3ltYm9sc1NldHRpbmdzO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIHRyYXZpcy5cbiAgICAgICAgdGhpcy53b3Jrc3BhY2VTeW1ib2xzID0gdGhpcy53b3Jrc3BhY2VTeW1ib2xzID8gdGhpcy53b3Jrc3BhY2VTeW1ib2xzIDoge1xuICAgICAgICAgICAgY3RhZ3NQYXRoOiAnY3RhZ3MnLFxuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGV4Y2x1c2lvblBhdHRlcm5zOiBbXSxcbiAgICAgICAgICAgIHJlYnVpbGRPbkZpbGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgcmVidWlsZE9uU3RhcnQ6IHRydWUsXG4gICAgICAgICAgICB0YWdGaWxlUGF0aDogcGF0aC5qb2luKHdvcmtzcGFjZVJvb3QsICd0YWdzJylcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VTeW1ib2xzLnRhZ0ZpbGVQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMud29ya3NwYWNlU3ltYm9scy50YWdGaWxlUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBjb25zdCB1bml0VGVzdFNldHRpbmdzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCd1bml0VGVzdCcpKTtcbiAgICAgICAgaWYgKHRoaXMudW5pdFRlc3QpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy51bml0VGVzdCwgdW5pdFRlc3RTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnVuaXRUZXN0ID0gdW5pdFRlc3RTZXR0aW5ncztcbiAgICAgICAgICAgIGlmIChjb25zdGFudHNfMi5pc1Rlc3RFeGVjdXRpb24oKSAmJiAhdGhpcy51bml0VGVzdCkge1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpwcmVmZXItdHlwZS1jYXN0XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgdGhpcy51bml0VGVzdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9zZXRlc3RBcmdzOiBbXSwgcHlUZXN0QXJnczogW10sIHVuaXR0ZXN0QXJnczogW10sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdFRvQ29uZmlndXJlOiB0cnVlLCBkZWJ1Z1BvcnQ6IDMwMDAsXG4gICAgICAgICAgICAgICAgICAgIG5vc2V0ZXN0c0VuYWJsZWQ6IGZhbHNlLCBweVRlc3RFbmFibGVkOiBmYWxzZSwgdW5pdHRlc3RFbmFibGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbm9zZXRlc3RQYXRoOiAnbm9zZXRlc3RzJywgcHlUZXN0UGF0aDogJ3B5dGVzdCcsIGF1dG9UZXN0RGlzY292ZXJPblNhdmVFbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXG4gICAgICAgIHRoaXMudW5pdFRlc3QgPSB0aGlzLnVuaXRUZXN0ID8gdGhpcy51bml0VGVzdCA6IHtcbiAgICAgICAgICAgIHByb21wdFRvQ29uZmlndXJlOiB0cnVlLFxuICAgICAgICAgICAgZGVidWdQb3J0OiAzMDAwLFxuICAgICAgICAgICAgbm9zZXRlc3RBcmdzOiBbXSwgbm9zZXRlc3RQYXRoOiAnbm9zZXRlc3QnLCBub3NldGVzdHNFbmFibGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHB5VGVzdEFyZ3M6IFtdLCBweVRlc3RFbmFibGVkOiBmYWxzZSwgcHlUZXN0UGF0aDogJ3B5dGVzdCcsXG4gICAgICAgICAgICB1bml0dGVzdEFyZ3M6IFtdLCB1bml0dGVzdEVuYWJsZWQ6IGZhbHNlLCBhdXRvVGVzdERpc2NvdmVyT25TYXZlRW5hYmxlZDogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnVuaXRUZXN0LnB5VGVzdFBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy51bml0VGVzdC5weVRlc3RQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIHRoaXMudW5pdFRlc3Qubm9zZXRlc3RQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMudW5pdFRlc3Qubm9zZXRlc3RQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIGlmICh0aGlzLnVuaXRUZXN0LmN3ZCkge1xuICAgICAgICAgICAgdGhpcy51bml0VGVzdC5jd2QgPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy51bml0VGVzdC5jd2QpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZXNvbHZlIGFueSB2YXJpYWJsZXMgZm91bmQgaW4gdGhlIHRlc3QgYXJndW1lbnRzLlxuICAgICAgICB0aGlzLnVuaXRUZXN0Lm5vc2V0ZXN0QXJncyA9IHRoaXMudW5pdFRlc3Qubm9zZXRlc3RBcmdzLm1hcChhcmcgPT4gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkoYXJnKSk7XG4gICAgICAgIHRoaXMudW5pdFRlc3QucHlUZXN0QXJncyA9IHRoaXMudW5pdFRlc3QucHlUZXN0QXJncy5tYXAoYXJnID0+IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KGFyZykpO1xuICAgICAgICB0aGlzLnVuaXRUZXN0LnVuaXR0ZXN0QXJncyA9IHRoaXMudW5pdFRlc3QudW5pdHRlc3RBcmdzLm1hcChhcmcgPT4gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkoYXJnKSk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IHRlcm1pbmFsU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3Rlcm1pbmFsJykpO1xuICAgICAgICBpZiAodGhpcy50ZXJtaW5hbCkge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnRlcm1pbmFsLCB0ZXJtaW5hbFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGVybWluYWwgPSB0ZXJtaW5hbFNldHRpbmdzO1xuICAgICAgICAgICAgaWYgKGNvbnN0YW50c18yLmlzVGVzdEV4ZWN1dGlvbigpICYmICF0aGlzLnRlcm1pbmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOnByZWZlci10eXBlLWNhc3RcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tb2JqZWN0LWxpdGVyYWwtdHlwZS1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICB0aGlzLnRlcm1pbmFsID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgdHJhdmlzLlxuICAgICAgICB0aGlzLnRlcm1pbmFsID0gdGhpcy50ZXJtaW5hbCA/IHRoaXMudGVybWluYWwgOiB7XG4gICAgICAgICAgICBleGVjdXRlSW5GaWxlRGlyOiB0cnVlLFxuICAgICAgICAgICAgbGF1bmNoQXJnczogW10sXG4gICAgICAgICAgICBhY3RpdmF0ZUVudmlyb25tZW50OiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGRhdGFTY2llbmNlU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2RhdGFTY2llbmNlJykpO1xuICAgICAgICBpZiAodGhpcy5kYXRhc2NpZW5jZSkge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLmRhdGFzY2llbmNlLCBkYXRhU2NpZW5jZVNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YXNjaWVuY2UgPSBkYXRhU2NpZW5jZVNldHRpbmdzO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBweXRob25QYXRoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHl0aG9uUGF0aDtcbiAgICB9XG4gICAgc2V0IHB5dGhvblBhdGgodmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX3B5dGhvblBhdGggPT09IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIHNwZWNpZnlpbmcganVzdCB0aGUgZGlyZWN0b3J5IHdoZXJlIHRoZSBweXRob24gZXhlY3V0YWJsZSB3aWxsIGJlIGxvY2F0ZWQuXG4gICAgICAgIC8vIEUuZy4gdmlydHVhbCBkaXJlY3RvcnkgbmFtZS5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3B5dGhvblBhdGggPSBnZXRQeXRob25FeGVjdXRhYmxlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIHRoaXMuX3B5dGhvblBhdGggPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzLnB1c2godnNjb2RlXzEud29ya3NwYWNlLm9uRGlkQ2hhbmdlQ29uZmlndXJhdGlvbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50Q29uZmlnID0gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicsIHRoaXMud29ya3NwYWNlUm9vdCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZShjdXJyZW50Q29uZmlnKTtcbiAgICAgICAgICAgIC8vIElmIHdvcmtzcGFjZSBjb25maWcgY2hhbmdlcywgdGhlbiB3ZSBjb3VsZCBoYXZlIGEgY2FzY2FkaW5nIGVmZmVjdCBvZiBvbiBjaGFuZ2UgZXZlbnRzLlxuICAgICAgICAgICAgLy8gTGV0J3MgZGVmZXIgdGhlIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZW1pdCgnY2hhbmdlJyksIDEpO1xuICAgICAgICB9KSk7XG4gICAgICAgIGNvbnN0IGluaXRpYWxDb25maWcgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbigncHl0aG9uJywgdGhpcy53b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy51cGRhdGUoaW5pdGlhbENvbmZpZyk7XG4gICAgfVxufVxuUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MgPSBuZXcgTWFwKCk7XG5leHBvcnRzLlB5dGhvblNldHRpbmdzID0gUHl0aG9uU2V0dGluZ3M7XG5mdW5jdGlvbiBnZXRBYnNvbHV0ZVBhdGgocGF0aFRvQ2hlY2ssIHJvb3REaXIpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6cHJlZmVyLXR5cGUtY2FzdCBuby11bnNhZmUtYW55XG4gICAgcGF0aFRvQ2hlY2sgPSB1bnRpbGRpZnkocGF0aFRvQ2hlY2spO1xuICAgIGlmIChjb25zdGFudHNfMi5pc1Rlc3RFeGVjdXRpb24oKSAmJiAhcGF0aFRvQ2hlY2spIHtcbiAgICAgICAgcmV0dXJuIHJvb3REaXI7XG4gICAgfVxuICAgIGlmIChwYXRoVG9DaGVjay5pbmRleE9mKHBhdGguc2VwKSA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHBhdGhUb0NoZWNrO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5pc0Fic29sdXRlKHBhdGhUb0NoZWNrKSA/IHBhdGhUb0NoZWNrIDogcGF0aC5yZXNvbHZlKHJvb3REaXIsIHBhdGhUb0NoZWNrKTtcbn1cbmZ1bmN0aW9uIGdldFB5dGhvbkV4ZWN1dGFibGUocHl0aG9uUGF0aCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpwcmVmZXItdHlwZS1jYXN0IG5vLXVuc2FmZS1hbnlcbiAgICBweXRob25QYXRoID0gdW50aWxkaWZ5KHB5dGhvblBhdGgpO1xuICAgIC8vIElmIG9ubHkgJ3B5dGhvbicuXG4gICAgaWYgKHB5dGhvblBhdGggPT09ICdweXRob24nIHx8XG4gICAgICAgIHB5dGhvblBhdGguaW5kZXhPZihwYXRoLnNlcCkgPT09IC0xIHx8XG4gICAgICAgIHBhdGguYmFzZW5hbWUocHl0aG9uUGF0aCkgPT09IHBhdGguZGlybmFtZShweXRob25QYXRoKSkge1xuICAgICAgICByZXR1cm4gcHl0aG9uUGF0aDtcbiAgICB9XG4gICAgaWYgKGlzVmFsaWRQeXRob25QYXRoKHB5dGhvblBhdGgpKSB7XG4gICAgICAgIHJldHVybiBweXRob25QYXRoO1xuICAgIH1cbiAgICAvLyBLZWVwIHB5dGhvbiByaWdodCBvbiB0b3AsIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6dmFyaWFibGUtbmFtZVxuICAgIGNvbnN0IEtub3duUHl0aG9uRXhlY3V0YWJsZXMgPSBbJ3B5dGhvbicsICdweXRob240JywgJ3B5dGhvbjMuNicsICdweXRob24zLjUnLCAncHl0aG9uMycsICdweXRob24yLjcnLCAncHl0aG9uMiddO1xuICAgIGZvciAobGV0IGV4ZWN1dGFibGVOYW1lIG9mIEtub3duUHl0aG9uRXhlY3V0YWJsZXMpIHtcbiAgICAgICAgLy8gU3VmZml4IHdpdGggJ3B5dGhvbicgZm9yIGxpbnV4IGFuZCAnb3N4JywgYW5kICdweXRob24uZXhlJyBmb3IgJ3dpbmRvd3MnLlxuICAgICAgICBpZiAoZXhwb3J0cy5JU19XSU5ET1dTKSB7XG4gICAgICAgICAgICBleGVjdXRhYmxlTmFtZSA9IGAke2V4ZWN1dGFibGVOYW1lfS5leGVgO1xuICAgICAgICAgICAgaWYgKGlzVmFsaWRQeXRob25QYXRoKHBhdGguam9pbihweXRob25QYXRoLCBleGVjdXRhYmxlTmFtZSkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihweXRob25QYXRoLCBleGVjdXRhYmxlTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNWYWxpZFB5dGhvblBhdGgocGF0aC5qb2luKHB5dGhvblBhdGgsICdzY3JpcHRzJywgZXhlY3V0YWJsZU5hbWUpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmpvaW4ocHl0aG9uUGF0aCwgJ3NjcmlwdHMnLCBleGVjdXRhYmxlTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNWYWxpZFB5dGhvblBhdGgocGF0aC5qb2luKHB5dGhvblBhdGgsIGV4ZWN1dGFibGVOYW1lKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKHB5dGhvblBhdGgsIGV4ZWN1dGFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ZhbGlkUHl0aG9uUGF0aChwYXRoLmpvaW4ocHl0aG9uUGF0aCwgJ2JpbicsIGV4ZWN1dGFibGVOYW1lKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKHB5dGhvblBhdGgsICdiaW4nLCBleGVjdXRhYmxlTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHB5dGhvblBhdGg7XG59XG5mdW5jdGlvbiBpc1ZhbGlkUHl0aG9uUGF0aChweXRob25QYXRoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gY2hpbGRfcHJvY2Vzcy5leGVjRmlsZVN5bmMocHl0aG9uUGF0aCwgWyctYycsICdwcmludCgxMjM0KSddLCB7IGVuY29kaW5nOiAndXRmOCcgfSk7XG4gICAgICAgIHJldHVybiBvdXRwdXQuc3RhcnRzV2l0aCgnMTIzNCcpO1xuICAgIH1cbiAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbmZpZ1NldHRpbmdzLmpzLm1hcCJdfQ==