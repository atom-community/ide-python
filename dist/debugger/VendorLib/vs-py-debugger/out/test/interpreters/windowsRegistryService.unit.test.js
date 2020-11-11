"use strict";

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

const assert = require("assert");

const path = require("path");

const TypeMoq = require("typemoq");

const types_1 = require("../../client/common/platform/types");

const types_2 = require("../../client/common/types");

const platform_1 = require("../../client/common/utils/platform");

const contracts_1 = require("../../client/interpreter/contracts");

const windowsRegistryService_1 = require("../../client/interpreter/locators/services/windowsRegistryService");

const mocks_1 = require("./mocks");

const environmentsPath = path.join(__dirname, '..', '..', '..', 'src', 'test', 'pythonFiles', 'environments'); // tslint:disable-next-line:max-func-body-length

suite('Interpreters from Windows Registry (unit)', () => {
  let serviceContainer;
  let interpreterHelper;
  setup(() => {
    serviceContainer = TypeMoq.Mock.ofType();
    const stateFactory = TypeMoq.Mock.ofType();
    interpreterHelper = TypeMoq.Mock.ofType();
    const pathUtils = TypeMoq.Mock.ofType();
    serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_2.IPersistentStateFactory))).returns(() => stateFactory.object);
    serviceContainer.setup(c => c.get(TypeMoq.It.isValue(contracts_1.IInterpreterHelper))).returns(() => interpreterHelper.object);
    serviceContainer.setup(c => c.get(TypeMoq.It.isValue(types_2.IPathUtils))).returns(() => pathUtils.object);
    pathUtils.setup(p => p.basename(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(p => p.split(/[\\,\/]/).reverse()[0]);
    const state = new mocks_1.MockState(undefined); // tslint:disable-next-line:no-empty no-any

    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({}));
    stateFactory.setup(s => s.createGlobalPersistentState(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => state);
  });
  test('Must return an empty list (x86)', () => __awaiter(void 0, void 0, void 0, function* () {
    const registry = new mocks_1.MockRegistry([], []);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 0, 'Incorrect number of entries');
  }));
  test('Must return an empty list (x64)', () => __awaiter(void 0, void 0, void 0, function* () {
    const registry = new mocks_1.MockRegistry([], []);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, true, serviceContainer.object);
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 0, 'Incorrect number of entries');
  }));
  test('Must return a single entry', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One']
    }, {
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One\\Tag1']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Display Name for Company One',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1')
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1', 'one.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Version.Tag1',
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag1',
      name: 'DisplayName'
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    interpreterHelper.reset();
    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({
      architecture: platform_1.Architecture.x86
    }));
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 1, 'Incorrect number of entries');
    assert.equal(interpreters[0].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[0].companyDisplayName, 'Display Name for Company One', 'Incorrect company name');
    assert.equal(interpreters[0].path, path.join(environmentsPath, 'path1', 'one.exe'), 'Incorrect executable path');
    assert.equal(interpreters[0].version, 'Version.Tag1', 'Incorrect version');
  }));
  test('Must default names for PythonCore and exe', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\PythonCore']
    }, {
      key: '\\Software\\Python\\PythonCore',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\PythonCore\\Tag1']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\PythonCore\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1')
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    interpreterHelper.reset();
    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({
      architecture: platform_1.Architecture.x86
    }));
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 1, 'Incorrect number of entries');
    assert.equal(interpreters[0].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[0].companyDisplayName, 'Python Software Foundation', 'Incorrect company name');
    assert.equal(interpreters[0].path, path.join(environmentsPath, 'path1', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[0].version, 'Tag1', 'Incorrect version');
  }));
  test('Must ignore company \'PyLauncher\'', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\PyLauncher']
    }, {
      key: '\\Software\\Python\\PythonCore',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\PyLauncher\\Tag1']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\PyLauncher\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'c:/temp/Install Path Tag1'
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 0, 'Incorrect number of entries');
  }));
  test('Must return a single entry and when registry contains only the InstallPath', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One']
    }, {
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One\\Tag1']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1')
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    interpreterHelper.reset();
    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({
      architecture: platform_1.Architecture.x86
    }));
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 1, 'Incorrect number of entries');
    assert.equal(interpreters[0].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[0].companyDisplayName, 'Company One', 'Incorrect company name');
    assert.equal(interpreters[0].path, path.join(environmentsPath, 'path1', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[0].version, 'Tag1', 'Incorrect version');
  }));
  test('Must return multiple entries', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One', '\\Software\\Python\\Company Two', '\\Software\\Python\\Company Three']
    }, {
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One\\Tag1', '\\Software\\Python\\Company One\\Tag2']
    }, {
      key: '\\Software\\Python\\Company Two',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Two\\Tag A', '\\Software\\Python\\Company Two\\Tag B', '\\Software\\Python\\Company Two\\Tag C']
    }, {
      key: '\\Software\\Python\\Company Three',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Three\\Tag !']
    }, {
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      values: ['A']
    }, {
      key: '\\Software\\Python\\Company A',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      values: ['Another Tag']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Display Name for Company One',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1')
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1', 'python.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path2'),
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag1',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag2\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path2')
    }, {
      key: '\\Software\\Python\\Company One\\Tag2\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path2', 'python.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag A\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path3')
    }, {
      key: '\\Software\\Python\\Company Two\\Tag A\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Version.Tag A',
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag B\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }, {
      key: '\\Software\\Python\\Company Two\\Tag B\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag B',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag C\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'scipy')
    }, {
      key: '\\Software\\Python\\Company Three\\Tag !\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }, {
      key: '\\Software\\Python\\Company A\\Another Tag\\InstallPath',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'scipy', 'python.exe')
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    interpreterHelper.reset();
    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({
      architecture: platform_1.Architecture.x86
    }));
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 4, 'Incorrect number of entries');
    assert.equal(interpreters[0].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[0].companyDisplayName, 'Display Name for Company One', 'Incorrect company name');
    assert.equal(interpreters[0].path, path.join(environmentsPath, 'path1', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[0].version, 'Tag1', 'Incorrect version');
    assert.equal(interpreters[1].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[1].companyDisplayName, 'Display Name for Company One', 'Incorrect company name');
    assert.equal(interpreters[1].path, path.join(environmentsPath, 'path2', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[1].version, 'Tag2', 'Incorrect version');
    assert.equal(interpreters[2].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[2].companyDisplayName, 'Company Two', 'Incorrect company name');
    assert.equal(interpreters[2].path, path.join(environmentsPath, 'conda', 'envs', 'numpy', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[2].version, 'Tag B', 'Incorrect version');
  }));
  test('Must return multiple entries excluding the invalid registry items and duplicate paths', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One', '\\Software\\Python\\Company Two', '\\Software\\Python\\Company Three', '\\Software\\Python\\Company Four', '\\Software\\Python\\Company Five', 'Missing Tag']
    }, {
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One\\Tag1', '\\Software\\Python\\Company One\\Tag2']
    }, {
      key: '\\Software\\Python\\Company Two',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Two\\Tag A', '\\Software\\Python\\Company Two\\Tag B', '\\Software\\Python\\Company Two\\Tag C']
    }, {
      key: '\\Software\\Python\\Company Three',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Three\\Tag !']
    }, {
      key: '\\Software\\Python\\Company Four',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Four\\Four !']
    }, {
      key: '\\Software\\Python\\Company Five',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Five\\Five !']
    }, {
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      values: ['A']
    }, {
      key: '\\Software\\Python\\Company A',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      values: ['Another Tag']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Display Name for Company One',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy', 'python.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Version.Tag1',
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag1',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag2\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'scipy')
    }, {
      key: '\\Software\\Python\\Company One\\Tag2\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'scipy', 'python.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag A\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path1')
    }, {
      key: '\\Software\\Python\\Company Two\\Tag A\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Version.Tag A',
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag B\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path2')
    }, {
      key: '\\Software\\Python\\Company Two\\Tag B\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag B',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag C\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }, // tslint:disable-next-line:no-any
    {
      key: '\\Software\\Python\\Company Five\\Five !\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: undefined
    }, {
      key: '\\Software\\Python\\Company Three\\Tag !\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }, {
      key: '\\Software\\Python\\Company A\\Another Tag\\InstallPath',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    interpreterHelper.reset();
    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({
      architecture: platform_1.Architecture.x86
    }));
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 4, 'Incorrect number of entries');
    assert.equal(interpreters[0].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[0].companyDisplayName, 'Display Name for Company One', 'Incorrect company name');
    assert.equal(interpreters[0].path, path.join(environmentsPath, 'conda', 'envs', 'numpy', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[0].version, 'Tag1', 'Incorrect version');
    assert.equal(interpreters[1].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[1].companyDisplayName, 'Display Name for Company One', 'Incorrect company name');
    assert.equal(interpreters[1].path, path.join(environmentsPath, 'conda', 'envs', 'scipy', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[1].version, 'Tag2', 'Incorrect version');
    assert.equal(interpreters[2].architecture, platform_1.Architecture.x86, 'Incorrect arhictecture');
    assert.equal(interpreters[2].companyDisplayName, 'Company Two', 'Incorrect company name');
    assert.equal(interpreters[2].path, path.join(environmentsPath, 'path1', 'python.exe'), 'Incorrect path');
    assert.equal(interpreters[2].version, 'Tag A', 'Incorrect version');
  }));
  test('Must return multiple entries excluding the invalid registry items and nonexistent paths', () => __awaiter(void 0, void 0, void 0, function* () {
    const registryKeys = [{
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One', '\\Software\\Python\\Company Two', '\\Software\\Python\\Company Three', '\\Software\\Python\\Company Four', '\\Software\\Python\\Company Five', 'Missing Tag']
    }, {
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company One\\Tag1', '\\Software\\Python\\Company One\\Tag2']
    }, {
      key: '\\Software\\Python\\Company Two',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Two\\Tag A', '\\Software\\Python\\Company Two\\Tag B', '\\Software\\Python\\Company Two\\Tag C']
    }, {
      key: '\\Software\\Python\\Company Three',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Three\\Tag !']
    }, {
      key: '\\Software\\Python\\Company Four',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Four\\Four !']
    }, {
      key: '\\Software\\Python\\Company Five',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      values: ['\\Software\\Python\\Company Five\\Five !']
    }, {
      key: '\\Software\\Python',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      values: ['A']
    }, {
      key: '\\Software\\Python\\Company A',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      values: ['Another Tag']
    }];
    const registryValues = [{
      key: '\\Software\\Python\\Company One',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Display Name for Company One',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy')
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'conda', 'envs', 'numpy', 'python.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Version.Tag1',
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company One\\Tag1\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag1',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company One\\Tag2\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'non-existent-path', 'envs', 'scipy')
    }, {
      key: '\\Software\\Python\\Company One\\Tag2\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'non-existent-path', 'envs', 'scipy', 'python.exe'),
      name: 'ExecutablePath'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag A\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'non-existent-path')
    }, {
      key: '\\Software\\Python\\Company Two\\Tag A\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'Version.Tag A',
      name: 'SysVersion'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag B\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'path2')
    }, {
      key: '\\Software\\Python\\Company Two\\Tag B\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: 'DisplayName.Tag B',
      name: 'DisplayName'
    }, {
      key: '\\Software\\Python\\Company Two\\Tag C\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'non-existent-path', 'envs', 'numpy')
    }, // tslint:disable-next-line:no-any
    {
      key: '\\Software\\Python\\Company Five\\Five !\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: undefined
    }, {
      key: '\\Software\\Python\\Company Three\\Tag !\\InstallPath',
      hive: types_1.RegistryHive.HKCU,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'non-existent-path', 'envs', 'numpy')
    }, {
      key: '\\Software\\Python\\Company A\\Another Tag\\InstallPath',
      hive: types_1.RegistryHive.HKLM,
      arch: platform_1.Architecture.x86,
      value: path.join(environmentsPath, 'non-existent-path', 'envs', 'numpy')
    }];
    const registry = new mocks_1.MockRegistry(registryKeys, registryValues);
    const winRegistry = new windowsRegistryService_1.WindowsRegistryService(registry, false, serviceContainer.object);
    interpreterHelper.reset();
    interpreterHelper.setup(h => h.getInterpreterInformation(TypeMoq.It.isAny())).returns(() => Promise.resolve({
      architecture: platform_1.Architecture.x86
    }));
    const interpreters = yield winRegistry.getInterpreters();
    assert.equal(interpreters.length, 2, 'Incorrect number of entries');
    assert.equal(interpreters[0].architecture, platform_1.Architecture.x86, '1. Incorrect arhictecture');
    assert.equal(interpreters[0].companyDisplayName, 'Display Name for Company One', '1. Incorrect company name');
    assert.equal(interpreters[0].path, path.join(environmentsPath, 'conda', 'envs', 'numpy', 'python.exe'), '1. Incorrect path');
    assert.equal(interpreters[0].version, 'Tag1', '1. Incorrect version');
    assert.equal(interpreters[1].architecture, platform_1.Architecture.x86, '2. Incorrect arhictecture');
    assert.equal(interpreters[1].companyDisplayName, 'Company Two', '2. Incorrect company name');
    assert.equal(interpreters[1].path, path.join(environmentsPath, 'path2', 'python.exe'), '2. Incorrect path');
    assert.equal(interpreters[1].version, 'Tag B', '2. Incorrect version');
  }));
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndpbmRvd3NSZWdpc3RyeVNlcnZpY2UudW5pdC50ZXN0LmpzIl0sIm5hbWVzIjpbIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJhc3NlcnQiLCJyZXF1aXJlIiwicGF0aCIsIlR5cGVNb3EiLCJ0eXBlc18xIiwidHlwZXNfMiIsInBsYXRmb3JtXzEiLCJjb250cmFjdHNfMSIsIndpbmRvd3NSZWdpc3RyeVNlcnZpY2VfMSIsIm1vY2tzXzEiLCJlbnZpcm9ubWVudHNQYXRoIiwiam9pbiIsIl9fZGlybmFtZSIsInN1aXRlIiwic2VydmljZUNvbnRhaW5lciIsImludGVycHJldGVySGVscGVyIiwic2V0dXAiLCJNb2NrIiwib2ZUeXBlIiwic3RhdGVGYWN0b3J5IiwicGF0aFV0aWxzIiwiYyIsImdldCIsIkl0IiwiaXNWYWx1ZSIsIklQZXJzaXN0ZW50U3RhdGVGYWN0b3J5IiwicmV0dXJucyIsIm9iamVjdCIsIklJbnRlcnByZXRlckhlbHBlciIsIklQYXRoVXRpbHMiLCJwIiwiYmFzZW5hbWUiLCJpc0FueSIsInNwbGl0IiwicmV2ZXJzZSIsInN0YXRlIiwiTW9ja1N0YXRlIiwidW5kZWZpbmVkIiwiaCIsImdldEludGVycHJldGVySW5mb3JtYXRpb24iLCJzIiwiY3JlYXRlR2xvYmFsUGVyc2lzdGVudFN0YXRlIiwidGVzdCIsInJlZ2lzdHJ5IiwiTW9ja1JlZ2lzdHJ5Iiwid2luUmVnaXN0cnkiLCJXaW5kb3dzUmVnaXN0cnlTZXJ2aWNlIiwiaW50ZXJwcmV0ZXJzIiwiZ2V0SW50ZXJwcmV0ZXJzIiwiZXF1YWwiLCJsZW5ndGgiLCJyZWdpc3RyeUtleXMiLCJrZXkiLCJoaXZlIiwiUmVnaXN0cnlIaXZlIiwiSEtDVSIsImFyY2giLCJBcmNoaXRlY3R1cmUiLCJ4ODYiLCJ2YWx1ZXMiLCJyZWdpc3RyeVZhbHVlcyIsIm5hbWUiLCJyZXNldCIsImFyY2hpdGVjdHVyZSIsImNvbXBhbnlEaXNwbGF5TmFtZSIsInZlcnNpb24iLCJIS0xNIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5CLEVBQStCQyxDQUEvQixFQUFrQ0MsU0FBbEMsRUFBNkM7QUFDckYsU0FBTyxLQUFLRCxDQUFDLEtBQUtBLENBQUMsR0FBR0UsT0FBVCxDQUFOLEVBQXlCLFVBQVVDLE9BQVYsRUFBbUJDLE1BQW5CLEVBQTJCO0FBQ3ZELGFBQVNDLFNBQVQsQ0FBbUJDLEtBQW5CLEVBQTBCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQ08sSUFBVixDQUFlRixLQUFmLENBQUQsQ0FBSjtBQUE4QixPQUFwQyxDQUFxQyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUMzRixhQUFTQyxRQUFULENBQWtCSixLQUFsQixFQUF5QjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUMsT0FBRCxDQUFULENBQW1CSyxLQUFuQixDQUFELENBQUo7QUFBa0MsT0FBeEMsQ0FBeUMsT0FBT0csQ0FBUCxFQUFVO0FBQUVMLFFBQUFBLE1BQU0sQ0FBQ0ssQ0FBRCxDQUFOO0FBQVk7QUFBRTs7QUFDOUYsYUFBU0YsSUFBVCxDQUFjSSxNQUFkLEVBQXNCO0FBQUVBLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjVCxPQUFPLENBQUNRLE1BQU0sQ0FBQ0wsS0FBUixDQUFyQixHQUFzQyxJQUFJTixDQUFKLENBQU0sVUFBVUcsT0FBVixFQUFtQjtBQUFFQSxRQUFBQSxPQUFPLENBQUNR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QUFNLENBQUNpRCxLQUFQLENBQWFGLFlBQVksQ0FBQyxDQUFELENBQVosQ0FBZ0I3QyxJQUE3QixFQUFtQ0EsSUFBSSxDQUFDUyxJQUFMLENBQVVELGdCQUFWLEVBQTRCLE9BQTVCLEVBQXFDLE1BQXJDLEVBQTZDLE9BQTdDLEVBQXNELFlBQXRELENBQW5DLEVBQXdHLG1CQUF4RztBQUNBVixJQUFBQSxNQUFNLENBQUNpRCxLQUFQLENBQWFGLFlBQVksQ0FBQyxDQUFELENBQVosQ0FBZ0JrQixPQUE3QixFQUFzQyxNQUF0QyxFQUE4QyxzQkFBOUM7QUFDQWpFLElBQUFBLE1BQU0sQ0FBQ2lELEtBQVAsQ0FBYUYsWUFBWSxDQUFDLENBQUQsQ0FBWixDQUFnQmdCLFlBQTdCLEVBQTJDekQsVUFBVSxDQUFDbUQsWUFBWCxDQUF3QkMsR0FBbkUsRUFBd0UsMkJBQXhFO0FBQ0ExRCxJQUFBQSxNQUFNLENBQUNpRCxLQUFQLENBQWFGLFlBQVksQ0FBQyxDQUFELENBQVosQ0FBZ0JpQixrQkFBN0IsRUFBaUQsYUFBakQsRUFBZ0UsMkJBQWhFO0FBQ0FoRSxJQUFBQSxNQUFNLENBQUNpRCxLQUFQLENBQWFGLFlBQVksQ0FBQyxDQUFELENBQVosQ0FBZ0I3QyxJQUE3QixFQUFtQ0EsSUFBSSxDQUFDUyxJQUFMLENBQVVELGdCQUFWLEVBQTRCLE9BQTVCLEVBQXFDLFlBQXJDLENBQW5DLEVBQXVGLG1CQUF2RjtBQUNBVixJQUFBQSxNQUFNLENBQUNpRCxLQUFQLENBQWFGLFlBQVksQ0FBQyxDQUFELENBQVosQ0FBZ0JrQixPQUE3QixFQUFzQyxPQUF0QyxFQUErQyxzQkFBL0M7QUFDSCxHQTNDOEcsQ0FBM0csQ0FBSjtBQTRDSCxDQS9PSSxDQUFMIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcclxuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5jb25zdCBUeXBlTW9xID0gcmVxdWlyZShcInR5cGVtb3FcIik7XHJcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L2NvbW1vbi9wbGF0Zm9ybS90eXBlc1wiKTtcclxuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCBwbGF0Zm9ybV8xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9jb21tb24vdXRpbHMvcGxhdGZvcm1cIik7XHJcbmNvbnN0IGNvbnRyYWN0c18xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9pbnRlcnByZXRlci9jb250cmFjdHNcIik7XHJcbmNvbnN0IHdpbmRvd3NSZWdpc3RyeVNlcnZpY2VfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvaW50ZXJwcmV0ZXIvbG9jYXRvcnMvc2VydmljZXMvd2luZG93c1JlZ2lzdHJ5U2VydmljZVwiKTtcclxuY29uc3QgbW9ja3NfMSA9IHJlcXVpcmUoXCIuL21vY2tzXCIpO1xyXG5jb25zdCBlbnZpcm9ubWVudHNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJy4uJywgJ3NyYycsICd0ZXN0JywgJ3B5dGhvbkZpbGVzJywgJ2Vudmlyb25tZW50cycpO1xyXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWZ1bmMtYm9keS1sZW5ndGhcclxuc3VpdGUoJ0ludGVycHJldGVycyBmcm9tIFdpbmRvd3MgUmVnaXN0cnkgKHVuaXQpJywgKCkgPT4ge1xyXG4gICAgbGV0IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICBsZXQgaW50ZXJwcmV0ZXJIZWxwZXI7XHJcbiAgICBzZXR1cCgoKSA9PiB7XHJcbiAgICAgICAgc2VydmljZUNvbnRhaW5lciA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICBjb25zdCBzdGF0ZUZhY3RvcnkgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgaW50ZXJwcmV0ZXJIZWxwZXIgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgY29uc3QgcGF0aFV0aWxzID0gVHlwZU1vcS5Nb2NrLm9mVHlwZSgpO1xyXG4gICAgICAgIHNlcnZpY2VDb250YWluZXIuc2V0dXAoYyA9PiBjLmdldChUeXBlTW9xLkl0LmlzVmFsdWUodHlwZXNfMi5JUGVyc2lzdGVudFN0YXRlRmFjdG9yeSkpKS5yZXR1cm5zKCgpID0+IHN0YXRlRmFjdG9yeS5vYmplY3QpO1xyXG4gICAgICAgIHNlcnZpY2VDb250YWluZXIuc2V0dXAoYyA9PiBjLmdldChUeXBlTW9xLkl0LmlzVmFsdWUoY29udHJhY3RzXzEuSUludGVycHJldGVySGVscGVyKSkpLnJldHVybnMoKCkgPT4gaW50ZXJwcmV0ZXJIZWxwZXIub2JqZWN0KTtcclxuICAgICAgICBzZXJ2aWNlQ29udGFpbmVyLnNldHVwKGMgPT4gYy5nZXQoVHlwZU1vcS5JdC5pc1ZhbHVlKHR5cGVzXzIuSVBhdGhVdGlscykpKS5yZXR1cm5zKCgpID0+IHBhdGhVdGlscy5vYmplY3QpO1xyXG4gICAgICAgIHBhdGhVdGlscy5zZXR1cChwID0+IHAuYmFzZW5hbWUoVHlwZU1vcS5JdC5pc0FueSgpLCBUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKChwKSA9PiBwLnNwbGl0KC9bXFxcXCxcXC9dLykucmV2ZXJzZSgpWzBdKTtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IG5ldyBtb2Nrc18xLk1vY2tTdGF0ZSh1bmRlZmluZWQpO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eSBuby1hbnlcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5zZXR1cChoID0+IGguZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbihUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZSh7fSkpO1xyXG4gICAgICAgIHN0YXRlRmFjdG9yeS5zZXR1cChzID0+IHMuY3JlYXRlR2xvYmFsUGVyc2lzdGVudFN0YXRlKFR5cGVNb3EuSXQuaXNBbnkoKSwgVHlwZU1vcS5JdC5pc0FueSgpKSkucmV0dXJucygoKSA9PiBzdGF0ZSk7XHJcbiAgICB9KTtcclxuICAgIHRlc3QoJ011c3QgcmV0dXJuIGFuIGVtcHR5IGxpc3QgKHg4NiknLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgbW9ja3NfMS5Nb2NrUmVnaXN0cnkoW10sIFtdKTtcclxuICAgICAgICBjb25zdCB3aW5SZWdpc3RyeSA9IG5ldyB3aW5kb3dzUmVnaXN0cnlTZXJ2aWNlXzEuV2luZG93c1JlZ2lzdHJ5U2VydmljZShyZWdpc3RyeSwgZmFsc2UsIHNlcnZpY2VDb250YWluZXIub2JqZWN0KTtcclxuICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB3aW5SZWdpc3RyeS5nZXRJbnRlcnByZXRlcnMoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzLmxlbmd0aCwgMCwgJ0luY29ycmVjdCBudW1iZXIgb2YgZW50cmllcycpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnTXVzdCByZXR1cm4gYW4gZW1wdHkgbGlzdCAoeDY0KScsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBtb2Nrc18xLk1vY2tSZWdpc3RyeShbXSwgW10pO1xyXG4gICAgICAgIGNvbnN0IHdpblJlZ2lzdHJ5ID0gbmV3IHdpbmRvd3NSZWdpc3RyeVNlcnZpY2VfMS5XaW5kb3dzUmVnaXN0cnlTZXJ2aWNlKHJlZ2lzdHJ5LCB0cnVlLCBzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCk7XHJcbiAgICAgICAgY29uc3QgaW50ZXJwcmV0ZXJzID0geWllbGQgd2luUmVnaXN0cnkuZ2V0SW50ZXJwcmV0ZXJzKCk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVycy5sZW5ndGgsIDAsICdJbmNvcnJlY3QgbnVtYmVyIG9mIGVudHJpZXMnKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ011c3QgcmV0dXJuIGEgc2luZ2xlIGVudHJ5JywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJ5S2V5cyA9IFtcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZSddIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZScsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMSddIH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJ5VmFsdWVzID0gW1xyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmUnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiAnRGlzcGxheSBOYW1lIGZvciBDb21wYW55IE9uZScsIG5hbWU6ICdEaXNwbGF5TmFtZScgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJykgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJywgJ29uZS5leGUnKSwgbmFtZTogJ0V4ZWN1dGFibGVQYXRoJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMScsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6ICdWZXJzaW9uLlRhZzEnLCBuYW1lOiAnU3lzVmVyc2lvbicgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzEnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiAnRGlzcGxheU5hbWUuVGFnMScsIG5hbWU6ICdEaXNwbGF5TmFtZScgfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgbW9ja3NfMS5Nb2NrUmVnaXN0cnkocmVnaXN0cnlLZXlzLCByZWdpc3RyeVZhbHVlcyk7XHJcbiAgICAgICAgY29uc3Qgd2luUmVnaXN0cnkgPSBuZXcgd2luZG93c1JlZ2lzdHJ5U2VydmljZV8xLldpbmRvd3NSZWdpc3RyeVNlcnZpY2UocmVnaXN0cnksIGZhbHNlLCBzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCk7XHJcbiAgICAgICAgaW50ZXJwcmV0ZXJIZWxwZXIucmVzZXQoKTtcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5zZXR1cChoID0+IGguZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbihUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZSh7IGFyY2hpdGVjdHVyZTogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2IH0pKTtcclxuICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB3aW5SZWdpc3RyeS5nZXRJbnRlcnByZXRlcnMoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzLmxlbmd0aCwgMSwgJ0luY29ycmVjdCBudW1iZXIgb2YgZW50cmllcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0uYXJjaGl0ZWN0dXJlLCBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsICdJbmNvcnJlY3QgYXJoaWN0ZWN0dXJlJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5jb21wYW55RGlzcGxheU5hbWUsICdEaXNwbGF5IE5hbWUgZm9yIENvbXBhbnkgT25lJywgJ0luY29ycmVjdCBjb21wYW55IG5hbWUnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzBdLnBhdGgsIHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAncGF0aDEnLCAnb25lLmV4ZScpLCAnSW5jb3JyZWN0IGV4ZWN1dGFibGUgcGF0aCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0udmVyc2lvbiwgJ1ZlcnNpb24uVGFnMScsICdJbmNvcnJlY3QgdmVyc2lvbicpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnTXVzdCBkZWZhdWx0IG5hbWVzIGZvciBQeXRob25Db3JlIGFuZCBleGUnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnlLZXlzID0gW1xyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob24nLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXFB5dGhvbkNvcmUnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcUHl0aG9uQ29yZScsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcUHl0aG9uQ29yZVxcXFxUYWcxJ10gfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnlWYWx1ZXMgPSBbXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxQeXRob25Db3JlXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJykgfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgbW9ja3NfMS5Nb2NrUmVnaXN0cnkocmVnaXN0cnlLZXlzLCByZWdpc3RyeVZhbHVlcyk7XHJcbiAgICAgICAgY29uc3Qgd2luUmVnaXN0cnkgPSBuZXcgd2luZG93c1JlZ2lzdHJ5U2VydmljZV8xLldpbmRvd3NSZWdpc3RyeVNlcnZpY2UocmVnaXN0cnksIGZhbHNlLCBzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCk7XHJcbiAgICAgICAgaW50ZXJwcmV0ZXJIZWxwZXIucmVzZXQoKTtcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5zZXR1cChoID0+IGguZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbihUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZSh7IGFyY2hpdGVjdHVyZTogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2IH0pKTtcclxuICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB3aW5SZWdpc3RyeS5nZXRJbnRlcnByZXRlcnMoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzLmxlbmd0aCwgMSwgJ0luY29ycmVjdCBudW1iZXIgb2YgZW50cmllcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0uYXJjaGl0ZWN0dXJlLCBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsICdJbmNvcnJlY3QgYXJoaWN0ZWN0dXJlJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5jb21wYW55RGlzcGxheU5hbWUsICdQeXRob24gU29mdHdhcmUgRm91bmRhdGlvbicsICdJbmNvcnJlY3QgY29tcGFueSBuYW1lJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5wYXRoLCBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJywgJ3B5dGhvbi5leGUnKSwgJ0luY29ycmVjdCBwYXRoJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS52ZXJzaW9uLCAnVGFnMScsICdJbmNvcnJlY3QgdmVyc2lvbicpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnTXVzdCBpZ25vcmUgY29tcGFueSBcXCdQeUxhdW5jaGVyXFwnJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJ5S2V5cyA9IFtcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxQeUxhdW5jaGVyJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXFB5dGhvbkNvcmUnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXFB5TGF1bmNoZXJcXFxcVGFnMSddIH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJ5VmFsdWVzID0gW1xyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcUHlMYXVuY2hlclxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ2M6L3RlbXAvSW5zdGFsbCBQYXRoIFRhZzEnIH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IG1vY2tzXzEuTW9ja1JlZ2lzdHJ5KHJlZ2lzdHJ5S2V5cywgcmVnaXN0cnlWYWx1ZXMpO1xyXG4gICAgICAgIGNvbnN0IHdpblJlZ2lzdHJ5ID0gbmV3IHdpbmRvd3NSZWdpc3RyeVNlcnZpY2VfMS5XaW5kb3dzUmVnaXN0cnlTZXJ2aWNlKHJlZ2lzdHJ5LCBmYWxzZSwgc2VydmljZUNvbnRhaW5lci5vYmplY3QpO1xyXG4gICAgICAgIGNvbnN0IGludGVycHJldGVycyA9IHlpZWxkIHdpblJlZ2lzdHJ5LmdldEludGVycHJldGVycygpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnMubGVuZ3RoLCAwLCAnSW5jb3JyZWN0IG51bWJlciBvZiBlbnRyaWVzJyk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdNdXN0IHJldHVybiBhIHNpbmdsZSBlbnRyeSBhbmQgd2hlbiByZWdpc3RyeSBjb250YWlucyBvbmx5IHRoZSBJbnN0YWxsUGF0aCcsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCByZWdpc3RyeUtleXMgPSBbXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvbicsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmUnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmUnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzEnXSB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCByZWdpc3RyeVZhbHVlcyA9IFtcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJykgfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgbW9ja3NfMS5Nb2NrUmVnaXN0cnkocmVnaXN0cnlLZXlzLCByZWdpc3RyeVZhbHVlcyk7XHJcbiAgICAgICAgY29uc3Qgd2luUmVnaXN0cnkgPSBuZXcgd2luZG93c1JlZ2lzdHJ5U2VydmljZV8xLldpbmRvd3NSZWdpc3RyeVNlcnZpY2UocmVnaXN0cnksIGZhbHNlLCBzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCk7XHJcbiAgICAgICAgaW50ZXJwcmV0ZXJIZWxwZXIucmVzZXQoKTtcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5zZXR1cChoID0+IGguZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbihUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZSh7IGFyY2hpdGVjdHVyZTogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2IH0pKTtcclxuICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB3aW5SZWdpc3RyeS5nZXRJbnRlcnByZXRlcnMoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzLmxlbmd0aCwgMSwgJ0luY29ycmVjdCBudW1iZXIgb2YgZW50cmllcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0uYXJjaGl0ZWN0dXJlLCBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsICdJbmNvcnJlY3QgYXJoaWN0ZWN0dXJlJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5jb21wYW55RGlzcGxheU5hbWUsICdDb21wYW55IE9uZScsICdJbmNvcnJlY3QgY29tcGFueSBuYW1lJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5wYXRoLCBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJywgJ3B5dGhvbi5leGUnKSwgJ0luY29ycmVjdCBwYXRoJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS52ZXJzaW9uLCAnVGFnMScsICdJbmNvcnJlY3QgdmVyc2lvbicpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnTXVzdCByZXR1cm4gbXVsdGlwbGUgZW50cmllcycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCByZWdpc3RyeUtleXMgPSBbXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvbicsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmUnLCAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3bycsICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVGhyZWUnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmUnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzEnLCAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcyJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQScsICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBCJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEMnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUaHJlZScsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUaHJlZVxcXFxUYWcgISddIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvbicsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLTE0sIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ0EnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBBJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtMTSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnQW5vdGhlciBUYWcnXSB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCByZWdpc3RyeVZhbHVlcyA9IFtcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ0Rpc3BsYXkgTmFtZSBmb3IgQ29tcGFueSBPbmUnLCBuYW1lOiAnRGlzcGxheU5hbWUnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdwYXRoMScpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdwYXRoMScsICdweXRob24uZXhlJyksIG5hbWU6ICdFeGVjdXRhYmxlUGF0aCcgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgyJyksIG5hbWU6ICdTeXNWZXJzaW9uJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6ICdEaXNwbGF5TmFtZS5UYWcxJywgbmFtZTogJ0Rpc3BsYXlOYW1lJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMlxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAncGF0aDInKSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMlxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAncGF0aDInLCAncHl0aG9uLmV4ZScpLCBuYW1lOiAnRXhlY3V0YWJsZVBhdGgnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAncGF0aDMnKSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiAnVmVyc2lvbi5UYWcgQScsIG5hbWU6ICdTeXNWZXJzaW9uJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEJcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ2NvbmRhJywgJ2VudnMnLCAnbnVtcHknKSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEJcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiAnRGlzcGxheU5hbWUuVGFnIEInLCBuYW1lOiAnRGlzcGxheU5hbWUnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQ1xcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnY29uZGEnLCAnZW52cycsICdzY2lweScpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFRocmVlXFxcXFRhZyAhXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JykgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgQVxcXFxBbm90aGVyIFRhZ1xcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLTE0sIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnY29uZGEnLCAnZW52cycsICdzY2lweScsICdweXRob24uZXhlJykgfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgbW9ja3NfMS5Nb2NrUmVnaXN0cnkocmVnaXN0cnlLZXlzLCByZWdpc3RyeVZhbHVlcyk7XHJcbiAgICAgICAgY29uc3Qgd2luUmVnaXN0cnkgPSBuZXcgd2luZG93c1JlZ2lzdHJ5U2VydmljZV8xLldpbmRvd3NSZWdpc3RyeVNlcnZpY2UocmVnaXN0cnksIGZhbHNlLCBzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCk7XHJcbiAgICAgICAgaW50ZXJwcmV0ZXJIZWxwZXIucmVzZXQoKTtcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5zZXR1cChoID0+IGguZ2V0SW50ZXJwcmV0ZXJJbmZvcm1hdGlvbihUeXBlTW9xLkl0LmlzQW55KCkpKS5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZSh7IGFyY2hpdGVjdHVyZTogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2IH0pKTtcclxuICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB3aW5SZWdpc3RyeS5nZXRJbnRlcnByZXRlcnMoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzLmxlbmd0aCwgNCwgJ0luY29ycmVjdCBudW1iZXIgb2YgZW50cmllcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0uYXJjaGl0ZWN0dXJlLCBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsICdJbmNvcnJlY3QgYXJoaWN0ZWN0dXJlJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5jb21wYW55RGlzcGxheU5hbWUsICdEaXNwbGF5IE5hbWUgZm9yIENvbXBhbnkgT25lJywgJ0luY29ycmVjdCBjb21wYW55IG5hbWUnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzBdLnBhdGgsIHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAncGF0aDEnLCAncHl0aG9uLmV4ZScpLCAnSW5jb3JyZWN0IHBhdGgnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzBdLnZlcnNpb24sICdUYWcxJywgJ0luY29ycmVjdCB2ZXJzaW9uJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1sxXS5hcmNoaXRlY3R1cmUsIHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgJ0luY29ycmVjdCBhcmhpY3RlY3R1cmUnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzFdLmNvbXBhbnlEaXNwbGF5TmFtZSwgJ0Rpc3BsYXkgTmFtZSBmb3IgQ29tcGFueSBPbmUnLCAnSW5jb3JyZWN0IGNvbXBhbnkgbmFtZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMV0ucGF0aCwgcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdwYXRoMicsICdweXRob24uZXhlJyksICdJbmNvcnJlY3QgcGF0aCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMV0udmVyc2lvbiwgJ1RhZzInLCAnSW5jb3JyZWN0IHZlcnNpb24nKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzJdLmFyY2hpdGVjdHVyZSwgcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCAnSW5jb3JyZWN0IGFyaGljdGVjdHVyZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMl0uY29tcGFueURpc3BsYXlOYW1lLCAnQ29tcGFueSBUd28nLCAnSW5jb3JyZWN0IGNvbXBhbnkgbmFtZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMl0ucGF0aCwgcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JywgJ3B5dGhvbi5leGUnKSwgJ0luY29ycmVjdCBwYXRoJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1syXS52ZXJzaW9uLCAnVGFnIEInLCAnSW5jb3JyZWN0IHZlcnNpb24nKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ011c3QgcmV0dXJuIG11bHRpcGxlIGVudHJpZXMgZXhjbHVkaW5nIHRoZSBpbnZhbGlkIHJlZ2lzdHJ5IGl0ZW1zIGFuZCBkdXBsaWNhdGUgcGF0aHMnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnlLZXlzID0gW1xyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob24nLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd28nLCAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFRocmVlJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGb3VyJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGaXZlJywgJ01pc3NpbmcgVGFnJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMiddIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3bycsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEEnLCAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQicsICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBDJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVGhyZWUnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVGhyZWVcXFxcVGFnICEnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGb3VyJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IEZvdXJcXFxcRm91ciAhJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgRml2ZScsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGaXZlXFxcXEZpdmUgISddIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvbicsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLTE0sIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ0EnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBBJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtMTSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnQW5vdGhlciBUYWcnXSB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCByZWdpc3RyeVZhbHVlcyA9IFtcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ0Rpc3BsYXkgTmFtZSBmb3IgQ29tcGFueSBPbmUnLCBuYW1lOiAnRGlzcGxheU5hbWUnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JykgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ2NvbmRhJywgJ2VudnMnLCAnbnVtcHknLCAncHl0aG9uLmV4ZScpLCBuYW1lOiAnRXhlY3V0YWJsZVBhdGgnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ1ZlcnNpb24uVGFnMScsIG5hbWU6ICdTeXNWZXJzaW9uJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6ICdEaXNwbGF5TmFtZS5UYWcxJywgbmFtZTogJ0Rpc3BsYXlOYW1lJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMlxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnY29uZGEnLCAnZW52cycsICdzY2lweScpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcyXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ3NjaXB5JywgJ3B5dGhvbi5leGUnKSwgbmFtZTogJ0V4ZWN1dGFibGVQYXRoJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgxJykgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBBXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ1ZlcnNpb24uVGFnIEEnLCBuYW1lOiAnU3lzVmVyc2lvbicgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBCXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdwYXRoMicpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQlxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6ICdEaXNwbGF5TmFtZS5UYWcgQicsIG5hbWU6ICdEaXNwbGF5TmFtZScgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBDXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JykgfSxcclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGaXZlXFxcXEZpdmUgIVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHVuZGVmaW5lZCB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUaHJlZVxcXFxUYWcgIVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnY29uZGEnLCAnZW52cycsICdudW1weScpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IEFcXFxcQW5vdGhlciBUYWdcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0xNLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ2NvbmRhJywgJ2VudnMnLCAnbnVtcHknKSB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBtb2Nrc18xLk1vY2tSZWdpc3RyeShyZWdpc3RyeUtleXMsIHJlZ2lzdHJ5VmFsdWVzKTtcclxuICAgICAgICBjb25zdCB3aW5SZWdpc3RyeSA9IG5ldyB3aW5kb3dzUmVnaXN0cnlTZXJ2aWNlXzEuV2luZG93c1JlZ2lzdHJ5U2VydmljZShyZWdpc3RyeSwgZmFsc2UsIHNlcnZpY2VDb250YWluZXIub2JqZWN0KTtcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5yZXNldCgpO1xyXG4gICAgICAgIGludGVycHJldGVySGVscGVyLnNldHVwKGggPT4gaC5nZXRJbnRlcnByZXRlckluZm9ybWF0aW9uKFR5cGVNb3EuSXQuaXNBbnkoKSkpLnJldHVybnMoKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHsgYXJjaGl0ZWN0dXJlOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYgfSkpO1xyXG4gICAgICAgIGNvbnN0IGludGVycHJldGVycyA9IHlpZWxkIHdpblJlZ2lzdHJ5LmdldEludGVycHJldGVycygpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnMubGVuZ3RoLCA0LCAnSW5jb3JyZWN0IG51bWJlciBvZiBlbnRyaWVzJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5hcmNoaXRlY3R1cmUsIHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgJ0luY29ycmVjdCBhcmhpY3RlY3R1cmUnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzBdLmNvbXBhbnlEaXNwbGF5TmFtZSwgJ0Rpc3BsYXkgTmFtZSBmb3IgQ29tcGFueSBPbmUnLCAnSW5jb3JyZWN0IGNvbXBhbnkgbmFtZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0ucGF0aCwgcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JywgJ3B5dGhvbi5leGUnKSwgJ0luY29ycmVjdCBwYXRoJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS52ZXJzaW9uLCAnVGFnMScsICdJbmNvcnJlY3QgdmVyc2lvbicpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMV0uYXJjaGl0ZWN0dXJlLCBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsICdJbmNvcnJlY3QgYXJoaWN0ZWN0dXJlJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1sxXS5jb21wYW55RGlzcGxheU5hbWUsICdEaXNwbGF5IE5hbWUgZm9yIENvbXBhbnkgT25lJywgJ0luY29ycmVjdCBjb21wYW55IG5hbWUnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzFdLnBhdGgsIHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnY29uZGEnLCAnZW52cycsICdzY2lweScsICdweXRob24uZXhlJyksICdJbmNvcnJlY3QgcGF0aCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMV0udmVyc2lvbiwgJ1RhZzInLCAnSW5jb3JyZWN0IHZlcnNpb24nKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzJdLmFyY2hpdGVjdHVyZSwgcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCAnSW5jb3JyZWN0IGFyaGljdGVjdHVyZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMl0uY29tcGFueURpc3BsYXlOYW1lLCAnQ29tcGFueSBUd28nLCAnSW5jb3JyZWN0IGNvbXBhbnkgbmFtZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMl0ucGF0aCwgcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdwYXRoMScsICdweXRob24uZXhlJyksICdJbmNvcnJlY3QgcGF0aCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMl0udmVyc2lvbiwgJ1RhZyBBJywgJ0luY29ycmVjdCB2ZXJzaW9uJyk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdNdXN0IHJldHVybiBtdWx0aXBsZSBlbnRyaWVzIGV4Y2x1ZGluZyB0aGUgaW52YWxpZCByZWdpc3RyeSBpdGVtcyBhbmQgbm9uZXhpc3RlbnQgcGF0aHMnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaXN0cnlLZXlzID0gW1xyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob24nLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd28nLCAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFRocmVlJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGb3VyJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGaXZlJywgJ01pc3NpbmcgVGFnJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxJywgJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMiddIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3bycsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEEnLCAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQicsICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBDJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVGhyZWUnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlczogWydcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVGhyZWVcXFxcVGFnICEnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGb3VyJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IEZvdXJcXFxcRm91ciAhJ10gfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgRml2ZScsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGaXZlXFxcXEZpdmUgISddIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvbicsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLTE0sIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWVzOiBbJ0EnXSB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBBJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtMTSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZXM6IFsnQW5vdGhlciBUYWcnXSB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCByZWdpc3RyeVZhbHVlcyA9IFtcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ0Rpc3BsYXkgTmFtZSBmb3IgQ29tcGFueSBPbmUnLCBuYW1lOiAnRGlzcGxheU5hbWUnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JykgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgT25lXFxcXFRhZzFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ2NvbmRhJywgJ2VudnMnLCAnbnVtcHknLCAncHl0aG9uLmV4ZScpLCBuYW1lOiAnRXhlY3V0YWJsZVBhdGgnIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcxXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ1ZlcnNpb24uVGFnMScsIG5hbWU6ICdTeXNWZXJzaW9uJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6ICdEaXNwbGF5TmFtZS5UYWcxJywgbmFtZTogJ0Rpc3BsYXlOYW1lJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBPbmVcXFxcVGFnMlxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnbm9uLWV4aXN0ZW50LXBhdGgnLCAnZW52cycsICdzY2lweScpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IE9uZVxcXFxUYWcyXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdub24tZXhpc3RlbnQtcGF0aCcsICdlbnZzJywgJ3NjaXB5JywgJ3B5dGhvbi5leGUnKSwgbmFtZTogJ0V4ZWN1dGFibGVQYXRoJyB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUd29cXFxcVGFnIEFcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0NVLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ25vbi1leGlzdGVudC1wYXRoJykgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBBXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogJ1ZlcnNpb24uVGFnIEEnLCBuYW1lOiAnU3lzVmVyc2lvbicgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBCXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdwYXRoMicpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IFR3b1xcXFxUYWcgQlxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6ICdEaXNwbGF5TmFtZS5UYWcgQicsIG5hbWU6ICdEaXNwbGF5TmFtZScgfSxcclxuICAgICAgICAgICAgeyBrZXk6ICdcXFxcU29mdHdhcmVcXFxcUHl0aG9uXFxcXENvbXBhbnkgVHdvXFxcXFRhZyBDXFxcXEluc3RhbGxQYXRoJywgaGl2ZTogdHlwZXNfMS5SZWdpc3RyeUhpdmUuSEtDVSwgYXJjaDogcGxhdGZvcm1fMS5BcmNoaXRlY3R1cmUueDg2LCB2YWx1ZTogcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdub24tZXhpc3RlbnQtcGF0aCcsICdlbnZzJywgJ251bXB5JykgfSxcclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBGaXZlXFxcXEZpdmUgIVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHVuZGVmaW5lZCB9LFxyXG4gICAgICAgICAgICB7IGtleTogJ1xcXFxTb2Z0d2FyZVxcXFxQeXRob25cXFxcQ29tcGFueSBUaHJlZVxcXFxUYWcgIVxcXFxJbnN0YWxsUGF0aCcsIGhpdmU6IHR5cGVzXzEuUmVnaXN0cnlIaXZlLkhLQ1UsIGFyY2g6IHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgdmFsdWU6IHBhdGguam9pbihlbnZpcm9ubWVudHNQYXRoLCAnbm9uLWV4aXN0ZW50LXBhdGgnLCAnZW52cycsICdudW1weScpIH0sXHJcbiAgICAgICAgICAgIHsga2V5OiAnXFxcXFNvZnR3YXJlXFxcXFB5dGhvblxcXFxDb21wYW55IEFcXFxcQW5vdGhlciBUYWdcXFxcSW5zdGFsbFBhdGgnLCBoaXZlOiB0eXBlc18xLlJlZ2lzdHJ5SGl2ZS5IS0xNLCBhcmNoOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsIHZhbHVlOiBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ25vbi1leGlzdGVudC1wYXRoJywgJ2VudnMnLCAnbnVtcHknKSB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBtb2Nrc18xLk1vY2tSZWdpc3RyeShyZWdpc3RyeUtleXMsIHJlZ2lzdHJ5VmFsdWVzKTtcclxuICAgICAgICBjb25zdCB3aW5SZWdpc3RyeSA9IG5ldyB3aW5kb3dzUmVnaXN0cnlTZXJ2aWNlXzEuV2luZG93c1JlZ2lzdHJ5U2VydmljZShyZWdpc3RyeSwgZmFsc2UsIHNlcnZpY2VDb250YWluZXIub2JqZWN0KTtcclxuICAgICAgICBpbnRlcnByZXRlckhlbHBlci5yZXNldCgpO1xyXG4gICAgICAgIGludGVycHJldGVySGVscGVyLnNldHVwKGggPT4gaC5nZXRJbnRlcnByZXRlckluZm9ybWF0aW9uKFR5cGVNb3EuSXQuaXNBbnkoKSkpLnJldHVybnMoKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHsgYXJjaGl0ZWN0dXJlOiBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYgfSkpO1xyXG4gICAgICAgIGNvbnN0IGludGVycHJldGVycyA9IHlpZWxkIHdpblJlZ2lzdHJ5LmdldEludGVycHJldGVycygpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnMubGVuZ3RoLCAyLCAnSW5jb3JyZWN0IG51bWJlciBvZiBlbnRyaWVzJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS5hcmNoaXRlY3R1cmUsIHBsYXRmb3JtXzEuQXJjaGl0ZWN0dXJlLng4NiwgJzEuIEluY29ycmVjdCBhcmhpY3RlY3R1cmUnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZXJwcmV0ZXJzWzBdLmNvbXBhbnlEaXNwbGF5TmFtZSwgJ0Rpc3BsYXkgTmFtZSBmb3IgQ29tcGFueSBPbmUnLCAnMS4gSW5jb3JyZWN0IGNvbXBhbnkgbmFtZScpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMF0ucGF0aCwgcGF0aC5qb2luKGVudmlyb25tZW50c1BhdGgsICdjb25kYScsICdlbnZzJywgJ251bXB5JywgJ3B5dGhvbi5leGUnKSwgJzEuIEluY29ycmVjdCBwYXRoJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1swXS52ZXJzaW9uLCAnVGFnMScsICcxLiBJbmNvcnJlY3QgdmVyc2lvbicpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlcnByZXRlcnNbMV0uYXJjaGl0ZWN0dXJlLCBwbGF0Zm9ybV8xLkFyY2hpdGVjdHVyZS54ODYsICcyLiBJbmNvcnJlY3QgYXJoaWN0ZWN0dXJlJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1sxXS5jb21wYW55RGlzcGxheU5hbWUsICdDb21wYW55IFR3bycsICcyLiBJbmNvcnJlY3QgY29tcGFueSBuYW1lJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1sxXS5wYXRoLCBwYXRoLmpvaW4oZW52aXJvbm1lbnRzUGF0aCwgJ3BhdGgyJywgJ3B5dGhvbi5leGUnKSwgJzIuIEluY29ycmVjdCBwYXRoJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVycHJldGVyc1sxXS52ZXJzaW9uLCAnVGFnIEInLCAnMi4gSW5jb3JyZWN0IHZlcnNpb24nKTtcclxuICAgIH0pKTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXdpbmRvd3NSZWdpc3RyeVNlcnZpY2UudW5pdC50ZXN0LmpzLm1hcCJdfQ==