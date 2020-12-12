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

const fs = require("fs-extra");

const glob = require("glob");

const path = require("path");

const semver_1 = require("semver");

const vscode_1 = require("vscode");

const configSettings_1 = require("../client/common/configSettings");

const constants_1 = require("../client/common/constants");

const logger_1 = require("../client/common/logger");

const decoder_1 = require("../client/common/process/decoder");

const proc_1 = require("../client/common/process/proc");

const misc_1 = require("../client/common/utils/misc");

const platform_1 = require("../client/common/utils/platform");

const initialize_1 = require("./initialize");

var core_1 = require("./core");

exports.sleep = core_1.sleep; // tslint:disable:no-invalid-this no-any

const fileInNonRootWorkspace = path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test', 'pythonFiles', 'dummy.py');
exports.rootWorkspaceUri = getWorkspaceRoot();
exports.PYTHON_PATH = getPythonPath();

function updateSetting(setting, value, resource, configTarget) {
  return __awaiter(this, void 0, void 0, function* () {
    const settings = vscode_1.workspace.getConfiguration('python', resource);
    const currentValue = settings.inspect(setting);

    if (currentValue !== undefined && (configTarget === vscode_1.ConfigurationTarget.Global && currentValue.globalValue === value || configTarget === vscode_1.ConfigurationTarget.Workspace && currentValue.workspaceValue === value || configTarget === vscode_1.ConfigurationTarget.WorkspaceFolder && currentValue.workspaceFolderValue === value)) {
      configSettings_1.PythonSettings.dispose();
      return;
    }

    yield settings.update(setting, value, configTarget); // We've experienced trouble with .update in the past, where VSC returns stale data even
    // after invoking the update method. This issue has regressed a few times as well. This
    // delay is merely a backup to ensure it extension doesn't break the tests due to similar
    // regressions in VSC:
    // await sleep(2000);
    // ... please see issue #2356 and PR #2332 for a discussion on the matter

    configSettings_1.PythonSettings.dispose();
  });
}

exports.updateSetting = updateSetting; // In some tests we will be mocking VS Code API (mocked classes)

const globalPythonPathSetting = vscode_1.workspace.getConfiguration('python') ? vscode_1.workspace.getConfiguration('python').inspect('pythonPath').globalValue : 'python';

exports.clearPythonPathInWorkspaceFolder = resource => __awaiter(void 0, void 0, void 0, function* () {
  return retryAsync(setPythonPathInWorkspace)(resource, vscode_1.ConfigurationTarget.WorkspaceFolder);
});

exports.setPythonPathInWorkspaceRoot = pythonPath => __awaiter(void 0, void 0, void 0, function* () {
  return retryAsync(setPythonPathInWorkspace)(undefined, vscode_1.ConfigurationTarget.Workspace, pythonPath);
});

exports.resetGlobalPythonPathSetting = () => __awaiter(void 0, void 0, void 0, function* () {
  return retryAsync(restoreGlobalPythonPathSetting)();
});

function getWorkspaceRoot() {
  if (!Array.isArray(vscode_1.workspace.workspaceFolders) || vscode_1.workspace.workspaceFolders.length === 0) {
    return vscode_1.Uri.file(path.join(constants_1.EXTENSION_ROOT_DIR, 'src', 'test'));
  }

  if (vscode_1.workspace.workspaceFolders.length === 1) {
    return vscode_1.workspace.workspaceFolders[0].uri;
  }

  const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(fileInNonRootWorkspace));
  return workspaceFolder ? workspaceFolder.uri : vscode_1.workspace.workspaceFolders[0].uri;
}

function retryAsync(wrapped, retryCount = 2) {
  return (...args) => __awaiter(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
      const reasons = [];

      const makeCall = () => {
        wrapped.call(this, ...args).then(resolve, reason => {
          reasons.push(reason);

          if (reasons.length >= retryCount) {
            reject(reasons);
          } else {
            // If failed once, lets wait for some time before trying again.
            setTimeout(makeCall, 500);
          }
        });
      };

      makeCall();
    });
  });
}

exports.retryAsync = retryAsync;

function setPythonPathInWorkspace(resource, config, pythonPath) {
  return __awaiter(this, void 0, void 0, function* () {
    if (config === vscode_1.ConfigurationTarget.WorkspaceFolder && !initialize_1.IS_MULTI_ROOT_TEST) {
      return;
    }

    const resourceUri = typeof resource === 'string' ? vscode_1.Uri.file(resource) : resource;
    const settings = vscode_1.workspace.getConfiguration('python', resourceUri);
    const value = settings.inspect('pythonPath');
    const prop = config === vscode_1.ConfigurationTarget.Workspace ? 'workspaceValue' : 'workspaceFolderValue';

    if (value && value[prop] !== pythonPath) {
      yield settings.update('pythonPath', pythonPath, config);
      configSettings_1.PythonSettings.dispose();
    }
  });
}

function restoreGlobalPythonPathSetting() {
  return __awaiter(this, void 0, void 0, function* () {
    const pythonConfig = vscode_1.workspace.getConfiguration('python', null);
    const currentGlobalPythonPathSetting = pythonConfig.inspect('pythonPath').globalValue;

    if (globalPythonPathSetting !== currentGlobalPythonPathSetting) {
      yield pythonConfig.update('pythonPath', undefined, true);
    }

    configSettings_1.PythonSettings.dispose();
  });
}

function deleteDirectory(dir) {
  return __awaiter(this, void 0, void 0, function* () {
    const exists = yield fs.pathExists(dir);

    if (exists) {
      yield fs.remove(dir);
    }
  });
}

exports.deleteDirectory = deleteDirectory;

function deleteFile(file) {
  return __awaiter(this, void 0, void 0, function* () {
    const exists = yield fs.pathExists(file);

    if (exists) {
      yield fs.remove(file);
    }
  });
}

exports.deleteFile = deleteFile;

function deleteFiles(globPattern) {
  return __awaiter(this, void 0, void 0, function* () {
    const items = yield new Promise((resolve, reject) => {
      glob(globPattern, (ex, files) => ex ? reject(ex) : resolve(files));
    });
    return Promise.all(items.map(item => fs.remove(item).catch(misc_1.noop)));
  });
}

exports.deleteFiles = deleteFiles;

function getPythonPath() {
  if (process.env.CI_PYTHON_PATH && fs.existsSync(process.env.CI_PYTHON_PATH)) {
    return process.env.CI_PYTHON_PATH;
  }

  return 'python';
}
/**
 * Determine if the current platform is included in a list of platforms.
 *
 * @param {OSes} OSType[] List of operating system Ids to check within.
 * @return true if the current OS matches one from the list, false otherwise.
 */


