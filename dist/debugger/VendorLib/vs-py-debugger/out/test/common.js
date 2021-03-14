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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwiZnMiLCJyZXF1aXJlIiwiZ2xvYiIsInBhdGgiLCJzZW12ZXJfMSIsInZzY29kZV8xIiwiY29uZmlnU2V0dGluZ3NfMSIsImNvbnN0YW50c18xIiwibG9nZ2VyXzEiLCJkZWNvZGVyXzEiLCJwcm9jXzEiLCJtaXNjXzEiLCJwbGF0Zm9ybV8xIiwiaW5pdGlhbGl6ZV8xIiwiY29yZV8xIiwic2xlZXAiLCJmaWxlSW5Ob25Sb290V29ya3NwYWNlIiwiam9pbiIsIkVYVEVOU0lPTl9ST09UX0RJUiIsInJvb3RXb3Jrc3BhY2VVcmkiLCJnZXRXb3Jrc3BhY2VSb290IiwiUFlUSE9OX1BBVEgiLCJnZXRQeXRob25QYXRoIiwidXBkYXRlU2V0dGluZyIsInNldHRpbmciLCJyZXNvdXJjZSIsImNvbmZpZ1RhcmdldCIsInNldHRpbmdzIiwid29ya3NwYWNlIiwiZ2V0Q29uZmlndXJhdGlvbiIsImN1cnJlbnRWYWx1ZSIsImluc3BlY3QiLCJ1bmRlZmluZWQiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiR2xvYmFsIiwiZ2xvYmFsVmFsdWUiLCJXb3Jrc3BhY2UiLCJ3b3Jrc3BhY2VWYWx1ZSIsIldvcmtzcGFjZUZvbGRlciIsIndvcmtzcGFjZUZvbGRlclZhbHVlIiwiUHl0aG9uU2V0dGluZ3MiLCJkaXNwb3NlIiwidXBkYXRlIiwiZ2xvYmFsUHl0aG9uUGF0aFNldHRpbmciLCJjbGVhclB5dGhvblBhdGhJbldvcmtzcGFjZUZvbGRlciIsInJldHJ5QXN5bmMiLCJzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2UiLCJzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2VSb290IiwicHl0aG9uUGF0aCIsInJlc2V0R2xvYmFsUHl0aG9uUGF0aFNldHRpbmciLCJyZXN0b3JlR2xvYmFsUHl0aG9uUGF0aFNldHRpbmciLCJBcnJheSIsImlzQXJyYXkiLCJ3b3Jrc3BhY2VGb2xkZXJzIiwibGVuZ3RoIiwiVXJpIiwiZmlsZSIsInVyaSIsIndvcmtzcGFjZUZvbGRlciIsImdldFdvcmtzcGFjZUZvbGRlciIsIndyYXBwZWQiLCJyZXRyeUNvdW50IiwiYXJncyIsInJlYXNvbnMiLCJtYWtlQ2FsbCIsImNhbGwiLCJyZWFzb24iLCJwdXNoIiwic2V0VGltZW91dCIsImNvbmZpZyIsIklTX01VTFRJX1JPT1RfVEVTVCIsInJlc291cmNlVXJpIiwicHJvcCIsInB5dGhvbkNvbmZpZyIsImN1cnJlbnRHbG9iYWxQeXRob25QYXRoU2V0dGluZyIsImRlbGV0ZURpcmVjdG9yeSIsImRpciIsImV4aXN0cyIsInBhdGhFeGlzdHMiLCJyZW1vdmUiLCJkZWxldGVGaWxlIiwiZGVsZXRlRmlsZXMiLCJnbG9iUGF0dGVybiIsIml0ZW1zIiwiZXgiLCJmaWxlcyIsImFsbCIsIm1hcCIsIml0ZW0iLCJjYXRjaCIsIm5vb3AiLCJwcm9jZXNzIiwiZW52IiwiQ0lfUFlUSE9OX1BBVEgiLCJleGlzdHNTeW5jIiwiaXNPcyIsIk9TZXMiLCJjdXJyZW50T1MiLCJnZXRPU1R5cGUiLCJpbmRleE9mIiwiZ2V0UHl0aG9uU2VtVmVyIiwicHJvY1NlcnZpY2UiLCJweXRob25Qcm9jUnVubmVyIiwiUHJvY2Vzc1NlcnZpY2UiLCJCdWZmZXJEZWNvZGVyIiwicHlWZXJBcmdzIiwiZXhlYyIsInN0clZlcnNpb24iLCJTZW1WZXIiLCJzdGRvdXQiLCJ0cmltIiwiZXJyIiwidHJhY2VFcnJvciIsImlzVmVyc2lvbkluTGlzdCIsInZlcnNpb24iLCJzZWFyY2hWZXJzaW9ucyIsImlzUHJlc2VudCIsImZpbmRJbmRleCIsInZlciIsInNlbXZlckNoZWNrZXIiLCJjb2VyY2UiLCJjb21wYXJlIiwidmVyc2lvblBhcnRzIiwic3BsaXQiLCJtYXRjaGVzIiwicGFyc2VJbnQiLCJtYWpvciIsIm1pbm9yIiwicGF0Y2giLCJpc1B5dGhvblZlcnNpb25JblByb2Nlc3MiLCJ2ZXJzaW9ucyIsImN1cnJlbnRQeVZlcnNpb24iLCJpc1B5dGhvblZlcnNpb24iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5CLEVBQStCQyxDQUEvQixFQUFrQ0MsU0FBbEMsRUFBNkM7QUFDckYsU0FBTyxLQUFLRCxDQUFDLEtBQUtBLENBQUMsR0FBR0UsT0FBVCxDQUFOLEVBQXlCLFVBQVVDLE9BQVYsRUFBbUJDLE1BQW5CLEVBQTJCO0FBQ3ZELGFBQVNDLFNBQVQsQ0FBbUJDLEtBQW5CLEVBQTBCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQ08sSUFBVixDQUFlRixLQUFmLENBQUQsQ0FBSjtBQUE4QixPQUFwQyxDQUFxQyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUMzRixhQUFTQyxRQUFULENBQWtCSixLQUFsQixFQUF5QjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUMsT0FBRCxDQUFULENBQW1CSyxLQUFuQixDQUFELENBQUo7QUFBa0MsT0FBeEMsQ0FBeUMsT0FBT0csQ0FBUCxFQUFVO0FBQUVMLFFBQUFBLE1BQU0sQ0FBQ0ssQ0FBRCxDQUFOO0FBQVk7QUFBRTs7QUFDOUYsYUFBU0YsSUFBVCxDQUFjSSxNQUFkLEVBQXNCO0FBQUVBLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjVCxPQUFPLENBQUNRLE1BQU0sQ0FBQ0wsS0FBUixDQUFyQixHQUFzQyxJQUFJTixDQUFKLENBQU0sVUFBVUcsT0FBVixFQUFtQjtB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QUFlLENBQUNDLFdBQUQsQ0FBOUM7O0FBQ0EsUUFBSThCLGdCQUFKLEVBQXNCO0FBQ2xCLGFBQU9sQixlQUFlLENBQUNrQixnQkFBRCxFQUFtQixHQUFHRCxRQUF0QixDQUF0QjtBQUNILEtBRkQsTUFHSztBQUNEMUgsTUFBQUEsUUFBUSxDQUFDd0csVUFBVCxDQUFxQiwrRUFBOEVrQixRQUFRLENBQUNqSCxJQUFULENBQWMsSUFBZCxDQUFvQixJQUF2SDtBQUNBLGFBQU8sS0FBUDtBQUNIO0FBQ0osR0FWZSxDQUFoQjtBQVdIOztBQUNEbEIsT0FBTyxDQUFDa0ksd0JBQVIsR0FBbUNBLHdCQUFuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxTQUFTRyxlQUFULENBQXlCLEdBQUdGLFFBQTVCLEVBQXNDO0FBQ2xDLFNBQU92SixTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxVQUFNd0osZ0JBQWdCLEdBQUcsTUFBTS9CLGVBQWUsRUFBOUM7O0FBQ0EsUUFBSStCLGdCQUFKLEVBQXNCO0FBQ2xCLGFBQU9sQixlQUFlLENBQUNrQixnQkFBRCxFQUFtQixHQUFHRCxRQUF0QixDQUF0QjtBQUNILEtBRkQsTUFHSztBQUNEMUgsTUFBQUEsUUFBUSxDQUFDd0csVUFBVCxDQUFxQiwrRUFBOEVrQixRQUFRLENBQUNqSCxJQUFULENBQWMsSUFBZCxDQUFvQixJQUF2SDtBQUNBLGFBQU8sS0FBUDtBQUNIO0FBQ0osR0FUZSxDQUFoQjtBQVVIOztBQUNEbEIsT0FBTyxDQUFDcUksZUFBUixHQUEwQkEsZUFBMUIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbid1c2Ugc3RyaWN0JztcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XG5jb25zdCBnbG9iID0gcmVxdWlyZShcImdsb2JcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBzZW12ZXJfMSA9IHJlcXVpcmUoXCJzZW12ZXJcIik7XG5jb25zdCB2c2NvZGVfMSA9IHJlcXVpcmUoXCJ2c2NvZGVcIik7XG5jb25zdCBjb25maWdTZXR0aW5nc18xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vY29uZmlnU2V0dGluZ3NcIik7XG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuLi9jbGllbnQvY29tbW9uL2NvbnN0YW50c1wiKTtcbmNvbnN0IGxvZ2dlcl8xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vbG9nZ2VyXCIpO1xuY29uc3QgZGVjb2Rlcl8xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vcHJvY2Vzcy9kZWNvZGVyXCIpO1xuY29uc3QgcHJvY18xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vcHJvY2Vzcy9wcm9jXCIpO1xuY29uc3QgbWlzY18xID0gcmVxdWlyZShcIi4uL2NsaWVudC9jb21tb24vdXRpbHMvbWlzY1wiKTtcbmNvbnN0IHBsYXRmb3JtXzEgPSByZXF1aXJlKFwiLi4vY2xpZW50L2NvbW1vbi91dGlscy9wbGF0Zm9ybVwiKTtcbmNvbnN0IGluaXRpYWxpemVfMSA9IHJlcXVpcmUoXCIuL2luaXRpYWxpemVcIik7XG52YXIgY29yZV8xID0gcmVxdWlyZShcIi4vY29yZVwiKTtcbmV4cG9ydHMuc2xlZXAgPSBjb3JlXzEuc2xlZXA7XG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1pbnZhbGlkLXRoaXMgbm8tYW55XG5jb25zdCBmaWxlSW5Ob25Sb290V29ya3NwYWNlID0gcGF0aC5qb2luKGNvbnN0YW50c18xLkVYVEVOU0lPTl9ST09UX0RJUiwgJ3NyYycsICd0ZXN0JywgJ3B5dGhvbkZpbGVzJywgJ2R1bW15LnB5Jyk7XG5leHBvcnRzLnJvb3RXb3Jrc3BhY2VVcmkgPSBnZXRXb3Jrc3BhY2VSb290KCk7XG5leHBvcnRzLlBZVEhPTl9QQVRIID0gZ2V0UHl0aG9uUGF0aCgpO1xuZnVuY3Rpb24gdXBkYXRlU2V0dGluZyhzZXR0aW5nLCB2YWx1ZSwgcmVzb3VyY2UsIGNvbmZpZ1RhcmdldCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicsIHJlc291cmNlKTtcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gc2V0dGluZ3MuaW5zcGVjdChzZXR0aW5nKTtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmICgoY29uZmlnVGFyZ2V0ID09PSB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0Lkdsb2JhbCAmJiBjdXJyZW50VmFsdWUuZ2xvYmFsVmFsdWUgPT09IHZhbHVlKSB8fFxuICAgICAgICAgICAgKGNvbmZpZ1RhcmdldCA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2UgJiYgY3VycmVudFZhbHVlLndvcmtzcGFjZVZhbHVlID09PSB2YWx1ZSkgfHxcbiAgICAgICAgICAgIChjb25maWdUYXJnZXQgPT09IHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlRm9sZGVyICYmIGN1cnJlbnRWYWx1ZS53b3Jrc3BhY2VGb2xkZXJWYWx1ZSA9PT0gdmFsdWUpKSkge1xuICAgICAgICAgICAgY29uZmlnU2V0dGluZ3NfMS5QeXRob25TZXR0aW5ncy5kaXNwb3NlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgeWllbGQgc2V0dGluZ3MudXBkYXRlKHNldHRpbmcsIHZhbHVlLCBjb25maWdUYXJnZXQpO1xuICAgICAgICAvLyBXZSd2ZSBleHBlcmllbmNlZCB0cm91YmxlIHdpdGggLnVwZGF0ZSBpbiB0aGUgcGFzdCwgd2hlcmUgVlNDIHJldHVybnMgc3RhbGUgZGF0YSBldmVuXG4gICAgICAgIC8vIGFmdGVyIGludm9raW5nIHRoZSB1cGRhdGUgbWV0aG9kLiBUaGlzIGlzc3VlIGhhcyByZWdyZXNzZWQgYSBmZXcgdGltZXMgYXMgd2VsbC4gVGhpc1xuICAgICAgICAvLyBkZWxheSBpcyBtZXJlbHkgYSBiYWNrdXAgdG8gZW5zdXJlIGl0IGV4dGVuc2lvbiBkb2Vzbid0IGJyZWFrIHRoZSB0ZXN0cyBkdWUgdG8gc2ltaWxhclxuICAgICAgICAvLyByZWdyZXNzaW9ucyBpbiBWU0M6XG4gICAgICAgIC8vIGF3YWl0IHNsZWVwKDIwMDApO1xuICAgICAgICAvLyAuLi4gcGxlYXNlIHNlZSBpc3N1ZSAjMjM1NiBhbmQgUFIgIzIzMzIgZm9yIGEgZGlzY3Vzc2lvbiBvbiB0aGUgbWF0dGVyXG4gICAgICAgIGNvbmZpZ1NldHRpbmdzXzEuUHl0aG9uU2V0dGluZ3MuZGlzcG9zZSgpO1xuICAgIH0pO1xufVxuZXhwb3J0cy51cGRhdGVTZXR0aW5nID0gdXBkYXRlU2V0dGluZztcbi8vIEluIHNvbWUgdGVzdHMgd2Ugd2lsbCBiZSBtb2NraW5nIFZTIENvZGUgQVBJIChtb2NrZWQgY2xhc3NlcylcbmNvbnN0IGdsb2JhbFB5dGhvblBhdGhTZXR0aW5nID0gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicpID8gdnNjb2RlXzEud29ya3NwYWNlLmdldENvbmZpZ3VyYXRpb24oJ3B5dGhvbicpLmluc3BlY3QoJ3B5dGhvblBhdGgnKS5nbG9iYWxWYWx1ZSA6ICdweXRob24nO1xuZXhwb3J0cy5jbGVhclB5dGhvblBhdGhJbldvcmtzcGFjZUZvbGRlciA9IChyZXNvdXJjZSkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgeyByZXR1cm4gcmV0cnlBc3luYyhzZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2UpKHJlc291cmNlLCB2c2NvZGVfMS5Db25maWd1cmF0aW9uVGFyZ2V0LldvcmtzcGFjZUZvbGRlcik7IH0pO1xuZXhwb3J0cy5zZXRQeXRob25QYXRoSW5Xb3Jrc3BhY2VSb290ID0gKHB5dGhvblBhdGgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHsgcmV0dXJuIHJldHJ5QXN5bmMoc2V0UHl0aG9uUGF0aEluV29ya3NwYWNlKSh1bmRlZmluZWQsIHZzY29kZV8xLkNvbmZpZ3VyYXRpb25UYXJnZXQuV29ya3NwYWNlLCBweXRob25QYXRoKTsgfSk7XG5leHBvcnRzLnJlc2V0R2xvYmFsUHl0aG9uUGF0aFNldHRpbmcgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7IHJldHVybiByZXRyeUFzeW5jKHJlc3RvcmVHbG9iYWxQeXRob25QYXRoU2V0dGluZykoKTsgfSk7XG5mdW5jdGlvbiBnZXRXb3Jrc3BhY2VSb290KCkge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycykgfHwgdnNjb2RlXzEud29ya3NwYWNlLndvcmtzcGFjZUZvbGRlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB2c2NvZGVfMS5VcmkuZmlsZShwYXRoLmpvaW4oY29uc3RhbnRzXzEuRVhURU5TSU9OX1JPT1RfRElSLCAnc3JjJywgJ3Rlc3QnKSk7XG4gICAgfVxuICAgIGlmICh2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVycy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHZzY29kZV8xLndvcmtzcGFjZS53b3Jrc3BhY2VGb2xkZXJzWzBdLnVyaTtcbiAgICB9XG4gICAgY29uc3Qgd29ya3NwYWNlRm9sZGVyID0gdnNjb2RlXzEud29ya3NwYWNlLmdldFdvcmtzcGFjZUZvbGRlcih2c2NvZGVfMS5VcmkuZmlsZShmaWxlSW5Ob25Sb290V29ya3NwYWNlKSk7XG4gICAgcmV0dXJuIHdvcmtzcGFjZUZvbGRlciA/IHdvcmtzcGFjZUZvbGRlci51cmkgOiB2c2NvZGVfMS53b3Jrc3BhY2Uud29ya3NwYWNlRm9sZGVyc1swXS51cmk7XG59XG5mdW5jdGlvbiByZXRyeUFzeW5jKHdyYXBwZWQsIHJldHJ5Q291bnQgPSAyKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWFzb25zID0gW107XG4gICAgICAgICAgICBjb25zdCBtYWtlQ2FsbCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB3cmFwcGVkLmNhbGwodGhpcywgLi4uYXJncylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgKHJlYXNvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWFzb25zLnB1c2gocmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYXNvbnMubGVuZ3RoID49IHJldHJ5Q291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZWFzb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGZhaWxlZCBvbmNlLCBsZXRzIHdhaXQgZm9yIHNvbWUgdGltZSBiZWZvcmUgdHJ5aW5nIGFnYWluLlxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChtYWtlQ2FsbCwgNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG1ha2VDYWxsKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuZXhwb3J0cy5yZXRyeUFzeW5jID0gcmV0cnlBc3luYztcbmZ1bmN0aW9uIHNldFB5dGhvblBhdGhJbldvcmtzcGFjZShyZXNvdXJjZSwgY29uZmlnLCBweXRob25QYXRoKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgaWYgKGNvbmZpZyA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2VGb2xkZXIgJiYgIWluaXRpYWxpemVfMS5JU19NVUxUSV9ST09UX1RFU1QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXNvdXJjZVVyaSA9IHR5cGVvZiByZXNvdXJjZSA9PT0gJ3N0cmluZycgPyB2c2NvZGVfMS5VcmkuZmlsZShyZXNvdXJjZSkgOiByZXNvdXJjZTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbigncHl0aG9uJywgcmVzb3VyY2VVcmkpO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHNldHRpbmdzLmluc3BlY3QoJ3B5dGhvblBhdGgnKTtcbiAgICAgICAgY29uc3QgcHJvcCA9IGNvbmZpZyA9PT0gdnNjb2RlXzEuQ29uZmlndXJhdGlvblRhcmdldC5Xb3Jrc3BhY2UgPyAnd29ya3NwYWNlVmFsdWUnIDogJ3dvcmtzcGFjZUZvbGRlclZhbHVlJztcbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlW3Byb3BdICE9PSBweXRob25QYXRoKSB7XG4gICAgICAgICAgICB5aWVsZCBzZXR0aW5ncy51cGRhdGUoJ3B5dGhvblBhdGgnLCBweXRob25QYXRoLCBjb25maWcpO1xuICAgICAgICAgICAgY29uZmlnU2V0dGluZ3NfMS5QeXRob25TZXR0aW5ncy5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbmZ1bmN0aW9uIHJlc3RvcmVHbG9iYWxQeXRob25QYXRoU2V0dGluZygpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBjb25zdCBweXRob25Db25maWcgPSB2c2NvZGVfMS53b3Jrc3BhY2UuZ2V0Q29uZmlndXJhdGlvbigncHl0aG9uJywgbnVsbCk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRHbG9iYWxQeXRob25QYXRoU2V0dGluZyA9IHB5dGhvbkNvbmZpZy5pbnNwZWN0KCdweXRob25QYXRoJykuZ2xvYmFsVmFsdWU7XG4gICAgICAgIGlmIChnbG9iYWxQeXRob25QYXRoU2V0dGluZyAhPT0gY3VycmVudEdsb2JhbFB5dGhvblBhdGhTZXR0aW5nKSB7XG4gICAgICAgICAgICB5aWVsZCBweXRob25Db25maWcudXBkYXRlKCdweXRob25QYXRoJywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBjb25maWdTZXR0aW5nc18xLlB5dGhvblNldHRpbmdzLmRpc3Bvc2UoKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGRlbGV0ZURpcmVjdG9yeShkaXIpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBjb25zdCBleGlzdHMgPSB5aWVsZCBmcy5wYXRoRXhpc3RzKGRpcik7XG4gICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgIHlpZWxkIGZzLnJlbW92ZShkaXIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnRzLmRlbGV0ZURpcmVjdG9yeSA9IGRlbGV0ZURpcmVjdG9yeTtcbmZ1bmN0aW9uIGRlbGV0ZUZpbGUoZmlsZSkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0cyA9IHlpZWxkIGZzLnBhdGhFeGlzdHMoZmlsZSk7XG4gICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgIHlpZWxkIGZzLnJlbW92ZShmaWxlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy5kZWxldGVGaWxlID0gZGVsZXRlRmlsZTtcbmZ1bmN0aW9uIGRlbGV0ZUZpbGVzKGdsb2JQYXR0ZXJuKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSB5aWVsZCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBnbG9iKGdsb2JQYXR0ZXJuLCAoZXgsIGZpbGVzKSA9PiBleCA/IHJlamVjdChleCkgOiByZXNvbHZlKGZpbGVzKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoaXRlbXMubWFwKGl0ZW0gPT4gZnMucmVtb3ZlKGl0ZW0pLmNhdGNoKG1pc2NfMS5ub29wKSkpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5kZWxldGVGaWxlcyA9IGRlbGV0ZUZpbGVzO1xuZnVuY3Rpb24gZ2V0UHl0aG9uUGF0aCgpIHtcbiAgICBpZiAocHJvY2Vzcy5lbnYuQ0lfUFlUSE9OX1BBVEggJiYgZnMuZXhpc3RzU3luYyhwcm9jZXNzLmVudi5DSV9QWVRIT05fUEFUSCkpIHtcbiAgICAgICAgcmV0dXJuIHByb2Nlc3MuZW52LkNJX1BZVEhPTl9QQVRIO1xuICAgIH1cbiAgICByZXR1cm4gJ3B5dGhvbic7XG59XG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgY3VycmVudCBwbGF0Zm9ybSBpcyBpbmNsdWRlZCBpbiBhIGxpc3Qgb2YgcGxhdGZvcm1zLlxuICpcbiAqIEBwYXJhbSB7T1Nlc30gT1NUeXBlW10gTGlzdCBvZiBvcGVyYXRpbmcgc3lzdGVtIElkcyB0byBjaGVjayB3aXRoaW4uXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIGN1cnJlbnQgT1MgbWF0Y2hlcyBvbmUgZnJvbSB0aGUgbGlzdCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBpc09zKC4uLk9TZXMpIHtcbiAgICAvLyBnZXQgY3VycmVudCBPU1xuICAgIGNvbnN0IGN1cnJlbnRPUyA9IHBsYXRmb3JtXzEuZ2V0T1NUeXBlKCk7XG4gICAgLy8gY29tcGFyZSBhbmQgcmV0dXJuXG4gICAgaWYgKE9TZXMuaW5kZXhPZihjdXJyZW50T1MpID09PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuZXhwb3J0cy5pc09zID0gaXNPcztcbi8qKlxuICogR2V0IHRoZSBjdXJyZW50IFB5dGhvbiBpbnRlcnByZXRlciB2ZXJzaW9uLlxuICpcbiAqIEBwYXJhbSB7cHJvY1NlcnZpY2V9IElQcm9jZXNzU2VydmljZSBPcHRpb25hbGx5IHNwZWNpZnkgdGhlIElQcm9jZXNzU2VydmljZSBpbXBsZW1lbnRhdGlvbiB0byB1c2UgdG8gZXhlY3V0ZSB3aXRoLlxuICogQHJldHVybiBgU2VtVmVyYCB2ZXJzaW9uIG9mIHRoZSBQeXRob24gaW50ZXJwcmV0ZXIsIG9yIGB1bmRlZmluZWRgIGlmIGFuIGVycm9yIG9jY3Vycy5cbiAqL1xuZnVuY3Rpb24gZ2V0UHl0aG9uU2VtVmVyKHByb2NTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgY29uc3QgcHl0aG9uUHJvY1J1bm5lciA9IHByb2NTZXJ2aWNlID8gcHJvY1NlcnZpY2UgOiBuZXcgcHJvY18xLlByb2Nlc3NTZXJ2aWNlKG5ldyBkZWNvZGVyXzEuQnVmZmVyRGVjb2RlcigpKTtcbiAgICAgICAgY29uc3QgcHlWZXJBcmdzID0gWyctYycsICdpbXBvcnQgc3lzO3ByaW50KFwiezB9LnsxfS57Mn1cIi5mb3JtYXQoKnN5cy52ZXJzaW9uX2luZm9bOjNdKSknXTtcbiAgICAgICAgcmV0dXJuIHB5dGhvblByb2NSdW5uZXIuZXhlYyhleHBvcnRzLlBZVEhPTl9QQVRILCBweVZlckFyZ3MpXG4gICAgICAgICAgICAudGhlbihzdHJWZXJzaW9uID0+IG5ldyBzZW12ZXJfMS5TZW1WZXIoc3RyVmVyc2lvbi5zdGRvdXQudHJpbSgpKSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAvLyBpZiB0aGUgY2FsbCBmYWlscyB0aGlzIHNob3VsZCBtYWtlIGl0IGxvdWRseSBhcHBhcmVudC5cbiAgICAgICAgICAgIGxvZ2dlcl8xLnRyYWNlRXJyb3IoJ2dldFB5dGhvblNlbVZlcicsIGVycik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZ2V0UHl0aG9uU2VtVmVyID0gZ2V0UHl0aG9uU2VtVmVyO1xuLyoqXG4gKiBNYXRjaCBhIGdpdmVuIHNlbXZlciB2ZXJzaW9uIHNwZWNpZmljYXRpb24gd2l0aCBhIGxpc3Qgb2YgbG9vc2VseSBkZWZpbmVkXG4gKiB2ZXJzaW9uIHN0cmluZ3MuXG4gKlxuICogU3BlY2lmeSB2ZXJzaW9ucyBieSB0aGVpciBtYWpvciB2ZXJzaW9uIGF0IG1pbmltdW0gLSB0aGUgbWlub3IgYW5kIHBhdGNoXG4gKiB2ZXJzaW9uIG51bWJlcnMgYXJlIG9wdGlvbmFsLlxuICpcbiAqICczJywgJzMuNicsICczLjYuNicsIGFyZSBhbGwgdmFsZCBhbmQgb25seSB0aGUgcG9ydGlvbnMgc3BlY2lmaWVkIHdpbGwgYmUgbWF0Y2hlZFxuICogYWdhaW5zdCB0aGUgY3VycmVudCBydW5uaW5nIFB5dGhvbiBpbnRlcnByZXRlciB2ZXJzaW9uLlxuICpcbiAqIEV4YW1wbGUgc2NlbmFyaW9zOlxuICogJzMnIHdpbGwgbWF0Y2ggdmVyc2lvbiAzLjUuNiwgMy42LjQsIDMuNi42LCBhbmQgMy43LjAuXG4gKiAnMy42JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgYW5kIDMuNi42LlxuICogJzMuNi40JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgb25seS5cbiAqXG4gKiBAcGFyYW0ge3ZlcnNpb259IFNlbVZlciB0aGUgdmVyc2lvbiB0byBsb29rIGZvci5cbiAqIEBwYXJhbSB7c2VhcmNoVmVyc2lvbnN9IHN0cmluZ1tdIExpc3Qgb2YgbG9vc2VseS1zcGVjaWZpZWQgdmVyc2lvbnMgdG8gbWF0Y2ggYWdhaW5zdC5cbiAqL1xuZnVuY3Rpb24gaXNWZXJzaW9uSW5MaXN0KHZlcnNpb24sIC4uLnNlYXJjaFZlcnNpb25zKSB7XG4gICAgLy8gc2VlIGlmIHRoZSBtYWpvci9taW5vciB2ZXJzaW9uIG1hdGNoZXMgYW55IG1lbWJlciBvZiB0aGUgc2tpcC1saXN0LlxuICAgIGNvbnN0IGlzUHJlc2VudCA9IHNlYXJjaFZlcnNpb25zLmZpbmRJbmRleCh2ZXIgPT4ge1xuICAgICAgICBjb25zdCBzZW12ZXJDaGVja2VyID0gc2VtdmVyXzEuY29lcmNlKHZlcik7XG4gICAgICAgIGlmIChzZW12ZXJDaGVja2VyKSB7XG4gICAgICAgICAgICBpZiAoc2VtdmVyQ2hlY2tlci5jb21wYXJlKHZlcnNpb24pID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjb21wYXJlIGFsbCB0aGUgcGFydHMgb2YgdGhlIHZlcnNpb24gdGhhdCB3ZSBoYXZlLCB3ZSBrbm93IHdlIGhhdmVcbiAgICAgICAgICAgICAgICAvLyBhdCBtaW5pbXVtIHRoZSBtYWpvciB2ZXJzaW9uIG9yIHNlbXZlckNoZWNrZXIgd291bGQgYmUgJ251bGwnLi4uXG4gICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvblBhcnRzID0gdmVyLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbGV0IG1hdGNoZXMgPSBwYXJzZUludCh2ZXJzaW9uUGFydHNbMF0sIDEwKSA9PT0gdmVyc2lvbi5tYWpvcjtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAmJiB2ZXJzaW9uUGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcyA9IHBhcnNlSW50KHZlcnNpb25QYXJ0c1sxXSwgMTApID09PSB2ZXJzaW9uLm1pbm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAmJiB2ZXJzaW9uUGFydHMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcyA9IHBhcnNlSW50KHZlcnNpb25QYXJ0c1syXSwgMTApID09PSB2ZXJzaW9uLnBhdGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKGlzUHJlc2VudCA+PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnRzLmlzVmVyc2lvbkluTGlzdCA9IGlzVmVyc2lvbkluTGlzdDtcbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBQeXRob24gaW50ZXJwcmV0ZXIgdmVyc2lvbiBydW5uaW5nIGluIGEgZ2l2ZW4gYElQcm9jZXNzU2VydmljZWBcbiAqIGlzIGluIGEgc2VsZWN0aW9uIG9mIHZlcnNpb25zLlxuICpcbiAqIFlvdSBjYW4gc3BlY2lmeSB2ZXJzaW9ucyBieSBzcGVjaWZ5aW5nIHRoZSBtYWpvciB2ZXJzaW9uIGF0IG1pbmltdW0gLSB0aGUgbWlub3IgYW5kXG4gKiBwYXRjaCB2ZXJzaW9uIG51bWJlcnMgYXJlIG9wdGlvbmFsLlxuICpcbiAqICczJywgJzMuNicsICczLjYuNicsIGFyZSBhbGwgdmFsZCBhbmQgb25seSB0aGUgcG9ydGlvbnMgc3BlY2lmaWVkIHdpbGwgYmUgbWF0Y2hlZFxuICogYWdhaW5zdCB0aGUgY3VycmVudCBydW5uaW5nIFB5dGhvbiBpbnRlcnByZXRlciB2ZXJzaW9uLlxuICpcbiAqIEV4YW1wbGUgc2NlbmFyaW9zOlxuICogJzMnIHdpbGwgbWF0Y2ggdmVyc2lvbiAzLjUuNiwgMy42LjQsIDMuNi42LCBhbmQgMy43LjAuXG4gKiAnMy42JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgYW5kIDMuNi42LlxuICogJzMuNi40JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgb25seS5cbiAqXG4gKiBJZiB5b3UgZG9uJ3QgbmVlZCB0byBzcGVjaWZ5IHRoZSBlbnZpcm9ubWVudCAoaWUuIHRoZSB3b3Jrc3BhY2UpIHRoYXQgdGhlIFB5dGhvblxuICogaW50ZXJwcmV0ZXIgaXMgcnVubmluZyB1bmRlciwgdXNlIHRoZSBzaW1wbGVyIGBpc1B5dGhvblZlcnNpb25gIGluc3RlYWQuXG4gKlxuICogQHBhcmFtIHtwcm9jU2VydmljZX0gSVByb2Nlc3NTZXJ2aWNlIE9wdGlvbmFsbHksIHVzZSB0aGlzIHByb2Nlc3Mgc2VydmljZSB0byBjYWxsIG91dCB0byBweXRob24gd2l0aC5cbiAqIEBwYXJhbSB7dmVyc2lvbnN9IHN0cmluZ1tdIFB5dGhvbiB2ZXJzaW9ucyB0byB0ZXN0IGZvciwgc3BlY2lmaWVkIGFzIGRlc2NyaWJlZCBhYm92ZS5cbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgY3VycmVudCBQeXRob24gdmVyc2lvbiBtYXRjaGVzIGEgdmVyc2lvbiBpbiB0aGUgc2tpcCBsaXN0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGlzUHl0aG9uVmVyc2lvbkluUHJvY2Vzcyhwcm9jU2VydmljZSwgLi4udmVyc2lvbnMpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAvLyBnZXQgdGhlIGN1cnJlbnQgcHl0aG9uIHZlcnNpb24gbWFqb3IvbWlub3JcbiAgICAgICAgY29uc3QgY3VycmVudFB5VmVyc2lvbiA9IHlpZWxkIGdldFB5dGhvblNlbVZlcihwcm9jU2VydmljZSk7XG4gICAgICAgIGlmIChjdXJyZW50UHlWZXJzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNWZXJzaW9uSW5MaXN0KGN1cnJlbnRQeVZlcnNpb24sIC4uLnZlcnNpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlcl8xLnRyYWNlRXJyb3IoYEZhaWxlZCB0byBkZXRlcm1pbmUgdGhlIGN1cnJlbnQgUHl0aG9uIHZlcnNpb24gd2hlbiBjb21wYXJpbmcgYWdhaW5zdCBsaXN0IFske3ZlcnNpb25zLmpvaW4oJywgJyl9XS5gKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy5pc1B5dGhvblZlcnNpb25JblByb2Nlc3MgPSBpc1B5dGhvblZlcnNpb25JblByb2Nlc3M7XG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgY3VycmVudCBpbnRlcnByZXRlciB2ZXJzaW9uIGlzIGluIGEgZ2l2ZW4gc2VsZWN0aW9uIG9mIHZlcnNpb25zLlxuICpcbiAqIFlvdSBjYW4gc3BlY2lmeSB2ZXJzaW9ucyBieSB1c2luZyB1cCB0byB0aGUgZmlyc3QgdGhyZWUgc2VtdmVyIHBhcnRzIG9mIGEgcHl0aG9uXG4gKiB2ZXJzaW9uLlxuICpcbiAqICczJywgJzMuNicsICczLjYuNicsIGFyZSBhbGwgdmFsZCBhbmQgb25seSB0aGUgcG9ydGlvbnMgc3BlY2lmaWVkIHdpbGwgYmUgbWF0Y2hlZFxuICogYWdhaW5zdCB0aGUgY3VycmVudCBydW5uaW5nIFB5dGhvbiBpbnRlcnByZXRlciB2ZXJzaW9uLlxuICpcbiAqIEV4YW1wbGUgc2NlbmFyaW9zOlxuICogJzMnIHdpbGwgbWF0Y2ggdmVyc2lvbiAzLjUuNiwgMy42LjQsIDMuNi42LCBhbmQgMy43LjAuXG4gKiAnMy42JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgYW5kIDMuNi42LlxuICogJzMuNi40JyB3aWxsIG1hdGNoIHZlcnNpb24gMy42LjQgb25seS5cbiAqXG4gKiBJZiB5b3UgbmVlZCB0byBzcGVjaWZ5IHRoZSBlbnZpcm9ubWVudCAoaWUuIHRoZSB3b3Jrc3BhY2UpIHRoYXQgdGhlIFB5dGhvblxuICogaW50ZXJwcmV0ZXIgaXMgcnVubmluZyB1bmRlciwgdXNlIGBpc1B5dGhvblZlcnNpb25JblByb2Nlc3NgIGluc3RlYWQuXG4gKlxuICogQHBhcmFtIHt2ZXJzaW9uc30gc3RyaW5nW10gTGlzdCBvZiB2ZXJzaW9ucyBvZiBweXRob24gdGhhdCBhcmUgdG8gYmUgc2tpcHBlZC5cbiAqIEBwYXJhbSB7cmVzb3VyY2V9IHZzY29kZS5VcmkgQ3VycmVudCB3b3Jrc3BhY2UgcmVzb3VyY2UgVXJpIG9yIHVuZGVmaW5lZC5cbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgY3VycmVudCBQeXRob24gdmVyc2lvbiBtYXRjaGVzIGEgdmVyc2lvbiBpbiB0aGUgc2tpcCBsaXN0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGlzUHl0aG9uVmVyc2lvbiguLi52ZXJzaW9ucykge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQeVZlcnNpb24gPSB5aWVsZCBnZXRQeXRob25TZW1WZXIoKTtcbiAgICAgICAgaWYgKGN1cnJlbnRQeVZlcnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBpc1ZlcnNpb25Jbkxpc3QoY3VycmVudFB5VmVyc2lvbiwgLi4udmVyc2lvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyXzEudHJhY2VFcnJvcihgRmFpbGVkIHRvIGRldGVybWluZSB0aGUgY3VycmVudCBQeXRob24gdmVyc2lvbiB3aGVuIGNvbXBhcmluZyBhZ2FpbnN0IGxpc3QgWyR7dmVyc2lvbnMuam9pbignLCAnKX1dLmApO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnRzLmlzUHl0aG9uVmVyc2lvbiA9IGlzUHl0aG9uVmVyc2lvbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbW1vbi5qcy5tYXAiXX0=