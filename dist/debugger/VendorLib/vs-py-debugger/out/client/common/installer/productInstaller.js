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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByb2R1Y3RJbnN0YWxsZXIuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImludmVyc2lmeV8xIiwicmVxdWlyZSIsIm9zIiwidHlwZXNfMSIsInR5cGVzXzIiLCJ0eXBlc18zIiwiY29uc3RhbnRzXzEiLCJ0eXBlc180IiwidHlwZXNfNSIsInR5cGVzXzYiLCJ0eXBlc183IiwicHJvZHVjdE5hbWVzXzEiLCJ0eXBlc184IiwidHlwZXNfOSIsIlByb2R1Y3QiLCJDVGFnc0luc2xsYXRpb25TY3JpcHQiLCJwbGF0Zm9ybSIsIkJhc2VJbnN0YWxsZXIiLCJjb25zdHJ1Y3RvciIsInNlcnZpY2VDb250YWluZXIiLCJvdXRwdXRDaGFubmVsIiwiYXBwU2hlbGwiLCJnZXQiLCJJQXBwbGljYXRpb25TaGVsbCIsImNvbmZpZ1NlcnZpY2UiLCJJQ29uZmlndXJhdGlvblNlcnZpY2UiLCJ3b3Jrc3BhY2VTZXJ2aWNlIiwiSVdvcmtzcGFjZVNlcnZpY2UiLCJwcm9kdWN0U2VydmljZSIsIklQcm9kdWN0U2VydmljZSIsInByb21wdFRvSW5zdGFsbCIsInByb2R1Y3QiLCJyZXNvdXJjZSIsIndvcmtzcGFjZUZvbGRlciIsImdldFdvcmtzcGFjZUZvbGRlciIsInVuZGVmaW5lZCIsInVyaSIsImZzUGF0aCIsIlByb21wdFByb21pc2VzIiwiaGFzIiwicHJvbWlzZSIsInByb21wdFRvSW5zdGFsbEltcGxlbWVudGF0aW9uIiwic2V0IiwiZGVsZXRlIiwiaWdub3JlRXJyb3JzIiwiY2F0Y2giLCJpbnN0YWxsIiwidW5pdHRlc3QiLCJJbnN0YWxsZXJSZXNwb25zZSIsIkluc3RhbGxlZCIsImNoYW5uZWxzIiwiSUluc3RhbGxhdGlvbkNoYW5uZWxNYW5hZ2VyIiwiaW5zdGFsbGVyIiwiZ2V0SW5zdGFsbGF0aW9uQ2hhbm5lbCIsIklnbm9yZSIsIm1vZHVsZU5hbWUiLCJ0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGUiLCJNb2R1bGVOYW1lUHVycG9zZSIsImxvZ2dlciIsIklMb2dnZXIiLCJpbnN0YWxsTW9kdWxlIiwibG9nRXJyb3IiLCJiaW5kIiwiaXNJbnN0YWxsZWQiLCJleGVjdXRhYmxlTmFtZSIsImdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzIiwiaXNNb2R1bGUiLCJpc0V4ZWN1dGFibGVBTW9kdWxlIiwicHl0aG9uUHJvY2VzcyIsIklQeXRob25FeGVjdXRpb25GYWN0b3J5IiwiY3JlYXRlIiwiaXNNb2R1bGVJbnN0YWxsZWQiLCJwcm9jZXNzIiwiSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSIsImV4ZWMiLCJtZXJnZVN0ZE91dEVyciIsInByb2R1Y3RUeXBlIiwiZ2V0UHJvZHVjdFR5cGUiLCJwcm9kdWN0UGF0aFNlcnZpY2UiLCJJUHJvZHVjdFBhdGhTZXJ2aWNlIiwiTWFwIiwiQ1RhZ3NJbnN0YWxsZXIiLCJJUGxhdGZvcm1TZXJ2aWNlIiwiaXNXaW5kb3dzIiwiYXBwZW5kTGluZSIsInNob3ciLCJ0ZXJtaW5hbFNlcnZpY2UiLCJJVGVybWluYWxTZXJ2aWNlRmFjdG9yeSIsImdldFRlcm1pbmFsU2VydmljZSIsInNlbmRDb21tYW5kIiwiaXRlbSIsInNob3dFcnJvck1lc3NhZ2UiLCJGb3JtYXR0ZXJJbnN0YWxsZXIiLCJmb3JtYXR0ZXJzIiwiYXV0b3BlcDgiLCJibGFjayIsInlhcGYiLCJmb3JtYXR0ZXJOYW1lcyIsIm1hcCIsImZvcm1hdHRlciIsIlByb2R1Y3ROYW1lcyIsInByb2R1Y3ROYW1lIiwic3BsaWNlIiwiaW5kZXhPZiIsInVzZU9wdGlvbnMiLCJuYW1lIiwieWVzQ2hvaWNlIiwib3B0aW9ucyIsIm1lc3NhZ2UiLCJleGVjdXRhYmxlIiwiZm9ybWF0dGVyTmFtZSIsImVuZHNXaXRoIiwidXBkYXRlU2V0dGluZyIsIkxpbnRlckluc3RhbGxlciIsImRpc2FibGVBbGxMaW50aW5nIiwiZGlzYWJsZVRoaXNMaW50ZXIiLCJyZXNwb25zZSIsImxtIiwiSUxpbnRlck1hbmFnZXIiLCJlbmFibGVMaW50aW5nQXN5bmMiLCJEaXNhYmxlZCIsImdldExpbnRlckluZm8iLCJlbmFibGVBc3luYyIsIlRlc3RGcmFtZXdvcmtJbnN0YWxsZXIiLCJwdXNoIiwiUmVmYWN0b3JpbmdMaWJyYXJ5SW5zdGFsbGVyIiwiUHJvZHVjdEluc3RhbGxlciIsImRpc3Bvc2UiLCJjcmVhdGVJbnN0YWxsZXIiLCJ0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGVOYW1lIiwicHVycG9zZSIsIlByb2R1Y3RUeXBlIiwiRm9ybWF0dGVyIiwiTGludGVyIiwiV29ya3NwYWNlU3ltYm9scyIsIlRlc3RGcmFtZXdvcmsiLCJSZWZhY3RvcmluZ0xpYnJhcnkiLCJFcnJvciIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciIsIklPdXRwdXRDaGFubmVsIiwibmFtZWQiLCJTVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCIsIm15cHkiLCJub3NldGVzdCIsInB5bGFtYSIsInByb3NwZWN0b3IiLCJweWxpbnQiLCJweXRlc3QiLCJwZXA4IiwicHlkb2NzdHlsZSIsImZsYWtlOCIsInJvcGUiLCJiYW5kaXQiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTs7QUFDQSxJQUFJQSxVQUFVLEdBQUksVUFBUSxTQUFLQSxVQUFkLElBQTZCLFVBQVVDLFVBQVYs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QzNCLFNBQUt0RixPQUFPLENBQUNJLE9BQVIsQ0FBZ0IwSSxNQUFyQjtBQUE2QixhQUFPLFFBQVA7O0FBQzdCLFNBQUs5SSxPQUFPLENBQUNJLE9BQVIsQ0FBZ0JpQyxRQUFyQjtBQUErQixhQUFPLFVBQVA7O0FBQy9CLFNBQUtyQyxPQUFPLENBQUNJLE9BQVIsQ0FBZ0IySSxJQUFyQjtBQUEyQixhQUFPLE1BQVA7O0FBQzNCLFNBQUsvSSxPQUFPLENBQUNJLE9BQVIsQ0FBZ0I0SSxNQUFyQjtBQUE2QixhQUFPLFFBQVA7O0FBQzdCO0FBQVM7QUFDTCxjQUFNLElBQUlqQixLQUFKLENBQVcsV0FBVTFHLE9BQVEsMENBQTdCLENBQU47QUFDSDtBQXBCTDtBQXNCSCIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLy8gdHNsaW50OmRpc2FibGU6bWF4LWNsYXNzZXMtcGVyLWZpbGUgbWF4LWNsYXNzZXMtcGVyLWZpbGVcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBfX3BhcmFtID0gKHRoaXMgJiYgdGhpcy5fX3BhcmFtKSB8fCBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XG5jb25zdCBvcyA9IHJlcXVpcmUoXCJvc1wiKTtcbnJlcXVpcmUoXCIuLi8uLi9jb21tb24vZXh0ZW5zaW9uc1wiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vLi4vaW9jL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi8uLi9saW50ZXJzL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuLi9hcHBsaWNhdGlvbi90eXBlc1wiKTtcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uL2NvbnN0YW50c1wiKTtcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi4vcGxhdGZvcm0vdHlwZXNcIik7XG5jb25zdCB0eXBlc181ID0gcmVxdWlyZShcIi4uL3Byb2Nlc3MvdHlwZXNcIik7XG5jb25zdCB0eXBlc182ID0gcmVxdWlyZShcIi4uL3Rlcm1pbmFsL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfNyA9IHJlcXVpcmUoXCIuLi90eXBlc1wiKTtcbmNvbnN0IHByb2R1Y3ROYW1lc18xID0gcmVxdWlyZShcIi4vcHJvZHVjdE5hbWVzXCIpO1xuY29uc3QgdHlwZXNfOCA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpO1xudmFyIHR5cGVzXzkgPSByZXF1aXJlKFwiLi4vdHlwZXNcIik7XG5leHBvcnRzLlByb2R1Y3QgPSB0eXBlc185LlByb2R1Y3Q7XG5jb25zdCBDVGFnc0luc2xsYXRpb25TY3JpcHQgPSBvcy5wbGF0Zm9ybSgpID09PSAnZGFyd2luJyA/ICdicmV3IGluc3RhbGwgY3RhZ3MnIDogJ3N1ZG8gYXB0LWdldCBpbnN0YWxsIGV4dWJlcmFudC1jdGFncyc7XG5jbGFzcyBCYXNlSW5zdGFsbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlQ29udGFpbmVyLCBvdXRwdXRDaGFubmVsKSB7XG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XG4gICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbCA9IG91dHB1dENoYW5uZWw7XG4gICAgICAgIHRoaXMuYXBwU2hlbGwgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklBcHBsaWNhdGlvblNoZWxsKTtcbiAgICAgICAgdGhpcy5jb25maWdTZXJ2aWNlID0gc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNy5JQ29uZmlndXJhdGlvblNlcnZpY2UpO1xuICAgICAgICB0aGlzLndvcmtzcGFjZVNlcnZpY2UgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklXb3Jrc3BhY2VTZXJ2aWNlKTtcbiAgICAgICAgdGhpcy5wcm9kdWN0U2VydmljZSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzguSVByb2R1Y3RTZXJ2aWNlKTtcbiAgICB9XG4gICAgcHJvbXB0VG9JbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKSB7XG4gICAgICAgIC8vIElmIHRoaXMgbWV0aG9kIGdldHMgY2FsbGVkIHR3aWNlLCB3aGlsZSBwcmV2aW91cyBwcm9taXNlIGhhcyBub3QgYmVlbiByZXNvbHZlZCwgdGhlbiByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXG4gICAgICAgIC8vIEUuZy4gcHJldmlvdXMgcHJvbWlzZSBpcyBub3QgcmVzb2x2ZWQgYXMgYSBtZXNzYWdlIGhhcyBiZWVuIGRpc3BsYXllZCB0byB0aGUgdXNlciwgc28gbm8gcG9pbnQgZGlzcGxheWluZ1xuICAgICAgICAvLyBhbm90aGVyIG1lc3NhZ2UuXG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZUZvbGRlciA9IHJlc291cmNlID8gdGhpcy53b3Jrc3BhY2VTZXJ2aWNlLmdldFdvcmtzcGFjZUZvbGRlcihyZXNvdXJjZSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGtleSA9IGAke3Byb2R1Y3R9JHt3b3Jrc3BhY2VGb2xkZXIgPyB3b3Jrc3BhY2VGb2xkZXIudXJpLmZzUGF0aCA6ICcnfWA7XG4gICAgICAgIGlmIChCYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gQmFzZUluc3RhbGxlci5Qcm9tcHRQcm9taXNlcy5nZXQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcm9taXNlID0gdGhpcy5wcm9tcHRUb0luc3RhbGxJbXBsZW1lbnRhdGlvbihwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgIEJhc2VJbnN0YWxsZXIuUHJvbXB0UHJvbWlzZXMuc2V0KGtleSwgcHJvbWlzZSk7XG4gICAgICAgIHByb21pc2UudGhlbigoKSA9PiBCYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzLmRlbGV0ZShrZXkpKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgcHJvbWlzZS5jYXRjaCgoKSA9PiBCYXNlSW5zdGFsbGVyLlByb21wdFByb21pc2VzLmRlbGV0ZShrZXkpKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIGluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0ID09PSB0eXBlc183LlByb2R1Y3QudW5pdHRlc3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JbnN0YWxsZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjaGFubmVscyA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfOC5JSW5zdGFsbGF0aW9uQ2hhbm5lbE1hbmFnZXIpO1xuICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVyID0geWllbGQgY2hhbm5lbHMuZ2V0SW5zdGFsbGF0aW9uQ2hhbm5lbChwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgICAgICBpZiAoIWluc3RhbGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlc183Lkluc3RhbGxlclJlc3BvbnNlLklnbm9yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGUocHJvZHVjdCwgdHlwZXNfNy5Nb2R1bGVOYW1lUHVycG9zZS5pbnN0YWxsKTtcbiAgICAgICAgICAgIGNvbnN0IGxvZ2dlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNy5JTG9nZ2VyKTtcbiAgICAgICAgICAgIHlpZWxkIGluc3RhbGxlci5pbnN0YWxsTW9kdWxlKG1vZHVsZU5hbWUsIHJlc291cmNlKVxuICAgICAgICAgICAgICAgIC5jYXRjaChsb2dnZXIubG9nRXJyb3IuYmluZChsb2dnZXIsIGBFcnJvciBpbiBpbnN0YWxsaW5nIHRoZSBtb2R1bGUgJyR7bW9kdWxlTmFtZX0nYCkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnN0YWxsZWQocHJvZHVjdCwgcmVzb3VyY2UpXG4gICAgICAgICAgICAgICAgLnRoZW4oaXNJbnN0YWxsZWQgPT4gaXNJbnN0YWxsZWQgPyB0eXBlc183Lkluc3RhbGxlclJlc3BvbnNlLkluc3RhbGxlZCA6IHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlzSW5zdGFsbGVkKHByb2R1Y3QsIHJlc291cmNlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdCA9PT0gdHlwZXNfNy5Qcm9kdWN0LnVuaXR0ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVc2VyIG1heSBoYXZlIGN1c3RvbWl6ZWQgdGhlIG1vZHVsZSBuYW1lIG9yIHByb3ZpZGVkIHRoZSBmdWxseSBxdWFsaWZpZWQgcGF0aC5cbiAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGFibGVOYW1lID0gdGhpcy5nZXRFeGVjdXRhYmxlTmFtZUZyb21TZXR0aW5ncyhwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgICAgICBjb25zdCBpc01vZHVsZSA9IHRoaXMuaXNFeGVjdXRhYmxlQU1vZHVsZShwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgICAgICBpZiAoaXNNb2R1bGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBweXRob25Qcm9jZXNzID0geWllbGQgdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc181LklQeXRob25FeGVjdXRpb25GYWN0b3J5KS5jcmVhdGUoeyByZXNvdXJjZSB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHl0aG9uUHJvY2Vzcy5pc01vZHVsZUluc3RhbGxlZChleGVjdXRhYmxlTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzID0geWllbGQgdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc181LklQcm9jZXNzU2VydmljZUZhY3RvcnkpLmNyZWF0ZShyZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3MuZXhlYyhleGVjdXRhYmxlTmFtZSwgWyctLXZlcnNpb24nXSwgeyBtZXJnZVN0ZE91dEVycjogdHJ1ZSB9KVxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0RXhlY3V0YWJsZU5hbWVGcm9tU2V0dGluZ3MocHJvZHVjdCwgcmVzb3VyY2UpIHtcbiAgICAgICAgY29uc3QgcHJvZHVjdFR5cGUgPSB0aGlzLnByb2R1Y3RTZXJ2aWNlLmdldFByb2R1Y3RUeXBlKHByb2R1Y3QpO1xuICAgICAgICBjb25zdCBwcm9kdWN0UGF0aFNlcnZpY2UgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzguSVByb2R1Y3RQYXRoU2VydmljZSwgcHJvZHVjdFR5cGUpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdFBhdGhTZXJ2aWNlLmdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzKHByb2R1Y3QsIHJlc291cmNlKTtcbiAgICB9XG4gICAgaXNFeGVjdXRhYmxlQU1vZHVsZShwcm9kdWN0LCByZXNvdXJjZSkge1xuICAgICAgICBjb25zdCBwcm9kdWN0VHlwZSA9IHRoaXMucHJvZHVjdFNlcnZpY2UuZ2V0UHJvZHVjdFR5cGUocHJvZHVjdCk7XG4gICAgICAgIGNvbnN0IHByb2R1Y3RQYXRoU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfOC5JUHJvZHVjdFBhdGhTZXJ2aWNlLCBwcm9kdWN0VHlwZSk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0UGF0aFNlcnZpY2UuaXNFeGVjdXRhYmxlQU1vZHVsZShwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgfVxufVxuQmFzZUluc3RhbGxlci5Qcm9tcHRQcm9taXNlcyA9IG5ldyBNYXAoKTtcbmV4cG9ydHMuQmFzZUluc3RhbGxlciA9IEJhc2VJbnN0YWxsZXI7XG5jbGFzcyBDVGFnc0luc3RhbGxlciBleHRlbmRzIEJhc2VJbnN0YWxsZXIge1xuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VDb250YWluZXIsIG91dHB1dENoYW5uZWwpIHtcbiAgICAgICAgc3VwZXIoc2VydmljZUNvbnRhaW5lciwgb3V0cHV0Q2hhbm5lbCk7XG4gICAgfVxuICAgIGluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzQuSVBsYXRmb3JtU2VydmljZSkuaXNXaW5kb3dzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vdXRwdXRDaGFubmVsLmFwcGVuZExpbmUoJ0luc3RhbGwgVW5pdmVyc2FsIEN0YWdzIFdpbjMyIHRvIGVuYWJsZSBzdXBwb3J0IGZvciBXb3Jrc3BhY2UgU3ltYm9scycpO1xuICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbC5hcHBlbmRMaW5lKCdEb3dubG9hZCB0aGUgQ1RhZ3MgYmluYXJ5IGZyb20gdGhlIFVuaXZlcnNhbCBDVGFncyBzaXRlLicpO1xuICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbC5hcHBlbmRMaW5lKCdPcHRpb24gMTogRXh0cmFjdCBjdGFncy5leGUgZnJvbSB0aGUgZG93bmxvYWRlZCB6aXAgdG8gYW55IGZvbGRlciB3aXRoaW4geW91ciBQQVRIIHNvIHRoYXQgVmlzdWFsIFN0dWRpbyBDb2RlIGNhbiBydW4gaXQuJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5vdXRwdXRDaGFubmVsLmFwcGVuZExpbmUoJ09wdGlvbiAyOiBFeHRyYWN0IHRvIGFueSBmb2xkZXIgYW5kIGFkZCB0aGUgcGF0aCB0byB0aGlzIGZvbGRlciB0byB0aGUgY29tbWFuZCBzZXR0aW5nLicpO1xuICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0Q2hhbm5lbC5hcHBlbmRMaW5lKCdPcHRpb24gMzogRXh0cmFjdCB0byBhbnkgZm9sZGVyIGFuZCBkZWZpbmUgdGhhdCBwYXRoIGluIHRoZSBweXRob24ud29ya3NwYWNlU3ltYm9scy5jdGFnc1BhdGggc2V0dGluZyBvZiB5b3VyIHVzZXIgc2V0dGluZ3MgZmlsZSAoc2V0dGluZ3MuanNvbikuJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5vdXRwdXRDaGFubmVsLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlcm1pbmFsU2VydmljZSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfNi5JVGVybWluYWxTZXJ2aWNlRmFjdG9yeSkuZ2V0VGVybWluYWxTZXJ2aWNlKHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzcuSUxvZ2dlcik7XG4gICAgICAgICAgICAgICAgdGVybWluYWxTZXJ2aWNlLnNlbmRDb21tYW5kKENUYWdzSW5zbGxhdGlvblNjcmlwdCwgW10pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChsb2dnZXIubG9nRXJyb3IuYmluZChsb2dnZXIsIGBGYWlsZWQgdG8gaW5zdGFsbCBjdGFncy4gU2NyaXB0IHNlbnQgJyR7Q1RhZ3NJbnNsbGF0aW9uU2NyaXB0fScuYCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcHJvbXB0VG9JbnN0YWxsSW1wbGVtZW50YXRpb24ocHJvZHVjdCwgcmVzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB5aWVsZCB0aGlzLmFwcFNoZWxsLnNob3dFcnJvck1lc3NhZ2UoJ0luc3RhbGwgQ1RhZ3MgdG8gZW5hYmxlIFB5dGhvbiB3b3Jrc3BhY2Ugc3ltYm9scz8nLCAnWWVzJywgJ05vJyk7XG4gICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gJ1llcycgPyB0aGlzLmluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIDogdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JZ25vcmU7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuQ1RhZ3NJbnN0YWxsZXIgPSBDVGFnc0luc3RhbGxlcjtcbmNsYXNzIEZvcm1hdHRlckluc3RhbGxlciBleHRlbmRzIEJhc2VJbnN0YWxsZXIge1xuICAgIHByb21wdFRvSW5zdGFsbEltcGxlbWVudGF0aW9uKHByb2R1Y3QsIHJlc291cmNlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBIYXJkLWNvZGVkIG9uIHB1cnBvc2UgYmVjYXVzZSB0aGUgVUkgd29uJ3QgbmVjZXNzYXJpbHkgd29yayBoYXZpbmdcbiAgICAgICAgICAgIC8vIGFub3RoZXIgZm9ybWF0dGVyLlxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVycyA9IFt0eXBlc183LlByb2R1Y3QuYXV0b3BlcDgsIHR5cGVzXzcuUHJvZHVjdC5ibGFjaywgdHlwZXNfNy5Qcm9kdWN0LnlhcGZdO1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVyTmFtZXMgPSBmb3JtYXR0ZXJzLm1hcCgoZm9ybWF0dGVyKSA9PiBwcm9kdWN0TmFtZXNfMS5Qcm9kdWN0TmFtZXMuZ2V0KGZvcm1hdHRlcikpO1xuICAgICAgICAgICAgY29uc3QgcHJvZHVjdE5hbWUgPSBwcm9kdWN0TmFtZXNfMS5Qcm9kdWN0TmFtZXMuZ2V0KHByb2R1Y3QpO1xuICAgICAgICAgICAgZm9ybWF0dGVyTmFtZXMuc3BsaWNlKGZvcm1hdHRlck5hbWVzLmluZGV4T2YocHJvZHVjdE5hbWUpLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IHVzZU9wdGlvbnMgPSBmb3JtYXR0ZXJOYW1lcy5tYXAoKG5hbWUpID0+IGBVc2UgJHtuYW1lfWApO1xuICAgICAgICAgICAgY29uc3QgeWVzQ2hvaWNlID0gJ1llcyc7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gWy4uLnVzZU9wdGlvbnNdO1xuICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgRm9ybWF0dGVyICR7cHJvZHVjdE5hbWV9IGlzIG5vdCBpbnN0YWxsZWQuIEluc3RhbGw/YDtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRXhlY3V0YWJsZUFNb2R1bGUocHJvZHVjdCwgcmVzb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zcGxpY2UoMCwgMCwgeWVzQ2hvaWNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGFibGUgPSB0aGlzLmdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzKHByb2R1Y3QsIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYFBhdGggdG8gdGhlICR7cHJvZHVjdE5hbWV9IGZvcm1hdHRlciBpcyBpbnZhbGlkICgke2V4ZWN1dGFibGV9KWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpdGVtID0geWllbGQgdGhpcy5hcHBTaGVsbC5zaG93RXJyb3JNZXNzYWdlKG1lc3NhZ2UsIC4uLm9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09IHllc0Nob2ljZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmb3JtYXR0ZXIgb2YgZm9ybWF0dGVycykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZXJOYW1lID0gcHJvZHVjdE5hbWVzXzEuUHJvZHVjdE5hbWVzLmdldChmb3JtYXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5lbmRzV2l0aChmb3JtYXR0ZXJOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5jb25maWdTZXJ2aWNlLnVwZGF0ZVNldHRpbmcoJ2Zvcm1hdHRpbmcucHJvdmlkZXInLCBmb3JtYXR0ZXJOYW1lLCByZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YWxsKGZvcm1hdHRlciwgcmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuSWdub3JlO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLkZvcm1hdHRlckluc3RhbGxlciA9IEZvcm1hdHRlckluc3RhbGxlcjtcbmNsYXNzIExpbnRlckluc3RhbGxlciBleHRlbmRzIEJhc2VJbnN0YWxsZXIge1xuICAgIHByb21wdFRvSW5zdGFsbEltcGxlbWVudGF0aW9uKHByb2R1Y3QsIHJlc291cmNlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9kdWN0TmFtZSA9IHByb2R1Y3ROYW1lc18xLlByb2R1Y3ROYW1lcy5nZXQocHJvZHVjdCk7XG4gICAgICAgICAgICBjb25zdCBpbnN0YWxsID0gJ0luc3RhbGwnO1xuICAgICAgICAgICAgY29uc3QgZGlzYWJsZUFsbExpbnRpbmcgPSAnRGlzYWJsZSBsaW50aW5nJztcbiAgICAgICAgICAgIGNvbnN0IGRpc2FibGVUaGlzTGludGVyID0gYERpc2FibGUgJHtwcm9kdWN0TmFtZX1gO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtkaXNhYmxlVGhpc0xpbnRlciwgZGlzYWJsZUFsbExpbnRpbmddO1xuICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgTGludGVyICR7cHJvZHVjdE5hbWV9IGlzIG5vdCBpbnN0YWxsZWQuYDtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRXhlY3V0YWJsZUFNb2R1bGUocHJvZHVjdCwgcmVzb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zcGxpY2UoMCwgMCwgaW5zdGFsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBleGVjdXRhYmxlID0gdGhpcy5nZXRFeGVjdXRhYmxlTmFtZUZyb21TZXR0aW5ncyhwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBQYXRoIHRvIHRoZSAke3Byb2R1Y3ROYW1lfSBsaW50ZXIgaXMgaW52YWxpZCAoJHtleGVjdXRhYmxlfSlgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB5aWVsZCB0aGlzLmFwcFNoZWxsLnNob3dFcnJvck1lc3NhZ2UobWVzc2FnZSwgLi4ub3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGluc3RhbGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxtID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklMaW50ZXJNYW5hZ2VyKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZGlzYWJsZUFsbExpbnRpbmcpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCBsbS5lbmFibGVMaW50aW5nQXN5bmMoZmFsc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlc183Lkluc3RhbGxlclJlc3BvbnNlLkRpc2FibGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UgPT09IGRpc2FibGVUaGlzTGludGVyKSB7XG4gICAgICAgICAgICAgICAgeWllbGQgbG0uZ2V0TGludGVySW5mbyhwcm9kdWN0KS5lbmFibGVBc3luYyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVzXzcuSW5zdGFsbGVyUmVzcG9uc2UuRGlzYWJsZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JZ25vcmU7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuTGludGVySW5zdGFsbGVyID0gTGludGVySW5zdGFsbGVyO1xuY2xhc3MgVGVzdEZyYW1ld29ya0luc3RhbGxlciBleHRlbmRzIEJhc2VJbnN0YWxsZXIge1xuICAgIHByb21wdFRvSW5zdGFsbEltcGxlbWVudGF0aW9uKHByb2R1Y3QsIHJlc291cmNlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9kdWN0TmFtZSA9IHByb2R1Y3ROYW1lc18xLlByb2R1Y3ROYW1lcy5nZXQocHJvZHVjdCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gW107XG4gICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGBUZXN0IGZyYW1ld29yayAke3Byb2R1Y3ROYW1lfSBpcyBub3QgaW5zdGFsbGVkLiBJbnN0YWxsP2A7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0V4ZWN1dGFibGVBTW9kdWxlKHByb2R1Y3QsIHJlc291cmNlKSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMucHVzaCguLi5bJ1llcycsICdObyddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGFibGUgPSB0aGlzLmdldEV4ZWN1dGFibGVOYW1lRnJvbVNldHRpbmdzKHByb2R1Y3QsIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYFBhdGggdG8gdGhlICR7cHJvZHVjdE5hbWV9IHRlc3QgZnJhbWV3b3JrIGlzIGludmFsaWQgKCR7ZXhlY3V0YWJsZX0pYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB5aWVsZCB0aGlzLmFwcFNoZWxsLnNob3dFcnJvck1lc3NhZ2UobWVzc2FnZSwgLi4ub3B0aW9ucyk7XG4gICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gJ1llcycgPyB0aGlzLmluc3RhbGwocHJvZHVjdCwgcmVzb3VyY2UpIDogdHlwZXNfNy5JbnN0YWxsZXJSZXNwb25zZS5JZ25vcmU7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuVGVzdEZyYW1ld29ya0luc3RhbGxlciA9IFRlc3RGcmFtZXdvcmtJbnN0YWxsZXI7XG5jbGFzcyBSZWZhY3RvcmluZ0xpYnJhcnlJbnN0YWxsZXIgZXh0ZW5kcyBCYXNlSW5zdGFsbGVyIHtcbiAgICBwcm9tcHRUb0luc3RhbGxJbXBsZW1lbnRhdGlvbihwcm9kdWN0LCByZXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgcHJvZHVjdE5hbWUgPSBwcm9kdWN0TmFtZXNfMS5Qcm9kdWN0TmFtZXMuZ2V0KHByb2R1Y3QpO1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHlpZWxkIHRoaXMuYXBwU2hlbGwuc2hvd0Vycm9yTWVzc2FnZShgUmVmYWN0b3JpbmcgbGlicmFyeSAke3Byb2R1Y3ROYW1lfSBpcyBub3QgaW5zdGFsbGVkLiBJbnN0YWxsP2AsICdZZXMnLCAnTm8nKTtcbiAgICAgICAgICAgIHJldHVybiBpdGVtID09PSAnWWVzJyA/IHRoaXMuaW5zdGFsbChwcm9kdWN0LCByZXNvdXJjZSkgOiB0eXBlc183Lkluc3RhbGxlclJlc3BvbnNlLklnbm9yZTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5SZWZhY3RvcmluZ0xpYnJhcnlJbnN0YWxsZXIgPSBSZWZhY3RvcmluZ0xpYnJhcnlJbnN0YWxsZXI7XG5sZXQgUHJvZHVjdEluc3RhbGxlciA9IGNsYXNzIFByb2R1Y3RJbnN0YWxsZXIge1xuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VDb250YWluZXIsIG91dHB1dENoYW5uZWwpIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZUNvbnRhaW5lcjtcbiAgICAgICAgdGhpcy5vdXRwdXRDaGFubmVsID0gb3V0cHV0Q2hhbm5lbDtcbiAgICAgICAgdGhpcy5wcm9kdWN0U2VydmljZSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzguSVByb2R1Y3RTZXJ2aWNlKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWVtcHR5XG4gICAgZGlzcG9zZSgpIHsgfVxuICAgIHByb21wdFRvSW5zdGFsbChwcm9kdWN0LCByZXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlSW5zdGFsbGVyKHByb2R1Y3QpLnByb21wdFRvSW5zdGFsbChwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpbnN0YWxsKHByb2R1Y3QsIHJlc291cmNlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVJbnN0YWxsZXIocHJvZHVjdCkuaW5zdGFsbChwcm9kdWN0LCByZXNvdXJjZSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpc0luc3RhbGxlZChwcm9kdWN0LCByZXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlSW5zdGFsbGVyKHByb2R1Y3QpLmlzSW5zdGFsbGVkKHByb2R1Y3QsIHJlc291cmNlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRyYW5zbGF0ZVByb2R1Y3RUb01vZHVsZU5hbWUocHJvZHVjdCwgcHVycG9zZSkge1xuICAgICAgICByZXR1cm4gdHJhbnNsYXRlUHJvZHVjdFRvTW9kdWxlKHByb2R1Y3QsIHB1cnBvc2UpO1xuICAgIH1cbiAgICBjcmVhdGVJbnN0YWxsZXIocHJvZHVjdCkge1xuICAgICAgICBjb25zdCBwcm9kdWN0VHlwZSA9IHRoaXMucHJvZHVjdFNlcnZpY2UuZ2V0UHJvZHVjdFR5cGUocHJvZHVjdCk7XG4gICAgICAgIHN3aXRjaCAocHJvZHVjdFR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0VHlwZS5Gb3JtYXR0ZXI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGb3JtYXR0ZXJJbnN0YWxsZXIodGhpcy5zZXJ2aWNlQ29udGFpbmVyLCB0aGlzLm91dHB1dENoYW5uZWwpO1xuICAgICAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3RUeXBlLkxpbnRlcjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IExpbnRlckluc3RhbGxlcih0aGlzLnNlcnZpY2VDb250YWluZXIsIHRoaXMub3V0cHV0Q2hhbm5lbCk7XG4gICAgICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdFR5cGUuV29ya3NwYWNlU3ltYm9sczpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENUYWdzSW5zdGFsbGVyKHRoaXMuc2VydmljZUNvbnRhaW5lciwgdGhpcy5vdXRwdXRDaGFubmVsKTtcbiAgICAgICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0VHlwZS5UZXN0RnJhbWV3b3JrOlxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVGVzdEZyYW1ld29ya0luc3RhbGxlcih0aGlzLnNlcnZpY2VDb250YWluZXIsIHRoaXMub3V0cHV0Q2hhbm5lbCk7XG4gICAgICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdFR5cGUuUmVmYWN0b3JpbmdMaWJyYXJ5OlxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUmVmYWN0b3JpbmdMaWJyYXJ5SW5zdGFsbGVyKHRoaXMuc2VydmljZUNvbnRhaW5lciwgdGhpcy5vdXRwdXRDaGFubmVsKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb2R1Y3QgJHtwcm9kdWN0fWApO1xuICAgIH1cbn07XG5Qcm9kdWN0SW5zdGFsbGVyID0gX19kZWNvcmF0ZShbXG4gICAgaW52ZXJzaWZ5XzEuaW5qZWN0YWJsZSgpLFxuICAgIF9fcGFyYW0oMCwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzEuSVNlcnZpY2VDb250YWluZXIpKSxcbiAgICBfX3BhcmFtKDEsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc183LklPdXRwdXRDaGFubmVsKSksIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEubmFtZWQoY29uc3RhbnRzXzEuU1RBTkRBUkRfT1VUUFVUX0NIQU5ORUwpKVxuXSwgUHJvZHVjdEluc3RhbGxlcik7XG5leHBvcnRzLlByb2R1Y3RJbnN0YWxsZXIgPSBQcm9kdWN0SW5zdGFsbGVyO1xuZnVuY3Rpb24gdHJhbnNsYXRlUHJvZHVjdFRvTW9kdWxlKHByb2R1Y3QsIHB1cnBvc2UpIHtcbiAgICBzd2l0Y2ggKHByb2R1Y3QpIHtcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QubXlweTogcmV0dXJuICdteXB5JztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3Qubm9zZXRlc3Q6IHtcbiAgICAgICAgICAgIHJldHVybiBwdXJwb3NlID09PSB0eXBlc183Lk1vZHVsZU5hbWVQdXJwb3NlLmluc3RhbGwgPyAnbm9zZScgOiAnbm9zZXRlc3RzJztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdC5weWxhbWE6IHJldHVybiAncHlsYW1hJztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QucHJvc3BlY3RvcjogcmV0dXJuICdwcm9zcGVjdG9yJztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QucHlsaW50OiByZXR1cm4gJ3B5bGludCc7XG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LnB5dGVzdDogcmV0dXJuICdweXRlc3QnO1xuICAgICAgICBjYXNlIHR5cGVzXzcuUHJvZHVjdC5hdXRvcGVwODogcmV0dXJuICdhdXRvcGVwOCc7XG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LmJsYWNrOiByZXR1cm4gJ2JsYWNrJztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QucGVwODogcmV0dXJuICdwZXA4JztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QucHlkb2NzdHlsZTogcmV0dXJuICdweWRvY3N0eWxlJztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QueWFwZjogcmV0dXJuICd5YXBmJztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QuZmxha2U4OiByZXR1cm4gJ2ZsYWtlOCc7XG4gICAgICAgIGNhc2UgdHlwZXNfNy5Qcm9kdWN0LnVuaXR0ZXN0OiByZXR1cm4gJ3VuaXR0ZXN0JztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3Qucm9wZTogcmV0dXJuICdyb3BlJztcbiAgICAgICAgY2FzZSB0eXBlc183LlByb2R1Y3QuYmFuZGl0OiByZXR1cm4gJ2JhbmRpdCc7XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJvZHVjdCAke3Byb2R1Y3R9IGNhbm5vdCBiZSBpbnN0YWxsZWQgYXMgYSBQeXRob24gTW9kdWxlLmApO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJvZHVjdEluc3RhbGxlci5qcy5tYXAiXX0=