function isOs(...OSes) {
  // get current OS
  const currentOS = platform_1.getOSType(); // compare and return

  if (OSes.indexOf(currentOS) === -1) {
    return false;
  }

  return true;
}

exports.isOs = isOs;
/**
 * Get the current Python interpreter version.
 *
 * @param {procService} IProcessService Optionally specify the IProcessService implementation to use to execute with.
 * @return `SemVer` version of the Python interpreter, or `undefined` if an error occurs.
 */

function getPythonSemVer(procService) {
  return __awaiter(this, void 0, void 0, function* () {
    const pythonProcRunner = procService ? procService : new proc_1.ProcessService(new decoder_1.BufferDecoder());
    const pyVerArgs = ['-c', 'import sys;print("{0}.{1}.{2}".format(*sys.version_info[:3]))'];
    return pythonProcRunner.exec(exports.PYTHON_PATH, pyVerArgs).then(strVersion => new semver_1.SemVer(strVersion.stdout.trim())).catch(err => {
      // if the call fails this should make it loudly apparent.
      logger_1.traceError('getPythonSemVer', err);
      return undefined;
    });
  });
}

exports.getPythonSemVer = getPythonSemVer;
/**
 * Match a given semver version specification with a list of loosely defined
 * version strings.
 *
 * Specify versions by their major version at minimum - the minor and patch
 * version numbers are optional.
 *
 * '3', '3.6', '3.6.6', are all vald and only the portions specified will be matched
 * against the current running Python interpreter version.
 *
 * Example scenarios:
 * '3' will match version 3.5.6, 3.6.4, 3.6.6, and 3.7.0.
 * '3.6' will match version 3.6.4 and 3.6.6.
 * '3.6.4' will match version 3.6.4 only.
 *
 * @param {version} SemVer the version to look for.
 * @param {searchVersions} string[] List of loosely-specified versions to match against.
 */

function isVersionInList(version, ...searchVersions) {
  // see if the major/minor version matches any member of the skip-list.
  const isPresent = searchVersions.findIndex(ver => {
    const semverChecker = semver_1.coerce(ver);

    if (semverChecker) {
      if (semverChecker.compare(version) === 0) {
        return true;
      } else {
        // compare all the parts of the version that we have, we know we have
        // at minimum the major version or semverChecker would be 'null'...
        const versionParts = ver.split('.');
        let matches = parseInt(versionParts[0], 10) === version.major;

        if (matches && versionParts.length >= 2) {
          matches = parseInt(versionParts[1], 10) === version.minor;
        }

        if (matches && versionParts.length >= 3) {
          matches = parseInt(versionParts[2], 10) === version.patch;
        }

        return matches;
      }
    }

    return false;
  });

  if (isPresent >= 0) {
    return true;
  }

  return false;
}

exports.isVersionInList = isVersionInList;
/**
 * Determine if the Python interpreter version running in a given `IProcessService`
 * is in a selection of versions.
 *
 * You can specify versions by specifying the major version at minimum - the minor and
 * patch version numbers are optional.
 *
 * '3', '3.6', '3.6.6', are all vald and only the portions specified will be matched
 * against the current running Python interpreter version.
 *
 * Example scenarios:
 * '3' will match version 3.5.6, 3.6.4, 3.6.6, and 3.7.0.
 * '3.6' will match version 3.6.4 and 3.6.6.
 * '3.6.4' will match version 3.6.4 only.
 *
 * If you don't need to specify the environment (ie. the workspace) that the Python
 * interpreter is running under, use the simpler `isPythonVersion` instead.
 *
 * @param {procService} IProcessService Optionally, use this process service to call out to python with.
 * @param {versions} string[] Python versions to test for, specified as described above.
 * @return true if the current Python version matches a version in the skip list, false otherwise.
 */

function isPythonVersionInProcess(procService, ...versions) {
  return __awaiter(this, void 0, void 0, function* () {
    // get the current python version major/minor
    const currentPyVersion = yield getPythonSemVer(procService);

    if (currentPyVersion) {
      return isVersionInList(currentPyVersion, ...versions);
    } else {
      logger_1.traceError(`Failed to determine the current Python version when comparing against list [${versions.join(', ')}].`);
      return false;
    }
  });
}

exports.isPythonVersionInProcess = isPythonVersionInProcess;
/**
 * Determine if the current interpreter version is in a given selection of versions.
 *
 * You can specify versions by using up to the first three semver parts of a python
 * version.
 *
 * '3', '3.6', '3.6.6', are all vald and only the portions specified will be matched
 * against the current running Python interpreter version.
 *
 * Example scenarios:
 * '3' will match version 3.5.6, 3.6.4, 3.6.6, and 3.7.0.
 * '3.6' will match version 3.6.4 and 3.6.6.
 * '3.6.4' will match version 3.6.4 only.
 *
 * If you need to specify the environment (ie. the workspace) that the Python
 * interpreter is running under, use `isPythonVersionInProcess` instead.
 *
 * @param {versions} string[] List of versions of python that are to be skipped.
 * @param {resource} vscode.Uri Current workspace resource Uri or undefined.
 * @return true if the current Python version matches a version in the skip list, false otherwise.
 */

function isPythonVersion(...versions) {
  return __awaiter(this, void 0, void 0, function* () {
    const currentPyVersion = yield getPythonSemVer();

    if (currentPyVersion) {
      return isVersionInList(currentPyVersion, ...versions);
    } else {
      logger_1.traceError(`Failed to determine the current Python version when comparing against list [${versions.join(', ')}].`);
      return false;
    }
  });
}

