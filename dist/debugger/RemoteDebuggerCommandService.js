"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observeRemoteDebugCommands = observeRemoteDebugCommands;
exports.observeAttachDebugTargets = observeAttachDebugTargets;

var _http = _interopRequireDefault(require("http"));

var _net = _interopRequireDefault(require("net"));

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

var _log4js = require("log4js");

var _promise = require("@atom-ide-community/nuclide-commons/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let isServerSetup = false;
const debugRequests = new _rxjsCompatUmdMin.Subject();
const attachReady = new Map();
const DEBUGGER_REGISTRY_PORT = 9615;

function observeRemoteDebugCommands() {
  let setupStep;

  if (!isServerSetup) {
    setupStep = _rxjsCompatUmdMin.Observable.fromPromise(setupServer()).ignoreElements();
  } else {
    setupStep = _rxjsCompatUmdMin.Observable.empty();
  }

  return setupStep.concat(debugRequests).publish();
}

function observeAttachDebugTargets() {
  // Validate attach-ready values with the processes with used ports (ready to attach).
  // Note: we can't use process ids because we could be debugging processes inside containers
  // where the process ids don't map to the host running this code.
  return _rxjsCompatUmdMin.Observable.interval(3000).startWith(0).switchMap(() => Promise.all(Array.from(attachReady.values()).map(async target => {
    if (!(await isPortUsed(target.port))) {
      attachReady.delete(target.port);
    }
  }))).map(() => Array.from(attachReady.values())).publish();
}

function isPortUsed(port) {
  const tryConnectPromise = new Promise(resolve => {
    const client = new _net.default.Socket();
    client.once("connect", () => {
      cleanUp();
      resolve(true);
    }).once("error", err => {
      cleanUp();
      resolve(err.code !== "ECONNREFUSED");
    });

    function cleanUp() {
      client.removeAllListeners("connect");
      client.removeAllListeners("error");
      client.end();
      client.destroy();
      client.unref();
    }

    client.connect({
      port,
      host: "127.0.0.1"
    });
  }); // Trying to connect can take multiple seconds, then times out (if the server is busy).
  // Hence, we need to fallback to `true`.

  const connectTimeoutPromise = (0, _promise.sleep)(1000).then(() => true);
  return Promise.race([tryConnectPromise, connectTimeoutPromise]);
}

function setupServer() {
  return new Promise((resolve, reject) => {
    _http.default.createServer((req, res) => {
      if (req.method !== "POST") {
        res.writeHead(500, {
          "Content-Type": "text/html"
        });
        res.end("Invalid request");
      } else {
        let body = "";
        req.on("data", data => {
          body += data;
        });
        req.on("end", () => {
          handleJsonRequest(JSON.parse(body), res);
        });
      }
    }).on("error", reject).listen(DEBUGGER_REGISTRY_PORT, () => {
      isServerSetup = true;
      resolve();
    });
  });
}

function handleJsonRequest(body, res) {
  res.writeHead(200, {
    "Content-Type": "application/json"
  });
  const {
    domain,
    command,
    type
  } = body;
  let success = false;

  if (domain !== "debug" || type !== "python") {
    res.end(JSON.stringify({
      success
    }));
    return;
  }

  if (command === "enable-attach") {
    const port = Number(body.port);
    const {
      options
    } = body;
    const target = {
      port,
      id: options.id,
      localRoot: options.localRoot,
      remoteRoot: options.remoteRoot,
      debugOptions: options.debugOptions
    };
    attachReady.set(port, target);
    (0, _log4js.getLogger)().info("Remote debug target is ready to attach", target);
    success = true;
  } else if (command === "attach") {
    const port = Number(body.port);
    (0, _log4js.getLogger)().info("Remote debug target attach request", body);
    const target = attachReady.get(port);

    if (target !== undefined) {
      debugRequests.next({
        type,
        command,
        target
      });
      success = true;
    }
  }

  res.end(JSON.stringify({
    success
  }));
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlbW90ZURlYnVnZ2VyQ29tbWFuZFNlcnZpY2UuanMiXSwibmFtZXMiOlsiaXNTZXJ2ZXJTZXR1cCIsImRlYnVnUmVxdWVzdHMiLCJTdWJqZWN0IiwiYXR0YWNoUmVhZHkiLCJNYXAiLCJERUJVR0dFUl9SRUdJU1RSWV9QT1JUIiwib2JzZXJ2ZVJlbW90ZURlYnVnQ29tbWFuZHMiLCJzZXR1cFN0ZXAiLCJPYnNlcnZhYmxlIiwiZnJvbVByb21pc2UiLCJzZXR1cFNlcnZlciIsImlnbm9yZUVsZW1lbnRzIiwiZW1wdHkiLCJjb25jYXQiLCJwdWJsaXNoIiwib2JzZXJ2ZUF0dGFjaERlYnVnVGFyZ2V0cyIsImludGVydmFsIiwic3RhcnRXaXRoIiwic3dpdGNoTWFwIiwiUHJvbWlzZSIsImFsbCIsIkFycmF5IiwiZnJvbSIsInZhbHVlcyIsIm1hcCIsInRhcmdldCIsImlzUG9ydFVzZWQiLCJwb3J0IiwiZGVsZXRlIiwidHJ5Q29ubmVjdFByb21pc2UiLCJyZXNvbHZlIiwiY2xpZW50IiwibmV0IiwiU29ja2V0Iiwib25jZSIsImNsZWFuVXAiLCJlcnIiLCJjb2RlIiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwiZW5kIiwiZGVzdHJveSIsInVucmVmIiwiY29ubmVjdCIsImhvc3QiLCJjb25uZWN0VGltZW91dFByb21pc2UiLCJ0aGVuIiwicmFjZSIsInJlamVjdCIsImh0dHAiLCJjcmVhdGVTZXJ2ZXIiLCJyZXEiLCJyZXMiLCJtZXRob2QiLCJ3cml0ZUhlYWQiLCJib2R5Iiwib24iLCJkYXRhIiwiaGFuZGxlSnNvblJlcXVlc3QiLCJKU09OIiwicGFyc2UiLCJsaXN0ZW4iLCJkb21haW4iLCJjb21tYW5kIiwidHlwZSIsInN1Y2Nlc3MiLCJzdHJpbmdpZnkiLCJOdW1iZXIiLCJvcHRpb25zIiwiaWQiLCJsb2NhbFJvb3QiLCJyZW1vdGVSb290IiwiZGVidWdPcHRpb25zIiwic2V0IiwiaW5mbyIsImdldCIsInVuZGVmaW5lZCIsIm5leHQiXSwibWFwcGluZ3Mi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QUdqQnJDLFFBQUFBO0FBSGlCLE9BQW5CO0FBS0F1QyxNQUFBQSxPQUFPLEdBQUcsSUFBVjtBQUNEO0FBQ0Y7O0FBQ0RiLEVBQUFBLEdBQUcsQ0FBQ1osR0FBSixDQUFRbUIsSUFBSSxDQUFDTyxTQUFMLENBQWU7QUFBRUQsSUFBQUE7QUFBRixHQUFmLENBQVI7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgQ29ubmVjdGFibGVPYnNlcnZhYmxlIH0gZnJvbSBcInJ4anMtY29tcGF0L2J1bmRsZXMvcnhqcy1jb21wYXQudW1kLm1pbi5qc1wiXG5cbmltcG9ydCBodHRwIGZyb20gXCJodHRwXCJcbmltcG9ydCBuZXQgZnJvbSBcIm5ldFwiXG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBTdWJqZWN0IH0gZnJvbSBcInJ4anMtY29tcGF0L2J1bmRsZXMvcnhqcy1jb21wYXQudW1kLm1pbi5qc1wiXG5pbXBvcnQgeyBnZXRMb2dnZXIgfSBmcm9tIFwibG9nNGpzXCJcbmltcG9ydCB7IHNsZWVwIH0gZnJvbSBcIkBhdG9tLWlkZS1jb21tdW5pdHkvbnVjbGlkZS1jb21tb25zL3Byb21pc2VcIlxuXG5sZXQgaXNTZXJ2ZXJTZXR1cCA9IGZhbHNlXG5cbmV4cG9ydCB0eXBlIFJlbW90ZURlYnVnQ29tbWFuZFJlcXVlc3QgPSB7XG4gIHR5cGU6IFwicHl0aG9uXCIsXG4gIGNvbW1hbmQ6IFwiYXR0YWNoXCIsXG4gIHRhcmdldDogUHl0aG9uRGVidWdnZXJBdHRhY2hUYXJnZXQsXG59XG5cbmV4cG9ydCB0eXBlIFB5dGhvbkRlYnVnZ2VyQXR0YWNoVGFyZ2V0ID0ge1xuICBwb3J0OiBudW1iZXIsXG4gIGxvY2FsUm9vdDogP3N0cmluZyxcbiAgcmVtb3RlUm9vdDogP3N0cmluZyxcbiAgZGVidWdPcHRpb25zOiA/QXJyYXk8c3RyaW5nPixcbiAgaWQ6ID9zdHJpbmcsXG59XG5cbmNvbnN0IGRlYnVnUmVxdWVzdHM6IFN1YmplY3Q8UmVtb3RlRGVidWdDb21tYW5kUmVxdWVzdD4gPSBuZXcgU3ViamVjdCgpXG5jb25zdCBhdHRhY2hSZWFkeTogTWFwPG51bWJlciwgUHl0aG9uRGVidWdnZXJBdHRhY2hUYXJnZXQ+ID0gbmV3IE1hcCgpXG5jb25zdCBERUJVR0dFUl9SRUdJU1RSWV9QT1JUID0gOTYxNVxuXG5leHBvcnQgZnVuY3Rpb24gb2JzZXJ2ZVJlbW90ZURlYnVnQ29tbWFuZHMoKTogQ29ubmVjdGFibGVPYnNlcnZhYmxlPFJlbW90ZURlYnVnQ29tbWFuZFJlcXVlc3Q+IHtcbiAgbGV0IHNldHVwU3RlcFxuICBpZiAoIWlzU2VydmVyU2V0dXApIHtcbiAgICBzZXR1cFN0ZXAgPSBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKHNldHVwU2VydmVyKCkpLmlnbm9yZUVsZW1lbnRzKClcbiAgfSBlbHNlIHtcbiAgICBzZXR1cFN0ZXAgPSBPYnNlcnZhYmxlLmVtcHR5KClcbiAgfVxuICByZXR1cm4gc2V0dXBTdGVwLmNvbmNhdChkZWJ1Z1JlcXVlc3RzKS5wdWJsaXNoKClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9ic2VydmVBdHRhY2hEZWJ1Z1RhcmdldHMoKTogQ29ubmVjdGFibGVPYnNlcnZhYmxlPEFycmF5PFB5dGhvbkRlYnVnZ2VyQXR0YWNoVGFyZ2V0Pj4ge1xuICAvLyBWYWxpZGF0ZSBhdHRhY2gtcmVhZHkgdmFsdWVzIHdpdGggdGhlIHByb2Nlc3NlcyB3aXRoIHVzZWQgcG9ydHMgKHJlYWR5IHRvIGF0dGFjaCkuXG4gIC8vIE5vdGU6IHdlIGNhbid0IHVzZSBwcm9jZXNzIGlkcyBiZWNhdXNlIHdlIGNvdWxkIGJlIGRlYnVnZ2luZyBwcm9jZXNzZXMgaW5zaWRlIGNvbnRhaW5lcnNcbiAgLy8gd2hlcmUgdGhlIHByb2Nlc3MgaWRzIGRvbid0IG1hcCB0byB0aGUgaG9zdCBydW5uaW5nIHRoaXMgY29kZS5cbiAgcmV0dXJuIE9ic2VydmFibGUuaW50ZXJ2YWwoMzAwMClcbiAgICAuc3RhcnRXaXRoKDApXG4gICAgLnN3aXRjaE1hcCgoKSA9PlxuICAgICAgUHJvbWlzZS5hbGwoXG4gICAgICAgIEFycmF5LmZyb20oYXR0YWNoUmVhZHkudmFsdWVzKCkpLm1hcChhc3luYyAodGFyZ2V0KSA9PiB7XG4gICAgICAgICAgaWYgKCEoYXdhaXQgaXNQb3J0VXNlZCh0YXJnZXQucG9ydCkpKSB7XG4gICAgICAgICAgICBhdHRhY2hSZWFkeS5kZWxldGUodGFyZ2V0LnBvcnQpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKVxuICAgIClcbiAgICAubWFwKCgpID0+IEFycmF5LmZyb20oYXR0YWNoUmVhZHkudmFsdWVzKCkpKVxuICAgIC5wdWJsaXNoKClcbn1cblxuZnVuY3Rpb24gaXNQb3J0VXNlZChwb3J0OiBudW1iZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgdHJ5Q29ubmVjdFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBuZXQuU29ja2V0KClcbiAgICBjbGllbnRcbiAgICAgIC5vbmNlKFwiY29ubmVjdFwiLCAoKSA9PiB7XG4gICAgICAgIGNsZWFuVXAoKVxuICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICB9KVxuICAgICAgLm9uY2UoXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgIGNsZWFuVXAoKVxuICAgICAgICByZXNvbHZlKGVyci5jb2RlICE9PSBcIkVDT05OUkVGVVNFRFwiKVxuICAgICAgfSlcblxuICAgIGZ1bmN0aW9uIGNsZWFuVXAoKSB7XG4gICAgICBjbGllbnQucmVtb3ZlQWxsTGlzdGVuZXJzKFwiY29ubmVjdFwiKVxuICAgICAgY2xpZW50LnJlbW92ZUFsbExpc3RlbmVycyhcImVycm9yXCIpXG4gICAgICBjbGllbnQuZW5kKClcbiAgICAgIGNsaWVudC5kZXN0cm95KClcbiAgICAgIGNsaWVudC51bnJlZigpXG4gICAgfVxuXG4gICAgY2xpZW50LmNvbm5lY3QoeyBwb3J0LCBob3N0OiBcIjEyNy4wLjAuMVwiIH0pXG4gIH0pXG4gIC8vIFRyeWluZyB0byBjb25uZWN0IGNhbiB0YWtlIG11bHRpcGxlIHNlY29uZHMsIHRoZW4gdGltZXMgb3V0IChpZiB0aGUgc2VydmVyIGlzIGJ1c3kpLlxuICAvLyBIZW5jZSwgd2UgbmVlZCB0byBmYWxsYmFjayB0byBgdHJ1ZWAuXG4gIGNvbnN0IGNvbm5lY3RUaW1lb3V0UHJvbWlzZSA9IHNsZWVwKDEwMDApLnRoZW4oKCkgPT4gdHJ1ZSlcbiAgcmV0dXJuIFByb21pc2UucmFjZShbdHJ5Q29ubmVjdFByb21pc2UsIGNvbm5lY3RUaW1lb3V0UHJvbWlzZV0pXG59XG5cbmZ1bmN0aW9uIHNldHVwU2VydmVyKCk6IFByb21pc2U8dm9pZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGh0dHBcbiAgICAgIC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9odG1sXCIgfSlcbiAgICAgICAgICByZXMuZW5kKFwiSW52YWxpZCByZXF1ZXN0XCIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGJvZHkgPSBcIlwiXG4gICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgYm9keSArPSBkYXRhXG4gICAgICAgICAgfSlcbiAgICAgICAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgaGFuZGxlSnNvblJlcXVlc3QoSlNPTi5wYXJzZShib2R5KSwgcmVzKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oXCJlcnJvclwiLCByZWplY3QpXG4gICAgICAubGlzdGVuKChERUJVR0dFUl9SRUdJU1RSWV9QT1JUOiBhbnkpLCAoKSA9PiB7XG4gICAgICAgIGlzU2VydmVyU2V0dXAgPSB0cnVlXG4gICAgICAgIHJlc29sdmUoKVxuICAgICAgfSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gaGFuZGxlSnNvblJlcXVlc3QoYm9keSwgcmVzKSB7XG4gIHJlcy53cml0ZUhlYWQoMjAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0pXG4gIGNvbnN0IHsgZG9tYWluLCBjb21tYW5kLCB0eXBlIH0gPSBib2R5XG4gIGxldCBzdWNjZXNzID0gZmFsc2VcbiAgaWYgKGRvbWFpbiAhPT0gXCJkZWJ1Z1wiIHx8IHR5cGUgIT09IFwicHl0aG9uXCIpIHtcbiAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzcyB9KSlcbiAgICByZXR1cm5cbiAgfVxuICBpZiAoY29tbWFuZCA9PT0gXCJlbmFibGUtYXR0YWNoXCIpIHtcbiAgICBjb25zdCBwb3J0ID0gTnVtYmVyKGJvZHkucG9ydClcbiAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGJvZHlcbiAgICBjb25zdCB0YXJnZXQgPSB7XG4gICAgICBwb3J0LFxuICAgICAgaWQ6IG9wdGlvbnMuaWQsXG4gICAgICBsb2NhbFJvb3Q6IG9wdGlvbnMubG9jYWxSb290LFxuICAgICAgcmVtb3RlUm9vdDogb3B0aW9ucy5yZW1vdGVSb290LFxuICAgICAgZGVidWdPcHRpb25zOiBvcHRpb25zLmRlYnVnT3B0aW9ucyxcbiAgICB9XG4gICAgYXR0YWNoUmVhZHkuc2V0KHBvcnQsIHRhcmdldClcbiAgICBnZXRMb2dnZXIoKS5pbmZvKFwiUmVtb3RlIGRlYnVnIHRhcmdldCBpcyByZWFkeSB0byBhdHRhY2hcIiwgdGFyZ2V0KVxuICAgIHN1Y2Nlc3MgPSB0cnVlXG4gIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gXCJhdHRhY2hcIikge1xuICAgIGNvbnN0IHBvcnQgPSBOdW1iZXIoYm9keS5wb3J0KVxuICAgIGdldExvZ2dlcigpLmluZm8oXCJSZW1vdGUgZGVidWcgdGFyZ2V0IGF0dGFjaCByZXF1ZXN0XCIsIGJvZHkpXG4gICAgY29uc3QgdGFyZ2V0ID0gYXR0YWNoUmVhZHkuZ2V0KHBvcnQpXG4gICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWJ1Z1JlcXVlc3RzLm5leHQoe1xuICAgICAgICB0eXBlLFxuICAgICAgICBjb21tYW5kLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9KVxuICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICB9XG4gIH1cbiAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3MgfSkpXG59XG4iXX0=