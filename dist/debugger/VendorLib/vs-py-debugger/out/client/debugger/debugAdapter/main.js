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
}); // tslint:disable:no-any max-func-body-length no-empty no-require-imports no-var-requires

if (Reflect.metadata === undefined) {
  require('reflect-metadata');
}

const os_1 = require("os");

const path = require("path");

const stream_1 = require("stream");

const vscode_debugadapter_1 = require("vscode-debugadapter");

const logger_1 = require("vscode-debugadapter/lib/logger");

const constants_1 = require("../../common/constants");

require("../../common/extensions");

const helpers_1 = require("../../common/helpers");

const types_1 = require("../../common/platform/types");

const types_2 = require("../../common/types");

const async_1 = require("../../common/utils/async");

const misc_1 = require("../../common/utils/misc");

const DebugFactory_1 = require("./DebugClients/DebugFactory");

const serviceRegistry_1 = require("./serviceRegistry");

const types_3 = require("./types");

const killProcessTree = require('tree-kill');

const DEBUGGER_CONNECT_TIMEOUT = 20000;
const MIN_DEBUGGER_CONNECT_TIMEOUT = 5000;
/**
 * Primary purpose of this class is to perform the handshake with VS Code and launch PTVSD process.
 * I.e. it communicate with VS Code before PTVSD gets into the picture, once PTVSD is launched, PTVSD will talk directly to VS Code.
 * We're re-using DebugSession so we don't have to handle request/response ourselves.
 * @export
 * @class PythonDebugger
 * @extends {DebugSession}
 */

class PythonDebugger extends vscode_debugadapter_1.DebugSession {
  constructor(serviceContainer) {
    super(false);
    this.serviceContainer = serviceContainer;
    this.client = async_1.createDeferred();
    this.supportsRunInTerminalRequest = false;
  }

  shutdown() {
    if (this.debugServer) {
      this.debugServer.Stop();
      this.debugServer = undefined;
    }

    super.shutdown();
  }

  initializeRequest(response, args) {
    const body = response.body;
    body.supportsExceptionInfoRequest = true;
    body.supportsConfigurationDoneRequest = true;
    body.supportsConditionalBreakpoints = true;
    body.supportsSetVariable = true;
    body.supportsExceptionOptions = true;
    body.supportsEvaluateForHovers = true;
    body.supportsModulesRequest = true;
    body.supportsValueFormattingOptions = true;
    body.supportsHitConditionalBreakpoints = true;
    body.supportsSetExpression = true;
    body.supportsLogPoints = true;
    body.supportTerminateDebuggee = true;
    body.supportsCompletionsRequest = true;
    body.exceptionBreakpointFilters = [{
      filter: 'raised',
      label: 'Raised Exceptions',
      default: false
    }, {
      filter: 'uncaught',
      label: 'Uncaught Exceptions',
      default: true
    }];

    if (typeof args.supportsRunInTerminalRequest === 'boolean') {
      this.supportsRunInTerminalRequest = args.supportsRunInTerminalRequest;
    }

    this.sendResponse(response);
  }

  attachRequest(response, args) {
    const launcher = DebugFactory_1.CreateAttachDebugClient(args, this);
    this.debugServer = launcher.CreateDebugServer(this.serviceContainer);
    this.debugServer.Start().then(() => this.emit('debugger_attached')).catch(ex => {
      vscode_debugadapter_1.logger.error('Attach failed');
      vscode_debugadapter_1.logger.error(`${ex}, ${ex.name}, ${ex.message}, ${ex.stack}`);
      const message = this.getUserFriendlyAttachErrorMessage(ex) || 'Attach Failed';
      this.sendErrorResponse(response, {
        format: message,
        id: 1
      }, undefined, undefined, vscode_debugadapter_1.ErrorDestination.User);
    });
  }

  launchRequest(response, args) {
    const fs = this.serviceContainer.get(types_1.IFileSystem);

    if ((typeof args.module !== 'string' || args.module.length === 0) && args.program && !fs.fileExistsSync(args.program)) {
      return this.sendErrorResponse(response, {
        format: `File does not exist. "${args.program}"`,
        id: 1
      }, undefined, undefined, vscode_debugadapter_1.ErrorDestination.User);
    }

    this.launchPTVSD(args).then(() => this.waitForPTVSDToConnect(args)).then(() => this.emit('debugger_launched')).catch(ex => {
      const message = this.getUserFriendlyLaunchErrorMessage(args, ex) || 'Debug Error';
      this.sendErrorResponse(response, {
        format: message,
        id: 1
      }, undefined, undefined, vscode_debugadapter_1.ErrorDestination.User);
    });
  }

  launchPTVSD(args) {
    return __awaiter(this, void 0, void 0, function* () {
      const launcher = DebugFactory_1.CreateLaunchDebugClient(args, this, this.supportsRunInTerminalRequest);
      this.debugServer = launcher.CreateDebugServer(this.serviceContainer);
      const serverInfo = yield this.debugServer.Start();
      return launcher.LaunchApplicationToDebug(serverInfo);
    });
  }

  waitForPTVSDToConnect(args) {
    return __awaiter(this, void 0, void 0, function* () {
      return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let rejected = false;
        const duration = this.getConnectionTimeout(args);
        const timeout = setTimeout(() => {
          rejected = true;
          reject(new Error('Timeout waiting for debugger connection'));
        }, duration);

        try {
          yield this.debugServer.client;
          timeout.unref();

          if (!rejected) {
            resolve();
          }
        } catch (ex) {
          reject(ex);
        }
      }));
    });
  }

  getConnectionTimeout(args) {
    // The timeout can be overridden, but won't be documented unless we see the need for it.
    // This is just a fail safe mechanism, if the current timeout isn't enough (let study the current behaviour before exposing this setting).
    const connectionTimeout = typeof args.timeout === 'number' ? args.timeout : DEBUGGER_CONNECT_TIMEOUT;
    return Math.max(connectionTimeout, MIN_DEBUGGER_CONNECT_TIMEOUT);
  }

  getUserFriendlyLaunchErrorMessage(launchArgs, error) {
    if (!error) {
      return;
    }

    const errorMsg = typeof error === 'string' ? error : error.message && error.message.length > 0 ? error.message : '';

    if (helpers_1.isNotInstalledError(error)) {
      return `Failed to launch the Python Process, please validate the path '${launchArgs.pythonPath}'`;
    } else {
      return errorMsg;
    }
  }

  getUserFriendlyAttachErrorMessage(error) {
    if (!error) {
      return;
    }

    if (error.code === 'ECONNREFUSED' || error.errno === 'ECONNREFUSED') {
      return `Failed to attach (${error.message})`;
    } else {
      return typeof error === 'string' ? error : error.message && error.message.length > 0 ? error.message : '';
    }
  }

}

exports.PythonDebugger = PythonDebugger;
/**
 * Glue that orchestrates communications between VS Code, PythonDebugger (DebugSession) and PTVSD.
 * @class DebugManager
 * @implements {Disposable}
 */

class DebugManager {
  constructor(serviceContainer) {
    this.serviceContainer = serviceContainer;
    this.isServerMode = false;
    this.disposables = [];
    this.hasShutdown = false;
    this.terminatedEventSent = false;
    this.disconnectResponseSent = false;
    this.restart = false;
    /**
     * Do not put any delays in here expecting VSC to receive messages. VSC could disconnect earlier (PTVSD #128).
     * If any delays are necessary, add them prior to calling this method.
     * If the program is forcefully terminated (e.g. killing terminal), we handle socket.on('error') or socket.on('close'),
     *  Under such circumstances, we need to send the terminated event asap (could be because VSC might be getting an error at its end due to piped stream being closed).
     * @private
     * @memberof DebugManager
     */
    // tslint:disable-next-line:cyclomatic-complexity

    this.shutdown = () => __awaiter(this, void 0, void 0, function* () {
      vscode_debugadapter_1.logger.verbose('check and shutdown');

      if (this.hasShutdown) {
        return;
      }

      this.hasShutdown = true;
      vscode_debugadapter_1.logger.verbose('shutdown');

      if (!this.terminatedEventSent && !this.restart) {
        // Possible PTVSD died before sending message back.
        try {
          vscode_debugadapter_1.logger.verbose('Sending Terminated Event');
          this.sendMessage(new vscode_debugadapter_1.TerminatedEvent(), this.outputStream);
        } catch (err) {
          const message = `Error in sending Terminated Event: ${err && err.message ? err.message : err.toString()}`;
          const details = [message, err && err.name ? err.name : '', err && err.stack ? err.stack : ''].join(os_1.EOL);
          vscode_debugadapter_1.logger.error(`${message}${os_1.EOL}${details}`);
        }

        this.terminatedEventSent = true;
      }

      if (!this.disconnectResponseSent && this.restart && this.disconnectRequest) {
        // This is a work around for PTVSD bug, else this entire block is unnecessary.
        try {
          vscode_debugadapter_1.logger.verbose('Sending Disconnect Response');
          this.sendMessage(new vscode_debugadapter_1.Response(this.disconnectRequest, ''), this.outputStream);
        } catch (err) {
          const message = `Error in sending Disconnect Response: ${err && err.message ? err.message : err.toString()}`;
          const details = [message, err && err.name ? err.name : '', err && err.stack ? err.stack : ''].join(os_1.EOL);
          vscode_debugadapter_1.logger.error(`${message}${os_1.EOL}${details}`);
        }

        this.disconnectResponseSent = true;
      }

      if (this.launchOrAttach === 'launch' && this.ptvsdProcessId) {
        vscode_debugadapter_1.logger.verbose('killing process');

        try {
          // 1. Wait for some time, its possible the program has run to completion.
          // We need to wait till the process exits (else the message `Terminated: 15` gets printed onto the screen).
          // 2. Also, its possible we manually sent the `Terminated` event above.
          // Hence we need to wait till VSC receives the above event.
          yield async_1.sleep(100);
          vscode_debugadapter_1.logger.verbose('Kill process now');
          killProcessTree(this.ptvsdProcessId);
        } catch (_a) {}

        this.ptvsdProcessId = undefined;
      }

      if (!this.restart) {
        if (this.debugSession) {
          vscode_debugadapter_1.logger.verbose('Shutting down debug session');
          this.debugSession.shutdown();
        }

        vscode_debugadapter_1.logger.verbose('disposing');
        yield async_1.sleep(100); // Dispose last, we don't want to dispose the protocol loggers too early.

        this.disposables.forEach(disposable => disposable.dispose());
      }
    });
    /**
     * Connect PTVSD socket to VS Code.
     * This allows PTVSD to communicate directly with VS Code.
     * @private
     * @memberof DebugManager
     */


    this.connectVSCodeToPTVSD = response => __awaiter(this, void 0, void 0, function* () {
      const attachOrLaunchRequest = yield this.launchOrAttach === 'attach' ? this.attachRequest : this.launchRequest; // By now we're connected to the client.

      this.socket = yield this.debugSession.debugServer.client; // We need to handle both end and error, sometimes the socket will error out without ending (if debugee is killed).
      // Note, we need a handler for the error event, else nodejs complains when socket gets closed and there are no error handlers.

      this.socket.on('end', () => {
        vscode_debugadapter_1.logger.verbose('Socket End');
        this.shutdown().ignoreErrors();
      });
      this.socket.on('error', () => {
        vscode_debugadapter_1.logger.verbose('Socket Error');
        this.shutdown().ignoreErrors();
      }); // Keep track of processid for killing it.

      if (this.launchOrAttach === 'launch') {
        const debugSoketProtocolParser = this.serviceContainer.get(types_3.IProtocolParser);
        debugSoketProtocolParser.connect(this.socket);
        debugSoketProtocolParser.once('event_process', proc => {
          this.ptvsdProcessId = proc.body.systemProcessId;
        });
      } // Get ready for PTVSD to communicate directly with VS Code.


      this.inputStream.unpipe(this.debugSessionInputStream);
      this.debugSessionOutputStream.unpipe(this.outputStream); // Do not pipe. When restarting the debugger, the socket gets closed,
      // In which case, VSC will see this and shutdown the debugger completely.

      this.inputStream.on('data', data => {
        this.socket.write(data);
      });
      this.socket.on('data', data => {
        this.throughOutputStream.write(data);
        this.outputStream.write(data);
      }); // Send the launch/attach request to PTVSD and wait for it to reply back.

      this.sendMessage(attachOrLaunchRequest, this.socket); // Send the initialize request and wait for it to reply back with the initialized event

      this.sendMessage(yield this.initializeRequest, this.socket);
    });

    this.onRequestInitialize = request => {
      this.hasShutdown = false;
      this.terminatedEventSent = false;
      this.disconnectResponseSent = false;
      this.restart = false;
      this.disconnectRequest = undefined;
      this.initializeRequestDeferred.resolve(request);
    };

    this.onRequestLaunch = request => {
      this.launchOrAttach = 'launch';
      this.loggingEnabled = request.arguments.logToFile === true;
      this.launchRequestDeferred.resolve(request);
    };

    this.onRequestAttach = request => {
      this.launchOrAttach = 'attach';
      this.loggingEnabled = request.arguments.logToFile === true;
      this.attachRequestDeferred.resolve(request);
    };

    this.onRequestDisconnect = request => {
      this.disconnectRequest = request;

      if (this.launchOrAttach === 'attach') {
        return;
      }

      const args = request.arguments;

      if (args && args.restart) {
        this.restart = true;
      } // When VS Code sends a disconnect request, PTVSD replies back with a response.
      // Wait for sometime, untill the messages are sent out (remember, we're just intercepting streams here).


      setTimeout(this.shutdown, 500);
    };

    this.onEventTerminated = () => __awaiter(this, void 0, void 0, function* () {
      vscode_debugadapter_1.logger.verbose('onEventTerminated');
      this.terminatedEventSent = true; // Wait for sometime, untill the messages are sent out (remember, we're just intercepting streams here).

      setTimeout(this.shutdown, 300);
    });

    this.onResponseDisconnect = () => __awaiter(this, void 0, void 0, function* () {
      this.disconnectResponseSent = true;
      vscode_debugadapter_1.logger.verbose('onResponseDisconnect'); // When VS Code sends a disconnect request, PTVSD replies back with a response, but its upto us to kill the process.
      // Wait for sometime, untill the messages are sent out (remember, we're just intercepting streams here).
      // Also its possible PTVSD might run to completion.

      setTimeout(this.shutdown, 100);
    });

    this.throughInputStream = new stream_1.PassThrough();
    this.throughOutputStream = new stream_1.PassThrough();
    this.debugSessionOutputStream = new stream_1.PassThrough();
    this.debugSessionInputStream = new stream_1.PassThrough();
    this.protocolMessageWriter = this.serviceContainer.get(types_3.IProtocolMessageWriter);
    this.inputProtocolParser = this.serviceContainer.get(types_3.IProtocolParser);
    this.inputProtocolParser.connect(this.throughInputStream);
    this.disposables.push(this.inputProtocolParser);
    this.outputProtocolParser = this.serviceContainer.get(types_3.IProtocolParser);
    this.outputProtocolParser.connect(this.throughOutputStream);
    this.disposables.push(this.outputProtocolParser);
    this.protocolLogger = this.serviceContainer.get(types_3.IProtocolLogger);
    this.protocolLogger.connect(this.throughInputStream, this.throughOutputStream);
    this.disposables.push(this.protocolLogger);
    this.initializeRequestDeferred = async_1.createDeferred();
    this.launchRequestDeferred = async_1.createDeferred();
    this.attachRequestDeferred = async_1.createDeferred();
  }

  get initializeRequest() {
    return this.initializeRequestDeferred.promise;
  }

  get launchRequest() {
    return this.launchRequestDeferred.promise;
  }

  get attachRequest() {
    return this.attachRequestDeferred.promise;
  }

  set loggingEnabled(value) {
    if (value) {
      vscode_debugadapter_1.logger.setup(logger_1.LogLevel.Verbose, true);
      this.protocolLogger.setup(vscode_debugadapter_1.logger);
    }
  }

  dispose() {
    vscode_debugadapter_1.logger.verbose('main dispose');
    this.shutdown().ignoreErrors();
  }

  start() {
    return __awaiter(this, void 0, void 0, function* () {
      const debugStreamProvider = this.serviceContainer.get(types_3.IDebugStreamProvider);
      const {
        input,
        output
      } = yield debugStreamProvider.getInputAndOutputStreams();
      this.isServerMode = debugStreamProvider.useDebugSocketStream;
      this.inputStream = input;
      this.outputStream = output;
      this.inputStream.pause();

      if (!this.isServerMode) {
        const currentProcess = this.serviceContainer.get(types_2.ICurrentProcess);
        currentProcess.on('SIGTERM', () => {
          if (!this.restart) {
            this.shutdown().ignoreErrors();
          }
        });
      }

      this.interceptProtocolMessages();
      this.startDebugSession();
    });
  }

