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
}); // tslint:disable:max-func-body-length no-any no-require-imports no-var-requires

const chai_1 = require("chai");

const TypeMoq = require("typemoq");

const vscode_1 = require("vscode");

const types_1 = require("../../client/common/platform/types");

const string_1 = require("../../client/common/utils/string");

const text_1 = require("../../client/common/utils/text");

const jediProxyFactory_1 = require("../../client/languageServices/jediProxyFactory");

const symbolProvider_1 = require("../../client/providers/symbolProvider");

const assertArrays = require('chai-arrays');

chai_1.use(assertArrays);
suite('Jedi Symbol Provider', () => {
  let serviceContainer;
  let jediHandler;
  let jediFactory;
  let fileSystem;
  let provider;
  let uri;
  let doc;
  setup(() => {
    serviceContainer = TypeMoq.Mock.ofType();
    jediFactory = TypeMoq.Mock.ofType(jediProxyFactory_1.JediFactory);
    jediHandler = TypeMoq.Mock.ofType();
    fileSystem = TypeMoq.Mock.ofType();
    doc = TypeMoq.Mock.ofType();
    jediFactory.setup(j => j.getJediProxyHandler(TypeMoq.It.isAny())).returns(() => jediHandler.object);
    serviceContainer.setup(c => c.get(types_1.IFileSystem)).returns(() => fileSystem.object);
  });

  function testDocumentation(requestId, fileName, expectedSize, token, isUntitled = false) {
    return __awaiter(this, void 0, void 0, function* () {
      fileSystem.setup(fs => fs.arePathsSame(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => true);
      token = token ? token : new vscode_1.CancellationTokenSource().token;
      const symbolResult = TypeMoq.Mock.ofType();
      const definitions = [{
        container: '',
        fileName: fileName,
        kind: vscode_1.SymbolKind.Array,
        range: {
          endColumn: 0,
          endLine: 0,
          startColumn: 0,
          startLine: 0
        },
        rawType: '',
        text: '',
        type: vscode_1.CompletionItemKind.Class
      }];
      uri = vscode_1.Uri.file(fileName);
      doc.setup(d => d.uri).returns(() => uri);
      doc.setup(d => d.fileName).returns(() => fileName);
      doc.setup(d => d.isUntitled).returns(() => isUntitled);
      doc.setup(d => d.getText(TypeMoq.It.isAny())).returns(() => '');
      symbolResult.setup(c => c.requestId).returns(() => requestId);
      symbolResult.setup(c => c.definitions).returns(() => definitions);
      symbolResult.setup(c => c.then).returns(() => undefined);
      jediHandler.setup(j => j.sendCommand(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => Promise.resolve(symbolResult.object));
      const items = yield provider.provideDocumentSymbols(doc.object, token);
      chai_1.expect(items).to.be.array();
      chai_1.expect(items).to.be.ofSize(expectedSize);
    });
  }

  test('Ensure symbols are returned', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield testDocumentation(1, __filename, 1);
  }));
  test('Ensure symbols are returned (for untitled documents)', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield testDocumentation(1, __filename, 1, undefined, true);
  }));
  test('Ensure symbols are returned with a debounce of 100ms', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield testDocumentation(1, __filename, 1);
  }));
  test('Ensure symbols are returned with a debounce of 100ms (for untitled documents)', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield testDocumentation(1, __filename, 1, undefined, true);
  }));
  test('Ensure symbols are not returned when cancelled', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    const tokenSource = new vscode_1.CancellationTokenSource();
    tokenSource.cancel();
    yield testDocumentation(1, __filename, 0, tokenSource.token);
  }));
  test('Ensure symbols are not returned when cancelled (for untitled documents)', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    const tokenSource = new vscode_1.CancellationTokenSource();
    tokenSource.cancel();
    yield testDocumentation(1, __filename, 0, tokenSource.token, true);
  }));
  test('Ensure symbols are returned only for the last request', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 100);
    yield Promise.all([testDocumentation(1, __filename, 0), testDocumentation(2, __filename, 0), testDocumentation(3, __filename, 1)]);
  }));
  test('Ensure symbols are returned for all the requests when the doc is untitled', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 100);
    yield Promise.all([testDocumentation(1, __filename, 1, undefined, true), testDocumentation(2, __filename, 1, undefined, true), testDocumentation(3, __filename, 1, undefined, true)]);
  }));
  test('Ensure symbols are returned for multiple documents', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield Promise.all([testDocumentation(1, 'file1', 1), testDocumentation(2, 'file2', 1)]);
  }));
  test('Ensure symbols are returned for multiple untitled documents ', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield Promise.all([testDocumentation(1, 'file1', 1, undefined, true), testDocumentation(2, 'file2', 1, undefined, true)]);
  }));
  test('Ensure symbols are returned for multiple documents with a debounce of 100ms', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 100);
    yield Promise.all([testDocumentation(1, 'file1', 1), testDocumentation(2, 'file2', 1)]);
  }));
  test('Ensure symbols are returned for multiple untitled documents with a debounce of 100ms', () => __awaiter(void 0, void 0, void 0, function* () {
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 100);
    yield Promise.all([testDocumentation(1, 'file1', 1, undefined, true), testDocumentation(2, 'file2', 1, undefined, true)]);
  }));
  test('Ensure IFileSystem.arePathsSame is used', () => __awaiter(void 0, void 0, void 0, function* () {
    doc.setup(d => d.getText()).returns(() => '').verifiable(TypeMoq.Times.once());
    doc.setup(d => d.isDirty).returns(() => true).verifiable(TypeMoq.Times.once());
    doc.setup(d => d.fileName).returns(() => __filename);
    const symbols = TypeMoq.Mock.ofType();
    symbols.setup(s => s.then).returns(() => undefined);
    const definitions = [];

    for (let counter = 0; counter < 3; counter += 1) {
      const def = TypeMoq.Mock.ofType();
      def.setup(d => d.fileName).returns(() => counter.toString());
      definitions.push(def.object);
      fileSystem.setup(fs => fs.arePathsSame(TypeMoq.It.isValue(counter.toString()), TypeMoq.It.isValue(__filename))).returns(() => false).verifiable(TypeMoq.Times.exactly(1));
    }

    symbols.setup(s => s.definitions).returns(() => definitions).verifiable(TypeMoq.Times.atLeastOnce());
    jediHandler.setup(j => j.sendCommand(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => Promise.resolve(symbols.object)).verifiable(TypeMoq.Times.once());
    provider = new symbolProvider_1.JediSymbolProvider(serviceContainer.object, jediFactory.object, 0);
    yield provider.provideDocumentSymbols(doc.object, new vscode_1.CancellationTokenSource().token);
    doc.verifyAll();
    symbols.verifyAll();
    fileSystem.verifyAll();
    jediHandler.verifyAll();
  }));
});
suite('Language Server Symbol Provider', () => {
  function createLanguageClient(token, results) {
    const langClient = TypeMoq.Mock.ofType(undefined, TypeMoq.MockBehavior.Strict);

    for (const [doc, symbols] of results) {
      langClient.setup(l => l.sendRequest(TypeMoq.It.isValue('textDocument/documentSymbol'), TypeMoq.It.isValue(doc), TypeMoq.It.isValue(token))).returns(() => Promise.resolve(symbols)).verifiable(TypeMoq.Times.once());
    }

    return langClient;
  }

  function getRawDoc(uri) {
    return {
      textDocument: {
        uri: uri.toString()
      }
    };
  }

  test('Ensure symbols are returned - simple', () => __awaiter(void 0, void 0, void 0, function* () {
    const raw = [{
      name: 'spam',
      kind: vscode_1.SymbolKind.Array + 1,
      range: {
        start: {
          line: 0,
          character: 0
        },
        end: {
          line: 0,
          character: 0
        }
      },
      children: []
    }];
    const uri = vscode_1.Uri.file(__filename);
    const expected = createSymbols(uri, [['spam', vscode_1.SymbolKind.Array, 0]]);
    const doc = createDoc(uri);
    const token = new vscode_1.CancellationTokenSource().token;
    const langClient = createLanguageClient(token, [[getRawDoc(uri), raw]]);
    const provider = new symbolProvider_1.LanguageServerSymbolProvider(langClient.object);
    const items = yield provider.provideDocumentSymbols(doc.object, token);
    chai_1.expect(items).to.deep.equal(expected);
    doc.verifyAll();
    langClient.verifyAll();
  }));
  test('Ensure symbols are returned - minimal', () => __awaiter(void 0, void 0, void 0, function* () {
    const uri = vscode_1.Uri.file(__filename); // The test data is loosely based on the "full" test.

    const raw = [{
      name: 'SpamTests',
      kind: 5,
      range: {
        start: {
          line: 2,
          character: 6
        },
        end: {
          line: 2,
          character: 15
        }
      },
      children: [{
        name: 'test_all',
        kind: 12,
        range: {
          start: {
            line: 3,
            character: 8
          },
          end: {
            line: 3,
            character: 16
          }
        },
        children: [{
          name: 'self',
          kind: 13,
          range: {
            start: {
              line: 3,
              character: 17
            },
            end: {
              line: 3,
              character: 21
            }
          },
          children: []
        }]
      }, {
        name: 'assertTrue',
        kind: 13,
        range: {
          start: {
            line: 0,
            character: 0
          },
          end: {
            line: 0,
            character: 0
          }
        },
        children: []
      }]
    }];
    const expected = [new vscode_1.SymbolInformation('SpamTests', vscode_1.SymbolKind.Class, '', new vscode_1.Location(uri, new vscode_1.Range(2, 6, 2, 15))), new vscode_1.SymbolInformation('test_all', vscode_1.SymbolKind.Function, 'SpamTests', new vscode_1.Location(uri, new vscode_1.Range(3, 8, 3, 16))), new vscode_1.SymbolInformation('self', vscode_1.SymbolKind.Variable, 'test_all', new vscode_1.Location(uri, new vscode_1.Range(3, 17, 3, 21))), new vscode_1.SymbolInformation('assertTrue', vscode_1.SymbolKind.Variable, 'SpamTests', new vscode_1.Location(uri, new vscode_1.Range(0, 0, 0, 0)))];
    const doc = createDoc(uri);
    const token = new vscode_1.CancellationTokenSource().token;
    const langClient = createLanguageClient(token, [[getRawDoc(uri), raw]]);
    const provider = new symbolProvider_1.LanguageServerSymbolProvider(langClient.object);
    const items = yield provider.provideDocumentSymbols(doc.object, token);
    chai_1.expect(items).to.deep.equal(expected);
  }));
  test('Ensure symbols are returned - full', () => __awaiter(void 0, void 0, void 0, function* () {
    const uri = vscode_1.Uri.file(__filename); // This is the raw symbol data returned by the language server which
    // gets converted to SymbolInformation[].  It was captured from an
    // actual VS Code session for a file with the following code:
    //
    //   import unittest
    //
    //   class SpamTests(unittest.TestCase):
    //       def test_all(self):
    //           self.assertTrue(False)
    //
    // See: LanguageServerSymbolProvider.provideDocumentSymbols()
    // tslint:disable-next-line:no-suspicious-comment
    // TODO: Change "raw" once the following issues are resolved:
    //  * https://github.com/Microsoft/python-language-server/issues/1
    //  * https://github.com/Microsoft/python-language-server/issues/2

    const raw = JSON.parse('[{"name":"SpamTests","detail":"SpamTests","kind":5,"deprecated":false,"range":{"start":{"line":2,"character":6},"end":{"line":2,"character":15}},"selectionRange":{"start":{"line":2,"character":6},"end":{"line":2,"character":15}},"children":[{"name":"test_all","detail":"test_all","kind":12,"deprecated":false,"range":{"start":{"line":3,"character":4},"end":{"line":4,"character":30}},"selectionRange":{"start":{"line":3,"character":4},"end":{"line":4,"character":30}},"children":[{"name":"self","detail":"self","kind":13,"deprecated":false,"range":{"start":{"line":3,"character":17},"end":{"line":3,"character":21}},"selectionRange":{"start":{"line":3,"character":17},"end":{"line":3,"character":21}},"children":[],"_functionKind":""}],"_functionKind":"function"},{"name":"assertTrue","detail":"assertTrue","kind":13,"deprecated":false,"range":{"start":{"line":0,"character":0},"end":{"line":0,"character":0}},"selectionRange":{"start":{"line":0,"character":0},"end":{"line":0,"character":0}},"children":[],"_functionKind":""}],"_functionKind":"class"}]');
    raw[0].children[0].range.start.character = 8;
    raw[0].children[0].range.end.line = 3;
    raw[0].children[0].range.end.character = 16; // This is the data from Jedi corresponding to same Python code
    // for which the raw data above was generated.
    // See: JediSymbolProvider.provideDocumentSymbols()

    const expectedRaw = JSON.parse('[{"name":"unittest","kind":1,"location":{"uri":{"$mid":1,"path":"<some file>","scheme":"file"},"range":[{"line":0,"character":7},{"line":0,"character":15}]},"containerName":""},{"name":"SpamTests","kind":4,"location":{"uri":{"$mid":1,"path":"<some file>","scheme":"file"},"range":[{"line":2,"character":0},{"line":4,"character":29}]},"containerName":""},{"name":"test_all","kind":11,"location":{"uri":{"$mid":1,"path":"<some file>","scheme":"file"},"range":[{"line":3,"character":4},{"line":4,"character":29}]},"containerName":"SpamTests"},{"name":"self","kind":12,"location":{"uri":{"$mid":1,"path":"<some file>","scheme":"file"},"range":[{"line":3,"character":17},{"line":3,"character":21}]},"containerName":"test_all"}]');
    expectedRaw[1].location.range[0].character = 6;
    expectedRaw[1].location.range[1].line = 2;
    expectedRaw[1].location.range[1].character = 15;
    expectedRaw[2].location.range[0].character = 8;
    expectedRaw[2].location.range[1].line = 3;
    expectedRaw[2].location.range[1].character = 16;
    const expected = normalizeSymbols(uri, expectedRaw);
    expected.shift(); // For now, drop the "unittest" symbol.

    expected.push(new vscode_1.SymbolInformation('assertTrue', vscode_1.SymbolKind.Variable, 'SpamTests', new vscode_1.Location(uri, new vscode_1.Range(0, 0, 0, 0))));
    const doc = createDoc(uri);
    const token = new vscode_1.CancellationTokenSource().token;
    const langClient = createLanguageClient(token, [[getRawDoc(uri), raw]]);
    const provider = new symbolProvider_1.LanguageServerSymbolProvider(langClient.object);
    const items = yield provider.provideDocumentSymbols(doc.object, token);
    chai_1.expect(items).to.deep.equal(expected);
  }));
}); //################################
// helpers

