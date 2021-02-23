"use strict"; // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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

const os = require("os");

const path = require("path");

require("../common/extensions");

const types_1 = require("../common/platform/types");

const types_2 = require("../common/types");

const baseLinter_1 = require("./baseLinter");

const pylintrc = 'pylintrc';
const dotPylintrc = '.pylintrc';

class Pylint extends baseLinter_1.BaseLinter {
  constructor(outputChannel, serviceContainer) {
    super(types_2.Product.pylint, outputChannel, serviceContainer);
    this.fileSystem = serviceContainer.get(types_1.IFileSystem);
    this.platformService = serviceContainer.get(types_1.IPlatformService);
  }

  runLinter(document, cancellation) {
    return __awaiter(this, void 0, void 0, function* () {
      let minArgs = []; // Only use minimal checkers if
      //  a) there are no custom arguments and
      //  b) there is no pylintrc file next to the file or at the workspace root

      const uri = document.uri;
      const workspaceRoot = this.getWorkspaceRootPath(document);
      const settings = this.configService.getSettings(uri);

      if (settings.linting.pylintUseMinimalCheckers && this.info.linterArgs(uri).length === 0 // Check pylintrc next to the file or above up to and including the workspace root
      && !(yield Pylint.hasConfigrationFileInWorkspace(this.fileSystem, path.dirname(uri.fsPath), workspaceRoot)) // Check for pylintrc at the root and above
      && !(yield Pylint.hasConfigurationFile(this.fileSystem, this.getWorkspaceRootPath(document), this.platformService))) {
        // Disable all checkers up front and then selectively add back in:
        // - All F checkers
        // - Select W checkers
        // - All E checkers _manually_
        //   (see https://github.com/Microsoft/vscode-python/issues/722 for
        //    why; see
        //    https://gist.github.com/brettcannon/eff7f38a60af48d39814cbb2f33b3d1d
        //    for a script to regenerate the list of E checkers)
        minArgs = ['--disable=all', '--enable=F' + ',unreachable,duplicate-key,unnecessary-semicolon' + ',global-variable-not-assigned,unused-variable' + ',unused-wildcard-import,binary-op-exception' + ',bad-format-string,anomalous-backslash-in-string' + ',bad-open-mode' + ',E0001,E0011,E0012,E0100,E0101,E0102,E0103,E0104,E0105,E0107' + ',E0108,E0110,E0111,E0112,E0113,E0114,E0115,E0116,E0117,E0118' + ',E0202,E0203,E0211,E0213,E0236,E0237,E0238,E0239,E0240,E0241' + ',E0301,E0302,E0303,E0401,E0402,E0601,E0602,E0603,E0604,E0611' + ',E0632,E0633,E0701,E0702,E0703,E0704,E0710,E0711,E0712,E1003' + ',E1101,E1102,E1111,E1120,E1121,E1123,E1124,E1125,E1126,E1127' + ',E1128,E1129,E1130,E1131,E1132,E1133,E1134,E1135,E1136,E1137' + ',E1138,E1139,E1200,E1201,E1205,E1206,E1300,E1301,E1302,E1303' + ',E1304,E1305,E1306,E1310,E1700,E1701'];
      }

      const args = ['--msg-template=\'{line},{column},{category},{msg_id}:{msg}\'', '--reports=n', '--output-format=text', uri.fsPath];
      const messages = yield this.run(minArgs.concat(args), document, cancellation);
      messages.forEach(msg => {
        msg.severity = this.parseMessagesSeverity(msg.type, this.pythonSettings.linting.pylintCategorySeverity);
      });
      return messages;
    });
  } // tslint:disable-next-line:member-ordering


