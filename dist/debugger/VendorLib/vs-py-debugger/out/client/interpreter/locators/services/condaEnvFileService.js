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

const path = require("path");

const types_1 = require("../../../common/platform/types");

const types_2 = require("../../../common/types");

const types_3 = require("../../../ioc/types");

const contracts_1 = require("../../contracts");

const cacheableLocatorService_1 = require("./cacheableLocatorService");

const conda_1 = require("./conda");
/**
 * Locate conda env interpreters based on the "conda environments file".
 */


let CondaEnvFileService = class CondaEnvFileService extends cacheableLocatorService_1.CacheableLocatorService {
  constructor(helperService, condaService, fileSystem, serviceContainer, logger) {
    super('CondaEnvFileService', serviceContainer);
    this.helperService = helperService;
    this.condaService = condaService;
    this.fileSystem = fileSystem;
    this.logger = logger;
  }
  /**
   * Release any held resources.
   *
   * Called by VS Code to indicate it is done with the resource.
   */
  // tslint:disable-next-line:no-empty


  dispose() {}
  /**
   * Return the located interpreters.
   *
   * This is used by CacheableLocatorService.getInterpreters().
   */


  getInterpretersImplementation(resource) {
    return this.getSuggestionsFromConda();
  }
  /**
   * Return the list of interpreters identified by the "conda environments file".
   */


  getSuggestionsFromConda() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.condaService.condaEnvironmentsFile) {
        return [];
      }

      return this.fileSystem.fileExists(this.condaService.condaEnvironmentsFile).then(exists => exists ? this.getEnvironmentsFromFile(this.condaService.condaEnvironmentsFile) : Promise.resolve([]));
    });
  }
  /**
   * Return the list of environments identified in the given file.
   */


  getEnvironmentsFromFile(envFile) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const fileContents = yield this.fileSystem.readFile(envFile);
        const environmentPaths = fileContents.split(/\r?\n/g).map(environmentPath => environmentPath.trim()).filter(environmentPath => environmentPath.length > 0);
        const interpreters = (yield Promise.all(environmentPaths.map(environmentPath => this.getInterpreterDetails(environmentPath)))).filter(item => !!item).map(item => item);
        const environments = yield this.condaService.getCondaEnvironments(true);

        if (Array.isArray(environments) && environments.length > 0) {
          interpreters.forEach(interpreter => {
            const environment = environments.find(item => this.fileSystem.arePathsSame(item.path, interpreter.envPath));

            if (environment) {
              interpreter.envName = environment.name;
            }
          });
        }

        return interpreters;
      } catch (err) {
        this.logger.logError('Python Extension (getEnvironmentsFromFile.readFile):', err); // Ignore errors in reading the file.

        return [];
      }
    });
  }
  /**
   * Return the interpreter info for the given anaconda environment.
   */


  getInterpreterDetails(environmentPath) {
    return __awaiter(this, void 0, void 0, function* () {
      const interpreter = this.condaService.getInterpreterPath(environmentPath);

      if (!interpreter || !(yield this.fileSystem.fileExists(interpreter))) {
        return;
      }

      const details = yield this.helperService.getInterpreterInformation(interpreter);

      if (!details) {
        return;
      }

      const envName = details.envName ? details.envName : path.basename(environmentPath);
      return Object.assign({}, details, {
        path: interpreter,
        companyDisplayName: conda_1.AnacondaCompanyName,
        type: contracts_1.InterpreterType.Conda,
        envPath: environmentPath,
        envName
      });
    });
  }

};
CondaEnvFileService = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(contracts_1.IInterpreterHelper)), __param(1, inversify_1.inject(contracts_1.ICondaService)), __param(2, inversify_1.inject(types_1.IFileSystem)), __param(3, inversify_1.inject(types_3.IServiceContainer)), __param(4, inversify_1.inject(types_2.ILogger))], CondaEnvFileService);
exports.CondaEnvFileService = CondaEnvFileService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmRhRW52RmlsZVNlcnZpY2UuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImludmVyc2lmeV8xIiwicmVxdWlyZSIsInBhdGgiLCJ0eXBlc18xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJjb250cmFjdHNfMSIsImNhY2hlYWJsZUxvY2F0b3JTZXJ2aWNlXzEiLCJjb25kYV8xIiwiQ29uZGFFbnZGaWxlU2VydmljZSIsIkNhY2hlYWJsZUxvY2F0b3JTZXJ2aWNlIiwiY29uc3RydWN0b3IiLCJoZWxwZXJTZXJ2aWNlIiwiY29uZGFTZXJ2aWNlIiwiZmlsZVN5c3RlbSIsInNlcnZpY2VDb250YWluZXIiLCJsb2dnZXIiLCJkaXNwb3NlIiwiZ2V0SW50ZXJwcmV0ZXJzSW1wbGVtZW50YXRpb24iLCJyZXNvdXJjZSIsImdldFN1Z2dlc3Rpb25zRnJvbUNvbmRhIiwiY29uZGFFbnZpcm9ubWVudHNGaWxlIiwiZmlsZUV4aXN0cyIsImV4aXN0cyIsImdldEVudmlyb25tZW50c0Zyb21GaWxlIiwiZW52RmlsZSIsImZpbGVDb250ZW50cyIsInJlYWRGaWxlIiwiZW52aXJvbm1lbnRQYXRocyIsInNwbGl0IiwibWFwIiwiZW52aXJvbm1lbnRQYXRoIiwidHJpbSIsImZpbHRlciIsImludGVycHJldGVycyIsImFsbCIsImdldEludGVycHJldGVyRGV0YWlscyIsIml0ZW0iLCJlbnZpcm9ubWVudHMiLCJnZXRDb25kYUVudmlyb25tZW50cyIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpbnRlcnByZXRlciIsImVudmlyb25tZW50IiwiZmluZCIsImFyZVBhdGhzU2FtZSIsImVudlBhdGgiLCJlbnZOYW1lIiwibmFtZSIsImVyciIsImxvZ0Vycm9yIiwiZ2V0SW50ZXJwcmV0ZXJQYXRoIiwiZGV0YWlscyIsImdldEludGVycHJldGVySW5mb3JtYXRpb24iLCJiYXNlbmFtZSIsImFzc2lnbiIsImNvbXBhbnlEaXNwbGF5TmFtZSIsIkFuYWNvbmRhQ29tcGFueU5hbWUiLCJ0eXBlIiwiSW50ZXJwcmV0ZXJUeXBlIiwiQ29uZGEiLCJpbmplY3RhYmxlIiwiaW5qZWN0IiwiSUludGVycHJldGVySGVscGVyIiwiSUNvbmRhU2VydmljZSIsIklGaWxlU3lzdGVtIiwiSVNlcnZpY2VDb250YWluZXIiLCJJTG9nZ2VyIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQSxJQUFJQSxVQUFVLEdBQUksVUFBUSxTQUFLQSxVQUFkLElBQTZCLFVBQVVDLFVBQVYsRUFBc0JDLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0MsSUFBbkMsRUFBeUM7QUFDbkYsTUFBSUMsQ0FBQyxHQUFHQyxTQUFTLENBQUNDLE1BQWxCO0FBQUEsTUFBMEJDLENBQUMsR0FBR0gsQ0FBQyxHQUFHLENBQUosR0FBUUgsTUFBUixHQUFpQkUsSUFBSSxLQUFLLElBQVQsR0FBZ0JBLElBQUksR0FBR0ssTUFBTSxDQUFDQyx3QkFBUCxDQUFnQ1IsTUFBaEMsRUFBd0NDLEdBQXhDLENBQXZCLEdBQXNFQyxJQUFySDtBQUFBLE1BQTJITyxDQUEzSDtBQUNBLE1BQUksT0FBT0MsT0FBUCxLQUFtQixRQUFuQixJQUErQixPQUFPQSxPQUFPLENBQUNDLFFBQWYsS0FBNEIsVUFBL0QsRUFBMkVM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QUEzQixDQUFKLENBTHNCLEVBTTdCekYsT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQytELE1BQVosQ0FBbUIzRCxPQUFPLENBQUNnRSxPQUEzQixDQUFKLENBTnNCLENBQUQsRUFPN0IzRCxtQkFQNkIsQ0FBaEM7QUFRQVYsT0FBTyxDQUFDVSxtQkFBUixHQUE4QkEsbUJBQTlCIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufTtcclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uLy4uLy4uL2lvYy90eXBlc1wiKTtcclxuY29uc3QgY29udHJhY3RzXzEgPSByZXF1aXJlKFwiLi4vLi4vY29udHJhY3RzXCIpO1xyXG5jb25zdCBjYWNoZWFibGVMb2NhdG9yU2VydmljZV8xID0gcmVxdWlyZShcIi4vY2FjaGVhYmxlTG9jYXRvclNlcnZpY2VcIik7XHJcbmNvbnN0IGNvbmRhXzEgPSByZXF1aXJlKFwiLi9jb25kYVwiKTtcclxuLyoqXHJcbiAqIExvY2F0ZSBjb25kYSBlbnYgaW50ZXJwcmV0ZXJzIGJhc2VkIG9uIHRoZSBcImNvbmRhIGVudmlyb25tZW50cyBmaWxlXCIuXHJcbiAqL1xyXG5sZXQgQ29uZGFFbnZGaWxlU2VydmljZSA9IGNsYXNzIENvbmRhRW52RmlsZVNlcnZpY2UgZXh0ZW5kcyBjYWNoZWFibGVMb2NhdG9yU2VydmljZV8xLkNhY2hlYWJsZUxvY2F0b3JTZXJ2aWNlIHtcclxuICAgIGNvbnN0cnVjdG9yKGhlbHBlclNlcnZpY2UsIGNvbmRhU2VydmljZSwgZmlsZVN5c3RlbSwgc2VydmljZUNvbnRhaW5lciwgbG9nZ2VyKSB7XHJcbiAgICAgICAgc3VwZXIoJ0NvbmRhRW52RmlsZVNlcnZpY2UnLCBzZXJ2aWNlQ29udGFpbmVyKTtcclxuICAgICAgICB0aGlzLmhlbHBlclNlcnZpY2UgPSBoZWxwZXJTZXJ2aWNlO1xyXG4gICAgICAgIHRoaXMuY29uZGFTZXJ2aWNlID0gY29uZGFTZXJ2aWNlO1xyXG4gICAgICAgIHRoaXMuZmlsZVN5c3RlbSA9IGZpbGVTeXN0ZW07XHJcbiAgICAgICAgdGhpcy5sb2dnZXIgPSBsb2dnZXI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFJlbGVhc2UgYW55IGhlbGQgcmVzb3VyY2VzLlxyXG4gICAgICpcclxuICAgICAqIENhbGxlZCBieSBWUyBDb2RlIHRvIGluZGljYXRlIGl0IGlzIGRvbmUgd2l0aCB0aGUgcmVzb3VyY2UuXHJcbiAgICAgKi9cclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eVxyXG4gICAgZGlzcG9zZSgpIHsgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm4gdGhlIGxvY2F0ZWQgaW50ZXJwcmV0ZXJzLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgaXMgdXNlZCBieSBDYWNoZWFibGVMb2NhdG9yU2VydmljZS5nZXRJbnRlcnByZXRlcnMoKS5cclxuICAgICAqL1xyXG4gICAgZ2V0SW50ZXJwcmV0ZXJzSW1wbGVtZW50YXRpb24ocmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5nZXRTdWdnZXN0aW9uc0Zyb21Db25kYSgpO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm4gdGhlIGxpc3Qgb2YgaW50ZXJwcmV0ZXJzIGlkZW50aWZpZWQgYnkgdGhlIFwiY29uZGEgZW52aXJvbm1lbnRzIGZpbGVcIi5cclxuICAgICAqL1xyXG4gICAgZ2V0U3VnZ2VzdGlvbnNGcm9tQ29uZGEoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbmRhU2VydmljZS5jb25kYUVudmlyb25tZW50c0ZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWxlU3lzdGVtLmZpbGVFeGlzdHModGhpcy5jb25kYVNlcnZpY2UuY29uZGFFbnZpcm9ubWVudHNGaWxlKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZXhpc3RzID0+IGV4aXN0cyA/IHRoaXMuZ2V0RW52aXJvbm1lbnRzRnJvbUZpbGUodGhpcy5jb25kYVNlcnZpY2UuY29uZGFFbnZpcm9ubWVudHNGaWxlKSA6IFByb21pc2UucmVzb2x2ZShbXSkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm4gdGhlIGxpc3Qgb2YgZW52aXJvbm1lbnRzIGlkZW50aWZpZWQgaW4gdGhlIGdpdmVuIGZpbGUuXHJcbiAgICAgKi9cclxuICAgIGdldEVudmlyb25tZW50c0Zyb21GaWxlKGVudkZpbGUpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZUNvbnRlbnRzID0geWllbGQgdGhpcy5maWxlU3lzdGVtLnJlYWRGaWxlKGVudkZpbGUpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW52aXJvbm1lbnRQYXRocyA9IGZpbGVDb250ZW50cy5zcGxpdCgvXFxyP1xcbi9nKVxyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoZW52aXJvbm1lbnRQYXRoID0+IGVudmlyb25tZW50UGF0aC50cmltKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihlbnZpcm9ubWVudFBhdGggPT4gZW52aXJvbm1lbnRQYXRoLmxlbmd0aCA+IDApO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW50ZXJwcmV0ZXJzID0gKHlpZWxkIFByb21pc2UuYWxsKGVudmlyb25tZW50UGF0aHNcclxuICAgICAgICAgICAgICAgICAgICAubWFwKGVudmlyb25tZW50UGF0aCA9PiB0aGlzLmdldEludGVycHJldGVyRGV0YWlscyhlbnZpcm9ubWVudFBhdGgpKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+ICEhaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAubWFwKGl0ZW0gPT4gaXRlbSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSB5aWVsZCB0aGlzLmNvbmRhU2VydmljZS5nZXRDb25kYUVudmlyb25tZW50cyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudmlyb25tZW50cykgJiYgZW52aXJvbm1lbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRlcnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZvckVhY2goaW50ZXJwcmV0ZXIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnZpcm9ubWVudCA9IGVudmlyb25tZW50cy5maW5kKGl0ZW0gPT4gdGhpcy5maWxlU3lzdGVtLmFyZVBhdGhzU2FtZShpdGVtLnBhdGgsIGludGVycHJldGVyLmVudlBhdGgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRlci5lbnZOYW1lID0gZW52aXJvbm1lbnQubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVycHJldGVycztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dFcnJvcignUHl0aG9uIEV4dGVuc2lvbiAoZ2V0RW52aXJvbm1lbnRzRnJvbUZpbGUucmVhZEZpbGUpOicsIGVycik7XHJcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIGluIHJlYWRpbmcgdGhlIGZpbGUuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJuIHRoZSBpbnRlcnByZXRlciBpbmZvIGZvciB0aGUgZ2l2ZW4gYW5hY29uZGEgZW52aXJvbm1lbnQuXHJcbiAgICAgKi9cclxuICAgIGdldEludGVycHJldGVyRGV0YWlscyhlbnZpcm9ubWVudFBhdGgpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlciA9IHRoaXMuY29uZGFTZXJ2aWNlLmdldEludGVycHJldGVyUGF0aChlbnZpcm9ubWVudFBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoIWludGVycHJldGVyIHx8ICEoeWllbGQgdGhpcy5maWxlU3lzdGVtLmZpbGVFeGlzdHMoaW50ZXJwcmV0ZXIpKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSB5aWVsZCB0aGlzLmhlbHBlclNlcnZpY2UuZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbihpbnRlcnByZXRlcik7XHJcbiAgICAgICAgICAgIGlmICghZGV0YWlscykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGVudk5hbWUgPSBkZXRhaWxzLmVudk5hbWUgPyBkZXRhaWxzLmVudk5hbWUgOiBwYXRoLmJhc2VuYW1lKGVudmlyb25tZW50UGF0aCk7XHJcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBkZXRhaWxzLCB7IHBhdGg6IGludGVycHJldGVyLCBjb21wYW55RGlzcGxheU5hbWU6IGNvbmRhXzEuQW5hY29uZGFDb21wYW55TmFtZSwgdHlwZTogY29udHJhY3RzXzEuSW50ZXJwcmV0ZXJUeXBlLkNvbmRhLCBlbnZQYXRoOiBlbnZpcm9ubWVudFBhdGgsIGVudk5hbWUgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcbkNvbmRhRW52RmlsZVNlcnZpY2UgPSBfX2RlY29yYXRlKFtcclxuICAgIGludmVyc2lmeV8xLmluamVjdGFibGUoKSxcclxuICAgIF9fcGFyYW0oMCwgaW52ZXJzaWZ5XzEuaW5qZWN0KGNvbnRyYWN0c18xLklJbnRlcnByZXRlckhlbHBlcikpLFxyXG4gICAgX19wYXJhbSgxLCBpbnZlcnNpZnlfMS5pbmplY3QoY29udHJhY3RzXzEuSUNvbmRhU2VydmljZSkpLFxyXG4gICAgX19wYXJhbSgyLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMS5JRmlsZVN5c3RlbSkpLFxyXG4gICAgX19wYXJhbSgzLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMy5JU2VydmljZUNvbnRhaW5lcikpLFxyXG4gICAgX19wYXJhbSg0LCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMi5JTG9nZ2VyKSlcclxuXSwgQ29uZGFFbnZGaWxlU2VydmljZSk7XHJcbmV4cG9ydHMuQ29uZGFFbnZGaWxlU2VydmljZSA9IENvbmRhRW52RmlsZVNlcnZpY2U7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbmRhRW52RmlsZVNlcnZpY2UuanMubWFwIl19