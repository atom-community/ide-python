"use strict"; // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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

const os_1 = require("os");

const path = require("path");

const vscode_1 = require("vscode");

const constants_1 = require("../../../client/common/constants");

const types_1 = require("../../../client/common/process/types");

const argumentsHelper_1 = require("../../../client/unittests/common/argumentsHelper");

const constants_2 = require("../../../client/unittests/common/constants");

const runner_1 = require("../../../client/unittests/common/runner");

const types_2 = require("../../../client/unittests/common/types");

const types_3 = require("../../../client/unittests/types");

const helper_1 = require("../../../client/unittests/unittest/helper");

const runner_2 = require("../../../client/unittests/unittest/runner");

const argsService_1 = require("../../../client/unittests/unittest/services/argsService");

const common_1 = require("../../common");

const serviceRegistry_1 = require("../serviceRegistry");

const initialize_1 = require("./../../initialize");

const testFilesPath = path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test', 'pythonFiles', 'testFiles');
const UNITTEST_TEST_FILES_PATH = path.join(testFilesPath, 'standard');
const unitTestSpecificTestFilesPath = path.join(testFilesPath, 'specificTest');
const defaultUnitTestArgs = ['-v', '-s', '.', '-p', '*test*.py']; // tslint:disable-next-line:max-func-body-length

