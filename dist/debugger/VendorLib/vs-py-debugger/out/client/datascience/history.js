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

const fs = require("fs-extra");

const inversify_1 = require("inversify");

const path = require("path");

const vscode_1 = require("vscode");

const types_1 = require("../common/application/types");

const constants_1 = require("../common/constants");

const types_2 = require("../common/types");

const localize = require("../common/utils/localize");

const contracts_1 = require("../interpreter/contracts");

const telemetry_1 = require("../telemetry");

const constants_2 = require("./constants");

const jupyterInstallError_1 = require("./jupyterInstallError");

const types_3 = require("./types");

let History = class History {
  constructor(applicationShell, documentManager, interpreterService, jupyterServer, provider, disposables, cssGenerator, statusProvider, jupyterExecution) {
    this.applicationShell = applicationShell;
    this.documentManager = documentManager;
    this.interpreterService = interpreterService;
    this.jupyterServer = jupyterServer;
    this.provider = provider;
    this.disposables = disposables;
    this.cssGenerator = cssGenerator;
    this.statusProvider = statusProvider;
    this.jupyterExecution = jupyterExecution;
    this.disposed = false;
    this.unfinishedCells = [];
    this.restartingKernel = false;
    this.potentiallyUnfinishedStatus = []; // tslint:disable-next-line: no-any no-empty

    this.onMessage = (message, payload) => {
      switch (message) {
        case constants_2.HistoryMessages.GotoCodeCell:
          this.gotoCode(payload.file, payload.line);
          break;

        case constants_2.HistoryMessages.RestartKernel:
          this.restartKernel();
          break;

        case constants_2.HistoryMessages.Export:
          this.export(payload);
          break;

        case constants_2.HistoryMessages.DeleteAllCells:
          this.logTelemetry(constants_2.Telemetry.DeleteAllCells);
          break;

        case constants_2.HistoryMessages.DeleteCell:
          this.logTelemetry(constants_2.Telemetry.DeleteCell);
          break;

        case constants_2.HistoryMessages.Undo:
          this.logTelemetry(constants_2.Telemetry.Undo);
          break;

        case constants_2.HistoryMessages.Redo:
          this.logTelemetry(constants_2.Telemetry.Redo);
          break;

        case constants_2.HistoryMessages.ExpandAll:
          this.logTelemetry(constants_2.Telemetry.ExpandAll);
          break;

        case constants_2.HistoryMessages.CollapseAll:
          this.logTelemetry(constants_2.Telemetry.CollapseAll);
          break;

        default:
          break;
      }
    };

    this.setStatus = message => {
      const result = this.statusProvider.set(message, this);
      this.potentiallyUnfinishedStatus.push(result);
      return result;
    };

    this.logTelemetry = event => {
      telemetry_1.sendTelemetryEvent(event);
    };

    this.onAddCodeEvent = (cells, editor) => {
      // Send each cell to the other side
      cells.forEach(cell => {
        if (this.webPanel) {
          switch (cell.state) {
            case types_3.CellState.init:
              // Tell the react controls we have a new cell
              this.webPanel.postMessage({
                type: constants_2.HistoryMessages.StartCell,
                payload: cell
              }); // Keep track of this unfinished cell so if we restart we can finish right away.

              this.unfinishedCells.push(cell);
              break;

            case types_3.CellState.executing:
              // Tell the react controls we have an update
              this.webPanel.postMessage({
                type: constants_2.HistoryMessages.UpdateCell,
                payload: cell
              });
              break;

            case types_3.CellState.error:
            case types_3.CellState.finished:
              // Tell the react controls we're done
              this.webPanel.postMessage({
                type: constants_2.HistoryMessages.FinishCell,
                payload: cell
              }); // Remove from the list of unfinished cells

              this.unfinishedCells = this.unfinishedCells.filter(c => c.id !== cell.id);
              break;

            default:
              break;
            // might want to do a progress bar or something
          }
        }
      }); // If we have more than one cell, the second one should be a code cell. After it finishes, we need to inject a new cell entry

      if (cells.length > 1 && cells[1].state === types_3.CellState.finished) {
        // If we have an active editor, do the edit there so that the user can undo it, otherwise don't bother
        if (editor) {
          editor.edit(editBuilder => {
            editBuilder.insert(new vscode_1.Position(cells[1].line, 0), '#%%\n');
          });
        }
      }
    };

    this.onSettingsChanged = () => __awaiter(this, void 0, void 0, function* () {
      // Update our load promise. We need to restart the jupyter server
      if (this.loadPromise) {
        yield this.loadPromise;

        if (this.jupyterServer) {
          yield this.jupyterServer.shutdown();
        }
      }

      this.loadPromise = this.loadJupyterServer();
    });

    this.exportToFile = (cells, file) => __awaiter(this, void 0, void 0, function* () {
      // Take the list of cells, convert them to a notebook json format and write to disk
      if (this.jupyterServer) {
        const notebook = yield this.jupyterServer.translateToNotebook(cells);

        try {
          // tslint:disable-next-line: no-any
          yield fs.writeFile(file, JSON.stringify(notebook), {
            encoding: 'utf8',
            flag: 'w'
          });
          this.applicationShell.showInformationMessage(localize.DataScience.exportDialogComplete().format(file), localize.DataScience.exportOpenQuestion()).then(str => {
            if (str && file && this.jupyterServer) {
              // If the user wants to, open the notebook they just generated.
              this.jupyterServer.launchNotebook(file).ignoreErrors();
            }
          });
        } catch (exc) {
          this.applicationShell.showInformationMessage(localize.DataScience.exportDialogFailed().format(exc));
        }
      }
    });

    this.loadJupyterServer = () => __awaiter(this, void 0, void 0, function* () {
      // Startup our jupyter server
      const status = this.setStatus(localize.DataScience.startingJupyter());

      try {
        yield this.jupyterServer.start();
      } catch (err) {
        throw err;
      } finally {
        if (status) {
          status.dispose();
        }
      }
    });

    this.loadWebPanel = () => __awaiter(this, void 0, void 0, function* () {
      // Create our web panel (it's the UI that shows up for the history)
      // Figure out the name of our main bundle. Should be in our output directory
      const mainScriptPath = path.join(constants_1.EXTENSION_ROOT_DIR, 'out', 'datascience-ui', 'history-react', 'index_bundle.js'); // Generate a css to put into the webpanel for viewing code

      const css = yield this.cssGenerator.generateThemeCss(); // Use this script to create our web view panel. It should contain all of the necessary
      // script to communicate with this class.

      this.webPanel = this.provider.create(this, localize.DataScience.historyTitle(), mainScriptPath, css);
    });

    this.load = () => __awaiter(this, void 0, void 0, function* () {
      // Check to see if we support jupyter or not. If not quick fail
      if (!(yield this.jupyterExecution.isImportSupported())) {
        throw new jupyterInstallError_1.JupyterInstallError(localize.DataScience.jupyterNotSupported(), localize.DataScience.pythonInteractiveHelpLink());
      } // Otherwise wait for both


      yield Promise.all([this.loadJupyterServer(), this.loadWebPanel()]);
    }); // Sign up for configuration changes


    this.settingsChangedDisposable = this.interpreterService.onDidChangeInterpreter(this.onSettingsChanged); // Create our event emitter

    this.closedEvent = new vscode_1.EventEmitter();
    this.disposables.push(this.closedEvent); // Load on a background thread.

    this.loadPromise = this.load();
  }

  show() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.disposed) {
        // Make sure we're loaded first
        yield this.loadPromise; // Then show our web panel.

        if (this.webPanel && this.jupyterServer) {
          yield this.webPanel.show();
        }
      }
    });
  }

  get closed() {
    return this.closedEvent.event;
  }

  addCode(code, file, line, editor) {
    return __awaiter(this, void 0, void 0, function* () {
      // Start a status item
      const status = this.setStatus(localize.DataScience.executingCode());

      try {
        // Make sure we're loaded first.
        yield this.loadPromise; // Then show our webpanel

        yield this.show();

        if (this.jupyterServer) {
          // Attempt to evaluate this cell in the jupyter notebook
          const observable = this.jupyterServer.executeObservable(code, file, line); // Sign up for cell changes

          observable.subscribe(cells => {
            this.onAddCodeEvent(cells, editor);
          }, error => {
            status.dispose();
            this.applicationShell.showErrorMessage(error);
          }, () => {
            // Indicate executing until this cell is done.
            status.dispose();
          });
        }
      } catch (err) {
        status.dispose(); // We failed, dispose of ourselves too so that nobody uses us again

        this.dispose();
        throw err;
      }
    });
  } // tslint:disable-next-line: no-any no-empty


  postMessage(type, payload) {
    if (this.webPanel) {
      this.webPanel.postMessage({
        type: type,
        payload: payload
      });
    }
  }

  dispose() {
    if (!this.disposed) {
      this.disposed = true;
      this.settingsChangedDisposable.dispose();

      if (this.jupyterServer) {
        this.jupyterServer.dispose();
      }

      this.closedEvent.fire(this);
    }
  }

  gotoCode(file, line) {
    this.gotoCodeInternal(file, line).catch(err => {
      this.applicationShell.showErrorMessage(err);
    });
  }

  gotoCodeInternal(file, line) {
    return __awaiter(this, void 0, void 0, function* () {
      let editor;

      if (yield fs.pathExists(file)) {
        editor = yield this.documentManager.showTextDocument(vscode_1.Uri.file(file), {
          viewColumn: vscode_1.ViewColumn.One
        });
      } else {
        // File URI isn't going to work. Look through the active text documents
        editor = this.documentManager.visibleTextEditors.find(te => te.document.fileName === file);

        if (editor) {
          editor.show(vscode_1.ViewColumn.One);
        }
      } // If we found the editor change its selection


      if (editor) {
        editor.revealRange(new vscode_1.Range(line, 0, line, 0));
        editor.selection = new vscode_1.Selection(new vscode_1.Position(line, 0), new vscode_1.Position(line, 0));
      }
    });
  }

  restartKernel() {
    if (this.jupyterServer && !this.restartingKernel) {
      this.restartingKernel = true; // Ask the user if they want us to restart or not.

      const message = localize.DataScience.restartKernelMessage();
      const yes = localize.DataScience.restartKernelMessageYes();
      const no = localize.DataScience.restartKernelMessageNo();
      this.applicationShell.showInformationMessage(message, yes, no).then(v => {
        if (v === yes) {
          // First we need to finish all outstanding cells.
          this.unfinishedCells.forEach(c => {
            c.state = types_3.CellState.error;
            this.webPanel.postMessage({
              type: constants_2.HistoryMessages.FinishCell,
              payload: c
            });
          });
          this.unfinishedCells = [];
          this.potentiallyUnfinishedStatus.forEach(s => s.dispose());
          this.potentiallyUnfinishedStatus = []; // Set our status for the next 2 seconds.

          this.statusProvider.set(localize.DataScience.restartingKernelStatus(), this, 2000); // Then restart the kernel

          this.jupyterServer.restartKernel().ignoreErrors();
          this.restartingKernel = false;
        } else {
          this.restartingKernel = false;
        }
      });
    }
  }

  export(payload) {
    if (payload.contents) {
      // Should be an array of cells
      const cells = payload.contents;

      if (cells && this.applicationShell) {
        const filtersKey = localize.DataScience.exportDialogFilter();
        const filtersObject = {};
        filtersObject[filtersKey] = ['ipynb']; // Bring up the open file dialog box

        this.applicationShell.showSaveDialog({
          saveLabel: localize.DataScience.exportDialogTitle(),
          filters: filtersObject
        }).then(uri => __awaiter(this, void 0, void 0, function* () {
          if (uri) {
            yield this.exportToFile(cells, uri.fsPath);
          }
        }));
      }
    }
  }

};

