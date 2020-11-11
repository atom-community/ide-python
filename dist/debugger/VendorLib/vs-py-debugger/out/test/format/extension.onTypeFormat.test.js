"use strict"; // Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.

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

const vscode = require("vscode");

const blockFormatProvider_1 = require("../../client/typeFormatters/blockFormatProvider");

const initialize_1 = require("../initialize");

const srcPythoFilesPath = path.join(__dirname, '..', '..', '..', 'src', 'test', 'pythonFiles', 'typeFormatFiles');
const outPythoFilesPath = path.join(__dirname, 'pythonFiles', 'typeFormatFiles');
const tryBlock2OutFilePath = path.join(outPythoFilesPath, 'tryBlocks2.py');
const tryBlock4OutFilePath = path.join(outPythoFilesPath, 'tryBlocks4.py');
const tryBlockTabOutFilePath = path.join(outPythoFilesPath, 'tryBlocksTab.py');
const elseBlock2OutFilePath = path.join(outPythoFilesPath, 'elseBlocks2.py');
const elseBlock4OutFilePath = path.join(outPythoFilesPath, 'elseBlocks4.py');
const elseBlockTabOutFilePath = path.join(outPythoFilesPath, 'elseBlocksTab.py');
const elseBlockFirstLine2OutFilePath = path.join(outPythoFilesPath, 'elseBlocksFirstLine2.py');
const elseBlockFirstLine4OutFilePath = path.join(outPythoFilesPath, 'elseBlocksFirstLine4.py');
const elseBlockFirstLineTabOutFilePath = path.join(outPythoFilesPath, 'elseBlocksFirstLineTab.py');
const provider = new blockFormatProvider_1.BlockFormatProviders();

function testFormatting(fileToFormat, position, expectedEdits, formatOptions) {
  let textDocument;
  return vscode.workspace.openTextDocument(fileToFormat).then(document => {
    textDocument = document;
    return vscode.window.showTextDocument(textDocument);
  }).then(editor => {
    return provider.provideOnTypeFormattingEdits(textDocument, position, ':', formatOptions, new vscode.CancellationTokenSource().token);
  }).then(edits => {
    assert.equal(edits.length, expectedEdits.length, 'Number of edits not the same');
    edits.forEach((edit, index) => {
      const expectedEdit = expectedEdits[index];
      assert.equal(edit.newText, expectedEdit.newText, `newText for edit is not the same for index = ${index}`);
      const providedRange = `${edit.range.start.line},${edit.range.start.character},${edit.range.end.line},${edit.range.end.character}`;
      const expectedRange = `${expectedEdit.range.start.line},${expectedEdit.range.start.character},${expectedEdit.range.end.line},${expectedEdit.range.end.character}`;
      assert.ok(edit.range.isEqual(expectedEdit.range), `range for edit is not the same for index = ${index}, provided ${providedRange}, expected ${expectedRange}`);
    });
  }, reason => {
    assert.fail(reason, undefined, 'Type Formatting failed', '');
  });
}

suite('Else block with if in first line of file', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['elseBlocksFirstLine2.py', 'elseBlocksFirstLine4.py', 'elseBlocksFirstLineTab.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const testCases = [{
    title: 'else block with 2 spaces',
    line: 3,
    column: 7,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(3, 0, 3, 2))],
    formatOptions: {
      insertSpaces: true,
      tabSize: 2
    },
    filePath: elseBlockFirstLine2OutFilePath
  }, {
    title: 'else block with 4 spaces',
    line: 3,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(3, 0, 3, 4))],
    formatOptions: {
      insertSpaces: true,
      tabSize: 4
    },
    filePath: elseBlockFirstLine4OutFilePath
  }, {
    title: 'else block with Tab',
    line: 3,
    column: 6,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(3, 0, 3, 1)), vscode.TextEdit.insert(new vscode.Position(3, 0), '')],
    formatOptions: {
      insertSpaces: false,
      tabSize: 4
    },
    filePath: elseBlockFirstLineTabOutFilePath
  }];
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(testCase.filePath, pos, testCase.expectedEdits, testCase.formatOptions).then(done, done);
    });
  });
});
suite('Try blocks with indentation of 2 spaces', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['tryBlocks2.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const testCases = [{
    title: 'except off by tab',
    line: 6,
    column: 22,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(6, 0, 6, 2))]
  }, {
    title: 'except off by one should not be formatted',
    line: 15,
    column: 21,
    expectedEdits: []
  }, {
    title: 'except off by tab inside a for loop',
    line: 35,
    column: 13,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(35, 0, 35, 2))]
  }, {
    title: 'except off by one inside a for loop should not be formatted',
    line: 47,
    column: 12,
    expectedEdits: []
  }, {
    title: 'except IOError: off by tab inside a for loop',
    line: 54,
    column: 19,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(54, 0, 54, 2))]
  }, {
    title: 'else: off by tab inside a for loop',
    line: 76,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(76, 0, 76, 2))]
  }, {
    title: 'except ValueError:: off by tab inside a function',
    line: 143,
    column: 22,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(143, 0, 143, 2))]
  }, {
    title: 'except ValueError as err: off by one inside a function should not be formatted',
    line: 157,
    column: 25,
    expectedEdits: []
  }, {
    title: 'else: off by tab inside function',
    line: 172,
    column: 11,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(172, 0, 172, 2))]
  }, {
    title: 'finally: off by tab inside function',
    line: 195,
    column: 12,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(195, 0, 195, 2))]
  }];
  const formatOptions = {
    insertSpaces: true,
    tabSize: 2
  };
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(tryBlock2OutFilePath, pos, testCase.expectedEdits, formatOptions).then(done, done);
    });
  });
});
suite('Try blocks with indentation of 4 spaces', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['tryBlocks4.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const testCases = [{
    title: 'except off by tab',
    line: 6,
    column: 22,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(6, 0, 6, 4))]
  }, {
    title: 'except off by one should not be formatted',
    line: 15,
    column: 21,
    expectedEdits: []
  }, {
    title: 'except off by tab inside a for loop',
    line: 35,
    column: 13,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(35, 0, 35, 4))]
  }, {
    title: 'except off by one inside a for loop should not be formatted',
    line: 47,
    column: 12,
    expectedEdits: []
  }, {
    title: 'except IOError: off by tab inside a for loop',
    line: 54,
    column: 19,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(54, 0, 54, 4))]
  }, {
    title: 'else: off by tab inside a for loop',
    line: 76,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(76, 0, 76, 4))]
  }, {
    title: 'except ValueError:: off by tab inside a function',
    line: 143,
    column: 22,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(143, 0, 143, 4))]
  }, {
    title: 'except ValueError as err: off by one inside a function should not be formatted',
    line: 157,
    column: 25,
    expectedEdits: []
  }, {
    title: 'else: off by tab inside function',
    line: 172,
    column: 11,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(172, 0, 172, 4))]
  }, {
    title: 'finally: off by tab inside function',
    line: 195,
    column: 12,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(195, 0, 195, 4))]
  }];
  const formatOptions = {
    insertSpaces: true,
    tabSize: 4
  };
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(tryBlock4OutFilePath, pos, testCase.expectedEdits, formatOptions).then(done, done);
    });
  });
});
suite('Try blocks with indentation of Tab', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['tryBlocksTab.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const TAB = '	';
  const testCases = [{
    title: 'except off by tab',
    line: 6,
    column: 22,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(6, 0, 6, 2)), vscode.TextEdit.insert(new vscode.Position(6, 0), TAB)]
  }, {
    title: 'except off by tab inside a for loop',
    line: 35,
    column: 13,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(35, 0, 35, 2)), vscode.TextEdit.insert(new vscode.Position(35, 0), TAB)]
  }, {
    title: 'except IOError: off by tab inside a for loop',
    line: 54,
    column: 19,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(54, 0, 54, 2)), vscode.TextEdit.insert(new vscode.Position(54, 0), TAB)]
  }, {
    title: 'else: off by tab inside a for loop',
    line: 76,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(76, 0, 76, 2)), vscode.TextEdit.insert(new vscode.Position(76, 0), TAB)]
  }, {
    title: 'except ValueError:: off by tab inside a function',
    line: 143,
    column: 22,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(143, 0, 143, 2)), vscode.TextEdit.insert(new vscode.Position(143, 0), TAB)]
  }, {
    title: 'else: off by tab inside function',
    line: 172,
    column: 11,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(172, 0, 172, 3)), vscode.TextEdit.insert(new vscode.Position(172, 0), TAB + TAB)]
  }, {
    title: 'finally: off by tab inside function',
    line: 195,
    column: 12,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(195, 0, 195, 2)), vscode.TextEdit.insert(new vscode.Position(195, 0), TAB)]
  }];
  const formatOptions = {
    insertSpaces: false,
    tabSize: 4
  };
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(tryBlockTabOutFilePath, pos, testCase.expectedEdits, formatOptions).then(done, done);
    });
  });
}); // tslint:disable-next-line:max-func-body-length

