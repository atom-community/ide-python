"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.INTERPRETER_LOCATOR_SERVICE = 'IInterpreterLocatorService';
exports.WINDOWS_REGISTRY_SERVICE = 'WindowsRegistryService';
exports.CONDA_ENV_FILE_SERVICE = 'CondaEnvFileService';
exports.CONDA_ENV_SERVICE = 'CondaEnvService';
exports.CURRENT_PATH_SERVICE = 'CurrentPathService';
exports.KNOWN_PATH_SERVICE = 'KnownPathsService';
exports.GLOBAL_VIRTUAL_ENV_SERVICE = 'VirtualEnvService';
exports.WORKSPACE_VIRTUAL_ENV_SERVICE = 'WorkspaceVirtualEnvService';
exports.PIPENV_SERVICE = 'PipEnvService';
exports.IInterpreterVersionService = Symbol('IInterpreterVersionService');
exports.IKnownSearchPathsForInterpreters = Symbol('IKnownSearchPathsForInterpreters');
exports.IVirtualEnvironmentsSearchPathProvider = Symbol('IVirtualEnvironmentsSearchPathProvider');
exports.IInterpreterLocatorService = Symbol('IInterpreterLocatorService');
exports.ICondaService = Symbol('ICondaService');
var InterpreterType;

(function (InterpreterType) {
  InterpreterType["Unknown"] = "Unknown";
  InterpreterType["Conda"] = "Conda";
  InterpreterType["VirtualEnv"] = "VirtualEnv";
  InterpreterType["PipEnv"] = "PipEnv";
  InterpreterType["Pyenv"] = "Pyenv";
  InterpreterType["Venv"] = "Venv";
})(InterpreterType = exports.InterpreterType || (exports.InterpreterType = {}));

exports.IInterpreterService = Symbol('IInterpreterService');
exports.IInterpreterDisplay = Symbol('IInterpreterDisplay');
exports.IShebangCodeLensProvider = Symbol('IShebangCodeLensProvider');
exports.IInterpreterHelper = Symbol('IInterpreterHelper');
exports.IPipEnvService = Symbol('IPipEnvService');
exports.IInterpreterLocatorHelper = Symbol('IInterpreterLocatorHelper');
exports.IInterpreterWatcher = Symbol('IInterpreterWatcher');
exports.IInterpreterWatcherBuilder = Symbol('IInterpreterWatcherBuilder');
exports.InterpreterLocatorProgressHandler = Symbol('InterpreterLocatorProgressHandler');
exports.IInterpreterLocatorProgressService = Symbol('IInterpreterLocatorProgressService');
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyYWN0cy5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsIklOVEVSUFJFVEVSX0xPQ0FUT1JfU0VSVklDRSIsIldJTkRPV1NfUkVHSVNUUllfU0VSVklDRSIsIkNPTkRBX0VOVl9GSUxFX1NFUlZJQ0UiLCJDT05EQV9FTlZfU0VSVklDRSIsIkNVUlJFTlRfUEFUSF9TRVJWSUNFIiwiS05PV05fUEFUSF9TRVJWSUNFIiwiR0xPQkFMX1ZJUlRVQUxfRU5WX1NFUlZJQ0UiLCJXT1JLU1BBQ0VfVklSVFVBTF9FTlZfU0VSVklDRSIsIlBJUEVOVl9TRVJWSUNFIiwiSUludGVycHJldGVyVmVyc2lvblNlcnZpY2UiLCJTeW1ib2wiLCJJS25vd25TZWFyY2hQYXRoc0ZvckludGVycHJldGVycyIsIklWaXJ0dWFsRW52aXJvbm1lbnRzU2VhcmNoUGF0aFByb3ZpZGVyIiwiSUludGVycHJldGVyTG9jYXRvclNlcnZpY2UiLCJJQ29uZGFTZXJ2aWNlIiwiSW50ZXJwcmV0ZXJUeXBlIiwiSUludGVycHJldGVyU2VydmljZSIsIklJbnRlcnByZXRlckRpc3BsYXkiLCJJU2hlYmFuZ0NvZGVMZW5zUHJvdmlkZXIiLCJJSW50ZXJwcmV0ZXJIZWxwZXIiLCJJUGlwRW52U2VydmljZSIsIklJbnRlcnByZXRlckxvY2F0b3JIZWxwZXIiLCJJSW50ZXJwcmV0ZXJXYXRjaGVyIiwiSUludGVycHJldGVyV2F0Y2hlckJ1aWxkZXIiLCJJbnRlcnByZXRlckxvY2F0b3JQcm9ncmVzc0hhbmRsZXIiLCJJSW50ZXJwcmV0ZXJMb2NhdG9yUHJvZ3Jlc3NTZXJ2aWNlIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3QztBQUNBRCxPQUFPLENBQUNFLDJCQUFSLEdBQXNDLDRCQUF0QztBQUNBRixPQUFPLENBQUNHLHdCQUFSLEdBQW1DLHdCQUFuQztBQUNBSCxPQUFPLENBQUNJLHNCQUFSLEdBQWlDLHFCQUFqQztBQUNBSixPQUFPLENBQUNLLGlCQUFSLEdBQTRCLGlCQUE1QjtBQUNBTCxPQUFPLENBQUNNLG9CQUFSLEdBQStCLG9CQUEvQjtBQUNBTixPQUFPLENBQUNPLGtCQUFSLEdBQTZCLG1CQUE3QjtBQUNBUCxPQUFPLENBQUNRLDBCQUFSLEdBQXFDLG1CQUFyQztBQUNBUixPQUFPLENBQUNTLDZCQUFSLEdBQXdDLDRCQUF4QztBQUNBVCxPQUFPLENBQUNVLGNBQVIsR0FBeUIsZUFBekI7QUFDQVYsT0FBTyxDQUFDVywwQkFBUixHQUFxQ0MsTUFBTSxDQUFDLDRCQUFELENBQTNDO0FBQ0FaLE9BQU8sQ0FBQ2EsZ0NBQVIsR0FBMkNELE1BQU0sQ0FBQyxrQ0FBRCxDQUFqRDtBQUNBWixPQUFPLENBQUNjLHNDQUFSLEdBQWlERixNQUFNLENBQUMsd0NBQUQsQ0FBdkQ7QUFDQVosT0FBTyxDQUFDZSwwQkFBUixHQUFxQ0gsTUFBTSxDQUFDLDRCQUFELENBQTNDO0FBQ0FaLE9BQU8sQ0FBQ2dCLGFBQVIsR0FBd0JKLE1BQU0sQ0FBQyxlQUFELENBQTlCO0FBQ0EsSUFBSUssZUFBSjs7QUFDQSxDQUFDLFVBQVVBLGVBQVYsRUFBMkI7QUFDeEJBLEVBQUFBLGVBQWUsQ0FBQyxTQUFELENBQWYsR0FBNkIsU0FBN0I7QUFDQUEsRUFBQUEsZUFBZSxDQUFDLE9BQUQsQ0FBZixHQUEyQixPQUEzQjtBQUNBQSxFQUFBQSxlQUFlLENBQUMsWUFBRCxDQUFmLEdBQWdDLFlBQWhDO0FBQ0FBLEVBQUFBLGVBQWUsQ0FBQyxRQUFELENBQWYsR0FBNEIsUUFBNUI7QUFDQUEsRUFBQUEsZUFBZSxDQUFDLE9BQUQsQ0FBZixHQUEyQixPQUEzQjtBQUNBQSxFQUFBQSxlQUFlLENBQUMsTUFBRCxDQUFmLEdBQTBCLE1BQTFCO0FBQ0gsQ0FQRCxFQU9HQSxlQUFlLEdBQUdqQixPQUFPLENBQUNpQixlQUFSLEtBQTRCakIsT0FBTyxDQUFDaUIsZUFBUixHQUEwQixFQUF0RCxDQVByQjs7QUFRQWpCLE9BQU8sQ0FBQ2tCLG1CQUFSLEdBQThCTixNQUFNLENBQUMscUJBQUQsQ0FBcEM7QUFDQVosT0FBTyxDQUFDbUIsbUJBQVIsR0FBOEJQLE1BQU0sQ0FBQyxxQkFBRCxDQUFwQztBQUNBWixPQUFPLENBQUNvQix3QkFBUixHQUFtQ1IsTUFBTSxDQUFDLDBCQUFELENBQXpDO0FBQ0FaLE9BQU8sQ0FBQ3FCLGtCQUFSLEdBQTZCVCxNQUFNLENBQUMsb0JBQUQsQ0FBbkM7QUFDQVosT0FBTyxDQUFDc0IsY0FBUixHQUF5QlYsTUFBTSxDQUFDLGdCQUFELENBQS9CO0FBQ0FaLE9BQU8sQ0FBQ3VCLHlCQUFSLEdBQW9DWCxNQUFNLENBQUMsMkJBQUQsQ0FBMUM7QUFDQVosT0FBTyxDQUFDd0IsbUJBQVIsR0FBOEJaLE1BQU0sQ0FBQyxxQkFBRCxDQUFwQztBQUNBWixPQUFPLENBQUN5QiwwQkFBUixHQUFxQ2IsTUFBTSxDQUFDLDRCQUFELENBQTNDO0FBQ0FaLE9BQU8sQ0FBQzBCLGlDQUFSLEdBQTRDZCxNQUFNLENBQUMsbUNBQUQsQ0FBbEQ7QUFDQVosT0FBTyxDQUFDMkIsa0NBQVIsR0FBNkNmLE1BQU0sQ0FBQyxvQ0FBRCxDQUFuRCIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5JTlRFUlBSRVRFUl9MT0NBVE9SX1NFUlZJQ0UgPSAnSUludGVycHJldGVyTG9jYXRvclNlcnZpY2UnO1xuZXhwb3J0cy5XSU5ET1dTX1JFR0lTVFJZX1NFUlZJQ0UgPSAnV2luZG93c1JlZ2lzdHJ5U2VydmljZSc7XG5leHBvcnRzLkNPTkRBX0VOVl9GSUxFX1NFUlZJQ0UgPSAnQ29uZGFFbnZGaWxlU2VydmljZSc7XG5leHBvcnRzLkNPTkRBX0VOVl9TRVJWSUNFID0gJ0NvbmRhRW52U2VydmljZSc7XG5leHBvcnRzLkNVUlJFTlRfUEFUSF9TRVJWSUNFID0gJ0N1cnJlbnRQYXRoU2VydmljZSc7XG5leHBvcnRzLktOT1dOX1BBVEhfU0VSVklDRSA9ICdLbm93blBhdGhzU2VydmljZSc7XG5leHBvcnRzLkdMT0JBTF9WSVJUVUFMX0VOVl9TRVJWSUNFID0gJ1ZpcnR1YWxFbnZTZXJ2aWNlJztcbmV4cG9ydHMuV09SS1NQQUNFX1ZJUlRVQUxfRU5WX1NFUlZJQ0UgPSAnV29ya3NwYWNlVmlydHVhbEVudlNlcnZpY2UnO1xuZXhwb3J0cy5QSVBFTlZfU0VSVklDRSA9ICdQaXBFbnZTZXJ2aWNlJztcbmV4cG9ydHMuSUludGVycHJldGVyVmVyc2lvblNlcnZpY2UgPSBTeW1ib2woJ0lJbnRlcnByZXRlclZlcnNpb25TZXJ2aWNlJyk7XG5leHBvcnRzLklLbm93blNlYXJjaFBhdGhzRm9ySW50ZXJwcmV0ZXJzID0gU3ltYm9sKCdJS25vd25TZWFyY2hQYXRoc0ZvckludGVycHJldGVycycpO1xuZXhwb3J0cy5JVmlydHVhbEVudmlyb25tZW50c1NlYXJjaFBhdGhQcm92aWRlciA9IFN5bWJvbCgnSVZpcnR1YWxFbnZpcm9ubWVudHNTZWFyY2hQYXRoUHJvdmlkZXInKTtcbmV4cG9ydHMuSUludGVycHJldGVyTG9jYXRvclNlcnZpY2UgPSBTeW1ib2woJ0lJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlJyk7XG5leHBvcnRzLklDb25kYVNlcnZpY2UgPSBTeW1ib2woJ0lDb25kYVNlcnZpY2UnKTtcbnZhciBJbnRlcnByZXRlclR5cGU7XG4oZnVuY3Rpb24gKEludGVycHJldGVyVHlwZSkge1xuICAgIEludGVycHJldGVyVHlwZVtcIlVua25vd25cIl0gPSBcIlVua25vd25cIjtcbiAgICBJbnRlcnByZXRlclR5cGVbXCJDb25kYVwiXSA9IFwiQ29uZGFcIjtcbiAgICBJbnRlcnByZXRlclR5cGVbXCJWaXJ0dWFsRW52XCJdID0gXCJWaXJ0dWFsRW52XCI7XG4gICAgSW50ZXJwcmV0ZXJUeXBlW1wiUGlwRW52XCJdID0gXCJQaXBFbnZcIjtcbiAgICBJbnRlcnByZXRlclR5cGVbXCJQeWVudlwiXSA9IFwiUHllbnZcIjtcbiAgICBJbnRlcnByZXRlclR5cGVbXCJWZW52XCJdID0gXCJWZW52XCI7XG59KShJbnRlcnByZXRlclR5cGUgPSBleHBvcnRzLkludGVycHJldGVyVHlwZSB8fCAoZXhwb3J0cy5JbnRlcnByZXRlclR5cGUgPSB7fSkpO1xuZXhwb3J0cy5JSW50ZXJwcmV0ZXJTZXJ2aWNlID0gU3ltYm9sKCdJSW50ZXJwcmV0ZXJTZXJ2aWNlJyk7XG5leHBvcnRzLklJbnRlcnByZXRlckRpc3BsYXkgPSBTeW1ib2woJ0lJbnRlcnByZXRlckRpc3BsYXknKTtcbmV4cG9ydHMuSVNoZWJhbmdDb2RlTGVuc1Byb3ZpZGVyID0gU3ltYm9sKCdJU2hlYmFuZ0NvZGVMZW5zUHJvdmlkZXInKTtcbmV4cG9ydHMuSUludGVycHJldGVySGVscGVyID0gU3ltYm9sKCdJSW50ZXJwcmV0ZXJIZWxwZXInKTtcbmV4cG9ydHMuSVBpcEVudlNlcnZpY2UgPSBTeW1ib2woJ0lQaXBFbnZTZXJ2aWNlJyk7XG5leHBvcnRzLklJbnRlcnByZXRlckxvY2F0b3JIZWxwZXIgPSBTeW1ib2woJ0lJbnRlcnByZXRlckxvY2F0b3JIZWxwZXInKTtcbmV4cG9ydHMuSUludGVycHJldGVyV2F0Y2hlciA9IFN5bWJvbCgnSUludGVycHJldGVyV2F0Y2hlcicpO1xuZXhwb3J0cy5JSW50ZXJwcmV0ZXJXYXRjaGVyQnVpbGRlciA9IFN5bWJvbCgnSUludGVycHJldGVyV2F0Y2hlckJ1aWxkZXInKTtcbmV4cG9ydHMuSW50ZXJwcmV0ZXJMb2NhdG9yUHJvZ3Jlc3NIYW5kbGVyID0gU3ltYm9sKCdJbnRlcnByZXRlckxvY2F0b3JQcm9ncmVzc0hhbmRsZXInKTtcbmV4cG9ydHMuSUludGVycHJldGVyTG9jYXRvclByb2dyZXNzU2VydmljZSA9IFN5bWJvbCgnSUludGVycHJldGVyTG9jYXRvclByb2dyZXNzU2VydmljZScpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29udHJhY3RzLmpzLm1hcCJdfQ==