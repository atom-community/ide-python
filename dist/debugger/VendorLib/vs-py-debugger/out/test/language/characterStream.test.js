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

const characterStream_1 = require("../../client/language/characterStream");

const textIterator_1 = require("../../client/language/textIterator"); // tslint:disable-next-line:max-func-body-length


suite('Language.CharacterStream', () => {
  test('Iteration (string)', () => __awaiter(void 0, void 0, void 0, function* () {
    const content = 'some text';
    const cs = new characterStream_1.CharacterStream(content);
    testIteration(cs, content);
  }));
  test('Iteration (iterator)', () => __awaiter(void 0, void 0, void 0, function* () {
    const content = 'some text';
    const cs = new characterStream_1.CharacterStream(new textIterator_1.TextIterator(content));
    testIteration(cs, content);
  }));
  test('Positioning', () => __awaiter(void 0, void 0, void 0, function* () {
    const content = 'some text';
    const cs = new characterStream_1.CharacterStream(content);
    assert.equal(cs.position, 0);
    cs.advance(1);
    assert.equal(cs.position, 1);
    cs.advance(1);
    assert.equal(cs.position, 2);
    cs.advance(2);
    assert.equal(cs.position, 4);
    cs.advance(-3);
    assert.equal(cs.position, 1);
    cs.advance(-3);
    assert.equal(cs.position, 0);
    cs.advance(100);
    assert.equal(cs.position, content.length);
  }));
  test('Characters', () => __awaiter(void 0, void 0, void 0, function* () {
    const content = 'some \ttext "" \' \' \n text \r\n more text';
    const cs = new characterStream_1.CharacterStream(content);

    for (let i = 0; i < content.length; i += 1) {
      assert.equal(cs.currentChar, content.charCodeAt(i));
      assert.equal(cs.nextChar, i < content.length - 1 ? content.charCodeAt(i + 1) : 0);
      assert.equal(cs.prevChar, i > 0 ? content.charCodeAt(i - 1) : 0);
      assert.equal(cs.lookAhead(2), i < content.length - 2 ? content.charCodeAt(i + 2) : 0);
      assert.equal(cs.lookAhead(-2), i > 1 ? content.charCodeAt(i - 2) : 0);
      const ch = content.charCodeAt(i);
      const isLineBreak = ch === 10
      /* LineFeed */
      || ch === 13
      /* CarriageReturn */
      ;
      assert.equal(cs.isAtWhiteSpace(), ch === 9
      /* Tab */
      || ch === 32
      /* Space */
      || isLineBreak);
      assert.equal(cs.isAtLineBreak(), isLineBreak);
      assert.equal(cs.isAtString(), ch === 39
      /* SingleQuote */
      || ch === 34
      /* DoubleQuote */
      );
      cs.moveNext();
    }
  }));
  test('Skip', () => __awaiter(void 0, void 0, void 0, function* () {
    const content = 'some \ttext "" \' \' \n text \r\n more text';
    const cs = new characterStream_1.CharacterStream(content);
    cs.skipWhitespace();
    assert.equal(cs.position, 0);
    cs.skipToWhitespace();
    assert.equal(cs.position, 4);
    cs.skipToWhitespace();
    assert.equal(cs.position, 4);
    cs.skipWhitespace();
    assert.equal(cs.position, 6);
    cs.skipLineBreak();
    assert.equal(cs.position, 6);
    cs.skipToEol();
    assert.equal(cs.position, 18);
    cs.skipLineBreak();
    assert.equal(cs.position, 19);
  }));
});