  static hasConfigurationFile(fs, folder, platformService) {
    return __awaiter(this, void 0, void 0, function* () {
      // https://pylint.readthedocs.io/en/latest/user_guide/run.html
      // https://github.com/PyCQA/pylint/blob/975e08148c0faa79958b459303c47be1a2e1500a/pylint/config.py
      // 1. pylintrc in the current working directory
      // 2. .pylintrc in the current working directory
      // 3. If the current working directory is in a Python module, Pylint searches
      //    up the hierarchy of Python modules until it finds a pylintrc file.
      //    This allows you to specify coding standards on a module by module basis.
      //    A directory is judged to be a Python module if it contains an __init__.py file.
      // 4. The file named by environment variable PYLINTRC
      // 5. if you have a home directory which isn’t /root:
      //      a) .pylintrc in your home directory
      //      b) .config/pylintrc in your home directory
      // 6. /etc/pylintrc
      if (process.env.PYLINTRC) {
        return true;
      }

      if ((yield fs.fileExists(path.join(folder, pylintrc))) || (yield fs.fileExists(path.join(folder, dotPylintrc)))) {
        return true;
      }

      let current = folder;
      let above = path.dirname(folder);

      do {
        if (!(yield fs.fileExists(path.join(current, '__init__.py')))) {
          break;
        }

        if ((yield fs.fileExists(path.join(current, pylintrc))) || (yield fs.fileExists(path.join(current, dotPylintrc)))) {
          return true;
        }

        current = above;
        above = path.dirname(above);
      } while (!fs.arePathsSame(current, above));

      const home = os.homedir();

      if (yield fs.fileExists(path.join(home, dotPylintrc))) {
        return true;
      }

      if (yield fs.fileExists(path.join(home, '.config', pylintrc))) {
        return true;
      }

      if (!platformService.isWindows) {
        if (yield fs.fileExists(path.join('/etc', pylintrc))) {
          return true;
        }
      }

      return false;
    });
  } // tslint:disable-next-line:member-ordering


  static hasConfigrationFileInWorkspace(fs, folder, root) {
    return __awaiter(this, void 0, void 0, function* () {
      // Search up from file location to the workspace root
      let current = folder;
      let above = path.dirname(current);

      do {
        if ((yield fs.fileExists(path.join(current, pylintrc))) || (yield fs.fileExists(path.join(current, dotPylintrc)))) {
          return true;
        }

        current = above;
        above = path.dirname(above);
      } while (!fs.arePathsSame(current, root) && !fs.arePathsSame(current, above));

      return false;
    });
  }

}

