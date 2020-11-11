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
});

const assert = require("assert");

const fs = require("fs-extra");

const path = require("path");

const vscode_1 = require("vscode");

const types_1 = require("../../client/common/application/types");

const workspace_1 = require("../../client/common/application/workspace");

const constants_1 = require("../../client/common/constants");

const productInstaller_1 = require("../../client/common/installer/productInstaller");

const productPath_1 = require("../../client/common/installer/productPath");

const productService_1 = require("../../client/common/installer/productService");

const types_2 = require("../../client/common/installer/types");

const types_3 = require("../../client/common/types");

const linterManager_1 = require("../../client/linters/linterManager");

const types_4 = require("../../client/linters/types");

const common_1 = require("../common");

const initialize_1 = require("../initialize");

const serviceRegistry_1 = require("../unittests/serviceRegistry");

const workspaceUri = vscode_1.Uri.file(path.join(__dirname, '..', '..', '..', 'src', 'test'));
const pythoFilesPath = path.join(__dirname, '..', '..', '..', 'src', 'test', 'pythonFiles', 'linting');
const flake8ConfigPath = path.join(pythoFilesPath, 'flake8config');
const pep8ConfigPath = path.join(pythoFilesPath, 'pep8config');
const pydocstyleConfigPath27 = path.join(pythoFilesPath, 'pydocstyleconfig27');
const pylintConfigPath = path.join(pythoFilesPath, 'pylintconfig');
const fileToLint = path.join(pythoFilesPath, 'file.py');
const threeLineLintsPath = path.join(pythoFilesPath, 'threeLineLints.py');
const pylintMessagesToBeReturned = [{
  line: 24,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 30,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 34,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0012',
  message: 'Locally enabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 40,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 44,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0012',
  message: 'Locally enabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 55,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 59,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0012',
  message: 'Locally enabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 62,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling undefined-variable (E0602)',
  provider: '',
  type: ''
}, {
  line: 70,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 84,
  column: 0,
  severity: types_4.LintMessageSeverity.Information,
  code: 'I0011',
  message: 'Locally disabling no-member (E1101)',
  provider: '',
  type: ''
}, {
  line: 87,
  column: 0,
  severity: types_4.LintMessageSeverity.Hint,
  code: 'C0304',
  message: 'Final newline missing',
  provider: '',
  type: ''
}, {
  line: 11,
  column: 20,
  severity: types_4.LintMessageSeverity.Warning,
  code: 'W0613',
  message: 'Unused argument \'arg\'',
  provider: '',
  type: ''
}, {
  line: 26,
  column: 14,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blop\' member',
  provider: '',
  type: ''
}, {
  line: 36,
  column: 14,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}, {
  line: 46,
  column: 18,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}, {
  line: 61,
  column: 18,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}, {
  line: 72,
  column: 18,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}, {
  line: 75,
  column: 18,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}, {
  line: 77,
  column: 14,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}, {
  line: 83,
  column: 14,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E1101',
  message: 'Instance of \'Foo\' has no \'blip\' member',
  provider: '',
  type: ''
}];
const flake8MessagesToBeReturned = [{
  line: 5,
  column: 1,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E302',
  message: 'expected 2 blank lines, found 1',
  provider: '',
  type: ''
}, {
  line: 19,
  column: 15,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E127',
  message: 'continuation line over-indented for visual indent',
  provider: '',
  type: ''
}, {
  line: 24,
  column: 23,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E261',
  message: 'at least two spaces before inline comment',
  provider: '',
  type: ''
}, {
  line: 62,
  column: 30,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E261',
  message: 'at least two spaces before inline comment',
  provider: '',
  type: ''
}, {
  line: 70,
  column: 22,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E261',
  message: 'at least two spaces before inline comment',
  provider: '',
  type: ''
}, {
  line: 80,
  column: 5,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E303',
  message: 'too many blank lines (2)',
  provider: '',
  type: ''
}, {
  line: 87,
  column: 24,
  severity: types_4.LintMessageSeverity.Warning,
  code: 'W292',
  message: 'no newline at end of file',
  provider: '',
  type: ''
}];
const pep8MessagesToBeReturned = [{
  line: 5,
  column: 1,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E302',
  message: 'expected 2 blank lines, found 1',
  provider: '',
  type: ''
}, {
  line: 19,
  column: 15,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E127',
  message: 'continuation line over-indented for visual indent',
  provider: '',
  type: ''
}, {
  line: 24,
  column: 23,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E261',
  message: 'at least two spaces before inline comment',
  provider: '',
  type: ''
}, {
  line: 62,
  column: 30,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E261',
  message: 'at least two spaces before inline comment',
  provider: '',
  type: ''
}, {
  line: 70,
  column: 22,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E261',
  message: 'at least two spaces before inline comment',
  provider: '',
  type: ''
}, {
  line: 80,
  column: 5,
  severity: types_4.LintMessageSeverity.Error,
  code: 'E303',
  message: 'too many blank lines (2)',
  provider: '',
  type: ''
}, {
  line: 87,
  column: 24,
  severity: types_4.LintMessageSeverity.Warning,
  code: 'W292',
  message: 'no newline at end of file',
  provider: '',
  type: ''
}];
const pydocstyleMessagseToBeReturned = [{
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'e\')',
  column: 0,
  line: 1,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'t\')',
  column: 0,
  line: 5,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D102',
  severity: types_4.LintMessageSeverity.Information,
  message: 'Missing docstring in public method',
  column: 4,
  line: 8,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D401',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should be in imperative mood (\'thi\', not \'this\')',
  column: 4,
  line: 11,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'This\', not \'this\')',
  column: 4,
  line: 11,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'e\')',
  column: 4,
  line: 11,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'And\', not \'and\')',
  column: 4,
  line: 15,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'t\')',
  column: 4,
  line: 15,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'Test\', not \'test\')',
  column: 4,
  line: 21,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'g\')',
  column: 4,
  line: 21,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'Test\', not \'test\')',
  column: 4,
  line: 28,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'g\')',
  column: 4,
  line: 28,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'Test\', not \'test\')',
  column: 4,
  line: 38,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'g\')',
  column: 4,
  line: 38,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'Test\', not \'test\')',
  column: 4,
  line: 53,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'g\')',
  column: 4,
  line: 53,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'Test\', not \'test\')',
  column: 4,
  line: 68,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'g\')',
  column: 4,
  line: 68,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D403',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First word of the first line should be properly capitalized (\'Test\', not \'test\')',
  column: 4,
  line: 80,
  type: '',
  provider: 'pydocstyle'
}, {
  code: 'D400',
  severity: types_4.LintMessageSeverity.Information,
  message: 'First line should end with a period (not \'g\')',
  column: 4,
  line: 80,
  type: '',
  provider: 'pydocstyle'
}];
const filteredFlake8MessagesToBeReturned = [{
  line: 87,
  column: 24,
  severity: types_4.LintMessageSeverity.Warning,
  code: 'W292',
  message: 'no newline at end of file',
  provider: '',
  type: ''
}];
const filteredPep88MessagesToBeReturned = [{
  line: 87,
  column: 24,
  severity: types_4.LintMessageSeverity.Warning,
  code: 'W292',
  message: 'no newline at end of file',
  provider: '',
  type: ''
}]; // tslint:disable-next-line:max-func-body-length

