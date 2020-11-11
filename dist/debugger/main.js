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

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const NUCLIDE_PYTHON_DEBUGGER_DEX_URI = 'https://our.intern.facebook.com/intern/dex/python-and-fbcode/debugging/#nuclide';
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
    name: 'program',
    type: 'path',
    description: 'Absolute path to the program.',
    required: true,
    visible: true
  };
  const pythonPath = {
    name: 'pythonPath',
    type: 'path',
    description: 'Path to python executable.',
    required: true,
    visible: true
  };
  const cwd = {
    name: 'cwd',
    type: 'path',
    description: '(Optional) Absolute path to the working directory of the program being debugged. Default is the root directory of the file.',
    required: true,
    visible: true
  };
  const args = {
    name: 'args',
    type: 'array',
    itemType: 'string',
    description: 'Command line arguments passed to the program',
    defaultValue: [],
    required: false,
    visible: true
  };
  const stopOnEntry = {
    name: 'stopOnEntry',
    type: 'boolean',
    description: 'Automatically stop after launch.',
    defaultValue: false,
    required: false,
    visible: true
  };
  const debugOptions = {
    name: 'debugOptions',
    type: 'array',
    itemType: 'string',
    description: 'Advanced options, view read me for further details.',
    defaultValue: ['WaitOnAbnormalExit', 'WaitOnNormalExit', 'RedirectOutput'],
    required: false,
    visible: false
  };
  const env = {
    name: 'env',
    type: 'object',
    description: '(Optional) Environment variables (e.g. SHELL=/bin/bash PATH=/bin)',
    defaultValue: {},
    required: false,
    visible: true
  };
  const consoleEnum = {
    name: 'console',
    type: 'enum',
    enums: ['internalConsole', 'integratedTerminal'],
    description: '',
    defaultValue: 'internalConsole',
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
      scriptPropertyName: 'program',
      scriptExtension: '.py',
      cwdPropertyName: 'cwd',
      header: isNuclideEnvironment() ? /*#__PURE__*/React.createElement("p", null, "This is intended to debug python script files.", /*#__PURE__*/React.createElement("br", null), "To debug buck targets, you should", ' ', /*#__PURE__*/React.createElement("a", {
        href: NUCLIDE_PYTHON_DEBUGGER_DEX_URI
      }, "use the buck toolbar instead"), ".") : null,

      getProcessName(values) {
        let processName = values.program;
        const lastSlash = processName.lastIndexOf('/');

        if (lastSlash >= 0) {
          processName = processName.substring(lastSlash + 1, processName.length);
        }

        processName += ' (Python)';
        return processName;
      }

    },
    attach: null
  };
}

