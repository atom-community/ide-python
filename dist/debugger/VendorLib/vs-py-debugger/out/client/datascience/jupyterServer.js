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

require("../common/extensions");

const services_1 = require("@jupyterlab/services");

const fs = require("fs-extra");

const inversify_1 = require("inversify");

const path = require("path");

const Observable_1 = require("rxjs/Observable");

const uuid = require("uuid/v4");

const vscode = require("vscode");

const types_1 = require("../common/application/types");

const types_2 = require("../common/platform/types");

const types_3 = require("../common/types");

const async_1 = require("../common/utils/async");

const localize = require("../common/utils/localize");

const constants_1 = require("./constants");

const jupyterInstallError_1 = require("./jupyterInstallError");

const types_4 = require("./types");

const contracts_1 = require("../interpreter/contracts"); // This code is based on the examples here:
// https://www.npmjs.com/package/@jupyterlab/services


let JupyterServer = class JupyterServer {
  constructor(logger, process, fileSystem, disposableRegistry, jupyterExecution, workspaceService, interpreterService) {
    this.logger = logger;
    this.process = process;
    this.fileSystem = fileSystem;
    this.disposableRegistry = disposableRegistry;
    this.jupyterExecution = jupyterExecution;
    this.workspaceService = workspaceService;
    this.interpreterService = interpreterService;
    this.isDisposed = false;
    this.onStatusChangedEvent = new vscode.EventEmitter();

    this.start = () => __awaiter(this, void 0, void 0, function* () {
      if (yield this.jupyterExecution.isNotebookSupported()) {
        // First generate a temporary notebook. We need this as input to the session
        this.tempFile = yield this.generateTempFile(); // start our process in the same directory as our ipynb file.

        yield this.process.start(path.dirname(this.tempFile)); // Wait for connection information. We'll stick that into the options

        const connInfo = yield this.process.waitForConnectionInformation(); // First connect to the sesssion manager and find a kernel that matches our
        // python we're using

        const serverSettings = services_1.ServerConnection.makeSettings({
          baseUrl: connInfo.baseUrl,
          token: connInfo.token,
          pageUrl: '',
          // A web socket is required to allow token authentication
          wsUrl: connInfo.baseUrl.replace('http', 'ws'),
          init: {
            cache: 'no-store',
            credentials: 'same-origin'
          }
        });
        this.sessionManager = new services_1.SessionManager({
          serverSettings: serverSettings
        }); // Ask Jupyter for its list of kernel specs.

        const kernelName = yield this.findKernelName(this.sessionManager); // Create our session options using this temporary notebook and our connection info

        const options = {
          path: this.tempFile,
          kernelName: kernelName,
          serverSettings: serverSettings
        }; // Start a new session

        this.session = yield this.sessionManager.startNew(options); // Setup our start time. We reject anything that comes in before this time during execute

        this.sessionStartTime = Date.now(); // Wait for it to be ready

        yield this.session.kernel.ready; // Check for dark theme, if so set matplot lib to use dark_background settings

        let darkTheme = false;
        const workbench = this.workspaceService.getConfiguration('workbench');

        if (workbench) {
          const theme = workbench.get('colorTheme');

          if (theme) {
            darkTheme = /dark/i.test(theme);
          }
        }

        this.executeSilently(`import pandas as pd\r\nimport numpy\r\n%matplotlib inline\r\nimport matplotlib.pyplot as plt${darkTheme ? '\r\nfrom matplotlib import style\r\nstyle.use(\'dark_background\')' : ''}`).ignoreErrors();
        return true;
      } else {
        throw new jupyterInstallError_1.JupyterInstallError(localize.DataScience.jupyterNotSupported(), localize.DataScience.pythonInteractiveHelpLink());
      }
    });

    this.shutdown = () => __awaiter(this, void 0, void 0, function* () {
      if (this.session) {
        yield this.sessionManager.shutdownAll();
        this.session.dispose();
        this.sessionManager.dispose();
        this.session = undefined;
        this.sessionManager = undefined;
      }

      if (this.process) {
        this.process.dispose();
      }
    });

    this.waitForIdle = () => __awaiter(this, void 0, void 0, function* () {
      if (this.session && this.session.kernel) {
        yield this.session.kernel.ready;

        while (this.session.kernel.status !== 'idle') {
          yield this.timeout(10);
        }
      }
    });

    this.executeObservable = (code, file, line) => {
      // If we have a session, execute the code now.
      if (this.session) {
        // Replace windows line endings with unix line endings.
        const copy = code.replace(/\r\n/g, '\n'); // Determine if we have a markdown cell/ markdown and code cell combined/ or just a code cell

        const split = copy.split('\n');
        const firstLine = split[0];

        if (constants_1.RegExpValues.PythonMarkdownCellMarker.test(firstLine)) {
          // We have at least one markdown. We might have to split it if there any lines that don't begin
          // with #
          const firstNonMarkdown = split.findIndex(l => l.trim().length > 0 && !l.trim().startsWith('#'));

          if (firstNonMarkdown >= 0) {
            // We need to combine results
            return this.combineObservables(this.executeMarkdownObservable(split.slice(0, firstNonMarkdown).join('\n'), file, line), this.executeCodeObservable(split.slice(firstNonMarkdown).join('\n'), file, line + firstNonMarkdown));
          } else {
            // Just a normal markdown case
            return this.combineObservables(this.executeMarkdownObservable(copy, file, line));
          }
        } else {
          // Normal code case
          return this.combineObservables(this.executeCodeObservable(copy, file, line));
        }
      } // Can't run because no session


      return new Observable_1.Observable(subscriber => {
        subscriber.error(new Error(localize.DataScience.sessionDisposed()));
        subscriber.complete();
      });
    };

    this.executeSilently = code => {
      return new Promise((resolve, reject) => {
        // If we have a session, execute the code now.
        if (this.session) {
          // Generate a new request and resolve when it's done.
          const request = this.generateRequest(code, true);

          if (request) {
            // // For debugging purposes when silently is failing.
            // request.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
            //     try {
            //         this.logger.logInformation(`Execute silently message ${msg.header.msg_type} : hasData=${'data' in msg.content}`);
            //     } catch (err) {
            //         this.logger.logError(err);
            //     }
            // };
            request.done.then(() => {
              this.logger.logInformation(`Execute for ${code} silently finished.`);
              resolve();
            }).catch(reject);
          } else {
            reject(new Error(localize.DataScience.sessionDisposed()));
          }
        } else {
          reject(new Error(localize.DataScience.sessionDisposed()));
        }
      });
    };

    this.dispose = () => __awaiter(this, void 0, void 0, function* () {
      if (!this.isDisposed) {
        this.isDisposed = true;
        this.onStatusChangedEvent.dispose();
        this.shutdown().ignoreErrors();
      }
    });

    this.restartKernel = () => __awaiter(this, void 0, void 0, function* () {
      if (this.session && this.session.kernel) {
        // Update our start time so we don't keep sending responses
        this.sessionStartTime = Date.now(); // Restart our kernel

        yield this.session.kernel.restart(); // Wait for it to be ready

        yield this.session.kernel.ready;
        return;
      }

      throw new Error(localize.DataScience.sessionDisposed());
    });

    this.translateToNotebook = cells => __awaiter(this, void 0, void 0, function* () {
      if (this.process) {
        // First we need the python version we're running
        const pythonVersion = yield this.process.waitForPythonVersionString(); // Pull off the first number. Should be  3 or a 2

        const first = pythonVersion.substr(0, 1); // Use this to build our metadata object

        const metadata = {
          kernelspec: {
            display_name: `Python ${first}`,
            language: 'python',
            name: `python${first}`
          },
          language_info: {
            name: 'python',
            codemirror_mode: {
              name: 'ipython',
              version: parseInt(first, 10)
            }
          },
          orig_nbformat: 2,
          file_extension: '.py',
          mimetype: 'text/x-python',
          name: 'python',
          npconvert_exporter: 'python',
          pygments_lexer: `ipython${first}`,
          version: pythonVersion
        }; // Combine this into a JSON object

        return {
          cells: cells.map(cell => this.pruneCell(cell)),
          nbformat: 4,
          nbformat_minor: 2,
          metadata: metadata
        };
      }
    });

    this.launchNotebook = file => __awaiter(this, void 0, void 0, function* () {
      if (this.process) {
        yield this.process.spawn(file);
        return true;
      }

      return false;
    });

    this.generateRequest = (code, silent) => {
      return this.session.kernel.requestExecute({
        // Replace windows line endings with unix line endings.
        code: code.replace(/\r\n/g, '\n'),
        stop_on_error: false,
        allow_stdin: false,
        silent: silent
      }, true);
    };

    this.findKernelName = manager => __awaiter(this, void 0, void 0, function* () {
      // Ask the session manager to refresh its list of kernel specs. We're going to
      // iterate through them finding the best match
      yield manager.refreshSpecs(); // Extract our current python information that the user has picked.
      // We'll match against this.

      const pythonVersion = yield this.process.waitForPythonVersion();
      const pythonPath = yield this.process.waitForPythonPath();
      let bestScore = 0;
      let bestSpec; // Enumerate all of the kernel specs, scoring each as follows
      // - Path match = 10 Points. Very likely this is the right one
      // - Language match = 1 point. Might be a match
      // - Version match = 4 points for major version match

      const keys = Object.keys(manager.specs.kernelspecs);

      for (let i = 0; i < keys.length; i += 1) {
        const spec = manager.specs.kernelspecs[keys[i]];
        let score = 0;

        if (spec.argv.length > 0 && spec.argv[0] === pythonPath) {
          // Path match
          score += 10;
        }

        if (spec.language.toLocaleLowerCase() === 'python') {
          // Language match
          score += 1; // See if the version is the same

          if (pythonVersion && spec.argv.length > 0 && (yield fs.pathExists(spec.argv[0]))) {
            const details = yield this.interpreterService.getInterpreterDetails(spec.argv[0]);

            if (details && details.version_info) {
              if (details.version_info[0] === pythonVersion[0]) {
                // Major version match
                score += 4;

                if (details.version_info[1] === pythonVersion[1]) {
                  // Minor version match
                  score += 2;

                  if (details.version_info[2] === pythonVersion[2]) {
                    // Minor version match
                    score += 1;
                  }
                }
              }
            }
          }
        } // Update high score


        if (score > bestScore) {
          bestScore = score;
          bestSpec = spec.name;
        }
      } // If still not set, at least pick the first one


      if (!bestSpec && keys.length > 0) {
        bestSpec = manager.specs.kernelspecs[keys[0]].name;
      }

      return bestSpec;
    });

    this.combineObservables = (...args) => {
      return new Observable_1.Observable(subscriber => {
        // When all complete, we have our results
        const results = {};
        args.forEach(o => {
          o.subscribe(c => {
            results[c.id] = c; // Convert to an array

            const array = Object.keys(results).map(k => {
              return results[k];
            }); // Update our subscriber of our total results if we have that many

            if (array.length === args.length) {
              subscriber.next(array); // Complete when everybody is finished

              if (array.every(a => a.state === types_4.CellState.finished || a.state === types_4.CellState.error)) {
                subscriber.complete();
              }
            }
          }, e => {
            subscriber.error(e);
          });
        });
      });
    };

    this.executeMarkdownObservable = (code, file, line) => {
      return new Observable_1.Observable(subscriber => {
        // Generate markdown by stripping out the comment and markdown header
        const markdown = this.appendLineFeed(code.split('\n').slice(1), s => s.trim().slice(1).trim());
        const cell = {
          id: uuid(),
          file: file,
          line: line,
          state: types_4.CellState.finished,
          data: {
            cell_type: 'markdown',
            source: markdown,
            metadata: {}
          }
        };
        subscriber.next(cell);
        subscriber.complete();
      });
    };

    this.changeDirectoryIfPossible = (file, line) => __awaiter(this, void 0, void 0, function* () {
      if (line >= 0 && (yield fs.pathExists(file))) {
        const dir = path.dirname(file);
        yield this.executeSilently(`%cd "${dir}"`);
      }
    });

    this.handleCodeRequest = (subscriber, startTime, cell, code) => {
      // Generate a new request.
      const request = this.generateRequest(code, false); // Transition to the busy stage

      cell.state = types_4.CellState.executing; // Listen to the reponse messages and update state as we go

      if (request) {
        request.onIOPub = msg => {
          try {
            if (services_1.KernelMessage.isExecuteResultMsg(msg)) {
              this.handleExecuteResult(msg, cell);
            } else if (services_1.KernelMessage.isExecuteInputMsg(msg)) {
              this.handleExecuteInput(msg, cell);
            } else if (services_1.KernelMessage.isStatusMsg(msg)) {
              this.handleStatusMessage(msg);
            } else if (services_1.KernelMessage.isStreamMsg(msg)) {
              this.handleStreamMesssage(msg, cell);
            } else if (services_1.KernelMessage.isDisplayDataMsg(msg)) {
              this.handleDisplayData(msg, cell);
            } else if (services_1.KernelMessage.isErrorMsg(msg)) {
              this.handleError(msg, cell);
            } else {
              this.logger.logWarning(`Unknown message ${msg.header.msg_type} : hasData=${'data' in msg.content}`);
            } // Set execution count, all messages should have it


            if (msg.content.execution_count) {
              cell.data.execution_count = msg.content.execution_count;
            } // Show our update if any new output


            subscriber.next(cell);
          } catch (err) {
            // If not a restart error, then tell the subscriber
            if (startTime > this.sessionStartTime) {
              this.logger.logError(`Error during message ${msg.header.msg_type}`);
              subscriber.error(err);
            }
          }
        }; // Create completion and error functions so we can bind our cell object
        // tslint:disable-next-line:no-any


        const completion = error => {
          cell.state = error ? types_4.CellState.error : types_4.CellState.finished; // Only do this if start time is still valid. Dont log an error to the subscriber. Error
          // state should end up in the cell output.

          if (startTime > this.sessionStartTime) {
            subscriber.next(cell);
          }

          subscriber.complete();
        }; // When the request finishes we are done


        request.done.then(completion).catch(completion);
      } else {
        subscriber.error(new Error(localize.DataScience.sessionDisposed()));
      }
    };

    this.addToCellData = (cell, output) => {
      const data = cell.data;
      data.outputs = [...data.outputs, output];
      cell.data = data;
    };
  }

  getCurrentState() {
    return Promise.resolve([]);
  }

  execute(code, file, line) {
    // Create a deferred that we'll fire when we're done
    const deferred = async_1.createDeferred(); // Attempt to evaluate this cell in the jupyter notebook

    const observable = this.executeObservable(code, file, line);
    let output;
    observable.subscribe(cells => {
      output = cells;
    }, error => {
      deferred.reject(error);
    }, () => {
      deferred.resolve(output);
    }); // Wait for the execution to finish

    return deferred.promise;
  }

  get onStatusChanged() {
    return this.onStatusChangedEvent.event.bind(this.onStatusChangedEvent);
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  pruneCell(cell) {
    // Remove the #%% of the top of the source if there is any. We don't need
    // this to end up in the exported ipynb file.
    const copy = Object.assign({}, cell.data);
    copy.source = this.pruneSource(cell.data.source);
    return copy;
  }

  pruneSource(source) {
    if (Array.isArray(source) && source.length > 0) {
      if (constants_1.RegExpValues.PythonCellMarker.test(source[0])) {
        return source.slice(1);
      }
    } else {
      const array = source.toString().split('\n').map(s => `${s}\n`);

      if (array.length > 0 && constants_1.RegExpValues.PythonCellMarker.test(array[0])) {
        return array.slice(1);
      }
    }

    return source;
  }

  appendLineFeed(arr, modifier) {
    return arr.map((s, i) => {
      const out = modifier ? modifier(s) : s;
      return i === arr.length - 1 ? `${out}` : `${out}\n`;
    });
  }

  executeCodeObservable(code, file, line) {
    return new Observable_1.Observable(subscriber => {
      // Start out empty;
      const cell = {
        data: {
          source: this.appendLineFeed(code.split('\n')),
          cell_type: 'code',
          outputs: [],
          metadata: {},
          execution_count: 0
        },
        id: uuid(),
        file: file,
        line: line,
        state: types_4.CellState.init
      }; // Keep track of when we started.

      const startTime = Date.now(); // Tell our listener. NOTE: have to do this asap so that markdown cells don't get
      // run before our cells.

      subscriber.next(cell); // Attempt to change to the current directory. When that finishes
      // send our real request

      this.changeDirectoryIfPossible(file, line).then(() => {
        this.handleCodeRequest(subscriber, startTime, cell, code);
      }).catch(() => {
        // Ignore errors if they occur. Just execute normally
        this.handleCodeRequest(subscriber, startTime, cell, code);
      });
    });
  }

  handleExecuteResult(msg, cell) {
    this.addToCellData(cell, {
      output_type: 'execute_result',
      data: msg.content.data,
      metadata: msg.content.metadata,
      execution_count: msg.content.execution_count
    });
  }

  handleExecuteInput(msg, cell) {
    cell.data.execution_count = msg.content.execution_count;
  }

  handleStatusMessage(msg) {
    if (msg.content.execution_state === 'busy') {
      this.onStatusChangedEvent.fire(true);
    } else {
      this.onStatusChangedEvent.fire(false);
    }
  }

  handleStreamMesssage(msg, cell) {
    const output = {
      output_type: 'stream',
      name: msg.content.name,
      text: msg.content.text
    };
    this.addToCellData(cell, output);
  }

  handleDisplayData(msg, cell) {
    const output = {
      output_type: 'display_data',
      data: msg.content.data,
      metadata: msg.content.metadata
    };
    this.addToCellData(cell, output);
  }

  handleError(msg, cell) {
    const output = {
      output_type: 'error',
      ename: msg.content.ename,
      evalue: msg.content.evalue,
      traceback: msg.content.traceback
    };
    this.addToCellData(cell, output);
  }

  generateTempFile() {
    return __awaiter(this, void 0, void 0, function* () {
      // Create a temp file on disk
      const file = yield this.fileSystem.createTemporaryFile('.ipynb'); // Save in our list disposable

      this.disposableRegistry.push(file);
      return file.filePath;
    });
  }

};
JupyterServer = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_3.ILogger)), __param(1, inversify_1.inject(types_4.INotebookProcess)), __param(2, inversify_1.inject(types_2.IFileSystem)), __param(3, inversify_1.inject(types_3.IDisposableRegistry)), __param(4, inversify_1.inject(types_4.IJupyterExecution)), __param(5, inversify_1.inject(types_1.IWorkspaceService)), __param(6, inversify_1.inject(contracts_1.IInterpreterService))], JupyterServer);
exports.JupyterServer = JupyterServer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImp1cHl0ZXJTZXJ2ZXIuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsInJlcXVpcmUiLCJzZXJ2aWNlc18xIiwiZnMiLCJpbnZlcnNpZnlfMSIsInBhdGgiLCJPYnNlcnZhYmxlXzEiLCJ1dWlkIiwidnNjb2RlIiwidHlwZXNfMSIsInR5cGVzXzIiLCJ0eXBlc18zIiwiYXN5bmNfMSIsImxvY2FsaXplIiwiY29uc3RhbnRzXzEiLCJqdXB5dGVySW5zdGFsbEVycm9yXzEiLCJ0eXBlc180IiwiY29udHJhY3RzXzEiLCJKdXB5dGVyU2VydmVyIiwiY29uc3RydWN0b3IiLCJsb2dnZXIiLCJwcm9jZXNzIiwiZmlsZVN5c3RlbSIsImRpc3Bvc2FibGVSZWdpc3RyeSIsImp1cHl0ZXJFeGVjdXRpb24iLCJ3b3Jrc3BhY2VTZXJ2aWNlIiwiaW50ZXJwcmV0ZXJTZXJ2aWNlIiwiaXNEaXNwb3NlZCIsIm9uU3RhdHVzQ2hhbmdlZEV2ZW50IiwiRXZlbnRFbWl0dGVyIiwic3RhcnQiLCJpc05vdGVib29rU3VwcG9ydGVkIiwidGVtcEZpbGUiLCJnZW5lcmF0ZVRlbXBGaWxlIiwiZGlybmFtZSIsImNvbm5JbmZvIiwid2FpdEZvckNvbm5lY3Rpb25JbmZvcm1hdGlvbiIsInNlcnZlclNldHRpbmdzIiwiU2VydmVyQ29ubmVjdGlvbiIsIm1ha2VTZXR0aW5ncyIsImJhc2VVcmwiLCJ0b2tlbiIsInBhZ2VVcmwiLCJ3c1VybCIsInJlcGxhY2UiLCJpbml0IiwiY2FjaGUiLCJjcmVkZW50aWFscyIsInNlc3Npb25NYW5hZ2VyIiwiU2Vzc2lvbk1hbmFnZXIiLCJrZXJuZWxOYW1lIiwiZmluZEtlcm5lbE5hbWUiLCJvcHRpb25zIiwic2Vzc2lvbiIsInN0YXJ0TmV3Iiwic2Vzc2lvblN0YXJ0VGltZSIsIkRhdGUiLCJub3ciLCJrZXJuZWwiLCJyZWFkeSIsImRhcmtUaGVtZSIsIndvcmtiZW5jaCIsImdldENvbmZpZ3VyYXRpb24iLCJ0aGVtZSIsImdldCIsInRlc3QiLCJleGVjdXRlU2lsZW50bHkiLCJpZ25vcmVFcnJvcnMiLCJKdXB5dGVySW5zdGFsbEVycm9yIiwiRGF0YVNjaWVuY2UiLCJqdXB5dGVyTm90U3VwcG9ydGVkIiwicHl0aG9uSW50ZXJhY3RpdmVIZWxwTGluayIsInNodXRkb3duIiwic2h1dGRvd25BbGwiLCJkaXNwb3NlIiwidW5kZWZpbmVkIiwid2FpdEZvcklkbGUiLCJzdGF0dXMiLCJ0aW1lb3V0IiwiZXhlY3V0ZU9ic2VydmFibGUiLCJjb2RlIiwiZmlsZSIsImxpbmUiLCJjb3B5Iiwic3BsaXQiLCJmaXJzdExpbmUiLCJSZWdFeHBWYWx1ZXMiLCJQeXRob25NYXJrZG93bkNlbGxNYXJrZXIiLCJmaXJzdE5vbk1hcmtkb3duIiwiZmluZEluZGV4IiwibCIsInRyaW0iLCJzdGFydHNXaXRoIiwiY29tYmluZU9ic2VydmFibGVzIiwiZXhlY3V0ZU1hcmtkb3duT2JzZXJ2YWJsZSIsInNsaWNlIiwiam9pbiIsImV4ZWN1dGVDb2RlT2JzZXJ2YWJsZSIsIk9ic2VydmFibGUiLCJzdWJzY3JpYmVyIiwiZXJyb3IiLCJFcnJvciIsInNlc3Npb25EaXNwb3NlZCIsImNvbXBsZXRlIiwicmVxdWVzdCIsImdlbmVyYXRlUmVxdWVzdCIsImxvZ0luZm9ybWF0aW9uIiwiY2F0Y2giLCJyZXN0YXJ0S2VybmVsIiwicmVzdGFydCIsInRyYW5zbGF0ZVRvTm90ZWJvb2siLCJjZWxscyIsInB5dGhvblZlcnNpb24iLCJ3YWl0Rm9yUHl0aG9uVmVyc2lvblN0cmluZyIsImZpcnN0Iiwic3Vic3RyIiwibWV0YWRhdGEiLCJrZXJuZWxzcGVjIiwiZGlzcGxheV9uYW1lIiwibGFuZ3VhZ2UiLCJuYW1lIiwibGFuZ3VhZ2VfaW5mbyIsImNvZGVtaXJyb3JfbW9kZSIsInZlcnNpb24iLCJwYXJzZUludCIsIm9yaWdfbmJmb3JtYXQiLCJmaWxlX2V4dGVuc2lvbiIsIm1pbWV0eXBlIiwibnBjb252ZXJ0X2V4cG9ydGVyIiwicHlnbWVudHNfbGV4ZXIiLCJtYXAiLCJjZWxsIiwicHJ1bmVDZWxsIiwibmJmb3JtYXQiLCJuYmZvcm1hdF9taW5vciIsImxhdW5jaE5vdGVib29rIiwic3Bhd24iLCJzaWxlbnQiLCJyZXF1ZXN0RXhlY3V0ZSIsInN0b3Bfb25fZXJyb3IiLCJhbGxvd19zdGRpbiIsIm1hbmFnZXIiLCJyZWZyZXNoU3BlY3MiLCJ3YWl0Rm9yUHl0aG9uVmVyc2lvbiIsInB5dGhvblBhdGgiLCJ3YWl0Rm9yUHl0aG9uUGF0aCIsImJlc3RTY29yZSIsImJlc3RTcGVjIiwia2V5cyIsInNwZWNzIiwia2VybmVsc3BlY3MiLCJzcGVjIiwic2NvcmUiLCJhcmd2IiwidG9Mb2NhbGVMb3dlckNhc2UiLCJwYXRoRXhpc3RzIiwiZGV0YWlscyIsImdldEludGVycHJldGVyRGV0YWlscyIsInZlcnNpb25faW5mbyIsImFyZ3MiLCJyZXN1bHRzIiwiZm9yRWFjaCIsIm8iLCJzdWJzY3JpYmUiLCJpZCIsImFycmF5IiwiayIsImV2ZXJ5IiwiYSIsInN0YXRlIiwiQ2VsbFN0YXRlIiwiZmluaXNoZWQiLCJtYXJrZG93biIsImFwcGVuZExpbmVGZWVkIiwicyIsImRhdGEiLCJjZWxsX3R5cGUiLCJzb3VyY2UiLCJjaGFuZ2VEaXJlY3RvcnlJZlBvc3NpYmxlIiwiZGlyIiwiaGFuZGxlQ29kZVJlcXVlc3QiLCJzdGFydFRpbWUiLCJleGVjdXRpbmciLCJvbklPUHViIiwibXNnIiwiS2VybmVsTWVzc2FnZSIsImlzRXhlY3V0ZVJlc3VsdE1zZyIsImhhbmRsZUV4ZWN1dGVSZXN1bHQiLCJpc0V4ZWN1dGVJbnB1dE1zZyIsImhhbmRsZUV4ZWN1dGVJbnB1dCIsImlzU3RhdHVzTXNnIiwiaGFuZGxlU3RhdHVzTWVzc2FnZSIsImlzU3RyZWFtTXNnIiwiaGFuZGxlU3RyZWFtTWVzc3NhZ2UiLCJpc0Rpc3BsYXlEYXRhTXNnIiwiaGFuZGxlRGlzcGxheURhdGEiLCJpc0Vycm9yTXNnIiwiaGFuZGxlRXJyb3IiLCJsb2dXYXJuaW5nIiwiaGVhZGVyIiwibXNnX3R5cGUiLCJjb250ZW50IiwiZXhlY3V0aW9uX2NvdW50IiwiZXJyIiwibG9nRXJyb3IiLCJjb21wbGV0aW9uIiwiYWRkVG9DZWxsRGF0YSIsIm91dHB1dCIsIm91dHB1dHMiLCJnZXRDdXJyZW50U3RhdGUiLCJleGVjdXRlIiwiZGVmZXJyZWQiLCJjcmVhdGVEZWZlcnJlZCIsIm9ic2VydmFibGUiLCJwcm9taXNlIiwib25TdGF0dXNDaGFuZ2VkIiwiZXZlbnQiLCJiaW5kIiwibXMiLCJzZXRUaW1lb3V0IiwiYXNzaWduIiwicHJ1bmVTb3VyY2UiLCJBcnJheSIsImlzQXJyYXkiLCJQeXRob25DZWxsTWFya2VyIiwidG9TdHJpbmciLCJhcnIiLCJtb2RpZmllciIsIm91dCIsIm91dHB1dF90eXBlIiwiZXhlY3V0aW9uX3N0YXRlIiwiZmlyZSIsInRleHQiLCJlbmFtZSIsImV2YWx1ZSIsInRyYWNlYmFjayIsImNyZWF0ZVRlbXBvcmFyeUZpbGUiLCJwdXNoIiwiZmlsZVBhdGgiLCJpbmplY3RhYmxlIiwiaW5qZWN0IiwiSUxvZ2dlciIsIklOb3RlYm9va1Byb2Nlc3MiLCJJRmlsZVN5c3RlbSIsIklEaXNwb3NhYmxlUmVnaXN0cnkiLCJJSnVweXRlckV4ZWN1dGlvbiIsIklXb3Jrc3BhY2VTZXJ2aWNlIiwiSUlu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dGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbid1c2Ugc3RyaWN0JztcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5yZXF1aXJlKFwiLi4vY29tbW9uL2V4dGVuc2lvbnNcIik7XG5jb25zdCBzZXJ2aWNlc18xID0gcmVxdWlyZShcIkBqdXB5dGVybGFiL3NlcnZpY2VzXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKFwicnhqcy9PYnNlcnZhYmxlXCIpO1xuY29uc3QgdXVpZCA9IHJlcXVpcmUoXCJ1dWlkL3Y0XCIpO1xuY29uc3QgdnNjb2RlID0gcmVxdWlyZShcInZzY29kZVwiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2FwcGxpY2F0aW9uL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uL2NvbW1vbi90eXBlc1wiKTtcbmNvbnN0IGFzeW5jXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3V0aWxzL2FzeW5jXCIpO1xuY29uc3QgbG9jYWxpemUgPSByZXF1aXJlKFwiLi4vY29tbW9uL3V0aWxzL2xvY2FsaXplXCIpO1xuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XG5jb25zdCBqdXB5dGVySW5zdGFsbEVycm9yXzEgPSByZXF1aXJlKFwiLi9qdXB5dGVySW5zdGFsbEVycm9yXCIpO1xuY29uc3QgdHlwZXNfNCA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpO1xuY29uc3QgY29udHJhY3RzXzEgPSByZXF1aXJlKFwiLi4vaW50ZXJwcmV0ZXIvY29udHJhY3RzXCIpO1xuLy8gVGhpcyBjb2RlIGlzIGJhc2VkIG9uIHRoZSBleGFtcGxlcyBoZXJlOlxuLy8gaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvQGp1cHl0ZXJsYWIvc2VydmljZXNcbmxldCBKdXB5dGVyU2VydmVyID0gY2xhc3MgSnVweXRlclNlcnZlciB7XG4gICAgY29uc3RydWN0b3IobG9nZ2VyLCBwcm9jZXNzLCBmaWxlU3lzdGVtLCBkaXNwb3NhYmxlUmVnaXN0cnksIGp1cHl0ZXJFeGVjdXRpb24sIHdvcmtzcGFjZVNlcnZpY2UsIGludGVycHJldGVyU2VydmljZSkge1xuICAgICAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlcjtcbiAgICAgICAgdGhpcy5wcm9jZXNzID0gcHJvY2VzcztcbiAgICAgICAgdGhpcy5maWxlU3lzdGVtID0gZmlsZVN5c3RlbTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlUmVnaXN0cnkgPSBkaXNwb3NhYmxlUmVnaXN0cnk7XG4gICAgICAgIHRoaXMuanVweXRlckV4ZWN1dGlvbiA9IGp1cHl0ZXJFeGVjdXRpb247XG4gICAgICAgIHRoaXMud29ya3NwYWNlU2VydmljZSA9IHdvcmtzcGFjZVNlcnZpY2U7XG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXJTZXJ2aWNlID0gaW50ZXJwcmV0ZXJTZXJ2aWNlO1xuICAgICAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5vblN0YXR1c0NoYW5nZWRFdmVudCA9IG5ldyB2c2NvZGUuRXZlbnRFbWl0dGVyKCk7XG4gICAgICAgIHRoaXMuc3RhcnQgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAoeWllbGQgdGhpcy5qdXB5dGVyRXhlY3V0aW9uLmlzTm90ZWJvb2tTdXBwb3J0ZWQoKSkge1xuICAgICAgICAgICAgICAgIC8vIEZpcnN0IGdlbmVyYXRlIGEgdGVtcG9yYXJ5IG5vdGVib29rLiBXZSBuZWVkIHRoaXMgYXMgaW5wdXQgdG8gdGhlIHNlc3Npb25cbiAgICAgICAgICAgICAgICB0aGlzLnRlbXBGaWxlID0geWllbGQgdGhpcy5nZW5lcmF0ZVRlbXBGaWxlKCk7XG4gICAgICAgICAgICAgICAgLy8gc3RhcnQgb3VyIHByb2Nlc3MgaW4gdGhlIHNhbWUgZGlyZWN0b3J5IGFzIG91ciBpcHluYiBmaWxlLlxuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMucHJvY2Vzcy5zdGFydChwYXRoLmRpcm5hbWUodGhpcy50ZW1wRmlsZSkpO1xuICAgICAgICAgICAgICAgIC8vIFdhaXQgZm9yIGNvbm5lY3Rpb24gaW5mb3JtYXRpb24uIFdlJ2xsIHN0aWNrIHRoYXQgaW50byB0aGUgb3B0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5JbmZvID0geWllbGQgdGhpcy5wcm9jZXNzLndhaXRGb3JDb25uZWN0aW9uSW5mb3JtYXRpb24oKTtcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBjb25uZWN0IHRvIHRoZSBzZXNzc2lvbiBtYW5hZ2VyIGFuZCBmaW5kIGEga2VybmVsIHRoYXQgbWF0Y2hlcyBvdXJcbiAgICAgICAgICAgICAgICAvLyBweXRob24gd2UncmUgdXNpbmdcbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJTZXR0aW5ncyA9IHNlcnZpY2VzXzEuU2VydmVyQ29ubmVjdGlvbi5tYWtlU2V0dGluZ3Moe1xuICAgICAgICAgICAgICAgICAgICBiYXNlVXJsOiBjb25uSW5mby5iYXNlVXJsLFxuICAgICAgICAgICAgICAgICAgICB0b2tlbjogY29ubkluZm8udG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VVcmw6ICcnLFxuICAgICAgICAgICAgICAgICAgICAvLyBBIHdlYiBzb2NrZXQgaXMgcmVxdWlyZWQgdG8gYWxsb3cgdG9rZW4gYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgd3NVcmw6IGNvbm5JbmZvLmJhc2VVcmwucmVwbGFjZSgnaHR0cCcsICd3cycpLFxuICAgICAgICAgICAgICAgICAgICBpbml0OiB7IGNhY2hlOiAnbm8tc3RvcmUnLCBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJyB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uTWFuYWdlciA9IG5ldyBzZXJ2aWNlc18xLlNlc3Npb25NYW5hZ2VyKHsgc2VydmVyU2V0dGluZ3M6IHNlcnZlclNldHRpbmdzIH0pO1xuICAgICAgICAgICAgICAgIC8vIEFzayBKdXB5dGVyIGZvciBpdHMgbGlzdCBvZiBrZXJuZWwgc3BlY3MuXG4gICAgICAgICAgICAgICAgY29uc3Qga2VybmVsTmFtZSA9IHlpZWxkIHRoaXMuZmluZEtlcm5lbE5hbWUodGhpcy5zZXNzaW9uTWFuYWdlcik7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG91ciBzZXNzaW9uIG9wdGlvbnMgdXNpbmcgdGhpcyB0ZW1wb3Jhcnkgbm90ZWJvb2sgYW5kIG91ciBjb25uZWN0aW9uIGluZm9cbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnRlbXBGaWxlLFxuICAgICAgICAgICAgICAgICAgICBrZXJuZWxOYW1lOiBrZXJuZWxOYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTZXR0aW5nczogc2VydmVyU2V0dGluZ3NcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIFN0YXJ0IGEgbmV3IHNlc3Npb25cbiAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb24gPSB5aWVsZCB0aGlzLnNlc3Npb25NYW5hZ2VyLnN0YXJ0TmV3KG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIC8vIFNldHVwIG91ciBzdGFydCB0aW1lLiBXZSByZWplY3QgYW55dGhpbmcgdGhhdCBjb21lcyBpbiBiZWZvcmUgdGhpcyB0aW1lIGR1cmluZyBleGVjdXRlXG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICAvLyBXYWl0IGZvciBpdCB0byBiZSByZWFkeVxuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMuc2Vzc2lvbi5rZXJuZWwucmVhZHk7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRhcmsgdGhlbWUsIGlmIHNvIHNldCBtYXRwbG90IGxpYiB0byB1c2UgZGFya19iYWNrZ3JvdW5kIHNldHRpbmdzXG4gICAgICAgICAgICAgICAgbGV0IGRhcmtUaGVtZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmtiZW5jaCA9IHRoaXMud29ya3NwYWNlU2VydmljZS5nZXRDb25maWd1cmF0aW9uKCd3b3JrYmVuY2gnKTtcbiAgICAgICAgICAgICAgICBpZiAod29ya2JlbmNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRoZW1lID0gd29ya2JlbmNoLmdldCgnY29sb3JUaGVtZScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhlbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhcmtUaGVtZSA9IC9kYXJrL2kudGVzdCh0aGVtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRlU2lsZW50bHkoYGltcG9ydCBwYW5kYXMgYXMgcGRcXHJcXG5pbXBvcnQgbnVtcHlcXHJcXG4lbWF0cGxvdGxpYiBpbmxpbmVcXHJcXG5pbXBvcnQgbWF0cGxvdGxpYi5weXBsb3QgYXMgcGx0JHtkYXJrVGhlbWUgPyAnXFxyXFxuZnJvbSBtYXRwbG90bGliIGltcG9ydCBzdHlsZVxcclxcbnN0eWxlLnVzZShcXCdkYXJrX2JhY2tncm91bmRcXCcpJyA6ICcnfWApLmlnbm9yZUVycm9ycygpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IGp1cHl0ZXJJbnN0YWxsRXJyb3JfMS5KdXB5dGVySW5zdGFsbEVycm9yKGxvY2FsaXplLkRhdGFTY2llbmNlLmp1cHl0ZXJOb3RTdXBwb3J0ZWQoKSwgbG9jYWxpemUuRGF0YVNjaWVuY2UucHl0aG9uSW50ZXJhY3RpdmVIZWxwTGluaygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc2h1dGRvd24gPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zZXNzaW9uTWFuYWdlci5zaHV0ZG93bkFsbCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uTWFuYWdlci5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbk1hbmFnZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMud2FpdEZvcklkbGUgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uICYmIHRoaXMuc2Vzc2lvbi5rZXJuZWwpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnNlc3Npb24ua2VybmVsLnJlYWR5O1xuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLnNlc3Npb24ua2VybmVsLnN0YXR1cyAhPT0gJ2lkbGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMudGltZW91dCgxMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5leGVjdXRlT2JzZXJ2YWJsZSA9IChjb2RlLCBmaWxlLCBsaW5lKSA9PiB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgc2Vzc2lvbiwgZXhlY3V0ZSB0aGUgY29kZSBub3cuXG4gICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSB3aW5kb3dzIGxpbmUgZW5kaW5ncyB3aXRoIHVuaXggbGluZSBlbmRpbmdzLlxuICAgICAgICAgICAgICAgIGNvbnN0IGNvcHkgPSBjb2RlLnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7XG4gICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHdlIGhhdmUgYSBtYXJrZG93biBjZWxsLyBtYXJrZG93biBhbmQgY29kZSBjZWxsIGNvbWJpbmVkLyBvciBqdXN0IGEgY29kZSBjZWxsXG4gICAgICAgICAgICAgICAgY29uc3Qgc3BsaXQgPSBjb3B5LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaXJzdExpbmUgPSBzcGxpdFswXTtcbiAgICAgICAgICAgICAgICBpZiAoY29uc3RhbnRzXzEuUmVnRXhwVmFsdWVzLlB5dGhvbk1hcmtkb3duQ2VsbE1hcmtlci50ZXN0KGZpcnN0TGluZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhdCBsZWFzdCBvbmUgbWFya2Rvd24uIFdlIG1pZ2h0IGhhdmUgdG8gc3BsaXQgaXQgaWYgdGhlcmUgYW55IGxpbmVzIHRoYXQgZG9uJ3QgYmVnaW5cbiAgICAgICAgICAgICAgICAgICAgLy8gd2l0aCAjXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0Tm9uTWFya2Rvd24gPSBzcGxpdC5maW5kSW5kZXgoKGwpID0+IGwudHJpbSgpLmxlbmd0aCA+IDAgJiYgIWwudHJpbSgpLnN0YXJ0c1dpdGgoJyMnKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdE5vbk1hcmtkb3duID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIG5lZWQgdG8gY29tYmluZSByZXN1bHRzXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21iaW5lT2JzZXJ2YWJsZXModGhpcy5leGVjdXRlTWFya2Rvd25PYnNlcnZhYmxlKHNwbGl0LnNsaWNlKDAsIGZpcnN0Tm9uTWFya2Rvd24pLmpvaW4oJ1xcbicpLCBmaWxlLCBsaW5lKSwgdGhpcy5leGVjdXRlQ29kZU9ic2VydmFibGUoc3BsaXQuc2xpY2UoZmlyc3ROb25NYXJrZG93bikuam9pbignXFxuJyksIGZpbGUsIGxpbmUgKyBmaXJzdE5vbk1hcmtkb3duKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBKdXN0IGEgbm9ybWFsIG1hcmtkb3duIGNhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbWJpbmVPYnNlcnZhYmxlcyh0aGlzLmV4ZWN1dGVNYXJrZG93bk9ic2VydmFibGUoY29weSwgZmlsZSwgbGluZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWwgY29kZSBjYXNlXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbWJpbmVPYnNlcnZhYmxlcyh0aGlzLmV4ZWN1dGVDb2RlT2JzZXJ2YWJsZShjb3B5LCBmaWxlLCBsaW5lKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2FuJ3QgcnVuIGJlY2F1c2Ugbm8gc2Vzc2lvblxuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZShzdWJzY3JpYmVyID0+IHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLmVycm9yKG5ldyBFcnJvcihsb2NhbGl6ZS5EYXRhU2NpZW5jZS5zZXNzaW9uRGlzcG9zZWQoKSkpO1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmV4ZWN1dGVTaWxlbnRseSA9IChjb2RlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBzZXNzaW9uLCBleGVjdXRlIHRoZSBjb2RlIG5vdy5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHJlcXVlc3QgYW5kIHJlc29sdmUgd2hlbiBpdCdzIGRvbmUuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLmdlbmVyYXRlUmVxdWVzdChjb2RlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC8vIEZvciBkZWJ1Z2dpbmcgcHVycG9zZXMgd2hlbiBzaWxlbnRseSBpcyBmYWlsaW5nLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVxdWVzdC5vbklPUHViID0gKG1zZzogS2VybmVsTWVzc2FnZS5JSU9QdWJNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5sb2dnZXIubG9nSW5mb3JtYXRpb24oYEV4ZWN1dGUgc2lsZW50bHkgbWVzc2FnZSAke21zZy5oZWFkZXIubXNnX3R5cGV9IDogaGFzRGF0YT0keydkYXRhJyBpbiBtc2cuY29udGVudH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5sb2dnZXIubG9nRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5kb25lLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZ0luZm9ybWF0aW9uKGBFeGVjdXRlIGZvciAke2NvZGV9IHNpbGVudGx5IGZpbmlzaGVkLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGxvY2FsaXplLkRhdGFTY2llbmNlLnNlc3Npb25EaXNwb3NlZCgpKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IobG9jYWxpemUuRGF0YVNjaWVuY2Uuc2Vzc2lvbkRpc3Bvc2VkKCkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kaXNwb3NlID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMub25TdGF0dXNDaGFuZ2VkRXZlbnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2h1dGRvd24oKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVzdGFydEtlcm5lbCA9ICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlc3Npb24gJiYgdGhpcy5zZXNzaW9uLmtlcm5lbCkge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBvdXIgc3RhcnQgdGltZSBzbyB3ZSBkb24ndCBrZWVwIHNlbmRpbmcgcmVzcG9uc2VzXG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICAvLyBSZXN0YXJ0IG91ciBrZXJuZWxcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLnNlc3Npb24ua2VybmVsLnJlc3RhcnQoKTtcbiAgICAgICAgICAgICAgICAvLyBXYWl0IGZvciBpdCB0byBiZSByZWFkeVxuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMuc2Vzc2lvbi5rZXJuZWwucmVhZHk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGxvY2FsaXplLkRhdGFTY2llbmNlLnNlc3Npb25EaXNwb3NlZCgpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudHJhbnNsYXRlVG9Ob3RlYm9vayA9IChjZWxscykgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJvY2Vzcykge1xuICAgICAgICAgICAgICAgIC8vIEZpcnN0IHdlIG5lZWQgdGhlIHB5dGhvbiB2ZXJzaW9uIHdlJ3JlIHJ1bm5pbmdcbiAgICAgICAgICAgICAgICBjb25zdCBweXRob25WZXJzaW9uID0geWllbGQgdGhpcy5wcm9jZXNzLndhaXRGb3JQeXRob25WZXJzaW9uU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgLy8gUHVsbCBvZmYgdGhlIGZpcnN0IG51bWJlci4gU2hvdWxkIGJlICAzIG9yIGEgMlxuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gcHl0aG9uVmVyc2lvbi5zdWJzdHIoMCwgMSk7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoaXMgdG8gYnVpbGQgb3VyIG1ldGFkYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBrZXJuZWxzcGVjOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5X25hbWU6IGBQeXRob24gJHtmaXJzdH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ3VhZ2U6ICdweXRob24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYHB5dGhvbiR7Zmlyc3R9YFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZV9pbmZvOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAncHl0aG9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVtaXJyb3JfbW9kZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdpcHl0aG9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBwYXJzZUludChmaXJzdCwgMTApXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9yaWdfbmJmb3JtYXQ6IDIsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVfZXh0ZW5zaW9uOiAnLnB5JyxcbiAgICAgICAgICAgICAgICAgICAgbWltZXR5cGU6ICd0ZXh0L3gtcHl0aG9uJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3B5dGhvbicsXG4gICAgICAgICAgICAgICAgICAgIG5wY29udmVydF9leHBvcnRlcjogJ3B5dGhvbicsXG4gICAgICAgICAgICAgICAgICAgIHB5Z21lbnRzX2xleGVyOiBgaXB5dGhvbiR7Zmlyc3R9YCxcbiAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogcHl0aG9uVmVyc2lvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gQ29tYmluZSB0aGlzIGludG8gYSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGxzOiBjZWxscy5tYXAoKGNlbGwpID0+IHRoaXMucHJ1bmVDZWxsKGNlbGwpKSxcbiAgICAgICAgICAgICAgICAgICAgbmJmb3JtYXQ6IDQsXG4gICAgICAgICAgICAgICAgICAgIG5iZm9ybWF0X21pbm9yOiAyLFxuICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5sYXVuY2hOb3RlYm9vayA9IChmaWxlKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5wcm9jZXNzLnNwYXduKGZpbGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVJlcXVlc3QgPSAoY29kZSwgc2lsZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXNzaW9uLmtlcm5lbC5yZXF1ZXN0RXhlY3V0ZSh7XG4gICAgICAgICAgICAgICAgLy8gUmVwbGFjZSB3aW5kb3dzIGxpbmUgZW5kaW5ncyB3aXRoIHVuaXggbGluZSBlbmRpbmdzLlxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUucmVwbGFjZSgvXFxyXFxuL2csICdcXG4nKSxcbiAgICAgICAgICAgICAgICBzdG9wX29uX2Vycm9yOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhbGxvd19zdGRpbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2lsZW50OiBzaWxlbnRcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmZpbmRLZXJuZWxOYW1lID0gKG1hbmFnZXIpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIC8vIEFzayB0aGUgc2Vzc2lvbiBtYW5hZ2VyIHRvIHJlZnJlc2ggaXRzIGxpc3Qgb2Yga2VybmVsIHNwZWNzLiBXZSdyZSBnb2luZyB0b1xuICAgICAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZW0gZmluZGluZyB0aGUgYmVzdCBtYXRjaFxuICAgICAgICAgICAgeWllbGQgbWFuYWdlci5yZWZyZXNoU3BlY3MoKTtcbiAgICAgICAgICAgIC8vIEV4dHJhY3Qgb3VyIGN1cnJlbnQgcHl0aG9uIGluZm9ybWF0aW9uIHRoYXQgdGhlIHVzZXIgaGFzIHBpY2tlZC5cbiAgICAgICAgICAgIC8vIFdlJ2xsIG1hdGNoIGFnYWluc3QgdGhpcy5cbiAgICAgICAgICAgIGNvbnN0IHB5dGhvblZlcnNpb24gPSB5aWVsZCB0aGlzLnByb2Nlc3Mud2FpdEZvclB5dGhvblZlcnNpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHB5dGhvblBhdGggPSB5aWVsZCB0aGlzLnByb2Nlc3Mud2FpdEZvclB5dGhvblBhdGgoKTtcbiAgICAgICAgICAgIGxldCBiZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgbGV0IGJlc3RTcGVjO1xuICAgICAgICAgICAgLy8gRW51bWVyYXRlIGFsbCBvZiB0aGUga2VybmVsIHNwZWNzLCBzY29yaW5nIGVhY2ggYXMgZm9sbG93c1xuICAgICAgICAgICAgLy8gLSBQYXRoIG1hdGNoID0gMTAgUG9pbnRzLiBWZXJ5IGxpa2VseSB0aGlzIGlzIHRoZSByaWdodCBvbmVcbiAgICAgICAgICAgIC8vIC0gTGFuZ3VhZ2UgbWF0Y2ggPSAxIHBvaW50LiBNaWdodCBiZSBhIG1hdGNoXG4gICAgICAgICAgICAvLyAtIFZlcnNpb24gbWF0Y2ggPSA0IHBvaW50cyBmb3IgbWFqb3IgdmVyc2lvbiBtYXRjaFxuICAgICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG1hbmFnZXIuc3BlY3Mua2VybmVsc3BlY3MpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3BlYyA9IG1hbmFnZXIuc3BlY3Mua2VybmVsc3BlY3Nba2V5c1tpXV07XG4gICAgICAgICAgICAgICAgbGV0IHNjb3JlID0gMDtcbiAgICAgICAgICAgICAgICBpZiAoc3BlYy5hcmd2Lmxlbmd0aCA+IDAgJiYgc3BlYy5hcmd2WzBdID09PSBweXRob25QYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhdGggbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzcGVjLmxhbmd1YWdlLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT09ICdweXRob24nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExhbmd1YWdlIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgIHNjb3JlICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlZSBpZiB0aGUgdmVyc2lvbiBpcyB0aGUgc2FtZVxuICAgICAgICAgICAgICAgICAgICBpZiAocHl0aG9uVmVyc2lvbiAmJiBzcGVjLmFyZ3YubGVuZ3RoID4gMCAmJiAoeWllbGQgZnMucGF0aEV4aXN0cyhzcGVjLmFyZ3ZbMF0pKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0YWlscyA9IHlpZWxkIHRoaXMuaW50ZXJwcmV0ZXJTZXJ2aWNlLmdldEludGVycHJldGVyRGV0YWlscyhzcGVjLmFyZ3ZbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy52ZXJzaW9uX2luZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV0YWlscy52ZXJzaW9uX2luZm9bMF0gPT09IHB5dGhvblZlcnNpb25bMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFqb3IgdmVyc2lvbiBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29yZSArPSA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV0YWlscy52ZXJzaW9uX2luZm9bMV0gPT09IHB5dGhvblZlcnNpb25bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pbm9yIHZlcnNpb24gbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3JlICs9IDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV0YWlscy52ZXJzaW9uX2luZm9bMl0gPT09IHB5dGhvblZlcnNpb25bMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNaW5vciB2ZXJzaW9uIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcmUgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlnaCBzY29yZVxuICAgICAgICAgICAgICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xuICAgICAgICAgICAgICAgICAgICBiZXN0U2NvcmUgPSBzY29yZTtcbiAgICAgICAgICAgICAgICAgICAgYmVzdFNwZWMgPSBzcGVjLm5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgc3RpbGwgbm90IHNldCwgYXQgbGVhc3QgcGljayB0aGUgZmlyc3Qgb25lXG4gICAgICAgICAgICBpZiAoIWJlc3RTcGVjICYmIGtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJlc3RTcGVjID0gbWFuYWdlci5zcGVjcy5rZXJuZWxzcGVjc1trZXlzWzBdXS5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJlc3RTcGVjO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5jb21iaW5lT2JzZXJ2YWJsZXMgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZShzdWJzY3JpYmVyID0+IHtcbiAgICAgICAgICAgICAgICAvLyBXaGVuIGFsbCBjb21wbGV0ZSwgd2UgaGF2ZSBvdXIgcmVzdWx0c1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBhcmdzLmZvckVhY2gobyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG8uc3Vic2NyaWJlKGMgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1tjLmlkXSA9IGM7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRvIGFuIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnJheSA9IE9iamVjdC5rZXlzKHJlc3VsdHMpLm1hcCgoaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzW2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgb3VyIHN1YnNjcmliZXIgb2Ygb3VyIHRvdGFsIHJlc3VsdHMgaWYgd2UgaGF2ZSB0aGF0IG1hbnlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnJheS5sZW5ndGggPT09IGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlci5uZXh0KGFycmF5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21wbGV0ZSB3aGVuIGV2ZXJ5Ym9keSBpcyBmaW5pc2hlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnJheS5ldmVyeShhID0+IGEuc3RhdGUgPT09IHR5cGVzXzQuQ2VsbFN0YXRlLmZpbmlzaGVkIHx8IGEuc3RhdGUgPT09IHR5cGVzXzQuQ2VsbFN0YXRlLmVycm9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZXhlY3V0ZU1hcmtkb3duT2JzZXJ2YWJsZSA9IChjb2RlLCBmaWxlLCBsaW5lKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKHN1YnNjcmliZXIgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG1hcmtkb3duIGJ5IHN0cmlwcGluZyBvdXQgdGhlIGNvbW1lbnQgYW5kIG1hcmtkb3duIGhlYWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1hcmtkb3duID0gdGhpcy5hcHBlbmRMaW5lRmVlZChjb2RlLnNwbGl0KCdcXG4nKS5zbGljZSgxKSwgcyA9PiBzLnRyaW0oKS5zbGljZSgxKS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGwgPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB1dWlkKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUsXG4gICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmUsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiB0eXBlc180LkNlbGxTdGF0ZS5maW5pc2hlZCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2VsbF90eXBlOiAnbWFya2Rvd24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBtYXJrZG93bixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7fVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLm5leHQoY2VsbCk7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuY2hhbmdlRGlyZWN0b3J5SWZQb3NzaWJsZSA9IChmaWxlLCBsaW5lKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAobGluZSA+PSAwICYmICh5aWVsZCBmcy5wYXRoRXhpc3RzKGZpbGUpKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmV4ZWN1dGVTaWxlbnRseShgJWNkIFwiJHtkaXJ9XCJgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuaGFuZGxlQ29kZVJlcXVlc3QgPSAoc3Vic2NyaWJlciwgc3RhcnRUaW1lLCBjZWxsLCBjb2RlKSA9PiB7XG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyByZXF1ZXN0LlxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IHRoaXMuZ2VuZXJhdGVSZXF1ZXN0KGNvZGUsIGZhbHNlKTtcbiAgICAgICAgICAgIC8vIFRyYW5zaXRpb24gdG8gdGhlIGJ1c3kgc3RhZ2VcbiAgICAgICAgICAgIGNlbGwuc3RhdGUgPSB0eXBlc180LkNlbGxTdGF0ZS5leGVjdXRpbmc7XG4gICAgICAgICAgICAvLyBMaXN0ZW4gdG8gdGhlIHJlcG9uc2UgbWVzc2FnZXMgYW5kIHVwZGF0ZSBzdGF0ZSBhcyB3ZSBnb1xuICAgICAgICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uSU9QdWIgPSAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VydmljZXNfMS5LZXJuZWxNZXNzYWdlLmlzRXhlY3V0ZVJlc3VsdE1zZyhtc2cpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFeGVjdXRlUmVzdWx0KG1zZywgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChzZXJ2aWNlc18xLktlcm5lbE1lc3NhZ2UuaXNFeGVjdXRlSW5wdXRNc2cobXNnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXhlY3V0ZUlucHV0KG1zZywgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChzZXJ2aWNlc18xLktlcm5lbE1lc3NhZ2UuaXNTdGF0dXNNc2cobXNnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RhdHVzTWVzc2FnZShtc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoc2VydmljZXNfMS5LZXJuZWxNZXNzYWdlLmlzU3RyZWFtTXNnKG1zZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0cmVhbU1lc3NzYWdlKG1zZywgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChzZXJ2aWNlc18xLktlcm5lbE1lc3NhZ2UuaXNEaXNwbGF5RGF0YU1zZyhtc2cpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVEaXNwbGF5RGF0YShtc2csIGNlbGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoc2VydmljZXNfMS5LZXJuZWxNZXNzYWdlLmlzRXJyb3JNc2cobXNnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IobXNnLCBjZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZ1dhcm5pbmcoYFVua25vd24gbWVzc2FnZSAke21zZy5oZWFkZXIubXNnX3R5cGV9IDogaGFzRGF0YT0keydkYXRhJyBpbiBtc2cuY29udGVudH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBleGVjdXRpb24gY291bnQsIGFsbCBtZXNzYWdlcyBzaG91bGQgaGF2ZSBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1zZy5jb250ZW50LmV4ZWN1dGlvbl9jb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGwuZGF0YS5leGVjdXRpb25fY291bnQgPSBtc2cuY29udGVudC5leGVjdXRpb25fY291bnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG91ciB1cGRhdGUgaWYgYW55IG5ldyBvdXRwdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXIubmV4dChjZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBub3QgYSByZXN0YXJ0IGVycm9yLCB0aGVuIHRlbGwgdGhlIHN1YnNjcmliZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydFRpbWUgPiB0aGlzLnNlc3Npb25TdGFydFRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dFcnJvcihgRXJyb3IgZHVyaW5nIG1lc3NhZ2UgJHttc2cuaGVhZGVyLm1zZ190eXBlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGNvbXBsZXRpb24gYW5kIGVycm9yIGZ1bmN0aW9ucyBzbyB3ZSBjYW4gYmluZCBvdXIgY2VsbCBvYmplY3RcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGxldGlvbiA9IChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLnN0YXRlID0gZXJyb3IgPyB0eXBlc180LkNlbGxTdGF0ZS5lcnJvciA6IHR5cGVzXzQuQ2VsbFN0YXRlLmZpbmlzaGVkO1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGRvIHRoaXMgaWYgc3RhcnQgdGltZSBpcyBzdGlsbCB2YWxpZC4gRG9udCBsb2cgYW4gZXJyb3IgdG8gdGhlIHN1YnNjcmliZXIuIEVycm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIHN0YXRlIHNob3VsZCBlbmQgdXAgaW4gdGhlIGNlbGwgb3V0cHV0LlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnRUaW1lID4gdGhpcy5zZXNzaW9uU3RhcnRUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLm5leHQoY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gV2hlbiB0aGUgcmVxdWVzdCBmaW5pc2hlcyB3ZSBhcmUgZG9uZVxuICAgICAgICAgICAgICAgIHJlcXVlc3QuZG9uZS50aGVuKGNvbXBsZXRpb24pLmNhdGNoKGNvbXBsZXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlci5lcnJvcihuZXcgRXJyb3IobG9jYWxpemUuRGF0YVNjaWVuY2Uuc2Vzc2lvbkRpc3Bvc2VkKCkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5hZGRUb0NlbGxEYXRhID0gKGNlbGwsIG91dHB1dCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGNlbGwuZGF0YTtcbiAgICAgICAgICAgIGRhdGEub3V0cHV0cyA9IFsuLi5kYXRhLm91dHB1dHMsIG91dHB1dF07XG4gICAgICAgICAgICBjZWxsLmRhdGEgPSBkYXRhO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBnZXRDdXJyZW50U3RhdGUoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgIH1cbiAgICBleGVjdXRlKGNvZGUsIGZpbGUsIGxpbmUpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgdGhhdCB3ZSdsbCBmaXJlIHdoZW4gd2UncmUgZG9uZVxuICAgICAgICBjb25zdCBkZWZlcnJlZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcbiAgICAgICAgLy8gQXR0ZW1wdCB0byBldmFsdWF0ZSB0aGlzIGNlbGwgaW4gdGhlIGp1cHl0ZXIgbm90ZWJvb2tcbiAgICAgICAgY29uc3Qgb2JzZXJ2YWJsZSA9IHRoaXMuZXhlY3V0ZU9ic2VydmFibGUoY29kZSwgZmlsZSwgbGluZSk7XG4gICAgICAgIGxldCBvdXRwdXQ7XG4gICAgICAgIG9ic2VydmFibGUuc3Vic2NyaWJlKChjZWxscykgPT4ge1xuICAgICAgICAgICAgb3V0cHV0ID0gY2VsbHM7XG4gICAgICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXRwdXQpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gV2FpdCBmb3IgdGhlIGV4ZWN1dGlvbiB0byBmaW5pc2hcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfVxuICAgIGdldCBvblN0YXR1c0NoYW5nZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uU3RhdHVzQ2hhbmdlZEV2ZW50LmV2ZW50LmJpbmQodGhpcy5vblN0YXR1c0NoYW5nZWRFdmVudCk7XG4gICAgfVxuICAgIHRpbWVvdXQobXMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xuICAgIH1cbiAgICBwcnVuZUNlbGwoY2VsbCkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlICMlJSBvZiB0aGUgdG9wIG9mIHRoZSBzb3VyY2UgaWYgdGhlcmUgaXMgYW55LiBXZSBkb24ndCBuZWVkXG4gICAgICAgIC8vIHRoaXMgdG8gZW5kIHVwIGluIHRoZSBleHBvcnRlZCBpcHluYiBmaWxlLlxuICAgICAgICBjb25zdCBjb3B5ID0gT2JqZWN0LmFzc2lnbih7fSwgY2VsbC5kYXRhKTtcbiAgICAgICAgY29weS5zb3VyY2UgPSB0aGlzLnBydW5lU291cmNlKGNlbGwuZGF0YS5zb3VyY2UpO1xuICAgICAgICByZXR1cm4gY29weTtcbiAgICB9XG4gICAgcHJ1bmVTb3VyY2Uoc291cmNlKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkgJiYgc291cmNlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChjb25zdGFudHNfMS5SZWdFeHBWYWx1ZXMuUHl0aG9uQ2VsbE1hcmtlci50ZXN0KHNvdXJjZVswXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYXJyYXkgPSBzb3VyY2UudG9TdHJpbmcoKS5zcGxpdCgnXFxuJykubWFwKHMgPT4gYCR7c31cXG5gKTtcbiAgICAgICAgICAgIGlmIChhcnJheS5sZW5ndGggPiAwICYmIGNvbnN0YW50c18xLlJlZ0V4cFZhbHVlcy5QeXRob25DZWxsTWFya2VyLnRlc3QoYXJyYXlbMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycmF5LnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIGFwcGVuZExpbmVGZWVkKGFyciwgbW9kaWZpZXIpIHtcbiAgICAgICAgcmV0dXJuIGFyci5tYXAoKHMsIGkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG1vZGlmaWVyID8gbW9kaWZpZXIocykgOiBzO1xuICAgICAgICAgICAgcmV0dXJuIGkgPT09IGFyci5sZW5ndGggLSAxID8gYCR7b3V0fWAgOiBgJHtvdXR9XFxuYDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGV4ZWN1dGVDb2RlT2JzZXJ2YWJsZShjb2RlLCBmaWxlLCBsaW5lKSB7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUoc3Vic2NyaWJlciA9PiB7XG4gICAgICAgICAgICAvLyBTdGFydCBvdXQgZW1wdHk7XG4gICAgICAgICAgICBjb25zdCBjZWxsID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiB0aGlzLmFwcGVuZExpbmVGZWVkKGNvZGUuc3BsaXQoJ1xcbicpKSxcbiAgICAgICAgICAgICAgICAgICAgY2VsbF90eXBlOiAnY29kZScsXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dHM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YToge30sXG4gICAgICAgICAgICAgICAgICAgIGV4ZWN1dGlvbl9jb3VudDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaWQ6IHV1aWQoKSxcbiAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLFxuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmUsXG4gICAgICAgICAgICAgICAgc3RhdGU6IHR5cGVzXzQuQ2VsbFN0YXRlLmluaXRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHdoZW4gd2Ugc3RhcnRlZC5cbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAvLyBUZWxsIG91ciBsaXN0ZW5lci4gTk9URTogaGF2ZSB0byBkbyB0aGlzIGFzYXAgc28gdGhhdCBtYXJrZG93biBjZWxscyBkb24ndCBnZXRcbiAgICAgICAgICAgIC8vIHJ1biBiZWZvcmUgb3VyIGNlbGxzLlxuICAgICAgICAgICAgc3Vic2NyaWJlci5uZXh0KGNlbGwpO1xuICAgICAgICAgICAgLy8gQXR0ZW1wdCB0byBjaGFuZ2UgdG8gdGhlIGN1cnJlbnQgZGlyZWN0b3J5LiBXaGVuIHRoYXQgZmluaXNoZXNcbiAgICAgICAgICAgIC8vIHNlbmQgb3VyIHJlYWwgcmVxdWVzdFxuICAgICAgICAgICAgdGhpcy5jaGFuZ2VEaXJlY3RvcnlJZlBvc3NpYmxlKGZpbGUsIGxpbmUpXG4gICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlQ29kZVJlcXVlc3Qoc3Vic2NyaWJlciwgc3RhcnRUaW1lLCBjZWxsLCBjb2RlKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIGlmIHRoZXkgb2NjdXIuIEp1c3QgZXhlY3V0ZSBub3JtYWxseVxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlQ29kZVJlcXVlc3Qoc3Vic2NyaWJlciwgc3RhcnRUaW1lLCBjZWxsLCBjb2RlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaGFuZGxlRXhlY3V0ZVJlc3VsdChtc2csIGNlbGwpIHtcbiAgICAgICAgdGhpcy5hZGRUb0NlbGxEYXRhKGNlbGwsIHsgb3V0cHV0X3R5cGU6ICdleGVjdXRlX3Jlc3VsdCcsIGRhdGE6IG1zZy5jb250ZW50LmRhdGEsIG1ldGFkYXRhOiBtc2cuY29udGVudC5tZXRhZGF0YSwgZXhlY3V0aW9uX2NvdW50OiBtc2cuY29udGVudC5leGVjdXRpb25fY291bnQgfSk7XG4gICAgfVxuICAgIGhhbmRsZUV4ZWN1dGVJbnB1dChtc2csIGNlbGwpIHtcbiAgICAgICAgY2VsbC5kYXRhLmV4ZWN1dGlvbl9jb3VudCA9IG1zZy5jb250ZW50LmV4ZWN1dGlvbl9jb3VudDtcbiAgICB9XG4gICAgaGFuZGxlU3RhdHVzTWVzc2FnZShtc2cpIHtcbiAgICAgICAgaWYgKG1zZy5jb250ZW50LmV4ZWN1dGlvbl9zdGF0ZSA9PT0gJ2J1c3knKSB7XG4gICAgICAgICAgICB0aGlzLm9uU3RhdHVzQ2hhbmdlZEV2ZW50LmZpcmUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9uU3RhdHVzQ2hhbmdlZEV2ZW50LmZpcmUoZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGhhbmRsZVN0cmVhbU1lc3NzYWdlKG1zZywgY2VsbCkge1xuICAgICAgICBjb25zdCBvdXRwdXQgPSB7XG4gICAgICAgICAgICBvdXRwdXRfdHlwZTogJ3N0cmVhbScsXG4gICAgICAgICAgICBuYW1lOiBtc2cuY29udGVudC5uYW1lLFxuICAgICAgICAgICAgdGV4dDogbXNnLmNvbnRlbnQudGV4dFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmFkZFRvQ2VsbERhdGEoY2VsbCwgb3V0cHV0KTtcbiAgICB9XG4gICAgaGFuZGxlRGlzcGxheURhdGEobXNnLCBjZWxsKSB7XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IHtcbiAgICAgICAgICAgIG91dHB1dF90eXBlOiAnZGlzcGxheV9kYXRhJyxcbiAgICAgICAgICAgIGRhdGE6IG1zZy5jb250ZW50LmRhdGEsXG4gICAgICAgICAgICBtZXRhZGF0YTogbXNnLmNvbnRlbnQubWV0YWRhdGFcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5hZGRUb0NlbGxEYXRhKGNlbGwsIG91dHB1dCk7XG4gICAgfVxuICAgIGhhbmRsZUVycm9yKG1zZywgY2VsbCkge1xuICAgICAgICBjb25zdCBvdXRwdXQgPSB7XG4gICAgICAgICAgICBvdXRwdXRfdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAgIGVuYW1lOiBtc2cuY29udGVudC5lbmFtZSxcbiAgICAgICAgICAgIGV2YWx1ZTogbXNnLmNvbnRlbnQuZXZhbHVlLFxuICAgICAgICAgICAgdHJhY2ViYWNrOiBtc2cuY29udGVudC50cmFjZWJhY2tcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5hZGRUb0NlbGxEYXRhKGNlbGwsIG91dHB1dCk7XG4gICAgfVxuICAgIGdlbmVyYXRlVGVtcEZpbGUoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB0ZW1wIGZpbGUgb24gZGlza1xuICAgICAgICAgICAgY29uc3QgZmlsZSA9IHlpZWxkIHRoaXMuZmlsZVN5c3RlbS5jcmVhdGVUZW1wb3JhcnlGaWxlKCcuaXB5bmInKTtcbiAgICAgICAgICAgIC8vIFNhdmUgaW4gb3VyIGxpc3QgZGlzcG9zYWJsZVxuICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlUmVnaXN0cnkucHVzaChmaWxlKTtcbiAgICAgICAgICAgIHJldHVybiBmaWxlLmZpbGVQYXRoO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuSnVweXRlclNlcnZlciA9IF9fZGVjb3JhdGUoW1xuICAgIGludmVyc2lmeV8xLmluamVjdGFibGUoKSxcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklMb2dnZXIpKSxcbiAgICBfX3BhcmFtKDEsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc180LklOb3RlYm9va1Byb2Nlc3MpKSxcbiAgICBfX3BhcmFtKDIsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18yLklGaWxlU3lzdGVtKSksXG4gICAgX19wYXJhbSgzLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMy5JRGlzcG9zYWJsZVJlZ2lzdHJ5KSksXG4gICAgX19wYXJhbSg0LCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfNC5JSnVweXRlckV4ZWN1dGlvbikpLFxuICAgIF9fcGFyYW0oNSwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzEuSVdvcmtzcGFjZVNlcnZpY2UpKSxcbiAgICBfX3BhcmFtKDYsIGludmVyc2lmeV8xLmluamVjdChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJTZXJ2aWNlKSlcbl0sIEp1cHl0ZXJTZXJ2ZXIpO1xuZXhwb3J0cy5KdXB5dGVyU2VydmVyID0gSnVweXRlclNlcnZlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWp1cHl0ZXJTZXJ2ZXIuanMubWFwIl19