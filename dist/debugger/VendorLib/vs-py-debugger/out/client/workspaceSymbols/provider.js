'use strict';

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

const _ = require("lodash");

const vscode_1 = require("vscode");

const constants_1 = require("../common/constants");

const telemetry_1 = require("../telemetry");

const constants_2 = require("../telemetry/constants");

const parser_1 = require("./parser");

class WorkspaceSymbolProvider {
  constructor(fs, commands, tagGenerators) {
    this.fs = fs;
    this.commands = commands;
    this.tagGenerators = tagGenerators;
  }

  provideWorkspaceSymbols(query, token) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.tagGenerators.length === 0) {
        return [];
      }

      const generatorsWithTagFiles = yield Promise.all(this.tagGenerators.map(generator => this.fs.fileExists(generator.tagFilePath)));

      if (generatorsWithTagFiles.filter(exists => exists).length !== this.tagGenerators.length) {
        yield this.commands.executeCommand(constants_1.Commands.Build_Workspace_Symbols, true, token);
      }

      const generators = yield Promise.all(this.tagGenerators.map(generator => __awaiter(this, void 0, void 0, function* () {
        const tagFileExists = yield this.fs.fileExists(generator.tagFilePath);
        return tagFileExists ? generator : undefined;
      })));
      const promises = generators.filter(generator => generator !== undefined && generator.enabled).map(generator => __awaiter(this, void 0, void 0, function* () {
        // load tags
        const items = yield parser_1.parseTags(generator.workspaceFolder.fsPath, generator.tagFilePath, query, token);

        if (!Array.isArray(items)) {
          return [];
        }

        return items.map(item => new vscode_1.SymbolInformation(item.symbolName, item.symbolKind, '', new vscode_1.Location(vscode_1.Uri.file(item.fileName), item.position)));
      }));
      const symbols = yield Promise.all(promises);
      return _.flatten(symbols);
    });
  }

}

__decorate([telemetry_1.captureTelemetry(constants_2.WORKSPACE_SYMBOLS_GO_TO)], WorkspaceSymbolProvider.prototype, "provideWorkspaceSymbols", null);

