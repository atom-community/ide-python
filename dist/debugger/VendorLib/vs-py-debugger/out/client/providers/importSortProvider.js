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

const os_1 = require("os");

const path = require("path");

const vscode_1 = require("vscode");

const types_1 = require("../common/application/types");

const constants_1 = require("../common/constants");

const types_2 = require("../common/platform/types");

const types_3 = require("../common/process/types");

const types_4 = require("../common/types");

const misc_1 = require("../common/utils/misc");

const types_5 = require("../ioc/types");

const telemetry_1 = require("../telemetry");

const constants_2 = require("../telemetry/constants");

let SortImportsEditingProvider = class SortImportsEditingProvider {
  constructor(serviceContainer) {
    this.serviceContainer = serviceContainer;
    this.shell = serviceContainer.get(types_1.IApplicationShell);
    this.documentManager = serviceContainer.get(types_1.IDocumentManager);
    this.configurationService = serviceContainer.get(types_4.IConfigurationService);
    this.pythonExecutionFactory = serviceContainer.get(types_3.IPythonExecutionFactory);
    this.processServiceFactory = serviceContainer.get(types_3.IProcessServiceFactory);
    this.editorUtils = serviceContainer.get(types_4.IEditorUtils);
  }

  provideDocumentSortImportsEdits(uri, token) {
    return __awaiter(this, void 0, void 0, function* () {
      const document = yield this.documentManager.openTextDocument(uri);

      if (!document) {
        return;
      }

      if (document.lineCount <= 1) {
        return;
      } // isort does have the ability to read from the process input stream and return the formatted code out of the output stream.
      // However they don't support returning the diff of the formatted text when reading data from the input stream.
      // Yes getting text formatted that way avoids having to create a temporary file, however the diffing will have
      // to be done here in node (extension), i.e. extension cpu, i.e. less responsive solution.


      const importScript = path.join(constants_1.EXTENSION_ROOT_DIR, 'pythonFiles', 'sortImports.py');
      const fsService = this.serviceContainer.get(types_2.IFileSystem);
      const tmpFile = document.isDirty ? yield fsService.createTemporaryFile(path.extname(document.uri.fsPath)) : undefined;

      if (tmpFile) {
        yield fsService.writeFile(tmpFile.filePath, document.getText());
      }

      const settings = this.configurationService.getSettings(uri);
      const isort = settings.sortImports.path;
      const filePath = tmpFile ? tmpFile.filePath : document.uri.fsPath;
      const args = [filePath, '--diff'].concat(settings.sortImports.args);
      let diffPatch;

      if (token && token.isCancellationRequested) {
        return;
      }

      try {
        if (typeof isort === 'string' && isort.length > 0) {
          // Lets just treat this as a standard tool.
          const processService = yield this.processServiceFactory.create(document.uri);
          diffPatch = (yield processService.exec(isort, args, {
            throwOnStdErr: true,
            token
          })).stdout;
        } else {
          const processExeService = yield this.pythonExecutionFactory.create({
            resource: document.uri
          });
          diffPatch = (yield processExeService.exec([importScript].concat(args), {
            throwOnStdErr: true,
            token
          })).stdout;
        }

        return this.editorUtils.getWorkspaceEditsFromPatch(document.getText(), diffPatch, document.uri);
      } finally {
        if (tmpFile) {
          tmpFile.dispose();
        }
      }
    });
  }

  registerCommands() {
    const cmdManager = this.serviceContainer.get(types_1.ICommandManager);
    const disposable = cmdManager.registerCommand(constants_1.Commands.Sort_Imports, this.sortImports, this);
    this.serviceContainer.get(types_4.IDisposableRegistry).push(disposable);
  }

  sortImports(uri) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!uri) {
        const activeEditor = this.documentManager.activeTextEditor;

        if (!activeEditor || activeEditor.document.languageId !== constants_1.PYTHON_LANGUAGE) {
          this.shell.showErrorMessage('Please open a Python file to sort the imports.').then(misc_1.noop, misc_1.noop);
          return;
        }

        uri = activeEditor.document.uri;
      }

      const document = yield this.documentManager.openTextDocument(uri);

      if (document.lineCount <= 1) {
        return;
      } // Hack, if the document doesn't contain an empty line at the end, then add it
      // Else the library strips off the last line


      const lastLine = document.lineAt(document.lineCount - 1);

      if (lastLine.text.trim().length > 0) {
        const edit = new vscode_1.WorkspaceEdit();
        edit.insert(uri, lastLine.range.end, os_1.EOL);
        yield this.documentManager.applyEdit(edit);
      }

      try {
        const changes = yield this.provideDocumentSortImportsEdits(uri);

        if (!changes || changes.entries().length === 0) {
          return;
        }

        yield this.documentManager.applyEdit(changes);
      } catch (error) {
        const message = typeof error === 'string' ? error : error.message ? error.message : error;
        const outputChannel = this.serviceContainer.get(types_4.IOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
        outputChannel.appendLine(error);
        outputChannel.show();
        const logger = this.serviceContainer.get(types_4.ILogger);
        logger.logError(`Failed to format imports for '${uri.fsPath}'.`, error);
        this.shell.showErrorMessage(message).then(misc_1.noop, misc_1.noop);
      }
    });
  }

};

