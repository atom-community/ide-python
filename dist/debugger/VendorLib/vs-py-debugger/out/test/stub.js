// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

const chai_1 = require("chai");
/**
 * StubCall records the name of a called function and the passed args.
 */


class StubCall {
  constructor( // Funcname is the name of the function that was called.
  funcName, // Args is the set of arguments passed to the function. They are
  // in the same order as the function's parameters.
  // tslint:disable-next-line:no-any
  args) {
    this.funcName = funcName;
    this.args = args;
  }

}

exports.StubCall = StubCall;
/**
 * Stub is used in testing to stand in for some other value, to record
 * all calls to stubbed methods/functions, and to allow users to set the
 * values that are returned from those calls. Stub is intended to be
 * an attribute of a class that will define the methods to track:
 *
 *    class stubConn {
 *        public returnResponse: string = [];
 *
 *        constructor(
 *            public stub: Stub = new Stub()) {};
 *
 *        public send(request: string): string {
 *            this.stub.addCall('send', request);
 *            this.stub.maybeErr();
 *            return this.returnResponse;
 *        }
 *    }
 *
 * As demonstrated in the example, by supporting a stub argument, a
 * single Stub may be shared between multiple stubs.  This allows you
 * to capture the calls of all stubs in absolute order.
 *
 * Exceptions are set through setErrors().  Set them to the errors (or
 * lack thereof, i.e. null) you want raised.  The
 * `maybeErr` method raises the set exceptions (if any) in sequence,
 * falling back to null when the sequence is exhausted.  Thus each
 * stubbed method should call `maybeErr` to get its exception.
 * `popNoError` is an alternative if the method should never throw.
 *
 * To validate calls made to the stub in a test call the CheckCalls (or
 * CheckCall) method:
 *
 *    stub.checkCalls([
 *        new StubCall('send', [
 *            expected
 *        ])
 *    ]);
 *
 *    s.stub.CheckCall(0, 'send', expected);
 *
 * Not only is Stub useful for building an interface implementation to
 * use in testing (e.g. a network API client), it is also useful in
 * regular function patching situations:
 *
 *    class MyStub {
 *        public stub: Stub;
 *
 *        public someFunc(arg: any) {
 *            this.stub.addCall('someFunc', arg)
 *            this.stub.maybeErr();
 *        }
 *    }
 *
 *    const s = new MyStub();
 *    mod.func = s.someFunc;  // monkey-patch
 *
 * This allows for easily monitoring the args passed to the patched
 * func, as well as controlling the return value from the func in a
 * clean manner (by simply setting the correct field on the stub).
 */
// Based on:  https://github.com/juju/testing/blob/master/stub.go

class Stub {
  constructor() {
    this._calls = [];
    this._errors = [];
  }

  get calls() {
    return this._calls.slice(0); // a copy
  }

  get errors() {
    return this._errors.slice(0); // a copy
  } //=======================
  // before execution:

  /*
   * setErrors sets the sequence of exceptions for the stub. Each call
   * to maybeErr (thus each stub method call) pops an error off the
   * front.  So frontloading null here will allow calls to pass,
   * followed by a failure.
   */


  setErrors(...errors) {
    this._errors = errors;
  } //=======================
  // during execution:
  // addCall records a stubbed function call for later inspection
  // using the checkCalls method.  All stubbed functions should call
  // addCall.
  // tslint:disable-next-line:no-any


  addCall(name, ...args) {
    this._calls.push(new StubCall(name, args));
  }
  /*
   * ResetCalls erases the calls recorded by this Stub.
   */


  resetCalls() {
    this._calls = [];
  }
  /*
   * maybeErr returns the error that should be returned on the nth
   * call to any method on the stub.  It should be called for the
   * error return in all stubbed methods.
   */


  maybeErr() {
    if (this._errors.length === 0) {
      return;
    }

    const err = this._errors[0];

    this._errors.shift();

    if (err !== null) {
      throw err;
    }
  }
  /*
   * popNoErr pops off the next error without returning it.  If the
   * error is not null then popNoErr will fail.
   *
   * popNoErr is useful in stub methods that do not return an error.
   */


