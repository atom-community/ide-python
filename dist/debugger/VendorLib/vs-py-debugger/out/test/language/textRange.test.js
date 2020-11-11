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

const types_1 = require("../../client/language/types"); // tslint:disable-next-line:max-func-body-length


suite('Language.TextRange', () => {
  test('Empty static', () => __awaiter(void 0, void 0, void 0, function* () {
    const e = types_1.TextRange.empty;
    assert.equal(e.start, 0);
    assert.equal(e.end, 0);
    assert.equal(e.length, 0);
  }));
  test('Construction', () => __awaiter(void 0, void 0, void 0, function* () {
    let r = new types_1.TextRange(10, 20);
    assert.equal(r.start, 10);
    assert.equal(r.end, 30);
    assert.equal(r.length, 20);
    r = new types_1.TextRange(10, 0);
    assert.equal(r.start, 10);
    assert.equal(r.end, 10);
    assert.equal(r.length, 0);
  }));
  test('From bounds', () => __awaiter(void 0, void 0, void 0, function* () {
    let r = types_1.TextRange.fromBounds(7, 9);
    assert.equal(r.start, 7);
    assert.equal(r.end, 9);
    assert.equal(r.length, 2);
    r = types_1.TextRange.fromBounds(5, 5);
    assert.equal(r.start, 5);
    assert.equal(r.end, 5);
    assert.equal(r.length, 0);
  }));
  test('Contains', () => __awaiter(void 0, void 0, void 0, function* () {
    const r = types_1.TextRange.fromBounds(7, 9);
    assert.equal(r.contains(-1), false);
    assert.equal(r.contains(6), false);
    assert.equal(r.contains(7), true);
    assert.equal(r.contains(8), true);
    assert.equal(r.contains(9), false);
    assert.equal(r.contains(10), false);
  }));
  test('Exceptions', () => __awaiter(void 0, void 0, void 0, function* () {
    assert.throws(() => {
      const e = new types_1.TextRange(0, -1);
    }, Error);
    assert.throws(() => {
      const e = types_1.TextRange.fromBounds(3, 1);
    }, Error);
  }));
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRleHRSYW5nZS50ZXN0LmpzIl0sIm5hbWVzIjpbIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJhc3NlcnQiLCJyZXF1aXJlIiwidHlwZXNfMSIsInN1aXRlIiwidGVzdCIsIlRleHRSYW5nZSIsImVtcHR5IiwiZXF1YWwiLCJzdGFydCIsImVuZCIsImxlbmd0aCIsInIiLCJmcm9tQm91bmRzIiwiY29udGFpbnMiLCJ0aHJvd3MiLCJFcnJvciJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBLElBQUlBLFNBQVMsR0FBSSxVQUFRLFNBQUtBLFNBQWQsSUFBNEIsVUFBVUMsT0FBVixFQUFtQkMsVUFBbkIsRUFBK0JDLENBQS9CLEVBQWtDQyxTQUFsQyxFQUE2QztBQUNyRixTQUFPLEtBQUtELENBQUMsS0FBS0EsQ0FBQyxHQUFHRSxPQUFULENBQU4sRUFBeUIsVUFBVUMsT0FBVixFQUFtQkMsTUFBbkIsRUFBMkI7QUFDdkQsYUFBU0MsU0FBVCxDQUFtQkMsS0FBbkIsRUFBMEI7QUFBRSxVQUFJO0FBQUVDLFFBQUFBLElBQUksQ0FBQ04sU0FBUyxDQUFDTyxJQUFWLENBQWVGLEtBQWYsQ0FBRCxDQUFKO0FBQThCLE9BQXBDLENBQXFDLE9BQU9HLENBQVAsRUFBVTtBQUFFTCxRQUFBQSxNQUFNLENBQUNLLENBQUQsQ0FBTjtBQUFZO0FBQUU7O0FBQzNGLGFBQVNDLFFBQVQsQ0FBa0JKLEtBQWxCLEVBQXlCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQyxPQUFELENBQVQsQ0FBbUJLLEtBQW5CLENBQUQsQ0FBSjtBQUFrQyxPQUF4QyxDQUF5QyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUM5RixhQUFTRixJQUFULENBQWNJLE1BQWQsRUFBc0I7QUFBRUEsTUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWNULE9BQU8sQ0FBQ1EsTUFBTSxDQUFDTCxLQUFSLENBQXJCLEdBQXNDLElBQUlOLENBQUosQ0FBTSxVQUFVRyxPQUFWLEVBQW1CO0FBQUVBLFFBQUFBLE9BQU8sQ0FBQ1EsTUFBTSxDQUFDTCxLQUFSLENBQVA7QUFBd0IsT0FBbkQsRUFBcURPLElBQXJELENBQTBEUixTQUExRCxFQUFxRUssUUFBckUsQ0FBdEM7QUFBdUg7O0FBQy9JSCxJQUFBQSxJQUFJLENBQUMsQ0FBQ04sU0FBUyxHQUFHQSxTQUFTLENBQUNhLEtBQVYsQ0FBZ0JoQixPQUFoQixFQUF5QkMsVUFBVSxJQUFJLEVBQXZDLENBQWIsRUFBeURTLElBQXpELEVBQUQsQ0FBSjtBQUNILEdBTE0sQ0FBUDtBQU1ILENBUEQ7O0FBUUFPLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRVgsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0M7O0FBQ0EsTUFBTVksTUFBTSxHQUFHQyxPQUFPLENBQUMsUUFBRCxDQUF0Qjs7QUFDQSxNQUFNQyxPQUFPLEdBQUdELE9BQU8sQ0FBQyw2QkFBRCxDQUF2QixDLENBQ0E7OztBQUNBRSxLQUFLLENBQUMsb0JBQUQsRUFBdUIsTUFBTTtBQUM5QkMsRUFBQUEsSUFBSSxDQUFDLGNBQUQsRUFBaUIsTUFBTXpCLFNBQVMsU0FBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDcEUsVUFBTVksQ0FBQyxHQUFHVyxPQUFPLENBQUNHLFNBQVIsQ0FBa0JDLEtBQTVCO0FBQ0FOLElBQUFBLE1BQU0sQ0FBQ08sS0FBUCxDQUFhaEIsQ0FBQyxDQUFDaUIsS0FBZixFQUFzQixDQUF0QjtBQUNBUixJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYWhCLENBQUMsQ0FBQ2tCLEdBQWYsRUFBb0IsQ0FBcEI7QUFDQVQsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFoQixDQUFDLENBQUNtQixNQUFmLEVBQXVCLENBQXZCO0FBQ0gsR0FMbUMsQ0FBaEMsQ0FBSjtBQU1BTixFQUFBQSxJQUFJLENBQUMsY0FBRCxFQUFpQixNQUFNekIsU0FBUyxTQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNwRSxRQUFJZ0MsQ0FBQyxHQUFHLElBQUlULE9BQU8sQ0FBQ0csU0FBWixDQUFzQixFQUF0QixFQUEwQixFQUExQixDQUFSO0FBQ0FMLElBQUFBLE1BQU0sQ0FBQ08sS0FBUCxDQUFhSSxDQUFDLENBQUNILEtBQWYsRUFBc0IsRUFBdEI7QUFDQVIsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFJLENBQUMsQ0FBQ0YsR0FBZixFQUFvQixFQUFwQjtBQUNBVCxJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDRCxNQUFmLEVBQXVCLEVBQXZCO0FBQ0FDLElBQUFBLENBQUMsR0FBRyxJQUFJVCxPQUFPLENBQUNHLFNBQVosQ0FBc0IsRUFBdEIsRUFBMEIsQ0FBMUIsQ0FBSjtBQUNBTCxJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDSCxLQUFmLEVBQXNCLEVBQXRCO0FBQ0FSLElBQUFBLE1BQU0sQ0FBQ08sS0FBUCxDQUFhSSxDQUFDLENBQUNGLEdBQWYsRUFBb0IsRUFBcEI7QUFDQVQsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFJLENBQUMsQ0FBQ0QsTUFBZixFQUF1QixDQUF2QjtBQUNILEdBVG1DLENBQWhDLENBQUo7QUFVQU4sRUFBQUEsSUFBSSxDQUFDLGFBQUQsRUFBZ0IsTUFBTXpCLFNBQVMsU0FBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDbkUsUUFBSWdDLENBQUMsR0FBR1QsT0FBTyxDQUFDRyxTQUFSLENBQWtCTyxVQUFsQixDQUE2QixDQUE3QixFQUFnQyxDQUFoQyxDQUFSO0FBQ0FaLElBQUFBLE1BQU0sQ0FBQ08sS0FBUCxDQUFhSSxDQUFDLENBQUNILEtBQWYsRUFBc0IsQ0FBdEI7QUFDQVIsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFJLENBQUMsQ0FBQ0YsR0FBZixFQUFvQixDQUFwQjtBQUNBVCxJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDRCxNQUFmLEVBQXVCLENBQXZCO0FBQ0FDLElBQUFBLENBQUMsR0FBR1QsT0FBTyxDQUFDRyxTQUFSLENBQWtCTyxVQUFsQixDQUE2QixDQUE3QixFQUFnQyxDQUFoQyxDQUFKO0FBQ0FaLElBQUFBLE1BQU0sQ0FBQ08sS0FBUCxDQUFhSSxDQUFDLENBQUNILEtBQWYsRUFBc0IsQ0FBdEI7QUFDQVIsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFJLENBQUMsQ0FBQ0YsR0FBZixFQUFvQixDQUFwQjtBQUNBVCxJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDRCxNQUFmLEVBQXVCLENBQXZCO0FBQ0gsR0FUa0MsQ0FBL0IsQ0FBSjtBQVVBTixFQUFBQSxJQUFJLENBQUMsVUFBRCxFQUFhLE1BQU16QixTQUFTLFNBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ2hFLFVBQU1nQyxDQUFDLEdBQUdULE9BQU8sQ0FBQ0csU0FBUixDQUFrQk8sVUFBbEIsQ0FBNkIsQ0FBN0IsRUFBZ0MsQ0FBaEMsQ0FBVjtBQUNBWixJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDRSxRQUFGLENBQVcsQ0FBQyxDQUFaLENBQWIsRUFBNkIsS0FBN0I7QUFDQWIsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFJLENBQUMsQ0FBQ0UsUUFBRixDQUFXLENBQVgsQ0FBYixFQUE0QixLQUE1QjtBQUNBYixJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDRSxRQUFGLENBQVcsQ0FBWCxDQUFiLEVBQTRCLElBQTVCO0FBQ0FiLElBQUFBLE1BQU0sQ0FBQ08sS0FBUCxDQUFhSSxDQUFDLENBQUNFLFFBQUYsQ0FBVyxDQUFYLENBQWIsRUFBNEIsSUFBNUI7QUFDQWIsSUFBQUEsTUFBTSxDQUFDTyxLQUFQLENBQWFJLENBQUMsQ0FBQ0UsUUFBRixDQUFXLENBQVgsQ0FBYixFQUE0QixLQUE1QjtBQUNBYixJQUFBQSxNQUFNLENBQUNPLEtBQVAsQ0FBYUksQ0FBQyxDQUFDRSxRQUFGLENBQVcsRUFBWCxDQUFiLEVBQTZCLEtBQTdCO0FBQ0gsR0FSK0IsQ0FBNUIsQ0FBSjtBQVNBVCxFQUFBQSxJQUFJLENBQUMsWUFBRCxFQUFlLE1BQU16QixTQUFTLFNBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ2xFcUIsSUFBQUEsTUFBTSxDQUFDYyxNQUFQLENBQWMsTUFBTTtBQUFFLFlBQU12QixDQUFDLEdBQUcsSUFBSVcsT0FBTyxDQUFDRyxTQUFaLENBQXNCLENBQXRCLEVBQXlCLENBQUMsQ0FBMUIsQ0FBVjtBQUF5QyxLQUEvRCxFQUFpRVUsS0FBakU7QUFDQWYsSUFBQUEsTUFBTSxDQUFDYyxNQUFQLENBQWMsTUFBTTtBQUFFLFlBQU12QixDQUFDLEdBQUdXLE9BQU8sQ0FBQ0csU0FBUixDQUFrQk8sVUFBbEIsQ0FBNkIsQ0FBN0IsRUFBZ0MsQ0FBaEMsQ0FBVjtBQUErQyxLQUFyRSxFQUF1RUcsS0FBdkU7QUFDSCxHQUhpQyxDQUE5QixDQUFKO0FBSUgsQ0F4Q0ksQ0FBTCIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbid1c2Ugc3RyaWN0JztcclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uL2NsaWVudC9sYW5ndWFnZS90eXBlc1wiKTtcclxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1mdW5jLWJvZHktbGVuZ3RoXHJcbnN1aXRlKCdMYW5ndWFnZS5UZXh0UmFuZ2UnLCAoKSA9PiB7XHJcbiAgICB0ZXN0KCdFbXB0eSBzdGF0aWMnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgZSA9IHR5cGVzXzEuVGV4dFJhbmdlLmVtcHR5O1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChlLnN0YXJ0LCAwKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoZS5lbmQsIDApO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChlLmxlbmd0aCwgMCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdDb25zdHJ1Y3Rpb24nLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgbGV0IHIgPSBuZXcgdHlwZXNfMS5UZXh0UmFuZ2UoMTAsIDIwKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5zdGFydCwgMTApO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyLmVuZCwgMzApO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyLmxlbmd0aCwgMjApO1xyXG4gICAgICAgIHIgPSBuZXcgdHlwZXNfMS5UZXh0UmFuZ2UoMTAsIDApO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyLnN0YXJ0LCAxMCk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHIuZW5kLCAxMCk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHIubGVuZ3RoLCAwKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0Zyb20gYm91bmRzJywgKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGxldCByID0gdHlwZXNfMS5UZXh0UmFuZ2UuZnJvbUJvdW5kcyg3LCA5KTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5zdGFydCwgNyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHIuZW5kLCA5KTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5sZW5ndGgsIDIpO1xyXG4gICAgICAgIHIgPSB0eXBlc18xLlRleHRSYW5nZS5mcm9tQm91bmRzKDUsIDUpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyLnN0YXJ0LCA1KTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5lbmQsIDUpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyLmxlbmd0aCwgMCk7XHJcbiAgICB9KSk7XHJcbiAgICB0ZXN0KCdDb250YWlucycsICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCByID0gdHlwZXNfMS5UZXh0UmFuZ2UuZnJvbUJvdW5kcyg3LCA5KTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5jb250YWlucygtMSksIGZhbHNlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5jb250YWlucyg2KSwgZmFsc2UpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChyLmNvbnRhaW5zKDcpLCB0cnVlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5jb250YWlucyg4KSwgdHJ1ZSk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHIuY29udGFpbnMoOSksIGZhbHNlKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoci5jb250YWlucygxMCksIGZhbHNlKTtcclxuICAgIH0pKTtcclxuICAgIHRlc3QoJ0V4Y2VwdGlvbnMnLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgYXNzZXJ0LnRocm93cygoKSA9PiB7IGNvbnN0IGUgPSBuZXcgdHlwZXNfMS5UZXh0UmFuZ2UoMCwgLTEpOyB9LCBFcnJvcik7XHJcbiAgICAgICAgYXNzZXJ0LnRocm93cygoKSA9PiB7IGNvbnN0IGUgPSB0eXBlc18xLlRleHRSYW5nZS5mcm9tQm91bmRzKDMsIDEpOyB9LCBFcnJvcik7XHJcbiAgICB9KSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZXh0UmFuZ2UudGVzdC5qcy5tYXAiXX0=