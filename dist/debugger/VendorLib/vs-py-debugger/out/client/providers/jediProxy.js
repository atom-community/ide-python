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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImplZGlQcm94eS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImZzIiwicmVxdWlyZSIsInBhdGgiLCJwaWR1c2FnZSIsInZzY29kZV8xIiwiY29uZmlnU2V0dGluZ3NfMSIsImNvbnN0YW50c18xIiwidHlwZXNfMSIsInR5cGVzXzIiLCJhc3luY18xIiwiZGVjb3JhdG9yc18xIiwic3RvcFdhdGNoXzEiLCJ0eXBlc18zIiwibG9nZ2VyXzEiLCJJU19XSU5ET1dTIiwidGVzdCIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncyIsIk1hcCIsInNldCIsIkNvbXBsZXRpb25JdGVtS2luZCIsIlZhbHVlIiwiQ2xhc3MiLCJGdW5jdGlvbiIsIlJlZmVyZW5jZSIsIk1ldGhvZCIsIk1vZHVsZSIsIkZpbGUiLCJQcm9wZXJ0eSIsIktleXdvcmQiLCJWYXJpYWJsZSIsInB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzIiwiU3ltYm9sS2luZCIsIkFycmF5IiwiQ29uc3RhbnQiLCJCb29sZWFuIiwiTnVtYmVyIiwiU3RyaW5nIiwiZ2V0TWFwcGVkVlNDb2RlVHlwZSIsInB5dGhvblR5cGUiLCJoYXMiLCJnZXQiLCJnZXRNYXBwZWRWU0NvZGVTeW1ib2wiLCJDb21tYW5kVHlwZSIsImNvbW1hbmROYW1lcyIsIkFyZ3VtZW50cyIsIkNvbXBsZXRpb25zIiwiRGVmaW5pdGlvbnMiLCJIb3ZlciIsIlVzYWdlcyIsIlN5bWJvbHMiLCJKZWRpUHJveHkiLCJjb25zdHJ1Y3RvciIsImV4dGVuc2lvblJvb3REaXIiLCJ3b3Jrc3BhY2VQYXRoIiwic2VydmljZUNvbnRhaW5lciIsImNtZElkIiwicHJldmlvdXNEYXRhIiwiY29tbWFuZHMiLCJjb21tYW5kUXVldWUiLCJzcGF3blJldHJ5QXR0ZW1wdHMiLCJhZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMiLCJpZ25vcmVKZWRpTWVtb3J5Rm9vdHByaW50IiwicGlkVXNhZ2VGYWlsdXJlcyIsInRpbWVyIiwiU3RvcFdhdGNoIiwiY291bnRlciIsInB5dGhvblNldHRpbmdzIiwiUHl0aG9uU2V0dGluZ3MiLCJnZXRJbnN0YW5jZSIsIlVyaSIsImZpbGUiLCJsYXN0S25vd25QeXRob25JbnRlcnByZXRlciIsInB5dGhvblBhdGgiLCJsb2dnZXIiLCJJTG9nZ2VyIiwib24iLCJweXRob25TZXR0aW5nc0NoYW5nZUhhbmRsZXIiLCJpbml0aWFsaXplZCIsImNyZWF0ZURlZmVycmVkIiwic3RhcnRMYW5ndWFnZVNlcnZlciIsImlnbm9yZUVycm9ycyIsInByb3Bvc2VOZXdMYW5ndWFnZVNlcnZlclBvcHVwIiwiSVB5dGhvbkV4dGVuc2lvbkJhbm5lciIsIkJBTk5FUl9OQU1FX1BST1BPU0VfTFMiLCJjaGVja0plZGlNZW1vcnlGb290cHJpbnQiLCJnZXRQcm9wZXJ0eSIsIm8iLCJuYW1lIiwiZGlzcG9zZSIsImtpbGxQcm9jZXNzIiwiZ2V0TmV4dENvbW1hbmRJZCIsInNlbmRDb21tYW5kIiwiY21kIiwicHJvbWlzZSIsImxhbmd1YWdlU2VydmVyU3RhcnRlZCIsInByb2MiLCJFcnJvciIsImV4ZWN1dGlvbkNtZCIsInBheWxvYWQiLCJjcmVhdGVQYXlsb2FkIiwiZGVmZXJyZWQiLCJzdGRpbiIsIndyaXRlIiwiSlNPTiIsInN0cmluZ2lmeSIsImlkIiwicHVzaCIsImV4IiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImhhbmRsZUVycm9yIiwiaW5pdGlhbGl6ZSIsInNwYXduUHJvY2VzcyIsImpvaW4iLCJjYXRjaCIsInNob3VsZENoZWNrSmVkaU1lbW9yeUZvb3RwcmludCIsImplZGlNZW1vcnlMaW1pdCIsImxhc3RDbWRJZFByb2Nlc3NlZEZvclBpZFVzYWdlIiwibGFzdENtZElkUHJvY2Vzc2VkIiwiY2hlY2tKZWRpTWVtb3J5Rm9vdHByaW50SW1wbCIsInNldFRpbWVvdXQiLCJraWxsZWQiLCJzdGF0IiwicGlkIiwiZXJyIiwiZWxhcHNlZFRpbWUiLCJyZXNldCIsImxpbWl0IiwiTWF0aCIsIm1pbiIsIm1heCIsIm1lbW9yeSIsImxvZ1dhcm5pbmciLCJyZXN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIiLCJidWlsZEF1dG9Db21wbGV0ZVBhdGhzIiwiZW52aXJvbm1lbnRWYXJpYWJsZXNDaGFuZ2VIYW5kbGVyIiwibmV3QXV0b0NvbWxldGVQYXRocyIsImlzVGVzdEV4ZWN1dGlvbiIsInNob3dCYW5uZXIiLCJjbGVhclBlbmRpbmdSZXF1ZXN0cyIsImZvckVhY2giLCJpdGVtIiwidW5kZWZpbmVkIiwiY2xlYXIiLCJraWxsIiwic291cmNlIiwiZXJyb3JNZXNzYWdlIiwiTG9nZ2VyIiwiY3dkIiwiY29tcGxldGVkIiwicHl0aG9uUHJvY2VzcyIsIklQeXRob25FeGVjdXRpb25GYWN0b3J5IiwiY3JlYXRlIiwicmVzb3VyY2UiLCJnZXRFeGVjdXRhYmxlUGF0aCIsImFyZ3MiLCJqZWRpUGF0aCIsImV4ZWNPYnNlcnZhYmxlIiwiZW5kIiwiaW5kZXhPZiIsIm91dCIsInN1YnNjcmliZSIsIm91dHB1dCIsImRhdGEiLCJkYXRhU3RyIiwicmVzcG9uc2VzIiwic3BsaXRMaW5lcyIsIm1hcCIsInJlc3AiLCJwYXJzZSIsInJlc3BvbnNlIiwicmVzcG9uc2VJZCIsInNwbGljZSIsImRlbGV0ZSIsImluZGV4IiwidG9rZW4iLCJpc0NhbmNlbGxhdGlvblJlcXVlc3RlZCIsInNhZmVSZXNvbHZlIiwiaGFuZGxlciIsImdldENvbW1hbmRIYW5kbGVyIiwiY29tbWFuZCIsImNhbGwiLCJjaGVja1F1ZXVlTGVuZ3RoIiwib25Db21wbGV0aW9uIiwib25EZWZpbml0aW9uIiwib25Ib3ZlciIsIm9uU3ltYm9scyIsIm9uVXNhZ2VzIiwib25Bcmd1bWVudHMiLCJyZXN1bHRzIiwiaXNBcnJheSIsIm9yaWdpbmFsVHlwZSIsInR5cGUiLCJraW5kIiwicmF3VHlwZSIsImNvbXBsZXRpb25SZXN1bHQiLCJpdGVtcyIsInJlcXVlc3RJZCIsImRlZnMiLCJkZWZSZXN1bHQiLCJkZWZpbml0aW9ucyIsImRlZiIsImZpbGVOYW1lIiwidGV4dCIsImNvbnRhaW5lciIsInJhbmdlIiwic3RhcnRMaW5lIiwic3RhcnRfbGluZSIsInN0YXJ0Q29sdW1uIiwic3RhcnRfY29sdW1uIiwiZW5kTGluZSIsImVuZF9saW5lIiwiZW5kQ29sdW1uIiwiZW5kX2NvbHVtbiIsImRlc2NyaXB0aW9uIiwic2lnbmF0dXJlIiwiZG9jc3RyaW5nIiwiZGVmUmVzdWx0cyIsInJlZlJlc3VsdCIsInJlZmVyZW5jZXMiLCJjb2x1bW5JbmRleCIsImNvbHVtbiIsImxpbmVJbmRleCIsImxpbmUiLCJtb2R1bGVOYW1lIiwiY21kMSIsInByZWZpeCIsImxvb2t1cCIsImNvbmZpZyIsImdldENvbmZpZyIsImdldFBhdGhGcm9tUHl0aG9uQ29tbWFuZCIsImV4ZWMiLCJsaW5lcyIsInN0ZG91dCIsInRyaW0iLCJleGlzdHMiLCJwYXRoRXhpc3RzIiwiX2EiLCJmaWxlUGF0aFByb21pc2VzIiwiZXhlY1BhdGgiLCJkaXJuYW1lIiwibGliUGF0aCIsInB5dGhvblBhdGhzIiwiZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlciIsImdldEVudmlyb25tZW50VmFyaWFibGVzIiwiY3VzdG9tRW52aXJvbm1lbnRWYXJzIiwic3BsaXQiLCJkZWxpbWl0ZXIiLCJmaWx0ZXIiLCJyZXNvbHZlZFBhdGhzIiwiaXNBYnNvbHV0ZSIsImZpbGVQYXRocyIsImFsbCIsImNvbmNhdCIsInAiLCJlbnZpcm9ubWVudFZhcmlhYmxlc1Byb3ZpZGVyIiwiSUVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIiLCJvbkRpZEVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlIiwiYmluZCIsImV4dHJhUGF0aHMiLCJhdXRvQ29tcGxldGUiLCJleHRyYVBhdGgiLCJ1bnNoaWZ0IiwiZGlzdGluY3RFeHRyYVBhdGhzIiwic2VsZiIsInVzZVNuaXBwZXRzIiwiY2FzZUluc2Vuc2l0aXZlQ29tcGxldGlvbiIsInNob3dEZXNjcmlwdGlvbnMiLCJmdXp6eU1hdGNoZXIiLCJzd2FsbG93RXhjZXB0aW9ucyIsInByb3RvdHlwZSIsImRlYm91bmNlIiwiSmVkaVByb3h5SGFuZGxlciIsImplZGlQcm94eSIsImNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMiLCJjdCIsImNhbmNlbCIsImNhbmNlbGxhdGlvbiIsIkNhbmNlbGxhdGlvblRva2VuU291cmNlIiwicmVhc29uIiwic2VuZENvbW1hbmROb25DYW5jZWxsYWJsZUNvbW1hbmQiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8s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OUQ7QUFDQVEsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkosUUFBL0Q7QUFDQUcsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFFBQS9CLEVBQXlDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQk4sTUFBN0Q7QUFDQUssMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFNBQS9CLEVBQTBDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBOUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkUsUUFBL0Q7QUFDQUgsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBL0Q7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBNUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBNUQ7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFdBQS9CLEVBQTRDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkYsUUFBaEU7QUFDQUMsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFNBQS9CLEVBQTBDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkcsT0FBOUQ7QUFDQUosMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLEtBQS9CLEVBQXNDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFBMUQ7QUFDQUwsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLFVBQS9CLEVBQTJDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFBL0Q7QUFDQUwsMEJBQTBCLENBQUNaLEdBQTNCLENBQStCLE9BQS9CLEVBQXdDaEIsUUFBUSxDQUFDNkIsVUFBVCxDQUFvQkksTUFB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S0FBSixFQUFXO0FBQ1AvRSxNQUFBQSxZQUFZLENBQUMrRSxLQUFiLEdBQXFCQSxLQUFyQjtBQUNIOztBQUNELFdBQU8sS0FBS2tHLFNBQUwsQ0FBZXZMLFdBQWYsQ0FBMkJNLFlBQTNCLEVBQ0ZrQixLQURFLENBQ0lxSyxNQUFNLElBQUk7QUFDakI1SyxNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYzJLLE1BQWQ7QUFDQSxhQUFPekksU0FBUDtBQUNILEtBSk0sQ0FBUDtBQUtIOztBQTFDa0I7O0FBNEN2QmxKLE9BQU8sQ0FBQ29SLGdCQUFSLEdBQTJCQSxnQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmcy1leHRyYVwiKTtcclxuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5jb25zdCBwaWR1c2FnZSA9IHJlcXVpcmUoXCJwaWR1c2FnZVwiKTtcclxuY29uc3QgdnNjb2RlXzEgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xyXG5jb25zdCBjb25maWdTZXR0aW5nc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9jb25maWdTZXR0aW5nc1wiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2NvbnN0YW50c1wiKTtcclxucmVxdWlyZShcIi4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9wcm9jZXNzL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uL2NvbW1vbi90eXBlc1wiKTtcclxuY29uc3QgYXN5bmNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHMvYXN5bmNcIik7XHJcbmNvbnN0IGRlY29yYXRvcnNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHMvZGVjb3JhdG9yc1wiKTtcclxuY29uc3Qgc3RvcFdhdGNoXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3V0aWxzL3N0b3BXYXRjaFwiKTtcclxuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuLi9jb21tb24vdmFyaWFibGVzL3R5cGVzXCIpO1xyXG5jb25zdCBsb2dnZXJfMSA9IHJlcXVpcmUoXCIuLy4uL2NvbW1vbi9sb2dnZXJcIik7XHJcbmNvbnN0IElTX1dJTkRPV1MgPSAvXndpbi8udGVzdChwcm9jZXNzLnBsYXRmb3JtKTtcclxuY29uc3QgcHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzID0gbmV3IE1hcCgpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdub25lJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlZhbHVlKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgndHlwZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3R1cGxlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZGljdCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2RpY3Rpb25hcnknLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdmdW5jdGlvbicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2xhbWJkYScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2dlbmVyYXRvcicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbik7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2NsYXNzJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnaW5zdGFuY2UnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuUmVmZXJlbmNlKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnbWV0aG9kJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLk1ldGhvZCk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2J1aWx0aW4nLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdidWlsdGluZnVuY3Rpb24nLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuRnVuY3Rpb24pO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdtb2R1bGUnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuTW9kdWxlKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnZmlsZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5GaWxlKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgneHJhbmdlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgnc2xpY2UnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCd0cmFjZWJhY2snLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdmcmFtZScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2J1ZmZlcicsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2RpY3Rwcm94eScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2Z1bmNkZWYnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuRnVuY3Rpb24pO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdwcm9wZXJ0eScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5Qcm9wZXJ0eSk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ2ltcG9ydCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5Nb2R1bGUpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdrZXl3b3JkJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdjb25zdGFudCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3ZhcmlhYmxlJywgdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLlZhcmlhYmxlKTtcclxucHl0aG9uVlNDb2RlVHlwZU1hcHBpbmdzLnNldCgndmFsdWUnLCB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuVmFsdWUpO1xyXG5weXRob25WU0NvZGVUeXBlTWFwcGluZ3Muc2V0KCdwYXJhbScsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSk7XHJcbnB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5zZXQoJ3N0YXRlbWVudCcsIHZzY29kZV8xLkNvbXBsZXRpb25JdGVtS2luZC5LZXl3b3JkKTtcclxuY29uc3QgcHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3MgPSBuZXcgTWFwKCk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbm9uZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuVmFyaWFibGUpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3R5cGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCd0dXBsZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2RpY3QnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdkaWN0aW9uYXJ5JywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZnVuY3Rpb24nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdsYW1iZGEnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdnZW5lcmF0b3InLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdjbGFzcycsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2luc3RhbmNlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5DbGFzcyk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbWV0aG9kJywgdnNjb2RlXzEuU3ltYm9sS2luZC5NZXRob2QpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2J1aWx0aW4nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdidWlsdGluZnVuY3Rpb24nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdtb2R1bGUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk1vZHVsZSk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZmlsZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuRmlsZSk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgneHJhbmdlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5BcnJheSk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnc2xpY2UnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCd0cmFjZWJhY2snLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNsYXNzKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdmcmFtZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2J1ZmZlcicsIHZzY29kZV8xLlN5bWJvbEtpbmQuQXJyYXkpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2RpY3Rwcm94eScsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2Z1bmNkZWYnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdwcm9wZXJ0eScsIHZzY29kZV8xLlN5bWJvbEtpbmQuUHJvcGVydHkpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ2ltcG9ydCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuTW9kdWxlKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdrZXl3b3JkJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnY29uc3RhbnQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkNvbnN0YW50KTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCd2YXJpYWJsZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuVmFyaWFibGUpO1xyXG5weXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5zZXQoJ3ZhbHVlJywgdnNjb2RlXzEuU3ltYm9sS2luZC5WYXJpYWJsZSk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgncGFyYW0nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdzdGF0ZW1lbnQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdib29sZWFuJywgdnNjb2RlXzEuU3ltYm9sS2luZC5Cb29sZWFuKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdpbnQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk51bWJlcik7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnbG9uZ2xlYW4nLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk51bWJlcik7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnZmxvYXQnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLk51bWJlcik7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgnY29tcGxleCcsIHZzY29kZV8xLlN5bWJvbEtpbmQuTnVtYmVyKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdzdHJpbmcnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlN0cmluZyk7XHJcbnB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLnNldCgndW5pY29kZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuU3RyaW5nKTtcclxucHl0aG9uVlNDb2RlU3ltYm9sTWFwcGluZ3Muc2V0KCdsaXN0JywgdnNjb2RlXzEuU3ltYm9sS2luZC5BcnJheSk7XHJcbmZ1bmN0aW9uIGdldE1hcHBlZFZTQ29kZVR5cGUocHl0aG9uVHlwZSkge1xyXG4gICAgaWYgKHB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5oYXMocHl0aG9uVHlwZSkpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IHB5dGhvblZTQ29kZVR5cGVNYXBwaW5ncy5nZXQocHl0aG9uVHlwZSk7XHJcbiAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdnNjb2RlXzEuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQ7XHJcbn1cclxuZnVuY3Rpb24gZ2V0TWFwcGVkVlNDb2RlU3ltYm9sKHB5dGhvblR5cGUpIHtcclxuICAgIGlmIChweXRob25WU0NvZGVTeW1ib2xNYXBwaW5ncy5oYXMocHl0aG9uVHlwZSkpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IHB5dGhvblZTQ29kZVN5bWJvbE1hcHBpbmdzLmdldChweXRob25UeXBlKTtcclxuICAgICAgICBpZiAodmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlO1xyXG59XHJcbnZhciBDb21tYW5kVHlwZTtcclxuKGZ1bmN0aW9uIChDb21tYW5kVHlwZSkge1xyXG4gICAgQ29tbWFuZFR5cGVbQ29tbWFuZFR5cGVbXCJBcmd1bWVudHNcIl0gPSAwXSA9IFwiQXJndW1lbnRzXCI7XHJcbiAgICBDb21tYW5kVHlwZVtDb21tYW5kVHlwZVtcIkNvbXBsZXRpb25zXCJdID0gMV0gPSBcIkNvbXBsZXRpb25zXCI7XHJcbiAgICBDb21tYW5kVHlwZVtDb21tYW5kVHlwZVtcIkhvdmVyXCJdID0gMl0gPSBcIkhvdmVyXCI7XHJcbiAgICBDb21tYW5kVHlwZVtDb21tYW5kVHlwZVtcIlVzYWdlc1wiXSA9IDNdID0gXCJVc2FnZXNcIjtcclxuICAgIENvbW1hbmRUeXBlW0NvbW1hbmRUeXBlW1wiRGVmaW5pdGlvbnNcIl0gPSA0XSA9IFwiRGVmaW5pdGlvbnNcIjtcclxuICAgIENvbW1hbmRUeXBlW0NvbW1hbmRUeXBlW1wiU3ltYm9sc1wiXSA9IDVdID0gXCJTeW1ib2xzXCI7XHJcbn0pKENvbW1hbmRUeXBlID0gZXhwb3J0cy5Db21tYW5kVHlwZSB8fCAoZXhwb3J0cy5Db21tYW5kVHlwZSA9IHt9KSk7XHJcbmNvbnN0IGNvbW1hbmROYW1lcyA9IG5ldyBNYXAoKTtcclxuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5Bcmd1bWVudHMsICdhcmd1bWVudHMnKTtcclxuY29tbWFuZE5hbWVzLnNldChDb21tYW5kVHlwZS5Db21wbGV0aW9ucywgJ2NvbXBsZXRpb25zJyk7XHJcbmNvbW1hbmROYW1lcy5zZXQoQ29tbWFuZFR5cGUuRGVmaW5pdGlvbnMsICdkZWZpbml0aW9ucycpO1xyXG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLkhvdmVyLCAndG9vbHRpcCcpO1xyXG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLlVzYWdlcywgJ3VzYWdlcycpO1xyXG5jb21tYW5kTmFtZXMuc2V0KENvbW1hbmRUeXBlLlN5bWJvbHMsICduYW1lcycpO1xyXG5jbGFzcyBKZWRpUHJveHkge1xyXG4gICAgY29uc3RydWN0b3IoZXh0ZW5zaW9uUm9vdERpciwgd29ya3NwYWNlUGF0aCwgc2VydmljZUNvbnRhaW5lcikge1xyXG4gICAgICAgIHRoaXMuZXh0ZW5zaW9uUm9vdERpciA9IGV4dGVuc2lvblJvb3REaXI7XHJcbiAgICAgICAgdGhpcy5zZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZUNvbnRhaW5lcjtcclxuICAgICAgICB0aGlzLmNtZElkID0gMDtcclxuICAgICAgICB0aGlzLnByZXZpb3VzRGF0YSA9ICcnO1xyXG4gICAgICAgIHRoaXMuY29tbWFuZHMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kUXVldWUgPSBbXTtcclxuICAgICAgICB0aGlzLnNwYXduUmV0cnlBdHRlbXB0cyA9IDA7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMgPSBbXTtcclxuICAgICAgICB0aGlzLmlnbm9yZUplZGlNZW1vcnlGb290cHJpbnQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnBpZFVzYWdlRmFpbHVyZXMgPSB7IHRpbWVyOiBuZXcgc3RvcFdhdGNoXzEuU3RvcFdhdGNoKCksIGNvdW50ZXI6IDAgfTtcclxuICAgICAgICB0aGlzLndvcmtzcGFjZVBhdGggPSB3b3Jrc3BhY2VQYXRoO1xyXG4gICAgICAgIHRoaXMucHl0aG9uU2V0dGluZ3MgPSBjb25maWdTZXR0aW5nc18xLlB5dGhvblNldHRpbmdzLmdldEluc3RhbmNlKHZzY29kZV8xLlVyaS5maWxlKHdvcmtzcGFjZVBhdGgpKTtcclxuICAgICAgICB0aGlzLmxhc3RLbm93blB5dGhvbkludGVycHJldGVyID0gdGhpcy5weXRob25TZXR0aW5ncy5weXRob25QYXRoO1xyXG4gICAgICAgIHRoaXMubG9nZ2VyID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JTG9nZ2VyKTtcclxuICAgICAgICB0aGlzLnB5dGhvblNldHRpbmdzLm9uKCdjaGFuZ2UnLCAoKSA9PiB0aGlzLnB5dGhvblNldHRpbmdzQ2hhbmdlSGFuZGxlcigpKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xyXG4gICAgICAgIHRoaXMuc3RhcnRMYW5ndWFnZVNlcnZlcigpLnRoZW4oKCkgPT4gdGhpcy5pbml0aWFsaXplZC5yZXNvbHZlKCkpLmlnbm9yZUVycm9ycygpO1xyXG4gICAgICAgIHRoaXMucHJvcG9zZU5ld0xhbmd1YWdlU2VydmVyUG9wdXAgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklQeXRob25FeHRlbnNpb25CYW5uZXIsIHR5cGVzXzIuQkFOTkVSX05BTUVfUFJPUE9TRV9MUyk7XHJcbiAgICAgICAgdGhpcy5jaGVja0plZGlNZW1vcnlGb290cHJpbnQoKS5pZ25vcmVFcnJvcnMoKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBnZXRQcm9wZXJ0eShvLCBuYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIG9bbmFtZV07XHJcbiAgICB9XHJcbiAgICBkaXNwb3NlKCkge1xyXG4gICAgICAgIHRoaXMua2lsbFByb2Nlc3MoKTtcclxuICAgIH1cclxuICAgIGdldE5leHRDb21tYW5kSWQoKSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jbWRJZDtcclxuICAgICAgICB0aGlzLmNtZElkICs9IDE7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIHNlbmRDb21tYW5kKGNtZCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuaW5pdGlhbGl6ZWQucHJvbWlzZTtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQucHJvbWlzZTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnByb2MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1B5dGhvbiBwcm9jIG5vdCBpbml0aWFsaXplZCcpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBleGVjdXRpb25DbWQgPSBjbWQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB0aGlzLmNyZWF0ZVBheWxvYWQoZXhlY3V0aW9uQ21kKTtcclxuICAgICAgICAgICAgZXhlY3V0aW9uQ21kLmRlZmVycmVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jLnN0ZGluLndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHBheWxvYWQpfVxcbmApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21tYW5kcy5zZXQoZXhlY3V0aW9uQ21kLmlkLCBleGVjdXRpb25DbWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21tYW5kUXVldWUucHVzaChleGVjdXRpb25DbWQuaWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihleCk7XHJcbiAgICAgICAgICAgICAgICAvL0lmICdUaGlzIHNvY2tldCBpcyBjbG9zZWQuJyB0aGF0IG1lYW5zIHByb2Nlc3MgZGlkbid0IHN0YXJ0IGF0IGFsbCAoYXQgbGVhc3Qgbm90IHByb3Blcmx5KS5cclxuICAgICAgICAgICAgICAgIGlmIChleC5tZXNzYWdlID09PSAnVGhpcyBzb2NrZXQgaXMgY2xvc2VkLicpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxQcm9jZXNzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdzZW5kQ29tbWFuZCcsIGV4Lm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGV4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZXhlY3V0aW9uQ21kLmRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHRoZSBkaXJlY3Rvcnkgc28gd2UgY2FuIHJlLXNwYXduIHRoZSBwcm9jZXNzLlxyXG4gICAgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zcGF3blByb2Nlc3MocGF0aC5qb2luKHRoaXMuZXh0ZW5zaW9uUm9vdERpciwgJ3B5dGhvbkZpbGVzJykpXHJcbiAgICAgICAgICAgIC5jYXRjaChleCA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQucmVqZWN0KGV4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUVycm9yKCdzcGF3blByb2Nlc3MnLCBleCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBzaG91bGRDaGVja0plZGlNZW1vcnlGb290cHJpbnQoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaWdub3JlSmVkaU1lbW9yeUZvb3RwcmludCB8fCB0aGlzLnB5dGhvblNldHRpbmdzLmplZGlNZW1vcnlMaW1pdCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5sYXN0Q21kSWRQcm9jZXNzZWRGb3JQaWRVc2FnZSAmJiB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZCAmJlxyXG4gICAgICAgICAgICB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZEZvclBpZFVzYWdlID09PSB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZCkge1xyXG4gICAgICAgICAgICAvLyBJZiBubyBtb3JlIGNvbW1hbmRzIHdlcmUgcHJvY2Vzc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUsXHJcbiAgICAgICAgICAgIC8vICB0aGVuIHRoZXJlJ3Mgbm8gbmVlZCB0byBjaGVjayBhZ2Fpbi5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGNoZWNrSmVkaU1lbW9yeUZvb3RwcmludCgpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAvLyBDaGVjayBtZW1vcnkgZm9vdHByaW50IHBlcmlvZGljYWxseS4gRG8gbm90IGNoZWNrIG9uIGV2ZXJ5IHJlcXVlc3QgZHVlIHRvXHJcbiAgICAgICAgICAgIC8vIHRoZSBwZXJmb3JtYW5jZSBpbXBhY3QuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vc295dWthL3BpZHVzYWdlIC0gb24gV2luZG93c1xyXG4gICAgICAgICAgICAvLyBpdCBpcyB1c2luZyB3bWljIHdoaWNoIG1lYW5zIHNwYXduaW5nIGNtZC5leGUgcHJvY2VzcyBvbiBldmVyeSByZXF1ZXN0LlxyXG4gICAgICAgICAgICBpZiAodGhpcy5weXRob25TZXR0aW5ncy5qZWRpTWVtb3J5TGltaXQgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeWllbGQgdGhpcy5jaGVja0plZGlNZW1vcnlGb290cHJpbnRJbXBsKCk7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5jaGVja0plZGlNZW1vcnlGb290cHJpbnQoKSwgMTUgKiAxMDAwKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNoZWNrSmVkaU1lbW9yeUZvb3RwcmludEltcGwoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnByb2MgfHwgdGhpcy5wcm9jLmtpbGxlZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRDaGVja0plZGlNZW1vcnlGb290cHJpbnQoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubGFzdENtZElkUHJvY2Vzc2VkRm9yUGlkVXNhZ2UgPSB0aGlzLmxhc3RDbWRJZFByb2Nlc3NlZDtcclxuICAgICAgICAgICAgLy8gRG8gbm90IHJ1biBwaWR1c2FnZSBvdmVyIGFuZCBvdmVyLCB3YWl0IGZvciBpdCB0byBmaW5pc2guXHJcbiAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICBwaWR1c2FnZS5zdGF0KHRoaXMucHJvYy5waWQsIChlcnIsIHJlc3VsdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGlkVXNhZ2VGYWlsdXJlcy5jb3VudGVyICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBmdW5jdGlvbiBmYWlscyAyIHRpbWVzIGluIHRoZSBsYXN0IDYwIHNlY29uZHMsIGxldHMgbm90IHRyeSBldmVyIGFnYWluLlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBpZFVzYWdlRmFpbHVyZXMudGltZXIuZWxhcHNlZFRpbWUgPiA2MCAqIDEwMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZ25vcmVKZWRpTWVtb3J5Rm9vdHByaW50ID0gdGhpcy5waWRVc2FnZUZhaWx1cmVzLmNvdW50ZXIgPiAyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBpZFVzYWdlRmFpbHVyZXMuY291bnRlciA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGlkVXNhZ2VGYWlsdXJlcy50aW1lci5yZXNldCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQeXRob24gRXh0ZW5zaW9uOiAocGlkdXNhZ2UpJywgZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbWl0ID0gTWF0aC5taW4oTWF0aC5tYXgodGhpcy5weXRob25TZXR0aW5ncy5qZWRpTWVtb3J5TGltaXQsIDEwMjQpLCA4MTkyKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5tZW1vcnkgPiBsaW1pdCAqIDEwMjQgKiAxMDI0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZ1dhcm5pbmcoYEludGVsbGlTZW5zZSBwcm9jZXNzIG1lbW9yeSBjb25zdW1wdGlvbiBleGNlZWRlZCBsaW1pdCBvZiAke2xpbWl0fSBNQiBhbmQgcHJvY2VzcyB3aWxsIGJlIHJlc3RhcnRlZC5cXG5UaGUgbGltaXQgaXMgY29udHJvbGxlZCBieSB0aGUgJ3B5dGhvbi5qZWRpTWVtb3J5TGltaXQnIHNldHRpbmcuYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcHl0aG9uU2V0dGluZ3NDaGFuZ2VIYW5kbGVyKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhc3RLbm93blB5dGhvbkludGVycHJldGVyID09PSB0aGlzLnB5dGhvblNldHRpbmdzLnB5dGhvblBhdGgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmxhc3RLbm93blB5dGhvbkludGVycHJldGVyID0gdGhpcy5weXRob25TZXR0aW5ncy5weXRob25QYXRoO1xyXG4gICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxBdXRvQ29tcGxldGVQYXRocyA9IHlpZWxkIHRoaXMuYnVpbGRBdXRvQ29tcGxldGVQYXRocygpO1xyXG4gICAgICAgICAgICB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcigpLmlnbm9yZUVycm9ycygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZW52aXJvbm1lbnRWYXJpYWJsZXNDaGFuZ2VIYW5kbGVyKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0F1dG9Db21sZXRlUGF0aHMgPSB5aWVsZCB0aGlzLmJ1aWxkQXV0b0NvbXBsZXRlUGF0aHMoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWRkaXRpb25hbEF1dG9Db21wbGV0ZVBhdGhzLmpvaW4oJywnKSAhPT0gbmV3QXV0b0NvbWxldGVQYXRocy5qb2luKCcsJykpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbEF1dG9Db21wbGV0ZVBhdGhzID0gbmV3QXV0b0NvbWxldGVQYXRocztcclxuICAgICAgICAgICAgICAgIHRoaXMucmVzdGFydExhbmd1YWdlU2VydmVyKCkuaWdub3JlRXJyb3JzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHN0YXJ0TGFuZ3VhZ2VTZXJ2ZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgbmV3QXV0b0NvbWxldGVQYXRocyA9IHlpZWxkIHRoaXMuYnVpbGRBdXRvQ29tcGxldGVQYXRocygpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxBdXRvQ29tcGxldGVQYXRocyA9IG5ld0F1dG9Db21sZXRlUGF0aHM7XHJcbiAgICAgICAgICAgIGlmICghY29uc3RhbnRzXzEuaXNUZXN0RXhlY3V0aW9uKCkpIHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMucHJvcG9zZU5ld0xhbmd1YWdlU2VydmVyUG9wdXAuc2hvd0Jhbm5lcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3RhcnRMYW5ndWFnZVNlcnZlcigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmVzdGFydExhbmd1YWdlU2VydmVyKCkge1xyXG4gICAgICAgIHRoaXMua2lsbFByb2Nlc3MoKTtcclxuICAgICAgICB0aGlzLmNsZWFyUGVuZGluZ1JlcXVlc3RzKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgfVxyXG4gICAgY2xlYXJQZW5kaW5nUmVxdWVzdHMoKSB7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kUXVldWUgPSBbXTtcclxuICAgICAgICB0aGlzLmNvbW1hbmRzLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChpdGVtLmRlZmVycmVkICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uZGVmZXJyZWQucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kcy5jbGVhcigpO1xyXG4gICAgfVxyXG4gICAga2lsbFByb2Nlc3MoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucHJvYykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jLmtpbGwoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGV4KSB7IH1cclxuICAgICAgICB0aGlzLnByb2MgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBoYW5kbGVFcnJvcihzb3VyY2UsIGVycm9yTWVzc2FnZSkge1xyXG4gICAgICAgIGxvZ2dlcl8xLkxvZ2dlci5lcnJvcihgJHtzb3VyY2V9IGplZGlQcm94eWAsIGBFcnJvciAoJHtzb3VyY2V9KSAke2Vycm9yTWVzc2FnZX1gKTtcclxuICAgIH1cclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG4gICAgc3Bhd25Qcm9jZXNzKGN3ZCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZCAmJiAhdGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQuY29tcGxldGVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxhbmd1YWdlU2VydmVyU3RhcnRlZC5yZWplY3QobmV3IEVycm9yKCdMYW5ndWFnZSBTZXJ2ZXIgbm90IHN0YXJ0ZWQuJykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICBjb25zdCBweXRob25Qcm9jZXNzID0geWllbGQgdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQeXRob25FeGVjdXRpb25GYWN0b3J5KS5jcmVhdGUoeyByZXNvdXJjZTogdnNjb2RlXzEuVXJpLmZpbGUodGhpcy53b3Jrc3BhY2VQYXRoKSB9KTtcclxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHB5dGhvbiBwYXRoIGlzIHZhbGlkLlxyXG4gICAgICAgICAgICBpZiAoKHlpZWxkIHB5dGhvblByb2Nlc3MuZ2V0RXhlY3V0YWJsZVBhdGgoKS5jYXRjaCgoKSA9PiAnJykpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBbJ2NvbXBsZXRpb24ucHknXTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnB5dGhvblNldHRpbmdzLmplZGlQYXRoID09PSAnc3RyaW5nJyAmJiB0aGlzLnB5dGhvblNldHRpbmdzLmplZGlQYXRoLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY3VzdG9tJyk7XHJcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2godGhpcy5weXRob25TZXR0aW5ncy5qZWRpUGF0aCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gcHl0aG9uUHJvY2Vzcy5leGVjT2JzZXJ2YWJsZShhcmdzLCB7IGN3ZCB9KTtcclxuICAgICAgICAgICAgdGhpcy5wcm9jID0gcmVzdWx0LnByb2M7XHJcbiAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgdGhpcy5wcm9jLm9uKCdlbmQnLCAoZW5kKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXJfMS5Mb2dnZXIuZXJyb3IoJ3NwYXduUHJvY2Vzcy5lbmQnLCBgRW5kIC0gJHtlbmR9YCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLnByb2Mub24oJ2Vycm9yJywgZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcignZXJyb3InLCBgJHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25SZXRyeUF0dGVtcHRzICs9IDE7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGF3blJldHJ5QXR0ZW1wdHMgPCAxMCAmJiBlcnJvciAmJiBlcnJvci5tZXNzYWdlICYmXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IubWVzc2FnZS5pbmRleE9mKCdUaGlzIHNvY2tldCBoYXMgYmVlbiBlbmRlZCBieSB0aGUgb3RoZXIgcGFydHknKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGF3blByb2Nlc3MoY3dkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZXggPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5sYW5ndWFnZVNlcnZlclN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2VTZXJ2ZXJTdGFydGVkLnJlamVjdChleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcignc3Bhd25Qcm9jZXNzJywgZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmVzdWx0Lm91dC5zdWJzY3JpYmUob3V0cHV0ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChvdXRwdXQuc291cmNlID09PSAnc3RkZXJyJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoJ3N0ZGVycicsIG91dHB1dC5vdXQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IG91dHB1dC5vdXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9zc2libGUgdGhlcmUgd2FzIGFuIGV4Y2VwdGlvbiBpbiBwYXJzaW5nIHRoZSBkYXRhIHJldHVybmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNvIGFwcGVuZCB0aGUgZGF0YSBhbmQgdGhlbiBwYXJzZSBpdC5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gdGhpcy5wcmV2aW91c0RhdGEgPSBgJHt0aGlzLnByZXZpb3VzRGF0YX0ke2RhdGF9YDtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlcztcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZXMgPSBkYXRhU3RyLnNwbGl0TGluZXMoKS5tYXAocmVzcCA9PiBKU09OLnBhcnNlKHJlc3ApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmV2aW91c0RhdGEgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBvc3NpYmxlIHdlJ3ZlIG9ubHkgcmVjZWl2ZWQgcGFydCBvZiB0aGUgZGF0YSwgaGVuY2UgZG9uJ3QgY2xlYXIgcHJldmlvdXNEYXRhLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBsb2cgZXJyb3JzIHdoZW4gd2UgaGF2ZW4ndCByZWNlaXZlZCB0aGUgZW50aXJlIHJlc3BvbnNlLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXgubWVzc2FnZS5pbmRleE9mKCdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcpID09PSAtMSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXgubWVzc2FnZS5pbmRleE9mKCdVbmV4cGVjdGVkIGVuZCBvZiBKU09OIGlucHV0JykgPT09IC0xICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleC5tZXNzYWdlLmluZGV4T2YoJ1VuZXhwZWN0ZWQgdG9rZW4nKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoJ3N0ZG91dCcsIGV4Lm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VzLmZvckVhY2goKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZUlkID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAnaWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNvbW1hbmRzLmhhcyhyZXNwb25zZUlkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNtZCA9IHRoaXMuY29tbWFuZHMuZ2V0KHJlc3BvbnNlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNtZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdENtZElkUHJvY2Vzc2VkID0gY21kLmlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAnYXJndW1lbnRzJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZFF1ZXVlLnNwbGljZSh0aGlzLmNvbW1hbmRRdWV1ZS5pbmRleE9mKGNtZC5pZCksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZHMuZGVsZXRlKHJlc3BvbnNlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuY29tbWFuZFF1ZXVlLmluZGV4T2YoY21kLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbW1hbmRRdWV1ZS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgY29tbWFuZCBoYXMgZXhwaXJlZC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNtZC50b2tlbi5pc0NhbmNlbGxhdGlvblJlcXVlc3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjbWQsIHVuZGVmaW5lZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMuZ2V0Q29tbWFuZEhhbmRsZXIoY21kLmNvbW1hbmQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGNtZCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRvbyBtYW55IHBlbmRpbmcgcmVxdWVzdHMuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tRdWV1ZUxlbmd0aCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCBlcnJvciA9PiB0aGlzLmhhbmRsZUVycm9yKCdzdWJzY3JpcHRpb24uZXJyb3InLCBgJHtlcnJvcn1gKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRDb21tYW5kSGFuZGxlcihjb21tYW5kKSB7XHJcbiAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQ29tcGxldGlvbnM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbXBsZXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuRGVmaW5pdGlvbnM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRlZmluaXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuSG92ZXI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkhvdmVyO1xyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlN5bWJvbHM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vblN5bWJvbHM7XHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuVXNhZ2VzOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Vc2FnZXM7XHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQXJndW1lbnRzOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Bcmd1bWVudHM7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgb25Db21wbGV0aW9uKGNvbW1hbmQsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgbGV0IHJlc3VsdHMgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdyZXN1bHRzJyk7XHJcbiAgICAgICAgcmVzdWx0cyA9IEFycmF5LmlzQXJyYXkocmVzdWx0cykgPyByZXN1bHRzIDogW107XHJcbiAgICAgICAgcmVzdWx0cy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZSA9IGl0ZW0udHlwZTtcclxuICAgICAgICAgICAgaXRlbS50eXBlID0gZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpO1xyXG4gICAgICAgICAgICBpdGVtLmtpbmQgPSBnZXRNYXBwZWRWU0NvZGVTeW1ib2wob3JpZ2luYWxUeXBlKTtcclxuICAgICAgICAgICAgaXRlbS5yYXdUeXBlID0gZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IGNvbXBsZXRpb25SZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIGl0ZW1zOiByZXN1bHRzLFxyXG4gICAgICAgICAgICByZXF1ZXN0SWQ6IGNvbW1hbmQuaWRcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgY29tcGxldGlvblJlc3VsdCk7XHJcbiAgICB9XHJcbiAgICBvbkRlZmluaXRpb24oY29tbWFuZCwgcmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICAgICAgY29uc3QgZGVmcyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcclxuICAgICAgICBjb25zdCBkZWZSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcclxuICAgICAgICAgICAgZGVmaW5pdGlvbnM6IFtdXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAoZGVmcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGRlZlJlc3VsdC5kZWZpbml0aW9ucyA9IGRlZnMubWFwKGRlZiA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFR5cGUgPSBkZWYudHlwZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IGRlZi5maWxlTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkZWYudGV4dCxcclxuICAgICAgICAgICAgICAgICAgICByYXdUeXBlOiBvcmlnaW5hbFR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZ2V0TWFwcGVkVlNDb2RlVHlwZShvcmlnaW5hbFR5cGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IGdldE1hcHBlZFZTQ29kZVN5bWJvbChvcmlnaW5hbFR5cGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogZGVmLmNvbnRhaW5lcixcclxuICAgICAgICAgICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmU6IGRlZi5yYW5nZS5zdGFydF9saW5lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogZGVmLnJhbmdlLnN0YXJ0X2NvbHVtbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kTGluZTogZGVmLnJhbmdlLmVuZF9saW5lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRDb2x1bW46IGRlZi5yYW5nZS5lbmRfY29sdW1uXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgZGVmUmVzdWx0KTtcclxuICAgIH1cclxuICAgIG9uSG92ZXIoY29tbWFuZCwgcmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICAgICAgY29uc3QgZGVmcyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcclxuICAgICAgICBjb25zdCBkZWZSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcclxuICAgICAgICAgICAgaXRlbXM6IGRlZnMubWFwKGRlZiA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IGdldE1hcHBlZFZTQ29kZVN5bWJvbChkZWYudHlwZSksXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRlZi5kZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzaWduYXR1cmU6IGRlZi5zaWduYXR1cmUsXHJcbiAgICAgICAgICAgICAgICAgICAgZG9jc3RyaW5nOiBkZWYuZG9jc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGRlZi50ZXh0XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCBkZWZSZXN1bHQpO1xyXG4gICAgfVxyXG4gICAgb25TeW1ib2xzKGNvbW1hbmQsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgICAgIGxldCBkZWZzID0gSmVkaVByb3h5LmdldFByb3BlcnR5KHJlc3BvbnNlLCAncmVzdWx0cycpO1xyXG4gICAgICAgIGRlZnMgPSBBcnJheS5pc0FycmF5KGRlZnMpID8gZGVmcyA6IFtdO1xyXG4gICAgICAgIGNvbnN0IGRlZlJlc3VsdHMgPSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcclxuICAgICAgICAgICAgZGVmaW5pdGlvbnM6IFtdXHJcbiAgICAgICAgfTtcclxuICAgICAgICBkZWZSZXN1bHRzLmRlZmluaXRpb25zID0gZGVmcy5tYXAoZGVmID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUeXBlID0gZGVmLnR5cGU7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlTmFtZTogZGVmLmZpbGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogZGVmLnRleHQsXHJcbiAgICAgICAgICAgICAgICByYXdUeXBlOiBvcmlnaW5hbFR5cGUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBnZXRNYXBwZWRWU0NvZGVUeXBlKG9yaWdpbmFsVHlwZSksXHJcbiAgICAgICAgICAgICAgICBraW5kOiBnZXRNYXBwZWRWU0NvZGVTeW1ib2wob3JpZ2luYWxUeXBlKSxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogZGVmLmNvbnRhaW5lcixcclxuICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lOiBkZWYucmFuZ2Uuc3RhcnRfbGluZSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogZGVmLnJhbmdlLnN0YXJ0X2NvbHVtbixcclxuICAgICAgICAgICAgICAgICAgICBlbmRMaW5lOiBkZWYucmFuZ2UuZW5kX2xpbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5kQ29sdW1uOiBkZWYucmFuZ2UuZW5kX2NvbHVtblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgZGVmUmVzdWx0cyk7XHJcbiAgICB9XHJcbiAgICBvblVzYWdlcyhjb21tYW5kLCByZXNwb25zZSkge1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgICAgICBsZXQgZGVmcyA9IEplZGlQcm94eS5nZXRQcm9wZXJ0eShyZXNwb25zZSwgJ3Jlc3VsdHMnKTtcclxuICAgICAgICBkZWZzID0gQXJyYXkuaXNBcnJheShkZWZzKSA/IGRlZnMgOiBbXTtcclxuICAgICAgICBjb25zdCByZWZSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcclxuICAgICAgICAgICAgcmVmZXJlbmNlczogZGVmcy5tYXAoaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbkluZGV4OiBpdGVtLmNvbHVtbixcclxuICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZTogaXRlbS5maWxlTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBsaW5lSW5kZXg6IGl0ZW0ubGluZSAtIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZTogaXRlbS5tb2R1bGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuc2FmZVJlc29sdmUoY29tbWFuZCwgcmVmUmVzdWx0KTtcclxuICAgIH1cclxuICAgIG9uQXJndW1lbnRzKGNvbW1hbmQsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgICAgIGNvbnN0IGRlZnMgPSBKZWRpUHJveHkuZ2V0UHJvcGVydHkocmVzcG9uc2UsICdyZXN1bHRzJyk7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXHJcbiAgICAgICAgdGhpcy5zYWZlUmVzb2x2ZShjb21tYW5kLCB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RJZDogY29tbWFuZC5pZCxcclxuICAgICAgICAgICAgZGVmaW5pdGlvbnM6IGRlZnNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNoZWNrUXVldWVMZW5ndGgoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tbWFuZFF1ZXVlLmxlbmd0aCA+IDEwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5jb21tYW5kUXVldWUuc3BsaWNlKDAsIHRoaXMuY29tbWFuZFF1ZXVlLmxlbmd0aCAtIDEwKTtcclxuICAgICAgICAgICAgaXRlbXMuZm9yRWFjaChpZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY21kMSA9IHRoaXMuY29tbWFuZHMuZ2V0KGlkKTtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhZmVSZXNvbHZlKGNtZDEsIHVuZGVmaW5lZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tbWFuZHMuZGVsZXRlKGlkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgIGNyZWF0ZVBheWxvYWQoY21kKSB7XHJcbiAgICAgICAgY29uc3QgcGF5bG9hZCA9IHtcclxuICAgICAgICAgICAgaWQ6IGNtZC5pZCxcclxuICAgICAgICAgICAgcHJlZml4OiAnJyxcclxuICAgICAgICAgICAgbG9va3VwOiBjb21tYW5kTmFtZXMuZ2V0KGNtZC5jb21tYW5kKSxcclxuICAgICAgICAgICAgcGF0aDogY21kLmZpbGVOYW1lLFxyXG4gICAgICAgICAgICBzb3VyY2U6IGNtZC5zb3VyY2UsXHJcbiAgICAgICAgICAgIGxpbmU6IGNtZC5saW5lSW5kZXgsXHJcbiAgICAgICAgICAgIGNvbHVtbjogY21kLmNvbHVtbkluZGV4LFxyXG4gICAgICAgICAgICBjb25maWc6IHRoaXMuZ2V0Q29uZmlnKClcclxuICAgICAgICB9O1xyXG4gICAgICAgIGlmIChjbWQuY29tbWFuZCA9PT0gQ29tbWFuZFR5cGUuU3ltYm9scykge1xyXG4gICAgICAgICAgICBkZWxldGUgcGF5bG9hZC5jb2x1bW47XHJcbiAgICAgICAgICAgIGRlbGV0ZSBwYXlsb2FkLmxpbmU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwYXlsb2FkO1xyXG4gICAgfVxyXG4gICAgZ2V0UGF0aEZyb21QeXRob25Db21tYW5kKGFyZ3MpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHl0aG9uUHJvY2VzcyA9IHlpZWxkIHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JUHl0aG9uRXhlY3V0aW9uRmFjdG9yeSkuY3JlYXRlKHsgcmVzb3VyY2U6IHZzY29kZV8xLlVyaS5maWxlKHRoaXMud29ya3NwYWNlUGF0aCkgfSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB5aWVsZCBweXRob25Qcm9jZXNzLmV4ZWMoYXJncywgeyBjd2Q6IHRoaXMud29ya3NwYWNlUGF0aCB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxpbmVzID0gcmVzdWx0LnN0ZG91dC50cmltKCkuc3BsaXRMaW5lcygpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IHlpZWxkIGZzLnBhdGhFeGlzdHMobGluZXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0cyA/IGxpbmVzWzBdIDogJyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKF9hKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGJ1aWxkQXV0b0NvbXBsZXRlUGF0aHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGhQcm9taXNlcyA9IFtcclxuICAgICAgICAgICAgICAgIC8vIFN5c3ByZWZpeC5cclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0UGF0aEZyb21QeXRob25Db21tYW5kKFsnLWMnLCAnaW1wb3J0IHN5cztwcmludChzeXMucHJlZml4KSddKS5jYXRjaCgoKSA9PiAnJyksXHJcbiAgICAgICAgICAgICAgICAvLyBleGV1Y3V0YWJsZSBwYXRoLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRQYXRoRnJvbVB5dGhvbkNvbW1hbmQoWyctYycsICdpbXBvcnQgc3lzO3ByaW50KHN5cy5leGVjdXRhYmxlKSddKS50aGVuKGV4ZWNQYXRoID0+IHBhdGguZGlybmFtZShleGVjUGF0aCkpLmNhdGNoKCgpID0+ICcnKSxcclxuICAgICAgICAgICAgICAgIC8vIFB5dGhvbiBzcGVjaWZpYyBzaXRlIHBhY2thZ2VzLlxyXG4gICAgICAgICAgICAgICAgLy8gT24gd2luZG93cyB3ZSBhbHNvIG5lZWQgdGhlIGxpYnMgcGF0aCAoc2Vjb25kIGl0ZW0gd2lsbCByZXR1cm4gYzpcXHh4eFxcbGliXFxzaXRlLXBhY2thZ2VzKS5cclxuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgcmV0dXJuZWQgYnkgXCJmcm9tIGRpc3R1dGlscy5zeXNjb25maWcgaW1wb3J0IGdldF9weXRob25fbGliOyBwcmludChnZXRfcHl0aG9uX2xpYigpKVwiLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRQYXRoRnJvbVB5dGhvbkNvbW1hbmQoWyctYycsICdmcm9tIGRpc3R1dGlscy5zeXNjb25maWcgaW1wb3J0IGdldF9weXRob25fbGliOyBwcmludChnZXRfcHl0aG9uX2xpYigpKSddKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGxpYlBhdGggPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIE9uIHdpbmRvd3Mgd2UgYWxzbyBuZWVkIHRoZSBsaWJzIHBhdGggKHNlY29uZCBpdGVtIHdpbGwgcmV0dXJuIGM6XFx4eHhcXGxpYlxcc2l0ZS1wYWNrYWdlcykuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyByZXR1cm5lZCBieSBcImZyb20gZGlzdHV0aWxzLnN5c2NvbmZpZyBpbXBvcnQgZ2V0X3B5dGhvbl9saWI7IHByaW50KGdldF9weXRob25fbGliKCkpXCIuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChJU19XSU5ET1dTICYmIGxpYlBhdGgubGVuZ3RoID4gMCkgPyBwYXRoLmpvaW4obGliUGF0aCwgJy4uJykgOiBsaWJQYXRoO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gJycpLFxyXG4gICAgICAgICAgICAgICAgLy8gUHl0aG9uIGdsb2JhbCBzaXRlIHBhY2thZ2VzLCBhcyBhIGZhbGxiYWNrIGluIGNhc2UgdXNlciBoYXNuJ3QgaW5zdGFsbGVkIHRoZW0gaW4gY3VzdG9tIGVudmlyb25tZW50LlxyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRQYXRoRnJvbVB5dGhvbkNvbW1hbmQoWyctbScsICdzaXRlJywgJy0tdXNlci1zaXRlJ10pLmNhdGNoKCgpID0+ICcnKVxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHl0aG9uUGF0aHMgPSB5aWVsZCB0aGlzLmdldEVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIoKS5nZXRFbnZpcm9ubWVudFZhcmlhYmxlcyh2c2NvZGVfMS5VcmkuZmlsZSh0aGlzLndvcmtzcGFjZVBhdGgpKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGN1c3RvbUVudmlyb25tZW50VmFycyA9PiBjdXN0b21FbnZpcm9ubWVudFZhcnMgPyBKZWRpUHJveHkuZ2V0UHJvcGVydHkoY3VzdG9tRW52aXJvbm1lbnRWYXJzLCAnUFlUSE9OUEFUSCcpIDogJycpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocHl0aG9uUGF0aCA9PiAodHlwZW9mIHB5dGhvblBhdGggPT09ICdzdHJpbmcnICYmIHB5dGhvblBhdGgudHJpbSgpLmxlbmd0aCA+IDApID8gcHl0aG9uUGF0aC50cmltKCkgOiAnJylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihweXRob25QYXRoID0+IHB5dGhvblBhdGguc3BsaXQocGF0aC5kZWxpbWl0ZXIpLmZpbHRlcihpdGVtID0+IGl0ZW0udHJpbSgpLmxlbmd0aCA+IDApKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkUGF0aHMgPSBweXRob25QYXRoc1xyXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIocHl0aG9uUGF0aCA9PiAhcGF0aC5pc0Fic29sdXRlKHB5dGhvblBhdGgpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAocHl0aG9uUGF0aCA9PiBwYXRoLnJlc29sdmUodGhpcy53b3Jrc3BhY2VQYXRoLCBweXRob25QYXRoKSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aHMgPSB5aWVsZCBQcm9taXNlLmFsbChmaWxlUGF0aFByb21pc2VzKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aHMuY29uY2F0KC4uLnB5dGhvblBhdGhzLCAuLi5yZXNvbHZlZFBhdGhzKS5maWx0ZXIocCA9PiBwLmxlbmd0aCA+IDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignUHl0aG9uIEV4dGVuc2lvbjogamVkaVByb3h5LmZpbGVQYXRocycsIGV4KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZ2V0RW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcigpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcikge1xyXG4gICAgICAgICAgICB0aGlzLmVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSUVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIpO1xyXG4gICAgICAgICAgICB0aGlzLmVudmlyb25tZW50VmFyaWFibGVzUHJvdmlkZXIub25EaWRFbnZpcm9ubWVudFZhcmlhYmxlc0NoYW5nZSh0aGlzLmVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlSGFuZGxlci5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZW52aXJvbm1lbnRWYXJpYWJsZXNQcm92aWRlcjtcclxuICAgIH1cclxuICAgIGdldENvbmZpZygpIHtcclxuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgcGF0aHMgcmVsYXRpdmUgdG8gd29ya3NwYWNlLlxyXG4gICAgICAgIGNvbnN0IGV4dHJhUGF0aHMgPSB0aGlzLnB5dGhvblNldHRpbmdzLmF1dG9Db21wbGV0ZSA/XHJcbiAgICAgICAgICAgIHRoaXMucHl0aG9uU2V0dGluZ3MuYXV0b0NvbXBsZXRlLmV4dHJhUGF0aHMubWFwKGV4dHJhUGF0aCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGV4dHJhUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXh0cmFQYXRoO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLndvcmtzcGFjZVBhdGggIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbih0aGlzLndvcmtzcGFjZVBhdGgsIGV4dHJhUGF0aCk7XHJcbiAgICAgICAgICAgIH0pIDogW107XHJcbiAgICAgICAgLy8gQWx3YXlzIGFkZCB3b3Jrc3BhY2UgcGF0aCBpbnRvIGV4dHJhIHBhdGhzLlxyXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy53b3Jrc3BhY2VQYXRoID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBleHRyYVBhdGhzLnVuc2hpZnQodGhpcy53b3Jrc3BhY2VQYXRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgZGlzdGluY3RFeHRyYVBhdGhzID0gZXh0cmFQYXRocy5jb25jYXQodGhpcy5hZGRpdGlvbmFsQXV0b0NvbXBsZXRlUGF0aHMpXHJcbiAgICAgICAgICAgIC5maWx0ZXIodmFsdWUgPT4gdmFsdWUubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgLmZpbHRlcigodmFsdWUsIGluZGV4LCBzZWxmKSA9PiBzZWxmLmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZXh0cmFQYXRoczogZGlzdGluY3RFeHRyYVBhdGhzLFxyXG4gICAgICAgICAgICB1c2VTbmlwcGV0czogZmFsc2UsXHJcbiAgICAgICAgICAgIGNhc2VJbnNlbnNpdGl2ZUNvbXBsZXRpb246IHRydWUsXHJcbiAgICAgICAgICAgIHNob3dEZXNjcmlwdGlvbnM6IHRydWUsXHJcbiAgICAgICAgICAgIGZ1enp5TWF0Y2hlcjogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBzYWZlUmVzb2x2ZShjb21tYW5kLCByZXN1bHQpIHtcclxuICAgICAgICBpZiAoY29tbWFuZCAmJiBjb21tYW5kLmRlZmVycmVkKSB7XHJcbiAgICAgICAgICAgIGNvbW1hbmQuZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5fX2RlY29yYXRlKFtcclxuICAgIGRlY29yYXRvcnNfMS5zd2FsbG93RXhjZXB0aW9ucygnSmVkaVByb3h5JylcclxuXSwgSmVkaVByb3h5LnByb3RvdHlwZSwgXCJweXRob25TZXR0aW5nc0NoYW5nZUhhbmRsZXJcIiwgbnVsbCk7XHJcbl9fZGVjb3JhdGUoW1xyXG4gICAgZGVjb3JhdG9yc18xLmRlYm91bmNlKDE1MDApLFxyXG4gICAgZGVjb3JhdG9yc18xLnN3YWxsb3dFeGNlcHRpb25zKCdKZWRpUHJveHknKVxyXG5dLCBKZWRpUHJveHkucHJvdG90eXBlLCBcImVudmlyb25tZW50VmFyaWFibGVzQ2hhbmdlSGFuZGxlclwiLCBudWxsKTtcclxuX19kZWNvcmF0ZShbXHJcbiAgICBkZWNvcmF0b3JzXzEuc3dhbGxvd0V4Y2VwdGlvbnMoJ0plZGlQcm94eScpXHJcbl0sIEplZGlQcm94eS5wcm90b3R5cGUsIFwic3RhcnRMYW5ndWFnZVNlcnZlclwiLCBudWxsKTtcclxuZXhwb3J0cy5KZWRpUHJveHkgPSBKZWRpUHJveHk7XHJcbmNsYXNzIEplZGlQcm94eUhhbmRsZXIge1xyXG4gICAgY29uc3RydWN0b3IoamVkaVByb3h5KSB7XHJcbiAgICAgICAgdGhpcy5qZWRpUHJveHkgPSBqZWRpUHJveHk7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2VzID0gbmV3IE1hcCgpO1xyXG4gICAgfVxyXG4gICAgZ2V0IEplZGlQcm94eSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5qZWRpUHJveHk7XHJcbiAgICB9XHJcbiAgICBkaXNwb3NlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmplZGlQcm94eSkge1xyXG4gICAgICAgICAgICB0aGlzLmplZGlQcm94eS5kaXNwb3NlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc2VuZENvbW1hbmQoY21kLCB0b2tlbikge1xyXG4gICAgICAgIGNvbnN0IGV4ZWN1dGlvbkNtZCA9IGNtZDtcclxuICAgICAgICBleGVjdXRpb25DbWQuaWQgPSBleGVjdXRpb25DbWQuaWQgfHwgdGhpcy5qZWRpUHJveHkuZ2V0TmV4dENvbW1hbmRJZCgpO1xyXG4gICAgICAgIGlmICh0aGlzLmNvbW1hbmRDYW5jZWxsYXRpb25Ub2tlblNvdXJjZXMuaGFzKGNtZC5jb21tYW5kKSkge1xyXG4gICAgICAgICAgICBjb25zdCBjdCA9IHRoaXMuY29tbWFuZENhbmNlbGxhdGlvblRva2VuU291cmNlcy5nZXQoY21kLmNvbW1hbmQpO1xyXG4gICAgICAgICAgICBpZiAoY3QpIHtcclxuICAgICAgICAgICAgICAgIGN0LmNhbmNlbCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGNhbmNlbGxhdGlvbiA9IG5ldyB2c2NvZGVfMS5DYW5jZWxsYXRpb25Ub2tlblNvdXJjZSgpO1xyXG4gICAgICAgIHRoaXMuY29tbWFuZENhbmNlbGxhdGlvblRva2VuU291cmNlcy5zZXQoY21kLmNvbW1hbmQsIGNhbmNlbGxhdGlvbik7XHJcbiAgICAgICAgZXhlY3V0aW9uQ21kLnRva2VuID0gY2FuY2VsbGF0aW9uLnRva2VuO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmplZGlQcm94eS5zZW5kQ29tbWFuZChleGVjdXRpb25DbWQpXHJcbiAgICAgICAgICAgIC5jYXRjaChyZWFzb24gPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHJlYXNvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBzZW5kQ29tbWFuZE5vbkNhbmNlbGxhYmxlQ29tbWFuZChjbWQsIHRva2VuKSB7XHJcbiAgICAgICAgY29uc3QgZXhlY3V0aW9uQ21kID0gY21kO1xyXG4gICAgICAgIGV4ZWN1dGlvbkNtZC5pZCA9IGV4ZWN1dGlvbkNtZC5pZCB8fCB0aGlzLmplZGlQcm94eS5nZXROZXh0Q29tbWFuZElkKCk7XHJcbiAgICAgICAgaWYgKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGV4ZWN1dGlvbkNtZC50b2tlbiA9IHRva2VuO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5qZWRpUHJveHkuc2VuZENvbW1hbmQoZXhlY3V0aW9uQ21kKVxyXG4gICAgICAgICAgICAuY2F0Y2gocmVhc29uID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZWFzb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuSmVkaVByb3h5SGFuZGxlciA9IEplZGlQcm94eUhhbmRsZXI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWplZGlQcm94eS5qcy5tYXAiXX0=