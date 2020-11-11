// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
}); // tslint:disable-next-line:no-any

if (Reflect.metadata === undefined) {
  // tslint:disable-next-line:no-require-imports no-var-requires
  require('reflect-metadata');
}

const ciConstants_1 = require("./ciConstants");

const constants_1 = require("./constants");

const testRunner = require("./testRunner");

process.env.VSC_PYTHON_CI_TEST = '1';
process.env.IS_MULTI_ROOT_TEST = constants_1.IS_MULTI_ROOT_TEST.toString(); // If running on CI server and we're running the debugger tests, then ensure we only run debug tests.
// We do this to ensure we only run debugger test, as debugger tests are very flaky on CI.
// So the solution is to run them separately and first on CI.

const grep = ciConstants_1.IS_CI_SERVER_TEST_DEBUGGER ? 'Debug' : undefined;
const testFilesSuffix = process.env.TEST_FILES_SUFFIX; // You can directly control Mocha options by uncommenting the following lines.
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info.
// Hack, as retries is not supported as setting in tsd.

const options = {
  ui: 'tdd',
  useColors: true,
  timeout: 25000,
  retries: 3,
  grep,
  testFilesSuffix
}; // VSTS CI doesn't display colours correctly (yet).

if (ciConstants_1.IS_VSTS) {
  options.useColors = false;
} // CI can ask for a JUnit reporter if the environment variable
// 'MOCHA_REPORTER_JUNIT' is defined, further control is afforded
// by other 'MOCHA_CI_...' variables. See constants.ts for info.


if (ciConstants_1.MOCHA_REPORTER_JUNIT) {
  options.reporter = ciConstants_1.MOCHA_CI_REPORTER_ID;
  options.reporterOptions = {
    mochaFile: ciConstants_1.MOCHA_CI_REPORTFILE,
    properties: ciConstants_1.MOCHA_CI_PROPERTIES
  };
}

