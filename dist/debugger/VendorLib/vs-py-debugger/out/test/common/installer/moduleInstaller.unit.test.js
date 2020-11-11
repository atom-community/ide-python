// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

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
}); // tslint:disable:no-any max-func-body-length no-invalid-this

const path = require("path");

const TypeMoq = require("typemoq");

const vscode_1 = require("vscode");

const types_1 = require("../../../client/common/application/types");

const condaInstaller_1 = require("../../../client/common/installer/condaInstaller");

const pipEnvInstaller_1 = require("../../../client/common/installer/pipEnvInstaller");

const pipInstaller_1 = require("../../../client/common/installer/pipInstaller");

const productInstaller_1 = require("../../../client/common/installer/productInstaller");

const types_2 = require("../../../client/common/installer/types");

const types_3 = require("../../../client/common/terminal/types");

const types_4 = require("../../../client/common/types");

const enum_1 = require("../../../client/common/utils/enum");

const misc_1 = require("../../../client/common/utils/misc");

const contracts_1 = require("../../../client/interpreter/contracts");
/* Complex test to ensure we cover all combinations:
We could have written separate tests for each installer, but we'd be replicate code.
Both approachs have their benefits.

Comnbinations of:
1. With and without a workspace.
2. Http Proxy configuration.
3. All products.
4. Different versions of Python.
5. With and without conda.
6. Conda environments with names and without names.
7. All installers.
*/


