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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhpc3RvcnkuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsInJlcXVpcmUiLCJmcyIsImludmVyc2lmeV8xIiwicGF0aCIsInZzY29kZV8xIiwidHlwZXNfMSIsImNvbnN0YW50c18xIiwidHlwZXNfMiIsImxvY2FsaXplIiwiY29udHJhY3RzXzEiLCJ0ZWxlbWV0cnlfMSIsImNvbnN0YW50c18yIiwianVweXRlckluc3RhbGxFcnJvcl8xIiwidHlwZXNfMyIsIkhpc3RvcnkiLCJjb25zdHJ1Y3RvciIsImFwcGxpY2F0aW9uU2hlbGwiLCJkb2N1bWVudE1hbmFnZXIiLCJpbnRlcnByZXRlclNlcnZpY2UiLCJqdXB5dGVyU2VydmVyIiwicHJvdmlkZXIiLCJkaXNwb3NhYmxlcyIsImNzc0dlbmVyYXRvciIsInN0YXR1c1Byb3ZpZGVyIiwianVweXRlckV4ZWN1dGlvbiIsImRpc3Bvc2VkIiwidW5maW5pc2hlZENlbGxzIiwicmVzdGFydGluZ0tlcm5lbCIsInBvdGVudGlhbGx5VW5maW5pc2hlZFN0YXR1cyIsIm9uTWVzc2FnZSIsIm1lc3NhZ2UiLCJwYXlsb2FkIiwiSGlzdG9yeU1lc3NhZ2VzIiwiR290b0NvZGVDZWxsIiwiZ290b0NvZGUiLCJmaWxlIiwibGluZSIsIlJlc3RhcnRLZXJuZWwiLCJyZXN0YXJ0S2VybmVsIiwiRXhwb3J0IiwiZXhwb3J0IiwiRGVsZXRlQWxsQ2VsbHMiLCJsb2dUZWxlbWV0cnkiLCJUZWxlbWV0cnkiLCJEZWxldGVDZWxsIiwiVW5kbyIsIlJlZG8iLCJFeHBhbmRBbGwiLCJDb2xsYXBzZUFsbCIsInNldFN0YXR1cyIsInNldCIsInB1c2giLCJldmVudCIsInNlbmRUZWxlbWV0cnlFdmVudCIsIm9uQWRkQ29kZUV2ZW50IiwiY2VsbHMiLCJlZGl0b3IiLCJmb3JFYWNoIiwiY2VsbCIsIndlYlBhbmVsIiwic3RhdGUiLCJDZWxsU3RhdGUiLCJpbml0IiwicG9zdE1lc3NhZ2UiLCJ0eXBlIiwiU3RhcnRDZWxsIiwiZXhlY3V0aW5nIiwiVXBkYXRlQ2VsbCIsImVycm9yIiwiZmluaXNoZWQiLCJGaW5pc2hDZWxsIiwiZmlsdGVyIiwiaWQiLCJlZGl0IiwiZWRpdEJ1aWxkZXIiLCJpbnNlcnQiLCJQb3NpdGlvbiIsIm9uU2V0dGluZ3NDaGFuZ2VkIiwibG9hZFByb21pc2UiLCJzaHV0ZG93biIsImxvYWRKdXB5dGVyU2VydmVyIiwiZXhwb3J0VG9GaWxlIiwibm90ZWJvb2siLCJ0cmFuc2xhdGVUb05vdGVib29rIiwid3JpdGVGaWxlIiwiSlNPTiIsInN0cmluZ2lmeSIsImVuY29kaW5nIiwiZmxhZyIsInNob3dJbmZvcm1hdGlvbk1lc3NhZ2UiLCJEYXRhU2NpZW5jZSIsImV4cG9ydERpYWxvZ0NvbXBsZXRlIiwiZm9ybWF0IiwiZXhwb3J0T3BlblF1ZXN0aW9uIiwic3RyIiwibGF1bmNoTm90ZWJvb2siLCJpZ25vcmVFcnJvcnMiLCJleGMiLCJleHBvcnREaWFsb2dGYWlsZWQiLCJzdGF0dXMiLCJzdGFydGluZ0p1cHl0ZXIiLCJzdGFydCIsImVyciIsImRpc3Bvc2UiLCJsb2FkV2ViUGFuZWwiLCJtYWluU2NyaXB0UGF0aCIsImpvaW4iLCJFWFRFTlNJT05fUk9PVF9ESVIiLCJjc3MiLCJnZW5lcmF0ZVRoZW1lQ3NzIiwiY3JlYXRlIiwiaGlzdG9yeVRpdGxlIiwibG9hZCIsImlzSW1wb3J0U3VwcG9ydGVkIiwiSnVweXRlckluc3RhbGxFcnJvciIsImp1cHl0ZXJOb3RTdXBwb3J0ZWQiLCJweXRob25JbnRlcmFjdGl2ZUhlbHBMaW5rIiwiYWxsIiwic2V0dGluZ3NDaGFuZ2VkRGlzcG9zYWJsZSIsIm9uRGlkQ2hhbmdlSW50ZXJwcmV0ZXIiLCJjbG9zZWRFdmVudCIsIkV2ZW50RW1pdHRlciIsInNob3ciLCJjbG9zZWQiLCJhZGRDb2RlIiwiY29kZSIsImV4ZWN1dGluZ0NvZGUiLCJvYnNlcnZhYmxlIiwiZXhlY3V0ZU9ic2VydmFibGUiLCJzdWJzY3JpYmUiLCJzaG93RXJyb3JNZXNzYWdlIiwiZmlyZSIsImdvdG9Db2RlSW50ZXJuYWwiLCJjYXRjaCIsInBhdGhFeGlzdHMiLCJzaG93VGV4dERvY3VtZW50IiwiVXJpIiwidmlld0NvbHVtbiIsIlZpZXdDb2x1bW4iLCJPbmUiLCJ2aXNpYmxlVGV4dEVkaXRvcnMiLCJmaW5kIiwidGUiLCJkb2N1bWVudCIsImZpbGVOYW1lIiwicmV2ZWFsUmFuZ2UiLCJSYW5nZSIsInNlbGVjdGlvbiIsIlNlbGVjdGlvbiIsInJlc3RhcnRLZXJuZWxNZXNzYWdlIiwieWVzIiwicmVzdGFydEtlcm5lbE1lc3NhZ2VZZXMiLCJubyIsInJlc3RhcnRLZXJuZWxNZXNzYWdlTm8iLCJ2IiwicyIsInJlc3RhcnRpbmdLZXJuZWxTdGF0dXMiLCJjb250ZW50cyIsImZpbHRlcnNLZXkiLCJleHBvcnREaWFsb2dGaWx0ZXIiLCJmaWx0ZXJzT2JqZWN0Iiwic2hvd1NhdmVEaWFsb2ciLCJzYXZlTGFiZWwiLCJleHBvcnREaWFsb2dUaXRsZSIsImZpbHRlcnMiLCJ1cmkiLCJmc1BhdGgiLCJjYXB0dXJlVGVsZW1ldHJ5IiwiR290b1NvdXJjZUNvZGUiLCJwcm90b3R5cGUiLCJFeHBvcnROb3RlYm9vayIsImluamVjdGFibGUiLCJpbmplY3QiLCJJQXBwbGljYXRpb25TaGVsbCIsIklEb2N1bWVudE1hbmFnZXIiLCJJSW50ZXJwcmV0ZXJTZXJ2aWNlIiwiSU5vdGVib29rU2VydmVyIiwiSVdlYlBhbmVsUHJvdmlkZXIiLCJJRGlzcG9zYWJsZVJlZ2lzdHJ5IiwiSUNvZGVDc3NHZW5lcmF0b3IiLCJJU3RhdHVzUHJvdmlkZXIiLCJJSnVweXRlckV4ZWN1dGlvbiJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8sQ0FBQ0MsUUFBZixLQUE0QixVQUEvRCxFQUEyRUwsQ0FBQyxHQUFHSSxPQUFPLENBQUNDLFFBQVIsQ0FBaUJaLFVBQWpCLEVBQTZCQyxNQUE3QixFQUFxQ0MsR0FBckMsRUFBMENDLElBQTFDLENBQUosQ0FBM0UsS0FDSyxLQUFLLElBQUlVLENBQUMsR0FBR2IsVUFBVSxDQUFDTSxNQUFYLEdBQW9CLENBQWpDLEVBQW9DTyxDQUFDLElBQUksQ0FBekMsRUFBNENBLENBQUMsRUFBN0MsRUFBaUQsSUFBSUgsQ0FBQyxHQUFHVixVQUFVLENBQUNhLENBQUQsQ0FBbEIsRUFBdUJOLENBQUMsR0FBRyxDQUFDSCxDQUFDLEdBQUcsQ0FBSixHQUFRTSxDQUFDLENBQUNILENBQUQsQ0FBVCxHQUFlSCxDQUFDLEdBQUcsQ0FBSixHQUFRTSxD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QUFDMkssbUJBQTNCLENBQUosQ0FQVSxFQVFqQnhNLE9BQU8sQ0FBQyxDQUFELEVBQUl3QixXQUFXLENBQUMwSyxNQUFaLENBQW1CL0osT0FBTyxDQUFDc0ssaUJBQTNCLENBQUosQ0FSVSxFQVNqQnpNLE9BQU8sQ0FBQyxDQUFELEVBQUl3QixXQUFXLENBQUMwSyxNQUFaLENBQW1CL0osT0FBTyxDQUFDdUssZUFBM0IsQ0FBSixDQVRVLEVBVWpCMU0sT0FBTyxDQUFDLENBQUQsRUFBSXdCLFdBQVcsQ0FBQzBLLE1BQVosQ0FBbUIvSixPQUFPLENBQUN3SyxpQkFBM0IsQ0FBSixDQVZVLENBQUQsRUFXakJ2SyxPQVhpQixDQUFwQjtBQVlBZixPQUFPLENBQUNlLE9BQVIsR0FBa0JBLE9BQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuJ3VzZSBzdHJpY3QnO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn07XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxucmVxdWlyZShcIi4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xyXG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmcy1leHRyYVwiKTtcclxuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vYXBwbGljYXRpb24vdHlwZXNcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCBsb2NhbGl6ZSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHMvbG9jYWxpemVcIik7XHJcbmNvbnN0IGNvbnRyYWN0c18xID0gcmVxdWlyZShcIi4uL2ludGVycHJldGVyL2NvbnRyYWN0c1wiKTtcclxuY29uc3QgdGVsZW1ldHJ5XzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5XCIpO1xyXG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3QganVweXRlckluc3RhbGxFcnJvcl8xID0gcmVxdWlyZShcIi4vanVweXRlckluc3RhbGxFcnJvclwiKTtcclxuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpO1xyXG5sZXQgSGlzdG9yeSA9IGNsYXNzIEhpc3Rvcnkge1xyXG4gICAgY29uc3RydWN0b3IoYXBwbGljYXRpb25TaGVsbCwgZG9jdW1lbnRNYW5hZ2VyLCBpbnRlcnByZXRlclNlcnZpY2UsIGp1cHl0ZXJTZXJ2ZXIsIHByb3ZpZGVyLCBkaXNwb3NhYmxlcywgY3NzR2VuZXJhdG9yLCBzdGF0dXNQcm92aWRlciwganVweXRlckV4ZWN1dGlvbikge1xyXG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25TaGVsbCA9IGFwcGxpY2F0aW9uU2hlbGw7XHJcbiAgICAgICAgdGhpcy5kb2N1bWVudE1hbmFnZXIgPSBkb2N1bWVudE1hbmFnZXI7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlclNlcnZpY2UgPSBpbnRlcnByZXRlclNlcnZpY2U7XHJcbiAgICAgICAgdGhpcy5qdXB5dGVyU2VydmVyID0ganVweXRlclNlcnZlcjtcclxuICAgICAgICB0aGlzLnByb3ZpZGVyID0gcHJvdmlkZXI7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcyA9IGRpc3Bvc2FibGVzO1xyXG4gICAgICAgIHRoaXMuY3NzR2VuZXJhdG9yID0gY3NzR2VuZXJhdG9yO1xyXG4gICAgICAgIHRoaXMuc3RhdHVzUHJvdmlkZXIgPSBzdGF0dXNQcm92aWRlcjtcclxuICAgICAgICB0aGlzLmp1cHl0ZXJFeGVjdXRpb24gPSBqdXB5dGVyRXhlY3V0aW9uO1xyXG4gICAgICAgIHRoaXMuZGlzcG9zZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnVuZmluaXNoZWRDZWxscyA9IFtdO1xyXG4gICAgICAgIHRoaXMucmVzdGFydGluZ0tlcm5lbCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMucG90ZW50aWFsbHlVbmZpbmlzaGVkU3RhdHVzID0gW107XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1hbnkgbm8tZW1wdHlcclxuICAgICAgICB0aGlzLm9uTWVzc2FnZSA9IChtZXNzYWdlLCBwYXlsb2FkKSA9PiB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuR290b0NvZGVDZWxsOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290b0NvZGUocGF5bG9hZC5maWxlLCBwYXlsb2FkLmxpbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuUmVzdGFydEtlcm5lbDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RhcnRLZXJuZWwoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkV4cG9ydDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydChwYXlsb2FkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkRlbGV0ZUFsbENlbGxzOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9nVGVsZW1ldHJ5KGNvbnN0YW50c18yLlRlbGVtZXRyeS5EZWxldGVBbGxDZWxscyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5EZWxldGVDZWxsOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9nVGVsZW1ldHJ5KGNvbnN0YW50c18yLlRlbGVtZXRyeS5EZWxldGVDZWxsKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLlVuZG86XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LlVuZG8pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuUmVkbzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ1RlbGVtZXRyeShjb25zdGFudHNfMi5UZWxlbWV0cnkuUmVkbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5FeHBhbmRBbGw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LkV4cGFuZEFsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5Db2xsYXBzZUFsbDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ1RlbGVtZXRyeShjb25zdGFudHNfMi5UZWxlbWV0cnkuQ29sbGFwc2VBbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnN0YXR1c1Byb3ZpZGVyLnNldChtZXNzYWdlLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5wb3RlbnRpYWxseVVuZmluaXNoZWRTdGF0dXMucHVzaChyZXN1bHQpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5sb2dUZWxlbWV0cnkgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeUV2ZW50KGV2ZW50KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMub25BZGRDb2RlRXZlbnQgPSAoY2VsbHMsIGVkaXRvcikgPT4ge1xyXG4gICAgICAgICAgICAvLyBTZW5kIGVhY2ggY2VsbCB0byB0aGUgb3RoZXIgc2lkZVxyXG4gICAgICAgICAgICBjZWxscy5mb3JFYWNoKChjZWxsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy53ZWJQYW5lbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2VsbC5zdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzMuQ2VsbFN0YXRlLmluaXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUZWxsIHRoZSByZWFjdCBjb250cm9scyB3ZSBoYXZlIGEgbmV3IGNlbGxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2ViUGFuZWwucG9zdE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMi5IaXN0b3J5TWVzc2FnZXMuU3RhcnRDZWxsLCBwYXlsb2FkOiBjZWxsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS2VlcCB0cmFjayBvZiB0aGlzIHVuZmluaXNoZWQgY2VsbCBzbyBpZiB3ZSByZXN0YXJ0IHdlIGNhbiBmaW5pc2ggcmlnaHQgYXdheS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5maW5pc2hlZENlbGxzLnB1c2goY2VsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlc18zLkNlbGxTdGF0ZS5leGVjdXRpbmc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUZWxsIHRoZSByZWFjdCBjb250cm9scyB3ZSBoYXZlIGFuIHVwZGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWJQYW5lbC5wb3N0TWVzc2FnZSh7IHR5cGU6IGNvbnN0YW50c18yLkhpc3RvcnlNZXNzYWdlcy5VcGRhdGVDZWxsLCBwYXlsb2FkOiBjZWxsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMy5DZWxsU3RhdGUuZXJyb3I6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMy5DZWxsU3RhdGUuZmluaXNoZWQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUZWxsIHRoZSByZWFjdCBjb250cm9scyB3ZSdyZSBkb25lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndlYlBhbmVsLnBvc3RNZXNzYWdlKHsgdHlwZTogY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkZpbmlzaENlbGwsIHBheWxvYWQ6IGNlbGwgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSB0aGUgbGlzdCBvZiB1bmZpbmlzaGVkIGNlbGxzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuZmluaXNoZWRDZWxscyA9IHRoaXMudW5maW5pc2hlZENlbGxzLmZpbHRlcihjID0+IGMuaWQgIT09IGNlbGwuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gbWlnaHQgd2FudCB0byBkbyBhIHByb2dyZXNzIGJhciBvciBzb21ldGhpbmdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIG1vcmUgdGhhbiBvbmUgY2VsbCwgdGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGEgY29kZSBjZWxsLiBBZnRlciBpdCBmaW5pc2hlcywgd2UgbmVlZCB0byBpbmplY3QgYSBuZXcgY2VsbCBlbnRyeVxyXG4gICAgICAgICAgICBpZiAoY2VsbHMubGVuZ3RoID4gMSAmJiBjZWxsc1sxXS5zdGF0ZSA9PT0gdHlwZXNfMy5DZWxsU3RhdGUuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYW4gYWN0aXZlIGVkaXRvciwgZG8gdGhlIGVkaXQgdGhlcmUgc28gdGhhdCB0aGUgdXNlciBjYW4gdW5kbyBpdCwgb3RoZXJ3aXNlIGRvbid0IGJvdGhlclxyXG4gICAgICAgICAgICAgICAgaWYgKGVkaXRvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVkaXRvci5lZGl0KChlZGl0QnVpbGRlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0QnVpbGRlci5pbnNlcnQobmV3IHZzY29kZV8xLlBvc2l0aW9uKGNlbGxzWzFdLmxpbmUsIDApLCAnIyUlXFxuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMub25TZXR0aW5nc0NoYW5nZWQgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBvdXIgbG9hZCBwcm9taXNlLiBXZSBuZWVkIHRvIHJlc3RhcnQgdGhlIGp1cHl0ZXIgc2VydmVyXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxvYWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmxvYWRQcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMuanVweXRlclNlcnZlci5zaHV0ZG93bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFByb21pc2UgPSB0aGlzLmxvYWRKdXB5dGVyU2VydmVyKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5leHBvcnRUb0ZpbGUgPSAoY2VsbHMsIGZpbGUpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgLy8gVGFrZSB0aGUgbGlzdCBvZiBjZWxscywgY29udmVydCB0aGVtIHRvIGEgbm90ZWJvb2sganNvbiBmb3JtYXQgYW5kIHdyaXRlIHRvIGRpc2tcclxuICAgICAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm90ZWJvb2sgPSB5aWVsZCB0aGlzLmp1cHl0ZXJTZXJ2ZXIudHJhbnNsYXRlVG9Ob3RlYm9vayhjZWxscyk7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tYW55XHJcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgZnMud3JpdGVGaWxlKGZpbGUsIEpTT04uc3RyaW5naWZ5KG5vdGVib29rKSwgeyBlbmNvZGluZzogJ3V0ZjgnLCBmbGFnOiAndycgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBsaWNhdGlvblNoZWxsLnNob3dJbmZvcm1hdGlvbk1lc3NhZ2UobG9jYWxpemUuRGF0YVNjaWVuY2UuZXhwb3J0RGlhbG9nQ29tcGxldGUoKS5mb3JtYXQoZmlsZSksIGxvY2FsaXplLkRhdGFTY2llbmNlLmV4cG9ydE9wZW5RdWVzdGlvbigpKS50aGVuKChzdHIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0ciAmJiBmaWxlICYmIHRoaXMuanVweXRlclNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHVzZXIgd2FudHMgdG8sIG9wZW4gdGhlIG5vdGVib29rIHRoZXkganVzdCBnZW5lcmF0ZWQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmp1cHl0ZXJTZXJ2ZXIubGF1bmNoTm90ZWJvb2soZmlsZSkuaWdub3JlRXJyb3JzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChleGMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGxpY2F0aW9uU2hlbGwuc2hvd0luZm9ybWF0aW9uTWVzc2FnZShsb2NhbGl6ZS5EYXRhU2NpZW5jZS5leHBvcnREaWFsb2dGYWlsZWQoKS5mb3JtYXQoZXhjKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmxvYWRKdXB5dGVyU2VydmVyID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAvLyBTdGFydHVwIG91ciBqdXB5dGVyIHNlcnZlclxyXG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSB0aGlzLnNldFN0YXR1cyhsb2NhbGl6ZS5EYXRhU2NpZW5jZS5zdGFydGluZ0p1cHl0ZXIoKSk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmp1cHl0ZXJTZXJ2ZXIuc3RhcnQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpc3Bvc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMubG9hZFdlYlBhbmVsID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAvLyBDcmVhdGUgb3VyIHdlYiBwYW5lbCAoaXQncyB0aGUgVUkgdGhhdCBzaG93cyB1cCBmb3IgdGhlIGhpc3RvcnkpXHJcbiAgICAgICAgICAgIC8vIEZpZ3VyZSBvdXQgdGhlIG5hbWUgb2Ygb3VyIG1haW4gYnVuZGxlLiBTaG91bGQgYmUgaW4gb3VyIG91dHB1dCBkaXJlY3RvcnlcclxuICAgICAgICAgICAgY29uc3QgbWFpblNjcmlwdFBhdGggPSBwYXRoLmpvaW4oY29uc3RhbnRzXzEuRVhURU5TSU9OX1JPT1RfRElSLCAnb3V0JywgJ2RhdGFzY2llbmNlLXVpJywgJ2hpc3RvcnktcmVhY3QnLCAnaW5kZXhfYnVuZGxlLmpzJyk7XHJcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgY3NzIHRvIHB1dCBpbnRvIHRoZSB3ZWJwYW5lbCBmb3Igdmlld2luZyBjb2RlXHJcbiAgICAgICAgICAgIGNvbnN0IGNzcyA9IHlpZWxkIHRoaXMuY3NzR2VuZXJhdG9yLmdlbmVyYXRlVGhlbWVDc3MoKTtcclxuICAgICAgICAgICAgLy8gVXNlIHRoaXMgc2NyaXB0IHRvIGNyZWF0ZSBvdXIgd2ViIHZpZXcgcGFuZWwuIEl0IHNob3VsZCBjb250YWluIGFsbCBvZiB0aGUgbmVjZXNzYXJ5XHJcbiAgICAgICAgICAgIC8vIHNjcmlwdCB0byBjb21tdW5pY2F0ZSB3aXRoIHRoaXMgY2xhc3MuXHJcbiAgICAgICAgICAgIHRoaXMud2ViUGFuZWwgPSB0aGlzLnByb3ZpZGVyLmNyZWF0ZSh0aGlzLCBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5oaXN0b3J5VGl0bGUoKSwgbWFpblNjcmlwdFBhdGgsIGNzcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5sb2FkID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgd2Ugc3VwcG9ydCBqdXB5dGVyIG9yIG5vdC4gSWYgbm90IHF1aWNrIGZhaWxcclxuICAgICAgICAgICAgaWYgKCEoeWllbGQgdGhpcy5qdXB5dGVyRXhlY3V0aW9uLmlzSW1wb3J0U3VwcG9ydGVkKCkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcganVweXRlckluc3RhbGxFcnJvcl8xLkp1cHl0ZXJJbnN0YWxsRXJyb3IobG9jYWxpemUuRGF0YVNjaWVuY2UuanVweXRlck5vdFN1cHBvcnRlZCgpLCBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5weXRob25JbnRlcmFjdGl2ZUhlbHBMaW5rKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSB3YWl0IGZvciBib3RoXHJcbiAgICAgICAgICAgIHlpZWxkIFByb21pc2UuYWxsKFt0aGlzLmxvYWRKdXB5dGVyU2VydmVyKCksIHRoaXMubG9hZFdlYlBhbmVsKCldKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBTaWduIHVwIGZvciBjb25maWd1cmF0aW9uIGNoYW5nZXNcclxuICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZERpc3Bvc2FibGUgPSB0aGlzLmludGVycHJldGVyU2VydmljZS5vbkRpZENoYW5nZUludGVycHJldGVyKHRoaXMub25TZXR0aW5nc0NoYW5nZWQpO1xyXG4gICAgICAgIC8vIENyZWF0ZSBvdXIgZXZlbnQgZW1pdHRlclxyXG4gICAgICAgIHRoaXMuY2xvc2VkRXZlbnQgPSBuZXcgdnNjb2RlXzEuRXZlbnRFbWl0dGVyKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5wdXNoKHRoaXMuY2xvc2VkRXZlbnQpO1xyXG4gICAgICAgIC8vIExvYWQgb24gYSBiYWNrZ3JvdW5kIHRocmVhZC5cclxuICAgICAgICB0aGlzLmxvYWRQcm9taXNlID0gdGhpcy5sb2FkKCk7XHJcbiAgICB9XHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5kaXNwb3NlZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlJ3JlIGxvYWRlZCBmaXJzdFxyXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5sb2FkUHJvbWlzZTtcclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gc2hvdyBvdXIgd2ViIHBhbmVsLlxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMud2ViUGFuZWwgJiYgdGhpcy5qdXB5dGVyU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy53ZWJQYW5lbC5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldCBjbG9zZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2VkRXZlbnQuZXZlbnQ7XHJcbiAgICB9XHJcbiAgICBhZGRDb2RlKGNvZGUsIGZpbGUsIGxpbmUsIGVkaXRvcikge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIC8vIFN0YXJ0IGEgc3RhdHVzIGl0ZW1cclxuICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gdGhpcy5zZXRTdGF0dXMobG9jYWxpemUuRGF0YVNjaWVuY2UuZXhlY3V0aW5nQ29kZSgpKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSdyZSBsb2FkZWQgZmlyc3QuXHJcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmxvYWRQcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgLy8gVGhlbiBzaG93IG91ciB3ZWJwYW5lbFxyXG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5qdXB5dGVyU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQXR0ZW1wdCB0byBldmFsdWF0ZSB0aGlzIGNlbGwgaW4gdGhlIGp1cHl0ZXIgbm90ZWJvb2tcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBvYnNlcnZhYmxlID0gdGhpcy5qdXB5dGVyU2VydmVyLmV4ZWN1dGVPYnNlcnZhYmxlKGNvZGUsIGZpbGUsIGxpbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNpZ24gdXAgZm9yIGNlbGwgY2hhbmdlc1xyXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmFibGUuc3Vic2NyaWJlKChjZWxscykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQWRkQ29kZUV2ZW50KGNlbGxzLCBlZGl0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGxpY2F0aW9uU2hlbGwuc2hvd0Vycm9yTWVzc2FnZShlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbmRpY2F0ZSBleGVjdXRpbmcgdW50aWwgdGhpcyBjZWxsIGlzIGRvbmUuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXNwb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpc3Bvc2UoKTtcclxuICAgICAgICAgICAgICAgIC8vIFdlIGZhaWxlZCwgZGlzcG9zZSBvZiBvdXJzZWx2ZXMgdG9vIHNvIHRoYXQgbm9ib2R5IHVzZXMgdXMgYWdhaW5cclxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWFueSBuby1lbXB0eVxyXG4gICAgcG9zdE1lc3NhZ2UodHlwZSwgcGF5bG9hZCkge1xyXG4gICAgICAgIGlmICh0aGlzLndlYlBhbmVsKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2ViUGFuZWwucG9zdE1lc3NhZ2UoeyB0eXBlOiB0eXBlLCBwYXlsb2FkOiBwYXlsb2FkIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGRpc3Bvc2UoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmRpc3Bvc2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZERpc3Bvc2FibGUuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5qdXB5dGVyU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmp1cHl0ZXJTZXJ2ZXIuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VkRXZlbnQuZmlyZSh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBnb3RvQ29kZShmaWxlLCBsaW5lKSB7XHJcbiAgICAgICAgdGhpcy5nb3RvQ29kZUludGVybmFsKGZpbGUsIGxpbmUpLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwbGljYXRpb25TaGVsbC5zaG93RXJyb3JNZXNzYWdlKGVycik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnb3RvQ29kZUludGVybmFsKGZpbGUsIGxpbmUpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBsZXQgZWRpdG9yO1xyXG4gICAgICAgICAgICBpZiAoeWllbGQgZnMucGF0aEV4aXN0cyhmaWxlKSkge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yID0geWllbGQgdGhpcy5kb2N1bWVudE1hbmFnZXIuc2hvd1RleHREb2N1bWVudCh2c2NvZGVfMS5VcmkuZmlsZShmaWxlKSwgeyB2aWV3Q29sdW1uOiB2c2NvZGVfMS5WaWV3Q29sdW1uLk9uZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpbGUgVVJJIGlzbid0IGdvaW5nIHRvIHdvcmsuIExvb2sgdGhyb3VnaCB0aGUgYWN0aXZlIHRleHQgZG9jdW1lbnRzXHJcbiAgICAgICAgICAgICAgICBlZGl0b3IgPSB0aGlzLmRvY3VtZW50TWFuYWdlci52aXNpYmxlVGV4dEVkaXRvcnMuZmluZCh0ZSA9PiB0ZS5kb2N1bWVudC5maWxlTmFtZSA9PT0gZmlsZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRpdG9yLnNob3codnNjb2RlXzEuVmlld0NvbHVtbi5PbmUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIElmIHdlIGZvdW5kIHRoZSBlZGl0b3IgY2hhbmdlIGl0cyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgaWYgKGVkaXRvcikge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLnJldmVhbFJhbmdlKG5ldyB2c2NvZGVfMS5SYW5nZShsaW5lLCAwLCBsaW5lLCAwKSk7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3Iuc2VsZWN0aW9uID0gbmV3IHZzY29kZV8xLlNlbGVjdGlvbihuZXcgdnNjb2RlXzEuUG9zaXRpb24obGluZSwgMCksIG5ldyB2c2NvZGVfMS5Qb3NpdGlvbihsaW5lLCAwKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJlc3RhcnRLZXJuZWwoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuanVweXRlclNlcnZlciAmJiAhdGhpcy5yZXN0YXJ0aW5nS2VybmVsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVzdGFydGluZ0tlcm5lbCA9IHRydWU7XHJcbiAgICAgICAgICAgIC8vIEFzayB0aGUgdXNlciBpZiB0aGV5IHdhbnQgdXMgdG8gcmVzdGFydCBvciBub3QuXHJcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5yZXN0YXJ0S2VybmVsTWVzc2FnZSgpO1xyXG4gICAgICAgICAgICBjb25zdCB5ZXMgPSBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5yZXN0YXJ0S2VybmVsTWVzc2FnZVllcygpO1xyXG4gICAgICAgICAgICBjb25zdCBubyA9IGxvY2FsaXplLkRhdGFTY2llbmNlLnJlc3RhcnRLZXJuZWxNZXNzYWdlTm8oKTtcclxuICAgICAgICAgICAgdGhpcy5hcHBsaWNhdGlvblNoZWxsLnNob3dJbmZvcm1hdGlvbk1lc3NhZ2UobWVzc2FnZSwgeWVzLCBubykudGhlbih2ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh2ID09PSB5ZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJzdCB3ZSBuZWVkIHRvIGZpbmlzaCBhbGwgb3V0c3RhbmRpbmcgY2VsbHMuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmZpbmlzaGVkQ2VsbHMuZm9yRWFjaChjID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYy5zdGF0ZSA9IHR5cGVzXzMuQ2VsbFN0YXRlLmVycm9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndlYlBhbmVsLnBvc3RNZXNzYWdlKHsgdHlwZTogY29uc3RhbnRzXzIuSGlzdG9yeU1lc3NhZ2VzLkZpbmlzaENlbGwsIHBheWxvYWQ6IGMgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmZpbmlzaGVkQ2VsbHMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvdGVudGlhbGx5VW5maW5pc2hlZFN0YXR1cy5mb3JFYWNoKHMgPT4gcy5kaXNwb3NlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG90ZW50aWFsbHlVbmZpbmlzaGVkU3RhdHVzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG91ciBzdGF0dXMgZm9yIHRoZSBuZXh0IDIgc2Vjb25kcy5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXR1c1Byb3ZpZGVyLnNldChsb2NhbGl6ZS5EYXRhU2NpZW5jZS5yZXN0YXJ0aW5nS2VybmVsU3RhdHVzKCksIHRoaXMsIDIwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gcmVzdGFydCB0aGUga2VybmVsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5qdXB5dGVyU2VydmVyLnJlc3RhcnRLZXJuZWwoKS5pZ25vcmVFcnJvcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RhcnRpbmdLZXJuZWwgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdGFydGluZ0tlcm5lbCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQocGF5bG9hZCkge1xyXG4gICAgICAgIGlmIChwYXlsb2FkLmNvbnRlbnRzKSB7XHJcbiAgICAgICAgICAgIC8vIFNob3VsZCBiZSBhbiBhcnJheSBvZiBjZWxsc1xyXG4gICAgICAgICAgICBjb25zdCBjZWxscyA9IHBheWxvYWQuY29udGVudHM7XHJcbiAgICAgICAgICAgIGlmIChjZWxscyAmJiB0aGlzLmFwcGxpY2F0aW9uU2hlbGwpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlcnNLZXkgPSBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5leHBvcnREaWFsb2dGaWx0ZXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlcnNPYmplY3QgPSB7fTtcclxuICAgICAgICAgICAgICAgIGZpbHRlcnNPYmplY3RbZmlsdGVyc0tleV0gPSBbJ2lweW5iJ107XHJcbiAgICAgICAgICAgICAgICAvLyBCcmluZyB1cCB0aGUgb3BlbiBmaWxlIGRpYWxvZyBib3hcclxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbGljYXRpb25TaGVsbC5zaG93U2F2ZURpYWxvZyh7XHJcbiAgICAgICAgICAgICAgICAgICAgc2F2ZUxhYmVsOiBsb2NhbGl6ZS5EYXRhU2NpZW5jZS5leHBvcnREaWFsb2dUaXRsZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnM6IGZpbHRlcnNPYmplY3RcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oKHVyaSkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh1cmkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5leHBvcnRUb0ZpbGUoY2VsbHMsIHVyaS5mc1BhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuX19kZWNvcmF0ZShbXHJcbiAgICB0ZWxlbWV0cnlfMS5jYXB0dXJlVGVsZW1ldHJ5KGNvbnN0YW50c18yLlRlbGVtZXRyeS5Hb3RvU291cmNlQ29kZSwge30sIGZhbHNlKVxyXG5dLCBIaXN0b3J5LnByb3RvdHlwZSwgXCJnb3RvQ29kZVwiLCBudWxsKTtcclxuX19kZWNvcmF0ZShbXHJcbiAgICB0ZWxlbWV0cnlfMS5jYXB0dXJlVGVsZW1ldHJ5KGNvbnN0YW50c18yLlRlbGVtZXRyeS5SZXN0YXJ0S2VybmVsKVxyXG5dLCBIaXN0b3J5LnByb3RvdHlwZSwgXCJyZXN0YXJ0S2VybmVsXCIsIG51bGwpO1xyXG5fX2RlY29yYXRlKFtcclxuICAgIHRlbGVtZXRyeV8xLmNhcHR1cmVUZWxlbWV0cnkoY29uc3RhbnRzXzIuVGVsZW1ldHJ5LkV4cG9ydE5vdGVib29rLCB7fSwgZmFsc2UpXHJcbl0sIEhpc3RvcnkucHJvdG90eXBlLCBcImV4cG9ydFwiLCBudWxsKTtcclxuSGlzdG9yeSA9IF9fZGVjb3JhdGUoW1xyXG4gICAgaW52ZXJzaWZ5XzEuaW5qZWN0YWJsZSgpLFxyXG4gICAgX19wYXJhbSgwLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMS5JQXBwbGljYXRpb25TaGVsbCkpLFxyXG4gICAgX19wYXJhbSgxLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMS5JRG9jdW1lbnRNYW5hZ2VyKSksXHJcbiAgICBfX3BhcmFtKDIsIGludmVyc2lmeV8xLmluamVjdChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJTZXJ2aWNlKSksXHJcbiAgICBfX3BhcmFtKDMsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklOb3RlYm9va1NlcnZlcikpLFxyXG4gICAgX19wYXJhbSg0LCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMS5JV2ViUGFuZWxQcm92aWRlcikpLFxyXG4gICAgX19wYXJhbSg1LCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMi5JRGlzcG9zYWJsZVJlZ2lzdHJ5KSksXHJcbiAgICBfX3BhcmFtKDYsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklDb2RlQ3NzR2VuZXJhdG9yKSksXHJcbiAgICBfX3BhcmFtKDcsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18zLklTdGF0dXNQcm92aWRlcikpLFxyXG4gICAgX19wYXJhbSg4LCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMy5JSnVweXRlckV4ZWN1dGlvbikpXHJcbl0sIEhpc3RvcnkpO1xyXG5leHBvcnRzLkhpc3RvcnkgPSBIaXN0b3J5O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1oaXN0b3J5LmpzLm1hcCJdfQ==