__decorate([telemetry_1.captureTelemetry(constants_2.FORMAT_SORT_IMPORTS)], SortImportsEditingProvider.prototype, "provideDocumentSortImportsEdits", null);

SortImportsEditingProvider = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_5.IServiceContainer))], SortImportsEditingProvider);
exports.SortImportsEditingProvider = SortImportsEditingProvider;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImltcG9ydFNvcnRQcm92aWRlci5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX3BhcmFtIiwicGFyYW1JbmRleCIsImRlY29yYXRvciIsIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJleHBvcnRzIiwiaW52ZXJzaWZ5XzEiLCJyZXF1aXJlIiwib3NfMSIsInBhdGgiLCJ2c2NvZGVfMSIsInR5cGVzXzEiLCJjb25zdGFudHNfMSIsInR5cGVzXzIiLCJ0eXBlc18zIiwidHlwZXNfNCIsIm1pc2NfMSIsInR5cGVzXzUiLCJ0ZWxlbWV0cnlfMSIsImNvbnN0YW50c18yIiwiU29ydEltcG9ydHNFZGl0aW5nUHJvdmlkZXIiLCJjb25zdHJ1Y3RvciIsInNlcnZpY2VDb250YWluZXIiLCJzaGVsbCIsImdldCIsIklBcHBsaWNhdGlvblNoZWxsIiwiZG9jdW1lbnRNYW5hZ2VyIiwiSURvY3VtZW50TWFuYWdlciIsImNvbmZpZ3VyYXRpb25TZXJ2aWNlIiwiSUNvbmZpZ3VyYXRpb25TZXJ2aWNlIiwicHl0aG9uRXhlY3V0aW9uRmFjdG9yeSIsIklQeXRob25FeGVjdXRpb25GYWN0b3J5IiwicHJvY2Vzc1NlcnZpY2VGYWN0b3J5IiwiSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSIsImVkaXRvclV0aWxzIiwiSUVkaXRvclV0aWxzIiwicHJvdmlkZURvY3VtZW50U29ydEltcG9ydHNFZGl0cyIsInVyaSIsInRva2VuIiwiZG9jdW1lbnQiLCJvcGVuVGV4dERvY3VtZW50IiwibGluZUNvdW50IiwiaW1wb3J0U2NyaXB0Iiwiam9pbiIsIkVYVEVOU0lPTl9ST09UX0RJUiIsImZzU2VydmljZSIsIklGaWxlU3lzdGVtIiwidG1wRmlsZSIsImlzRGlydHkiLCJjcmVhdGVUZW1wb3JhcnlGaWxlIiwiZXh0bmFtZSIsImZzUGF0aCIsInVuZGVmaW5lZCIsIndyaXRlRmlsZSIsImZpbGVQYXRoIiwiZ2V0VGV4dCIsInNldHRpbmdzIiwiZ2V0U2V0dGluZ3MiLCJpc29ydCIsInNvcnRJbXBvcnRzIiwiYXJncyIsImNvbmNhdCIsImRpZmZQYXRjaCIsImlzQ2FuY2VsbGF0aW9uUmVxdWVzdGVkIiwicHJvY2Vzc1NlcnZpY2UiLCJjcmVhdGUiLCJleGVjIiwidGhyb3dPblN0ZEVyciIsInN0ZG91dCIsInByb2Nlc3NFeGVTZXJ2aWNlIiwicmVzb3VyY2UiLCJnZXRXb3Jrc3BhY2VFZGl0c0Zyb21QYXRjaCIsImRpc3Bvc2UiLCJyZWdpc3RlckNvbW1hbmRzIiwiY21kTWFuYWdlciIsIklDb21tYW5kTWFuYWdlciIsImRpc3Bvc2FibGUiLCJyZWdpc3RlckNvbW1hbmQiLCJDb21tYW5kcyIsIlNvcnRfSW1wb3J0cyIsIklEaXNwb3NhYmxlUmVnaXN0cnkiLCJwdXNoIiwiYWN0aXZlRWRpdG9yIiwiYWN0aXZlVGV4dEVkaXRvciIsImxhbmd1YWdlSWQiLCJQWVRIT05fTEFOR1VBR0UiLCJzaG93RXJyb3JNZXNzYWdlIiwibm9vcCIsImxhc3RMaW5lIiwibGluZUF0IiwidGV4dCIsInRyaW0iLCJlZGl0IiwiV29ya3NwYWNlRWRpdCIsImluc2VydCIsInJhbmdlIiwiZW5kIiwiRU9MIiwiYXBwbHlFZGl0IiwiY2hhbmdlcyIsImVudHJpZXMiLCJlcnJvciIsIm1lc3NhZ2UiLCJvdXRwdXRDaGFubmVsIiwiSU91dHB1dENoYW5uZWwiLCJTVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCIsImFwcGVuZExpbmUiLCJzaG93IiwibG9nZ2VyIiwiSUxvZ2dlciIsImxvZ0Vycm9yIiwiY2FwdHVyZVRlbGVtZXRyeSIsIkZPUk1BVF9TT1JUX0lNUE9SVFMiLCJwcm90b3R5cGUiLCJpbmplY3RhYmxlIiwiaW5qZWN0IiwiSVNlcnZpY2VDb250YWluZXIiXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8sQ0FBQ0MsUUFBZixLQUE0QixVQUEvRCxFQUEyRUwsQ0FBQyxHQUFHSSxPQUFPLENBQUNDLFFBQVIsQ0FBaUJaLFVBQWpCLEVBQTZCQyxNQUE3QixFQUFxQ0MsR0FBckMsRUFBMENDLElBQTFDLENBQUosQ0FBM0UsS0FDSyxLQUFLLElBQUlVLENBQUMsR0FBR2IsVUFBVSxDQUFDTSxNQUFYLEdBQW9CLENBQWpDLEVBQW9DTyxDQUFDLElBQUksQ0FBekMsRUFBNENBLENBQUMsRUFBN0MsRUFBaUQsSUFBSUgsQ0FBQyxHQUFHVixVQUFVLENBQUNhLENBQUQsQ0FBbEIsRUFBdUJOLENBQUMsR0FBRyxDQUFDSCxDQUFDLEdBQUcsQ0FBSixHQUFRTSxDQUFDLENBQUNILENBQUQsQ0FBVCxHQUFlSCxDQUFDLEdBQUcsQ0FBSixHQUFRTSxDQUFDLENBQUNULE1BQUQsRUFBU0MsR0FBVCxF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QUFBQSxhQUFhLENBQUNHLFVBQWQsQ0FBeUJMLEtBQXpCO0FBQ0FFLFFBQUFBLGFBQWEsQ0FBQ0ksSUFBZDtBQUNBLGNBQU1DLE1BQU0sR0FBRyxLQUFLdEYsZ0JBQUwsQ0FBc0JFLEdBQXRCLENBQTBCVCxPQUFPLENBQUM4RixPQUFsQyxDQUFmO0FBQ0FELFFBQUFBLE1BQU0sQ0FBQ0UsUUFBUCxDQUFpQixpQ0FBZ0N6RSxHQUFHLENBQUNjLE1BQU8sSUFBNUQsRUFBaUVrRCxLQUFqRTtBQUNBLGFBQUs5RSxLQUFMLENBQVcrRCxnQkFBWCxDQUE0QmdCLE9BQTVCLEVBQXFDbkcsSUFBckMsQ0FBMENhLE1BQU0sQ0FBQ3VFLElBQWpELEVBQXVEdkUsTUFBTSxDQUFDdUUsSUFBOUQ7QUFDSDtBQUNKLEtBckNlLENBQWhCO0FBc0NIOztBQXBHNkQsQ0FBbEU7O0FBc0dBdkgsVUFBVSxDQUFDLENBQ1BrRCxXQUFXLENBQUM2RixnQkFBWixDQUE2QjVGLFdBQVcsQ0FBQzZGLG1CQUF6QyxDQURPLENBQUQsRUFFUDVGLDBCQUEwQixDQUFDNkYsU0FGcEIsRUFFK0IsaUNBRi9CLEVBRWtFLElBRmxFLENBQVY7O0FBR0E3RiwwQkFBMEIsR0FBR3BELFVBQVUsQ0FBQyxDQUNwQ3NDLFdBQVcsQ0FBQzRHLFVBQVosRUFEb0MsRUFFcENsSSxPQUFPLENBQUMsQ0FBRCxFQUFJc0IsV0FBVyxDQUFDNkcsTUFBWixDQUFtQmxHLE9BQU8sQ0FBQ21HLGlCQUEzQixDQUFKLENBRjZCLENBQUQsRUFHcENoRywwQkFIb0MsQ0FBdkM7QUFJQWYsT0FBTyxDQUFDZSwwQkFBUixHQUFxQ0EsMEJBQXJDIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xuY29uc3Qgb3NfMSA9IHJlcXVpcmUoXCJvc1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2FwcGxpY2F0aW9uL3R5cGVzXCIpO1xuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2NvbnN0YW50c1wiKTtcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vY29tbW9uL3BsYXRmb3JtL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuLi9jb21tb24vcHJvY2Vzcy90eXBlc1wiKTtcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi4vY29tbW9uL3R5cGVzXCIpO1xuY29uc3QgbWlzY18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi91dGlscy9taXNjXCIpO1xuY29uc3QgdHlwZXNfNSA9IHJlcXVpcmUoXCIuLi9pb2MvdHlwZXNcIik7XG5jb25zdCB0ZWxlbWV0cnlfMSA9IHJlcXVpcmUoXCIuLi90ZWxlbWV0cnlcIik7XG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuLi90ZWxlbWV0cnkvY29uc3RhbnRzXCIpO1xubGV0IFNvcnRJbXBvcnRzRWRpdGluZ1Byb3ZpZGVyID0gY2xhc3MgU29ydEltcG9ydHNFZGl0aW5nUHJvdmlkZXIge1xuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VDb250YWluZXIpIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZUNvbnRhaW5lcjtcbiAgICAgICAgdGhpcy5zaGVsbCA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUFwcGxpY2F0aW9uU2hlbGwpO1xuICAgICAgICB0aGlzLmRvY3VtZW50TWFuYWdlciA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSURvY3VtZW50TWFuYWdlcik7XG4gICAgICAgIHRoaXMuY29uZmlndXJhdGlvblNlcnZpY2UgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc180LklDb25maWd1cmF0aW9uU2VydmljZSk7XG4gICAgICAgIHRoaXMucHl0aG9uRXhlY3V0aW9uRmFjdG9yeSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSVB5dGhvbkV4ZWN1dGlvbkZhY3RvcnkpO1xuICAgICAgICB0aGlzLnByb2Nlc3NTZXJ2aWNlRmFjdG9yeSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSk7XG4gICAgICAgIHRoaXMuZWRpdG9yVXRpbHMgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc180LklFZGl0b3JVdGlscyk7XG4gICAgfVxuICAgIHByb3ZpZGVEb2N1bWVudFNvcnRJbXBvcnRzRWRpdHModXJpLCB0b2tlbikge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnQgPSB5aWVsZCB0aGlzLmRvY3VtZW50TWFuYWdlci5vcGVuVGV4dERvY3VtZW50KHVyaSk7XG4gICAgICAgICAgICBpZiAoIWRvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRvY3VtZW50LmxpbmVDb3VudCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaXNvcnQgZG9lcyBoYXZlIHRoZSBhYmlsaXR5IHRvIHJlYWQgZnJvbSB0aGUgcHJvY2VzcyBpbnB1dCBzdHJlYW0gYW5kIHJldHVybiB0aGUgZm9ybWF0dGVkIGNvZGUgb3V0IG9mIHRoZSBvdXRwdXQgc3RyZWFtLlxuICAgICAgICAgICAgLy8gSG93ZXZlciB0aGV5IGRvbid0IHN1cHBvcnQgcmV0dXJuaW5nIHRoZSBkaWZmIG9mIHRoZSBmb3JtYXR0ZWQgdGV4dCB3aGVuIHJlYWRpbmcgZGF0YSBmcm9tIHRoZSBpbnB1dCBzdHJlYW0uXG4gICAgICAgICAgICAvLyBZZXMgZ2V0dGluZyB0ZXh0IGZvcm1hdHRlZCB0aGF0IHdheSBhdm9pZHMgaGF2aW5nIHRvIGNyZWF0ZSBhIHRlbXBvcmFyeSBmaWxlLCBob3dldmVyIHRoZSBkaWZmaW5nIHdpbGwgaGF2ZVxuICAgICAgICAgICAgLy8gdG8gYmUgZG9uZSBoZXJlIGluIG5vZGUgKGV4dGVuc2lvbiksIGkuZS4gZXh0ZW5zaW9uIGNwdSwgaS5lLiBsZXNzIHJlc3BvbnNpdmUgc29sdXRpb24uXG4gICAgICAgICAgICBjb25zdCBpbXBvcnRTY3JpcHQgPSBwYXRoLmpvaW4oY29uc3RhbnRzXzEuRVhURU5TSU9OX1JPT1RfRElSLCAncHl0aG9uRmlsZXMnLCAnc29ydEltcG9ydHMucHknKTtcbiAgICAgICAgICAgIGNvbnN0IGZzU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JRmlsZVN5c3RlbSk7XG4gICAgICAgICAgICBjb25zdCB0bXBGaWxlID0gZG9jdW1lbnQuaXNEaXJ0eSA/IHlpZWxkIGZzU2VydmljZS5jcmVhdGVUZW1wb3JhcnlGaWxlKHBhdGguZXh0bmFtZShkb2N1bWVudC51cmkuZnNQYXRoKSkgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAodG1wRmlsZSkge1xuICAgICAgICAgICAgICAgIHlpZWxkIGZzU2VydmljZS53cml0ZUZpbGUodG1wRmlsZS5maWxlUGF0aCwgZG9jdW1lbnQuZ2V0VGV4dCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5jb25maWd1cmF0aW9uU2VydmljZS5nZXRTZXR0aW5ncyh1cmkpO1xuICAgICAgICAgICAgY29uc3QgaXNvcnQgPSBzZXR0aW5ncy5zb3J0SW1wb3J0cy5wYXRoO1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSB0bXBGaWxlID8gdG1wRmlsZS5maWxlUGF0aCA6IGRvY3VtZW50LnVyaS5mc1BhdGg7XG4gICAgICAgICAgICBjb25zdCBhcmdzID0gW2ZpbGVQYXRoLCAnLS1kaWZmJ10uY29uY2F0KHNldHRpbmdzLnNvcnRJbXBvcnRzLmFyZ3MpO1xuICAgICAgICAgICAgbGV0IGRpZmZQYXRjaDtcbiAgICAgICAgICAgIGlmICh0b2tlbiAmJiB0b2tlbi5pc0NhbmNlbGxhdGlvblJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpc29ydCA9PT0gJ3N0cmluZycgJiYgaXNvcnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMZXRzIGp1c3QgdHJlYXQgdGhpcyBhcyBhIHN0YW5kYXJkIHRvb2wuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NTZXJ2aWNlID0geWllbGQgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkuY3JlYXRlKGRvY3VtZW50LnVyaSk7XG4gICAgICAgICAgICAgICAgICAgIGRpZmZQYXRjaCA9ICh5aWVsZCBwcm9jZXNzU2VydmljZS5leGVjKGlzb3J0LCBhcmdzLCB7IHRocm93T25TdGRFcnI6IHRydWUsIHRva2VuIH0pKS5zdGRvdXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzRXhlU2VydmljZSA9IHlpZWxkIHRoaXMucHl0aG9uRXhlY3V0aW9uRmFjdG9yeS5jcmVhdGUoeyByZXNvdXJjZTogZG9jdW1lbnQudXJpIH0pO1xuICAgICAgICAgICAgICAgICAgICBkaWZmUGF0Y2ggPSAoeWllbGQgcHJvY2Vzc0V4ZVNlcnZpY2UuZXhlYyhbaW1wb3J0U2NyaXB0XS5jb25jYXQoYXJncyksIHsgdGhyb3dPblN0ZEVycjogdHJ1ZSwgdG9rZW4gfSkpLnN0ZG91dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWRpdG9yVXRpbHMuZ2V0V29ya3NwYWNlRWRpdHNGcm9tUGF0Y2goZG9jdW1lbnQuZ2V0VGV4dCgpLCBkaWZmUGF0Y2gsIGRvY3VtZW50LnVyaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICBpZiAodG1wRmlsZSkge1xuICAgICAgICAgICAgICAgICAgICB0bXBGaWxlLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZWdpc3RlckNvbW1hbmRzKCkge1xuICAgICAgICBjb25zdCBjbWRNYW5hZ2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklDb21tYW5kTWFuYWdlcik7XG4gICAgICAgIGNvbnN0IGRpc3Bvc2FibGUgPSBjbWRNYW5hZ2VyLnJlZ2lzdGVyQ29tbWFuZChjb25zdGFudHNfMS5Db21tYW5kcy5Tb3J0X0ltcG9ydHMsIHRoaXMuc29ydEltcG9ydHMsIHRoaXMpO1xuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzQuSURpc3Bvc2FibGVSZWdpc3RyeSkucHVzaChkaXNwb3NhYmxlKTtcbiAgICB9XG4gICAgc29ydEltcG9ydHModXJpKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAoIXVyaSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZUVkaXRvciA9IHRoaXMuZG9jdW1lbnRNYW5hZ2VyLmFjdGl2ZVRleHRFZGl0b3I7XG4gICAgICAgICAgICAgICAgaWYgKCFhY3RpdmVFZGl0b3IgfHwgYWN0aXZlRWRpdG9yLmRvY3VtZW50Lmxhbmd1YWdlSWQgIT09IGNvbnN0YW50c18xLlBZVEhPTl9MQU5HVUFHRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNoZWxsLnNob3dFcnJvck1lc3NhZ2UoJ1BsZWFzZSBvcGVuIGEgUHl0aG9uIGZpbGUgdG8gc29ydCB0aGUgaW1wb3J0cy4nKS50aGVuKG1pc2NfMS5ub29wLCBtaXNjXzEubm9vcCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdXJpID0gYWN0aXZlRWRpdG9yLmRvY3VtZW50LnVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50ID0geWllbGQgdGhpcy5kb2N1bWVudE1hbmFnZXIub3BlblRleHREb2N1bWVudCh1cmkpO1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LmxpbmVDb3VudCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSGFjaywgaWYgdGhlIGRvY3VtZW50IGRvZXNuJ3QgY29udGFpbiBhbiBlbXB0eSBsaW5lIGF0IHRoZSBlbmQsIHRoZW4gYWRkIGl0XG4gICAgICAgICAgICAvLyBFbHNlIHRoZSBsaWJyYXJ5IHN0cmlwcyBvZmYgdGhlIGxhc3QgbGluZVxuICAgICAgICAgICAgY29uc3QgbGFzdExpbmUgPSBkb2N1bWVudC5saW5lQXQoZG9jdW1lbnQubGluZUNvdW50IC0gMSk7XG4gICAgICAgICAgICBpZiAobGFzdExpbmUudGV4dC50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVkaXQgPSBuZXcgdnNjb2RlXzEuV29ya3NwYWNlRWRpdCgpO1xuICAgICAgICAgICAgICAgIGVkaXQuaW5zZXJ0KHVyaSwgbGFzdExpbmUucmFuZ2UuZW5kLCBvc18xLkVPTCk7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5kb2N1bWVudE1hbmFnZXIuYXBwbHlFZGl0KGVkaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGFuZ2VzID0geWllbGQgdGhpcy5wcm92aWRlRG9jdW1lbnRTb3J0SW1wb3J0c0VkaXRzKHVyaSk7XG4gICAgICAgICAgICAgICAgaWYgKCFjaGFuZ2VzIHx8IGNoYW5nZXMuZW50cmllcygpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMuZG9jdW1lbnRNYW5hZ2VyLmFwcGx5RWRpdChjaGFuZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnID8gZXJyb3IgOiAoZXJyb3IubWVzc2FnZSA/IGVycm9yLm1lc3NhZ2UgOiBlcnJvcik7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0Q2hhbm5lbCA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNC5JT3V0cHV0Q2hhbm5lbCwgY29uc3RhbnRzXzEuU1RBTkRBUkRfT1VUUFVUX0NIQU5ORUwpO1xuICAgICAgICAgICAgICAgIG91dHB1dENoYW5uZWwuYXBwZW5kTGluZShlcnJvcik7XG4gICAgICAgICAgICAgICAgb3V0cHV0Q2hhbm5lbC5zaG93KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9nZ2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc180LklMb2dnZXIpO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihgRmFpbGVkIHRvIGZvcm1hdCBpbXBvcnRzIGZvciAnJHt1cmkuZnNQYXRofScuYCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hlbGwuc2hvd0Vycm9yTWVzc2FnZShtZXNzYWdlKS50aGVuKG1pc2NfMS5ub29wLCBtaXNjXzEubm9vcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5fX2RlY29yYXRlKFtcbiAgICB0ZWxlbWV0cnlfMS5jYXB0dXJlVGVsZW1ldHJ5KGNvbnN0YW50c18yLkZPUk1BVF9TT1JUX0lNUE9SVFMpXG5dLCBTb3J0SW1wb3J0c0VkaXRpbmdQcm92aWRlci5wcm90b3R5cGUsIFwicHJvdmlkZURvY3VtZW50U29ydEltcG9ydHNFZGl0c1wiLCBudWxsKTtcblNvcnRJbXBvcnRzRWRpdGluZ1Byb3ZpZGVyID0gX19kZWNvcmF0ZShbXG4gICAgaW52ZXJzaWZ5XzEuaW5qZWN0YWJsZSgpLFxuICAgIF9fcGFyYW0oMCwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzUuSVNlcnZpY2VDb250YWluZXIpKVxuXSwgU29ydEltcG9ydHNFZGl0aW5nUHJvdmlkZXIpO1xuZXhwb3J0cy5Tb3J0SW1wb3J0c0VkaXRpbmdQcm92aWRlciA9IFNvcnRJbXBvcnRzRWRpdGluZ1Byb3ZpZGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW1wb3J0U29ydFByb3ZpZGVyLmpzLm1hcCJdfQ==