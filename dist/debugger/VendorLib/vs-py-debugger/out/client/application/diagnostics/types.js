// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var DiagnosticScope;

(function (DiagnosticScope) {
  DiagnosticScope["Global"] = "Global";
  DiagnosticScope["WorkspaceFolder"] = "WorkspaceFolder";
})(DiagnosticScope = exports.DiagnosticScope || (exports.DiagnosticScope = {}));

exports.IDiagnosticsService = Symbol('IDiagnosticsService');
exports.IDiagnosticFilterService = Symbol('IDiagnosticFilterService');
exports.IDiagnosticHandlerService = Symbol('IDiagnosticHandlerService');
exports.IInvalidPythonPathInDebuggerService = Symbol('IInvalidPythonPathInDebuggerService');
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInR5cGVzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiRGlhZ25vc3RpY1Njb3BlIiwiSURpYWdub3N0aWNzU2VydmljZSIsIlN5bWJvbCIsIklEaWFnbm9zdGljRmlsdGVyU2VydmljZSIsIklEaWFnbm9zdGljSGFuZGxlclNlcnZpY2UiLCJJSW52YWxpZFB5dGhvblBhdGhJbkRlYnVnZ2VyU2VydmljZSJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0FBQUVDLEVBQUFBLEtBQUssRUFBRTtBQUFULENBQTdDO0FBQ0EsSUFBSUMsZUFBSjs7QUFDQSxDQUFDLFVBQVVBLGVBQVYsRUFBMkI7QUFDeEJBLEVBQUFBLGVBQWUsQ0FBQyxRQUFELENBQWYsR0FBNEIsUUFBNUI7QUFDQUEsRUFBQUEsZUFBZSxDQUFDLGlCQUFELENBQWYsR0FBcUMsaUJBQXJDO0FBQ0gsQ0FIRCxFQUdHQSxlQUFlLEdBQUdGLE9BQU8sQ0FBQ0UsZUFBUixLQUE0QkYsT0FBTyxDQUFDRSxlQUFSLEdBQTBCLEVBQXRELENBSHJCOztBQUlBRixPQUFPLENBQUNHLG1CQUFSLEdBQThCQyxNQUFNLENBQUMscUJBQUQsQ0FBcEM7QUFDQUosT0FBTyxDQUFDSyx3QkFBUixHQUFtQ0QsTUFBTSxDQUFDLDBCQUFELENBQXpDO0FBQ0FKLE9BQU8sQ0FBQ00seUJBQVIsR0FBb0NGLE1BQU0sQ0FBQywyQkFBRCxDQUExQztBQUNBSixPQUFPLENBQUNPLG1DQUFSLEdBQThDSCxNQUFNLENBQUMscUNBQUQsQ0FBcEQiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxudmFyIERpYWdub3N0aWNTY29wZTtcclxuKGZ1bmN0aW9uIChEaWFnbm9zdGljU2NvcGUpIHtcclxuICAgIERpYWdub3N0aWNTY29wZVtcIkdsb2JhbFwiXSA9IFwiR2xvYmFsXCI7XHJcbiAgICBEaWFnbm9zdGljU2NvcGVbXCJXb3Jrc3BhY2VGb2xkZXJcIl0gPSBcIldvcmtzcGFjZUZvbGRlclwiO1xyXG59KShEaWFnbm9zdGljU2NvcGUgPSBleHBvcnRzLkRpYWdub3N0aWNTY29wZSB8fCAoZXhwb3J0cy5EaWFnbm9zdGljU2NvcGUgPSB7fSkpO1xyXG5leHBvcnRzLklEaWFnbm9zdGljc1NlcnZpY2UgPSBTeW1ib2woJ0lEaWFnbm9zdGljc1NlcnZpY2UnKTtcclxuZXhwb3J0cy5JRGlhZ25vc3RpY0ZpbHRlclNlcnZpY2UgPSBTeW1ib2woJ0lEaWFnbm9zdGljRmlsdGVyU2VydmljZScpO1xyXG5leHBvcnRzLklEaWFnbm9zdGljSGFuZGxlclNlcnZpY2UgPSBTeW1ib2woJ0lEaWFnbm9zdGljSGFuZGxlclNlcnZpY2UnKTtcclxuZXhwb3J0cy5JSW52YWxpZFB5dGhvblBhdGhJbkRlYnVnZ2VyU2VydmljZSA9IFN5bWJvbCgnSUludmFsaWRQeXRob25QYXRoSW5EZWJ1Z2dlclNlcnZpY2UnKTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHlwZXMuanMubWFwIl19