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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImplZGlQcm94eS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImZzIiwicmVxdWlyZSIsInBhdGgiLCJwaWR1c2FnZSIsInZzY29kZV8xIiwiY29uZmlnU2V0dGluZ3NfMSIsImNvbnN0YW50c18xIiwidHlwZXNfMSIsInR5cGVzXzIiLCJhc3luY18xIiwiZGVjb3JhdG9yc18xIiwic3RvcFdhdGNoXzEiLCJ0eXBlc18zIiwibG9nZ2VyXzEiLCJJU19XSU5ET1dTIiwidGVzdCIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncyIsIk1hcCIsInNldCIsIkNvbXBsZXRpb25JdGVtS2luZCIsIlZhbHVlIiwiQ2xhc3MiLCJGdW5jdGlvbiIsIlJlZmVyZW5jZSIsIk1ldGhvZCIsIk1vZHVsZSIsIkZpbGUiLCJQcm9wZXJ0eSIsIktleXdvcmQiLCJWYXJpYWJsZSIsInB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzIiwiU3ltYm9sS2luZCIsIkFycmF5IiwiQ29uc3RhbnQiLCJCb29sZWFuIiwiTnVtYmVyIiwiU3RyaW5nIiwiZ2V0TWFwcGVkVlNDb2RlVHlwZSIsInB5dGhvblR5cGUiLCJoYXMiLCJnZXQiLCJnZXRNYXBwZWRWU0NvZGVTeW1ib2wiLCJDb21tYW5kVHlwZSIsImNvbW1hbmROYW1lcyIsIkFyZ3VtZW50cyIsIkNvbXBsZXRpb25zIiwiRGVmaW5pdGlvbnMiLCJIb3ZlciIsIlVzYWdlcyIsIlN5bWJvbHMiLCJKZWRpUHJveHkiLCJjb25zdHJ1Y3RvciIsImV4dGVuc2lvblJvb3REaXIiLCJ3b3Jrc3BhY2VQYXRoIiwic2VydmljZUNvbnRhaW5lciIsImNtZElkIiwicHJldmlvdXNEYXRhIiwiY29tbWFuZHMiLCJjb21tYW5kUXVldWUiLCJzcGF3blJldHJ5QXR0ZW1wdHMiLCJhZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMiLCJpZ25vcmVKZWRpTWVtb3J5Rm9vdHByaW50IiwicGlkVXNhZ2VGYWlsdXJlcyIsInRpbWVyIiwiU3RvcFdhdGNoIiwiY291bnRlciIsInB5dGhvblNldHRpbmdzIiwiUHl0aG9uU2V0dGluZ3MiLCJnZXRJbnN0YW5jZSIsIlVyaSIsImZpbGUiLCJsYXN0S25vd25QeXRob25JbnRlcnByZXRlciIsInB5dGhvblBhdGgiLCJsb2dnZXIiLCJJTG9nZ2VyIiwib24iLCJweXRob25TZXR0aW5nc0NoYW5nZUhhbmRsZXIiLCJpbml0aWFsaXplZCIsImNyZWF0ZURlZmVycmVkIiwic3RhcnRMYW5ndWFnZVNlcnZlciIsImlnbm9yZUVycm9ycyIsInByb3Bvc2VOZXdMYW5ndWFnZVNlcnZlclBvcHVwIiwiSVB5dGhvbkV4dGVuc2lvbkJhbm5lciIsIkJBTk5FUl9OQU1FX1BST1BPU0VfTFMiLCJjaGVja0plZGlNZW1vcnlGb290cHJpbnQiLCJnZXRQcm9wZXJ0eSIsIm8iLCJuYW1lIiwiZGlzcG9zZSIsImtpbGxQcm9jZXNzIiwiZ2V0TmV4dENvbW1hbmRJZCIsInNlbmRDb21tYW5kIiwiY21kIiwicHJvbWlzZSIsImxhbmd1YWdlU2VydmVyU3RhcnRlZCIsInByb2MiLCJFcnJvciIsImV4ZWN1dGlvbkNtZCIsInBheWxvYWQiLCJjcmVhdGVQYXlsb2FkIiwiZGVmZXJyZWQiLCJzdGRpbiIsIndyaXRlIiwiSlNPTiIsInN0cmluZ2lmeSIsImlkIiwicHVzaCIsImV4IiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImhhbmRsZUVycm9yIiwiaW5pdGlhbGl6ZSIsInNwYXduUHJvY2VzcyIsImpvaW4iLCJjYXRjaCIsInNob3VsZENoZWNrSmVkaU1lbW9yeUZvb3RwcmludCIsImplZGlNZW1vcnlMaW1pdCIsImxhc3RDbWRJZFByb2Nlc3NlZEZvclBpZFVzYWdlIiwibGFzdENtZElkUHJvY2Vzc2VkIiwiY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50SW1wbCIsInNldFRpbWVvdXQiLCJraWxsZWQiLCJzdGF0IiwicGlkIiwiZXJyIiwiZWxhcHNlZFRpbWUiLCJyZXNldCIsImxpbWl0IiwiTWF0aCIsIm1pbiIsIm1heCIsIm1lbW9yeSIsImxvZ1dhcm5pbmciLCJyZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIiLCJidWlsZEF1dG9Db21wbGV0ZVBhdGhzIiwiZW52aXJvbm1lbnRWYXJpYWJsZXNDaGFuZ2VIYW5kbGVyIiwibmV3QXV0b0NvbWxldGVQYXRocyIsImlzVGVzdEV4ZWN1dGlvbiIsInNob3dCYW5uZXIiLCJjbGVhclBlbmRpbmdSZXF1ZXN0cyIsImZvckVhY2giLCJpdGVtIiwidW5kZWZpbmVkIiwiY2xlYXIiLCJraWxsIiwic291cmNlIiwiZXJyb3JNZXNzYWdlIiwiTG9nZ2VyIiwiY3dkIiwiY29tcGxldGVkIiwicHl0aG9uUHJvY2VzcyIsIklQeXRob25FeGVjdXRpb25GYWN0b3J5IiwiY3JlYXRlIiwicmVzb3VyY2UiLCJnZXRFeGVjdXRhYmxlUGF0aCIsImFyZ3MiLCJqZWRpUGF0aCIsImV4ZWNPYnNlcnZhYmxlIiwiZW5kIiwiaW5kZXhPZiIsIm91dCIsInN1YnNjcmliZSIsIm91dHB1dCIsImRhdGEiLCJkYXRhU3RyIiwicmVzcG9uc2VzIiwic3BsaXRMaW5lcyIsIm1hcCIsInJlc3AiLCJwYXJzZSIsInJlc3BvbnNlIiwicmVzcG9uc2VJZCIsInNwbGljZSIsImRlbGV0ZSIsImluZGV4IiwidG9rZW4iLCJpc0NhbmNlbGxhdGlvblJlcXVlc3RlZCIsInNhZmVSZXNvbHZlIiwiaGFuZGxlciIsImdldENvbW1hbmRIYW5kbGVyIiwiY29tbWFuZCIsImNhbGwiLCJjaGVja1F1ZXVlTGVuZ3RoIiwib25Db21wbGV0aW9uIiwib25EZWZpbml0aW9uIiwib25Ib3ZlciIsIm9uU3ltYm9scyIsIm9uVXNhZ2VzIiwib25Bcmd1bWVudHMiLCJyZXN1bHRzIiwiaXNBcnJheSIsIm9yaWdpbmFsVHlwZSIsInR5cGUiLCJraW5kIiwicmF3VHlwZSIsImNvbXBsZXRpb25SZXN1bHQiLCJpdGVtcyIsInJlcXVlc3RJZCIsImRlZnMiLCJkZWZSZXN1bHQiLCJkZWZpbml0aW9ucyIsImRlZiIsImZpbGVOYW1lIiwidGV4dCIsImNvbnRhaW5lciIsInJhbmdlIiwic3RhcnRMaW5lIiwic3RhcnRfbGluZSIsInN0YXJ0Q29sdW1uIiwic3RhcnRfY29sdW1uIiwiZW5kTGluZSIsImVuZF9saW5lIiwiZW5kQ29sdW1uIiwiZW5kX2NvbHVtbiIsImRlc2NyaXB0aW9uIiwic2lnbmF0dXJlIiwiZG9jc3RyaW5nIiwiZGVmUmVzdWx0cyIsInJlZlJlc3VsdCIsInJlZmVyZW5jZXMiLCJjb2x1bW5JbmRleCIsImNvbHVtbiIsImxpbmVJbmRleCIsImxpbmUiLCJtb2R1bGVOYW1lIiwiY21kMSIsInByZWZpeCIsImxvb2t1cCIsImNvbmZpZyIsImdldENvbmZpZyIsImdldFBhdGhGcm9tUHl0aG9uQ29tbWFuZCIsImV4ZWMiLCJsaW5lcyIsInN0ZG91dCIsInRyaW0iLCJleGlzdHMiLCJwYXRoRXhpc3RzIiwiX2EiLCJmaWxlUGF0aFByb21pc2VzIiwiZXhlY1BhdGgiLCJkaXJuYW1lIiwibGliUGF0aCIsInB5dGhvblBhdGhzIiwiZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlciIsImdldEVudmlyb25tZW50VmFyaWFibGVzIiwiY3VzdG9tRW52aXJvbm1lbnRWYXJzIiwic3BsaXQiLCJkZWxpbWl0ZXIiLCJmaWx0ZXIiLCJyZXNvbHZlZFBhdGhzIiwiaXNBYnNvbHV0ZSIsImZpbGVQYXRocyIsImFsbCIsImNvbmNhdCIsInAiLCJlbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyIiwiSUVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIiLCJvbkRpZEVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlIiwiYmluZCIsImV4dHJhUGF0aHMiLCJhdXRvQ29tcGxldGUiLCJleHRyYVBhdGgiLCJ1bnNoaWZ0IiwiZGlzdGluY3RFeHRyYVBhdGhzIiwic2VsZiIsInVzZVNuaXBwZXRzIiwiY2FzZUluc2Vuc2l0aXZlQ29tcGxldGlvbiIsInNob3dEZXNjcmlwdGlvbnMiLCJmdXp6eU1hdGNoZXIiLCJzd2FsbG93RXhjZXB0aW9ucyIsInByb3RvdHlwZSIsImRlYm91bmNlIiwiSmVkaVByb3h5SGFuZGxlciIsImplZGlQcm94eSIsImNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMiLCJjdCIsImNhbmNlbCIsImNhbmNlbGxhdGlvbiIsIkNhbmNlbGxhdGlvblRva2VuU291cmNlIiwicmVhc29uIiwic2VuZENvbW1hbmROb25DYW5jZWxsYWJsZUNvbW1hbmQiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8s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OUQ7QUFDQVEsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkosUUFBL0Q7QUFDQUcsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFFBQS9CLEVBQXlDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQk4sTUFBN0Q7QUFDQUssMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFNBQS9CLEVBQTBDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBOUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkUsUUFBL0Q7QUFDQUgsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBL0Q7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBNUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBNUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFdBQS9CLEVBQTRDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBaEU7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFNBQS9CLEVBQTBDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkcsT0FBOUQ7QUFDQUosMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLEtBQS9CLEVBQXNDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFBMUQ7QUFDQUwsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFBL0Q7QUFDQUwsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFB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RUFBVztBQUNQL0UsTUFBQUEsWUFBWSxDQUFDK0UsS0FBYixHQUFxQkEsS0FBckI7QUFDSDs7QUFDRCxXQUFPLEtBQUtrRyxTQUFMLENBQWV2TCxXQUFmLENBQTJCTSxZQUEzQixFQUNGa0IsS0FERSxDQUNJcUssTUFBTSxJQUFJO0FBQ2pCNUssTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMySyxNQUFkO0FBQ0EsYUFBT3pJLFNBQVA7QUFDSCxLQUpNLENBQVA7QUFLSDs7QUExQ2tCOztBQTRDdkJsSixPQUFPLENBQUNvUixnQkFBUixHQUEyQkEsZ0JBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBwaWR1c2FnZSA9IHJlcXVpcmUoXCJwaWR1c2FnZVwiKTtcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcbmNvbnN0IGNvbmZpZ1NldHRpbmdzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2NvbmZpZ1NldHRpbmdzXCIpO1xuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2NvbnN0YW50c1wiKTtcbnJlcXVpcmUoXCIuLi9jb21tb24vZXh0ZW5zaW9uc1wiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3Byb2Nlc3MvdHlwZXNcIik7XG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uL2NvbW1vbi90eXBlc1wiKTtcbmNvbnN0IGFzeW5jXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3V0aWxzL2FzeW5jXCIpO1xuY29uc3QgZGVjb3JhdG9yc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi91dGlscy9kZWNvcmF0b3JzXCIpO1xuY29uc3Qgc3RvcFdhdGNoXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3V0aWxzL3N0b3BXYXRjaFwiKTtcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi4vY29tbW9uL3ZhcmlhYmxlcy90eXBlc1wiKTtcbmNvbnN0IGxvZ2dlcl8xID0gcmVxdWlyZShcIi4vLi4vY29tbW9uL2xvZ2dlclwiKTtcbmNvbnN0IElTX1dJTkRPV1MgPSAvXndpbi8udGVzdChwcm9jZXNzLnBsYXRmb3JtKTtcbmNvbnN0IHB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncyA9IG5ldyBNYXAoKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ25vbmUnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuVmFsdWUpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgndHlwZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd0dXBsZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdkaWN0JywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2RpY3Rpb25hcnknLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZnVuY3Rpb24nLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuRnVuY3Rpb24pO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnbGFtYmRhJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2dlbmVyYXRvcicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdjbGFzcycsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdpbnN0YW5jZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5SZWZlcmVuY2UpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnbWV0aG9kJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLk1ldGhvZCk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdidWlsdGluJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2J1aWx0aW5mdW5jdGlvbicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdtb2R1bGUnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuTW9kdWxlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2ZpbGUnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuRmlsZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd4cmFuZ2UnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnc2xpY2UnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgndHJhY2ViYWNrJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2ZyYW1lJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2J1ZmZlcicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdkaWN0cHJveHknLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZnVuY2RlZicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdwcm9wZXJ0eScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5Qcm9wZXJ0eSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdpbXBvcnQnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuTW9kdWxlKTtcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2tleXdvcmQnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuS2V5d29yZCk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdjb25zdGFudCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd2YXJpYWJsZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd2YWx1ZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYWx1ZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdwYXJhbScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdzdGF0ZW1lbnQnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuS2V5d29yZCk7XG5jb25zdCBweXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncyA9IG5ldyBNYXAoKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbm9uZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuVmFyaWFibGUpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCd0eXBlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3R1cGxlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2RpY3QnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZGljdGlvbmFyeScsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdmdW5jdGlvbicsIHZzY29kZV8xLlN5bWJvbEtpbmQuRnVuY3Rpb24pO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdsYW1iZGEnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZ2VuZXJhdG9yJywgdnNjb2RlXzEuU3ltYm9sS2luZC5GdW5jdGlvbik7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2NsYXNzJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2luc3RhbmNlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ21ldGhvZCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuTWV0aG9kKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnYnVpbHRpbicsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdidWlsdGluZnVuY3Rpb24nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbW9kdWxlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5Nb2R1bGUpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdmaWxlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5GaWxlKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgneHJhbmdlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5BcnJheSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3NsaWNlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3RyYWNlYmFjaycsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdmcmFtZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdidWZmZXInLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkFycmF5KTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZGljdHByb3h5JywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2Z1bmNkZWYnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgncHJvcGVydHknLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlByb3BlcnR5KTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnaW1wb3J0JywgdnNjb2RlXzEuU3ltYm9sS2luZC5Nb2R1bGUpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdrZXl3b3JkJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2NvbnN0YW50JywgdnNjb2RlXzEuU3ltYm9sS2luZC5Db25zdGFudCk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3ZhcmlhYmxlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3ZhbHVlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3BhcmFtJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3N0YXRlbWVudCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuVmFyaWFibGUpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdib29sZWFuJywgdnNjb2RlXzEuU3ltYm9sS2luZC5Cb29sZWFuKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnaW50JywgdnNjb2RlXzEuU3ltYm9sS2luZC5OdW1iZXIpO1xucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdsb25nbGVhbicsIHZzY29kZV8xLlN5bWJvbEtpbmQuTnVtYmVyKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZmxvYXQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk51bWJlcik7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2NvbXBsZXgnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk51bWJlcik7XG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3N0cmluZycsIHZzY29kZV8xLlN5bWJvbEtpbmQuU3RyaW5nKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgndW5pY29kZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuU3RyaW5nKTtcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbGlzdCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuQXJyYXkpO1xuZnVuY3Rpb24gZ2V0TWFwcGVkVlNDb2RlVHlwZShweXRob25UeXBlKSB7XG4gICAgaWYgKHB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5oYXMocHl0aG9uVHlwZSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBweXRob25WU0NvZGVUeXBlTWFwcGluZ3MuZ2V0KHB5dGhvblR5cGUpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQ7XG59XG5mdW5jdGlvbiBnZXRNYXBwZWRWU0NvZGVTeW1ib2wocHl0aG9uVHlwZSkge1xuICAgIGlmIChweXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5oYXMocHl0aG9uVHlwZSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBweXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5nZXQocHl0aG9uVHlwZSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlO1xufVxudmFyIENvbW1hbmRUeXBlO1xuKGZ1bmN0aW9uIChDb21tYW5kVHlwZSkge1xuICAgIENvbW1hbmRUeXBlW0NvbW1hbmRUeXBlW1wiQXJndW1lbnRzXCJdID0gMF0gPSBcIkFyZ3VtZW50c1wiO1xuICAgIENvbW1hbmRUeXBlW0NvbW1hbmRUeXBlW1wiQ29tcGxldGlvbnNcIl0gPSAxXSA9IFwiQ29tcGxldGlvbnNcIjtcbiAgICBDb21tYW5kVHlwZVtDb21tYW5kVHlwZVtcIkhvdmVyXCJdID0gMl0gPSBcIkhvdmVyXCI7XG4gICAgQ29tbWFuZFR5cGVbQ29tbWFuZFR5cGVbXCJVc2FnZXNcIl0gPSAzXSA9IFwiVXNhZ2VzXCI7XG4gICAgQ29tbWFuZFR5cGVbQ29tbWFuZFR5cGVbXCJEZWZpbml0aW9uc1wiXSA9IDRdID0gXCJEZWZpbml0aW9uc1wiO1xuICAgIENvbW1hbmRUeXBlW0NvbW1hbmRUeXBlW1wiU3ltYm9sc1wiXSA9IDVdID0gXCJTeW1ib2xzXCI7XG59KShDb21tYW5kVHlwZSA9IGV4cG9ydHMuQ29tbWFuZFR5cGUgfHwgKGV4cG9ydHMuQ29tbWFuZFR5cGUgPSB7fSkpO1xuY29uc3QgY29tbWFuZE5hbWVzID0gbmV3IE1hcCgpO1xuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5Bcmd1bWVudHMsICdhcmd1bWVudHMnKTtcbmNvbW1hbmROYW1lcy5zZXQoQ29tbWFuZFR5cGUuQ29tcGxldGlvbnMsICdjb21wbGV0aW9ucycpO1xuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5EZWZpbml0aW9ucywgJ2RlZmluaXRpb25zJyk7XG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLkhvdmVyLCAndG9vbHRpcCcpO1xuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5Vc2FnZXMsICd1c2FnZXMnKTtcbmNvbW1hbmROYW1lcy5zZXQoQ29tbWFuZFR5cGUuU3ltYm9scywgJ25hbWVzJyk7XG5jbGFzcyBKZWRpUHJveHkge1xuICAgIGNvbnN0cnVjdG9yKGV4dGVuc2lvblJvb3REaXIsIHdvcmtzcGFjZVBhdGgsIHNlcnZpY2VDb250YWluZXIpIHtcbiAgICAgICAgdGhpcy5leHRlbnNpb25Sb290RGlyID0gZXh0ZW5zaW9uUm9vdERpcjtcbiAgICAgICAgdGhpcy5zZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZUNvbnRhaW5lcjtcbiAgICAgICAgdGhpcy5jbWRJZCA9IDA7XG4gICAgICAgIHRoaXMucHJldmlvdXNEYXRhID0gJyc7XG4gICAgICAgIHRoaXMuY29tbWFuZHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuY29tbWFuZFF1ZXVlID0gW107XG4gICAgICAgIHRoaXMuc3Bhd25SZXRyeUF0dGVtcHRzID0gMDtcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMgPSBbXTtcbiAgICAgICAgdGhpcy5pZ25vcmVKZWRpTWVtb3J5Rm9vdHByaW50ID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGlkVXNhZ2VGYWlsdXJlcyA9IHsgdGltZXI6IG5ldyBzdG9wV2F0Y2hfMS5TdG9wV2F0Y2goKSwgY291bnRlcjogMCB9O1xuICAgICAgICB0aGlzLndvcmtzcGFjZVBhdGggPSB3b3Jrc3BhY2VQYXRoO1xuICAgICAgICB0aGlzLnB5dGhvblNldHRpbmdzID0gY29uZmlnU2V0dGluZ3NfMS5QeXRob25TZXR0aW5ncy5nZXRJbnN0YW5jZSh2c2NvZGVfMS5VcmkuZmlsZSh3b3Jrc3BhY2VQYXRoKSk7XG4gICAgICAgIHRoaXMubGFzdEtub3duUHl0aG9uSW50ZXJwcmV0ZXIgPSB0aGlzLnB5dGhvblNldHRpbmdzLnB5dGhvblBhdGg7XG4gICAgICAgIHRoaXMubG9nZ2VyID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JTG9nZ2VyKTtcbiAgICAgICAgdGhpcy5weXRob25TZXR0aW5ncy5vbignY2hhbmdlJywgKCkgPT4gdGhpcy5weXRob25TZXR0aW5nc0NoYW5nZUhhbmRsZXIoKSk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBhc3luY18xLmNyZWF0ZURlZmVycmVkKCk7XG4gICAgICAgIHRoaXMuc3RhcnRMYW5ndWFnZVNlcnZlcigpLnRoZW4oKCkgPT4gdGhpcy5pbml0aWFsaXplZC5yZXNvbHZlKCkpLmlnbm9yZUVycm9ycygpO1xuICAgICAgICB0aGlzLnByb3Bvc2VOZXdMYW5ndWFnZVNlcnZlclBvcHVwID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JUHl0aG9uRXh0ZW5zaW9uQmFubmVyLCB0eXBlc18yLkJBTk5FUl9OQU1FX1BST1BPU0VfTFMpO1xuICAgICAgICB0aGlzLmNoZWNrSmVkaU1lbW9yeUZvb3RwcmludCgpLmlnbm9yZUVycm9ycygpO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0UHJvcGVydHkobywgbmFtZSkge1xuICAgICAgICByZXR1cm4gb1tuYW1lXTtcbiAgICB9XG4gICAgZGlzcG9zZSgpIHtcbiAgICAgICAgdGhpcy5raWxsUHJvY2VzcygpO1xuICAgIH1cbiAgICBnZXROZXh0Q29tbWFuZElkKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNtZElkO1xuICAgICAgICB0aGlzLmNtZElkICs9IDE7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHNlbmRDb21tYW5kKGNtZCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgeWllbGQgdGhpcy5pbml0aWFsaXplZC5wcm9taXNlO1xuICAgICAgICAgICAgeWllbGQgdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQucHJvbWlzZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5wcm9jKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignUHl0aG9uIHByb2Mgbm90IGluaXRpYWxpemVkJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXhlY3V0aW9uQ21kID0gY21kO1xuICAgICAgICAgICAgY29uc3QgcGF5bG9hZCA9IHRoaXMuY3JlYXRlUGF5bG9hZChleGVjdXRpb25DbWQpO1xuICAgICAgICAgICAgZXhlY3V0aW9uQ21kLmRlZmVycmVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Muc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocGF5bG9hZCl9XFxuYCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21tYW5kcy5zZXQoZXhlY3V0aW9uQ21kLmlkLCBleGVjdXRpb25DbWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZFF1ZXVlLnB1c2goZXhlY3V0aW9uQ21kLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgICAgICAgICAgIC8vSWYgJ1RoaXMgc29ja2V0IGlzIGNsb3NlZC4nIHRoYXQgbWVhbnMgcHJvY2VzcyBkaWRuJ3Qgc3RhcnQgYXQgYWxsIChhdCBsZWFzdCBub3QgcHJvcGVybHkpLlxuICAgICAgICAgICAgICAgIGlmIChleC5tZXNzYWdlID09PSAnVGhpcyBzb2NrZXQgaXMgY2xvc2VkLicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsUHJvY2VzcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcignc2VuZENvbW1hbmQnLCBleC5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBleGVjdXRpb25DbWQuZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdGhlIGRpcmVjdG9yeSBzbyB3ZSBjYW4gcmUtc3Bhd24gdGhlIHByb2Nlc3MuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3Bhd25Qcm9jZXNzKHBhdGguam9pbih0aGlzLmV4dGVuc2lvblJvb3REaXIsICdweXRob25GaWxlcycpKVxuICAgICAgICAgICAgLmNhdGNoKGV4ID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkLnJlamVjdChleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdzcGF3blByb2Nlc3MnLCBleCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzaG91bGRDaGVja0plZGlNZW1vcnlGb290cHJpbnQoKSB7XG4gICAgICAgIGlmICh0aGlzLmlnbm9yZUplZGlNZW1vcnlGb290cHJpbnQgfHwgdGhpcy5weXRob25TZXR0aW5ncy5qZWRpTWVtb3J5TGltaXQgPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdENtZElkUHJvY2Vzc2VkRm9yUGlkVXNhZ2UgJiYgdGhpcy5sYXN0Q21kSWRQcm9jZXNzZWQgJiZcbiAgICAgICAgICAgIHRoaXMubGFzdENtZElkUHJvY2Vzc2VkRm9yUGlkVXNhZ2UgPT09IHRoaXMubGFzdENtZElkUHJvY2Vzc2VkKSB7XG4gICAgICAgICAgICAvLyBJZiBubyBtb3JlIGNvbW1hbmRzIHdlcmUgcHJvY2Vzc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUsXG4gICAgICAgICAgICAvLyAgdGhlbiB0aGVyZSdzIG5vIG5lZWQgdG8gY2hlY2sgYWdhaW4uXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNoZWNrSmVkaU1lbW9yeUZvb3RwcmludCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIG1lbW9yeSBmb290cHJpbnQgcGVyaW9kaWNhbGx5LiBEbyBub3QgY2hlY2sgb24gZXZlcnkgcmVxdWVzdCBkdWUgdG9cbiAgICAgICAgICAgIC8vIHRoZSBwZXJmb3JtYW5jZSBpbXBhY3QuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vc295dWthL3BpZHVzYWdlIC0gb24gV2luZG93c1xuICAgICAgICAgICAgLy8gaXQgaXMgdXNpbmcgd21pYyB3aGljaCBtZWFucyBzcGF3bmluZyBjbWQuZXhlIHByb2Nlc3Mgb24gZXZlcnkgcmVxdWVzdC5cbiAgICAgICAgICAgIGlmICh0aGlzLnB5dGhvblNldHRpbmdzLmplZGlNZW1vcnlMaW1pdCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB5aWVsZCB0aGlzLmNoZWNrSmVkaU1lbW9yeUZvb3RwcmludEltcGwoKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5jaGVja0plZGlNZW1vcnlGb290cHJpbnQoKSwgMTUgKiAxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrSmVkaU1lbW9yeUZvb3RwcmludEltcGwoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMucHJvYyB8fCB0aGlzLnByb2Mua2lsbGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZENoZWNrSmVkaU1lbW9yeUZvb3RwcmludCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0Q21kSWRQcm9jZXNzZWRGb3JQaWRVc2FnZSA9IHRoaXMubGFzdENtZElkUHJvY2Vzc2VkO1xuICAgICAgICAgICAgLy8gRG8gbm90IHJ1biBwaWR1c2FnZSBvdmVyIGFuZCBvdmVyLCB3YWl0IGZvciBpdCB0byBmaW5pc2guXG4gICAgICAgICAgICBjb25zdCBkZWZlcnJlZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHBpZHVzYWdlLnN0YXQodGhpcy5wcm9jLnBpZCwgKGVyciwgcmVzdWx0KSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBpZFVzYWdlRmFpbHVyZXMuY291bnRlciArPSAxO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGZ1bmN0aW9uIGZhaWxzIDIgdGltZXMgaW4gdGhlIGxhc3QgNjAgc2Vjb25kcywgbGV0cyBub3QgdHJ5IGV2ZXIgYWdhaW4uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBpZFVzYWdlRmFpbHVyZXMudGltZXIuZWxhcHNlZFRpbWUgPiA2MCAqIDEwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaWdub3JlSmVkaU1lbW9yeUZvb3RwcmludCA9IHRoaXMucGlkVXNhZ2VGYWlsdXJlcy5jb3VudGVyID4gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGlkVXNhZ2VGYWlsdXJlcy5jb3VudGVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGlkVXNhZ2VGYWlsdXJlcy50aW1lci5yZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1B5dGhvbiBFeHRlbnNpb246IChwaWR1c2FnZSknLCBlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGltaXQgPSBNYXRoLm1pbihNYXRoLm1heCh0aGlzLnB5dGhvblNldHRpbmdzLmplZGlNZW1vcnlMaW1pdCwgMTAyNCksIDgxOTIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5tZW1vcnkgPiBsaW1pdCAqIDEwMjQgKiAxMDI0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dXYXJuaW5nKGBJbnRlbGxpU2Vuc2UgcHJvY2VzcyBtZW1vcnkgY29uc3VtcHRpb24gZXhjZWVkZWQgbGltaXQgb2YgJHtsaW1pdH0gTUIgYW5kIHByb2Nlc3Mgd2lsbCBiZSByZXN0YXJ0ZWQuXFxuVGhlIGxpbWl0IGlzIGNvbnRyb2xsZWQgYnkgdGhlICdweXRob24uamVkaU1lbW9yeUxpbWl0JyBzZXR0aW5nLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5yZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHB5dGhvblNldHRpbmdzQ2hhbmdlSGFuZGxlcigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhc3RLbm93blB5dGhvbkludGVycHJldGVyID09PSB0aGlzLnB5dGhvblNldHRpbmdzLnB5dGhvblBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxhc3RLbm93blB5dGhvbkludGVycHJldGVyID0gdGhpcy5weXRob25TZXR0aW5ncy5weXRob25QYXRoO1xuICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMgPSB5aWVsZCB0aGlzLmJ1aWxkQXV0b0NvbXBsZXRlUGF0aHMoKTtcbiAgICAgICAgICAgIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVyKCkuaWdub3JlRXJyb3JzKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbnZpcm9ubWVudFZhcmlhYmxlc0NoYW5nZUhhbmRsZXIoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdBdXRvQ29tbGV0ZVBhdGhzID0geWllbGQgdGhpcy5idWlsZEF1dG9Db21wbGV0ZVBhdGhzKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMuam9pbignLCcpICE9PSBuZXdBdXRvQ29tbGV0ZVBhdGhzLmpvaW4oJywnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbEF1dG9Db21wbGV0ZVBhdGhzID0gbmV3QXV0b0NvbWxldGVQYXRocztcbiAgICAgICAgICAgICAgICB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcigpLmlnbm9yZUVycm9ycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc3RhcnRMYW5ndWFnZVNlcnZlcigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0F1dG9Db21sZXRlUGF0aHMgPSB5aWVsZCB0aGlzLmJ1aWxkQXV0b0NvbXBsZXRlUGF0aHMoKTtcbiAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbEF1dG9Db21wbGV0ZVBhdGhzID0gbmV3QXV0b0NvbWxldGVQYXRocztcbiAgICAgICAgICAgIGlmICghY29uc3RhbnRzXzEuaXNUZXN0RXhlY3V0aW9uKCkpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnByb3Bvc2VOZXdMYW5ndWFnZVNlcnZlclBvcHVwLnNob3dCYW5uZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcigpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVzdGFydExhbmd1YWdlU2VydmVyKCkge1xuICAgICAgICB0aGlzLmtpbGxQcm9jZXNzKCk7XG4gICAgICAgIHRoaXMuY2xlYXJQZW5kaW5nUmVxdWVzdHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICBjbGVhclBlbmRpbmdSZXF1ZXN0cygpIHtcbiAgICAgICAgdGhpcy5jb21tYW5kUXVldWUgPSBbXTtcbiAgICAgICAgdGhpcy5jb21tYW5kcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0uZGVmZXJyZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5jb21tYW5kcy5jbGVhcigpO1xuICAgIH1cbiAgICBraWxsUHJvY2VzcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByb2MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Mua2lsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWVtcHR5XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGV4KSB7IH1cbiAgICAgICAgdGhpcy5wcm9jID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYW5kbGVFcnJvcihzb3VyY2UsIGVycm9yTWVzc2FnZSkge1xuICAgICAgICBsb2dnZXJfMS5Mb2dnZXIuZXJyb3IoYCR7c291cmNlfSBqZWRpUHJveHlgLCBgRXJyb3IgKCR7c291cmNlfSkgJHtlcnJvck1lc3NhZ2V9YCk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxuICAgIHNwYXduUHJvY2Vzcyhjd2QpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZCAmJiAhdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQuY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQucmVqZWN0KG5ldyBFcnJvcignTGFuZ3VhZ2UgU2VydmVyIG5vdCBzdGFydGVkLicpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xuICAgICAgICAgICAgY29uc3QgcHl0aG9uUHJvY2VzcyA9IHlpZWxkIHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JUHl0aG9uRXhlY3V0aW9uRmFjdG9yeSkuY3JlYXRlKHsgcmVzb3VyY2U6IHZzY29kZV8xLlVyaS5maWxlKHRoaXMud29ya3NwYWNlUGF0aCkgfSk7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgcHl0aG9uIHBhdGggaXMgdmFsaWQuXG4gICAgICAgICAgICBpZiAoKHlpZWxkIHB5dGhvblByb2Nlc3MuZ2V0RXhlY3V0YWJsZVBhdGgoKS5jYXRjaCgoKSA9PiAnJykpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBbJ2NvbXBsZXRpb24ucHknXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5weXRob25TZXR0aW5ncy5qZWRpUGF0aCA9PT0gJ3N0cmluZycgJiYgdGhpcy5weXRob25TZXR0aW5ncy5qZWRpUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKCdjdXN0b20nKTtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2godGhpcy5weXRob25TZXR0aW5ncy5qZWRpUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBweXRob25Qcm9jZXNzLmV4ZWNPYnNlcnZhYmxlKGFyZ3MsIHsgY3dkIH0pO1xuICAgICAgICAgICAgdGhpcy5wcm9jID0gcmVzdWx0LnByb2M7XG4gICAgICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB0aGlzLnByb2Mub24oJ2VuZCcsIChlbmQpID0+IHtcbiAgICAgICAgICAgICAgICBsb2dnZXJfMS5Mb2dnZXIuZXJyb3IoJ3NwYXduUHJvY2Vzcy5lbmQnLCBgRW5kIC0gJHtlbmR9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucHJvYy5vbignZXJyb3InLCBlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcignZXJyb3InLCBgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNwYXduUmV0cnlBdHRlbXB0cyArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNwYXduUmV0cnlBdHRlbXB0cyA8IDEwICYmIGVycm9yICYmIGVycm9yLm1lc3NhZ2UgJiZcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IubWVzc2FnZS5pbmRleE9mKCdUaGlzIHNvY2tldCBoYXMgYmVlbiBlbmRlZCBieSB0aGUgb3RoZXIgcGFydHknKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25Qcm9jZXNzKGN3ZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChleCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZC5yZWplY3QoZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcignc3Bhd25Qcm9jZXNzJywgZXgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc3VsdC5vdXQuc3Vic2NyaWJlKG91dHB1dCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG91dHB1dC5zb3VyY2UgPT09ICdzdGRlcnInKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoJ3N0ZGVycicsIG91dHB1dC5vdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IG91dHB1dC5vdXQ7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBvc3NpYmxlIHRoZXJlIHdhcyBhbiBleGNlcHRpb24gaW4gcGFyc2luZyB0aGUgZGF0YSByZXR1cm5lZCxcbiAgICAgICAgICAgICAgICAgICAgLy8gc28gYXBwZW5kIHRoZSBkYXRhIGFuZCB0aGVuIHBhcnNlIGl0LlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gdGhpcy5wcmV2aW91c0RhdGEgPSBgJHt0aGlzLnByZXZpb3VzRGF0YX0ke2RhdGF9YDtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2VzO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VzID0gZGF0YVN0ci5zcGxpdExpbmVzKCkubWFwKHJlc3AgPT4gSlNPTi5wYXJzZShyZXNwKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByZXZpb3VzRGF0YSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUG9zc2libGUgd2UndmUgb25seSByZWNlaXZlZCBwYXJ0IG9mIHRoZSBkYXRhLCBoZW5jZSBkb24ndCBjbGVhciBwcmV2aW91c0RhdGEuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBsb2cgZXJyb3JzIHdoZW4gd2UgaGF2ZW4ndCByZWNlaXZlZCB0aGUgZW50aXJlIHJlc3BvbnNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4Lm1lc3NhZ2UuaW5kZXhPZignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnKSA9PT0gLTEgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleC5tZXNzYWdlLmluZGV4T2YoJ1VuZXhwZWN0ZWQgZW5kIG9mIEpTT04gaW5wdXQnKSA9PT0gLTEgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleC5tZXNzYWdlLmluZGV4T2YoJ1VuZXhwZWN0ZWQgdG9rZW4nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdzdGRvdXQnLCBleC5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZXMuZm9yRWFjaCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZUlkID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAnaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5jb21tYW5kcy5oYXMocmVzcG9uc2VJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbWQgPSB0aGlzLmNvbW1hbmRzLmdldChyZXNwb25zZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY21kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0Q21kSWRQcm9jZXNzZWQgPSBjbWQuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAnYXJndW1lbnRzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbW1hbmRRdWV1ZS5zcGxpY2UodGhpcy5jb21tYW5kUXVldWUuaW5kZXhPZihjbWQuaWQpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbW1hbmRzLmRlbGV0ZShyZXNwb25zZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jb21tYW5kUXVldWUuaW5kZXhPZihjbWQuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21tYW5kUXVldWUuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgY29tbWFuZCBoYXMgZXhwaXJlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbWQudG9rZW4uaXNDYW5jZWxsYXRpb25SZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhZmVSZXNvbHZlKGNtZCwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5nZXRDb21tYW5kSGFuZGxlcihjbWQuY29tbWFuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBjbWQsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRvbyBtYW55IHBlbmRpbmcgcmVxdWVzdHMuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrUXVldWVMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZXJyb3IgPT4gdGhpcy5oYW5kbGVFcnJvcignc3Vic2NyaXB0aW9uLmVycm9yJywgYCR7ZXJyb3J9YCkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0Q29tbWFuZEhhbmRsZXIoY29tbWFuZCkge1xuICAgICAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQ29tcGxldGlvbnM6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Db21wbGV0aW9uO1xuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5EZWZpbml0aW9uczpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRlZmluaXRpb247XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkhvdmVyOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uSG92ZXI7XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlN5bWJvbHM6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25TeW1ib2xzO1xuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Vc2FnZXM6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Vc2FnZXM7XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkFyZ3VtZW50czpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkFyZ3VtZW50cztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuICAgIG9uQ29tcGxldGlvbihjb21tYW5kLCByZXNwb25zZSkge1xuICAgICAgICBsZXQgcmVzdWx0cyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcbiAgICAgICAgcmVzdWx0cyA9IEFycmF5LmlzQXJyYXkocmVzdWx0cykgPyByZXN1bHRzIDogW107XG4gICAgICAgIHJlc3VsdHMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZSA9IGl0ZW0udHlwZTtcbiAgICAgICAgICAgIGl0ZW0udHlwZSA9IGdldE1hcHBlZFZTQ29kZVR5cGUob3JpZ2luYWxUeXBlKTtcbiAgICAgICAgICAgIGl0ZW0ua2luZCA9IGdldE1hcHBlZFZTQ29kZVN5bWJvbChvcmlnaW5hbFR5cGUpO1xuICAgICAgICAgICAgaXRlbS5yYXdUeXBlID0gZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgY29tcGxldGlvblJlc3VsdCA9IHtcbiAgICAgICAgICAgIGl0ZW1zOiByZXN1bHRzLFxuICAgICAgICAgICAgcmVxdWVzdElkOiBjb21tYW5kLmlkXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgY29tcGxldGlvblJlc3VsdCk7XG4gICAgfVxuICAgIG9uRGVmaW5pdGlvbihjb21tYW5kLCByZXNwb25zZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgIGNvbnN0IGRlZnMgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdyZXN1bHRzJyk7XG4gICAgICAgIGNvbnN0IGRlZlJlc3VsdCA9IHtcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcbiAgICAgICAgICAgIGRlZmluaXRpb25zOiBbXVxuICAgICAgICB9O1xuICAgICAgICBpZiAoZGVmcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkZWZSZXN1bHQuZGVmaW5pdGlvbnMgPSBkZWZzLm1hcChkZWYgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZSA9IGRlZi50eXBlO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBkZWYuZmlsZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGRlZi50ZXh0LFxuICAgICAgICAgICAgICAgICAgICByYXdUeXBlOiBvcmlnaW5hbFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGdldE1hcHBlZFZTQ29kZVR5cGUob3JpZ2luYWxUeXBlKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogZ2V0TWFwcGVkVlNDb2RlU3ltYm9sKG9yaWdpbmFsVHlwZSksXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogZGVmLmNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluZTogZGVmLnJhbmdlLnN0YXJ0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogZGVmLnJhbmdlLnN0YXJ0X2NvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZExpbmU6IGRlZi5yYW5nZS5lbmRfbGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZENvbHVtbjogZGVmLnJhbmdlLmVuZF9jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNhZmVSZXNvbHZlKGNvbW1hbmQsIGRlZlJlc3VsdCk7XG4gICAgfVxuICAgIG9uSG92ZXIoY29tbWFuZCwgcmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICBjb25zdCBkZWZzID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAncmVzdWx0cycpO1xuICAgICAgICBjb25zdCBkZWZSZXN1bHQgPSB7XG4gICAgICAgICAgICByZXF1ZXN0SWQ6IGNvbW1hbmQuaWQsXG4gICAgICAgICAgICBpdGVtczogZGVmcy5tYXAoZGVmID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBraW5kOiBnZXRNYXBwZWRWU0NvZGVTeW1ib2woZGVmLnR5cGUpLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZGVmLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICBzaWduYXR1cmU6IGRlZi5zaWduYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgIGRvY3N0cmluZzogZGVmLmRvY3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZGVmLnRleHRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCBkZWZSZXN1bHQpO1xuICAgIH1cbiAgICBvblN5bWJvbHMoY29tbWFuZCwgcmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICBsZXQgZGVmcyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcbiAgICAgICAgZGVmcyA9IEFycmF5LmlzQXJyYXkoZGVmcykgPyBkZWZzIDogW107XG4gICAgICAgIGNvbnN0IGRlZlJlc3VsdHMgPSB7XG4gICAgICAgICAgICByZXF1ZXN0SWQ6IGNvbW1hbmQuaWQsXG4gICAgICAgICAgICBkZWZpbml0aW9uczogW11cbiAgICAgICAgfTtcbiAgICAgICAgZGVmUmVzdWx0cy5kZWZpbml0aW9ucyA9IGRlZnMubWFwKGRlZiA9PiB7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbFR5cGUgPSBkZWYudHlwZTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZmlsZU5hbWU6IGRlZi5maWxlTmFtZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBkZWYudGV4dCxcbiAgICAgICAgICAgICAgICByYXdUeXBlOiBvcmlnaW5hbFR5cGUsXG4gICAgICAgICAgICAgICAgdHlwZTogZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpLFxuICAgICAgICAgICAgICAgIGtpbmQ6IGdldE1hcHBlZFZTQ29kZVN5bWJvbChvcmlnaW5hbFR5cGUpLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogZGVmLmNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICByYW5nZToge1xuICAgICAgICAgICAgICAgICAgICBzdGFydExpbmU6IGRlZi5yYW5nZS5zdGFydF9saW5lLFxuICAgICAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogZGVmLnJhbmdlLnN0YXJ0X2NvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgZW5kTGluZTogZGVmLnJhbmdlLmVuZF9saW5lLFxuICAgICAgICAgICAgICAgICAgICBlbmRDb2x1bW46IGRlZi5yYW5nZS5lbmRfY29sdW1uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgZGVmUmVzdWx0cyk7XG4gICAgfVxuICAgIG9uVXNhZ2VzKGNvbW1hbmQsIHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgbGV0IGRlZnMgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdyZXN1bHRzJyk7XG4gICAgICAgIGRlZnMgPSBBcnJheS5pc0FycmF5KGRlZnMpID8gZGVmcyA6IFtdO1xuICAgICAgICBjb25zdCByZWZSZXN1bHQgPSB7XG4gICAgICAgICAgICByZXF1ZXN0SWQ6IGNvbW1hbmQuaWQsXG4gICAgICAgICAgICByZWZlcmVuY2VzOiBkZWZzLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBjb2x1bW5JbmRleDogaXRlbS5jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBpdGVtLmZpbGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICBsaW5lSW5kZXg6IGl0ZW0ubGluZSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWU6IGl0ZW0ubW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgcmVmUmVzdWx0KTtcbiAgICB9XG4gICAgb25Bcmd1bWVudHMoY29tbWFuZCwgcmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICBjb25zdCBkZWZzID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAncmVzdWx0cycpO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tb2JqZWN0LWxpdGVyYWwtdHlwZS1hc3NlcnRpb25cbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCB7XG4gICAgICAgICAgICByZXF1ZXN0SWQ6IGNvbW1hbmQuaWQsXG4gICAgICAgICAgICBkZWZpbml0aW9uczogZGVmc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2hlY2tRdWV1ZUxlbmd0aCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29tbWFuZFF1ZXVlLmxlbmd0aCA+IDEwKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuY29tbWFuZFF1ZXVlLnNwbGljZSgwLCB0aGlzLmNvbW1hbmRRdWV1ZS5sZW5ndGggLSAxMCk7XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNtZDEgPSB0aGlzLmNvbW1hbmRzLmdldChpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhZmVSZXNvbHZlKGNtZDEsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZHMuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBjcmVhdGVQYXlsb2FkKGNtZCkge1xuICAgICAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICAgICAgaWQ6IGNtZC5pZCxcbiAgICAgICAgICAgIHByZWZpeDogJycsXG4gICAgICAgICAgICBsb29rdXA6IGNvbW1hbmROYW1lcy5nZXQoY21kLmNvbW1hbmQpLFxuICAgICAgICAgICAgcGF0aDogY21kLmZpbGVOYW1lLFxuICAgICAgICAgICAgc291cmNlOiBjbWQuc291cmNlLFxuICAgICAgICAgICAgbGluZTogY21kLmxpbmVJbmRleCxcbiAgICAgICAgICAgIGNvbHVtbjogY21kLmNvbHVtbkluZGV4LFxuICAgICAgICAgICAgY29uZmlnOiB0aGlzLmdldENvbmZpZygpXG4gICAgICAgIH07XG4gICAgICAgIGlmIChjbWQuY29tbWFuZCA9PT0gQ29tbWFuZFR5cGUuU3ltYm9scykge1xuICAgICAgICAgICAgZGVsZXRlIHBheWxvYWQuY29sdW1uO1xuICAgICAgICAgICAgZGVsZXRlIHBheWxvYWQubGluZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGF5bG9hZDtcbiAgICB9XG4gICAgZ2V0UGF0aEZyb21QeXRob25Db21tYW5kKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHl0aG9uUHJvY2VzcyA9IHlpZWxkIHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JUHl0aG9uRXhlY3V0aW9uRmFjdG9yeSkuY3JlYXRlKHsgcmVzb3VyY2U6IHZzY29kZV8xLlVyaS5maWxlKHRoaXMud29ya3NwYWNlUGF0aCkgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0geWllbGQgcHl0aG9uUHJvY2Vzcy5leGVjKGFyZ3MsIHsgY3dkOiB0aGlzLndvcmtzcGFjZVBhdGggfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluZXMgPSByZXN1bHQuc3Rkb3V0LnRyaW0oKS5zcGxpdExpbmVzKCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IHlpZWxkIGZzLnBhdGhFeGlzdHMobGluZXNbMF0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBleGlzdHMgPyBsaW5lc1swXSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKF9hKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgYnVpbGRBdXRvQ29tcGxldGVQYXRocygpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoUHJvbWlzZXMgPSBbXG4gICAgICAgICAgICAgICAgLy8gU3lzcHJlZml4LlxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0UGF0aEZyb21QeXRob25Db21tYW5kKFsnLWMnLCAnaW1wb3J0IHN5cztwcmludChzeXMucHJlZml4KSddKS5jYXRjaCgoKSA9PiAnJyksXG4gICAgICAgICAgICAgICAgLy8gZXhldWN1dGFibGUgcGF0aC5cbiAgICAgICAgICAgICAgICB0aGlzLmdldFBhdGhGcm9tUHl0aG9uQ29tbWFuZChbJy1jJywgJ2ltcG9ydCBzeXM7cHJpbnQoc3lzLmV4ZWN1dGFibGUpJ10pLnRoZW4oZXhlY1BhdGggPT4gcGF0aC5kaXJuYW1lKGV4ZWNQYXRoKSkuY2F0Y2goKCkgPT4gJycpLFxuICAgICAgICAgICAgICAgIC8vIFB5dGhvbiBzcGVjaWZpYyBzaXRlIHBhY2thZ2VzLlxuICAgICAgICAgICAgICAgIC8vIE9uIHdpbmRvd3Mgd2UgYWxzbyBuZWVkIHRoZSBsaWJzIHBhdGggKHNlY29uZCBpdGVtIHdpbGwgcmV0dXJuIGM6XFx4eHhcXGxpYlxcc2l0ZS1wYWNrYWdlcykuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyByZXR1cm5lZCBieSBcImZyb20gZGlzdHV0aWxzLnN5c2NvbmZpZyBpbXBvcnQgZ2V0X3B5dGhvbl9saWI7IHByaW50KGdldF9weXRob25fbGliKCkpXCIuXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRQYXRoRnJvbVB5dGhvbkNvbW1hbmQoWyctYycsICdmcm9tIGRpc3R1dGlscy5zeXNjb25maWcgaW1wb3J0IGdldF9weXRob25fbGliOyBwcmludChnZXRfcHl0aG9uX2xpYigpKSddKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihsaWJQYXRoID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT24gd2luZG93cyB3ZSBhbHNvIG5lZWQgdGhlIGxpYnMgcGF0aCAoc2Vjb25kIGl0ZW0gd2lsbCByZXR1cm4gYzpcXHh4eFxcbGliXFxzaXRlLXBhY2thZ2VzKS5cbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyByZXR1cm5lZCBieSBcImZyb20gZGlzdHV0aWxzLnN5c2NvbmZpZyBpbXBvcnQgZ2V0X3B5dGhvbl9saWI7IHByaW50KGdldF9weXRob25fbGliKCkpXCIuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoSVNfV0lORE9XUyAmJiBsaWJQYXRoLmxlbmd0aCA+IDApID8gcGF0aC5qb2luKGxpYlBhdGgsICcuLicpIDogbGliUGF0aDtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gJycpLFxuICAgICAgICAgICAgICAgIC8vIFB5dGhvbiBnbG9iYWwgc2l0ZSBwYWNrYWdlcywgYXMgYSBmYWxsYmFjayBpbiBjYXNlIHVzZXIgaGFzbid0IGluc3RhbGxlZCB0aGVtIGluIGN1c3RvbSBlbnZpcm9ubWVudC5cbiAgICAgICAgICAgICAgICB0aGlzLmdldFBhdGhGcm9tUHl0aG9uQ29tbWFuZChbJy1tJywgJ3NpdGUnLCAnLS11c2VyLXNpdGUnXSkuY2F0Y2goKCkgPT4gJycpXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBweXRob25QYXRocyA9IHlpZWxkIHRoaXMuZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcigpLmdldEVudmlyb25tZW50VmFyaWFibGVzKHZzY29kZV8xLlVyaS5maWxlKHRoaXMud29ya3NwYWNlUGF0aCkpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGN1c3RvbUVudmlyb25tZW50VmFycyA9PiBjdXN0b21FbnZpcm9ubWVudFZhcnMgPyBKZWRpUHJveHkuZ2V0UHJvcGVydHkoY3VzdG9tRW52aXJvbm1lbnRWYXJzLCAnUFlUSE9OUEFUSCcpIDogJycpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKHB5dGhvblBhdGggPT4gKHR5cGVvZiBweXRob25QYXRoID09PSAnc3RyaW5nJyAmJiBweXRob25QYXRoLnRyaW0oKS5sZW5ndGggPiAwKSA/IHB5dGhvblBhdGgudHJpbSgpIDogJycpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKHB5dGhvblBhdGggPT4gcHl0aG9uUGF0aC5zcGxpdChwYXRoLmRlbGltaXRlcikuZmlsdGVyKGl0ZW0gPT4gaXRlbS50cmltKCkubGVuZ3RoID4gMCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkUGF0aHMgPSBweXRob25QYXRoc1xuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHB5dGhvblBhdGggPT4gIXBhdGguaXNBYnNvbHV0ZShweXRob25QYXRoKSlcbiAgICAgICAgICAgICAgICAgICAgLm1hcChweXRob25QYXRoID0+IHBhdGgucmVzb2x2ZSh0aGlzLndvcmtzcGFjZVBhdGgsIHB5dGhvblBhdGgpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aHMgPSB5aWVsZCBQcm9taXNlLmFsbChmaWxlUGF0aFByb21pc2VzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZVBhdGhzLmNvbmNhdCguLi5weXRob25QYXRocywgLi4ucmVzb2x2ZWRQYXRocykuZmlsdGVyKHAgPT4gcC5sZW5ndGggPiAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1B5dGhvbiBFeHRlbnNpb246IGplZGlQcm94eS5maWxlUGF0aHMnLCBleCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JRW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcik7XG4gICAgICAgICAgICB0aGlzLmVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIub25EaWRFbnZpcm9ubWVudFZhcmlhYmxlc0NoYW5nZSh0aGlzLmVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlSGFuZGxlci5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5lbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyO1xuICAgIH1cbiAgICBnZXRDb25maWcoKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBwYXRocyByZWxhdGl2ZSB0byB3b3Jrc3BhY2UuXG4gICAgICAgIGNvbnN0IGV4dHJhUGF0aHMgPSB0aGlzLnB5dGhvblNldHRpbmdzLmF1dG9Db21wbGV0ZSA/XG4gICAgICAgICAgICB0aGlzLnB5dGhvblNldHRpbmdzLmF1dG9Db21wbGV0ZS5leHRyYVBhdGhzLm1hcChleHRyYVBhdGggPT4ge1xuICAgICAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoZXh0cmFQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXh0cmFQYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMud29ya3NwYWNlUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMud29ya3NwYWNlUGF0aCwgZXh0cmFQYXRoKTtcbiAgICAgICAgICAgIH0pIDogW107XG4gICAgICAgIC8vIEFsd2F5cyBhZGQgd29ya3NwYWNlIHBhdGggaW50byBleHRyYSBwYXRocy5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLndvcmtzcGFjZVBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBleHRyYVBhdGhzLnVuc2hpZnQodGhpcy53b3Jrc3BhY2VQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXN0aW5jdEV4dHJhUGF0aHMgPSBleHRyYVBhdGhzLmNvbmNhdCh0aGlzLmFkZGl0aW9uYWxBdXRvQ29tcGxldGVQYXRocylcbiAgICAgICAgICAgIC5maWx0ZXIodmFsdWUgPT4gdmFsdWUubGVuZ3RoID4gMClcbiAgICAgICAgICAgIC5maWx0ZXIoKHZhbHVlLCBpbmRleCwgc2VsZikgPT4gc2VsZi5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXh0cmFQYXRoczogZGlzdGluY3RFeHRyYVBhdGhzLFxuICAgICAgICAgICAgdXNlU25pcHBldHM6IGZhbHNlLFxuICAgICAgICAgICAgY2FzZUluc2Vuc2l0aXZlQ29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIHNob3dEZXNjcmlwdGlvbnM6IHRydWUsXG4gICAgICAgICAgICBmdXp6eU1hdGNoZXI6IHRydWVcbiAgICAgICAgfTtcbiAgICB9XG4gICAgc2FmZVJlc29sdmUoY29tbWFuZCwgcmVzdWx0KSB7XG4gICAgICAgIGlmIChjb21tYW5kICYmIGNvbW1hbmQuZGVmZXJyZWQpIHtcbiAgICAgICAgICAgIGNvbW1hbmQuZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuX19kZWNvcmF0ZShbXG4gICAgZGVjb3JhdG9yc18xLnN3YWxsb3dFeGNlcHRpb25zKCdKZWRpUHJveHknKVxuXSwgSmVkaVByb3h5LnByb3RvdHlwZSwgXCJweXRob25TZXR0aW5nc0NoYW5nZUhhbmRsZXJcIiwgbnVsbCk7XG5fX2RlY29yYXRlKFtcbiAgICBkZWNvcmF0b3JzXzEuZGVib3VuY2UoMTUwMCksXG4gICAgZGVjb3JhdG9yc18xLnN3YWxsb3dFeGNlcHRpb25zKCdKZWRpUHJveHknKVxuXSwgSmVkaVByb3h5LnByb3RvdHlwZSwgXCJlbnZpcm9ubWVudFZhcmlhYmxlc0NoYW5nZUhhbmRsZXJcIiwgbnVsbCk7XG5fX2RlY29yYXRlKFtcbiAgICBkZWNvcmF0b3JzXzEuc3dhbGxvd0V4Y2VwdGlvbnMoJ0plZGlQcm94eScpXG5dLCBKZWRpUHJveHkucHJvdG90eXBlLCBcInN0YXJ0TGFuZ3VhZ2VTZXJ2ZXJcIiwgbnVsbCk7XG5leHBvcnRzLkplZGlQcm94eSA9IEplZGlQcm94eTtcbmNsYXNzIEplZGlQcm94eUhhbmRsZXIge1xuICAgIGNvbnN0cnVjdG9yKGplZGlQcm94eSkge1xuICAgICAgICB0aGlzLmplZGlQcm94eSA9IGplZGlQcm94eTtcbiAgICAgICAgdGhpcy5jb21tYW5kQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2VzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICBnZXQgSmVkaVByb3h5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5qZWRpUHJveHk7XG4gICAgfVxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmplZGlQcm94eSkge1xuICAgICAgICAgICAgdGhpcy5qZWRpUHJveHkuZGlzcG9zZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlbmRDb21tYW5kKGNtZCwgdG9rZW4pIHtcbiAgICAgICAgY29uc3QgZXhlY3V0aW9uQ21kID0gY21kO1xuICAgICAgICBleGVjdXRpb25DbWQuaWQgPSBleGVjdXRpb25DbWQuaWQgfHwgdGhpcy5qZWRpUHJveHkuZ2V0TmV4dENvbW1hbmRJZCgpO1xuICAgICAgICBpZiAodGhpcy5jb21tYW5kQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2VzLmhhcyhjbWQuY29tbWFuZCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0ID0gdGhpcy5jb21tYW5kQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2VzLmdldChjbWQuY29tbWFuZCk7XG4gICAgICAgICAgICBpZiAoY3QpIHtcbiAgICAgICAgICAgICAgICBjdC5jYW5jZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYW5jZWxsYXRpb24gPSBuZXcgdnNjb2RlXzEuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKTtcbiAgICAgICAgdGhpcy5jb21tYW5kQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2VzLnNldChjbWQuY29tbWFuZCwgY2FuY2VsbGF0aW9uKTtcbiAgICAgICAgZXhlY3V0aW9uQ21kLnRva2VuID0gY2FuY2VsbGF0aW9uLnRva2VuO1xuICAgICAgICByZXR1cm4gdGhpcy5qZWRpUHJveHkuc2VuZENvbW1hbmQoZXhlY3V0aW9uQ21kKVxuICAgICAgICAgICAgLmNhdGNoKHJlYXNvbiA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHJlYXNvbik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2VuZENvbW1hbmROb25DYW5jZWxsYWJsZUNvbW1hbmQoY21kLCB0b2tlbikge1xuICAgICAgICBjb25zdCBleGVjdXRpb25DbWQgPSBjbWQ7XG4gICAgICAgIGV4ZWN1dGlvbkNtZC5pZCA9IGV4ZWN1dGlvbkNtZC5pZCB8fCB0aGlzLmplZGlQcm94eS5nZXROZXh0Q29tbWFuZElkKCk7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgZXhlY3V0aW9uQ21kLnRva2VuID0gdG9rZW47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuamVkaVByb3h5LnNlbmRDb21tYW5kKGV4ZWN1dGlvbkNtZClcbiAgICAgICAgICAgIC5jYXRjaChyZWFzb24gPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZWFzb24pO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5KZWRpUHJveHlIYW5kbGVyID0gSmVkaVByb3h5SGFuZGxlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWplZGlQcm94eS5qcy5tYXAiXX0=