suite('Linting - General Tests', () => {
  let ioc;
  let linterManager;
  let configService;
  suiteSetup(initialize_1.initialize);
  setup(() => __awaiter(void 0, void 0, void 0, function* () {
    initializeDI();
    yield initialize_1.initializeTest();
    yield resetSettings();
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(() => __awaiter(void 0, void 0, void 0, function* () {
    ioc.dispose();
    yield initialize_1.closeActiveWindows();
    yield resetSettings();
    yield common_1.deleteFile(path.join(workspaceUri.fsPath, '.pylintrc'));
    yield common_1.deleteFile(path.join(workspaceUri.fsPath, '.pydocstyle'));
  }));

  function initializeDI() {
    ioc = new serviceRegistry_1.UnitTestIocContainer();
    ioc.registerCommonTypes(false);
    ioc.registerProcessTypes();
    ioc.registerLinterTypes();
    ioc.registerVariableTypes();
    ioc.registerPlatformTypes();
    linterManager = new linterManager_1.LinterManager(ioc.serviceContainer, new workspace_1.WorkspaceService());
    configService = ioc.serviceContainer.get(types_3.IConfigurationService);
    ioc.serviceManager.addSingletonInstance(types_2.IProductService, new productService_1.ProductService());
    ioc.serviceManager.addSingleton(types_2.IProductPathService, productPath_1.CTagsProductPathService, types_3.ProductType.WorkspaceSymbols);
    ioc.serviceManager.addSingleton(types_2.IProductPathService, productPath_1.FormatterProductPathService, types_3.ProductType.Formatter);
    ioc.serviceManager.addSingleton(types_2.IProductPathService, productPath_1.LinterProductPathService, types_3.ProductType.Linter);
    ioc.serviceManager.addSingleton(types_2.IProductPathService, productPath_1.TestFrameworkProductPathService, types_3.ProductType.TestFramework);
    ioc.serviceManager.addSingleton(types_2.IProductPathService, productPath_1.RefactoringLibraryProductPathService, types_3.ProductType.RefactoringLibrary);
  }

  function resetSettings() {
    return __awaiter(this, void 0, void 0, function* () {
      // Don't run these updates in parallel, as they are updating the same file.
      const target = initialize_1.IS_MULTI_ROOT_TEST ? vscode_1.ConfigurationTarget.WorkspaceFolder : vscode_1.ConfigurationTarget.Workspace;
      yield configService.updateSetting('linting.enabled', true, common_1.rootWorkspaceUri, target);
      yield configService.updateSetting('linting.lintOnSave', false, common_1.rootWorkspaceUri, target);
      yield configService.updateSetting('linting.pylintUseMinimalCheckers', false, workspaceUri);
      linterManager.getAllLinterInfos().forEach(x => __awaiter(this, void 0, void 0, function* () {
        yield configService.updateSetting(makeSettingKey(x.product), false, common_1.rootWorkspaceUri, target);
      }));
    });
  }

  function makeSettingKey(product) {
    return `linting.${linterManager.getLinterInfo(product).enabledSettingName}`;
  }

  function testEnablingDisablingOfLinter(product, enabled, file) {
    return __awaiter(this, void 0, void 0, function* () {
      const setting = makeSettingKey(product);
      const output = ioc.serviceContainer.get(types_3.IOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
      yield configService.updateSetting(setting, enabled, common_1.rootWorkspaceUri, initialize_1.IS_MULTI_ROOT_TEST ? vscode_1.ConfigurationTarget.WorkspaceFolder : vscode_1.ConfigurationTarget.Workspace);
      file = file ? file : fileToLint;
      const document = yield vscode_1.workspace.openTextDocument(file);
      const cancelToken = new vscode_1.CancellationTokenSource();
      yield linterManager.setActiveLintersAsync([product]);
      yield linterManager.enableLintingAsync(enabled);
      const linter = yield linterManager.createLinter(product, output, ioc.serviceContainer);
      const messages = yield linter.lint(document, cancelToken.token);

      if (enabled) {
        assert.notEqual(messages.length, 0, `No linter errors when linter is enabled, Output - ${output.output}`);
      } else {
        assert.equal(messages.length, 0, `Errors returned when linter is disabled, Output - ${output.output}`);
      }
    });
  }

  test('Disable Pylint and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pylint, false);
  }));
  test('Enable Pylint and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pylint, true);
  }));
  test('Disable Pep8 and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pep8, false);
  }));
  test('Enable Pep8 and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pep8, true);
  }));
  test('Disable Flake8 and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.flake8, false);
  }));
  test('Enable Flake8 and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.flake8, true);
  }));
  test('Disable Prospector and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.prospector, false);
  }));
  test('Enable Prospector and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.prospector, true);
  }));
  test('Disable Pydocstyle and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pydocstyle, false);
  }));
  test('Enable Pydocstyle and test linter', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pydocstyle, true);
  })); // tslint:disable-next-line:no-any

  function testLinterMessages(product, pythonFile, messagesToBeReceived) {
    return __awaiter(this, void 0, void 0, function* () {
      const outputChannel = ioc.serviceContainer.get(types_3.IOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
      const cancelToken = new vscode_1.CancellationTokenSource();
      const document = yield vscode_1.workspace.openTextDocument(pythonFile);
      yield linterManager.setActiveLintersAsync([product], document.uri);
      const linter = yield linterManager.createLinter(product, outputChannel, ioc.serviceContainer);
      const messages = yield linter.lint(document, cancelToken.token);

      if (messagesToBeReceived.length === 0) {
        assert.equal(messages.length, 0, `No errors in linter, Output - ${outputChannel.output}`);
      } else {
        if (outputChannel.output.indexOf('ENOENT') === -1) {
          // Pylint for Python Version 2.7 could return 80 linter messages, where as in 3.5 it might only return 1.
          // Looks like pylint stops linting as soon as it comes across any ERRORS.
          assert.notEqual(messages.length, 0, `No errors in linter, Output - ${outputChannel.output}`);
        }
      }
    });
  }

  test('PyLint', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testLinterMessages(productInstaller_1.Product.pylint, fileToLint, pylintMessagesToBeReturned);
  }));
  test('Flake8', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testLinterMessages(productInstaller_1.Product.flake8, fileToLint, flake8MessagesToBeReturned);
  }));
  test('Pep8', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testLinterMessages(productInstaller_1.Product.pep8, fileToLint, pep8MessagesToBeReturned);
  }));
  test('Pydocstyle', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testLinterMessages(productInstaller_1.Product.pydocstyle, fileToLint, pydocstyleMessagseToBeReturned);
  }));
  test('PyLint with config in root', () => __awaiter(void 0, void 0, void 0, function* () {
    yield fs.copy(path.join(pylintConfigPath, '.pylintrc'), path.join(workspaceUri.fsPath, '.pylintrc'));
    yield testLinterMessages(productInstaller_1.Product.pylint, path.join(pylintConfigPath, 'file2.py'), []);
  }));
  test('Flake8 with config in root', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testLinterMessages(productInstaller_1.Product.flake8, path.join(flake8ConfigPath, 'file.py'), filteredFlake8MessagesToBeReturned);
  }));
  test('Pep8 with config in root', () => __awaiter(void 0, void 0, void 0, function* () {
    yield testLinterMessages(productInstaller_1.Product.pep8, path.join(pep8ConfigPath, 'file.py'), filteredPep88MessagesToBeReturned);
  }));
  test('Pydocstyle with config in root', () => __awaiter(void 0, void 0, void 0, function* () {
    yield configService.updateSetting('linting.pylintUseMinimalCheckers', false, workspaceUri);
    yield fs.copy(path.join(pydocstyleConfigPath27, '.pydocstyle'), path.join(workspaceUri.fsPath, '.pydocstyle'));
    yield testLinterMessages(productInstaller_1.Product.pydocstyle, path.join(pydocstyleConfigPath27, 'file.py'), []);
  }));
  test('PyLint minimal checkers', () => __awaiter(void 0, void 0, void 0, function* () {
    const file = path.join(pythoFilesPath, 'minCheck.py');
    yield configService.updateSetting('linting.pylintUseMinimalCheckers', true, workspaceUri);
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pylint, false, file);
    yield configService.updateSetting('linting.pylintUseMinimalCheckers', false, workspaceUri);
    yield testEnablingDisablingOfLinter(productInstaller_1.Product.pylint, true, file);
  })); // tslint:disable-next-line:no-function-expression

  test('Multiple linters', function () {
    return __awaiter(this, void 0, void 0, function* () {
      //      Unreliable test being skipped until we can sort it out.  See gh-2609.
      //          - Fails about 1/3 of runs on Windows
      //          - Symptom: lintingEngine::lintOpenPythonFiles returns values *after* command await resolves in lint.tests
      //          - lintOpenPythonFiles returns 3 sets of values, not what I expect (1).
      //          - Haven't yet found a way to await on this properly.
      const skipped = true;

      if (skipped) {
        // tslint:disable-next-line:no-invalid-this
        return this.skip();
      }

      yield initialize_1.closeActiveWindows();
      const document = yield vscode_1.workspace.openTextDocument(path.join(pythoFilesPath, 'print.py'));
      yield vscode_1.window.showTextDocument(document);
      yield configService.updateSetting('linting.enabled', true, workspaceUri);
      yield configService.updateSetting('linting.pylintUseMinimalCheckers', false, workspaceUri);
      yield configService.updateSetting('linting.pylintEnabled', true, workspaceUri);
      yield configService.updateSetting('linting.flake8Enabled', true, workspaceUri);
      const commands = ioc.serviceContainer.get(types_1.ICommandManager);
      const collection = yield commands.executeCommand('python.runLinting');
      assert.notEqual(collection, undefined, 'python.runLinting did not return valid diagnostics collection.');
      const messages = collection.get(document.uri);
      assert.notEqual(messages.length, 0, 'No diagnostic messages.');
      assert.notEqual(messages.filter(x => x.source === 'pylint').length, 0, 'No pylint messages.');
      assert.notEqual(messages.filter(x => x.source === 'flake8').length, 0, 'No flake8 messages.');
    });
  }); // tslint:disable-next-line:no-any

  function testLinterMessageCount(product, pythonFile, messageCountToBeReceived) {
    return __awaiter(this, void 0, void 0, function* () {
      const outputChannel = ioc.serviceContainer.get(types_3.IOutputChannel, constants_1.STANDARD_OUTPUT_CHANNEL);
      const cancelToken = new vscode_1.CancellationTokenSource();
      const document = yield vscode_1.workspace.openTextDocument(pythonFile);
      yield linterManager.setActiveLintersAsync([product], document.uri);
      const linter = yield linterManager.createLinter(product, outputChannel, ioc.serviceContainer);
      const messages = yield linter.lint(document, cancelToken.token);
      assert.equal(messages.length, messageCountToBeReceived, 'Expected number of lint errors does not match lint error count');
    });
  }

  test('Three line output counted as one message', () => __awaiter(void 0, void 0, void 0, function* () {
    const maxErrors = 5;
    const target = initialize_1.IS_MULTI_ROOT_TEST ? vscode_1.ConfigurationTarget.WorkspaceFolder : vscode_1.ConfigurationTarget.Workspace;
    yield configService.updateSetting('linting.maxNumberOfProblems', maxErrors, common_1.rootWorkspaceUri, target);
    yield testLinterMessageCount(productInstaller_1.Product.pylint, threeLineLintsPath, maxErrors);
  }));
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbnQudGVzdC5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwiYXNzZXJ0IiwicmVxdWlyZSIsImZzIiwicGF0aCIsInZzY29kZV8xIiwidHlwZXNfMSIsIndvcmtzcGFjZV8xIiwiY29uc3RhbnRzXzEiLCJwcm9kdWN0SW5zdGFsbGVyXzEiLCJwcm9kdWN0UGF0aF8xIiwicHJvZHVjdFNlcnZpY2VfMSIsInR5cGVzXzIiLCJ0eXBlc18zIiwibGludGVyTWFuYWdlcl8xIiwidHlwZXNfNCIsImNvbW1vbl8xIiwiaW5pdGlhbGl6ZV8xIiwic2VydmljZVJlZ2lzdHJ5XzEiLCJ3b3Jrc3BhY2VVcmkiLCJVcmkiLCJmaWxlIiwiam9pbiIsIl9fZGlybmFtZSIsInB5dGhvRmlsZXNQYXRoIiwiZmxha2U4Q29uZmlnUGF0aCIsInBlcDhDb25maWdQYXRoIiwicHlkb2NzdHlsZUNvbmZpZ1BhdGgyNyIsInB5bGludENvbmZpZ1BhdGgiLCJmaWxlVG9MaW50IiwidGhyZWVMaW5lTGludHNQYXRoIiwicHlsaW50TWVzc2FnZXNUb0JlUmV0dXJuZWQiLCJsaW5lIiwiY29sdW1uIiwic2V2ZXJpdHkiLCJMaW50TWVzc2FnZVNldmVyaXR5IiwiSW5mb3JtYXRpb24iLCJjb2RlIiwibWVzc2FnZSIsInByb3ZpZGVyIiwidHlwZSIsIkhpbnQiLCJXYXJuaW5nIiwiRXJyb3IiLCJmbGFrZThNZXNzYWdlc1RvQmVSZXR1cm5lZCIsInBlcDhNZXNzYWdlc1RvQmVSZXR1cm5lZCIsInB5ZG9jc3R5bGVNZXNzYWdzZVRvQmVSZXR1cm5lZCIsImZpbHRlcmVkRmxha2U4TWVzc2FnZXNUb0JlUmV0dXJuZWQiLCJmaWx0ZXJlZFBlcDg4TWVzc2FnZXNUb0JlUmV0dXJuZWQiLCJzdWl0ZSIsImlvYyIsImxpbnRlck1hbmFnZXIiLCJjb25maWdTZXJ2aWNlIiwic3VpdGVTZXR1cCIsImluaXRpYWxpemUiLCJzZXR1cCIsImluaXRpYWxpemVESSIsImluaXRpYWxpemVUZXN0IiwicmVzZXRTZXR0aW5ncyIsInN1aXRlVGVhcmRvd24iLCJjbG9zZUFjdGl2ZVdpbmRvd3MiLCJ0ZWFyZG93biIsImRpc3Bvc2UiLCJkZWxldGVGaWxlIiwiZnNQYXRoIiwiVW5pdFRlc3RJb2NDb250YWluZXIiLCJyZWdpc3RlckNvbW1vblR5cGVzIiwicmVnaXN0ZXJQcm9jZXNzVHlwZXMiLCJyZWdpc3RlckxpbnRlclR5cGVzIiwicmVnaXN0ZXJWYXJpYWJsZVR5cGVzIiwicmVnaXN0ZXJQbGF0Zm9ybVR5cGVzIiwiTGludGVyTWFuYWdlciIsInNlcnZpY2VDb250YWluZXIiLCJXb3Jrc3BhY2VTZXJ2aWNlIiwiZ2V0IiwiSUNvbmZpZ3VyYXRpb25TZXJ2aWNlIiwic2VydmljZU1hbmFnZXIiLCJhZGRTaW5nbGV0b25JbnN0YW5jZSIsIklQcm9kdWN0U2VydmljZSIsIlByb2R1Y3RTZXJ2aWNlIiwiYWRkU2luZ2xldG9uIiwiSVByb2R1Y3RQYXRoU2VydmljZSIsIkNUYWdzUHJvZHVjdFBhdGhTZXJ2aWNlIiwiUHJvZHVjdFR5cGUiLCJXb3Jrc3BhY2VTeW1ib2xzIiwiRm9ybWF0dGVyUHJvZHVjdFBhdGhTZXJ2aWNlIiwiRm9ybWF0dGVyIiwiTGludGVyUHJvZHVjdFBhdGhTZXJ2aWNlIiwiTGludGVyIiwiVGVzdEZyYW1ld29ya1Byb2R1Y3RQYXRoU2VydmljZSIsIlRlc3RGcmFtZXdvcmsiLCJSZWZhY3RvcmluZ0xpYnJhcnlQcm9kdWN0UGF0aFNlcnZpY2UiLCJSZWZhY3RvcmluZ0xpYnJhcnkiLCJ0YXJnZXQiLCJJU19NVUxUSV9ST09UX1RFU1QiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiV29ya3NwYWNlRm9sZGVyIiwiV29ya3NwYWNlIiwidXBkYXRlU2V0dGluZyIsInJvb3RXb3Jrc3BhY2VVcmkiLCJnZXRBbGxMaW50ZXJJbmZvcyIsImZvckVhY2giLCJ4IiwibWFrZVNldHRpbmdLZXkiLCJwcm9kdWN0IiwiZ2V0TGludGVySW5mbyIsImVuYWJsZWRTZXR0aW5nTmFtZSIsInRlc3RFbmFibGluZ0Rpc2FibGluZ09mTGludGVyIiwiZW5hYmxlZCIsInNldHRpbmciLCJvdXRwdXQiLCJJT3V0cHV0Q2hhbm5lbCIsIlNUQU5EQVJEX09VVFBVVF9DSEFOTkVMIiwiZG9jdW1lbnQiLCJ3b3Jrc3BhY2UiLCJvcGVuVGV4dERvY3VtZW50IiwiY2FuY2VsVG9rZW4iLCJDYW5jZWxsYXRpb25Ub2tlblNvdXJjZSIsInNldEFjdGl2ZUxpbnRlcnNBc3luYyIsImVuYWJsZUxpbnRpbmdBc3luYyIsImxpbnRlciIsImNyZWF0ZUxpbnRlciIsIm1lc3NhZ2VzIiwibGludCIsInRva2VuIiwibm90RXF1YWwiLCJsZW5ndGgiLCJlcXVhbCIsInRlc3QiLCJQcm9kdWN0IiwicHlsaW50IiwicGVwOCIsImZsYWtlOCIsInByb3NwZWN0b3IiLCJweWRvY3N0eWxlIiwidGVzdExpbnRlck1lc3NhZ2VzIiwicHl0aG9uRmlsZSIsIm1lc3NhZ2VzVG9CZVJlY2VpdmVkIiwib3V0cHV0Q2hhbm5lbCIsInVyaSIsImluZGV4T2YiLCJjb3B5Iiwic2tpcHBlZCIsInNraXAiLCJ3aW5kb3ciLCJzaG93VGV4dERvY3VtZW50IiwiY29tbWFuZHMiLCJJQ29tbWFuZE1hbmFnZXIiLCJjb2xsZWN0aW9uIiwiZXhlY3V0ZUNvbW1hbmQiLCJ1bmRlZmluZWQiLCJmaWx0ZXIiLCJzb3VyY2UiLCJ0ZXN0TGludGVyTWVzc2FnZUNvdW50IiwibWVzc2FnZUNvdW50VG9CZVJlY2VpdmVkIiwibWF4RXJyb3JzIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsU0FBUyxHQUFJLFVBQVEsU0FB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LGdCQUF2RCxDQUFyQjtBQUNBLFlBQU1rRCxRQUFRLEdBQUcsTUFBTUYsTUFBTSxDQUFDRyxJQUFQLENBQVlWLFFBQVosRUFBc0JHLFdBQVcsQ0FBQ1EsS0FBbEMsQ0FBdkI7QUFDQTNILE1BQUFBLE1BQU0sQ0FBQzhILEtBQVAsQ0FBYUwsUUFBUSxDQUFDSSxNQUF0QixFQUE4QjRCLHdCQUE5QixFQUF3RCxnRUFBeEQ7QUFDSCxLQVJlLENBQWhCO0FBU0g7O0FBQ0QxQixFQUFBQSxJQUFJLENBQUMsMENBQUQsRUFBNkMsTUFBTXBKLFNBQVMsU0FBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDaEcsVUFBTStLLFNBQVMsR0FBRyxDQUFsQjtBQUNBLFVBQU05RCxNQUFNLEdBQUc1RSxZQUFZLENBQUM2RSxrQkFBYixHQUFrQ3pGLFFBQVEsQ0FBQzBGLG1CQUFULENBQTZCQyxlQUEvRCxHQUFpRjNGLFFBQVEsQ0FBQzBGLG1CQUFULENBQTZCRSxTQUE3SDtBQUNBLFVBQU03QyxhQUFhLENBQUM4QyxhQUFkLENBQTRCLDZCQUE1QixFQUEyRHlELFNBQTNELEVBQXNFM0ksUUFBUSxDQUFDbUYsZ0JBQS9FLEVBQWlHTixNQUFqRyxDQUFOO0FBQ0EsVUFBTTRELHNCQUFzQixDQUFDaEosa0JBQWtCLENBQUN3SCxPQUFuQixDQUEyQkMsTUFBNUIsRUFBb0NwRyxrQkFBcEMsRUFBd0Q2SCxTQUF4RCxDQUE1QjtBQUNILEdBTCtELENBQTVELENBQUo7QUFNSCxDQXpNSSxDQUFMIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuJ3VzZSBzdHJpY3QnO1xyXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIik7XHJcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzLWV4dHJhXCIpO1xyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvY29tbW9uL2FwcGxpY2F0aW9uL3R5cGVzXCIpO1xyXG5jb25zdCB3b3Jrc3BhY2VfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvY29tbW9uL2FwcGxpY2F0aW9uL3dvcmtzcGFjZVwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L2NvbW1vbi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHByb2R1Y3RJbnN0YWxsZXJfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvY29tbW9uL2luc3RhbGxlci9wcm9kdWN0SW5zdGFsbGVyXCIpO1xyXG5jb25zdCBwcm9kdWN0UGF0aF8xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9jb21tb24vaW5zdGFsbGVyL3Byb2R1Y3RQYXRoXCIpO1xyXG5jb25zdCBwcm9kdWN0U2VydmljZV8xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9jb21tb24vaW5zdGFsbGVyL3Byb2R1Y3RTZXJ2aWNlXCIpO1xyXG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9jb21tb24vaW5zdGFsbGVyL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IGxpbnRlck1hbmFnZXJfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvbGludGVycy9saW50ZXJNYW5hZ2VyXCIpO1xyXG5jb25zdCB0eXBlc180ID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9saW50ZXJzL3R5cGVzXCIpO1xyXG5jb25zdCBjb21tb25fMSA9IHJlcXVpcmUoXCIuLi9jb21tb25cIik7XHJcbmNvbnN0IGluaXRpYWxpemVfMSA9IHJlcXVpcmUoXCIuLi9pbml0aWFsaXplXCIpO1xyXG5jb25zdCBzZXJ2aWNlUmVnaXN0cnlfMSA9IHJlcXVpcmUoXCIuLi91bml0dGVzdHMvc2VydmljZVJlZ2lzdHJ5XCIpO1xyXG5jb25zdCB3b3Jrc3BhY2VVcmkgPSB2c2NvZGVfMS5VcmkuZmlsZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnLi4nLCAnc3JjJywgJ3Rlc3QnKSk7XHJcbmNvbnN0IHB5dGhvRmlsZXNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJy4uJywgJ3NyYycsICd0ZXN0JywgJ3B5dGhvbkZpbGVzJywgJ2xpbnRpbmcnKTtcclxuY29uc3QgZmxha2U4Q29uZmlnUGF0aCA9IHBhdGguam9pbihweXRob0ZpbGVzUGF0aCwgJ2ZsYWtlOGNvbmZpZycpO1xyXG5jb25zdCBwZXA4Q29uZmlnUGF0aCA9IHBhdGguam9pbihweXRob0ZpbGVzUGF0aCwgJ3BlcDhjb25maWcnKTtcclxuY29uc3QgcHlkb2NzdHlsZUNvbmZpZ1BhdGgyNyA9IHBhdGguam9pbihweXRob0ZpbGVzUGF0aCwgJ3B5ZG9jc3R5bGVjb25maWcyNycpO1xyXG5jb25zdCBweWxpbnRDb25maWdQYXRoID0gcGF0aC5qb2luKHB5dGhvRmlsZXNQYXRoLCAncHlsaW50Y29uZmlnJyk7XHJcbmNvbnN0IGZpbGVUb0xpbnQgPSBwYXRoLmpvaW4ocHl0aG9GaWxlc1BhdGgsICdmaWxlLnB5Jyk7XHJcbmNvbnN0IHRocmVlTGluZUxpbnRzUGF0aCA9IHBhdGguam9pbihweXRob0ZpbGVzUGF0aCwgJ3RocmVlTGluZUxpbnRzLnB5Jyk7XHJcbmNvbnN0IHB5bGludE1lc3NhZ2VzVG9CZVJldHVybmVkID0gW1xyXG4gICAgeyBsaW5lOiAyNCwgY29sdW1uOiAwLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBjb2RlOiAnSTAwMTEnLCBtZXNzYWdlOiAnTG9jYWxseSBkaXNhYmxpbmcgbm8tbWVtYmVyIChFMTEwMSknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDMwLCBjb2x1bW46IDAsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIGNvZGU6ICdJMDAxMScsIG1lc3NhZ2U6ICdMb2NhbGx5IGRpc2FibGluZyBuby1tZW1iZXIgKEUxMTAxKScsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogMzQsIGNvbHVtbjogMCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgY29kZTogJ0kwMDEyJywgbWVzc2FnZTogJ0xvY2FsbHkgZW5hYmxpbmcgbm8tbWVtYmVyIChFMTEwMSknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDQwLCBjb2x1bW46IDAsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIGNvZGU6ICdJMDAxMScsIG1lc3NhZ2U6ICdMb2NhbGx5IGRpc2FibGluZyBuby1tZW1iZXIgKEUxMTAxKScsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogNDQsIGNvbHVtbjogMCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgY29kZTogJ0kwMDEyJywgbWVzc2FnZTogJ0xvY2FsbHkgZW5hYmxpbmcgbm8tbWVtYmVyIChFMTEwMSknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDU1LCBjb2x1bW46IDAsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIGNvZGU6ICdJMDAxMScsIG1lc3NhZ2U6ICdMb2NhbGx5IGRpc2FibGluZyBuby1tZW1iZXIgKEUxMTAxKScsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogNTksIGNvbHVtbjogMCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgY29kZTogJ0kwMDEyJywgbWVzc2FnZTogJ0xvY2FsbHkgZW5hYmxpbmcgbm8tbWVtYmVyIChFMTEwMSknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDYyLCBjb2x1bW46IDAsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIGNvZGU6ICdJMDAxMScsIG1lc3NhZ2U6ICdMb2NhbGx5IGRpc2FibGluZyB1bmRlZmluZWQtdmFyaWFibGUgKEUwNjAyKScsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogNzAsIGNvbHVtbjogMCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgY29kZTogJ0kwMDExJywgbWVzc2FnZTogJ0xvY2FsbHkgZGlzYWJsaW5nIG5vLW1lbWJlciAoRTExMDEpJywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiA4NCwgY29sdW1uOiAwLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBjb2RlOiAnSTAwMTEnLCBtZXNzYWdlOiAnTG9jYWxseSBkaXNhYmxpbmcgbm8tbWVtYmVyIChFMTEwMSknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDg3LCBjb2x1bW46IDAsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSGludCwgY29kZTogJ0MwMzA0JywgbWVzc2FnZTogJ0ZpbmFsIG5ld2xpbmUgbWlzc2luZycsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogMTEsIGNvbHVtbjogMjAsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuV2FybmluZywgY29kZTogJ1cwNjEzJywgbWVzc2FnZTogJ1VudXNlZCBhcmd1bWVudCBcXCdhcmdcXCcnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDI2LCBjb2x1bW46IDE0LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTExMDEnLCBtZXNzYWdlOiAnSW5zdGFuY2Ugb2YgXFwnRm9vXFwnIGhhcyBubyBcXCdibG9wXFwnIG1lbWJlcicsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogMzYsIGNvbHVtbjogMTQsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMTEwMScsIG1lc3NhZ2U6ICdJbnN0YW5jZSBvZiBcXCdGb29cXCcgaGFzIG5vIFxcJ2JsaXBcXCcgbWVtYmVyJywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiA0NiwgY29sdW1uOiAxOCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5FcnJvciwgY29kZTogJ0UxMTAxJywgbWVzc2FnZTogJ0luc3RhbmNlIG9mIFxcJ0Zvb1xcJyBoYXMgbm8gXFwnYmxpcFxcJyBtZW1iZXInLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDYxLCBjb2x1bW46IDE4LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTExMDEnLCBtZXNzYWdlOiAnSW5zdGFuY2Ugb2YgXFwnRm9vXFwnIGhhcyBubyBcXCdibGlwXFwnIG1lbWJlcicsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogNzIsIGNvbHVtbjogMTgsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMTEwMScsIG1lc3NhZ2U6ICdJbnN0YW5jZSBvZiBcXCdGb29cXCcgaGFzIG5vIFxcJ2JsaXBcXCcgbWVtYmVyJywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiA3NSwgY29sdW1uOiAxOCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5FcnJvciwgY29kZTogJ0UxMTAxJywgbWVzc2FnZTogJ0luc3RhbmNlIG9mIFxcJ0Zvb1xcJyBoYXMgbm8gXFwnYmxpcFxcJyBtZW1iZXInLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDc3LCBjb2x1bW46IDE0LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTExMDEnLCBtZXNzYWdlOiAnSW5zdGFuY2Ugb2YgXFwnRm9vXFwnIGhhcyBubyBcXCdibGlwXFwnIG1lbWJlcicsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogODMsIGNvbHVtbjogMTQsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMTEwMScsIG1lc3NhZ2U6ICdJbnN0YW5jZSBvZiBcXCdGb29cXCcgaGFzIG5vIFxcJ2JsaXBcXCcgbWVtYmVyJywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9XHJcbl07XHJcbmNvbnN0IGZsYWtlOE1lc3NhZ2VzVG9CZVJldHVybmVkID0gW1xyXG4gICAgeyBsaW5lOiA1LCBjb2x1bW46IDEsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMzAyJywgbWVzc2FnZTogJ2V4cGVjdGVkIDIgYmxhbmsgbGluZXMsIGZvdW5kIDEnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDE5LCBjb2x1bW46IDE1LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTEyNycsIG1lc3NhZ2U6ICdjb250aW51YXRpb24gbGluZSBvdmVyLWluZGVudGVkIGZvciB2aXN1YWwgaW5kZW50JywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiAyNCwgY29sdW1uOiAyMywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5FcnJvciwgY29kZTogJ0UyNjEnLCBtZXNzYWdlOiAnYXQgbGVhc3QgdHdvIHNwYWNlcyBiZWZvcmUgaW5saW5lIGNvbW1lbnQnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDYyLCBjb2x1bW46IDMwLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTI2MScsIG1lc3NhZ2U6ICdhdCBsZWFzdCB0d28gc3BhY2VzIGJlZm9yZSBpbmxpbmUgY29tbWVudCcsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogNzAsIGNvbHVtbjogMjIsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMjYxJywgbWVzc2FnZTogJ2F0IGxlYXN0IHR3byBzcGFjZXMgYmVmb3JlIGlubGluZSBjb21tZW50JywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiA4MCwgY29sdW1uOiA1LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTMwMycsIG1lc3NhZ2U6ICd0b28gbWFueSBibGFuayBsaW5lcyAoMiknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDg3LCBjb2x1bW46IDI0LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5Lldhcm5pbmcsIGNvZGU6ICdXMjkyJywgbWVzc2FnZTogJ25vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH1cclxuXTtcclxuY29uc3QgcGVwOE1lc3NhZ2VzVG9CZVJldHVybmVkID0gW1xyXG4gICAgeyBsaW5lOiA1LCBjb2x1bW46IDEsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMzAyJywgbWVzc2FnZTogJ2V4cGVjdGVkIDIgYmxhbmsgbGluZXMsIGZvdW5kIDEnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDE5LCBjb2x1bW46IDE1LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTEyNycsIG1lc3NhZ2U6ICdjb250aW51YXRpb24gbGluZSBvdmVyLWluZGVudGVkIGZvciB2aXN1YWwgaW5kZW50JywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiAyNCwgY29sdW1uOiAyMywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5FcnJvciwgY29kZTogJ0UyNjEnLCBtZXNzYWdlOiAnYXQgbGVhc3QgdHdvIHNwYWNlcyBiZWZvcmUgaW5saW5lIGNvbW1lbnQnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDYyLCBjb2x1bW46IDMwLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTI2MScsIG1lc3NhZ2U6ICdhdCBsZWFzdCB0d28gc3BhY2VzIGJlZm9yZSBpbmxpbmUgY29tbWVudCcsIHByb3ZpZGVyOiAnJywgdHlwZTogJycgfSxcclxuICAgIHsgbGluZTogNzAsIGNvbHVtbjogMjIsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuRXJyb3IsIGNvZGU6ICdFMjYxJywgbWVzc2FnZTogJ2F0IGxlYXN0IHR3byBzcGFjZXMgYmVmb3JlIGlubGluZSBjb21tZW50JywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9LFxyXG4gICAgeyBsaW5lOiA4MCwgY29sdW1uOiA1LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkVycm9yLCBjb2RlOiAnRTMwMycsIG1lc3NhZ2U6ICd0b28gbWFueSBibGFuayBsaW5lcyAoMiknLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH0sXHJcbiAgICB7IGxpbmU6IDg3LCBjb2x1bW46IDI0LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5Lldhcm5pbmcsIGNvZGU6ICdXMjkyJywgbWVzc2FnZTogJ25vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH1cclxuXTtcclxuY29uc3QgcHlkb2NzdHlsZU1lc3NhZ3NlVG9CZVJldHVybmVkID0gW1xyXG4gICAgeyBjb2RlOiAnRDQwMCcsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCBsaW5lIHNob3VsZCBlbmQgd2l0aCBhIHBlcmlvZCAobm90IFxcJ2VcXCcpJywgY29sdW1uOiAwLCBsaW5lOiAxLCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMCcsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCBsaW5lIHNob3VsZCBlbmQgd2l0aCBhIHBlcmlvZCAobm90IFxcJ3RcXCcpJywgY29sdW1uOiAwLCBsaW5lOiA1LCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDEwMicsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdNaXNzaW5nIGRvY3N0cmluZyBpbiBwdWJsaWMgbWV0aG9kJywgY29sdW1uOiA0LCBsaW5lOiA4LCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMScsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCBsaW5lIHNob3VsZCBiZSBpbiBpbXBlcmF0aXZlIG1vb2QgKFxcJ3RoaVxcJywgbm90IFxcJ3RoaXNcXCcpJywgY29sdW1uOiA0LCBsaW5lOiAxMSwgdHlwZTogJycsIHByb3ZpZGVyOiAncHlkb2NzdHlsZScgfSxcclxuICAgIHsgY29kZTogJ0Q0MDMnLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBtZXNzYWdlOiAnRmlyc3Qgd29yZCBvZiB0aGUgZmlyc3QgbGluZSBzaG91bGQgYmUgcHJvcGVybHkgY2FwaXRhbGl6ZWQgKFxcJ1RoaXNcXCcsIG5vdCBcXCd0aGlzXFwnKScsIGNvbHVtbjogNCwgbGluZTogMTEsIHR5cGU6ICcnLCBwcm92aWRlcjogJ3B5ZG9jc3R5bGUnIH0sXHJcbiAgICB7IGNvZGU6ICdENDAwJywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgbWVzc2FnZTogJ0ZpcnN0IGxpbmUgc2hvdWxkIGVuZCB3aXRoIGEgcGVyaW9kIChub3QgXFwnZVxcJyknLCBjb2x1bW46IDQsIGxpbmU6IDExLCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMycsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCB3b3JkIG9mIHRoZSBmaXJzdCBsaW5lIHNob3VsZCBiZSBwcm9wZXJseSBjYXBpdGFsaXplZCAoXFwnQW5kXFwnLCBub3QgXFwnYW5kXFwnKScsIGNvbHVtbjogNCwgbGluZTogMTUsIHR5cGU6ICcnLCBwcm92aWRlcjogJ3B5ZG9jc3R5bGUnIH0sXHJcbiAgICB7IGNvZGU6ICdENDAwJywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgbWVzc2FnZTogJ0ZpcnN0IGxpbmUgc2hvdWxkIGVuZCB3aXRoIGEgcGVyaW9kIChub3QgXFwndFxcJyknLCBjb2x1bW46IDQsIGxpbmU6IDE1LCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMycsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCB3b3JkIG9mIHRoZSBmaXJzdCBsaW5lIHNob3VsZCBiZSBwcm9wZXJseSBjYXBpdGFsaXplZCAoXFwnVGVzdFxcJywgbm90IFxcJ3Rlc3RcXCcpJywgY29sdW1uOiA0LCBsaW5lOiAyMSwgdHlwZTogJycsIHByb3ZpZGVyOiAncHlkb2NzdHlsZScgfSxcclxuICAgIHsgY29kZTogJ0Q0MDAnLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBtZXNzYWdlOiAnRmlyc3QgbGluZSBzaG91bGQgZW5kIHdpdGggYSBwZXJpb2QgKG5vdCBcXCdnXFwnKScsIGNvbHVtbjogNCwgbGluZTogMjEsIHR5cGU6ICcnLCBwcm92aWRlcjogJ3B5ZG9jc3R5bGUnIH0sXHJcbiAgICB7IGNvZGU6ICdENDAzJywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgbWVzc2FnZTogJ0ZpcnN0IHdvcmQgb2YgdGhlIGZpcnN0IGxpbmUgc2hvdWxkIGJlIHByb3Blcmx5IGNhcGl0YWxpemVkIChcXCdUZXN0XFwnLCBub3QgXFwndGVzdFxcJyknLCBjb2x1bW46IDQsIGxpbmU6IDI4LCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMCcsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCBsaW5lIHNob3VsZCBlbmQgd2l0aCBhIHBlcmlvZCAobm90IFxcJ2dcXCcpJywgY29sdW1uOiA0LCBsaW5lOiAyOCwgdHlwZTogJycsIHByb3ZpZGVyOiAncHlkb2NzdHlsZScgfSxcclxuICAgIHsgY29kZTogJ0Q0MDMnLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBtZXNzYWdlOiAnRmlyc3Qgd29yZCBvZiB0aGUgZmlyc3QgbGluZSBzaG91bGQgYmUgcHJvcGVybHkgY2FwaXRhbGl6ZWQgKFxcJ1Rlc3RcXCcsIG5vdCBcXCd0ZXN0XFwnKScsIGNvbHVtbjogNCwgbGluZTogMzgsIHR5cGU6ICcnLCBwcm92aWRlcjogJ3B5ZG9jc3R5bGUnIH0sXHJcbiAgICB7IGNvZGU6ICdENDAwJywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgbWVzc2FnZTogJ0ZpcnN0IGxpbmUgc2hvdWxkIGVuZCB3aXRoIGEgcGVyaW9kIChub3QgXFwnZ1xcJyknLCBjb2x1bW46IDQsIGxpbmU6IDM4LCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMycsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCB3b3JkIG9mIHRoZSBmaXJzdCBsaW5lIHNob3VsZCBiZSBwcm9wZXJseSBjYXBpdGFsaXplZCAoXFwnVGVzdFxcJywgbm90IFxcJ3Rlc3RcXCcpJywgY29sdW1uOiA0LCBsaW5lOiA1MywgdHlwZTogJycsIHByb3ZpZGVyOiAncHlkb2NzdHlsZScgfSxcclxuICAgIHsgY29kZTogJ0Q0MDAnLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBtZXNzYWdlOiAnRmlyc3QgbGluZSBzaG91bGQgZW5kIHdpdGggYSBwZXJpb2QgKG5vdCBcXCdnXFwnKScsIGNvbHVtbjogNCwgbGluZTogNTMsIHR5cGU6ICcnLCBwcm92aWRlcjogJ3B5ZG9jc3R5bGUnIH0sXHJcbiAgICB7IGNvZGU6ICdENDAzJywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgbWVzc2FnZTogJ0ZpcnN0IHdvcmQgb2YgdGhlIGZpcnN0IGxpbmUgc2hvdWxkIGJlIHByb3Blcmx5IGNhcGl0YWxpemVkIChcXCdUZXN0XFwnLCBub3QgXFwndGVzdFxcJyknLCBjb2x1bW46IDQsIGxpbmU6IDY4LCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9LFxyXG4gICAgeyBjb2RlOiAnRDQwMCcsIHNldmVyaXR5OiB0eXBlc180LkxpbnRNZXNzYWdlU2V2ZXJpdHkuSW5mb3JtYXRpb24sIG1lc3NhZ2U6ICdGaXJzdCBsaW5lIHNob3VsZCBlbmQgd2l0aCBhIHBlcmlvZCAobm90IFxcJ2dcXCcpJywgY29sdW1uOiA0LCBsaW5lOiA2OCwgdHlwZTogJycsIHByb3ZpZGVyOiAncHlkb2NzdHlsZScgfSxcclxuICAgIHsgY29kZTogJ0Q0MDMnLCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5LkluZm9ybWF0aW9uLCBtZXNzYWdlOiAnRmlyc3Qgd29yZCBvZiB0aGUgZmlyc3QgbGluZSBzaG91bGQgYmUgcHJvcGVybHkgY2FwaXRhbGl6ZWQgKFxcJ1Rlc3RcXCcsIG5vdCBcXCd0ZXN0XFwnKScsIGNvbHVtbjogNCwgbGluZTogODAsIHR5cGU6ICcnLCBwcm92aWRlcjogJ3B5ZG9jc3R5bGUnIH0sXHJcbiAgICB7IGNvZGU6ICdENDAwJywgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5JbmZvcm1hdGlvbiwgbWVzc2FnZTogJ0ZpcnN0IGxpbmUgc2hvdWxkIGVuZCB3aXRoIGEgcGVyaW9kIChub3QgXFwnZ1xcJyknLCBjb2x1bW46IDQsIGxpbmU6IDgwLCB0eXBlOiAnJywgcHJvdmlkZXI6ICdweWRvY3N0eWxlJyB9XHJcbl07XHJcbmNvbnN0IGZpbHRlcmVkRmxha2U4TWVzc2FnZXNUb0JlUmV0dXJuZWQgPSBbXHJcbiAgICB7IGxpbmU6IDg3LCBjb2x1bW46IDI0LCBzZXZlcml0eTogdHlwZXNfNC5MaW50TWVzc2FnZVNldmVyaXR5Lldhcm5pbmcsIGNvZGU6ICdXMjkyJywgbWVzc2FnZTogJ25vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnLCBwcm92aWRlcjogJycsIHR5cGU6ICcnIH1cclxuXTtcclxuY29uc3QgZmlsdGVyZWRQZXA4OE1lc3NhZ2VzVG9CZVJldHVybmVkID0gW1xyXG4gICAgeyBsaW5lOiA4NywgY29sdW1uOiAyNCwgc2V2ZXJpdHk6IHR5cGVzXzQuTGludE1lc3NhZ2VTZXZlcml0eS5XYXJuaW5nLCBjb2RlOiAnVzI5MicsIG1lc3NhZ2U6ICdubyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJywgcHJvdmlkZXI6ICcnLCB0eXBlOiAnJyB9XHJcbl07XHJcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG5zdWl0ZSgnTGludGluZyAtIEdlbmVyYWwgVGVzdHMnLCAoKSA9PiB7XHJcbiAgICBsZXQgaW9jO1xyXG4gICAgbGV0IGxpbnRlck1hbmFnZXI7XHJcbiAgICBsZXQgY29uZmlnU2VydmljZTtcclxuICAgIHN1aXRlU2V0dXAoaW5pdGlhbGl6ZV8xLmluaXRpYWxpemUpO1xyXG4gICAgc2V0dXAoKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGluaXRpYWxpemVESSgpO1xyXG4gICAgICAgIHlpZWxkIGluaXRpYWxpemVfMS5pbml0aWFsaXplVGVzdCgpO1xyXG4gICAgICAgIHlpZWxkIHJlc2V0U2V0dGluZ3MoKTtcclxuICAgIH0pKTtcclxuICAgIHN1aXRlVGVhcmRvd24oaW5pdGlhbGl6ZV8xLmNsb3NlQWN0aXZlV2luZG93cyk7XHJcbiAgICB0ZWFyZG93bigoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgaW9jLmRpc3Bvc2UoKTtcclxuICAgICAgICB5aWVsZCBpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKCk7XHJcbiAgICAgICAgeWllbGQgcmVzZXRTZXR0aW5ncygpO1xyXG4gICAgICAgIHlpZWxkIGNvbW1vbl8xLmRlbGV0ZUZpbGUocGF0aC5qb2luKHdvcmtzcGFjZVVyaS5mc1BhdGgsICcucHlsaW50cmMnKSk7XHJcbiAgICAgICAgeWllbGQgY29tbW9uXzEuZGVsZXRlRmlsZShwYXRoLmpvaW4od29ya3NwYWNlVXJpLmZzUGF0aCwgJy5weWRvY3N0eWxlJykpO1xyXG4gICAgfSkpO1xyXG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZURJKCkge1xyXG4gICAgICAgIGlvYyA9IG5ldyBzZXJ2aWNlUmVnaXN0cnlfMS5Vbml0VGVzdElvY0NvbnRhaW5lcigpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlckNvbW1vblR5cGVzKGZhbHNlKTtcclxuICAgICAgICBpb2MucmVnaXN0ZXJQcm9jZXNzVHlwZXMoKTtcclxuICAgICAgICBpb2MucmVnaXN0ZXJMaW50ZXJUeXBlcygpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlclZhcmlhYmxlVHlwZXMoKTtcclxuICAgICAgICBpb2MucmVnaXN0ZXJQbGF0Zm9ybVR5cGVzKCk7XHJcbiAgICAgICAgbGludGVyTWFuYWdlciA9IG5ldyBsaW50ZXJNYW5hZ2VyXzEuTGludGVyTWFuYWdlcihpb2Muc2VydmljZUNvbnRhaW5lciwgbmV3IHdvcmtzcGFjZV8xLldvcmtzcGFjZVNlcnZpY2UoKSk7XHJcbiAgICAgICAgY29uZmlnU2VydmljZSA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklDb25maWd1cmF0aW9uU2VydmljZSk7XHJcbiAgICAgICAgaW9jLnNlcnZpY2VNYW5hZ2VyLmFkZFNpbmdsZXRvbkluc3RhbmNlKHR5cGVzXzIuSVByb2R1Y3RTZXJ2aWNlLCBuZXcgcHJvZHVjdFNlcnZpY2VfMS5Qcm9kdWN0U2VydmljZSgpKTtcclxuICAgICAgICBpb2Muc2VydmljZU1hbmFnZXIuYWRkU2luZ2xldG9uKHR5cGVzXzIuSVByb2R1Y3RQYXRoU2VydmljZSwgcHJvZHVjdFBhdGhfMS5DVGFnc1Byb2R1Y3RQYXRoU2VydmljZSwgdHlwZXNfMy5Qcm9kdWN0VHlwZS5Xb3Jrc3BhY2VTeW1ib2xzKTtcclxuICAgICAgICBpb2Muc2VydmljZU1hbmFnZXIuYWRkU2luZ2xldG9uKHR5cGVzXzIuSVByb2R1Y3RQYXRoU2VydmljZSwgcHJvZHVjdFBhdGhfMS5Gb3JtYXR0ZXJQcm9kdWN0UGF0aFNlcnZpY2UsIHR5cGVzXzMuUHJvZHVjdFR5cGUuRm9ybWF0dGVyKTtcclxuICAgICAgICBpb2Muc2VydmljZU1hbmFnZXIuYWRkU2luZ2xldG9uKHR5cGVzXzIuSVByb2R1Y3RQYXRoU2VydmljZSwgcHJvZHVjdFBhdGhfMS5MaW50ZXJQcm9kdWN0UGF0aFNlcnZpY2UsIHR5cGVzXzMuUHJvZHVjdFR5cGUuTGludGVyKTtcclxuICAgICAgICBpb2Muc2VydmljZU1hbmFnZXIuYWRkU2luZ2xldG9uKHR5cGVzXzIuSVByb2R1Y3RQYXRoU2VydmljZSwgcHJvZHVjdFBhdGhfMS5UZXN0RnJhbWV3b3JrUHJvZHVjdFBhdGhTZXJ2aWNlLCB0eXBlc18zLlByb2R1Y3RUeXBlLlRlc3RGcmFtZXdvcmspO1xyXG4gICAgICAgIGlvYy5zZXJ2aWNlTWFuYWdlci5hZGRTaW5nbGV0b24odHlwZXNfMi5JUHJvZHVjdFBhdGhTZXJ2aWNlLCBwcm9kdWN0UGF0aF8xLlJlZmFjdG9yaW5nTGlicmFyeVByb2R1Y3RQYXRoU2VydmljZSwgdHlwZXNfMy5Qcm9kdWN0VHlwZS5SZWZhY3RvcmluZ0xpYnJhcnkpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcmVzZXRTZXR0aW5ncygpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAvLyBEb24ndCBydW4gdGhlc2UgdXBkYXRlcyBpbiBwYXJhbGxlbCwgYXMgdGhleSBhcmUgdXBkYXRpbmcgdGhlIHNhbWUgZmlsZS5cclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gaW5pdGlhbGl6ZV8xLklTX01VTFRJX1JPT1RfVEVTVCA/IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlRm9sZGVyIDogdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2U7XHJcbiAgICAgICAgICAgIHlpZWxkIGNvbmZpZ1NlcnZpY2UudXBkYXRlU2V0dGluZygnbGludGluZy5lbmFibGVkJywgdHJ1ZSwgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgdGFyZ2V0KTtcclxuICAgICAgICAgICAgeWllbGQgY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKCdsaW50aW5nLmxpbnRPblNhdmUnLCBmYWxzZSwgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgdGFyZ2V0KTtcclxuICAgICAgICAgICAgeWllbGQgY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKCdsaW50aW5nLnB5bGludFVzZU1pbmltYWxDaGVja2VycycsIGZhbHNlLCB3b3Jrc3BhY2VVcmkpO1xyXG4gICAgICAgICAgICBsaW50ZXJNYW5hZ2VyLmdldEFsbExpbnRlckluZm9zKCkuZm9yRWFjaCgoeCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgeWllbGQgY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKG1ha2VTZXR0aW5nS2V5KHgucHJvZHVjdCksIGZhbHNlLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBtYWtlU2V0dGluZ0tleShwcm9kdWN0KSB7XHJcbiAgICAgICAgcmV0dXJuIGBsaW50aW5nLiR7bGludGVyTWFuYWdlci5nZXRMaW50ZXJJbmZvKHByb2R1Y3QpLmVuYWJsZWRTZXR0aW5nTmFtZX1gO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gdGVzdEVuYWJsaW5nRGlzYWJsaW5nT2ZMaW50ZXIocHJvZHVjdCwgZW5hYmxlZCwgZmlsZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmcgPSBtYWtlU2V0dGluZ0tleShwcm9kdWN0KTtcclxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSU91dHB1dENoYW5uZWwsIGNvbnN0YW50c18xLlNUQU5EQVJEX09VVFBVVF9DSEFOTkVMKTtcclxuICAgICAgICAgICAgeWllbGQgY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKHNldHRpbmcsIGVuYWJsZWQsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIGluaXRpYWxpemVfMS5JU19NVUxUSV9ST09UX1RFU1QgPyB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0LldvcmtzcGFjZUZvbGRlciA6IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlKTtcclxuICAgICAgICAgICAgZmlsZSA9IGZpbGUgPyBmaWxlIDogZmlsZVRvTGludDtcclxuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnQgPSB5aWVsZCB2c2NvZGVfMS53b3Jrc3BhY2Uub3BlblRleHREb2N1bWVudChmaWxlKTtcclxuICAgICAgICAgICAgY29uc3QgY2FuY2VsVG9rZW4gPSBuZXcgdnNjb2RlXzEuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKTtcclxuICAgICAgICAgICAgeWllbGQgbGludGVyTWFuYWdlci5zZXRBY3RpdmVMaW50ZXJzQXN5bmMoW3Byb2R1Y3RdKTtcclxuICAgICAgICAgICAgeWllbGQgbGludGVyTWFuYWdlci5lbmFibGVMaW50aW5nQXN5bmMoZW5hYmxlZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbnRlciA9IHlpZWxkIGxpbnRlck1hbmFnZXIuY3JlYXRlTGludGVyKHByb2R1Y3QsIG91dHB1dCwgaW9jLnNlcnZpY2VDb250YWluZXIpO1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IHlpZWxkIGxpbnRlci5saW50KGRvY3VtZW50LCBjYW5jZWxUb2tlbi50b2tlbik7XHJcbiAgICAgICAgICAgIGlmIChlbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICBhc3NlcnQubm90RXF1YWwobWVzc2FnZXMubGVuZ3RoLCAwLCBgTm8gbGludGVyIGVycm9ycyB3aGVuIGxpbnRlciBpcyBlbmFibGVkLCBPdXRwdXQgLSAke291dHB1dC5vdXRwdXR9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwobWVzc2FnZXMubGVuZ3RoLCAwLCBgRXJyb3JzIHJldHVybmVkIHdoZW4gbGludGVyIGlzIGRpc2FibGVkLCBPdXRwdXQgLSAke291dHB1dC5vdXRwdXR9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHRlc3QoJ0Rpc2FibGUgUHlsaW50IGFuZCB0ZXN0IGxpbnRlcicsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0RW5hYmxpbmdEaXNhYmxpbmdPZkxpbnRlcihwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5weWxpbnQsIGZhbHNlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0VuYWJsZSBQeWxpbnQgYW5kIHRlc3QgbGludGVyJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RFbmFibGluZ0Rpc2FibGluZ09mTGludGVyKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnB5bGludCwgdHJ1ZSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdEaXNhYmxlIFBlcDggYW5kIHRlc3QgbGludGVyJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RFbmFibGluZ0Rpc2FibGluZ09mTGludGVyKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnBlcDgsIGZhbHNlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0VuYWJsZSBQZXA4IGFuZCB0ZXN0IGxpbnRlcicsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0RW5hYmxpbmdEaXNhYmxpbmdPZkxpbnRlcihwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5wZXA4LCB0cnVlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Rpc2FibGUgRmxha2U4IGFuZCB0ZXN0IGxpbnRlcicsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0RW5hYmxpbmdEaXNhYmxpbmdPZkxpbnRlcihwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5mbGFrZTgsIGZhbHNlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0VuYWJsZSBGbGFrZTggYW5kIHRlc3QgbGludGVyJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RFbmFibGluZ0Rpc2FibGluZ09mTGludGVyKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LmZsYWtlOCwgdHJ1ZSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdEaXNhYmxlIFByb3NwZWN0b3IgYW5kIHRlc3QgbGludGVyJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RFbmFibGluZ0Rpc2FibGluZ09mTGludGVyKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnByb3NwZWN0b3IsIGZhbHNlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0VuYWJsZSBQcm9zcGVjdG9yIGFuZCB0ZXN0IGxpbnRlcicsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0RW5hYmxpbmdEaXNhYmxpbmdPZkxpbnRlcihwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5wcm9zcGVjdG9yLCB0cnVlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Rpc2FibGUgUHlkb2NzdHlsZSBhbmQgdGVzdCBsaW50ZXInLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgdGVzdEVuYWJsaW5nRGlzYWJsaW5nT2ZMaW50ZXIocHJvZHVjdEluc3RhbGxlcl8xLlByb2R1Y3QucHlkb2NzdHlsZSwgZmFsc2UpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRW5hYmxlIFB5ZG9jc3R5bGUgYW5kIHRlc3QgbGludGVyJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RFbmFibGluZ0Rpc2FibGluZ09mTGludGVyKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnB5ZG9jc3R5bGUsIHRydWUpO1xyXG4gICAgfSkpO1xyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgZnVuY3Rpb24gdGVzdExpbnRlck1lc3NhZ2VzKHByb2R1Y3QsIHB5dGhvbkZpbGUsIG1lc3NhZ2VzVG9CZVJlY2VpdmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0Q2hhbm5lbCA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklPdXRwdXRDaGFubmVsLCBjb25zdGFudHNfMS5TVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbFRva2VuID0gbmV3IHZzY29kZV8xLkNhbmNlbGxhdGlvblRva2VuU291cmNlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50ID0geWllbGQgdnNjb2RlXzEud29ya3NwYWNlLm9wZW5UZXh0RG9jdW1lbnQocHl0aG9uRmlsZSk7XHJcbiAgICAgICAgICAgIHlpZWxkIGxpbnRlck1hbmFnZXIuc2V0QWN0aXZlTGludGVyc0FzeW5jKFtwcm9kdWN0XSwgZG9jdW1lbnQudXJpKTtcclxuICAgICAgICAgICAgY29uc3QgbGludGVyID0geWllbGQgbGludGVyTWFuYWdlci5jcmVhdGVMaW50ZXIocHJvZHVjdCwgb3V0cHV0Q2hhbm5lbCwgaW9jLnNlcnZpY2VDb250YWluZXIpO1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IHlpZWxkIGxpbnRlci5saW50KGRvY3VtZW50LCBjYW5jZWxUb2tlbi50b2tlbik7XHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlc1RvQmVSZWNlaXZlZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChtZXNzYWdlcy5sZW5ndGgsIDAsIGBObyBlcnJvcnMgaW4gbGludGVyLCBPdXRwdXQgLSAke291dHB1dENoYW5uZWwub3V0cHV0fWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKG91dHB1dENoYW5uZWwub3V0cHV0LmluZGV4T2YoJ0VOT0VOVCcpID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFB5bGludCBmb3IgUHl0aG9uIFZlcnNpb24gMi43IGNvdWxkIHJldHVybiA4MCBsaW50ZXIgbWVzc2FnZXMsIHdoZXJlIGFzIGluIDMuNSBpdCBtaWdodCBvbmx5IHJldHVybiAxLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIExvb2tzIGxpa2UgcHlsaW50IHN0b3BzIGxpbnRpbmcgYXMgc29vbiBhcyBpdCBjb21lcyBhY3Jvc3MgYW55IEVSUk9SUy5cclxuICAgICAgICAgICAgICAgICAgICBhc3NlcnQubm90RXF1YWwobWVzc2FnZXMubGVuZ3RoLCAwLCBgTm8gZXJyb3JzIGluIGxpbnRlciwgT3V0cHV0IC0gJHtvdXRwdXRDaGFubmVsLm91dHB1dH1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgdGVzdCgnUHlMaW50JywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RMaW50ZXJNZXNzYWdlcyhwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5weWxpbnQsIGZpbGVUb0xpbnQsIHB5bGludE1lc3NhZ2VzVG9CZVJldHVybmVkKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0ZsYWtlOCcsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0TGludGVyTWVzc2FnZXMocHJvZHVjdEluc3RhbGxlcl8xLlByb2R1Y3QuZmxha2U4LCBmaWxlVG9MaW50LCBmbGFrZThNZXNzYWdlc1RvQmVSZXR1cm5lZCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdQZXA4JywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIHRlc3RMaW50ZXJNZXNzYWdlcyhwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5wZXA4LCBmaWxlVG9MaW50LCBwZXA4TWVzc2FnZXNUb0JlUmV0dXJuZWQpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnUHlkb2NzdHlsZScsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0TGludGVyTWVzc2FnZXMocHJvZHVjdEluc3RhbGxlcl8xLlByb2R1Y3QucHlkb2NzdHlsZSwgZmlsZVRvTGludCwgcHlkb2NzdHlsZU1lc3NhZ3NlVG9CZVJldHVybmVkKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ1B5TGludCB3aXRoIGNvbmZpZyBpbiByb290JywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIGZzLmNvcHkocGF0aC5qb2luKHB5bGludENvbmZpZ1BhdGgsICcucHlsaW50cmMnKSwgcGF0aC5qb2luKHdvcmtzcGFjZVVyaS5mc1BhdGgsICcucHlsaW50cmMnKSk7XHJcbiAgICAgICAgeWllbGQgdGVzdExpbnRlck1lc3NhZ2VzKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnB5bGludCwgcGF0aC5qb2luKHB5bGludENvbmZpZ1BhdGgsICdmaWxlMi5weScpLCBbXSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdGbGFrZTggd2l0aCBjb25maWcgaW4gcm9vdCcsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCB0ZXN0TGludGVyTWVzc2FnZXMocHJvZHVjdEluc3RhbGxlcl8xLlByb2R1Y3QuZmxha2U4LCBwYXRoLmpvaW4oZmxha2U4Q29uZmlnUGF0aCwgJ2ZpbGUucHknKSwgZmlsdGVyZWRGbGFrZThNZXNzYWdlc1RvQmVSZXR1cm5lZCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdQZXA4IHdpdGggY29uZmlnIGluIHJvb3QnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgdGVzdExpbnRlck1lc3NhZ2VzKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnBlcDgsIHBhdGguam9pbihwZXA4Q29uZmlnUGF0aCwgJ2ZpbGUucHknKSwgZmlsdGVyZWRQZXA4OE1lc3NhZ2VzVG9CZVJldHVybmVkKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ1B5ZG9jc3R5bGUgd2l0aCBjb25maWcgaW4gcm9vdCcsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCBjb25maWdTZXJ2aWNlLnVwZGF0ZVNldHRpbmcoJ2xpbnRpbmcucHlsaW50VXNlTWluaW1hbENoZWNrZXJzJywgZmFsc2UsIHdvcmtzcGFjZVVyaSk7XHJcbiAgICAgICAgeWllbGQgZnMuY29weShwYXRoLmpvaW4ocHlkb2NzdHlsZUNvbmZpZ1BhdGgyNywgJy5weWRvY3N0eWxlJyksIHBhdGguam9pbih3b3Jrc3BhY2VVcmkuZnNQYXRoLCAnLnB5ZG9jc3R5bGUnKSk7XHJcbiAgICAgICAgeWllbGQgdGVzdExpbnRlck1lc3NhZ2VzKHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LnB5ZG9jc3R5bGUsIHBhdGguam9pbihweWRvY3N0eWxlQ29uZmlnUGF0aDI3LCAnZmlsZS5weScpLCBbXSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdQeUxpbnQgbWluaW1hbCBjaGVja2VycycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCBmaWxlID0gcGF0aC5qb2luKHB5dGhvRmlsZXNQYXRoLCAnbWluQ2hlY2sucHknKTtcclxuICAgICAgICB5aWVsZCBjb25maWdTZXJ2aWNlLnVwZGF0ZVNldHRpbmcoJ2xpbnRpbmcucHlsaW50VXNlTWluaW1hbENoZWNrZXJzJywgdHJ1ZSwgd29ya3NwYWNlVXJpKTtcclxuICAgICAgICB5aWVsZCB0ZXN0RW5hYmxpbmdEaXNhYmxpbmdPZkxpbnRlcihwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5weWxpbnQsIGZhbHNlLCBmaWxlKTtcclxuICAgICAgICB5aWVsZCBjb25maWdTZXJ2aWNlLnVwZGF0ZVNldHRpbmcoJ2xpbnRpbmcucHlsaW50VXNlTWluaW1hbENoZWNrZXJzJywgZmFsc2UsIHdvcmtzcGFjZVVyaSk7XHJcbiAgICAgICAgeWllbGQgdGVzdEVuYWJsaW5nRGlzYWJsaW5nT2ZMaW50ZXIocHJvZHVjdEluc3RhbGxlcl8xLlByb2R1Y3QucHlsaW50LCB0cnVlLCBmaWxlKTtcclxuICAgIH0pKTtcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1mdW5jdGlvbi1leHByZXNzaW9uXHJcbiAgICB0ZXN0KCdNdWx0aXBsZSBsaW50ZXJzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgVW5yZWxpYWJsZSB0ZXN0IGJlaW5nIHNraXBwZWQgdW50aWwgd2UgY2FuIHNvcnQgaXQgb3V0LiAgU2VlIGdoLTI2MDkuXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgIC0gRmFpbHMgYWJvdXQgMS8zIG9mIHJ1bnMgb24gV2luZG93c1xyXG4gICAgICAgICAgICAvLyAgICAgICAgICAtIFN5bXB0b206IGxpbnRpbmdFbmdpbmU6OmxpbnRPcGVuUHl0aG9uRmlsZXMgcmV0dXJucyB2YWx1ZXMgKmFmdGVyKiBjb21tYW5kIGF3YWl0IHJlc29sdmVzIGluIGxpbnQudGVzdHNcclxuICAgICAgICAgICAgLy8gICAgICAgICAgLSBsaW50T3BlblB5dGhvbkZpbGVzIHJldHVybnMgMyBzZXRzIG9mIHZhbHVlcywgbm90IHdoYXQgSSBleHBlY3QgKDEpLlxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAtIEhhdmVuJ3QgeWV0IGZvdW5kIGEgd2F5IHRvIGF3YWl0IG9uIHRoaXMgcHJvcGVybHkuXHJcbiAgICAgICAgICAgIGNvbnN0IHNraXBwZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAoc2tpcHBlZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWludmFsaWQtdGhpc1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2tpcCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHlpZWxkIGluaXRpYWxpemVfMS5jbG9zZUFjdGl2ZVdpbmRvd3MoKTtcclxuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnQgPSB5aWVsZCB2c2NvZGVfMS53b3Jrc3BhY2Uub3BlblRleHREb2N1bWVudChwYXRoLmpvaW4ocHl0aG9GaWxlc1BhdGgsICdwcmludC5weScpKTtcclxuICAgICAgICAgICAgeWllbGQgdnNjb2RlXzEud2luZG93LnNob3dUZXh0RG9jdW1lbnQoZG9jdW1lbnQpO1xyXG4gICAgICAgICAgICB5aWVsZCBjb25maWdTZXJ2aWNlLnVwZGF0ZVNldHRpbmcoJ2xpbnRpbmcuZW5hYmxlZCcsIHRydWUsIHdvcmtzcGFjZVVyaSk7XHJcbiAgICAgICAgICAgIHlpZWxkIGNvbmZpZ1NlcnZpY2UudXBkYXRlU2V0dGluZygnbGludGluZy5weWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnMnLCBmYWxzZSwgd29ya3NwYWNlVXJpKTtcclxuICAgICAgICAgICAgeWllbGQgY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKCdsaW50aW5nLnB5bGludEVuYWJsZWQnLCB0cnVlLCB3b3Jrc3BhY2VVcmkpO1xyXG4gICAgICAgICAgICB5aWVsZCBjb25maWdTZXJ2aWNlLnVwZGF0ZVNldHRpbmcoJ2xpbnRpbmcuZmxha2U4RW5hYmxlZCcsIHRydWUsIHdvcmtzcGFjZVVyaSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmRzID0gaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUNvbW1hbmRNYW5hZ2VyKTtcclxuICAgICAgICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHlpZWxkIGNvbW1hbmRzLmV4ZWN1dGVDb21tYW5kKCdweXRob24ucnVuTGludGluZycpO1xyXG4gICAgICAgICAgICBhc3NlcnQubm90RXF1YWwoY29sbGVjdGlvbiwgdW5kZWZpbmVkLCAncHl0aG9uLnJ1bkxpbnRpbmcgZGlkIG5vdCByZXR1cm4gdmFsaWQgZGlhZ25vc3RpY3MgY29sbGVjdGlvbi4nKTtcclxuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSBjb2xsZWN0aW9uLmdldChkb2N1bWVudC51cmkpO1xyXG4gICAgICAgICAgICBhc3NlcnQubm90RXF1YWwobWVzc2FnZXMubGVuZ3RoLCAwLCAnTm8gZGlhZ25vc3RpYyBtZXNzYWdlcy4nKTtcclxuICAgICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKG1lc3NhZ2VzLmZpbHRlcih4ID0+IHguc291cmNlID09PSAncHlsaW50JykubGVuZ3RoLCAwLCAnTm8gcHlsaW50IG1lc3NhZ2VzLicpO1xyXG4gICAgICAgICAgICBhc3NlcnQubm90RXF1YWwobWVzc2FnZXMuZmlsdGVyKHggPT4geC5zb3VyY2UgPT09ICdmbGFrZTgnKS5sZW5ndGgsIDAsICdObyBmbGFrZTggbWVzc2FnZXMuJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgIGZ1bmN0aW9uIHRlc3RMaW50ZXJNZXNzYWdlQ291bnQocHJvZHVjdCwgcHl0aG9uRmlsZSwgbWVzc2FnZUNvdW50VG9CZVJlY2VpdmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0Q2hhbm5lbCA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklPdXRwdXRDaGFubmVsLCBjb25zdGFudHNfMS5TVEFOREFSRF9PVVRQVVRfQ0hBTk5FTCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbFRva2VuID0gbmV3IHZzY29kZV8xLkNhbmNlbGxhdGlvblRva2VuU291cmNlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50ID0geWllbGQgdnNjb2RlXzEud29ya3NwYWNlLm9wZW5UZXh0RG9jdW1lbnQocHl0aG9uRmlsZSk7XHJcbiAgICAgICAgICAgIHlpZWxkIGxpbnRlck1hbmFnZXIuc2V0QWN0aXZlTGludGVyc0FzeW5jKFtwcm9kdWN0XSwgZG9jdW1lbnQudXJpKTtcclxuICAgICAgICAgICAgY29uc3QgbGludGVyID0geWllbGQgbGludGVyTWFuYWdlci5jcmVhdGVMaW50ZXIocHJvZHVjdCwgb3V0cHV0Q2hhbm5lbCwgaW9jLnNlcnZpY2VDb250YWluZXIpO1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IHlpZWxkIGxpbnRlci5saW50KGRvY3VtZW50LCBjYW5jZWxUb2tlbi50b2tlbik7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtZXNzYWdlcy5sZW5ndGgsIG1lc3NhZ2VDb3VudFRvQmVSZWNlaXZlZCwgJ0V4cGVjdGVkIG51bWJlciBvZiBsaW50IGVycm9ycyBkb2VzIG5vdCBtYXRjaCBsaW50IGVycm9yIGNvdW50Jyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0ZXN0KCdUaHJlZSBsaW5lIG91dHB1dCBjb3VudGVkIGFzIG9uZSBtZXNzYWdlJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IG1heEVycm9ycyA9IDU7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gaW5pdGlhbGl6ZV8xLklTX01VTFRJX1JPT1RfVEVTVCA/IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlRm9sZGVyIDogdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2U7XHJcbiAgICAgICAgeWllbGQgY29uZmlnU2VydmljZS51cGRhdGVTZXR0aW5nKCdsaW50aW5nLm1heE51bWJlck9mUHJvYmxlbXMnLCBtYXhFcnJvcnMsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIHRhcmdldCk7XHJcbiAgICAgICAgeWllbGQgdGVzdExpbnRlck1lc3NhZ2VDb3VudChwcm9kdWN0SW5zdGFsbGVyXzEuUHJvZHVjdC5weWxpbnQsIHRocmVlTGluZUxpbnRzUGF0aCwgbWF4RXJyb3JzKTtcclxuICAgIH0pKTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxpbnQudGVzdC5qcy5tYXAiXX0=