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

Object.defineProperty(exports, "__esModule", {
  value: true
});

const inversify_1 = require("inversify");

const vscode_1 = require("vscode");

const types_1 = require("../../../common/types");

const constants_1 = require("./../constants");

const types_2 = require("./../types");

let WorkspaceTestManagerService = class WorkspaceTestManagerService {
  constructor(outChannel, testManagerServiceFactory, disposables) {
    this.outChannel = outChannel;
    this.testManagerServiceFactory = testManagerServiceFactory;
    this.workspaceTestManagers = new Map();
    disposables.push(this);
  }

  dispose() {
    this.workspaceTestManagers.forEach(info => info.dispose());
  }

  getTestManager(resource) {
    const wkspace = this.getWorkspace(resource);
    this.ensureTestManagerService(wkspace);
    return this.workspaceTestManagers.get(wkspace.fsPath).getTestManager();
  }

  getTestWorkingDirectory(resource) {
    const wkspace = this.getWorkspace(resource);
    this.ensureTestManagerService(wkspace);
    return this.workspaceTestManagers.get(wkspace.fsPath).getTestWorkingDirectory();
  }

  getPreferredTestManager(resource) {
    const wkspace = this.getWorkspace(resource);
    this.ensureTestManagerService(wkspace);
    return this.workspaceTestManagers.get(wkspace.fsPath).getPreferredTestManager();
  }

  getWorkspace(resource) {
    if (!Array.isArray(vscode_1.workspace.workspaceFolders) || vscode_1.workspace.workspaceFolders.length === 0) {
      const noWkspaceMessage = 'Please open a workspace';
      this.outChannel.appendLine(noWkspaceMessage);
      throw new Error(noWkspaceMessage);
    }

    if (!resource || vscode_1.workspace.workspaceFolders.length === 1) {
      return vscode_1.workspace.workspaceFolders[0].uri;
    }

    const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(resource);

    if (workspaceFolder) {
      return workspaceFolder.uri;
    }

    const message = `Resource '${resource.fsPath}' does not belong to any workspace`;
    this.outChannel.appendLine(message);
    throw new Error(message);
  }

  ensureTestManagerService(wkspace) {
    if (!this.workspaceTestManagers.has(wkspace.fsPath)) {
      this.workspaceTestManagers.set(wkspace.fsPath, this.testManagerServiceFactory(wkspace));
    }
  }

};
WorkspaceTestManagerService = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_1.IOutputChannel)), __param(0, inversify_1.named(constants_1.TEST_OUTPUT_CHANNEL)), __param(1, inversify_1.inject(types_2.ITestManagerServiceFactory)), __param(2, inversify_1.inject(types_1.IDisposableRegistry))], WorkspaceTestManagerService);
exports.WorkspaceTestManagerService = WorkspaceTestManagerService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndvcmtzcGFjZVRlc3RNYW5hZ2VyU2VydmljZS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX3BhcmFtIiwicGFyYW1JbmRleCIsImRlY29yYXRvciIsImV4cG9ydHMiLCJ2YWx1ZSIsImludmVyc2lmeV8xIiwicmVxdWlyZSIsInZzY29kZV8xIiwidHlwZXNfMSIsImNvbnN0YW50c18xIiwidHlwZXNfMiIsIldvcmtzcGFjZVRlc3RNYW5hZ2VyU2VydmljZSIsImNvbnN0cnVjdG9yIiwib3V0Q2hhbm5lbCIsInRlc3RNYW5hZ2VyU2VydmljZUZhY3RvcnkiLCJkaXNwb3NhYmxlcyIsIndvcmtzcGFjZVRlc3RNYW5hZ2VycyIsIk1hcCIsInB1c2giLCJkaXNwb3NlIiwiZm9yRWFjaCIsImluZm8iLCJnZXRUZXN0TWFuYWdlciIsInJlc291cmNlIiwid2tzcGFjZSIsImdldFdvcmtzcGFjZSIsImVuc3VyZVRlc3RNYW5hZ2VyU2VydmljZSIsImdldCIsImZzUGF0aCIsImdldFRlc3RXb3JraW5nRGlyZWN0b3J5IiwiZ2V0UHJlZmVycmVkVGVzdE1hbmFnZXIiLCJBcnJheSIsImlzQXJyYXkiLCJ3b3Jrc3BhY2UiLCJ3b3Jrc3BhY2VGb2xkZXJzIiwibm9Xa3NwYWNlTWVzc2FnZSIsImFwcGVuZExpbmUiLCJFcnJvciIsInVyaSIsIndvcmtzcGFjZUZvbGRlciIsImdldFdvcmtzcGFjZUZvbGRlciIsIm1lc3NhZ2UiLCJoYXMiLCJzZXQiLCJpbmplY3RhYmxlIiwiaW5qZWN0IiwiSU91dHB1dENoYW5uZWwiLCJuYW1lZCIsIlRFU1RfT1VUUFVUX0NIQU5ORUwiLCJJVGVzdE1hbmFnZXJTZXJ2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QnRDLFdBQVcsQ0FBQ3VDLG1CQUE5QixDQUFKLENBRjFCLEVBR3JDaEQsT0FBTyxDQUFDLENBQUQsRUFBSUssV0FBVyxDQUFDd0MsTUFBWixDQUFtQm5DLE9BQU8sQ0FBQ3VDLDBCQUEzQixDQUFKLENBSDhCLEVBSXJDakQsT0FBTyxDQUFDLENBQUQsRUFBSUssV0FBVyxDQUFDd0MsTUFBWixDQUFtQnJDLE9BQU8sQ0FBQzBDLG1CQUEzQixDQUFKLENBSjhCLENBQUQsRUFLckN2QywyQkFMcUMsQ0FBeEM7QUFNQVIsT0FBTyxDQUFDUSwyQkFBUixHQUFzQ0EsMkJBQXRDIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vLi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4vLi4vdHlwZXNcIik7XHJcbmxldCBXb3Jrc3BhY2VUZXN0TWFuYWdlclNlcnZpY2UgPSBjbGFzcyBXb3Jrc3BhY2VUZXN0TWFuYWdlclNlcnZpY2Uge1xyXG4gICAgY29uc3RydWN0b3Iob3V0Q2hhbm5lbCwgdGVzdE1hbmFnZXJTZXJ2aWNlRmFjdG9yeSwgZGlzcG9zYWJsZXMpIHtcclxuICAgICAgICB0aGlzLm91dENoYW5uZWwgPSBvdXRDaGFubmVsO1xyXG4gICAgICAgIHRoaXMudGVzdE1hbmFnZXJTZXJ2aWNlRmFjdG9yeSA9IHRlc3RNYW5hZ2VyU2VydmljZUZhY3Rvcnk7XHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VUZXN0TWFuYWdlcnMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgZGlzcG9zYWJsZXMucHVzaCh0aGlzKTtcclxuICAgIH1cclxuICAgIGRpc3Bvc2UoKSB7XHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VUZXN0TWFuYWdlcnMuZm9yRWFjaChpbmZvID0+IGluZm8uZGlzcG9zZSgpKTtcclxuICAgIH1cclxuICAgIGdldFRlc3RNYW5hZ2VyKHJlc291cmNlKSB7XHJcbiAgICAgICAgY29uc3Qgd2tzcGFjZSA9IHRoaXMuZ2V0V29ya3NwYWNlKHJlc291cmNlKTtcclxuICAgICAgICB0aGlzLmVuc3VyZVRlc3RNYW5hZ2VyU2VydmljZSh3a3NwYWNlKTtcclxuICAgICAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2VUZXN0TWFuYWdlcnMuZ2V0KHdrc3BhY2UuZnNQYXRoKS5nZXRUZXN0TWFuYWdlcigpO1xyXG4gICAgfVxyXG4gICAgZ2V0VGVzdFdvcmtpbmdEaXJlY3RvcnkocmVzb3VyY2UpIHtcclxuICAgICAgICBjb25zdCB3a3NwYWNlID0gdGhpcy5nZXRXb3Jrc3BhY2UocmVzb3VyY2UpO1xyXG4gICAgICAgIHRoaXMuZW5zdXJlVGVzdE1hbmFnZXJTZXJ2aWNlKHdrc3BhY2UpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLndvcmtzcGFjZVRlc3RNYW5hZ2Vycy5nZXQod2tzcGFjZS5mc1BhdGgpLmdldFRlc3RXb3JraW5nRGlyZWN0b3J5KCk7XHJcbiAgICB9XHJcbiAgICBnZXRQcmVmZXJyZWRUZXN0TWFuYWdlcihyZXNvdXJjZSkge1xyXG4gICAgICAgIGNvbnN0IHdrc3BhY2UgPSB0aGlzLmdldFdvcmtzcGFjZShyZXNvdXJjZSk7XHJcbiAgICAgICAgdGhpcy5lbnN1cmVUZXN0TWFuYWdlclNlcnZpY2Uod2tzcGFjZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMud29ya3NwYWNlVGVzdE1hbmFnZXJzLmdldCh3a3NwYWNlLmZzUGF0aCkuZ2V0UHJlZmVycmVkVGVzdE1hbmFnZXIoKTtcclxuICAgIH1cclxuICAgIGdldFdvcmtzcGFjZShyZXNvdXJjZSkge1xyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycykgfHwgdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vV2tzcGFjZU1lc3NhZ2UgPSAnUGxlYXNlIG9wZW4gYSB3b3Jrc3BhY2UnO1xyXG4gICAgICAgICAgICB0aGlzLm91dENoYW5uZWwuYXBwZW5kTGluZShub1drc3BhY2VNZXNzYWdlKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG5vV2tzcGFjZU1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXJlc291cmNlIHx8IHZzY29kZV8xLndvcmtzcGFjZS53b3Jrc3BhY2VGb2xkZXJzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnNbMF0udXJpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB3b3Jrc3BhY2VGb2xkZXIgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0V29ya3NwYWNlRm9sZGVyKHJlc291cmNlKTtcclxuICAgICAgICBpZiAod29ya3NwYWNlRm9sZGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB3b3Jrc3BhY2VGb2xkZXIudXJpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBtZXNzYWdlID0gYFJlc291cmNlICcke3Jlc291cmNlLmZzUGF0aH0nIGRvZXMgbm90IGJlbG9uZyB0byBhbnkgd29ya3NwYWNlYDtcclxuICAgICAgICB0aGlzLm91dENoYW5uZWwuYXBwZW5kTGluZShtZXNzYWdlKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgICB9XHJcbiAgICBlbnN1cmVUZXN0TWFuYWdlclNlcnZpY2Uod2tzcGFjZSkge1xyXG4gICAgICAgIGlmICghdGhpcy53b3Jrc3BhY2VUZXN0TWFuYWdlcnMuaGFzKHdrc3BhY2UuZnNQYXRoKSkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmtzcGFjZVRlc3RNYW5hZ2Vycy5zZXQod2tzcGFjZS5mc1BhdGgsIHRoaXMudGVzdE1hbmFnZXJTZXJ2aWNlRmFjdG9yeSh3a3NwYWNlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5Xb3Jrc3BhY2VUZXN0TWFuYWdlclNlcnZpY2UgPSBfX2RlY29yYXRlKFtcclxuICAgIGludmVyc2lmeV8xLmluamVjdGFibGUoKSxcclxuICAgIF9fcGFyYW0oMCwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzEuSU91dHB1dENoYW5uZWwpKSwgX19wYXJhbSgwLCBpbnZlcnNpZnlfMS5uYW1lZChjb25zdGFudHNfMS5URVNUX09VVFBVVF9DSEFOTkVMKSksXHJcbiAgICBfX3BhcmFtKDEsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18yLklUZXN0TWFuYWdlclNlcnZpY2VGYWN0b3J5KSksXHJcbiAgICBfX3BhcmFtKDIsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18xLklEaXNwb3NhYmxlUmVnaXN0cnkpKVxyXG5dLCBXb3Jrc3BhY2VUZXN0TWFuYWdlclNlcnZpY2UpO1xyXG5leHBvcnRzLldvcmtzcGFjZVRlc3RNYW5hZ2VyU2VydmljZSA9IFdvcmtzcGFjZVRlc3RNYW5hZ2VyU2VydmljZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9d29ya3NwYWNlVGVzdE1hbmFnZXJTZXJ2aWNlLmpzLm1hcCJdfQ==