suite('Unit Tests - unittest - run with mocked process output', () => {
  let ioc;
  const rootDirectory = UNITTEST_TEST_FILES_PATH;
  const configTarget = initialize_1.IS_MULTI_ROOT_TEST ? vscode_1.ConfigurationTarget.WorkspaceFolder : vscode_1.ConfigurationTarget.Workspace;
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    yield common_1.updateSetting('unitTest.unittestArgs', defaultUnitTestArgs, common_1.rootWorkspaceUri, configTarget);
  }));
  setup(() => __awaiter(void 0, void 0, void 0, function* () {
    const cachePath = path.join(UNITTEST_TEST_FILES_PATH, '.cache');

    if (yield fs.pathExists(cachePath)) {
      yield fs.remove(cachePath);
    }

    yield initialize_1.initializeTest();
    initializeDI();
    yield ignoreTestLauncher();
  }));
  teardown(() => __awaiter(void 0, void 0, void 0, function* () {
    ioc.dispose();
    yield common_1.updateSetting('unitTest.unittestArgs', defaultUnitTestArgs, common_1.rootWorkspaceUri, configTarget);
  }));

  function initializeDI() {
    ioc = new serviceRegistry_1.UnitTestIocContainer();
    ioc.registerCommonTypes();
    ioc.registerVariableTypes(); // Mocks.

    ioc.registerMockProcessTypes();
    ioc.registerMockUnitTestSocketServer(); // Standard unit test stypes.

    ioc.registerTestDiscoveryServices();
    ioc.registerTestManagers();
    ioc.registerTestManagerService();
    ioc.registerTestParsers();
    ioc.registerTestResultsHelper();
    ioc.registerTestsHelper();
    ioc.registerTestStorage();
    ioc.registerTestVisitors();
    ioc.serviceManager.add(types_3.IArgumentsService, argsService_1.ArgumentsService, constants_2.UNITTEST_PROVIDER);
    ioc.serviceManager.add(types_3.IArgumentsHelper, argumentsHelper_1.ArgumentsHelper);
    ioc.serviceManager.add(types_3.ITestManagerRunner, runner_2.TestManagerRunner, constants_2.UNITTEST_PROVIDER);
    ioc.serviceManager.add(types_2.ITestRunner, runner_1.TestRunner);
    ioc.serviceManager.add(types_3.IUnitTestHelper, helper_1.UnitTestHelper);
  }

  function ignoreTestLauncher() {
    return __awaiter(this, void 0, void 0, function* () {
      const procService = yield ioc.serviceContainer.get(types_1.IProcessServiceFactory).create(); // When running the python test launcher, just return.

      procService.onExecObservable((file, args, options, callback) => {
        if (args.length > 1 && args[0].endsWith('visualstudio_py_testlauncher.py')) {
          callback({
            out: '',
            source: 'stdout'
          });
        }
      });
    });
  }

  function injectTestDiscoveryOutput(output) {
    return __awaiter(this, void 0, void 0, function* () {
      const procService = yield ioc.serviceContainer.get(types_1.IProcessServiceFactory).create();
      procService.onExecObservable((file, args, options, callback) => {
        if (args.length > 1 && args[0] === '-c' && args[1].includes('import unittest') && args[1].includes('loader = unittest.TestLoader()')) {
          callback({
            // Ensure any spaces added during code formatting or the like are removed
            out: output.split(/\r?\n/g).map(item => item.trim()).join(os_1.EOL),
            source: 'stdout'
          });
        }
      });
    });
  }

  function injectTestSocketServerResults(results) {
    // Add results to be sent by unit test socket server.
    const socketServer = ioc.serviceContainer.get(types_2.IUnitTestSocketServer);
    socketServer.reset();
    socketServer.addResults(results);
  }

  test('Run Tests', () => __awaiter(void 0, void 0, void 0, function* () {
    yield common_1.updateSetting('unitTest.unittestArgs', ['-v', '-s', './tests', '-p', 'test_unittest*.py'], common_1.rootWorkspaceUri, configTarget); // tslint:disable-next-line:no-multiline-string

    yield injectTestDiscoveryOutput(`start
        test_unittest_one.Test_test1.test_A
        test_unittest_one.Test_test1.test_B
        test_unittest_one.Test_test1.test_c
        test_unittest_two.Test_test2.test_A2
        test_unittest_two.Test_test2.test_B2
        test_unittest_two.Test_test2.test_C2
        test_unittest_two.Test_test2.test_D2
        test_unittest_two.Test_test2a.test_222A2
        test_unittest_two.Test_test2a.test_222B2
        `);
    const resultsToSend = [{
      outcome: 'failed',
      traceback: 'AssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_one.Test_test1.test_A'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test1.test_B'
    }, {
      outcome: 'skipped',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test1.test_c'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_two.Test_test2.test_A2'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_two.Test_test2.test_B2'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: 1 != 2 : Not equal\n',
      message: '1 != 2 : Not equal',
      test: 'test_unittest_two.Test_test2.test_C2'
    }, {
      outcome: 'error',
      traceback: 'raise ArithmeticError()\nArithmeticError\n',
      message: '',
      test: 'test_unittest_two.Test_test2.test_D2'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_two.Test_test2a.test_222A2'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_two.Test_test2a.test_222B2'
    }];
    injectTestSocketServerResults(resultsToSend);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('unittest', common_1.rootWorkspaceUri, rootDirectory);
    const results = yield testManager.runTest(constants_2.CommandSource.ui);
    assert.equal(results.summary.errors, 1, 'Errors');
    assert.equal(results.summary.failures, 4, 'Failures');
    assert.equal(results.summary.passed, 3, 'Passed');
    assert.equal(results.summary.skipped, 1, 'skipped');
  }));
  test('Run Failed Tests', () => __awaiter(void 0, void 0, void 0, function* () {
    yield common_1.updateSetting('unitTest.unittestArgs', ['-s=./tests', '-p=test_unittest*.py'], common_1.rootWorkspaceUri, configTarget); // tslint:disable-next-line:no-multiline-string

    yield injectTestDiscoveryOutput(`start
            test_unittest_one.Test_test1.test_A
            test_unittest_one.Test_test1.test_B
            test_unittest_one.Test_test1.test_c
            test_unittest_two.Test_test2.test_A2
            test_unittest_two.Test_test2.test_B2
            test_unittest_two.Test_test2.test_C2
            test_unittest_two.Test_test2.test_D2
            test_unittest_two.Test_test2a.test_222A2
            test_unittest_two.Test_test2a.test_222B2
            `);
    const resultsToSend = [{
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_one.Test_test1.test_A'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test1.test_B'
    }, {
      outcome: 'skipped',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test1.test_c'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_two.Test_test2.test_A2'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_two.Test_test2.test_B2'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: 1 != 2 : Not equal\n',
      message: '1 != 2 : Not equal',
      test: 'test_unittest_two.Test_test2.test_C2'
    }, {
      outcome: 'error',
      traceback: 'raise ArithmeticError()\nArithmeticError\n',
      message: '',
      test: 'test_unittest_two.Test_test2.test_D2'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_two.Test_test2a.test_222A2'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_two.Test_test2a.test_222B2'
    }];
    injectTestSocketServerResults(resultsToSend);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('unittest', common_1.rootWorkspaceUri, rootDirectory);
    let results = yield testManager.runTest(constants_2.CommandSource.ui);
    assert.equal(results.summary.errors, 1, 'Errors');
    assert.equal(results.summary.failures, 4, 'Failures');
    assert.equal(results.summary.passed, 3, 'Passed');
    assert.equal(results.summary.skipped, 1, 'skipped');
    const failedResultsToSend = [{
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_one.Test_test1.test_A'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_two.Test_test2.test_A2'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: 1 != 2 : Not equal\n',
      message: '1 != 2 : Not equal',
      test: 'test_unittest_two.Test_test2.test_C2'
    }, {
      outcome: 'error',
      traceback: 'raise ArithmeticError()\nArithmeticError\n',
      message: '',
      test: 'test_unittest_two.Test_test2.test_D2'
    }, {
      outcome: 'failed',
      traceback: 'raise self.failureException(msg)\nAssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_two.Test_test2a.test_222A2'
    }];
    injectTestSocketServerResults(failedResultsToSend);
    results = yield testManager.runTest(constants_2.CommandSource.ui, undefined, true);
    assert.equal(results.summary.errors, 1, 'Failed Errors');
    assert.equal(results.summary.failures, 4, 'Failed Failures');
    assert.equal(results.summary.passed, 0, 'Failed Passed');
    assert.equal(results.summary.skipped, 0, 'Failed skipped');
  }));
  test('Run Specific Test File', () => __awaiter(void 0, void 0, void 0, function* () {
    yield common_1.updateSetting('unitTest.unittestArgs', ['-s=./tests', '-p=test_unittest*.py'], common_1.rootWorkspaceUri, configTarget); // tslint:disable-next-line:no-multiline-string

    yield injectTestDiscoveryOutput(`start
        test_unittest_one.Test_test_one_1.test_1_1_1
        test_unittest_one.Test_test_one_1.test_1_1_2
        test_unittest_one.Test_test_one_1.test_1_1_3
        test_unittest_one.Test_test_one_2.test_1_2_1
        test_unittest_two.Test_test_two_1.test_1_1_1
        test_unittest_two.Test_test_two_1.test_1_1_2
        test_unittest_two.Test_test_two_1.test_1_1_3
        test_unittest_two.Test_test_two_2.test_2_1_1
        `);
    const resultsToSend = [{
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test_one_1.test_1_1_1'
    }, {
      outcome: 'failed',
      traceback: 'AssertionError: 1 != 2 : Not equal\n',
      message: '1 != 2 : Not equal',
      test: 'test_unittest_one.Test_test_one_1.test_1_1_2'
    }, {
      outcome: 'skipped',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test_one_1.test_1_1_3'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test_one_2.test_1_2_1'
    }];
    injectTestSocketServerResults(resultsToSend);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('unittest', common_1.rootWorkspaceUri, unitTestSpecificTestFilesPath);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true); // tslint:disable-next-line:no-non-null-assertion

    const testFileToTest = tests.testFiles.find(f => f.name === 'test_unittest_one.py');
    const testFile = {
      testFile: [testFileToTest],
      testFolder: [],
      testFunction: [],
      testSuite: []
    };
    const results = yield testManager.runTest(constants_2.CommandSource.ui, testFile);
    assert.equal(results.summary.errors, 0, 'Errors');
    assert.equal(results.summary.failures, 1, 'Failures');
    assert.equal(results.summary.passed, 2, 'Passed');
    assert.equal(results.summary.skipped, 1, 'skipped');
  }));
  test('Run Specific Test Suite', () => __awaiter(void 0, void 0, void 0, function* () {
    yield common_1.updateSetting('unitTest.unittestArgs', ['-s=./tests', '-p=test_unittest*.py'], common_1.rootWorkspaceUri, configTarget); // tslint:disable-next-line:no-multiline-string

    yield injectTestDiscoveryOutput(`start
        test_unittest_one.Test_test_one_1.test_1_1_1
        test_unittest_one.Test_test_one_1.test_1_1_2
        test_unittest_one.Test_test_one_1.test_1_1_3
        test_unittest_one.Test_test_one_2.test_1_2_1
        test_unittest_two.Test_test_two_1.test_1_1_1
        test_unittest_two.Test_test_two_1.test_1_1_2
        test_unittest_two.Test_test_two_1.test_1_1_3
        test_unittest_two.Test_test_two_2.test_2_1_1
        `);
    const resultsToSend = [{
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test_one_1.test_1_1_1'
    }, {
      outcome: 'failed',
      traceback: 'AssertionError: 1 != 2 : Not equal\n',
      message: '1 != 2 : Not equal',
      test: 'test_unittest_one.Test_test_one_1.test_1_1_2'
    }, {
      outcome: 'skipped',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test_one_1.test_1_1_3'
    }, {
      outcome: 'passed',
      traceback: null,
      message: null,
      test: 'test_unittest_one.Test_test_one_2.test_1_2_1'
    }];
    injectTestSocketServerResults(resultsToSend);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('unittest', common_1.rootWorkspaceUri, unitTestSpecificTestFilesPath);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true); // tslint:disable-next-line:no-non-null-assertion

    const testSuiteToTest = tests.testSuites.find(s => s.testSuite.name === 'Test_test_one_1').testSuite;
    const testSuite = {
      testFile: [],
      testFolder: [],
      testFunction: [],
      testSuite: [testSuiteToTest]
    };
    const results = yield testManager.runTest(constants_2.CommandSource.ui, testSuite);
    assert.equal(results.summary.errors, 0, 'Errors');
    assert.equal(results.summary.failures, 1, 'Failures');
    assert.equal(results.summary.passed, 2, 'Passed');
    assert.equal(results.summary.skipped, 1, 'skipped');
  }));
  test('Run Specific Test Function', () => __awaiter(void 0, void 0, void 0, function* () {
    yield common_1.updateSetting('unitTest.unittestArgs', ['-s=./tests', '-p=test_unittest*.py'], common_1.rootWorkspaceUri, configTarget); // tslint:disable-next-line:no-multiline-string

    yield injectTestDiscoveryOutput(`start
        test_unittest_one.Test_test1.test_A
        test_unittest_one.Test_test1.test_B
        test_unittest_one.Test_test1.test_c
        test_unittest_two.Test_test2.test_A2
        test_unittest_two.Test_test2.test_B2
        test_unittest_two.Test_test2.test_C2
        test_unittest_two.Test_test2.test_D2
        test_unittest_two.Test_test2a.test_222A2
        test_unittest_two.Test_test2a.test_222B2
        `);
    const resultsToSend = [{
      outcome: 'failed',
      traceback: 'AssertionError: Not implemented\n',
      message: 'Not implemented',
      test: 'test_unittest_one.Test_test1.test_A'
    }];
    injectTestSocketServerResults(resultsToSend);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('unittest', common_1.rootWorkspaceUri, rootDirectory);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true);
    const testFn = {
      testFile: [],
      testFolder: [],
      testFunction: [tests.testFunctions[0].testFunction],
      testSuite: []
    };
    const results = yield testManager.runTest(constants_2.CommandSource.ui, testFn);
    assert.equal(results.summary.errors, 0, 'Errors');
    assert.equal(results.summary.failures, 1, 'Failures');
    assert.equal(results.summary.passed, 0, 'Passed');
    assert.equal(results.summary.skipped, 0, 'skipped');
  }));
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInVuaXR0ZXN0LnJ1bi50ZXN0LmpzIl0sIm5hbWVzIjpbIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJhc3NlcnQiLCJyZXF1aXJlIiwiZnMiLCJvc18xIiwicGF0aCIsInZzY29kZV8xIiwiY29uc3RhbnRzXzEiLCJ0eXBlc18xIiwiYXJndW1lbnRzSGVscGVyXzEiLCJjb25zdGFudHNfMiIsInJ1bm5lcl8xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJoZWxwZXJfMSIsInJ1bm5lcl8yIiwiYXJnc1NlcnZpY2VfMSIsImNvbW1vbl8xIiwic2VydmljZVJlZ2lzdHJ5XzEiLCJpbml0aWFsaXplXzEiLCJ0ZXN0RmlsZXNQYXRoIiwiam9pbiIsIkVYVEVOU0lPTl9ST09UX0RJUiIsIlVOSVRURVNUX1RFU1RfRklMRVNfUEFUSCIsInVuaXRUZXN0U3BlY2lmaWNUZXN0RmlsZXNQYXRoIiwiZGVmYXVsdFVuaXRUZXN0QXJncyIsInN1aXRlIiwiaW9jIiwicm9vdERpcmVjdG9yeSIsImNvbmZpZ1RhcmdldCIsIklTX01VTFRJX1JPT1RfVEVTVCIsIkNvbmZpZ3VyYXRpb25UYXJnZXQiLCJXb3Jrc3BhY2VGb2xkZXIiLCJXb3Jrc3BhY2UiLCJzdWl0ZVNldHVwIiwiaW5pdGlhbGl6ZSIsInVwZGF0ZVNldHRpbmciLCJyb290V29ya3NwYWNlVXJpIiwic2V0dXAiLCJjYWNoZVBhdGgiLCJwYXRoRXhpc3RzIiwicmVtb3ZlIiwiaW5pdGlhbGl6ZVRlc3QiLCJpbml0aWFsaXplREkiLCJpZ25vcmVUZXN0TGF1bmNoZXIiLCJ0ZWFyZG93biIsImRpc3Bvc2UiLCJVbml0VGVzdElvY0NvbnRhaW5lciIsInJlZ2lzdGVyQ29tbW9uVHlwZXMiLCJyZWdpc3RlclZhcmlhYmxlVHlwZXMiLCJyZWdpc3Rlck1vY2tQcm9jZXNzVHlwZXMiLCJyZWdpc3Rlck1vY2tVbml0VGVzdFNvY2tldFNlcnZlciIsInJlZ2lzdGVyVGVzdERpc2NvdmVyeVNlcnZpY2VzIiwicmVnaXN0ZXJUZXN0TWFuYWdlcnMiLCJyZWdpc3RlclRlc3RNYW5hZ2VyU2VydmljZSIsInJlZ2lzdGVyVGVzdFBhcnNlcnMiLCJyZWdpc3RlclRlc3RSZXN1bHRzSGVscGVyIiwicmVnaXN0ZXJUZXN0c0hlbHBlciIsInJlZ2lzdGVyVGVzdFN0b3JhZ2UiLCJyZWdpc3RlclRlc3RWaXNpdG9ycyIsInNlcnZpY2VNYW5hZ2VyIiwiYWRkIiwiSUFyZ3VtZW50c1NlcnZpY2UiLCJBcmd1bWVudHNTZXJ2aWNlIiwiVU5JVFRFU1RfUFJPVklERVIiLCJJQXJndW1lbnRzSGVscGVyIiwiQXJndW1lbnRzSGVscGVyIiwiSVRlc3RNYW5hZ2VyUnVubmVyIiwiVGVzdE1hbmFnZXJSdW5uZXIiLCJJVGVzdFJ1bm5lciIsIlRlc3RSdW5uZXIiLCJJVW5pdFRlc3RIZWxwZXIiLCJVbml0VGVzdEhlbHBlciIsInByb2NTZXJ2aWNlIiwic2VydmljZUNvbnRhaW5lciIsImdldCIsIklQcm9jZXNzU2VydmljZUZhY3RvcnkiLCJjcmVhdGUiLCJvbkV4ZWNPYnNlcnZhYmxlIiwiZmlsZSIsImFyZ3MiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJsZW5ndGgiLCJlbmRzV2l0aCIsIm91dCIsInNvdXJjZSIsImluamVjdFRlc3REaXNjb3ZlcnlPdXRwdXQiLCJvdXRwdXQiLCJpbmNsdWRlcyIsInNwbGl0IiwibWFwIiwiaXRlbSIsInRyaW0iLCJFT0wiLCJpbmplY3RUZXN0U29ja2V0U2VydmVyUmVzdWx0cyIsInJlc3VsdHMiLCJzb2NrZXRTZXJ2ZXIiLCJJVW5pdFRlc3RTb2NrZXRTZXJ2ZXIiLCJyZXNldCIsImFkZFJlc3VsdHMiLCJ0ZXN0IiwicmVzdWx0c1RvU2VuZCIsIm91dGNvbWUiLCJ0cmFjZWJhY2siLCJtZXNzYWdlIiwiZmFjdG9yeSIsIklUZXN0TWFuYWdlckZhY3RvcnkiLCJ0ZXN0TWFuYWdlciIsInJ1blRlc3QiLCJDb21tYW5kU291cmNlIiwidWkiLCJlcXVhbCIsInN1bW1hcnkiLCJlcnJvcnMiLCJmYWlsdXJlcyIsInBhc3NlZCIsInNraXBwZWQiLCJmYWlsZWRSZXN1bHRzVG9TZW5kIiwidW5kZWZpbmVkIiwidGVzdHMiLCJkaXNjb3ZlclRlc3RzIiwidGVzdEZpbGVUb1Rlc3QiLCJ0ZXN0RmlsZXMiLCJmaW5kIiwiZiIsIm5hbWUiLCJ0ZXN0RmlsZSIsInRlc3RGb2xkZXIiLCJ0ZXN0RnVuY3Rpb24iLCJ0ZXN0U3VpdGUiLCJ0ZXN0U3VpdGVUb1Rlc3QiLCJ0ZXN0U3VpdGVzIiwicyIsInRlc3RGbiIsInRlc3RGdW5jdGlvbnMiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTtBQUNBOztBQUNBLElBQUlBLFNBQVMsR0FBSSxVQUFRLFNBQUtBLFNBQWQsSUFBNEIsVUFBVUMsT0FBVixFQUFtQkMsVUFBbkIsRUFBK0JDLENBQS9CLEVBQWtDQyxTQUFsQyxFQUE2QztBQUNyRixTQUFPLEtBQUtELENBQUMsS0FBS0EsQ0FBQyxHQUFHRSxPQUFULENBQU4sRUFBeUIsVUFBVUMsT0FBVixFQUFtQkMsTUFBbkIsRUFBMkI7QUFDdkQsYUFBU0MsU0FBVCxDQUFtQkMsS0FBbkIsRUFBMEI7QUFBRSxVQUFJO0FBQUVDLFFBQUFBLElBQUksQ0FBQ04sU0FBUyxDQUFDTyxJQUFWLENBQWVGLEtBQWYsQ0FBRCxDQUFKO0FBQThCLE9BQXBDLENBQXFDLE9BQU9HLENBQVAsRUFBVTtBQUFFTCxRQUFBQSxNQUFNLENBQUNLLENBQUQsQ0FBTjtBQUFZO0FBQUU7O0FBQzNGLGFBQVNDLFFBQVQsQ0FBa0JKLEtBQWxCLEVBQXlCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQyxPQUFELENBQVQsQ0FBbUJLLEtBQW5C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QyxDQUEzQjtBQUNBLFVBQU00RixLQUFLLEdBQUcsTUFBTVosV0FBVyxDQUFDYSxhQUFaLENBQTBCL0csV0FBVyxDQUFDb0csYUFBWixDQUEwQkMsRUFBcEQsRUFBd0QsSUFBeEQsRUFBOEQsSUFBOUQsQ0FBcEI7QUFDQSxVQUFNdUIsTUFBTSxHQUFHO0FBQUVQLE1BQUFBLFFBQVEsRUFBRSxFQUFaO0FBQWdCQyxNQUFBQSxVQUFVLEVBQUUsRUFBNUI7QUFBZ0NDLE1BQUFBLFlBQVksRUFBRSxDQUFDVCxLQUFLLENBQUNlLGFBQU4sQ0FBb0IsQ0FBcEIsRUFBdUJOLFlBQXhCLENBQTlDO0FBQXFGQyxNQUFBQSxTQUFTLEVBQUU7QUFBaEcsS0FBZjtBQUNBLFVBQU1sQyxPQUFPLEdBQUcsTUFBTVksV0FBVyxDQUFDQyxPQUFaLENBQW9CbkcsV0FBVyxDQUFDb0csYUFBWixDQUEwQkMsRUFBOUMsRUFBa0R1QixNQUFsRCxDQUF0QjtBQUNBckksSUFBQUEsTUFBTSxDQUFDK0csS0FBUCxDQUFhaEIsT0FBTyxDQUFDaUIsT0FBUixDQUFnQkMsTUFBN0IsRUFBcUMsQ0FBckMsRUFBd0MsUUFBeEM7QUFDQWpILElBQUFBLE1BQU0sQ0FBQytHLEtBQVAsQ0FBYWhCLE9BQU8sQ0FBQ2lCLE9BQVIsQ0FBZ0JFLFFBQTdCLEVBQXVDLENBQXZDLEVBQTBDLFVBQTFDO0FBQ0FsSCxJQUFBQSxNQUFNLENBQUMrRyxLQUFQLENBQWFoQixPQUFPLENBQUNpQixPQUFSLENBQWdCRyxNQUE3QixFQUFxQyxDQUFyQyxFQUF3QyxRQUF4QztBQUNBbkgsSUFBQUEsTUFBTSxDQUFDK0csS0FBUCxDQUFhaEIsT0FBTyxDQUFDaUIsT0FBUixDQUFnQkksT0FBN0IsRUFBc0MsQ0FBdEMsRUFBeUMsU0FBekM7QUFDSCxHQTNCaUQsQ0FBOUMsQ0FBSjtBQTRCSCxDQXZQSSxDQUFMIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcclxuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XHJcbmNvbnN0IG9zXzEgPSByZXF1aXJlKFwib3NcIik7XHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuY29uc3QgdnNjb2RlXzEgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvY29tbW9uL2NvbnN0YW50c1wiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvY29tbW9uL3Byb2Nlc3MvdHlwZXNcIik7XHJcbmNvbnN0IGFyZ3VtZW50c0hlbHBlcl8xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC91bml0dGVzdHMvY29tbW9uL2FyZ3VtZW50c0hlbHBlclwiKTtcclxuY29uc3QgY29uc3RhbnRzXzIgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L3VuaXR0ZXN0cy9jb21tb24vY29uc3RhbnRzXCIpO1xyXG5jb25zdCBydW5uZXJfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvdW5pdHRlc3RzL2NvbW1vbi9ydW5uZXJcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L3VuaXR0ZXN0cy9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L3VuaXR0ZXN0cy90eXBlc1wiKTtcclxuY29uc3QgaGVscGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L3VuaXR0ZXN0cy91bml0dGVzdC9oZWxwZXJcIik7XHJcbmNvbnN0IHJ1bm5lcl8yID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC91bml0dGVzdHMvdW5pdHRlc3QvcnVubmVyXCIpO1xyXG5jb25zdCBhcmdzU2VydmljZV8xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NsaWVudC91bml0dGVzdHMvdW5pdHRlc3Qvc2VydmljZXMvYXJnc1NlcnZpY2VcIik7XHJcbmNvbnN0IGNvbW1vbl8xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vblwiKTtcclxuY29uc3Qgc2VydmljZVJlZ2lzdHJ5XzEgPSByZXF1aXJlKFwiLi4vc2VydmljZVJlZ2lzdHJ5XCIpO1xyXG5jb25zdCBpbml0aWFsaXplXzEgPSByZXF1aXJlKFwiLi8uLi8uLi9pbml0aWFsaXplXCIpO1xyXG5jb25zdCB0ZXN0RmlsZXNQYXRoID0gcGF0aC5qb2luKGNvbnN0YW50c18xLkVYVEVOU0lPTl9ST09UX0RJUiwgJ3NyYycsICd0ZXN0JywgJ3B5dGhvbkZpbGVzJywgJ3Rlc3RGaWxlcycpO1xyXG5jb25zdCBVTklUVEVTVF9URVNUX0ZJTEVTX1BBVEggPSBwYXRoLmpvaW4odGVzdEZpbGVzUGF0aCwgJ3N0YW5kYXJkJyk7XHJcbmNvbnN0IHVuaXRUZXN0U3BlY2lmaWNUZXN0RmlsZXNQYXRoID0gcGF0aC5qb2luKHRlc3RGaWxlc1BhdGgsICdzcGVjaWZpY1Rlc3QnKTtcclxuY29uc3QgZGVmYXVsdFVuaXRUZXN0QXJncyA9IFtcclxuICAgICctdicsXHJcbiAgICAnLXMnLFxyXG4gICAgJy4nLFxyXG4gICAgJy1wJyxcclxuICAgICcqdGVzdCoucHknXHJcbl07XHJcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG5zdWl0ZSgnVW5pdCBUZXN0cyAtIHVuaXR0ZXN0IC0gcnVuIHdpdGggbW9ja2VkIHByb2Nlc3Mgb3V0cHV0JywgKCkgPT4ge1xyXG4gICAgbGV0IGlvYztcclxuICAgIGNvbnN0IHJvb3REaXJlY3RvcnkgPSBVTklUVEVTVF9URVNUX0ZJTEVTX1BBVEg7XHJcbiAgICBjb25zdCBjb25maWdUYXJnZXQgPSBpbml0aWFsaXplXzEuSVNfTVVMVElfUk9PVF9URVNUID8gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2VGb2xkZXIgOiB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0LldvcmtzcGFjZTtcclxuICAgIHN1aXRlU2V0dXAoKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIGluaXRpYWxpemVfMS5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgeWllbGQgY29tbW9uXzEudXBkYXRlU2V0dGluZygndW5pdFRlc3QudW5pdHRlc3RBcmdzJywgZGVmYXVsdFVuaXRUZXN0QXJncywgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgY29uZmlnVGFyZ2V0KTtcclxuICAgIH0pKTtcclxuICAgIHNldHVwKCgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCBjYWNoZVBhdGggPSBwYXRoLmpvaW4oVU5JVFRFU1RfVEVTVF9GSUxFU19QQVRILCAnLmNhY2hlJyk7XHJcbiAgICAgICAgaWYgKHlpZWxkIGZzLnBhdGhFeGlzdHMoY2FjaGVQYXRoKSkge1xyXG4gICAgICAgICAgICB5aWVsZCBmcy5yZW1vdmUoY2FjaGVQYXRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgeWllbGQgaW5pdGlhbGl6ZV8xLmluaXRpYWxpemVUZXN0KCk7XHJcbiAgICAgICAgaW5pdGlhbGl6ZURJKCk7XHJcbiAgICAgICAgeWllbGQgaWdub3JlVGVzdExhdW5jaGVyKCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZWFyZG93bigoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgaW9jLmRpc3Bvc2UoKTtcclxuICAgICAgICB5aWVsZCBjb21tb25fMS51cGRhdGVTZXR0aW5nKCd1bml0VGVzdC51bml0dGVzdEFyZ3MnLCBkZWZhdWx0VW5pdFRlc3RBcmdzLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCBjb25maWdUYXJnZXQpO1xyXG4gICAgfSkpO1xyXG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZURJKCkge1xyXG4gICAgICAgIGlvYyA9IG5ldyBzZXJ2aWNlUmVnaXN0cnlfMS5Vbml0VGVzdElvY0NvbnRhaW5lcigpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlckNvbW1vblR5cGVzKCk7XHJcbiAgICAgICAgaW9jLnJlZ2lzdGVyVmFyaWFibGVUeXBlcygpO1xyXG4gICAgICAgIC8vIE1vY2tzLlxyXG4gICAgICAgIGlvYy5yZWdpc3Rlck1vY2tQcm9jZXNzVHlwZXMoKTtcclxuICAgICAgICBpb2MucmVnaXN0ZXJNb2NrVW5pdFRlc3RTb2NrZXRTZXJ2ZXIoKTtcclxuICAgICAgICAvLyBTdGFuZGFyZCB1bml0IHRlc3Qgc3R5cGVzLlxyXG4gICAgICAgIGlvYy5yZWdpc3RlclRlc3REaXNjb3ZlcnlTZXJ2aWNlcygpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlclRlc3RNYW5hZ2VycygpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlclRlc3RNYW5hZ2VyU2VydmljZSgpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlclRlc3RQYXJzZXJzKCk7XHJcbiAgICAgICAgaW9jLnJlZ2lzdGVyVGVzdFJlc3VsdHNIZWxwZXIoKTtcclxuICAgICAgICBpb2MucmVnaXN0ZXJUZXN0c0hlbHBlcigpO1xyXG4gICAgICAgIGlvYy5yZWdpc3RlclRlc3RTdG9yYWdlKCk7XHJcbiAgICAgICAgaW9jLnJlZ2lzdGVyVGVzdFZpc2l0b3JzKCk7XHJcbiAgICAgICAgaW9jLnNlcnZpY2VNYW5hZ2VyLmFkZCh0eXBlc18zLklBcmd1bWVudHNTZXJ2aWNlLCBhcmdzU2VydmljZV8xLkFyZ3VtZW50c1NlcnZpY2UsIGNvbnN0YW50c18yLlVOSVRURVNUX1BST1ZJREVSKTtcclxuICAgICAgICBpb2Muc2VydmljZU1hbmFnZXIuYWRkKHR5cGVzXzMuSUFyZ3VtZW50c0hlbHBlciwgYXJndW1lbnRzSGVscGVyXzEuQXJndW1lbnRzSGVscGVyKTtcclxuICAgICAgICBpb2Muc2VydmljZU1hbmFnZXIuYWRkKHR5cGVzXzMuSVRlc3RNYW5hZ2VyUnVubmVyLCBydW5uZXJfMi5UZXN0TWFuYWdlclJ1bm5lciwgY29uc3RhbnRzXzIuVU5JVFRFU1RfUFJPVklERVIpO1xyXG4gICAgICAgIGlvYy5zZXJ2aWNlTWFuYWdlci5hZGQodHlwZXNfMi5JVGVzdFJ1bm5lciwgcnVubmVyXzEuVGVzdFJ1bm5lcik7XHJcbiAgICAgICAgaW9jLnNlcnZpY2VNYW5hZ2VyLmFkZCh0eXBlc18zLklVbml0VGVzdEhlbHBlciwgaGVscGVyXzEuVW5pdFRlc3RIZWxwZXIpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gaWdub3JlVGVzdExhdW5jaGVyKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2NTZXJ2aWNlID0geWllbGQgaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSkuY3JlYXRlKCk7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gcnVubmluZyB0aGUgcHl0aG9uIHRlc3QgbGF1bmNoZXIsIGp1c3QgcmV0dXJuLlxyXG4gICAgICAgICAgICBwcm9jU2VydmljZS5vbkV4ZWNPYnNlcnZhYmxlKChmaWxlLCBhcmdzLCBvcHRpb25zLCBjYWxsYmFjaykgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSAmJiBhcmdzWzBdLmVuZHNXaXRoKCd2aXN1YWxzdHVkaW9fcHlfdGVzdGxhdW5jaGVyLnB5JykpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7IG91dDogJycsIHNvdXJjZTogJ3N0ZG91dCcgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gaW5qZWN0VGVzdERpc2NvdmVyeU91dHB1dChvdXRwdXQpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9jU2VydmljZSA9IHlpZWxkIGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQcm9jZXNzU2VydmljZUZhY3RvcnkpLmNyZWF0ZSgpO1xyXG4gICAgICAgICAgICBwcm9jU2VydmljZS5vbkV4ZWNPYnNlcnZhYmxlKChmaWxlLCBhcmdzLCBvcHRpb25zLCBjYWxsYmFjaykgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSAmJiBhcmdzWzBdID09PSAnLWMnICYmIGFyZ3NbMV0uaW5jbHVkZXMoJ2ltcG9ydCB1bml0dGVzdCcpICYmIGFyZ3NbMV0uaW5jbHVkZXMoJ2xvYWRlciA9IHVuaXR0ZXN0LlRlc3RMb2FkZXIoKScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYW55IHNwYWNlcyBhZGRlZCBkdXJpbmcgY29kZSBmb3JtYXR0aW5nIG9yIHRoZSBsaWtlIGFyZSByZW1vdmVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDogb3V0cHV0LnNwbGl0KC9cXHI/XFxuL2cpLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpKS5qb2luKG9zXzEuRU9MKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiAnc3Rkb3V0J1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGluamVjdFRlc3RTb2NrZXRTZXJ2ZXJSZXN1bHRzKHJlc3VsdHMpIHtcclxuICAgICAgICAvLyBBZGQgcmVzdWx0cyB0byBiZSBzZW50IGJ5IHVuaXQgdGVzdCBzb2NrZXQgc2VydmVyLlxyXG4gICAgICAgIGNvbnN0IHNvY2tldFNlcnZlciA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklVbml0VGVzdFNvY2tldFNlcnZlcik7XHJcbiAgICAgICAgc29ja2V0U2VydmVyLnJlc2V0KCk7XHJcbiAgICAgICAgc29ja2V0U2VydmVyLmFkZFJlc3VsdHMocmVzdWx0cyk7XHJcbiAgICB9XHJcbiAgICB0ZXN0KCdSdW4gVGVzdHMnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgY29tbW9uXzEudXBkYXRlU2V0dGluZygndW5pdFRlc3QudW5pdHRlc3RBcmdzJywgWyctdicsICctcycsICcuL3Rlc3RzJywgJy1wJywgJ3Rlc3RfdW5pdHRlc3QqLnB5J10sIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIGNvbmZpZ1RhcmdldCk7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW11bHRpbGluZS1zdHJpbmdcclxuICAgICAgICB5aWVsZCBpbmplY3RUZXN0RGlzY292ZXJ5T3V0cHV0KGBzdGFydFxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdDEudGVzdF9BXHJcbiAgICAgICAgdGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X0JcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3QxLnRlc3RfY1xyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9BMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9CMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9DMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9EMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDJhLnRlc3RfMjIyQTJcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyYS50ZXN0XzIyMkIyXHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1RvU2VuZCA9IFtcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZmFpbGVkJywgdHJhY2ViYWNrOiAnQXNzZXJ0aW9uRXJyb3I6IE5vdCBpbXBsZW1lbnRlZFxcbicsIG1lc3NhZ2U6ICdOb3QgaW1wbGVtZW50ZWQnLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X0EnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ3Bhc3NlZCcsIHRyYWNlYmFjazogbnVsbCwgbWVzc2FnZTogbnVsbCwgdGVzdDogJ3Rlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdDEudGVzdF9CJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdza2lwcGVkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X2MnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ3JhaXNlIHNlbGYuZmFpbHVyZUV4Y2VwdGlvbihtc2cpXFxuQXNzZXJ0aW9uRXJyb3I6IE5vdCBpbXBsZW1lbnRlZFxcbicsIG1lc3NhZ2U6ICdOb3QgaW1wbGVtZW50ZWQnLCB0ZXN0OiAndGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0Mi50ZXN0X0EyJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdwYXNzZWQnLCB0cmFjZWJhY2s6IG51bGwsIG1lc3NhZ2U6IG51bGwsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyLnRlc3RfQjInIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ3JhaXNlIHNlbGYuZmFpbHVyZUV4Y2VwdGlvbihtc2cpXFxuQXNzZXJ0aW9uRXJyb3I6IDEgIT0gMiA6IE5vdCBlcXVhbFxcbicsIG1lc3NhZ2U6ICcxICE9IDIgOiBOb3QgZXF1YWwnLCB0ZXN0OiAndGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0Mi50ZXN0X0MyJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdlcnJvcicsIHRyYWNlYmFjazogJ3JhaXNlIEFyaXRobWV0aWNFcnJvcigpXFxuQXJpdGhtZXRpY0Vycm9yXFxuJywgbWVzc2FnZTogJycsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyLnRlc3RfRDInIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ3JhaXNlIHNlbGYuZmFpbHVyZUV4Y2VwdGlvbihtc2cpXFxuQXNzZXJ0aW9uRXJyb3I6IE5vdCBpbXBsZW1lbnRlZFxcbicsIG1lc3NhZ2U6ICdOb3QgaW1wbGVtZW50ZWQnLCB0ZXN0OiAndGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0MmEudGVzdF8yMjJBMicgfSxcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAncGFzc2VkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0MmEudGVzdF8yMjJCMicgfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgaW5qZWN0VGVzdFNvY2tldFNlcnZlclJlc3VsdHMocmVzdWx0c1RvU2VuZCk7XHJcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklUZXN0TWFuYWdlckZhY3RvcnkpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0gZmFjdG9yeSgndW5pdHRlc3QnLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCByb290RGlyZWN0b3J5KTtcclxuICAgICAgICBjb25zdCByZXN1bHRzID0geWllbGQgdGVzdE1hbmFnZXIucnVuVGVzdChjb25zdGFudHNfMi5Db21tYW5kU291cmNlLnVpKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5zdW1tYXJ5LmVycm9ycywgMSwgJ0Vycm9ycycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkuZmFpbHVyZXMsIDQsICdGYWlsdXJlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkucGFzc2VkLCAzLCAnUGFzc2VkJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5za2lwcGVkLCAxLCAnc2tpcHBlZCcpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnUnVuIEZhaWxlZCBUZXN0cycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCBjb21tb25fMS51cGRhdGVTZXR0aW5nKCd1bml0VGVzdC51bml0dGVzdEFyZ3MnLCBbJy1zPS4vdGVzdHMnLCAnLXA9dGVzdF91bml0dGVzdCoucHknXSwgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgY29uZmlnVGFyZ2V0KTtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tbXVsdGlsaW5lLXN0cmluZ1xyXG4gICAgICAgIHlpZWxkIGluamVjdFRlc3REaXNjb3ZlcnlPdXRwdXQoYHN0YXJ0XHJcbiAgICAgICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdDEudGVzdF9BXHJcbiAgICAgICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdDEudGVzdF9CXHJcbiAgICAgICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdDEudGVzdF9jXHJcbiAgICAgICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9BMlxyXG4gICAgICAgICAgICB0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyLnRlc3RfQjJcclxuICAgICAgICAgICAgdGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0Mi50ZXN0X0MyXHJcbiAgICAgICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9EMlxyXG4gICAgICAgICAgICB0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyYS50ZXN0XzIyMkEyXHJcbiAgICAgICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDJhLnRlc3RfMjIyQjJcclxuICAgICAgICAgICAgYCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1RvU2VuZCA9IFtcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZmFpbGVkJywgdHJhY2ViYWNrOiAncmFpc2Ugc2VsZi5mYWlsdXJlRXhjZXB0aW9uKG1zZylcXG5Bc3NlcnRpb25FcnJvcjogTm90IGltcGxlbWVudGVkXFxuJywgbWVzc2FnZTogJ05vdCBpbXBsZW1lbnRlZCcsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3QxLnRlc3RfQScgfSxcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAncGFzc2VkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X0InIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ3NraXBwZWQnLCB0cmFjZWJhY2s6IG51bGwsIG1lc3NhZ2U6IG51bGwsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3QxLnRlc3RfYycgfSxcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZmFpbGVkJywgdHJhY2ViYWNrOiAncmFpc2Ugc2VsZi5mYWlsdXJlRXhjZXB0aW9uKG1zZylcXG5Bc3NlcnRpb25FcnJvcjogTm90IGltcGxlbWVudGVkXFxuJywgbWVzc2FnZTogJ05vdCBpbXBsZW1lbnRlZCcsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyLnRlc3RfQTInIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ3Bhc3NlZCcsIHRyYWNlYmFjazogbnVsbCwgbWVzc2FnZTogbnVsbCwgdGVzdDogJ3Rlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9CMicgfSxcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZmFpbGVkJywgdHJhY2ViYWNrOiAncmFpc2Ugc2VsZi5mYWlsdXJlRXhjZXB0aW9uKG1zZylcXG5Bc3NlcnRpb25FcnJvcjogMSAhPSAyIDogTm90IGVxdWFsXFxuJywgbWVzc2FnZTogJzEgIT0gMiA6IE5vdCBlcXVhbCcsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyLnRlc3RfQzInIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2Vycm9yJywgdHJhY2ViYWNrOiAncmFpc2UgQXJpdGhtZXRpY0Vycm9yKClcXG5Bcml0aG1ldGljRXJyb3JcXG4nLCBtZXNzYWdlOiAnJywgdGVzdDogJ3Rlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9EMicgfSxcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZmFpbGVkJywgdHJhY2ViYWNrOiAncmFpc2Ugc2VsZi5mYWlsdXJlRXhjZXB0aW9uKG1zZylcXG5Bc3NlcnRpb25FcnJvcjogTm90IGltcGxlbWVudGVkXFxuJywgbWVzc2FnZTogJ05vdCBpbXBsZW1lbnRlZCcsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyYS50ZXN0XzIyMkEyJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdwYXNzZWQnLCB0cmFjZWJhY2s6IG51bGwsIG1lc3NhZ2U6IG51bGwsIHRlc3Q6ICd0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyYS50ZXN0XzIyMkIyJyB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBpbmplY3RUZXN0U29ja2V0U2VydmVyUmVzdWx0cyhyZXN1bHRzVG9TZW5kKTtcclxuICAgICAgICBjb25zdCBmYWN0b3J5ID0gaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSVRlc3RNYW5hZ2VyRmFjdG9yeSk7XHJcbiAgICAgICAgY29uc3QgdGVzdE1hbmFnZXIgPSBmYWN0b3J5KCd1bml0dGVzdCcsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIHJvb3REaXJlY3RvcnkpO1xyXG4gICAgICAgIGxldCByZXN1bHRzID0geWllbGQgdGVzdE1hbmFnZXIucnVuVGVzdChjb25zdGFudHNfMi5Db21tYW5kU291cmNlLnVpKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5zdW1tYXJ5LmVycm9ycywgMSwgJ0Vycm9ycycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkuZmFpbHVyZXMsIDQsICdGYWlsdXJlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkucGFzc2VkLCAzLCAnUGFzc2VkJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5za2lwcGVkLCAxLCAnc2tpcHBlZCcpO1xyXG4gICAgICAgIGNvbnN0IGZhaWxlZFJlc3VsdHNUb1NlbmQgPSBbXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ3JhaXNlIHNlbGYuZmFpbHVyZUV4Y2VwdGlvbihtc2cpXFxuQXNzZXJ0aW9uRXJyb3I6IE5vdCBpbXBsZW1lbnRlZFxcbicsIG1lc3NhZ2U6ICdOb3QgaW1wbGVtZW50ZWQnLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X0EnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ3JhaXNlIHNlbGYuZmFpbHVyZUV4Y2VwdGlvbihtc2cpXFxuQXNzZXJ0aW9uRXJyb3I6IE5vdCBpbXBsZW1lbnRlZFxcbicsIG1lc3NhZ2U6ICdOb3QgaW1wbGVtZW50ZWQnLCB0ZXN0OiAndGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0Mi50ZXN0X0EyJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdmYWlsZWQnLCB0cmFjZWJhY2s6ICdyYWlzZSBzZWxmLmZhaWx1cmVFeGNlcHRpb24obXNnKVxcbkFzc2VydGlvbkVycm9yOiAxICE9IDIgOiBOb3QgZXF1YWxcXG4nLCBtZXNzYWdlOiAnMSAhPSAyIDogTm90IGVxdWFsJywgdGVzdDogJ3Rlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9DMicgfSxcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZXJyb3InLCB0cmFjZWJhY2s6ICdyYWlzZSBBcml0aG1ldGljRXJyb3IoKVxcbkFyaXRobWV0aWNFcnJvclxcbicsIG1lc3NhZ2U6ICcnLCB0ZXN0OiAndGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0Mi50ZXN0X0QyJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdmYWlsZWQnLCB0cmFjZWJhY2s6ICdyYWlzZSBzZWxmLmZhaWx1cmVFeGNlcHRpb24obXNnKVxcbkFzc2VydGlvbkVycm9yOiBOb3QgaW1wbGVtZW50ZWRcXG4nLCBtZXNzYWdlOiAnTm90IGltcGxlbWVudGVkJywgdGVzdDogJ3Rlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDJhLnRlc3RfMjIyQTInIH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIGluamVjdFRlc3RTb2NrZXRTZXJ2ZXJSZXN1bHRzKGZhaWxlZFJlc3VsdHNUb1NlbmQpO1xyXG4gICAgICAgIHJlc3VsdHMgPSB5aWVsZCB0ZXN0TWFuYWdlci5ydW5UZXN0KGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UudWksIHVuZGVmaW5lZCwgdHJ1ZSk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5lcnJvcnMsIDEsICdGYWlsZWQgRXJyb3JzJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5mYWlsdXJlcywgNCwgJ0ZhaWxlZCBGYWlsdXJlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkucGFzc2VkLCAwLCAnRmFpbGVkIFBhc3NlZCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkuc2tpcHBlZCwgMCwgJ0ZhaWxlZCBza2lwcGVkJyk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdSdW4gU3BlY2lmaWMgVGVzdCBGaWxlJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIGNvbW1vbl8xLnVwZGF0ZVNldHRpbmcoJ3VuaXRUZXN0LnVuaXR0ZXN0QXJncycsIFsnLXM9Li90ZXN0cycsICctcD10ZXN0X3VuaXR0ZXN0Ki5weSddLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCBjb25maWdUYXJnZXQpO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1tdWx0aWxpbmUtc3RyaW5nXHJcbiAgICAgICAgeWllbGQgaW5qZWN0VGVzdERpc2NvdmVyeU91dHB1dChgc3RhcnRcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3Rfb25lXzEudGVzdF8xXzFfMVxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdF9vbmVfMS50ZXN0XzFfMV8yXHJcbiAgICAgICAgdGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0X29uZV8xLnRlc3RfMV8xXzNcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3Rfb25lXzIudGVzdF8xXzJfMVxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdF90d29fMS50ZXN0XzFfMV8xXHJcbiAgICAgICAgdGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0X3R3b18xLnRlc3RfMV8xXzJcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3RfdHdvXzEudGVzdF8xXzFfM1xyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdF90d29fMi50ZXN0XzJfMV8xXHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1RvU2VuZCA9IFtcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAncGFzc2VkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0X29uZV8xLnRlc3RfMV8xXzEnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ0Fzc2VydGlvbkVycm9yOiAxICE9IDIgOiBOb3QgZXF1YWxcXG4nLCBtZXNzYWdlOiAnMSAhPSAyIDogTm90IGVxdWFsJywgdGVzdDogJ3Rlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdF9vbmVfMS50ZXN0XzFfMV8yJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdza2lwcGVkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0X29uZV8xLnRlc3RfMV8xXzMnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ3Bhc3NlZCcsIHRyYWNlYmFjazogbnVsbCwgbWVzc2FnZTogbnVsbCwgdGVzdDogJ3Rlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdF9vbmVfMi50ZXN0XzFfMl8xJyB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBpbmplY3RUZXN0U29ja2V0U2VydmVyUmVzdWx0cyhyZXN1bHRzVG9TZW5kKTtcclxuICAgICAgICBjb25zdCBmYWN0b3J5ID0gaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSVRlc3RNYW5hZ2VyRmFjdG9yeSk7XHJcbiAgICAgICAgY29uc3QgdGVzdE1hbmFnZXIgPSBmYWN0b3J5KCd1bml0dGVzdCcsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIHVuaXRUZXN0U3BlY2lmaWNUZXN0RmlsZXNQYXRoKTtcclxuICAgICAgICBjb25zdCB0ZXN0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLmRpc2NvdmVyVGVzdHMoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS51aSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIGNvbnN0IHRlc3RGaWxlVG9UZXN0ID0gdGVzdHMudGVzdEZpbGVzLmZpbmQoZiA9PiBmLm5hbWUgPT09ICd0ZXN0X3VuaXR0ZXN0X29uZS5weScpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RGaWxlID0geyB0ZXN0RmlsZTogW3Rlc3RGaWxlVG9UZXN0XSwgdGVzdEZvbGRlcjogW10sIHRlc3RGdW5jdGlvbjogW10sIHRlc3RTdWl0ZTogW10gfTtcclxuICAgICAgICBjb25zdCByZXN1bHRzID0geWllbGQgdGVzdE1hbmFnZXIucnVuVGVzdChjb25zdGFudHNfMi5Db21tYW5kU291cmNlLnVpLCB0ZXN0RmlsZSk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5lcnJvcnMsIDAsICdFcnJvcnMnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5zdW1tYXJ5LmZhaWx1cmVzLCAxLCAnRmFpbHVyZXMnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5zdW1tYXJ5LnBhc3NlZCwgMiwgJ1Bhc3NlZCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkuc2tpcHBlZCwgMSwgJ3NraXBwZWQnKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ1J1biBTcGVjaWZpYyBUZXN0IFN1aXRlJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIGNvbW1vbl8xLnVwZGF0ZVNldHRpbmcoJ3VuaXRUZXN0LnVuaXR0ZXN0QXJncycsIFsnLXM9Li90ZXN0cycsICctcD10ZXN0X3VuaXR0ZXN0Ki5weSddLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCBjb25maWdUYXJnZXQpO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1tdWx0aWxpbmUtc3RyaW5nXHJcbiAgICAgICAgeWllbGQgaW5qZWN0VGVzdERpc2NvdmVyeU91dHB1dChgc3RhcnRcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3Rfb25lXzEudGVzdF8xXzFfMVxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdF9vbmVfMS50ZXN0XzFfMV8yXHJcbiAgICAgICAgdGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0X29uZV8xLnRlc3RfMV8xXzNcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3Rfb25lXzIudGVzdF8xXzJfMVxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdF90d29fMS50ZXN0XzFfMV8xXHJcbiAgICAgICAgdGVzdF91bml0dGVzdF90d28uVGVzdF90ZXN0X3R3b18xLnRlc3RfMV8xXzJcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3RfdHdvXzEudGVzdF8xXzFfM1xyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdF90d29fMi50ZXN0XzJfMV8xXHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1RvU2VuZCA9IFtcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAncGFzc2VkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0X29uZV8xLnRlc3RfMV8xXzEnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ2ZhaWxlZCcsIHRyYWNlYmFjazogJ0Fzc2VydGlvbkVycm9yOiAxICE9IDIgOiBOb3QgZXF1YWxcXG4nLCBtZXNzYWdlOiAnMSAhPSAyIDogTm90IGVxdWFsJywgdGVzdDogJ3Rlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdF9vbmVfMS50ZXN0XzFfMV8yJyB9LFxyXG4gICAgICAgICAgICB7IG91dGNvbWU6ICdza2lwcGVkJywgdHJhY2ViYWNrOiBudWxsLCBtZXNzYWdlOiBudWxsLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0X29uZV8xLnRlc3RfMV8xXzMnIH0sXHJcbiAgICAgICAgICAgIHsgb3V0Y29tZTogJ3Bhc3NlZCcsIHRyYWNlYmFjazogbnVsbCwgbWVzc2FnZTogbnVsbCwgdGVzdDogJ3Rlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdF9vbmVfMi50ZXN0XzFfMl8xJyB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBpbmplY3RUZXN0U29ja2V0U2VydmVyUmVzdWx0cyhyZXN1bHRzVG9TZW5kKTtcclxuICAgICAgICBjb25zdCBmYWN0b3J5ID0gaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSVRlc3RNYW5hZ2VyRmFjdG9yeSk7XHJcbiAgICAgICAgY29uc3QgdGVzdE1hbmFnZXIgPSBmYWN0b3J5KCd1bml0dGVzdCcsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIHVuaXRUZXN0U3BlY2lmaWNUZXN0RmlsZXNQYXRoKTtcclxuICAgICAgICBjb25zdCB0ZXN0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLmRpc2NvdmVyVGVzdHMoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS51aSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW5vbi1udWxsLWFzc2VydGlvblxyXG4gICAgICAgIGNvbnN0IHRlc3RTdWl0ZVRvVGVzdCA9IHRlc3RzLnRlc3RTdWl0ZXMuZmluZChzID0+IHMudGVzdFN1aXRlLm5hbWUgPT09ICdUZXN0X3Rlc3Rfb25lXzEnKS50ZXN0U3VpdGU7XHJcbiAgICAgICAgY29uc3QgdGVzdFN1aXRlID0geyB0ZXN0RmlsZTogW10sIHRlc3RGb2xkZXI6IFtdLCB0ZXN0RnVuY3Rpb246IFtdLCB0ZXN0U3VpdGU6IFt0ZXN0U3VpdGVUb1Rlc3RdIH07XHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLnJ1blRlc3QoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS51aSwgdGVzdFN1aXRlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5zdW1tYXJ5LmVycm9ycywgMCwgJ0Vycm9ycycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkuZmFpbHVyZXMsIDEsICdGYWlsdXJlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkucGFzc2VkLCAyLCAnUGFzc2VkJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5za2lwcGVkLCAxLCAnc2tpcHBlZCcpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnUnVuIFNwZWNpZmljIFRlc3QgRnVuY3Rpb24nLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgY29tbW9uXzEudXBkYXRlU2V0dGluZygndW5pdFRlc3QudW5pdHRlc3RBcmdzJywgWyctcz0uL3Rlc3RzJywgJy1wPXRlc3RfdW5pdHRlc3QqLnB5J10sIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIGNvbmZpZ1RhcmdldCk7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW11bHRpbGluZS1zdHJpbmdcclxuICAgICAgICB5aWVsZCBpbmplY3RUZXN0RGlzY292ZXJ5T3V0cHV0KGBzdGFydFxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3Rfb25lLlRlc3RfdGVzdDEudGVzdF9BXHJcbiAgICAgICAgdGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X0JcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X29uZS5UZXN0X3Rlc3QxLnRlc3RfY1xyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9BMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9CMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9DMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDIudGVzdF9EMlxyXG4gICAgICAgIHRlc3RfdW5pdHRlc3RfdHdvLlRlc3RfdGVzdDJhLnRlc3RfMjIyQTJcclxuICAgICAgICB0ZXN0X3VuaXR0ZXN0X3R3by5UZXN0X3Rlc3QyYS50ZXN0XzIyMkIyXHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1RvU2VuZCA9IFtcclxuICAgICAgICAgICAgeyBvdXRjb21lOiAnZmFpbGVkJywgdHJhY2ViYWNrOiAnQXNzZXJ0aW9uRXJyb3I6IE5vdCBpbXBsZW1lbnRlZFxcbicsIG1lc3NhZ2U6ICdOb3QgaW1wbGVtZW50ZWQnLCB0ZXN0OiAndGVzdF91bml0dGVzdF9vbmUuVGVzdF90ZXN0MS50ZXN0X0EnIH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIGluamVjdFRlc3RTb2NrZXRTZXJ2ZXJSZXN1bHRzKHJlc3VsdHNUb1NlbmQpO1xyXG4gICAgICAgIGNvbnN0IGZhY3RvcnkgPSBpb2Muc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JVGVzdE1hbmFnZXJGYWN0b3J5KTtcclxuICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IGZhY3RvcnkoJ3VuaXR0ZXN0JywgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgcm9vdERpcmVjdG9yeSk7XHJcbiAgICAgICAgY29uc3QgdGVzdHMgPSB5aWVsZCB0ZXN0TWFuYWdlci5kaXNjb3ZlclRlc3RzKGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UudWksIHRydWUsIHRydWUpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RGbiA9IHsgdGVzdEZpbGU6IFtdLCB0ZXN0Rm9sZGVyOiBbXSwgdGVzdEZ1bmN0aW9uOiBbdGVzdHMudGVzdEZ1bmN0aW9uc1swXS50ZXN0RnVuY3Rpb25dLCB0ZXN0U3VpdGU6IFtdIH07XHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLnJ1blRlc3QoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS51aSwgdGVzdEZuKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5zdW1tYXJ5LmVycm9ycywgMCwgJ0Vycm9ycycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkuZmFpbHVyZXMsIDEsICdGYWlsdXJlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLnN1bW1hcnkucGFzc2VkLCAwLCAnUGFzc2VkJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMuc3VtbWFyeS5za2lwcGVkLCAwLCAnc2tpcHBlZCcpO1xyXG4gICAgfSkpO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dW5pdHRlc3QucnVuLnRlc3QuanMubWFwIl19