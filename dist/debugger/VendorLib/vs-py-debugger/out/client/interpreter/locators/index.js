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

const _ = require("lodash");

const vscode_1 = require("vscode");

const types_1 = require("../../common/platform/types");

const types_2 = require("../../common/types");

const types_3 = require("../../ioc/types");

const contracts_1 = require("../contracts");
/**
 * Facilitates locating Python interpreters.
 */


let PythonInterpreterLocatorService = class PythonInterpreterLocatorService {
  constructor(serviceContainer) {
    this.serviceContainer = serviceContainer;
    this.disposables = [];
    serviceContainer.get(types_2.IDisposableRegistry).push(this);
    this.platform = serviceContainer.get(types_1.IPlatformService);
    this.interpreterLocatorHelper = serviceContainer.get(contracts_1.IInterpreterLocatorHelper);
  }
  /**
   * This class should never emit events when we're locating.
   * The events will be fired by the indivitual locators retrieved in `getLocators`.
   *
   * @readonly
   * @type {Event<Promise<PythonInterpreter[]>>}
   * @memberof PythonInterpreterLocatorService
   */


  get onLocating() {
    return new vscode_1.EventEmitter().event;
  }
  /**
   * Release any held resources.
   *
   * Called by VS Code to indicate it is done with the resource.
   */


  dispose() {
    this.disposables.forEach(disposable => disposable.dispose());
  }
  /**
   * Return the list of known Python interpreters.
   *
   * The optional resource arg may control where locators look for
   * interpreters.
   */


  getInterpreters(resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const locators = this.getLocators();
      const promises = locators.map(provider => __awaiter(this, void 0, void 0, function* () {
        return provider.getInterpreters(resource);
      }));
      const listOfInterpreters = yield Promise.all(promises);

      const items = _.flatten(listOfInterpreters).filter(item => !!item).map(item => item);

      return this.interpreterLocatorHelper.mergeInterpreters(items);
    });
  }
  /**
   * Return the list of applicable interpreter locators.
   *
   * The locators are pulled from the registry.
   */


  getLocators() {
    // The order of the services is important.
    // The order is important because the data sources at the bottom of the list do not contain all,
    //  the information about the interpreters (e.g. type, environment name, etc).
    // This way, the items returned from the top of the list will win, when we combine the items returned.
    const keys = [[contracts_1.WINDOWS_REGISTRY_SERVICE, 'win'], [contracts_1.CONDA_ENV_SERVICE, ''], [contracts_1.CONDA_ENV_FILE_SERVICE, ''], [contracts_1.PIPENV_SERVICE, ''], [contracts_1.GLOBAL_VIRTUAL_ENV_SERVICE, ''], [contracts_1.WORKSPACE_VIRTUAL_ENV_SERVICE, ''], [contracts_1.KNOWN_PATH_SERVICE, ''], [contracts_1.CURRENT_PATH_SERVICE, '']];
    return getLocators(keys, this.platform, key => {
      return this.serviceContainer.get(contracts_1.IInterpreterLocatorService, key);
    });
  }

};
PythonInterpreterLocatorService = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_3.IServiceContainer))], PythonInterpreterLocatorService);
exports.PythonInterpreterLocatorService = PythonInterpreterLocatorService;

