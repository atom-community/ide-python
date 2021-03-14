// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

class IterableTextRange {
  constructor(textRangeCollection) {
    this.textRangeCollection = textRangeCollection;
  }

  [Symbol.iterator]() {
    let index = -1;
    return {
      next: () => {
        if (index < this.textRangeCollection.count - 1) {
          return {
            done: false,
            value: this.textRangeCollection.getItemAt(index += 1)
          };
        } else {
          return {
            done: true,
            // tslint:disable-next-line:no-any
            value: undefined
          };
        }
      }
    };
  }

}

exports.IterableTextRange = IterableTextRange;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIml0ZXJhYmxlVGV4dFJhbmdlLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiSXRlcmFibGVUZXh0UmFuZ2UiLCJjb25zdHJ1Y3RvciIsInRleHRSYW5nZUNvbGxlY3Rpb24iLCJTeW1ib2wiLCJpdGVyYXRvciIsImluZGV4IiwibmV4dCIsImNvdW50IiwiZG9uZSIsImdldEl0ZW1BdCIsInVuZGVmaW5lZCJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0FBQUVDLEVBQUFBLEtBQUssRUFBRTtBQUFULENBQTdDOztBQUNBLE1BQU1DLGlCQUFOLENBQXdCO0FBQ3BCQyxFQUFBQSxXQUFXLENBQUNDLG1CQUFELEVBQXNCO0FBQzdCLFNBQUtBLG1CQUFMLEdBQTJCQSxtQkFBM0I7QUFDSDs7QUFDZSxHQUFmQyxNQUFNLENBQUNDLFFBQVEsSUFBSTtBQUNoQixRQUFJQyxLQUFLLEdBQUcsQ0FBQyxDQUFiO0FBQ0EsV0FBTztBQUNIQyxNQUFBQSxJQUFJLEVBQUUsTUFBTTtBQUNSLFlBQUlELEtBQUssR0FBRyxLQUFLSCxtQkFBTCxDQUF5QkssS0FBekIsR0FBaUMsQ0FBN0MsRUFBZ0Q7QUFDNUMsaUJBQU87QUFDSEMsWUFBQUEsSUFBSSxFQUFFLEtBREg7QUFFSFQsWUFBQUEsS0FBSyxFQUFFLEtBQUtHLG1CQUFMLENBQXlCTyxTQUF6QixDQUFtQ0osS0FBSyxJQUFJLENBQTVDO0FBRkosV0FBUDtBQUlILFNBTEQsTUFNSztBQUNELGlCQUFPO0FBQ0hHLFlBQUFBLElBQUksRUFBRSxJQURIO0FBRUg7QUFDQVQsWUFBQUEsS0FBSyxFQUFFVztBQUhKLFdBQVA7QUFLSDtBQUNKO0FBZkUsS0FBUDtBQWlCSDs7QUF2Qm1COztBQXlCeEJaLE9BQU8sQ0FBQ0UsaUJBQVIsR0FBNEJBLGlCQUE1QiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuJ3VzZSBzdHJpY3QnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY2xhc3MgSXRlcmFibGVUZXh0UmFuZ2Uge1xuICAgIGNvbnN0cnVjdG9yKHRleHRSYW5nZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgdGhpcy50ZXh0UmFuZ2VDb2xsZWN0aW9uID0gdGV4dFJhbmdlQ29sbGVjdGlvbjtcbiAgICB9XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgICAgIGxldCBpbmRleCA9IC0xO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmV4dDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IHRoaXMudGV4dFJhbmdlQ29sbGVjdGlvbi5jb3VudCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMudGV4dFJhbmdlQ29sbGVjdGlvbi5nZXRJdGVtQXQoaW5kZXggKz0gMSlcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59XG5leHBvcnRzLkl0ZXJhYmxlVGV4dFJhbmdlID0gSXRlcmFibGVUZXh0UmFuZ2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pdGVyYWJsZVRleHRSYW5nZS5qcy5tYXAiXX0=