process.on('unhandledRejection', (ex, a) => {
  const message = [`${ex}`];

  if (typeof ex !== 'string' && ex && ex.message) {
    message.push(ex.name);
    message.push(ex.message);

    if (ex.stack) {
      message.push(ex.stack);
    }
  }

  console.error(`Unhandled Promise Rejection with the message ${message.join(', ')}`);
});
testRunner.configure(options, {
  coverageConfig: '../coverconfig.json'
});
module.exports = testRunner;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiUmVmbGVjdCIsIm1ldGFkYXRhIiwidW5kZWZpbmVkIiwicmVxdWlyZSIsImNpQ29uc3RhbnRzXzEiLCJjb25zdGFudHNfMSIsInRlc3RSdW5uZXIiLCJwcm9jZXNzIiwiZW52IiwiVlNDX1BZVEhPTl9DSV9URVNUIiwiSVNfTVVMVElfUk9PVF9URVNUIiwidG9TdHJpbmciLCJncmVwIiwiSVNfQ0lfU0VSVkVSX1RFU1RfREVCVUdHRVIiLCJ0ZXN0RmlsZXNTdWZmaXgiLCJURVNUX0ZJTEVTX1NVRkZJWCIsIm9wdGlvbnMiLCJ1aSIsInVzZUNvbG9ycyIsInRpbWVvdXQiLCJyZXRyaWVzIiwiSVNfVlNUUyIsIk1PQ0hBX1JFUE9SVEVSX0pVTklUIiwicmVwb3J0ZXIiLCJNT0NIQV9DSV9SRVBPUlRFUl9JRCIsInJlcG9ydGVyT3B0aW9ucyIsIm1vY2hhRmlsZSIsIk1PQ0hBX0NJX1JFUE9SVEZJTEUiLCJwcm9wZXJ0aWVzIiwiTU9DSEFfQ0lfUFJPUEVSVElFUyIsIm9uIiwiZXgiLCJhIiwibWVzc2FnZSIsInB1c2giLCJuYW1lIiwic3RhY2siLCJjb25zb2xlIiwiZXJyb3IiLCJqb2luIiwiY29uZmlndXJlIiwiY292ZXJhZ2VDb25maWciLCJtb2R1bGUiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3QyxFLENBQ0E7O0FBQ0EsSUFBSUMsT0FBTyxDQUFDQyxRQUFSLEtBQXFCQyxTQUF6QixFQUFvQztBQUNoQztBQUNBQyxFQUFBQSxPQUFPLENBQUMsa0JBQUQsQ0FBUDtBQUNIOztBQUNELE1BQU1DLGFBQWEsR0FBR0QsT0FBTyxDQUFDLGVBQUQsQ0FBN0I7O0FBQ0EsTUFBTUUsV0FBVyxHQUFHRixPQUFPLENBQUMsYUFBRCxDQUEzQjs7QUFDQSxNQUFNRyxVQUFVLEdBQUdILE9BQU8sQ0FBQyxjQUFELENBQTFCOztBQUNBSSxPQUFPLENBQUNDLEdBQVIsQ0FBWUMsa0JBQVosR0FBaUMsR0FBakM7QUFDQUYsT0FBTyxDQUFDQyxHQUFSLENBQVlFLGtCQUFaLEdBQWlDTCxXQUFXLENBQUNLLGtCQUFaLENBQStCQyxRQUEvQixFQUFqQyxDLENBQ0E7QUFDQTtBQUNBOztBQUNBLE1BQU1DLElBQUksR0FBR1IsYUFBYSxDQUFDUywwQkFBZCxHQUEyQyxPQUEzQyxHQUFxRFgsU0FBbEU7QUFDQSxNQUFNWSxlQUFlLEdBQUdQLE9BQU8sQ0FBQ0MsR0FBUixDQUFZTyxpQkFBcEMsQyxDQUNBO0FBQ0E7QUFDQTs7QUFDQSxNQUFNQyxPQUFPLEdBQUc7QUFDWkMsRUFBQUEsRUFBRSxFQUFFLEtBRFE7QUFFWkMsRUFBQUEsU0FBUyxFQUFFLElBRkM7QUFHWkMsRUFBQUEsT0FBTyxFQUFFLEtBSEc7QUFJWkMsRUFBQUEsT0FBTyxFQUFFLENBSkc7QUFLWlIsRUFBQUEsSUFMWTtBQU1aRSxFQUFBQTtBQU5ZLENBQWhCLEMsQ0FRQTs7QUFDQSxJQUFJVixhQUFhLENBQUNpQixPQUFsQixFQUEyQjtBQUN2QkwsRUFBQUEsT0FBTyxDQUFDRSxTQUFSLEdBQW9CLEtBQXBCO0FBQ0gsQyxDQUNEO0FBQ0E7QUFDQTs7O0FBQ0EsSUFBSWQsYUFBYSxDQUFDa0Isb0JBQWxCLEVBQXdDO0FBQ3BDTixFQUFBQSxPQUFPLENBQUNPLFFBQVIsR0FBbUJuQixhQUFhLENBQUNvQixvQkFBakM7QUFDQVIsRUFBQUEsT0FBTyxDQUFDUyxlQUFSLEdBQTBCO0FBQ3RCQyxJQUFBQSxTQUFTLEVBQUV0QixhQUFhLENBQUN1QixtQkFESDtBQUV0QkMsSUFBQUEsVUFBVSxFQUFFeEIsYUFBYSxDQUFDeUI7QUFGSixHQUExQjtBQUlIOztBQUNEdEIsT0FBTyxDQUFDdUIsRUFBUixDQUFXLG9CQUFYLEVBQWlDLENBQUNDLEVBQUQsRUFBS0MsQ0FBTCxLQUFXO0FBQ3hDLFFBQU1DLE9BQU8sR0FBRyxDQUFFLEdBQUVGLEVBQUcsRUFBUCxDQUFoQjs7QUFDQSxNQUFJLE9BQU9BLEVBQVAsS0FBYyxRQUFkLElBQTBCQSxFQUExQixJQUFnQ0EsRUFBRSxDQUFDRSxPQUF2QyxFQUFnRDtBQUM1Q0EsSUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWFILEVBQUUsQ0FBQ0ksSUFBaEI7QUFDQUYsSUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWFILEVBQUUsQ0FBQ0UsT0FBaEI7O0FBQ0EsUUFBSUYsRUFBRSxDQUFDSyxLQUFQLEVBQWM7QUFDVkgsTUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWFILEVBQUUsQ0FBQ0ssS0FBaEI7QUFDSDtBQUNKOztBQUNEQyxFQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBZSxnREFBK0NMLE9BQU8sQ0FBQ00sSUFBUixDQUFhLElBQWIsQ0FBbUIsRUFBakY7QUFDSCxDQVZEO0FBV0FqQyxVQUFVLENBQUNrQyxTQUFYLENBQXFCeEIsT0FBckIsRUFBOEI7QUFBRXlCLEVBQUFBLGNBQWMsRUFBRTtBQUFsQixDQUE5QjtBQUNBQyxNQUFNLENBQUM1QyxPQUFQLEdBQWlCUSxVQUFqQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbid1c2Ugc3RyaWN0JztcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbmlmIChSZWZsZWN0Lm1ldGFkYXRhID09PSB1bmRlZmluZWQpIHtcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1yZXF1aXJlLWltcG9ydHMgbm8tdmFyLXJlcXVpcmVzXHJcbiAgICByZXF1aXJlKCdyZWZsZWN0LW1ldGFkYXRhJyk7XHJcbn1cclxuY29uc3QgY2lDb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NpQ29uc3RhbnRzXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3QgdGVzdFJ1bm5lciA9IHJlcXVpcmUoXCIuL3Rlc3RSdW5uZXJcIik7XHJcbnByb2Nlc3MuZW52LlZTQ19QWVRIT05fQ0lfVEVTVCA9ICcxJztcclxucHJvY2Vzcy5lbnYuSVNfTVVMVElfUk9PVF9URVNUID0gY29uc3RhbnRzXzEuSVNfTVVMVElfUk9PVF9URVNULnRvU3RyaW5nKCk7XHJcbi8vIElmIHJ1bm5pbmcgb24gQ0kgc2VydmVyIGFuZCB3ZSdyZSBydW5uaW5nIHRoZSBkZWJ1Z2dlciB0ZXN0cywgdGhlbiBlbnN1cmUgd2Ugb25seSBydW4gZGVidWcgdGVzdHMuXHJcbi8vIFdlIGRvIHRoaXMgdG8gZW5zdXJlIHdlIG9ubHkgcnVuIGRlYnVnZ2VyIHRlc3QsIGFzIGRlYnVnZ2VyIHRlc3RzIGFyZSB2ZXJ5IGZsYWt5IG9uIENJLlxyXG4vLyBTbyB0aGUgc29sdXRpb24gaXMgdG8gcnVuIHRoZW0gc2VwYXJhdGVseSBhbmQgZmlyc3Qgb24gQ0kuXHJcbmNvbnN0IGdyZXAgPSBjaUNvbnN0YW50c18xLklTX0NJX1NFUlZFUl9URVNUX0RFQlVHR0VSID8gJ0RlYnVnJyA6IHVuZGVmaW5lZDtcclxuY29uc3QgdGVzdEZpbGVzU3VmZml4ID0gcHJvY2Vzcy5lbnYuVEVTVF9GSUxFU19TVUZGSVg7XHJcbi8vIFlvdSBjYW4gZGlyZWN0bHkgY29udHJvbCBNb2NoYSBvcHRpb25zIGJ5IHVuY29tbWVudGluZyB0aGUgZm9sbG93aW5nIGxpbmVzLlxyXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21vY2hhanMvbW9jaGEvd2lraS9Vc2luZy1tb2NoYS1wcm9ncmFtbWF0aWNhbGx5I3NldC1vcHRpb25zIGZvciBtb3JlIGluZm8uXHJcbi8vIEhhY2ssIGFzIHJldHJpZXMgaXMgbm90IHN1cHBvcnRlZCBhcyBzZXR0aW5nIGluIHRzZC5cclxuY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgIHVpOiAndGRkJyxcclxuICAgIHVzZUNvbG9yczogdHJ1ZSxcclxuICAgIHRpbWVvdXQ6IDI1MDAwLFxyXG4gICAgcmV0cmllczogMyxcclxuICAgIGdyZXAsXHJcbiAgICB0ZXN0RmlsZXNTdWZmaXhcclxufTtcclxuLy8gVlNUUyBDSSBkb2Vzbid0IGRpc3BsYXkgY29sb3VycyBjb3JyZWN0bHkgKHlldCkuXHJcbmlmIChjaUNvbnN0YW50c18xLklTX1ZTVFMpIHtcclxuICAgIG9wdGlvbnMudXNlQ29sb3JzID0gZmFsc2U7XHJcbn1cclxuLy8gQ0kgY2FuIGFzayBmb3IgYSBKVW5pdCByZXBvcnRlciBpZiB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVcclxuLy8gJ01PQ0hBX1JFUE9SVEVSX0pVTklUJyBpcyBkZWZpbmVkLCBmdXJ0aGVyIGNvbnRyb2wgaXMgYWZmb3JkZWRcclxuLy8gYnkgb3RoZXIgJ01PQ0hBX0NJXy4uLicgdmFyaWFibGVzLiBTZWUgY29uc3RhbnRzLnRzIGZvciBpbmZvLlxyXG5pZiAoY2lDb25zdGFudHNfMS5NT0NIQV9SRVBPUlRFUl9KVU5JVCkge1xyXG4gICAgb3B0aW9ucy5yZXBvcnRlciA9IGNpQ29uc3RhbnRzXzEuTU9DSEFfQ0lfUkVQT1JURVJfSUQ7XHJcbiAgICBvcHRpb25zLnJlcG9ydGVyT3B0aW9ucyA9IHtcclxuICAgICAgICBtb2NoYUZpbGU6IGNpQ29uc3RhbnRzXzEuTU9DSEFfQ0lfUkVQT1JURklMRSxcclxuICAgICAgICBwcm9wZXJ0aWVzOiBjaUNvbnN0YW50c18xLk1PQ0hBX0NJX1BST1BFUlRJRVNcclxuICAgIH07XHJcbn1cclxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgKGV4LCBhKSA9PiB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gW2Ake2V4fWBdO1xyXG4gICAgaWYgKHR5cGVvZiBleCAhPT0gJ3N0cmluZycgJiYgZXggJiYgZXgubWVzc2FnZSkge1xyXG4gICAgICAgIG1lc3NhZ2UucHVzaChleC5uYW1lKTtcclxuICAgICAgICBtZXNzYWdlLnB1c2goZXgubWVzc2FnZSk7XHJcbiAgICAgICAgaWYgKGV4LnN0YWNrKSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UucHVzaChleC5zdGFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5lcnJvcihgVW5oYW5kbGVkIFByb21pc2UgUmVqZWN0aW9uIHdpdGggdGhlIG1lc3NhZ2UgJHttZXNzYWdlLmpvaW4oJywgJyl9YCk7XHJcbn0pO1xyXG50ZXN0UnVubmVyLmNvbmZpZ3VyZShvcHRpb25zLCB7IGNvdmVyYWdlQ29uZmlnOiAnLi4vY292ZXJjb25maWcuanNvbicgfSk7XHJcbm1vZHVsZS5leHBvcnRzID0gdGVzdFJ1bm5lcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIl19