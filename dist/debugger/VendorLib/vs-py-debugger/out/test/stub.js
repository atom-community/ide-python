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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0dWIuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJjaGFpXzEiLCJyZXF1aXJlIiwiU3R1YkNhbGwiLCJjb25zdHJ1Y3RvciIsImZ1bmNOYW1lIiwiYXJncyIsIlN0dWIiLCJfY2FsbHMiLCJfZXJyb3JzIiwiY2FsbHMiLCJzbGljZSIsImVycm9ycyIsInNldEVycm9ycyIsImFkZENhbGwiLCJuYW1lIiwicHVzaCIsInJlc2V0Q2FsbHMiLCJtYXliZUVyciIsImxlbmd0aCIsImVyciIsInNoaWZ0IiwicG9wTm9FcnIiLCJhc3NlcnQiLCJmYWlsIiwiY2hlY2tDYWxscyIsImV4cGVjdGVkIiwiZGVlcEVxdWFsIiwiY2hlY2tDYWxsIiwiaW5kZXgiLCJpc0JlbG93IiwiY2hlY2tDYWxsTmFtZXMiLCJuYW1lcyIsImNhbGwiLCJjaGVja05vQ2FsbHMiLCJlcXVhbCIsImNoZWNrRXJyb3JzIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0M7O0FBQ0EsTUFBTUMsTUFBTSxHQUFHQyxPQUFPLENBQUMsTUFBRCxDQUF0QjtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsTUFBTUMsUUFBTixDQUFlO0FBQ1hDLEVBQUFBLFdBQVcsRUFDWDtBQUNBQyxFQUFBQSxRQUZXLEVBR1g7QUFDQTtBQUNBO0FBQ0FDLEVBQUFBLElBTlcsRUFNTDtBQUNGLFNBQUtELFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0EsU0FBS0MsSUFBTCxHQUFZQSxJQUFaO0FBQ0g7O0FBVlU7O0FBWWZQLE9BQU8sQ0FBQ0ksUUFBUixHQUFtQkEsUUFBbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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USxHQUFHLElBQUl2QixRQUFKLENBQWFFLFFBQWIsRUFBdUJDLElBQXZCLENBQWpCO0FBQ0FMLElBQUFBLE1BQU0sQ0FBQ3NCLE1BQVAsQ0FBY0ksU0FBZCxDQUF3QixLQUFLbkIsTUFBTCxDQUFZcUIsS0FBWixDQUF4QixFQUE0Q0gsUUFBNUM7QUFDSDtBQUNEO0FBQ0o7QUFDQTtBQUNBOzs7QUFDSUssRUFBQUEsY0FBYyxDQUFDLEdBQUdMLFFBQUosRUFBYztBQUN4QixVQUFNTSxLQUFLLEdBQUcsRUFBZDs7QUFDQSxTQUFLLE1BQU1DLElBQVgsSUFBbUIsS0FBS3pCLE1BQXhCLEVBQWdDO0FBQzVCd0IsTUFBQUEsS0FBSyxDQUFDaEIsSUFBTixDQUFXaUIsSUFBSSxDQUFDNUIsUUFBaEI7QUFDSDs7QUFDREosSUFBQUEsTUFBTSxDQUFDc0IsTUFBUCxDQUFjSSxTQUFkLENBQXdCSyxLQUF4QixFQUErQk4sUUFBL0I7QUFDSCxHQXRHTSxDQXVHUDtBQUNBOzs7QUFDQVEsRUFBQUEsWUFBWSxHQUFHO0FBQ1hqQyxJQUFBQSxNQUFNLENBQUNzQixNQUFQLENBQWNZLEtBQWQsQ0FBb0IsS0FBSzNCLE1BQUwsQ0FBWVcsTUFBaEMsRUFBd0MsQ0FBeEM7QUFDSCxHQTNHTSxDQTRHUDs7O0FBQ0FpQixFQUFBQSxXQUFXLEdBQUc7QUFDVm5DLElBQUFBLE1BQU0sQ0FBQ3NCLE1BQVAsQ0FBY1ksS0FBZCxDQUFvQixLQUFLMUIsT0FBTCxDQUFhVSxNQUFqQyxFQUF5QyxDQUF6QztBQUNIOztBQS9HTTs7QUFpSFhwQixPQUFPLENBQUNRLElBQVIsR0FBZUEsSUFBZiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbid1c2Ugc3RyaWN0JztcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjaGFpXzEgPSByZXF1aXJlKFwiY2hhaVwiKTtcclxuLyoqXHJcbiAqIFN0dWJDYWxsIHJlY29yZHMgdGhlIG5hbWUgb2YgYSBjYWxsZWQgZnVuY3Rpb24gYW5kIHRoZSBwYXNzZWQgYXJncy5cclxuICovXHJcbmNsYXNzIFN0dWJDYWxsIHtcclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgLy8gRnVuY25hbWUgaXMgdGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgd2FzIGNhbGxlZC5cclxuICAgIGZ1bmNOYW1lLCBcclxuICAgIC8vIEFyZ3MgaXMgdGhlIHNldCBvZiBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmdW5jdGlvbi4gVGhleSBhcmVcclxuICAgIC8vIGluIHRoZSBzYW1lIG9yZGVyIGFzIHRoZSBmdW5jdGlvbidzIHBhcmFtZXRlcnMuXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICBhcmdzKSB7XHJcbiAgICAgICAgdGhpcy5mdW5jTmFtZSA9IGZ1bmNOYW1lO1xyXG4gICAgICAgIHRoaXMuYXJncyA9IGFyZ3M7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5TdHViQ2FsbCA9IFN0dWJDYWxsO1xyXG4vKipcclxuICogU3R1YiBpcyB1c2VkIGluIHRlc3RpbmcgdG8gc3RhbmQgaW4gZm9yIHNvbWUgb3RoZXIgdmFsdWUsIHRvIHJlY29yZFxyXG4gKiBhbGwgY2FsbHMgdG8gc3R1YmJlZCBtZXRob2RzL2Z1bmN0aW9ucywgYW5kIHRvIGFsbG93IHVzZXJzIHRvIHNldCB0aGVcclxuICogdmFsdWVzIHRoYXQgYXJlIHJldHVybmVkIGZyb20gdGhvc2UgY2FsbHMuIFN0dWIgaXMgaW50ZW5kZWQgdG8gYmVcclxuICogYW4gYXR0cmlidXRlIG9mIGEgY2xhc3MgdGhhdCB3aWxsIGRlZmluZSB0aGUgbWV0aG9kcyB0byB0cmFjazpcclxuICpcclxuICogICAgY2xhc3Mgc3R1YkNvbm4ge1xyXG4gKiAgICAgICAgcHVibGljIHJldHVyblJlc3BvbnNlOiBzdHJpbmcgPSBbXTtcclxuICpcclxuICogICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gKiAgICAgICAgICAgIHB1YmxpYyBzdHViOiBTdHViID0gbmV3IFN0dWIoKSkge307XHJcbiAqXHJcbiAqICAgICAgICBwdWJsaWMgc2VuZChyZXF1ZXN0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gKiAgICAgICAgICAgIHRoaXMuc3R1Yi5hZGRDYWxsKCdzZW5kJywgcmVxdWVzdCk7XHJcbiAqICAgICAgICAgICAgdGhpcy5zdHViLm1heWJlRXJyKCk7XHJcbiAqICAgICAgICAgICAgcmV0dXJuIHRoaXMucmV0dXJuUmVzcG9uc2U7XHJcbiAqICAgICAgICB9XHJcbiAqICAgIH1cclxuICpcclxuICogQXMgZGVtb25zdHJhdGVkIGluIHRoZSBleGFtcGxlLCBieSBzdXBwb3J0aW5nIGEgc3R1YiBhcmd1bWVudCwgYVxyXG4gKiBzaW5nbGUgU3R1YiBtYXkgYmUgc2hhcmVkIGJldHdlZW4gbXVsdGlwbGUgc3R1YnMuICBUaGlzIGFsbG93cyB5b3VcclxuICogdG8gY2FwdHVyZSB0aGUgY2FsbHMgb2YgYWxsIHN0dWJzIGluIGFic29sdXRlIG9yZGVyLlxyXG4gKlxyXG4gKiBFeGNlcHRpb25zIGFyZSBzZXQgdGhyb3VnaCBzZXRFcnJvcnMoKS4gIFNldCB0aGVtIHRvIHRoZSBlcnJvcnMgKG9yXHJcbiAqIGxhY2sgdGhlcmVvZiwgaS5lLiBudWxsKSB5b3Ugd2FudCByYWlzZWQuICBUaGVcclxuICogYG1heWJlRXJyYCBtZXRob2QgcmFpc2VzIHRoZSBzZXQgZXhjZXB0aW9ucyAoaWYgYW55KSBpbiBzZXF1ZW5jZSxcclxuICogZmFsbGluZyBiYWNrIHRvIG51bGwgd2hlbiB0aGUgc2VxdWVuY2UgaXMgZXhoYXVzdGVkLiAgVGh1cyBlYWNoXHJcbiAqIHN0dWJiZWQgbWV0aG9kIHNob3VsZCBjYWxsIGBtYXliZUVycmAgdG8gZ2V0IGl0cyBleGNlcHRpb24uXHJcbiAqIGBwb3BOb0Vycm9yYCBpcyBhbiBhbHRlcm5hdGl2ZSBpZiB0aGUgbWV0aG9kIHNob3VsZCBuZXZlciB0aHJvdy5cclxuICpcclxuICogVG8gdmFsaWRhdGUgY2FsbHMgbWFkZSB0byB0aGUgc3R1YiBpbiBhIHRlc3QgY2FsbCB0aGUgQ2hlY2tDYWxscyAob3JcclxuICogQ2hlY2tDYWxsKSBtZXRob2Q6XHJcbiAqXHJcbiAqICAgIHN0dWIuY2hlY2tDYWxscyhbXHJcbiAqICAgICAgICBuZXcgU3R1YkNhbGwoJ3NlbmQnLCBbXHJcbiAqICAgICAgICAgICAgZXhwZWN0ZWRcclxuICogICAgICAgIF0pXHJcbiAqICAgIF0pO1xyXG4gKlxyXG4gKiAgICBzLnN0dWIuQ2hlY2tDYWxsKDAsICdzZW5kJywgZXhwZWN0ZWQpO1xyXG4gKlxyXG4gKiBOb3Qgb25seSBpcyBTdHViIHVzZWZ1bCBmb3IgYnVpbGRpbmcgYW4gaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uIHRvXHJcbiAqIHVzZSBpbiB0ZXN0aW5nIChlLmcuIGEgbmV0d29yayBBUEkgY2xpZW50KSwgaXQgaXMgYWxzbyB1c2VmdWwgaW5cclxuICogcmVndWxhciBmdW5jdGlvbiBwYXRjaGluZyBzaXR1YXRpb25zOlxyXG4gKlxyXG4gKiAgICBjbGFzcyBNeVN0dWIge1xyXG4gKiAgICAgICAgcHVibGljIHN0dWI6IFN0dWI7XHJcbiAqXHJcbiAqICAgICAgICBwdWJsaWMgc29tZUZ1bmMoYXJnOiBhbnkpIHtcclxuICogICAgICAgICAgICB0aGlzLnN0dWIuYWRkQ2FsbCgnc29tZUZ1bmMnLCBhcmcpXHJcbiAqICAgICAgICAgICAgdGhpcy5zdHViLm1heWJlRXJyKCk7XHJcbiAqICAgICAgICB9XHJcbiAqICAgIH1cclxuICpcclxuICogICAgY29uc3QgcyA9IG5ldyBNeVN0dWIoKTtcclxuICogICAgbW9kLmZ1bmMgPSBzLnNvbWVGdW5jOyAgLy8gbW9ua2V5LXBhdGNoXHJcbiAqXHJcbiAqIFRoaXMgYWxsb3dzIGZvciBlYXNpbHkgbW9uaXRvcmluZyB0aGUgYXJncyBwYXNzZWQgdG8gdGhlIHBhdGNoZWRcclxuICogZnVuYywgYXMgd2VsbCBhcyBjb250cm9sbGluZyB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIGZ1bmMgaW4gYVxyXG4gKiBjbGVhbiBtYW5uZXIgKGJ5IHNpbXBseSBzZXR0aW5nIHRoZSBjb3JyZWN0IGZpZWxkIG9uIHRoZSBzdHViKS5cclxuICovXHJcbi8vIEJhc2VkIG9uOiAgaHR0cHM6Ly9naXRodWIuY29tL2p1anUvdGVzdGluZy9ibG9iL21hc3Rlci9zdHViLmdvXHJcbmNsYXNzIFN0dWIge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbHMgPSBbXTtcclxuICAgICAgICB0aGlzLl9lcnJvcnMgPSBbXTtcclxuICAgIH1cclxuICAgIGdldCBjYWxscygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY2FsbHMuc2xpY2UoMCk7IC8vIGEgY29weVxyXG4gICAgfVxyXG4gICAgZ2V0IGVycm9ycygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3JzLnNsaWNlKDApOyAvLyBhIGNvcHlcclxuICAgIH1cclxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgIC8vIGJlZm9yZSBleGVjdXRpb246XHJcbiAgICAvKlxyXG4gICAgICogc2V0RXJyb3JzIHNldHMgdGhlIHNlcXVlbmNlIG9mIGV4Y2VwdGlvbnMgZm9yIHRoZSBzdHViLiBFYWNoIGNhbGxcclxuICAgICAqIHRvIG1heWJlRXJyICh0aHVzIGVhY2ggc3R1YiBtZXRob2QgY2FsbCkgcG9wcyBhbiBlcnJvciBvZmYgdGhlXHJcbiAgICAgKiBmcm9udC4gIFNvIGZyb250bG9hZGluZyBudWxsIGhlcmUgd2lsbCBhbGxvdyBjYWxscyB0byBwYXNzLFxyXG4gICAgICogZm9sbG93ZWQgYnkgYSBmYWlsdXJlLlxyXG4gICAgICovXHJcbiAgICBzZXRFcnJvcnMoLi4uZXJyb3JzKSB7XHJcbiAgICAgICAgdGhpcy5fZXJyb3JzID0gZXJyb3JzO1xyXG4gICAgfVxyXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgLy8gZHVyaW5nIGV4ZWN1dGlvbjpcclxuICAgIC8vIGFkZENhbGwgcmVjb3JkcyBhIHN0dWJiZWQgZnVuY3Rpb24gY2FsbCBmb3IgbGF0ZXIgaW5zcGVjdGlvblxyXG4gICAgLy8gdXNpbmcgdGhlIGNoZWNrQ2FsbHMgbWV0aG9kLiAgQWxsIHN0dWJiZWQgZnVuY3Rpb25zIHNob3VsZCBjYWxsXHJcbiAgICAvLyBhZGRDYWxsLlxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgYWRkQ2FsbChuYW1lLCAuLi5hcmdzKSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbHMucHVzaChuZXcgU3R1YkNhbGwobmFtZSwgYXJncykpO1xyXG4gICAgfVxyXG4gICAgLypcclxuICAgICAqIFJlc2V0Q2FsbHMgZXJhc2VzIHRoZSBjYWxscyByZWNvcmRlZCBieSB0aGlzIFN0dWIuXHJcbiAgICAgKi9cclxuICAgIHJlc2V0Q2FsbHMoKSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbHMgPSBbXTtcclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgKiBtYXliZUVyciByZXR1cm5zIHRoZSBlcnJvciB0aGF0IHNob3VsZCBiZSByZXR1cm5lZCBvbiB0aGUgbnRoXHJcbiAgICAgKiBjYWxsIHRvIGFueSBtZXRob2Qgb24gdGhlIHN0dWIuICBJdCBzaG91bGQgYmUgY2FsbGVkIGZvciB0aGVcclxuICAgICAqIGVycm9yIHJldHVybiBpbiBhbGwgc3R1YmJlZCBtZXRob2RzLlxyXG4gICAgICovXHJcbiAgICBtYXliZUVycigpIHtcclxuICAgICAgICBpZiAodGhpcy5fZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuX2Vycm9yc1swXTtcclxuICAgICAgICB0aGlzLl9lcnJvcnMuc2hpZnQoKTtcclxuICAgICAgICBpZiAoZXJyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKlxyXG4gICAgICogcG9wTm9FcnIgcG9wcyBvZmYgdGhlIG5leHQgZXJyb3Igd2l0aG91dCByZXR1cm5pbmcgaXQuICBJZiB0aGVcclxuICAgICAqIGVycm9yIGlzIG5vdCBudWxsIHRoZW4gcG9wTm9FcnIgd2lsbCBmYWlsLlxyXG4gICAgICpcclxuICAgICAqIHBvcE5vRXJyIGlzIHVzZWZ1bCBpbiBzdHViIG1ldGhvZHMgdGhhdCBkbyBub3QgcmV0dXJuIGFuIGVycm9yLlxyXG4gICAgICovXHJcbiAgICBwb3BOb0VycigpIHtcclxuICAgICAgICBpZiAodGhpcy5fZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuX2Vycm9yc1swXTtcclxuICAgICAgICB0aGlzLl9lcnJvcnMuc2hpZnQoKTtcclxuICAgICAgICBpZiAoZXJyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNoYWlfMS5hc3NlcnQuZmFpbChudWxsLCBlcnIsICd0aGUgbmV4dCBlcnIgd2FzIHVuZXhwZWN0ZWRseSBub3QgbnVsbCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgIC8vIGFmdGVyIGV4ZWN1dGlvbjpcclxuICAgIC8qXHJcbiAgICAgKiBjaGVja0NhbGxzIHZlcmlmaWVzIHRoYXQgdGhlIGhpc3Rvcnkgb2YgY2FsbHMgb24gdGhlIHN0dWInc1xyXG4gICAgICogbWV0aG9kcyBtYXRjaGVzIHRoZSBleHBlY3RlZCBjYWxscy5cclxuICAgICAqL1xyXG4gICAgY2hlY2tDYWxscyhleHBlY3RlZCkge1xyXG4gICAgICAgIGNoYWlfMS5hc3NlcnQuZGVlcEVxdWFsKHRoaXMuX2NhbGxzLCBleHBlY3RlZCk7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tc3VzcGljaW91cy1jb21tZW50XHJcbiAgICAvLyBUT0RPOiBBZGQgY2hlY2tDYWxsc1Vub3JkZXJlZD9cclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdXNwaWNpb3VzLWNvbW1lbnRcclxuICAgIC8vIFRPRE86IEFkZCBjaGVja0NhbGxzU3Vic2V0P1xyXG4gICAgLypcclxuICAgICAqIGNoZWNrQ2FsbCBjaGVja3MgdGhlIHJlY29yZGVkIGNhbGwgYXQgdGhlIGdpdmVuIGluZGV4IGFnYWluc3QgdGhlXHJcbiAgICAgKiBwcm92aWRlZCB2YWx1ZXMuIGkgSWYgdGhlIGluZGV4IGlzIG91dCBvZiBib3VuZHMgdGhlbiB0aGUgY2hlY2tcclxuICAgICAqIGZhaWxzLlxyXG4gICAgICovXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICBjaGVja0NhbGwoaW5kZXgsIGZ1bmNOYW1lLCAuLi5hcmdzKSB7XHJcbiAgICAgICAgY2hhaV8xLmFzc2VydC5pc0JlbG93KGluZGV4LCB0aGlzLl9jYWxscy5sZW5ndGgpO1xyXG4gICAgICAgIGNvbnN0IGV4cGVjdGVkID0gbmV3IFN0dWJDYWxsKGZ1bmNOYW1lLCBhcmdzKTtcclxuICAgICAgICBjaGFpXzEuYXNzZXJ0LmRlZXBFcXVhbCh0aGlzLl9jYWxsc1tpbmRleF0sIGV4cGVjdGVkKTtcclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgKiBjaGVja0NhbGxOYW1lcyB2ZXJpZmllcyB0aGF0IHRoZSBpbi1vcmRlciBsaXN0IG9mIGNhbGxlZCBtZXRob2RcclxuICAgICAqIG5hbWVzIG1hdGNoZXMgdGhlIGV4cGVjdGVkIGNhbGxzLlxyXG4gICAgICovXHJcbiAgICBjaGVja0NhbGxOYW1lcyguLi5leHBlY3RlZCkge1xyXG4gICAgICAgIGNvbnN0IG5hbWVzID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBjYWxsIG9mIHRoaXMuX2NhbGxzKSB7XHJcbiAgICAgICAgICAgIG5hbWVzLnB1c2goY2FsbC5mdW5jTmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNoYWlfMS5hc3NlcnQuZGVlcEVxdWFsKG5hbWVzLCBleHBlY3RlZCk7XHJcbiAgICB9XHJcbiAgICAvLyBjaGVja05vQ2FsbHMgdmVyaWZpZXMgdGhhdCBub25lIG9mIHRoZSBzdHViJ3MgbWV0aG9kcyBoYXZlIGJlZW5cclxuICAgIC8vIGNhbGxlZC5cclxuICAgIGNoZWNrTm9DYWxscygpIHtcclxuICAgICAgICBjaGFpXzEuYXNzZXJ0LmVxdWFsKHRoaXMuX2NhbGxzLmxlbmd0aCwgMCk7XHJcbiAgICB9XHJcbiAgICAvLyBjaGVja0Vycm9ycyB2ZXJpZmllcyB0aGF0IHRoZSBsaXN0IG9mIHVudXNlZCBleGNlcHRpb25zIGlzIGVtcHR5LlxyXG4gICAgY2hlY2tFcnJvcnMoKSB7XHJcbiAgICAgICAgY2hhaV8xLmFzc2VydC5lcXVhbCh0aGlzLl9lcnJvcnMubGVuZ3RoLCAwKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlN0dWIgPSBTdHViO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zdHViLmpzLm1hcCJdfQ==