  sendMessage(message, outputStream) {
    this.protocolMessageWriter.write(outputStream, message);
    this.protocolMessageWriter.write(this.throughOutputStream, message);
  }

  startDebugSession() {
    this.debugSession = new PythonDebugger(this.serviceContainer);
    this.debugSession.setRunAsServer(this.isServerMode);
    this.debugSession.once('debugger_attached', this.connectVSCodeToPTVSD);
    this.debugSession.once('debugger_launched', this.connectVSCodeToPTVSD);
    this.debugSessionOutputStream.pipe(this.throughOutputStream);
    this.debugSessionOutputStream.pipe(this.outputStream); // Start handling requests in the session instance.
    // The session (PythonDebugger class) will only perform the bootstrapping (launching of PTVSD).

    this.inputStream.pipe(this.throughInputStream);
    this.inputStream.pipe(this.debugSessionInputStream);
    this.debugSession.start(this.debugSessionInputStream, this.debugSessionOutputStream);
  }

  interceptProtocolMessages() {
    // Keep track of the initialize and launch requests, we'll need to re-send these to ptvsd, for bootstrapping.
    this.inputProtocolParser.once('request_initialize', this.onRequestInitialize);
    this.inputProtocolParser.once('request_launch', this.onRequestLaunch);
    this.inputProtocolParser.once('request_attach', this.onRequestAttach);
    this.inputProtocolParser.once('request_disconnect', this.onRequestDisconnect);
    this.outputProtocolParser.once('event_terminated', this.onEventTerminated);
    this.outputProtocolParser.once('response_disconnect', this.onResponseDisconnect);
  }

}

function startDebugger() {
  return __awaiter(this, void 0, void 0, function* () {
    vscode_debugadapter_1.logger.init(misc_1.noop, path.join(constants_1.EXTENSION_ROOT_DIR, `debug${process.pid}.log`));
    const serviceContainer = serviceRegistry_1.initializeIoc();
    const protocolMessageWriter = serviceContainer.get(types_3.IProtocolMessageWriter);

    try {
      // debugger;
      const debugManager = new DebugManager(serviceContainer);
      yield debugManager.start();
    } catch (err) {
      const message = `Debugger Error: ${err && err.message ? err.message : err.toString()}`;
      const details = [message, err && err.name ? err.name : '', err && err.stack ? err.stack : ''].join(os_1.EOL);
      vscode_debugadapter_1.logger.error(`${message}${os_1.EOL}${details}`); // Notify the user.

      protocolMessageWriter.write(process.stdout, new vscode_debugadapter_1.Event('error', message));
      protocolMessageWriter.write(process.stdout, new vscode_debugadapter_1.OutputEvent(`${message}${os_1.EOL}${details}`, 'stderr'));
    }
  });
}