function getLocators(keys, platform, getService) {
  const locators = [];

  for (const [key, platformName] of keys) {
    if (!platform.info.matchPlatform(platformName)) {
      continue;
    }

    const locator = getService(key);
    locators.push(locator);
  }

  return locators;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIl9fcGFyYW0iLCJwYXJhbUluZGV4IiwiZGVjb3JhdG9yIiwiX19hd2FpdGVyIiwidGhpc0FyZyIsIl9hcmd1bWVudHMiLCJQIiwiZ2VuZXJhdG9yIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJ2YWx1ZSIsInN0ZXAiLCJuZXh0IiwiZSIsInJlamVjdGVkIiwicmVzdWx0IiwiZG9uZSIsInRoZW4iLCJhcHBseSIsImV4cG9ydHMiLCJpbnZlcnNpZnlfMSIsInJlcXVpcmUiLCJfIiwidnNjb2RlXzEiLCJ0eXBlc18xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJjb250cmFjdHNfMSIsIlB5dGhvbkludGVycHJldGVyTG9jYXRvclNlcnZpY2UiLCJjb25zdHJ1Y3RvciIsInNlcnZpY2VDb250YWluZXIiLCJkaXNwb3NhYmxlcyIsImdldCIsIklEaXNwb3NhYmxlUmVnaXN0cnkiLCJwdXNoIiwicGxhdGZvcm0iLCJJUGxhdGZvcm1TZXJ2aWNlIiwiaW50ZXJwcmV0ZXJMb2NhdG9ySGVscGVyIiwiSUludGVycHJldGVyTG9jYXRvckhlbHBlciIsIm9uTG9jYXRpbmciLCJFdmVudEVtaXR0ZXIiLCJldmVudCIsImRpc3Bvc2UiLCJmb3JFYWNoIiwiZGlzcG9zYWJsZSIsImdldEludGVycHJldGVycyIsInJlc291cmNlIiwibG9jYXRvcnMiLCJnZXRMb2NhdG9ycyIsInByb21pc2VzIiwibWFwIiwicHJvdmlkZXIiLCJsaXN0T2ZJbnRlcnByZXRlcnMiLCJhbGwiLCJpdGVtcyIsImZsYXR0ZW4iLCJmaWx0ZXIiLCJpdGVtIiwibWVyZ2VJbnRlcnByZXRlcnMiLCJrZXlzIiwiV0lORE9XU19SRUdJU1RSWV9TRVJWSUNFIiwiQ09OREFfRU5WX1NFUlZJQ0UiLCJDT05EQV9FTlZfRklMRV9TRVJWSUNFIiwiUElQRU5WX1NFUlZJQ0UiLCJHTE9CQUxfVklSVFVBTF9FTlZfU0VSVklDRSIsIldPUktTUEFDRV9WSVJUVUFMX0VOVl9TRVJWSUNFIiwiS05PV05fUEFUSF9TRVJWSUNFIiwiQ1VSUkVOVF9QQVRIX1NFUlZJQ0UiLCJJSW50ZXJwcmV0ZXJMb2NhdG9yU2VydmljZSIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciIsImdldFNlcnZpY2UiLCJwbGF0Zm9ybU5hbWUiLCJpbmZvIiwibWF0Y2hQbGF0Zm9ybSIsImxvY2F0b3IiXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0EsTUFBSSxPQUFPQyxPQUFQLEtBQW1CLFFBQW5CLElBQStCLE9BQU9BLE9BQU8sQ0FBQ0MsUUFBZixLQUE0QixVQUEvRCxFQUEyRUwsQ0FBQyxHQUFHSSxPQUFPLENBQUNDLFFBQVIsQ0FBaUJaLFVBQWpCLEVBQTZCQyxNQUE3QixFQUFxQ0MsR0FBckMsRUFBMENDLElBQTFDLENBQUosQ0FBM0UsS0FDSyxLQUFLLElBQUlVLENBQUMsR0FBR2IsVUFBVSxDQUFDTSxNQUFYLEdB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cy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XG5jb25zdCBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL3BsYXRmb3JtL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vdHlwZXNcIik7XG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uLy4uL2lvYy90eXBlc1wiKTtcbmNvbnN0IGNvbnRyYWN0c18xID0gcmVxdWlyZShcIi4uL2NvbnRyYWN0c1wiKTtcbi8qKlxuICogRmFjaWxpdGF0ZXMgbG9jYXRpbmcgUHl0aG9uIGludGVycHJldGVycy5cbiAqL1xubGV0IFB5dGhvbkludGVycHJldGVyTG9jYXRvclNlcnZpY2UgPSBjbGFzcyBQeXRob25JbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlQ29udGFpbmVyKSB7XG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMgPSBbXTtcbiAgICAgICAgc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JRGlzcG9zYWJsZVJlZ2lzdHJ5KS5wdXNoKHRoaXMpO1xuICAgICAgICB0aGlzLnBsYXRmb3JtID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JUGxhdGZvcm1TZXJ2aWNlKTtcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlckxvY2F0b3JIZWxwZXIgPSBzZXJ2aWNlQ29udGFpbmVyLmdldChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJMb2NhdG9ySGVscGVyKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhpcyBjbGFzcyBzaG91bGQgbmV2ZXIgZW1pdCBldmVudHMgd2hlbiB3ZSdyZSBsb2NhdGluZy5cbiAgICAgKiBUaGUgZXZlbnRzIHdpbGwgYmUgZmlyZWQgYnkgdGhlIGluZGl2aXR1YWwgbG9jYXRvcnMgcmV0cmlldmVkIGluIGBnZXRMb2NhdG9yc2AuXG4gICAgICpcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAdHlwZSB7RXZlbnQ8UHJvbWlzZTxQeXRob25JbnRlcnByZXRlcltdPj59XG4gICAgICogQG1lbWJlcm9mIFB5dGhvbkludGVycHJldGVyTG9jYXRvclNlcnZpY2VcbiAgICAgKi9cbiAgICBnZXQgb25Mb2NhdGluZygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB2c2NvZGVfMS5FdmVudEVtaXR0ZXIoKS5ldmVudDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVsZWFzZSBhbnkgaGVsZCByZXNvdXJjZXMuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgYnkgVlMgQ29kZSB0byBpbmRpY2F0ZSBpdCBpcyBkb25lIHdpdGggdGhlIHJlc291cmNlLlxuICAgICAqL1xuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMuZm9yRWFjaChkaXNwb3NhYmxlID0+IGRpc3Bvc2FibGUuZGlzcG9zZSgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBsaXN0IG9mIGtub3duIFB5dGhvbiBpbnRlcnByZXRlcnMuXG4gICAgICpcbiAgICAgKiBUaGUgb3B0aW9uYWwgcmVzb3VyY2UgYXJnIG1heSBjb250cm9sIHdoZXJlIGxvY2F0b3JzIGxvb2sgZm9yXG4gICAgICogaW50ZXJwcmV0ZXJzLlxuICAgICAqL1xuICAgIGdldEludGVycHJldGVycyhyZXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgbG9jYXRvcnMgPSB0aGlzLmdldExvY2F0b3JzKCk7XG4gICAgICAgICAgICBjb25zdCBwcm9taXNlcyA9IGxvY2F0b3JzLm1hcCgocHJvdmlkZXIpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHsgcmV0dXJuIHByb3ZpZGVyLmdldEludGVycHJldGVycyhyZXNvdXJjZSk7IH0pKTtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RPZkludGVycHJldGVycyA9IHlpZWxkIFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gXy5mbGF0dGVuKGxpc3RPZkludGVycHJldGVycylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGl0ZW0gPT4gISFpdGVtKVxuICAgICAgICAgICAgICAgIC5tYXAoaXRlbSA9PiBpdGVtKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmludGVycHJldGVyTG9jYXRvckhlbHBlci5tZXJnZUludGVycHJldGVycyhpdGVtcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGxpc3Qgb2YgYXBwbGljYWJsZSBpbnRlcnByZXRlciBsb2NhdG9ycy5cbiAgICAgKlxuICAgICAqIFRoZSBsb2NhdG9ycyBhcmUgcHVsbGVkIGZyb20gdGhlIHJlZ2lzdHJ5LlxuICAgICAqL1xuICAgIGdldExvY2F0b3JzKCkge1xuICAgICAgICAvLyBUaGUgb3JkZXIgb2YgdGhlIHNlcnZpY2VzIGlzIGltcG9ydGFudC5cbiAgICAgICAgLy8gVGhlIG9yZGVyIGlzIGltcG9ydGFudCBiZWNhdXNlIHRoZSBkYXRhIHNvdXJjZXMgYXQgdGhlIGJvdHRvbSBvZiB0aGUgbGlzdCBkbyBub3QgY29udGFpbiBhbGwsXG4gICAgICAgIC8vICB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGludGVycHJldGVycyAoZS5nLiB0eXBlLCBlbnZpcm9ubWVudCBuYW1lLCBldGMpLlxuICAgICAgICAvLyBUaGlzIHdheSwgdGhlIGl0ZW1zIHJldHVybmVkIGZyb20gdGhlIHRvcCBvZiB0aGUgbGlzdCB3aWxsIHdpbiwgd2hlbiB3ZSBjb21iaW5lIHRoZSBpdGVtcyByZXR1cm5lZC5cbiAgICAgICAgY29uc3Qga2V5cyA9IFtcbiAgICAgICAgICAgIFtjb250cmFjdHNfMS5XSU5ET1dTX1JFR0lTVFJZX1NFUlZJQ0UsICd3aW4nXSxcbiAgICAgICAgICAgIFtjb250cmFjdHNfMS5DT05EQV9FTlZfU0VSVklDRSwgJyddLFxuICAgICAgICAgICAgW2NvbnRyYWN0c18xLkNPTkRBX0VOVl9GSUxFX1NFUlZJQ0UsICcnXSxcbiAgICAgICAgICAgIFtjb250cmFjdHNfMS5QSVBFTlZfU0VSVklDRSwgJyddLFxuICAgICAgICAgICAgW2NvbnRyYWN0c18xLkdMT0JBTF9WSVJUVUFMX0VOVl9TRVJWSUNFLCAnJ10sXG4gICAgICAgICAgICBbY29udHJhY3RzXzEuV09SS1NQQUNFX1ZJUlRVQUxfRU5WX1NFUlZJQ0UsICcnXSxcbiAgICAgICAgICAgIFtjb250cmFjdHNfMS5LTk9XTl9QQVRIX1NFUlZJQ0UsICcnXSxcbiAgICAgICAgICAgIFtjb250cmFjdHNfMS5DVVJSRU5UX1BBVEhfU0VSVklDRSwgJyddXG4gICAgICAgIF07XG4gICAgICAgIHJldHVybiBnZXRMb2NhdG9ycyhrZXlzLCB0aGlzLnBsYXRmb3JtLCAoa2V5KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJMb2NhdG9yU2VydmljZSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblB5dGhvbkludGVycHJldGVyTG9jYXRvclNlcnZpY2UgPSBfX2RlY29yYXRlKFtcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXG4gICAgX19wYXJhbSgwLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMy5JU2VydmljZUNvbnRhaW5lcikpXG5dLCBQeXRob25JbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlKTtcbmV4cG9ydHMuUHl0aG9uSW50ZXJwcmV0ZXJMb2NhdG9yU2VydmljZSA9IFB5dGhvbkludGVycHJldGVyTG9jYXRvclNlcnZpY2U7XG5mdW5jdGlvbiBnZXRMb2NhdG9ycyhrZXlzLCBwbGF0Zm9ybSwgZ2V0U2VydmljZSkge1xuICAgIGNvbnN0IGxvY2F0b3JzID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCBwbGF0Zm9ybU5hbWVdIG9mIGtleXMpIHtcbiAgICAgICAgaWYgKCFwbGF0Zm9ybS5pbmZvLm1hdGNoUGxhdGZvcm0ocGxhdGZvcm1OYW1lKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbG9jYXRvciA9IGdldFNlcnZpY2Uoa2V5KTtcbiAgICAgICAgbG9jYXRvcnMucHVzaChsb2NhdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvY2F0b3JzO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIl19