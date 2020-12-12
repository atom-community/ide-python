"use strict"; // tslint:disable:max-classes-per-file max-classes-per-file

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

const os = require("os");

require("../../common/extensions");

const types_1 = require("../../ioc/types");

const types_2 = require("../../linters/types");

const types_3 = require("../application/types");

const constants_1 = require("../constants");

const types_4 = require("../platform/types");

const types_5 = require("../process/types");

const types_6 = require("../terminal/types");

const types_7 = require("../types");

const productNames_1 = require("./productNames");

const types_8 = require("./types");

var types_9 = require("../types");

exports.Product = types_9.Product;
const CTagsInsllationScript = os.platform() === 'darwin' ? 'brew install ctags' : 'sudo apt-get install exuberant-ctags';

class BaseInstaller {
  constructor(serviceContainer, outputChannel) {
    this.serviceContainer = serviceContainer;
    this.outputChannel = outputChannel;
    this.appShell = serviceContainer.get(types_3.IApplicationShell);
    this.configService = serviceContainer.get(types_7.IConfigurationService);
    this.workspaceService = serviceContainer.get(types_3.IWorkspaceService);
    this.productService = serviceContainer.get(types_8.IProductService);
  }

  promptToInstall(product, resource) {
    // If this method gets called twice, while previous promise has not been resolved, then return that same promise.
    // E.g. previous promise is not resolved as a message has been displayed to the user, so no point displaying
    // another message.
    const workspaceFolder = resource ? this.workspaceService.getWorkspaceFolder(resource) : undefined;
    const key = `${product}${workspaceFolder ? workspaceFolder.uri.fsPath : ''}`;

    if (BaseInstaller.PromptPromises.has(key)) {
      return BaseInstaller.PromptPromises.get(key);
    }

    const promise = this.promptToInstallImplementation(product, resource);
    BaseInstaller.PromptPromises.set(key, promise);
    promise.then(() => BaseInstaller.PromptPromises.delete(key)).ignoreErrors();
    promise.catch(() => BaseInstaller.PromptPromises.delete(key)).ignoreErrors();
    return promise;
  }

  install(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      if (product === types_7.Product.unittest) {
        return types_7.InstallerResponse.Installed;
      }

      const channels = this.serviceContainer.get(types_8.IInstallationChannelManager);
      const installer = yield channels.getInstallationChannel(product, resource);

      if (!installer) {
        return types_7.InstallerResponse.Ignore;
      }

      const moduleName = translateProductToModule(product, types_7.ModuleNamePurpose.install);
      const logger = this.serviceContainer.get(types_7.ILogger);
      yield installer.installModule(moduleName, resource).catch(logger.logError.bind(logger, `Error in installing the module '${moduleName}'`));
      return this.isInstalled(product, resource).then(isInstalled => isInstalled ? types_7.InstallerResponse.Installed : types_7.InstallerResponse.Ignore);
    });
  }

  isInstalled(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      if (product === types_7.Product.unittest) {
        return true;
      } // User may have customized the module name or provided the fully qualified path.


      const executableName = this.getExecutableNameFromSettings(product, resource);
      const isModule = this.isExecutableAModule(product, resource);

      if (isModule) {
        const pythonProcess = yield this.serviceContainer.get(types_5.IPythonExecutionFactory).create({
          resource
        });
        return pythonProcess.isModuleInstalled(executableName);
      } else {
        const process = yield this.serviceContainer.get(types_5.IProcessServiceFactory).create(resource);
        return process.exec(executableName, ['--version'], {
          mergeStdOutErr: true
        }).then(() => true).catch(() => false);
      }
    });
  }

  getExecutableNameFromSettings(product, resource) {
    const productType = this.productService.getProductType(product);
    const productPathService = this.serviceContainer.get(types_8.IProductPathService, productType);
    return productPathService.getExecutableNameFromSettings(product, resource);
  }

  isExecutableAModule(product, resource) {
    const productType = this.productService.getProductType(product);
    const productPathService = this.serviceContainer.get(types_8.IProductPathService, productType);
    return productPathService.isExecutableAModule(product, resource);
  }

}

BaseInstaller.PromptPromises = new Map();
exports.BaseInstaller = BaseInstaller;

class CTagsInstaller extends BaseInstaller {
  constructor(serviceContainer, outputChannel) {
    super(serviceContainer, outputChannel);
  }

  install(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.serviceContainer.get(types_4.IPlatformService).isWindows) {
        this.outputChannel.appendLine('Install Universal Ctags Win32 to enable support for Workspace Symbols');
        this.outputChannel.appendLine('Download the CTags binary from the Universal CTags site.');
        this.outputChannel.appendLine('Option 1: Extract ctags.exe from the downloaded zip to any folder within your PATH so that Visual Studio Code can run it.');
        this.outputChannel.appendLine('Option 2: Extract to any folder and add the path to this folder to the command setting.');
        this.outputChannel.appendLine('Option 3: Extract to any folder and define that path in the python.workspaceSymbols.ctagsPath setting of your user settings file (settings.json).');
        this.outputChannel.show();
      } else {
        const terminalService = this.serviceContainer.get(types_6.ITerminalServiceFactory).getTerminalService(resource);
        const logger = this.serviceContainer.get(types_7.ILogger);
        terminalService.sendCommand(CTagsInsllationScript, []).catch(logger.logError.bind(logger, `Failed to install ctags. Script sent '${CTagsInsllationScript}'.`));
      }

      return types_7.InstallerResponse.Ignore;
    });
  }

  promptToInstallImplementation(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const item = yield this.appShell.showErrorMessage('Install CTags to enable Python workspace symbols?', 'Yes', 'No');
      return item === 'Yes' ? this.install(product, resource) : types_7.InstallerResponse.Ignore;
    });
  }

}

exports.CTagsInstaller = CTagsInstaller;

class FormatterInstaller extends BaseInstaller {
  promptToInstallImplementation(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      // Hard-coded on purpose because the UI won't necessarily work having
      // another formatter.
      const formatters = [types_7.Product.autopep8, types_7.Product.black, types_7.Product.yapf];
      const formatterNames = formatters.map(formatter => productNames_1.ProductNames.get(formatter));
      const productName = productNames_1.ProductNames.get(product);
      formatterNames.splice(formatterNames.indexOf(productName), 1);
      const useOptions = formatterNames.map(name => `Use ${name}`);
      const yesChoice = 'Yes';
      const options = [...useOptions];
      let message = `Formatter ${productName} is not installed. Install?`;

      if (this.isExecutableAModule(product, resource)) {
        options.splice(0, 0, yesChoice);
      } else {
        const executable = this.getExecutableNameFromSettings(product, resource);
        message = `Path to the ${productName} formatter is invalid (${executable})`;
      }

      const item = yield this.appShell.showErrorMessage(message, ...options);

      if (item === yesChoice) {
        return this.install(product, resource);
      } else if (typeof item === 'string') {
        for (const formatter of formatters) {
          const formatterName = productNames_1.ProductNames.get(formatter);

          if (item.endsWith(formatterName)) {
            yield this.configService.updateSetting('formatting.provider', formatterName, resource);
            return this.install(formatter, resource);
          }
        }
      }

      return types_7.InstallerResponse.Ignore;
    });
  }

}

exports.FormatterInstaller = FormatterInstaller;

class LinterInstaller extends BaseInstaller {
  promptToInstallImplementation(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const productName = productNames_1.ProductNames.get(product);
      const install = 'Install';
      const disableAllLinting = 'Disable linting';
      const disableThisLinter = `Disable ${productName}`;
      const options = [disableThisLinter, disableAllLinting];
      let message = `Linter ${productName} is not installed.`;

      if (this.isExecutableAModule(product, resource)) {
        options.splice(0, 0, install);
      } else {
        const executable = this.getExecutableNameFromSettings(product, resource);
        message = `Path to the ${productName} linter is invalid (${executable})`;
      }

      const response = yield this.appShell.showErrorMessage(message, ...options);

      if (response === install) {
        return this.install(product, resource);
      }

      const lm = this.serviceContainer.get(types_2.ILinterManager);

      if (response === disableAllLinting) {
        yield lm.enableLintingAsync(false);
        return types_7.InstallerResponse.Disabled;
      } else if (response === disableThisLinter) {
        yield lm.getLinterInfo(product).enableAsync(false);
        return types_7.InstallerResponse.Disabled;
      }

      return types_7.InstallerResponse.Ignore;
    });
  }

}

exports.LinterInstaller = LinterInstaller;

class TestFrameworkInstaller extends BaseInstaller {
  promptToInstallImplementation(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const productName = productNames_1.ProductNames.get(product);
      const options = [];
      let message = `Test framework ${productName} is not installed. Install?`;

      if (this.isExecutableAModule(product, resource)) {
        options.push(...['Yes', 'No']);
      } else {
        const executable = this.getExecutableNameFromSettings(product, resource);
        message = `Path to the ${productName} test framework is invalid (${executable})`;
      }

      const item = yield this.appShell.showErrorMessage(message, ...options);
      return item === 'Yes' ? this.install(product, resource) : types_7.InstallerResponse.Ignore;
    });
  }

}

exports.TestFrameworkInstaller = TestFrameworkInstaller;

class RefactoringLibraryInstaller extends BaseInstaller {
  promptToInstallImplementation(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      const productName = productNames_1.ProductNames.get(product);
      const item = yield this.appShell.showErrorMessage(`Refactoring library ${productName} is not installed. Install?`, 'Yes', 'No');
      return item === 'Yes' ? this.install(product, resource) : types_7.InstallerResponse.Ignore;
    });
  }

}

exports.RefactoringLibraryInstaller = RefactoringLibraryInstaller;
let ProductInstaller = class ProductInstaller {
  constructor(serviceContainer, outputChannel) {
    this.serviceContainer = serviceContainer;
    this.outputChannel = outputChannel;
    this.productService = serviceContainer.get(types_8.IProductService);
  } // tslint:disable-next-line:no-empty


  dispose() {}

  promptToInstall(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      return this.createInstaller(product).promptToInstall(product, resource);
    });
  }

  install(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      return this.createInstaller(product).install(product, resource);
    });
  }

  isInstalled(product, resource) {
    return __awaiter(this, void 0, void 0, function* () {
      return this.createInstaller(product).isInstalled(product, resource);
    });
  }

  translateProductToModuleName(product, purpose) {
    return translateProductToModule(product, purpose);
  }

  createInstaller(product) {
    const productType = this.productService.getProductType(product);

    switch (productType) {
      case types_7.ProductType.Formatter:
        return new FormatterInstaller(this.serviceContainer, this.outputChannel);

      case types_7.ProductType.Linter:
        return new LinterInstaller(this.serviceContainer, this.outputChannel);

      case types_7.ProductType.WorkspaceSymbols:
        return new CTagsInstaller(this.serviceContainer, this.outputChannel);

      case types_7.ProductType.TestFramework:
        return new TestFrameworkInstaller(this.serviceContainer, this.outputChannel);

      case types_7.ProductType.RefactoringLibrary:
        return new RefactoringLibraryInstaller(this.serviceContainer, this.outputChannel);

      default:
        break;
    }

    throw new Error(`Unknown product ${product}`);
  }

};
ProductInstaller = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_1.IServiceContainer)), __param(1, inversify_1.inject(types_7.IOutputChannel)), __param(1, inversify_1.named(constants_1.STANDARD_OUTPUT_CHANNEL))], ProductInstaller);
exports.ProductInstaller = ProductInstaller;

function translateProductToModule(product, purpose) {
  switch (product) {
    case types_7.Product.mypy:
      return 'mypy';

    case types_7.Product.nosetest:
      {
        return purpose === types_7.ModuleNamePurpose.install ? 'nose' : 'nosetests';
      }

    case types_7.Product.pylama:
      return 'pylama';

    case types_7.Product.prospector:
      return 'prospector';

    case types_7.Product.pylint:
      return 'pylint';

    case types_7.Product.pytest:
      return 'pytest';

    case types_7.Product.autopep8:
      return 'autopep8';

    case types_7.Product.black:
      return 'black';

    case types_7.Product.pep8:
      return 'pep8';

    case types_7.Product.pydocstyle:
      return 'pydocstyle';

    case types_7.Product.yapf:
      return 'yapf';

    case types_7.Product.flake8:
      return 'flake8';

    case types_7.Product.unittest:
      return 'unittest';

    case types_7.Product.rope:
      return 'rope';

    case types_7.Product.bandit:
      return 'bandit';

    default:
      {
        throw new Error(`Product ${product} cannot be installed as a Python Module.`);
      }
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByb2R1Y3RJbnN0YWxsZXIuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImludmVyc2lmeV8xIiwicmVxdWlyZSIsIm9zIiwidHlwZXNfMSIsInR5cGVzXzIiLCJ0eXBlc18zIiwiY29uc3RhbnRzXzEiLCJ0eXBlc180IiwidHlwZXNfNSIsInR5cGVzXzYiLCJ0eXBlc183IiwicHJvZHVjdE5hbWVzXzEiLCJ0eXBlc184IiwidHlwZXNfOSIsIlByb2R1Y3QiLCJDVGFnc0luc2xsYXRpb25TY3JpcHQiLCJwbGF0Zm9ybSIsIkJhc2VJbnN0YWxsZXIiLCJjb25zdHJ1Y3RvciIsInNlcnZpY2VDb250YWluZXIiLCJvdXRwdXRDaGFubmVsIiwiYXBwU2hlbGwiLCJnZXQiLCJJQXBwbGljYXRpb25TaGVsbCIsImNvbmZpZ1NlcnZpY2UiLCJJQ29uZmlndXJhdGlvblNlcnZpY2UiLCJ3b3Jrc3BhY2VTZXJ2aWNlIiwiSVdvcmtzcGFjZVNlcnZpY2UiLCJwcm9kdWN0U2VydmljZSIsIklQcm9kdWN0U2VydmljZSIsInByb21wdFRvSW5zdGFsbCIsInByb2R1Y3QiLCJyZXNvdXJjZSIsIndvcmtzcGFjZUZvbGRlciIsImdldFdvcmtzcGFjZUZvbGRlciIsInVuZGVmaW5lZCIsInVyaSIsImZzUGF0aCIsIlByb21wdFByb21pc2VzIiwiaGFzIiwicHJvbWlzZSIsInByb21wdFRvSW5zdGFsbEltcGxlbWVudGF0aW9uIiwic2V0IiwiZGVsZXRlIiwiaWdub3JlRXJyb3JzIiwiY2F0Y2giLCJpbnN0YWxsIiwidW5pdHRlc3QiLCJJbnN0YWxsZXJSZXNwb25zZSIsIkluc3RhbGxlZCIsImNoYW5uZWxzIiwiSUluc3RhbGxhdGlvbkNoYW5uZWxNYW5hZ2VyIiwiaW5zdGFsbGVyIiwiZ2V0SW5zdGFsbGF0aW9uQ2hhbm5lbCIsIklnbm9yZSIsIm1vZHVsZU5hbWUiLCJ0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGUiLCJNb2R1bGVOYW1lUHVycG9zZSIsImxvZ2dlciIsIklMb2dnZXIiLCJpbnN0YWxsTW9kdWxlIiwibG9nRXJyb3IiLCJiaW5kIiwiaXNJbnN0YWxsZWQiLCJleGVjdXRhYmxlTmFtZSIsImdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzIiwiaXNNb2R1bGUiLCJpc0V4ZWN1dGFibGVBTW9kdWxlIiwicHl0aG9uUHJvY2VzcyIsIklQeXRob25FeGVjdXRpb25GYWN0b3J5IiwiY3JlYXRlIiwiaXNNb2R1bGVJbnN0YWxsZWQiLCJwcm9jZXNzIiwiSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSIsImV4ZWMiLCJtZXJnZVN0ZE91dEVyciIsInByb2R1Y3RUeXBlIiwiZ2V0UHJvZHVjdFR5cGUiLCJwcm9kdWN0UGF0aFNlcnZpY2UiLCJJUHJvZHVjdFBhdGhTZXJ2aWNlIiwiTWFwIiwiQ1RhZ3NJbnN0YWxsZXIiLCJJUGxhdGZvcm1TZXJ2aWNlIiwiaXNXaW5kb3dzIiwiYXBwZW5kTGluZSIsInNob3ciLCJ0ZXJtaW5hbFNlcnZpY2UiLCJJVGVybWluYWxTZXJ2aWNlRmFjdG9yeSIsImdldFRlcm1pbmFsU2VydmljZSIsInNlbmRDb21tYW5kIiwiaXRlbSIsInNob3dFcnJvck1lc3NhZ2UiLCJGb3JtYXR0ZXJJbnN0YWxsZXIiLCJmb3JtYXR0ZXJzIiwiYXV0b3BlcDgiLCJibGFjayIsInlhcGYiLCJmb3JtYXR0ZXJOYW1lcyIsIm1hcCIsImZvcm1hdHRlciIsIlByb2R1Y3ROYW1lcyIsInByb2R1Y3ROYW1lIiwic3BsaWNlIiwiaW5kZXhPZiIsInVzZU9wdGlvbnMiLCJuYW1lIiwieWVzQ2hvaWNlIiwib3B0aW9ucyIsIm1lc3NhZ2UiLCJleGVjdXRhYmxlIiwiZm9ybWF0dGVyTmFtZSIsImVuZHNXaXRoIiwidXBkYXRlU2V0dGluZyIsIkxpbnRlckluc3RhbGxlciIsImRpc2FibGVBbGxMaW50aW5nIiwiZGlzYWJsZVRoaXNMaW50ZXIiLCJyZXNwb25zZSIsImxtIiwiSUxpbnRlck1hbmFnZXIiLCJlbmFibGVMaW50aW5nQXN5bmMiLCJEaXNhYmxlZCIsImdldExpbnRlckluZm8iLCJlbmFibGVBc3luYyIsIlRlc3RGcmFtZXdvcmtJbnN0YWxsZXIiLCJwdXNoIiwiUmVmYWN0b3JpbmdMaWJyYXJ5SW5zdGFsbGVyIiwiUHJvZHVjdEluc3RhbGxlciIsImRpc3Bvc2UiLCJjcmVhdGVJbnN0YWxsZXIiLCJ0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGVOYW1lIiwicHVycG9zZSIsIlByb2R1Y3RUeXBlIiwiRm9ybWF0dGVyIiwiTGludGVyIiwiV29ya3NwYWNlU3ltYm9scyIsIlRlc3RGcmFtZXdvcmsiLCJSZWZhY3RvcmluZ0xpYnJhcnkiLCJFcnJvciIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciIsIklPdXRwdXRDaGFubmVsIiwibmFtZWQiLCJTVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCIsIm15cHkiLCJub3NldGVzdCIsInB5bGFtYSIsInByb3NwZWN0b3IiLCJweWxpbnQiLCJweXRlc3QiLCJwZXA4IiwicHlkb2NzdHlsZSIsImZsYWtlOCIsInJvcGUiLCJiYW5kaXQiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTs7QUFDQSxJQUFJQSxVQUFVLEdBQUksVUFBUSxTQUFLQSxVQUFkLElBQTZCLFVBQVVDLFVBQVYs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QzNCLFNBQUt0RixPQUFPLENBQUNJLE9BQVIsQ0FBZ0IwSSxNQUFyQjtBQUE2QixhQUFPLFFBQVA7O0FBQzdCLFNBQUs5SSxPQUFPLENBQUNJLE9BQVIsQ0FBZ0JpQyxRQUFyQjtBQUErQixhQUFPLFVBQVA7O0FBQy9CLFNBQUtyQyxPQUFPLENBQUNJLE9BQVIsQ0FBZ0IySSxJQUFyQjtBQUEyQixhQUFPLE1BQVA7O0FBQzNCLFNBQUsvSSxPQUFPLENBQUNJLE9BQVIsQ0FBZ0I0SSxNQUFyQjtBQUE2QixhQUFPLFFBQVA7O0FBQzdCO0FBQVM7QUFDTCxjQUFNLElBQUlqQixLQUFKLENBQVcsV0FBVTFHLE9BQVEsMENBQTdCLENBQU47QUFDSDtBQXBCTDtBQXNCSCIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG4vLyB0c2xpbnQ6ZGlzYWJsZTptYXgtY2xhc3Nlcy1wZXItZmlsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZVxyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn07XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xyXG5jb25zdCBvcyA9IHJlcXVpcmUoXCJvc1wiKTtcclxucmVxdWlyZShcIi4uLy4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uL2lvYy90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi8uLi9saW50ZXJzL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uL2FwcGxpY2F0aW9uL3R5cGVzXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi4vcGxhdGZvcm0vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzUgPSByZXF1aXJlKFwiLi4vcHJvY2Vzcy90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfNiA9IHJlcXVpcmUoXCIuLi90ZXJtaW5hbC90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfNyA9IHJlcXVpcmUoXCIuLi90eXBlc1wiKTtcclxuY29uc3QgcHJvZHVjdE5hbWVzXzEgPSByZXF1aXJlKFwiLi9wcm9kdWN0TmFtZXNcIik7XHJcbmNvbnN0IHR5cGVzXzggPSByZXF1aXJlKFwiLi90eXBlc1wiKTtcclxudmFyIHR5cGVzXzkgPSByZXF1aXJlKFwiLi4vdHlwZXNcIik7XHJcbmV4cG9ydHMuUHJvZHVjdCA9IHR5cGVzXzkuUHJvZHVjdDtcclxuY29uc3QgQ1RhZ3NJbnNsbGF0aW9uU2NyaXB0ID0gb3MucGxhdGZvcm0oKSA9PT0gJ2RhcndpbicgPyAnYnJldyBpbnN0YWxsIGN0YWdzJyA6ICdzdWRvIGFwdC1nZXQgaW5zdGFsbCBleHViZXJhbnQtY3RhZ3MnO1xyXG5jbGFzcyBCYXNlSW5zdGFsbGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VDb250YWluZXIsIG91dHB1dENoYW5uZWwpIHtcclxuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIgPSBzZXJ2aWNlQ29udGFpbmVyO1xyXG4gICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbCA9IG91dHB1dENoYW5uZWw7XHJcbiAgICAgICAgdGhpcy5hcHBTaGVsbCA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSUFwcGxpY2F0aW9uU2hlbGwpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnU2VydmljZSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzcuSUNvbmZpZ3VyYXRpb25TZXJ2aWNlKTtcclxuICAgICAgICB0aGlzLndvcmtzcGFjZVNlcnZpY2UgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklXb3Jrc3BhY2VTZXJ2aWNlKTtcclxuICAgICAgICB0aGlzLnByb2R1Y3RTZXJ2aWNlID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfOC5JUHJvZHVjdFNlcnZpY2UpO1xyXG4gICAgfVxyXG4gICAgcHJvbXB0VG9JbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKSB7XHJcbiAgICAgICAgLy8gSWYgdGhpcyBtZXRob2QgZ2V0cyBjYWxsZWQgdHdpY2UsIHdoaWxlIHByZXZpb3VzIHByb21pc2UgaGFzIG5vdCBiZWVuIHJlc29sdmVkLCB0aGVuIHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS5cclxuICAgICAgICAvLyBFLmcuIHByZXZpb3VzIHByb21pc2UgaXMgbm90IHJlc29sdmVkIGFzIGEgbWVzc2FnZSBoYXMgYmVlbiBkaXNwbGF5ZWQgdG8gdGhlIHVzZXIsIHNvIG5vIHBvaW50IGRpc3BsYXlpbmdcclxuICAgICAgICAvLyBhbm90aGVyIG1lc3NhZ2UuXHJcbiAgICAgICAgY29uc3Qgd29ya3NwYWNlRm9sZGVyID0gcmVzb3VyY2UgPyB0aGlzLndvcmtzcGFjZVNlcnZpY2UuZ2V0V29ya3NwYWNlRm9sZGVyKHJlc291cmNlKSA6IHVuZGVmaW5lZDtcclxuICAgICAgICBjb25zdCBrZXkgPSBgJHtwcm9kdWN0fSR7d29ya3NwYWNlRm9sZGVyID8gd29ya3NwYWNlRm9sZGVyLnVyaS5mc1BhdGggOiAnJ31gO1xyXG4gICAgICAgIGlmIChCYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzLmhhcyhrZXkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBCYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzLmdldChrZXkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBwcm9taXNlID0gdGhpcy5wcm9tcHRUb0luc3RhbGxJbXBsZW1lbnRhdGlvbihwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICAgICAgQmFzZUluc3RhbGxlci5Qcm9tcHRQcm9taXNlcy5zZXQoa2V5LCBwcm9taXNlKTtcclxuICAgICAgICBwcm9taXNlLnRoZW4oKCkgPT4gQmFzZUluc3RhbGxlci5Qcm9tcHRQcm9taXNlcy5kZWxldGUoa2V5KSkuaWdub3JlRXJyb3JzKCk7XHJcbiAgICAgICAgcHJvbWlzZS5jYXRjaCgoKSA9PiBCYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzLmRlbGV0ZShrZXkpKS5pZ25vcmVFcnJvcnMoKTtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgIH1cclxuICAgIGluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBpZiAocHJvZHVjdCA9PT0gdHlwZXNfNy5Qcm9kdWN0LnVuaXR0ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JbnN0YWxsZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgY2hhbm5lbHMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzguSUluc3RhbGxhdGlvbkNoYW5uZWxNYW5hZ2VyKTtcclxuICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVyID0geWllbGQgY2hhbm5lbHMuZ2V0SW5zdGFsbGF0aW9uQ2hhbm5lbChwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIGlmICghaW5zdGFsbGVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JZ25vcmU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHRyYW5zbGF0ZVByb2R1Y3RUb01vZHVsZShwcm9kdWN0LCB0eXBlc183Lk1vZHVsZU5hbWVQdXJwb3NlLmluc3RhbGwpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzcuSUxvZ2dlcik7XHJcbiAgICAgICAgICAgIHlpZWxkIGluc3RhbGxlci5pbnN0YWxsTW9kdWxlKG1vZHVsZU5hbWUsIHJlc291cmNlKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGxvZ2dlci5sb2dFcnJvci5iaW5kKGxvZ2dlciwgYEVycm9yIGluIGluc3RhbGxpbmcgdGhlIG1vZHVsZSAnJHttb2R1bGVOYW1lfSdgKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzSW5zdGFsbGVkKHByb2R1Y3QsIHJlc291cmNlKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oaXNJbnN0YWxsZWQgPT4gaXNJbnN0YWxsZWQgPyB0eXBlc183Lkluc3RhbGxlclJlc3BvbnNlLkluc3RhbGxlZCA6IHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGlzSW5zdGFsbGVkKHByb2R1Y3QsIHJlc291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgaWYgKHByb2R1Y3QgPT09IHR5cGVzXzcuUHJvZHVjdC51bml0dGVzdCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gVXNlciBtYXkgaGF2ZSBjdXN0b21pemVkIHRoZSBtb2R1bGUgbmFtZSBvciBwcm92aWRlZCB0aGUgZnVsbHkgcXVhbGlmaWVkIHBhdGguXHJcbiAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGFibGVOYW1lID0gdGhpcy5nZXRFeGVjdXRhYmxlTmFtZUZyb21TZXR0aW5ncyhwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzTW9kdWxlID0gdGhpcy5pc0V4ZWN1dGFibGVBTW9kdWxlKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgaWYgKGlzTW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBweXRob25Qcm9jZXNzID0geWllbGQgdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc181LklQeXRob25FeGVjdXRpb25GYWN0b3J5KS5jcmVhdGUoeyByZXNvdXJjZSB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBweXRob25Qcm9jZXNzLmlzTW9kdWxlSW5zdGFsbGVkKGV4ZWN1dGFibGVOYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3MgPSB5aWVsZCB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzUuSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSkuY3JlYXRlKHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9jZXNzLmV4ZWMoZXhlY3V0YWJsZU5hbWUsIFsnLS12ZXJzaW9uJ10sIHsgbWVyZ2VTdGRPdXRFcnI6IHRydWUgfSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiBmYWxzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzKHByb2R1Y3QsIHJlc291cmNlKSB7XHJcbiAgICAgICAgY29uc3QgcHJvZHVjdFR5cGUgPSB0aGlzLnByb2R1Y3RTZXJ2aWNlLmdldFByb2R1Y3RUeXBlKHByb2R1Y3QpO1xyXG4gICAgICAgIGNvbnN0IHByb2R1Y3RQYXRoU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfOC5JUHJvZHVjdFBhdGhTZXJ2aWNlLCBwcm9kdWN0VHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIHByb2R1Y3RQYXRoU2VydmljZS5nZXRFeGVjdXRhYmxlTmFtZUZyb21TZXR0aW5ncyhwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICB9XHJcbiAgICBpc0V4ZWN1dGFibGVBTW9kdWxlKHByb2R1Y3QsIHJlc291cmNlKSB7XHJcbiAgICAgICAgY29uc3QgcHJvZHVjdFR5cGUgPSB0aGlzLnByb2R1Y3RTZXJ2aWNlLmdldFByb2R1Y3RUeXBlKHByb2R1Y3QpO1xyXG4gICAgICAgIGNvbnN0IHByb2R1Y3RQYXRoU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfOC5JUHJvZHVjdFBhdGhTZXJ2aWNlLCBwcm9kdWN0VHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIHByb2R1Y3RQYXRoU2VydmljZS5pc0V4ZWN1dGFibGVBTW9kdWxlKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgIH1cclxufVxyXG5CYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzID0gbmV3IE1hcCgpO1xyXG5leHBvcnRzLkJhc2VJbnN0YWxsZXIgPSBCYXNlSW5zdGFsbGVyO1xyXG5jbGFzcyBDVGFnc0luc3RhbGxlciBleHRlbmRzIEJhc2VJbnN0YWxsZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lciwgb3V0cHV0Q2hhbm5lbCkge1xyXG4gICAgICAgIHN1cGVyKHNlcnZpY2VDb250YWluZXIsIG91dHB1dENoYW5uZWwpO1xyXG4gICAgfVxyXG4gICAgaW5zdGFsbChwcm9kdWN0LCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzQuSVBsYXRmb3JtU2VydmljZSkuaXNXaW5kb3dzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dENoYW5uZWwuYXBwZW5kTGluZSgnSW5zdGFsbCBVbml2ZXJzYWwgQ3RhZ3MgV2luMzIgdG8gZW5hYmxlIHN1cHBvcnQgZm9yIFdvcmtzcGFjZSBTeW1ib2xzJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dENoYW5uZWwuYXBwZW5kTGluZSgnRG93bmxvYWQgdGhlIENUYWdzIGJpbmFyeSBmcm9tIHRoZSBVbml2ZXJzYWwgQ1RhZ3Mgc2l0ZS4nKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbC5hcHBlbmRMaW5lKCdPcHRpb24gMTogRXh0cmFjdCBjdGFncy5leGUgZnJvbSB0aGUgZG93bmxvYWRlZCB6aXAgdG8gYW55IGZvbGRlciB3aXRoaW4geW91ciBQQVRIIHNvIHRoYXQgVmlzdWFsIFN0dWRpbyBDb2RlIGNhbiBydW4gaXQuJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dENoYW5uZWwuYXBwZW5kTGluZSgnT3B0aW9uIDI6IEV4dHJhY3QgdG8gYW55IGZvbGRlciBhbmQgYWRkIHRoZSBwYXRoIHRvIHRoaXMgZm9sZGVyIHRvIHRoZSBjb21tYW5kIHNldHRpbmcuJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dENoYW5uZWwuYXBwZW5kTGluZSgnT3B0aW9uIDM6IEV4dHJhY3QgdG8gYW55IGZvbGRlciBhbmQgZGVmaW5lIHRoYXQgcGF0aCBpbiB0aGUgcHl0aG9uLndvcmtzcGFjZVN5bWJvbHMuY3RhZ3NQYXRoIHNldHRpbmcgb2YgeW91ciB1c2VyIHNldHRpbmdzIGZpbGUgKHNldHRpbmdzLmpzb24pLicpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vdXRwdXRDaGFubmVsLnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRlcm1pbmFsU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNi5JVGVybWluYWxTZXJ2aWNlRmFjdG9yeSkuZ2V0VGVybWluYWxTZXJ2aWNlKHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ2dlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNy5JTG9nZ2VyKTtcclxuICAgICAgICAgICAgICAgIHRlcm1pbmFsU2VydmljZS5zZW5kQ29tbWFuZChDVGFnc0luc2xsYXRpb25TY3JpcHQsIFtdKVxyXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChsb2dnZXIubG9nRXJyb3IuYmluZChsb2dnZXIsIGBGYWlsZWQgdG8gaW5zdGFsbCBjdGFncy4gU2NyaXB0IHNlbnQgJyR7Q1RhZ3NJbnNsbGF0aW9uU2NyaXB0fScuYCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlc183Lkluc3RhbGxlclJlc3BvbnNlLklnbm9yZTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHByb21wdFRvSW5zdGFsbEltcGxlbWVudGF0aW9uKHByb2R1Y3QsIHJlc291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHlpZWxkIHRoaXMuYXBwU2hlbGwuc2hvd0Vycm9yTWVzc2FnZSgnSW5zdGFsbCBDVGFncyB0byBlbmFibGUgUHl0aG9uIHdvcmtzcGFjZSBzeW1ib2xzPycsICdZZXMnLCAnTm8nKTtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0gPT09ICdZZXMnID8gdGhpcy5pbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKSA6IHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQ1RhZ3NJbnN0YWxsZXIgPSBDVGFnc0luc3RhbGxlcjtcclxuY2xhc3MgRm9ybWF0dGVySW5zdGFsbGVyIGV4dGVuZHMgQmFzZUluc3RhbGxlciB7XHJcbiAgICBwcm9tcHRUb0luc3RhbGxJbXBsZW1lbnRhdGlvbihwcm9kdWN0LCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIC8vIEhhcmQtY29kZWQgb24gcHVycG9zZSBiZWNhdXNlIHRoZSBVSSB3b24ndCBuZWNlc3NhcmlseSB3b3JrIGhhdmluZ1xyXG4gICAgICAgICAgICAvLyBhbm90aGVyIGZvcm1hdHRlci5cclxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVycyA9IFt0eXBlc183LlByb2R1Y3QuYXV0b3BlcDgsIHR5cGVzXzcuUHJvZHVjdC5ibGFjaywgdHlwZXNfNy5Qcm9kdWN0LnlhcGZdO1xyXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZXJOYW1lcyA9IGZvcm1hdHRlcnMubWFwKChmb3JtYXR0ZXIpID0+IHByb2R1Y3ROYW1lc18xLlByb2R1Y3ROYW1lcy5nZXQoZm9ybWF0dGVyKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2R1Y3ROYW1lID0gcHJvZHVjdE5hbWVzXzEuUHJvZHVjdE5hbWVzLmdldChwcm9kdWN0KTtcclxuICAgICAgICAgICAgZm9ybWF0dGVyTmFtZXMuc3BsaWNlKGZvcm1hdHRlck5hbWVzLmluZGV4T2YocHJvZHVjdE5hbWUpLCAxKTtcclxuICAgICAgICAgICAgY29uc3QgdXNlT3B0aW9ucyA9IGZvcm1hdHRlck5hbWVzLm1hcCgobmFtZSkgPT4gYFVzZSAke25hbWV9YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHllc0Nob2ljZSA9ICdZZXMnO1xyXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gWy4uLnVzZU9wdGlvbnNdO1xyXG4gICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGBGb3JtYXR0ZXIgJHtwcm9kdWN0TmFtZX0gaXMgbm90IGluc3RhbGxlZC4gSW5zdGFsbD9gO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0V4ZWN1dGFibGVBTW9kdWxlKHByb2R1Y3QsIHJlc291cmNlKSkge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zcGxpY2UoMCwgMCwgeWVzQ2hvaWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGFibGUgPSB0aGlzLmdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgUGF0aCB0byB0aGUgJHtwcm9kdWN0TmFtZX0gZm9ybWF0dGVyIGlzIGludmFsaWQgKCR7ZXhlY3V0YWJsZX0pYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0geWllbGQgdGhpcy5hcHBTaGVsbC5zaG93RXJyb3JNZXNzYWdlKG1lc3NhZ2UsIC4uLm9wdGlvbnMpO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0geWVzQ2hvaWNlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZm9ybWF0dGVyIG9mIGZvcm1hdHRlcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZXJOYW1lID0gcHJvZHVjdE5hbWVzXzEuUHJvZHVjdE5hbWVzLmdldChmb3JtYXR0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLmVuZHNXaXRoKGZvcm1hdHRlck5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMuY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKCdmb3JtYXR0aW5nLnByb3ZpZGVyJywgZm9ybWF0dGVyTmFtZSwgcmVzb3VyY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YWxsKGZvcm1hdHRlciwgcmVzb3VyY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JZ25vcmU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Gb3JtYXR0ZXJJbnN0YWxsZXIgPSBGb3JtYXR0ZXJJbnN0YWxsZXI7XHJcbmNsYXNzIExpbnRlckluc3RhbGxlciBleHRlbmRzIEJhc2VJbnN0YWxsZXIge1xyXG4gICAgcHJvbXB0VG9JbnN0YWxsSW1wbGVtZW50YXRpb24ocHJvZHVjdCwgcmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9kdWN0TmFtZSA9IHByb2R1Y3ROYW1lc18xLlByb2R1Y3ROYW1lcy5nZXQocHJvZHVjdCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbGwgPSAnSW5zdGFsbCc7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc2FibGVBbGxMaW50aW5nID0gJ0Rpc2FibGUgbGludGluZyc7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc2FibGVUaGlzTGludGVyID0gYERpc2FibGUgJHtwcm9kdWN0TmFtZX1gO1xyXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gW2Rpc2FibGVUaGlzTGludGVyLCBkaXNhYmxlQWxsTGludGluZ107XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlID0gYExpbnRlciAke3Byb2R1Y3ROYW1lfSBpcyBub3QgaW5zdGFsbGVkLmA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRXhlY3V0YWJsZUFNb2R1bGUocHJvZHVjdCwgcmVzb3VyY2UpKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLnNwbGljZSgwLCAwLCBpbnN0YWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGFibGUgPSB0aGlzLmdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgUGF0aCB0byB0aGUgJHtwcm9kdWN0TmFtZX0gbGludGVyIGlzIGludmFsaWQgKCR7ZXhlY3V0YWJsZX0pYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IHlpZWxkIHRoaXMuYXBwU2hlbGwuc2hvd0Vycm9yTWVzc2FnZShtZXNzYWdlLCAuLi5vcHRpb25zKTtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSBpbnN0YWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBsbSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JTGludGVyTWFuYWdlcik7XHJcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZGlzYWJsZUFsbExpbnRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIGxtLmVuYWJsZUxpbnRpbmdBc3luYyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5EaXNhYmxlZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gZGlzYWJsZVRoaXNMaW50ZXIpIHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIGxtLmdldExpbnRlckluZm8ocHJvZHVjdCkuZW5hYmxlQXN5bmMoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuRGlzYWJsZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuTGludGVySW5zdGFsbGVyID0gTGludGVySW5zdGFsbGVyO1xyXG5jbGFzcyBUZXN0RnJhbWV3b3JrSW5zdGFsbGVyIGV4dGVuZHMgQmFzZUluc3RhbGxlciB7XHJcbiAgICBwcm9tcHRUb0luc3RhbGxJbXBsZW1lbnRhdGlvbihwcm9kdWN0LCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2R1Y3ROYW1lID0gcHJvZHVjdE5hbWVzXzEuUHJvZHVjdE5hbWVzLmdldChwcm9kdWN0KTtcclxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGBUZXN0IGZyYW1ld29yayAke3Byb2R1Y3ROYW1lfSBpcyBub3QgaW5zdGFsbGVkLiBJbnN0YWxsP2A7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRXhlY3V0YWJsZUFNb2R1bGUocHJvZHVjdCwgcmVzb3VyY2UpKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2goLi4uWydZZXMnLCAnTm8nXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBleGVjdXRhYmxlID0gdGhpcy5nZXRFeGVjdXRhYmxlTmFtZUZyb21TZXR0aW5ncyhwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYFBhdGggdG8gdGhlICR7cHJvZHVjdE5hbWV9IHRlc3QgZnJhbWV3b3JrIGlzIGludmFsaWQgKCR7ZXhlY3V0YWJsZX0pYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0geWllbGQgdGhpcy5hcHBTaGVsbC5zaG93RXJyb3JNZXNzYWdlKG1lc3NhZ2UsIC4uLm9wdGlvbnMpO1xyXG4gICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gJ1llcycgPyB0aGlzLmluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIDogdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JZ25vcmU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5UZXN0RnJhbWV3b3JrSW5zdGFsbGVyID0gVGVzdEZyYW1ld29ya0luc3RhbGxlcjtcclxuY2xhc3MgUmVmYWN0b3JpbmdMaWJyYXJ5SW5zdGFsbGVyIGV4dGVuZHMgQmFzZUluc3RhbGxlciB7XHJcbiAgICBwcm9tcHRUb0luc3RhbGxJbXBsZW1lbnRhdGlvbihwcm9kdWN0LCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2R1Y3ROYW1lID0gcHJvZHVjdE5hbWVzXzEuUHJvZHVjdE5hbWVzLmdldChwcm9kdWN0KTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHlpZWxkIHRoaXMuYXBwU2hlbGwuc2hvd0Vycm9yTWVzc2FnZShgUmVmYWN0b3JpbmcgbGlicmFyeSAke3Byb2R1Y3ROYW1lfSBpcyBub3QgaW5zdGFsbGVkLiBJbnN0YWxsP2AsICdZZXMnLCAnTm8nKTtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0gPT09ICdZZXMnID8gdGhpcy5pbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKSA6IHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUmVmYWN0b3JpbmdMaWJyYXJ5SW5zdGFsbGVyID0gUmVmYWN0b3JpbmdMaWJyYXJ5SW5zdGFsbGVyO1xyXG5sZXQgUHJvZHVjdEluc3RhbGxlciA9IGNsYXNzIFByb2R1Y3RJbnN0YWxsZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lciwgb3V0cHV0Q2hhbm5lbCkge1xyXG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICAgICAgdGhpcy5vdXRwdXRDaGFubmVsID0gb3V0cHV0Q2hhbm5lbDtcclxuICAgICAgICB0aGlzLnByb2R1Y3RTZXJ2aWNlID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfOC5JUHJvZHVjdFNlcnZpY2UpO1xyXG4gICAgfVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWVtcHR5XHJcbiAgICBkaXNwb3NlKCkgeyB9XHJcbiAgICBwcm9tcHRUb0luc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVJbnN0YWxsZXIocHJvZHVjdCkucHJvbXB0VG9JbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVJbnN0YWxsZXIocHJvZHVjdCkuaW5zdGFsbChwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpc0luc3RhbGxlZChwcm9kdWN0LCByZXNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUluc3RhbGxlcihwcm9kdWN0KS5pc0luc3RhbGxlZChwcm9kdWN0LCByZXNvdXJjZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGVOYW1lKHByb2R1Y3QsIHB1cnBvc2UpIHtcclxuICAgICAgICByZXR1cm4gdHJhbnNsYXRlUHJvZHVjdFRvTW9kdWxlKHByb2R1Y3QsIHB1cnBvc2UpO1xyXG4gICAgfVxyXG4gICAgY3JlYXRlSW5zdGFsbGVyKHByb2R1Y3QpIHtcclxuICAgICAgICBjb25zdCBwcm9kdWN0VHlwZSA9IHRoaXMucHJvZHVjdFNlcnZpY2UuZ2V0UHJvZHVjdFR5cGUocHJvZHVjdCk7XHJcbiAgICAgICAgc3dpdGNoIChwcm9kdWN0VHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdFR5cGUuRm9ybWF0dGVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGb3JtYXR0ZXJJbnN0YWxsZXIodGhpcy5zZXJ2aWNlQ29udGFpbmVyLCB0aGlzLm91dHB1dENoYW5uZWwpO1xyXG4gICAgICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdFR5cGUuTGludGVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBMaW50ZXJJbnN0YWxsZXIodGhpcy5zZXJ2aWNlQ29udGFpbmVyLCB0aGlzLm91dHB1dENoYW5uZWwpO1xyXG4gICAgICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdFR5cGUuV29ya3NwYWNlU3ltYm9sczpcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ1RhZ3NJbnN0YWxsZXIodGhpcy5zZXJ2aWNlQ29udGFpbmVyLCB0aGlzLm91dHB1dENoYW5uZWwpO1xyXG4gICAgICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdFR5cGUuVGVzdEZyYW1ld29yazpcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVGVzdEZyYW1ld29ya0luc3RhbGxlcih0aGlzLnNlcnZpY2VDb250YWluZXIsIHRoaXMub3V0cHV0Q2hhbm5lbCk7XHJcbiAgICAgICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0VHlwZS5SZWZhY3RvcmluZ0xpYnJhcnk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFJlZmFjdG9yaW5nTGlicmFyeUluc3RhbGxlcih0aGlzLnNlcnZpY2VDb250YWluZXIsIHRoaXMub3V0cHV0Q2hhbm5lbCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb2R1Y3QgJHtwcm9kdWN0fWApO1xyXG4gICAgfVxyXG59O1xyXG5Qcm9kdWN0SW5zdGFsbGVyID0gX19kZWNvcmF0ZShbXHJcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXHJcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18xLklTZXJ2aWNlQ29udGFpbmVyKSksXHJcbiAgICBfX3BhcmFtKDEsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc183LklPdXRwdXRDaGFubmVsKSksIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEubmFtZWQoY29uc3RhbnRzXzEuU1RBTkRBUkRfT1VUUFVUX0NIQU5ORUwpKVxyXG5dLCBQcm9kdWN0SW5zdGFsbGVyKTtcclxuZXhwb3J0cy5Qcm9kdWN0SW5zdGFsbGVyID0gUHJvZHVjdEluc3RhbGxlcjtcclxuZnVuY3Rpb24gdHJhbnNsYXRlUHJvZHVjdFRvTW9kdWxlKHByb2R1Y3QsIHB1cnBvc2UpIHtcclxuICAgIHN3aXRjaCAocHJvZHVjdCkge1xyXG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0Lm15cHk6IHJldHVybiAnbXlweSc7XHJcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3Qubm9zZXRlc3Q6IHtcclxuICAgICAgICAgICAgcmV0dXJuIHB1cnBvc2UgPT09IHR5cGVzXzcuTW9kdWxlTmFtZVB1cnBvc2UuaW5zdGFsbCA/ICdub3NlJyA6ICdub3NldGVzdHMnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdC5weWxhbWE6IHJldHVybiAncHlsYW1hJztcclxuICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdC5wcm9zcGVjdG9yOiByZXR1cm4gJ3Byb3NwZWN0b3InO1xyXG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LnB5bGludDogcmV0dXJuICdweWxpbnQnO1xyXG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LnB5dGVzdDogcmV0dXJuICdweXRlc3QnO1xyXG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LmF1dG9wZXA4OiByZXR1cm4gJ2F1dG9wZXA4JztcclxuICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdC5ibGFjazogcmV0dXJuICdibGFjayc7XHJcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QucGVwODogcmV0dXJuICdwZXA4JztcclxuICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdC5weWRvY3N0eWxlOiByZXR1cm4gJ3B5ZG9jc3R5bGUnO1xyXG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LnlhcGY6IHJldHVybiAneWFwZic7XHJcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QuZmxha2U4OiByZXR1cm4gJ2ZsYWtlOCc7XHJcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QudW5pdHRlc3Q6IHJldHVybiAndW5pdHRlc3QnO1xyXG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LnJvcGU6IHJldHVybiAncm9wZSc7XHJcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QuYmFuZGl0OiByZXR1cm4gJ2JhbmRpdCc7XHJcbiAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb2R1Y3QgJHtwcm9kdWN0fSBjYW5ub3QgYmUgaW5zdGFsbGVkIGFzIGEgUHl0aG9uIE1vZHVsZS5gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJvZHVjdEluc3RhbGxlci5qcy5tYXAiXX0=