__decorate([telemetry_1.captureTelemetry(constants_2.Telemetry.GotoSourceCode, {}, false)], History.prototype, "gotoCode", null);

__decorate([telemetry_1.captureTelemetry(constants_2.Telemetry.RestartKernel)], History.prototype, "restartKernel", null);

__decorate([telemetry_1.captureTelemetry(constants_2.Telemetry.ExportNotebook, {}, false)], History.prototype, "export", null);

History = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_1.IApplicationShell)), __param(1, inversify_1.inject(types_1.IDocumentManager)), __param(2, inversify_1.inject(contracts_1.IInterpreterService)), __param(3, inversify_1.inject(types_3.INotebookServer)), __param(4, inversify_1.inject(types_1.IWebPanelProvider)), __param(5, inversify_1.inject(types_2.IDisposableRegistry)), __param(6, inversify_1.inject(types_3.ICodeCssGenerator)), __param(7, inversify_1.inject(types_3.IStatusProvider)), __param(8, inversify_1.inject(types_3.IJupyterExecution))], History);
exports.History = History;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhpc3RvcnkuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsInJlcXVpcmUiLCJmcyIsImludmVyc2lmeV8xIiwicGF0aCIsInZzY29kZV8xIiwidHlwZXNfMSIsImNvbnN0YW50c18xIiwidHlwZXNfMiIsImxvY2FsaXplIiwiY29udHJhY3RzXzEiLCJ0ZWxlbWV0cnlfMSIsImNvbnN0YW50c18yIiwianVweXRlckluc3RhbGxFcnJvcl8xIiwidHlwZXNfMyIsIkhpc3RvcnkiLCJjb25zdHJ1Y3RvciIsImFwcGxpY2F0aW9uU2hlbGwiLCJkb2N1bWVudE1hbmFnZXIiLCJpbnRlcnByZXRlclNlcnZpY2UiLCJqdXB5dGVyU2VydmVyIiwicHJvdmlkZXIiLCJkaXNwb3NhYmxlcyIsImNzc0dlbmVyYXRvciIsInN0YXR1c1Byb3ZpZGVyIiwianVweXRlckV4ZWN1dGlvbiIsImRpc3Bvc2VkIiwidW5maW5pc2hlZENlbGxzIiwicmVzdGFydGluZ0tlcm5lbCIsInBvdGVudGlhbGx5VW5maW5pc2hlZFN0YXR1cyIsIm9uTWVzc2FnZSIsIm1lc3NhZ2UiLCJwYXlsb2FkIiwiSGlzdG9yeU1lc3NhZ2VzIiwiR290b0NvZGVDZWxsIiwiZ290b0NvZGUiLCJmaWxlIiwibGluZSIsIlJlc3RhcnRLZXJuZWwiLCJyZXN0YXJ0S2VybmVsIiwiRXhwb3J0IiwiZXhwb3J0IiwiRGVsZXRlQWxsQ2VsbHMiLCJsb2dUZWxlbWV0cnkiLCJUZWxlbWV0cnkiLCJEZWxldGVDZWxsIiwiVW5kbyIsIlJlZG8iLCJFeHBhbmRBbGwiLCJDb2xsYXBzZUFsbCIsInNldFN0YXR1cyIsInNldCIsInB1c2giLCJldmVudCIsInNlbmRUZWxlbWV0cnlFdmVudCIsIm9uQWRkQ29kZUV2ZW50IiwiY2VsbHMiLCJlZGl0b3IiLCJmb3JFYWNoIiwiY2VsbCIsIndlYlBhbmVsIiwic3RhdGUiLCJDZWxsU3RhdGUiLCJpbml0IiwicG9zdE1lc3NhZ2UiLCJ0eXBlIiwiU3RhcnRDZWxsIiwiZXhlY3V0aW5nIiwiVXBkYXRlQ2VsbCIsImVycm9yIiwiZmluaXNoZWQiLCJGaW5pc2hDZWxsIiwiZmlsdGVyIiwiaWQiLCJlZGl0IiwiZWRpdEJ1aWxkZXIiLCJpbnNlcnQiLCJQb3NpdGlvbiIsIm9uU2V0dGluZ3NDaGFuZ2VkIiwibG9hZFByb21pc2UiLCJzaHV0ZG93biIsImxvYWRKdXB5dGVyU2VydmVyIiwiZXhwb3J0VG9GaWxlIiwibm90ZWJvb2siLCJ0cmFuc2xhdGVUb05vdGVib29rIiwid3JpdGVGaWxlIiwiSlNPTiIsInN0cmluZ2lmeSIsImVuY29kaW5nIiwiZmxhZyIsInNob3dJbmZvcm1hdGlvbk1lc3NhZ2UiLCJEYXRhU2NpZW5jZSIsImV4cG9ydERpYWxvZ0NvbXBsZXRlIiwiZm9ybWF0IiwiZXhwb3J0T3BlblF1ZXN0aW9uIiwic3RyIiwibGF1bmNoTm90ZWJvb2siLCJpZ25vcmVFcnJvcnMiLCJleGMiLCJleHBvcnREaWFsb2dGYWlsZWQiLCJzdGF0dXMiLCJzdGFydGluZ0p1cHl0ZXIiLCJzdGFydCIsImVyciIsImRpc3Bvc2UiLCJsb2FkV2ViUGFuZWwiLCJtYWluU2NyaXB0UGF0aCIsImpvaW4iLCJFWFRFTlNJT05fUk9PVF9ESVIiLCJjc3MiLCJnZW5lcmF0ZVRoZW1lQ3NzIiwiY3JlYXRlIiwiaGlzdG9yeVRpdGxlIiwibG9hZCIsImlzSW1wb3J0U3VwcG9ydGVkIiwiSnVweXRlckluc3RhbGxFcnJvciIsImp1cHl0ZXJOb3RTdXBwb3J0ZWQiLCJweXRob25JbnRlcmFjdGl2ZUhlbHBMaW5rIiwiYWxsIiwic2V0dGluZ3NDaGFuZ2VkRGlzcG9zYWJsZSIsIm9uRGlkQ2hhbmdlSW50ZXJwcmV0ZXIiLCJjbG9zZWRFdmVudCIsIkV2ZW50RW1pdHRlciIsInNob3ciLCJjbG9zZWQiLCJhZGRDb2RlIiwiY29kZSIsImV4ZWN1dGluZ0NvZGUiLCJvYnNlcnZhYmxlIiwiZXhlY3V0ZU9ic2VydmFibGUiLCJzdWJzY3JpYmUiLCJzaG93RXJyb3JNZXNzYWdlIiwiZmlyZSIsImdvdG9Db2RlSW50ZXJuYWwiLCJjYXRjaCIsInBhdGhFeGlzdHMiLCJzaG93VGV4dERvY3VtZW50IiwiVXJpIiwidmlld0NvbHVtbiIsIlZpZXdDb2x1bW4iLCJPbmUiLCJ2aXNpYmxlVGV4dEVkaXRvcnMiLCJmaW5kIiwidGUiLCJkb2N1bWVudCIsImZpbGVOYW1lIiwicmV2ZWFsUmFuZ2UiLCJSYW5nZSIsInNlbGVjdGlvbiIsIlNlbGVjdGlvbiIsInJlc3RhcnRLZXJuZWxNZXNzYWdlIiwieWVzIiwicmVzdGFydEtlcm5lbE1lc3NhZ2VZZXMiLCJubyIsInJlc3RhcnRLZXJuZWxNZXNzYWdlTm8iLCJ2IiwicyIsInJlc3RhcnRpbmdLZXJuZWxTdGF0dXMiLCJjb250ZW50cyIsImZpbHRlcnNLZXkiLCJleHBvcnREaWFsb2dGaWx0ZXIiLCJmaWx0ZXJzT2JqZWN0Iiwic2hvd1NhdmVEaWFsb2ciLCJzYXZlTGFiZWwiLCJleHBvcnREaWFsb2dUaXRsZSIsImZpbHRlcnMiLCJ1cmkiLCJmc1BhdGgiLCJjYXB0dXJlVGVsZW1ldHJ5IiwiR290b1NvdXJjZUNvZGUiLCJwcm90b3R5cGUiLCJFeHBvcnROb3RlYm9vayIsImluamVjdGFibGUiLCJpbmplY3QiLCJJQXBwbGljYXRpb25TaGVsbCIsIklEb2N1bWVudE1hbmFnZXIiLCJJSW50ZXJwcmV0ZXJTZXJ2aWNlIiwiSU5vdGVib29rU2VydmVyIiwiSVdlYlBhbmVsUHJvdmlkZXIiLCJJRGlzcG9zYWJsZVJlZ2lzdHJ5IiwiSUNvZGVDc3NHZW5lcmF0b3IiLCJJU3RhdHVzUHJvdmlkZXIiLCJJSnVweXRlckV4ZWN1dGlvbiJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8sQ0FBQ0MsUUFBZixLQUE0QixVQUEvRCxFQUEyRUwsQ0FBQyxHQUFHSSxPQUFPLENBQUNDLFFBQVIsQ0FBaUJaLFVBQWpCLEVBQTZCQyxNQUE3QixFQUFxQ0MsR0FBckMsRUFBMENDLElBQTFDLENBQUosQ0FBM0UsS0FDSyxLQUFLLElBQUlVLENBQUMsR0FBR2IsVUFBVSxDQUFDTSxNQUFYLEdBQW9CLENBQWpDLEVBQW9DTyxDQUFDLElBQUksQ0FBekMsRUFBNENBLENBQUMsRUFBN0MsRUFBaUQsSUFBSUgsQ0FBQyxHQUFHVixVQUFVLENBQUNhLENBQUQsQ0FBbEIsRUFBdUJOLENBQUMsR0FBRyxDQUFDSCxDQUFDLEdBQUcsQ0FBSixHQUFRTSxDQUFDLENBQUNILENBQUQsQ0FBVCxHQUFlSCxDQUFDLEdBQUcsQ0FBSixHQUFRTSxD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QUFDMkssbUJBQTNCLENBQUosQ0FQVSxFQVFqQnhNLE9BQU8sQ0FBQyxDQUFELEVBQUl3QixXQUFXLENBQUMwSyxNQUFaLENBQW1CL0osT0FBTyxDQUFDc0ssaUJBQTNCLENBQUosQ0FSVSxFQVNqQnpNLE9BQU8sQ0FBQyxDQUFELEVBQUl3QixXQUFXLENBQUMwSyxNQUFaLENBQW1CL0osT0FBTyxDQUFDdUssZUFBM0IsQ0FBSixDQVRVLEVBVWpCMU0sT0FBTyxDQUFDLENBQUQsRUFBSXdCLFdBQVcsQ0FBQzBLLE1BQVosQ0FBbUIvSixPQUFPLENBQUN3SyxpQkFBM0IsQ0FBSixDQVZVLENBQUQsRUFXakJ2SyxPQVhpQixDQUFwQjtBQVlBZixPQUFPLENBQUNlLE9BQVIsR0FBa0JBLE9BQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4ndXNlIHN0cmljdCc7XG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xucmVxdWlyZShcIi4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCB2c2NvZGVfMSA9IHJlcXVpcmUoXCJ2c2NvZGVcIik7XG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9hcHBsaWNhdGlvbi90eXBlc1wiKTtcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9jb25zdGFudHNcIik7XG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uL2NvbW1vbi90eXBlc1wiKTtcbmNvbnN0IGxvY2FsaXplID0gcmVxdWlyZShcIi4uL2NvbW1vbi91dGlscy9sb2NhbGl6ZVwiKTtcbmNvbnN0IGNvbnRyYWN0c18xID0gcmVxdWlyZShcIi4uL2ludGVycHJldGVyL2NvbnRyYWN0c1wiKTtcbmNvbnN0IHRlbGVtZXRyeV8xID0gcmVxdWlyZShcIi4uL3RlbGVtZXRyeVwiKTtcbmNvbnN0IGNvbnN0YW50c18yID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xuY29uc3QganVweXRlckluc3RhbGxFcnJvcl8xID0gcmVxdWlyZShcIi4vanVweXRlckluc3RhbGxFcnJvclwiKTtcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi90eXBlc1wiKTtcbmxldCBIaXN0b3J5ID0gY2xhc3MgSGlzdG9yeSB7XG4gICAgY29uc3RydWN0b3IoYXBwbGljYXRpb25TaGVsbCwgZG9jdW1lbnRNYW5hZ2VyLCBpbnRlcnByZXRlclNlcnZpY2UsIGp1cHl0ZXJTZXJ2ZXIsIHByb3ZpZGVyLCBkaXNwb3NhYmxlcywgY3NzR2VuZXJhdG9yLCBzdGF0dXNQcm92aWRlciwganVweXRlckV4ZWN1dGlvbikge1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uU2hlbGwgPSBhcHBsaWNhdGlvblNoZWxsO1xuICAgICAgICB0aGlzLmRvY3VtZW50TWFuYWdlciA9IGRvY3VtZW50TWFuYWdlcjtcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlclNlcnZpY2UgPSBpbnRlcnByZXRlclNlcnZpY2U7XG4gICAgICAgIHRoaXMuanVweXRlclNlcnZlciA9IGp1cHl0ZXJTZXJ2ZXI7XG4gICAgICAgIHRoaXMucHJvdmlkZXIgPSBwcm92aWRlcjtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IGRpc3Bvc2FibGVzO1xuICAgICAgICB0aGlzLmNzc0dlbmVyYXRvciA9IGNzc0dlbmVyYXRvcjtcbiAgICAgICAgdGhpcy5zdGF0dXNQcm92aWRlciA9IHN0YXR1c1Byb3ZpZGVyO1xuICAgICAgICB0aGlzLmp1cHl0ZXJFeGVjdXRpb24gPSBqdXB5dGVyRXhlY3V0aW9uO1xuICAgICAgICB0aGlzLmRpc3Bvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMudW5maW5pc2hlZENlbGxzID0gW107XG4gICAgICAgIHRoaXMucmVzdGFydGluZ0tlcm5lbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBvdGVudGlhbGx5VW5maW5pc2hlZFN0YXR1cyA9IFtdO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWFueSBuby1lbXB0eVxuICAgICAgICB0aGlzLm9uTWVzc2FnZSA9IChtZXNzYWdlLCBwYXlsb2FkKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5Hb3RvQ29kZUNlbGw6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290b0NvZGUocGF5bG9hZC5maWxlLCBwYXlsb2FkLmxpbmUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5SZXN0YXJ0S2VybmVsOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RhcnRLZXJuZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuRXhwb3J0OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydChwYXlsb2FkKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuRGVsZXRlQWxsQ2VsbHM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9nVGVsZW1ldHJ5KGNvbnN0YW50c18yLlRlbGVtZXRyeS5EZWxldGVBbGxDZWxscyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkRlbGV0ZUNlbGw6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9nVGVsZW1ldHJ5KGNvbnN0YW50c18yLlRlbGVtZXRyeS5EZWxldGVDZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuVW5kbzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LlVuZG8pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5SZWRvOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ1RlbGVtZXRyeShjb25zdGFudHNfMi5UZWxlbWV0cnkuUmVkbyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkV4cGFuZEFsbDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LkV4cGFuZEFsbCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkNvbGxhcHNlQWxsOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ1RlbGVtZXRyeShjb25zdGFudHNfMi5UZWxlbWV0cnkuQ29sbGFwc2VBbGwpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5zdGF0dXNQcm92aWRlci5zZXQobWVzc2FnZSwgdGhpcyk7XG4gICAgICAgICAgICB0aGlzLnBvdGVudGlhbGx5VW5maW5pc2hlZFN0YXR1cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmxvZ1RlbGVtZXRyeSA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGV2ZW50KTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5vbkFkZENvZGVFdmVudCA9IChjZWxscywgZWRpdG9yKSA9PiB7XG4gICAgICAgICAgICAvLyBTZW5kIGVhY2ggY2VsbCB0byB0aGUgb3RoZXIgc2lkZVxuICAgICAgICAgICAgY2VsbHMuZm9yRWFjaCgoY2VsbCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLndlYlBhbmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2VsbC5zdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlc18zLkNlbGxTdGF0ZS5pbml0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRlbGwgdGhlIHJlYWN0IGNvbnRyb2xzIHdlIGhhdmUgYSBuZXcgY2VsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2ViUGFuZWwucG9zdE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuU3RhcnRDZWxsLCBwYXlsb2FkOiBjZWxsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhpcyB1bmZpbmlzaGVkIGNlbGwgc28gaWYgd2UgcmVzdGFydCB3ZSBjYW4gZmluaXNoIHJpZ2h0IGF3YXkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bmZpbmlzaGVkQ2VsbHMucHVzaChjZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMy5DZWxsU3RhdGUuZXhlY3V0aW5nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRlbGwgdGhlIHJlYWN0IGNvbnRyb2xzIHdlIGhhdmUgYW4gdXBkYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWJQYW5lbC5wb3N0TWVzc2FnZSh7IHR5cGU6IGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5VcGRhdGVDZWxsLCBwYXlsb2FkOiBjZWxsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlc18zLkNlbGxTdGF0ZS5lcnJvcjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMy5DZWxsU3RhdGUuZmluaXNoZWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGVsbCB0aGUgcmVhY3QgY29udHJvbHMgd2UncmUgZG9uZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2ViUGFuZWwucG9zdE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuRmluaXNoQ2VsbCwgcGF5bG9hZDogY2VsbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSB0aGUgbGlzdCBvZiB1bmZpbmlzaGVkIGNlbGxzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bmZpbmlzaGVkQ2VsbHMgPSB0aGlzLnVuZmluaXNoZWRDZWxscy5maWx0ZXIoYyA9PiBjLmlkICE9PSBjZWxsLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIG1pZ2h0IHdhbnQgdG8gZG8gYSBwcm9ncmVzcyBiYXIgb3Igc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgbW9yZSB0aGFuIG9uZSBjZWxsLCB0aGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgYSBjb2RlIGNlbGwuIEFmdGVyIGl0IGZpbmlzaGVzLCB3ZSBuZWVkIHRvIGluamVjdCBhIG5ldyBjZWxsIGVudHJ5XG4gICAgICAgICAgICBpZiAoY2VsbHMubGVuZ3RoID4gMSAmJiBjZWxsc1sxXS5zdGF0ZSA9PT0gdHlwZXNfMy5DZWxsU3RhdGUuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGFuIGFjdGl2ZSBlZGl0b3IsIGRvIHRoZSBlZGl0IHRoZXJlIHNvIHRoYXQgdGhlIHVzZXIgY2FuIHVuZG8gaXQsIG90aGVyd2lzZSBkb24ndCBib3RoZXJcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRvci5lZGl0KChlZGl0QnVpbGRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdEJ1aWxkZXIuaW5zZXJ0KG5ldyB2c2NvZGVfMS5Qb3NpdGlvbihjZWxsc1sxXS5saW5lLCAwKSwgJyMlJVxcbicpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMub25TZXR0aW5nc0NoYW5nZWQgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgb3VyIGxvYWQgcHJvbWlzZS4gV2UgbmVlZCB0byByZXN0YXJ0IHRoZSBqdXB5dGVyIHNlcnZlclxuICAgICAgICAgICAgaWYgKHRoaXMubG9hZFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmxvYWRQcm9taXNlO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmp1cHl0ZXJTZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5qdXB5dGVyU2VydmVyLnNodXRkb3duKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2FkUHJvbWlzZSA9IHRoaXMubG9hZEp1cHl0ZXJTZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZXhwb3J0VG9GaWxlID0gKGNlbGxzLCBmaWxlKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBUYWtlIHRoZSBsaXN0IG9mIGNlbGxzLCBjb252ZXJ0IHRoZW0gdG8gYSBub3RlYm9vayBqc29uIGZvcm1hdCBhbmQgd3JpdGUgdG8gZGlza1xuICAgICAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vdGVib29rID0geWllbGQgdGhpcy5qdXB5dGVyU2VydmVyLnRyYW5zbGF0ZVRvTm90ZWJvb2soY2VsbHMpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tYW55XG4gICAgICAgICAgICAgICAgICAgIHlpZWxkIGZzLndyaXRlRmlsZShmaWxlLCBKU09OLnN0cmluZ2lmeShub3RlYm9vayksIHsgZW5jb2Rpbmc6ICd1dGY4JywgZmxhZzogJ3cnIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGxpY2F0aW9uU2hlbGwuc2hvd0luZm9ybWF0aW9uTWVzc2FnZShsb2NhbGl6ZS5EYXRhU2NpZW5jZS5leHBvcnREaWFsb2dDb21wbGV0ZSgpLmZvcm1hdChmaWxlKSwgbG9jYWxpemUuRGF0YVNjaWVuY2UuZXhwb3J0T3BlblF1ZXN0aW9uKCkpLnRoZW4oKHN0cikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0ciAmJiBmaWxlICYmIHRoaXMuanVweXRlclNlcnZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSB1c2VyIHdhbnRzIHRvLCBvcGVuIHRoZSBub3RlYm9vayB0aGV5IGp1c3QgZ2VuZXJhdGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuanVweXRlclNlcnZlci5sYXVuY2hOb3RlYm9vayhmaWxlKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChleGMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBsaWNhdGlvblNoZWxsLnNob3dJbmZvcm1hdGlvbk1lc3NhZ2UobG9jYWxpemUuRGF0YVNjaWVuY2UuZXhwb3J0RGlhbG9nRmFpbGVkKCkuZm9ybWF0KGV4YykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubG9hZEp1cHl0ZXJTZXJ2ZXIgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBTdGFydHVwIG91ciBqdXB5dGVyIHNlcnZlclxuICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gdGhpcy5zZXRTdGF0dXMobG9jYWxpemUuRGF0YVNjaWVuY2Uuc3RhcnRpbmdKdXB5dGVyKCkpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmp1cHl0ZXJTZXJ2ZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5sb2FkV2ViUGFuZWwgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgb3VyIHdlYiBwYW5lbCAoaXQncyB0aGUgVUkgdGhhdCBzaG93cyB1cCBmb3IgdGhlIGhpc3RvcnkpXG4gICAgICAgICAgICAvLyBGaWd1cmUgb3V0IHRoZSBuYW1lIG9mIG91ciBtYWluIGJ1bmRsZS4gU2hvdWxkIGJlIGluIG91ciBvdXRwdXQgZGlyZWN0b3J5XG4gICAgICAgICAgICBjb25zdCBtYWluU2NyaXB0UGF0aCA9IHBhdGguam9pbihjb25zdGFudHNfMS5FWFRFTlNJT05fUk9PVF9ESVIsICdvdXQnLCAnZGF0YXNjaWVuY2UtdWknLCAnaGlzdG9yeS1yZWFjdCcsICdpbmRleF9idW5kbGUuanMnKTtcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgY3NzIHRvIHB1dCBpbnRvIHRoZSB3ZWJwYW5lbCBmb3Igdmlld2luZyBjb2RlXG4gICAgICAgICAgICBjb25zdCBjc3MgPSB5aWVsZCB0aGlzLmNzc0dlbmVyYXRvci5nZW5lcmF0ZVRoZW1lQ3NzKCk7XG4gICAgICAgICAgICAvLyBVc2UgdGhpcyBzY3JpcHQgdG8gY3JlYXRlIG91ciB3ZWIgdmlldyBwYW5lbC4gSXQgc2hvdWxkIGNvbnRhaW4gYWxsIG9mIHRoZSBuZWNlc3NhcnlcbiAgICAgICAgICAgIC8vIHNjcmlwdCB0byBjb21tdW5pY2F0ZSB3aXRoIHRoaXMgY2xhc3MuXG4gICAgICAgICAgICB0aGlzLndlYlBhbmVsID0gdGhpcy5wcm92aWRlci5jcmVhdGUodGhpcywgbG9jYWxpemUuRGF0YVNjaWVuY2UuaGlzdG9yeVRpdGxlKCksIG1haW5TY3JpcHRQYXRoLCBjc3MpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5sb2FkID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHdlIHN1cHBvcnQganVweXRlciBvciBub3QuIElmIG5vdCBxdWljayBmYWlsXG4gICAgICAgICAgICBpZiAoISh5aWVsZCB0aGlzLmp1cHl0ZXJFeGVjdXRpb24uaXNJbXBvcnRTdXBwb3J0ZWQoKSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcganVweXRlckluc3RhbGxFcnJvcl8xLkp1cHl0ZXJJbnN0YWxsRXJyb3IobG9jYWxpemUuRGF0YVNjaWVuY2UuanVweXRlck5vdFN1cHBvcnRlZCgpLCBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5weXRob25JbnRlcmFjdGl2ZUhlbHBMaW5rKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIHdhaXQgZm9yIGJvdGhcbiAgICAgICAgICAgIHlpZWxkIFByb21pc2UuYWxsKFt0aGlzLmxvYWRKdXB5dGVyU2VydmVyKCksIHRoaXMubG9hZFdlYlBhbmVsKCldKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFNpZ24gdXAgZm9yIGNvbmZpZ3VyYXRpb24gY2hhbmdlc1xuICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZERpc3Bvc2FibGUgPSB0aGlzLmludGVycHJldGVyU2VydmljZS5vbkRpZENoYW5nZUludGVycHJldGVyKHRoaXMub25TZXR0aW5nc0NoYW5nZWQpO1xuICAgICAgICAvLyBDcmVhdGUgb3VyIGV2ZW50IGVtaXR0ZXJcbiAgICAgICAgdGhpcy5jbG9zZWRFdmVudCA9IG5ldyB2c2NvZGVfMS5FdmVudEVtaXR0ZXIoKTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5wdXNoKHRoaXMuY2xvc2VkRXZlbnQpO1xuICAgICAgICAvLyBMb2FkIG9uIGEgYmFja2dyb3VuZCB0aHJlYWQuXG4gICAgICAgIHRoaXMubG9hZFByb21pc2UgPSB0aGlzLmxvYWQoKTtcbiAgICB9XG4gICAgc2hvdygpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5kaXNwb3NlZCkge1xuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSdyZSBsb2FkZWQgZmlyc3RcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmxvYWRQcm9taXNlO1xuICAgICAgICAgICAgICAgIC8vIFRoZW4gc2hvdyBvdXIgd2ViIHBhbmVsLlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLndlYlBhbmVsICYmIHRoaXMuanVweXRlclNlcnZlcikge1xuICAgICAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLndlYlBhbmVsLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXQgY2xvc2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9zZWRFdmVudC5ldmVudDtcbiAgICB9XG4gICAgYWRkQ29kZShjb2RlLCBmaWxlLCBsaW5lLCBlZGl0b3IpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIC8vIFN0YXJ0IGEgc3RhdHVzIGl0ZW1cbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHRoaXMuc2V0U3RhdHVzKGxvY2FsaXplLkRhdGFTY2llbmNlLmV4ZWN1dGluZ0NvZGUoKSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSdyZSBsb2FkZWQgZmlyc3QuXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5sb2FkUHJvbWlzZTtcbiAgICAgICAgICAgICAgICAvLyBUaGVuIHNob3cgb3VyIHdlYnBhbmVsXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zaG93KCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBdHRlbXB0IHRvIGV2YWx1YXRlIHRoaXMgY2VsbCBpbiB0aGUganVweXRlciBub3RlYm9va1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvYnNlcnZhYmxlID0gdGhpcy5qdXB5dGVyU2VydmVyLmV4ZWN1dGVPYnNlcnZhYmxlKGNvZGUsIGZpbGUsIGxpbmUpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaWduIHVwIGZvciBjZWxsIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2YWJsZS5zdWJzY3JpYmUoKGNlbGxzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQWRkQ29kZUV2ZW50KGNlbGxzLCBlZGl0b3IpO1xuICAgICAgICAgICAgICAgICAgICB9LCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGxpY2F0aW9uU2hlbGwuc2hvd0Vycm9yTWVzc2FnZShlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0sICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluZGljYXRlIGV4ZWN1dGluZyB1bnRpbCB0aGlzIGNlbGwgaXMgZG9uZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIC8vIFdlIGZhaWxlZCwgZGlzcG9zZSBvZiBvdXJzZWx2ZXMgdG9vIHNvIHRoYXQgbm9ib2R5IHVzZXMgdXMgYWdhaW5cbiAgICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWFueSBuby1lbXB0eVxuICAgIHBvc3RNZXNzYWdlKHR5cGUsIHBheWxvYWQpIHtcbiAgICAgICAgaWYgKHRoaXMud2ViUGFuZWwpIHtcbiAgICAgICAgICAgIHRoaXMud2ViUGFuZWwucG9zdE1lc3NhZ2UoeyB0eXBlOiB0eXBlLCBwYXlsb2FkOiBwYXlsb2FkIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIGlmICghdGhpcy5kaXNwb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZERpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuanVweXRlclNlcnZlci5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNsb3NlZEV2ZW50LmZpcmUodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ290b0NvZGUoZmlsZSwgbGluZSkge1xuICAgICAgICB0aGlzLmdvdG9Db2RlSW50ZXJuYWwoZmlsZSwgbGluZSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXBwbGljYXRpb25TaGVsbC5zaG93RXJyb3JNZXNzYWdlKGVycik7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnb3RvQ29kZUludGVybmFsKGZpbGUsIGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGxldCBlZGl0b3I7XG4gICAgICAgICAgICBpZiAoeWllbGQgZnMucGF0aEV4aXN0cyhmaWxlKSkge1xuICAgICAgICAgICAgICAgIGVkaXRvciA9IHlpZWxkIHRoaXMuZG9jdW1lbnRNYW5hZ2VyLnNob3dUZXh0RG9jdW1lbnQodnNjb2RlXzEuVXJpLmZpbGUoZmlsZSksIHsgdmlld0NvbHVtbjogdnNjb2RlXzEuVmlld0NvbHVtbi5PbmUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGaWxlIFVSSSBpc24ndCBnb2luZyB0byB3b3JrLiBMb29rIHRocm91Z2ggdGhlIGFjdGl2ZSB0ZXh0IGRvY3VtZW50c1xuICAgICAgICAgICAgICAgIGVkaXRvciA9IHRoaXMuZG9jdW1lbnRNYW5hZ2VyLnZpc2libGVUZXh0RWRpdG9ycy5maW5kKHRlID0+IHRlLmRvY3VtZW50LmZpbGVOYW1lID09PSBmaWxlKTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRvci5zaG93KHZzY29kZV8xLlZpZXdDb2x1bW4uT25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBmb3VuZCB0aGUgZWRpdG9yIGNoYW5nZSBpdHMgc2VsZWN0aW9uXG4gICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgZWRpdG9yLnJldmVhbFJhbmdlKG5ldyB2c2NvZGVfMS5SYW5nZShsaW5lLCAwLCBsaW5lLCAwKSk7XG4gICAgICAgICAgICAgICAgZWRpdG9yLnNlbGVjdGlvbiA9IG5ldyB2c2NvZGVfMS5TZWxlY3Rpb24obmV3IHZzY29kZV8xLlBvc2l0aW9uKGxpbmUsIDApLCBuZXcgdnNjb2RlXzEuUG9zaXRpb24obGluZSwgMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVzdGFydEtlcm5lbCgpIHtcbiAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlciAmJiAhdGhpcy5yZXN0YXJ0aW5nS2VybmVsKSB7XG4gICAgICAgICAgICB0aGlzLnJlc3RhcnRpbmdLZXJuZWwgPSB0cnVlO1xuICAgICAgICAgICAgLy8gQXNrIHRoZSB1c2VyIGlmIHRoZXkgd2FudCB1cyB0byByZXN0YXJ0IG9yIG5vdC5cbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5yZXN0YXJ0S2VybmVsTWVzc2FnZSgpO1xuICAgICAgICAgICAgY29uc3QgeWVzID0gbG9jYWxpemUuRGF0YVNjaWVuY2UucmVzdGFydEtlcm5lbE1lc3NhZ2VZZXMoKTtcbiAgICAgICAgICAgIGNvbnN0IG5vID0gbG9jYWxpemUuRGF0YVNjaWVuY2UucmVzdGFydEtlcm5lbE1lc3NhZ2VObygpO1xuICAgICAgICAgICAgdGhpcy5hcHBsaWNhdGlvblNoZWxsLnNob3dJbmZvcm1hdGlvbk1lc3NhZ2UobWVzc2FnZSwgeWVzLCBubykudGhlbih2ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodiA9PT0geWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcnN0IHdlIG5lZWQgdG8gZmluaXNoIGFsbCBvdXRzdGFuZGluZyBjZWxscy5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmZpbmlzaGVkQ2VsbHMuZm9yRWFjaChjID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuc3RhdGUgPSB0eXBlc18zLkNlbGxTdGF0ZS5lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2ViUGFuZWwucG9zdE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuRmluaXNoQ2VsbCwgcGF5bG9hZDogYyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5maW5pc2hlZENlbGxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG90ZW50aWFsbHlVbmZpbmlzaGVkU3RhdHVzLmZvckVhY2gocyA9PiBzLmRpc3Bvc2UoKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG90ZW50aWFsbHlVbmZpbmlzaGVkU3RhdHVzID0gW107XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBvdXIgc3RhdHVzIGZvciB0aGUgbmV4dCAyIHNlY29uZHMuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzUHJvdmlkZXIuc2V0KGxvY2FsaXplLkRhdGFTY2llbmNlLnJlc3RhcnRpbmdLZXJuZWxTdGF0dXMoKSwgdGhpcywgMjAwMCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gcmVzdGFydCB0aGUga2VybmVsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuanVweXRlclNlcnZlci5yZXN0YXJ0S2VybmVsKCkuaWdub3JlRXJyb3JzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdGFydGluZ0tlcm5lbCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0YXJ0aW5nS2VybmVsID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZXhwb3J0KHBheWxvYWQpIHtcbiAgICAgICAgaWYgKHBheWxvYWQuY29udGVudHMpIHtcbiAgICAgICAgICAgIC8vIFNob3VsZCBiZSBhbiBhcnJheSBvZiBjZWxsc1xuICAgICAgICAgICAgY29uc3QgY2VsbHMgPSBwYXlsb2FkLmNvbnRlbnRzO1xuICAgICAgICAgICAgaWYgKGNlbGxzICYmIHRoaXMuYXBwbGljYXRpb25TaGVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlcnNLZXkgPSBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5leHBvcnREaWFsb2dGaWx0ZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWx0ZXJzT2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgZmlsdGVyc09iamVjdFtmaWx0ZXJzS2V5XSA9IFsnaXB5bmInXTtcbiAgICAgICAgICAgICAgICAvLyBCcmluZyB1cCB0aGUgb3BlbiBmaWxlIGRpYWxvZyBib3hcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGxpY2F0aW9uU2hlbGwuc2hvd1NhdmVEaWFsb2coe1xuICAgICAgICAgICAgICAgICAgICBzYXZlTGFiZWw6IGxvY2FsaXplLkRhdGFTY2llbmNlLmV4cG9ydERpYWxvZ1RpdGxlKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnM6IGZpbHRlcnNPYmplY3RcbiAgICAgICAgICAgICAgICB9KS50aGVuKCh1cmkpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVyaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5leHBvcnRUb0ZpbGUoY2VsbHMsIHVyaS5mc1BhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbl9fZGVjb3JhdGUoW1xuICAgIHRlbGVtZXRyeV8xLmNhcHR1cmVUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LkdvdG9Tb3VyY2VDb2RlLCB7fSwgZmFsc2UpXG5dLCBIaXN0b3J5LnByb3RvdHlwZSwgXCJnb3RvQ29kZVwiLCBudWxsKTtcbl9fZGVjb3JhdGUoW1xuICAgIHRlbGVtZXRyeV8xLmNhcHR1cmVUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LlJlc3RhcnRLZXJuZWwpXG5dLCBIaXN0b3J5LnByb3RvdHlwZSwgXCJyZXN0YXJ0S2VybmVsXCIsIG51bGwpO1xuX19kZWNvcmF0ZShbXG4gICAgdGVsZW1ldHJ5XzEuY2FwdHVyZVRlbGVtZXRyeShjb25zdGFudHNfMi5UZWxlbWV0cnkuRXhwb3J0Tm90ZWJvb2ssIHt9LCBmYWxzZSlcbl0sIEhpc3RvcnkucHJvdG90eXBlLCBcImV4cG9ydFwiLCBudWxsKTtcbkhpc3RvcnkgPSBfX2RlY29yYXRlKFtcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXG4gICAgX19wYXJhbSgwLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMS5JQXBwbGljYXRpb25TaGVsbCkpLFxuICAgIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzEuSURvY3VtZW50TWFuYWdlcikpLFxuICAgIF9fcGFyYW0oMiwgaW52ZXJzaWZ5XzEuaW5qZWN0KGNvbnRyYWN0c18xLklJbnRlcnByZXRlclNlcnZpY2UpKSxcbiAgICBfX3BhcmFtKDMsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklOb3RlYm9va1NlcnZlcikpLFxuICAgIF9fcGFyYW0oNCwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzEuSVdlYlBhbmVsUHJvdmlkZXIpKSxcbiAgICBfX3BhcmFtKDUsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18yLklEaXNwb3NhYmxlUmVnaXN0cnkpKSxcbiAgICBfX3BhcmFtKDYsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklDb2RlQ3NzR2VuZXJhdG9yKSksXG4gICAgX19wYXJhbSg3LCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMy5JU3RhdHVzUHJvdmlkZXIpKSxcbiAgICBfX3BhcmFtKDgsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklKdXB5dGVyRXhlY3V0aW9uKSlcbl0sIEhpc3RvcnkpO1xuZXhwb3J0cy5IaXN0b3J5ID0gSGlzdG9yeTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWhpc3RvcnkuanMubWFwIl19