suite('Else blocks with indentation of 2 spaces', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['elseBlocks2.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const testCases = [{
    title: 'elif off by tab',
    line: 4,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(4, 0, 4, 2))]
  }, {
    title: 'elif off by tab',
    line: 7,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(7, 0, 7, 2))]
  }, {
    title: 'elif off by tab again',
    line: 21,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(21, 0, 21, 2))]
  }, {
    title: 'else off by tab',
    line: 38,
    column: 7,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(38, 0, 38, 2))]
  }, {
    title: 'else: off by tab inside a for loop',
    line: 47,
    column: 13,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(47, 0, 47, 2))]
  }, {
    title: 'else: off by tab inside a try',
    line: 57,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(57, 0, 57, 2))]
  }, {
    title: 'elif off by a tab inside a function',
    line: 66,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(66, 0, 66, 2))]
  }, {
    title: 'elif off by a tab inside a function should not format',
    line: 69,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(69, 0, 69, 2))]
  }, {
    title: 'elif off by a tab inside a function',
    line: 83,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(83, 0, 83, 2))]
  }, {
    title: 'else: off by tab inside if of a for and for in a function',
    line: 109,
    column: 15,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(109, 0, 109, 2))]
  }, {
    title: 'else: off by tab inside try in a function',
    line: 119,
    column: 11,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(119, 0, 119, 2))]
  }, {
    title: 'else: off by tab inside while in a function',
    line: 134,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(134, 0, 134, 2))]
  }, {
    title: 'elif: off by tab inside if but inline with elif',
    line: 345,
    column: 18,
    expectedEdits: []
  }, {
    title: 'elif: off by tab inside if but inline with if',
    line: 359,
    column: 18,
    expectedEdits: []
  }];
  const formatOptions = {
    insertSpaces: true,
    tabSize: 2
  };
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(elseBlock2OutFilePath, pos, testCase.expectedEdits, formatOptions).then(done, done);
    });
  });
}); // tslint:disable-next-line:max-func-body-length

suite('Else blocks with indentation of 4 spaces', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['elseBlocks4.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const testCases = [{
    title: 'elif off by tab',
    line: 4,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(4, 0, 4, 4))]
  }, {
    title: 'elif off by tab',
    line: 7,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(7, 0, 7, 4))]
  }, {
    title: 'elif off by tab again',
    line: 21,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(21, 0, 21, 4))]
  }, {
    title: 'else off by tab',
    line: 38,
    column: 7,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(38, 0, 38, 4))]
  }, {
    title: 'else: off by tab inside a for loop',
    line: 47,
    column: 13,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(47, 0, 47, 4))]
  }, {
    title: 'else: off by tab inside a try',
    line: 57,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(57, 0, 57, 4))]
  }, {
    title: 'elif off by a tab inside a function',
    line: 66,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(66, 0, 66, 4))]
  }, {
    title: 'elif off by a tab inside a function should not format',
    line: 69,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(69, 0, 69, 4))]
  }, {
    title: 'elif off by a tab inside a function',
    line: 83,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(83, 0, 83, 4))]
  }, {
    title: 'else: off by tab inside if of a for and for in a function',
    line: 109,
    column: 15,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(109, 0, 109, 4))]
  }, {
    title: 'else: off by tab inside try in a function',
    line: 119,
    column: 11,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(119, 0, 119, 4))]
  }, {
    title: 'else: off by tab inside while in a function',
    line: 134,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(134, 0, 134, 4))]
  }, {
    title: 'elif: off by tab inside if but inline with elif',
    line: 345,
    column: 18,
    expectedEdits: []
  }];
  const formatOptions = {
    insertSpaces: true,
    tabSize: 2
  };
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(elseBlock4OutFilePath, pos, testCase.expectedEdits, formatOptions).then(done, done);
    });
  });
}); // tslint:disable-next-line:max-func-body-length