function testIteration(cs, content) {
  assert.equal(cs.position, 0);
  assert.equal(cs.length, content.length);
  assert.equal(cs.isEndOfStream(), false);

  for (let i = -2; i < content.length + 2; i += 1) {
    const ch = cs.charCodeAt(i);

    if (i < 0 || i >= content.length) {
      assert.equal(ch, 0);
    } else {
      assert.equal(ch, content.charCodeAt(i));
    }
  }

  for (let i = 0; i < content.length; i += 1) {
    assert.equal(cs.isEndOfStream(), false);
    assert.equal(cs.position, i);
    assert.equal(cs.currentChar, content.charCodeAt(i));
    cs.moveNext();
  }

  assert.equal(cs.isEndOfStream(), true);
  assert.equal(cs.position, content.length);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNoYXJhY3RlclN0cmVhbS50ZXN0LmpzIl0sIm5hbWVzIjpbIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJhc3NlcnQiLCJyZXF1aXJlIiwiY2hhcmFjdGVyU3RyZWFtXzEiLCJ0ZXh0SXRlcmF0b3JfMSIsInN1aXRlIiwidGVzdCIsImNvbnRlbnQiLCJjcyIsIkNoYXJhY3RlclN0cmVhbSIsInRlc3RJdGVyYXRpb24iLCJUZXh0SXRlcmF0b3IiLCJlcXVhbCIsInBvc2l0aW9uIiwiYWR2YW5jZSIsImxlbmd0aCIsImkiLCJjdXJyZW50Q2hhciIsImNoYXJDb2RlQXQiLCJuZXh0Q2hhciIsInByZXZDaGFyIiwibG9va0FoZWFkIiwiY2giLCJpc0xpbmVCcmVhayIsImlzQXRXaGl0ZVNwYWNlIiwiaXNBdExpbmVCcmVhayIsImlzQXRTdHJpbmciLCJtb3ZlTmV4dCIsInNraXBXaGl0ZXNwYWNlIiwic2tpcFRvV2hpdGVzcGFjZSIsInNraXBMaW5lQnJlYWsiLCJza2lwVG9Fb2wiLCJpc0VuZE9mU3RyZWFtIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsU0FBUyxHQUFJLFVBQVEsU0FBS0EsU0FBZCxJQUE0QixVQUFVQyxPQUFWLEVBQW1CQyxVQUFuQixFQUErQkMsQ0FBL0IsRUFBa0NDLFNBQWxDLEVBQTZDO0FBQ3JGLFNBQU8sS0FBS0QsQ0FBQyxLQUFLQSxDQUFDLEdBQUdFLE9BQVQsQ0FBTixFQUF5QixVQUFVQyxPQUFWLEVBQW1CQyxNQUFuQixFQUEyQjtBQUN2RCxhQUFTQyxTQUFULENBQW1CQyxLQUFuQixFQUEwQjtB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QVIsQ0FBbUJGLENBQW5CLENBQWpCO0FBQ0g7QUFDSjs7QUFDRCxPQUFLLElBQUlBLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdULE9BQU8sQ0FBQ1EsTUFBNUIsRUFBb0NDLENBQUMsSUFBSSxDQUF6QyxFQUE0QztBQUN4Q2YsSUFBQUEsTUFBTSxDQUFDVyxLQUFQLENBQWFKLEVBQUUsQ0FBQ3dCLGFBQUgsRUFBYixFQUFpQyxLQUFqQztBQUNBL0IsSUFBQUEsTUFBTSxDQUFDVyxLQUFQLENBQWFKLEVBQUUsQ0FBQ0ssUUFBaEIsRUFBMEJHLENBQTFCO0FBQ0FmLElBQUFBLE1BQU0sQ0FBQ1csS0FBUCxDQUFhSixFQUFFLENBQUNTLFdBQWhCLEVBQTZCVixPQUFPLENBQUNXLFVBQVIsQ0FBbUJGLENBQW5CLENBQTdCO0FBQ0FSLElBQUFBLEVBQUUsQ0FBQ21CLFFBQUg7QUFDSDs7QUFDRDFCLEVBQUFBLE1BQU0sQ0FBQ1csS0FBUCxDQUFhSixFQUFFLENBQUN3QixhQUFILEVBQWIsRUFBaUMsSUFBakM7QUFDQS9CLEVBQUFBLE1BQU0sQ0FBQ1csS0FBUCxDQUFhSixFQUFFLENBQUNLLFFBQWhCLEVBQTBCTixPQUFPLENBQUNRLE1BQWxDO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcclxuY29uc3QgY2hhcmFjdGVyU3RyZWFtXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L2xhbmd1YWdlL2NoYXJhY3RlclN0cmVhbVwiKTtcclxuY29uc3QgdGV4dEl0ZXJhdG9yXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L2xhbmd1YWdlL3RleHRJdGVyYXRvclwiKTtcclxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1mdW5jLWJvZHktbGVuZ3RoXHJcbnN1aXRlKCdMYW5ndWFnZS5DaGFyYWN0ZXJTdHJlYW0nLCAoKSA9PiB7XHJcbiAgICB0ZXN0KCdJdGVyYXRpb24gKHN0cmluZyknLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9ICdzb21lIHRleHQnO1xyXG4gICAgICAgIGNvbnN0IGNzID0gbmV3IGNoYXJhY3RlclN0cmVhbV8xLkNoYXJhY3RlclN0cmVhbShjb250ZW50KTtcclxuICAgICAgICB0ZXN0SXRlcmF0aW9uKGNzLCBjb250ZW50KTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0l0ZXJhdGlvbiAoaXRlcmF0b3IpJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSAnc29tZSB0ZXh0JztcclxuICAgICAgICBjb25zdCBjcyA9IG5ldyBjaGFyYWN0ZXJTdHJlYW1fMS5DaGFyYWN0ZXJTdHJlYW0obmV3IHRleHRJdGVyYXRvcl8xLlRleHRJdGVyYXRvcihjb250ZW50KSk7XHJcbiAgICAgICAgdGVzdEl0ZXJhdGlvbihjcywgY29udGVudCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdQb3NpdGlvbmluZycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gJ3NvbWUgdGV4dCc7XHJcbiAgICAgICAgY29uc3QgY3MgPSBuZXcgY2hhcmFjdGVyU3RyZWFtXzEuQ2hhcmFjdGVyU3RyZWFtKGNvbnRlbnQpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgMCk7XHJcbiAgICAgICAgY3MuYWR2YW5jZSgxKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIDEpO1xyXG4gICAgICAgIGNzLmFkdmFuY2UoMSk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNzLnBvc2l0aW9uLCAyKTtcclxuICAgICAgICBjcy5hZHZhbmNlKDIpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgNCk7XHJcbiAgICAgICAgY3MuYWR2YW5jZSgtMyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNzLnBvc2l0aW9uLCAxKTtcclxuICAgICAgICBjcy5hZHZhbmNlKC0zKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIDApO1xyXG4gICAgICAgIGNzLmFkdmFuY2UoMTAwKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIGNvbnRlbnQubGVuZ3RoKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0NoYXJhY3RlcnMnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9ICdzb21lIFxcdHRleHQgXCJcIiBcXCcgXFwnIFxcbiB0ZXh0IFxcclxcbiBtb3JlIHRleHQnO1xyXG4gICAgICAgIGNvbnN0IGNzID0gbmV3IGNoYXJhY3RlclN0cmVhbV8xLkNoYXJhY3RlclN0cmVhbShjb250ZW50KTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbnRlbnQubGVuZ3RoOyBpICs9IDEpIHtcclxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGNzLmN1cnJlbnRDaGFyLCBjb250ZW50LmNoYXJDb2RlQXQoaSkpO1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoY3MubmV4dENoYXIsIGkgPCBjb250ZW50Lmxlbmd0aCAtIDEgPyBjb250ZW50LmNoYXJDb2RlQXQoaSArIDEpIDogMCk7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChjcy5wcmV2Q2hhciwgaSA+IDAgPyBjb250ZW50LmNoYXJDb2RlQXQoaSAtIDEpIDogMCk7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChjcy5sb29rQWhlYWQoMiksIGkgPCBjb250ZW50Lmxlbmd0aCAtIDIgPyBjb250ZW50LmNoYXJDb2RlQXQoaSArIDIpIDogMCk7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChjcy5sb29rQWhlYWQoLTIpLCBpID4gMSA/IGNvbnRlbnQuY2hhckNvZGVBdChpIC0gMikgOiAwKTtcclxuICAgICAgICAgICAgY29uc3QgY2ggPSBjb250ZW50LmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzTGluZUJyZWFrID0gY2ggPT09IDEwIC8qIExpbmVGZWVkICovIHx8IGNoID09PSAxMyAvKiBDYXJyaWFnZVJldHVybiAqLztcclxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGNzLmlzQXRXaGl0ZVNwYWNlKCksIGNoID09PSA5IC8qIFRhYiAqLyB8fCBjaCA9PT0gMzIgLyogU3BhY2UgKi8gfHwgaXNMaW5lQnJlYWspO1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoY3MuaXNBdExpbmVCcmVhaygpLCBpc0xpbmVCcmVhayk7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChjcy5pc0F0U3RyaW5nKCksIGNoID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLyB8fCBjaCA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi8pO1xyXG4gICAgICAgICAgICBjcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ1NraXAnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9ICdzb21lIFxcdHRleHQgXCJcIiBcXCcgXFwnIFxcbiB0ZXh0IFxcclxcbiBtb3JlIHRleHQnO1xyXG4gICAgICAgIGNvbnN0IGNzID0gbmV3IGNoYXJhY3RlclN0cmVhbV8xLkNoYXJhY3RlclN0cmVhbShjb250ZW50KTtcclxuICAgICAgICBjcy5za2lwV2hpdGVzcGFjZSgpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgMCk7XHJcbiAgICAgICAgY3Muc2tpcFRvV2hpdGVzcGFjZSgpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgNCk7XHJcbiAgICAgICAgY3Muc2tpcFRvV2hpdGVzcGFjZSgpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgNCk7XHJcbiAgICAgICAgY3Muc2tpcFdoaXRlc3BhY2UoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIDYpO1xyXG4gICAgICAgIGNzLnNraXBMaW5lQnJlYWsoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIDYpO1xyXG4gICAgICAgIGNzLnNraXBUb0VvbCgpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgMTgpO1xyXG4gICAgICAgIGNzLnNraXBMaW5lQnJlYWsoKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIDE5KTtcclxuICAgIH0pKTtcclxufSk7XHJcbmZ1bmN0aW9uIHRlc3RJdGVyYXRpb24oY3MsIGNvbnRlbnQpIHtcclxuICAgIGFzc2VydC5lcXVhbChjcy5wb3NpdGlvbiwgMCk7XHJcbiAgICBhc3NlcnQuZXF1YWwoY3MubGVuZ3RoLCBjb250ZW50Lmxlbmd0aCk7XHJcbiAgICBhc3NlcnQuZXF1YWwoY3MuaXNFbmRPZlN0cmVhbSgpLCBmYWxzZSk7XHJcbiAgICBmb3IgKGxldCBpID0gLTI7IGkgPCBjb250ZW50Lmxlbmd0aCArIDI7IGkgKz0gMSkge1xyXG4gICAgICAgIGNvbnN0IGNoID0gY3MuY2hhckNvZGVBdChpKTtcclxuICAgICAgICBpZiAoaSA8IDAgfHwgaSA+PSBjb250ZW50Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoY2gsIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGNoLCBjb250ZW50LmNoYXJDb2RlQXQoaSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29udGVudC5sZW5ndGg7IGkgKz0gMSkge1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5pc0VuZE9mU3RyZWFtKCksIGZhbHNlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIGkpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjcy5jdXJyZW50Q2hhciwgY29udGVudC5jaGFyQ29kZUF0KGkpKTtcclxuICAgICAgICBjcy5tb3ZlTmV4dCgpO1xyXG4gICAgfVxyXG4gICAgYXNzZXJ0LmVxdWFsKGNzLmlzRW5kT2ZTdHJlYW0oKSwgdHJ1ZSk7XHJcbiAgICBhc3NlcnQuZXF1YWwoY3MucG9zaXRpb24sIGNvbnRlbnQubGVuZ3RoKTtcclxufVxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jaGFyYWN0ZXJTdHJlYW0udGVzdC5qcy5tYXAiXX0=