suite('Module Installer', () => {
  const pythonPath = path.join(__dirname, 'python');
  [condaInstaller_1.CondaInstaller, pipInstaller_1.PipInstaller, pipEnvInstaller_1.PipEnvInstaller].forEach(installerClass => {
    // Proxy info is relevant only for PipInstaller.
    const proxyServers = installerClass === pipInstaller_1.PipInstaller ? ['', 'proxy:1234'] : [''];
    proxyServers.forEach(proxyServer => {
      [undefined, vscode_1.Uri.file('/users/dev/xyz')].forEach(resource => {
        // Conda info is relevant only for CondaInstaller.
        const condaEnvs = installerClass === condaInstaller_1.CondaInstaller ? [{
          name: 'My-Env01',
          path: ''
        }, {
          name: '',
          path: path.join('conda', 'path')
        }, {
          name: 'My-Env01 With Spaces',
          path: ''
        }, {
          name: '',
          path: path.join('conda with spaces', 'path')
        }] : [];
        [undefined, ...condaEnvs].forEach(condaEnvInfo => {
          const testProxySuffix = proxyServer.length === 0 ? 'without proxy info' : 'with proxy info';
          const testCondaEnv = condaEnvInfo ? condaEnvInfo.name ? 'without conda name' : 'with conda path' : 'without conda';
          const testSuite = [testProxySuffix, testCondaEnv].filter(item => item.length > 0).join(', ');
          suite(`${installerClass.name} (${testSuite})`, () => {
            let disposables = [];
            let installer;
            let installationChannel;
            let serviceContainer;
            let terminalService;
            let pythonSettings;
            let interpreterService;
            const condaExecutable = 'my.exe';
            setup(() => {
              serviceContainer = TypeMoq.Mock.ofType();
              disposables = [];
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_4.IDisposableRegistry), TypeMoq.It.isAny())).returns(() => disposables);
              installationChannel = TypeMoq.Mock.ofType();
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_2.IInstallationChannelManager), TypeMoq.It.isAny())).returns(() => installationChannel.object);
              const condaService = TypeMoq.Mock.ofType();
              condaService.setup(c => c.getCondaFile()).returns(() => Promise.resolve(condaExecutable));
              condaService.setup(c => c.getCondaEnvironment(TypeMoq.It.isAny())).returns(() => Promise.resolve(condaEnvInfo));
              const configService = TypeMoq.Mock.ofType();
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_4.IConfigurationService), TypeMoq.It.isAny())).returns(() => configService.object);
              pythonSettings = TypeMoq.Mock.ofType();
              pythonSettings.setup(p => p.pythonPath).returns(() => pythonPath);
              configService.setup(c => c.getSettings(TypeMoq.It.isAny())).returns(() => pythonSettings.object);
              terminalService = TypeMoq.Mock.ofType();
              const terminalServiceFactory = TypeMoq.Mock.ofType();
              terminalServiceFactory.setup(f => f.getTerminalService(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => terminalService.object);
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_3.ITerminalServiceFactory), TypeMoq.It.isAny())).returns(() => terminalServiceFactory.object);
              interpreterService = TypeMoq.Mock.ofType();
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(contracts_1.IInterpreterService), TypeMoq.It.isAny())).returns(() => interpreterService.object);
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(contracts_1.ICondaService), TypeMoq.It.isAny())).returns(() => condaService.object);
              const workspaceService = TypeMoq.Mock.ofType();
              serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_1.IWorkspaceService), TypeMoq.It.isAny())).returns(() => workspaceService.object);
              const http = TypeMoq.Mock.ofType();
              http.setup(h => h.get(TypeMoq.It.isValue('proxy'), TypeMoq.It.isAny())).returns(() => proxyServer);
              workspaceService.setup(w => w.getConfiguration(TypeMoq.It.isValue('http'))).returns(() => http.object);
              installer = new installerClass(serviceContainer.object);
            });
            teardown(() => {
              disposables.forEach(disposable => {
                if (disposable) {
                  disposable.dispose();
                }
              });
            });

            function setActiveInterpreter(activeInterpreter) {
              interpreterService.setup(i => i.getActiveInterpreter(TypeMoq.It.isValue(resource))).returns(() => Promise.resolve(activeInterpreter)).verifiable(TypeMoq.Times.atLeastOnce());
            }

            getModuleNamesForTesting().forEach(product => {
              const moduleName = product.moduleName;

              function installModuleAndVerifyCommand(command, expectedArgs) {
                return __awaiter(this, void 0, void 0, function* () {
                  terminalService.setup(t => t.sendCommand(TypeMoq.It.isValue(command), TypeMoq.It.isValue(expectedArgs))).returns(() => Promise.resolve()).verifiable(TypeMoq.Times.once());
                  yield installer.installModule(moduleName, resource);
                  terminalService.verifyAll();
                });
              }

              if (product.value === types_4.Product.pylint) {
                // tslint:disable-next-line:no-shadowed-variable
                generatePythonInterpreterVersions().forEach(interpreterInfo => {
                  const majorVersion = interpreterInfo.version_info[0];

                  if (majorVersion === 2) {
                    const testTitle = `Ensure install arg is \'pylint<2.0.0\' in ${interpreterInfo.version_info.join('.')}`;

                    if (installerClass === pipInstaller_1.PipInstaller) {
                      test(testTitle, () => __awaiter(void 0, void 0, void 0, function* () {
                        setActiveInterpreter(interpreterInfo);
                        const proxyArgs = proxyServer.length === 0 ? [] : ['--proxy', proxyServer];
                        const expectedArgs = ['-m', 'pip', ...proxyArgs, 'install', '-U', '"pylint<2.0.0"'];
                        yield installModuleAndVerifyCommand(pythonPath, expectedArgs);
                      }));
                    }

                    if (installerClass === pipEnvInstaller_1.PipEnvInstaller) {
                      test(testTitle, () => __awaiter(void 0, void 0, void 0, function* () {
                        setActiveInterpreter(interpreterInfo);
                        const expectedArgs = ['install', '"pylint<2.0.0"', '--dev'];
                        yield installModuleAndVerifyCommand(pipEnvInstaller_1.pipenvName, expectedArgs);
                      }));
                    }

                    if (installerClass === condaInstaller_1.CondaInstaller) {
                      test(testTitle, () => __awaiter(void 0, void 0, void 0, function* () {
                        setActiveInterpreter(interpreterInfo);
                        const expectedArgs = ['install'];

                        if (condaEnvInfo && condaEnvInfo.name) {
                          expectedArgs.push('--name');
                          expectedArgs.push(condaEnvInfo.name.toCommandArgument());
                        } else if (condaEnvInfo && condaEnvInfo.path) {
                          expectedArgs.push('--prefix');
                          expectedArgs.push(condaEnvInfo.path.fileToCommandArgument());
                        }

                        expectedArgs.push('"pylint<2.0.0"');
                        yield installModuleAndVerifyCommand(condaExecutable, expectedArgs);
                      }));
                    }
                  } else {
                    const testTitle = `Ensure install arg is \'pylint\' in ${interpreterInfo.version_info.join('.')}`;

                    if (installerClass === pipInstaller_1.PipInstaller) {
                      test(testTitle, () => __awaiter(void 0, void 0, void 0, function* () {
                        setActiveInterpreter(interpreterInfo);
                        const proxyArgs = proxyServer.length === 0 ? [] : ['--proxy', proxyServer];
                        const expectedArgs = ['-m', 'pip', ...proxyArgs, 'install', '-U', 'pylint'];
                        yield installModuleAndVerifyCommand(pythonPath, expectedArgs);
                      }));
                    }

                    if (installerClass === pipEnvInstaller_1.PipEnvInstaller) {
                      test(testTitle, () => __awaiter(void 0, void 0, void 0, function* () {
                        setActiveInterpreter(interpreterInfo);
                        const expectedArgs = ['install', 'pylint', '--dev'];
                        yield installModuleAndVerifyCommand(pipEnvInstaller_1.pipenvName, expectedArgs);
                      }));
                    }

                    if (installerClass === condaInstaller_1.CondaInstaller) {
                      test(testTitle, () => __awaiter(void 0, void 0, void 0, function* () {
                        setActiveInterpreter(interpreterInfo);
                        const expectedArgs = ['install'];

                        if (condaEnvInfo && condaEnvInfo.name) {
                          expectedArgs.push('--name');
                          expectedArgs.push(condaEnvInfo.name.toCommandArgument());
                        } else if (condaEnvInfo && condaEnvInfo.path) {
                          expectedArgs.push('--prefix');
                          expectedArgs.push(condaEnvInfo.path.fileToCommandArgument());
                        }

                        expectedArgs.push('pylint');
                        yield installModuleAndVerifyCommand(condaExecutable, expectedArgs);
                      }));
                    }
                  }
                });
                return;
              }

              if (installerClass === pipInstaller_1.PipInstaller) {
                test(`Ensure getActiveInterperter is used in PipInstaller (${product.name})`, () => __awaiter(void 0, void 0, void 0, function* () {
                  setActiveInterpreter();

                  try {
                    yield installer.installModule(product.name, resource);
                  } catch (_a) {
                    misc_1.noop();
                  }

                  interpreterService.verifyAll();
                }));
              }

              if (installerClass === pipInstaller_1.PipInstaller) {
                test(`Test Args (${product.name})`, () => __awaiter(void 0, void 0, void 0, function* () {
                  setActiveInterpreter();
                  const proxyArgs = proxyServer.length === 0 ? [] : ['--proxy', proxyServer];
                  const expectedArgs = ['-m', 'pip', ...proxyArgs, 'install', '-U', moduleName];
                  yield installModuleAndVerifyCommand(pythonPath, expectedArgs);
                  interpreterService.verifyAll();
                }));
              }

              if (installerClass === pipEnvInstaller_1.PipEnvInstaller) {
                test(`Test args (${product.name})`, () => __awaiter(void 0, void 0, void 0, function* () {
                  setActiveInterpreter();
                  const expectedArgs = ['install', moduleName, '--dev'];
                  yield installModuleAndVerifyCommand(pipEnvInstaller_1.pipenvName, expectedArgs);
                }));
              }

              if (installerClass === condaInstaller_1.CondaInstaller) {
                test(`Test args (${product.name})`, () => __awaiter(void 0, void 0, void 0, function* () {
                  setActiveInterpreter();
                  const expectedArgs = ['install'];

                  if (condaEnvInfo && condaEnvInfo.name) {
                    expectedArgs.push('--name');
                    expectedArgs.push(condaEnvInfo.name.toCommandArgument());
                  } else if (condaEnvInfo && condaEnvInfo.path) {
                    expectedArgs.push('--prefix');
                    expectedArgs.push(condaEnvInfo.path.fileToCommandArgument());
                  }

                  expectedArgs.push(moduleName);
                  yield installModuleAndVerifyCommand(condaExecutable, expectedArgs);
                }));
              }
            });
          });
        });
      });
    });
  });
});

function generatePythonInterpreterVersions() {
  const versions = [[2, 7, 0, 'final'], [3, 4, 0, 'final'], [3, 5, 0, 'final'], [3, 6, 0, 'final'], [3, 7, 0, 'final']];
  return versions.map(version => {
    const info = TypeMoq.Mock.ofType();
    info.setup(t => t.then).returns(() => undefined);
    info.setup(t => t.type).returns(() => contracts_1.InterpreterType.VirtualEnv);
    info.setup(t => t.version_info).returns(() => version);
    return info.object;
  });
}

function getModuleNamesForTesting() {
  return enum_1.getNamesAndValues(types_4.Product).map(product => {
    let moduleName = '';
    const mockSvc = TypeMoq.Mock.ofType().object;
    const mockOutChnl = TypeMoq.Mock.ofType().object;

    try {
      const prodInstaller = new productInstaller_1.ProductInstaller(mockSvc, mockOutChnl);
      moduleName = prodInstaller.translateProductToModuleName(product.value, types_4.ModuleNamePurpose.install);
      return {
        name: product.name,
        value: product.value,
        moduleName
      };
    } catch (_a) {
      return;
    }
  }).filter(item => item !== undefined);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZUluc3RhbGxlci51bml0LnRlc3QuanMiXSwibmFtZXMiOlsiX19hd2FpdGVyIiwidGhpc0FyZyIsIl9hcmd1bWVudHMiLCJQIiwiZ2VuZXJhdG9yIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJ2YWx1ZSIsInN0ZXAiLCJuZXh0IiwiZSIsInJlamVjdGVkIiwicmVzdWx0IiwiZG9uZSIsInRoZW4iLCJhcHBseSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInBhdGgiLCJyZXF1aXJlIiwiVHlwZU1vcSIsInZzY29kZV8xIiwidHlwZXNfMSIsImNvbmRhSW5zdGFsbGVyXzEiLCJwaXBFbnZJbnN0YWxsZXJfMSIsInBpcEluc3RhbGxlcl8xIiwicHJvZHVjdEluc3RhbGxlcl8xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJ0eXBlc180IiwiZW51bV8xIiwibWlzY18xIiwiY29udHJhY3RzXzEiLCJzdWl0ZSIsInB5dGhvblBhdGgiLCJqb2luIiwiX19kaXJuYW1lIiwiQ29uZGFJbnN0YWxsZXIiLCJQaXBJbnN0YWxsZXIiLCJQaXBFbnZJbnN0YWxsZXIiLCJmb3JFYWNoIiwiaW5zdGFsbGVyQ2xhc3MiLCJwcm94eVNlcnZlcnMiLCJwcm94eVNlcnZlciIsInVuZGVmaW5lZCIsIlVyaSIsImZpbGUiLCJyZXNvdXJjZSIsImNvbmRhRW52cyIsIm5hbWUiLCJjb25kYUVudkluZm8iLCJ0ZXN0UHJveHlTdWZmaXgiLCJsZW5ndGgiLCJ0ZXN0Q29uZGFFbnYiLCJ0ZXN0U3VpdGUiLCJmaWx0ZXIiLCJpdGVtIiwiZGlzcG9zYWJsZXMiLCJpbnN0YWxsZXIiLCJpbnN0YWxsYXRpb25DaGFubmVsIiwic2VydmljZUNvbnRhaW5lciIsInRlcm1pbmFsU2VydmljZSIsInB5dGhvblNldHRpbmdzIiwiaW50ZXJwcmV0ZXJTZXJ2aWNlIiwiY29uZGFFeGVjdXRhYmxlIiwic2V0dXAiLCJNb2NrIiwib2ZUeXBlIiwiYyIsImdldCIsIkl0IiwiaXNWYWx1ZSIsIklEaXNwb3NhYmxlUmVnaXN0cnkiLCJpc0FueSIsInJldHVybnMiLCJJSW5zdGFsbGF0aW9uQ2hhbm5lbE1hbmFnZXIiLCJvYmplY3QiLCJjb25kYVNlcnZpY2UiLCJnZXRDb25kYUZpbGUiLCJnZXRDb25kYUVudmlyb25tZW50IiwiY29uZmlnU2VydmljZSIsIklDb25maWd1cmF0aW9uU2VydmljZSIsInAiLCJnZXRTZXR0aW5ncyIsInRlcm1pbmFsU2VydmljZUZhY3RvcnkiLCJmIiwiZ2V0VGVybWluYWxTZXJ2aWNlIiwiSVRlcm1pbmFsU2VydmljZUZhY3RvcnkiLCJJSW50ZXJwcmV0ZXJTZXJ2aWNlIiwiSUNvbmRhU2VydmljZSIsIndvcmtzcGFjZVNlcnZpY2UiLCJJV29ya3NwYWNlU2VydmljZSIsImh0dHAiLCJoIiwidyIsImdldENvbmZpZ3VyYXRpb24iLCJ0ZWFyZG93biIsImRpc3Bvc2FibGUiLCJkaXNwb3NlIiwic2V0QWN0aXZlSW50ZXJwcmV0ZXIiLCJhY3RpdmVJbnRlcnByZXRlciIsImkiLCJnZXRBY3RpdmVJbnRlcnByZXRlciIsInZlcmlmaWFibGUiLCJUaW1lcyIsImF0TGVhc3RPbmNlIiwiZ2V0TW9kdWxlTmFtZXNGb3JUZXN0aW5nIiwicHJvZHVjdCIsIm1vZHVsZU5hbWUiLCJpbnN0YWxsTW9kdWxlQW5kVmVyaWZ5Q29tbWFuZCIsImNvbW1hbmQiLCJleHBlY3RlZEFyZ3MiLCJ0Iiwic2VuZENvbW1hbmQiLCJvbmNlIiwiaW5zdGFsbE1vZHVsZSIsInZlcmlmeUFsbCIsIlByb2R1Y3QiLCJweWxpbnQiLCJnZW5lcmF0ZVB5dGhvbkludGVycHJldGVyVmVyc2lvbnMiLCJpbnRlcnByZXRlckluZm8iLCJtYWpvclZlcnNpb24iLCJ2ZXJzaW9uX2luZm8iLCJ0ZXN0VGl0bGUiLCJ0ZXN0IiwicHJveHlBcmdzIiwicGlwZW52TmFtZSIsInB1c2giLCJ0b0NvbW1hbmRBcmd1bWVudCIsImZpbGVUb0NvbW1hbmRBcmd1bWVudCIsIl9hIiwibm9vcCIsInZlcnNpb25zIiwibWFwIiwidmVyc2lvbiIsImluZm8iLCJ0eXBlIiwiSW50ZXJwcmV0ZXJUeXBlIiwiVmlydHVhbEVudiIsImdldE5hbWVzQW5kVmFsdWVzIiwibW9ja1N2YyIsIm1vY2tPdXRDaG5sIiwicHJvZEluc3RhbGxlciIsIlByb2R1Y3RJbnN0YWxsZXIiLCJ0cmFuc2xhdGVQcm9kdWN0VG9Nb2R1bGVOYW1lIiwiTW9kdWxlTmFtZVB1cnBvc2UiLCJpbnN0YWxsIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsU0FBUyxHQUFJLFVBQVEsU0FBS0EsU0FBZCxJQUE0QixVQUFVQyxPQUFWLEVBQW1CQyxVQUFuQixFQUErQkMsQ0FBL0IsRUFBa0NDLFNBQWxDLEVBQTZDO0FBQ3JGLFNBQU8sS0FBS0QsQ0FBQyxLQUFLQSxDQUFDLEdBQUdFLE9BQVQsQ0FBTixFQUF5QixVQUFVQyxPQUFWLEVBQW1CQyxNQUFuQixFQUEyQjtBQUN2RCxhQUFTQyxTQUFULENBQW1CQyxLQUFuQixFQUEwQjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUNPLElBQVYsQ0FBZUYsS0FBZixDQUFELENBQUo7QUFBOEIsT0FBcEMsQ0FBcUMsT0FBT0csQ0FBUCxFQUFVO0FBQUVMLFFBQUFBLE1BQU0sQ0FBQ0ssQ0FBRCxDQUFOO0FBQVk7QUFBRTs7QUFDM0YsYUFBU0MsUUFBVCxDQUFrQkosS0FBbEIsRUFBeUI7QUFBRSxVQUFJO0FBQUVDLFFBQUFBLElBQUksQ0FBQ04sU0FBUyxDQUFDLE9BQUQsQ0FBVCxDQUFtQkssS0FBbkIsQ0FBRCxDQUFKO0FBQWtDLE9BQXhDLENBQXlDLE9BQU9HLENBQVAsRUFBVTtBQUFFTCxRQUFBQSxNQUFNLENBQUNLLENBQUQsQ0FBTjtBQUFZO0FBQUU7O0FBQzlGLGFBQVNGLElBQVQsQ0FBY0ksTUFBZCxFQUFzQjtBQUFFQSxNQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBY1QsT0FBTyxDQUFDUSxNQUFNLENBQUNMLEtB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c0JTLE1BQXRDO0FBQ0EsVUFBTWlFLFdBQVcsR0FBR3pILE9BQU8sQ0FBQzhDLElBQVIsQ0FBYUMsTUFBYixHQUFzQlMsTUFBMUM7O0FBQ0EsUUFBSTtBQUNBLFlBQU1rRSxhQUFhLEdBQUcsSUFBSXBILGtCQUFrQixDQUFDcUgsZ0JBQXZCLENBQXdDSCxPQUF4QyxFQUFpREMsV0FBakQsQ0FBdEI7QUFDQWpDLE1BQUFBLFVBQVUsR0FBR2tDLGFBQWEsQ0FBQ0UsNEJBQWQsQ0FBMkNyQyxPQUFPLENBQUNyRyxLQUFuRCxFQUEwRHVCLE9BQU8sQ0FBQ29ILGlCQUFSLENBQTBCQyxPQUFwRixDQUFiO0FBQ0EsYUFBTztBQUFFakcsUUFBQUEsSUFBSSxFQUFFMEQsT0FBTyxDQUFDMUQsSUFBaEI7QUFBc0IzQyxRQUFBQSxLQUFLLEVBQUVxRyxPQUFPLENBQUNyRyxLQUFyQztBQUE0Q3NHLFFBQUFBO0FBQTVDLE9BQVA7QUFDSCxLQUpELENBS0EsT0FBT3NCLEVBQVAsRUFBVztBQUNQO0FBQ0g7QUFDSixHQWJNLEVBY0YzRSxNQWRFLENBY0tDLElBQUksSUFBSUEsSUFBSSxLQUFLWixTQWR0QixDQUFQO0FBZUgiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuLy8gdHNsaW50OmRpc2FibGU6bm8tYW55IG1heC1mdW5jLWJvZHktbGVuZ3RoIG5vLWludmFsaWQtdGhpc1xyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbmNvbnN0IFR5cGVNb3EgPSByZXF1aXJlKFwidHlwZW1vcVwiKTtcclxuY29uc3QgdnNjb2RlXzEgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC9jb21tb24vYXBwbGljYXRpb24vdHlwZXNcIik7XHJcbmNvbnN0IGNvbmRhSW5zdGFsbGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L2NvbW1vbi9pbnN0YWxsZXIvY29uZGFJbnN0YWxsZXJcIik7XHJcbmNvbnN0IHBpcEVudkluc3RhbGxlcl8xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC9jb21tb24vaW5zdGFsbGVyL3BpcEVudkluc3RhbGxlclwiKTtcclxuY29uc3QgcGlwSW5zdGFsbGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L2NvbW1vbi9pbnN0YWxsZXIvcGlwSW5zdGFsbGVyXCIpO1xyXG5jb25zdCBwcm9kdWN0SW5zdGFsbGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L2NvbW1vbi9pbnN0YWxsZXIvcHJvZHVjdEluc3RhbGxlclwiKTtcclxuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvY29tbW9uL2luc3RhbGxlci90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfMyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvY29tbW9uL3Rlcm1pbmFsL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc180ID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IGVudW1fMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvY29tbW9uL3V0aWxzL2VudW1cIik7XHJcbmNvbnN0IG1pc2NfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvY29tbW9uL3V0aWxzL21pc2NcIik7XHJcbmNvbnN0IGNvbnRyYWN0c18xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC9pbnRlcnByZXRlci9jb250cmFjdHNcIik7XHJcbi8qIENvbXBsZXggdGVzdCB0byBlbnN1cmUgd2UgY292ZXIgYWxsIGNvbWJpbmF0aW9uczpcclxuV2UgY291bGQgaGF2ZSB3cml0dGVuIHNlcGFyYXRlIHRlc3RzIGZvciBlYWNoIGluc3RhbGxlciwgYnV0IHdlJ2QgYmUgcmVwbGljYXRlIGNvZGUuXHJcbkJvdGggYXBwcm9hY2hzIGhhdmUgdGhlaXIgYmVuZWZpdHMuXHJcblxyXG5Db21uYmluYXRpb25zIG9mOlxyXG4xLiBXaXRoIGFuZCB3aXRob3V0IGEgd29ya3NwYWNlLlxyXG4yLiBIdHRwIFByb3h5IGNvbmZpZ3VyYXRpb24uXHJcbjMuIEFsbCBwcm9kdWN0cy5cclxuNC4gRGlmZmVyZW50IHZlcnNpb25zIG9mIFB5dGhvbi5cclxuNS4gV2l0aCBhbmQgd2l0aG91dCBjb25kYS5cclxuNi4gQ29uZGEgZW52aXJvbm1lbnRzIHdpdGggbmFtZXMgYW5kIHdpdGhvdXQgbmFtZXMuXHJcbjcuIEFsbCBpbnN0YWxsZXJzLlxyXG4qL1xyXG5zdWl0ZSgnTW9kdWxlIEluc3RhbGxlcicsICgpID0+IHtcclxuICAgIGNvbnN0IHB5dGhvblBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAncHl0aG9uJyk7XHJcbiAgICBbY29uZGFJbnN0YWxsZXJfMS5Db25kYUluc3RhbGxlciwgcGlwSW5zdGFsbGVyXzEuUGlwSW5zdGFsbGVyLCBwaXBFbnZJbnN0YWxsZXJfMS5QaXBFbnZJbnN0YWxsZXJdLmZvckVhY2goaW5zdGFsbGVyQ2xhc3MgPT4ge1xyXG4gICAgICAgIC8vIFByb3h5IGluZm8gaXMgcmVsZXZhbnQgb25seSBmb3IgUGlwSW5zdGFsbGVyLlxyXG4gICAgICAgIGNvbnN0IHByb3h5U2VydmVycyA9IGluc3RhbGxlckNsYXNzID09PSBwaXBJbnN0YWxsZXJfMS5QaXBJbnN0YWxsZXIgPyBbJycsICdwcm94eToxMjM0J10gOiBbJyddO1xyXG4gICAgICAgIHByb3h5U2VydmVycy5mb3JFYWNoKHByb3h5U2VydmVyID0+IHtcclxuICAgICAgICAgICAgW3VuZGVmaW5lZCwgdnNjb2RlXzEuVXJpLmZpbGUoJy91c2Vycy9kZXYveHl6JyldLmZvckVhY2gocmVzb3VyY2UgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gQ29uZGEgaW5mbyBpcyByZWxldmFudCBvbmx5IGZvciBDb25kYUluc3RhbGxlci5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRhRW52cyA9IGluc3RhbGxlckNsYXNzID09PSBjb25kYUluc3RhbGxlcl8xLkNvbmRhSW5zdGFsbGVyID8gW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgbmFtZTogJ015LUVudjAxJywgcGF0aDogJycgfSwgeyBuYW1lOiAnJywgcGF0aDogcGF0aC5qb2luKCdjb25kYScsICdwYXRoJykgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IG5hbWU6ICdNeS1FbnYwMSBXaXRoIFNwYWNlcycsIHBhdGg6ICcnIH0sIHsgbmFtZTogJycsIHBhdGg6IHBhdGguam9pbignY29uZGEgd2l0aCBzcGFjZXMnLCAncGF0aCcpIH1cclxuICAgICAgICAgICAgICAgIF0gOiBbXTtcclxuICAgICAgICAgICAgICAgIFt1bmRlZmluZWQsIC4uLmNvbmRhRW52c10uZm9yRWFjaChjb25kYUVudkluZm8gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RQcm94eVN1ZmZpeCA9IHByb3h5U2VydmVyLmxlbmd0aCA9PT0gMCA/ICd3aXRob3V0IHByb3h5IGluZm8nIDogJ3dpdGggcHJveHkgaW5mbyc7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVzdENvbmRhRW52ID0gY29uZGFFbnZJbmZvID8gKGNvbmRhRW52SW5mby5uYW1lID8gJ3dpdGhvdXQgY29uZGEgbmFtZScgOiAnd2l0aCBjb25kYSBwYXRoJykgOiAnd2l0aG91dCBjb25kYSc7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVzdFN1aXRlID0gW3Rlc3RQcm94eVN1ZmZpeCwgdGVzdENvbmRhRW52XS5maWx0ZXIoaXRlbSA9PiBpdGVtLmxlbmd0aCA+IDApLmpvaW4oJywgJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VpdGUoYCR7aW5zdGFsbGVyQ2xhc3MubmFtZX0gKCR7dGVzdFN1aXRlfSlgLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXNwb3NhYmxlcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5zdGFsbGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5zdGFsbGF0aW9uQ2hhbm5lbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXJtaW5hbFNlcnZpY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBweXRob25TZXR0aW5ncztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludGVycHJldGVyU2VydmljZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZGFFeGVjdXRhYmxlID0gJ215LmV4ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHVwKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZpY2VDb250YWluZXIgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwb3NhYmxlcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VydmljZUNvbnRhaW5lci5zZXR1cChjID0+IGMuZ2V0KFR5cGVNb3EuSXQuaXNWYWx1ZSh0eXBlc180LklEaXNwb3NhYmxlUmVnaXN0cnkpLCBUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IGRpc3Bvc2FibGVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkNoYW5uZWwgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlQ29udGFpbmVyLnNldHVwKGMgPT4gYy5nZXQoVHlwZU1vcS5JdC5pc1ZhbHVlKHR5cGVzXzIuSUluc3RhbGxhdGlvbkNoYW5uZWxNYW5hZ2VyKSwgVHlwZU1vcS5JdC5pc0FueSgpKSkucmV0dXJucygoKSA9PiBpbnN0YWxsYXRpb25DaGFubmVsLm9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25kYVNlcnZpY2UgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25kYVNlcnZpY2Uuc2V0dXAoYyA9PiBjLmdldENvbmRhRmlsZSgpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZShjb25kYUV4ZWN1dGFibGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmRhU2VydmljZS5zZXR1cChjID0+IGMuZ2V0Q29uZGFFbnZpcm9ubWVudChUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZShjb25kYUVudkluZm8pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZpZ1NlcnZpY2UgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlQ29udGFpbmVyLnNldHVwKGMgPT4gYy5nZXQoVHlwZU1vcS5JdC5pc1ZhbHVlKHR5cGVzXzQuSUNvbmZpZ3VyYXRpb25TZXJ2aWNlKSwgVHlwZU1vcS5JdC5pc0FueSgpKSkucmV0dXJucygoKSA9PiBjb25maWdTZXJ2aWNlLm9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBweXRob25TZXR0aW5ncyA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB5dGhvblNldHRpbmdzLnNldHVwKHAgPT4gcC5weXRob25QYXRoKS5yZXR1cm5zKCgpID0+IHB5dGhvblBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnU2VydmljZS5zZXR1cChjID0+IGMuZ2V0U2V0dGluZ3MoVHlwZU1vcS5JdC5pc0FueSgpKSkucmV0dXJucygoKSA9PiBweXRob25TZXR0aW5ncy5vYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVybWluYWxTZXJ2aWNlID0gVHlwZU1vcS5Nb2NrLm9mVHlwZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVybWluYWxTZXJ2aWNlRmFjdG9yeSA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlcm1pbmFsU2VydmljZUZhY3Rvcnkuc2V0dXAoZiA9PiBmLmdldFRlcm1pbmFsU2VydmljZShUeXBlTW9xLkl0LmlzQW55KCksIFR5cGVNb3EuSXQuaXNBbnkoKSkpLnJldHVybnMoKCkgPT4gdGVybWluYWxTZXJ2aWNlLm9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlQ29udGFpbmVyLnNldHVwKGMgPT4gYy5nZXQoVHlwZU1vcS5JdC5pc1ZhbHVlKHR5cGVzXzMuSVRlcm1pbmFsU2VydmljZUZhY3RvcnkpLCBUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IHRlcm1pbmFsU2VydmljZUZhY3Rvcnkub2JqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyU2VydmljZSA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZpY2VDb250YWluZXIuc2V0dXAoYyA9PiBjLmdldChUeXBlTW9xLkl0LmlzVmFsdWUoY29udHJhY3RzXzEuSUludGVycHJldGVyU2VydmljZSksIFR5cGVNb3EuSXQuaXNBbnkoKSkpLnJldHVybnMoKCkgPT4gaW50ZXJwcmV0ZXJTZXJ2aWNlLm9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlQ29udGFpbmVyLnNldHVwKGMgPT4gYy5nZXQoVHlwZU1vcS5JdC5pc1ZhbHVlKGNvbnRyYWN0c18xLklDb25kYVNlcnZpY2UpLCBUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IGNvbmRhU2VydmljZS5vYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd29ya3NwYWNlU2VydmljZSA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZpY2VDb250YWluZXIuc2V0dXAoYyA9PiBjLmdldChUeXBlTW9xLkl0LmlzVmFsdWUodHlwZXNfMS5JV29ya3NwYWNlU2VydmljZSksIFR5cGVNb3EuSXQuaXNBbnkoKSkpLnJldHVybnMoKCkgPT4gd29ya3NwYWNlU2VydmljZS5vYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHR0cCA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0dHAuc2V0dXAoaCA9PiBoLmdldChUeXBlTW9xLkl0LmlzVmFsdWUoJ3Byb3h5JyksIFR5cGVNb3EuSXQuaXNBbnkoKSkpLnJldHVybnMoKCkgPT4gcHJveHlTZXJ2ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya3NwYWNlU2VydmljZS5zZXR1cCh3ID0+IHcuZ2V0Q29uZmlndXJhdGlvbihUeXBlTW9xLkl0LmlzVmFsdWUoJ2h0dHAnKSkpLnJldHVybnMoKCkgPT4gaHR0cC5vYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFsbGVyID0gbmV3IGluc3RhbGxlckNsYXNzKHNlcnZpY2VDb250YWluZXIub2JqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlYXJkb3duKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3Bvc2FibGVzLmZvckVhY2goZGlzcG9zYWJsZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3Bvc2FibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZXRBY3RpdmVJbnRlcnByZXRlcihhY3RpdmVJbnRlcnByZXRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXJTZXJ2aWNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNldHVwKGkgPT4gaS5nZXRBY3RpdmVJbnRlcnByZXRlcihUeXBlTW9xLkl0LmlzVmFsdWUocmVzb3VyY2UpKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmV0dXJucygoKSA9PiBQcm9taXNlLnJlc29sdmUoYWN0aXZlSW50ZXJwcmV0ZXIpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC52ZXJpZmlhYmxlKFR5cGVNb3EuVGltZXMuYXRMZWFzdE9uY2UoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0TW9kdWxlTmFtZXNGb3JUZXN0aW5nKCkuZm9yRWFjaChwcm9kdWN0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBwcm9kdWN0Lm1vZHVsZU5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnN0YWxsTW9kdWxlQW5kVmVyaWZ5Q29tbWFuZChjb21tYW5kLCBleHBlY3RlZEFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXJtaW5hbFNlcnZpY2Uuc2V0dXAodCA9PiB0LnNlbmRDb21tYW5kKFR5cGVNb3EuSXQuaXNWYWx1ZShjb21tYW5kKSwgVHlwZU1vcS5JdC5pc1ZhbHVlKGV4cGVjdGVkQXJncykpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJldHVybnMoKCkgPT4gUHJvbWlzZS5yZXNvbHZlKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudmVyaWZpYWJsZShUeXBlTW9xLlRpbWVzLm9uY2UoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxlci5pbnN0YWxsTW9kdWxlKG1vZHVsZU5hbWUsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVybWluYWxTZXJ2aWNlLnZlcmlmeUFsbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QudmFsdWUgPT09IHR5cGVzXzQuUHJvZHVjdC5weWxpbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tc2hhZG93ZWQtdmFyaWFibGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZVB5dGhvbkludGVycHJldGVyVmVyc2lvbnMoKS5mb3JFYWNoKGludGVycHJldGVySW5mbyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ham9yVmVyc2lvbiA9IGludGVycHJldGVySW5mby52ZXJzaW9uX2luZm9bMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYWpvclZlcnNpb24gPT09IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RUaXRsZSA9IGBFbnN1cmUgaW5zdGFsbCBhcmcgaXMgXFwncHlsaW50PDIuMC4wXFwnIGluICR7aW50ZXJwcmV0ZXJJbmZvLnZlcnNpb25faW5mby5qb2luKCcuJyl9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YWxsZXJDbGFzcyA9PT0gcGlwSW5zdGFsbGVyXzEuUGlwSW5zdGFsbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdCh0ZXN0VGl0bGUsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QWN0aXZlSW50ZXJwcmV0ZXIoaW50ZXJwcmV0ZXJJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJveHlBcmdzID0gcHJveHlTZXJ2ZXIubGVuZ3RoID09PSAwID8gW10gOiBbJy0tcHJveHknLCBwcm94eVNlcnZlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkQXJncyA9IFsnLW0nLCAncGlwJywgLi4ucHJveHlBcmdzLCAnaW5zdGFsbCcsICctVScsICdcInB5bGludDwyLjAuMFwiJ107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxNb2R1bGVBbmRWZXJpZnlDb21tYW5kKHB5dGhvblBhdGgsIGV4cGVjdGVkQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbGxlckNsYXNzID09PSBwaXBFbnZJbnN0YWxsZXJfMS5QaXBFbnZJbnN0YWxsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0KHRlc3RUaXRsZSwgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRBY3RpdmVJbnRlcnByZXRlcihpbnRlcnByZXRlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZEFyZ3MgPSBbJ2luc3RhbGwnLCAnXCJweWxpbnQ8Mi4wLjBcIicsICctLWRldiddO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCBpbnN0YWxsTW9kdWxlQW5kVmVyaWZ5Q29tbWFuZChwaXBFbnZJbnN0YWxsZXJfMS5waXBlbnZOYW1lLCBleHBlY3RlZEFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YWxsZXJDbGFzcyA9PT0gY29uZGFJbnN0YWxsZXJfMS5Db25kYUluc3RhbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QodGVzdFRpdGxlLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEFjdGl2ZUludGVycHJldGVyKGludGVycHJldGVySW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkQXJncyA9IFsnaW5zdGFsbCddO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29uZGFFbnZJbmZvICYmIGNvbmRhRW52SW5mby5uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZEFyZ3MucHVzaCgnLS1uYW1lJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZEFyZ3MucHVzaChjb25kYUVudkluZm8ubmFtZS50b0NvbW1hbmRBcmd1bWVudCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb25kYUVudkluZm8gJiYgY29uZGFFbnZJbmZvLnBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQXJncy5wdXNoKCctLXByZWZpeCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRBcmdzLnB1c2goY29uZGFFbnZJbmZvLnBhdGguZmlsZVRvQ29tbWFuZEFyZ3VtZW50KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQXJncy5wdXNoKCdcInB5bGludDwyLjAuMFwiJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxNb2R1bGVBbmRWZXJpZnlDb21tYW5kKGNvbmRhRXhlY3V0YWJsZSwgZXhwZWN0ZWRBcmdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0VGl0bGUgPSBgRW5zdXJlIGluc3RhbGwgYXJnIGlzIFxcJ3B5bGludFxcJyBpbiAke2ludGVycHJldGVySW5mby52ZXJzaW9uX2luZm8uam9pbignLicpfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdGFsbGVyQ2xhc3MgPT09IHBpcEluc3RhbGxlcl8xLlBpcEluc3RhbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QodGVzdFRpdGxlLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEFjdGl2ZUludGVycHJldGVyKGludGVycHJldGVySW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3h5QXJncyA9IHByb3h5U2VydmVyLmxlbmd0aCA9PT0gMCA/IFtdIDogWyctLXByb3h5JywgcHJveHlTZXJ2ZXJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZEFyZ3MgPSBbJy1tJywgJ3BpcCcsIC4uLnByb3h5QXJncywgJ2luc3RhbGwnLCAnLVUnLCAncHlsaW50J107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxNb2R1bGVBbmRWZXJpZnlDb21tYW5kKHB5dGhvblBhdGgsIGV4cGVjdGVkQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbGxlckNsYXNzID09PSBwaXBFbnZJbnN0YWxsZXJfMS5QaXBFbnZJbnN0YWxsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0KHRlc3RUaXRsZSwgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRBY3RpdmVJbnRlcnByZXRlcihpbnRlcnByZXRlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZEFyZ3MgPSBbJ2luc3RhbGwnLCAncHlsaW50JywgJy0tZGV2J107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxNb2R1bGVBbmRWZXJpZnlDb21tYW5kKHBpcEVudkluc3RhbGxlcl8xLnBpcGVudk5hbWUsIGV4cGVjdGVkQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbGxlckNsYXNzID09PSBjb25kYUluc3RhbGxlcl8xLkNvbmRhSW5zdGFsbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdCh0ZXN0VGl0bGUsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QWN0aXZlSW50ZXJwcmV0ZXIoaW50ZXJwcmV0ZXJJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRBcmdzID0gWydpbnN0YWxsJ107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25kYUVudkluZm8gJiYgY29uZGFFbnZJbmZvLm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQXJncy5wdXNoKCctLW5hbWUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQXJncy5wdXNoKGNvbmRhRW52SW5mby5uYW1lLnRvQ29tbWFuZEFyZ3VtZW50KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGNvbmRhRW52SW5mbyAmJiBjb25kYUVudkluZm8ucGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRBcmdzLnB1c2goJy0tcHJlZml4Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZEFyZ3MucHVzaChjb25kYUVudkluZm8ucGF0aC5maWxlVG9Db21tYW5kQXJndW1lbnQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRBcmdzLnB1c2goJ3B5bGludCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCBpbnN0YWxsTW9kdWxlQW5kVmVyaWZ5Q29tbWFuZChjb25kYUV4ZWN1dGFibGUsIGV4cGVjdGVkQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbGxlckNsYXNzID09PSBwaXBJbnN0YWxsZXJfMS5QaXBJbnN0YWxsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0KGBFbnN1cmUgZ2V0QWN0aXZlSW50ZXJwZXJ0ZXIgaXMgdXNlZCBpbiBQaXBJbnN0YWxsZXIgKCR7cHJvZHVjdC5uYW1lfSlgLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEFjdGl2ZUludGVycHJldGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCBpbnN0YWxsZXIuaW5zdGFsbE1vZHVsZShwcm9kdWN0Lm5hbWUsIHJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoX2EpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc2NfMS5ub29wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXJTZXJ2aWNlLnZlcmlmeUFsbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YWxsZXJDbGFzcyA9PT0gcGlwSW5zdGFsbGVyXzEuUGlwSW5zdGFsbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdChgVGVzdCBBcmdzICgke3Byb2R1Y3QubmFtZX0pYCwgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRBY3RpdmVJbnRlcnByZXRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm94eUFyZ3MgPSBwcm94eVNlcnZlci5sZW5ndGggPT09IDAgPyBbXSA6IFsnLS1wcm94eScsIHByb3h5U2VydmVyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRBcmdzID0gWyctbScsICdwaXAnLCAuLi5wcm94eUFyZ3MsICdpbnN0YWxsJywgJy1VJywgbW9kdWxlTmFtZV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxNb2R1bGVBbmRWZXJpZnlDb21tYW5kKHB5dGhvblBhdGgsIGV4cGVjdGVkQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyU2VydmljZS52ZXJpZnlBbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdGFsbGVyQ2xhc3MgPT09IHBpcEVudkluc3RhbGxlcl8xLlBpcEVudkluc3RhbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QoYFRlc3QgYXJncyAoJHtwcm9kdWN0Lm5hbWV9KWAsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QWN0aXZlSW50ZXJwcmV0ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRBcmdzID0gWydpbnN0YWxsJywgbW9kdWxlTmFtZSwgJy0tZGV2J107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGluc3RhbGxNb2R1bGVBbmRWZXJpZnlDb21tYW5kKHBpcEVudkluc3RhbGxlcl8xLnBpcGVudk5hbWUsIGV4cGVjdGVkQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbGxlckNsYXNzID09PSBjb25kYUluc3RhbGxlcl8xLkNvbmRhSW5zdGFsbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdChgVGVzdCBhcmdzICgke3Byb2R1Y3QubmFtZX0pYCwgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRBY3RpdmVJbnRlcnByZXRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZEFyZ3MgPSBbJ2luc3RhbGwnXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmRhRW52SW5mbyAmJiBjb25kYUVudkluZm8ubmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRBcmdzLnB1c2goJy0tbmFtZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRBcmdzLnB1c2goY29uZGFFbnZJbmZvLm5hbWUudG9Db21tYW5kQXJndW1lbnQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uZGFFbnZJbmZvICYmIGNvbmRhRW52SW5mby5wYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZEFyZ3MucHVzaCgnLS1wcmVmaXgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQXJncy5wdXNoKGNvbmRhRW52SW5mby5wYXRoLmZpbGVUb0NvbW1hbmRBcmd1bWVudCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZEFyZ3MucHVzaChtb2R1bGVOYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgaW5zdGFsbE1vZHVsZUFuZFZlcmlmeUNvbW1hbmQoY29uZGFFeGVjdXRhYmxlLCBleHBlY3RlZEFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufSk7XHJcbmZ1bmN0aW9uIGdlbmVyYXRlUHl0aG9uSW50ZXJwcmV0ZXJWZXJzaW9ucygpIHtcclxuICAgIGNvbnN0IHZlcnNpb25zID0gW1syLCA3LCAwLCAnZmluYWwnXSwgWzMsIDQsIDAsICdmaW5hbCddLCBbMywgNSwgMCwgJ2ZpbmFsJ10sIFszLCA2LCAwLCAnZmluYWwnXSwgWzMsIDcsIDAsICdmaW5hbCddXTtcclxuICAgIHJldHVybiB2ZXJzaW9ucy5tYXAodmVyc2lvbiA9PiB7XHJcbiAgICAgICAgY29uc3QgaW5mbyA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICBpbmZvLnNldHVwKCh0KSA9PiB0LnRoZW4pLnJldHVybnMoKCkgPT4gdW5kZWZpbmVkKTtcclxuICAgICAgICBpbmZvLnNldHVwKHQgPT4gdC50eXBlKS5yZXR1cm5zKCgpID0+IGNvbnRyYWN0c18xLkludGVycHJldGVyVHlwZS5WaXJ0dWFsRW52KTtcclxuICAgICAgICBpbmZvLnNldHVwKHQgPT4gdC52ZXJzaW9uX2luZm8pLnJldHVybnMoKCkgPT4gdmVyc2lvbik7XHJcbiAgICAgICAgcmV0dXJuIGluZm8ub2JqZWN0O1xyXG4gICAgfSk7XHJcbn1cclxuZnVuY3Rpb24gZ2V0TW9kdWxlTmFtZXNGb3JUZXN0aW5nKCkge1xyXG4gICAgcmV0dXJuIGVudW1fMS5nZXROYW1lc0FuZFZhbHVlcyh0eXBlc180LlByb2R1Y3QpXHJcbiAgICAgICAgLm1hcChwcm9kdWN0ID0+IHtcclxuICAgICAgICBsZXQgbW9kdWxlTmFtZSA9ICcnO1xyXG4gICAgICAgIGNvbnN0IG1vY2tTdmMgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCkub2JqZWN0O1xyXG4gICAgICAgIGNvbnN0IG1vY2tPdXRDaG5sID0gVHlwZU1vcS5Nb2NrLm9mVHlwZSgpLm9iamVjdDtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9kSW5zdGFsbGVyID0gbmV3IHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0SW5zdGFsbGVyKG1vY2tTdmMsIG1vY2tPdXRDaG5sKTtcclxuICAgICAgICAgICAgbW9kdWxlTmFtZSA9IHByb2RJbnN0YWxsZXIudHJhbnNsYXRlUHJvZHVjdFRvTW9kdWxlTmFtZShwcm9kdWN0LnZhbHVlLCB0eXBlc180Lk1vZHVsZU5hbWVQdXJwb3NlLmluc3RhbGwpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBuYW1lOiBwcm9kdWN0Lm5hbWUsIHZhbHVlOiBwcm9kdWN0LnZhbHVlLCBtb2R1bGVOYW1lIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChfYSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuICAgICAgICAuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPT0gdW5kZWZpbmVkKTtcclxufVxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1tb2R1bGVJbnN0YWxsZXIudW5pdC50ZXN0LmpzLm1hcCJdfQ==