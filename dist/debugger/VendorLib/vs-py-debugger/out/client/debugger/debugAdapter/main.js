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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsiX19hd2FpdGVyIiwidGhpc0FyZyIsIl9hcmd1bWVudHMiLCJQIiwiZ2VuZXJhdG9yIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJ2YWx1ZSIsInN0ZXAiLCJuZXh0IiwiZSIsInJlamVjdGVkIiwicmVzdWx0IiwiZG9uZSIsInRoZW4iLCJhcHBseSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsIlJlZmxlY3QiLCJtZXRhZGF0YSIsInVuZGVmaW5lZCIsInJlcXVpcmUiLCJvc18xIiwicGF0aCIsInN0cmVhbV8xIiwidnNjb2RlX2RlYnVnYWRhcHRlcl8xIiwibG9nZ2VyXzEiLCJjb25zdGFudHNfMSIsImhlbHBlcnNfMSIsInR5cGVzXzEiLCJ0eXBlc18yIiwiYXN5bmNfMSIsIm1pc2NfMSIsIkRlYnVnRmFjdG9yeV8xIiwic2VydmljZVJlZ2lzdHJ5XzEiLCJ0eXBlc18zIiwia2lsbFByb2Nlc3NUcmVlIiwiREVCVUdHRVJfQ09OTkVDVF9USU1FT1VUIiwiTUlOX0RFQlVHR0VSX0NPTk5FQ1RfVElNRU9VVCIsIlB5dGhvbkRlYnVnZ2VyIiwiRGVidWdTZXNzaW9uIiwiY29uc3RydWN0b3IiLCJzZXJ2aWNlQ29udGFpbmVyIiwiY2xpZW50IiwiY3JlYXRlRGVmZXJyZWQiLCJzdXBwb3J0c1J1bkluVGVybWluYWxSZXF1ZXN0Iiwic2h1dGRvd24iLCJkZWJ1Z1NlcnZlciIsIlN0b3AiLCJpbml0aWFsaXplUmVxdWVzdCIsInJlc3BvbnNlIiwiYXJncyIsImJvZHkiLCJzdXBwb3J0c0V4Y2VwdGlvbkluZm9SZXF1ZXN0Iiwic3VwcG9ydHNDb25maWd1cmF0aW9uRG9uZVJlcXVlc3QiLCJzdXBwb3J0c0NvbmRpdGlvbmFsQnJlYWtwb2ludHMiLCJzdXBwb3J0c1NldFZhcmlhYmxlIiwic3VwcG9ydHNFeGNlcHRpb25PcHRpb25zIiwic3VwcG9ydHNFdmFsdWF0ZUZvckhvdmVycyIsInN1cHBvcnRzTW9kdWxlc1JlcXVlc3QiLCJzdXBwb3J0c1ZhbHVlRm9ybWF0dGluZ09wdGlvbnMiLCJzdXBwb3J0c0hpdENvbmRpdGlvbmFsQnJlYWtwb2ludHMiLCJzdXBwb3J0c1NldEV4cHJlc3Npb24iLCJzdXBwb3J0c0xvZ1BvaW50cyIsInN1cHBvcnRUZXJtaW5hdGVEZWJ1Z2dlZSIsInN1cHBvcnRzQ29tcGxldGlvbnNSZXF1ZXN0IiwiZXhjZXB0aW9uQnJlYWtwb2ludEZpbHRlcnMiLCJmaWx0ZXIiLCJsYWJlbCIsImRlZmF1bHQiLCJzZW5kUmVzcG9uc2UiLCJhdHRhY2hSZXF1ZXN0IiwibGF1bmNoZXIiLCJDcmVhdGVBdHRhY2hEZWJ1Z0NsaWVudCIsIkNyZWF0ZURlYnVnU2VydmVyIiwiU3RhcnQiLCJlbWl0IiwiY2F0Y2giLCJleCIsImxvZ2dlciIsImVycm9yIiwibmFtZSIsIm1lc3NhZ2UiLCJzdGFjayIsImdldFVzZXJGcmllbmRseUF0dGFjaEVycm9yTWVzc2FnZSIsInNlbmRFcnJvclJlc3BvbnNlIiwiZm9ybWF0IiwiaWQiLCJFcnJvckRlc3RpbmF0aW9uIiwiVXNlciIsImxhdW5jaFJlcXVlc3QiLCJmcyIsImdldCIsIklGaWxlU3lzdGVtIiwibW9kdWxlIiwibGVuZ3RoIiwicHJvZ3JhbSIsImZpbGVFeGlzdHNTeW5jIiwibGF1bmNoUFRWU0QiLCJ3YWl0Rm9yUFRWU0RUb0Nvbm5lY3QiLCJnZXRVc2VyRnJpZW5kbHlMYXVuY2hFcnJvck1lc3NhZ2UiLCJDcmVhdGVMYXVuY2hEZWJ1Z0NsaWVudCIsInNlcnZlckluZm8iLCJMYXVuY2hBcHBsaWNhdGlvblRvRGVidWciLCJkdXJhdGlvbiIsImdldENvbm5lY3Rpb25UaW1lb3V0IiwidGltZW91dCIsInNldFRpbWVvdXQiLCJFcnJvciIsInVucmVmIiwiY29ubmVjdGlvblRpbWVvdXQiLCJNYXRoIiwibWF4IiwibGF1bmNoQXJncyIsImVycm9yTXNnIiwiaXNOb3RJbnN0YWxsZWRFcnJvciIsInB5dGhvblBhdGgiLCJjb2RlIiwiZXJybm8iLCJEZWJ1Z01hbmFnZXIiLCJpc1NlcnZlck1vZGUiLCJkaXNwb3NhYmxlcyIsImhhc1NodXRkb3duIiwidGVybWluYXRlZEV2ZW50U2VudCIsImRpc2Nvbm5lY3RSZXNwb25zZVNlbnQiLCJyZXN0YXJ0IiwidmVyYm9zZSIsInNlbmRNZXNzYWdlIiwiVGVybWluYXRlZEV2ZW50Iiwib3V0cHV0U3RyZWFtIiwiZXJyIiwidG9TdHJpbmciLCJkZXRhaWxzIiwiam9pbiIsIkVPTCIsImRpc2Nvbm5lY3RSZXF1ZXN0IiwiUmVzcG9uc2UiLCJsYXVuY2hPckF0dGFjaCIsInB0dnNkUHJvY2Vzc0lkIiwic2xlZXAiLCJfYSIsImRlYnVnU2Vzc2lvbiIsImZvckVhY2giLCJkaXNwb3NhYmxlIiwiZGlzcG9zZSIsImNvbm5lY3RWU0NvZGVUb1BUVlNEIiwiYXR0YWNoT3JMYXVuY2hSZXF1ZXN0Iiwic29ja2V0Iiwib24iLCJpZ25vcmVFcnJvcnMiLCJkZWJ1Z1Nva2V0UHJvdG9jb2xQYXJzZXIiLCJJUHJvdG9jb2xQYXJzZXIiLCJjb25uZWN0Iiwib25jZSIsInByb2MiLCJzeXN0ZW1Qcm9jZXNzSWQiLCJpbnB1dFN0cmVhbSIsInVucGlwZSIsImRlYnVnU2Vzc2lvbklucHV0U3RyZWFtIiwiZGVidWdTZXNzaW9uT3V0cHV0U3RyZWFtIiwiZGF0YSIsIndyaXRlIiwidGhyb3VnaE91dHB1dFN0cmVhbSIsIm9uUmVxdWVzdEluaXRpYWxpemUiLCJyZXF1ZXN0IiwiaW5pdGlhbGl6ZVJlcXVlc3REZWZlcnJlZCIsIm9uUmVxdWVzdExhdW5jaCIsImxvZ2dpbmdFbmFibGVkIiwiYXJndW1lbnRzIiwibG9nVG9GaWxlIiwibGF1bmNoUmVxdWVzdERlZmVycmVkIiwib25SZXF1ZXN0QXR0YWNoIiwiYXR0YWNoUmVxdWVzdERlZmVycmVkIiwib25SZXF1ZXN0RGlzY29ubmVjdCIsIm9uRXZlbnRUZXJtaW5hdGVkIiwib25SZXNwb25zZURpc2Nvbm5lY3QiLCJ0aHJvdWdoSW5wdXRTdHJlYW0iLCJQYXNzVGhyb3VnaCIsInByb3RvY29sTWVzc2FnZVdyaXRlciIsIklQcm90b2NvbE1lc3NhZ2VXcml0ZXIiLCJpbnB1dFByb3RvY29sUGFyc2VyIiwicHVzaCIsIm91dHB1dFByb3RvY29sUGFyc2VyIiwicHJvdG9jb2xMb2dnZXIiLCJJUHJvdG9jb2xMb2dnZXIiLCJwcm9taXNlIiwic2V0dXAiLCJMb2dMZXZlbCIsIlZlcmJvc2UiLCJzdGFydCIsImRlYnVnU3RyZWFtUHJvdmlkZXIiLCJJRGVidWdTdHJlYW1Qcm92aWRlciIsImlucHV0Iiwib3V0cHV0IiwiZ2V0SW5wdXRBbmRPdXRwdXRTdHJlYW1zIiwidXNlRGVidWdTb2NrZXRTdHJlYW0iLCJwYXVzZSIsImN1cnJlbnRQcm9jZXNzIiwiSUN1cnJlbnRQcm9jZXNzIiwiaW50ZXJjZXB0UHJvdG9jb2xNZXNzYWdlcyIsInN0YXJ0RGVidWdTZXNzaW9uIiwic2V0UnVuQXNTZXJ2ZXIiLCJwaXBlIiwic3RhcnREZWJ1Z2dlciIsImluaXQiLCJub29wIiwiRVhURU5TSU9OX1JPT1RfRElSIiwicHJvY2VzcyIsInBpZCIsImluaXRpYWxpemVJb2MiLCJkZWJ1Z01hbmFnZXIiLCJzdGRvdXQiLCJFdmVudCIsIk91dHB1dEV2ZW50Iiwic3RkaW4iLCJzdGRlcnIiLCJleGl0Il0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUEsU0FBUyxHQUFJLFVBQVEsU0FBS0EsU0FBZCxJQUE0QixVQUFVQyxPQUFWLEVBQW1CQyxVQUFuQixFQUErQkMsQ0FBL0IsRUFBa0NDLFNBQWxDLEVBQTZDO0FBQ3JGLFNBQU8sS0FBS0QsQ0FBQyxLQUFLQSxDQUFDLEdBQUdFLE9BQVQsQ0FBTixFQUF5QixVQUFVQyxPQUFWLEVBQW1CQyxNQUFuQixFQUEyQjtBQUN2RCxhQUFTQyxTQUFULENBQW1CQyxLQUFuQixFQUEwQjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUNPLElBQVYsQ0FBZUYsS0FBZixDQUFELENBQUo7QUFB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QW1Da0QsR0FBRyxHQUFHQSxHQUFHLENBQUNDLFFBQUosRUFBSCxHQUFvQixFQUExRCxFQUxxQyxDQU1yQzs7QUFDQXhCLEVBQUFBLFVBQVUsQ0FBQyxNQUFNb0csT0FBTyxDQUFDUyxJQUFSLENBQWEsQ0FBQyxDQUFkLENBQVAsRUFBeUIsR0FBekIsQ0FBVjtBQUNILENBUkQ7QUFTQWIsYUFBYSxHQUFHOUgsS0FBaEIsQ0FBc0JDLEVBQUUsSUFBSSxDQUN4QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbid1c2Ugc3RyaWN0JztcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuLy8gdHNsaW50OmRpc2FibGU6bm8tYW55IG1heC1mdW5jLWJvZHktbGVuZ3RoIG5vLWVtcHR5IG5vLXJlcXVpcmUtaW1wb3J0cyBuby12YXItcmVxdWlyZXNcbmlmIChSZWZsZWN0Lm1ldGFkYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICByZXF1aXJlKCdyZWZsZWN0LW1ldGFkYXRhJyk7XG59XG5jb25zdCBvc18xID0gcmVxdWlyZShcIm9zXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3Qgc3RyZWFtXzEgPSByZXF1aXJlKFwic3RyZWFtXCIpO1xuY29uc3QgdnNjb2RlX2RlYnVnYWRhcHRlcl8xID0gcmVxdWlyZShcInZzY29kZS1kZWJ1Z2FkYXB0ZXJcIik7XG5jb25zdCBsb2dnZXJfMSA9IHJlcXVpcmUoXCJ2c2NvZGUtZGVidWdhZGFwdGVyL2xpYi9sb2dnZXJcIik7XG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vY29uc3RhbnRzXCIpO1xucmVxdWlyZShcIi4uLy4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xuY29uc3QgaGVscGVyc18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9oZWxwZXJzXCIpO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi90eXBlc1wiKTtcbmNvbnN0IGFzeW5jXzEgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL3V0aWxzL2FzeW5jXCIpO1xuY29uc3QgbWlzY18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi91dGlscy9taXNjXCIpO1xuY29uc3QgRGVidWdGYWN0b3J5XzEgPSByZXF1aXJlKFwiLi9EZWJ1Z0NsaWVudHMvRGVidWdGYWN0b3J5XCIpO1xuY29uc3Qgc2VydmljZVJlZ2lzdHJ5XzEgPSByZXF1aXJlKFwiLi9zZXJ2aWNlUmVnaXN0cnlcIik7XG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4vdHlwZXNcIik7XG5jb25zdCBraWxsUHJvY2Vzc1RyZWUgPSByZXF1aXJlKCd0cmVlLWtpbGwnKTtcbmNvbnN0IERFQlVHR0VSX0NPTk5FQ1RfVElNRU9VVCA9IDIwMDAwO1xuY29uc3QgTUlOX0RFQlVHR0VSX0NPTk5FQ1RfVElNRU9VVCA9IDUwMDA7XG4vKipcbiAqIFByaW1hcnkgcHVycG9zZSBvZiB0aGlzIGNsYXNzIGlzIHRvIHBlcmZvcm0gdGhlIGhhbmRzaGFrZSB3aXRoIFZTIENvZGUgYW5kIGxhdW5jaCBQVFZTRCBwcm9jZXNzLlxuICogSS5lLiBpdCBjb21tdW5pY2F0ZSB3aXRoIFZTIENvZGUgYmVmb3JlIFBUVlNEIGdldHMgaW50byB0aGUgcGljdHVyZSwgb25jZSBQVFZTRCBpcyBsYXVuY2hlZCwgUFRWU0Qgd2lsbCB0YWxrIGRpcmVjdGx5IHRvIFZTIENvZGUuXG4gKiBXZSdyZSByZS11c2luZyBEZWJ1Z1Nlc3Npb24gc28gd2UgZG9uJ3QgaGF2ZSB0byBoYW5kbGUgcmVxdWVzdC9yZXNwb25zZSBvdXJzZWx2ZXMuXG4gKiBAZXhwb3J0XG4gKiBAY2xhc3MgUHl0aG9uRGVidWdnZXJcbiAqIEBleHRlbmRzIHtEZWJ1Z1Nlc3Npb259XG4gKi9cbmNsYXNzIFB5dGhvbkRlYnVnZ2VyIGV4dGVuZHMgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLkRlYnVnU2Vzc2lvbiB7XG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lcikge1xuICAgICAgICBzdXBlcihmYWxzZSk7XG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XG4gICAgICAgIHRoaXMuY2xpZW50ID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xuICAgICAgICB0aGlzLnN1cHBvcnRzUnVuSW5UZXJtaW5hbFJlcXVlc3QgPSBmYWxzZTtcbiAgICB9XG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIGlmICh0aGlzLmRlYnVnU2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLmRlYnVnU2VydmVyLlN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMuZGVidWdTZXJ2ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIuc2h1dGRvd24oKTtcbiAgICB9XG4gICAgaW5pdGlhbGl6ZVJlcXVlc3QocmVzcG9uc2UsIGFyZ3MpIHtcbiAgICAgICAgY29uc3QgYm9keSA9IHJlc3BvbnNlLmJvZHk7XG4gICAgICAgIGJvZHkuc3VwcG9ydHNFeGNlcHRpb25JbmZvUmVxdWVzdCA9IHRydWU7XG4gICAgICAgIGJvZHkuc3VwcG9ydHNDb25maWd1cmF0aW9uRG9uZVJlcXVlc3QgPSB0cnVlO1xuICAgICAgICBib2R5LnN1cHBvcnRzQ29uZGl0aW9uYWxCcmVha3BvaW50cyA9IHRydWU7XG4gICAgICAgIGJvZHkuc3VwcG9ydHNTZXRWYXJpYWJsZSA9IHRydWU7XG4gICAgICAgIGJvZHkuc3VwcG9ydHNFeGNlcHRpb25PcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgYm9keS5zdXBwb3J0c0V2YWx1YXRlRm9ySG92ZXJzID0gdHJ1ZTtcbiAgICAgICAgYm9keS5zdXBwb3J0c01vZHVsZXNSZXF1ZXN0ID0gdHJ1ZTtcbiAgICAgICAgYm9keS5zdXBwb3J0c1ZhbHVlRm9ybWF0dGluZ09wdGlvbnMgPSB0cnVlO1xuICAgICAgICBib2R5LnN1cHBvcnRzSGl0Q29uZGl0aW9uYWxCcmVha3BvaW50cyA9IHRydWU7XG4gICAgICAgIGJvZHkuc3VwcG9ydHNTZXRFeHByZXNzaW9uID0gdHJ1ZTtcbiAgICAgICAgYm9keS5zdXBwb3J0c0xvZ1BvaW50cyA9IHRydWU7XG4gICAgICAgIGJvZHkuc3VwcG9ydFRlcm1pbmF0ZURlYnVnZ2VlID0gdHJ1ZTtcbiAgICAgICAgYm9keS5zdXBwb3J0c0NvbXBsZXRpb25zUmVxdWVzdCA9IHRydWU7XG4gICAgICAgIGJvZHkuZXhjZXB0aW9uQnJlYWtwb2ludEZpbHRlcnMgPSBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmlsdGVyOiAncmFpc2VkJyxcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1JhaXNlZCBFeGNlcHRpb25zJyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXI6ICd1bmNhdWdodCcsXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdVbmNhdWdodCBFeGNlcHRpb25zJyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgICAgIGlmICh0eXBlb2YgYXJncy5zdXBwb3J0c1J1bkluVGVybWluYWxSZXF1ZXN0ID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNSdW5JblRlcm1pbmFsUmVxdWVzdCA9IGFyZ3Muc3VwcG9ydHNSdW5JblRlcm1pbmFsUmVxdWVzdDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgfVxuICAgIGF0dGFjaFJlcXVlc3QocmVzcG9uc2UsIGFyZ3MpIHtcbiAgICAgICAgY29uc3QgbGF1bmNoZXIgPSBEZWJ1Z0ZhY3RvcnlfMS5DcmVhdGVBdHRhY2hEZWJ1Z0NsaWVudChhcmdzLCB0aGlzKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1NlcnZlciA9IGxhdW5jaGVyLkNyZWF0ZURlYnVnU2VydmVyKHRoaXMuc2VydmljZUNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZGVidWdTZXJ2ZXIuU3RhcnQoKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5lbWl0KCdkZWJ1Z2dlcl9hdHRhY2hlZCcpKVxuICAgICAgICAgICAgLmNhdGNoKGV4ID0+IHtcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuZXJyb3IoJ0F0dGFjaCBmYWlsZWQnKTtcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuZXJyb3IoYCR7ZXh9LCAke2V4Lm5hbWV9LCAke2V4Lm1lc3NhZ2V9LCAke2V4LnN0YWNrfWApO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuZ2V0VXNlckZyaWVuZGx5QXR0YWNoRXJyb3JNZXNzYWdlKGV4KSB8fCAnQXR0YWNoIEZhaWxlZCc7XG4gICAgICAgICAgICB0aGlzLnNlbmRFcnJvclJlc3BvbnNlKHJlc3BvbnNlLCB7IGZvcm1hdDogbWVzc2FnZSwgaWQ6IDEgfSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5FcnJvckRlc3RpbmF0aW9uLlVzZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbGF1bmNoUmVxdWVzdChyZXNwb25zZSwgYXJncykge1xuICAgICAgICBjb25zdCBmcyA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JRmlsZVN5c3RlbSk7XG4gICAgICAgIGlmICgodHlwZW9mIGFyZ3MubW9kdWxlICE9PSAnc3RyaW5nJyB8fCBhcmdzLm1vZHVsZS5sZW5ndGggPT09IDApICYmIGFyZ3MucHJvZ3JhbSAmJiAhZnMuZmlsZUV4aXN0c1N5bmMoYXJncy5wcm9ncmFtKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZEVycm9yUmVzcG9uc2UocmVzcG9uc2UsIHsgZm9ybWF0OiBgRmlsZSBkb2VzIG5vdCBleGlzdC4gXCIke2FyZ3MucHJvZ3JhbX1cImAsIGlkOiAxIH0sIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB2c2NvZGVfZGVidWdhZGFwdGVyXzEuRXJyb3JEZXN0aW5hdGlvbi5Vc2VyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhdW5jaFBUVlNEKGFyZ3MpXG4gICAgICAgICAgICAudGhlbigoKSA9PiB0aGlzLndhaXRGb3JQVFZTRFRvQ29ubmVjdChhcmdzKSlcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMuZW1pdCgnZGVidWdnZXJfbGF1bmNoZWQnKSlcbiAgICAgICAgICAgIC5jYXRjaChleCA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5nZXRVc2VyRnJpZW5kbHlMYXVuY2hFcnJvck1lc3NhZ2UoYXJncywgZXgpIHx8ICdEZWJ1ZyBFcnJvcic7XG4gICAgICAgICAgICB0aGlzLnNlbmRFcnJvclJlc3BvbnNlKHJlc3BvbnNlLCB7IGZvcm1hdDogbWVzc2FnZSwgaWQ6IDEgfSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5FcnJvckRlc3RpbmF0aW9uLlVzZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbGF1bmNoUFRWU0QoYXJncykge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgbGF1bmNoZXIgPSBEZWJ1Z0ZhY3RvcnlfMS5DcmVhdGVMYXVuY2hEZWJ1Z0NsaWVudChhcmdzLCB0aGlzLCB0aGlzLnN1cHBvcnRzUnVuSW5UZXJtaW5hbFJlcXVlc3QpO1xuICAgICAgICAgICAgdGhpcy5kZWJ1Z1NlcnZlciA9IGxhdW5jaGVyLkNyZWF0ZURlYnVnU2VydmVyKHRoaXMuc2VydmljZUNvbnRhaW5lcik7XG4gICAgICAgICAgICBjb25zdCBzZXJ2ZXJJbmZvID0geWllbGQgdGhpcy5kZWJ1Z1NlcnZlci5TdGFydCgpO1xuICAgICAgICAgICAgcmV0dXJuIGxhdW5jaGVyLkxhdW5jaEFwcGxpY2F0aW9uVG9EZWJ1ZyhzZXJ2ZXJJbmZvKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHdhaXRGb3JQVFZTRFRvQ29ubmVjdChhcmdzKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCByZWplY3RlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5nZXRDb25uZWN0aW9uVGltZW91dChhcmdzKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCB3YWl0aW5nIGZvciBkZWJ1Z2dlciBjb25uZWN0aW9uJykpO1xuICAgICAgICAgICAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB5aWVsZCB0aGlzLmRlYnVnU2VydmVyLmNsaWVudDtcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dC51bnJlZigpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlamVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0Q29ubmVjdGlvblRpbWVvdXQoYXJncykge1xuICAgICAgICAvLyBUaGUgdGltZW91dCBjYW4gYmUgb3ZlcnJpZGRlbiwgYnV0IHdvbid0IGJlIGRvY3VtZW50ZWQgdW5sZXNzIHdlIHNlZSB0aGUgbmVlZCBmb3IgaXQuXG4gICAgICAgIC8vIFRoaXMgaXMganVzdCBhIGZhaWwgc2FmZSBtZWNoYW5pc20sIGlmIHRoZSBjdXJyZW50IHRpbWVvdXQgaXNuJ3QgZW5vdWdoIChsZXQgc3R1ZHkgdGhlIGN1cnJlbnQgYmVoYXZpb3VyIGJlZm9yZSBleHBvc2luZyB0aGlzIHNldHRpbmcpLlxuICAgICAgICBjb25zdCBjb25uZWN0aW9uVGltZW91dCA9IHR5cGVvZiBhcmdzLnRpbWVvdXQgPT09ICdudW1iZXInID8gYXJncy50aW1lb3V0IDogREVCVUdHRVJfQ09OTkVDVF9USU1FT1VUO1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoY29ubmVjdGlvblRpbWVvdXQsIE1JTl9ERUJVR0dFUl9DT05ORUNUX1RJTUVPVVQpO1xuICAgIH1cbiAgICBnZXRVc2VyRnJpZW5kbHlMYXVuY2hFcnJvck1lc3NhZ2UobGF1bmNoQXJncywgZXJyb3IpIHtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVycm9yTXNnID0gdHlwZW9mIGVycm9yID09PSAnc3RyaW5nJyA/IGVycm9yIDogKChlcnJvci5tZXNzYWdlICYmIGVycm9yLm1lc3NhZ2UubGVuZ3RoID4gMCkgPyBlcnJvci5tZXNzYWdlIDogJycpO1xuICAgICAgICBpZiAoaGVscGVyc18xLmlzTm90SW5zdGFsbGVkRXJyb3IoZXJyb3IpKSB7XG4gICAgICAgICAgICByZXR1cm4gYEZhaWxlZCB0byBsYXVuY2ggdGhlIFB5dGhvbiBQcm9jZXNzLCBwbGVhc2UgdmFsaWRhdGUgdGhlIHBhdGggJyR7bGF1bmNoQXJncy5weXRob25QYXRofSdgO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yTXNnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldFVzZXJGcmllbmRseUF0dGFjaEVycm9yTWVzc2FnZShlcnJvcikge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnIHx8IGVycm9yLmVycm5vID09PSAnRUNPTk5SRUZVU0VEJykge1xuICAgICAgICAgICAgcmV0dXJuIGBGYWlsZWQgdG8gYXR0YWNoICgke2Vycm9yLm1lc3NhZ2V9KWA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGVycm9yID09PSAnc3RyaW5nJyA/IGVycm9yIDogKChlcnJvci5tZXNzYWdlICYmIGVycm9yLm1lc3NhZ2UubGVuZ3RoID4gMCkgPyBlcnJvci5tZXNzYWdlIDogJycpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5QeXRob25EZWJ1Z2dlciA9IFB5dGhvbkRlYnVnZ2VyO1xuLyoqXG4gKiBHbHVlIHRoYXQgb3JjaGVzdHJhdGVzIGNvbW11bmljYXRpb25zIGJldHdlZW4gVlMgQ29kZSwgUHl0aG9uRGVidWdnZXIgKERlYnVnU2Vzc2lvbikgYW5kIFBUVlNELlxuICogQGNsYXNzIERlYnVnTWFuYWdlclxuICogQGltcGxlbWVudHMge0Rpc3Bvc2FibGV9XG4gKi9cbmNsYXNzIERlYnVnTWFuYWdlciB7XG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lcikge1xuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIgPSBzZXJ2aWNlQ29udGFpbmVyO1xuICAgICAgICB0aGlzLmlzU2VydmVyTW9kZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzID0gW107XG4gICAgICAgIHRoaXMuaGFzU2h1dGRvd24gPSBmYWxzZTtcbiAgICAgICAgdGhpcy50ZXJtaW5hdGVkRXZlbnRTZW50ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdFJlc3BvbnNlU2VudCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJlc3RhcnQgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERvIG5vdCBwdXQgYW55IGRlbGF5cyBpbiBoZXJlIGV4cGVjdGluZyBWU0MgdG8gcmVjZWl2ZSBtZXNzYWdlcy4gVlNDIGNvdWxkIGRpc2Nvbm5lY3QgZWFybGllciAoUFRWU0QgIzEyOCkuXG4gICAgICAgICAqIElmIGFueSBkZWxheXMgYXJlIG5lY2Vzc2FyeSwgYWRkIHRoZW0gcHJpb3IgdG8gY2FsbGluZyB0aGlzIG1ldGhvZC5cbiAgICAgICAgICogSWYgdGhlIHByb2dyYW0gaXMgZm9yY2VmdWxseSB0ZXJtaW5hdGVkIChlLmcuIGtpbGxpbmcgdGVybWluYWwpLCB3ZSBoYW5kbGUgc29ja2V0Lm9uKCdlcnJvcicpIG9yIHNvY2tldC5vbignY2xvc2UnKSxcbiAgICAgICAgICogIFVuZGVyIHN1Y2ggY2lyY3Vtc3RhbmNlcywgd2UgbmVlZCB0byBzZW5kIHRoZSB0ZXJtaW5hdGVkIGV2ZW50IGFzYXAgKGNvdWxkIGJlIGJlY2F1c2UgVlNDIG1pZ2h0IGJlIGdldHRpbmcgYW4gZXJyb3IgYXQgaXRzIGVuZCBkdWUgdG8gcGlwZWQgc3RyZWFtIGJlaW5nIGNsb3NlZCkuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBtZW1iZXJvZiBEZWJ1Z01hbmFnZXJcbiAgICAgICAgICovXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICAgICAgdGhpcy5zaHV0ZG93biA9ICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnY2hlY2sgYW5kIHNodXRkb3duJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5oYXNTaHV0ZG93bikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaGFzU2h1dGRvd24gPSB0cnVlO1xuICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci52ZXJib3NlKCdzaHV0ZG93bicpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLnRlcm1pbmF0ZWRFdmVudFNlbnQgJiYgIXRoaXMucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIC8vIFBvc3NpYmxlIFBUVlNEIGRpZWQgYmVmb3JlIHNlbmRpbmcgbWVzc2FnZSBiYWNrLlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnU2VuZGluZyBUZXJtaW5hdGVkIEV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UobmV3IHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5UZXJtaW5hdGVkRXZlbnQoKSwgdGhpcy5vdXRwdXRTdHJlYW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgRXJyb3IgaW4gc2VuZGluZyBUZXJtaW5hdGVkIEV2ZW50OiAke2VyciAmJiBlcnIubWVzc2FnZSA/IGVyci5tZXNzYWdlIDogZXJyLnRvU3RyaW5nKCl9YDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0YWlscyA9IFttZXNzYWdlLCBlcnIgJiYgZXJyLm5hbWUgPyBlcnIubmFtZSA6ICcnLCBlcnIgJiYgZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogJyddLmpvaW4ob3NfMS5FT0wpO1xuICAgICAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGAke21lc3NhZ2V9JHtvc18xLkVPTH0ke2RldGFpbHN9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudGVybWluYXRlZEV2ZW50U2VudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMuZGlzY29ubmVjdFJlc3BvbnNlU2VudCAmJiB0aGlzLnJlc3RhcnQgJiYgdGhpcy5kaXNjb25uZWN0UmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSB3b3JrIGFyb3VuZCBmb3IgUFRWU0QgYnVnLCBlbHNlIHRoaXMgZW50aXJlIGJsb2NrIGlzIHVubmVjZXNzYXJ5LlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnU2VuZGluZyBEaXNjb25uZWN0IFJlc3BvbnNlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UobmV3IHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5SZXNwb25zZSh0aGlzLmRpc2Nvbm5lY3RSZXF1ZXN0LCAnJyksIHRoaXMub3V0cHV0U3RyZWFtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYEVycm9yIGluIHNlbmRpbmcgRGlzY29ubmVjdCBSZXNwb25zZTogJHtlcnIgJiYgZXJyLm1lc3NhZ2UgPyBlcnIubWVzc2FnZSA6IGVyci50b1N0cmluZygpfWA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBbbWVzc2FnZSwgZXJyICYmIGVyci5uYW1lID8gZXJyLm5hbWUgOiAnJywgZXJyICYmIGVyci5zdGFjayA/IGVyci5zdGFjayA6ICcnXS5qb2luKG9zXzEuRU9MKTtcbiAgICAgICAgICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci5lcnJvcihgJHttZXNzYWdlfSR7b3NfMS5FT0x9JHtkZXRhaWxzfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RSZXNwb25zZVNlbnQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMubGF1bmNoT3JBdHRhY2ggPT09ICdsYXVuY2gnICYmIHRoaXMucHR2c2RQcm9jZXNzSWQpIHtcbiAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ2tpbGxpbmcgcHJvY2VzcycpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIDEuIFdhaXQgZm9yIHNvbWUgdGltZSwgaXRzIHBvc3NpYmxlIHRoZSBwcm9ncmFtIGhhcyBydW4gdG8gY29tcGxldGlvbi5cbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgbmVlZCB0byB3YWl0IHRpbGwgdGhlIHByb2Nlc3MgZXhpdHMgKGVsc2UgdGhlIG1lc3NhZ2UgYFRlcm1pbmF0ZWQ6IDE1YCBnZXRzIHByaW50ZWQgb250byB0aGUgc2NyZWVuKS5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gQWxzbywgaXRzIHBvc3NpYmxlIHdlIG1hbnVhbGx5IHNlbnQgdGhlIGBUZXJtaW5hdGVkYCBldmVudCBhYm92ZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gSGVuY2Ugd2UgbmVlZCB0byB3YWl0IHRpbGwgVlNDIHJlY2VpdmVzIHRoZSBhYm92ZSBldmVudC5cbiAgICAgICAgICAgICAgICAgICAgeWllbGQgYXN5bmNfMS5zbGVlcCgxMDApO1xuICAgICAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ0tpbGwgcHJvY2VzcyBub3cnKTtcbiAgICAgICAgICAgICAgICAgICAga2lsbFByb2Nlc3NUcmVlKHRoaXMucHR2c2RQcm9jZXNzSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoX2EpIHsgfVxuICAgICAgICAgICAgICAgIHRoaXMucHR2c2RQcm9jZXNzSWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlYnVnU2Vzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ1NodXR0aW5nIGRvd24gZGVidWcgc2Vzc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYnVnU2Vzc2lvbi5zaHV0ZG93bigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLnZlcmJvc2UoJ2Rpc3Bvc2luZycpO1xuICAgICAgICAgICAgICAgIHlpZWxkIGFzeW5jXzEuc2xlZXAoMTAwKTtcbiAgICAgICAgICAgICAgICAvLyBEaXNwb3NlIGxhc3QsIHdlIGRvbid0IHdhbnQgdG8gZGlzcG9zZSB0aGUgcHJvdG9jb2wgbG9nZ2VycyB0b28gZWFybHkuXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5mb3JFYWNoKGRpc3Bvc2FibGUgPT4gZGlzcG9zYWJsZS5kaXNwb3NlKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbm5lY3QgUFRWU0Qgc29ja2V0IHRvIFZTIENvZGUuXG4gICAgICAgICAqIFRoaXMgYWxsb3dzIFBUVlNEIHRvIGNvbW11bmljYXRlIGRpcmVjdGx5IHdpdGggVlMgQ29kZS5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQG1lbWJlcm9mIERlYnVnTWFuYWdlclxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb25uZWN0VlNDb2RlVG9QVFZTRCA9IChyZXNwb25zZSkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgYXR0YWNoT3JMYXVuY2hSZXF1ZXN0ID0geWllbGQgKHRoaXMubGF1bmNoT3JBdHRhY2ggPT09ICdhdHRhY2gnID8gdGhpcy5hdHRhY2hSZXF1ZXN0IDogdGhpcy5sYXVuY2hSZXF1ZXN0KTtcbiAgICAgICAgICAgIC8vIEJ5IG5vdyB3ZSdyZSBjb25uZWN0ZWQgdG8gdGhlIGNsaWVudC5cbiAgICAgICAgICAgIHRoaXMuc29ja2V0ID0geWllbGQgdGhpcy5kZWJ1Z1Nlc3Npb24uZGVidWdTZXJ2ZXIuY2xpZW50O1xuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byBoYW5kbGUgYm90aCBlbmQgYW5kIGVycm9yLCBzb21ldGltZXMgdGhlIHNvY2tldCB3aWxsIGVycm9yIG91dCB3aXRob3V0IGVuZGluZyAoaWYgZGVidWdlZSBpcyBraWxsZWQpLlxuICAgICAgICAgICAgLy8gTm90ZSwgd2UgbmVlZCBhIGhhbmRsZXIgZm9yIHRoZSBlcnJvciBldmVudCwgZWxzZSBub2RlanMgY29tcGxhaW5zIHdoZW4gc29ja2V0IGdldHMgY2xvc2VkIGFuZCB0aGVyZSBhcmUgbm8gZXJyb3IgaGFuZGxlcnMuXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnU29ja2V0IEVuZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2h1dGRvd24oKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5zb2NrZXQub24oJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnU29ja2V0IEVycm9yJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaHV0ZG93bigpLmlnbm9yZUVycm9ycygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHByb2Nlc3NpZCBmb3Iga2lsbGluZyBpdC5cbiAgICAgICAgICAgIGlmICh0aGlzLmxhdW5jaE9yQXR0YWNoID09PSAnbGF1bmNoJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlYnVnU29rZXRQcm90b2NvbFBhcnNlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JUHJvdG9jb2xQYXJzZXIpO1xuICAgICAgICAgICAgICAgIGRlYnVnU29rZXRQcm90b2NvbFBhcnNlci5jb25uZWN0KHRoaXMuc29ja2V0KTtcbiAgICAgICAgICAgICAgICBkZWJ1Z1Nva2V0UHJvdG9jb2xQYXJzZXIub25jZSgnZXZlbnRfcHJvY2VzcycsIChwcm9jKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHR2c2RQcm9jZXNzSWQgPSBwcm9jLmJvZHkuc3lzdGVtUHJvY2Vzc0lkO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gR2V0IHJlYWR5IGZvciBQVFZTRCB0byBjb21tdW5pY2F0ZSBkaXJlY3RseSB3aXRoIFZTIENvZGUuXG4gICAgICAgICAgICB0aGlzLmlucHV0U3RyZWFtLnVucGlwZSh0aGlzLmRlYnVnU2Vzc2lvbklucHV0U3RyZWFtKTtcbiAgICAgICAgICAgIHRoaXMuZGVidWdTZXNzaW9uT3V0cHV0U3RyZWFtLnVucGlwZSh0aGlzLm91dHB1dFN0cmVhbSk7XG4gICAgICAgICAgICAvLyBEbyBub3QgcGlwZS4gV2hlbiByZXN0YXJ0aW5nIHRoZSBkZWJ1Z2dlciwgdGhlIHNvY2tldCBnZXRzIGNsb3NlZCxcbiAgICAgICAgICAgIC8vIEluIHdoaWNoIGNhc2UsIFZTQyB3aWxsIHNlZSB0aGlzIGFuZCBzaHV0ZG93biB0aGUgZGVidWdnZXIgY29tcGxldGVseS5cbiAgICAgICAgICAgIHRoaXMuaW5wdXRTdHJlYW0ub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNvY2tldC53cml0ZShkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5zb2NrZXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbS53cml0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dFN0cmVhbS53cml0ZShkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gU2VuZCB0aGUgbGF1bmNoL2F0dGFjaCByZXF1ZXN0IHRvIFBUVlNEIGFuZCB3YWl0IGZvciBpdCB0byByZXBseSBiYWNrLlxuICAgICAgICAgICAgdGhpcy5zZW5kTWVzc2FnZShhdHRhY2hPckxhdW5jaFJlcXVlc3QsIHRoaXMuc29ja2V0KTtcbiAgICAgICAgICAgIC8vIFNlbmQgdGhlIGluaXRpYWxpemUgcmVxdWVzdCBhbmQgd2FpdCBmb3IgaXQgdG8gcmVwbHkgYmFjayB3aXRoIHRoZSBpbml0aWFsaXplZCBldmVudFxuICAgICAgICAgICAgdGhpcy5zZW5kTWVzc2FnZSh5aWVsZCB0aGlzLmluaXRpYWxpemVSZXF1ZXN0LCB0aGlzLnNvY2tldCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm9uUmVxdWVzdEluaXRpYWxpemUgPSAocmVxdWVzdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYXNTaHV0ZG93biA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50ZXJtaW5hdGVkRXZlbnRTZW50ID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RSZXNwb25zZVNlbnQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMucmVzdGFydCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0UmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlcXVlc3REZWZlcnJlZC5yZXNvbHZlKHJlcXVlc3QpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLm9uUmVxdWVzdExhdW5jaCA9IChyZXF1ZXN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmxhdW5jaE9yQXR0YWNoID0gJ2xhdW5jaCc7XG4gICAgICAgICAgICB0aGlzLmxvZ2dpbmdFbmFibGVkID0gcmVxdWVzdC5hcmd1bWVudHMubG9nVG9GaWxlID09PSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5sYXVuY2hSZXF1ZXN0RGVmZXJyZWQucmVzb2x2ZShyZXF1ZXN0KTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5vblJlcXVlc3RBdHRhY2ggPSAocmVxdWVzdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5sYXVuY2hPckF0dGFjaCA9ICdhdHRhY2gnO1xuICAgICAgICAgICAgdGhpcy5sb2dnaW5nRW5hYmxlZCA9IHJlcXVlc3QuYXJndW1lbnRzLmxvZ1RvRmlsZSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuYXR0YWNoUmVxdWVzdERlZmVycmVkLnJlc29sdmUocmVxdWVzdCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMub25SZXF1ZXN0RGlzY29ubmVjdCA9IChyZXF1ZXN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RSZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdW5jaE9yQXR0YWNoID09PSAnYXR0YWNoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSByZXF1ZXN0LmFyZ3VtZW50cztcbiAgICAgICAgICAgIGlmIChhcmdzICYmIGFyZ3MucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdGFydCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXaGVuIFZTIENvZGUgc2VuZHMgYSBkaXNjb25uZWN0IHJlcXVlc3QsIFBUVlNEIHJlcGxpZXMgYmFjayB3aXRoIGEgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBzb21ldGltZSwgdW50aWxsIHRoZSBtZXNzYWdlcyBhcmUgc2VudCBvdXQgKHJlbWVtYmVyLCB3ZSdyZSBqdXN0IGludGVyY2VwdGluZyBzdHJlYW1zIGhlcmUpLlxuICAgICAgICAgICAgc2V0VGltZW91dCh0aGlzLnNodXRkb3duLCA1MDApO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLm9uRXZlbnRUZXJtaW5hdGVkID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci52ZXJib3NlKCdvbkV2ZW50VGVybWluYXRlZCcpO1xuICAgICAgICAgICAgdGhpcy50ZXJtaW5hdGVkRXZlbnRTZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFdhaXQgZm9yIHNvbWV0aW1lLCB1bnRpbGwgdGhlIG1lc3NhZ2VzIGFyZSBzZW50IG91dCAocmVtZW1iZXIsIHdlJ3JlIGp1c3QgaW50ZXJjZXB0aW5nIHN0cmVhbXMgaGVyZSkuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHRoaXMuc2h1dGRvd24sIDMwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm9uUmVzcG9uc2VEaXNjb25uZWN0ID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0UmVzcG9uc2VTZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIudmVyYm9zZSgnb25SZXNwb25zZURpc2Nvbm5lY3QnKTtcbiAgICAgICAgICAgIC8vIFdoZW4gVlMgQ29kZSBzZW5kcyBhIGRpc2Nvbm5lY3QgcmVxdWVzdCwgUFRWU0QgcmVwbGllcyBiYWNrIHdpdGggYSByZXNwb25zZSwgYnV0IGl0cyB1cHRvIHVzIHRvIGtpbGwgdGhlIHByb2Nlc3MuXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBzb21ldGltZSwgdW50aWxsIHRoZSBtZXNzYWdlcyBhcmUgc2VudCBvdXQgKHJlbWVtYmVyLCB3ZSdyZSBqdXN0IGludGVyY2VwdGluZyBzdHJlYW1zIGhlcmUpLlxuICAgICAgICAgICAgLy8gQWxzbyBpdHMgcG9zc2libGUgUFRWU0QgbWlnaHQgcnVuIHRvIGNvbXBsZXRpb24uXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHRoaXMuc2h1dGRvd24sIDEwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnRocm91Z2hJbnB1dFN0cmVhbSA9IG5ldyBzdHJlYW1fMS5QYXNzVGhyb3VnaCgpO1xuICAgICAgICB0aGlzLnRocm91Z2hPdXRwdXRTdHJlYW0gPSBuZXcgc3RyZWFtXzEuUGFzc1Rocm91Z2goKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb25PdXRwdXRTdHJlYW0gPSBuZXcgc3RyZWFtXzEuUGFzc1Rocm91Z2goKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb25JbnB1dFN0cmVhbSA9IG5ldyBzdHJlYW1fMS5QYXNzVGhyb3VnaCgpO1xuICAgICAgICB0aGlzLnByb3RvY29sTWVzc2FnZVdyaXRlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JUHJvdG9jb2xNZXNzYWdlV3JpdGVyKTtcbiAgICAgICAgdGhpcy5pbnB1dFByb3RvY29sUGFyc2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQcm90b2NvbFBhcnNlcik7XG4gICAgICAgIHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlci5jb25uZWN0KHRoaXMudGhyb3VnaElucHV0U3RyZWFtKTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlcy5wdXNoKHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlcik7XG4gICAgICAgIHRoaXMub3V0cHV0UHJvdG9jb2xQYXJzZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSVByb3RvY29sUGFyc2VyKTtcbiAgICAgICAgdGhpcy5vdXRwdXRQcm90b2NvbFBhcnNlci5jb25uZWN0KHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbSk7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMucHVzaCh0aGlzLm91dHB1dFByb3RvY29sUGFyc2VyKTtcbiAgICAgICAgdGhpcy5wcm90b2NvbExvZ2dlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JUHJvdG9jb2xMb2dnZXIpO1xuICAgICAgICB0aGlzLnByb3RvY29sTG9nZ2VyLmNvbm5lY3QodGhpcy50aHJvdWdoSW5wdXRTdHJlYW0sIHRoaXMudGhyb3VnaE91dHB1dFN0cmVhbSk7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZXMucHVzaCh0aGlzLnByb3RvY29sTG9nZ2VyKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVxdWVzdERlZmVycmVkID0gYXN5bmNfMS5jcmVhdGVEZWZlcnJlZCgpO1xuICAgICAgICB0aGlzLmxhdW5jaFJlcXVlc3REZWZlcnJlZCA9IGFzeW5jXzEuY3JlYXRlRGVmZXJyZWQoKTtcbiAgICAgICAgdGhpcy5hdHRhY2hSZXF1ZXN0RGVmZXJyZWQgPSBhc3luY18xLmNyZWF0ZURlZmVycmVkKCk7XG4gICAgfVxuICAgIGdldCBpbml0aWFsaXplUmVxdWVzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5pdGlhbGl6ZVJlcXVlc3REZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgICBnZXQgbGF1bmNoUmVxdWVzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGF1bmNoUmVxdWVzdERlZmVycmVkLnByb21pc2U7XG4gICAgfVxuICAgIGdldCBhdHRhY2hSZXF1ZXN0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRhY2hSZXF1ZXN0RGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gICAgc2V0IGxvZ2dpbmdFbmFibGVkKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci5zZXR1cChsb2dnZXJfMS5Mb2dMZXZlbC5WZXJib3NlLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMucHJvdG9jb2xMb2dnZXIuc2V0dXAodnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGlzcG9zZSgpIHtcbiAgICAgICAgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLmxvZ2dlci52ZXJib3NlKCdtYWluIGRpc3Bvc2UnKTtcbiAgICAgICAgdGhpcy5zaHV0ZG93bigpLmlnbm9yZUVycm9ycygpO1xuICAgIH1cbiAgICBzdGFydCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlYnVnU3RyZWFtUHJvdmlkZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSURlYnVnU3RyZWFtUHJvdmlkZXIpO1xuICAgICAgICAgICAgY29uc3QgeyBpbnB1dCwgb3V0cHV0IH0gPSB5aWVsZCBkZWJ1Z1N0cmVhbVByb3ZpZGVyLmdldElucHV0QW5kT3V0cHV0U3RyZWFtcygpO1xuICAgICAgICAgICAgdGhpcy5pc1NlcnZlck1vZGUgPSBkZWJ1Z1N0cmVhbVByb3ZpZGVyLnVzZURlYnVnU29ja2V0U3RyZWFtO1xuICAgICAgICAgICAgdGhpcy5pbnB1dFN0cmVhbSA9IGlucHV0O1xuICAgICAgICAgICAgdGhpcy5vdXRwdXRTdHJlYW0gPSBvdXRwdXQ7XG4gICAgICAgICAgICB0aGlzLmlucHV0U3RyZWFtLnBhdXNlKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNTZXJ2ZXJNb2RlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFByb2Nlc3MgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSUN1cnJlbnRQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50UHJvY2Vzcy5vbignU0lHVEVSTScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2h1dGRvd24oKS5pZ25vcmVFcnJvcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pbnRlcmNlcHRQcm90b2NvbE1lc3NhZ2VzKCk7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0RGVidWdTZXNzaW9uKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZW5kTWVzc2FnZShtZXNzYWdlLCBvdXRwdXRTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5wcm90b2NvbE1lc3NhZ2VXcml0ZXIud3JpdGUob3V0cHV0U3RyZWFtLCBtZXNzYWdlKTtcbiAgICAgICAgdGhpcy5wcm90b2NvbE1lc3NhZ2VXcml0ZXIud3JpdGUodGhpcy50aHJvdWdoT3V0cHV0U3RyZWFtLCBtZXNzYWdlKTtcbiAgICB9XG4gICAgc3RhcnREZWJ1Z1Nlc3Npb24oKSB7XG4gICAgICAgIHRoaXMuZGVidWdTZXNzaW9uID0gbmV3IFB5dGhvbkRlYnVnZ2VyKHRoaXMuc2VydmljZUNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZGVidWdTZXNzaW9uLnNldFJ1bkFzU2VydmVyKHRoaXMuaXNTZXJ2ZXJNb2RlKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb24ub25jZSgnZGVidWdnZXJfYXR0YWNoZWQnLCB0aGlzLmNvbm5lY3RWU0NvZGVUb1BUVlNEKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb24ub25jZSgnZGVidWdnZXJfbGF1bmNoZWQnLCB0aGlzLmNvbm5lY3RWU0NvZGVUb1BUVlNEKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb25PdXRwdXRTdHJlYW0ucGlwZSh0aGlzLnRocm91Z2hPdXRwdXRTdHJlYW0pO1xuICAgICAgICB0aGlzLmRlYnVnU2Vzc2lvbk91dHB1dFN0cmVhbS5waXBlKHRoaXMub3V0cHV0U3RyZWFtKTtcbiAgICAgICAgLy8gU3RhcnQgaGFuZGxpbmcgcmVxdWVzdHMgaW4gdGhlIHNlc3Npb24gaW5zdGFuY2UuXG4gICAgICAgIC8vIFRoZSBzZXNzaW9uIChQeXRob25EZWJ1Z2dlciBjbGFzcykgd2lsbCBvbmx5IHBlcmZvcm0gdGhlIGJvb3RzdHJhcHBpbmcgKGxhdW5jaGluZyBvZiBQVFZTRCkuXG4gICAgICAgIHRoaXMuaW5wdXRTdHJlYW0ucGlwZSh0aGlzLnRocm91Z2hJbnB1dFN0cmVhbSk7XG4gICAgICAgIHRoaXMuaW5wdXRTdHJlYW0ucGlwZSh0aGlzLmRlYnVnU2Vzc2lvbklucHV0U3RyZWFtKTtcbiAgICAgICAgdGhpcy5kZWJ1Z1Nlc3Npb24uc3RhcnQodGhpcy5kZWJ1Z1Nlc3Npb25JbnB1dFN0cmVhbSwgdGhpcy5kZWJ1Z1Nlc3Npb25PdXRwdXRTdHJlYW0pO1xuICAgIH1cbiAgICBpbnRlcmNlcHRQcm90b2NvbE1lc3NhZ2VzKCkge1xuICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBpbml0aWFsaXplIGFuZCBsYXVuY2ggcmVxdWVzdHMsIHdlJ2xsIG5lZWQgdG8gcmUtc2VuZCB0aGVzZSB0byBwdHZzZCwgZm9yIGJvb3RzdHJhcHBpbmcuXG4gICAgICAgIHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlci5vbmNlKCdyZXF1ZXN0X2luaXRpYWxpemUnLCB0aGlzLm9uUmVxdWVzdEluaXRpYWxpemUpO1xuICAgICAgICB0aGlzLmlucHV0UHJvdG9jb2xQYXJzZXIub25jZSgncmVxdWVzdF9sYXVuY2gnLCB0aGlzLm9uUmVxdWVzdExhdW5jaCk7XG4gICAgICAgIHRoaXMuaW5wdXRQcm90b2NvbFBhcnNlci5vbmNlKCdyZXF1ZXN0X2F0dGFjaCcsIHRoaXMub25SZXF1ZXN0QXR0YWNoKTtcbiAgICAgICAgdGhpcy5pbnB1dFByb3RvY29sUGFyc2VyLm9uY2UoJ3JlcXVlc3RfZGlzY29ubmVjdCcsIHRoaXMub25SZXF1ZXN0RGlzY29ubmVjdCk7XG4gICAgICAgIHRoaXMub3V0cHV0UHJvdG9jb2xQYXJzZXIub25jZSgnZXZlbnRfdGVybWluYXRlZCcsIHRoaXMub25FdmVudFRlcm1pbmF0ZWQpO1xuICAgICAgICB0aGlzLm91dHB1dFByb3RvY29sUGFyc2VyLm9uY2UoJ3Jlc3BvbnNlX2Rpc2Nvbm5lY3QnLCB0aGlzLm9uUmVzcG9uc2VEaXNjb25uZWN0KTtcbiAgICB9XG59XG5mdW5jdGlvbiBzdGFydERlYnVnZ2VyKCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuaW5pdChtaXNjXzEubm9vcCwgcGF0aC5qb2luKGNvbnN0YW50c18xLkVYVEVOU0lPTl9ST09UX0RJUiwgYGRlYnVnJHtwcm9jZXNzLnBpZH0ubG9nYCkpO1xuICAgICAgICBjb25zdCBzZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZVJlZ2lzdHJ5XzEuaW5pdGlhbGl6ZUlvYygpO1xuICAgICAgICBjb25zdCBwcm90b2NvbE1lc3NhZ2VXcml0ZXIgPSBzZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQcm90b2NvbE1lc3NhZ2VXcml0ZXIpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZGVidWdnZXI7XG4gICAgICAgICAgICBjb25zdCBkZWJ1Z01hbmFnZXIgPSBuZXcgRGVidWdNYW5hZ2VyKHNlcnZpY2VDb250YWluZXIpO1xuICAgICAgICAgICAgeWllbGQgZGVidWdNYW5hZ2VyLnN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBEZWJ1Z2dlciBFcnJvcjogJHtlcnIgJiYgZXJyLm1lc3NhZ2UgPyBlcnIubWVzc2FnZSA6IGVyci50b1N0cmluZygpfWA7XG4gICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gW21lc3NhZ2UsIGVyciAmJiBlcnIubmFtZSA/IGVyci5uYW1lIDogJycsIGVyciAmJiBlcnIuc3RhY2sgPyBlcnIuc3RhY2sgOiAnJ10uam9pbihvc18xLkVPTCk7XG4gICAgICAgICAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGAke21lc3NhZ2V9JHtvc18xLkVPTH0ke2RldGFpbHN9YCk7XG4gICAgICAgICAgICAvLyBOb3RpZnkgdGhlIHVzZXIuXG4gICAgICAgICAgICBwcm90b2NvbE1lc3NhZ2VXcml0ZXIud3JpdGUocHJvY2Vzcy5zdGRvdXQsIG5ldyB2c2NvZGVfZGVidWdhZGFwdGVyXzEuRXZlbnQoJ2Vycm9yJywgbWVzc2FnZSkpO1xuICAgICAgICAgICAgcHJvdG9jb2xNZXNzYWdlV3JpdGVyLndyaXRlKHByb2Nlc3Muc3Rkb3V0LCBuZXcgdnNjb2RlX2RlYnVnYWRhcHRlcl8xLk91dHB1dEV2ZW50KGAke21lc3NhZ2V9JHtvc18xLkVPTH0ke2RldGFpbHN9YCwgJ3N0ZGVycicpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxucHJvY2Vzcy5zdGRpbi5vbignZXJyb3InLCAoKSA9PiB7IH0pO1xucHJvY2Vzcy5zdGRvdXQub24oJ2Vycm9yJywgKCkgPT4geyB9KTtcbnByb2Nlc3Muc3RkZXJyLm9uKCdlcnJvcicsICgpID0+IHsgfSk7XG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIChlcnIpID0+IHtcbiAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGBVbmNhdWdodCBFeGNlcHRpb246ICR7ZXJyICYmIGVyci5tZXNzYWdlID8gZXJyLm1lc3NhZ2UgOiAnJ31gKTtcbiAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGVyciAmJiBlcnIubmFtZSA/IGVyci5uYW1lIDogJycpO1xuICAgIHZzY29kZV9kZWJ1Z2FkYXB0ZXJfMS5sb2dnZXIuZXJyb3IoZXJyICYmIGVyci5zdGFjayA/IGVyci5zdGFjayA6ICcnKTtcbiAgICAvLyBDYXRjaCBhbGwsIGluY2FzZSB3ZSBoYXZlIHN0cmluZyBleGNlcHRpb25zIGJlaW5nIHJhaXNlZC5cbiAgICB2c2NvZGVfZGVidWdhZGFwdGVyXzEubG9nZ2VyLmVycm9yKGVyciA/IGVyci50b1N0cmluZygpIDogJycpO1xuICAgIC8vIFdhaXQgZm9yIDEgc2Vjb25kIGJlZm9yZSB3ZSBkaWUsIHdlIG5lZWQgdG8gZW5zdXJlIGVycm9ycyBhcmUgd3JpdHRlbiB0byB0aGUgbG9nIGZpbGUuXG4gICAgc2V0VGltZW91dCgoKSA9PiBwcm9jZXNzLmV4aXQoLTEpLCAxMDApO1xufSk7XG5zdGFydERlYnVnZ2VyKCkuY2F0Y2goZXggPT4ge1xuICAgIC8vIE5vdCBuZWNlc3NhcnkgZXhjZXB0IGZvciBkZWJ1Z2dpbmcgYW5kIHRvIGtpbGwgbGludGVyIHdhcm5pbmcgYWJvdXQgdW5oYW5kbGVkIHByb21pc2VzLlxufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYWluLmpzLm1hcCJdfQ==