process.stdin.on('error', () => {});
process.stdout.on('error', () => {});
process.stderr.on('error', () => {});
process.on('uncaughtException', err => {
  vscode_debugadapter_1.logger.error(`Uncaught Exception: ${err && err.message ? err.message : ''}`);
  vscode_debugadapter_1.logger.error(err && err.name ? err.name : '');
  vscode_debugadapter_1.logger.error(err && err.stack ? err.stack : ''); // Catch all, incase we have string exceptions being raised.

  vscode_debugadapter_1.logger.error(err ? err.toString() : ''); // Wait for 1 second before we die, we need to ensure errors are written to the log file.

  setTimeout(() => process.exit(-1), 100);
});
startDebugger().catch(ex => {// Not necessary except for debugging and to kill linter warning about unhandled promises.
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsiX19hd2FpdGVyIiwidGhpc0FyZyIsIl9hcmd1bWVudHMiLCJQIiwiZ2VuZXJhdG9yIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJ2YWx1ZSIsInN0ZXAiLCJuZXh0IiwiZSIsInJlamVjdGVkIiwicmVzdWx0IiwiZG9uZSIsInRoZW4iLCJhcHBseSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsIlJlZmxlY3QiLCJtZXRhZGF0YSIsInVuZGVmaW5lZCIsInJlcXVpcmUiLCJvc18xIiwicGF0aCIsInN0cmVhbV8xIiwidnNjb2RlX2RlYnVnYWRhcHRlcl8xIiwibG9nZ2VyXzEiLCJjb25zdGFudHNfMSIsImhlbHBlcnNfMSIsInR5cGVzXzEiLCJ0eXBlc18yIiwiYXN5bmNfMSIsIm1pc2NfMSIsIkRlYnVnRmFjdG9yeV8xIiwic2VydmljZVJlZ2lzdHJ5XzEiLCJ0eXBlc18zIiwia2lsbFByb2Nlc3NUcmVlIiwiREVCVUdHRVJfQ09OTkVDVF9USU1FT1VUIiwiTUlOX0RFQlVHR0VSX0NPTk5FQ1RfVElNRU9VVCIsIlB5dGhvbkRlYnVnZ2VyIiwiRGVidWdTZXNzaW9uIiwiY29uc3RydWN0b3IiLCJzZXJ2aWNlQ29udGFpbmVyIiwiY2xpZW50IiwiY3JlYXRlRGVmZXJyZWQiLCJzdXBwb3J0c1J1bkluVGVybWluYWxSZXF1ZXN0Iiwic2h1dGRvd24iLCJkZWJ1Z1NlcnZlciIsIlN0b3AiLCJpbml0aWFsaXplUmVxdWVzdCIsInJlc3BvbnNlIiwiYXJncyIsImJvZHkiLCJzdXBwb3J0c0V4Y2VwdGlvbkluZm9SZXF1ZXN0Iiwic3VwcG9ydHNDb25maWd1cmF0aW9uRG9uZVJlcXVlc3QiLCJzdXBwb3J0c0NvbmRpdGlvbmFsQnJlYWtwb2ludHMiLCJzdXBwb3J0c1NldFZhcmlhYmxlIiwic3VwcG9ydHNFeGNlcHRpb25PcHRpb25zIiwic3VwcG9ydHNFdmFsdWF0ZUZvckhvdmVycyIsInN1cHBvcnRzTW9kdWxlc1JlcXVlc3QiLCJzdXBwb3J0c1ZhbHVlRm9ybWF0dGluZ09wdGlvbnMiLCJzdXBwb3J0c0hpdENvbmRpdGlvbmFsQnJlYWtwb2ludHMiLCJzdXBwb3J0c1NldEV4cHJlc3Npb24iLCJzdXBwb3J0c0xvZ1BvaW50cyIsInN1cHBvcnRUZXJtaW5hdGVEZWJ1Z2dlZSIsInN1cHBvcnRzQ29tcGxldGlvbnNSZXF1ZXN0IiwiZXhjZXB0aW9uQnJlYWtwb2ludEZpbHRlcnMiLCJmaWx0ZXIiLCJsYWJlbCIsImRlZmF1bHQiLCJzZW5kUmVzcG9uc2UiLCJhdHRhY2hSZXF1ZXN0IiwibGF1bmNoZXIiLCJDcmVhdGVBdHRhY2hEZWJ1Z0NsaWVudCIsIkNyZWF0ZURlYnVnU2VydmVyIiwiU3RhcnQiLCJlbWl0IiwiY2F0Y2giLCJleCIsImxvZ2dlciIsImVycm9yIiwibmFtZSIsIm1lc3NhZ2UiLCJzdGFjayIsImdldFVzZXJGcmllbmRseUF0dGFjaEVycm9yTWVzc2FnZSIsInNlbmRFcnJvclJlc3BvbnNlIiwiZm9ybWF0IiwiaWQiLCJFcnJvckRlc3RpbmF0aW9uIiwiVXNlciIsImxhdW5jaFJlcXVlc3QiLCJmcyIsImdldCIsIklGaWxlU3lzdGVtIiwibW9kdWxlIiwibGVuZ3RoIiwicHJvZ3JhbSIsImZpbGVFeGlzdHNTeW5jIiwibGF1bmNoUFRWU0QiLCJ3YWl0Rm9yUFRWU0RUb0Nvbm5lY3QiLCJnZXRVc2VyRnJpZW5kbHlMYXVuY2hFcnJvck1lc3NhZ2UiLCJDcmVhdGVMYXVuY2hEZWJ1Z0NsaWVudCIsInNlcnZlckluZm8iLCJMYXVuY2hBcHBsaWNhdGlvblRvRGVidWciLCJkdXJhdGlvbiIsImdldENvbm5lY3Rpb25UaW1lb3V0IiwidGltZW91dCIsInNldFRpbWVvdXQiLCJFcnJvciIsInVucmVmIiwiY29ubmVjdGlvblRpbWVvdXQiLCJNYXRoIiwibWF4IiwibGF1bmNoQXJncyIsImVycm9yTXNnIiwiaXNOb3RJbnN0YWxsZWRFcnJvciIsInB5dGhvblBhdGgiLCJjb2RlIiwiZXJybm8iLCJEZWJ1Z01hbmFnZXIiLCJpc1NlcnZlck1vZGUiLCJkaXNwb3NhYmxlcyIsImhhc1NodXRkb3duIiwidGVybWluYXRlZEV2ZW50U2VudCIsImRpc2Nvbm5lY3RSZXNwb25zZVNlbnQiLCJyZXN0YXJ0IiwidmVyYm9zZSIsInNlbmRNZXNzYWdlIiwiVGVybWluYXRlZEV2ZW50Iiwib3V0cHV0U3RyZWFtIiwiZXJyIiwidG9TdHJpbmciLCJkZXRhaWxzIiwiam9pbiIsIkVPTCIsImRpc2Nvbm5lY3RSZXF1ZXN0IiwiUmVzcG9uc2UiLCJsYXVuY2hPckF0dGFjaCIsInB0dnNkUHJvY2Vzc0lkIiwic2xlZXAiLCJfYSIsImRlYnVnU2Vzc2lvbiIsImZvckVhY2giLCJkaXNwb3NhYmxlIiwiZGlzcG9zZSIsImNvbm5lY3RWU0NvZGVUb1BUVlNEIiwiYXR0YWNoT3JMYXVuY2hSZXF1ZXN0Iiwic29ja2V0Iiwib24iLCJpZ25vcmVFcnJvcnMiLCJkZWJ1Z1Nva2V0UHJvdG9jb2xQYXJzZXIiLCJJUHJvdG9jb2xQYXJzZXIiLCJjb25uZWN0Iiwib25jZSIsInByb2MiLCJzeXN0ZW1Qcm9jZXNzSWQiLCJpbnB1dFN0cmVhbSIsInVucGlwZSIsImRlYnVnU2Vzc2lvbklucHV0U3RyZWFtIiwiZGVidWdTZXNzaW9uT3V0cHV0U3RyZWFtIiwiZGF0YSIsIndyaXRlIiwidGhyb3VnaE91dHB1dFN0cmVhbSIsIm9uUmVxdWVzdEluaXRpYWxpemUiLCJyZXF1ZXN0IiwiaW5pdGlhbGl6ZVJlcXVlc3REZWZlcnJlZCIsIm9uUmVxdWVzdExhdW5jaCIsImxvZ2dpbmdFbmFibGVkIiwiYXJndW1lbnRzIiwibG9nVG9GaWxlIiwibGF1bmNoUmVxdWVzdERlZmVycmVkIiwib25SZXF1ZXN0QXR0YWNoIiwiYXR0YWNoUmVxdWVzdERlZmVycmVkIiwib25SZXF1ZXN0RGlzY29ubmVjdCIsIm9uRXZlbnRUZXJtaW5hdGVkIiwib25SZXNwb25zZURpc2Nvbm5lY3QiLCJ0aHJvdWdoSW5wdXRTdHJlYW0iLCJQYXNzVGhyb3VnaCIsInByb3RvY29sTWVzc2FnZVdyaXRlciIsIklQcm90b2NvbE1lc3NhZ2VXcml0ZXIiLCJpbnB1dFByb3RvY29sUGFyc2VyIiwicHVzaCIsIm91dHB1dFByb3RvY29sUGFyc2VyIiwicHJvdG9jb2xMb2dnZXIiLCJJUHJvdG9jb2xMb2dnZXIiLCJwcm9taXNlIiwic2V0dXAiLCJMb2dMZXZlbCIsIlZlcmJvc2UiLCJzdGFydCIsImRlYnVnU3RyZWFtUHJvdmlkZXIiLCJJRGVidWdTdHJlYW1Qcm92aWRlciIsImlucHV0Iiwib3V0cHV0IiwiZ2V0SW5wdXRBbmRPdXRwdXRTdHJlYW1zIiwidXNlRGVidWdTb2NrZXRTdHJlYW0iLCJwYXVzZSIsImN1cnJlbnRQcm9jZXNzIiwiSUN1cnJlbnRQcm9jZXNzIiwiaW50ZXJjZXB0UHJvdG9jb2xNZXNzYWdlcyIsInN0YXJ0RGVidWdTZXNzaW9uIiwic2V0UnVuQXNTZXJ2ZXIiLCJwaXBlIiwic3RhcnREZWJ1Z2dlciIsImluaXQiLCJub29wIiwiRVhURU5TSU9OX1JPT1RfRElSIiwicHJvY2VzcyIsInBpZCIsImluaXRpYWxpemVJb2MiLCJkZWJ1Z01hbmFnZXIiLCJzdGRvdXQiLCJFdmVudCIsIk91dHB1dEV2ZW50Iiwic3RkaW4iLCJzdGRlcnIiLCJleGl0Il0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsU0FBUyxHQUFJLFVBQVEsU0FBS0EsU0FBZCxJQUE0QixVQUFVQyxPQUFWLEVBQW1CQyxVQUFuQixFQUErQkMsQ0FBL0IsRUFBa0NDLFNBQWxDLEVBQTZDO0FBQ3JGLFNBQU8sS0FBS0QsQ0FBQyxLQUFLQSxDQUFDLEdBQUdFLE9BQVQsQ0FBTixFQUF5QixVQUFVQyxPQUFWLEVBQW1CQyxNQUFuQixFQUEyQjtBQUN2RCxhQUFTQyxTQUFULENBQW1CQyxLQUFuQixFQUEwQjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUNPLElBQVYsQ0FBZUYsS0FBZixDQUFELENBQUo7QUFBOEIsT0FBcEMsQ0FBcUMsT0FBT0csQ0FBUCxFQUFVO0FBQUVMLFFBQUFBLE1BQU0sQ0FBQ0ssQ0FBRCxDQUFOO0FBQVk7QUFBRTs7QUFDM0YsYUFBU0MsUUFBVCxDQUFrQkosS0FBbEIsRUFBeUI7QUFBRSxVQUFJO0FBQUVDLFFBQUFBLElBQUksQ0FBQ04sU0FBUyxDQUFDLE9BQUQsQ0FBVCxDQUFtQkssS0FBbkIsQ0FBRCxDQUFKO0FBQWtDLE9BQXhDLENBQXlDLE9BQU9HLENBQVAsRUFBVTtBQUFFTCxRQUFBQSxNQUFNLENBQUNLLENBQUQsQ0FBTjtBQUFZO0FBQUU7O0FBQzlGLGFBQVNGLElBQVQsQ0FBY0ksTUFBZCxFQUFzQjtBQUFFQSxNQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBY1QsT0FBTyxDQUFDUSxNQUFNLENBQUNMLEtBQVIsQ0FBckIsR0FBc0MsSUFBSU4sQ0FBSixDQUFNLFVBQVVHLE9BQVYsRUFBbUI7QUFBRUEsUUFBQUEsT0FBTyxDQUFDUSxNQUFNLENBQUNMLEtBQVIsQ0FBUDtBQUF3QixPQUFuRCxFQUFxRE8sSUFBckQsQ0FBMERSLFNBQTFELEVBQXFFSyxRQUFyRSxDQUF0QztBQUF1SDs7QUFDL0lILElBQUFBLElBQUksQ0FBQyxDQUFDTixTQUFTLEdBQUdBLFNBQVMsQ0FBQ2EsS0FBVixDQUFnQmhCLE9BQWhCLEVBQXlCQyxVQUFVLElBQUksRUFBdkMsQ0FBYixFQUF5RFMsSUFBekQsRUFBRCxDQUFKO0FBQ0gsR0FMTSxDQUFQO0FBTUgsQ0FQRDs7QUFRQU8sTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFWCxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3QyxFLENBQ0E7O0FBQ0EsSUFBSVksT0FBTyxDQUFDQyxRQUFSLEtBQXFCQyxTQUF6QixFQUFvQztBQUNoQ0MsRUFBQUEsT0FBTyxDQUFDLGtCQUFELENBQVA7QUFDSDs7QUFDRCxNQUFNQyxJQUFJLEdBQUdELE9BQU8sQ0FBQyxJQUFELENBQXBCOztBQUNBLE1BQU1FLElBQUksR0FBR0YsT0FBTyxDQUFDLE1BQUQsQ0FBcEI7O0FBQ0EsTUFBTUcsUUFBUSxHQUFHSCxPQUFPLENBQUMsUUFBRCxDQUF4Qjs7QUFDQSxNQUFNSSxxQkFBcUIsR0FBR0osT0FBTyxDQUFDLHFCQUFELENBQXJDOztBQUNBLE1BQU1LLFFBQVEsR0FBR0wsT0FBTyxDQUFDLGdDQUFELENBQXhCOztBQUNBLE1BQU1NLFdBQVcsR0FBR04sT0FBTyxDQUFDLHdCQUFELENBQTNCOztBQUNBQSxPQUFPLENBQUMseUJBQUQsQ0FBUDs7QUFDQSxNQUFNTyxTQUFTLEdBQUdQLE9BQU8sQ0FBQyxzQkFBRCxDQUF6Qjs7QUFDQSxNQUFNUSxPQUFPLEdBQUdSLE9BQU8sQ0FBQyw2QkFBRCxDQUF2Qjs7QUFDQSxNQUFNUyxPQUFPLEdBQUdULE9BQU8sQ0FBQyxvQkFBRCxDQUF2Qjs7QUFDQSxNQUFNVSxPQUFPLEdBQUdWLE9BQU8sQ0FBQywwQkFBRCxDQUF2Qjs7QUFDQSxNQUFNVyxNQUFNLEdBQUdYLE9BQU8sQ0FBQyx5QkFBRCxDQUF0Qjs7QUFDQSxNQUFNWSxjQUFjLEdBQUdaLE9BQU8sQ0FBQyw2QkFBRCxDQUE5Qjs7QUFDQSxNQUFNYSxpQkFBaUIsR0FBR2IsT0FBTyxDQUFDLG1CQUFELENBQWpDOztBQUNBLE1BQU1jLE9BQU8sR0FBR2QsT0FBTyxDQUFDLFNBQUQsQ0FBdkI7O0FBQ0EsTUFBTWUsZUFBZSxHQUFHZixPQUFPLENBQUMsV0FBRCxDQUEvQjs7QUFDQSxNQUFNZ0Isd0JBQXdCLEdBQUcsS0FBakM7QUFDQSxNQUFNQyw0QkFBNEIsR0FBRyxJQUFyQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsTUFBTUMsY0FBTixTQUE2QmQscUJBQXFCLENBQUNlLFlBQW5ELENBQWdFO0FBQzVEQyxFQUFBQSxXQUFXLENBQUNDLGdCQUFELEVBQW1CO0FBQzFCLFVBQU0sS0FBTjtBQUNBLFNBQUtBLGdCQUFMLEdBQXdCQSxnQkFBeEI7QUFDQSxTQUFLQyxNQUFMLEdBQWNaLE9BQU8sQ0FBQ2EsY0FBUixFQUFkO0FBQ0EsU0FBS0MsNEJBQUwsR0FBb0MsS0FBcEM7QUFDSDs7QUFDREMsRUFBQUEsUUFBUSxHQUFHO0FBQ1AsUUFBSSxLQUFLQyxXQUFULEVBQXNCO0FBQ2xCLFdBQUtBLFdBQUwsQ0FBaUJDLElBQWpCO0FBQ0EsV0FBS0QsV0FBTCxHQUFtQjNCLFNBQW5CO0FBQ0g7O0FBQ0QsVUFBTTBCLFFBQU47QUFDSDs7QUFDREcsRUFBQUEsaUJBQWlCLENBQUNDLFFBQUQsRUFBV0MsSUFBWCxFQUFpQjtBQUM5QixVQUFNQyxJQUFJLEdBQUdGLFFBQVEsQ0FBQ0UsSUFBdEI7QUFDQUEsSUFBQUEsSUFBSSxDQUFDQyw0QkFBTCxHQUFvQyxJQUFwQztBQUNBRCxJQUFBQSxJQUFJLENBQUNFLGdDQUFMLEdBQXdDLElBQXhDO0FBQ0FGLElBQUFBLElBQUksQ0FBQ0csOEJBQUwsR0FBc0MsSUFBdEM7QUFDQUgsSUFBQUEsSUFBSSxDQUFDSSxtQkFBTCxHQUEyQixJQUEzQjtBQUNBSixJQUFBQSxJQUFJLENBQUNLLHdCQUFMLEdBQWdDLElBQWhDO0FBQ0FMLElBQUFBLElBQUksQ0FBQ00seUJBQUwsR0FBaUMsSUFBakM7QUFDQU4sSUFBQUEsSUFBSSxDQUFDTyxzQkFBTCxHQUE4QixJQUE5QjtBQUNBUCxJQUFBQSxJQUFJLENBQUNRLDhCQUFMLEdBQXNDLElBQXRDO0FBQ0FSLElBQUFBLElBQUksQ0FBQ1MsaUNBQUwsR0FBeUMsSUFBekM7QUFDQVQsSUFBQUEsSUFBSSxDQUFDVSxxQkFBTCxHQUE2QixJQUE3QjtBQUNBVixJQUFBQSxJQUFJLENBQUNXLGlCQUFMLEdBQXlCLElBQXpCO0FBQ0FYLElBQUFBLElBQUksQ0FBQ1ksd0JBQUwsR0FBZ0MsSUFBaEM7QUFDQVosSUFBQUEsSUFBSSxDQUFDYSwwQkFBTCxHQUFrQyxJQUFsQztBQUNBYixJQUFBQSxJQUFJLENBQUNjLDBCQUFMLEdBQWtDLENBQzlCO0FBQ0lDLE1BQUFBLE1BQU0sRUFBRSxRQURaO0FBRUlDLE1BQUFBLEtBQUssRUFBRSxtQkFGWDtBQUdJQyxNQUFBQSxPQUFPLEVBQUU7QUFIYixLQUQ4QixFQU05QjtBQUNJRixNQUFBQSxNQUFNLEVBQUUsVUFEWjtBQUVJQyxNQUFBQSxLQUFLLEVBQUUscUJBRlg7QUFHSUMsTUFBQUEsT0FBTyxFQUFFO0FBSGIsS0FOOEIsQ0FBbEM7O0FBWUEsUUFBSSxPQUFPbEIsSUFBSSxDQUFDTiw0QkFBWixLQUE2QyxTQUFqRCxFQUE0RDtBQUN4RCxXQUFLQSw0QkFBTCxHQUFvQ00sSUFBSSxDQUFDTiw0QkFBekM7QUFDSDs7QUFDRCxTQUFLeUIsWUFBTCxDQUFrQnBCLFFBQWxCO0FBQ0g7O0FBQ0RxQixFQUFBQSxhQUFhLENBQUNyQixRQUFELEVBQVdDLElBQVgsRUFBaUI7QUFDMUIsVUFBTXFCLFFBQVEsR0FBR3ZDLGNBQWMsQ0FBQ3dDLHVCQUFmLENBQXVDdEIsSUFBdkMsRUFBNkMsSUFBN0MsQ0FBakI7QUFDQSxTQUFLSixXQUFMLEdBQW1CeUIsUUFBUSxDQUFDRSxpQkFBVCxDQUEyQixLQUFLaEMsZ0JBQWhDLENBQW5CO0FBQ0EsU0FBS0ssV0FBTCxDQUFpQjRCLEtBQWpCLEdBQ0s5RCxJQURMLENBQ1UsTUFBTSxLQUFLK0QsSUFBTCxDQUFVLG1CQUFWLENBRGhCLEVBRUtDLEtBRkwsQ0FFV0MsRUFBRSxJQUFJO0FBQ2JyRCxNQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCQyxLQUE3QixDQUFtQyxlQUFuQztBQUNBdkQsTUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QkMsS0FBN0IsQ0FBb0MsR0FBRUYsRUFBRyxLQUFJQSxFQUFFLENBQUNHLElBQUssS0FBSUgsRUFBRSxDQUFDSSxPQUFRLEtBQUlKLEVBQUUsQ0FBQ0ssS0FBTSxFQUFqRjtBQUNBLFlBQU1ELE9BQU8sR0FBRyxLQUFLRSxpQ0FBTCxDQUF1Q04sRUFBdkMsS0FBOEMsZUFBOUQ7QUFDQSxXQUFLTyxpQkFBTCxDQUF1Qm5DLFFBQXZCLEVBQWlDO0FBQUVvQyxRQUFBQSxNQUFNLEVBQUVKLE9BQVY7QUFBbUJLLFFBQUFBLEVBQUUsRUFBRTtBQUF2QixPQUFqQyxFQUE2RG5FLFNBQTdELEVBQXdFQSxTQUF4RSxFQUFtRksscUJBQXFCLENBQUMrRCxnQkFBdEIsQ0FBdUNDLElBQTFIO0FBQ0gsS0FQRDtBQVFIOztBQUNEQyxFQUFBQSxhQUFhLENBQUN4QyxRQUFELEVBQVdDLElBQVgsRUFBaUI7QUFDMUIsVUFBTXdDLEVBQUUsR0FBRyxLQUFLakQsZ0JBQUwsQ0FBc0JrRCxHQUF0QixDQUEwQi9ELE9BQU8sQ0FBQ2dFLFdBQWxDLENBQVg7O0FBQ0EsUUFBSSxDQUFDLE9BQU8xQyxJQUFJLENBQUMyQyxNQUFaLEtBQXVCLFFBQXZCLElBQW1DM0MsSUFBSSxDQUFDMkMsTUFBTCxDQUFZQyxNQUFaLEtBQXVCLENBQTNELEtBQWlFNUMsSUFBSSxDQUFDNkMsT0FBdEUsSUFBaUYsQ0FBQ0wsRUFBRSxDQUFDTSxjQUFILENBQWtCOUMsSUFBSSxDQUFDNkMsT0FBdkIsQ0FBdEYsRUFBdUg7QUFDbkgsYUFBTyxLQUFLWCxpQkFBTCxDQUF1Qm5DLFFBQXZCLEVBQWlDO0FBQUVvQyxRQUFBQSxNQUFNLEVBQUcseUJBQXdCbkMsSUFBSSxDQUFDNkMsT0FBUSxHQUFoRDtBQUFvRFQsUUFBQUEsRUFBRSxFQUFFO0FBQXhELE9BQWpDLEVBQThGbkUsU0FBOUYsRUFBeUdBLFNBQXpHLEVBQW9ISyxxQkFBcUIsQ0FBQytELGdCQUF0QixDQUF1Q0MsSUFBM0osQ0FBUDtBQUNIOztBQUNELFNBQUtTLFdBQUwsQ0FBaUIvQyxJQUFqQixFQUNLdEMsSUFETCxDQUNVLE1BQU0sS0FBS3NGLHFCQUFMLENBQTJCaEQsSUFBM0IsQ0FEaEIsRUFFS3RDLElBRkwsQ0FFVSxNQUFNLEtBQUsrRCxJQUFMLENBQVUsbUJBQVYsQ0FGaEIsRUFHS0MsS0FITCxDQUdXQyxFQUFFLElBQUk7QUFDYixZQUFNSSxPQUFPLEdBQUcsS0FBS2tCLGlDQUFMLENBQXVDakQsSUFBdkMsRUFBNkMyQixFQUE3QyxLQUFvRCxhQUFwRTtBQUNBLFdBQUtPLGlCQUFMLENBQXVCbkMsUUFBdkIsRUFBaUM7QUFBRW9DLFFBQUFBLE1BQU0sRUFBRUosT0FBVjtBQUFtQkssUUFBQUEsRUFBRSxFQUFFO0FBQXZCLE9BQWpDLEVBQTZEbkUsU0FBN0QsRUFBd0VBLFNBQXhFLEVBQW1GSyxxQkFBcUIsQ0FBQytELGdCQUF0QixDQUF1Q0MsSUFBMUg7QUFDSCxLQU5EO0FBT0g7O0FBQ0RTLEVBQUFBLFdBQVcsQ0FBQy9DLElBQUQsRUFBTztBQUNkLFdBQU90RCxTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxZQUFNMkUsUUFBUSxHQUFHdkMsY0FBYyxDQUFDb0UsdUJBQWYsQ0FBdUNsRCxJQUF2QyxFQUE2QyxJQUE3QyxFQUFtRCxLQUFLTiw0QkFBeEQsQ0FBakI7QUFDQSxXQUFLRSxXQUFMLEdBQW1CeUIsUUFBUSxDQUFDRSxpQkFBVCxDQUEyQixLQUFLaEMsZ0JBQWhDLENBQW5CO0FBQ0EsWUFBTTRELFVBQVUsR0FBRyxNQUFNLEtBQUt2RCxXQUFMLENBQWlCNEIsS0FBakIsRUFBekI7QUFDQSxhQUFPSCxRQUFRLENBQUMrQix3QkFBVCxDQUFrQ0QsVUFBbEMsQ0FBUDtBQUNILEtBTGUsQ0FBaEI7QUFNSDs7QUFDREgsRUFBQUEscUJBQXFCLENBQUNoRCxJQUFELEVBQU87QUFDeEIsV0FBT3RELFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ2hELGFBQU8sSUFBSUssT0FBSixDQUFZLENBQUNDLE9BQUQsRUFBVUMsTUFBVixLQUFxQlAsU0FBUyxDQUFDLElBQUQsRUFBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDakYsWUFBSWEsUUFBUSxHQUFHLEtBQWY7QUFDQSxjQUFNOEYsUUFBUSxHQUFHLEtBQUtDLG9CQUFMLENBQTBCdEQsSUFBMUIsQ0FBakI7QUFDQSxjQUFNdUQsT0FBTyxHQUFHQyxVQUFVLENBQUMsTUFBTTtBQUM3QmpHLFVBQUFBLFFBQVEsR0FBRyxJQUFYO0FBQ0FOLFVBQUFBLE1BQU0sQ0FBQyxJQUFJd0csS0FBSixDQUFVLHlDQUFWLENBQUQsQ0FBTjtBQUNILFNBSHlCLEVBR3ZCSixRQUh1QixDQUExQjs7QUFJQSxZQUFJO0FBQ0EsZ0JBQU0sS0FBS3pELFdBQUwsQ0FBaUJKLE1BQXZCO0FBQ0ErRCxVQUFBQSxPQUFPLENBQUNHLEtBQVI7O0FBQ0EsY0FBSSxDQUFDbkcsUUFBTCxFQUFlO0FBQ1hQLFlBQUFBLE9BQU87QUFDVjtBQUNKLFNBTkQsQ0FPQSxPQUFPMkUsRUFBUCxFQUFXO0FBQ1AxRSxVQUFBQSxNQUFNLENBQUMwRSxFQUFELENBQU47QUFDSDtBQUNKLE9BakJnRCxDQUExQyxDQUFQO0FBa0JILEtBbkJlLENBQWhCO0FBb0JIOztBQUNEMkIsRUFBQUEsb0JBQW9CLENBQUN0RCxJQUFELEVBQU87QUFDdkI7QUFDQTtBQUNBLFVBQU0yRCxpQkFBaUIsR0FBRyxPQUFPM0QsSUFBSSxDQUFDdUQsT0FBWixLQUF3QixRQUF4QixHQUFtQ3ZELElBQUksQ0FBQ3VELE9BQXhDLEdBQWtEckUsd0JBQTVFO0FBQ0EsV0FBTzBFLElBQUksQ0FBQ0MsR0FBTCxDQUFTRixpQkFBVCxFQUE0QnhFLDRCQUE1QixDQUFQO0FBQ0g7O0FBQ0Q4RCxFQUFBQSxpQ0FBaUMsQ0FBQ2EsVUFBRCxFQUFhakMsS0FBYixFQUFvQjtBQUNqRCxRQUFJLENBQUNBLEtBQUwsRUFBWTtBQUNSO0FBQ0g7O0FBQ0QsVUFBTWtDLFFBQVEsR0FBRyxPQUFPbEMsS0FBUCxLQUFpQixRQUFqQixHQUE0QkEsS0FBNUIsR0FBc0NBLEtBQUssQ0FBQ0UsT0FBTixJQUFpQkYsS0FBSyxDQUFDRSxPQUFOLENBQWNhLE1BQWQsR0FBdUIsQ0FBekMsR0FBOENmLEtBQUssQ0FBQ0UsT0FBcEQsR0FBOEQsRUFBcEg7O0FBQ0EsUUFBSXRELFNBQVMsQ0FBQ3VGLG1CQUFWLENBQThCbkMsS0FBOUIsQ0FBSixFQUEwQztBQUN0QyxhQUFRLGtFQUFpRWlDLFVBQVUsQ0FBQ0csVUFBVyxHQUEvRjtBQUNILEtBRkQsTUFHSztBQUNELGFBQU9GLFFBQVA7QUFDSDtBQUNKOztBQUNEOUIsRUFBQUEsaUNBQWlDLENBQUNKLEtBQUQsRUFBUTtBQUNyQyxRQUFJLENBQUNBLEtBQUwsRUFBWTtBQUNSO0FBQ0g7O0FBQ0QsUUFBSUEsS0FBSyxDQUFDcUMsSUFBTixLQUFlLGNBQWYsSUFBaUNyQyxLQUFLLENBQUNzQyxLQUFOLEtBQWdCLGNBQXJELEVBQXFFO0FBQ2pFLGFBQVEscUJBQW9CdEMsS0FBSyxDQUFDRSxPQUFRLEdBQTFDO0FBQ0gsS0FGRCxNQUdLO0FBQ0QsYUFBTyxPQUFPRixLQUFQLEtBQWlCLFFBQWpCLEdBQTRCQSxLQUE1QixHQUFzQ0EsS0FBSyxDQUFDRSxPQUFOLElBQWlCRixLQUFLLENBQUNFLE9BQU4sQ0FBY2EsTUFBZCxHQUF1QixDQUF6QyxHQUE4Q2YsS0FBSyxDQUFDRSxPQUFwRCxHQUE4RCxFQUExRztBQUNIO0FBQ0o7O0FBakkyRDs7QUFtSWhFakUsT0FBTyxDQUFDc0IsY0FBUixHQUF5QkEsY0FBekI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBLE1BQU1nRixZQUFOLENBQW1CO0FBQ2Y5RSxFQUFBQSxXQUFXLENBQUNDLGdCQUFELEVBQW1CO0FBQzFCLFNBQUtBLGdCQUFMLEdBQXdCQSxnQkFBeEI7QUFDQSxTQUFLOEUsWUFBTCxHQUFvQixLQUFwQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUIsRUFBbkI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLEtBQW5CO0FBQ0EsU0FBS0MsbUJBQUwsR0FBMkIsS0FBM0I7QUFDQSxTQUFLQyxzQkFBTCxHQUE4QixLQUE5QjtBQUNBLFNBQUtDLE9BQUwsR0FBZSxLQUFmO0FBQ0E7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNROztBQUNBLFNBQUsvRSxRQUFMLEdBQWdCLE1BQU1qRCxTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUMvRDRCLE1BQUFBLHFCQUFxQixDQUFDc0QsTUFBdEIsQ0FBNkIrQyxPQUE3QixDQUFxQyxvQkFBckM7O0FBQ0EsVUFBSSxLQUFLSixXQUFULEVBQXNCO0FBQ2xCO0FBQ0g7O0FBQ0QsV0FBS0EsV0FBTCxHQUFtQixJQUFuQjtBQUNBakcsTUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QitDLE9BQTdCLENBQXFDLFVBQXJDOztBQUNBLFVBQUksQ0FBQyxLQUFLSCxtQkFBTixJQUE2QixDQUFDLEtBQUtFLE9BQXZDLEVBQWdEO0FBQzVDO0FBQ0EsWUFBSTtBQUNBcEcsVUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QitDLE9BQTdCLENBQXFDLDBCQUFyQztBQUNBLGVBQUtDLFdBQUwsQ0FBaUIsSUFBSXRHLHFCQUFxQixDQUFDdUcsZUFBMUIsRUFBakIsRUFBOEQsS0FBS0MsWUFBbkU7QUFDSCxTQUhELENBSUEsT0FBT0MsR0FBUCxFQUFZO0FBQ1IsZ0JBQU1oRCxPQUFPLEdBQUksc0NBQXFDZ0QsR0FBRyxJQUFJQSxHQUFHLENBQUNoRCxPQUFYLEdBQXFCZ0QsR0FBRyxDQUFDaEQsT0FBekIsR0FBbUNnRCxHQUFHLENBQUNDLFFBQUosRUFBZSxFQUF4RztBQUNBLGdCQUFNQyxPQUFPLEdBQUcsQ0FBQ2xELE9BQUQsRUFBVWdELEdBQUcsSUFBSUEsR0FBRyxDQUFDakQsSUFBWCxHQUFrQmlELEdBQUcsQ0FBQ2pELElBQXRCLEdBQTZCLEVBQXZDLEVBQTJDaUQsR0FBRyxJQUFJQSxHQUFHLENBQUMvQyxLQUFYLEdBQW1CK0MsR0FBRyxDQUFDL0MsS0FBdkIsR0FBK0IsRUFBMUUsRUFBOEVrRCxJQUE5RSxDQUFtRi9HLElBQUksQ0FBQ2dILEdBQXhGLENBQWhCO0FBQ0E3RyxVQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCQyxLQUE3QixDQUFvQyxHQUFFRSxPQUFRLEdBQUU1RCxJQUFJLENBQUNnSCxHQUFJLEdBQUVGLE9BQVEsRUFBbkU7QUFDSDs7QUFDRCxhQUFLVCxtQkFBTCxHQUEyQixJQUEzQjtBQUNIOztBQUNELFVBQUksQ0FBQyxLQUFLQyxzQkFBTixJQUFnQyxLQUFLQyxPQUFyQyxJQUFnRCxLQUFLVSxpQkFBekQsRUFBNEU7QUFDeEU7QUFDQSxZQUFJO0FBQ0E5RyxVQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCK0MsT0FBN0IsQ0FBcUMsNkJBQXJDO0FBQ0EsZUFBS0MsV0FBTCxDQUFpQixJQUFJdEcscUJBQXFCLENBQUMrRyxRQUExQixDQUFtQyxLQUFLRCxpQkFBeEMsRUFBMkQsRUFBM0QsQ0FBakIsRUFBaUYsS0FBS04sWUFBdEY7QUFDSCxTQUhELENBSUEsT0FBT0MsR0FBUCxFQUFZO0FBQ1IsZ0JBQU1oRCxPQUFPLEdBQUkseUNBQXdDZ0QsR0FBRyxJQUFJQSxHQUFHLENBQUNoRCxPQUFYLEdBQXFCZ0QsR0FBRyxDQUFDaEQsT0FBekIsR0FBbUNnRCxHQUFHLENBQUNDLFFBQUosRUFBZSxFQUEzRztBQUNBLGdCQUFNQyxPQUFPLEdBQUcsQ0FBQ2xELE9BQUQsRUFBVWdELEdBQUcsSUFBSUEsR0FBRyxDQUFDakQsSUFBWCxHQUFrQmlELEdBQUcsQ0FBQ2pELElBQXRCLEdBQTZCLEVBQXZDLEVBQTJDaUQsR0FBRyxJQUFJQSxHQUFHLENBQUMvQyxLQUFYLEdBQW1CK0MsR0FBRyxDQUFDL0MsS0FBdkIsR0FBK0IsRUFBMUUsRUFBOEVrRCxJQUE5RSxDQUFtRi9HLElBQUksQ0FBQ2dILEdBQXhGLENBQWhCO0FBQ0E3RyxVQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCQyxLQUE3QixDQUFvQyxHQUFFRSxPQUFRLEdBQUU1RCxJQUFJLENBQUNnSCxHQUFJLEdBQUVGLE9BQVEsRUFBbkU7QUFDSDs7QUFDRCxhQUFLUixzQkFBTCxHQUE4QixJQUE5QjtBQUNIOztBQUNELFVBQUksS0FBS2EsY0FBTCxLQUF3QixRQUF4QixJQUFvQyxLQUFLQyxjQUE3QyxFQUE2RDtBQUN6RGpILFFBQUFBLHFCQUFxQixDQUFDc0QsTUFBdEIsQ0FBNkIrQyxPQUE3QixDQUFxQyxpQkFBckM7O0FBQ0EsWUFBSTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQU0vRixPQUFPLENBQUM0RyxLQUFSLENBQWMsR0FBZCxDQUFOO0FBQ0FsSCxVQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCK0MsT0FBN0IsQ0FBcUMsa0JBQXJDO0FBQ0ExRixVQUFBQSxlQUFlLENBQUMsS0FBS3NHLGNBQU4sQ0FBZjtBQUNILFNBUkQsQ0FTQSxPQUFPRSxFQUFQLEVBQVcsQ0FBRzs7QUFDZCxhQUFLRixjQUFMLEdBQXNCdEgsU0FBdEI7QUFDSDs7QUFDRCxVQUFJLENBQUMsS0FBS3lHLE9BQVYsRUFBbUI7QUFDZixZQUFJLEtBQUtnQixZQUFULEVBQXVCO0FBQ25CcEgsVUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QitDLE9BQTdCLENBQXFDLDZCQUFyQztBQUNBLGVBQUtlLFlBQUwsQ0FBa0IvRixRQUFsQjtBQUNIOztBQUNEckIsUUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QitDLE9BQTdCLENBQXFDLFdBQXJDO0FBQ0EsY0FBTS9GLE9BQU8sQ0FBQzRHLEtBQVIsQ0FBYyxHQUFkLENBQU4sQ0FOZSxDQU9mOztBQUNBLGFBQUtsQixXQUFMLENBQWlCcUIsT0FBakIsQ0FBeUJDLFVBQVUsSUFBSUEsVUFBVSxDQUFDQyxPQUFYLEVBQXZDO0FBQ0g7QUFDSixLQXpEOEIsQ0FBL0I7QUEwREE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDUSxTQUFLQyxvQkFBTCxHQUE2Qi9GLFFBQUQsSUFBY3JELFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ25GLFlBQU1xSixxQkFBcUIsR0FBRyxNQUFPLEtBQUtULGNBQUwsS0FBd0IsUUFBeEIsR0FBbUMsS0FBS2xFLGFBQXhDLEdBQXdELEtBQUttQixhQUFsRyxDQURtRixDQUVuRjs7QUFDQSxXQUFLeUQsTUFBTCxHQUFjLE1BQU0sS0FBS04sWUFBTCxDQUFrQjlGLFdBQWxCLENBQThCSixNQUFsRCxDQUhtRixDQUluRjtBQUNBOztBQUNBLFdBQUt3RyxNQUFMLENBQVlDLEVBQVosQ0FBZSxLQUFmLEVBQXNCLE1BQU07QUFDeEIzSCxRQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCK0MsT0FBN0IsQ0FBcUMsWUFBckM7QUFDQSxhQUFLaEYsUUFBTCxHQUFnQnVHLFlBQWhCO0FBQ0gsT0FIRDtBQUlBLFdBQUtGLE1BQUwsQ0FBWUMsRUFBWixDQUFlLE9BQWYsRUFBd0IsTUFBTTtBQUMxQjNILFFBQUFBLHFCQUFxQixDQUFDc0QsTUFBdEIsQ0FBNkIrQyxPQUE3QixDQUFxQyxjQUFyQztBQUNBLGFBQUtoRixRQUFMLEdBQWdCdUcsWUFBaEI7QUFDSCxPQUhELEVBVm1GLENBY25GOztBQUNBLFVBQUksS0FBS1osY0FBTCxLQUF3QixRQUE1QixFQUFzQztBQUNsQyxjQUFNYSx3QkFBd0IsR0FBRyxLQUFLNUcsZ0JBQUwsQ0FBc0JrRCxHQUF0QixDQUEwQnpELE9BQU8sQ0FBQ29ILGVBQWxDLENBQWpDO0FBQ0FELFFBQUFBLHdCQUF3QixDQUFDRSxPQUF6QixDQUFpQyxLQUFLTCxNQUF0QztBQUNBRyxRQUFBQSx3QkFBd0IsQ0FBQ0csSUFBekIsQ0FBOEIsZUFBOUIsRUFBZ0RDLElBQUQsSUFBVTtBQUNyRCxlQUFLaEIsY0FBTCxHQUFzQmdCLElBQUksQ0FBQ3RHLElBQUwsQ0FBVXVHLGVBQWhDO0FBQ0gsU0FGRDtBQUdILE9BckJrRixDQXNCbkY7OztBQUNBLFdBQUtDLFdBQUwsQ0FBaUJDLE1BQWpCLENBQXdCLEtBQUtDLHVCQUE3QjtBQUNBLFdBQUtDLHdCQUFMLENBQThCRixNQUE5QixDQUFxQyxLQUFLNUIsWUFBMUMsRUF4Qm1GLENBeUJuRjtBQUNBOztBQUNBLFdBQUsyQixXQUFMLENBQWlCUixFQUFqQixDQUFvQixNQUFwQixFQUE0QlksSUFBSSxJQUFJO0FBQ2hDLGFBQUtiLE1BQUwsQ0FBWWMsS0FBWixDQUFrQkQsSUFBbEI7QUFDSCxPQUZEO0FBR0EsV0FBS2IsTUFBTCxDQUFZQyxFQUFaLENBQWUsTUFBZixFQUF3QlksSUFBRCxJQUFVO0FBQzdCLGFBQUtFLG1CQUFMLENBQXlCRCxLQUF6QixDQUErQkQsSUFBL0I7QUFDQSxhQUFLL0IsWUFBTCxDQUFrQmdDLEtBQWxCLENBQXdCRCxJQUF4QjtBQUNILE9BSEQsRUE5Qm1GLENBa0NuRjs7QUFDQSxXQUFLakMsV0FBTCxDQUFpQm1CLHFCQUFqQixFQUF3QyxLQUFLQyxNQUE3QyxFQW5DbUYsQ0FvQ25GOztBQUNBLFdBQUtwQixXQUFMLENBQWlCLE1BQU0sS0FBSzlFLGlCQUE1QixFQUErQyxLQUFLa0csTUFBcEQ7QUFDSCxLQXRDa0QsQ0FBbkQ7O0FBdUNBLFNBQUtnQixtQkFBTCxHQUE0QkMsT0FBRCxJQUFhO0FBQ3BDLFdBQUsxQyxXQUFMLEdBQW1CLEtBQW5CO0FBQ0EsV0FBS0MsbUJBQUwsR0FBMkIsS0FBM0I7QUFDQSxXQUFLQyxzQkFBTCxHQUE4QixLQUE5QjtBQUNBLFdBQUtDLE9BQUwsR0FBZSxLQUFmO0FBQ0EsV0FBS1UsaUJBQUwsR0FBeUJuSCxTQUF6QjtBQUNBLFdBQUtpSix5QkFBTCxDQUErQmxLLE9BQS9CLENBQXVDaUssT0FBdkM7QUFDSCxLQVBEOztBQVFBLFNBQUtFLGVBQUwsR0FBd0JGLE9BQUQsSUFBYTtBQUNoQyxXQUFLM0IsY0FBTCxHQUFzQixRQUF0QjtBQUNBLFdBQUs4QixjQUFMLEdBQXNCSCxPQUFPLENBQUNJLFNBQVIsQ0FBa0JDLFNBQWxCLEtBQWdDLElBQXREO0FBQ0EsV0FBS0MscUJBQUwsQ0FBMkJ2SyxPQUEzQixDQUFtQ2lLLE9BQW5DO0FBQ0gsS0FKRDs7QUFLQSxTQUFLTyxlQUFMLEdBQXdCUCxPQUFELElBQWE7QUFDaEMsV0FBSzNCLGNBQUwsR0FBc0IsUUFBdEI7QUFDQSxXQUFLOEIsY0FBTCxHQUFzQkgsT0FBTyxDQUFDSSxTQUFSLENBQWtCQyxTQUFsQixLQUFnQyxJQUF0RDtBQUNBLFdBQUtHLHFCQUFMLENBQTJCekssT0FBM0IsQ0FBbUNpSyxPQUFuQztBQUNILEtBSkQ7O0FBS0EsU0FBS1MsbUJBQUwsR0FBNEJULE9BQUQsSUFBYTtBQUNwQyxXQUFLN0IsaUJBQUwsR0FBeUI2QixPQUF6Qjs7QUFDQSxVQUFJLEtBQUszQixjQUFMLEtBQXdCLFFBQTVCLEVBQXNDO0FBQ2xDO0FBQ0g7O0FBQ0QsWUFBTXRGLElBQUksR0FBR2lILE9BQU8sQ0FBQ0ksU0FBckI7O0FBQ0EsVUFBSXJILElBQUksSUFBSUEsSUFBSSxDQUFDMEUsT0FBakIsRUFBMEI7QUFDdEIsYUFBS0EsT0FBTCxHQUFlLElBQWY7QUFDSCxPQVJtQyxDQVNwQztBQUNBOzs7QUFDQWxCLE1BQUFBLFVBQVUsQ0FBQyxLQUFLN0QsUUFBTixFQUFnQixHQUFoQixDQUFWO0FBQ0gsS0FaRDs7QUFhQSxTQUFLZ0ksaUJBQUwsR0FBeUIsTUFBTWpMLFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ3hFNEIsTUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QitDLE9BQTdCLENBQXFDLG1CQUFyQztBQUNBLFdBQUtILG1CQUFMLEdBQTJCLElBQTNCLENBRndFLENBR3hFOztBQUNBaEIsTUFBQUEsVUFBVSxDQUFDLEtBQUs3RCxRQUFOLEVBQWdCLEdBQWhCLENBQVY7QUFDSCxLQUx1QyxDQUF4Qzs7QUFNQSxTQUFLaUksb0JBQUwsR0FBNEIsTUFBTWxMLFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQzNFLFdBQUsrSCxzQkFBTCxHQUE4QixJQUE5QjtBQUNBbkcsTUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QitDLE9BQTdCLENBQXFDLHNCQUFyQyxFQUYyRSxDQUczRTtBQUNBO0FBQ0E7O0FBQ0FuQixNQUFBQSxVQUFVLENBQUMsS0FBSzdELFFBQU4sRUFBZ0IsR0FBaEIsQ0FBVjtBQUNILEtBUDBDLENBQTNDOztBQVFBLFNBQUtrSSxrQkFBTCxHQUEwQixJQUFJeEosUUFBUSxDQUFDeUosV0FBYixFQUExQjtBQUNBLFNBQUtmLG1CQUFMLEdBQTJCLElBQUkxSSxRQUFRLENBQUN5SixXQUFiLEVBQTNCO0FBQ0EsU0FBS2xCLHdCQUFMLEdBQWdDLElBQUl2SSxRQUFRLENBQUN5SixXQUFiLEVBQWhDO0FBQ0EsU0FBS25CLHVCQUFMLEdBQStCLElBQUl0SSxRQUFRLENBQUN5SixXQUFiLEVBQS9CO0FBQ0EsU0FBS0MscUJBQUwsR0FBNkIsS0FBS3hJLGdCQUFMLENBQXNCa0QsR0FBdEIsQ0FBMEJ6RCxPQUFPLENBQUNnSixzQkFBbEMsQ0FBN0I7QUFDQSxTQUFLQyxtQkFBTCxHQUEyQixLQUFLMUksZ0JBQUwsQ0FBc0JrRCxHQUF0QixDQUEwQnpELE9BQU8sQ0FBQ29ILGVBQWxDLENBQTNCO0FBQ0EsU0FBSzZCLG1CQUFMLENBQXlCNUIsT0FBekIsQ0FBaUMsS0FBS3dCLGtCQUF0QztBQUNBLFNBQUt2RCxXQUFMLENBQWlCNEQsSUFBakIsQ0FBc0IsS0FBS0QsbUJBQTNCO0FBQ0EsU0FBS0Usb0JBQUwsR0FBNEIsS0FBSzVJLGdCQUFMLENBQXNCa0QsR0FBdEIsQ0FBMEJ6RCxPQUFPLENBQUNvSCxlQUFsQyxDQUE1QjtBQUNBLFNBQUsrQixvQkFBTCxDQUEwQjlCLE9BQTFCLENBQWtDLEtBQUtVLG1CQUF2QztBQUNBLFNBQUt6QyxXQUFMLENBQWlCNEQsSUFBakIsQ0FBc0IsS0FBS0Msb0JBQTNCO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixLQUFLN0ksZ0JBQUwsQ0FBc0JrRCxHQUF0QixDQUEwQnpELE9BQU8sQ0FBQ3FKLGVBQWxDLENBQXRCO0FBQ0EsU0FBS0QsY0FBTCxDQUFvQi9CLE9BQXBCLENBQTRCLEtBQUt3QixrQkFBakMsRUFBcUQsS0FBS2QsbUJBQTFEO0FBQ0EsU0FBS3pDLFdBQUwsQ0FBaUI0RCxJQUFqQixDQUFzQixLQUFLRSxjQUEzQjtBQUNBLFNBQUtsQix5QkFBTCxHQUFpQ3RJLE9BQU8sQ0FBQ2EsY0FBUixFQUFqQztBQUNBLFNBQUs4SCxxQkFBTCxHQUE2QjNJLE9BQU8sQ0FBQ2EsY0FBUixFQUE3QjtBQUNBLFNBQUtnSSxxQkFBTCxHQUE2QjdJLE9BQU8sQ0FBQ2EsY0FBUixFQUE3QjtBQUNIOztBQUNELE1BQUlLLGlCQUFKLEdBQXdCO0FBQ3BCLFdBQU8sS0FBS29ILHlCQUFMLENBQStCb0IsT0FBdEM7QUFDSDs7QUFDRCxNQUFJL0YsYUFBSixHQUFvQjtBQUNoQixXQUFPLEtBQUtnRixxQkFBTCxDQUEyQmUsT0FBbEM7QUFDSDs7QUFDRCxNQUFJbEgsYUFBSixHQUFvQjtBQUNoQixXQUFPLEtBQUtxRyxxQkFBTCxDQUEyQmEsT0FBbEM7QUFDSDs7QUFDRCxNQUFJbEIsY0FBSixDQUFtQmpLLEtBQW5CLEVBQTBCO0FBQ3RCLFFBQUlBLEtBQUosRUFBVztBQUNQbUIsTUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QjJHLEtBQTdCLENBQW1DaEssUUFBUSxDQUFDaUssUUFBVCxDQUFrQkMsT0FBckQsRUFBOEQsSUFBOUQ7QUFDQSxXQUFLTCxjQUFMLENBQW9CRyxLQUFwQixDQUEwQmpLLHFCQUFxQixDQUFDc0QsTUFBaEQ7QUFDSDtBQUNKOztBQUNEaUUsRUFBQUEsT0FBTyxHQUFHO0FBQ052SCxJQUFBQSxxQkFBcUIsQ0FBQ3NELE1BQXRCLENBQTZCK0MsT0FBN0IsQ0FBcUMsY0FBckM7QUFDQSxTQUFLaEYsUUFBTCxHQUFnQnVHLFlBQWhCO0FBQ0g7O0FBQ0R3QyxFQUFBQSxLQUFLLEdBQUc7QUFDSixXQUFPaE0sU0FBUyxDQUFDLElBQUQsRUFBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDaEQsWUFBTWlNLG1CQUFtQixHQUFHLEtBQUtwSixnQkFBTCxDQUFzQmtELEdBQXRCLENBQTBCekQsT0FBTyxDQUFDNEosb0JBQWxDLENBQTVCO0FBQ0EsWUFBTTtBQUFFQyxRQUFBQSxLQUFGO0FBQVNDLFFBQUFBO0FBQVQsVUFBb0IsTUFBTUgsbUJBQW1CLENBQUNJLHdCQUFwQixFQUFoQztBQUNBLFdBQUsxRSxZQUFMLEdBQW9Cc0UsbUJBQW1CLENBQUNLLG9CQUF4QztBQUNBLFdBQUt2QyxXQUFMLEdBQW1Cb0MsS0FBbkI7QUFDQSxXQUFLL0QsWUFBTCxHQUFvQmdFLE1BQXBCO0FBQ0EsV0FBS3JDLFdBQUwsQ0FBaUJ3QyxLQUFqQjs7QUFDQSxVQUFJLENBQUMsS0FBSzVFLFlBQVYsRUFBd0I7QUFDcEIsY0FBTTZFLGNBQWMsR0FBRyxLQUFLM0osZ0JBQUwsQ0FBc0JrRCxHQUF0QixDQUEwQjlELE9BQU8sQ0FBQ3dLLGVBQWxDLENBQXZCO0FBQ0FELFFBQUFBLGNBQWMsQ0FBQ2pELEVBQWYsQ0FBa0IsU0FBbEIsRUFBNkIsTUFBTTtBQUMvQixjQUFJLENBQUMsS0FBS3ZCLE9BQVYsRUFBbUI7QUFDZixpQkFBSy9FLFFBQUwsR0FBZ0J1RyxZQUFoQjtBQUNIO0FBQ0osU0FKRDtBQUtIOztBQUNELFdBQUtrRCx5QkFBTDtBQUNBLFdBQUtDLGlCQUFMO0FBQ0gsS0FqQmUsQ0FBaEI7QUFrQkg7O0FBQ0R6RSxFQUFBQSxXQUFXLENBQUM3QyxPQUFELEVBQVUrQyxZQUFWLEVBQXdCO0FBQy9CLFNBQUtpRCxxQkFBTCxDQUEyQmpCLEtBQTNCLENBQWlDaEMsWUFBakMsRUFBK0MvQyxPQUEvQztBQUNBLFNBQUtnRyxxQkFBTCxDQUEyQmpCLEtBQTNCLENBQWlDLEtBQUtDLG1CQUF0QyxFQUEyRGhGLE9BQTNEO0FBQ0g7O0FBQ0RzSCxFQUFBQSxpQkFBaUIsR0FBRztBQUNoQixTQUFLM0QsWUFBTCxHQUFvQixJQUFJdEcsY0FBSixDQUFtQixLQUFLRyxnQkFBeEIsQ0FBcEI7QUFDQSxTQUFLbUcsWUFBTCxDQUFrQjRELGNBQWxCLENBQWlDLEtBQUtqRixZQUF0QztBQUNBLFNBQUtxQixZQUFMLENBQWtCWSxJQUFsQixDQUF1QixtQkFBdkIsRUFBNEMsS0FBS1Isb0JBQWpEO0FBQ0EsU0FBS0osWUFBTCxDQUFrQlksSUFBbEIsQ0FBdUIsbUJBQXZCLEVBQTRDLEtBQUtSLG9CQUFqRDtBQUNBLFNBQUtjLHdCQUFMLENBQThCMkMsSUFBOUIsQ0FBbUMsS0FBS3hDLG1CQUF4QztBQUNBLFNBQUtILHdCQUFMLENBQThCMkMsSUFBOUIsQ0FBbUMsS0FBS3pFLFlBQXhDLEVBTmdCLENBT2hCO0FBQ0E7O0FBQ0EsU0FBSzJCLFdBQUwsQ0FBaUI4QyxJQUFqQixDQUFzQixLQUFLMUIsa0JBQTNCO0FBQ0EsU0FBS3BCLFdBQUwsQ0FBaUI4QyxJQUFqQixDQUFzQixLQUFLNUMsdUJBQTNCO0FBQ0EsU0FBS2pCLFlBQUwsQ0FBa0JnRCxLQUFsQixDQUF3QixLQUFLL0IsdUJBQTdCLEVBQXNELEtBQUtDLHdCQUEzRDtBQUNIOztBQUNEd0MsRUFBQUEseUJBQXlCLEdBQUc7QUFDeEI7QUFDQSxTQUFLbkIsbUJBQUwsQ0FBeUIzQixJQUF6QixDQUE4QixvQkFBOUIsRUFBb0QsS0FBS1UsbUJBQXpEO0FBQ0EsU0FBS2lCLG1CQUFMLENBQXlCM0IsSUFBekIsQ0FBOEIsZ0JBQTlCLEVBQWdELEtBQUthLGVBQXJEO0FBQ0EsU0FBS2MsbUJBQUwsQ0FBeUIzQixJQUF6QixDQUE4QixnQkFBOUIsRUFBZ0QsS0FBS2tCLGVBQXJEO0FBQ0EsU0FBS1MsbUJBQUwsQ0FBeUIzQixJQUF6QixDQUE4QixvQkFBOUIsRUFBb0QsS0FBS29CLG1CQUF6RDtBQUNBLFNBQUtTLG9CQUFMLENBQTBCN0IsSUFBMUIsQ0FBK0Isa0JBQS9CLEVBQW1ELEtBQUtxQixpQkFBeEQ7QUFDQSxTQUFLUSxvQkFBTCxDQUEwQjdCLElBQTFCLENBQStCLHFCQUEvQixFQUFzRCxLQUFLc0Isb0JBQTNEO0FBQ0g7O0FBeFBjOztBQTBQbkIsU0FBUzRCLGFBQVQsR0FBeUI7QUFDckIsU0FBTzlNLFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ2hENEIsSUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QjZILElBQTdCLENBQWtDNUssTUFBTSxDQUFDNkssSUFBekMsRUFBK0N0TCxJQUFJLENBQUM4RyxJQUFMLENBQVUxRyxXQUFXLENBQUNtTCxrQkFBdEIsRUFBMkMsUUFBT0MsT0FBTyxDQUFDQyxHQUFJLE1BQTlELENBQS9DO0FBQ0EsVUFBTXRLLGdCQUFnQixHQUFHUixpQkFBaUIsQ0FBQytLLGFBQWxCLEVBQXpCO0FBQ0EsVUFBTS9CLHFCQUFxQixHQUFHeEksZ0JBQWdCLENBQUNrRCxHQUFqQixDQUFxQnpELE9BQU8sQ0FBQ2dKLHNCQUE3QixDQUE5Qjs7QUFDQSxRQUFJO0FBQ0E7QUFDQSxZQUFNK0IsWUFBWSxHQUFHLElBQUkzRixZQUFKLENBQWlCN0UsZ0JBQWpCLENBQXJCO0FBQ0EsWUFBTXdLLFlBQVksQ0FBQ3JCLEtBQWIsRUFBTjtBQUNILEtBSkQsQ0FLQSxPQUFPM0QsR0FBUCxFQUFZO0FBQ1IsWUFBTWhELE9BQU8sR0FBSSxtQkFBa0JnRCxHQUFHLElBQUlBLEdBQUcsQ0FBQ2hELE9BQVgsR0FBcUJnRCxHQUFHLENBQUNoRCxPQUF6QixHQUFtQ2dELEdBQUcsQ0FBQ0MsUUFBSixFQUFlLEVBQXJGO0FBQ0EsWUFBTUMsT0FBTyxHQUFHLENBQUNsRCxPQUFELEVBQVVnRCxHQUFHLElBQUlBLEdBQUcsQ0FBQ2pELElBQVgsR0FBa0JpRCxHQUFHLENBQUNqRCxJQUF0QixHQUE2QixFQUF2QyxFQUEyQ2lELEdBQUcsSUFBSUEsR0FBRyxDQUFDL0MsS0FBWCxHQUFtQitDLEdBQUcsQ0FBQy9DLEtBQXZCLEdBQStCLEVBQTFFLEVBQThFa0QsSUFBOUUsQ0FBbUYvRyxJQUFJLENBQUNnSCxHQUF4RixDQUFoQjtBQUNBN0csTUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QkMsS0FBN0IsQ0FBb0MsR0FBRUUsT0FBUSxHQUFFNUQsSUFBSSxDQUFDZ0gsR0FBSSxHQUFFRixPQUFRLEVBQW5FLEVBSFEsQ0FJUjs7QUFDQThDLE1BQUFBLHFCQUFxQixDQUFDakIsS0FBdEIsQ0FBNEI4QyxPQUFPLENBQUNJLE1BQXBDLEVBQTRDLElBQUkxTCxxQkFBcUIsQ0FBQzJMLEtBQTFCLENBQWdDLE9BQWhDLEVBQXlDbEksT0FBekMsQ0FBNUM7QUFDQWdHLE1BQUFBLHFCQUFxQixDQUFDakIsS0FBdEIsQ0FBNEI4QyxPQUFPLENBQUNJLE1BQXBDLEVBQTRDLElBQUkxTCxxQkFBcUIsQ0FBQzRMLFdBQTFCLENBQXVDLEdBQUVuSSxPQUFRLEdBQUU1RCxJQUFJLENBQUNnSCxHQUFJLEdBQUVGLE9BQVEsRUFBdEUsRUFBeUUsUUFBekUsQ0FBNUM7QUFDSDtBQUNKLEdBakJlLENBQWhCO0FBa0JIOztBQUNEMkUsT0FBTyxDQUFDTyxLQUFSLENBQWNsRSxFQUFkLENBQWlCLE9BQWpCLEVBQTBCLE1BQU0sQ0FBRyxDQUFuQztBQUNBMkQsT0FBTyxDQUFDSSxNQUFSLENBQWUvRCxFQUFmLENBQWtCLE9BQWxCLEVBQTJCLE1BQU0sQ0FBRyxDQUFwQztBQUNBMkQsT0FBTyxDQUFDUSxNQUFSLENBQWVuRSxFQUFmLENBQWtCLE9BQWxCLEVBQTJCLE1BQU0sQ0FBRyxDQUFwQztBQUNBMkQsT0FBTyxDQUFDM0QsRUFBUixDQUFXLG1CQUFYLEVBQWlDbEIsR0FBRCxJQUFTO0FBQ3JDekcsRUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QkMsS0FBN0IsQ0FBb0MsdUJBQXNCa0QsR0FBRyxJQUFJQSxHQUFHLENBQUNoRCxPQUFYLEdBQXFCZ0QsR0FBRyxDQUFDaEQsT0FBekIsR0FBbUMsRUFBRyxFQUFoRztBQUNBekQsRUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QkMsS0FBN0IsQ0FBbUNrRCxHQUFHLElBQUlBLEdBQUcsQ0FBQ2pELElBQVgsR0FBa0JpRCxHQUFHLENBQUNqRCxJQUF0QixHQUE2QixFQUFoRTtBQUNBeEQsRUFBQUEscUJBQXFCLENBQUNzRCxNQUF0QixDQUE2QkMsS0FBN0IsQ0FBbUNrRCxHQUFHLElBQUlBLEdBQUcsQ0FBQy9DLEtBQVgsR0FBbUIrQyxHQUFHLENBQUMvQyxLQUF2QixHQUErQixFQUFsRSxFQUhxQyxDQUlyQzs7QUFDQTFELEVBQUFBLHFCQUFxQixDQUFDc0QsTUFBdEIsQ0FBNkJDLEtBQTdCLENBQW1Da0QsR0FBRyxHQUFHQSxHQUFHLENBQUNDLFFBQUosRUFBSCxHQUFvQixFQUExRCxFQUxxQyxDQU1yQzs7QUFDQXhCLEVBQUFBLFVBQVUsQ0FBQyxNQUFNb0csT0FBTyxDQUFDUyxJQUFSLENBQWEsQ0FBQyxDQUFkLENBQVAsRUFBeUIsR0FBekIsQ0FBVjtBQUNILENBUkQ7QUFTQWIsYUFBYSxHQUFHOUgsS0FBaEIsQ0FBc0JDLEVBQUUsSUFBSSxDQUN4QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuLy8gdHNsaW50OmRpc2FibGU6bm8tYW55IG1heC1mdW5jLWJvZHktbGVuZ3RoIG5vLWVtcHR5IG5vLXJlcXVpcmUtaW1wb3J0cyBuby12YXItcmVxdWlyZXNcclxuaWYgKFJlZmxlY3QubWV0YWRhdGEgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVxdWlyZSgncmVmbGVjdC1tZXRhZGF0YScpO1xyXG59XHJcbmNvbnN0IG9zXzEgPSByZXF1aXJlKFwib3NcIik7XHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuY29uc3Qgc3RyZWFtXzEgPSByZXF1aXJlKFwic3RyZWFtXCIpO1xyXG5jb25zdCB2c2NvZGVfZGVidWdhZGFwdGVyXzEgPSByZXF1aXJlKFwidnNjb2RlLWRlYnVnYWRhcHRlclwiKTtcclxuY29uc3QgbG9nZ2VyXzEgPSByZXF1aXJlKFwidnNjb2RlLWRlYnVnYWRhcHRlci9saWIvbG9nZ2VyXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vY29uc3RhbnRzXCIpO1xyXG5yZXF1aXJlKFwiLi4vLi4vY29tbW9uL2V4dGVuc2lvbnNcIik7XHJcbmNvbnN0IGhlbHBlcnNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vaGVscGVyc1wiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCBhc3luY18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi91dGlscy9hc3luY1wiKTtcclxuY29uc3QgbWlzY18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi91dGlscy9taXNjXCIpO1xyXG5jb25zdCBEZWJ1Z0ZhY3RvcnlfMSA9IHJlcXVpcmUoXCIuL0RlYnVnQ2xpZW50cy9EZWJ1Z0ZhY3RvcnlcIik7XHJcbmNvbnN0IHNlcnZpY2VSZWdpc3RyeV8xID0gcmVxdWlyZShcIi4vc2VydmljZVJlZ2lzdHJ5XCIpO1xyXG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4vdHlwZXNcIik7XHJcbmNvbnN0IGtpbGxQcm9jZXNzVHJlZSA9IHJlcXVpcmUoJ3RyZWUta2lsbCcpO1xyXG5jb25zdCBERUJVR0dFUl9DT05ORUNUX1RJTUVPVVQgPSAyMDAwMDtcclxuY29uc3QgTUlOX0RFQlVHR0VSX0NPTk5FQ1RfVElNRU9VVCA9IDUwMDA7XHJcbi8qKlxyXG4gKiBQcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBjbGFzcyBpcyB0byBwZXJmb3JtIHRoZSBoYW5kc2hha2Ugd2l0aCBWUyBDb2RlIGFuZCBsYXVuY2ggUFRWU0QgcHJvY2Vzcy5cclxuICogSS5lLiBpdCBjb21tdW5pY2F0ZSB3aXRoIFZTIENvZGUgYmVmb3JlIFBUVlNEIGdldHMgaW50byB0aGUgcGljdHVyZSwgb25jZSBQVFZTRCBpcyBsYXVuY2hlZCwgUFRWU0Qgd2lsbCB0YWxrIGRpcmVjdGx5IHRvIFZTIENvZGUuXHJcbiAqIFdlJ3JlIHJlLXVzaW5nIERlYnVnU2Vzc2lvbiBzbyB3ZSBkb24ndCBoYXZlIHRvIGhhbmRsZSByZXF1ZXN0L3Jlc3BvbnNlIG91cnNlbHZlcy5cclxuICogQGV4cG9ydFxyXG4gKiBAY2xhc3MgUHl0aG9uRGVidWdnZXJcclxuICogQGV4dGVuZHMge0RlYnVnU2Vzc2lvbn1cclxuICovXHJcbmNsYXNzIFB5dGhvbkRlYnVnZ2VyIGV4dGVuZHMgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLkRlYnVnU2Vzc2lvbiB7XHJcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlQ29udGFpbmVyKSB7XHJcbiAgICAgICAgc3VwZXIoZmFsc2UpO1xyXG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICAgICAgdGhpcy5jbGllbnQgPSBhc3luY18xLmNyZWF0ZURlZmVycmVkKCk7XHJcbiAgICAgICAgdGhpcy5zdXBwb3J0c1J1bkluVGVybWluYWxSZXF1ZXN0ID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBzaHV0ZG93bigpIHtcclxuICAgICAgICBpZiAodGhpcy5kZWJ1Z1NlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLmRlYnVnU2VydmVyLlN0b3AoKTtcclxuICAgICAgICAgICAgdGhpcy5kZWJ1Z1NlcnZlciA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3VwZXIuc2h1dGRvd24oKTtcclxuICAgIH1cclxuICAgIGluaXRpYWxpemVSZXF1ZXN0KHJlc3BvbnNlLCBhcmdzKSB7XHJcbiAgICAgICAgY29uc3QgYm9keSA9IHJlc3BvbnNlLmJvZHk7XHJcbiAgICAgICAgYm9keS5zdXBwb3J0c0V4Y2VwdGlvbkluZm9SZXF1ZXN0ID0gdHJ1ZTtcclxuICAgICAgICBib2R5LnN1cHBvcnRzQ29uZmlndXJhdGlvbkRvbmVSZXF1ZXN0ID0gdHJ1ZTtcclxuICAgICAgICBib2R5LnN1cHBvcnRzQ29uZGl0aW9uYWxCcmVha3BvaW50cyA9IHRydWU7XHJcbiAgICAgICAgYm9keS5zdXBwb3J0c1NldFZhcmlhYmxlID0gdHJ1ZTtcclxuICAgICAgICBib2R5LnN1cHBvcnRzRXhjZXB0aW9uT3B0aW9ucyA9IHRydWU7XHJcbiAgICAgICAgYm9keS5zdXBwb3J0c0V2YWx1YXRlRm9ySG92ZXJzID0gdHJ1ZTtcclxuICAgICAgICBib2R5LnN1cHBvcnRzTW9kdWxlc1JlcXVlc3QgPSB0cnVlO1xyXG4gICAgICAgIGJvZHkuc3VwcG9ydHNWYWx1ZUZvcm1hdHRpbmdPcHRpb25zID0gdHJ1ZTtcclxuICAgICAgICBib2R5LnN1cHBvcnRzSGl0Q29uZGl0aW9uYWxCcmVha3BvaW50cyA9IHRydWU7XHJcbiAgICAgICAgYm9keS5zdXBwb3J0c1NldEV4cHJlc3Npb24gPSB0cnVlO1xyXG4gICAgICAgIGJvZHkuc3VwcG9ydHNMb2dQb2ludHMgPSB0cnVlO1xyXG4gICAgICAgIGJvZHkuc3VwcG9ydFRlcm1pbmF0ZURlYnVnZ2VlID0gdHJ1ZTtcclxuICAgICAgICBib2R5LnN1cHBvcnRzQ29tcGxldGlvbnNSZXF1ZXN0ID0gdHJ1ZTtcclxuICAgICAgICBib2R5LmV4Y2VwdGlvbkJyZWFrcG9pbnRGaWx0ZXJzID0gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXI6ICdyYWlzZWQnLFxyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdSYWlzZWQgRXhjZXB0aW9ucycsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXI6ICd1bmNhdWdodCcsXHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1VuY2F1Z2h0IEV4Y2VwdGlvbnMnLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuICAgICAgICBpZiAodHlwZW9mIGFyZ3Muc3VwcG9ydHNSdW5JblRlcm1pbmFsUmVxdWVzdCA9PT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNSdW5JblRlcm1pbmFsUmVxdWVzdCA9IGFyZ3Muc3VwcG9ydHNSdW5JblRlcm1pbmFsUmVxdWVzdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xyXG4gICAgfVxyXG4gICAgYXR0YWNoUmVxdWVzdChyZXNwb25zZSwgYXJncykge1xyXG4gICAgICAgIGNvbnN0IGxhdW5jaGVyID0gRGVidWdGYWN0b3J5XzEuQ3JlYXRlQXR0YWNoRGVidWdDbGllbnQoYXJncywgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5kZWJ1Z1NlcnZlciA9IGxhdW5jaGVyLkNyZWF0ZURlYnVnU2VydmVyKHRoaXMuc2VydmljZUNvbnRhaW5lcik7XHJcbiAgICAgICAgdGhpcy5kZWJ1Z1NlcnZlci5TdGFydCgpXHJcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMuZW1pdCgnZGVidWdnZXJfYXR0YWNoZWQnKSlcclxuICAgICAgICAgICAgLmNhdGNoKGV4ID0+IHtcclxuICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci5lcnJvcignQXR0YWNoIGZhaWxlZCcpO1xyXG4gICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGAke2V4fSwgJHtleC5uYW1lfSwgJHtleC5tZXNzYWdlfSwgJHtleC5zdGFja31gKTtcclxuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuZ2V0VXNlckZyaWVuZGx5QXR0YWNoRXJyb3JNZXNzYWdlKGV4KSB8fCAnQXR0YWNoIEZhaWxlZCc7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZEVycm9yUmVzcG9uc2UocmVzcG9uc2UsIHsgZm9ybWF0OiBtZXNzYWdlLCBpZDogMSB9LCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLkVycm9yRGVzdGluYXRpb24uVXNlcik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBsYXVuY2hSZXF1ZXN0KHJlc3BvbnNlLCBhcmdzKSB7XHJcbiAgICAgICAgY29uc3QgZnMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xyXG4gICAgICAgIGlmICgodHlwZW9mIGFyZ3MubW9kdWxlICE9PSAnc3RyaW5nJyB8fCBhcmdzLm1vZHVsZS5sZW5ndGggPT09IDApICYmIGFyZ3MucHJvZ3JhbSAmJiAhZnMuZmlsZUV4aXN0c1N5bmMoYXJncy5wcm9ncmFtKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kRXJyb3JSZXNwb25zZShyZXNwb25zZSwgeyBmb3JtYXQ6IGBGaWxlIGRvZXMgbm90IGV4aXN0LiBcIiR7YXJncy5wcm9ncmFtfVwiYCwgaWQ6IDEgfSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5FcnJvckRlc3RpbmF0aW9uLlVzZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmxhdW5jaFBUVlNEKGFyZ3MpXHJcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMud2FpdEZvclBUVlNEVG9Db25uZWN0KGFyZ3MpKVxyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB0aGlzLmVtaXQoJ2RlYnVnZ2VyX2xhdW5jaGVkJykpXHJcbiAgICAgICAgICAgIC5jYXRjaChleCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLmdldFVzZXJGcmllbmRseUxhdW5jaEVycm9yTWVzc2FnZShhcmdzLCBleCkgfHwgJ0RlYnVnIEVycm9yJztcclxuICAgICAgICAgICAgdGhpcy5zZW5kRXJyb3JSZXNwb25zZShyZXNwb25zZSwgeyBmb3JtYXQ6IG1lc3NhZ2UsIGlkOiAxIH0sIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB2c2NvZGVfZGVidWdhZGFwdGVyXzEuRXJyb3JEZXN0aW5hdGlvbi5Vc2VyKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGxhdW5jaFBUVlNEKGFyZ3MpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBsYXVuY2hlciA9IERlYnVnRmFjdG9yeV8xLkNyZWF0ZUxhdW5jaERlYnVnQ2xpZW50KGFyZ3MsIHRoaXMsIHRoaXMuc3VwcG9ydHNSdW5JblRlcm1pbmFsUmVxdWVzdCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWdTZXJ2ZXIgPSBsYXVuY2hlci5DcmVhdGVEZWJ1Z1NlcnZlcih0aGlzLnNlcnZpY2VDb250YWluZXIpO1xyXG4gICAgICAgICAgICBjb25zdCBzZXJ2ZXJJbmZvID0geWllbGQgdGhpcy5kZWJ1Z1NlcnZlci5TdGFydCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gbGF1bmNoZXIuTGF1bmNoQXBwbGljYXRpb25Ub0RlYnVnKHNlcnZlckluZm8pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgd2FpdEZvclBUVlNEVG9Db25uZWN0KGFyZ3MpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlamVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuZ2V0Q29ubmVjdGlvblRpbWVvdXQoYXJncyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQgd2FpdGluZyBmb3IgZGVidWdnZXIgY29ubmVjdGlvbicpKTtcclxuICAgICAgICAgICAgICAgIH0sIGR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgdGhpcy5kZWJ1Z1NlcnZlci5jbGllbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dC51bnJlZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVqZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldENvbm5lY3Rpb25UaW1lb3V0KGFyZ3MpIHtcclxuICAgICAgICAvLyBUaGUgdGltZW91dCBjYW4gYmUgb3ZlcnJpZGRlbiwgYnV0IHdvbid0IGJlIGRvY3VtZW50ZWQgdW5sZXNzIHdlIHNlZSB0aGUgbmVlZCBmb3IgaXQuXHJcbiAgICAgICAgLy8gVGhpcyBpcyBqdXN0IGEgZmFpbCBzYWZlIG1lY2hhbmlzbSwgaWYgdGhlIGN1cnJlbnQgdGltZW91dCBpc24ndCBlbm91Z2ggKGxldCBzdHVkeSB0aGUgY3VycmVudCBiZWhhdmlvdXIgYmVmb3JlIGV4cG9zaW5nIHRoaXMgc2V0dGluZykuXHJcbiAgICAgICAgY29uc3QgY29ubmVjdGlvblRpbWVvdXQgPSB0eXBlb2YgYXJncy50aW1lb3V0ID09PSAnbnVtYmVyJyA/IGFyZ3MudGltZW91dCA6IERFQlVHR0VSX0NPTk5FQ1RfVElNRU9VVDtcclxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoY29ubmVjdGlvblRpbWVvdXQsIE1JTl9ERUJVR0dFUl9DT05ORUNUX1RJTUVPVVQpO1xyXG4gICAgfVxyXG4gICAgZ2V0VXNlckZyaWVuZGx5TGF1bmNoRXJyb3JNZXNzYWdlKGxhdW5jaEFyZ3MsIGVycm9yKSB7XHJcbiAgICAgICAgaWYgKCFlcnJvcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGVycm9yTXNnID0gdHlwZW9mIGVycm9yID09PSAnc3RyaW5nJyA/IGVycm9yIDogKChlcnJvci5tZXNzYWdlICYmIGVycm9yLm1lc3NhZ2UubGVuZ3RoID4gMCkgPyBlcnJvci5tZXNzYWdlIDogJycpO1xyXG4gICAgICAgIGlmIChoZWxwZXJzXzEuaXNOb3RJbnN0YWxsZWRFcnJvcihlcnJvcikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGBGYWlsZWQgdG8gbGF1bmNoIHRoZSBQeXRob24gUHJvY2VzcywgcGxlYXNlIHZhbGlkYXRlIHRoZSBwYXRoICcke2xhdW5jaEFyZ3MucHl0aG9uUGF0aH0nYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnJvck1zZztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBnZXRVc2VyRnJpZW5kbHlBdHRhY2hFcnJvck1lc3NhZ2UoZXJyb3IpIHtcclxuICAgICAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnIHx8IGVycm9yLmVycm5vID09PSAnRUNPTk5SRUZVU0VEJykge1xyXG4gICAgICAgICAgICByZXR1cm4gYEZhaWxlZCB0byBhdHRhY2ggKCR7ZXJyb3IubWVzc2FnZX0pYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnID8gZXJyb3IgOiAoKGVycm9yLm1lc3NhZ2UgJiYgZXJyb3IubWVzc2FnZS5sZW5ndGggPiAwKSA/IGVycm9yLm1lc3NhZ2UgOiAnJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUHl0aG9uRGVidWdnZXIgPSBQeXRob25EZWJ1Z2dlcjtcclxuLyoqXHJcbiAqIEdsdWUgdGhhdCBvcmNoZXN0cmF0ZXMgY29tbXVuaWNhdGlvbnMgYmV0d2VlbiBWUyBDb2RlLCBQeXRob25EZWJ1Z2dlciAoRGVidWdTZXNzaW9uKSBhbmQgUFRWU0QuXHJcbiAqIEBjbGFzcyBEZWJ1Z01hbmFnZXJcclxuICogQGltcGxlbWVudHMge0Rpc3Bvc2FibGV9XHJcbiAqL1xyXG5jbGFzcyBEZWJ1Z01hbmFnZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lcikge1xyXG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICAgICAgdGhpcy5pc1NlcnZlck1vZGUgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzID0gW107XHJcbiAgICAgICAgdGhpcy5oYXNTaHV0ZG93biA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMudGVybWluYXRlZEV2ZW50U2VudCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuZGlzY29ubmVjdFJlc3BvbnNlU2VudCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMucmVzdGFydCA9IGZhbHNlO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERvIG5vdCBwdXQgYW55IGRlbGF5cyBpbiBoZXJlIGV4cGVjdGluZyBWU0MgdG8gcmVjZWl2ZSBtZXNzYWdlcy4gVlNDIGNvdWxkIGRpc2Nvbm5lY3QgZWFybGllciAoUFRWU0QgIzEyOCkuXHJcbiAgICAgICAgICogSWYgYW55IGRlbGF5cyBhcmUgbmVjZXNzYXJ5LCBhZGQgdGhlbSBwcmlvciB0byBjYWxsaW5nIHRoaXMgbWV0aG9kLlxyXG4gICAgICAgICAqIElmIHRoZSBwcm9ncmFtIGlzIGZvcmNlZnVsbHkgdGVybWluYXRlZCAoZS5nLiBraWxsaW5nIHRlcm1pbmFsKSwgd2UgaGFuZGxlIHNvY2tldC5vbignZXJyb3InKSBvciBzb2NrZXQub24oJ2Nsb3NlJyksXHJcbiAgICAgICAgICogIFVuZGVyIHN1Y2ggY2lyY3Vtc3RhbmNlcywgd2UgbmVlZCB0byBzZW5kIHRoZSB0ZXJtaW5hdGVkIGV2ZW50IGFzYXAgKGNvdWxkIGJlIGJlY2F1c2UgVlNDIG1pZ2h0IGJlIGdldHRpbmcgYW4gZXJyb3IgYXQgaXRzIGVuZCBkdWUgdG8gcGlwZWQgc3RyZWFtIGJlaW5nIGNsb3NlZCkuXHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKiBAbWVtYmVyb2YgRGVidWdNYW5hZ2VyXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxyXG4gICAgICAgIHRoaXMuc2h1dGRvd24gPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnY2hlY2sgYW5kIHNodXRkb3duJyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc1NodXRkb3duKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5oYXNTaHV0ZG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnc2h1dGRvd24nKTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRlcm1pbmF0ZWRFdmVudFNlbnQgJiYgIXRoaXMucmVzdGFydCkge1xyXG4gICAgICAgICAgICAgICAgLy8gUG9zc2libGUgUFRWU0QgZGllZCBiZWZvcmUgc2VuZGluZyBtZXNzYWdlIGJhY2suXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnU2VuZGluZyBUZXJtaW5hdGVkIEV2ZW50Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kTWVzc2FnZShuZXcgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLlRlcm1pbmF0ZWRFdmVudCgpLCB0aGlzLm91dHB1dFN0cmVhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBFcnJvciBpbiBzZW5kaW5nIFRlcm1pbmF0ZWQgRXZlbnQ6ICR7ZXJyICYmIGVyci5tZXNzYWdlID8gZXJyLm1lc3NhZ2UgOiBlcnIudG9TdHJpbmcoKX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBbbWVzc2FnZSwgZXJyICYmIGVyci5uYW1lID8gZXJyLm5hbWUgOiAnJywgZXJyICYmIGVyci5zdGFjayA/IGVyci5zdGFjayA6ICcnXS5qb2luKG9zXzEuRU9MKTtcclxuICAgICAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGAke21lc3NhZ2V9JHtvc18xLkVPTH0ke2RldGFpbHN9YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRlcm1pbmF0ZWRFdmVudFNlbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5kaXNjb25uZWN0UmVzcG9uc2VTZW50ICYmIHRoaXMucmVzdGFydCAmJiB0aGlzLmRpc2Nvbm5lY3RSZXF1ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgd29yayBhcm91bmQgZm9yIFBUVlNEIGJ1ZywgZWxzZSB0aGlzIGVudGlyZSBibG9jayBpcyB1bm5lY2Vzc2FyeS5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci52ZXJib3NlKCdTZW5kaW5nIERpc2Nvbm5lY3QgUmVzcG9uc2UnKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRNZXNzYWdlKG5ldyB2c2NvZGVfZGVidWdhZGFwdGVyXzEuUmVzcG9uc2UodGhpcy5kaXNjb25uZWN0UmVxdWVzdCwgJycpLCB0aGlzLm91dHB1dFN0cmVhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBFcnJvciBpbiBzZW5kaW5nIERpc2Nvbm5lY3QgUmVzcG9uc2U6ICR7ZXJyICYmIGVyci5tZXNzYWdlID8gZXJyLm1lc3NhZ2UgOiBlcnIudG9TdHJpbmcoKX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBbbWVzc2FnZSwgZXJyICYmIGVyci5uYW1lID8gZXJyLm5hbWUgOiAnJywgZXJyICYmIGVyci5zdGFjayA/IGVyci5zdGFjayA6ICcnXS5qb2luKG9zXzEuRU9MKTtcclxuICAgICAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGAke21lc3NhZ2V9JHtvc18xLkVPTH0ke2RldGFpbHN9YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RSZXNwb25zZVNlbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdW5jaE9yQXR0YWNoID09PSAnbGF1bmNoJyAmJiB0aGlzLnB0dnNkUHJvY2Vzc0lkKSB7XHJcbiAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ2tpbGxpbmcgcHJvY2VzcycpO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBXYWl0IGZvciBzb21lIHRpbWUsIGl0cyBwb3NzaWJsZSB0aGUgcHJvZ3JhbSBoYXMgcnVuIHRvIGNvbXBsZXRpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgbmVlZCB0byB3YWl0IHRpbGwgdGhlIHByb2Nlc3MgZXhpdHMgKGVsc2UgdGhlIG1lc3NhZ2UgYFRlcm1pbmF0ZWQ6IDE1YCBnZXRzIHByaW50ZWQgb250byB0aGUgc2NyZWVuKS5cclxuICAgICAgICAgICAgICAgICAgICAvLyAyLiBBbHNvLCBpdHMgcG9zc2libGUgd2UgbWFudWFsbHkgc2VudCB0aGUgYFRlcm1pbmF0ZWRgIGV2ZW50IGFib3ZlLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEhlbmNlIHdlIG5lZWQgdG8gd2FpdCB0aWxsIFZTQyByZWNlaXZlcyB0aGUgYWJvdmUgZXZlbnQuXHJcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgYXN5bmNfMS5zbGVlcCgxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnS2lsbCBwcm9jZXNzIG5vdycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGtpbGxQcm9jZXNzVHJlZSh0aGlzLnB0dnNkUHJvY2Vzc0lkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChfYSkgeyB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB0dnNkUHJvY2Vzc0lkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5yZXN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kZWJ1Z1Nlc3Npb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ1NodXR0aW5nIGRvd24gZGVidWcgc2Vzc2lvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVidWdTZXNzaW9uLnNodXRkb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ2Rpc3Bvc2luZycpO1xyXG4gICAgICAgICAgICAgICAgeWllbGQgYXN5bmNfMS5zbGVlcCgxMDApO1xyXG4gICAgICAgICAgICAgICAgLy8gRGlzcG9zZSBsYXN0LCB3ZSBkb24ndCB3YW50IHRvIGRpc3Bvc2UgdGhlIHByb3RvY29sIGxvZ2dlcnMgdG9vIGVhcmx5LlxyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5mb3JFYWNoKGRpc3Bvc2FibGUgPT4gZGlzcG9zYWJsZS5kaXNwb3NlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29ubmVjdCBQVFZTRCBzb2NrZXQgdG8gVlMgQ29kZS5cclxuICAgICAgICAgKiBUaGlzIGFsbG93cyBQVFZTRCB0byBjb21tdW5pY2F0ZSBkaXJlY3RseSB3aXRoIFZTIENvZGUuXHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKiBAbWVtYmVyb2YgRGVidWdNYW5hZ2VyXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5jb25uZWN0VlNDb2RlVG9QVFZTRCA9IChyZXNwb25zZSkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCBhdHRhY2hPckxhdW5jaFJlcXVlc3QgPSB5aWVsZCAodGhpcy5sYXVuY2hPckF0dGFjaCA9PT0gJ2F0dGFjaCcgPyB0aGlzLmF0dGFjaFJlcXVlc3QgOiB0aGlzLmxhdW5jaFJlcXVlc3QpO1xyXG4gICAgICAgICAgICAvLyBCeSBub3cgd2UncmUgY29ubmVjdGVkIHRvIHRoZSBjbGllbnQuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0ID0geWllbGQgdGhpcy5kZWJ1Z1Nlc3Npb24uZGVidWdTZXJ2ZXIuY2xpZW50O1xyXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGhhbmRsZSBib3RoIGVuZCBhbmQgZXJyb3IsIHNvbWV0aW1lcyB0aGUgc29ja2V0IHdpbGwgZXJyb3Igb3V0IHdpdGhvdXQgZW5kaW5nIChpZiBkZWJ1Z2VlIGlzIGtpbGxlZCkuXHJcbiAgICAgICAgICAgIC8vIE5vdGUsIHdlIG5lZWQgYSBoYW5kbGVyIGZvciB0aGUgZXJyb3IgZXZlbnQsIGVsc2Ugbm9kZWpzIGNvbXBsYWlucyB3aGVuIHNvY2tldCBnZXRzIGNsb3NlZCBhbmQgdGhlcmUgYXJlIG5vIGVycm9yIGhhbmRsZXJzLlxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5vbignZW5kJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci52ZXJib3NlKCdTb2NrZXQgRW5kJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNodXRkb3duKCkuaWdub3JlRXJyb3JzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5vbignZXJyb3InLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ1NvY2tldCBFcnJvcicpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaHV0ZG93bigpLmlnbm9yZUVycm9ycygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gS2VlcCB0cmFjayBvZiBwcm9jZXNzaWQgZm9yIGtpbGxpbmcgaXQuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdW5jaE9yQXR0YWNoID09PSAnbGF1bmNoJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVidWdTb2tldFByb3RvY29sUGFyc2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQcm90b2NvbFBhcnNlcik7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z1Nva2V0UHJvdG9jb2xQYXJzZXIuY29ubmVjdCh0aGlzLnNvY2tldCk7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z1Nva2V0UHJvdG9jb2xQYXJzZXIub25jZSgnZXZlbnRfcHJvY2VzcycsIChwcm9jKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdHZzZFByb2Nlc3NJZCA9IHByb2MuYm9keS5zeXN0ZW1Qcm9jZXNzSWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBHZXQgcmVhZHkgZm9yIFBUVlNEIHRvIGNvbW11bmljYXRlIGRpcmVjdGx5IHdpdGggVlMgQ29kZS5cclxuICAgICAgICAgICAgdGhpcy5pbnB1dFN0cmVhbS51bnBpcGUodGhpcy5kZWJ1Z1Nlc3Npb25JbnB1dFN0cmVhbSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWdTZXNzaW9uT3V0cHV0U3RyZWFtLnVucGlwZSh0aGlzLm91dHB1dFN0cmVhbSk7XHJcbiAgICAgICAgICAgIC8vIERvIG5vdCBwaXBlLiBXaGVuIHJlc3RhcnRpbmcgdGhlIGRlYnVnZ2VyLCB0aGUgc29ja2V0IGdldHMgY2xvc2VkLFxyXG4gICAgICAgICAgICAvLyBJbiB3aGljaCBjYXNlLCBWU0Mgd2lsbCBzZWUgdGhpcyBhbmQgc2h1dGRvd24gdGhlIGRlYnVnZ2VyIGNvbXBsZXRlbHkuXHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRTdHJlYW0ub24oJ2RhdGEnLCBkYXRhID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0LndyaXRlKGRhdGEpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aHJvdWdoT3V0cHV0U3RyZWFtLndyaXRlKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vdXRwdXRTdHJlYW0ud3JpdGUoZGF0YSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBTZW5kIHRoZSBsYXVuY2gvYXR0YWNoIHJlcXVlc3QgdG8gUFRWU0QgYW5kIHdhaXQgZm9yIGl0IHRvIHJlcGx5IGJhY2suXHJcbiAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UoYXR0YWNoT3JMYXVuY2hSZXF1ZXN0LCB0aGlzLnNvY2tldCk7XHJcbiAgICAgICAgICAgIC8vIFNlbmQgdGhlIGluaXRpYWxpemUgcmVxdWVzdCBhbmQgd2FpdCBmb3IgaXQgdG8gcmVwbHkgYmFjayB3aXRoIHRoZSBpbml0aWFsaXplZCBldmVudFxyXG4gICAgICAgICAgICB0aGlzLnNlbmRNZXNzYWdlKHlpZWxkIHRoaXMuaW5pdGlhbGl6ZVJlcXVlc3QsIHRoaXMuc29ja2V0KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLm9uUmVxdWVzdEluaXRpYWxpemUgPSAocmVxdWVzdCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmhhc1NodXRkb3duID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudGVybWluYXRlZEV2ZW50U2VudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RSZXNwb25zZVNlbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5yZXN0YXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdFJlcXVlc3QgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlcXVlc3REZWZlcnJlZC5yZXNvbHZlKHJlcXVlc3QpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5vblJlcXVlc3RMYXVuY2ggPSAocmVxdWVzdCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmxhdW5jaE9yQXR0YWNoID0gJ2xhdW5jaCc7XHJcbiAgICAgICAgICAgIHRoaXMubG9nZ2luZ0VuYWJsZWQgPSByZXF1ZXN0LmFyZ3VtZW50cy5sb2dUb0ZpbGUgPT09IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMubGF1bmNoUmVxdWVzdERlZmVycmVkLnJlc29sdmUocmVxdWVzdCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLm9uUmVxdWVzdEF0dGFjaCA9IChyZXF1ZXN0KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubGF1bmNoT3JBdHRhY2ggPSAnYXR0YWNoJztcclxuICAgICAgICAgICAgdGhpcy5sb2dnaW5nRW5hYmxlZCA9IHJlcXVlc3QuYXJndW1lbnRzLmxvZ1RvRmlsZSA9PT0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2hSZXF1ZXN0RGVmZXJyZWQucmVzb2x2ZShyZXF1ZXN0KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMub25SZXF1ZXN0RGlzY29ubmVjdCA9IChyZXF1ZXN0KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdFJlcXVlc3QgPSByZXF1ZXN0O1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXVuY2hPckF0dGFjaCA9PT0gJ2F0dGFjaCcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBhcmdzID0gcmVxdWVzdC5hcmd1bWVudHM7XHJcbiAgICAgICAgICAgIGlmIChhcmdzICYmIGFyZ3MucmVzdGFydCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0YXJ0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBXaGVuIFZTIENvZGUgc2VuZHMgYSBkaXNjb25uZWN0IHJlcXVlc3QsIFBUVlNEIHJlcGxpZXMgYmFjayB3aXRoIGEgcmVzcG9uc2UuXHJcbiAgICAgICAgICAgIC8vIFdhaXQgZm9yIHNvbWV0aW1lLCB1bnRpbGwgdGhlIG1lc3NhZ2VzIGFyZSBzZW50IG91dCAocmVtZW1iZXIsIHdlJ3JlIGp1c3QgaW50ZXJjZXB0aW5nIHN0cmVhbXMgaGVyZSkuXHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQodGhpcy5zaHV0ZG93biwgNTAwKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMub25FdmVudFRlcm1pbmF0ZWQgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnb25FdmVudFRlcm1pbmF0ZWQnKTtcclxuICAgICAgICAgICAgdGhpcy50ZXJtaW5hdGVkRXZlbnRTZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgLy8gV2FpdCBmb3Igc29tZXRpbWUsIHVudGlsbCB0aGUgbWVzc2FnZXMgYXJlIHNlbnQgb3V0IChyZW1lbWJlciwgd2UncmUganVzdCBpbnRlcmNlcHRpbmcgc3RyZWFtcyBoZXJlKS5cclxuICAgICAgICAgICAgc2V0VGltZW91dCh0aGlzLnNodXRkb3duLCAzMDApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMub25SZXNwb25zZURpc2Nvbm5lY3QgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdFJlc3BvbnNlU2VudCA9IHRydWU7XHJcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnb25SZXNwb25zZURpc2Nvbm5lY3QnKTtcclxuICAgICAgICAgICAgLy8gV2hlbiBWUyBDb2RlIHNlbmRzIGEgZGlzY29ubmVjdCByZXF1ZXN0LCBQVFZTRCByZXBsaWVzIGJhY2sgd2l0aCBhIHJlc3BvbnNlLCBidXQgaXRzIHVwdG8gdXMgdG8ga2lsbCB0aGUgcHJvY2Vzcy5cclxuICAgICAgICAgICAgLy8gV2FpdCBmb3Igc29tZXRpbWUsIHVudGlsbCB0aGUgbWVzc2FnZXMgYXJlIHNlbnQgb3V0IChyZW1lbWJlciwgd2UncmUganVzdCBpbnRlcmNlcHRpbmcgc3RyZWFtcyBoZXJlKS5cclxuICAgICAgICAgICAgLy8gQWxzbyBpdHMgcG9zc2libGUgUFRWU0QgbWlnaHQgcnVuIHRvIGNvbXBsZXRpb24uXHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQodGhpcy5zaHV0ZG93biwgMTAwKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnRocm91Z2hJbnB1dFN0cmVhbSA9IG5ldyBzdHJlYW1fMS5QYXNzVGhyb3VnaCgpO1xyXG4gICAgICAgIHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbSA9IG5ldyBzdHJlYW1fMS5QYXNzVGhyb3VnaCgpO1xyXG4gICAgICAgIHRoaXMuZGVidWdTZXNzaW9uT3V0cHV0U3RyZWFtID0gbmV3IHN0cmVhbV8xLlBhc3NUaHJvdWdoKCk7XHJcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb25JbnB1dFN0cmVhbSA9IG5ldyBzdHJlYW1fMS5QYXNzVGhyb3VnaCgpO1xyXG4gICAgICAgIHRoaXMucHJvdG9jb2xNZXNzYWdlV3JpdGVyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQcm90b2NvbE1lc3NhZ2VXcml0ZXIpO1xyXG4gICAgICAgIHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JUHJvdG9jb2xQYXJzZXIpO1xyXG4gICAgICAgIHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlci5jb25uZWN0KHRoaXMudGhyb3VnaElucHV0U3RyZWFtKTtcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzLnB1c2godGhpcy5pbnB1dFByb3RvY29sUGFyc2VyKTtcclxuICAgICAgICB0aGlzLm91dHB1dFByb3RvY29sUGFyc2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQcm90b2NvbFBhcnNlcik7XHJcbiAgICAgICAgdGhpcy5vdXRwdXRQcm90b2NvbFBhcnNlci5jb25uZWN0KHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbSk7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5wdXNoKHRoaXMub3V0cHV0UHJvdG9jb2xQYXJzZXIpO1xyXG4gICAgICAgIHRoaXMucHJvdG9jb2xMb2dnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSVByb3RvY29sTG9nZ2VyKTtcclxuICAgICAgICB0aGlzLnByb3RvY29sTG9nZ2VyLmNvbm5lY3QodGhpcy50aHJvdWdoSW5wdXRTdHJlYW0sIHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbSk7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5wdXNoKHRoaXMucHJvdG9jb2xMb2dnZXIpO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlcXVlc3REZWZlcnJlZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcclxuICAgICAgICB0aGlzLmxhdW5jaFJlcXVlc3REZWZlcnJlZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcclxuICAgICAgICB0aGlzLmF0dGFjaFJlcXVlc3REZWZlcnJlZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcclxuICAgIH1cclxuICAgIGdldCBpbml0aWFsaXplUmVxdWVzdCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbml0aWFsaXplUmVxdWVzdERlZmVycmVkLnByb21pc2U7XHJcbiAgICB9XHJcbiAgICBnZXQgbGF1bmNoUmVxdWVzdCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5sYXVuY2hSZXF1ZXN0RGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH1cclxuICAgIGdldCBhdHRhY2hSZXF1ZXN0KCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF0dGFjaFJlcXVlc3REZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfVxyXG4gICAgc2V0IGxvZ2dpbmdFbmFibGVkKHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuc2V0dXAobG9nZ2VyXzEuTG9nTGV2ZWwuVmVyYm9zZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMucHJvdG9jb2xMb2dnZXIuc2V0dXAodnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZGlzcG9zZSgpIHtcclxuICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ21haW4gZGlzcG9zZScpO1xyXG4gICAgICAgIHRoaXMuc2h1dGRvd24oKS5pZ25vcmVFcnJvcnMoKTtcclxuICAgIH1cclxuICAgIHN0YXJ0KCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlYnVnU3RyZWFtUHJvdmlkZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSURlYnVnU3RyZWFtUHJvdmlkZXIpO1xyXG4gICAgICAgICAgICBjb25zdCB7IGlucHV0LCBvdXRwdXQgfSA9IHlpZWxkIGRlYnVnU3RyZWFtUHJvdmlkZXIuZ2V0SW5wdXRBbmRPdXRwdXRTdHJlYW1zKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNTZXJ2ZXJNb2RlID0gZGVidWdTdHJlYW1Qcm92aWRlci51c2VEZWJ1Z1NvY2tldFN0cmVhbTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFN0cmVhbSA9IGlucHV0O1xyXG4gICAgICAgICAgICB0aGlzLm91dHB1dFN0cmVhbSA9IG91dHB1dDtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFN0cmVhbS5wYXVzZSgpO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNTZXJ2ZXJNb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UHJvY2VzcyA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMi5JQ3VycmVudFByb2Nlc3MpO1xyXG4gICAgICAgICAgICAgICAgY3VycmVudFByb2Nlc3Mub24oJ1NJR1RFUk0nLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlc3RhcnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaHV0ZG93bigpLmlnbm9yZUVycm9ycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJjZXB0UHJvdG9jb2xNZXNzYWdlcygpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXJ0RGVidWdTZXNzaW9uKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBzZW5kTWVzc2FnZShtZXNzYWdlLCBvdXRwdXRTdHJlYW0pIHtcclxuICAgICAgICB0aGlzLnByb3RvY29sTWVzc2FnZVdyaXRlci53cml0ZShvdXRwdXRTdHJlYW0sIG1lc3NhZ2UpO1xyXG4gICAgICAgIHRoaXMucHJvdG9jb2xNZXNzYWdlV3JpdGVyLndyaXRlKHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbSwgbWVzc2FnZSk7XHJcbiAgICB9XHJcbiAgICBzdGFydERlYnVnU2Vzc2lvbigpIHtcclxuICAgICAgICB0aGlzLmRlYnVnU2Vzc2lvbiA9IG5ldyBQeXRob25EZWJ1Z2dlcih0aGlzLnNlcnZpY2VDb250YWluZXIpO1xyXG4gICAgICAgIHRoaXMuZGVidWdTZXNzaW9uLnNldFJ1bkFzU2VydmVyKHRoaXMuaXNTZXJ2ZXJNb2RlKTtcclxuICAgICAgICB0aGlzLmRlYnVnU2Vzc2lvbi5vbmNlKCdkZWJ1Z2dlcl9hdHRhY2hlZCcsIHRoaXMuY29ubmVjdFZTQ29kZVRvUFRWU0QpO1xyXG4gICAgICAgIHRoaXMuZGVidWdTZXNzaW9uLm9uY2UoJ2RlYnVnZ2VyX2xhdW5jaGVkJywgdGhpcy5jb25uZWN0VlNDb2RlVG9QVFZTRCk7XHJcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb25PdXRwdXRTdHJlYW0ucGlwZSh0aGlzLnRocm91Z2hPdXRwdXRTdHJlYW0pO1xyXG4gICAgICAgIHRoaXMuZGVidWdTZXNzaW9uT3V0cHV0U3RyZWFtLnBpcGUodGhpcy5vdXRwdXRTdHJlYW0pO1xyXG4gICAgICAgIC8vIFN0YXJ0IGhhbmRsaW5nIHJlcXVlc3RzIGluIHRoZSBzZXNzaW9uIGluc3RhbmNlLlxyXG4gICAgICAgIC8vIFRoZSBzZXNzaW9uIChQeXRob25EZWJ1Z2dlciBjbGFzcykgd2lsbCBvbmx5IHBlcmZvcm0gdGhlIGJvb3RzdHJhcHBpbmcgKGxhdW5jaGluZyBvZiBQVFZTRCkuXHJcbiAgICAgICAgdGhpcy5pbnB1dFN0cmVhbS5waXBlKHRoaXMudGhyb3VnaElucHV0U3RyZWFtKTtcclxuICAgICAgICB0aGlzLmlucHV0U3RyZWFtLnBpcGUodGhpcy5kZWJ1Z1Nlc3Npb25JbnB1dFN0cmVhbSk7XHJcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb24uc3RhcnQodGhpcy5kZWJ1Z1Nlc3Npb25JbnB1dFN0cmVhbSwgdGhpcy5kZWJ1Z1Nlc3Npb25PdXRwdXRTdHJlYW0pO1xyXG4gICAgfVxyXG4gICAgaW50ZXJjZXB0UHJvdG9jb2xNZXNzYWdlcygpIHtcclxuICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBpbml0aWFsaXplIGFuZCBsYXVuY2ggcmVxdWVzdHMsIHdlJ2xsIG5lZWQgdG8gcmUtc2VuZCB0aGVzZSB0byBwdHZzZCwgZm9yIGJvb3RzdHJhcHBpbmcuXHJcbiAgICAgICAgdGhpcy5pbnB1dFByb3RvY29sUGFyc2VyLm9uY2UoJ3JlcXVlc3RfaW5pdGlhbGl6ZScsIHRoaXMub25SZXF1ZXN0SW5pdGlhbGl6ZSk7XHJcbiAgICAgICAgdGhpcy5pbnB1dFByb3RvY29sUGFyc2VyLm9uY2UoJ3JlcXVlc3RfbGF1bmNoJywgdGhpcy5vblJlcXVlc3RMYXVuY2gpO1xyXG4gICAgICAgIHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlci5vbmNlKCdyZXF1ZXN0X2F0dGFjaCcsIHRoaXMub25SZXF1ZXN0QXR0YWNoKTtcclxuICAgICAgICB0aGlzLmlucHV0UHJvdG9jb2xQYXJzZXIub25jZSgncmVxdWVzdF9kaXNjb25uZWN0JywgdGhpcy5vblJlcXVlc3REaXNjb25uZWN0KTtcclxuICAgICAgICB0aGlzLm91dHB1dFByb3RvY29sUGFyc2VyLm9uY2UoJ2V2ZW50X3Rlcm1pbmF0ZWQnLCB0aGlzLm9uRXZlbnRUZXJtaW5hdGVkKTtcclxuICAgICAgICB0aGlzLm91dHB1dFByb3RvY29sUGFyc2VyLm9uY2UoJ3Jlc3BvbnNlX2Rpc2Nvbm5lY3QnLCB0aGlzLm9uUmVzcG9uc2VEaXNjb25uZWN0KTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBzdGFydERlYnVnZ2VyKCkge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmluaXQobWlzY18xLm5vb3AsIHBhdGguam9pbihjb25zdGFudHNfMS5FWFRFTlNJT05fUk9PVF9ESVIsIGBkZWJ1ZyR7cHJvY2Vzcy5waWR9LmxvZ2ApKTtcclxuICAgICAgICBjb25zdCBzZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZVJlZ2lzdHJ5XzEuaW5pdGlhbGl6ZUlvYygpO1xyXG4gICAgICAgIGNvbnN0IHByb3RvY29sTWVzc2FnZVdyaXRlciA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSVByb3RvY29sTWVzc2FnZVdyaXRlcik7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gZGVidWdnZXI7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlYnVnTWFuYWdlciA9IG5ldyBEZWJ1Z01hbmFnZXIoc2VydmljZUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIHlpZWxkIGRlYnVnTWFuYWdlci5zdGFydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgRGVidWdnZXIgRXJyb3I6ICR7ZXJyICYmIGVyci5tZXNzYWdlID8gZXJyLm1lc3NhZ2UgOiBlcnIudG9TdHJpbmcoKX1gO1xyXG4gICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gW21lc3NhZ2UsIGVyciAmJiBlcnIubmFtZSA/IGVyci5uYW1lIDogJycsIGVyciAmJiBlcnIuc3RhY2sgPyBlcnIuc3RhY2sgOiAnJ10uam9pbihvc18xLkVPTCk7XHJcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuZXJyb3IoYCR7bWVzc2FnZX0ke29zXzEuRU9MfSR7ZGV0YWlsc31gKTtcclxuICAgICAgICAgICAgLy8gTm90aWZ5IHRoZSB1c2VyLlxyXG4gICAgICAgICAgICBwcm90b2NvbE1lc3NhZ2VXcml0ZXIud3JpdGUocHJvY2Vzcy5zdGRvdXQsIG5ldyB2c2NvZGVfZGVidWdhZGFwdGVyXzEuRXZlbnQoJ2Vycm9yJywgbWVzc2FnZSkpO1xyXG4gICAgICAgICAgICBwcm90b2NvbE1lc3NhZ2VXcml0ZXIud3JpdGUocHJvY2Vzcy5zdGRvdXQsIG5ldyB2c2NvZGVfZGVidWdhZGFwdGVyXzEuT3V0cHV0RXZlbnQoYCR7bWVzc2FnZX0ke29zXzEuRU9MfSR7ZGV0YWlsc31gLCAnc3RkZXJyJykpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbnByb2Nlc3Muc3RkaW4ub24oJ2Vycm9yJywgKCkgPT4geyB9KTtcclxucHJvY2Vzcy5zdGRvdXQub24oJ2Vycm9yJywgKCkgPT4geyB9KTtcclxucHJvY2Vzcy5zdGRlcnIub24oJ2Vycm9yJywgKCkgPT4geyB9KTtcclxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCAoZXJyKSA9PiB7XHJcbiAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGBVbmNhdWdodCBFeGNlcHRpb246ICR7ZXJyICYmIGVyci5tZXNzYWdlID8gZXJyLm1lc3NhZ2UgOiAnJ31gKTtcclxuICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuZXJyb3IoZXJyICYmIGVyci5uYW1lID8gZXJyLm5hbWUgOiAnJyk7XHJcbiAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGVyciAmJiBlcnIuc3RhY2sgPyBlcnIuc3RhY2sgOiAnJyk7XHJcbiAgICAvLyBDYXRjaCBhbGwsIGluY2FzZSB3ZSBoYXZlIHN0cmluZyBleGNlcHRpb25zIGJlaW5nIHJhaXNlZC5cclxuICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuZXJyb3IoZXJyID8gZXJyLnRvU3RyaW5nKCkgOiAnJyk7XHJcbiAgICAvLyBXYWl0IGZvciAxIHNlY29uZCBiZWZvcmUgd2UgZGllLCB3ZSBuZWVkIHRvIGVuc3VyZSBlcnJvcnMgYXJlIHdyaXR0ZW4gdG8gdGhlIGxvZyBmaWxlLlxyXG4gICAgc2V0VGltZW91dCgoKSA9PiBwcm9jZXNzLmV4aXQoLTEpLCAxMDApO1xyXG59KTtcclxuc3RhcnREZWJ1Z2dlcigpLmNhdGNoKGV4ID0+IHtcclxuICAgIC8vIE5vdCBuZWNlc3NhcnkgZXhjZXB0IGZvciBkZWJ1Z2dpbmcgYW5kIHRvIGtpbGwgbGludGVyIHdhcm5pbmcgYWJvdXQgdW5oYW5kbGVkIHByb21pc2VzLlxyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFpbi5qcy5tYXAiXX0=