function createDoc(uri, filename, isUntitled, text) {
  const doc = TypeMoq.Mock.ofType(undefined, TypeMoq.MockBehavior.Strict);

  if (uri !== undefined) {
    doc.setup(d => d.uri).returns(() => uri);
  }

  if (filename !== undefined) {
    doc.setup(d => d.fileName).returns(() => filename);
  }

  if (isUntitled !== undefined) {
    doc.setup(d => d.isUntitled).returns(() => isUntitled);
  }

  if (text !== undefined) {
    doc.setup(d => d.getText(TypeMoq.It.isAny())).returns(() => text);
  }

  return doc;
}

function createSymbols(uri, info) {
  const symbols = [];

  for (const [fullName, kind, range] of info) {
    const symbol = createSymbol(uri, fullName, kind, range);
    symbols.push(symbol);
  }

  return symbols;
}

function createSymbol(uri, fullName, kind, rawRange = '') {
  const [containerName, name] = string_1.splitParent(fullName);
  const range = text_1.parseRange(rawRange);
  const loc = new vscode_1.Location(uri, range);
  return new vscode_1.SymbolInformation(name, kind, containerName, loc);
}

function normalizeSymbols(uri, raw) {
  const symbols = [];

  for (const item of raw) {
    const symbol = new vscode_1.SymbolInformation(item.name, // Type coercion is a bit fuzzy when it comes to enums, so we
    // play it safe by explicitly converting.
    vscode_1.SymbolKind[vscode_1.SymbolKind[item.kind]], item.containerName, new vscode_1.Location(uri, new vscode_1.Range(item.location.range[0].line, item.location.range[0].character, item.location.range[1].line, item.location.range[1].character)));
    symbols.push(symbol);
  }

  return symbols;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN5bWJvbFByb3ZpZGVyLnVuaXQudGVzdC5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwiY2hhaV8xIiwicmVxdWlyZSIsIlR5cGVNb3EiLCJ2c2NvZGVfMSIsInR5cGVzXzEiLCJzdHJpbmdfMSIsInRleHRfMSIsImplZGlQcm94eUZhY3RvcnlfMSIsInN5bWJvbFByb3ZpZGVyXzEiLCJhc3NlcnRBcnJheXMiLCJ1c2UiLCJzdWl0ZSIsInNlcnZpY2VDb250YWluZXIiLCJqZWRpSGFuZGxlciIsImplZGlGYWN0b3J5IiwiZmlsZVN5c3RlbSIsInByb3ZpZGVyIiwidXJpIiwiZG9jIiwic2V0dXAiLCJNb2NrIiwib2ZUeXBlIiwiSmVkaUZhY3RvcnkiLCJqIiwiZ2V0SmVkaVByb3h5SGFuZGxlciIsIkl0IiwiaXNBbnkiLCJyZXR1cm5zIiwib2JqZWN0IiwiYyIsImdldCIsIklGaWxlU3lzdGVtIiwidGVzdERvY3VtZW50YXRpb24iLCJyZXF1ZXN0SWQiLCJmaWxlTmFtZSIsImV4cGVjdGVkU2l6ZSIsInRva2VuIiwiaXNVbnRpdGxlZCIsImZzIiwiYXJlUGF0aHNTYW1lIiwiQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UiLCJzeW1ib2xSZXN1bHQiLCJkZWZpbml0aW9ucyIsImNvbnRhaW5lciIsImtpbmQiLCJTeW1ib2xLaW5kIiwiQXJyYXkiLCJyYW5nZSIsImVuZENvbHVtbiIsImVuZExpbmUiLCJzdGFydENvbHVtbiIsInN0YXJ0TGluZSIsInJhd1R5cGUiLCJ0ZXh0IiwidHlwZSIsIkNvbXBsZXRpb25JdGVtS2luZCIsIkNsYXNzIiwiVXJpIiwiZmlsZSIsImQiLCJnZXRUZXh0IiwidW5kZWZpbmVkIiwic2VuZENvbW1hbmQiLCJpdGVtcyIsInByb3ZpZGVEb2N1bWVudFN5bWJvbHMiLCJleHBlY3QiLCJ0byIsImJlIiwiYXJyYXkiLCJvZlNpemUiLCJ0ZXN0IiwiSmVkaVN5bWJvbFByb3ZpZGVyIiwiX19maWxlbmFtZSIsInRva2VuU291cmNlIiwiY2FuY2VsIiwiYWxsIiwidmVyaWZpYWJsZSIsIlRpbWVzIiwib25jZSIsImlzRGlydHkiLCJzeW1ib2xzIiwicyIsImNvdW50ZXIiLCJkZWYiLCJ0b1N0cmluZyIsInB1c2giLCJpc1ZhbHVlIiwiZXhhY3RseSIsImF0TGVhc3RPbmNlIiwidmVyaWZ5QWxsIiwiY3JlYXRlTGFuZ3VhZ2VDbGllbnQiLCJyZXN1bHRzIiwibGFuZ0NsaWVudCIsIk1vY2tCZWhhdmlvciIsIlN0cmljdCIsImwiLCJzZW5kUmVxdWVzdCIsImdldFJhd0RvYyIsInRleHREb2N1bWVudCIsInJhdyIsIm5hbWUiLCJzdGFydCIsImxpbmUiLCJjaGFyYWN0ZXIiLCJlbmQiLCJjaGlsZHJlbiIsImV4cGVjdGVkIiwiY3JlYXRlU3ltYm9scyIsImNyZWF0ZURvYyIsIkxhbmd1YWdlU2VydmVyU3ltYm9sUHJvdmlkZXIiLCJkZWVwIiwiZXF1YWwiLCJTeW1ib2xJbmZvcm1hdGlvbiIsIkxvY2F0aW9uIiwiUmFuZ2UiLCJGdW5jdGlvbiIsIlZhcmlhYmxlIiwiSlNPTiIsInBhcnNlIiwiZXhwZWN0ZWRSYXciLCJsb2NhdGlvbiIsIm5vcm1hbGl6ZVN5bWJvbHMiLCJzaGlmdCIsImZpbGVuYW1lIiwiaW5mbyIsImZ1bGxOYW1lIiwic3ltYm9sIiwiY3JlYXRlU3ltYm9sIiwicmF3UmFuZ2UiLCJjb250YWluZXJOYW1lIiwic3BsaXRQYXJlbnQiLCJwYXJzZVJhbmdlIiwibG9jIiwiaXRlbSJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBLElBQUlBLFNBQVMsR0FBSSxVQUFRLFNBQUtBLFNBQWQs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RixJQUFJLENBQUN6RixJQUF6QixDQUFwQixDQUhlLEVBR3NDeUYsSUFBSSxDQUFDSixhQUgzQyxFQUcwRCxJQUFJOUgsUUFBUSxDQUFDOEcsUUFBYixDQUFzQmhHLEdBQXRCLEVBQTJCLElBQUlkLFFBQVEsQ0FBQytHLEtBQWIsQ0FBbUJtQixJQUFJLENBQUNiLFFBQUwsQ0FBY3pFLEtBQWQsQ0FBb0IsQ0FBcEIsRUFBdUJ1RCxJQUExQyxFQUFnRCtCLElBQUksQ0FBQ2IsUUFBTCxDQUFjekUsS0FBZCxDQUFvQixDQUFwQixFQUF1QndELFNBQXZFLEVBQWtGOEIsSUFBSSxDQUFDYixRQUFMLENBQWN6RSxLQUFkLENBQW9CLENBQXBCLEVBQXVCdUQsSUFBekcsRUFBK0crQixJQUFJLENBQUNiLFFBQUwsQ0FBY3pFLEtBQWQsQ0FBb0IsQ0FBcEIsRUFBdUJ3RCxTQUF0SSxDQUEzQixDQUgxRCxDQUFmO0FBSUF2QixJQUFBQSxPQUFPLENBQUNLLElBQVIsQ0FBYXlDLE1BQWI7QUFDSDs7QUFDRCxTQUFPOUMsT0FBUDtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuJ3VzZSBzdHJpY3QnO1xyXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbi8vIHRzbGludDpkaXNhYmxlOm1heC1mdW5jLWJvZHktbGVuZ3RoIG5vLWFueSBuby1yZXF1aXJlLWltcG9ydHMgbm8tdmFyLXJlcXVpcmVzXHJcbmNvbnN0IGNoYWlfMSA9IHJlcXVpcmUoXCJjaGFpXCIpO1xyXG5jb25zdCBUeXBlTW9xID0gcmVxdWlyZShcInR5cGVtb3FcIik7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvY29tbW9uL3BsYXRmb3JtL3R5cGVzXCIpO1xyXG5jb25zdCBzdHJpbmdfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvY29tbW9uL3V0aWxzL3N0cmluZ1wiKTtcclxuY29uc3QgdGV4dF8xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9jb21tb24vdXRpbHMvdGV4dFwiKTtcclxuY29uc3QgamVkaVByb3h5RmFjdG9yeV8xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9sYW5ndWFnZVNlcnZpY2VzL2plZGlQcm94eUZhY3RvcnlcIik7XHJcbmNvbnN0IHN5bWJvbFByb3ZpZGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L3Byb3ZpZGVycy9zeW1ib2xQcm92aWRlclwiKTtcclxuY29uc3QgYXNzZXJ0QXJyYXlzID0gcmVxdWlyZSgnY2hhaS1hcnJheXMnKTtcclxuY2hhaV8xLnVzZShhc3NlcnRBcnJheXMpO1xyXG5zdWl0ZSgnSmVkaSBTeW1ib2wgUHJvdmlkZXInLCAoKSA9PiB7XHJcbiAgICBsZXQgc2VydmljZUNvbnRhaW5lcjtcclxuICAgIGxldCBqZWRpSGFuZGxlcjtcclxuICAgIGxldCBqZWRpRmFjdG9yeTtcclxuICAgIGxldCBmaWxlU3lzdGVtO1xyXG4gICAgbGV0IHByb3ZpZGVyO1xyXG4gICAgbGV0IHVyaTtcclxuICAgIGxldCBkb2M7XHJcbiAgICBzZXR1cCgoKSA9PiB7XHJcbiAgICAgICAgc2VydmljZUNvbnRhaW5lciA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICBqZWRpRmFjdG9yeSA9IFR5cGVNb3EuTW9jay5vZlR5cGUoamVkaVByb3h5RmFjdG9yeV8xLkplZGlGYWN0b3J5KTtcclxuICAgICAgICBqZWRpSGFuZGxlciA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICBmaWxlU3lzdGVtID0gVHlwZU1vcS5Nb2NrLm9mVHlwZSgpO1xyXG4gICAgICAgIGRvYyA9IFR5cGVNb3EuTW9jay5vZlR5cGUoKTtcclxuICAgICAgICBqZWRpRmFjdG9yeS5zZXR1cChqID0+IGouZ2V0SmVkaVByb3h5SGFuZGxlcihUeXBlTW9xLkl0LmlzQW55KCkpKVxyXG4gICAgICAgICAgICAucmV0dXJucygoKSA9PiBqZWRpSGFuZGxlci5vYmplY3QpO1xyXG4gICAgICAgIHNlcnZpY2VDb250YWluZXIuc2V0dXAoYyA9PiBjLmdldCh0eXBlc18xLklGaWxlU3lzdGVtKSkucmV0dXJucygoKSA9PiBmaWxlU3lzdGVtLm9iamVjdCk7XHJcbiAgICB9KTtcclxuICAgIGZ1bmN0aW9uIHRlc3REb2N1bWVudGF0aW9uKHJlcXVlc3RJZCwgZmlsZU5hbWUsIGV4cGVjdGVkU2l6ZSwgdG9rZW4sIGlzVW50aXRsZWQgPSBmYWxzZSkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGZpbGVTeXN0ZW0uc2V0dXAoZnMgPT4gZnMuYXJlUGF0aHNTYW1lKFR5cGVNb3EuSXQuaXNBbnkoKSwgVHlwZU1vcS5JdC5pc0FueSgpKSlcclxuICAgICAgICAgICAgICAgIC5yZXR1cm5zKCgpID0+IHRydWUpO1xyXG4gICAgICAgICAgICB0b2tlbiA9IHRva2VuID8gdG9rZW4gOiBuZXcgdnNjb2RlXzEuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKS50b2tlbjtcclxuICAgICAgICAgICAgY29uc3Qgc3ltYm9sUmVzdWx0ID0gVHlwZU1vcS5Nb2NrLm9mVHlwZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWZpbml0aW9ucyA9IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6ICcnLCBmaWxlTmFtZTogZmlsZU5hbWUsIGtpbmQ6IHZzY29kZV8xLlN5bWJvbEtpbmQuQXJyYXksXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHsgZW5kQ29sdW1uOiAwLCBlbmRMaW5lOiAwLCBzdGFydENvbHVtbjogMCwgc3RhcnRMaW5lOiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmF3VHlwZTogJycsIHRleHQ6ICcnLCB0eXBlOiB2c2NvZGVfMS5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3NcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgdXJpID0gdnNjb2RlXzEuVXJpLmZpbGUoZmlsZU5hbWUpO1xyXG4gICAgICAgICAgICBkb2Muc2V0dXAoZCA9PiBkLnVyaSkucmV0dXJucygoKSA9PiB1cmkpO1xyXG4gICAgICAgICAgICBkb2Muc2V0dXAoZCA9PiBkLmZpbGVOYW1lKS5yZXR1cm5zKCgpID0+IGZpbGVOYW1lKTtcclxuICAgICAgICAgICAgZG9jLnNldHVwKGQgPT4gZC5pc1VudGl0bGVkKS5yZXR1cm5zKCgpID0+IGlzVW50aXRsZWQpO1xyXG4gICAgICAgICAgICBkb2Muc2V0dXAoZCA9PiBkLmdldFRleHQoVHlwZU1vcS5JdC5pc0FueSgpKSkucmV0dXJucygoKSA9PiAnJyk7XHJcbiAgICAgICAgICAgIHN5bWJvbFJlc3VsdC5zZXR1cChjID0+IGMucmVxdWVzdElkKS5yZXR1cm5zKCgpID0+IHJlcXVlc3RJZCk7XHJcbiAgICAgICAgICAgIHN5bWJvbFJlc3VsdC5zZXR1cChjID0+IGMuZGVmaW5pdGlvbnMpLnJldHVybnMoKCkgPT4gZGVmaW5pdGlvbnMpO1xyXG4gICAgICAgICAgICBzeW1ib2xSZXN1bHQuc2V0dXAoKGMpID0+IGMudGhlbikucmV0dXJucygoKSA9PiB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICBqZWRpSGFuZGxlci5zZXR1cChqID0+IGouc2VuZENvbW1hbmQoVHlwZU1vcS5JdC5pc0FueSgpLCBUeXBlTW9xLkl0LmlzQW55KCkpKVxyXG4gICAgICAgICAgICAgICAgLnJldHVybnMoKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHN5bWJvbFJlc3VsdC5vYmplY3QpKTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB5aWVsZCBwcm92aWRlci5wcm92aWRlRG9jdW1lbnRTeW1ib2xzKGRvYy5vYmplY3QsIHRva2VuKTtcclxuICAgICAgICAgICAgY2hhaV8xLmV4cGVjdChpdGVtcykudG8uYmUuYXJyYXkoKTtcclxuICAgICAgICAgICAgY2hhaV8xLmV4cGVjdChpdGVtcykudG8uYmUub2ZTaXplKGV4cGVjdGVkU2l6ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgcmV0dXJuZWQnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgcHJvdmlkZXIgPSBuZXcgc3ltYm9sUHJvdmlkZXJfMS5KZWRpU3ltYm9sUHJvdmlkZXIoc2VydmljZUNvbnRhaW5lci5vYmplY3QsIGplZGlGYWN0b3J5Lm9iamVjdCwgMCk7XHJcbiAgICAgICAgeWllbGQgdGVzdERvY3VtZW50YXRpb24oMSwgX19maWxlbmFtZSwgMSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgcmV0dXJuZWQgKGZvciB1bnRpdGxlZCBkb2N1bWVudHMpJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuSmVkaVN5bWJvbFByb3ZpZGVyKHNlcnZpY2VDb250YWluZXIub2JqZWN0LCBqZWRpRmFjdG9yeS5vYmplY3QsIDApO1xyXG4gICAgICAgIHlpZWxkIHRlc3REb2N1bWVudGF0aW9uKDEsIF9fZmlsZW5hbWUsIDEsIHVuZGVmaW5lZCwgdHJ1ZSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgcmV0dXJuZWQgd2l0aCBhIGRlYm91bmNlIG9mIDEwMG1zJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuSmVkaVN5bWJvbFByb3ZpZGVyKHNlcnZpY2VDb250YWluZXIub2JqZWN0LCBqZWRpRmFjdG9yeS5vYmplY3QsIDApO1xyXG4gICAgICAgIHlpZWxkIHRlc3REb2N1bWVudGF0aW9uKDEsIF9fZmlsZW5hbWUsIDEpO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRW5zdXJlIHN5bWJvbHMgYXJlIHJldHVybmVkIHdpdGggYSBkZWJvdW5jZSBvZiAxMDBtcyAoZm9yIHVudGl0bGVkIGRvY3VtZW50cyknLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgcHJvdmlkZXIgPSBuZXcgc3ltYm9sUHJvdmlkZXJfMS5KZWRpU3ltYm9sUHJvdmlkZXIoc2VydmljZUNvbnRhaW5lci5vYmplY3QsIGplZGlGYWN0b3J5Lm9iamVjdCwgMCk7XHJcbiAgICAgICAgeWllbGQgdGVzdERvY3VtZW50YXRpb24oMSwgX19maWxlbmFtZSwgMSwgdW5kZWZpbmVkLCB0cnVlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Vuc3VyZSBzeW1ib2xzIGFyZSBub3QgcmV0dXJuZWQgd2hlbiBjYW5jZWxsZWQnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgcHJvdmlkZXIgPSBuZXcgc3ltYm9sUHJvdmlkZXJfMS5KZWRpU3ltYm9sUHJvdmlkZXIoc2VydmljZUNvbnRhaW5lci5vYmplY3QsIGplZGlGYWN0b3J5Lm9iamVjdCwgMCk7XHJcbiAgICAgICAgY29uc3QgdG9rZW5Tb3VyY2UgPSBuZXcgdnNjb2RlXzEuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKTtcclxuICAgICAgICB0b2tlblNvdXJjZS5jYW5jZWwoKTtcclxuICAgICAgICB5aWVsZCB0ZXN0RG9jdW1lbnRhdGlvbigxLCBfX2ZpbGVuYW1lLCAwLCB0b2tlblNvdXJjZS50b2tlbik7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgbm90IHJldHVybmVkIHdoZW4gY2FuY2VsbGVkIChmb3IgdW50aXRsZWQgZG9jdW1lbnRzKScsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBwcm92aWRlciA9IG5ldyBzeW1ib2xQcm92aWRlcl8xLkplZGlTeW1ib2xQcm92aWRlcihzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCwgamVkaUZhY3Rvcnkub2JqZWN0LCAwKTtcclxuICAgICAgICBjb25zdCB0b2tlblNvdXJjZSA9IG5ldyB2c2NvZGVfMS5DYW5jZWxsYXRpb25Ub2tlblNvdXJjZSgpO1xyXG4gICAgICAgIHRva2VuU291cmNlLmNhbmNlbCgpO1xyXG4gICAgICAgIHlpZWxkIHRlc3REb2N1bWVudGF0aW9uKDEsIF9fZmlsZW5hbWUsIDAsIHRva2VuU291cmNlLnRva2VuLCB0cnVlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Vuc3VyZSBzeW1ib2xzIGFyZSByZXR1cm5lZCBvbmx5IGZvciB0aGUgbGFzdCByZXF1ZXN0JywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuSmVkaVN5bWJvbFByb3ZpZGVyKHNlcnZpY2VDb250YWluZXIub2JqZWN0LCBqZWRpRmFjdG9yeS5vYmplY3QsIDEwMCk7XHJcbiAgICAgICAgeWllbGQgUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgICAgICB0ZXN0RG9jdW1lbnRhdGlvbigxLCBfX2ZpbGVuYW1lLCAwKSxcclxuICAgICAgICAgICAgdGVzdERvY3VtZW50YXRpb24oMiwgX19maWxlbmFtZSwgMCksXHJcbiAgICAgICAgICAgIHRlc3REb2N1bWVudGF0aW9uKDMsIF9fZmlsZW5hbWUsIDEpXHJcbiAgICAgICAgXSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgcmV0dXJuZWQgZm9yIGFsbCB0aGUgcmVxdWVzdHMgd2hlbiB0aGUgZG9jIGlzIHVudGl0bGVkJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuSmVkaVN5bWJvbFByb3ZpZGVyKHNlcnZpY2VDb250YWluZXIub2JqZWN0LCBqZWRpRmFjdG9yeS5vYmplY3QsIDEwMCk7XHJcbiAgICAgICAgeWllbGQgUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgICAgICB0ZXN0RG9jdW1lbnRhdGlvbigxLCBfX2ZpbGVuYW1lLCAxLCB1bmRlZmluZWQsIHRydWUpLFxyXG4gICAgICAgICAgICB0ZXN0RG9jdW1lbnRhdGlvbigyLCBfX2ZpbGVuYW1lLCAxLCB1bmRlZmluZWQsIHRydWUpLFxyXG4gICAgICAgICAgICB0ZXN0RG9jdW1lbnRhdGlvbigzLCBfX2ZpbGVuYW1lLCAxLCB1bmRlZmluZWQsIHRydWUpXHJcbiAgICAgICAgXSk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgcmV0dXJuZWQgZm9yIG11bHRpcGxlIGRvY3VtZW50cycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBwcm92aWRlciA9IG5ldyBzeW1ib2xQcm92aWRlcl8xLkplZGlTeW1ib2xQcm92aWRlcihzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCwgamVkaUZhY3Rvcnkub2JqZWN0LCAwKTtcclxuICAgICAgICB5aWVsZCBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgIHRlc3REb2N1bWVudGF0aW9uKDEsICdmaWxlMScsIDEpLFxyXG4gICAgICAgICAgICB0ZXN0RG9jdW1lbnRhdGlvbigyLCAnZmlsZTInLCAxKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRW5zdXJlIHN5bWJvbHMgYXJlIHJldHVybmVkIGZvciBtdWx0aXBsZSB1bnRpdGxlZCBkb2N1bWVudHMgJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuSmVkaVN5bWJvbFByb3ZpZGVyKHNlcnZpY2VDb250YWluZXIub2JqZWN0LCBqZWRpRmFjdG9yeS5vYmplY3QsIDApO1xyXG4gICAgICAgIHlpZWxkIFByb21pc2UuYWxsKFtcclxuICAgICAgICAgICAgdGVzdERvY3VtZW50YXRpb24oMSwgJ2ZpbGUxJywgMSwgdW5kZWZpbmVkLCB0cnVlKSxcclxuICAgICAgICAgICAgdGVzdERvY3VtZW50YXRpb24oMiwgJ2ZpbGUyJywgMSwgdW5kZWZpbmVkLCB0cnVlKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRW5zdXJlIHN5bWJvbHMgYXJlIHJldHVybmVkIGZvciBtdWx0aXBsZSBkb2N1bWVudHMgd2l0aCBhIGRlYm91bmNlIG9mIDEwMG1zJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuSmVkaVN5bWJvbFByb3ZpZGVyKHNlcnZpY2VDb250YWluZXIub2JqZWN0LCBqZWRpRmFjdG9yeS5vYmplY3QsIDEwMCk7XHJcbiAgICAgICAgeWllbGQgUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgICAgICB0ZXN0RG9jdW1lbnRhdGlvbigxLCAnZmlsZTEnLCAxKSxcclxuICAgICAgICAgICAgdGVzdERvY3VtZW50YXRpb24oMiwgJ2ZpbGUyJywgMSlcclxuICAgICAgICBdKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Vuc3VyZSBzeW1ib2xzIGFyZSByZXR1cm5lZCBmb3IgbXVsdGlwbGUgdW50aXRsZWQgZG9jdW1lbnRzIHdpdGggYSBkZWJvdW5jZSBvZiAxMDBtcycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBwcm92aWRlciA9IG5ldyBzeW1ib2xQcm92aWRlcl8xLkplZGlTeW1ib2xQcm92aWRlcihzZXJ2aWNlQ29udGFpbmVyLm9iamVjdCwgamVkaUZhY3Rvcnkub2JqZWN0LCAxMDApO1xyXG4gICAgICAgIHlpZWxkIFByb21pc2UuYWxsKFtcclxuICAgICAgICAgICAgdGVzdERvY3VtZW50YXRpb24oMSwgJ2ZpbGUxJywgMSwgdW5kZWZpbmVkLCB0cnVlKSxcclxuICAgICAgICAgICAgdGVzdERvY3VtZW50YXRpb24oMiwgJ2ZpbGUyJywgMSwgdW5kZWZpbmVkLCB0cnVlKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSkpO1xyXG4gICAgdGVzdCgnRW5zdXJlIElGaWxlU3lzdGVtLmFyZVBhdGhzU2FtZSBpcyB1c2VkJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGRvYy5zZXR1cChkID0+IGQuZ2V0VGV4dCgpKVxyXG4gICAgICAgICAgICAucmV0dXJucygoKSA9PiAnJylcclxuICAgICAgICAgICAgLnZlcmlmaWFibGUoVHlwZU1vcS5UaW1lcy5vbmNlKCkpO1xyXG4gICAgICAgIGRvYy5zZXR1cChkID0+IGQuaXNEaXJ0eSlcclxuICAgICAgICAgICAgLnJldHVybnMoKCkgPT4gdHJ1ZSlcclxuICAgICAgICAgICAgLnZlcmlmaWFibGUoVHlwZU1vcS5UaW1lcy5vbmNlKCkpO1xyXG4gICAgICAgIGRvYy5zZXR1cChkID0+IGQuZmlsZU5hbWUpXHJcbiAgICAgICAgICAgIC5yZXR1cm5zKCgpID0+IF9fZmlsZW5hbWUpO1xyXG4gICAgICAgIGNvbnN0IHN5bWJvbHMgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgc3ltYm9scy5zZXR1cCgocykgPT4gcy50aGVuKS5yZXR1cm5zKCgpID0+IHVuZGVmaW5lZCk7XHJcbiAgICAgICAgY29uc3QgZGVmaW5pdGlvbnMgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBjb3VudGVyID0gMDsgY291bnRlciA8IDM7IGNvdW50ZXIgKz0gMSkge1xyXG4gICAgICAgICAgICBjb25zdCBkZWYgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKCk7XHJcbiAgICAgICAgICAgIGRlZi5zZXR1cChkID0+IGQuZmlsZU5hbWUpLnJldHVybnMoKCkgPT4gY291bnRlci50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgZGVmaW5pdGlvbnMucHVzaChkZWYub2JqZWN0KTtcclxuICAgICAgICAgICAgZmlsZVN5c3RlbS5zZXR1cChmcyA9PiBmcy5hcmVQYXRoc1NhbWUoVHlwZU1vcS5JdC5pc1ZhbHVlKGNvdW50ZXIudG9TdHJpbmcoKSksIFR5cGVNb3EuSXQuaXNWYWx1ZShfX2ZpbGVuYW1lKSkpXHJcbiAgICAgICAgICAgICAgICAucmV0dXJucygoKSA9PiBmYWxzZSlcclxuICAgICAgICAgICAgICAgIC52ZXJpZmlhYmxlKFR5cGVNb3EuVGltZXMuZXhhY3RseSgxKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN5bWJvbHMuc2V0dXAocyA9PiBzLmRlZmluaXRpb25zKVxyXG4gICAgICAgICAgICAucmV0dXJucygoKSA9PiBkZWZpbml0aW9ucylcclxuICAgICAgICAgICAgLnZlcmlmaWFibGUoVHlwZU1vcS5UaW1lcy5hdExlYXN0T25jZSgpKTtcclxuICAgICAgICBqZWRpSGFuZGxlci5zZXR1cChqID0+IGouc2VuZENvbW1hbmQoVHlwZU1vcS5JdC5pc0FueSgpLCBUeXBlTW9xLkl0LmlzQW55KCkpKVxyXG4gICAgICAgICAgICAucmV0dXJucygoKSA9PiBQcm9taXNlLnJlc29sdmUoc3ltYm9scy5vYmplY3QpKVxyXG4gICAgICAgICAgICAudmVyaWZpYWJsZShUeXBlTW9xLlRpbWVzLm9uY2UoKSk7XHJcbiAgICAgICAgcHJvdmlkZXIgPSBuZXcgc3ltYm9sUHJvdmlkZXJfMS5KZWRpU3ltYm9sUHJvdmlkZXIoc2VydmljZUNvbnRhaW5lci5vYmplY3QsIGplZGlGYWN0b3J5Lm9iamVjdCwgMCk7XHJcbiAgICAgICAgeWllbGQgcHJvdmlkZXIucHJvdmlkZURvY3VtZW50U3ltYm9scyhkb2Mub2JqZWN0LCBuZXcgdnNjb2RlXzEuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKS50b2tlbik7XHJcbiAgICAgICAgZG9jLnZlcmlmeUFsbCgpO1xyXG4gICAgICAgIHN5bWJvbHMudmVyaWZ5QWxsKCk7XHJcbiAgICAgICAgZmlsZVN5c3RlbS52ZXJpZnlBbGwoKTtcclxuICAgICAgICBqZWRpSGFuZGxlci52ZXJpZnlBbGwoKTtcclxuICAgIH0pKTtcclxufSk7XHJcbnN1aXRlKCdMYW5ndWFnZSBTZXJ2ZXIgU3ltYm9sIFByb3ZpZGVyJywgKCkgPT4ge1xyXG4gICAgZnVuY3Rpb24gY3JlYXRlTGFuZ3VhZ2VDbGllbnQodG9rZW4sIHJlc3VsdHMpIHtcclxuICAgICAgICBjb25zdCBsYW5nQ2xpZW50ID0gVHlwZU1vcS5Nb2NrLm9mVHlwZSh1bmRlZmluZWQsIFR5cGVNb3EuTW9ja0JlaGF2aW9yLlN0cmljdCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBbZG9jLCBzeW1ib2xzXSBvZiByZXN1bHRzKSB7XHJcbiAgICAgICAgICAgIGxhbmdDbGllbnQuc2V0dXAobCA9PiBsLnNlbmRSZXF1ZXN0KFR5cGVNb3EuSXQuaXNWYWx1ZSgndGV4dERvY3VtZW50L2RvY3VtZW50U3ltYm9sJyksIFR5cGVNb3EuSXQuaXNWYWx1ZShkb2MpLCBUeXBlTW9xLkl0LmlzVmFsdWUodG9rZW4pKSlcclxuICAgICAgICAgICAgICAgIC5yZXR1cm5zKCgpID0+IFByb21pc2UucmVzb2x2ZShzeW1ib2xzKSlcclxuICAgICAgICAgICAgICAgIC52ZXJpZmlhYmxlKFR5cGVNb3EuVGltZXMub25jZSgpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxhbmdDbGllbnQ7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBnZXRSYXdEb2ModXJpKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdGV4dERvY3VtZW50OiB7XHJcbiAgICAgICAgICAgICAgICB1cmk6IHVyaS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgdGVzdCgnRW5zdXJlIHN5bWJvbHMgYXJlIHJldHVybmVkIC0gc2ltcGxlJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IHJhdyA9IFt7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc3BhbScsXHJcbiAgICAgICAgICAgICAgICBraW5kOiB2c2NvZGVfMS5TeW1ib2xLaW5kLkFycmF5ICsgMSxcclxuICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogMCB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXHJcbiAgICAgICAgICAgIH1dO1xyXG4gICAgICAgIGNvbnN0IHVyaSA9IHZzY29kZV8xLlVyaS5maWxlKF9fZmlsZW5hbWUpO1xyXG4gICAgICAgIGNvbnN0IGV4cGVjdGVkID0gY3JlYXRlU3ltYm9scyh1cmksIFtcclxuICAgICAgICAgICAgWydzcGFtJywgdnNjb2RlXzEuU3ltYm9sS2luZC5BcnJheSwgMF1cclxuICAgICAgICBdKTtcclxuICAgICAgICBjb25zdCBkb2MgPSBjcmVhdGVEb2ModXJpKTtcclxuICAgICAgICBjb25zdCB0b2tlbiA9IG5ldyB2c2NvZGVfMS5DYW5jZWxsYXRpb25Ub2tlblNvdXJjZSgpLnRva2VuO1xyXG4gICAgICAgIGNvbnN0IGxhbmdDbGllbnQgPSBjcmVhdGVMYW5ndWFnZUNsaWVudCh0b2tlbiwgW1xyXG4gICAgICAgICAgICBbZ2V0UmF3RG9jKHVyaSksIHJhd11cclxuICAgICAgICBdKTtcclxuICAgICAgICBjb25zdCBwcm92aWRlciA9IG5ldyBzeW1ib2xQcm92aWRlcl8xLkxhbmd1YWdlU2VydmVyU3ltYm9sUHJvdmlkZXIobGFuZ0NsaWVudC5vYmplY3QpO1xyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0geWllbGQgcHJvdmlkZXIucHJvdmlkZURvY3VtZW50U3ltYm9scyhkb2Mub2JqZWN0LCB0b2tlbik7XHJcbiAgICAgICAgY2hhaV8xLmV4cGVjdChpdGVtcykudG8uZGVlcC5lcXVhbChleHBlY3RlZCk7XHJcbiAgICAgICAgZG9jLnZlcmlmeUFsbCgpO1xyXG4gICAgICAgIGxhbmdDbGllbnQudmVyaWZ5QWxsKCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdFbnN1cmUgc3ltYm9scyBhcmUgcmV0dXJuZWQgLSBtaW5pbWFsJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IHVyaSA9IHZzY29kZV8xLlVyaS5maWxlKF9fZmlsZW5hbWUpO1xyXG4gICAgICAgIC8vIFRoZSB0ZXN0IGRhdGEgaXMgbG9vc2VseSBiYXNlZCBvbiB0aGUgXCJmdWxsXCIgdGVzdC5cclxuICAgICAgICBjb25zdCByYXcgPSBbe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ1NwYW1UZXN0cycsXHJcbiAgICAgICAgICAgICAgICBraW5kOiA1LFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAyLCBjaGFyYWN0ZXI6IDYgfSxcclxuICAgICAgICAgICAgICAgICAgICBlbmQ6IHsgbGluZTogMiwgY2hhcmFjdGVyOiAxNSB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICd0ZXN0X2FsbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IDEyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHsgbGluZTogMywgY2hhcmFjdGVyOiA4IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQ6IHsgbGluZTogMywgY2hhcmFjdGVyOiAxNiB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdzZWxmJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAxMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAzLCBjaGFyYWN0ZXI6IDE3IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAzLCBjaGFyYWN0ZXI6IDIxIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdhc3NlcnRUcnVlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogMTMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW11cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1dO1xyXG4gICAgICAgIGNvbnN0IGV4cGVjdGVkID0gW1xyXG4gICAgICAgICAgICBuZXcgdnNjb2RlXzEuU3ltYm9sSW5mb3JtYXRpb24oJ1NwYW1UZXN0cycsIHZzY29kZV8xLlN5bWJvbEtpbmQuQ2xhc3MsICcnLCBuZXcgdnNjb2RlXzEuTG9jYXRpb24odXJpLCBuZXcgdnNjb2RlXzEuUmFuZ2UoMiwgNiwgMiwgMTUpKSksXHJcbiAgICAgICAgICAgIG5ldyB2c2NvZGVfMS5TeW1ib2xJbmZvcm1hdGlvbigndGVzdF9hbGwnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLkZ1bmN0aW9uLCAnU3BhbVRlc3RzJywgbmV3IHZzY29kZV8xLkxvY2F0aW9uKHVyaSwgbmV3IHZzY29kZV8xLlJhbmdlKDMsIDgsIDMsIDE2KSkpLFxyXG4gICAgICAgICAgICBuZXcgdnNjb2RlXzEuU3ltYm9sSW5mb3JtYXRpb24oJ3NlbGYnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlLCAndGVzdF9hbGwnLCBuZXcgdnNjb2RlXzEuTG9jYXRpb24odXJpLCBuZXcgdnNjb2RlXzEuUmFuZ2UoMywgMTcsIDMsIDIxKSkpLFxyXG4gICAgICAgICAgICBuZXcgdnNjb2RlXzEuU3ltYm9sSW5mb3JtYXRpb24oJ2Fzc2VydFRydWUnLCB2c2NvZGVfMS5TeW1ib2xLaW5kLlZhcmlhYmxlLCAnU3BhbVRlc3RzJywgbmV3IHZzY29kZV8xLkxvY2F0aW9uKHVyaSwgbmV3IHZzY29kZV8xLlJhbmdlKDAsIDAsIDAsIDApKSlcclxuICAgICAgICBdO1xyXG4gICAgICAgIGNvbnN0IGRvYyA9IGNyZWF0ZURvYyh1cmkpO1xyXG4gICAgICAgIGNvbnN0IHRva2VuID0gbmV3IHZzY29kZV8xLkNhbmNlbGxhdGlvblRva2VuU291cmNlKCkudG9rZW47XHJcbiAgICAgICAgY29uc3QgbGFuZ0NsaWVudCA9IGNyZWF0ZUxhbmd1YWdlQ2xpZW50KHRva2VuLCBbXHJcbiAgICAgICAgICAgIFtnZXRSYXdEb2ModXJpKSwgcmF3XVxyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IHN5bWJvbFByb3ZpZGVyXzEuTGFuZ3VhZ2VTZXJ2ZXJTeW1ib2xQcm92aWRlcihsYW5nQ2xpZW50Lm9iamVjdCk7XHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSB5aWVsZCBwcm92aWRlci5wcm92aWRlRG9jdW1lbnRTeW1ib2xzKGRvYy5vYmplY3QsIHRva2VuKTtcclxuICAgICAgICBjaGFpXzEuZXhwZWN0KGl0ZW1zKS50by5kZWVwLmVxdWFsKGV4cGVjdGVkKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Vuc3VyZSBzeW1ib2xzIGFyZSByZXR1cm5lZCAtIGZ1bGwnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgdXJpID0gdnNjb2RlXzEuVXJpLmZpbGUoX19maWxlbmFtZSk7XHJcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgcmF3IHN5bWJvbCBkYXRhIHJldHVybmVkIGJ5IHRoZSBsYW5ndWFnZSBzZXJ2ZXIgd2hpY2hcclxuICAgICAgICAvLyBnZXRzIGNvbnZlcnRlZCB0byBTeW1ib2xJbmZvcm1hdGlvbltdLiAgSXQgd2FzIGNhcHR1cmVkIGZyb20gYW5cclxuICAgICAgICAvLyBhY3R1YWwgVlMgQ29kZSBzZXNzaW9uIGZvciBhIGZpbGUgd2l0aCB0aGUgZm9sbG93aW5nIGNvZGU6XHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyAgIGltcG9ydCB1bml0dGVzdFxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gICBjbGFzcyBTcGFtVGVzdHModW5pdHRlc3QuVGVzdENhc2UpOlxyXG4gICAgICAgIC8vICAgICAgIGRlZiB0ZXN0X2FsbChzZWxmKTpcclxuICAgICAgICAvLyAgICAgICAgICAgc2VsZi5hc3NlcnRUcnVlKEZhbHNlKVxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gU2VlOiBMYW5ndWFnZVNlcnZlclN5bWJvbFByb3ZpZGVyLnByb3ZpZGVEb2N1bWVudFN5bWJvbHMoKVxyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdXNwaWNpb3VzLWNvbW1lbnRcclxuICAgICAgICAvLyBUT0RPOiBDaGFuZ2UgXCJyYXdcIiBvbmNlIHRoZSBmb2xsb3dpbmcgaXNzdWVzIGFyZSByZXNvbHZlZDpcclxuICAgICAgICAvLyAgKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L3B5dGhvbi1sYW5ndWFnZS1zZXJ2ZXIvaXNzdWVzLzFcclxuICAgICAgICAvLyAgKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L3B5dGhvbi1sYW5ndWFnZS1zZXJ2ZXIvaXNzdWVzLzJcclxuICAgICAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKCdbe1wibmFtZVwiOlwiU3BhbVRlc3RzXCIsXCJkZXRhaWxcIjpcIlNwYW1UZXN0c1wiLFwia2luZFwiOjUsXCJkZXByZWNhdGVkXCI6ZmFsc2UsXCJyYW5nZVwiOntcInN0YXJ0XCI6e1wibGluZVwiOjIsXCJjaGFyYWN0ZXJcIjo2fSxcImVuZFwiOntcImxpbmVcIjoyLFwiY2hhcmFjdGVyXCI6MTV9fSxcInNlbGVjdGlvblJhbmdlXCI6e1wic3RhcnRcIjp7XCJsaW5lXCI6MixcImNoYXJhY3RlclwiOjZ9LFwiZW5kXCI6e1wibGluZVwiOjIsXCJjaGFyYWN0ZXJcIjoxNX19LFwiY2hpbGRyZW5cIjpbe1wibmFtZVwiOlwidGVzdF9hbGxcIixcImRldGFpbFwiOlwidGVzdF9hbGxcIixcImtpbmRcIjoxMixcImRlcHJlY2F0ZWRcIjpmYWxzZSxcInJhbmdlXCI6e1wic3RhcnRcIjp7XCJsaW5lXCI6MyxcImNoYXJhY3RlclwiOjR9LFwiZW5kXCI6e1wibGluZVwiOjQsXCJjaGFyYWN0ZXJcIjozMH19LFwic2VsZWN0aW9uUmFuZ2VcIjp7XCJzdGFydFwiOntcImxpbmVcIjozLFwiY2hhcmFjdGVyXCI6NH0sXCJlbmRcIjp7XCJsaW5lXCI6NCxcImNoYXJhY3RlclwiOjMwfX0sXCJjaGlsZHJlblwiOlt7XCJuYW1lXCI6XCJzZWxmXCIsXCJkZXRhaWxcIjpcInNlbGZcIixcImtpbmRcIjoxMyxcImRlcHJlY2F0ZWRcIjpmYWxzZSxcInJhbmdlXCI6e1wic3RhcnRcIjp7XCJsaW5lXCI6MyxcImNoYXJhY3RlclwiOjE3fSxcImVuZFwiOntcImxpbmVcIjozLFwiY2hhcmFjdGVyXCI6MjF9fSxcInNlbGVjdGlvblJhbmdlXCI6e1wic3RhcnRcIjp7XCJsaW5lXCI6MyxcImNoYXJhY3RlclwiOjE3fSxcImVuZFwiOntcImxpbmVcIjozLFwiY2hhcmFjdGVyXCI6MjF9fSxcImNoaWxkcmVuXCI6W10sXCJfZnVuY3Rpb25LaW5kXCI6XCJcIn1dLFwiX2Z1bmN0aW9uS2luZFwiOlwiZnVuY3Rpb25cIn0se1wibmFtZVwiOlwiYXNzZXJ0VHJ1ZVwiLFwiZGV0YWlsXCI6XCJhc3NlcnRUcnVlXCIsXCJraW5kXCI6MTMsXCJkZXByZWNhdGVkXCI6ZmFsc2UsXCJyYW5nZVwiOntcInN0YXJ0XCI6e1wibGluZVwiOjAsXCJjaGFyYWN0ZXJcIjowfSxcImVuZFwiOntcImxpbmVcIjowLFwiY2hhcmFjdGVyXCI6MH19LFwic2VsZWN0aW9uUmFuZ2VcIjp7XCJzdGFydFwiOntcImxpbmVcIjowLFwiY2hhcmFjdGVyXCI6MH0sXCJlbmRcIjp7XCJsaW5lXCI6MCxcImNoYXJhY3RlclwiOjB9fSxcImNoaWxkcmVuXCI6W10sXCJfZnVuY3Rpb25LaW5kXCI6XCJcIn1dLFwiX2Z1bmN0aW9uS2luZFwiOlwiY2xhc3NcIn1dJyk7XHJcbiAgICAgICAgcmF3WzBdLmNoaWxkcmVuWzBdLnJhbmdlLnN0YXJ0LmNoYXJhY3RlciA9IDg7XHJcbiAgICAgICAgcmF3WzBdLmNoaWxkcmVuWzBdLnJhbmdlLmVuZC5saW5lID0gMztcclxuICAgICAgICByYXdbMF0uY2hpbGRyZW5bMF0ucmFuZ2UuZW5kLmNoYXJhY3RlciA9IDE2O1xyXG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGRhdGEgZnJvbSBKZWRpIGNvcnJlc3BvbmRpbmcgdG8gc2FtZSBQeXRob24gY29kZVxyXG4gICAgICAgIC8vIGZvciB3aGljaCB0aGUgcmF3IGRhdGEgYWJvdmUgd2FzIGdlbmVyYXRlZC5cclxuICAgICAgICAvLyBTZWU6IEplZGlTeW1ib2xQcm92aWRlci5wcm92aWRlRG9jdW1lbnRTeW1ib2xzKClcclxuICAgICAgICBjb25zdCBleHBlY3RlZFJhdyA9IEpTT04ucGFyc2UoJ1t7XCJuYW1lXCI6XCJ1bml0dGVzdFwiLFwia2luZFwiOjEsXCJsb2NhdGlvblwiOntcInVyaVwiOntcIiRtaWRcIjoxLFwicGF0aFwiOlwiPHNvbWUgZmlsZT5cIixcInNjaGVtZVwiOlwiZmlsZVwifSxcInJhbmdlXCI6W3tcImxpbmVcIjowLFwiY2hhcmFjdGVyXCI6N30se1wibGluZVwiOjAsXCJjaGFyYWN0ZXJcIjoxNX1dfSxcImNvbnRhaW5lck5hbWVcIjpcIlwifSx7XCJuYW1lXCI6XCJTcGFtVGVzdHNcIixcImtpbmRcIjo0LFwibG9jYXRpb25cIjp7XCJ1cmlcIjp7XCIkbWlkXCI6MSxcInBhdGhcIjpcIjxzb21lIGZpbGU+XCIsXCJzY2hlbWVcIjpcImZpbGVcIn0sXCJyYW5nZVwiOlt7XCJsaW5lXCI6MixcImNoYXJhY3RlclwiOjB9LHtcImxpbmVcIjo0LFwiY2hhcmFjdGVyXCI6Mjl9XX0sXCJjb250YWluZXJOYW1lXCI6XCJcIn0se1wibmFtZVwiOlwidGVzdF9hbGxcIixcImtpbmRcIjoxMSxcImxvY2F0aW9uXCI6e1widXJpXCI6e1wiJG1pZFwiOjEsXCJwYXRoXCI6XCI8c29tZSBmaWxlPlwiLFwic2NoZW1lXCI6XCJmaWxlXCJ9LFwicmFuZ2VcIjpbe1wibGluZVwiOjMsXCJjaGFyYWN0ZXJcIjo0fSx7XCJsaW5lXCI6NCxcImNoYXJhY3RlclwiOjI5fV19LFwiY29udGFpbmVyTmFtZVwiOlwiU3BhbVRlc3RzXCJ9LHtcIm5hbWVcIjpcInNlbGZcIixcImtpbmRcIjoxMixcImxvY2F0aW9uXCI6e1widXJpXCI6e1wiJG1pZFwiOjEsXCJwYXRoXCI6XCI8c29tZSBmaWxlPlwiLFwic2NoZW1lXCI6XCJmaWxlXCJ9LFwicmFuZ2VcIjpbe1wibGluZVwiOjMsXCJjaGFyYWN0ZXJcIjoxN30se1wibGluZVwiOjMsXCJjaGFyYWN0ZXJcIjoyMX1dfSxcImNvbnRhaW5lck5hbWVcIjpcInRlc3RfYWxsXCJ9XScpO1xyXG4gICAgICAgIGV4cGVjdGVkUmF3WzFdLmxvY2F0aW9uLnJhbmdlWzBdLmNoYXJhY3RlciA9IDY7XHJcbiAgICAgICAgZXhwZWN0ZWRSYXdbMV0ubG9jYXRpb24ucmFuZ2VbMV0ubGluZSA9IDI7XHJcbiAgICAgICAgZXhwZWN0ZWRSYXdbMV0ubG9jYXRpb24ucmFuZ2VbMV0uY2hhcmFjdGVyID0gMTU7XHJcbiAgICAgICAgZXhwZWN0ZWRSYXdbMl0ubG9jYXRpb24ucmFuZ2VbMF0uY2hhcmFjdGVyID0gODtcclxuICAgICAgICBleHBlY3RlZFJhd1syXS5sb2NhdGlvbi5yYW5nZVsxXS5saW5lID0gMztcclxuICAgICAgICBleHBlY3RlZFJhd1syXS5sb2NhdGlvbi5yYW5nZVsxXS5jaGFyYWN0ZXIgPSAxNjtcclxuICAgICAgICBjb25zdCBleHBlY3RlZCA9IG5vcm1hbGl6ZVN5bWJvbHModXJpLCBleHBlY3RlZFJhdyk7XHJcbiAgICAgICAgZXhwZWN0ZWQuc2hpZnQoKTsgLy8gRm9yIG5vdywgZHJvcCB0aGUgXCJ1bml0dGVzdFwiIHN5bWJvbC5cclxuICAgICAgICBleHBlY3RlZC5wdXNoKG5ldyB2c2NvZGVfMS5TeW1ib2xJbmZvcm1hdGlvbignYXNzZXJ0VHJ1ZScsIHZzY29kZV8xLlN5bWJvbEtpbmQuVmFyaWFibGUsICdTcGFtVGVzdHMnLCBuZXcgdnNjb2RlXzEuTG9jYXRpb24odXJpLCBuZXcgdnNjb2RlXzEuUmFuZ2UoMCwgMCwgMCwgMCkpKSk7XHJcbiAgICAgICAgY29uc3QgZG9jID0gY3JlYXRlRG9jKHVyaSk7XHJcbiAgICAgICAgY29uc3QgdG9rZW4gPSBuZXcgdnNjb2RlXzEuQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKS50b2tlbjtcclxuICAgICAgICBjb25zdCBsYW5nQ2xpZW50ID0gY3JlYXRlTGFuZ3VhZ2VDbGllbnQodG9rZW4sIFtcclxuICAgICAgICAgICAgW2dldFJhd0RvYyh1cmkpLCByYXddXHJcbiAgICAgICAgXSk7XHJcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgc3ltYm9sUHJvdmlkZXJfMS5MYW5ndWFnZVNlcnZlclN5bWJvbFByb3ZpZGVyKGxhbmdDbGllbnQub2JqZWN0KTtcclxuICAgICAgICBjb25zdCBpdGVtcyA9IHlpZWxkIHByb3ZpZGVyLnByb3ZpZGVEb2N1bWVudFN5bWJvbHMoZG9jLm9iamVjdCwgdG9rZW4pO1xyXG4gICAgICAgIGNoYWlfMS5leHBlY3QoaXRlbXMpLnRvLmRlZXAuZXF1YWwoZXhwZWN0ZWQpO1xyXG4gICAgfSkpO1xyXG59KTtcclxuLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4vLyBoZWxwZXJzXHJcbmZ1bmN0aW9uIGNyZWF0ZURvYyh1cmksIGZpbGVuYW1lLCBpc1VudGl0bGVkLCB0ZXh0KSB7XHJcbiAgICBjb25zdCBkb2MgPSBUeXBlTW9xLk1vY2sub2ZUeXBlKHVuZGVmaW5lZCwgVHlwZU1vcS5Nb2NrQmVoYXZpb3IuU3RyaWN0KTtcclxuICAgIGlmICh1cmkgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRvYy5zZXR1cChkID0+IGQudXJpKS5yZXR1cm5zKCgpID0+IHVyaSk7XHJcbiAgICB9XHJcbiAgICBpZiAoZmlsZW5hbWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRvYy5zZXR1cChkID0+IGQuZmlsZU5hbWUpLnJldHVybnMoKCkgPT4gZmlsZW5hbWUpO1xyXG4gICAgfVxyXG4gICAgaWYgKGlzVW50aXRsZWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRvYy5zZXR1cChkID0+IGQuaXNVbnRpdGxlZCkucmV0dXJucygoKSA9PiBpc1VudGl0bGVkKTtcclxuICAgIH1cclxuICAgIGlmICh0ZXh0ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBkb2Muc2V0dXAoZCA9PiBkLmdldFRleHQoVHlwZU1vcS5JdC5pc0FueSgpKSkucmV0dXJucygoKSA9PiB0ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiBkb2M7XHJcbn1cclxuZnVuY3Rpb24gY3JlYXRlU3ltYm9scyh1cmksIGluZm8pIHtcclxuICAgIGNvbnN0IHN5bWJvbHMgPSBbXTtcclxuICAgIGZvciAoY29uc3QgW2Z1bGxOYW1lLCBraW5kLCByYW5nZV0gb2YgaW5mbykge1xyXG4gICAgICAgIGNvbnN0IHN5bWJvbCA9IGNyZWF0ZVN5bWJvbCh1cmksIGZ1bGxOYW1lLCBraW5kLCByYW5nZSk7XHJcbiAgICAgICAgc3ltYm9scy5wdXNoKHN5bWJvbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc3ltYm9scztcclxufVxyXG5mdW5jdGlvbiBjcmVhdGVTeW1ib2wodXJpLCBmdWxsTmFtZSwga2luZCwgcmF3UmFuZ2UgPSAnJykge1xyXG4gICAgY29uc3QgW2NvbnRhaW5lck5hbWUsIG5hbWVdID0gc3RyaW5nXzEuc3BsaXRQYXJlbnQoZnVsbE5hbWUpO1xyXG4gICAgY29uc3QgcmFuZ2UgPSB0ZXh0XzEucGFyc2VSYW5nZShyYXdSYW5nZSk7XHJcbiAgICBjb25zdCBsb2MgPSBuZXcgdnNjb2RlXzEuTG9jYXRpb24odXJpLCByYW5nZSk7XHJcbiAgICByZXR1cm4gbmV3IHZzY29kZV8xLlN5bWJvbEluZm9ybWF0aW9uKG5hbWUsIGtpbmQsIGNvbnRhaW5lck5hbWUsIGxvYyk7XHJcbn1cclxuZnVuY3Rpb24gbm9ybWFsaXplU3ltYm9scyh1cmksIHJhdykge1xyXG4gICAgY29uc3Qgc3ltYm9scyA9IFtdO1xyXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJhdykge1xyXG4gICAgICAgIGNvbnN0IHN5bWJvbCA9IG5ldyB2c2NvZGVfMS5TeW1ib2xJbmZvcm1hdGlvbihpdGVtLm5hbWUsIFxyXG4gICAgICAgIC8vIFR5cGUgY29lcmNpb24gaXMgYSBiaXQgZnV6enkgd2hlbiBpdCBjb21lcyB0byBlbnVtcywgc28gd2VcclxuICAgICAgICAvLyBwbGF5IGl0IHNhZmUgYnkgZXhwbGljaXRseSBjb252ZXJ0aW5nLlxyXG4gICAgICAgIHZzY29kZV8xLlN5bWJvbEtpbmRbdnNjb2RlXzEuU3ltYm9sS2luZFtpdGVtLmtpbmRdXSwgaXRlbS5jb250YWluZXJOYW1lLCBuZXcgdnNjb2RlXzEuTG9jYXRpb24odXJpLCBuZXcgdnNjb2RlXzEuUmFuZ2UoaXRlbS5sb2NhdGlvbi5yYW5nZVswXS5saW5lLCBpdGVtLmxvY2F0aW9uLnJhbmdlWzBdLmNoYXJhY3RlciwgaXRlbS5sb2NhdGlvbi5yYW5nZVsxXS5saW5lLCBpdGVtLmxvY2F0aW9uLnJhbmdlWzFdLmNoYXJhY3RlcikpKTtcclxuICAgICAgICBzeW1ib2xzLnB1c2goc3ltYm9sKTtcclxuICAgIH1cclxuICAgIHJldHVybiBzeW1ib2xzO1xyXG59XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN5bWJvbFByb3ZpZGVyLnVuaXQudGVzdC5qcy5tYXAiXX0=