exports.WorkspaceSymbolProvider = WorkspaceSymbolProvider;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByb3ZpZGVyLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJleHBvcnRzIiwiXyIsInJlcXVpcmUiLCJ2c2NvZGVfMSIsImNvbnN0YW50c18xIiwidGVsZW1ldHJ5XzEiLCJjb25zdGFudHNfMiIsInBhcnNlcl8xIiwiV29ya3NwYWNlU3ltYm9sUHJvdmlkZXIiLCJjb25zdHJ1Y3RvciIsImZzIiwiY29tbWFuZHMiLCJ0YWdHZW5lcmF0b3JzIiwicHJvdmlkZVdvcmtzcGFjZVN5bWJvbHMiLCJxdWVyeSIsInRva2VuIiwiZ2VuZXJhdG9yc1dpdGhUYWdGaWxlcyIsImFsbCIsIm1hcCIsImZpbGVFeGlzdHMiLCJ0YWdGaWxlUGF0aCIsImZpbHRlciIsImV4aXN0cyIsImV4ZWN1dGVDb21tYW5kIiwiQ29tbWFuZHMiLCJCdWlsZF9Xb3Jrc3BhY2VfU3ltYm9scyIsImdlbmVyYXRvcnMiLCJ0YWdGaWxlRXhpc3RzIiwidW5kZWZpbmVkIiwicHJvbWlzZXMiLCJlbmFibGVkIiwiaXRlbXMiLCJwYXJzZVRhZ3MiLCJ3b3Jrc3BhY2VGb2xkZXIiLCJmc1BhdGgiLCJBcnJheSIsImlzQXJyYXkiLCJpdGVtIiwiU3ltYm9sSW5mb3JtYXRpb24iLCJzeW1ib2xOYW1lIiwic3ltYm9sS2luZCIsIkxvY2F0aW9uIiwiVXJpIiwiZmlsZSIsImZpbGVOYW1lIiwicG9zaXRpb24iLCJzeW1ib2xzIiwiZmxhdHRlbiIsImNhcHR1cmVUZWxlbWV0cnkiLCJXT1JLU1BBQ0VfU1lNQk9MU19HT19UTyIsInByb3RvdHlwZSJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ25GLE1BQUlDLENBQUMsR0FBR0MsU0FBUyxDQUFDQyxNQUFsQjtBQUFBLE1BQTBCQyxDQUFDLEdBQUdILENBQUMsR0FBRyxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLElBQUksS0FBSyxJQUFULEdBQWdCQSxJQUFJLEdBQUdLLE1BQU0sQ0FBQ0Msd0JBQVAsQ0FBZ0NSLE1BQWhDLEVBQXdDQyxHQUF4QyxDQUF2QixHQUFzRUMsSUFBckg7QUFBQSxNQUEySE8sQ0FBM0g7QUFDQSxNQUFJLE9BQU9DLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0IsT0FBT0EsT0FBTyxDQUFDQyxRQUFmLEtBQTRCLFVBQS9ELEVBQTJFTCxDQUFDLEdBQUdJLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQlosVUFBakIsRUFBNkJDLE1BQTdCLEVBQXFDQyxHQUFyQyxFQUEwQ0MsSUFBMUMsQ0FBSixDQUEzRSxLQUNLLEtBQUssSUFBSVUsQ0FBQyxHQUFHYixVQUFVLENBQUNNLE1BQVgsR0FBb0IsQ0FBakMsRUFBb0NPLENBQUMsSUFBSSxDQUF6QyxFQUE0Q0EsQ0FBQyxFQUE3QyxFQUFpRCxJQUFJSCxDQUFDLEdBQUdWLFVBQVUsQ0FBQ2EsQ0FBRCxDQUFsQixFQUF1Qk4sQ0FBQyxHQUFHLENBQUNILENBQUMsR0FBRyxDQUFKLEdBQVFNLENBQUMsQ0FBQ0gsQ0FBRCxDQUFULEdBQWVILENBQUMsR0FBRyxDQUFKLEdBQVFNLENBQUMsQ0FBQ1QsTUFBRCxFQUFTQyxHQUFULEVBQWNLLENBQWQsQ0FBVCxHQUE0QkcsQ0FBQyxDQUFDVCxN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ZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9jb25zdGFudHNcIik7XG5jb25zdCB0ZWxlbWV0cnlfMSA9IHJlcXVpcmUoXCIuLi90ZWxlbWV0cnlcIik7XG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuLi90ZWxlbWV0cnkvY29uc3RhbnRzXCIpO1xuY29uc3QgcGFyc2VyXzEgPSByZXF1aXJlKFwiLi9wYXJzZXJcIik7XG5jbGFzcyBXb3Jrc3BhY2VTeW1ib2xQcm92aWRlciB7XG4gICAgY29uc3RydWN0b3IoZnMsIGNvbW1hbmRzLCB0YWdHZW5lcmF0b3JzKSB7XG4gICAgICAgIHRoaXMuZnMgPSBmcztcbiAgICAgICAgdGhpcy5jb21tYW5kcyA9IGNvbW1hbmRzO1xuICAgICAgICB0aGlzLnRhZ0dlbmVyYXRvcnMgPSB0YWdHZW5lcmF0b3JzO1xuICAgIH1cbiAgICBwcm92aWRlV29ya3NwYWNlU3ltYm9scyhxdWVyeSwgdG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRhZ0dlbmVyYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZ2VuZXJhdG9yc1dpdGhUYWdGaWxlcyA9IHlpZWxkIFByb21pc2UuYWxsKHRoaXMudGFnR2VuZXJhdG9ycy5tYXAoZ2VuZXJhdG9yID0+IHRoaXMuZnMuZmlsZUV4aXN0cyhnZW5lcmF0b3IudGFnRmlsZVBhdGgpKSk7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhdG9yc1dpdGhUYWdGaWxlcy5maWx0ZXIoZXhpc3RzID0+IGV4aXN0cykubGVuZ3RoICE9PSB0aGlzLnRhZ0dlbmVyYXRvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgeWllbGQgdGhpcy5jb21tYW5kcy5leGVjdXRlQ29tbWFuZChjb25zdGFudHNfMS5Db21tYW5kcy5CdWlsZF9Xb3Jrc3BhY2VfU3ltYm9scywgdHJ1ZSwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZ2VuZXJhdG9ycyA9IHlpZWxkIFByb21pc2UuYWxsKHRoaXMudGFnR2VuZXJhdG9ycy5tYXAoKGdlbmVyYXRvcikgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhZ0ZpbGVFeGlzdHMgPSB5aWVsZCB0aGlzLmZzLmZpbGVFeGlzdHMoZ2VuZXJhdG9yLnRhZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFnRmlsZUV4aXN0cyA/IGdlbmVyYXRvciA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgICBjb25zdCBwcm9taXNlcyA9IGdlbmVyYXRvcnNcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGdlbmVyYXRvciA9PiBnZW5lcmF0b3IgIT09IHVuZGVmaW5lZCAmJiBnZW5lcmF0b3IuZW5hYmxlZClcbiAgICAgICAgICAgICAgICAubWFwKChnZW5lcmF0b3IpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICAvLyBsb2FkIHRhZ3NcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtcyA9IHlpZWxkIHBhcnNlcl8xLnBhcnNlVGFncyhnZW5lcmF0b3Iud29ya3NwYWNlRm9sZGVyLmZzUGF0aCwgZ2VuZXJhdG9yLnRhZ0ZpbGVQYXRoLCBxdWVyeSwgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXMubWFwKGl0ZW0gPT4gbmV3IHZzY29kZV8xLlN5bWJvbEluZm9ybWF0aW9uKGl0ZW0uc3ltYm9sTmFtZSwgaXRlbS5zeW1ib2xLaW5kLCAnJywgbmV3IHZzY29kZV8xLkxvY2F0aW9uKHZzY29kZV8xLlVyaS5maWxlKGl0ZW0uZmlsZU5hbWUpLCBpdGVtLnBvc2l0aW9uKSkpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgY29uc3Qgc3ltYm9scyA9IHlpZWxkIFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICAgICAgICAgIHJldHVybiBfLmZsYXR0ZW4oc3ltYm9scyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbl9fZGVjb3JhdGUoW1xuICAgIHRlbGVtZXRyeV8xLmNhcHR1cmVUZWxlbWV0cnkoY29uc3RhbnRzXzIuV09SS1NQQUNFX1NZTUJPTFNfR09fVE8pXG5dLCBXb3Jrc3BhY2VTeW1ib2xQcm92aWRlci5wcm90b3R5cGUsIFwicHJvdmlkZVdvcmtzcGFjZVN5bWJvbHNcIiwgbnVsbCk7XG5leHBvcnRzLldvcmtzcGFjZVN5bWJvbFByb3ZpZGVyID0gV29ya3NwYWNlU3ltYm9sUHJvdmlkZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wcm92aWRlci5qcy5tYXAiXX0=