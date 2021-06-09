"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.activate = activate;
exports.dispose = dispose;
exports.createDebuggerProvider = createDebuggerProvider;
exports.getPythonAutoGenConfig = getPythonAutoGenConfig;
exports.NUCLIDE_PYTHON_DEBUGGER_DEX_URI = void 0;

var _UniversalDisposable = _interopRequireDefault(require("@atom-ide-community/nuclide-commons/UniversalDisposable"));

var React = _interopRequireWildcard(require("react"));

var _AutoGenLaunchAttachProvider = require("@atom-ide-community/nuclide-debugger-common/AutoGenLaunchAttachProvider");

var _utils = require("./utils");

var _path = _interopRequireDefault(require("path"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const NUCLIDE_PYTHON_DEBUGGER_DEX_URI = "https://our.intern.facebook.com/intern/dex/python-and-fbcode/debugging/#nuclide";
exports.NUCLIDE_PYTHON_DEBUGGER_DEX_URI = NUCLIDE_PYTHON_DEBUGGER_DEX_URI;

let _subscriptions;

function activate() {
  _subscriptions = new _UniversalDisposable.default((0, _utils.listenToRemoteDebugCommands)());
}

function dispose() {
  _subscriptions.dispose();
}

function createDebuggerProvider() {
  return {
    type: "python",
    getLaunchAttachProvider: connection => {
      return new _AutoGenLaunchAttachProvider.AutoGenLaunchAttachProvider("Python", connection, getPythonAutoGenConfig());
    }
  };
} // TODO this service does not exist
// export function consumeRpcService(rpcService: nuclide$RpcService): IDisposable {
//   return setRpcService(rpcService);
// }


function getPythonAutoGenConfig() {
  const program = {
    name: "program",
    type: "path",
    description: "Absolute path to the program.",
    required: true,
    visible: true
  };
  const pythonPath = {
    name: "pythonPath",
    type: "path",
    description: "Path to python executable.",
    required: true,
    visible: true
  };
  const cwd = {
    name: "cwd",
    type: "path",
    description: "(Optional) Absolute path to the working directory of the program being debugged. Default is the root directory of the file.",
    required: true,
    visible: true
  };
  const args = {
    name: "args",
    type: "array",
    itemType: "string",
    description: "Command line arguments passed to the program",
    defaultValue: [],
    required: false,
    visible: true
  };
  const stopOnEntry = {
    name: "stopOnEntry",
    type: "boolean",
    description: "Automatically stop after launch.",
    defaultValue: false,
    required: false,
    visible: true
  };
  const debugOptions = {
    name: "debugOptions",
    type: "array",
    itemType: "string",
    description: "Advanced options, view read me for further details.",
    defaultValue: ["WaitOnAbnormalExit", "WaitOnNormalExit", "RedirectOutput"],
    required: false,
    visible: false
  };
  const env = {
    name: "env",
    type: "object",
    description: "(Optional) Environment variables (e.g. SHELL=/bin/bash PATH=/bin)",
    defaultValue: {},
    required: false,
    visible: true
  };
  const consoleEnum = {
    name: "console",
    type: "enum",
    enums: ["internalConsole", "integratedTerminal"],
    description: "",
    defaultValue: "internalConsole",
    required: true,
    visible: true
  };
  const adapterExecutable = {
    command: "node",
    args: [_path.default.resolve(_path.default.join(__dirname, "VendorLib/vs-py-debugger/out/client/debugger/debugAdapter/main.js"))]
  };

  const adapterRoot = _path.default.resolve(_path.default.join(__dirname, "VendorLib/vs-py-debugger"));

  return {
    launch: {
      launch: true,
      vsAdapterType: "python",
      adapterExecutable,
      adapterRoot,
      properties: [program, pythonPath, cwd, args, stopOnEntry, debugOptions, env, consoleEnum],
      scriptPropertyName: "program",
      scriptExtension: ".py",
      cwdPropertyName: "cwd",
      header: isNuclideEnvironment() ? /*#__PURE__*/React.createElement("p", null, "This is intended to debug python script files.", /*#__PURE__*/React.createElement("br", null), "To debug buck targets, you should ", /*#__PURE__*/React.createElement("a", {
        href: NUCLIDE_PYTHON_DEBUGGER_DEX_URI
      }, "use the buck toolbar instead"), ".") : null,

      getProcessName(values) {
        let processName = values.program;
        const lastSlash = processName.lastIndexOf("/");

        if (lastSlash >= 0) {
          processName = processName.substring(lastSlash + 1, processName.length);
        }

        processName += " (Python)";
        return processName;
      }

    },
    attach: null
  };
}

function isNuclideEnvironment() {
  return atom.packages.isPackageLoaded("nuclide");
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsiTlVDTElERV9QWVRIT05fREVCVUdHRVJfREVYX1VSSSIsIl9zdWJzY3JpcHRpb25zIiwiYWN0aXZhdGUiLCJVbml2ZXJzYWxEaXNwb3NhYmxlIiwiZGlzcG9zZSIsImNyZWF0ZURlYnVnZ2VyUHJvdmlkZXIiLCJ0eXBlIiwiZ2V0TGF1bmNoQXR0YWNoUHJvdmlkZXIiLCJjb25uZWN0aW9uIiwiQXV0b0dlbkxhdW5jaEF0dGFjaFByb3ZpZGVyIiwiZ2V0UHl0aG9uQXV0b0dlbkNvbmZpZyIsInByb2dyYW0iLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJyZXF1aXJlZCIsInZpc2libGUiLCJweXRob25QYXRoIiwiY3dkIiwiYXJncyIsIml0ZW1UeXBlIiwiZGVmYXVsdFZhbHVlIiwic3RvcE9uRW50cnkiLCJkZWJ1Z09wdGlvbnMiLCJlbnYiLCJjb25zb2xlRW51bSIsImVudW1zIiwiYWRhcHRlckV4ZWN1dGFibGUiLCJjb21tYW5kIiwicGF0aCIsInJlc29sdmUiLCJqb2luIiwiX19kaXJuYW1lIiwiYWRhcHRlclJvb3QiLCJsYXVuY2giLCJ2c0FkYXB0ZXJUeXBlIiwicHJvcGVydGllcyIsInNjcmlwdFByb3BlcnR5TmFtZSIsInNjcmlwdEV4dGVuc2lvbiIsImN3ZFByb3BlcnR5TmFtZSIsImhlYWRlciIsImlzTnVjbGlkZUVudmlyb25tZW50IiwiZ2V0UHJvY2Vzc05hbWUiLCJ2YWx1ZXMiLCJwcm9jZXNzTmFtZSIsImxhc3RTbGFzaCIsImxhc3RJbmRleE9mIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwiYXR0YWNoIiwiYXRvbSIsInBhY2thZ2VzIiwiaXNQYWNrYWdlTG9hZGVkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUVBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7OztBQUVPLE1BQU1BLCtCQUErQixHQUMxQyxpRkFESzs7O0FBR1AsSUFBSUMsY0FBSjs7QUFDTyxTQUFTQyxRQUFULEdBQW9CO0FBQ3pC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QUMvQixPQUF6QjtBQUNBLGNBQU1pQyxTQUFTLEdBQUdELFdBQVcsQ0FBQ0UsV0FBWixDQUF3QixHQUF4QixDQUFsQjs7QUFDQSxZQUFJRCxTQUFTLElBQUksQ0FBakIsRUFBb0I7QUFDbEJELFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDRyxTQUFaLENBQXNCRixTQUFTLEdBQUcsQ0FBbEMsRUFBcUNELFdBQVcsQ0FBQ0ksTUFBakQsQ0FBZDtBQUNEOztBQUNESixRQUFBQSxXQUFXLElBQUksV0FBZjtBQUNBLGVBQU9BLFdBQVA7QUFDRDs7QUF4QkssS0FESDtBQTJCTEssSUFBQUEsTUFBTSxFQUFFO0FBM0JILEdBQVA7QUE2QkQ7O0FBRUQsU0FBU1Isb0JBQVQsR0FBeUM7QUFDdkMsU0FBT1MsSUFBSSxDQUFDQyxRQUFMLENBQWNDLGVBQWQsQ0FBOEIsU0FBOUIsQ0FBUDtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBdXRvR2VuQ29uZmlnLCBOdWNsaWRlRGVidWdnZXJQcm92aWRlciB9IGZyb20gXCJAYXRvbS1pZGUtY29tbXVuaXR5L251Y2xpZGUtZGVidWdnZXItY29tbW9uL3R5cGVzXCJcblxuaW1wb3J0IFVuaXZlcnNhbERpc3Bvc2FibGUgZnJvbSBcIkBhdG9tLWlkZS1jb21tdW5pdHkvbnVjbGlkZS1jb21tb25zL1VuaXZlcnNhbERpc3Bvc2FibGVcIlxuaW1wb3J0ICogYXMgUmVhY3QgZnJvbSBcInJlYWN0XCJcbmltcG9ydCB7IEF1dG9HZW5MYXVuY2hBdHRhY2hQcm92aWRlciB9IGZyb20gXCJAYXRvbS1pZGUtY29tbXVuaXR5L251Y2xpZGUtZGVidWdnZXItY29tbW9uL0F1dG9HZW5MYXVuY2hBdHRhY2hQcm92aWRlclwiXG5pbXBvcnQgeyBsaXN0ZW5Ub1JlbW90ZURlYnVnQ29tbWFuZHMsIHNldFJwY1NlcnZpY2UgfSBmcm9tIFwiLi91dGlsc1wiXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5cbmV4cG9ydCBjb25zdCBOVUNMSURFX1BZVEhPTl9ERUJVR0dFUl9ERVhfVVJJID1cbiAgXCJodHRwczovL291ci5pbnRlcm4uZmFjZWJvb2suY29tL2ludGVybi9kZXgvcHl0aG9uLWFuZC1mYmNvZGUvZGVidWdnaW5nLyNudWNsaWRlXCJcblxubGV0IF9zdWJzY3JpcHRpb25zOiBVbml2ZXJzYWxEaXNwb3NhYmxlXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIF9zdWJzY3JpcHRpb25zID0gbmV3IFVuaXZlcnNhbERpc3Bvc2FibGUobGlzdGVuVG9SZW1vdGVEZWJ1Z0NvbW1hbmRzKCkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICBfc3Vic2NyaXB0aW9ucy5kaXNwb3NlKClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlYnVnZ2VyUHJvdmlkZXIoKTogTnVjbGlkZURlYnVnZ2VyUHJvdmlkZXIge1xuICByZXR1cm4ge1xuICAgIHR5cGU6IFwicHl0aG9uXCIsXG4gICAgZ2V0TGF1bmNoQXR0YWNoUHJvdmlkZXI6IChjb25uZWN0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IEF1dG9HZW5MYXVuY2hBdHRhY2hQcm92aWRlcihcIlB5dGhvblwiLCBjb25uZWN0aW9uLCBnZXRQeXRob25BdXRvR2VuQ29uZmlnKCkpXG4gICAgfSxcbiAgfVxufVxuXG4vLyBUT0RPIHRoaXMgc2VydmljZSBkb2VzIG5vdCBleGlzdFxuLy8gZXhwb3J0IGZ1bmN0aW9uIGNvbnN1bWVScGNTZXJ2aWNlKHJwY1NlcnZpY2U6IG51Y2xpZGUkUnBjU2VydmljZSk6IElEaXNwb3NhYmxlIHtcbi8vICAgcmV0dXJuIHNldFJwY1NlcnZpY2UocnBjU2VydmljZSk7XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQeXRob25BdXRvR2VuQ29uZmlnKCk6IEF1dG9HZW5Db25maWcge1xuICBjb25zdCBwcm9ncmFtID0ge1xuICAgIG5hbWU6IFwicHJvZ3JhbVwiLFxuICAgIHR5cGU6IFwicGF0aFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkFic29sdXRlIHBhdGggdG8gdGhlIHByb2dyYW0uXCIsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdmlzaWJsZTogdHJ1ZSxcbiAgfVxuICBjb25zdCBweXRob25QYXRoID0ge1xuICAgIG5hbWU6IFwicHl0aG9uUGF0aFwiLFxuICAgIHR5cGU6IFwicGF0aFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlBhdGggdG8gcHl0aG9uIGV4ZWN1dGFibGUuXCIsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdmlzaWJsZTogdHJ1ZSxcbiAgfVxuICBjb25zdCBjd2QgPSB7XG4gICAgbmFtZTogXCJjd2RcIixcbiAgICB0eXBlOiBcInBhdGhcIixcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgIFwiKE9wdGlvbmFsKSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgcHJvZ3JhbSBiZWluZyBkZWJ1Z2dlZC4gRGVmYXVsdCBpcyB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGZpbGUuXCIsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdmlzaWJsZTogdHJ1ZSxcbiAgfVxuICBjb25zdCBhcmdzID0ge1xuICAgIG5hbWU6IFwiYXJnc1wiLFxuICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICBpdGVtVHlwZTogXCJzdHJpbmdcIixcbiAgICBkZXNjcmlwdGlvbjogXCJDb21tYW5kIGxpbmUgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgcHJvZ3JhbVwiLFxuICAgIGRlZmF1bHRWYWx1ZTogW10sXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH1cbiAgY29uc3Qgc3RvcE9uRW50cnkgPSB7XG4gICAgbmFtZTogXCJzdG9wT25FbnRyeVwiLFxuICAgIHR5cGU6IFwiYm9vbGVhblwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkF1dG9tYXRpY2FsbHkgc3RvcCBhZnRlciBsYXVuY2guXCIsXG4gICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgdmlzaWJsZTogdHJ1ZSxcbiAgfVxuICBjb25zdCBkZWJ1Z09wdGlvbnMgPSB7XG4gICAgbmFtZTogXCJkZWJ1Z09wdGlvbnNcIixcbiAgICB0eXBlOiBcImFycmF5XCIsXG4gICAgaXRlbVR5cGU6IFwic3RyaW5nXCIsXG4gICAgZGVzY3JpcHRpb246IFwiQWR2YW5jZWQgb3B0aW9ucywgdmlldyByZWFkIG1lIGZvciBmdXJ0aGVyIGRldGFpbHMuXCIsXG4gICAgZGVmYXVsdFZhbHVlOiBbXCJXYWl0T25BYm5vcm1hbEV4aXRcIiwgXCJXYWl0T25Ob3JtYWxFeGl0XCIsIFwiUmVkaXJlY3RPdXRwdXRcIl0sXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgIHZpc2libGU6IGZhbHNlLFxuICB9XG4gIGNvbnN0IGVudiA9IHtcbiAgICBuYW1lOiBcImVudlwiLFxuICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgZGVzY3JpcHRpb246IFwiKE9wdGlvbmFsKSBFbnZpcm9ubWVudCB2YXJpYWJsZXMgKGUuZy4gU0hFTEw9L2Jpbi9iYXNoIFBBVEg9L2JpbilcIixcbiAgICBkZWZhdWx0VmFsdWU6IHt9LFxuICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICB2aXNpYmxlOiB0cnVlLFxuICB9XG4gIGNvbnN0IGNvbnNvbGVFbnVtID0ge1xuICAgIG5hbWU6IFwiY29uc29sZVwiLFxuICAgIHR5cGU6IFwiZW51bVwiLFxuICAgIGVudW1zOiBbXCJpbnRlcm5hbENvbnNvbGVcIiwgXCJpbnRlZ3JhdGVkVGVybWluYWxcIl0sXG4gICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgZGVmYXVsdFZhbHVlOiBcImludGVybmFsQ29uc29sZVwiLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH1cblxuICBjb25zdCBhZGFwdGVyRXhlY3V0YWJsZSA9IHtcbiAgICBjb21tYW5kOiBcIm5vZGVcIixcbiAgICBhcmdzOiBbcGF0aC5yZXNvbHZlKHBhdGguam9pbihfX2Rpcm5hbWUsIFwiVmVuZG9yTGliL3ZzLXB5LWRlYnVnZ2VyL291dC9jbGllbnQvZGVidWdnZXIvZGVidWdBZGFwdGVyL21haW4uanNcIikpXSxcbiAgfVxuICBjb25zdCBhZGFwdGVyUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmpvaW4oX19kaXJuYW1lLCBcIlZlbmRvckxpYi92cy1weS1kZWJ1Z2dlclwiKSlcblxuICByZXR1cm4ge1xuICAgIGxhdW5jaDoge1xuICAgICAgbGF1bmNoOiB0cnVlLFxuICAgICAgdnNBZGFwdGVyVHlwZTogXCJweXRob25cIixcbiAgICAgIGFkYXB0ZXJFeGVjdXRhYmxlLFxuICAgICAgYWRhcHRlclJvb3QsXG4gICAgICBwcm9wZXJ0aWVzOiBbcHJvZ3JhbSwgcHl0aG9uUGF0aCwgY3dkLCBhcmdzLCBzdG9wT25FbnRyeSwgZGVidWdPcHRpb25zLCBlbnYsIGNvbnNvbGVFbnVtXSxcbiAgICAgIHNjcmlwdFByb3BlcnR5TmFtZTogXCJwcm9ncmFtXCIsXG4gICAgICBzY3JpcHRFeHRlbnNpb246IFwiLnB5XCIsXG4gICAgICBjd2RQcm9wZXJ0eU5hbWU6IFwiY3dkXCIsXG4gICAgICBoZWFkZXI6IGlzTnVjbGlkZUVudmlyb25tZW50KCkgPyAoXG4gICAgICAgIDxwPlxuICAgICAgICAgIFRoaXMgaXMgaW50ZW5kZWQgdG8gZGVidWcgcHl0aG9uIHNjcmlwdCBmaWxlcy5cbiAgICAgICAgICA8YnIgLz5cbiAgICAgICAgICBUbyBkZWJ1ZyBidWNrIHRhcmdldHMsIHlvdSBzaG91bGQgPGEgaHJlZj17TlVDTElERV9QWVRIT05fREVCVUdHRVJfREVYX1VSSX0+dXNlIHRoZSBidWNrIHRvb2xiYXIgaW5zdGVhZDwvYT4uXG4gICAgICAgIDwvcD5cbiAgICAgICkgOiBudWxsLFxuICAgICAgZ2V0UHJvY2Vzc05hbWUodmFsdWVzKSB7XG4gICAgICAgIGxldCBwcm9jZXNzTmFtZSA9IHZhbHVlcy5wcm9ncmFtXG4gICAgICAgIGNvbnN0IGxhc3RTbGFzaCA9IHByb2Nlc3NOYW1lLmxhc3RJbmRleE9mKFwiL1wiKVxuICAgICAgICBpZiAobGFzdFNsYXNoID49IDApIHtcbiAgICAgICAgICBwcm9jZXNzTmFtZSA9IHByb2Nlc3NOYW1lLnN1YnN0cmluZyhsYXN0U2xhc2ggKyAxLCBwcm9jZXNzTmFtZS5sZW5ndGgpXG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzc05hbWUgKz0gXCIgKFB5dGhvbilcIlxuICAgICAgICByZXR1cm4gcHJvY2Vzc05hbWVcbiAgICAgIH0sXG4gICAgfSxcbiAgICBhdHRhY2g6IG51bGwsXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNOdWNsaWRlRW52aXJvbm1lbnQoKTogYm9vbGVhbiB7XG4gIHJldHVybiBhdG9tLnBhY2thZ2VzLmlzUGFja2FnZUxvYWRlZChcIm51Y2xpZGVcIilcbn1cbiJdfQ==