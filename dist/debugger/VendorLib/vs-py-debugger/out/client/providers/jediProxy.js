"use strict"; // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

var __decorate = void 0 && (void 0).__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
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

const fs = require("fs-extra");

const path = require("path");

const pidusage = require("pidusage");

const vscode_1 = require("vscode");

const configSettings_1 = require("../common/configSettings");

const constants_1 = require("../common/constants");

require("../common/extensions");

const types_1 = require("../common/process/types");

const types_2 = require("../common/types");

const async_1 = require("../common/utils/async");

const decorators_1 = require("../common/utils/decorators");

const stopWatch_1 = require("../common/utils/stopWatch");

const types_3 = require("../common/variables/types");

const logger_1 = require("./../common/logger");

const IS_WINDOWS = /^win/.test(process.platform);
const pythonVSCodeTypeMappings = new Map();
pythonVSCodeTypeMappings.set('none', vscode_1.CompletionItemKind.Value);
pythonVSCodeTypeMappings.set('type', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('tuple', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('dict', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('dictionary', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('function', vscode_1.CompletionItemKind.Function);
pythonVSCodeTypeMappings.set('lambda', vscode_1.CompletionItemKind.Function);
pythonVSCodeTypeMappings.set('generator', vscode_1.CompletionItemKind.Function);
pythonVSCodeTypeMappings.set('class', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('instance', vscode_1.CompletionItemKind.Reference);
pythonVSCodeTypeMappings.set('method', vscode_1.CompletionItemKind.Method);
pythonVSCodeTypeMappings.set('builtin', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('builtinfunction', vscode_1.CompletionItemKind.Function);
pythonVSCodeTypeMappings.set('module', vscode_1.CompletionItemKind.Module);
pythonVSCodeTypeMappings.set('file', vscode_1.CompletionItemKind.File);
pythonVSCodeTypeMappings.set('xrange', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('slice', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('traceback', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('frame', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('buffer', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('dictproxy', vscode_1.CompletionItemKind.Class);
pythonVSCodeTypeMappings.set('funcdef', vscode_1.CompletionItemKind.Function);
pythonVSCodeTypeMappings.set('property', vscode_1.CompletionItemKind.Property);
pythonVSCodeTypeMappings.set('import', vscode_1.CompletionItemKind.Module);
pythonVSCodeTypeMappings.set('keyword', vscode_1.CompletionItemKind.Keyword);
pythonVSCodeTypeMappings.set('constant', vscode_1.CompletionItemKind.Variable);
pythonVSCodeTypeMappings.set('variable', vscode_1.CompletionItemKind.Variable);
pythonVSCodeTypeMappings.set('value', vscode_1.CompletionItemKind.Value);
pythonVSCodeTypeMappings.set('param', vscode_1.CompletionItemKind.Variable);
pythonVSCodeTypeMappings.set('statement', vscode_1.CompletionItemKind.Keyword);
const pythonVSCodeSymbolMappings = new Map();
pythonVSCodeSymbolMappings.set('none', vscode_1.SymbolKind.Variable);
pythonVSCodeSymbolMappings.set('type', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('tuple', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('dict', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('dictionary', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('function', vscode_1.SymbolKind.Function);
pythonVSCodeSymbolMappings.set('lambda', vscode_1.SymbolKind.Function);
pythonVSCodeSymbolMappings.set('generator', vscode_1.SymbolKind.Function);
pythonVSCodeSymbolMappings.set('class', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('instance', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('method', vscode_1.SymbolKind.Method);
pythonVSCodeSymbolMappings.set('builtin', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('builtinfunction', vscode_1.SymbolKind.Function);
pythonVSCodeSymbolMappings.set('module', vscode_1.SymbolKind.Module);
pythonVSCodeSymbolMappings.set('file', vscode_1.SymbolKind.File);
pythonVSCodeSymbolMappings.set('xrange', vscode_1.SymbolKind.Array);
pythonVSCodeSymbolMappings.set('slice', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('traceback', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('frame', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('buffer', vscode_1.SymbolKind.Array);
pythonVSCodeSymbolMappings.set('dictproxy', vscode_1.SymbolKind.Class);
pythonVSCodeSymbolMappings.set('funcdef', vscode_1.SymbolKind.Function);
pythonVSCodeSymbolMappings.set('property', vscode_1.SymbolKind.Property);
pythonVSCodeSymbolMappings.set('import', vscode_1.SymbolKind.Module);
pythonVSCodeSymbolMappings.set('keyword', vscode_1.SymbolKind.Variable);
pythonVSCodeSymbolMappings.set('constant', vscode_1.SymbolKind.Constant);
pythonVSCodeSymbolMappings.set('variable', vscode_1.SymbolKind.Variable);
pythonVSCodeSymbolMappings.set('value', vscode_1.SymbolKind.Variable);
pythonVSCodeSymbolMappings.set('param', vscode_1.SymbolKind.Variable);
pythonVSCodeSymbolMappings.set('statement', vscode_1.SymbolKind.Variable);
pythonVSCodeSymbolMappings.set('boolean', vscode_1.SymbolKind.Boolean);
pythonVSCodeSymbolMappings.set('int', vscode_1.SymbolKind.Number);
pythonVSCodeSymbolMappings.set('longlean', vscode_1.SymbolKind.Number);
pythonVSCodeSymbolMappings.set('float', vscode_1.SymbolKind.Number);
pythonVSCodeSymbolMappings.set('complex', vscode_1.SymbolKind.Number);
pythonVSCodeSymbolMappings.set('string', vscode_1.SymbolKind.String);
pythonVSCodeSymbolMappings.set('unicode', vscode_1.SymbolKind.String);
pythonVSCodeSymbolMappings.set('list', vscode_1.SymbolKind.Array);

function getMappedVSCodeType(pythonType) {
  if (pythonVSCodeTypeMappings.has(pythonType)) {
    const value = pythonVSCodeTypeMappings.get(pythonType);

    if (value) {
      return value;
    }
  }

  return vscode_1.CompletionItemKind.Keyword;
}

function getMappedVSCodeSymbol(pythonType) {
  if (pythonVSCodeSymbolMappings.has(pythonType)) {
    const value = pythonVSCodeSymbolMappings.get(pythonType);

    if (value) {
      return value;
    }
  }

  return vscode_1.SymbolKind.Variable;
}

var CommandType;

(function (CommandType) {
  CommandType[CommandType["Arguments"] = 0] = "Arguments";
  CommandType[CommandType["Completions"] = 1] = "Completions";
  CommandType[CommandType["Hover"] = 2] = "Hover";
  CommandType[CommandType["Usages"] = 3] = "Usages";
  CommandType[CommandType["Definitions"] = 4] = "Definitions";
  CommandType[CommandType["Symbols"] = 5] = "Symbols";
})(CommandType = exports.CommandType || (exports.CommandType = {}));

const commandNames = new Map();
commandNames.set(CommandType.Arguments, 'arguments');
commandNames.set(CommandType.Completions, 'completions');
commandNames.set(CommandType.Definitions, 'definitions');
commandNames.set(CommandType.Hover, 'tooltip');
commandNames.set(CommandType.Usages, 'usages');
commandNames.set(CommandType.Symbols, 'names');

class JediProxy {
  constructor(extensionRootDir, workspacePath, serviceContainer) {
    this.extensionRootDir = extensionRootDir;
    this.serviceContainer = serviceContainer;
    this.cmdId = 0;
    this.previousData = '';
    this.commands = new Map();
    this.commandQueue = [];
    this.spawnRetryAttempts = 0;
    this.additionalAutoCompletePaths = [];
    this.ignoreJediMemoryFootprint = false;
    this.pidUsageFailures = {
      timer: new stopWatch_1.StopWatch(),
      counter: 0
    };
    this.workspacePath = workspacePath;
    this.pythonSettings = configSettings_1.PythonSettings.getInstance(vscode_1.Uri.file(workspacePath));
    this.lastKnownPythonInterpreter = this.pythonSettings.pythonPath;
    this.logger = serviceContainer.get(types_2.ILogger);
    this.pythonSettings.on('change', () => this.pythonSettingsChangeHandler());
    this.initialized = async_1.createDeferred();
    this.startLanguageServer().then(() => this.initialized.resolve()).ignoreErrors();
    this.proposeNewLanguageServerPopup = serviceContainer.get(types_2.IPythonExtensionBanner, types_2.BANNER_NAME_PROPOSE_LS);
    this.checkJediMemoryFootprint().ignoreErrors();
  }

  static getProperty(o, name) {
    return o[name];
  }

  dispose() {
    this.killProcess();
  }

  getNextCommandId() {
    const result = this.cmdId;
    this.cmdId += 1;
    return result;
  }

  sendCommand(cmd) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.initialized.promise;
      yield this.languageServerStarted.promise;

      if (!this.proc) {
        return Promise.reject(new Error('Python proc not initialized'));
      }

      const executionCmd = cmd;
      const payload = this.createPayload(executionCmd);
      executionCmd.deferred = async_1.createDeferred();

      try {
        this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
        this.commands.set(executionCmd.id, executionCmd);
        this.commandQueue.push(executionCmd.id);
      } catch (ex) {
        console.error(ex); //If 'This socket is closed.' that means process didn't start at all (at least not properly).

        if (ex.message === 'This socket is closed.') {
          this.killProcess();
        } else {
          this.handleError('sendCommand', ex.message);
        }

        return Promise.reject(ex);
      }

      return executionCmd.deferred.promise;
    });
  } // keep track of the directory so we can re-spawn the process.


  initialize() {
    return this.spawnProcess(path.join(this.extensionRootDir, 'pythonFiles')).catch(ex => {
      if (this.languageServerStarted) {
        this.languageServerStarted.reject(ex);
      }

      this.handleError('spawnProcess', ex);
    });
  }

  shouldCheckJediMemoryFootprint() {
    if (this.ignoreJediMemoryFootprint || this.pythonSettings.jediMemoryLimit === -1) {
      return false;
    }

    if (this.lastCmdIdProcessedForPidUsage && this.lastCmdIdProcessed && this.lastCmdIdProcessedForPidUsage === this.lastCmdIdProcessed) {
      // If no more commands were processed since the last time,
      //  then there's no need to check again.
      return false;
    }

    return true;
  }

  checkJediMemoryFootprint() {
    return __awaiter(this, void 0, void 0, function* () {
      // Check memory footprint periodically. Do not check on every request due to
      // the performance impact. See https://github.com/soyuka/pidusage - on Windows
      // it is using wmic which means spawning cmd.exe process on every request.
      if (this.pythonSettings.jediMemoryLimit === -1) {
        return;
      }

      yield this.checkJediMemoryFootprintImpl();
      setTimeout(() => this.checkJediMemoryFootprint(), 15 * 1000);
    });
  }

  checkJediMemoryFootprintImpl() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.proc || this.proc.killed) {
        return;
      }

      if (!this.shouldCheckJediMemoryFootprint()) {
        return;
      }

      this.lastCmdIdProcessedForPidUsage = this.lastCmdIdProcessed; // Do not run pidusage over and over, wait for it to finish.

      const deferred = async_1.createDeferred();
      pidusage.stat(this.proc.pid, (err, result) => __awaiter(this, void 0, void 0, function* () {
        if (err) {
          this.pidUsageFailures.counter += 1; // If this function fails 2 times in the last 60 seconds, lets not try ever again.

          if (this.pidUsageFailures.timer.elapsedTime > 60 * 1000) {
            this.ignoreJediMemoryFootprint = this.pidUsageFailures.counter > 2;
            this.pidUsageFailures.counter = 0;
            this.pidUsageFailures.timer.reset();
          }

          console.error('Python Extension: (pidusage)', err);
        } else {
          const limit = Math.min(Math.max(this.pythonSettings.jediMemoryLimit, 1024), 8192);

          if (result && result.memory > limit * 1024 * 1024) {
            this.logger.logWarning(`IntelliSense process memory consumption exceeded limit of ${limit} MB and process will be restarted.\nThe limit is controlled by the 'python.jediMemoryLimit' setting.`);
            yield this.restartLanguageServer();
          }
        }

        deferred.resolve();
      }));
      return deferred.promise;
    });
  }

  pythonSettingsChangeHandler() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.lastKnownPythonInterpreter === this.pythonSettings.pythonPath) {
        return;
      }

      this.lastKnownPythonInterpreter = this.pythonSettings.pythonPath;
      this.additionalAutoCompletePaths = yield this.buildAutoCompletePaths();
      this.restartLanguageServer().ignoreErrors();
    });
  }

  environmentVariablesChangeHandler() {
    return __awaiter(this, void 0, void 0, function* () {
      const newAutoComletePaths = yield this.buildAutoCompletePaths();

      if (this.additionalAutoCompletePaths.join(',') !== newAutoComletePaths.join(',')) {
        this.additionalAutoCompletePaths = newAutoComletePaths;
        this.restartLanguageServer().ignoreErrors();
      }
    });
  }

  startLanguageServer() {
    return __awaiter(this, void 0, void 0, function* () {
      const newAutoComletePaths = yield this.buildAutoCompletePaths();
      this.additionalAutoCompletePaths = newAutoComletePaths;

      if (!constants_1.isTestExecution()) {
        yield this.proposeNewLanguageServerPopup.showBanner();
      }

      return this.restartLanguageServer();
    });
  }

  restartLanguageServer() {
    this.killProcess();
    this.clearPendingRequests();
    return this.initialize();
  }

  clearPendingRequests() {
    this.commandQueue = [];
    this.commands.forEach(item => {
      if (item.deferred !== undefined) {
        item.deferred.resolve();
      }
    });
    this.commands.clear();
  }

  killProcess() {
    try {
      if (this.proc) {
        this.proc.kill();
      } // tslint:disable-next-line:no-empty

    } catch (ex) {}

    this.proc = undefined;
  }

  handleError(source, errorMessage) {
    logger_1.Logger.error(`${source} jediProxy`, `Error (${source}) ${errorMessage}`);
  } // tslint:disable-next-line:max-func-body-length


  spawnProcess(cwd) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.languageServerStarted && !this.languageServerStarted.completed) {
        this.languageServerStarted.reject(new Error('Language Server not started.'));
      }

      this.languageServerStarted = async_1.createDeferred();
      const pythonProcess = yield this.serviceContainer.get(types_1.IPythonExecutionFactory).create({
        resource: vscode_1.Uri.file(this.workspacePath)
      }); // Check if the python path is valid.

      if ((yield pythonProcess.getExecutablePath().catch(() => '')).length === 0) {
        return;
      }

      const args = ['completion.py'];

      if (typeof this.pythonSettings.jediPath === 'string' && this.pythonSettings.jediPath.length > 0) {
        args.push('custom');
        args.push(this.pythonSettings.jediPath);
      }

      const result = pythonProcess.execObservable(args, {
        cwd
      });
      this.proc = result.proc;
      this.languageServerStarted.resolve();
      this.proc.on('end', end => {
        logger_1.Logger.error('spawnProcess.end', `End - ${end}`);
      });
      this.proc.on('error', error => {
        this.handleError('error', `${error}`);
        this.spawnRetryAttempts += 1;

        if (this.spawnRetryAttempts < 10 && error && error.message && error.message.indexOf('This socket has been ended by the other party') >= 0) {
          this.spawnProcess(cwd).catch(ex => {
            if (this.languageServerStarted) {
              this.languageServerStarted.reject(ex);
            }

            this.handleError('spawnProcess', ex);
          });
        }
      });
      result.out.subscribe(output => {
        if (output.source === 'stderr') {
          this.handleError('stderr', output.out);
        } else {
          const data = output.out; // Possible there was an exception in parsing the data returned,
          // so append the data and then parse it.

          const dataStr = this.previousData = `${this.previousData}${data}`; // tslint:disable-next-line:no-any

          let responses;

          try {
            responses = dataStr.splitLines().map(resp => JSON.parse(resp));
            this.previousData = '';
          } catch (ex) {
            // Possible we've only received part of the data, hence don't clear previousData.
            // Don't log errors when we haven't received the entire response.
            if (ex.message.indexOf('Unexpected end of input') === -1 && ex.message.indexOf('Unexpected end of JSON input') === -1 && ex.message.indexOf('Unexpected token') === -1) {
              this.handleError('stdout', ex.message);
            }

            return;
          }

          responses.forEach(response => {
            if (!response) {
              return;
            }

            const responseId = JediProxy.getProperty(response, 'id');

            if (!this.commands.has(responseId)) {
              return;
            }

            const cmd = this.commands.get(responseId);

            if (!cmd) {
              return;
            }

            this.lastCmdIdProcessed = cmd.id;

            if (JediProxy.getProperty(response, 'arguments')) {
              this.commandQueue.splice(this.commandQueue.indexOf(cmd.id), 1);
              return;
            }

            this.commands.delete(responseId);
            const index = this.commandQueue.indexOf(cmd.id);

            if (index) {
              this.commandQueue.splice(index, 1);
            } // Check if this command has expired.


            if (cmd.token.isCancellationRequested) {
              this.safeResolve(cmd, undefined);
              return;
            }

            const handler = this.getCommandHandler(cmd.command);

            if (handler) {
              handler.call(this, cmd, response);
            } // Check if too many pending requests.


            this.checkQueueLength();
          });
        }
      }, error => this.handleError('subscription.error', `${error}`));
    });
  }

  getCommandHandler(command) {
    switch (command) {
      case CommandType.Completions:
        return this.onCompletion;

      case CommandType.Definitions:
        return this.onDefinition;

      case CommandType.Hover:
        return this.onHover;

      case CommandType.Symbols:
        return this.onSymbols;

      case CommandType.Usages:
        return this.onUsages;

      case CommandType.Arguments:
        return this.onArguments;

      default:
        return;
    }
  }

  onCompletion(command, response) {
    let results = JediProxy.getProperty(response, 'results');
    results = Array.isArray(results) ? results : [];
    results.forEach(item => {
      // tslint:disable-next-line:no-any
      const originalType = item.type;
      item.type = getMappedVSCodeType(originalType);
      item.kind = getMappedVSCodeSymbol(originalType);
      item.rawType = getMappedVSCodeType(originalType);
    });
    const completionResult = {
      items: results,
      requestId: command.id
    };
    this.safeResolve(command, completionResult);
  }

  onDefinition(command, response) {
    // tslint:disable-next-line:no-any
    const defs = JediProxy.getProperty(response, 'results');
    const defResult = {
      requestId: command.id,
      definitions: []
    };

    if (defs.length > 0) {
      defResult.definitions = defs.map(def => {
        const originalType = def.type;
        return {
          fileName: def.fileName,
          text: def.text,
          rawType: originalType,
          type: getMappedVSCodeType(originalType),
          kind: getMappedVSCodeSymbol(originalType),
          container: def.container,
          range: {
            startLine: def.range.start_line,
            startColumn: def.range.start_column,
            endLine: def.range.end_line,
            endColumn: def.range.end_column
          }
        };
      });
    }

    this.safeResolve(command, defResult);
  }

  onHover(command, response) {
    // tslint:disable-next-line:no-any
    const defs = JediProxy.getProperty(response, 'results');
    const defResult = {
      requestId: command.id,
      items: defs.map(def => {
        return {
          kind: getMappedVSCodeSymbol(def.type),
          description: def.description,
          signature: def.signature,
          docstring: def.docstring,
          text: def.text
        };
      })
    };
    this.safeResolve(command, defResult);
  }

  onSymbols(command, response) {
    // tslint:disable-next-line:no-any
    let defs = JediProxy.getProperty(response, 'results');
    defs = Array.isArray(defs) ? defs : [];
    const defResults = {
      requestId: command.id,
      definitions: []
    };
    defResults.definitions = defs.map(def => {
      const originalType = def.type;
      return {
        fileName: def.fileName,
        text: def.text,
        rawType: originalType,
        type: getMappedVSCodeType(originalType),
        kind: getMappedVSCodeSymbol(originalType),
        container: def.container,
        range: {
          startLine: def.range.start_line,
          startColumn: def.range.start_column,
          endLine: def.range.end_line,
          endColumn: def.range.end_column
        }
      };
    });
    this.safeResolve(command, defResults);
  }

  onUsages(command, response) {
    // tslint:disable-next-line:no-any
    let defs = JediProxy.getProperty(response, 'results');
    defs = Array.isArray(defs) ? defs : [];
    const refResult = {
      requestId: command.id,
      references: defs.map(item => {
        return {
          columnIndex: item.column,
          fileName: item.fileName,
          lineIndex: item.line - 1,
          moduleName: item.moduleName,
          name: item.name
        };
      })
    };
    this.safeResolve(command, refResult);
  }

  onArguments(command, response) {
    // tslint:disable-next-line:no-any
    const defs = JediProxy.getProperty(response, 'results'); // tslint:disable-next-line:no-object-literal-type-assertion

    this.safeResolve(command, {
      requestId: command.id,
      definitions: defs
    });
  }

  checkQueueLength() {
    if (this.commandQueue.length > 10) {
      const items = this.commandQueue.splice(0, this.commandQueue.length - 10);
      items.forEach(id => {
        if (this.commands.has(id)) {
          const cmd1 = this.commands.get(id);

          try {
            this.safeResolve(cmd1, undefined); // tslint:disable-next-line:no-empty
          } catch (ex) {} finally {
            this.commands.delete(id);
          }
        }
      });
    }
  } // tslint:disable-next-line:no-any


  createPayload(cmd) {
    const payload = {
      id: cmd.id,
      prefix: '',
      lookup: commandNames.get(cmd.command),
      path: cmd.fileName,
      source: cmd.source,
      line: cmd.lineIndex,
      column: cmd.columnIndex,
      config: this.getConfig()
    };

    if (cmd.command === CommandType.Symbols) {
      delete payload.column;
      delete payload.line;
    }

    return payload;
  }

  getPathFromPythonCommand(args) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const pythonProcess = yield this.serviceContainer.get(types_1.IPythonExecutionFactory).create({
          resource: vscode_1.Uri.file(this.workspacePath)
        });
        const result = yield pythonProcess.exec(args, {
          cwd: this.workspacePath
        });
        const lines = result.stdout.trim().splitLines();

        if (lines.length === 0) {
          return '';
        }

        const exists = yield fs.pathExists(lines[0]);
        return exists ? lines[0] : '';
      } catch (_a) {
        return '';
      }
    });
  }

  buildAutoCompletePaths() {
    return __awaiter(this, void 0, void 0, function* () {
      const filePathPromises = [// Sysprefix.
      this.getPathFromPythonCommand(['-c', 'import sys;print(sys.prefix)']).catch(() => ''), // exeucutable path.
      this.getPathFromPythonCommand(['-c', 'import sys;print(sys.executable)']).then(execPath => path.dirname(execPath)).catch(() => ''), // Python specific site packages.
      // On windows we also need the libs path (second item will return c:\xxx\lib\site-packages).
      // This is returned by "from distutils.sysconfig import get_python_lib; print(get_python_lib())".
      this.getPathFromPythonCommand(['-c', 'from distutils.sysconfig import get_python_lib; print(get_python_lib())']).then(libPath => {
        // On windows we also need the libs path (second item will return c:\xxx\lib\site-packages).
        // This is returned by "from distutils.sysconfig import get_python_lib; print(get_python_lib())".
        return IS_WINDOWS && libPath.length > 0 ? path.join(libPath, '..') : libPath;
      }).catch(() => ''), // Python global site packages, as a fallback in case user hasn't installed them in custom environment.
      this.getPathFromPythonCommand(['-m', 'site', '--user-site']).catch(() => '')];

      try {
        const pythonPaths = yield this.getEnvironmentVariablesProvider().getEnvironmentVariables(vscode_1.Uri.file(this.workspacePath)).then(customEnvironmentVars => customEnvironmentVars ? JediProxy.getProperty(customEnvironmentVars, 'PYTHONPATH') : '').then(pythonPath => typeof pythonPath === 'string' && pythonPath.trim().length > 0 ? pythonPath.trim() : '').then(pythonPath => pythonPath.split(path.delimiter).filter(item => item.trim().length > 0));
        const resolvedPaths = pythonPaths.filter(pythonPath => !path.isAbsolute(pythonPath)).map(pythonPath => path.resolve(this.workspacePath, pythonPath));
        const filePaths = yield Promise.all(filePathPromises);
        return filePaths.concat(...pythonPaths, ...resolvedPaths).filter(p => p.length > 0);
      } catch (ex) {
        console.error('Python Extension: jediProxy.filePaths', ex);
        return [];
      }
    });
  }

  getEnvironmentVariablesProvider() {
    if (!this.environmentVariablesProvider) {
      this.environmentVariablesProvider = this.serviceContainer.get(types_3.IEnvironmentVariablesProvider);
      this.environmentVariablesProvider.onDidEnvironmentVariablesChange(this.environmentVariablesChangeHandler.bind(this));
    }

    return this.environmentVariablesProvider;
  }

  getConfig() {
    // Add support for paths relative to workspace.
    const extraPaths = this.pythonSettings.autoComplete ? this.pythonSettings.autoComplete.extraPaths.map(extraPath => {
      if (path.isAbsolute(extraPath)) {
        return extraPath;
      }

      if (typeof this.workspacePath !== 'string') {
        return '';
      }

      return path.join(this.workspacePath, extraPath);
    }) : []; // Always add workspace path into extra paths.

    if (typeof this.workspacePath === 'string') {
      extraPaths.unshift(this.workspacePath);
    }

    const distinctExtraPaths = extraPaths.concat(this.additionalAutoCompletePaths).filter(value => value.length > 0).filter((value, index, self) => self.indexOf(value) === index);
    return {
      extraPaths: distinctExtraPaths,
      useSnippets: false,
      caseInsensitiveCompletion: true,
      showDescriptions: true,
      fuzzyMatcher: true
    };
  }

  safeResolve(command, result) {
    if (command && command.deferred) {
      command.deferred.resolve(result);
    }
  }

}

__decorate([decorators_1.swallowExceptions('JediProxy')], JediProxy.prototype, "pythonSettingsChangeHandler", null);

__decorate([decorators_1.debounce(1500), decorators_1.swallowExceptions('JediProxy')], JediProxy.prototype, "environmentVariablesChangeHandler", null);

__decorate([decorators_1.swallowExceptions('JediProxy')], JediProxy.prototype, "startLanguageServer", null);

exports.JediProxy = JediProxy;

class JediProxyHandler {
  constructor(jediProxy) {
    this.jediProxy = jediProxy;
    this.commandCancellationTokenSources = new Map();
  }

  get JediProxy() {
    return this.jediProxy;
  }

  dispose() {
    if (this.jediProxy) {
      this.jediProxy.dispose();
    }
  }

  sendCommand(cmd, token) {
    const executionCmd = cmd;
    executionCmd.id = executionCmd.id || this.jediProxy.getNextCommandId();

    if (this.commandCancellationTokenSources.has(cmd.command)) {
      const ct = this.commandCancellationTokenSources.get(cmd.command);

      if (ct) {
        ct.cancel();
      }
    }

    const cancellation = new vscode_1.CancellationTokenSource();
    this.commandCancellationTokenSources.set(cmd.command, cancellation);
    executionCmd.token = cancellation.token;
    return this.jediProxy.sendCommand(executionCmd).catch(reason => {
      console.error(reason);
      return undefined;
    });
  }

  sendCommandNonCancellableCommand(cmd, token) {
    const executionCmd = cmd;
    executionCmd.id = executionCmd.id || this.jediProxy.getNextCommandId();

    if (token) {
      executionCmd.token = token;
    }

    return this.jediProxy.sendCommand(executionCmd).catch(reason => {
      console.error(reason);
      return undefined;
    });
  }

}

exports.JediProxyHandler = JediProxyHandler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImplZGlQcm94eS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImZzIiwicmVxdWlyZSIsInBhdGgiLCJwaWR1c2FnZSIsInZzY29kZV8xIiwiY29uZmlnU2V0dGluZ3NfMSIsImNvbnN0YW50c18xIiwidHlwZXNfMSIsInR5cGVzXzIiLCJhc3luY18xIiwiZGVjb3JhdG9yc18xIiwic3RvcFdhdGNoXzEiLCJ0eXBlc18zIiwibG9nZ2VyXzEiLCJJU19XSU5ET1dTIiwidGVzdCIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncyIsIk1hcCIsInNldCIsIkNvbXBsZXRpb25JdGVtS2luZCIsIlZhbHVlIiwiQ2xhc3MiLCJGdW5jdGlvbiIsIlJlZmVyZW5jZSIsIk1ldGhvZCIsIk1vZHVsZSIsIkZpbGUiLCJQcm9wZXJ0eSIsIktleXdvcmQiLCJWYXJpYWJsZSIsInB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzIiwiU3ltYm9sS2luZCIsIkFycmF5IiwiQ29uc3RhbnQiLCJCb29sZWFuIiwiTnVtYmVyIiwiU3RyaW5nIiwiZ2V0TWFwcGVkVlNDb2RlVHlwZSIsInB5dGhvblR5cGUiLCJoYXMiLCJnZXQiLCJnZXRNYXBwZWRWU0NvZGVTeW1ib2wiLCJDb21tYW5kVHlwZSIsImNvbW1hbmROYW1lcyIsIkFyZ3VtZW50cyIsIkNvbXBsZXRpb25zIiwiRGVmaW5pdGlvbnMiLCJIb3ZlciIsIlVzYWdlcyIsIlN5bWJvbHMiLCJKZWRpUHJveHkiLCJjb25zdHJ1Y3RvciIsImV4dGVuc2lvblJvb3REaXIiLCJ3b3Jrc3BhY2VQYXRoIiwic2VydmljZUNvbnRhaW5lciIsImNtZElkIiwicHJldmlvdXNEYXRhIiwiY29tbWFuZHMiLCJjb21tYW5kUXVldWUiLCJzcGF3blJldHJ5QXR0ZW1wdHMiLCJhZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMiLCJpZ25vcmVKZWRpTWVtb3J5Rm9vdHByaW50IiwicGlkVXNhZ2VGYWlsdXJlcyIsInRpbWVyIiwiU3RvcFdhdGNoIiwiY291bnRlciIsInB5dGhvblNldHRpbmdzIiwiUHl0aG9uU2V0dGluZ3MiLCJnZXRJbnN0YW5jZSIsIlVyaSIsImZpbGUiLCJsYXN0S25vd25QeXRob25JbnRlcnByZXRlciIsInB5dGhvblBhdGgiLCJsb2dnZXIiLCJJTG9nZ2VyIiwib24iLCJweXRob25TZXR0aW5nc0NoYW5nZUhhbmRsZXIiLCJpbml0aWFsaXplZCIsImNyZWF0ZURlZmVycmVkIiwic3RhcnRMYW5ndWFnZVNlcnZlciIsImlnbm9yZUVycm9ycyIsInByb3Bvc2VOZXdMYW5ndWFnZVNlcnZlclBvcHVwIiwiSVB5dGhvbkV4dGVuc2lvbkJhbm5lciIsIkJBTk5FUl9OQU1FX1BST1BPU0VfTFMiLCJjaGVja0plZGlNZW1vcnlGb290cHJpbnQiLCJnZXRQcm9wZXJ0eSIsIm8iLCJuYW1lIiwiZGlzcG9zZSIsImtpbGxQcm9jZXNzIiwiZ2V0TmV4dENvbW1hbmRJZCIsInNlbmRDb21tYW5kIiwiY21kIiwicHJvbWlzZSIsImxhbmd1YWdlU2VydmVyU3RhcnRlZCIsInByb2MiLCJFcnJvciIsImV4ZWN1dGlvbkNtZCIsInBheWxvYWQiLCJjcmVhdGVQYXlsb2FkIiwiZGVmZXJyZWQiLCJzdGRpbiIsIndyaXRlIiwiSlNPTiIsInN0cmluZ2lmeSIsImlkIiwicHVzaCIsImV4IiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImhhbmRsZUVycm9yIiwiaW5pdGlhbGl6ZSIsInNwYXduUHJvY2VzcyIsImpvaW4iLCJjYXRjaCIsInNob3VsZENoZWNrSmVkaU1lbW9yeUZvb3RwcmludCIsImplZGlNZW1vcnlMaW1pdCIsImxhc3RDbWRJZFByb2Nlc3NlZEZvclBpZFVzYWdlIiwibGFzdENtZElkUHJvY2Vzc2VkIiwiY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50SW1wbCIsInNldFRpbWVvdXQiLCJraWxsZWQiLCJzdGF0IiwicGlkIiwiZXJyIiwiZWxhcHNlZFRpbWUiLCJyZXNldCIsImxpbWl0IiwiTWF0aCIsIm1pbiIsIm1heCIsIm1lbW9yeSIsImxvZ1dhcm5pbmciLCJyZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIiLCJidWlsZEF1dG9Db21wbGV0ZVBhdGhzIiwiZW52aXJvbm1lbnRWYXJpYWJsZXNDaGFuZ2VIYW5kbGVyIiwibmV3QXV0b0NvbWxldGVQYXRocyIsImlzVGVzdEV4ZWN1dGlvbiIsInNob3dCYW5uZXIiLCJjbGVhclBlbmRpbmdSZXF1ZXN0cyIsImZvckVhY2giLCJpdGVtIiwidW5kZWZpbmVkIiwiY2xlYXIiLCJraWxsIiwic291cmNlIiwiZXJyb3JNZXNzYWdlIiwiTG9nZ2VyIiwiY3dkIiwiY29tcGxldGVkIiwicHl0aG9uUHJvY2VzcyIsIklQeXRob25FeGVjdXRpb25GYWN0b3J5IiwiY3JlYXRlIiwicmVzb3VyY2UiLCJnZXRFeGVjdXRhYmxlUGF0aCIsImFyZ3MiLCJqZWRpUGF0aCIsImV4ZWNPYnNlcnZhYmxlIiwiZW5kIiwiaW5kZXhPZiIsIm91dCIsInN1YnNjcmliZSIsIm91dHB1dCIsImRhdGEiLCJkYXRhU3RyIiwicmVzcG9uc2VzIiwic3BsaXRMaW5lcyIsIm1hcCIsInJlc3AiLCJwYXJzZSIsInJlc3BvbnNlIiwicmVzcG9uc2VJZCIsInNwbGljZSIsImRlbGV0ZSIsImluZGV4IiwidG9rZW4iLCJpc0NhbmNlbGxhdGlvblJlcXVlc3RlZCIsInNhZmVSZXNvbHZlIiwiaGFuZGxlciIsImdldENvbW1hbmRIYW5kbGVyIiwiY29tbWFuZCIsImNhbGwiLCJjaGVja1F1ZXVlTGVuZ3RoIiwib25Db21wbGV0aW9uIiwib25EZWZpbml0aW9uIiwib25Ib3ZlciIsIm9uU3ltYm9scyIsIm9uVXNhZ2VzIiwib25Bcmd1bWVudHMiLCJyZXN1bHRzIiwiaXNBcnJheSIsIm9yaWdpbmFsVHlwZSIsInR5cGUiLCJraW5kIiwicmF3VHlwZSIsImNvbXBsZXRpb25SZXN1bHQiLCJpdGVtcyIsInJlcXVlc3RJZCIsImRlZnMiLCJkZWZSZXN1bHQiLCJkZWZpbml0aW9ucyIsImRlZiIsImZpbGVOYW1lIiwidGV4dCIsImNvbnRhaW5lciIsInJhbmdlIiwic3RhcnRMaW5lIiwic3RhcnRfbGluZSIsInN0YXJ0Q29sdW1uIiwic3RhcnRfY29sdW1uIiwiZW5kTGluZSIsImVuZF9saW5lIiwiZW5kQ29sdW1uIiwiZW5kX2NvbHVtbiIsImRlc2NyaXB0aW9uIiwic2lnbmF0dXJlIiwiZG9jc3RyaW5nIiwiZGVmUmVzdWx0cyIsInJlZlJlc3VsdCIsInJlZmVyZW5jZXMiLCJjb2x1bW5JbmRleCIsImNvbHVtbiIsImxpbmVJbmRleCIsImxpbmUiLCJtb2R1bGVOYW1lIiwiY21kMSIsInByZWZpeCIsImxvb2t1cCIsImNvbmZpZyIsImdldENvbmZpZyIsImdldFBhdGhGcm9tUHl0aG9uQ29tbWFuZCIsImV4ZWMiLCJsaW5lcyIsInN0ZG91dCIsInRyaW0iLCJleGlzdHMiLCJwYXRoRXhpc3RzIiwiX2EiLCJmaWxlUGF0aFByb21pc2VzIiwiZXhlY1BhdGgiLCJkaXJuYW1lIiwibGliUGF0aCIsInB5dGhvblBhdGhzIiwiZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlciIsImdldEVudmlyb25tZW50VmFyaWFibGVzIiwiY3VzdG9tRW52aXJvbm1lbnRWYXJzIiwic3BsaXQiLCJkZWxpbWl0ZXIiLCJmaWx0ZXIiLCJyZXNvbHZlZFBhdGhzIiwiaXNBYnNvbHV0ZSIsImZpbGVQYXRocyIsImFsbCIsImNvbmNhdCIsInAiLCJlbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyIiwiSUVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIiLCJvbkRpZEVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlIiwiYmluZCIsImV4dHJhUGF0aHMiLCJhdXRvQ29tcGxldGUiLCJleHRyYVBhdGgiLCJ1bnNoaWZ0IiwiZGlzdGluY3RFeHRyYVBhdGhzIiwic2VsZiIsInVzZVNuaXBwZXRzIiwiY2FzZUluc2Vuc2l0aXZlQ29tcGxldGlvbiIsInNob3dEZXNjcmlwdGlvbnMiLCJmdXp6eU1hdGNoZXIiLCJzd2FsbG93RXhjZXB0aW9ucyIsInByb3RvdHlwZSIsImRlYm91bmNlIiwiSmVkaVByb3h5SGFuZGxlciIsImplZGlQcm94eSIsImNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMiLCJjdCIsImNhbmNlbCIsImNhbmNlbGxhdGlvbiIsIkNhbmNlbGxhdGlvblRva2VuU291cmNlIiwicmVhc29uIiwic2VuZENvbW1hbmROb25DYW5jZWxsYWJsZUNvbW1hbmQiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8s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OUQ7QUFDQVEsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkosUUFBL0Q7QUFDQUcsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFFBQS9CLEVBQXlDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQk4sTUFBN0Q7QUFDQUssMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFNBQS9CLEVBQTBDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBOUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkUsUUFBL0Q7QUFDQUgsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBL0Q7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBNUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBNUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFdBQS9CLEVBQTRDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBaEU7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFNBQS9CLEVBQTBDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkcsT0FBOUQ7QUFDQUosMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLEtBQS9CLEVBQXNDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFBMUQ7QUFDQUwsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFBL0Q7QUFDQUwsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFB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S0FBSixFQUFXO0FBQ1AvRSxNQUFBQSxZQUFZLENBQUMrRSxLQUFiLEdBQXFCQSxLQUFyQjtBQUNIOztBQUNELFdBQU8sS0FBS2tHLFNBQUwsQ0FBZXZMLFdBQWYsQ0FBMkJNLFlBQTNCLEVBQ0ZrQixLQURFLENBQ0lxSyxNQUFNLElBQUk7QUFDakI1SyxNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYzJLLE1BQWQ7QUFDQSxhQUFPekksU0FBUDtBQUNILEtBSk0sQ0FBUDtBQUtIOztBQTFDa0I7O0FBNEN2QmxKLE9BQU8sQ0FBQ29SLGdCQUFSLEdBQTJCQSxnQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmcy1leHRyYVwiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IHBpZHVzYWdlID0gcmVxdWlyZShcInBpZHVzYWdlXCIpO1xuY29uc3QgdnNjb2RlXzEgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xuY29uc3QgY29uZmlnU2V0dGluZ3NfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vY29uZmlnU2V0dGluZ3NcIik7XG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vY29uc3RhbnRzXCIpO1xucmVxdWlyZShcIi4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vcHJvY2Vzcy90eXBlc1wiKTtcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vY29tbW9uL3R5cGVzXCIpO1xuY29uc3QgYXN5bmNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHMvYXN5bmNcIik7XG5jb25zdCBkZWNvcmF0b3JzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3V0aWxzL2RlY29yYXRvcnNcIik7XG5jb25zdCBzdG9wV2F0Y2hfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHMvc3RvcFdhdGNoXCIpO1xuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuLi9jb21tb24vdmFyaWFibGVzL3R5cGVzXCIpO1xuY29uc3QgbG9nZ2VyXzEgPSByZXF1aXJlKFwiLi8uLi9jb21tb24vbG9nZ2VyXCIpO1xuY29uc3QgSVNfV0lORE9XUyA9IC9ed2luLy50ZXN0KHByb2Nlc3MucGxhdGZvcm0pO1xuY29uc3QgcHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzID0gbmV3IE1hcCgpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnbm9uZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYWx1ZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd0eXBlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3R1cGxlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2RpY3QnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZGljdGlvbmFyeScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdmdW5jdGlvbicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdsYW1iZGEnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuRnVuY3Rpb24pO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZ2VuZXJhdG9yJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2NsYXNzJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2luc3RhbmNlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlJlZmVyZW5jZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdtZXRob2QnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuTWV0aG9kKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2J1aWx0aW4nLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnYnVpbHRpbmZ1bmN0aW9uJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ21vZHVsZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5Nb2R1bGUpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZmlsZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GaWxlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3hyYW5nZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdzbGljZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd0cmFjZWJhY2snLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZnJhbWUnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnYnVmZmVyJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2RpY3Rwcm94eScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdmdW5jZGVmJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3Byb3BlcnR5JywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlByb3BlcnR5KTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2ltcG9ydCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5Nb2R1bGUpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgna2V5d29yZCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5LZXl3b3JkKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2NvbnN0YW50JywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3ZhcmlhYmxlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3ZhbHVlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlZhbHVlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3BhcmFtJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3N0YXRlbWVudCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5LZXl3b3JkKTtcbmNvbnN0IHB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzID0gbmV3IE1hcCgpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdub25lJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3R5cGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgndHVwbGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZGljdCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdkaWN0aW9uYXJ5JywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2Z1bmN0aW9uJywgdnNjb2RlXzEuU3ltYm9sS2luZC5GdW5jdGlvbik7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2xhbWJkYScsIHZzY29kZV8xLlN5bWJvbEtpbmQuRnVuY3Rpb24pO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdnZW5lcmF0b3InLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnY2xhc3MnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnaW5zdGFuY2UnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbWV0aG9kJywgdnNjb2RlXzEuU3ltYm9sS2luZC5NZXRob2QpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdidWlsdGluJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2J1aWx0aW5mdW5jdGlvbicsIHZzY29kZV8xLlN5bWJvbEtpbmQuRnVuY3Rpb24pO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdtb2R1bGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk1vZHVsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2ZpbGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZpbGUpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCd4cmFuZ2UnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkFycmF5KTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnc2xpY2UnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgndHJhY2ViYWNrJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2ZyYW1lJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2J1ZmZlcicsIHZzY29kZV8xLlN5bWJvbEtpbmQuQXJyYXkpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdkaWN0cHJveHknLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZnVuY2RlZicsIHZzY29kZV8xLlN5bWJvbEtpbmQuRnVuY3Rpb24pO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdwcm9wZXJ0eScsIHZzY29kZV8xLlN5bWJvbEtpbmQuUHJvcGVydHkpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdpbXBvcnQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk1vZHVsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2tleXdvcmQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnY29uc3RhbnQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNvbnN0YW50KTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgndmFyaWFibGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgndmFsdWUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgncGFyYW0nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnc3RhdGVtZW50JywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2Jvb2xlYW4nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkJvb2xlYW4pO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdpbnQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk51bWJlcik7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2xvbmdsZWFuJywgdnNjb2RlXzEuU3ltYm9sS2luZC5OdW1iZXIpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdmbG9hdCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuTnVtYmVyKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnY29tcGxleCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuTnVtYmVyKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnc3RyaW5nJywgdnNjb2RlXzEuU3ltYm9sS2luZC5TdHJpbmcpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCd1bmljb2RlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5TdHJpbmcpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdsaXN0JywgdnNjb2RlXzEuU3ltYm9sS2luZC5BcnJheSk7XG5mdW5jdGlvbiBnZXRNYXBwZWRWU0NvZGVUeXBlKHB5dGhvblR5cGUpIHtcbiAgICBpZiAocHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLmhhcyhweXRob25UeXBlKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5nZXQocHl0aG9uVHlwZSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuS2V5d29yZDtcbn1cbmZ1bmN0aW9uIGdldE1hcHBlZFZTQ29kZVN5bWJvbChweXRob25UeXBlKSB7XG4gICAgaWYgKHB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLmhhcyhweXRob25UeXBlKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLmdldChweXRob25UeXBlKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZzY29kZV8xLlN5bWJvbEtpbmQuVmFyaWFibGU7XG59XG52YXIgQ29tbWFuZFR5cGU7XG4oZnVuY3Rpb24gKENvbW1hbmRUeXBlKSB7XG4gICAgQ29tbWFuZFR5cGVbQ29tbWFuZFR5cGVbXCJBcmd1bWVudHNcIl0gPSAwXSA9IFwiQXJndW1lbnRzXCI7XG4gICAgQ29tbWFuZFR5cGVbQ29tbWFuZFR5cGVbXCJDb21wbGV0aW9uc1wiXSA9IDFdID0gXCJDb21wbGV0aW9uc1wiO1xuICAgIENvbW1hbmRUeXBlW0NvbW1hbmRUeXBlW1wiSG92ZXJcIl0gPSAyXSA9IFwiSG92ZXJcIjtcbiAgICBDb21tYW5kVHlwZVtDb21tYW5kVHlwZVtcIlVzYWdlc1wiXSA9IDNdID0gXCJVc2FnZXNcIjtcbiAgICBDb21tYW5kVHlwZVtDb21tYW5kVHlwZVtcIkRlZmluaXRpb25zXCJdID0gNF0gPSBcIkRlZmluaXRpb25zXCI7XG4gICAgQ29tbWFuZFR5cGVbQ29tbWFuZFR5cGVbXCJTeW1ib2xzXCJdID0gNV0gPSBcIlN5bWJvbHNcIjtcbn0pKENvbW1hbmRUeXBlID0gZXhwb3J0cy5Db21tYW5kVHlwZSB8fCAoZXhwb3J0cy5Db21tYW5kVHlwZSA9IHt9KSk7XG5jb25zdCBjb21tYW5kTmFtZXMgPSBuZXcgTWFwKCk7XG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLkFyZ3VtZW50cywgJ2FyZ3VtZW50cycpO1xuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5Db21wbGV0aW9ucywgJ2NvbXBsZXRpb25zJyk7XG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLkRlZmluaXRpb25zLCAnZGVmaW5pdGlvbnMnKTtcbmNvbW1hbmROYW1lcy5zZXQoQ29tbWFuZFR5cGUuSG92ZXIsICd0b29sdGlwJyk7XG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLlVzYWdlcywgJ3VzYWdlcycpO1xuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5TeW1ib2xzLCAnbmFtZXMnKTtcbmNsYXNzIEplZGlQcm94eSB7XG4gICAgY29uc3RydWN0b3IoZXh0ZW5zaW9uUm9vdERpciwgd29ya3NwYWNlUGF0aCwgc2VydmljZUNvbnRhaW5lcikge1xuICAgICAgICB0aGlzLmV4dGVuc2lvblJvb3REaXIgPSBleHRlbnNpb25Sb290RGlyO1xuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIgPSBzZXJ2aWNlQ29udGFpbmVyO1xuICAgICAgICB0aGlzLmNtZElkID0gMDtcbiAgICAgICAgdGhpcy5wcmV2aW91c0RhdGEgPSAnJztcbiAgICAgICAgdGhpcy5jb21tYW5kcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5jb21tYW5kUXVldWUgPSBbXTtcbiAgICAgICAgdGhpcy5zcGF3blJldHJ5QXR0ZW1wdHMgPSAwO1xuICAgICAgICB0aGlzLmFkZGl0aW9uYWxBdXRvQ29tcGxldGVQYXRocyA9IFtdO1xuICAgICAgICB0aGlzLmlnbm9yZUplZGlNZW1vcnlGb290cHJpbnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5waWRVc2FnZUZhaWx1cmVzID0geyB0aW1lcjogbmV3IHN0b3BXYXRjaF8xLlN0b3BXYXRjaCgpLCBjb3VudGVyOiAwIH07XG4gICAgICAgIHRoaXMud29ya3NwYWNlUGF0aCA9IHdvcmtzcGFjZVBhdGg7XG4gICAgICAgIHRoaXMucHl0aG9uU2V0dGluZ3MgPSBjb25maWdTZXR0aW5nc18xLlB5dGhvblNldHRpbmdzLmdldEluc3RhbmNlKHZzY29kZV8xLlVyaS5maWxlKHdvcmtzcGFjZVBhdGgpKTtcbiAgICAgICAgdGhpcy5sYXN0S25vd25QeXRob25JbnRlcnByZXRlciA9IHRoaXMucHl0aG9uU2V0dGluZ3MucHl0aG9uUGF0aDtcbiAgICAgICAgdGhpcy5sb2dnZXIgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklMb2dnZXIpO1xuICAgICAgICB0aGlzLnB5dGhvblNldHRpbmdzLm9uKCdjaGFuZ2UnLCAoKSA9PiB0aGlzLnB5dGhvblNldHRpbmdzQ2hhbmdlSGFuZGxlcigpKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcbiAgICAgICAgdGhpcy5zdGFydExhbmd1YWdlU2VydmVyKCkudGhlbigoKSA9PiB0aGlzLmluaXRpYWxpemVkLnJlc29sdmUoKSkuaWdub3JlRXJyb3JzKCk7XG4gICAgICAgIHRoaXMucHJvcG9zZU5ld0xhbmd1YWdlU2VydmVyUG9wdXAgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklQeXRob25FeHRlbnNpb25CYW5uZXIsIHR5cGVzXzIuQkFOTkVSX05BTUVfUFJPUE9TRV9MUyk7XG4gICAgICAgIHRoaXMuY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50KCkuaWdub3JlRXJyb3JzKCk7XG4gICAgfVxuICAgIHN0YXRpYyBnZXRQcm9wZXJ0eShvLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBvW25hbWVdO1xuICAgIH1cbiAgICBkaXNwb3NlKCkge1xuICAgICAgICB0aGlzLmtpbGxQcm9jZXNzKCk7XG4gICAgfVxuICAgIGdldE5leHRDb21tYW5kSWQoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY21kSWQ7XG4gICAgICAgIHRoaXMuY21kSWQgKz0gMTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgc2VuZENvbW1hbmQoY21kKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICB5aWVsZCB0aGlzLmluaXRpYWxpemVkLnByb21pc2U7XG4gICAgICAgICAgICB5aWVsZCB0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZC5wcm9taXNlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLnByb2MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdQeXRob24gcHJvYyBub3QgaW5pdGlhbGl6ZWQnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBleGVjdXRpb25DbWQgPSBjbWQ7XG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gdGhpcy5jcmVhdGVQYXlsb2FkKGV4ZWN1dGlvbkNtZCk7XG4gICAgICAgICAgICBleGVjdXRpb25DbWQuZGVmZXJyZWQgPSBhc3luY18xLmNyZWF0ZURlZmVycmVkKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvYy5zdGRpbi53cml0ZShgJHtKU09OLnN0cmluZ2lmeShwYXlsb2FkKX1cXG5gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbW1hbmRzLnNldChleGVjdXRpb25DbWQuaWQsIGV4ZWN1dGlvbkNtZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21tYW5kUXVldWUucHVzaChleGVjdXRpb25DbWQuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICAgICAgICAgICAgLy9JZiAnVGhpcyBzb2NrZXQgaXMgY2xvc2VkLicgdGhhdCBtZWFucyBwcm9jZXNzIGRpZG4ndCBzdGFydCBhdCBhbGwgKGF0IGxlYXN0IG5vdCBwcm9wZXJseSkuXG4gICAgICAgICAgICAgICAgaWYgKGV4Lm1lc3NhZ2UgPT09ICdUaGlzIHNvY2tldCBpcyBjbG9zZWQuJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxQcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdzZW5kQ29tbWFuZCcsIGV4Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4ZWN1dGlvbkNtZC5kZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8ga2VlcCB0cmFjayBvZiB0aGUgZGlyZWN0b3J5IHNvIHdlIGNhbiByZS1zcGF3biB0aGUgcHJvY2Vzcy5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zcGF3blByb2Nlc3MocGF0aC5qb2luKHRoaXMuZXh0ZW5zaW9uUm9vdERpciwgJ3B5dGhvbkZpbGVzJykpXG4gICAgICAgICAgICAuY2F0Y2goZXggPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQucmVqZWN0KGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoJ3NwYXduUHJvY2VzcycsIGV4KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNob3VsZENoZWNrSmVkaU1lbW9yeUZvb3RwcmludCgpIHtcbiAgICAgICAgaWYgKHRoaXMuaWdub3JlSmVkaU1lbW9yeUZvb3RwcmludCB8fCB0aGlzLnB5dGhvblNldHRpbmdzLmplZGlNZW1vcnlMaW1pdCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sYXN0Q21kSWRQcm9jZXNzZWRGb3JQaWRVc2FnZSAmJiB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZCAmJlxuICAgICAgICAgICAgdGhpcy5sYXN0Q21kSWRQcm9jZXNzZWRGb3JQaWRVc2FnZSA9PT0gdGhpcy5sYXN0Q21kSWRQcm9jZXNzZWQpIHtcbiAgICAgICAgICAgIC8vIElmIG5vIG1vcmUgY29tbWFuZHMgd2VyZSBwcm9jZXNzZWQgc2luY2UgdGhlIGxhc3QgdGltZSxcbiAgICAgICAgICAgIC8vICB0aGVuIHRoZXJlJ3Mgbm8gbmVlZCB0byBjaGVjayBhZ2Fpbi5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50KCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgbWVtb3J5IGZvb3RwcmludCBwZXJpb2RpY2FsbHkuIERvIG5vdCBjaGVjayBvbiBldmVyeSByZXF1ZXN0IGR1ZSB0b1xuICAgICAgICAgICAgLy8gdGhlIHBlcmZvcm1hbmNlIGltcGFjdC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zb3l1a2EvcGlkdXNhZ2UgLSBvbiBXaW5kb3dzXG4gICAgICAgICAgICAvLyBpdCBpcyB1c2luZyB3bWljIHdoaWNoIG1lYW5zIHNwYXduaW5nIGNtZC5leGUgcHJvY2VzcyBvbiBldmVyeSByZXF1ZXN0LlxuICAgICAgICAgICAgaWYgKHRoaXMucHl0aG9uU2V0dGluZ3MuamVkaU1lbW9yeUxpbWl0ID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHlpZWxkIHRoaXMuY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50SW1wbCgpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmNoZWNrSmVkaU1lbW9yeUZvb3RwcmludCgpLCAxNSAqIDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50SW1wbCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5wcm9jIHx8IHRoaXMucHJvYy5raWxsZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMuc2hvdWxkQ2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50KCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZEZvclBpZFVzYWdlID0gdGhpcy5sYXN0Q21kSWRQcm9jZXNzZWQ7XG4gICAgICAgICAgICAvLyBEbyBub3QgcnVuIHBpZHVzYWdlIG92ZXIgYW5kIG92ZXIsIHdhaXQgZm9yIGl0IHRvIGZpbmlzaC5cbiAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xuICAgICAgICAgICAgcGlkdXNhZ2Uuc3RhdCh0aGlzLnByb2MucGlkLCAoZXJyLCByZXN1bHQpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGlkVXNhZ2VGYWlsdXJlcy5jb3VudGVyICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgZnVuY3Rpb24gZmFpbHMgMiB0aW1lcyBpbiB0aGUgbGFzdCA2MCBzZWNvbmRzLCBsZXRzIG5vdCB0cnkgZXZlciBhZ2Fpbi5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGlkVXNhZ2VGYWlsdXJlcy50aW1lci5lbGFwc2VkVGltZSA+IDYwICogMTAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZ25vcmVKZWRpTWVtb3J5Rm9vdHByaW50ID0gdGhpcy5waWRVc2FnZUZhaWx1cmVzLmNvdW50ZXIgPiAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5waWRVc2FnZUZhaWx1cmVzLmNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5waWRVc2FnZUZhaWx1cmVzLnRpbWVyLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignUHl0aG9uIEV4dGVuc2lvbjogKHBpZHVzYWdlKScsIGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaW1pdCA9IE1hdGgubWluKE1hdGgubWF4KHRoaXMucHl0aG9uU2V0dGluZ3MuamVkaU1lbW9yeUxpbWl0LCAxMDI0KSwgODE5Mik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lbW9yeSA+IGxpbWl0ICogMTAyNCAqIDEwMjQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZ1dhcm5pbmcoYEludGVsbGlTZW5zZSBwcm9jZXNzIG1lbW9yeSBjb25zdW1wdGlvbiBleGNlZWRlZCBsaW1pdCBvZiAke2xpbWl0fSBNQiBhbmQgcHJvY2VzcyB3aWxsIGJlIHJlc3RhcnRlZC5cXG5UaGUgbGltaXQgaXMgY29udHJvbGxlZCBieSB0aGUgJ3B5dGhvbi5qZWRpTWVtb3J5TGltaXQnIHNldHRpbmcuYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcHl0aG9uU2V0dGluZ3NDaGFuZ2VIYW5kbGVyKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFzdEtub3duUHl0aG9uSW50ZXJwcmV0ZXIgPT09IHRoaXMucHl0aG9uU2V0dGluZ3MucHl0aG9uUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubGFzdEtub3duUHl0aG9uSW50ZXJwcmV0ZXIgPSB0aGlzLnB5dGhvblNldHRpbmdzLnB5dGhvblBhdGg7XG4gICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxBdXRvQ29tcGxldGVQYXRocyA9IHlpZWxkIHRoaXMuYnVpbGRBdXRvQ29tcGxldGVQYXRocygpO1xuICAgICAgICAgICAgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlSGFuZGxlcigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0F1dG9Db21sZXRlUGF0aHMgPSB5aWVsZCB0aGlzLmJ1aWxkQXV0b0NvbXBsZXRlUGF0aHMoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZGl0aW9uYWxBdXRvQ29tcGxldGVQYXRocy5qb2luKCcsJykgIT09IG5ld0F1dG9Db21sZXRlUGF0aHMuam9pbignLCcpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMgPSBuZXdBdXRvQ29tbGV0ZVBhdGhzO1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVyKCkuaWdub3JlRXJyb3JzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdGFydExhbmd1YWdlU2VydmVyKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgbmV3QXV0b0NvbWxldGVQYXRocyA9IHlpZWxkIHRoaXMuYnVpbGRBdXRvQ29tcGxldGVQYXRocygpO1xuICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMgPSBuZXdBdXRvQ29tbGV0ZVBhdGhzO1xuICAgICAgICAgICAgaWYgKCFjb25zdGFudHNfMS5pc1Rlc3RFeGVjdXRpb24oKSkge1xuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMucHJvcG9zZU5ld0xhbmd1YWdlU2VydmVyUG9wdXAuc2hvd0Jhbm5lcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKSB7XG4gICAgICAgIHRoaXMua2lsbFByb2Nlc3MoKTtcbiAgICAgICAgdGhpcy5jbGVhclBlbmRpbmdSZXF1ZXN0cygpO1xuICAgICAgICByZXR1cm4gdGhpcy5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIGNsZWFyUGVuZGluZ1JlcXVlc3RzKCkge1xuICAgICAgICB0aGlzLmNvbW1hbmRRdWV1ZSA9IFtdO1xuICAgICAgICB0aGlzLmNvbW1hbmRzLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS5kZWZlcnJlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5kZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNvbW1hbmRzLmNsZWFyKCk7XG4gICAgfVxuICAgIGtpbGxQcm9jZXNzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJvYykge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvYy5raWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXgpIHsgfVxuICAgICAgICB0aGlzLnByb2MgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGhhbmRsZUVycm9yKHNvdXJjZSwgZXJyb3JNZXNzYWdlKSB7XG4gICAgICAgIGxvZ2dlcl8xLkxvZ2dlci5lcnJvcihgJHtzb3VyY2V9IGplZGlQcm94eWAsIGBFcnJvciAoJHtzb3VyY2V9KSAke2Vycm9yTWVzc2FnZX1gKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1mdW5jLWJvZHktbGVuZ3RoXG4gICAgc3Bhd25Qcm9jZXNzKGN3ZCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkICYmICF0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZC5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZC5yZWplY3QobmV3IEVycm9yKCdMYW5ndWFnZSBTZXJ2ZXIgbm90IHN0YXJ0ZWQuJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQgPSBhc3luY18xLmNyZWF0ZURlZmVycmVkKCk7XG4gICAgICAgICAgICBjb25zdCBweXRob25Qcm9jZXNzID0geWllbGQgdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQeXRob25FeGVjdXRpb25GYWN0b3J5KS5jcmVhdGUoeyByZXNvdXJjZTogdnNjb2RlXzEuVXJpLmZpbGUodGhpcy53b3Jrc3BhY2VQYXRoKSB9KTtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBweXRob24gcGF0aCBpcyB2YWxpZC5cbiAgICAgICAgICAgIGlmICgoeWllbGQgcHl0aG9uUHJvY2Vzcy5nZXRFeGVjdXRhYmxlUGF0aCgpLmNhdGNoKCgpID0+ICcnKSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgYXJncyA9IFsnY29tcGxldGlvbi5weSddO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnB5dGhvblNldHRpbmdzLmplZGlQYXRoID09PSAnc3RyaW5nJyAmJiB0aGlzLnB5dGhvblNldHRpbmdzLmplZGlQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ2N1c3RvbScpO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh0aGlzLnB5dGhvblNldHRpbmdzLmplZGlQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHB5dGhvblByb2Nlc3MuZXhlY09ic2VydmFibGUoYXJncywgeyBjd2QgfSk7XG4gICAgICAgICAgICB0aGlzLnByb2MgPSByZXN1bHQucHJvYztcbiAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIHRoaXMucHJvYy5vbignZW5kJywgKGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvZ2dlcl8xLkxvZ2dlci5lcnJvcignc3Bhd25Qcm9jZXNzLmVuZCcsIGBFbmQgLSAke2VuZH1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5wcm9jLm9uKCdlcnJvcicsIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdlcnJvcicsIGAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25SZXRyeUF0dGVtcHRzICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3Bhd25SZXRyeUF0dGVtcHRzIDwgMTAgJiYgZXJyb3IgJiYgZXJyb3IubWVzc2FnZSAmJlxuICAgICAgICAgICAgICAgICAgICBlcnJvci5tZXNzYWdlLmluZGV4T2YoJ1RoaXMgc29ja2V0IGhhcyBiZWVuIGVuZGVkIGJ5IHRoZSBvdGhlciBwYXJ0eScpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGF3blByb2Nlc3MoY3dkKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGV4ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkLnJlamVjdChleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdzcGF3blByb2Nlc3MnLCBleCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVzdWx0Lm91dC5zdWJzY3JpYmUob3V0cHV0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAob3V0cHV0LnNvdXJjZSA9PT0gJ3N0ZGVycicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcignc3RkZXJyJywgb3V0cHV0Lm91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gb3V0cHV0Lm91dDtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9zc2libGUgdGhlcmUgd2FzIGFuIGV4Y2VwdGlvbiBpbiBwYXJzaW5nIHRoZSBkYXRhIHJldHVybmVkLFxuICAgICAgICAgICAgICAgICAgICAvLyBzbyBhcHBlbmQgdGhlIGRhdGEgYW5kIHRoZW4gcGFyc2UgaXQuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFTdHIgPSB0aGlzLnByZXZpb3VzRGF0YSA9IGAke3RoaXMucHJldmlvdXNEYXRhfSR7ZGF0YX1gO1xuICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZXM7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZXMgPSBkYXRhU3RyLnNwbGl0TGluZXMoKS5tYXAocmVzcCA9PiBKU09OLnBhcnNlKHJlc3ApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJldmlvdXNEYXRhID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQb3NzaWJsZSB3ZSd2ZSBvbmx5IHJlY2VpdmVkIHBhcnQgb2YgdGhlIGRhdGEsIGhlbmNlIGRvbid0IGNsZWFyIHByZXZpb3VzRGF0YS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbid0IGxvZyBlcnJvcnMgd2hlbiB3ZSBoYXZlbid0IHJlY2VpdmVkIHRoZSBlbnRpcmUgcmVzcG9uc2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXgubWVzc2FnZS5pbmRleE9mKCdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcpID09PSAtMSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4Lm1lc3NhZ2UuaW5kZXhPZignVW5leHBlY3RlZCBlbmQgb2YgSlNPTiBpbnB1dCcpID09PSAtMSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4Lm1lc3NhZ2UuaW5kZXhPZignVW5leHBlY3RlZCB0b2tlbicpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoJ3N0ZG91dCcsIGV4Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlSWQgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNvbW1hbmRzLmhhcyhyZXNwb25zZUlkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNtZCA9IHRoaXMuY29tbWFuZHMuZ2V0KHJlc3BvbnNlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjbWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZCA9IGNtZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdhcmd1bWVudHMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZFF1ZXVlLnNwbGljZSh0aGlzLmNvbW1hbmRRdWV1ZS5pbmRleE9mKGNtZC5pZCksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZHMuZGVsZXRlKHJlc3BvbnNlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNvbW1hbmRRdWV1ZS5pbmRleE9mKGNtZC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbW1hbmRRdWV1ZS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBjb21tYW5kIGhhcyBleHBpcmVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNtZC50b2tlbi5pc0NhbmNlbGxhdGlvblJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY21kLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLmdldENvbW1hbmRIYW5kbGVyKGNtZC5jb21tYW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGNtZCwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdG9vIG1hbnkgcGVuZGluZyByZXF1ZXN0cy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tRdWV1ZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBlcnJvciA9PiB0aGlzLmhhbmRsZUVycm9yKCdzdWJzY3JpcHRpb24uZXJyb3InLCBgJHtlcnJvcn1gKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRDb21tYW5kSGFuZGxlcihjb21tYW5kKSB7XG4gICAgICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Db21wbGV0aW9uczpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbXBsZXRpb247XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkRlZmluaXRpb25zOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uRGVmaW5pdGlvbjtcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuSG92ZXI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Ib3ZlcjtcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuU3ltYm9sczpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vblN5bWJvbHM7XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlVzYWdlczpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vblVzYWdlcztcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQXJndW1lbnRzOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uQXJndW1lbnRzO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG4gICAgb25Db21wbGV0aW9uKGNvbW1hbmQsIHJlc3BvbnNlKSB7XG4gICAgICAgIGxldCByZXN1bHRzID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAncmVzdWx0cycpO1xuICAgICAgICByZXN1bHRzID0gQXJyYXkuaXNBcnJheShyZXN1bHRzKSA/IHJlc3VsdHMgOiBbXTtcbiAgICAgICAgcmVzdWx0cy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUeXBlID0gaXRlbS50eXBlO1xuICAgICAgICAgICAgaXRlbS50eXBlID0gZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpO1xuICAgICAgICAgICAgaXRlbS5raW5kID0gZ2V0TWFwcGVkVlNDb2RlU3ltYm9sKG9yaWdpbmFsVHlwZSk7XG4gICAgICAgICAgICBpdGVtLnJhd1R5cGUgPSBnZXRNYXBwZWRWU0NvZGVUeXBlKG9yaWdpbmFsVHlwZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBjb21wbGV0aW9uUmVzdWx0ID0ge1xuICAgICAgICAgICAgaXRlbXM6IHJlc3VsdHMsXG4gICAgICAgICAgICByZXF1ZXN0SWQ6IGNvbW1hbmQuaWRcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCBjb21wbGV0aW9uUmVzdWx0KTtcbiAgICB9XG4gICAgb25EZWZpbml0aW9uKGNvbW1hbmQsIHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgY29uc3QgZGVmcyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcbiAgICAgICAgY29uc3QgZGVmUmVzdWx0ID0ge1xuICAgICAgICAgICAgcmVxdWVzdElkOiBjb21tYW5kLmlkLFxuICAgICAgICAgICAgZGVmaW5pdGlvbnM6IFtdXG4gICAgICAgIH07XG4gICAgICAgIGlmIChkZWZzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGRlZlJlc3VsdC5kZWZpbml0aW9ucyA9IGRlZnMubWFwKGRlZiA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUeXBlID0gZGVmLnR5cGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IGRlZi5maWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZGVmLnRleHQsXG4gICAgICAgICAgICAgICAgICAgIHJhd1R5cGU6IG9yaWdpbmFsVHlwZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBnZXRNYXBwZWRWU0NvZGVTeW1ib2wob3JpZ2luYWxUeXBlKSxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiBkZWYuY29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICByYW5nZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lOiBkZWYucmFuZ2Uuc3RhcnRfbGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBkZWYucmFuZ2Uuc3RhcnRfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kTGluZTogZGVmLnJhbmdlLmVuZF9saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kQ29sdW1uOiBkZWYucmFuZ2UuZW5kX2NvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgZGVmUmVzdWx0KTtcbiAgICB9XG4gICAgb25Ib3Zlcihjb21tYW5kLCByZXNwb25zZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgIGNvbnN0IGRlZnMgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdyZXN1bHRzJyk7XG4gICAgICAgIGNvbnN0IGRlZlJlc3VsdCA9IHtcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcbiAgICAgICAgICAgIGl0ZW1zOiBkZWZzLm1hcChkZWYgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IGdldE1hcHBlZFZTQ29kZVN5bWJvbChkZWYudHlwZSksXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkZWYuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgIHNpZ25hdHVyZTogZGVmLnNpZ25hdHVyZSxcbiAgICAgICAgICAgICAgICAgICAgZG9jc3RyaW5nOiBkZWYuZG9jc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkZWYudGV4dFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNhZmVSZXNvbHZlKGNvbW1hbmQsIGRlZlJlc3VsdCk7XG4gICAgfVxuICAgIG9uU3ltYm9scyhjb21tYW5kLCByZXNwb25zZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgIGxldCBkZWZzID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAncmVzdWx0cycpO1xuICAgICAgICBkZWZzID0gQXJyYXkuaXNBcnJheShkZWZzKSA/IGRlZnMgOiBbXTtcbiAgICAgICAgY29uc3QgZGVmUmVzdWx0cyA9IHtcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcbiAgICAgICAgICAgIGRlZmluaXRpb25zOiBbXVxuICAgICAgICB9O1xuICAgICAgICBkZWZSZXN1bHRzLmRlZmluaXRpb25zID0gZGVmcy5tYXAoZGVmID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZSA9IGRlZi50eXBlO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBmaWxlTmFtZTogZGVmLmZpbGVOYW1lLFxuICAgICAgICAgICAgICAgIHRleHQ6IGRlZi50ZXh0LFxuICAgICAgICAgICAgICAgIHJhd1R5cGU6IG9yaWdpbmFsVHlwZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBnZXRNYXBwZWRWU0NvZGVUeXBlKG9yaWdpbmFsVHlwZSksXG4gICAgICAgICAgICAgICAga2luZDogZ2V0TWFwcGVkVlNDb2RlU3ltYm9sKG9yaWdpbmFsVHlwZSksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyOiBkZWYuY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluZTogZGVmLnJhbmdlLnN0YXJ0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBkZWYucmFuZ2Uuc3RhcnRfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICBlbmRMaW5lOiBkZWYucmFuZ2UuZW5kX2xpbmUsXG4gICAgICAgICAgICAgICAgICAgIGVuZENvbHVtbjogZGVmLnJhbmdlLmVuZF9jb2x1bW5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCBkZWZSZXN1bHRzKTtcbiAgICB9XG4gICAgb25Vc2FnZXMoY29tbWFuZCwgcmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICBsZXQgZGVmcyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcbiAgICAgICAgZGVmcyA9IEFycmF5LmlzQXJyYXkoZGVmcykgPyBkZWZzIDogW107XG4gICAgICAgIGNvbnN0IHJlZlJlc3VsdCA9IHtcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcbiAgICAgICAgICAgIHJlZmVyZW5jZXM6IGRlZnMubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbkluZGV4OiBpdGVtLmNvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IGl0ZW0uZmlsZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVJbmRleDogaXRlbS5saW5lIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZTogaXRlbS5tb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCByZWZSZXN1bHQpO1xuICAgIH1cbiAgICBvbkFyZ3VtZW50cyhjb21tYW5kLCByZXNwb25zZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgIGNvbnN0IGRlZnMgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdyZXN1bHRzJyk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1vYmplY3QtbGl0ZXJhbC10eXBlLWFzc2VydGlvblxuICAgICAgICB0aGlzLnNhZmVSZXNvbHZlKGNvbW1hbmQsIHtcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcbiAgICAgICAgICAgIGRlZmluaXRpb25zOiBkZWZzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1F1ZXVlTGVuZ3RoKCkge1xuICAgICAgICBpZiAodGhpcy5jb21tYW5kUXVldWUubGVuZ3RoID4gMTApIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5jb21tYW5kUXVldWUuc3BsaWNlKDAsIHRoaXMuY29tbWFuZFF1ZXVlLmxlbmd0aCAtIDEwKTtcbiAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goaWQgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbW1hbmRzLmhhcyhpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY21kMSA9IHRoaXMuY29tbWFuZHMuZ2V0KGlkKTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY21kMSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21tYW5kcy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIGNyZWF0ZVBheWxvYWQoY21kKSB7XG4gICAgICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgICAgICBpZDogY21kLmlkLFxuICAgICAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgICAgIGxvb2t1cDogY29tbWFuZE5hbWVzLmdldChjbWQuY29tbWFuZCksXG4gICAgICAgICAgICBwYXRoOiBjbWQuZmlsZU5hbWUsXG4gICAgICAgICAgICBzb3VyY2U6IGNtZC5zb3VyY2UsXG4gICAgICAgICAgICBsaW5lOiBjbWQubGluZUluZGV4LFxuICAgICAgICAgICAgY29sdW1uOiBjbWQuY29sdW1uSW5kZXgsXG4gICAgICAgICAgICBjb25maWc6IHRoaXMuZ2V0Q29uZmlnKClcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGNtZC5jb21tYW5kID09PSBDb21tYW5kVHlwZS5TeW1ib2xzKSB7XG4gICAgICAgICAgICBkZWxldGUgcGF5bG9hZC5jb2x1bW47XG4gICAgICAgICAgICBkZWxldGUgcGF5bG9hZC5saW5lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXlsb2FkO1xuICAgIH1cbiAgICBnZXRQYXRoRnJvbVB5dGhvbkNvbW1hbmQoYXJncykge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBweXRob25Qcm9jZXNzID0geWllbGQgdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQeXRob25FeGVjdXRpb25GYWN0b3J5KS5jcmVhdGUoeyByZXNvdXJjZTogdnNjb2RlXzEuVXJpLmZpbGUodGhpcy53b3Jrc3BhY2VQYXRoKSB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB5aWVsZCBweXRob25Qcm9jZXNzLmV4ZWMoYXJncywgeyBjd2Q6IHRoaXMud29ya3NwYWNlUGF0aCB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5lcyA9IHJlc3VsdC5zdGRvdXQudHJpbSgpLnNwbGl0TGluZXMoKTtcbiAgICAgICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RzID0geWllbGQgZnMucGF0aEV4aXN0cyhsaW5lc1swXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0cyA/IGxpbmVzWzBdIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoX2EpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBidWlsZEF1dG9Db21wbGV0ZVBhdGhzKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGhQcm9taXNlcyA9IFtcbiAgICAgICAgICAgICAgICAvLyBTeXNwcmVmaXguXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRQYXRoRnJvbVB5dGhvbkNvbW1hbmQoWyctYycsICdpbXBvcnQgc3lzO3ByaW50KHN5cy5wcmVmaXgpJ10pLmNhdGNoKCgpID0+ICcnKSxcbiAgICAgICAgICAgICAgICAvLyBleGV1Y3V0YWJsZSBwYXRoLlxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0UGF0aEZyb21QeXRob25Db21tYW5kKFsnLWMnLCAnaW1wb3J0IHN5cztwcmludChzeXMuZXhlY3V0YWJsZSknXSkudGhlbihleGVjUGF0aCA9PiBwYXRoLmRpcm5hbWUoZXhlY1BhdGgpKS5jYXRjaCgoKSA9PiAnJyksXG4gICAgICAgICAgICAgICAgLy8gUHl0aG9uIHNwZWNpZmljIHNpdGUgcGFja2FnZXMuXG4gICAgICAgICAgICAgICAgLy8gT24gd2luZG93cyB3ZSBhbHNvIG5lZWQgdGhlIGxpYnMgcGF0aCAoc2Vjb25kIGl0ZW0gd2lsbCByZXR1cm4gYzpcXHh4eFxcbGliXFxzaXRlLXBhY2thZ2VzKS5cbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIHJldHVybmVkIGJ5IFwiZnJvbSBkaXN0dXRpbHMuc3lzY29uZmlnIGltcG9ydCBnZXRfcHl0aG9uX2xpYjsgcHJpbnQoZ2V0X3B5dGhvbl9saWIoKSlcIi5cbiAgICAgICAgICAgICAgICB0aGlzLmdldFBhdGhGcm9tUHl0aG9uQ29tbWFuZChbJy1jJywgJ2Zyb20gZGlzdHV0aWxzLnN5c2NvbmZpZyBpbXBvcnQgZ2V0X3B5dGhvbl9saWI7IHByaW50KGdldF9weXRob25fbGliKCkpJ10pXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGxpYlBhdGggPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbiB3aW5kb3dzIHdlIGFsc28gbmVlZCB0aGUgbGlicyBwYXRoIChzZWNvbmQgaXRlbSB3aWxsIHJldHVybiBjOlxceHh4XFxsaWJcXHNpdGUtcGFja2FnZXMpLlxuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIHJldHVybmVkIGJ5IFwiZnJvbSBkaXN0dXRpbHMuc3lzY29uZmlnIGltcG9ydCBnZXRfcHl0aG9uX2xpYjsgcHJpbnQoZ2V0X3B5dGhvbl9saWIoKSlcIi5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChJU19XSU5ET1dTICYmIGxpYlBhdGgubGVuZ3RoID4gMCkgPyBwYXRoLmpvaW4obGliUGF0aCwgJy4uJykgOiBsaWJQYXRoO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiAnJyksXG4gICAgICAgICAgICAgICAgLy8gUHl0aG9uIGdsb2JhbCBzaXRlIHBhY2thZ2VzLCBhcyBhIGZhbGxiYWNrIGluIGNhc2UgdXNlciBoYXNuJ3QgaW5zdGFsbGVkIHRoZW0gaW4gY3VzdG9tIGVudmlyb25tZW50LlxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0UGF0aEZyb21QeXRob25Db21tYW5kKFsnLW0nLCAnc2l0ZScsICctLXVzZXItc2l0ZSddKS5jYXRjaCgoKSA9PiAnJylcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHB5dGhvblBhdGhzID0geWllbGQgdGhpcy5nZXRFbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyKCkuZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXModnNjb2RlXzEuVXJpLmZpbGUodGhpcy53b3Jrc3BhY2VQYXRoKSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oY3VzdG9tRW52aXJvbm1lbnRWYXJzID0+IGN1c3RvbUVudmlyb25tZW50VmFycyA/IEplZGlQcm94eS5nZXRQcm9wZXJ0eShjdXN0b21FbnZpcm9ubWVudFZhcnMsICdQWVRIT05QQVRIJykgOiAnJylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocHl0aG9uUGF0aCA9PiAodHlwZW9mIHB5dGhvblBhdGggPT09ICdzdHJpbmcnICYmIHB5dGhvblBhdGgudHJpbSgpLmxlbmd0aCA+IDApID8gcHl0aG9uUGF0aC50cmltKCkgOiAnJylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocHl0aG9uUGF0aCA9PiBweXRob25QYXRoLnNwbGl0KHBhdGguZGVsaW1pdGVyKS5maWx0ZXIoaXRlbSA9PiBpdGVtLnRyaW0oKS5sZW5ndGggPiAwKSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRocyA9IHB5dGhvblBhdGhzXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIocHl0aG9uUGF0aCA9PiAhcGF0aC5pc0Fic29sdXRlKHB5dGhvblBhdGgpKVxuICAgICAgICAgICAgICAgICAgICAubWFwKHB5dGhvblBhdGggPT4gcGF0aC5yZXNvbHZlKHRoaXMud29ya3NwYWNlUGF0aCwgcHl0aG9uUGF0aCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRocyA9IHlpZWxkIFByb21pc2UuYWxsKGZpbGVQYXRoUHJvbWlzZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aHMuY29uY2F0KC4uLnB5dGhvblBhdGhzLCAuLi5yZXNvbHZlZFBhdGhzKS5maWx0ZXIocCA9PiBwLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignUHl0aG9uIEV4dGVuc2lvbjogamVkaVByb3h5LmZpbGVQYXRocycsIGV4KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRFbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyKCkge1xuICAgICAgICBpZiAoIXRoaXMuZW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcikge1xuICAgICAgICAgICAgdGhpcy5lbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklFbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyKTtcbiAgICAgICAgICAgIHRoaXMuZW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlci5vbkRpZEVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlKHRoaXMuZW52aXJvbm1lbnRWYXJpYWJsZXNDaGFuZ2VIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXI7XG4gICAgfVxuICAgIGdldENvbmZpZygpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIHBhdGhzIHJlbGF0aXZlIHRvIHdvcmtzcGFjZS5cbiAgICAgICAgY29uc3QgZXh0cmFQYXRocyA9IHRoaXMucHl0aG9uU2V0dGluZ3MuYXV0b0NvbXBsZXRlID9cbiAgICAgICAgICAgIHRoaXMucHl0aG9uU2V0dGluZ3MuYXV0b0NvbXBsZXRlLmV4dHJhUGF0aHMubWFwKGV4dHJhUGF0aCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShleHRyYVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBleHRyYVBhdGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy53b3Jrc3BhY2VQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy53b3Jrc3BhY2VQYXRoLCBleHRyYVBhdGgpO1xuICAgICAgICAgICAgfSkgOiBbXTtcbiAgICAgICAgLy8gQWx3YXlzIGFkZCB3b3Jrc3BhY2UgcGF0aCBpbnRvIGV4dHJhIHBhdGhzLlxuICAgICAgICBpZiAodHlwZW9mIHRoaXMud29ya3NwYWNlUGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGV4dHJhUGF0aHMudW5zaGlmdCh0aGlzLndvcmtzcGFjZVBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpc3RpbmN0RXh0cmFQYXRocyA9IGV4dHJhUGF0aHMuY29uY2F0KHRoaXMuYWRkaXRpb25hbEF1dG9Db21wbGV0ZVBhdGhzKVxuICAgICAgICAgICAgLmZpbHRlcih2YWx1ZSA9PiB2YWx1ZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgLmZpbHRlcigodmFsdWUsIGluZGV4LCBzZWxmKSA9PiBzZWxmLmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBleHRyYVBhdGhzOiBkaXN0aW5jdEV4dHJhUGF0aHMsXG4gICAgICAgICAgICB1c2VTbmlwcGV0czogZmFsc2UsXG4gICAgICAgICAgICBjYXNlSW5zZW5zaXRpdmVDb21wbGV0aW9uOiB0cnVlLFxuICAgICAgICAgICAgc2hvd0Rlc2NyaXB0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgIGZ1enp5TWF0Y2hlcjogdHJ1ZVxuICAgICAgICB9O1xuICAgIH1cbiAgICBzYWZlUmVzb2x2ZShjb21tYW5kLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKGNvbW1hbmQgJiYgY29tbWFuZC5kZWZlcnJlZCkge1xuICAgICAgICAgICAgY29tbWFuZC5kZWZlcnJlZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5fX2RlY29yYXRlKFtcbiAgICBkZWNvcmF0b3JzXzEuc3dhbGxvd0V4Y2VwdGlvbnMoJ0plZGlQcm94eScpXG5dLCBKZWRpUHJveHkucHJvdG90eXBlLCBcInB5dGhvblNldHRpbmdzQ2hhbmdlSGFuZGxlclwiLCBudWxsKTtcbl9fZGVjb3JhdGUoW1xuICAgIGRlY29yYXRvcnNfMS5kZWJvdW5jZSgxNTAwKSxcbiAgICBkZWNvcmF0b3JzXzEuc3dhbGxvd0V4Y2VwdGlvbnMoJ0plZGlQcm94eScpXG5dLCBKZWRpUHJveHkucHJvdG90eXBlLCBcImVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlSGFuZGxlclwiLCBudWxsKTtcbl9fZGVjb3JhdGUoW1xuICAgIGRlY29yYXRvcnNfMS5zd2FsbG93RXhjZXB0aW9ucygnSmVkaVByb3h5Jylcbl0sIEplZGlQcm94eS5wcm90b3R5cGUsIFwic3RhcnRMYW5ndWFnZVNlcnZlclwiLCBudWxsKTtcbmV4cG9ydHMuSmVkaVByb3h5ID0gSmVkaVByb3h5O1xuY2xhc3MgSmVkaVByb3h5SGFuZGxlciB7XG4gICAgY29uc3RydWN0b3IoamVkaVByb3h5KSB7XG4gICAgICAgIHRoaXMuamVkaVByb3h5ID0gamVkaVByb3h5O1xuICAgICAgICB0aGlzLmNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIGdldCBKZWRpUHJveHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmplZGlQcm94eTtcbiAgICB9XG4gICAgZGlzcG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuamVkaVByb3h5KSB7XG4gICAgICAgICAgICB0aGlzLmplZGlQcm94eS5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VuZENvbW1hbmQoY21kLCB0b2tlbikge1xuICAgICAgICBjb25zdCBleGVjdXRpb25DbWQgPSBjbWQ7XG4gICAgICAgIGV4ZWN1dGlvbkNtZC5pZCA9IGV4ZWN1dGlvbkNtZC5pZCB8fCB0aGlzLmplZGlQcm94eS5nZXROZXh0Q29tbWFuZElkKCk7XG4gICAgICAgIGlmICh0aGlzLmNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMuaGFzKGNtZC5jb21tYW5kKSkge1xuICAgICAgICAgICAgY29uc3QgY3QgPSB0aGlzLmNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMuZ2V0KGNtZC5jb21tYW5kKTtcbiAgICAgICAgICAgIGlmIChjdCkge1xuICAgICAgICAgICAgICAgIGN0LmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNhbmNlbGxhdGlvbiA9IG5ldyB2c2NvZGVfMS5DYW5jZWxsYXRpb25Ub2tlblNvdXJjZSgpO1xuICAgICAgICB0aGlzLmNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMuc2V0KGNtZC5jb21tYW5kLCBjYW5jZWxsYXRpb24pO1xuICAgICAgICBleGVjdXRpb25DbWQudG9rZW4gPSBjYW5jZWxsYXRpb24udG9rZW47XG4gICAgICAgIHJldHVybiB0aGlzLmplZGlQcm94eS5zZW5kQ29tbWFuZChleGVjdXRpb25DbWQpXG4gICAgICAgICAgICAuY2F0Y2gocmVhc29uID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IocmVhc29uKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZW5kQ29tbWFuZE5vbkNhbmNlbGxhYmxlQ29tbWFuZChjbWQsIHRva2VuKSB7XG4gICAgICAgIGNvbnN0IGV4ZWN1dGlvbkNtZCA9IGNtZDtcbiAgICAgICAgZXhlY3V0aW9uQ21kLmlkID0gZXhlY3V0aW9uQ21kLmlkIHx8IHRoaXMuamVkaVByb3h5LmdldE5leHRDb21tYW5kSWQoKTtcbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICBleGVjdXRpb25DbWQudG9rZW4gPSB0b2tlbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5qZWRpUHJveHkuc2VuZENvbW1hbmQoZXhlY3V0aW9uQ21kKVxuICAgICAgICAgICAgLmNhdGNoKHJlYXNvbiA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHJlYXNvbik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLkplZGlQcm94eUhhbmRsZXIgPSBKZWRpUHJveHlIYW5kbGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9amVkaVByb3h5LmpzLm1hcCJdfQ==