suite('Else blocks with indentation of Tab', () => {
  suiteSetup(() => __awaiter(void 0, void 0, void 0, function* () {
    yield initialize_1.initialize();
    fs.ensureDirSync(path.dirname(outPythoFilesPath));
    ['elseBlocksTab.py'].forEach(file => {
      const targetFile = path.join(outPythoFilesPath, file);

      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }

      fs.copySync(path.join(srcPythoFilesPath, file), targetFile);
    });
  }));
  setup(initialize_1.initializeTest);
  suiteTeardown(initialize_1.closeActiveWindows);
  teardown(initialize_1.closeActiveWindows);
  const testCases = [{
    title: 'elif off by tab',
    line: 4,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(4, 0, 4, 1))]
  }, {
    title: 'elif off by tab',
    line: 7,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(7, 0, 7, 1))]
  }, {
    title: 'elif off by tab again',
    line: 21,
    column: 18,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(21, 0, 21, 1))]
  }, {
    title: 'else off by tab',
    line: 38,
    column: 7,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(38, 0, 38, 1))]
  }, {
    title: 'else: off by tab inside a for loop',
    line: 47,
    column: 13,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(47, 0, 47, 1))]
  }, {
    title: 'else: off by tab inside a try',
    line: 57,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(57, 0, 57, 1))]
  }, {
    title: 'elif off by a tab inside a function',
    line: 66,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(66, 0, 66, 1))]
  }, {
    title: 'elif off by a tab inside a function should not format',
    line: 69,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(69, 0, 69, 1))]
  }, {
    title: 'elif off by a tab inside a function',
    line: 83,
    column: 20,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(83, 0, 83, 1))]
  }, {
    title: 'else: off by tab inside if of a for and for in a function',
    line: 109,
    column: 15,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(109, 0, 109, 1))]
  }, {
    title: 'else: off by tab inside try in a function',
    line: 119,
    column: 11,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(119, 0, 119, 1))]
  }, {
    title: 'else: off by tab inside while in a function',
    line: 134,
    column: 9,
    expectedEdits: [vscode.TextEdit.delete(new vscode.Range(134, 0, 134, 1))]
  }, {
    title: 'elif: off by tab inside if but inline with elif',
    line: 345,
    column: 18,
    expectedEdits: []
  }];
  const formatOptions = {
    insertSpaces: true,
    tabSize: 2
  };
  testCases.forEach((testCase, index) => {
    test(`${index + 1}. ${testCase.title}`, done => {
      const pos = new vscode.Position(testCase.line, testCase.column);
      testFormatting(elseBlockTabOutFilePath, pos, testCase.expectedEdits, formatOptions).then(done, done);
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4dGVuc2lvbi5vblR5cGVGb3JtYXQudGVzdC5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwiYXNzZXJ0IiwicmVxdWlyZSIsImZzIiwicGF0aCIsInZzY29kZSIsImJsb2NrRm9ybWF0UHJvdmlkZXJfMSIsImluaXRpYWxpemVfMSIsInNyY1B5dGhvRmlsZXNQYXRoIiwiam9pbiIsIl9fZGlybmFtZSIsIm91dFB5dGhvRmlsZXNQYXRoIiwidHJ5QmxvY2syT3V0RmlsZVBhdGgiLCJ0cnlCbG9jazRPdXRGaWxlUGF0aCIsInRyeUJsb2NrVGFiT3V0RmlsZVBhdGgiLCJlbHNlQmxvY2syT3V0RmlsZVBhdGgiLCJlbHNlQmxvY2s0T3V0RmlsZVBhdGgiLCJlbHNlQmxvY2tUYWJPdXRGaWxlUGF0aCIsImVsc2VCbG9ja0ZpcnN0TGluZTJPdXRGaWxlUGF0aCIsImVsc2VCbG9ja0ZpcnN0TGluZTRPdXRGaWxlUGF0aCIsImVsc2VCbG9ja0ZpcnN0TGluZVRhYk91dEZpbGVQYXRoIiwicHJvdmlkZXIiLCJCbG9ja0Zvcm1hdFByb3ZpZGVycyIsInRlc3RGb3JtYXR0aW5nIiwiZmlsZVRvRm9ybWF0IiwicG9zaXRpb24iLCJleHBlY3RlZEVkaXRzIiwiZm9ybWF0T3B0aW9ucyIsInRleHREb2N1bWVudCIsIndvcmtzcGFjZSIsIm9wZW5UZXh0RG9jdW1lbnQiLCJkb2N1bWVudCIsIndpbmRvdyIsInNob3dUZXh0RG9jdW1lbnQiLCJlZGl0b3IiLCJwcm92aWRlT25UeXBlRm9ybWF0dGluZ0VkaXRzIiwiQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UiLCJ0b2tlbiIsImVkaXRzIiwiZXF1YWwiLCJsZW5ndGgiLCJmb3JFYWNoIiwiZWRpdCIsImluZGV4IiwiZXhwZWN0ZWRFZGl0IiwibmV3VGV4dCIsInByb3ZpZGVkUmFuZ2UiLCJyYW5nZSIsInN0YXJ0IiwibGluZSIsImNoYXJhY3RlciIsImVuZCIsImV4cGVjdGVkUmFuZ2UiLCJvayIsImlzRXF1YWwiLCJyZWFzb24iLCJmYWlsIiwidW5kZWZpbmVkIiwic3VpdGUiLCJzdWl0ZVNldHVwIiwiaW5pdGlhbGl6ZSIsImVuc3VyZURpclN5bmMiLCJkaXJuYW1lIiwiZmlsZSIsInRhcmdldEZpbGUiLCJleGlzdHNTeW5jIiwidW5saW5rU3luYyIsImNvcHlTeW5jIiwic3VpdGVUZWFyZG93biIsImNsb3NlQWN0aXZlV2luZG93cyIsInRlYXJkb3duIiwidGVzdENhc2VzIiwidGl0bGUiLCJjb2x1bW4iLCJUZXh0RWRpdCIsImRlbGV0ZSIsIlJhbmdlIiwiaW5zZXJ0U3BhY2VzIiwidGFiU2l6ZSIsImZpbGVQYXRoIiwiaW5zZXJ0IiwiUG9zaXRpb24iLCJ0ZXN0Q2FzZSIsInRlc3QiLCJwb3MiLCJUQUIiLCJzZXR1cCIsImluaXRpYWxpemVUZXN0Il0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5CLEVBQStCQyxDQUEvQixFQUFrQ0MsU0FBbEMsRUFBNkM7QUFDckYsU0FBTyxLQUFLRCxDQUFDLEtBQUtBLENBQUMsR0FBR0UsT0FBVCxDQUFOLEVBQXlCLFVBQVVDLE9BQVYsRUFBbUJDLE1BQW5CLEVBQTJCO0FBQ3ZELGFBQVNDLFNBQVQsQ0FBbUJDLEtBQW5CLEVBQTBCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQ08sSUFBVixDQUFlRixLQUFmLENBQUQsQ0FBSjtBQUE4QixPQUFwQyxDQUFxQyxPQUFPRyxDQUFQLEVBQVU7QUFBRUws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RUFBOEIsQ0FBOUIsQ0FBdkIsQ0FEVztBQUhuQixHQTlFYyxFQXFGZDtBQUNJSixJQUFBQSxLQUFLLEVBQUUsaURBRFg7QUFFSXZCLElBQUFBLElBQUksRUFBRSxHQUZWO0FBRWV3QixJQUFBQSxNQUFNLEVBQUUsRUFGdkI7QUFHSS9DLElBQUFBLGFBQWEsRUFBRTtBQUhuQixHQXJGYyxDQUFsQjtBQTJGQSxRQUFNQyxhQUFhLEdBQUc7QUFDbEJrRCxJQUFBQSxZQUFZLEVBQUUsSUFESTtBQUNFQyxJQUFBQSxPQUFPLEVBQUU7QUFEWCxHQUF0QjtBQUdBUCxFQUFBQSxTQUFTLENBQUM5QixPQUFWLENBQWtCLENBQUN5QyxRQUFELEVBQVd2QyxLQUFYLEtBQXFCO0FBQ25Dd0MsSUFBQUEsSUFBSSxDQUFFLEdBQUV4QyxLQUFLLEdBQUcsQ0FBRSxLQUFJdUMsUUFBUSxDQUFDVixLQUFNLEVBQWpDLEVBQW9DN0UsSUFBSSxJQUFJO0FBQzVDLFlBQU15RixHQUFHLEdBQUcsSUFBSS9FLE1BQU0sQ0FBQzRFLFFBQVgsQ0FBb0JDLFFBQVEsQ0FBQ2pDLElBQTdCLEVBQW1DaUMsUUFBUSxDQUFDVCxNQUE1QyxDQUFaO0FBQ0FsRCxNQUFBQSxjQUFjLENBQUNOLHVCQUFELEVBQTBCbUUsR0FBMUIsRUFBK0JGLFFBQVEsQ0FBQ3hELGFBQXhDLEVBQXVEQyxhQUF2RCxDQUFkLENBQW9GL0IsSUFBcEYsQ0FBeUZELElBQXpGLEVBQStGQSxJQUEvRjtBQUNILEtBSEcsQ0FBSjtBQUlILEdBTEQ7QUFNSCxDQW5ISSxDQUFMIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vIE5vdGU6IFRoaXMgZXhhbXBsZSB0ZXN0IGlzIGxldmVyYWdpbmcgdGhlIE1vY2hhIHRlc3QgZnJhbWV3b3JrLlxyXG4vLyBQbGVhc2UgcmVmZXIgdG8gdGhlaXIgZG9jdW1lbnRhdGlvbiBvbiBodHRwczovL21vY2hhanMub3JnLyBmb3IgaGVscC5cclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmcy1leHRyYVwiKTtcclxuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5jb25zdCB2c2NvZGUgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xyXG5jb25zdCBibG9ja0Zvcm1hdFByb3ZpZGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L3R5cGVGb3JtYXR0ZXJzL2Jsb2NrRm9ybWF0UHJvdmlkZXJcIik7XHJcbmNvbnN0IGluaXRpYWxpemVfMSA9IHJlcXVpcmUoXCIuLi9pbml0aWFsaXplXCIpO1xyXG5jb25zdCBzcmNQeXRob0ZpbGVzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICcuLicsICdzcmMnLCAndGVzdCcsICdweXRob25GaWxlcycsICd0eXBlRm9ybWF0RmlsZXMnKTtcclxuY29uc3Qgb3V0UHl0aG9GaWxlc1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAncHl0aG9uRmlsZXMnLCAndHlwZUZvcm1hdEZpbGVzJyk7XHJcbmNvbnN0IHRyeUJsb2NrMk91dEZpbGVQYXRoID0gcGF0aC5qb2luKG91dFB5dGhvRmlsZXNQYXRoLCAndHJ5QmxvY2tzMi5weScpO1xyXG5jb25zdCB0cnlCbG9jazRPdXRGaWxlUGF0aCA9IHBhdGguam9pbihvdXRQeXRob0ZpbGVzUGF0aCwgJ3RyeUJsb2NrczQucHknKTtcclxuY29uc3QgdHJ5QmxvY2tUYWJPdXRGaWxlUGF0aCA9IHBhdGguam9pbihvdXRQeXRob0ZpbGVzUGF0aCwgJ3RyeUJsb2Nrc1RhYi5weScpO1xyXG5jb25zdCBlbHNlQmxvY2syT3V0RmlsZVBhdGggPSBwYXRoLmpvaW4ob3V0UHl0aG9GaWxlc1BhdGgsICdlbHNlQmxvY2tzMi5weScpO1xyXG5jb25zdCBlbHNlQmxvY2s0T3V0RmlsZVBhdGggPSBwYXRoLmpvaW4ob3V0UHl0aG9GaWxlc1BhdGgsICdlbHNlQmxvY2tzNC5weScpO1xyXG5jb25zdCBlbHNlQmxvY2tUYWJPdXRGaWxlUGF0aCA9IHBhdGguam9pbihvdXRQeXRob0ZpbGVzUGF0aCwgJ2Vsc2VCbG9ja3NUYWIucHknKTtcclxuY29uc3QgZWxzZUJsb2NrRmlyc3RMaW5lMk91dEZpbGVQYXRoID0gcGF0aC5qb2luKG91dFB5dGhvRmlsZXNQYXRoLCAnZWxzZUJsb2Nrc0ZpcnN0TGluZTIucHknKTtcclxuY29uc3QgZWxzZUJsb2NrRmlyc3RMaW5lNE91dEZpbGVQYXRoID0gcGF0aC5qb2luKG91dFB5dGhvRmlsZXNQYXRoLCAnZWxzZUJsb2Nrc0ZpcnN0TGluZTQucHknKTtcclxuY29uc3QgZWxzZUJsb2NrRmlyc3RMaW5lVGFiT3V0RmlsZVBhdGggPSBwYXRoLmpvaW4ob3V0UHl0aG9GaWxlc1BhdGgsICdlbHNlQmxvY2tzRmlyc3RMaW5lVGFiLnB5Jyk7XHJcbmNvbnN0IHByb3ZpZGVyID0gbmV3IGJsb2NrRm9ybWF0UHJvdmlkZXJfMS5CbG9ja0Zvcm1hdFByb3ZpZGVycygpO1xyXG5mdW5jdGlvbiB0ZXN0Rm9ybWF0dGluZyhmaWxlVG9Gb3JtYXQsIHBvc2l0aW9uLCBleHBlY3RlZEVkaXRzLCBmb3JtYXRPcHRpb25zKSB7XHJcbiAgICBsZXQgdGV4dERvY3VtZW50O1xyXG4gICAgcmV0dXJuIHZzY29kZS53b3Jrc3BhY2Uub3BlblRleHREb2N1bWVudChmaWxlVG9Gb3JtYXQpLnRoZW4oZG9jdW1lbnQgPT4ge1xyXG4gICAgICAgIHRleHREb2N1bWVudCA9IGRvY3VtZW50O1xyXG4gICAgICAgIHJldHVybiB2c2NvZGUud2luZG93LnNob3dUZXh0RG9jdW1lbnQodGV4dERvY3VtZW50KTtcclxuICAgIH0pLnRoZW4oZWRpdG9yID0+IHtcclxuICAgICAgICByZXR1cm4gcHJvdmlkZXIucHJvdmlkZU9uVHlwZUZvcm1hdHRpbmdFZGl0cyh0ZXh0RG9jdW1lbnQsIHBvc2l0aW9uLCAnOicsIGZvcm1hdE9wdGlvbnMsIG5ldyB2c2NvZGUuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKS50b2tlbik7XHJcbiAgICB9KS50aGVuKGVkaXRzID0+IHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoZWRpdHMubGVuZ3RoLCBleHBlY3RlZEVkaXRzLmxlbmd0aCwgJ051bWJlciBvZiBlZGl0cyBub3QgdGhlIHNhbWUnKTtcclxuICAgICAgICBlZGl0cy5mb3JFYWNoKChlZGl0LCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZEVkaXQgPSBleHBlY3RlZEVkaXRzW2luZGV4XTtcclxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGVkaXQubmV3VGV4dCwgZXhwZWN0ZWRFZGl0Lm5ld1RleHQsIGBuZXdUZXh0IGZvciBlZGl0IGlzIG5vdCB0aGUgc2FtZSBmb3IgaW5kZXggPSAke2luZGV4fWApO1xyXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlZFJhbmdlID0gYCR7ZWRpdC5yYW5nZS5zdGFydC5saW5lfSwke2VkaXQucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyfSwke2VkaXQucmFuZ2UuZW5kLmxpbmV9LCR7ZWRpdC5yYW5nZS5lbmQuY2hhcmFjdGVyfWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkUmFuZ2UgPSBgJHtleHBlY3RlZEVkaXQucmFuZ2Uuc3RhcnQubGluZX0sJHtleHBlY3RlZEVkaXQucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyfSwke2V4cGVjdGVkRWRpdC5yYW5nZS5lbmQubGluZX0sJHtleHBlY3RlZEVkaXQucmFuZ2UuZW5kLmNoYXJhY3Rlcn1gO1xyXG4gICAgICAgICAgICBhc3NlcnQub2soZWRpdC5yYW5nZS5pc0VxdWFsKGV4cGVjdGVkRWRpdC5yYW5nZSksIGByYW5nZSBmb3IgZWRpdCBpcyBub3QgdGhlIHNhbWUgZm9yIGluZGV4ID0gJHtpbmRleH0sIHByb3ZpZGVkICR7cHJvdmlkZWRSYW5nZX0sIGV4cGVjdGVkICR7ZXhwZWN0ZWRSYW5nZX1gKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sIHJlYXNvbiA9PiB7XHJcbiAgICAgICAgYXNzZXJ0LmZhaWwocmVhc29uLCB1bmRlZmluZWQsICdUeXBlIEZvcm1hdHRpbmcgZmFpbGVkJywgJycpO1xyXG4gICAgfSk7XHJcbn1cclxuc3VpdGUoJ0Vsc2UgYmxvY2sgd2l0aCBpZiBpbiBmaXJzdCBsaW5lIG9mIGZpbGUnLCAoKSA9PiB7XHJcbiAgICBzdWl0ZVNldHVwKCgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCBpbml0aWFsaXplXzEuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIGZzLmVuc3VyZURpclN5bmMocGF0aC5kaXJuYW1lKG91dFB5dGhvRmlsZXNQYXRoKSk7XHJcbiAgICAgICAgWydlbHNlQmxvY2tzRmlyc3RMaW5lMi5weScsICdlbHNlQmxvY2tzRmlyc3RMaW5lNC5weScsICdlbHNlQmxvY2tzRmlyc3RMaW5lVGFiLnB5J10uZm9yRWFjaChmaWxlID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RmlsZSA9IHBhdGguam9pbihvdXRQeXRob0ZpbGVzUGF0aCwgZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldEZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldEZpbGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZzLmNvcHlTeW5jKHBhdGguam9pbihzcmNQeXRob0ZpbGVzUGF0aCwgZmlsZSksIHRhcmdldEZpbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSkpO1xyXG4gICAgc3VpdGVUZWFyZG93bihpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKTtcclxuICAgIHRlYXJkb3duKGluaXRpYWxpemVfMS5jbG9zZUFjdGl2ZVdpbmRvd3MpO1xyXG4gICAgY29uc3QgdGVzdENhc2VzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlIGJsb2NrIHdpdGggMiBzcGFjZXMnLFxyXG4gICAgICAgICAgICBsaW5lOiAzLCBjb2x1bW46IDcsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgzLCAwLCAzLCAyKSlcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZm9ybWF0T3B0aW9uczogeyBpbnNlcnRTcGFjZXM6IHRydWUsIHRhYlNpemU6IDIgfSxcclxuICAgICAgICAgICAgZmlsZVBhdGg6IGVsc2VCbG9ja0ZpcnN0TGluZTJPdXRGaWxlUGF0aFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2UgYmxvY2sgd2l0aCA0IHNwYWNlcycsXHJcbiAgICAgICAgICAgIGxpbmU6IDMsIGNvbHVtbjogOSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDMsIDAsIDMsIDQpKVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBmb3JtYXRPcHRpb25zOiB7IGluc2VydFNwYWNlczogdHJ1ZSwgdGFiU2l6ZTogNCB9LFxyXG4gICAgICAgICAgICBmaWxlUGF0aDogZWxzZUJsb2NrRmlyc3RMaW5lNE91dEZpbGVQYXRoXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZSBibG9jayB3aXRoIFRhYicsXHJcbiAgICAgICAgICAgIGxpbmU6IDMsIGNvbHVtbjogNixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDMsIDAsIDMsIDEpKSxcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5pbnNlcnQobmV3IHZzY29kZS5Qb3NpdGlvbigzLCAwKSwgJycpXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGZvcm1hdE9wdGlvbnM6IHsgaW5zZXJ0U3BhY2VzOiBmYWxzZSwgdGFiU2l6ZTogNCB9LFxyXG4gICAgICAgICAgICBmaWxlUGF0aDogZWxzZUJsb2NrRmlyc3RMaW5lVGFiT3V0RmlsZVBhdGhcclxuICAgICAgICB9XHJcbiAgICBdO1xyXG4gICAgdGVzdENhc2VzLmZvckVhY2goKHRlc3RDYXNlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIHRlc3QoYCR7aW5kZXggKyAxfS4gJHt0ZXN0Q2FzZS50aXRsZX1gLCBkb25lID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcG9zID0gbmV3IHZzY29kZS5Qb3NpdGlvbih0ZXN0Q2FzZS5saW5lLCB0ZXN0Q2FzZS5jb2x1bW4pO1xyXG4gICAgICAgICAgICB0ZXN0Rm9ybWF0dGluZyh0ZXN0Q2FzZS5maWxlUGF0aCwgcG9zLCB0ZXN0Q2FzZS5leHBlY3RlZEVkaXRzLCB0ZXN0Q2FzZS5mb3JtYXRPcHRpb25zKS50aGVuKGRvbmUsIGRvbmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pO1xyXG5zdWl0ZSgnVHJ5IGJsb2NrcyB3aXRoIGluZGVudGF0aW9uIG9mIDIgc3BhY2VzJywgKCkgPT4ge1xyXG4gICAgc3VpdGVTZXR1cCgoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgaW5pdGlhbGl6ZV8xLmluaXRpYWxpemUoKTtcclxuICAgICAgICBmcy5lbnN1cmVEaXJTeW5jKHBhdGguZGlybmFtZShvdXRQeXRob0ZpbGVzUGF0aCkpO1xyXG4gICAgICAgIFsndHJ5QmxvY2tzMi5weSddLmZvckVhY2goZmlsZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSBwYXRoLmpvaW4ob3V0UHl0aG9GaWxlc1BhdGgsIGZpbGUpO1xyXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXRGaWxlKSkge1xyXG4gICAgICAgICAgICAgICAgZnMudW5saW5rU3luYyh0YXJnZXRGaWxlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmcy5jb3B5U3luYyhwYXRoLmpvaW4oc3JjUHl0aG9GaWxlc1BhdGgsIGZpbGUpLCB0YXJnZXRGaWxlKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pKTtcclxuICAgIHN1aXRlVGVhcmRvd24oaW5pdGlhbGl6ZV8xLmNsb3NlQWN0aXZlV2luZG93cyk7XHJcbiAgICB0ZWFyZG93bihpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKTtcclxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZXhjZXB0IG9mZiBieSB0YWInLFxyXG4gICAgICAgICAgICBsaW5lOiA2LCBjb2x1bW46IDIyLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNiwgMCwgNiwgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdleGNlcHQgb2ZmIGJ5IG9uZSBzaG91bGQgbm90IGJlIGZvcm1hdHRlZCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDE1LCBjb2x1bW46IDIxLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBvZmYgYnkgdGFiIGluc2lkZSBhIGZvciBsb29wJyxcclxuICAgICAgICAgICAgbGluZTogMzUsIGNvbHVtbjogMTMsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgzNSwgMCwgMzUsIDIpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZXhjZXB0IG9mZiBieSBvbmUgaW5zaWRlIGEgZm9yIGxvb3Agc2hvdWxkIG5vdCBiZSBmb3JtYXR0ZWQnLFxyXG4gICAgICAgICAgICBsaW5lOiA0NywgY29sdW1uOiAxMixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdleGNlcHQgSU9FcnJvcjogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmb3IgbG9vcCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDU0LCBjb2x1bW46IDE5LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNTQsIDAsIDU0LCAyKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIGEgZm9yIGxvb3AnLFxyXG4gICAgICAgICAgICBsaW5lOiA3NiwgY29sdW1uOiA5LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNzYsIDAsIDc2LCAyKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBWYWx1ZUVycm9yOjogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDE0MywgY29sdW1uOiAyMixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDE0MywgMCwgMTQzLCAyKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBWYWx1ZUVycm9yIGFzIGVycjogb2ZmIGJ5IG9uZSBpbnNpZGUgYSBmdW5jdGlvbiBzaG91bGQgbm90IGJlIGZvcm1hdHRlZCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDE1NywgY29sdW1uOiAyNSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDE3MiwgY29sdW1uOiAxMSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDE3MiwgMCwgMTcyLCAyKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2ZpbmFsbHk6IG9mZiBieSB0YWIgaW5zaWRlIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogMTk1LCBjb2x1bW46IDEyLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMTk1LCAwLCAxOTUsIDIpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfVxyXG4gICAgXTtcclxuICAgIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7XHJcbiAgICAgICAgaW5zZXJ0U3BhY2VzOiB0cnVlLCB0YWJTaXplOiAyXHJcbiAgICB9O1xyXG4gICAgdGVzdENhc2VzLmZvckVhY2goKHRlc3RDYXNlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIHRlc3QoYCR7aW5kZXggKyAxfS4gJHt0ZXN0Q2FzZS50aXRsZX1gLCBkb25lID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcG9zID0gbmV3IHZzY29kZS5Qb3NpdGlvbih0ZXN0Q2FzZS5saW5lLCB0ZXN0Q2FzZS5jb2x1bW4pO1xyXG4gICAgICAgICAgICB0ZXN0Rm9ybWF0dGluZyh0cnlCbG9jazJPdXRGaWxlUGF0aCwgcG9zLCB0ZXN0Q2FzZS5leHBlY3RlZEVkaXRzLCBmb3JtYXRPcHRpb25zKS50aGVuKGRvbmUsIGRvbmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pO1xyXG5zdWl0ZSgnVHJ5IGJsb2NrcyB3aXRoIGluZGVudGF0aW9uIG9mIDQgc3BhY2VzJywgKCkgPT4ge1xyXG4gICAgc3VpdGVTZXR1cCgoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgaW5pdGlhbGl6ZV8xLmluaXRpYWxpemUoKTtcclxuICAgICAgICBmcy5lbnN1cmVEaXJTeW5jKHBhdGguZGlybmFtZShvdXRQeXRob0ZpbGVzUGF0aCkpO1xyXG4gICAgICAgIFsndHJ5QmxvY2tzNC5weSddLmZvckVhY2goZmlsZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSBwYXRoLmpvaW4ob3V0UHl0aG9GaWxlc1BhdGgsIGZpbGUpO1xyXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXRGaWxlKSkge1xyXG4gICAgICAgICAgICAgICAgZnMudW5saW5rU3luYyh0YXJnZXRGaWxlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmcy5jb3B5U3luYyhwYXRoLmpvaW4oc3JjUHl0aG9GaWxlc1BhdGgsIGZpbGUpLCB0YXJnZXRGaWxlKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pKTtcclxuICAgIHN1aXRlVGVhcmRvd24oaW5pdGlhbGl6ZV8xLmNsb3NlQWN0aXZlV2luZG93cyk7XHJcbiAgICB0ZWFyZG93bihpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKTtcclxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZXhjZXB0IG9mZiBieSB0YWInLFxyXG4gICAgICAgICAgICBsaW5lOiA2LCBjb2x1bW46IDIyLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNiwgMCwgNiwgNCkpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdleGNlcHQgb2ZmIGJ5IG9uZSBzaG91bGQgbm90IGJlIGZvcm1hdHRlZCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDE1LCBjb2x1bW46IDIxLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBvZmYgYnkgdGFiIGluc2lkZSBhIGZvciBsb29wJyxcclxuICAgICAgICAgICAgbGluZTogMzUsIGNvbHVtbjogMTMsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgzNSwgMCwgMzUsIDQpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZXhjZXB0IG9mZiBieSBvbmUgaW5zaWRlIGEgZm9yIGxvb3Agc2hvdWxkIG5vdCBiZSBmb3JtYXR0ZWQnLFxyXG4gICAgICAgICAgICBsaW5lOiA0NywgY29sdW1uOiAxMixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdleGNlcHQgSU9FcnJvcjogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmb3IgbG9vcCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDU0LCBjb2x1bW46IDE5LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNTQsIDAsIDU0LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIGEgZm9yIGxvb3AnLFxyXG4gICAgICAgICAgICBsaW5lOiA3NiwgY29sdW1uOiA5LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNzYsIDAsIDc2LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBWYWx1ZUVycm9yOjogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDE0MywgY29sdW1uOiAyMixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDE0MywgMCwgMTQzLCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBWYWx1ZUVycm9yIGFzIGVycjogb2ZmIGJ5IG9uZSBpbnNpZGUgYSBmdW5jdGlvbiBzaG91bGQgbm90IGJlIGZvcm1hdHRlZCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDE1NywgY29sdW1uOiAyNSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDE3MiwgY29sdW1uOiAxMSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDE3MiwgMCwgMTcyLCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2ZpbmFsbHk6IG9mZiBieSB0YWIgaW5zaWRlIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogMTk1LCBjb2x1bW46IDEyLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMTk1LCAwLCAxOTUsIDQpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfVxyXG4gICAgXTtcclxuICAgIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7XHJcbiAgICAgICAgaW5zZXJ0U3BhY2VzOiB0cnVlLCB0YWJTaXplOiA0XHJcbiAgICB9O1xyXG4gICAgdGVzdENhc2VzLmZvckVhY2goKHRlc3RDYXNlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIHRlc3QoYCR7aW5kZXggKyAxfS4gJHt0ZXN0Q2FzZS50aXRsZX1gLCBkb25lID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcG9zID0gbmV3IHZzY29kZS5Qb3NpdGlvbih0ZXN0Q2FzZS5saW5lLCB0ZXN0Q2FzZS5jb2x1bW4pO1xyXG4gICAgICAgICAgICB0ZXN0Rm9ybWF0dGluZyh0cnlCbG9jazRPdXRGaWxlUGF0aCwgcG9zLCB0ZXN0Q2FzZS5leHBlY3RlZEVkaXRzLCBmb3JtYXRPcHRpb25zKS50aGVuKGRvbmUsIGRvbmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pO1xyXG5zdWl0ZSgnVHJ5IGJsb2NrcyB3aXRoIGluZGVudGF0aW9uIG9mIFRhYicsICgpID0+IHtcclxuICAgIHN1aXRlU2V0dXAoKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIGluaXRpYWxpemVfMS5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgZnMuZW5zdXJlRGlyU3luYyhwYXRoLmRpcm5hbWUob3V0UHl0aG9GaWxlc1BhdGgpKTtcclxuICAgICAgICBbJ3RyeUJsb2Nrc1RhYi5weSddLmZvckVhY2goZmlsZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSBwYXRoLmpvaW4ob3V0UHl0aG9GaWxlc1BhdGgsIGZpbGUpO1xyXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXRGaWxlKSkge1xyXG4gICAgICAgICAgICAgICAgZnMudW5saW5rU3luYyh0YXJnZXRGaWxlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmcy5jb3B5U3luYyhwYXRoLmpvaW4oc3JjUHl0aG9GaWxlc1BhdGgsIGZpbGUpLCB0YXJnZXRGaWxlKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pKTtcclxuICAgIHN1aXRlVGVhcmRvd24oaW5pdGlhbGl6ZV8xLmNsb3NlQWN0aXZlV2luZG93cyk7XHJcbiAgICB0ZWFyZG93bihpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKTtcclxuICAgIGNvbnN0IFRBQiA9ICdcdCc7XHJcbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBvZmYgYnkgdGFiJyxcclxuICAgICAgICAgICAgbGluZTogNiwgY29sdW1uOiAyMixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDYsIDAsIDYsIDIpKSxcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5pbnNlcnQobmV3IHZzY29kZS5Qb3NpdGlvbig2LCAwKSwgVEFCKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZXhjZXB0IG9mZiBieSB0YWIgaW5zaWRlIGEgZm9yIGxvb3AnLFxyXG4gICAgICAgICAgICBsaW5lOiAzNSwgY29sdW1uOiAxMyxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDM1LCAwLCAzNSwgMikpLFxyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0Lmluc2VydChuZXcgdnNjb2RlLlBvc2l0aW9uKDM1LCAwKSwgVEFCKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZXhjZXB0IElPRXJyb3I6IG9mZiBieSB0YWIgaW5zaWRlIGEgZm9yIGxvb3AnLFxyXG4gICAgICAgICAgICBsaW5lOiA1NCwgY29sdW1uOiAxOSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDU0LCAwLCA1NCwgMikpLFxyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0Lmluc2VydChuZXcgdnNjb2RlLlBvc2l0aW9uKDU0LCAwKSwgVEFCKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmb3IgbG9vcCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDc2LCBjb2x1bW46IDksXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg3NiwgMCwgNzYsIDIpKSxcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5pbnNlcnQobmV3IHZzY29kZS5Qb3NpdGlvbig3NiwgMCksIFRBQilcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2V4Y2VwdCBWYWx1ZUVycm9yOjogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDE0MywgY29sdW1uOiAyMixcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDE0MywgMCwgMTQzLCAyKSksXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuaW5zZXJ0KG5ldyB2c2NvZGUuUG9zaXRpb24oMTQzLCAwKSwgVEFCKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICBsaW5lOiAxNzIsIGNvbHVtbjogMTEsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgxNzIsIDAsIDE3MiwgMykpLFxyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0Lmluc2VydChuZXcgdnNjb2RlLlBvc2l0aW9uKDE3MiwgMCksIFRBQiArIFRBQilcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2ZpbmFsbHk6IG9mZiBieSB0YWIgaW5zaWRlIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogMTk1LCBjb2x1bW46IDEyLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMTk1LCAwLCAxOTUsIDIpKSxcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5pbnNlcnQobmV3IHZzY29kZS5Qb3NpdGlvbigxOTUsIDApLCBUQUIpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICBdO1xyXG4gICAgY29uc3QgZm9ybWF0T3B0aW9ucyA9IHtcclxuICAgICAgICBpbnNlcnRTcGFjZXM6IGZhbHNlLCB0YWJTaXplOiA0XHJcbiAgICB9O1xyXG4gICAgdGVzdENhc2VzLmZvckVhY2goKHRlc3RDYXNlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIHRlc3QoYCR7aW5kZXggKyAxfS4gJHt0ZXN0Q2FzZS50aXRsZX1gLCBkb25lID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcG9zID0gbmV3IHZzY29kZS5Qb3NpdGlvbih0ZXN0Q2FzZS5saW5lLCB0ZXN0Q2FzZS5jb2x1bW4pO1xyXG4gICAgICAgICAgICB0ZXN0Rm9ybWF0dGluZyh0cnlCbG9ja1RhYk91dEZpbGVQYXRoLCBwb3MsIHRlc3RDYXNlLmV4cGVjdGVkRWRpdHMsIGZvcm1hdE9wdGlvbnMpLnRoZW4oZG9uZSwgZG9uZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufSk7XHJcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG5zdWl0ZSgnRWxzZSBibG9ja3Mgd2l0aCBpbmRlbnRhdGlvbiBvZiAyIHNwYWNlcycsICgpID0+IHtcclxuICAgIHN1aXRlU2V0dXAoKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHlpZWxkIGluaXRpYWxpemVfMS5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgZnMuZW5zdXJlRGlyU3luYyhwYXRoLmRpcm5hbWUob3V0UHl0aG9GaWxlc1BhdGgpKTtcclxuICAgICAgICBbJ2Vsc2VCbG9ja3MyLnB5J10uZm9yRWFjaChmaWxlID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RmlsZSA9IHBhdGguam9pbihvdXRQeXRob0ZpbGVzUGF0aCwgZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldEZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldEZpbGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZzLmNvcHlTeW5jKHBhdGguam9pbihzcmNQeXRob0ZpbGVzUGF0aCwgZmlsZSksIHRhcmdldEZpbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSkpO1xyXG4gICAgc3VpdGVUZWFyZG93bihpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKTtcclxuICAgIHRlYXJkb3duKGluaXRpYWxpemVfMS5jbG9zZUFjdGl2ZVdpbmRvd3MpO1xyXG4gICAgY29uc3QgdGVzdENhc2VzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmIG9mZiBieSB0YWInLFxyXG4gICAgICAgICAgICBsaW5lOiA0LCBjb2x1bW46IDE4LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNCwgMCwgNCwgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmIG9mZiBieSB0YWInLFxyXG4gICAgICAgICAgICBsaW5lOiA3LCBjb2x1bW46IDE4LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNywgMCwgNywgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmIG9mZiBieSB0YWIgYWdhaW4nLFxyXG4gICAgICAgICAgICBsaW5lOiAyMSwgY29sdW1uOiAxOCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDIxLCAwLCAyMSwgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlIG9mZiBieSB0YWInLFxyXG4gICAgICAgICAgICBsaW5lOiAzOCwgY29sdW1uOiA3LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMzgsIDAsIDM4LCAyKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIGEgZm9yIGxvb3AnLFxyXG4gICAgICAgICAgICBsaW5lOiA0NywgY29sdW1uOiAxMyxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDQ3LCAwLCA0NywgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSBhIHRyeScsXHJcbiAgICAgICAgICAgIGxpbmU6IDU3LCBjb2x1bW46IDksXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg1NywgMCwgNTcsIDIpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZiBvZmYgYnkgYSB0YWIgaW5zaWRlIGEgZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICBsaW5lOiA2NiwgY29sdW1uOiAyMCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDY2LCAwLCA2NiwgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmIG9mZiBieSBhIHRhYiBpbnNpZGUgYSBmdW5jdGlvbiBzaG91bGQgbm90IGZvcm1hdCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDY5LCBjb2x1bW46IDIwLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNjksIDAsIDY5LCAyKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWYgb2ZmIGJ5IGEgdGFiIGluc2lkZSBhIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogODMsIGNvbHVtbjogMjAsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg4MywgMCwgODMsIDIpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgaWYgb2YgYSBmb3IgYW5kIGZvciBpbiBhIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogMTA5LCBjb2x1bW46IDE1LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMTA5LCAwLCAxMDksIDIpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgdHJ5IGluIGEgZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICBsaW5lOiAxMTksIGNvbHVtbjogMTEsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgxMTksIDAsIDExOSwgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSB3aGlsZSBpbiBhIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogMTM0LCBjb2x1bW46IDksXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgxMzQsIDAsIDEzNCwgMikpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmOiBvZmYgYnkgdGFiIGluc2lkZSBpZiBidXQgaW5saW5lIHdpdGggZWxpZicsXHJcbiAgICAgICAgICAgIGxpbmU6IDM0NSwgY29sdW1uOiAxOCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmOiBvZmYgYnkgdGFiIGluc2lkZSBpZiBidXQgaW5saW5lIHdpdGggaWYnLFxyXG4gICAgICAgICAgICBsaW5lOiAzNTksIGNvbHVtbjogMTgsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtdXHJcbiAgICAgICAgfVxyXG4gICAgXTtcclxuICAgIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7XHJcbiAgICAgICAgaW5zZXJ0U3BhY2VzOiB0cnVlLCB0YWJTaXplOiAyXHJcbiAgICB9O1xyXG4gICAgdGVzdENhc2VzLmZvckVhY2goKHRlc3RDYXNlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIHRlc3QoYCR7aW5kZXggKyAxfS4gJHt0ZXN0Q2FzZS50aXRsZX1gLCBkb25lID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcG9zID0gbmV3IHZzY29kZS5Qb3NpdGlvbih0ZXN0Q2FzZS5saW5lLCB0ZXN0Q2FzZS5jb2x1bW4pO1xyXG4gICAgICAgICAgICB0ZXN0Rm9ybWF0dGluZyhlbHNlQmxvY2syT3V0RmlsZVBhdGgsIHBvcywgdGVzdENhc2UuZXhwZWN0ZWRFZGl0cywgZm9ybWF0T3B0aW9ucykudGhlbihkb25lLCBkb25lKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59KTtcclxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1mdW5jLWJvZHktbGVuZ3RoXHJcbnN1aXRlKCdFbHNlIGJsb2NrcyB3aXRoIGluZGVudGF0aW9uIG9mIDQgc3BhY2VzJywgKCkgPT4ge1xyXG4gICAgc3VpdGVTZXR1cCgoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgeWllbGQgaW5pdGlhbGl6ZV8xLmluaXRpYWxpemUoKTtcclxuICAgICAgICBmcy5lbnN1cmVEaXJTeW5jKHBhdGguZGlybmFtZShvdXRQeXRob0ZpbGVzUGF0aCkpO1xyXG4gICAgICAgIFsnZWxzZUJsb2NrczQucHknXS5mb3JFYWNoKGZpbGUgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXRGaWxlID0gcGF0aC5qb2luKG91dFB5dGhvRmlsZXNQYXRoLCBmaWxlKTtcclxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0RmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIGZzLnVubGlua1N5bmModGFyZ2V0RmlsZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnMuY29weVN5bmMocGF0aC5qb2luKHNyY1B5dGhvRmlsZXNQYXRoLCBmaWxlKSwgdGFyZ2V0RmlsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KSk7XHJcbiAgICBzdWl0ZVRlYXJkb3duKGluaXRpYWxpemVfMS5jbG9zZUFjdGl2ZVdpbmRvd3MpO1xyXG4gICAgdGVhcmRvd24oaW5pdGlhbGl6ZV8xLmNsb3NlQWN0aXZlV2luZG93cyk7XHJcbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWYgb2ZmIGJ5IHRhYicsXHJcbiAgICAgICAgICAgIGxpbmU6IDQsIGNvbHVtbjogMTgsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg0LCAwLCA0LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWYgb2ZmIGJ5IHRhYicsXHJcbiAgICAgICAgICAgIGxpbmU6IDcsIGNvbHVtbjogMTgsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg3LCAwLCA3LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWYgb2ZmIGJ5IHRhYiBhZ2FpbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDIxLCBjb2x1bW46IDE4LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMjEsIDAsIDIxLCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2Ugb2ZmIGJ5IHRhYicsXHJcbiAgICAgICAgICAgIGxpbmU6IDM4LCBjb2x1bW46IDcsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgzOCwgMCwgMzgsIDQpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgYSBmb3IgbG9vcCcsXHJcbiAgICAgICAgICAgIGxpbmU6IDQ3LCBjb2x1bW46IDEzLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNDcsIDAsIDQ3LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIGEgdHJ5JyxcclxuICAgICAgICAgICAgbGluZTogNTcsIGNvbHVtbjogOSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDU3LCAwLCA1NywgNCkpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmIG9mZiBieSBhIHRhYiBpbnNpZGUgYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDY2LCBjb2x1bW46IDIwLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNjYsIDAsIDY2LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWYgb2ZmIGJ5IGEgdGFiIGluc2lkZSBhIGZ1bmN0aW9uIHNob3VsZCBub3QgZm9ybWF0JyxcclxuICAgICAgICAgICAgbGluZTogNjksIGNvbHVtbjogMjAsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg2OSwgMCwgNjksIDQpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZiBvZmYgYnkgYSB0YWIgaW5zaWRlIGEgZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICBsaW5lOiA4MywgY29sdW1uOiAyMCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDgzLCAwLCA4MywgNCkpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSBpZiBvZiBhIGZvciBhbmQgZm9yIGluIGEgZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICBsaW5lOiAxMDksIGNvbHVtbjogMTUsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgxMDksIDAsIDEwOSwgNCkpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSB0cnkgaW4gYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDExOSwgY29sdW1uOiAxMSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDExOSwgMCwgMTE5LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIHdoaWxlIGluIGEgZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICBsaW5lOiAxMzQsIGNvbHVtbjogOSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDEzNCwgMCwgMTM0LCA0KSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWY6IG9mZiBieSB0YWIgaW5zaWRlIGlmIGJ1dCBpbmxpbmUgd2l0aCBlbGlmJyxcclxuICAgICAgICAgICAgbGluZTogMzQ1LCBjb2x1bW46IDE4LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXVxyXG4gICAgICAgIH1cclxuICAgIF07XHJcbiAgICBjb25zdCBmb3JtYXRPcHRpb25zID0ge1xyXG4gICAgICAgIGluc2VydFNwYWNlczogdHJ1ZSwgdGFiU2l6ZTogMlxyXG4gICAgfTtcclxuICAgIHRlc3RDYXNlcy5mb3JFYWNoKCh0ZXN0Q2FzZSwgaW5kZXgpID0+IHtcclxuICAgICAgICB0ZXN0KGAke2luZGV4ICsgMX0uICR7dGVzdENhc2UudGl0bGV9YCwgZG9uZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBvcyA9IG5ldyB2c2NvZGUuUG9zaXRpb24odGVzdENhc2UubGluZSwgdGVzdENhc2UuY29sdW1uKTtcclxuICAgICAgICAgICAgdGVzdEZvcm1hdHRpbmcoZWxzZUJsb2NrNE91dEZpbGVQYXRoLCBwb3MsIHRlc3RDYXNlLmV4cGVjdGVkRWRpdHMsIGZvcm1hdE9wdGlvbnMpLnRoZW4oZG9uZSwgZG9uZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufSk7XHJcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtZnVuYy1ib2R5LWxlbmd0aFxyXG5zdWl0ZSgnRWxzZSBibG9ja3Mgd2l0aCBpbmRlbnRhdGlvbiBvZiBUYWInLCAoKSA9PiB7XHJcbiAgICBzdWl0ZVNldHVwKCgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB5aWVsZCBpbml0aWFsaXplXzEuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIGZzLmVuc3VyZURpclN5bmMocGF0aC5kaXJuYW1lKG91dFB5dGhvRmlsZXNQYXRoKSk7XHJcbiAgICAgICAgWydlbHNlQmxvY2tzVGFiLnB5J10uZm9yRWFjaChmaWxlID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RmlsZSA9IHBhdGguam9pbihvdXRQeXRob0ZpbGVzUGF0aCwgZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldEZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldEZpbGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZzLmNvcHlTeW5jKHBhdGguam9pbihzcmNQeXRob0ZpbGVzUGF0aCwgZmlsZSksIHRhcmdldEZpbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSkpO1xyXG4gICAgc2V0dXAoaW5pdGlhbGl6ZV8xLmluaXRpYWxpemVUZXN0KTtcclxuICAgIHN1aXRlVGVhcmRvd24oaW5pdGlhbGl6ZV8xLmNsb3NlQWN0aXZlV2luZG93cyk7XHJcbiAgICB0ZWFyZG93bihpbml0aWFsaXplXzEuY2xvc2VBY3RpdmVXaW5kb3dzKTtcclxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZiBvZmYgYnkgdGFiJyxcclxuICAgICAgICAgICAgbGluZTogNCwgY29sdW1uOiAxOCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDQsIDAsIDQsIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZiBvZmYgYnkgdGFiJyxcclxuICAgICAgICAgICAgbGluZTogNywgY29sdW1uOiAxOCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDcsIDAsIDcsIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZiBvZmYgYnkgdGFiIGFnYWluJyxcclxuICAgICAgICAgICAgbGluZTogMjEsIGNvbHVtbjogMTgsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSgyMSwgMCwgMjEsIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZSBvZmYgYnkgdGFiJyxcclxuICAgICAgICAgICAgbGluZTogMzgsIGNvbHVtbjogNyxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDM4LCAwLCAzOCwgMSkpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbHNlOiBvZmYgYnkgdGFiIGluc2lkZSBhIGZvciBsb29wJyxcclxuICAgICAgICAgICAgbGluZTogNDcsIGNvbHVtbjogMTMsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg0NywgMCwgNDcsIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgYSB0cnknLFxyXG4gICAgICAgICAgICBsaW5lOiA1NywgY29sdW1uOiA5LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoNTcsIDAsIDU3LCAxKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2VsaWYgb2ZmIGJ5IGEgdGFiIGluc2lkZSBhIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogNjYsIGNvbHVtbjogMjAsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtcclxuICAgICAgICAgICAgICAgIHZzY29kZS5UZXh0RWRpdC5kZWxldGUobmV3IHZzY29kZS5SYW5nZSg2NiwgMCwgNjYsIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZiBvZmYgYnkgYSB0YWIgaW5zaWRlIGEgZnVuY3Rpb24gc2hvdWxkIG5vdCBmb3JtYXQnLFxyXG4gICAgICAgICAgICBsaW5lOiA2OSwgY29sdW1uOiAyMCxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDY5LCAwLCA2OSwgMSkpXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdlbGlmIG9mZiBieSBhIHRhYiBpbnNpZGUgYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDgzLCBjb2x1bW46IDIwLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoODMsIDAsIDgzLCAxKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIGlmIG9mIGEgZm9yIGFuZCBmb3IgaW4gYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDEwOSwgY29sdW1uOiAxNSxcclxuICAgICAgICAgICAgZXhwZWN0ZWRFZGl0czogW1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlLlRleHRFZGl0LmRlbGV0ZShuZXcgdnNjb2RlLlJhbmdlKDEwOSwgMCwgMTA5LCAxKSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aXRsZTogJ2Vsc2U6IG9mZiBieSB0YWIgaW5zaWRlIHRyeSBpbiBhIGZ1bmN0aW9uJyxcclxuICAgICAgICAgICAgbGluZTogMTE5LCBjb2x1bW46IDExLFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMTE5LCAwLCAxMTksIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxzZTogb2ZmIGJ5IHRhYiBpbnNpZGUgd2hpbGUgaW4gYSBmdW5jdGlvbicsXHJcbiAgICAgICAgICAgIGxpbmU6IDEzNCwgY29sdW1uOiA5LFxyXG4gICAgICAgICAgICBleHBlY3RlZEVkaXRzOiBbXHJcbiAgICAgICAgICAgICAgICB2c2NvZGUuVGV4dEVkaXQuZGVsZXRlKG5ldyB2c2NvZGUuUmFuZ2UoMTM0LCAwLCAxMzQsIDEpKVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnZWxpZjogb2ZmIGJ5IHRhYiBpbnNpZGUgaWYgYnV0IGlubGluZSB3aXRoIGVsaWYnLFxyXG4gICAgICAgICAgICBsaW5lOiAzNDUsIGNvbHVtbjogMTgsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkRWRpdHM6IFtdXHJcbiAgICAgICAgfVxyXG4gICAgXTtcclxuICAgIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7XHJcbiAgICAgICAgaW5zZXJ0U3BhY2VzOiB0cnVlLCB0YWJTaXplOiAyXHJcbiAgICB9O1xyXG4gICAgdGVzdENhc2VzLmZvckVhY2goKHRlc3RDYXNlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIHRlc3QoYCR7aW5kZXggKyAxfS4gJHt0ZXN0Q2FzZS50aXRsZX1gLCBkb25lID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcG9zID0gbmV3IHZzY29kZS5Qb3NpdGlvbih0ZXN0Q2FzZS5saW5lLCB0ZXN0Q2FzZS5jb2x1bW4pO1xyXG4gICAgICAgICAgICB0ZXN0Rm9ybWF0dGluZyhlbHNlQmxvY2tUYWJPdXRGaWxlUGF0aCwgcG9zLCB0ZXN0Q2FzZS5leHBlY3RlZEVkaXRzLCBmb3JtYXRPcHRpb25zKS50aGVuKGRvbmUsIGRvbmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1leHRlbnNpb24ub25UeXBlRm9ybWF0LnRlc3QuanMubWFwIl19