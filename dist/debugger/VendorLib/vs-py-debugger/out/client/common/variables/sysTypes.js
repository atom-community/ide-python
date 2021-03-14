/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
}); // tslint:disable:no-any no-increment-decrement

const sysTypes_1 = require("../utils/sysTypes");

function validateConstraints(args, constraints) {
  const len = Math.min(args.length, constraints.length);

  for (let i = 0; i < len; i++) {
    validateConstraint(args[i], constraints[i]);
  }
}

exports.validateConstraints = validateConstraints;

function validateConstraint(arg, constraint) {
  if (sysTypes_1.isString(constraint)) {
    if (typeof arg !== constraint) {
      throw new Error(`argument does not match constraint: typeof ${constraint}`);
    }
  } else if (sysTypes_1.isFunction(constraint)) {
    if (arg instanceof constraint) {
      return;
    }

    if (arg && arg.constructor === constraint) {
      return;
    }

    if (constraint.length === 1 && constraint.call(undefined, arg) === true) {
      return;
    }

    throw new Error('argument does not match one of these constraints: arg instanceof constraint, arg.constructor === constraint, nor constraint(arg) === true');
  }
}

exports.validateConstraint = validateConstraint;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN5c1R5cGVzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwic3lzVHlwZXNfMSIsInJlcXVpcmUiLCJ2YWxpZGF0ZUNvbnN0cmFpbnRzIiwiYXJncyIsImNvbnN0cmFpbnRzIiwibGVuIiwiTWF0aCIsIm1pbiIsImxlbmd0aCIsImkiLCJ2YWxpZGF0ZUNvbnN0cmFpbnQiLCJhcmciLCJjb25zdHJhaW50IiwiaXNTdHJpbmciLCJFcnJvciIsImlzRnVuY3Rpb24iLCJjb25zdHJ1Y3RvciIsImNhbGwiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0MsRSxDQUNBOztBQUNBLE1BQU1DLFVBQVUsR0FBR0MsT0FBTyxDQUFDLG1CQUFELENBQTFCOztBQUNBLFNBQVNDLG1CQUFULENBQTZCQyxJQUE3QixFQUFtQ0MsV0FBbkMsRUFBZ0Q7QUFDNUMsUUFBTUMsR0FBRyxHQUFHQyxJQUFJLENBQUNDLEdBQUwsQ0FBU0osSUFBSSxDQUFDSyxNQUFkLEVBQXNCSixXQUFXLENBQUNJLE1BQWxDLENBQVo7O0FBQ0EsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSixHQUFwQixFQUF5QkksQ0FBQyxFQUExQixFQUE4QjtBQUMxQkMsSUFBQUEsa0JBQWtCLENBQUNQLElBQUksQ0FBQ00sQ0FBRCxDQUFMLEVBQVVMLFdBQVcsQ0FBQ0ssQ0FBRCxDQUFyQixDQUFsQjtBQUNIO0FBQ0o7O0FBQ0RYLE9BQU8sQ0FBQ0ksbUJBQVIsR0FBOEJBLG1CQUE5Qjs7QUFDQSxTQUFTUSxrQkFBVCxDQUE0QkMsR0FBNUIsRUFBaUNDLFVBQWpDLEVBQTZDO0FBQ3pDLE1BQUlaLFVBQVUsQ0FBQ2EsUUFBWCxDQUFvQkQsVUFBcEIsQ0FBSixFQUFxQztBQUNqQyxRQUFJLE9BQU9ELEdBQVAsS0FBZUMsVUFBbkIsRUFBK0I7QUFDM0IsWUFBTSxJQUFJRSxLQUFKLENBQVcsOENBQTZDRixVQUFXLEVBQW5FLENBQU47QUFDSDtBQUNKLEdBSkQsTUFLSyxJQUFJWixVQUFVLENBQUNlLFVBQVgsQ0FBc0JILFVBQXRCLENBQUosRUFBdUM7QUFDeEMsUUFBSUQsR0FBRyxZQUFZQyxVQUFuQixFQUErQjtBQUMzQjtBQUNIOztBQUNELFFBQUlELEdBQUcsSUFBSUEsR0FBRyxDQUFDSyxXQUFKLEtBQW9CSixVQUEvQixFQUEyQztBQUN2QztBQUNIOztBQUNELFFBQUlBLFVBQVUsQ0FBQ0osTUFBWCxLQUFzQixDQUF0QixJQUEyQkksVUFBVSxDQUFDSyxJQUFYLENBQWdCQyxTQUFoQixFQUEyQlAsR0FBM0IsTUFBb0MsSUFBbkUsRUFBeUU7QUFDckU7QUFDSDs7QUFDRCxVQUFNLElBQUlHLEtBQUosQ0FBVSwySUFBVixDQUFOO0FBQ0g7QUFDSjs7QUFDRGhCLE9BQU8sQ0FBQ1ksa0JBQVIsR0FBNkJBLGtCQUE3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuJ3VzZSBzdHJpY3QnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuLy8gdHNsaW50OmRpc2FibGU6bm8tYW55IG5vLWluY3JlbWVudC1kZWNyZW1lbnRcbmNvbnN0IHN5c1R5cGVzXzEgPSByZXF1aXJlKFwiLi4vdXRpbHMvc3lzVHlwZXNcIik7XG5mdW5jdGlvbiB2YWxpZGF0ZUNvbnN0cmFpbnRzKGFyZ3MsIGNvbnN0cmFpbnRzKSB7XG4gICAgY29uc3QgbGVuID0gTWF0aC5taW4oYXJncy5sZW5ndGgsIGNvbnN0cmFpbnRzLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YWxpZGF0ZUNvbnN0cmFpbnQoYXJnc1tpXSwgY29uc3RyYWludHNbaV0pO1xuICAgIH1cbn1cbmV4cG9ydHMudmFsaWRhdGVDb25zdHJhaW50cyA9IHZhbGlkYXRlQ29uc3RyYWludHM7XG5mdW5jdGlvbiB2YWxpZGF0ZUNvbnN0cmFpbnQoYXJnLCBjb25zdHJhaW50KSB7XG4gICAgaWYgKHN5c1R5cGVzXzEuaXNTdHJpbmcoY29uc3RyYWludCkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmcgIT09IGNvbnN0cmFpbnQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYXJndW1lbnQgZG9lcyBub3QgbWF0Y2ggY29uc3RyYWludDogdHlwZW9mICR7Y29uc3RyYWludH1gKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChzeXNUeXBlc18xLmlzRnVuY3Rpb24oY29uc3RyYWludCkpIHtcbiAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIGNvbnN0cmFpbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnICYmIGFyZy5jb25zdHJ1Y3RvciA9PT0gY29uc3RyYWludCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zdHJhaW50Lmxlbmd0aCA9PT0gMSAmJiBjb25zdHJhaW50LmNhbGwodW5kZWZpbmVkLCBhcmcpID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcmd1bWVudCBkb2VzIG5vdCBtYXRjaCBvbmUgb2YgdGhlc2UgY29uc3RyYWludHM6IGFyZyBpbnN0YW5jZW9mIGNvbnN0cmFpbnQsIGFyZy5jb25zdHJ1Y3RvciA9PT0gY29uc3RyYWludCwgbm9yIGNvbnN0cmFpbnQoYXJnKSA9PT0gdHJ1ZScpO1xuICAgIH1cbn1cbmV4cG9ydHMudmFsaWRhdGVDb25zdHJhaW50ID0gdmFsaWRhdGVDb25zdHJhaW50O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3lzVHlwZXMuanMubWFwIl19