exports.Pylint = Pylint;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInB5bGludC5qcyJdLCJuYW1lcyI6WyJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwib3MiLCJyZXF1aXJlIiwicGF0aCIsInR5cGVzXzEiLCJ0eXBlc18yIiwiYmFzZUxpbnRlcl8xIiwicHlsaW50cmMiLCJkb3RQeWxpbnRyYyIsIlB5bGludCIsIkJhc2VMaW50ZXIiLCJjb25zdHJ1Y3RvciIsIm91dHB1dENoYW5uZWwiLCJzZXJ2aWNlQ29udGFpbmVyIiwiUHJvZHVjdCIsInB5bGludCIsImZpbGVTeXN0ZW0iLCJnZXQiLCJJRmlsZVN5c3RlbSIsInBsYXRmb3JtU2VydmljZSIsIklQbGF0Zm9ybVNlcnZpY2UiLCJydW5MaW50ZXIiLCJkb2N1bWVudCIsImNhbmNlbGxhdGlvbiIsIm1pbkFyZ3MiLCJ1cmkiLCJ3b3Jrc3BhY2VSb290IiwiZ2V0V29ya3NwYWNlUm9vdFBhdGgiLCJzZXR0aW5ncyIsImNvbmZpZ1NlcnZpY2UiLCJnZXRTZXR0aW5ncyIsImxpbnRpbmciLCJweWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnMiLCJpbmZvIiwibGludGVyQXJncyIsImxlbmd0aCIsImhhc0NvbmZpZ3JhdGlvbkZpbGVJbldvcmtzcGFjZSIsImRpcm5hbWUiLCJmc1BhdGgiLCJoYXNDb25maWd1cmF0aW9uRmlsZSIsImFyZ3MiLCJtZXNzYWdlcyIsInJ1biIsImNvbmNhdCIsImZvckVhY2giLCJtc2ciLCJzZXZlcml0eSIsInBhcnNlTWVzc2FnZXNTZXZlcml0eSIsInR5cGUiLCJweXRob25TZXR0aW5ncyIsInB5bGludENhdGVnb3J5U2V2ZXJpdHkiLCJmcyIsImZvbGRlciIsInByb2Nlc3MiLCJlbnYiLCJQWUxJTlRSQyIsImZpbGVFeGlzdHMiLCJqb2luIiwiY3VycmVudCIsImFib3ZlIiwiYXJlUGF0aHNTYW1lIiwiaG9tZSIsImhvbWVkaXIiLCJpc1dpbmRvd3MiLCJyb290Il0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5CLEVBQStCQyxDQUEvQixFQUFrQ0MsU0FBbEMsRUFBNkM7QUFDckYsU0FBTyxLQUFLRCxDQUFDLEtBQUtBLENBQUMsR0FBR0UsT0FBVCxDQUFOLEVBQXlCLFVBQVVDLE9BQVYsRUFBbUJDLE1BQW5CLEVBQTJCO0FBQ3ZELGFBQVNDLFNBQVQsQ0FBbUJDLEtBQW5CLEVBQTBCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQ08sSUFBVixDQUFlRixLQUFmLENBQUQsQ0FBSjtBQUE4QixPQUFwQyxDQUFxQyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUMzRixhQUFTQyxRQUFULENBQWtCSixLQUFsQixFQUF5QjtBQUFFLFVBQUk7QUFBRUMsUUFBQUEsSUFBSSxDQUFDTixTQUFTLENBQUMsT0FBRCxDQUFULENBQW1CSyxLQUFuQixDQUFELENBQUo7QUFBa0MsT0FBeEMsQ0FBeUMsT0FBT0csQ0FBUCxFQUFVO0FBQUVMLFFBQUFBLE1BQU0sQ0FBQ0ssQ0FBRCxDQUFOO0FBQVk7QUFBRTs7QUFDOUYsYUFBU0YsSUFBVCxDQUFjSSxNQUFkLEVBQXNCO0FBQUVBLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjVCxPQUFPLENBQUNRLE1BQU0sQ0FBQ0wsS0FBUixDQUFyQixHQUFzQyxJQUFJTixDQUFKLENBQU0sVUFBVUcsT0FBVixFQUFtQjtBQUFFQSxRQUFBQSxPQUFPLENBQUNRLE1BQU0sQ0FBQ0wsS0FBUixDQUFQO0FBQXdC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QUNTLFlBQUgsQ0FBZ0JGLE9BQWhCLEVBQXlCQyxLQUF6QixDQU43Qzs7QUFPQSxhQUFPLEtBQVA7QUFDSCxLQVplLENBQWhCO0FBYUg7O0FBN0h3Qzs7QUErSDdDM0QsT0FBTyxDQUFDUyxNQUFSLEdBQWlCQSxNQUFqQiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IG9zID0gcmVxdWlyZShcIm9zXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xucmVxdWlyZShcIi4uL2NvbW1vbi9leHRlbnNpb25zXCIpO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uL2NvbW1vbi90eXBlc1wiKTtcbmNvbnN0IGJhc2VMaW50ZXJfMSA9IHJlcXVpcmUoXCIuL2Jhc2VMaW50ZXJcIik7XG5jb25zdCBweWxpbnRyYyA9ICdweWxpbnRyYyc7XG5jb25zdCBkb3RQeWxpbnRyYyA9ICcucHlsaW50cmMnO1xuY2xhc3MgUHlsaW50IGV4dGVuZHMgYmFzZUxpbnRlcl8xLkJhc2VMaW50ZXIge1xuICAgIGNvbnN0cnVjdG9yKG91dHB1dENoYW5uZWwsIHNlcnZpY2VDb250YWluZXIpIHtcbiAgICAgICAgc3VwZXIodHlwZXNfMi5Qcm9kdWN0LnB5bGludCwgb3V0cHV0Q2hhbm5lbCwgc2VydmljZUNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZmlsZVN5c3RlbSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xuICAgICAgICB0aGlzLnBsYXRmb3JtU2VydmljZSA9IHNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSVBsYXRmb3JtU2VydmljZSk7XG4gICAgfVxuICAgIHJ1bkxpbnRlcihkb2N1bWVudCwgY2FuY2VsbGF0aW9uKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBsZXQgbWluQXJncyA9IFtdO1xuICAgICAgICAgICAgLy8gT25seSB1c2UgbWluaW1hbCBjaGVja2VycyBpZlxuICAgICAgICAgICAgLy8gIGEpIHRoZXJlIGFyZSBubyBjdXN0b20gYXJndW1lbnRzIGFuZFxuICAgICAgICAgICAgLy8gIGIpIHRoZXJlIGlzIG5vIHB5bGludHJjIGZpbGUgbmV4dCB0byB0aGUgZmlsZSBvciBhdCB0aGUgd29ya3NwYWNlIHJvb3RcbiAgICAgICAgICAgIGNvbnN0IHVyaSA9IGRvY3VtZW50LnVyaTtcbiAgICAgICAgICAgIGNvbnN0IHdvcmtzcGFjZVJvb3QgPSB0aGlzLmdldFdvcmtzcGFjZVJvb3RQYXRoKGRvY3VtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5jb25maWdTZXJ2aWNlLmdldFNldHRpbmdzKHVyaSk7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MubGludGluZy5weWxpbnRVc2VNaW5pbWFsQ2hlY2tlcnNcbiAgICAgICAgICAgICAgICAmJiB0aGlzLmluZm8ubGludGVyQXJncyh1cmkpLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIHB5bGludHJjIG5leHQgdG8gdGhlIGZpbGUgb3IgYWJvdmUgdXAgdG8gYW5kIGluY2x1ZGluZyB0aGUgd29ya3NwYWNlIHJvb3RcbiAgICAgICAgICAgICAgICAmJiAhKHlpZWxkIFB5bGludC5oYXNDb25maWdyYXRpb25GaWxlSW5Xb3Jrc3BhY2UodGhpcy5maWxlU3lzdGVtLCBwYXRoLmRpcm5hbWUodXJpLmZzUGF0aCksIHdvcmtzcGFjZVJvb3QpKVxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBweWxpbnRyYyBhdCB0aGUgcm9vdCBhbmQgYWJvdmVcbiAgICAgICAgICAgICAgICAmJiAhKHlpZWxkIFB5bGludC5oYXNDb25maWd1cmF0aW9uRmlsZSh0aGlzLmZpbGVTeXN0ZW0sIHRoaXMuZ2V0V29ya3NwYWNlUm9vdFBhdGgoZG9jdW1lbnQpLCB0aGlzLnBsYXRmb3JtU2VydmljZSkpKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBhbGwgY2hlY2tlcnMgdXAgZnJvbnQgYW5kIHRoZW4gc2VsZWN0aXZlbHkgYWRkIGJhY2sgaW46XG4gICAgICAgICAgICAgICAgLy8gLSBBbGwgRiBjaGVja2Vyc1xuICAgICAgICAgICAgICAgIC8vIC0gU2VsZWN0IFcgY2hlY2tlcnNcbiAgICAgICAgICAgICAgICAvLyAtIEFsbCBFIGNoZWNrZXJzIF9tYW51YWxseV9cbiAgICAgICAgICAgICAgICAvLyAgIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC92c2NvZGUtcHl0aG9uL2lzc3Vlcy83MjIgZm9yXG4gICAgICAgICAgICAgICAgLy8gICAgd2h5OyBzZWVcbiAgICAgICAgICAgICAgICAvLyAgICBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9icmV0dGNhbm5vbi9lZmY3ZjM4YTYwYWY0OGQzOTgxNGNiYjJmMzNiM2QxZFxuICAgICAgICAgICAgICAgIC8vICAgIGZvciBhIHNjcmlwdCB0byByZWdlbmVyYXRlIHRoZSBsaXN0IG9mIEUgY2hlY2tlcnMpXG4gICAgICAgICAgICAgICAgbWluQXJncyA9IFtcbiAgICAgICAgICAgICAgICAgICAgJy0tZGlzYWJsZT1hbGwnLFxuICAgICAgICAgICAgICAgICAgICAnLS1lbmFibGU9RidcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyx1bnJlYWNoYWJsZSxkdXBsaWNhdGUta2V5LHVubmVjZXNzYXJ5LXNlbWljb2xvbidcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxnbG9iYWwtdmFyaWFibGUtbm90LWFzc2lnbmVkLHVudXNlZC12YXJpYWJsZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyx1bnVzZWQtd2lsZGNhcmQtaW1wb3J0LGJpbmFyeS1vcC1leGNlcHRpb24nXG4gICAgICAgICAgICAgICAgICAgICAgICArICcsYmFkLWZvcm1hdC1zdHJpbmcsYW5vbWFsb3VzLWJhY2tzbGFzaC1pbi1zdHJpbmcnXG4gICAgICAgICAgICAgICAgICAgICAgICArICcsYmFkLW9wZW4tbW9kZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMDAwMSxFMDAxMSxFMDAxMixFMDEwMCxFMDEwMSxFMDEwMixFMDEwMyxFMDEwNCxFMDEwNSxFMDEwNydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMDEwOCxFMDExMCxFMDExMSxFMDExMixFMDExMyxFMDExNCxFMDExNSxFMDExNixFMDExNyxFMDExOCdcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMDIwMixFMDIwMyxFMDIxMSxFMDIxMyxFMDIzNixFMDIzNyxFMDIzOCxFMDIzOSxFMDI0MCxFMDI0MSdcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMDMwMSxFMDMwMixFMDMwMyxFMDQwMSxFMDQwMixFMDYwMSxFMDYwMixFMDYwMyxFMDYwNCxFMDYxMSdcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMDYzMixFMDYzMyxFMDcwMSxFMDcwMixFMDcwMyxFMDcwNCxFMDcxMCxFMDcxMSxFMDcxMixFMTAwMydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMTEwMSxFMTEwMixFMTExMSxFMTEyMCxFMTEyMSxFMTEyMyxFMTEyNCxFMTEyNSxFMTEyNixFMTEyNydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMTEyOCxFMTEyOSxFMTEzMCxFMTEzMSxFMTEzMixFMTEzMyxFMTEzNCxFMTEzNSxFMTEzNixFMTEzNydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMTEzOCxFMTEzOSxFMTIwMCxFMTIwMSxFMTIwNSxFMTIwNixFMTMwMCxFMTMwMSxFMTMwMixFMTMwMydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyxFMTMwNCxFMTMwNSxFMTMwNixFMTMxMCxFMTcwMCxFMTcwMSdcbiAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgICAgICAgICAnLS1tc2ctdGVtcGxhdGU9XFwne2xpbmV9LHtjb2x1bW59LHtjYXRlZ29yeX0se21zZ19pZH06e21zZ31cXCcnLFxuICAgICAgICAgICAgICAgICctLXJlcG9ydHM9bicsXG4gICAgICAgICAgICAgICAgJy0tb3V0cHV0LWZvcm1hdD10ZXh0JyxcbiAgICAgICAgICAgICAgICB1cmkuZnNQYXRoXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSB5aWVsZCB0aGlzLnJ1bihtaW5BcmdzLmNvbmNhdChhcmdzKSwgZG9jdW1lbnQsIGNhbmNlbGxhdGlvbik7XG4gICAgICAgICAgICBtZXNzYWdlcy5mb3JFYWNoKG1zZyA9PiB7XG4gICAgICAgICAgICAgICAgbXNnLnNldmVyaXR5ID0gdGhpcy5wYXJzZU1lc3NhZ2VzU2V2ZXJpdHkobXNnLnR5cGUsIHRoaXMucHl0aG9uU2V0dGluZ3MubGludGluZy5weWxpbnRDYXRlZ29yeVNldmVyaXR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1lbWJlci1vcmRlcmluZ1xuICAgIHN0YXRpYyBoYXNDb25maWd1cmF0aW9uRmlsZShmcywgZm9sZGVyLCBwbGF0Zm9ybVNlcnZpY2UpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vcHlsaW50LnJlYWR0aGVkb2NzLmlvL2VuL2xhdGVzdC91c2VyX2d1aWRlL3J1bi5odG1sXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vUHlDUUEvcHlsaW50L2Jsb2IvOTc1ZTA4MTQ4YzBmYWE3OTk1OGI0NTkzMDNjNDdiZTFhMmUxNTAwYS9weWxpbnQvY29uZmlnLnB5XG4gICAgICAgICAgICAvLyAxLiBweWxpbnRyYyBpbiB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgICAgLy8gMi4gLnB5bGludHJjIGluIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAgICAvLyAzLiBJZiB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBpcyBpbiBhIFB5dGhvbiBtb2R1bGUsIFB5bGludCBzZWFyY2hlc1xuICAgICAgICAgICAgLy8gICAgdXAgdGhlIGhpZXJhcmNoeSBvZiBQeXRob24gbW9kdWxlcyB1bnRpbCBpdCBmaW5kcyBhIHB5bGludHJjIGZpbGUuXG4gICAgICAgICAgICAvLyAgICBUaGlzIGFsbG93cyB5b3UgdG8gc3BlY2lmeSBjb2Rpbmcgc3RhbmRhcmRzIG9uIGEgbW9kdWxlIGJ5IG1vZHVsZSBiYXNpcy5cbiAgICAgICAgICAgIC8vICAgIEEgZGlyZWN0b3J5IGlzIGp1ZGdlZCB0byBiZSBhIFB5dGhvbiBtb2R1bGUgaWYgaXQgY29udGFpbnMgYW4gX19pbml0X18ucHkgZmlsZS5cbiAgICAgICAgICAgIC8vIDQuIFRoZSBmaWxlIG5hbWVkIGJ5IGVudmlyb25tZW50IHZhcmlhYmxlIFBZTElOVFJDXG4gICAgICAgICAgICAvLyA1LiBpZiB5b3UgaGF2ZSBhIGhvbWUgZGlyZWN0b3J5IHdoaWNoIGlzbuKAmXQgL3Jvb3Q6XG4gICAgICAgICAgICAvLyAgICAgIGEpIC5weWxpbnRyYyBpbiB5b3VyIGhvbWUgZGlyZWN0b3J5XG4gICAgICAgICAgICAvLyAgICAgIGIpIC5jb25maWcvcHlsaW50cmMgaW4geW91ciBob21lIGRpcmVjdG9yeVxuICAgICAgICAgICAgLy8gNi4gL2V0Yy9weWxpbnRyY1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52LlBZTElOVFJDKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKHlpZWxkIGZzLmZpbGVFeGlzdHMocGF0aC5qb2luKGZvbGRlciwgcHlsaW50cmMpKSkgfHwgKHlpZWxkIGZzLmZpbGVFeGlzdHMocGF0aC5qb2luKGZvbGRlciwgZG90UHlsaW50cmMpKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gZm9sZGVyO1xuICAgICAgICAgICAgbGV0IGFib3ZlID0gcGF0aC5kaXJuYW1lKGZvbGRlcik7XG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgaWYgKCEoeWllbGQgZnMuZmlsZUV4aXN0cyhwYXRoLmpvaW4oY3VycmVudCwgJ19faW5pdF9fLnB5JykpKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCh5aWVsZCBmcy5maWxlRXhpc3RzKHBhdGguam9pbihjdXJyZW50LCBweWxpbnRyYykpKSB8fCAoeWllbGQgZnMuZmlsZUV4aXN0cyhwYXRoLmpvaW4oY3VycmVudCwgZG90UHlsaW50cmMpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBhYm92ZTtcbiAgICAgICAgICAgICAgICBhYm92ZSA9IHBhdGguZGlybmFtZShhYm92ZSk7XG4gICAgICAgICAgICB9IHdoaWxlICghZnMuYXJlUGF0aHNTYW1lKGN1cnJlbnQsIGFib3ZlKSk7XG4gICAgICAgICAgICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpO1xuICAgICAgICAgICAgaWYgKHlpZWxkIGZzLmZpbGVFeGlzdHMocGF0aC5qb2luKGhvbWUsIGRvdFB5bGludHJjKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh5aWVsZCBmcy5maWxlRXhpc3RzKHBhdGguam9pbihob21lLCAnLmNvbmZpZycsIHB5bGludHJjKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghcGxhdGZvcm1TZXJ2aWNlLmlzV2luZG93cykge1xuICAgICAgICAgICAgICAgIGlmICh5aWVsZCBmcy5maWxlRXhpc3RzKHBhdGguam9pbignL2V0YycsIHB5bGludHJjKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1lbWJlci1vcmRlcmluZ1xuICAgIHN0YXRpYyBoYXNDb25maWdyYXRpb25GaWxlSW5Xb3Jrc3BhY2UoZnMsIGZvbGRlciwgcm9vdCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgLy8gU2VhcmNoIHVwIGZyb20gZmlsZSBsb2NhdGlvbiB0byB0aGUgd29ya3NwYWNlIHJvb3RcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gZm9sZGVyO1xuICAgICAgICAgICAgbGV0IGFib3ZlID0gcGF0aC5kaXJuYW1lKGN1cnJlbnQpO1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIGlmICgoeWllbGQgZnMuZmlsZUV4aXN0cyhwYXRoLmpvaW4oY3VycmVudCwgcHlsaW50cmMpKSkgfHwgKHlpZWxkIGZzLmZpbGVFeGlzdHMocGF0aC5qb2luKGN1cnJlbnQsIGRvdFB5bGludHJjKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gYWJvdmU7XG4gICAgICAgICAgICAgICAgYWJvdmUgPSBwYXRoLmRpcm5hbWUoYWJvdmUpO1xuICAgICAgICAgICAgfSB3aGlsZSAoIWZzLmFyZVBhdGhzU2FtZShjdXJyZW50LCByb290KSAmJiAhZnMuYXJlUGF0aHNTYW1lKGN1cnJlbnQsIGFib3ZlKSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuUHlsaW50ID0gUHlsaW50O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHlsaW50LmpzLm1hcCJdfQ==