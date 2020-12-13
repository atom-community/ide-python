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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmZpZ1NldHRpbmdzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiY2hpbGRfcHJvY2VzcyIsInJlcXVpcmUiLCJldmVudHNfMSIsInBhdGgiLCJ2c2NvZGVfMSIsInRlbGVtZXRyeV8xIiwiY29uc3RhbnRzXzEiLCJjb25zdGFudHNfMiIsInN5c3RlbVZhcmlhYmxlc18xIiwidW50aWxkaWZ5IiwiSVNfV0lORE9XUyIsInRlc3QiLCJwcm9jZXNzIiwicGxhdGZvcm0iLCJQeXRob25TZXR0aW5ncyIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwid29ya3NwYWNlRm9sZGVyIiwiZG93bmxvYWRMYW5ndWFnZVNlcnZlciIsImplZGlFbmFibGVkIiwiamVkaVBhdGgiLCJqZWRpTWVtb3J5TGltaXQiLCJlbnZGaWxlIiwidmVudlBhdGgiLCJ2ZW52Rm9sZGVycyIsImNvbmRhUGF0aCIsImRldk9wdGlvbnMiLCJkaXNhYmxlSW5zdGFsbGF0aW9uQ2hlY2tzIiwiZ2xvYmFsTW9kdWxlSW5zdGFsbGF0aW9uIiwiYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyIiwiZGlzcG9zYWJsZXMiLCJfcHl0aG9uUGF0aCIsIndvcmtzcGFjZVJvb3QiLCJVcmkiLCJmaWxlIiwiX19kaXJuYW1lIiwiaW5pdGlhbGl6ZSIsImdldEluc3RhbmNlIiwicmVzb3VyY2UiLCJ3b3Jrc3BhY2VGb2xkZXJVcmkiLCJnZXRTZXR0aW5nc1VyaUFuZFRhcmdldCIsInVyaSIsIndvcmtzcGFjZUZvbGRlcktleSIsImZzUGF0aCIsInB5dGhvblNldHRpbmdzIiwiaGFzIiwic2V0dGluZ3MiLCJzZXQiLCJmb3JtYXRPblR5cGUiLCJ3b3Jrc3BhY2UiLCJnZXRDb25maWd1cmF0aW9uIiwiZ2V0Iiwic2VuZFRlbGVtZXRyeUV2ZW50IiwiQ09NUExFVElPTl9BRERfQlJBQ0tFVFMiLCJ1bmRlZmluZWQiLCJlbmFibGVkIiwiYXV0b0NvbXBsZXRlIiwiYWRkQnJhY2tldHMiLCJGT1JNQVRfT05fVFlQRSIsImdldFdvcmtzcGFjZUZvbGRlciIsIkFycmF5IiwiaXNBcnJheSIsIndvcmtzcGFjZUZvbGRlcnMiLCJsZW5ndGgiLCJ0YXJnZXQiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiV29ya3NwYWNlRm9sZGVyIiwiR2xvYmFsIiwiZGlzcG9zZSIsImlzVGVzdEV4ZWN1dGlvbiIsIkVycm9yIiwiZm9yRWFjaCIsIml0ZW0iLCJjbGVhciIsImRpc3Bvc2FibGUiLCJ1cGRhdGUiLCJzeXN0ZW1WYXJpYWJsZXMiLCJTeXN0ZW1WYXJpYWJsZXMiLCJweXRob25QYXRoIiwicmVzb2x2ZUFueSIsImdldEFic29sdXRlUGF0aCIsImxpbnRpbmdTZXR0aW5ncyIsImxpbnRpbmciLCJhc3NpZ24iLCJhbmFseXNpc1NldHRpbmdzIiwiYW5hbHlzaXMiLCJzb3J0SW1wb3J0U2V0dGluZ3MiLCJzb3J0SW1wb3J0cyIsImFyZ3MiLCJpZ25vcmVQYXR0ZXJucyIsImZsYWtlOEFyZ3MiLCJmbGFrZThFbmFibGVkIiwiZmxha2U4UGF0aCIsImxpbnRPblNhdmUiLCJtYXhOdW1iZXJPZlByb2JsZW1zIiwibXlweUFyZ3MiLCJteXB5RW5hYmxlZCIsIm15cHlQYXRoIiwiYmFuZGl0QXJncyIsImJhbmRpdEVuYWJsZWQiLCJiYW5kaXRQYXRoIiwicGVwOEFyZ3MiLCJwZXA4RW5hYmxlZCIsInBlcDhQYXRoIiwicHlsYW1hQXJncyIsInB5bGFtYUVuYWJsZWQiLCJweWxhbWFQYXRoIiwicHJvc3BlY3RvckFyZ3MiLCJwcm9zcGVjdG9yRW5hYmxlZCIsInByb3NwZWN0b3JQYXRoIiwicHlkb2NzdHlsZUFyZ3MiLCJweWRvY3N0eWxlRW5hYmxlZCIsInB5ZG9jc3R5bGVQYXRoIiwicHlsaW50QXJncyIsInB5bGludEVuYWJsZWQiLCJweWxpbnRQYXRoIiwicHlsaW50Q2F0ZWdvcnlTZXZlcml0eSIsImNvbnZlbnRpb24iLCJEaWFnbm9zdGljU2V2ZXJpdHkiLCJIaW50IiwiZXJyb3IiLCJmYXRhbCIsInJlZmFjdG9yIiwid2FybmluZyIsIldhcm5pbmciLCJwZXA4Q2F0ZWdvcnlTZXZlcml0eSIsIkUiLCJXIiwiZmxha2U4Q2F0ZWdvcnlTZXZlcml0eSIsIkYiLCJteXB5Q2F0ZWdvcnlTZXZlcml0eSIsIm5vdGUiLCJweWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnMiLCJmb3JtYXR0aW5nU2V0dGluZ3MiLCJmb3JtYXR0aW5nIiwiYXV0b3BlcDhBcmdzIiwiYXV0b3BlcDhQYXRoIiwicHJvdmlkZXIiLCJibGFja0FyZ3MiLCJibGFja1BhdGgiLCJ5YXBmQXJncyIsInlhcGZQYXRoIiwiYXV0b0NvbXBsZXRlU2V0dGluZ3MiLCJleHRyYVBhdGhzIiwic2hvd0FkdmFuY2VkTWVtYmVycyIsInR5cGVzaGVkUGF0aHMiLCJ3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3MiLCJ3b3Jrc3BhY2VTeW1ib2xzIiwiY3RhZ3NQYXRoIiwiZXhjbHVzaW9uUGF0dGVybnMiLCJyZWJ1aWxkT25GaWxlU2F2ZSIsInJlYnVpbGRPblN0YXJ0IiwidGFnRmlsZVBhdGgiLCJqb2luIiwidW5pdFRlc3RTZXR0aW5ncyIsInVuaXRUZXN0Iiwibm9zZXRlc3RBcmdzIiwicHlUZXN0QXJncyIsInVuaXR0ZXN0QXJncyIsInByb21wdFRvQ29uZmlndXJlIiwiZGVidWdQb3J0Iiwibm9zZXRlc3RzRW5hYmxlZCIsInB5VGVzdEVuYWJsZWQiLCJ1bml0dGVzdEVuYWJsZWQiLCJub3NldGVzdFBhdGgiLCJweVRlc3RQYXRoIiwiYXV0b1Rlc3REaXNjb3Zlck9uU2F2ZUVuYWJsZWQiLCJjd2QiLCJtYXAiLCJhcmciLCJ0ZXJtaW5hbFNldHRpbmdzIiwidGVybWluYWwiLCJleGVjdXRlSW5GaWxlRGlyIiwibGF1bmNoQXJncyIsImFjdGl2YXRlRW52aXJvbm1lbnQiLCJkYXRhU2NpZW5jZVNldHRpbmdzIiwiZGF0YXNjaWVuY2UiLCJnZXRQeXRob25FeGVjdXRhYmxlIiwiZXgiLCJwdXNoIiwib25EaWRDaGFuZ2VDb25maWd1cmF0aW9uIiwiY3VycmVudENvbmZpZyIsInNldFRpbWVvdXQiLCJlbWl0IiwiaW5pdGlhbENvbmZpZyIsIk1hcCIsInBhdGhUb0NoZWNrIiwicm9vdERpciIsImluZGV4T2YiLCJzZXAiLCJpc0Fic29sdXRlIiwicmVzb2x2ZSIsImJhc2VuYW1lIiwiZGlybmFtZSIsImlzVmFsaWRQeXRob25QYXRoIiwiS25vd25QeXRob25FeGVjdXRhYmxlcyIsImV4ZWN1dGFibGVOYW1lIiwib3V0cHV0IiwiZXhlY0ZpbGVTeW5jIiwiZW5jb2RpbmciLCJzdGFydHNXaXRoIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxhQUFhLEdBQUdDLE9BQU8sQ0FBQyxlQUFELENBQTdCOztBQUNBLE1BQU1DLFFBQVEsR0FBR0QsT0FBTyxDQUFDLFFBQUQsQ0FBeEI7O0FBQ0EsTUFBTUUsSUFBSSxHQUFHRixPQUFPLENBQUMsTUFBRCxDQUFwQjs7QUFDQSxNQUFNRyxRQUFRLEdBQUdILE9BQU8sQ0FBQyxRQUFELENBQXhCOztBQUNBLE1BQU1JLFdBQVcsR0FBR0osT0FBTyxDQUFDLGNBQUQsQ0FBM0I7O0FBQ0EsTUFBTUssV0FBVyxHQUFHTCxPQUFPLENBQUMsd0JBQUQsQ0FBM0I7O0FBQ0EsTUFBTU0sV0FBVyxHQUFHTixPQUFPLENBQUMsYUFBRCxDQUEzQjs7QUFDQSxNQUFNTyxpQkFBaUIsR0FBR1AsT0FBTyxDQUFDLDZCQUFELENBQWpDLEMsQ0FDQTs7O0FBQ0EsTUFBTVEsU0FBUyxHQUFHUixPQUFPLENBQUMsV0FBRCxDQUF6Qjs7QUFDQUgsT0FBTyxDQUFDWSxVQUFSLEdBQXFCLE9BQU9DLElBQVAsQ0FBWUMsT0FBTyxDQUFDQyxRQUFwQixDQUFyQixDLENBQ0E7O0FBQ0EsTUFBTUMsY0FBTixTQUE2QlosUUFBUSxDQUFDYSxZQUF0QyxDQUFt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dUMsQ0FBQyxJQUFELEVBQU8sYUFBUCxDQUF2QyxFQUE4RDtBQUFFeUgsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBOUQsQ0FBZjtBQUNBLFdBQU9GLE1BQU0sQ0FBQ0csVUFBUCxDQUFrQixNQUFsQixDQUFQO0FBQ0gsR0FIRCxDQUlBLE9BQU90QixFQUFQLEVBQVc7QUFDUCxXQUFPLEtBQVA7QUFDSDtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgY2hpbGRfcHJvY2VzcyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpO1xuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgdnNjb2RlXzEgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xuY29uc3QgdGVsZW1ldHJ5XzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5XCIpO1xuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5L2NvbnN0YW50c1wiKTtcbmNvbnN0IGNvbnN0YW50c18yID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xuY29uc3Qgc3lzdGVtVmFyaWFibGVzXzEgPSByZXF1aXJlKFwiLi92YXJpYWJsZXMvc3lzdGVtVmFyaWFibGVzXCIpO1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXJlcXVpcmUtaW1wb3J0cyBuby12YXItcmVxdWlyZXNcbmNvbnN0IHVudGlsZGlmeSA9IHJlcXVpcmUoJ3VudGlsZGlmeScpO1xuZXhwb3J0cy5JU19XSU5ET1dTID0gL153aW4vLnRlc3QocHJvY2Vzcy5wbGF0Zm9ybSk7XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y29tcGxldGVkLWRvY3NcbmNsYXNzIFB5dGhvblNldHRpbmdzIGV4dGVuZHMgZXZlbnRzXzEuRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VGb2xkZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5kb3dubG9hZExhbmd1YWdlU2VydmVyID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5qZWRpRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuamVkaVBhdGggPSAnJztcbiAgICAgICAgdGhpcy5qZWRpTWVtb3J5TGltaXQgPSAxMDI0O1xuICAgICAgICB0aGlzLmVudkZpbGUgPSAnJztcbiAgICAgICAgdGhpcy52ZW52UGF0aCA9ICcnO1xuICAgICAgICB0aGlzLnZlbnZGb2xkZXJzID0gW107XG4gICAgICAgIHRoaXMuY29uZGFQYXRoID0gJyc7XG4gICAgICAgIHRoaXMuZGV2T3B0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmRpc2FibGVJbnN0YWxsYXRpb25DaGVja3MgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5nbG9iYWxNb2R1bGVJbnN0YWxsYXRpb24gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5hdXRvVXBkYXRlTGFuZ3VhZ2VTZXJ2ZXIgPSB0cnVlO1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzID0gW107XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTp2YXJpYWJsZS1uYW1lXG4gICAgICAgIHRoaXMuX3B5dGhvblBhdGggPSAnJztcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VSb290ID0gd29ya3NwYWNlRm9sZGVyID8gd29ya3NwYWNlRm9sZGVyIDogdnNjb2RlXzEuVXJpLmZpbGUoX19kaXJuYW1lKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpmdW5jdGlvbi1uYW1lXG4gICAgc3RhdGljIGdldEluc3RhbmNlKHJlc291cmNlKSB7XG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZUZvbGRlclVyaSA9IFB5dGhvblNldHRpbmdzLmdldFNldHRpbmdzVXJpQW5kVGFyZ2V0KHJlc291cmNlKS51cmk7XG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZUZvbGRlcktleSA9IHdvcmtzcGFjZUZvbGRlclVyaSA/IHdvcmtzcGFjZUZvbGRlclVyaS5mc1BhdGggOiAnJztcbiAgICAgICAgaWYgKCFQeXRob25TZXR0aW5ncy5weXRob25TZXR0aW5ncy5oYXMod29ya3NwYWNlRm9sZGVyS2V5KSkge1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBuZXcgUHl0aG9uU2V0dGluZ3Mod29ya3NwYWNlRm9sZGVyVXJpKTtcbiAgICAgICAgICAgIFB5dGhvblNldHRpbmdzLnB5dGhvblNldHRpbmdzLnNldCh3b3Jrc3BhY2VGb2xkZXJLZXksIHNldHRpbmdzKTtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdE9uVHlwZSA9IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdlZGl0b3InLCByZXNvdXJjZSA/IHJlc291cmNlIDogbnVsbCkuZ2V0KCdmb3JtYXRPblR5cGUnLCBmYWxzZSk7XG4gICAgICAgICAgICB0ZWxlbWV0cnlfMS5zZW5kVGVsZW1ldHJ5RXZlbnQoY29uc3RhbnRzXzEuQ09NUExFVElPTl9BRERfQlJBQ0tFVFMsIHVuZGVmaW5lZCwgeyBlbmFibGVkOiBzZXR0aW5ncy5hdXRvQ29tcGxldGUuYWRkQnJhY2tldHMgfSk7XG4gICAgICAgICAgICB0ZWxlbWV0cnlfMS5zZW5kVGVsZW1ldHJ5RXZlbnQoY29uc3RhbnRzXzEuRk9STUFUX09OX1RZUEUsIHVuZGVmaW5lZCwgeyBlbmFibGVkOiBmb3JtYXRPblR5cGUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICByZXR1cm4gUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MuZ2V0KHdvcmtzcGFjZUZvbGRlcktleSk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTp0eXBlLWxpdGVyYWwtZGVsaW1pdGVyXG4gICAgc3RhdGljIGdldFNldHRpbmdzVXJpQW5kVGFyZ2V0KHJlc291cmNlKSB7XG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZUZvbGRlciA9IHJlc291cmNlID8gdnNjb2RlXzEud29ya3NwYWNlLmdldFdvcmtzcGFjZUZvbGRlcihyZXNvdXJjZSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGxldCB3b3Jrc3BhY2VGb2xkZXJVcmkgPSB3b3Jrc3BhY2VGb2xkZXIgPyB3b3Jrc3BhY2VGb2xkZXIudXJpIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXdvcmtzcGFjZUZvbGRlclVyaSAmJiBBcnJheS5pc0FycmF5KHZzY29kZV8xLndvcmtzcGFjZS53b3Jrc3BhY2VGb2xkZXJzKSAmJiB2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3b3Jrc3BhY2VGb2xkZXJVcmkgPSB2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gd29ya3NwYWNlRm9sZGVyVXJpID8gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2VGb2xkZXIgOiB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0Lkdsb2JhbDtcbiAgICAgICAgcmV0dXJuIHsgdXJpOiB3b3Jrc3BhY2VGb2xkZXJVcmksIHRhcmdldCB9O1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6ZnVuY3Rpb24tbmFtZVxuICAgIHN0YXRpYyBkaXNwb3NlKCkge1xuICAgICAgICBpZiAoIWNvbnN0YW50c18yLmlzVGVzdEV4ZWN1dGlvbigpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Rpc3Bvc2UgY2FuIG9ubHkgYmUgY2FsbGVkIGZyb20gdW5pdCB0ZXN0cycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby12b2lkLWV4cHJlc3Npb25cbiAgICAgICAgUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MuZm9yRWFjaChpdGVtID0+IGl0ZW0uZGlzcG9zZSgpKTtcbiAgICAgICAgUHl0aG9uU2V0dGluZ3MucHl0aG9uU2V0dGluZ3MuY2xlYXIoKTtcbiAgICB9XG4gICAgZGlzcG9zZSgpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVuc2FmZS1hbnlcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5mb3JFYWNoKGRpc3Bvc2FibGUgPT4gZGlzcG9zYWJsZS5kaXNwb3NlKCkpO1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzID0gW107XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHkgbWF4LWZ1bmMtYm9keS1sZW5ndGhcbiAgICB1cGRhdGUocHl0aG9uU2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3Qgd29ya3NwYWNlUm9vdCA9IHRoaXMud29ya3NwYWNlUm9vdC5mc1BhdGg7XG4gICAgICAgIGNvbnN0IHN5c3RlbVZhcmlhYmxlcyA9IG5ldyBzeXN0ZW1WYXJpYWJsZXNfMS5TeXN0ZW1WYXJpYWJsZXModGhpcy53b3Jrc3BhY2VSb290ID8gdGhpcy53b3Jrc3BhY2VSb290LmZzUGF0aCA6IHVuZGVmaW5lZCk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIHRoaXMucHl0aG9uUGF0aCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgncHl0aG9uUGF0aCcpKTtcbiAgICAgICAgdGhpcy5weXRob25QYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHRoaXMucHl0aG9uUGF0aCwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIHRoaXMudmVudlBhdGggPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3ZlbnZQYXRoJykpO1xuICAgICAgICB0aGlzLnZlbnZGb2xkZXJzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCd2ZW52Rm9sZGVycycpKTtcbiAgICAgICAgY29uc3QgY29uZGFQYXRoID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdjb25kYVBhdGgnKSk7XG4gICAgICAgIHRoaXMuY29uZGFQYXRoID0gY29uZGFQYXRoICYmIGNvbmRhUGF0aC5sZW5ndGggPiAwID8gZ2V0QWJzb2x1dGVQYXRoKGNvbmRhUGF0aCwgd29ya3NwYWNlUm9vdCkgOiBjb25kYVBhdGg7XG4gICAgICAgIHRoaXMuZG93bmxvYWRMYW5ndWFnZVNlcnZlciA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnZG93bmxvYWRMYW5ndWFnZVNlcnZlcicsIHRydWUpKTtcbiAgICAgICAgdGhpcy5qZWRpRW5hYmxlZCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnamVkaUVuYWJsZWQnLCB0cnVlKSk7XG4gICAgICAgIHRoaXMuYXV0b1VwZGF0ZUxhbmd1YWdlU2VydmVyID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdhdXRvVXBkYXRlTGFuZ3VhZ2VTZXJ2ZXInLCB0cnVlKSk7XG4gICAgICAgIGlmICh0aGlzLmplZGlFbmFibGVkKSB7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgdGhpcy5qZWRpUGF0aCA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnamVkaVBhdGgnKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuamVkaVBhdGggPT09ICdzdHJpbmcnICYmIHRoaXMuamVkaVBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuamVkaVBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5qZWRpUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5qZWRpUGF0aCA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5qZWRpTWVtb3J5TGltaXQgPSBweXRob25TZXR0aW5ncy5nZXQoJ2plZGlNZW1vcnlMaW1pdCcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIHRoaXMuZW52RmlsZSA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnZW52RmlsZScpKTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvbiBuby1hbnlcbiAgICAgICAgdGhpcy5kZXZPcHRpb25zID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdkZXZPcHRpb25zJykpO1xuICAgICAgICB0aGlzLmRldk9wdGlvbnMgPSBBcnJheS5pc0FycmF5KHRoaXMuZGV2T3B0aW9ucykgPyB0aGlzLmRldk9wdGlvbnMgOiBbXTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgbGludGluZ1NldHRpbmdzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdsaW50aW5nJykpO1xuICAgICAgICBpZiAodGhpcy5saW50aW5nKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMubGludGluZywgbGludGluZ1NldHRpbmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubGludGluZyA9IGxpbnRpbmdTZXR0aW5ncztcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYmFja2JvbmUtZ2V0LXNldC1vdXRzaWRlLW1vZGVsIG5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBjb25zdCBhbmFseXNpc1NldHRpbmdzID0gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkocHl0aG9uU2V0dGluZ3MuZ2V0KCdhbmFseXNpcycpKTtcbiAgICAgICAgaWYgKHRoaXMuYW5hbHlzaXMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5hbmFseXNpcywgYW5hbHlzaXNTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFuYWx5c2lzID0gYW5hbHlzaXNTZXR0aW5ncztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpc2FibGVJbnN0YWxsYXRpb25DaGVja3MgPSBweXRob25TZXR0aW5ncy5nZXQoJ2Rpc2FibGVJbnN0YWxsYXRpb25DaGVjaycpID09PSB0cnVlO1xuICAgICAgICB0aGlzLmdsb2JhbE1vZHVsZUluc3RhbGxhdGlvbiA9IHB5dGhvblNldHRpbmdzLmdldCgnZ2xvYmFsTW9kdWxlSW5zdGFsbGF0aW9uJykgPT09IHRydWU7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IHNvcnRJbXBvcnRTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnc29ydEltcG9ydHMnKSk7XG4gICAgICAgIGlmICh0aGlzLnNvcnRJbXBvcnRzKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuc29ydEltcG9ydHMsIHNvcnRJbXBvcnRTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNvcnRJbXBvcnRzID0gc29ydEltcG9ydFNldHRpbmdzO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIHRyYXZpcy5cbiAgICAgICAgdGhpcy5zb3J0SW1wb3J0cyA9IHRoaXMuc29ydEltcG9ydHMgPyB0aGlzLnNvcnRJbXBvcnRzIDogeyBwYXRoOiAnJywgYXJnczogW10gfTtcbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgdHJhdmlzLlxuICAgICAgICB0aGlzLmxpbnRpbmcgPSB0aGlzLmxpbnRpbmcgPyB0aGlzLmxpbnRpbmcgOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGlnbm9yZVBhdHRlcm5zOiBbXSxcbiAgICAgICAgICAgIGZsYWtlOEFyZ3M6IFtdLCBmbGFrZThFbmFibGVkOiBmYWxzZSwgZmxha2U4UGF0aDogJ2ZsYWtlJyxcbiAgICAgICAgICAgIGxpbnRPblNhdmU6IGZhbHNlLCBtYXhOdW1iZXJPZlByb2JsZW1zOiAxMDAsXG4gICAgICAgICAgICBteXB5QXJnczogW10sIG15cHlFbmFibGVkOiBmYWxzZSwgbXlweVBhdGg6ICdteXB5JyxcbiAgICAgICAgICAgIGJhbmRpdEFyZ3M6IFtdLCBiYW5kaXRFbmFibGVkOiBmYWxzZSwgYmFuZGl0UGF0aDogJ2JhbmRpdCcsXG4gICAgICAgICAgICBwZXA4QXJnczogW10sIHBlcDhFbmFibGVkOiBmYWxzZSwgcGVwOFBhdGg6ICdwZXA4JyxcbiAgICAgICAgICAgIHB5bGFtYUFyZ3M6IFtdLCBweWxhbWFFbmFibGVkOiBmYWxzZSwgcHlsYW1hUGF0aDogJ3B5bGFtYScsXG4gICAgICAgICAgICBwcm9zcGVjdG9yQXJnczogW10sIHByb3NwZWN0b3JFbmFibGVkOiBmYWxzZSwgcHJvc3BlY3RvclBhdGg6ICdwcm9zcGVjdG9yJyxcbiAgICAgICAgICAgIHB5ZG9jc3R5bGVBcmdzOiBbXSwgcHlkb2NzdHlsZUVuYWJsZWQ6IGZhbHNlLCBweWRvY3N0eWxlUGF0aDogJ3B5ZG9jc3R5bGUnLFxuICAgICAgICAgICAgcHlsaW50QXJnczogW10sIHB5bGludEVuYWJsZWQ6IGZhbHNlLCBweWxpbnRQYXRoOiAncHlsaW50JyxcbiAgICAgICAgICAgIHB5bGludENhdGVnb3J5U2V2ZXJpdHk6IHtcbiAgICAgICAgICAgICAgICBjb252ZW50aW9uOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuSGludCxcbiAgICAgICAgICAgICAgICBlcnJvcjogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yLFxuICAgICAgICAgICAgICAgIGZhdGFsOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IsXG4gICAgICAgICAgICAgICAgcmVmYWN0b3I6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5IaW50LFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGVwOENhdGVnb3J5U2V2ZXJpdHk6IHtcbiAgICAgICAgICAgICAgICBFOiB2c2NvZGVfMS5EaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IsXG4gICAgICAgICAgICAgICAgVzogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5Lldhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmbGFrZThDYXRlZ29yeVNldmVyaXR5OiB7XG4gICAgICAgICAgICAgICAgRTogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yLFxuICAgICAgICAgICAgICAgIFc6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nLFxuICAgICAgICAgICAgICAgIC8vIFBlciBodHRwOi8vZmxha2U4LnB5Y3FhLm9yZy9lbi9sYXRlc3QvZ2xvc3NhcnkuaHRtbCN0ZXJtLWVycm9yLWNvZGVcbiAgICAgICAgICAgICAgICAvLyAnRicgZG9lcyBub3QgbWVhbiAnZmF0YWwgYXMgaW4gUHlMaW50IGJ1dCByYXRoZXIgJ3B5Zmxha2VzJyBzdWNoIGFzXG4gICAgICAgICAgICAgICAgLy8gdW51c2VkIGltcG9ydHMsIHZhcmlhYmxlcywgZXRjLlxuICAgICAgICAgICAgICAgIEY6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbXlweUNhdGVnb3J5U2V2ZXJpdHk6IHtcbiAgICAgICAgICAgICAgICBlcnJvcjogdnNjb2RlXzEuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yLFxuICAgICAgICAgICAgICAgIG5vdGU6IHZzY29kZV8xLkRpYWdub3N0aWNTZXZlcml0eS5IaW50XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHlsaW50VXNlTWluaW1hbENoZWNrZXJzOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmxpbnRpbmcucHlsaW50UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcucHlsaW50UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmxpbnRpbmcuZmxha2U4UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcuZmxha2U4UGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmxpbnRpbmcucGVwOFBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLnBlcDhQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIHRoaXMubGludGluZy5weWxhbWFQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5weWxhbWFQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIHRoaXMubGludGluZy5wcm9zcGVjdG9yUGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLmxpbnRpbmcucHJvc3BlY3RvclBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy5saW50aW5nLnB5ZG9jc3R5bGVQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5weWRvY3N0eWxlUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmxpbnRpbmcubXlweVBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy5saW50aW5nLm15cHlQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIHRoaXMubGludGluZy5iYW5kaXRQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMubGludGluZy5iYW5kaXRQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IGZvcm1hdHRpbmdTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnZm9ybWF0dGluZycpKTtcbiAgICAgICAgaWYgKHRoaXMuZm9ybWF0dGluZykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLmZvcm1hdHRpbmcsIGZvcm1hdHRpbmdTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmZvcm1hdHRpbmcgPSBmb3JtYXR0aW5nU2V0dGluZ3M7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgdHJhdmlzLlxuICAgICAgICB0aGlzLmZvcm1hdHRpbmcgPSB0aGlzLmZvcm1hdHRpbmcgPyB0aGlzLmZvcm1hdHRpbmcgOiB7XG4gICAgICAgICAgICBhdXRvcGVwOEFyZ3M6IFtdLCBhdXRvcGVwOFBhdGg6ICdhdXRvcGVwOCcsXG4gICAgICAgICAgICBwcm92aWRlcjogJ2F1dG9wZXA4JyxcbiAgICAgICAgICAgIGJsYWNrQXJnczogW10sIGJsYWNrUGF0aDogJ2JsYWNrJyxcbiAgICAgICAgICAgIHlhcGZBcmdzOiBbXSwgeWFwZlBhdGg6ICd5YXBmJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmZvcm1hdHRpbmcuYXV0b3BlcDhQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMuZm9ybWF0dGluZy5hdXRvcGVwOFBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy5mb3JtYXR0aW5nLnlhcGZQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMuZm9ybWF0dGluZy55YXBmUGF0aCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLmZvcm1hdHRpbmcuYmxhY2tQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHRoaXMuZm9ybWF0dGluZy5ibGFja1BhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgYXV0b0NvbXBsZXRlU2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ2F1dG9Db21wbGV0ZScpKTtcbiAgICAgICAgaWYgKHRoaXMuYXV0b0NvbXBsZXRlKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuYXV0b0NvbXBsZXRlLCBhdXRvQ29tcGxldGVTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZSA9IGF1dG9Db21wbGV0ZVNldHRpbmdzO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIHRyYXZpcy5cbiAgICAgICAgdGhpcy5hdXRvQ29tcGxldGUgPSB0aGlzLmF1dG9Db21wbGV0ZSA/IHRoaXMuYXV0b0NvbXBsZXRlIDoge1xuICAgICAgICAgICAgZXh0cmFQYXRoczogW10sXG4gICAgICAgICAgICBhZGRCcmFja2V0czogZmFsc2UsXG4gICAgICAgICAgICBzaG93QWR2YW5jZWRNZW1iZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIHR5cGVzaGVkUGF0aHM6IFtdXG4gICAgICAgIH07XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZVN5bWJvbHNTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnd29ya3NwYWNlU3ltYm9scycpKTtcbiAgICAgICAgaWYgKHRoaXMud29ya3NwYWNlU3ltYm9scykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLndvcmtzcGFjZVN5bWJvbHMsIHdvcmtzcGFjZVN5bWJvbHNTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLndvcmtzcGFjZVN5bWJvbHMgPSB3b3Jrc3BhY2VTeW1ib2xzU2V0dGluZ3M7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgdHJhdmlzLlxuICAgICAgICB0aGlzLndvcmtzcGFjZVN5bWJvbHMgPSB0aGlzLndvcmtzcGFjZVN5bWJvbHMgPyB0aGlzLndvcmtzcGFjZVN5bWJvbHMgOiB7XG4gICAgICAgICAgICBjdGFnc1BhdGg6ICdjdGFncycsXG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgZXhjbHVzaW9uUGF0dGVybnM6IFtdLFxuICAgICAgICAgICAgcmVidWlsZE9uRmlsZVNhdmU6IHRydWUsXG4gICAgICAgICAgICByZWJ1aWxkT25TdGFydDogdHJ1ZSxcbiAgICAgICAgICAgIHRhZ0ZpbGVQYXRoOiBwYXRoLmpvaW4od29ya3NwYWNlUm9vdCwgJ3RhZ3MnKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLndvcmtzcGFjZVN5bWJvbHMudGFnRmlsZVBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy53b3Jrc3BhY2VTeW1ib2xzLnRhZ0ZpbGVQYXRoKSwgd29ya3NwYWNlUm9vdCk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iYWNrYm9uZS1nZXQtc2V0LW91dHNpZGUtbW9kZWwgbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IHVuaXRUZXN0U2V0dGluZ3MgPSBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShweXRob25TZXR0aW5ncy5nZXQoJ3VuaXRUZXN0JykpO1xuICAgICAgICBpZiAodGhpcy51bml0VGVzdCkge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnVuaXRUZXN0LCB1bml0VGVzdFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudW5pdFRlc3QgPSB1bml0VGVzdFNldHRpbmdzO1xuICAgICAgICAgICAgaWYgKGNvbnN0YW50c18yLmlzVGVzdEV4ZWN1dGlvbigpICYmICF0aGlzLnVuaXRUZXN0KSB7XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOnByZWZlci10eXBlLWNhc3RcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tb2JqZWN0LWxpdGVyYWwtdHlwZS1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICB0aGlzLnVuaXRUZXN0ID0ge1xuICAgICAgICAgICAgICAgICAgICBub3NldGVzdEFyZ3M6IFtdLCBweVRlc3RBcmdzOiBbXSwgdW5pdHRlc3RBcmdzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0VG9Db25maWd1cmU6IHRydWUsIGRlYnVnUG9ydDogMzAwMCxcbiAgICAgICAgICAgICAgICAgICAgbm9zZXRlc3RzRW5hYmxlZDogZmFsc2UsIHB5VGVzdEVuYWJsZWQ6IGZhbHNlLCB1bml0dGVzdEVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBub3NldGVzdFBhdGg6ICdub3NldGVzdHMnLCBweVRlc3RQYXRoOiAncHl0ZXN0JywgYXV0b1Rlc3REaXNjb3Zlck9uU2F2ZUVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIHRyYXZpcy5cbiAgICAgICAgdGhpcy51bml0VGVzdCA9IHRoaXMudW5pdFRlc3QgPyB0aGlzLnVuaXRUZXN0IDoge1xuICAgICAgICAgICAgcHJvbXB0VG9Db25maWd1cmU6IHRydWUsXG4gICAgICAgICAgICBkZWJ1Z1BvcnQ6IDMwMDAsXG4gICAgICAgICAgICBub3NldGVzdEFyZ3M6IFtdLCBub3NldGVzdFBhdGg6ICdub3NldGVzdCcsIG5vc2V0ZXN0c0VuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcHlUZXN0QXJnczogW10sIHB5VGVzdEVuYWJsZWQ6IGZhbHNlLCBweVRlc3RQYXRoOiAncHl0ZXN0JyxcbiAgICAgICAgICAgIHVuaXR0ZXN0QXJnczogW10sIHVuaXR0ZXN0RW5hYmxlZDogZmFsc2UsIGF1dG9UZXN0RGlzY292ZXJPblNhdmVFbmFibGVkOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMudW5pdFRlc3QucHlUZXN0UGF0aCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLnVuaXRUZXN0LnB5VGVzdFBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgdGhpcy51bml0VGVzdC5ub3NldGVzdFBhdGggPSBnZXRBYnNvbHV0ZVBhdGgoc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkodGhpcy51bml0VGVzdC5ub3NldGVzdFBhdGgpLCB3b3Jrc3BhY2VSb290KTtcbiAgICAgICAgaWYgKHRoaXMudW5pdFRlc3QuY3dkKSB7XG4gICAgICAgICAgICB0aGlzLnVuaXRUZXN0LmN3ZCA9IGdldEFic29sdXRlUGF0aChzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueSh0aGlzLnVuaXRUZXN0LmN3ZCksIHdvcmtzcGFjZVJvb3QpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlc29sdmUgYW55IHZhcmlhYmxlcyBmb3VuZCBpbiB0aGUgdGVzdCBhcmd1bWVudHMuXG4gICAgICAgIHRoaXMudW5pdFRlc3Qubm9zZXRlc3RBcmdzID0gdGhpcy51bml0VGVzdC5ub3NldGVzdEFyZ3MubWFwKGFyZyA9PiBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShhcmcpKTtcbiAgICAgICAgdGhpcy51bml0VGVzdC5weVRlc3RBcmdzID0gdGhpcy51bml0VGVzdC5weVRlc3RBcmdzLm1hcChhcmcgPT4gc3lzdGVtVmFyaWFibGVzLnJlc29sdmVBbnkoYXJnKSk7XG4gICAgICAgIHRoaXMudW5pdFRlc3QudW5pdHRlc3RBcmdzID0gdGhpcy51bml0VGVzdC51bml0dGVzdEFyZ3MubWFwKGFyZyA9PiBzeXN0ZW1WYXJpYWJsZXMucmVzb2x2ZUFueShhcmcpKTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJhY2tib25lLWdldC1zZXQtb3V0c2lkZS1tb2RlbCBuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgdGVybWluYWxTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgndGVybWluYWwnKSk7XG4gICAgICAgIGlmICh0aGlzLnRlcm1pbmFsKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMudGVybWluYWwsIHRlcm1pbmFsU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50ZXJtaW5hbCA9IHRlcm1pbmFsU2V0dGluZ3M7XG4gICAgICAgICAgICBpZiAoY29uc3RhbnRzXzIuaXNUZXN0RXhlY3V0aW9uKCkgJiYgIXRoaXMudGVybWluYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6cHJlZmVyLXR5cGUtY2FzdFxuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1vYmplY3QtbGl0ZXJhbC10eXBlLWFzc2VydGlvblxuICAgICAgICAgICAgICAgIHRoaXMudGVybWluYWwgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTdXBwb3J0IGZvciB0cmF2aXMuXG4gICAgICAgIHRoaXMudGVybWluYWwgPSB0aGlzLnRlcm1pbmFsID8gdGhpcy50ZXJtaW5hbCA6IHtcbiAgICAgICAgICAgIGV4ZWN1dGVJbkZpbGVEaXI6IHRydWUsXG4gICAgICAgICAgICBsYXVuY2hBcmdzOiBbXSxcbiAgICAgICAgICAgIGFjdGl2YXRlRW52aXJvbm1lbnQ6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZGF0YVNjaWVuY2VTZXR0aW5ncyA9IHN5c3RlbVZhcmlhYmxlcy5yZXNvbHZlQW55KHB5dGhvblNldHRpbmdzLmdldCgnZGF0YVNjaWVuY2UnKSk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFzY2llbmNlKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuZGF0YXNjaWVuY2UsIGRhdGFTY2llbmNlU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kYXRhc2NpZW5jZSA9IGRhdGFTY2llbmNlU2V0dGluZ3M7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IHB5dGhvblBhdGgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9weXRob25QYXRoO1xuICAgIH1cbiAgICBzZXQgcHl0aG9uUGF0aCh2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5fcHl0aG9uUGF0aCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3Igc3BlY2lmeWluZyBqdXN0IHRoZSBkaXJlY3Rvcnkgd2hlcmUgdGhlIHB5dGhvbiBleGVjdXRhYmxlIHdpbGwgYmUgbG9jYXRlZC5cbiAgICAgICAgLy8gRS5nLiB2aXJ0dWFsIGRpcmVjdG9yeSBuYW1lLlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fcHl0aG9uUGF0aCA9IGdldFB5dGhvbkV4ZWN1dGFibGUodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgdGhpcy5fcHl0aG9uUGF0aCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMucHVzaCh2c2NvZGVfMS53b3Jrc3BhY2Uub25EaWRDaGFuZ2VDb25maWd1cmF0aW9uKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb25maWcgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbigncHl0aG9uJywgdGhpcy53b3Jrc3BhY2VSb290KTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKGN1cnJlbnRDb25maWcpO1xuICAgICAgICAgICAgLy8gSWYgd29ya3NwYWNlIGNvbmZpZyBjaGFuZ2VzLCB0aGVuIHdlIGNvdWxkIGhhdmUgYSBjYXNjYWRpbmcgZWZmZWN0IG9mIG9uIGNoYW5nZSBldmVudHMuXG4gICAgICAgICAgICAvLyBMZXQncyBkZWZlciB0aGUgY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5lbWl0KCdjaGFuZ2UnKSwgMSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgY29uc3QgaW5pdGlhbENvbmZpZyA9IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdweXRob24nLCB0aGlzLndvcmtzcGFjZVJvb3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShpbml0aWFsQ29uZmlnKTtcbiAgICB9XG59XG5QeXRob25TZXR0aW5ncy5weXRob25TZXR0aW5ncyA9IG5ldyBNYXAoKTtcbmV4cG9ydHMuUHl0aG9uU2V0dGluZ3MgPSBQeXRob25TZXR0aW5ncztcbmZ1bmN0aW9uIGdldEFic29sdXRlUGF0aChwYXRoVG9DaGVjaywgcm9vdERpcikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpwcmVmZXItdHlwZS1jYXN0IG5vLXVuc2FmZS1hbnlcbiAgICBwYXRoVG9DaGVjayA9IHVudGlsZGlmeShwYXRoVG9DaGVjayk7XG4gICAgaWYgKGNvbnN0YW50c18yLmlzVGVzdEV4ZWN1dGlvbigpICYmICFwYXRoVG9DaGVjaykge1xuICAgICAgICByZXR1cm4gcm9vdERpcjtcbiAgICB9XG4gICAgaWYgKHBhdGhUb0NoZWNrLmluZGV4T2YocGF0aC5zZXApID09PSAtMSkge1xuICAgICAgICByZXR1cm4gcGF0aFRvQ2hlY2s7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmlzQWJzb2x1dGUocGF0aFRvQ2hlY2spID8gcGF0aFRvQ2hlY2sgOiBwYXRoLnJlc29sdmUocm9vdERpciwgcGF0aFRvQ2hlY2spO1xufVxuZnVuY3Rpb24gZ2V0UHl0aG9uRXhlY3V0YWJsZShweXRob25QYXRoKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOnByZWZlci10eXBlLWNhc3Qgbm8tdW5zYWZlLWFueVxuICAgIHB5dGhvblBhdGggPSB1bnRpbGRpZnkocHl0aG9uUGF0aCk7XG4gICAgLy8gSWYgb25seSAncHl0aG9uJy5cbiAgICBpZiAocHl0aG9uUGF0aCA9PT0gJ3B5dGhvbicgfHxcbiAgICAgICAgcHl0aG9uUGF0aC5pbmRleE9mKHBhdGguc2VwKSA9PT0gLTEgfHxcbiAgICAgICAgcGF0aC5iYXNlbmFtZShweXRob25QYXRoKSA9PT0gcGF0aC5kaXJuYW1lKHB5dGhvblBhdGgpKSB7XG4gICAgICAgIHJldHVybiBweXRob25QYXRoO1xuICAgIH1cbiAgICBpZiAoaXNWYWxpZFB5dGhvblBhdGgocHl0aG9uUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHB5dGhvblBhdGg7XG4gICAgfVxuICAgIC8vIEtlZXAgcHl0aG9uIHJpZ2h0IG9uIHRvcCwgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTp2YXJpYWJsZS1uYW1lXG4gICAgY29uc3QgS25vd25QeXRob25FeGVjdXRhYmxlcyA9IFsncHl0aG9uJywgJ3B5dGhvbjQnLCAncHl0aG9uMy42JywgJ3B5dGhvbjMuNScsICdweXRob24zJywgJ3B5dGhvbjIuNycsICdweXRob24yJ107XG4gICAgZm9yIChsZXQgZXhlY3V0YWJsZU5hbWUgb2YgS25vd25QeXRob25FeGVjdXRhYmxlcykge1xuICAgICAgICAvLyBTdWZmaXggd2l0aCAncHl0aG9uJyBmb3IgbGludXggYW5kICdvc3gnLCBhbmQgJ3B5dGhvbi5leGUnIGZvciAnd2luZG93cycuXG4gICAgICAgIGlmIChleHBvcnRzLklTX1dJTkRPV1MpIHtcbiAgICAgICAgICAgIGV4ZWN1dGFibGVOYW1lID0gYCR7ZXhlY3V0YWJsZU5hbWV9LmV4ZWA7XG4gICAgICAgICAgICBpZiAoaXNWYWxpZFB5dGhvblBhdGgocGF0aC5qb2luKHB5dGhvblBhdGgsIGV4ZWN1dGFibGVOYW1lKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKHB5dGhvblBhdGgsIGV4ZWN1dGFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ZhbGlkUHl0aG9uUGF0aChwYXRoLmpvaW4ocHl0aG9uUGF0aCwgJ3NjcmlwdHMnLCBleGVjdXRhYmxlTmFtZSkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihweXRob25QYXRoLCAnc2NyaXB0cycsIGV4ZWN1dGFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc1ZhbGlkUHl0aG9uUGF0aChwYXRoLmpvaW4ocHl0aG9uUGF0aCwgZXhlY3V0YWJsZU5hbWUpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmpvaW4ocHl0aG9uUGF0aCwgZXhlY3V0YWJsZU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzVmFsaWRQeXRob25QYXRoKHBhdGguam9pbihweXRob25QYXRoLCAnYmluJywgZXhlY3V0YWJsZU5hbWUpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmpvaW4ocHl0aG9uUGF0aCwgJ2JpbicsIGV4ZWN1dGFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHl0aG9uUGF0aDtcbn1cbmZ1bmN0aW9uIGlzVmFsaWRQeXRob25QYXRoKHB5dGhvblBhdGgpIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBjaGlsZF9wcm9jZXNzLmV4ZWNGaWxlU3luYyhweXRob25QYXRoLCBbJy1jJywgJ3ByaW50KDEyMzQpJ10sIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KTtcbiAgICAgICAgcmV0dXJuIG91dHB1dC5zdGFydHNXaXRoKCcxMjM0Jyk7XG4gICAgfVxuICAgIGNhdGNoIChleCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uZmlnU2V0dGluZ3MuanMubWFwIl19