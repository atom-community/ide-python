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

const path = require("path");

const vscode = require("vscode");

const constants_1 = require("../../../client/common/constants");

const types_1 = require("../../../client/common/process/types");

const constants_2 = require("../../../client/unittests/common/constants");

const types_2 = require("../../../client/unittests/common/types");

const common_1 = require("../../common");

const serviceRegistry_1 = require("../serviceRegistry");

const initialize_1 = require("./../../initialize");

const UNITTEST_TEST_FILES_PATH = path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test', 'pythonFiles', 'testFiles', 'standard');
const UNITTEST_SINGLE_TEST_FILE_PATH = path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test', 'pythonFiles', 'testFiles', 'single');
const UNITTEST_TEST_FILES_PATH_WITH_CONFIGS = path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test', 'pythonFiles', 'testFiles', 'unitestsWithConfigs');
const unitTestTestFilesCwdPath = path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test', 'pythonFiles', 'testFiles', 'cwd', 'src'); // tslint:disable-next-line:max-func-body-length

suite('Unit Tests - pytest - discovery with mocked process output', () => {
  let ioc;
  const configTarget = initialize_1.IS_MULTI_ROOT_TEST ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Workspace;
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    yield common_1.updateSetting('unitTest.pyTestArgs', [], common_1.rootWorkspaceUri, configTarget);
  }));
  setup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initializeTest();
    initializeDI();
  }));
  teardown(() => __awaiter(void 0, void 0, void 0, function* () {
    ioc.dispose();
    yield common_1.updateSetting('unitTest.pyTestArgs', [], common_1.rootWorkspaceUri, configTarget);
  }));

  function initializeDI() {
    ioc = new serviceRegistry_1.UnitTestIocContainer();
    ioc.registerCommonTypes();
    ioc.registerUnitTestTypes();
    ioc.registerVariableTypes(); // Mocks.

    ioc.registerMockProcessTypes();
  }

  function injectTestDiscoveryOutput(output) {
    return __awaiter(this, void 0, void 0, function* () {
      const procService = yield ioc.serviceContainer.get(types_1.IProcessServiceFactory).create();
      procService.onExecObservable((file, args, options, callback) => {
        if (args.indexOf('--collect-only') >= 0) {
          callback({
            out: output,
            source: 'stdout'
          });
        }
      });
    });
  }

  test('Discover Tests (single test file)', () => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line:no-multiline-string
    yield injectTestDiscoveryOutput(`
        ============================= test session starts ==============================
        platform darwin -- Python 3.6.2, pytest-3.3.0, py-1.5.2, pluggy-0.6.0
        rootdir: /Users/donjayamanne/.vscode/extensions/pythonVSCode/src/test/pythonFiles/testFiles/single, inifile:
        plugins: pylama-7.4.3
        collected 6 items
        <Module 'test_root.py'>
          <UnitTestCase 'Test_Root_test1'>
            <TestCaseFunction 'test_Root_A'>
            <TestCaseFunction 'test_Root_B'>
            <TestCaseFunction 'test_Root_c'>
        <Module 'tests/test_one.py'>
          <UnitTestCase 'Test_test1'>
            <TestCaseFunction 'test_A'>
            <TestCaseFunction 'test_B'>
            <TestCaseFunction 'test_c'>

        ========================= no tests ran in 0.03 seconds =========================
        `);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('pytest', common_1.rootWorkspaceUri, UNITTEST_SINGLE_TEST_FILE_PATH);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true);
    assert.equal(tests.testFiles.length, 2, 'Incorrect number of test files');
    assert.equal(tests.testFunctions.length, 6, 'Incorrect number of test functions');
    assert.equal(tests.testSuites.length, 2, 'Incorrect number of test suites');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/test_one.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'test_root.py' && t.nameToRun === t.name), true, 'Test File not found');
  }));
  test('Discover Tests (pattern = test_)', () => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line:no-multiline-string
    yield injectTestDiscoveryOutput(`
        ============================= test session starts ==============================
        platform darwin -- Python 3.6.2, pytest-3.3.0, py-1.5.2, pluggy-0.6.0
        rootdir: /Users/donjayamanne/.vscode/extensions/pythonVSCode/src/test/pythonFiles/testFiles/standard, inifile:
        plugins: pylama-7.4.3
        collected 29 items
        <Module 'test_root.py'>
          <UnitTestCase 'Test_Root_test1'>
            <TestCaseFunction 'test_Root_A'>
            <TestCaseFunction 'test_Root_B'>
            <TestCaseFunction 'test_Root_c'>
        <Module 'tests/test_another_pytest.py'>
          <Function 'test_username'>
          <Function 'test_parametrized_username[one]'>
          <Function 'test_parametrized_username[two]'>
          <Function 'test_parametrized_username[three]'>
        <Module 'tests/test_pytest.py'>
          <Class 'Test_CheckMyApp'>
            <Instance '()'>
              <Function 'test_simple_check'>
              <Function 'test_complex_check'>
              <Class 'Test_NestedClassA'>
                <Instance '()'>
                  <Function 'test_nested_class_methodB'>
                  <Class 'Test_nested_classB_Of_A'>
                    <Instance '()'>
                      <Function 'test_d'>
                  <Function 'test_nested_class_methodC'>
              <Function 'test_simple_check2'>
              <Function 'test_complex_check2'>
          <Function 'test_username'>
          <Function 'test_parametrized_username[one]'>
          <Function 'test_parametrized_username[two]'>
          <Function 'test_parametrized_username[three]'>
        <Module 'tests/test_unittest_one.py'>
          <UnitTestCase 'Test_test1'>
            <TestCaseFunction 'test_A'>
            <TestCaseFunction 'test_B'>
            <TestCaseFunction 'test_c'>
        <Module 'tests/test_unittest_two.py'>
          <UnitTestCase 'Test_test2'>
            <TestCaseFunction 'test_A2'>
            <TestCaseFunction 'test_B2'>
            <TestCaseFunction 'test_C2'>
            <TestCaseFunction 'test_D2'>
          <UnitTestCase 'Test_test2a'>
            <TestCaseFunction 'test_222A2'>
            <TestCaseFunction 'test_222B2'>
        <Module 'tests/unittest_three_test.py'>
          <UnitTestCase 'Test_test3'>
            <TestCaseFunction 'test_A'>
            <TestCaseFunction 'test_B'>

        ========================= no tests ran in 0.05 seconds =========================
        "
        PROBLEMS
        OUTPUT
        DEBUG CONSOLE
        TERMINAL


        W

        Find

        `);
    yield common_1.updateSetting('unitTest.pyTestArgs', ['-k=test_'], common_1.rootWorkspaceUri, configTarget);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('pytest', common_1.rootWorkspaceUri, UNITTEST_TEST_FILES_PATH);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true);
    assert.equal(tests.testFiles.length, 6, 'Incorrect number of test files');
    assert.equal(tests.testFunctions.length, 29, 'Incorrect number of test functions');
    assert.equal(tests.testSuites.length, 8, 'Incorrect number of test suites');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/test_unittest_one.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/test_unittest_two.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/unittest_three_test.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/test_pytest.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/test_another_pytest.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'test_root.py' && t.nameToRun === t.name), true, 'Test File not found');
  }));
  test('Discover Tests (pattern = _test)', () => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line:no-multiline-string
    yield injectTestDiscoveryOutput(`
        ============================= test session starts ==============================
        platform darwin -- Python 3.6.2, pytest-3.3.0, py-1.5.2, pluggy-0.6.0
        rootdir: /Users/donjayamanne/.vscode/extensions/pythonVSCode/src/test/pythonFiles/testFiles/standard, inifile:
        plugins: pylama-7.4.3
        collected 29 items
        <Module 'tests/unittest_three_test.py'>
          <UnitTestCase 'Test_test3'>
            <TestCaseFunction 'test_A'>
            <TestCaseFunction 'test_B'>

        ============================= 27 tests deselected ==============================
        ======================== 27 deselected in 0.05 seconds =========================
        `);
    yield common_1.updateSetting('unitTest.pyTestArgs', ['-k=_test.py'], common_1.rootWorkspaceUri, configTarget);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('pytest', common_1.rootWorkspaceUri, UNITTEST_TEST_FILES_PATH);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true);
    assert.equal(tests.testFiles.length, 1, 'Incorrect number of test files');
    assert.equal(tests.testFunctions.length, 2, 'Incorrect number of test functions');
    assert.equal(tests.testSuites.length, 1, 'Incorrect number of test suites');
    assert.equal(tests.testFiles.some(t => t.name === 'tests/unittest_three_test.py' && t.nameToRun === t.name), true, 'Test File not found');
  }));
  test('Discover Tests (with config)', () => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line:no-multiline-string
    yield injectTestDiscoveryOutput(`
        ============================= test session starts ==============================
        platform darwin -- Python 3.6.2, pytest-3.3.0, py-1.5.2, pluggy-0.6.0
        rootdir: /Users/donjayamanne/.vscode/extensions/pythonVSCode/src/test/pythonFiles/testFiles/unitestsWithConfigs, inifile: pytest.ini
        plugins: pylama-7.4.3
        collected 14 items
        <Module 'other/test_pytest.py'>
          <Class 'Test_CheckMyApp'>
            <Instance '()'>
              <Function 'test_simple_check'>
              <Function 'test_complex_check'>
              <Class 'Test_NestedClassA'>
                <Instance '()'>
                  <Function 'test_nested_class_methodB'>
                  <Class 'Test_nested_classB_Of_A'>
                    <Instance '()'>
                      <Function 'test_d'>
                  <Function 'test_nested_class_methodC'>
              <Function 'test_simple_check2'>
              <Function 'test_complex_check2'>
          <Function 'test_username'>
          <Function 'test_parametrized_username[one]'>
          <Function 'test_parametrized_username[two]'>
          <Function 'test_parametrized_username[three]'>
        <Module 'other/test_unittest_one.py'>
          <UnitTestCase 'Test_test1'>
            <TestCaseFunction 'test_A'>
            <TestCaseFunction 'test_B'>
            <TestCaseFunction 'test_c'>

        ========================= no tests ran in 0.04 seconds =========================
        `);
    yield common_1.updateSetting('unitTest.pyTestArgs', [], common_1.rootWorkspaceUri, configTarget);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('pytest', common_1.rootWorkspaceUri, UNITTEST_TEST_FILES_PATH_WITH_CONFIGS);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true);
    assert.equal(tests.testFiles.length, 2, 'Incorrect number of test files');
    assert.equal(tests.testFunctions.length, 14, 'Incorrect number of test functions');
    assert.equal(tests.testSuites.length, 4, 'Incorrect number of test suites');
    assert.equal(tests.testFiles.some(t => t.name === 'other/test_unittest_one.py' && t.nameToRun === t.name), true, 'Test File not found');
    assert.equal(tests.testFiles.some(t => t.name === 'other/test_pytest.py' && t.nameToRun === t.name), true, 'Test File not found');
  }));
  test('Setting cwd should return tests', () => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line:no-multiline-string
    yield injectTestDiscoveryOutput(`
        ============================= test session starts ==============================
        platform darwin -- Python 3.6.2, pytest-3.3.0, py-1.5.2, pluggy-0.6.0
        rootdir: /Users/donjayamanne/.vscode/extensions/pythonVSCode/src/test/pythonFiles/testFiles/cwd/src, inifile:
        plugins: pylama-7.4.3
        collected 1 item
        <Module 'tests/test_cwd.py'>
          <UnitTestCase 'Test_Current_Working_Directory'>
            <TestCaseFunction 'test_cwd'>

        ========================= no tests ran in 0.02 seconds =========================
        `);
    yield common_1.updateSetting('unitTest.pyTestArgs', ['-k=test_'], common_1.rootWorkspaceUri, configTarget);
    const factory = ioc.serviceContainer.get(types_2.ITestManagerFactory);
    const testManager = factory('pytest', common_1.rootWorkspaceUri, unitTestTestFilesCwdPath);
    const tests = yield testManager.discoverTests(constants_2.CommandSource.ui, true, true);
    assert.equal(tests.testFiles.length, 1, 'Incorrect number of test files');
    assert.equal(tests.testFolders.length, 1, 'Incorrect number of test folders');
    assert.equal(tests.testFunctions.length, 1, 'Incorrect number of test functions');
    assert.equal(tests.testSuites.length, 1, 'Incorrect number of test suites');
  }));
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInB5dGVzdC5kaXNjb3ZlcnkudGVzdC5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwiYXNzZXJ0IiwicmVxdWlyZSIsInBhdGgiLCJ2c2NvZGUiLCJjb25zdGFudHNfMSIsInR5cGVzXzEiLCJjb25zdGFudHNfMiIsInR5cGVzXzIiLCJjb21tb25fMSIsInNlcnZpY2VSZWdpc3RyeV8xIiwiaW5pdGlhbGl6ZV8xIiwiVU5JVFRFU1RfVEVTVF9GSUxFU19QQVRIIiwiam9pbiIsIkVYVEVOU0lPTl9ST09UX0RJUiIsIlVOSVRURVNUX1NJTkdMRV9URVNUX0ZJTEVfUEFUSCIsIlVOSVRURVNUX1RFU1RfRklMRVNfUEFUSF9XSVRIX0NPTkZJR1MiLCJ1bml0VGVzdFRlc3RGaWxlc0N3ZFBhdGgiLCJzdWl0ZSIsImlvYyIsImNvbmZpZ1RhcmdldCIsIklTX01VTFRJX1JPT1RfVEVTVCIsIkNvbmZpZ3VyYXRpb25UYXJnZXQiLCJXb3Jrc3BhY2VGb2xkZXIiLCJXb3Jrc3BhY2UiLCJzdWl0ZVNldHVwIiwiaW5pdGlhbGl6ZSIsInVwZGF0ZVNldHRpbmciLCJyb290V29ya3NwYWNlVXJpIiwic2V0dXAiLCJpbml0aWFsaXplVGVzdCIsImluaXRpYWxpemVESSIsInRlYXJkb3duIiwiZGlzcG9zZSIsIlVuaXRUZXN0SW9jQ29udGFpbmVyIiwicmVnaXN0ZXJDb21tb25UeXBlcyIsInJlZ2lzdGVyVW5pdFRlc3RUeXBlcyIsInJlZ2lzdGVyVmFyaWFibGVUeXBlcyIsInJlZ2lzdGVyTW9ja1Byb2Nlc3NUeXBlcyIsImluamVjdFRlc3REaXNjb3ZlcnlPdXRwdXQiLCJvdXRwdXQiLCJwcm9jU2VydmljZSIsInNlcnZpY2VDb250YWluZXIiLCJnZXQiLCJJUHJvY2Vzc1NlcnZpY2VGYWN0b3J5IiwiY3JlYXRlIiwib25FeGVjT2JzZXJ2YWJsZSIsImZpbGUiLCJhcmdzIiwib3B0aW9ucyIsImNhbGxiYWNrIiwiaW5kZXhPZiIsIm91dCIsInNvdXJjZSIsInRlc3QiLCJmYWN0b3J5IiwiSVRlc3RNYW5hZ2VyRmFjdG9yeSIsInRlc3RNYW5hZ2VyIiwidGVzdHMiLCJkaXNjb3ZlclRlc3RzIiwiQ29tbWFuZFNvdXJjZSIsInVpIiwiZXF1YWwiLCJ0ZXN0RmlsZXMiLCJsZW5ndGgiLCJ0ZXN0RnVuY3Rpb25zIiwidGVzdFN1aXRlcyIsInNvbWUiLCJ0IiwibmFtZSIsIm5hbWVUb1J1biIsInRlc3RGb2xkZXJzIl0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5CLEVBQStCQyxDQUEvQixFQUFrQ0MsU0FBbEMsRUFBNkM7QUFDckYsU0FBTyxLQUFLRCxDQUFDLEtBQUtBLENBQUMsR0FBR0UsT0FBVCxDQUFOLEVBQXlCLFVBQVVDLE9BQVYsRUFBbUJDLE1BQW5CLEVBQTJCO0FBQ3ZELGFBQVNDLFNBQVQsQ0FBbUJDLEtBQW5CLEVBQTBCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQ08sSUFBVixDQUFlRixLQUFmLENBQUQsQ0FBSjtBQUE4QixPQUFwQyxDQUFxQyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUMzRixhQUFTQyxRQUFULENBQWtCSixLQUFsQixFQUF5QjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUMsT0FBRCxDQUFULENBQW1CSyxLQUFuQixDQUFELENBQUo7QUFBa0MsT0FBeEMsQ0FB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dCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIik7XHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuY29uc3QgdnNjb2RlID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L2NvbW1vbi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L2NvbW1vbi9wcm9jZXNzL3R5cGVzXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMiA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jbGllbnQvdW5pdHRlc3RzL2NvbW1vbi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vLi4vLi4vY2xpZW50L3VuaXR0ZXN0cy9jb21tb24vdHlwZXNcIik7XHJcbmNvbnN0IGNvbW1vbl8xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vblwiKTtcclxuY29uc3Qgc2VydmljZVJlZ2lzdHJ5XzEgPSByZXF1aXJlKFwiLi4vc2VydmljZVJlZ2lzdHJ5XCIpO1xyXG5jb25zdCBpbml0aWFsaXplXzEgPSByZXF1aXJlKFwiLi8uLi8uLi9pbml0aWFsaXplXCIpO1xyXG5jb25zdCBVTklUVEVTVF9URVNUX0ZJTEVTX1BBVEggPSBwYXRoLmpvaW4oY29uc3RhbnRzXzEuRVhURU5TSU9OX1JPT1RfRElSLCAnc3JjJywgJ3Rlc3QnLCAncHl0aG9uRmlsZXMnLCAndGVzdEZpbGVzJywgJ3N0YW5kYXJkJyk7XHJcbmNvbnN0IFVOSVRURVNUX1NJTkdMRV9URVNUX0ZJTEVfUEFUSCA9IHBhdGguam9pbihjb25zdGFudHNfMS5FWFRFTlNJT05fUk9PVF9ESVIsICdzcmMnLCAndGVzdCcsICdweXRob25GaWxlcycsICd0ZXN0RmlsZXMnLCAnc2luZ2xlJyk7XHJcbmNvbnN0IFVOSVRURVNUX1RFU1RfRklMRVNfUEFUSF9XSVRIX0NPTkZJR1MgPSBwYXRoLmpvaW4oY29uc3RhbnRzXzEuRVhURU5TSU9OX1JPT1RfRElSLCAnc3JjJywgJ3Rlc3QnLCAncHl0aG9uRmlsZXMnLCAndGVzdEZpbGVzJywgJ3VuaXRlc3RzV2l0aENvbmZpZ3MnKTtcclxuY29uc3QgdW5pdFRlc3RUZXN0RmlsZXNDd2RQYXRoID0gcGF0aC5qb2luKGNvbnN0YW50c18xLkVYVEVOU0lPTl9ST09UX0RJUiwgJ3NyYycsICd0ZXN0JywgJ3B5dGhvbkZpbGVzJywgJ3Rlc3RGaWxlcycsICdjd2QnLCAnc3JjJyk7XHJcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG5zdWl0ZSgnVW5pdCBUZXN0cyAtIHB5dGVzdCAtIGRpc2NvdmVyeSB3aXRoIG1vY2tlZCBwcm9jZXNzIG91dHB1dCcsICgpID0+IHtcclxuICAgIGxldCBpb2M7XHJcbiAgICBjb25zdCBjb25maWdUYXJnZXQgPSBpbml0aWFsaXplXzEuSVNfTVVMVElfUk9PVF9URVNUID8gdnNjb2RlLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlRm9sZGVyIDogdnNjb2RlLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlO1xyXG4gICAgc3VpdGVTZXR1cCgoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgaW5pdGlhbGl6ZV8xLmluaXRpYWxpemUoKTtcclxuICAgICAgICB5aWVsZCBjb21tb25fMS51cGRhdGVTZXR0aW5nKCd1bml0VGVzdC5weVRlc3RBcmdzJywgW10sIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIGNvbmZpZ1RhcmdldCk7XHJcbiAgICB9KSk7XHJcbiAgICBzZXR1cCgoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgaW5pdGlhbGl6ZV8xLmluaXRpYWxpemVUZXN0KCk7XHJcbiAgICAgICAgaW5pdGlhbGl6ZURJKCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZWFyZG93bigoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgaW9jLmRpc3Bvc2UoKTtcclxuICAgICAgICB5aWVsZCBjb21tb25fMS51cGRhdGVTZXR0aW5nKCd1bml0VGVzdC5weVRlc3RBcmdzJywgW10sIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIGNvbmZpZ1RhcmdldCk7XHJcbiAgICB9KSk7XHJcbiAgICBmdW5jdGlvbiBpbml0aWFsaXplREkoKSB7XHJcbiAgICAgICAgaW9jID0gbmV3IHNlcnZpY2VSZWdpc3RyeV8xLlVuaXRUZXN0SW9jQ29udGFpbmVyKCk7XHJcbiAgICAgICAgaW9jLnJlZ2lzdGVyQ29tbW9uVHlwZXMoKTtcclxuICAgICAgICBpb2MucmVnaXN0ZXJVbml0VGVzdFR5cGVzKCk7XHJcbiAgICAgICAgaW9jLnJlZ2lzdGVyVmFyaWFibGVUeXBlcygpO1xyXG4gICAgICAgIC8vIE1vY2tzLlxyXG4gICAgICAgIGlvYy5yZWdpc3Rlck1vY2tQcm9jZXNzVHlwZXMoKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGluamVjdFRlc3REaXNjb3ZlcnlPdXRwdXQob3V0cHV0KSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY1NlcnZpY2UgPSB5aWVsZCBpb2Muc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JUHJvY2Vzc1NlcnZpY2VGYWN0b3J5KS5jcmVhdGUoKTtcclxuICAgICAgICAgICAgcHJvY1NlcnZpY2Uub25FeGVjT2JzZXJ2YWJsZSgoZmlsZSwgYXJncywgb3B0aW9ucywgY2FsbGJhY2spID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmluZGV4T2YoJy0tY29sbGVjdC1vbmx5JykgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0OiBvdXRwdXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogJ3N0ZG91dCdcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0ZXN0KCdEaXNjb3ZlciBUZXN0cyAoc2luZ2xlIHRlc3QgZmlsZSknLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW11bHRpbGluZS1zdHJpbmdcclxuICAgICAgICB5aWVsZCBpbmplY3RUZXN0RGlzY292ZXJ5T3V0cHV0KGBcclxuICAgICAgICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PSB0ZXN0IHNlc3Npb24gc3RhcnRzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgIHBsYXRmb3JtIGRhcndpbiAtLSBQeXRob24gMy42LjIsIHB5dGVzdC0zLjMuMCwgcHktMS41LjIsIHBsdWdneS0wLjYuMFxyXG4gICAgICAgIHJvb3RkaXI6IC9Vc2Vycy9kb25qYXlhbWFubmUvLnZzY29kZS9leHRlbnNpb25zL3B5dGhvblZTQ29kZS9zcmMvdGVzdC9weXRob25GaWxlcy90ZXN0RmlsZXMvc2luZ2xlLCBpbmlmaWxlOlxyXG4gICAgICAgIHBsdWdpbnM6IHB5bGFtYS03LjQuM1xyXG4gICAgICAgIGNvbGxlY3RlZCA2IGl0ZW1zXHJcbiAgICAgICAgPE1vZHVsZSAndGVzdF9yb290LnB5Jz5cclxuICAgICAgICAgIDxVbml0VGVzdENhc2UgJ1Rlc3RfUm9vdF90ZXN0MSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X1Jvb3RfQSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X1Jvb3RfQic+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X1Jvb3RfYyc+XHJcbiAgICAgICAgPE1vZHVsZSAndGVzdHMvdGVzdF9vbmUucHknPlxyXG4gICAgICAgICAgPFVuaXRUZXN0Q2FzZSAnVGVzdF90ZXN0MSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0EnPlxyXG4gICAgICAgICAgICA8VGVzdENhc2VGdW5jdGlvbiAndGVzdF9CJz5cclxuICAgICAgICAgICAgPFRlc3RDYXNlRnVuY3Rpb24gJ3Rlc3RfYyc+XHJcblxyXG4gICAgICAgID09PT09PT09PT09PT09PT09PT09PT09PT0gbm8gdGVzdHMgcmFuIGluIDAuMDMgc2Vjb25kcyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklUZXN0TWFuYWdlckZhY3RvcnkpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0gZmFjdG9yeSgncHl0ZXN0JywgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgVU5JVFRFU1RfU0lOR0xFX1RFU1RfRklMRV9QQVRIKTtcclxuICAgICAgICBjb25zdCB0ZXN0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLmRpc2NvdmVyVGVzdHMoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS51aSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RGaWxlcy5sZW5ndGgsIDIsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3QgZmlsZXMnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZ1bmN0aW9ucy5sZW5ndGgsIDYsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3QgZnVuY3Rpb25zJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RTdWl0ZXMubGVuZ3RoLCAyLCAnSW5jb3JyZWN0IG51bWJlciBvZiB0ZXN0IHN1aXRlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RmlsZXMuc29tZSh0ID0+IHQubmFtZSA9PT0gJ3Rlc3RzL3Rlc3Rfb25lLnB5JyAmJiB0Lm5hbWVUb1J1biA9PT0gdC5uYW1lKSwgdHJ1ZSwgJ1Rlc3QgRmlsZSBub3QgZm91bmQnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZpbGVzLnNvbWUodCA9PiB0Lm5hbWUgPT09ICd0ZXN0X3Jvb3QucHknICYmIHQubmFtZVRvUnVuID09PSB0Lm5hbWUpLCB0cnVlLCAnVGVzdCBGaWxlIG5vdCBmb3VuZCcpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRGlzY292ZXIgVGVzdHMgKHBhdHRlcm4gPSB0ZXN0XyknLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW11bHRpbGluZS1zdHJpbmdcclxuICAgICAgICB5aWVsZCBpbmplY3RUZXN0RGlzY292ZXJ5T3V0cHV0KGBcclxuICAgICAgICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PSB0ZXN0IHNlc3Npb24gc3RhcnRzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgIHBsYXRmb3JtIGRhcndpbiAtLSBQeXRob24gMy42LjIsIHB5dGVzdC0zLjMuMCwgcHktMS41LjIsIHBsdWdneS0wLjYuMFxyXG4gICAgICAgIHJvb3RkaXI6IC9Vc2Vycy9kb25qYXlhbWFubmUvLnZzY29kZS9leHRlbnNpb25zL3B5dGhvblZTQ29kZS9zcmMvdGVzdC9weXRob25GaWxlcy90ZXN0RmlsZXMvc3RhbmRhcmQsIGluaWZpbGU6XHJcbiAgICAgICAgcGx1Z2luczogcHlsYW1hLTcuNC4zXHJcbiAgICAgICAgY29sbGVjdGVkIDI5IGl0ZW1zXHJcbiAgICAgICAgPE1vZHVsZSAndGVzdF9yb290LnB5Jz5cclxuICAgICAgICAgIDxVbml0VGVzdENhc2UgJ1Rlc3RfUm9vdF90ZXN0MSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X1Jvb3RfQSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X1Jvb3RfQic+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X1Jvb3RfYyc+XHJcbiAgICAgICAgPE1vZHVsZSAndGVzdHMvdGVzdF9hbm90aGVyX3B5dGVzdC5weSc+XHJcbiAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfdXNlcm5hbWUnPlxyXG4gICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X3BhcmFtZXRyaXplZF91c2VybmFtZVtvbmVdJz5cclxuICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9wYXJhbWV0cml6ZWRfdXNlcm5hbWVbdHdvXSc+XHJcbiAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfcGFyYW1ldHJpemVkX3VzZXJuYW1lW3RocmVlXSc+XHJcbiAgICAgICAgPE1vZHVsZSAndGVzdHMvdGVzdF9weXRlc3QucHknPlxyXG4gICAgICAgICAgPENsYXNzICdUZXN0X0NoZWNrTXlBcHAnPlxyXG4gICAgICAgICAgICA8SW5zdGFuY2UgJygpJz5cclxuICAgICAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3Rfc2ltcGxlX2NoZWNrJz5cclxuICAgICAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfY29tcGxleF9jaGVjayc+XHJcbiAgICAgICAgICAgICAgPENsYXNzICdUZXN0X05lc3RlZENsYXNzQSc+XHJcbiAgICAgICAgICAgICAgICA8SW5zdGFuY2UgJygpJz5cclxuICAgICAgICAgICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X25lc3RlZF9jbGFzc19tZXRob2RCJz5cclxuICAgICAgICAgICAgICAgICAgPENsYXNzICdUZXN0X25lc3RlZF9jbGFzc0JfT2ZfQSc+XHJcbiAgICAgICAgICAgICAgICAgICAgPEluc3RhbmNlICcoKSc+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfZCc+XHJcbiAgICAgICAgICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9uZXN0ZWRfY2xhc3NfbWV0aG9kQyc+XHJcbiAgICAgICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X3NpbXBsZV9jaGVjazInPlxyXG4gICAgICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9jb21wbGV4X2NoZWNrMic+XHJcbiAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfdXNlcm5hbWUnPlxyXG4gICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X3BhcmFtZXRyaXplZF91c2VybmFtZVtvbmVdJz5cclxuICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9wYXJhbWV0cml6ZWRfdXNlcm5hbWVbdHdvXSc+XHJcbiAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfcGFyYW1ldHJpemVkX3VzZXJuYW1lW3RocmVlXSc+XHJcbiAgICAgICAgPE1vZHVsZSAndGVzdHMvdGVzdF91bml0dGVzdF9vbmUucHknPlxyXG4gICAgICAgICAgPFVuaXRUZXN0Q2FzZSAnVGVzdF90ZXN0MSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0EnPlxyXG4gICAgICAgICAgICA8VGVzdENhc2VGdW5jdGlvbiAndGVzdF9CJz5cclxuICAgICAgICAgICAgPFRlc3RDYXNlRnVuY3Rpb24gJ3Rlc3RfYyc+XHJcbiAgICAgICAgPE1vZHVsZSAndGVzdHMvdGVzdF91bml0dGVzdF90d28ucHknPlxyXG4gICAgICAgICAgPFVuaXRUZXN0Q2FzZSAnVGVzdF90ZXN0Mic+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0EyJz5cclxuICAgICAgICAgICAgPFRlc3RDYXNlRnVuY3Rpb24gJ3Rlc3RfQjInPlxyXG4gICAgICAgICAgICA8VGVzdENhc2VGdW5jdGlvbiAndGVzdF9DMic+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0QyJz5cclxuICAgICAgICAgIDxVbml0VGVzdENhc2UgJ1Rlc3RfdGVzdDJhJz5cclxuICAgICAgICAgICAgPFRlc3RDYXNlRnVuY3Rpb24gJ3Rlc3RfMjIyQTInPlxyXG4gICAgICAgICAgICA8VGVzdENhc2VGdW5jdGlvbiAndGVzdF8yMjJCMic+XHJcbiAgICAgICAgPE1vZHVsZSAndGVzdHMvdW5pdHRlc3RfdGhyZWVfdGVzdC5weSc+XHJcbiAgICAgICAgICA8VW5pdFRlc3RDYXNlICdUZXN0X3Rlc3QzJz5cclxuICAgICAgICAgICAgPFRlc3RDYXNlRnVuY3Rpb24gJ3Rlc3RfQSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0InPlxyXG5cclxuICAgICAgICA9PT09PT09PT09PT09PT09PT09PT09PT09IG5vIHRlc3RzIHJhbiBpbiAwLjA1IHNlY29uZHMgPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgIFwiXHJcbiAgICAgICAgUFJPQkxFTVNcclxuICAgICAgICBPVVRQVVRcclxuICAgICAgICBERUJVRyBDT05TT0xFXHJcbiAgICAgICAgVEVSTUlOQUxcclxuXHJcblxyXG4gICAgICAgIFdcclxuXHJcbiAgICAgICAgRmluZFxyXG5cclxuICAgICAgICBgKTtcclxuICAgICAgICB5aWVsZCBjb21tb25fMS51cGRhdGVTZXR0aW5nKCd1bml0VGVzdC5weVRlc3RBcmdzJywgWyctaz10ZXN0XyddLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCBjb25maWdUYXJnZXQpO1xyXG4gICAgICAgIGNvbnN0IGZhY3RvcnkgPSBpb2Muc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JVGVzdE1hbmFnZXJGYWN0b3J5KTtcclxuICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IGZhY3RvcnkoJ3B5dGVzdCcsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIFVOSVRURVNUX1RFU1RfRklMRVNfUEFUSCk7XHJcbiAgICAgICAgY29uc3QgdGVzdHMgPSB5aWVsZCB0ZXN0TWFuYWdlci5kaXNjb3ZlclRlc3RzKGNvbnN0YW50c18yLkNvbW1hbmRTb3VyY2UudWksIHRydWUsIHRydWUpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RmlsZXMubGVuZ3RoLCA2LCAnSW5jb3JyZWN0IG51bWJlciBvZiB0ZXN0IGZpbGVzJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RGdW5jdGlvbnMubGVuZ3RoLCAyOSwgJ0luY29ycmVjdCBudW1iZXIgb2YgdGVzdCBmdW5jdGlvbnMnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdFN1aXRlcy5sZW5ndGgsIDgsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3Qgc3VpdGVzJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RGaWxlcy5zb21lKHQgPT4gdC5uYW1lID09PSAndGVzdHMvdGVzdF91bml0dGVzdF9vbmUucHknICYmIHQubmFtZVRvUnVuID09PSB0Lm5hbWUpLCB0cnVlLCAnVGVzdCBGaWxlIG5vdCBmb3VuZCcpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RmlsZXMuc29tZSh0ID0+IHQubmFtZSA9PT0gJ3Rlc3RzL3Rlc3RfdW5pdHRlc3RfdHdvLnB5JyAmJiB0Lm5hbWVUb1J1biA9PT0gdC5uYW1lKSwgdHJ1ZSwgJ1Rlc3QgRmlsZSBub3QgZm91bmQnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZpbGVzLnNvbWUodCA9PiB0Lm5hbWUgPT09ICd0ZXN0cy91bml0dGVzdF90aHJlZV90ZXN0LnB5JyAmJiB0Lm5hbWVUb1J1biA9PT0gdC5uYW1lKSwgdHJ1ZSwgJ1Rlc3QgRmlsZSBub3QgZm91bmQnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZpbGVzLnNvbWUodCA9PiB0Lm5hbWUgPT09ICd0ZXN0cy90ZXN0X3B5dGVzdC5weScgJiYgdC5uYW1lVG9SdW4gPT09IHQubmFtZSksIHRydWUsICdUZXN0IEZpbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RGaWxlcy5zb21lKHQgPT4gdC5uYW1lID09PSAndGVzdHMvdGVzdF9hbm90aGVyX3B5dGVzdC5weScgJiYgdC5uYW1lVG9SdW4gPT09IHQubmFtZSksIHRydWUsICdUZXN0IEZpbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RGaWxlcy5zb21lKHQgPT4gdC5uYW1lID09PSAndGVzdF9yb290LnB5JyAmJiB0Lm5hbWVUb1J1biA9PT0gdC5uYW1lKSwgdHJ1ZSwgJ1Rlc3QgRmlsZSBub3QgZm91bmQnKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Rpc2NvdmVyIFRlc3RzIChwYXR0ZXJuID0gX3Rlc3QpJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1tdWx0aWxpbmUtc3RyaW5nXHJcbiAgICAgICAgeWllbGQgaW5qZWN0VGVzdERpc2NvdmVyeU91dHB1dChgXHJcbiAgICAgICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gdGVzdCBzZXNzaW9uIHN0YXJ0cyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICBwbGF0Zm9ybSBkYXJ3aW4gLS0gUHl0aG9uIDMuNi4yLCBweXRlc3QtMy4zLjAsIHB5LTEuNS4yLCBwbHVnZ3ktMC42LjBcclxuICAgICAgICByb290ZGlyOiAvVXNlcnMvZG9uamF5YW1hbm5lLy52c2NvZGUvZXh0ZW5zaW9ucy9weXRob25WU0NvZGUvc3JjL3Rlc3QvcHl0aG9uRmlsZXMvdGVzdEZpbGVzL3N0YW5kYXJkLCBpbmlmaWxlOlxyXG4gICAgICAgIHBsdWdpbnM6IHB5bGFtYS03LjQuM1xyXG4gICAgICAgIGNvbGxlY3RlZCAyOSBpdGVtc1xyXG4gICAgICAgIDxNb2R1bGUgJ3Rlc3RzL3VuaXR0ZXN0X3RocmVlX3Rlc3QucHknPlxyXG4gICAgICAgICAgPFVuaXRUZXN0Q2FzZSAnVGVzdF90ZXN0Myc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0EnPlxyXG4gICAgICAgICAgICA8VGVzdENhc2VGdW5jdGlvbiAndGVzdF9CJz5cclxuXHJcbiAgICAgICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gMjcgdGVzdHMgZGVzZWxlY3RlZCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICA9PT09PT09PT09PT09PT09PT09PT09PT0gMjcgZGVzZWxlY3RlZCBpbiAwLjA1IHNlY29uZHMgPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgIGApO1xyXG4gICAgICAgIHlpZWxkIGNvbW1vbl8xLnVwZGF0ZVNldHRpbmcoJ3VuaXRUZXN0LnB5VGVzdEFyZ3MnLCBbJy1rPV90ZXN0LnB5J10sIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIGNvbmZpZ1RhcmdldCk7XHJcbiAgICAgICAgY29uc3QgZmFjdG9yeSA9IGlvYy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklUZXN0TWFuYWdlckZhY3RvcnkpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RNYW5hZ2VyID0gZmFjdG9yeSgncHl0ZXN0JywgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgVU5JVFRFU1RfVEVTVF9GSUxFU19QQVRIKTtcclxuICAgICAgICBjb25zdCB0ZXN0cyA9IHlpZWxkIHRlc3RNYW5hZ2VyLmRpc2NvdmVyVGVzdHMoY29uc3RhbnRzXzIuQ29tbWFuZFNvdXJjZS51aSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RGaWxlcy5sZW5ndGgsIDEsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3QgZmlsZXMnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZ1bmN0aW9ucy5sZW5ndGgsIDIsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3QgZnVuY3Rpb25zJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RTdWl0ZXMubGVuZ3RoLCAxLCAnSW5jb3JyZWN0IG51bWJlciBvZiB0ZXN0IHN1aXRlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RmlsZXMuc29tZSh0ID0+IHQubmFtZSA9PT0gJ3Rlc3RzL3VuaXR0ZXN0X3RocmVlX3Rlc3QucHknICYmIHQubmFtZVRvUnVuID09PSB0Lm5hbWUpLCB0cnVlLCAnVGVzdCBGaWxlIG5vdCBmb3VuZCcpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRGlzY292ZXIgVGVzdHMgKHdpdGggY29uZmlnKScsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tbXVsdGlsaW5lLXN0cmluZ1xyXG4gICAgICAgIHlpZWxkIGluamVjdFRlc3REaXNjb3ZlcnlPdXRwdXQoYFxyXG4gICAgICAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHRlc3Qgc2Vzc2lvbiBzdGFydHMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgcGxhdGZvcm0gZGFyd2luIC0tIFB5dGhvbiAzLjYuMiwgcHl0ZXN0LTMuMy4wLCBweS0xLjUuMiwgcGx1Z2d5LTAuNi4wXHJcbiAgICAgICAgcm9vdGRpcjogL1VzZXJzL2RvbmpheWFtYW5uZS8udnNjb2RlL2V4dGVuc2lvbnMvcHl0aG9uVlNDb2RlL3NyYy90ZXN0L3B5dGhvbkZpbGVzL3Rlc3RGaWxlcy91bml0ZXN0c1dpdGhDb25maWdzLCBpbmlmaWxlOiBweXRlc3QuaW5pXHJcbiAgICAgICAgcGx1Z2luczogcHlsYW1hLTcuNC4zXHJcbiAgICAgICAgY29sbGVjdGVkIDE0IGl0ZW1zXHJcbiAgICAgICAgPE1vZHVsZSAnb3RoZXIvdGVzdF9weXRlc3QucHknPlxyXG4gICAgICAgICAgPENsYXNzICdUZXN0X0NoZWNrTXlBcHAnPlxyXG4gICAgICAgICAgICA8SW5zdGFuY2UgJygpJz5cclxuICAgICAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3Rfc2ltcGxlX2NoZWNrJz5cclxuICAgICAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfY29tcGxleF9jaGVjayc+XHJcbiAgICAgICAgICAgICAgPENsYXNzICdUZXN0X05lc3RlZENsYXNzQSc+XHJcbiAgICAgICAgICAgICAgICA8SW5zdGFuY2UgJygpJz5cclxuICAgICAgICAgICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X25lc3RlZF9jbGFzc19tZXRob2RCJz5cclxuICAgICAgICAgICAgICAgICAgPENsYXNzICdUZXN0X25lc3RlZF9jbGFzc0JfT2ZfQSc+XHJcbiAgICAgICAgICAgICAgICAgICAgPEluc3RhbmNlICcoKSc+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfZCc+XHJcbiAgICAgICAgICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9uZXN0ZWRfY2xhc3NfbWV0aG9kQyc+XHJcbiAgICAgICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X3NpbXBsZV9jaGVjazInPlxyXG4gICAgICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9jb21wbGV4X2NoZWNrMic+XHJcbiAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfdXNlcm5hbWUnPlxyXG4gICAgICAgICAgPEZ1bmN0aW9uICd0ZXN0X3BhcmFtZXRyaXplZF91c2VybmFtZVtvbmVdJz5cclxuICAgICAgICAgIDxGdW5jdGlvbiAndGVzdF9wYXJhbWV0cml6ZWRfdXNlcm5hbWVbdHdvXSc+XHJcbiAgICAgICAgICA8RnVuY3Rpb24gJ3Rlc3RfcGFyYW1ldHJpemVkX3VzZXJuYW1lW3RocmVlXSc+XHJcbiAgICAgICAgPE1vZHVsZSAnb3RoZXIvdGVzdF91bml0dGVzdF9vbmUucHknPlxyXG4gICAgICAgICAgPFVuaXRUZXN0Q2FzZSAnVGVzdF90ZXN0MSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X0EnPlxyXG4gICAgICAgICAgICA8VGVzdENhc2VGdW5jdGlvbiAndGVzdF9CJz5cclxuICAgICAgICAgICAgPFRlc3RDYXNlRnVuY3Rpb24gJ3Rlc3RfYyc+XHJcblxyXG4gICAgICAgID09PT09PT09PT09PT09PT09PT09PT09PT0gbm8gdGVzdHMgcmFuIGluIDAuMDQgc2Vjb25kcyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgeWllbGQgY29tbW9uXzEudXBkYXRlU2V0dGluZygndW5pdFRlc3QucHlUZXN0QXJncycsIFtdLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCBjb25maWdUYXJnZXQpO1xyXG4gICAgICAgIGNvbnN0IGZhY3RvcnkgPSBpb2Muc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JVGVzdE1hbmFnZXJGYWN0b3J5KTtcclxuICAgICAgICBjb25zdCB0ZXN0TWFuYWdlciA9IGZhY3RvcnkoJ3B5dGVzdCcsIGNvbW1vbl8xLnJvb3RXb3Jrc3BhY2VVcmksIFVOSVRURVNUX1RFU1RfRklMRVNfUEFUSF9XSVRIX0NPTkZJR1MpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RzID0geWllbGQgdGVzdE1hbmFnZXIuZGlzY292ZXJUZXN0cyhjb25zdGFudHNfMi5Db21tYW5kU291cmNlLnVpLCB0cnVlLCB0cnVlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZpbGVzLmxlbmd0aCwgMiwgJ0luY29ycmVjdCBudW1iZXIgb2YgdGVzdCBmaWxlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RnVuY3Rpb25zLmxlbmd0aCwgMTQsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3QgZnVuY3Rpb25zJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RzLnRlc3RTdWl0ZXMubGVuZ3RoLCA0LCAnSW5jb3JyZWN0IG51bWJlciBvZiB0ZXN0IHN1aXRlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RmlsZXMuc29tZSh0ID0+IHQubmFtZSA9PT0gJ290aGVyL3Rlc3RfdW5pdHRlc3Rfb25lLnB5JyAmJiB0Lm5hbWVUb1J1biA9PT0gdC5uYW1lKSwgdHJ1ZSwgJ1Rlc3QgRmlsZSBub3QgZm91bmQnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZpbGVzLnNvbWUodCA9PiB0Lm5hbWUgPT09ICdvdGhlci90ZXN0X3B5dGVzdC5weScgJiYgdC5uYW1lVG9SdW4gPT09IHQubmFtZSksIHRydWUsICdUZXN0IEZpbGUgbm90IGZvdW5kJyk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdTZXR0aW5nIGN3ZCBzaG91bGQgcmV0dXJuIHRlc3RzJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1tdWx0aWxpbmUtc3RyaW5nXHJcbiAgICAgICAgeWllbGQgaW5qZWN0VGVzdERpc2NvdmVyeU91dHB1dChgXHJcbiAgICAgICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gdGVzdCBzZXNzaW9uIHN0YXJ0cyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICBwbGF0Zm9ybSBkYXJ3aW4gLS0gUHl0aG9uIDMuNi4yLCBweXRlc3QtMy4zLjAsIHB5LTEuNS4yLCBwbHVnZ3ktMC42LjBcclxuICAgICAgICByb290ZGlyOiAvVXNlcnMvZG9uamF5YW1hbm5lLy52c2NvZGUvZXh0ZW5zaW9ucy9weXRob25WU0NvZGUvc3JjL3Rlc3QvcHl0aG9uRmlsZXMvdGVzdEZpbGVzL2N3ZC9zcmMsIGluaWZpbGU6XHJcbiAgICAgICAgcGx1Z2luczogcHlsYW1hLTcuNC4zXHJcbiAgICAgICAgY29sbGVjdGVkIDEgaXRlbVxyXG4gICAgICAgIDxNb2R1bGUgJ3Rlc3RzL3Rlc3RfY3dkLnB5Jz5cclxuICAgICAgICAgIDxVbml0VGVzdENhc2UgJ1Rlc3RfQ3VycmVudF9Xb3JraW5nX0RpcmVjdG9yeSc+XHJcbiAgICAgICAgICAgIDxUZXN0Q2FzZUZ1bmN0aW9uICd0ZXN0X2N3ZCc+XHJcblxyXG4gICAgICAgID09PT09PT09PT09PT09PT09PT09PT09PT0gbm8gdGVzdHMgcmFuIGluIDAuMDIgc2Vjb25kcyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgYCk7XHJcbiAgICAgICAgeWllbGQgY29tbW9uXzEudXBkYXRlU2V0dGluZygndW5pdFRlc3QucHlUZXN0QXJncycsIFsnLWs9dGVzdF8nXSwgY29tbW9uXzEucm9vdFdvcmtzcGFjZVVyaSwgY29uZmlnVGFyZ2V0KTtcclxuICAgICAgICBjb25zdCBmYWN0b3J5ID0gaW9jLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSVRlc3RNYW5hZ2VyRmFjdG9yeSk7XHJcbiAgICAgICAgY29uc3QgdGVzdE1hbmFnZXIgPSBmYWN0b3J5KCdweXRlc3QnLCBjb21tb25fMS5yb290V29ya3NwYWNlVXJpLCB1bml0VGVzdFRlc3RGaWxlc0N3ZFBhdGgpO1xyXG4gICAgICAgIGNvbnN0IHRlc3RzID0geWllbGQgdGVzdE1hbmFnZXIuZGlzY292ZXJUZXN0cyhjb25zdGFudHNfMi5Db21tYW5kU291cmNlLnVpLCB0cnVlLCB0cnVlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdEZpbGVzLmxlbmd0aCwgMSwgJ0luY29ycmVjdCBudW1iZXIgb2YgdGVzdCBmaWxlcycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0Rm9sZGVycy5sZW5ndGgsIDEsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3QgZm9sZGVycycpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0cy50ZXN0RnVuY3Rpb25zLmxlbmd0aCwgMSwgJ0luY29ycmVjdCBudW1iZXIgb2YgdGVzdCBmdW5jdGlvbnMnKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdHMudGVzdFN1aXRlcy5sZW5ndGgsIDEsICdJbmNvcnJlY3QgbnVtYmVyIG9mIHRlc3Qgc3VpdGVzJyk7XHJcbiAgICB9KSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1weXRlc3QuZGlzY292ZXJ5LnRlc3QuanMubWFwIl19