exports.isPythonVersion = isPythonVersion;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwiZnMiLCJyZXF1aXJlIiwiZ2xvYiIsInBhdGgiLCJzZW12ZXJfMSIsInZzY29kZV8xIiwiY29uZmlnU2V0dGluZ3NfMSIsImNvbnN0YW50c18xIiwibG9nZ2VyXzEiLCJkZWNvZGVyXzEiLCJwcm9jXzEiLCJtaXNjXzEiLCJwbGF0Zm9ybV8xIiwiaW5pdGlhbGl6ZV8xIiwiY29yZV8xIiwic2xlZXAiLCJmaWxlSW5Ob25Sb290V29ya3NwYWNlIiwiam9pbiIsIkVYVEVOU0lPTl9ST09UX0RJUiIsInJvb3RXb3Jrc3BhY2VVcmkiLCJnZXRXb3Jrc3BhY2VSb290IiwiUFlUSE9OX1BBVEgiLCJnZXRQeXRob25QYXRoIiwidXBkYXRlU2V0dGluZyIsInNldHRpbmciLCJyZXNvdXJjZSIsImNvbmZpZ1RhcmdldCIsInNldHRpbmdzIiwid29ya3NwYWNlIiwiZ2V0Q29uZmlndXJhdGlvbiIsImN1cnJlbnRWYWx1ZSIsImluc3BlY3QiLCJ1bmRlZmluZWQiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiR2xvYmFsIiwiZ2xvYmFsVmFsdWUiLCJXb3Jrc3BhY2UiLCJ3b3Jrc3BhY2VWYWx1ZSIsIldvcmtzcGFjZUZvbGRlciIsIndvcmtzcGFjZUZvbGRlclZhbHVlIiwiUHl0aG9uU2V0dGluZ3MiLCJkaXNwb3NlIiwidXBkYXRlIiwiZ2xvYmFsUHl0aG9uUGF0aFNldHRpbmciLCJjbGVhclB5dGhvblBhdGhJbldvcmtzcGFjZUZvbGRlciIsInJldHJ5QXN5bmMiLCJzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2UiLCJzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2VSb290IiwicHl0aG9uUGF0aCIsInJlc2V0R2xvYmFsUHl0aG9uUGF0aFNldHRpbmciLCJyZXN0b3JlR2xvYmFsUHl0aG9uUGF0aFNldHRpbmciLCJBcnJheSIsImlzQXJyYXkiLCJ3b3Jrc3BhY2VGb2xkZXJzIiwibGVuZ3RoIiwiVXJpIiwiZmlsZSIsInVyaSIsIndvcmtzcGFjZUZvbGRlciIsImdldFdvcmtzcGFjZUZvbGRlciIsIndyYXBwZWQiLCJyZXRyeUNvdW50IiwiYXJncyIsInJlYXNvbnMiLCJtYWtlQ2FsbCIsImNhbGwiLCJyZWFzb24iLCJwdXNoIiwic2V0VGltZW91dCIsImNvbmZpZyIsIklTX01VTFRJX1JPT1RfVEVTVCIsInJlc291cmNlVXJpIiwicHJvcCIsInB5dGhvbkNvbmZpZyIsImN1cnJlbnRHbG9iYWxQeXRob25QYXRoU2V0dGluZyIsImRlbGV0ZURpcmVjdG9yeSIsImRpciIsImV4aXN0cyIsInBhdGhFeGlzdHMiLCJyZW1vdmUiLCJkZWxldGVGaWxlIiwiZGVsZXRlRmlsZXMiLCJnbG9iUGF0dGVybiIsIml0ZW1zIiwiZXgiLCJmaWxlcyIsImFsbCIsIm1hcCIsIml0ZW0iLCJjYXRjaCIsIm5vb3AiLCJwcm9jZXNzIiwiZW52IiwiQ0lfUFlUSE9OX1BBVEgiLCJleGlzdHNTeW5jIiwiaXNPcyIsIk9TZXMiLCJjdXJyZW50T1MiLCJnZXRPU1R5cGUiLCJpbmRleE9mIiwiZ2V0UHl0aG9uU2VtVmVyIiwicHJvY1NlcnZpY2UiLCJweXRob25Qcm9jUnVubmVyIiwiUHJvY2Vzc1NlcnZpY2UiLCJCdWZmZXJEZWNvZGVyIiwicHlWZXJBcmdzIiwiZXhlYyIsInN0clZlcnNpb24iLCJTZW1WZXIiLCJzdGRvdXQiLCJ0cmltIiwiZXJyIiwidHJhY2VFcnJvciIsImlzVmVyc2lvbkluTGlzdCIsInZlcnNpb24iLCJzZWFyY2hWZXJzaW9ucyIsImlzUHJlc2VudCIsImZpbmRJbmRleCIsInZlciIsInNlbXZlckNoZWNrZXIiLCJjb2VyY2UiLCJjb21wYXJlIiwidmVyc2lvblBhcnRzIiwic3BsaXQiLCJtYXRjaGVzIiwicGFyc2VJbnQiLCJtYWpvciIsIm1pbm9yIiwicGF0Y2giLCJpc1B5dGhvblZlcnNpb25JblByb2Nlc3MiLCJ2ZXJzaW9ucyIsImN1cnJlbnRQeVZlcnNpb24iLCJpc1B5dGhvblZlcnNpb24iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5CLEVBQStCQyxDQUEvQixFQUFrQ0MsU0FBbEMsRUFBNkM7QUFDckYsU0FBTyxLQUFLRCxDQUFDLEtBQUtBLENBQUMsR0FBR0UsT0FBVCxDQUFOLEVBQXlCLFVBQVVDLE9BQVYsRUFBbUJDLE1BQW5CLEVBQTJCO0FBQ3ZELGFBQVNDLFNBQVQsQ0FBbUJDLEtBQW5CLEVBQTBCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQ08sSUFBVixDQUFlRixLQUFmLENBQUQsQ0FBSjtBQUE4QixPQUFwQyxDQUFxQyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUMzRixhQUFTQyxRQUFULENBQWtCSixLQUFsQixFQUF5QjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUMsT0FBRCxDQUFULENBQW1CSyxLQUFuQixDQUFELENBQUo7QUFBa0MsT0FBeEMsQ0FBeUMsT0FBT0csQ0FBUCxFQUFVO0FBQUVMLFFBQUFBLE1BQU0sQ0FBQ0ssQ0FBRCxDQUFOO0FBQVk7QUFBRTs7QUFDOUYsYUFBU0YsSUFBVCxDQUFjSSxNQUFkLEVBQXNCO0FBQUVBLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjVCxPQUFPLENBQUNRLE1BQU0sQ0FBQ0wsS0FBUixDQUFyQixHQUFzQyxJQUFJTixDQUFKLENBQU0sVUFBVUcsT0FBVixFQUFtQjtB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QUFlLENBQUNDLFdBQUQsQ0FBOUM7O0FBQ0EsUUFBSThCLGdCQUFKLEVBQXNCO0FBQ2xCLGFBQU9sQixlQUFlLENBQUNrQixnQkFBRCxFQUFtQixHQUFHRCxRQUF0QixDQUF0QjtBQUNILEtBRkQsTUFHSztBQUNEMUgsTUFBQUEsUUFBUSxDQUFDd0csVUFBVCxDQUFxQiwrRUFBOEVrQixRQUFRLENBQUNqSCxJQUFULENBQWMsSUFBZCxDQUFvQixJQUF2SDtBQUNBLGFBQU8sS0FBUDtBQUNIO0FBQ0osR0FWZSxDQUFoQjtBQVdIOztBQUNEbEIsT0FBTyxDQUFDa0ksd0JBQVIsR0FBbUNBLHdCQUFuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxTQUFTRyxlQUFULENBQXlCLEdBQUdGLFFBQTVCLEVBQXNDO0FBQ2xDLFNBQU92SixTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxVQUFNd0osZ0JBQWdCLEdBQUcsTUFBTS9CLGVBQWUsRUFBOUM7O0FBQ0EsUUFBSStCLGdCQUFKLEVBQXNCO0FBQ2xCLGFBQU9sQixlQUFlLENBQUNrQixnQkFBRCxFQUFtQixHQUFHRCxRQUF0QixDQUF0QjtBQUNILEtBRkQsTUFHSztBQUNEMUgsTUFBQUEsUUFBUSxDQUFDd0csVUFBVCxDQUFxQiwrRUFBOEVrQixRQUFRLENBQUNqSCxJQUFULENBQWMsSUFBZCxDQUFvQixJQUF2SDtBQUNBLGFBQU8sS0FBUDtBQUNIO0FBQ0osR0FUZSxDQUFoQjtBQVVIOztBQUNEbEIsT0FBTyxDQUFDcUksZUFBUixHQUEwQkEsZUFBMUIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XHJcbmNvbnN0IGdsb2IgPSByZXF1aXJlKFwiZ2xvYlwiKTtcclxuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5jb25zdCBzZW12ZXJfMSA9IHJlcXVpcmUoXCJzZW12ZXJcIik7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgY29uZmlnU2V0dGluZ3NfMSA9IHJlcXVpcmUoXCIuLi9jbGllbnQvY29tbW9uL2NvbmZpZ1NldHRpbmdzXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi9jbGllbnQvY29tbW9uL2NvbnN0YW50c1wiKTtcclxuY29uc3QgbG9nZ2VyXzEgPSByZXF1aXJlKFwiLi4vY2xpZW50L2NvbW1vbi9sb2dnZXJcIik7XHJcbmNvbnN0IGRlY29kZXJfMSA9IHJlcXVpcmUoXCIuLi9jbGllbnQvY29tbW9uL3Byb2Nlc3MvZGVjb2RlclwiKTtcclxuY29uc3QgcHJvY18xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vcHJvY2Vzcy9wcm9jXCIpO1xyXG5jb25zdCBtaXNjXzEgPSByZXF1aXJlKFwiLi4vY2xpZW50L2NvbW1vbi91dGlscy9taXNjXCIpO1xyXG5jb25zdCBwbGF0Zm9ybV8xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vdXRpbHMvcGxhdGZvcm1cIik7XHJcbmNvbnN0IGluaXRpYWxpemVfMSA9IHJlcXVpcmUoXCIuL2luaXRpYWxpemVcIik7XHJcbnZhciBjb3JlXzEgPSByZXF1aXJlKFwiLi9jb3JlXCIpO1xyXG5leHBvcnRzLnNsZWVwID0gY29yZV8xLnNsZWVwO1xyXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1pbnZhbGlkLXRoaXMgbm8tYW55XHJcbmNvbnN0IGZpbGVJbk5vblJvb3RXb3Jrc3BhY2UgPSBwYXRoLmpvaW4oY29uc3RhbnRzXzEuRVhURU5TSU9OX1JPT1RfRElSLCAnc3JjJywgJ3Rlc3QnLCAncHl0aG9uRmlsZXMnLCAnZHVtbXkucHknKTtcclxuZXhwb3J0cy5yb290V29ya3NwYWNlVXJpID0gZ2V0V29ya3NwYWNlUm9vdCgpO1xyXG5leHBvcnRzLlBZVEhPTl9QQVRIID0gZ2V0UHl0aG9uUGF0aCgpO1xyXG5mdW5jdGlvbiB1cGRhdGVTZXR0aW5nKHNldHRpbmcsIHZhbHVlLCByZXNvdXJjZSwgY29uZmlnVGFyZ2V0KSB7XHJcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicsIHJlc291cmNlKTtcclxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBzZXR0aW5ncy5pbnNwZWN0KHNldHRpbmcpO1xyXG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgIT09IHVuZGVmaW5lZCAmJiAoKGNvbmZpZ1RhcmdldCA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5HbG9iYWwgJiYgY3VycmVudFZhbHVlLmdsb2JhbFZhbHVlID09PSB2YWx1ZSkgfHxcclxuICAgICAgICAgICAgKGNvbmZpZ1RhcmdldCA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2UgJiYgY3VycmVudFZhbHVlLndvcmtzcGFjZVZhbHVlID09PSB2YWx1ZSkgfHxcclxuICAgICAgICAgICAgKGNvbmZpZ1RhcmdldCA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2VGb2xkZXIgJiYgY3VycmVudFZhbHVlLndvcmtzcGFjZUZvbGRlclZhbHVlID09PSB2YWx1ZSkpKSB7XHJcbiAgICAgICAgICAgIGNvbmZpZ1NldHRpbmdzXzEuUHl0aG9uU2V0dGluZ3MuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHlpZWxkIHNldHRpbmdzLnVwZGF0ZShzZXR0aW5nLCB2YWx1ZSwgY29uZmlnVGFyZ2V0KTtcclxuICAgICAgICAvLyBXZSd2ZSBleHBlcmllbmNlZCB0cm91YmxlIHdpdGggLnVwZGF0ZSBpbiB0aGUgcGFzdCwgd2hlcmUgVlNDIHJldHVybnMgc3RhbGUgZGF0YSBldmVuXHJcbiAgICAgICAgLy8gYWZ0ZXIgaW52b2tpbmcgdGhlIHVwZGF0ZSBtZXRob2QuIFRoaXMgaXNzdWUgaGFzIHJlZ3Jlc3NlZCBhIGZldyB0aW1lcyBhcyB3ZWxsLiBUaGlzXHJcbiAgICAgICAgLy8gZGVsYXkgaXMgbWVyZWx5IGEgYmFja3VwIHRvIGVuc3VyZSBpdCBleHRlbnNpb24gZG9lc24ndCBicmVhayB0aGUgdGVzdHMgZHVlIHRvIHNpbWlsYXJcclxuICAgICAgICAvLyByZWdyZXNzaW9ucyBpbiBWU0M6XHJcbiAgICAgICAgLy8gYXdhaXQgc2xlZXAoMjAwMCk7XHJcbiAgICAgICAgLy8gLi4uIHBsZWFzZSBzZWUgaXNzdWUgIzIzNTYgYW5kIFBSICMyMzMyIGZvciBhIGRpc2N1c3Npb24gb24gdGhlIG1hdHRlclxyXG4gICAgICAgIGNvbmZpZ1NldHRpbmdzXzEuUHl0aG9uU2V0dGluZ3MuZGlzcG9zZSgpO1xyXG4gICAgfSk7XHJcbn1cclxuZXhwb3J0cy51cGRhdGVTZXR0aW5nID0gdXBkYXRlU2V0dGluZztcclxuLy8gSW4gc29tZSB0ZXN0cyB3ZSB3aWxsIGJlIG1vY2tpbmcgVlMgQ29kZSBBUEkgKG1vY2tlZCBjbGFzc2VzKVxyXG5jb25zdCBnbG9iYWxQeXRob25QYXRoU2V0dGluZyA9IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdweXRob24nKSA/IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdweXRob24nKS5pbnNwZWN0KCdweXRob25QYXRoJykuZ2xvYmFsVmFsdWUgOiAncHl0aG9uJztcclxuZXhwb3J0cy5jbGVhclB5dGhvblBhdGhJbldvcmtzcGFjZUZvbGRlciA9IChyZXNvdXJjZSkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgeyByZXR1cm4gcmV0cnlBc3luYyhzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2UpKHJlc291cmNlLCB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0LldvcmtzcGFjZUZvbGRlcik7IH0pO1xyXG5leHBvcnRzLnNldFB5dGhvblBhdGhJbldvcmtzcGFjZVJvb3QgPSAocHl0aG9uUGF0aCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgeyByZXR1cm4gcmV0cnlBc3luYyhzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2UpKHVuZGVmaW5lZCwgdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2UsIHB5dGhvblBhdGgpOyB9KTtcclxuZXhwb3J0cy5yZXNldEdsb2JhbFB5dGhvblBhdGhTZXR0aW5nID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgeyByZXR1cm4gcmV0cnlBc3luYyhyZXN0b3JlR2xvYmFsUHl0aG9uUGF0aFNldHRpbmcpKCk7IH0pO1xyXG5mdW5jdGlvbiBnZXRXb3Jrc3BhY2VSb290KCkge1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZzY29kZV8xLndvcmtzcGFjZS53b3Jrc3BhY2VGb2xkZXJzKSB8fCB2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gdnNjb2RlXzEuVXJpLmZpbGUocGF0aC5qb2luKGNvbnN0YW50c18xLkVYVEVOU0lPTl9ST09UX0RJUiwgJ3NyYycsICd0ZXN0JykpO1xyXG4gICAgfVxyXG4gICAgaWYgKHZzY29kZV8xLndvcmtzcGFjZS53b3Jrc3BhY2VGb2xkZXJzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgIHJldHVybiB2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmk7XHJcbiAgICB9XHJcbiAgICBjb25zdCB3b3Jrc3BhY2VGb2xkZXIgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0V29ya3NwYWNlRm9sZGVyKHZzY29kZV8xLlVyaS5maWxlKGZpbGVJbk5vblJvb3RXb3Jrc3BhY2UpKTtcclxuICAgIHJldHVybiB3b3Jrc3BhY2VGb2xkZXIgPyB3b3Jrc3BhY2VGb2xkZXIudXJpIDogdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnNbMF0udXJpO1xyXG59XHJcbmZ1bmN0aW9uIHJldHJ5QXN5bmMod3JhcHBlZCwgcmV0cnlDb3VudCA9IDIpIHtcclxuICAgIHJldHVybiAoLi4uYXJncykgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlYXNvbnMgPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgbWFrZUNhbGwgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB3cmFwcGVkLmNhbGwodGhpcywgLi4uYXJncylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihyZXNvbHZlLCAocmVhc29uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhc29ucy5wdXNoKHJlYXNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYXNvbnMubGVuZ3RoID49IHJldHJ5Q291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlYXNvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZmFpbGVkIG9uY2UsIGxldHMgd2FpdCBmb3Igc29tZSB0aW1lIGJlZm9yZSB0cnlpbmcgYWdhaW4uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQobWFrZUNhbGwsIDUwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIG1ha2VDYWxsKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5leHBvcnRzLnJldHJ5QXN5bmMgPSByZXRyeUFzeW5jO1xyXG5mdW5jdGlvbiBzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2UocmVzb3VyY2UsIGNvbmZpZywgcHl0aG9uUGF0aCkge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBpZiAoY29uZmlnID09PSB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0LldvcmtzcGFjZUZvbGRlciAmJiAhaW5pdGlhbGl6ZV8xLklTX01VTFRJX1JPT1RfVEVTVCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJpID0gdHlwZW9mIHJlc291cmNlID09PSAnc3RyaW5nJyA/IHZzY29kZV8xLlVyaS5maWxlKHJlc291cmNlKSA6IHJlc291cmNlO1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicsIHJlc291cmNlVXJpKTtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IHNldHRpbmdzLmluc3BlY3QoJ3B5dGhvblBhdGgnKTtcclxuICAgICAgICBjb25zdCBwcm9wID0gY29uZmlnID09PSB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0LldvcmtzcGFjZSA/ICd3b3Jrc3BhY2VWYWx1ZScgOiAnd29ya3NwYWNlRm9sZGVyVmFsdWUnO1xyXG4gICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZVtwcm9wXSAhPT0gcHl0aG9uUGF0aCkge1xyXG4gICAgICAgICAgICB5aWVsZCBzZXR0aW5ncy51cGRhdGUoJ3B5dGhvblBhdGgnLCBweXRob25QYXRoLCBjb25maWcpO1xyXG4gICAgICAgICAgICBjb25maWdTZXR0aW5nc18xLlB5dGhvblNldHRpbmdzLmRpc3Bvc2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5mdW5jdGlvbiByZXN0b3JlR2xvYmFsUHl0aG9uUGF0aFNldHRpbmcoKSB7XHJcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IHB5dGhvbkNvbmZpZyA9IHZzY29kZV8xLndvcmtzcGFjZS5nZXRDb25maWd1cmF0aW9uKCdweXRob24nLCBudWxsKTtcclxuICAgICAgICBjb25zdCBjdXJyZW50R2xvYmFsUHl0aG9uUGF0aFNldHRpbmcgPSBweXRob25Db25maWcuaW5zcGVjdCgncHl0aG9uUGF0aCcpLmdsb2JhbFZhbHVlO1xyXG4gICAgICAgIGlmIChnbG9iYWxQeXRob25QYXRoU2V0dGluZyAhPT0gY3VycmVudEdsb2JhbFB5dGhvblBhdGhTZXR0aW5nKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHB5dGhvbkNvbmZpZy51cGRhdGUoJ3B5dGhvblBhdGgnLCB1bmRlZmluZWQsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25maWdTZXR0aW5nc18xLlB5dGhvblNldHRpbmdzLmRpc3Bvc2UoKTtcclxuICAgIH0pO1xyXG59XHJcbmZ1bmN0aW9uIGRlbGV0ZURpcmVjdG9yeShkaXIpIHtcclxuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgZXhpc3RzID0geWllbGQgZnMucGF0aEV4aXN0cyhkaXIpO1xyXG4gICAgICAgIGlmIChleGlzdHMpIHtcclxuICAgICAgICAgICAgeWllbGQgZnMucmVtb3ZlKGRpcik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuZXhwb3J0cy5kZWxldGVEaXJlY3RvcnkgPSBkZWxldGVEaXJlY3Rvcnk7XHJcbmZ1bmN0aW9uIGRlbGV0ZUZpbGUoZmlsZSkge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCBleGlzdHMgPSB5aWVsZCBmcy5wYXRoRXhpc3RzKGZpbGUpO1xyXG4gICAgICAgIGlmIChleGlzdHMpIHtcclxuICAgICAgICAgICAgeWllbGQgZnMucmVtb3ZlKGZpbGUpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbmV4cG9ydHMuZGVsZXRlRmlsZSA9IGRlbGV0ZUZpbGU7XHJcbmZ1bmN0aW9uIGRlbGV0ZUZpbGVzKGdsb2JQYXR0ZXJuKSB7XHJcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0geWllbGQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnbG9iKGdsb2JQYXR0ZXJuLCAoZXgsIGZpbGVzKSA9PiBleCA/IHJlamVjdChleCkgOiByZXNvbHZlKGZpbGVzKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGl0ZW1zLm1hcChpdGVtID0+IGZzLnJlbW92ZShpdGVtKS5jYXRjaChtaXNjXzEubm9vcCkpKTtcclxuICAgIH0pO1xyXG59XHJcbmV4cG9ydHMuZGVsZXRlRmlsZXMgPSBkZWxldGVGaWxlcztcclxuZnVuY3Rpb24gZ2V0UHl0aG9uUGF0aCgpIHtcclxuICAgIGlmIChwcm9jZXNzLmVudi5DSV9QWVRIT05fUEFUSCAmJiBmcy5leGlzdHNTeW5jKHByb2Nlc3MuZW52LkNJX1BZVEhPTl9QQVRIKSkge1xyXG4gICAgICAgIHJldHVybiBwcm9jZXNzLmVudi5DSV9QWVRIT05fUEFUSDtcclxuICAgIH1cclxuICAgIHJldHVybiAncHl0aG9uJztcclxufVxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHBsYXRmb3JtIGlzIGluY2x1ZGVkIGluIGEgbGlzdCBvZiBwbGF0Zm9ybXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T1Nlc30gT1NUeXBlW10gTGlzdCBvZiBvcGVyYXRpbmcgc3lzdGVtIElkcyB0byBjaGVjayB3aXRoaW4uXHJcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgY3VycmVudCBPUyBtYXRjaGVzIG9uZSBmcm9tIHRoZSBsaXN0LCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBpc09zKC4uLk9TZXMpIHtcclxuICAgIC8vIGdldCBjdXJyZW50IE9TXHJcbiAgICBjb25zdCBjdXJyZW50T1MgPSBwbGF0Zm9ybV8xLmdldE9TVHlwZSgpO1xyXG4gICAgLy8gY29tcGFyZSBhbmQgcmV0dXJuXHJcbiAgICBpZiAoT1Nlcy5pbmRleE9mKGN1cnJlbnRPUykgPT09IC0xKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuZXhwb3J0cy5pc09zID0gaXNPcztcclxuLyoqXHJcbiAqIEdldCB0aGUgY3VycmVudCBQeXRob24gaW50ZXJwcmV0ZXIgdmVyc2lvbi5cclxuICpcclxuICogQHBhcmFtIHtwcm9jU2VydmljZX0gSVByb2Nlc3NTZXJ2aWNlIE9wdGlvbmFsbHkgc3BlY2lmeSB0aGUgSVByb2Nlc3NTZXJ2aWNlIGltcGxlbWVudGF0aW9uIHRvIHVzZSB0byBleGVjdXRlIHdpdGguXHJcbiAqIEByZXR1cm4gYFNlbVZlcmAgdmVyc2lvbiBvZiB0aGUgUHl0aG9uIGludGVycHJldGVyLCBvciBgdW5kZWZpbmVkYCBpZiBhbiBlcnJvciBvY2N1cnMuXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRQeXRob25TZW1WZXIocHJvY1NlcnZpY2UpIHtcclxuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgcHl0aG9uUHJvY1J1bm5lciA9IHByb2NTZXJ2aWNlID8gcHJvY1NlcnZpY2UgOiBuZXcgcHJvY18xLlByb2Nlc3NTZXJ2aWNlKG5ldyBkZWNvZGVyXzEuQnVmZmVyRGVjb2RlcigpKTtcclxuICAgICAgICBjb25zdCBweVZlckFyZ3MgPSBbJy1jJywgJ2ltcG9ydCBzeXM7cHJpbnQoXCJ7MH0uezF9LnsyfVwiLmZvcm1hdCgqc3lzLnZlcnNpb25faW5mb1s6M10pKSddO1xyXG4gICAgICAgIHJldHVybiBweXRob25Qcm9jUnVubmVyLmV4ZWMoZXhwb3J0cy5QWVRIT05fUEFUSCwgcHlWZXJBcmdzKVxyXG4gICAgICAgICAgICAudGhlbihzdHJWZXJzaW9uID0+IG5ldyBzZW12ZXJfMS5TZW1WZXIoc3RyVmVyc2lvbi5zdGRvdXQudHJpbSgpKSlcclxuICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcclxuICAgICAgICAgICAgLy8gaWYgdGhlIGNhbGwgZmFpbHMgdGhpcyBzaG91bGQgbWFrZSBpdCBsb3VkbHkgYXBwYXJlbnQuXHJcbiAgICAgICAgICAgIGxvZ2dlcl8xLnRyYWNlRXJyb3IoJ2dldFB5dGhvblNlbVZlcicsIGVycik7XHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5leHBvcnRzLmdldFB5dGhvblNlbVZlciA9IGdldFB5dGhvblNlbVZlcjtcclxuLyoqXHJcbiAqIE1hdGNoIGEgZ2l2ZW4gc2VtdmVyIHZlcnNpb24gc3BlY2lmaWNhdGlvbiB3aXRoIGEgbGlzdCBvZiBsb29zZWx5IGRlZmluZWRcclxuICogdmVyc2lvbiBzdHJpbmdzLlxyXG4gKlxyXG4gKiBTcGVjaWZ5IHZlcnNpb25zIGJ5IHRoZWlyIG1ham9yIHZlcnNpb24gYXQgbWluaW11bSAtIHRoZSBtaW5vciBhbmQgcGF0Y2hcclxuICogdmVyc2lvbiBudW1iZXJzIGFyZSBvcHRpb25hbC5cclxuICpcclxuICogJzMnLCAnMy42JywgJzMuNi42JywgYXJlIGFsbCB2YWxkIGFuZCBvbmx5IHRoZSBwb3J0aW9ucyBzcGVjaWZpZWQgd2lsbCBiZSBtYXRjaGVkXHJcbiAqIGFnYWluc3QgdGhlIGN1cnJlbnQgcnVubmluZyBQeXRob24gaW50ZXJwcmV0ZXIgdmVyc2lvbi5cclxuICpcclxuICogRXhhbXBsZSBzY2VuYXJpb3M6XHJcbiAqICczJyB3aWxsIG1hdGNoIHZlcnNpb24gMy41LjYsIDMuNi40LCAzLjYuNiwgYW5kIDMuNy4wLlxyXG4gKiAnMy42JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgYW5kIDMuNi42LlxyXG4gKiAnMy42LjQnIHdpbGwgbWF0Y2ggdmVyc2lvbiAzLjYuNCBvbmx5LlxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlcnNpb259IFNlbVZlciB0aGUgdmVyc2lvbiB0byBsb29rIGZvci5cclxuICogQHBhcmFtIHtzZWFyY2hWZXJzaW9uc30gc3RyaW5nW10gTGlzdCBvZiBsb29zZWx5LXNwZWNpZmllZCB2ZXJzaW9ucyB0byBtYXRjaCBhZ2FpbnN0LlxyXG4gKi9cclxuZnVuY3Rpb24gaXNWZXJzaW9uSW5MaXN0KHZlcnNpb24sIC4uLnNlYXJjaFZlcnNpb25zKSB7XHJcbiAgICAvLyBzZWUgaWYgdGhlIG1ham9yL21pbm9yIHZlcnNpb24gbWF0Y2hlcyBhbnkgbWVtYmVyIG9mIHRoZSBza2lwLWxpc3QuXHJcbiAgICBjb25zdCBpc1ByZXNlbnQgPSBzZWFyY2hWZXJzaW9ucy5maW5kSW5kZXgodmVyID0+IHtcclxuICAgICAgICBjb25zdCBzZW12ZXJDaGVja2VyID0gc2VtdmVyXzEuY29lcmNlKHZlcik7XHJcbiAgICAgICAgaWYgKHNlbXZlckNoZWNrZXIpIHtcclxuICAgICAgICAgICAgaWYgKHNlbXZlckNoZWNrZXIuY29tcGFyZSh2ZXJzaW9uKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb21wYXJlIGFsbCB0aGUgcGFydHMgb2YgdGhlIHZlcnNpb24gdGhhdCB3ZSBoYXZlLCB3ZSBrbm93IHdlIGhhdmVcclxuICAgICAgICAgICAgICAgIC8vIGF0IG1pbmltdW0gdGhlIG1ham9yIHZlcnNpb24gb3Igc2VtdmVyQ2hlY2tlciB3b3VsZCBiZSAnbnVsbCcuLi5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25QYXJ0cyA9IHZlci5zcGxpdCgnLicpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1hdGNoZXMgPSBwYXJzZUludCh2ZXJzaW9uUGFydHNbMF0sIDEwKSA9PT0gdmVyc2lvbi5tYWpvcjtcclxuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzICYmIHZlcnNpb25QYXJ0cy5sZW5ndGggPj0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXMgPSBwYXJzZUludCh2ZXJzaW9uUGFydHNbMV0sIDEwKSA9PT0gdmVyc2lvbi5taW5vcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzICYmIHZlcnNpb25QYXJ0cy5sZW5ndGggPj0gMykge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXMgPSBwYXJzZUludCh2ZXJzaW9uUGFydHNbMl0sIDEwKSA9PT0gdmVyc2lvbi5wYXRjaDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaGVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG4gICAgaWYgKGlzUHJlc2VudCA+PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuZXhwb3J0cy5pc1ZlcnNpb25Jbkxpc3QgPSBpc1ZlcnNpb25Jbkxpc3Q7XHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgdGhlIFB5dGhvbiBpbnRlcnByZXRlciB2ZXJzaW9uIHJ1bm5pbmcgaW4gYSBnaXZlbiBgSVByb2Nlc3NTZXJ2aWNlYFxyXG4gKiBpcyBpbiBhIHNlbGVjdGlvbiBvZiB2ZXJzaW9ucy5cclxuICpcclxuICogWW91IGNhbiBzcGVjaWZ5IHZlcnNpb25zIGJ5IHNwZWNpZnlpbmcgdGhlIG1ham9yIHZlcnNpb24gYXQgbWluaW11bSAtIHRoZSBtaW5vciBhbmRcclxuICogcGF0Y2ggdmVyc2lvbiBudW1iZXJzIGFyZSBvcHRpb25hbC5cclxuICpcclxuICogJzMnLCAnMy42JywgJzMuNi42JywgYXJlIGFsbCB2YWxkIGFuZCBvbmx5IHRoZSBwb3J0aW9ucyBzcGVjaWZpZWQgd2lsbCBiZSBtYXRjaGVkXHJcbiAqIGFnYWluc3QgdGhlIGN1cnJlbnQgcnVubmluZyBQeXRob24gaW50ZXJwcmV0ZXIgdmVyc2lvbi5cclxuICpcclxuICogRXhhbXBsZSBzY2VuYXJpb3M6XHJcbiAqICczJyB3aWxsIG1hdGNoIHZlcnNpb24gMy41LjYsIDMuNi40LCAzLjYuNiwgYW5kIDMuNy4wLlxyXG4gKiAnMy42JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgYW5kIDMuNi42LlxyXG4gKiAnMy42LjQnIHdpbGwgbWF0Y2ggdmVyc2lvbiAzLjYuNCBvbmx5LlxyXG4gKlxyXG4gKiBJZiB5b3UgZG9uJ3QgbmVlZCB0byBzcGVjaWZ5IHRoZSBlbnZpcm9ubWVudCAoaWUuIHRoZSB3b3Jrc3BhY2UpIHRoYXQgdGhlIFB5dGhvblxyXG4gKiBpbnRlcnByZXRlciBpcyBydW5uaW5nIHVuZGVyLCB1c2UgdGhlIHNpbXBsZXIgYGlzUHl0aG9uVmVyc2lvbmAgaW5zdGVhZC5cclxuICpcclxuICogQHBhcmFtIHtwcm9jU2VydmljZX0gSVByb2Nlc3NTZXJ2aWNlIE9wdGlvbmFsbHksIHVzZSB0aGlzIHByb2Nlc3Mgc2VydmljZSB0byBjYWxsIG91dCB0byBweXRob24gd2l0aC5cclxuICogQHBhcmFtIHt2ZXJzaW9uc30gc3RyaW5nW10gUHl0aG9uIHZlcnNpb25zIHRvIHRlc3QgZm9yLCBzcGVjaWZpZWQgYXMgZGVzY3JpYmVkIGFib3ZlLlxyXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIGN1cnJlbnQgUHl0aG9uIHZlcnNpb24gbWF0Y2hlcyBhIHZlcnNpb24gaW4gdGhlIHNraXAgbGlzdCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cclxuZnVuY3Rpb24gaXNQeXRob25WZXJzaW9uSW5Qcm9jZXNzKHByb2NTZXJ2aWNlLCAuLi52ZXJzaW9ucykge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAvLyBnZXQgdGhlIGN1cnJlbnQgcHl0aG9uIHZlcnNpb24gbWFqb3IvbWlub3JcclxuICAgICAgICBjb25zdCBjdXJyZW50UHlWZXJzaW9uID0geWllbGQgZ2V0UHl0aG9uU2VtVmVyKHByb2NTZXJ2aWNlKTtcclxuICAgICAgICBpZiAoY3VycmVudFB5VmVyc2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gaXNWZXJzaW9uSW5MaXN0KGN1cnJlbnRQeVZlcnNpb24sIC4uLnZlcnNpb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGxvZ2dlcl8xLnRyYWNlRXJyb3IoYEZhaWxlZCB0byBkZXRlcm1pbmUgdGhlIGN1cnJlbnQgUHl0aG9uIHZlcnNpb24gd2hlbiBjb21wYXJpbmcgYWdhaW5zdCBsaXN0IFske3ZlcnNpb25zLmpvaW4oJywgJyl9XS5gKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbmV4cG9ydHMuaXNQeXRob25WZXJzaW9uSW5Qcm9jZXNzID0gaXNQeXRob25WZXJzaW9uSW5Qcm9jZXNzO1xyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IGludGVycHJldGVyIHZlcnNpb24gaXMgaW4gYSBnaXZlbiBzZWxlY3Rpb24gb2YgdmVyc2lvbnMuXHJcbiAqXHJcbiAqIFlvdSBjYW4gc3BlY2lmeSB2ZXJzaW9ucyBieSB1c2luZyB1cCB0byB0aGUgZmlyc3QgdGhyZWUgc2VtdmVyIHBhcnRzIG9mIGEgcHl0aG9uXHJcbiAqIHZlcnNpb24uXHJcbiAqXHJcbiAqICczJywgJzMuNicsICczLjYuNicsIGFyZSBhbGwgdmFsZCBhbmQgb25seSB0aGUgcG9ydGlvbnMgc3BlY2lmaWVkIHdpbGwgYmUgbWF0Y2hlZFxyXG4gKiBhZ2FpbnN0IHRoZSBjdXJyZW50IHJ1bm5pbmcgUHl0aG9uIGludGVycHJldGVyIHZlcnNpb24uXHJcbiAqXHJcbiAqIEV4YW1wbGUgc2NlbmFyaW9zOlxyXG4gKiAnMycgd2lsbCBtYXRjaCB2ZXJzaW9uIDMuNS42LCAzLjYuNCwgMy42LjYsIGFuZCAzLjcuMC5cclxuICogJzMuNicgd2lsbCBtYXRjaCB2ZXJzaW9uIDMuNi40IGFuZCAzLjYuNi5cclxuICogJzMuNi40JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgb25seS5cclxuICpcclxuICogSWYgeW91IG5lZWQgdG8gc3BlY2lmeSB0aGUgZW52aXJvbm1lbnQgKGllLiB0aGUgd29ya3NwYWNlKSB0aGF0IHRoZSBQeXRob25cclxuICogaW50ZXJwcmV0ZXIgaXMgcnVubmluZyB1bmRlciwgdXNlIGBpc1B5dGhvblZlcnNpb25JblByb2Nlc3NgIGluc3RlYWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVyc2lvbnN9IHN0cmluZ1tdIExpc3Qgb2YgdmVyc2lvbnMgb2YgcHl0aG9uIHRoYXQgYXJlIHRvIGJlIHNraXBwZWQuXHJcbiAqIEBwYXJhbSB7cmVzb3VyY2V9IHZzY29kZS5VcmkgQ3VycmVudCB3b3Jrc3BhY2UgcmVzb3VyY2UgVXJpIG9yIHVuZGVmaW5lZC5cclxuICogQHJldHVybiB0cnVlIGlmIHRoZSBjdXJyZW50IFB5dGhvbiB2ZXJzaW9uIG1hdGNoZXMgYSB2ZXJzaW9uIGluIHRoZSBza2lwIGxpc3QsIGZhbHNlIG90aGVyd2lzZS5cclxuICovXHJcbmZ1bmN0aW9uIGlzUHl0aG9uVmVyc2lvbiguLi52ZXJzaW9ucykge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBjb25zdCBjdXJyZW50UHlWZXJzaW9uID0geWllbGQgZ2V0UHl0aG9uU2VtVmVyKCk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRQeVZlcnNpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIGlzVmVyc2lvbkluTGlzdChjdXJyZW50UHlWZXJzaW9uLCAuLi52ZXJzaW9ucyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBsb2dnZXJfMS50cmFjZUVycm9yKGBGYWlsZWQgdG8gZGV0ZXJtaW5lIHRoZSBjdXJyZW50IFB5dGhvbiB2ZXJzaW9uIHdoZW4gY29tcGFyaW5nIGFnYWluc3QgbGlzdCBbJHt2ZXJzaW9ucy5qb2luKCcsICcpfV0uYCk7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5leHBvcnRzLmlzUHl0aG9uVmVyc2lvbiA9IGlzUHl0aG9uVmVyc2lvbjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29tbW9uLmpzLm1hcCJdfQ==