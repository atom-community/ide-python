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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN5c1R5cGVzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwic3lzVHlwZXNfMSIsInJlcXVpcmUiLCJ2YWxpZGF0ZUNvbnN0cmFpbnRzIiwiYXJncyIsImNvbnN0cmFpbnRzIiwibGVuIiwiTWF0aCIsIm1pbiIsImxlbmd0aCIsImkiLCJ2YWxpZGF0ZUNvbnN0cmFpbnQiLCJhcmciLCJjb25zdHJhaW50IiwiaXNTdHJpbmciLCJFcnJvciIsImlzRnVuY3Rpb24iLCJjb25zdHJ1Y3RvciIsImNhbGwiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0MsRSxDQUNBOztBQUNBLE1BQU1DLFVBQVUsR0FBR0MsT0FBTyxDQUFDLG1CQUFELENBQTFCOztBQUNBLFNBQVNDLG1CQUFULENBQTZCQyxJQUE3QixFQUFtQ0MsV0FBbkMsRUFBZ0Q7QUFDNUMsUUFBTUMsR0FBRyxHQUFHQyxJQUFJLENBQUNDLEdBQUwsQ0FBU0osSUFBSSxDQUFDSyxNQUFkLEVBQXNCSixXQUFXLENBQUNJLE1BQWxDLENBQVo7O0FBQ0EsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSixHQUFwQixFQUF5QkksQ0FBQyxFQUExQixFQUE4QjtBQUMxQkMsSUFBQUEsa0JBQWtCLENBQUNQLElBQUksQ0FBQ00sQ0FBRCxDQUFMLEVBQVVMLFdBQVcsQ0FBQ0ssQ0FBRCxDQUFyQixDQUFsQjtBQUNIO0FBQ0o7O0FBQ0RYLE9BQU8sQ0FBQ0ksbUJBQVIsR0FBOEJBLG1CQUE5Qjs7QUFDQSxTQUFTUSxrQkFBVCxDQUE0QkMsR0FBNUIsRUFBaUNDLFVBQWpDLEVBQTZDO0FBQ3pDLE1BQUlaLFVBQVUsQ0FBQ2EsUUFBWCxDQUFvQkQsVUFBcEIsQ0FBSixFQUFxQztBQUNqQyxRQUFJLE9BQU9ELEdBQVAsS0FBZUMsVUFBbkIsRUFBK0I7QUFDM0IsWUFBTSxJQUFJRSxLQUFKLENBQVcsOENBQTZDRixVQUFXLEVBQW5FLENBQU47QUFDSDtBQUNKLEdBSkQsTUFLSyxJQUFJWixVQUFVLENBQUNlLFVBQVgsQ0FBc0JILFVBQXRCLENBQUosRUFBdUM7QUFDeEMsUUFBSUQsR0FBRyxZQUFZQyxVQUFuQixFQUErQjtBQUMzQjtBQUNIOztBQUNELFFBQUlELEdBQUcsSUFBSUEsR0FBRyxDQUFDSyxXQUFKLEtBQW9CSixVQUEvQixFQUEyQztBQUN2QztBQUNIOztBQUNELFFBQUlBLFVBQVUsQ0FBQ0osTUFBWCxLQUFzQixDQUF0QixJQUEyQkksVUFBVSxDQUFDSyxJQUFYLENBQWdCQyxTQUFoQixFQUEyQlAsR0FBM0IsTUFBb0MsSUFBbkUsRUFBeUU7QUFDckU7QUFDSDs7QUFDRCxVQUFNLElBQUlHLEtBQUosQ0FBVSwySUFBVixDQUFOO0FBQ0g7QUFDSjs7QUFDRGhCLE9BQU8sQ0FBQ1ksa0JBQVIsR0FBNkJBLGtCQUE3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXHJcbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuLy8gdHNsaW50OmRpc2FibGU6bm8tYW55IG5vLWluY3JlbWVudC1kZWNyZW1lbnRcclxuY29uc3Qgc3lzVHlwZXNfMSA9IHJlcXVpcmUoXCIuLi91dGlscy9zeXNUeXBlc1wiKTtcclxuZnVuY3Rpb24gdmFsaWRhdGVDb25zdHJhaW50cyhhcmdzLCBjb25zdHJhaW50cykge1xyXG4gICAgY29uc3QgbGVuID0gTWF0aC5taW4oYXJncy5sZW5ndGgsIGNvbnN0cmFpbnRzLmxlbmd0aCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgdmFsaWRhdGVDb25zdHJhaW50KGFyZ3NbaV0sIGNvbnN0cmFpbnRzW2ldKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLnZhbGlkYXRlQ29uc3RyYWludHMgPSB2YWxpZGF0ZUNvbnN0cmFpbnRzO1xyXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbnN0cmFpbnQoYXJnLCBjb25zdHJhaW50KSB7XHJcbiAgICBpZiAoc3lzVHlwZXNfMS5pc1N0cmluZyhjb25zdHJhaW50KSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSBjb25zdHJhaW50KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYXJndW1lbnQgZG9lcyBub3QgbWF0Y2ggY29uc3RyYWludDogdHlwZW9mICR7Y29uc3RyYWludH1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzeXNUeXBlc18xLmlzRnVuY3Rpb24oY29uc3RyYWludCkpIHtcclxuICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgY29uc3RyYWludCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcmcgJiYgYXJnLmNvbnN0cnVjdG9yID09PSBjb25zdHJhaW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnN0cmFpbnQubGVuZ3RoID09PSAxICYmIGNvbnN0cmFpbnQuY2FsbCh1bmRlZmluZWQsIGFyZykgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3VtZW50IGRvZXMgbm90IG1hdGNoIG9uZSBvZiB0aGVzZSBjb25zdHJhaW50czogYXJnIGluc3RhbmNlb2YgY29uc3RyYWludCwgYXJnLmNvbnN0cnVjdG9yID09PSBjb25zdHJhaW50LCBub3IgY29uc3RyYWludChhcmcpID09PSB0cnVlJyk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy52YWxpZGF0ZUNvbnN0cmFpbnQgPSB2YWxpZGF0ZUNvbnN0cmFpbnQ7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN5c1R5cGVzLmpzLm1hcCJdfQ==