function isNuclideEnvironment() {
  return atom.packages.isPackageLoaded('nuclide');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsiTlVDTElERV9QWVRIT05fREVCVUdHRVJfREVYX1VSSSIsIl9zdWJzY3JpcHRpb25zIiwiYWN0aXZhdGUiLCJVbml2ZXJzYWxEaXNwb3NhYmxlIiwiZGlzcG9zZSIsImNyZWF0ZURlYnVnZ2VyUHJvdmlkZXIiLCJ0eXBlIiwiZ2V0TGF1bmNoQXR0YWNoUHJvdmlkZXIiLCJjb25uZWN0aW9uIiwiQXV0b0dlbkxhdW5jaEF0dGFjaFByb3ZpZGVyIiwiZ2V0UHl0aG9uQXV0b0dlbkNvbmZpZyIsInByb2dyYW0iLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJyZXF1aXJlZCIsInZpc2libGUiLCJweXRob25QYXRoIiwiY3dkIiwiYXJncyIsIml0ZW1UeXBlIiwiZGVmYXVsdFZhbHVlIiwic3RvcE9uRW50cnkiLCJkZWJ1Z09wdGlvbnMiLCJlbnYiLCJjb25zb2xlRW51bSIsImVudW1zIiwiYWRhcHRlckV4ZWN1dGFibGUiLCJjb21tYW5kIiwicGF0aCIsInJlc29sdmUiLCJqb2luIiwiX19kaXJuYW1lIiwiYWRhcHRlclJvb3QiLCJsYXVuY2giLCJ2c0FkYXB0ZXJUeXBlIiwicHJvcGVydGllcyIsInNjcmlwdFByb3BlcnR5TmFtZSIsInNjcmlwdEV4dGVuc2lvbiIsImN3ZFByb3BlcnR5TmFtZSIsImhlYWRlciIsImlzTnVjbGlkZUVudmlyb25tZW50IiwiZ2V0UHJvY2Vzc05hbWUiLCJ2YWx1ZXMiLCJwcm9jZXNzTmFtZSIsImxhc3RTbGFzaCIsImxhc3RJbmRleE9mIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwiYXR0YWNoIiwiYXRvbSIsInBhY2thZ2VzIiwiaXNQYWNrYWdlTG9hZGVkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUtBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7OztBQUVPLE1BQU1BLCtCQUErQixHQUMxQyxpRkFESzs7O0FBSVAsSUFBSUMsY0FBSjs7QUFDTyxTQUFTQyxRQUFULEdBQW9CO0FBQ3pC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LE9BQXpCO0FBQ0EsY0FBTWlDLFNBQVMsR0FBR0QsV0FBVyxDQUFDRSxXQUFaLENBQXdCLEdBQXhCLENBQWxCOztBQUNBLFlBQUlELFNBQVMsSUFBSSxDQUFqQixFQUFvQjtBQUNsQkQsVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUNHLFNBQVosQ0FDWkYsU0FBUyxHQUFHLENBREEsRUFFWkQsV0FBVyxDQUFDSSxNQUZBLENBQWQ7QUFJRDs7QUFDREosUUFBQUEsV0FBVyxJQUFJLFdBQWY7QUFDQSxlQUFPQSxXQUFQO0FBQ0Q7O0FBdkNLLEtBREg7QUEwQ0xLLElBQUFBLE1BQU0sRUFBRTtBQTFDSCxHQUFQO0FBNENEOztBQUVELFNBQVNSLG9CQUFULEdBQXlDO0FBQ3ZDLFNBQU9TLElBQUksQ0FBQ0MsUUFBTCxDQUFjQyxlQUFkLENBQThCLFNBQTlCLENBQVA7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHtcbiAgQXV0b0dlbkNvbmZpZyxcbiAgTnVjbGlkZURlYnVnZ2VyUHJvdmlkZXIsXG59IGZyb20gJ0BhdG9tLWlkZS1jb21tdW5pdHkvbnVjbGlkZS1kZWJ1Z2dlci1jb21tb24vdHlwZXMnO1xuXG5pbXBvcnQgVW5pdmVyc2FsRGlzcG9zYWJsZSBmcm9tICdAYXRvbS1pZGUtY29tbXVuaXR5L251Y2xpZGUtY29tbW9ucy9Vbml2ZXJzYWxEaXNwb3NhYmxlJztcbmltcG9ydCAqIGFzIFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7QXV0b0dlbkxhdW5jaEF0dGFjaFByb3ZpZGVyfSBmcm9tICdAYXRvbS1pZGUtY29tbXVuaXR5L251Y2xpZGUtZGVidWdnZXItY29tbW9uL0F1dG9HZW5MYXVuY2hBdHRhY2hQcm92aWRlcic7XG5pbXBvcnQge2xpc3RlblRvUmVtb3RlRGVidWdDb21tYW5kcywgc2V0UnBjU2VydmljZX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNvbnN0IE5VQ0xJREVfUFlUSE9OX0RFQlVHR0VSX0RFWF9VUkkgPVxuICAnaHR0cHM6Ly9vdXIuaW50ZXJuLmZhY2Vib29rLmNvbS9pbnRlcm4vZGV4L3B5dGhvbi1hbmQtZmJjb2RlL2RlYnVnZ2luZy8jbnVjbGlkZSc7XG5cblxubGV0IF9zdWJzY3JpcHRpb25zOiBVbml2ZXJzYWxEaXNwb3NhYmxlXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIF9zdWJzY3JpcHRpb25zID0gbmV3IFVuaXZlcnNhbERpc3Bvc2FibGUoXG4gICAgbGlzdGVuVG9SZW1vdGVEZWJ1Z0NvbW1hbmRzKCksXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICBfc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZWJ1Z2dlclByb3ZpZGVyKCk6IE51Y2xpZGVEZWJ1Z2dlclByb3ZpZGVyIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBcInB5dGhvblwiLFxuICAgIGdldExhdW5jaEF0dGFjaFByb3ZpZGVyOiBjb25uZWN0aW9uID0+IHtcbiAgICAgIHJldHVybiBuZXcgQXV0b0dlbkxhdW5jaEF0dGFjaFByb3ZpZGVyKFxuICAgICAgICBcIlB5dGhvblwiLFxuICAgICAgICBjb25uZWN0aW9uLFxuICAgICAgICBnZXRQeXRob25BdXRvR2VuQ29uZmlnKCksXG4gICAgICApO1xuICAgIH0sXG4gIH07XG59XG5cbi8vIFRPRE8gdGhpcyBzZXJ2aWNlIGRvZXMgbm90IGV4aXN0XG4vLyBleHBvcnQgZnVuY3Rpb24gY29uc3VtZVJwY1NlcnZpY2UocnBjU2VydmljZTogbnVjbGlkZSRScGNTZXJ2aWNlKTogSURpc3Bvc2FibGUge1xuLy8gICByZXR1cm4gc2V0UnBjU2VydmljZShycGNTZXJ2aWNlKTtcbi8vIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFB5dGhvbkF1dG9HZW5Db25maWcoKTogQXV0b0dlbkNvbmZpZyB7XG4gIGNvbnN0IHByb2dyYW0gPSB7XG4gICAgbmFtZTogJ3Byb2dyYW0nLFxuICAgIHR5cGU6ICdwYXRoJyxcbiAgICBkZXNjcmlwdGlvbjogJ0Fic29sdXRlIHBhdGggdG8gdGhlIHByb2dyYW0uJyxcbiAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB2aXNpYmxlOiB0cnVlLFxuICB9O1xuICBjb25zdCBweXRob25QYXRoID0ge1xuICAgIG5hbWU6ICdweXRob25QYXRoJyxcbiAgICB0eXBlOiAncGF0aCcsXG4gICAgZGVzY3JpcHRpb246ICdQYXRoIHRvIHB5dGhvbiBleGVjdXRhYmxlLicsXG4gICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgdmlzaWJsZTogdHJ1ZSxcbiAgfTtcbiAgY29uc3QgY3dkID0ge1xuICAgIG5hbWU6ICdjd2QnLFxuICAgIHR5cGU6ICdwYXRoJyxcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgICcoT3B0aW9uYWwpIEFic29sdXRlIHBhdGggdG8gdGhlIHdvcmtpbmcgZGlyZWN0b3J5IG9mIHRoZSBwcm9ncmFtIGJlaW5nIGRlYnVnZ2VkLiBEZWZhdWx0IGlzIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGUgZmlsZS4nLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH07XG4gIGNvbnN0IGFyZ3MgPSB7XG4gICAgbmFtZTogJ2FyZ3MnLFxuICAgIHR5cGU6ICdhcnJheScsXG4gICAgaXRlbVR5cGU6ICdzdHJpbmcnLFxuICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZCBsaW5lIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHByb2dyYW0nLFxuICAgIGRlZmF1bHRWYWx1ZTogW10sXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH07XG4gIGNvbnN0IHN0b3BPbkVudHJ5ID0ge1xuICAgIG5hbWU6ICdzdG9wT25FbnRyeScsXG4gICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgIGRlc2NyaXB0aW9uOiAnQXV0b21hdGljYWxseSBzdG9wIGFmdGVyIGxhdW5jaC4nLFxuICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH07XG4gIGNvbnN0IGRlYnVnT3B0aW9ucyA9IHtcbiAgICBuYW1lOiAnZGVidWdPcHRpb25zJyxcbiAgICB0eXBlOiAnYXJyYXknLFxuICAgIGl0ZW1UeXBlOiAnc3RyaW5nJyxcbiAgICBkZXNjcmlwdGlvbjogJ0FkdmFuY2VkIG9wdGlvbnMsIHZpZXcgcmVhZCBtZSBmb3IgZnVydGhlciBkZXRhaWxzLicsXG4gICAgZGVmYXVsdFZhbHVlOiBbJ1dhaXRPbkFibm9ybWFsRXhpdCcsICdXYWl0T25Ob3JtYWxFeGl0JywgJ1JlZGlyZWN0T3V0cHV0J10sXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgIHZpc2libGU6IGZhbHNlLFxuICB9O1xuICBjb25zdCBlbnYgPSB7XG4gICAgbmFtZTogJ2VudicsXG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgZGVzY3JpcHRpb246XG4gICAgICAnKE9wdGlvbmFsKSBFbnZpcm9ubWVudCB2YXJpYWJsZXMgKGUuZy4gU0hFTEw9L2Jpbi9iYXNoIFBBVEg9L2JpbiknLFxuICAgIGRlZmF1bHRWYWx1ZToge30sXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH07XG4gIGNvbnN0IGNvbnNvbGVFbnVtID0ge1xuICAgIG5hbWU6ICdjb25zb2xlJyxcbiAgICB0eXBlOiAnZW51bScsXG4gICAgZW51bXM6IFsnaW50ZXJuYWxDb25zb2xlJywgJ2ludGVncmF0ZWRUZXJtaW5hbCddLFxuICAgIGRlc2NyaXB0aW9uOiAnJyxcbiAgICBkZWZhdWx0VmFsdWU6ICdpbnRlcm5hbENvbnNvbGUnLFxuICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIHZpc2libGU6IHRydWUsXG4gIH07XG5cbiAgY29uc3QgYWRhcHRlckV4ZWN1dGFibGUgPSB7XG4gICAgY29tbWFuZDogXCJub2RlXCIsXG4gICAgYXJnczogW3BhdGgucmVzb2x2ZShwYXRoLmpvaW4oX19kaXJuYW1lLCBcIlZlbmRvckxpYi92cy1weS1kZWJ1Z2dlci9vdXQvY2xpZW50L2RlYnVnZ2VyL2RlYnVnQWRhcHRlci9tYWluLmpzXCIpKV0sXG4gIH1cbiAgY29uc3QgYWRhcHRlclJvb3QgPSBwYXRoLnJlc29sdmUocGF0aC5qb2luKF9fZGlybmFtZSwgXCJWZW5kb3JMaWIvdnMtcHktZGVidWdnZXJcIikpXG5cbiAgcmV0dXJuIHtcbiAgICBsYXVuY2g6IHtcbiAgICAgIGxhdW5jaDogdHJ1ZSxcbiAgICAgIHZzQWRhcHRlclR5cGU6IFwicHl0aG9uXCIsXG4gICAgICBhZGFwdGVyRXhlY3V0YWJsZSxcbiAgICAgIGFkYXB0ZXJSb290LFxuICAgICAgcHJvcGVydGllczogW1xuICAgICAgICBwcm9ncmFtLFxuICAgICAgICBweXRob25QYXRoLFxuICAgICAgICBjd2QsXG4gICAgICAgIGFyZ3MsXG4gICAgICAgIHN0b3BPbkVudHJ5LFxuICAgICAgICBkZWJ1Z09wdGlvbnMsXG4gICAgICAgIGVudixcbiAgICAgICAgY29uc29sZUVudW0sXG4gICAgICBdLFxuICAgICAgc2NyaXB0UHJvcGVydHlOYW1lOiAncHJvZ3JhbScsXG4gICAgICBzY3JpcHRFeHRlbnNpb246ICcucHknLFxuICAgICAgY3dkUHJvcGVydHlOYW1lOiAnY3dkJyxcbiAgICAgIGhlYWRlcjogaXNOdWNsaWRlRW52aXJvbm1lbnQoKSA/IChcbiAgICAgICAgPHA+XG4gICAgICAgICAgVGhpcyBpcyBpbnRlbmRlZCB0byBkZWJ1ZyBweXRob24gc2NyaXB0IGZpbGVzLlxuICAgICAgICAgIDxiciAvPlxuICAgICAgICAgIFRvIGRlYnVnIGJ1Y2sgdGFyZ2V0cywgeW91IHNob3VsZHsnICd9XG4gICAgICAgICAgPGEgaHJlZj17TlVDTElERV9QWVRIT05fREVCVUdHRVJfREVYX1VSSX0+XG4gICAgICAgICAgICB1c2UgdGhlIGJ1Y2sgdG9vbGJhciBpbnN0ZWFkXG4gICAgICAgICAgPC9hPi5cbiAgICAgICAgPC9wPlxuICAgICAgKSA6IG51bGwsXG4gICAgICBnZXRQcm9jZXNzTmFtZSh2YWx1ZXMpIHtcbiAgICAgICAgbGV0IHByb2Nlc3NOYW1lID0gdmFsdWVzLnByb2dyYW07XG4gICAgICAgIGNvbnN0IGxhc3RTbGFzaCA9IHByb2Nlc3NOYW1lLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgICAgIGlmIChsYXN0U2xhc2ggPj0gMCkge1xuICAgICAgICAgIHByb2Nlc3NOYW1lID0gcHJvY2Vzc05hbWUuc3Vic3RyaW5nKFxuICAgICAgICAgICAgbGFzdFNsYXNoICsgMSxcbiAgICAgICAgICAgIHByb2Nlc3NOYW1lLmxlbmd0aCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NOYW1lICs9ICcgKFB5dGhvbiknO1xuICAgICAgICByZXR1cm4gcHJvY2Vzc05hbWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAgYXR0YWNoOiBudWxsLFxuICB9O1xufVxuXG5mdW5jdGlvbiBpc051Y2xpZGVFbnZpcm9ubWVudCgpOiBib29sZWFuIHtcbiAgcmV0dXJuIGF0b20ucGFja2FnZXMuaXNQYWNrYWdlTG9hZGVkKCdudWNsaWRlJyk7XG59XG4iXX0=