  popNoErr() {
    if (this._errors.length === 0) {
      return;
    }

    const err = this._errors[0];

    this._errors.shift();

    if (err !== null) {
      chai_1.assert.fail(null, err, 'the next err was unexpectedly not null');
    }
  } //=======================
  // after execution:

  /*
   * checkCalls verifies that the history of calls on the stub's
   * methods matches the expected calls.
   */


  checkCalls(expected) {
    chai_1.assert.deepEqual(this._calls, expected);
  } // tslint:disable-next-line:no-suspicious-comment
  // TODO: Add checkCallsUnordered?
  // tslint:disable-next-line:no-suspicious-comment
  // TODO: Add checkCallsSubset?

  /*
   * checkCall checks the recorded call at the given index against the
   * provided values. i If the index is out of bounds then the check
   * fails.
   */
  // tslint:disable-next-line:no-any


  checkCall(index, funcName, ...args) {
    chai_1.assert.isBelow(index, this._calls.length);
    const expected = new StubCall(funcName, args);
    chai_1.assert.deepEqual(this._calls[index], expected);
  }
  /*
   * checkCallNames verifies that the in-order list of called method
   * names matches the expected calls.
   */


  checkCallNames(...expected) {
    const names = [];

    for (const call of this._calls) {
      names.push(call.funcName);
    }

    chai_1.assert.deepEqual(names, expected);
  } // checkNoCalls verifies that none of the stub's methods have been
  // called.


  checkNoCalls() {
    chai_1.assert.equal(this._calls.length, 0);
  } // checkErrors verifies that the list of unused exceptions is empty.


  checkErrors() {
    chai_1.assert.equal(this._errors.length, 0);
  }

}

exports.Stub = Stub;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0dWIuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJjaGFpXzEiLCJyZXF1aXJlIiwiU3R1YkNhbGwiLCJjb25zdHJ1Y3RvciIsImZ1bmNOYW1lIiwiYXJncyIsIlN0dWIiLCJfY2FsbHMiLCJfZXJyb3JzIiwiY2FsbHMiLCJzbGljZSIsImVycm9ycyIsInNldEVycm9ycyIsImFkZENhbGwiLCJuYW1lIiwicHVzaCIsInJlc2V0Q2FsbHMiLCJtYXliZUVyciIsImxlbmd0aCIsImVyciIsInNoaWZ0IiwicG9wTm9FcnIiLCJhc3NlcnQiLCJmYWlsIiwiY2hlY2tDYWxscyIsImV4cGVjdGVkIiwiZGVlcEVxdWFsIiwiY2hlY2tDYWxsIiwiaW5kZXgiLCJpc0JlbG93IiwiY2hlY2tDYWxsTmFtZXMiLCJuYW1lcyIsImNhbGwiLCJjaGVja05vQ2FsbHMiLCJlcXVhbCIsImNoZWNrRXJyb3JzIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0M7O0FBQ0EsTUFBTUMsTUFBTSxHQUFHQyxPQUFPLENBQUMsTUFBRCxDQUF0QjtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsTUFBTUMsUUFBTixDQUFlO0FBQ1hDLEVBQUFBLFdBQVcsRUFDWDtBQUNBQyxFQUFBQSxRQUZXLEVBR1g7QUFDQTtBQUNBO0FBQ0FDLEVBQUFBLElBTlcsRUFNTDtBQUNGLFNBQUtELFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0EsU0FBS0MsSUFBTCxHQUFZQSxJQUFaO0FBQ0g7O0FBVlU7O0FBWWZQLE9BQU8sQ0FBQ0ksUUFBUixHQUFtQkEsUUFBbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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USxHQUFHLElBQUl2QixRQUFKLENBQWFFLFFBQWIsRUFBdUJDLElBQXZCLENBQWpCO0FBQ0FMLElBQUFBLE1BQU0sQ0FBQ3NCLE1BQVAsQ0FBY0ksU0FBZCxDQUF3QixLQUFLbkIsTUFBTCxDQUFZcUIsS0FBWixDQUF4QixFQUE0Q0gsUUFBNUM7QUFDSDtBQUNEO0FBQ0o7QUFDQTtBQUNBOzs7QUFDSUssRUFBQUEsY0FBYyxDQUFDLEdBQUdMLFFBQUosRUFBYztBQUN4QixVQUFNTSxLQUFLLEdBQUcsRUFBZDs7QUFDQSxTQUFLLE1BQU1DLElBQVgsSUFBbUIsS0FBS3pCLE1BQXhCLEVBQWdDO0FBQzVCd0IsTUFBQUEsS0FBSyxDQUFDaEIsSUFBTixDQUFXaUIsSUFBSSxDQUFDNUIsUUFBaEI7QUFDSDs7QUFDREosSUFBQUEsTUFBTSxDQUFDc0IsTUFBUCxDQUFjSSxTQUFkLENBQXdCSyxLQUF4QixFQUErQk4sUUFBL0I7QUFDSCxHQXRHTSxDQXVHUDtBQUNBOzs7QUFDQVEsRUFBQUEsWUFBWSxHQUFHO0FBQ1hqQyxJQUFBQSxNQUFNLENBQUNzQixNQUFQLENBQWNZLEtBQWQsQ0FBb0IsS0FBSzNCLE1BQUwsQ0FBWVcsTUFBaEMsRUFBd0MsQ0FBeEM7QUFDSCxHQTNHTSxDQTRHUDs7O0FBQ0FpQixFQUFBQSxXQUFXLEdBQUc7QUFDVm5DLElBQUFBLE1BQU0sQ0FBQ3NCLE1BQVAsQ0FBY1ksS0FBZCxDQUFvQixLQUFLMUIsT0FBTCxDQUFhVSxNQUFqQyxFQUF5QyxDQUF6QztBQUNIOztBQS9HTTs7QUFpSFhwQixPQUFPLENBQUNRLElBQVIsR0FBZUEsSUFBZiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuJ3VzZSBzdHJpY3QnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgY2hhaV8xID0gcmVxdWlyZShcImNoYWlcIik7XG4vKipcbiAqIFN0dWJDYWxsIHJlY29yZHMgdGhlIG5hbWUgb2YgYSBjYWxsZWQgZnVuY3Rpb24gYW5kIHRoZSBwYXNzZWQgYXJncy5cbiAqL1xuY2xhc3MgU3R1YkNhbGwge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vIEZ1bmNuYW1lIGlzIHRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHdhcyBjYWxsZWQuXG4gICAgZnVuY05hbWUsIFxuICAgIC8vIEFyZ3MgaXMgdGhlIHNldCBvZiBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmdW5jdGlvbi4gVGhleSBhcmVcbiAgICAvLyBpbiB0aGUgc2FtZSBvcmRlciBhcyB0aGUgZnVuY3Rpb24ncyBwYXJhbWV0ZXJzLlxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBhcmdzKSB7XG4gICAgICAgIHRoaXMuZnVuY05hbWUgPSBmdW5jTmFtZTtcbiAgICAgICAgdGhpcy5hcmdzID0gYXJncztcbiAgICB9XG59XG5leHBvcnRzLlN0dWJDYWxsID0gU3R1YkNhbGw7XG4vKipcbiAqIFN0dWIgaXMgdXNlZCBpbiB0ZXN0aW5nIHRvIHN0YW5kIGluIGZvciBzb21lIG90aGVyIHZhbHVlLCB0byByZWNvcmRcbiAqIGFsbCBjYWxscyB0byBzdHViYmVkIG1ldGhvZHMvZnVuY3Rpb25zLCBhbmQgdG8gYWxsb3cgdXNlcnMgdG8gc2V0IHRoZVxuICogdmFsdWVzIHRoYXQgYXJlIHJldHVybmVkIGZyb20gdGhvc2UgY2FsbHMuIFN0dWIgaXMgaW50ZW5kZWQgdG8gYmVcbiAqIGFuIGF0dHJpYnV0ZSBvZiBhIGNsYXNzIHRoYXQgd2lsbCBkZWZpbmUgdGhlIG1ldGhvZHMgdG8gdHJhY2s6XG4gKlxuICogICAgY2xhc3Mgc3R1YkNvbm4ge1xuICogICAgICAgIHB1YmxpYyByZXR1cm5SZXNwb25zZTogc3RyaW5nID0gW107XG4gKlxuICogICAgICAgIGNvbnN0cnVjdG9yKFxuICogICAgICAgICAgICBwdWJsaWMgc3R1YjogU3R1YiA9IG5ldyBTdHViKCkpIHt9O1xuICpcbiAqICAgICAgICBwdWJsaWMgc2VuZChyZXF1ZXN0OiBzdHJpbmcpOiBzdHJpbmcge1xuICogICAgICAgICAgICB0aGlzLnN0dWIuYWRkQ2FsbCgnc2VuZCcsIHJlcXVlc3QpO1xuICogICAgICAgICAgICB0aGlzLnN0dWIubWF5YmVFcnIoKTtcbiAqICAgICAgICAgICAgcmV0dXJuIHRoaXMucmV0dXJuUmVzcG9uc2U7XG4gKiAgICAgICAgfVxuICogICAgfVxuICpcbiAqIEFzIGRlbW9uc3RyYXRlZCBpbiB0aGUgZXhhbXBsZSwgYnkgc3VwcG9ydGluZyBhIHN0dWIgYXJndW1lbnQsIGFcbiAqIHNpbmdsZSBTdHViIG1heSBiZSBzaGFyZWQgYmV0d2VlbiBtdWx0aXBsZSBzdHVicy4gIFRoaXMgYWxsb3dzIHlvdVxuICogdG8gY2FwdHVyZSB0aGUgY2FsbHMgb2YgYWxsIHN0dWJzIGluIGFic29sdXRlIG9yZGVyLlxuICpcbiAqIEV4Y2VwdGlvbnMgYXJlIHNldCB0aHJvdWdoIHNldEVycm9ycygpLiAgU2V0IHRoZW0gdG8gdGhlIGVycm9ycyAob3JcbiAqIGxhY2sgdGhlcmVvZiwgaS5lLiBudWxsKSB5b3Ugd2FudCByYWlzZWQuICBUaGVcbiAqIGBtYXliZUVycmAgbWV0aG9kIHJhaXNlcyB0aGUgc2V0IGV4Y2VwdGlvbnMgKGlmIGFueSkgaW4gc2VxdWVuY2UsXG4gKiBmYWxsaW5nIGJhY2sgdG8gbnVsbCB3aGVuIHRoZSBzZXF1ZW5jZSBpcyBleGhhdXN0ZWQuICBUaHVzIGVhY2hcbiAqIHN0dWJiZWQgbWV0aG9kIHNob3VsZCBjYWxsIGBtYXliZUVycmAgdG8gZ2V0IGl0cyBleGNlcHRpb24uXG4gKiBgcG9wTm9FcnJvcmAgaXMgYW4gYWx0ZXJuYXRpdmUgaWYgdGhlIG1ldGhvZCBzaG91bGQgbmV2ZXIgdGhyb3cuXG4gKlxuICogVG8gdmFsaWRhdGUgY2FsbHMgbWFkZSB0byB0aGUgc3R1YiBpbiBhIHRlc3QgY2FsbCB0aGUgQ2hlY2tDYWxscyAob3JcbiAqIENoZWNrQ2FsbCkgbWV0aG9kOlxuICpcbiAqICAgIHN0dWIuY2hlY2tDYWxscyhbXG4gKiAgICAgICAgbmV3IFN0dWJDYWxsKCdzZW5kJywgW1xuICogICAgICAgICAgICBleHBlY3RlZFxuICogICAgICAgIF0pXG4gKiAgICBdKTtcbiAqXG4gKiAgICBzLnN0dWIuQ2hlY2tDYWxsKDAsICdzZW5kJywgZXhwZWN0ZWQpO1xuICpcbiAqIE5vdCBvbmx5IGlzIFN0dWIgdXNlZnVsIGZvciBidWlsZGluZyBhbiBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb24gdG9cbiAqIHVzZSBpbiB0ZXN0aW5nIChlLmcuIGEgbmV0d29yayBBUEkgY2xpZW50KSwgaXQgaXMgYWxzbyB1c2VmdWwgaW5cbiAqIHJlZ3VsYXIgZnVuY3Rpb24gcGF0Y2hpbmcgc2l0dWF0aW9uczpcbiAqXG4gKiAgICBjbGFzcyBNeVN0dWIge1xuICogICAgICAgIHB1YmxpYyBzdHViOiBTdHViO1xuICpcbiAqICAgICAgICBwdWJsaWMgc29tZUZ1bmMoYXJnOiBhbnkpIHtcbiAqICAgICAgICAgICAgdGhpcy5zdHViLmFkZENhbGwoJ3NvbWVGdW5jJywgYXJnKVxuICogICAgICAgICAgICB0aGlzLnN0dWIubWF5YmVFcnIoKTtcbiAqICAgICAgICB9XG4gKiAgICB9XG4gKlxuICogICAgY29uc3QgcyA9IG5ldyBNeVN0dWIoKTtcbiAqICAgIG1vZC5mdW5jID0gcy5zb21lRnVuYzsgIC8vIG1vbmtleS1wYXRjaFxuICpcbiAqIFRoaXMgYWxsb3dzIGZvciBlYXNpbHkgbW9uaXRvcmluZyB0aGUgYXJncyBwYXNzZWQgdG8gdGhlIHBhdGNoZWRcbiAqIGZ1bmMsIGFzIHdlbGwgYXMgY29udHJvbGxpbmcgdGhlIHJldHVybiB2YWx1ZSBmcm9tIHRoZSBmdW5jIGluIGFcbiAqIGNsZWFuIG1hbm5lciAoYnkgc2ltcGx5IHNldHRpbmcgdGhlIGNvcnJlY3QgZmllbGQgb24gdGhlIHN0dWIpLlxuICovXG4vLyBCYXNlZCBvbjogIGh0dHBzOi8vZ2l0aHViLmNvbS9qdWp1L3Rlc3RpbmcvYmxvYi9tYXN0ZXIvc3R1Yi5nb1xuY2xhc3MgU3R1YiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2NhbGxzID0gW107XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IFtdO1xuICAgIH1cbiAgICBnZXQgY2FsbHMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYWxscy5zbGljZSgwKTsgLy8gYSBjb3B5XG4gICAgfVxuICAgIGdldCBlcnJvcnMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lcnJvcnMuc2xpY2UoMCk7IC8vIGEgY29weVxuICAgIH1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gYmVmb3JlIGV4ZWN1dGlvbjpcbiAgICAvKlxuICAgICAqIHNldEVycm9ycyBzZXRzIHRoZSBzZXF1ZW5jZSBvZiBleGNlcHRpb25zIGZvciB0aGUgc3R1Yi4gRWFjaCBjYWxsXG4gICAgICogdG8gbWF5YmVFcnIgKHRodXMgZWFjaCBzdHViIG1ldGhvZCBjYWxsKSBwb3BzIGFuIGVycm9yIG9mZiB0aGVcbiAgICAgKiBmcm9udC4gIFNvIGZyb250bG9hZGluZyBudWxsIGhlcmUgd2lsbCBhbGxvdyBjYWxscyB0byBwYXNzLFxuICAgICAqIGZvbGxvd2VkIGJ5IGEgZmFpbHVyZS5cbiAgICAgKi9cbiAgICBzZXRFcnJvcnMoLi4uZXJyb3JzKSB7XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IGVycm9ycztcbiAgICB9XG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIGR1cmluZyBleGVjdXRpb246XG4gICAgLy8gYWRkQ2FsbCByZWNvcmRzIGEgc3R1YmJlZCBmdW5jdGlvbiBjYWxsIGZvciBsYXRlciBpbnNwZWN0aW9uXG4gICAgLy8gdXNpbmcgdGhlIGNoZWNrQ2FsbHMgbWV0aG9kLiAgQWxsIHN0dWJiZWQgZnVuY3Rpb25zIHNob3VsZCBjYWxsXG4gICAgLy8gYWRkQ2FsbC5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgYWRkQ2FsbChuYW1lLCAuLi5hcmdzKSB7XG4gICAgICAgIHRoaXMuX2NhbGxzLnB1c2gobmV3IFN0dWJDYWxsKG5hbWUsIGFyZ3MpKTtcbiAgICB9XG4gICAgLypcbiAgICAgKiBSZXNldENhbGxzIGVyYXNlcyB0aGUgY2FsbHMgcmVjb3JkZWQgYnkgdGhpcyBTdHViLlxuICAgICAqL1xuICAgIHJlc2V0Q2FsbHMoKSB7XG4gICAgICAgIHRoaXMuX2NhbGxzID0gW107XG4gICAgfVxuICAgIC8qXG4gICAgICogbWF5YmVFcnIgcmV0dXJucyB0aGUgZXJyb3IgdGhhdCBzaG91bGQgYmUgcmV0dXJuZWQgb24gdGhlIG50aFxuICAgICAqIGNhbGwgdG8gYW55IG1ldGhvZCBvbiB0aGUgc3R1Yi4gIEl0IHNob3VsZCBiZSBjYWxsZWQgZm9yIHRoZVxuICAgICAqIGVycm9yIHJldHVybiBpbiBhbGwgc3R1YmJlZCBtZXRob2RzLlxuICAgICAqL1xuICAgIG1heWJlRXJyKCkge1xuICAgICAgICBpZiAodGhpcy5fZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuX2Vycm9yc1swXTtcbiAgICAgICAgdGhpcy5fZXJyb3JzLnNoaWZ0KCk7XG4gICAgICAgIGlmIChlcnIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKlxuICAgICAqIHBvcE5vRXJyIHBvcHMgb2ZmIHRoZSBuZXh0IGVycm9yIHdpdGhvdXQgcmV0dXJuaW5nIGl0LiAgSWYgdGhlXG4gICAgICogZXJyb3IgaXMgbm90IG51bGwgdGhlbiBwb3BOb0VyciB3aWxsIGZhaWwuXG4gICAgICpcbiAgICAgKiBwb3BOb0VyciBpcyB1c2VmdWwgaW4gc3R1YiBtZXRob2RzIHRoYXQgZG8gbm90IHJldHVybiBhbiBlcnJvci5cbiAgICAgKi9cbiAgICBwb3BOb0VycigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2Vycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlcnIgPSB0aGlzLl9lcnJvcnNbMF07XG4gICAgICAgIHRoaXMuX2Vycm9ycy5zaGlmdCgpO1xuICAgICAgICBpZiAoZXJyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjaGFpXzEuYXNzZXJ0LmZhaWwobnVsbCwgZXJyLCAndGhlIG5leHQgZXJyIHdhcyB1bmV4cGVjdGVkbHkgbm90IG51bGwnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gYWZ0ZXIgZXhlY3V0aW9uOlxuICAgIC8qXG4gICAgICogY2hlY2tDYWxscyB2ZXJpZmllcyB0aGF0IHRoZSBoaXN0b3J5IG9mIGNhbGxzIG9uIHRoZSBzdHViJ3NcbiAgICAgKiBtZXRob2RzIG1hdGNoZXMgdGhlIGV4cGVjdGVkIGNhbGxzLlxuICAgICAqL1xuICAgIGNoZWNrQ2FsbHMoZXhwZWN0ZWQpIHtcbiAgICAgICAgY2hhaV8xLmFzc2VydC5kZWVwRXF1YWwodGhpcy5fY2FsbHMsIGV4cGVjdGVkKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXN1c3BpY2lvdXMtY29tbWVudFxuICAgIC8vIFRPRE86IEFkZCBjaGVja0NhbGxzVW5vcmRlcmVkP1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdXNwaWNpb3VzLWNvbW1lbnRcbiAgICAvLyBUT0RPOiBBZGQgY2hlY2tDYWxsc1N1YnNldD9cbiAgICAvKlxuICAgICAqIGNoZWNrQ2FsbCBjaGVja3MgdGhlIHJlY29yZGVkIGNhbGwgYXQgdGhlIGdpdmVuIGluZGV4IGFnYWluc3QgdGhlXG4gICAgICogcHJvdmlkZWQgdmFsdWVzLiBpIElmIHRoZSBpbmRleCBpcyBvdXQgb2YgYm91bmRzIHRoZW4gdGhlIGNoZWNrXG4gICAgICogZmFpbHMuXG4gICAgICovXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIGNoZWNrQ2FsbChpbmRleCwgZnVuY05hbWUsIC4uLmFyZ3MpIHtcbiAgICAgICAgY2hhaV8xLmFzc2VydC5pc0JlbG93KGluZGV4LCB0aGlzLl9jYWxscy5sZW5ndGgpO1xuICAgICAgICBjb25zdCBleHBlY3RlZCA9IG5ldyBTdHViQ2FsbChmdW5jTmFtZSwgYXJncyk7XG4gICAgICAgIGNoYWlfMS5hc3NlcnQuZGVlcEVxdWFsKHRoaXMuX2NhbGxzW2luZGV4XSwgZXhwZWN0ZWQpO1xuICAgIH1cbiAgICAvKlxuICAgICAqIGNoZWNrQ2FsbE5hbWVzIHZlcmlmaWVzIHRoYXQgdGhlIGluLW9yZGVyIGxpc3Qgb2YgY2FsbGVkIG1ldGhvZFxuICAgICAqIG5hbWVzIG1hdGNoZXMgdGhlIGV4cGVjdGVkIGNhbGxzLlxuICAgICAqL1xuICAgIGNoZWNrQ2FsbE5hbWVzKC4uLmV4cGVjdGVkKSB7XG4gICAgICAgIGNvbnN0IG5hbWVzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgY2FsbCBvZiB0aGlzLl9jYWxscykge1xuICAgICAgICAgICAgbmFtZXMucHVzaChjYWxsLmZ1bmNOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBjaGFpXzEuYXNzZXJ0LmRlZXBFcXVhbChuYW1lcywgZXhwZWN0ZWQpO1xuICAgIH1cbiAgICAvLyBjaGVja05vQ2FsbHMgdmVyaWZpZXMgdGhhdCBub25lIG9mIHRoZSBzdHViJ3MgbWV0aG9kcyBoYXZlIGJlZW5cbiAgICAvLyBjYWxsZWQuXG4gICAgY2hlY2tOb0NhbGxzKCkge1xuICAgICAgICBjaGFpXzEuYXNzZXJ0LmVxdWFsKHRoaXMuX2NhbGxzLmxlbmd0aCwgMCk7XG4gICAgfVxuICAgIC8vIGNoZWNrRXJyb3JzIHZlcmlmaWVzIHRoYXQgdGhlIGxpc3Qgb2YgdW51c2VkIGV4Y2VwdGlvbnMgaXMgZW1wdHkuXG4gICAgY2hlY2tFcnJvcnMoKSB7XG4gICAgICAgIGNoYWlfMS5hc3NlcnQuZXF1YWwodGhpcy5fZXJyb3JzLmxlbmd0aCwgMCk7XG4gICAgfVxufVxuZXhwb3J0cy5TdHViID0gU3R1Yjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN0dWIuanMubWFwIl19