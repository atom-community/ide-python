"use strict"; // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

Object.defineProperty(exports, "__esModule", {
  value: true
});

const helper_1 = require("./helper");

const types_1 = require("./types");

function registerTypes(serviceManager) {
  serviceManager.addSingleton(types_1.IFormatterHelper, helper_1.FormatterHelper);
}

exports.registerTypes = registerTypes;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNlcnZpY2VSZWdpc3RyeS5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImhlbHBlcl8xIiwicmVxdWlyZSIsInR5cGVzXzEiLCJyZWdpc3RlclR5cGVzIiwic2VydmljZU1hbmFnZXIiLCJhZGRTaW5nbGV0b24iLCJJRm9ybWF0dGVySGVscGVyIiwiRm9ybWF0dGVySGVscGVyIl0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxRQUFRLEdBQUdDLE9BQU8sQ0FBQyxVQUFELENBQXhCOztBQUNBLE1BQU1DLE9BQU8sR0FBR0QsT0FBTyxDQUFDLFNBQUQsQ0FBdkI7O0FBQ0EsU0FBU0UsYUFBVCxDQUF1QkMsY0FBdkIsRUFBdUM7QUFDbkNBLEVBQUFBLGNBQWMsQ0FBQ0MsWUFBZixDQUE0QkgsT0FBTyxDQUFDSSxnQkFBcEMsRUFBc0ROLFFBQVEsQ0FBQ08sZUFBL0Q7QUFDSDs7QUFDRFQsT0FBTyxDQUFDSyxhQUFSLEdBQXdCQSxhQUF4QiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBoZWxwZXJfMSA9IHJlcXVpcmUoXCIuL2hlbHBlclwiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi90eXBlc1wiKTtcbmZ1bmN0aW9uIHJlZ2lzdGVyVHlwZXMoc2VydmljZU1hbmFnZXIpIHtcbiAgICBzZXJ2aWNlTWFuYWdlci5hZGRTaW5nbGV0b24odHlwZXNfMS5JRm9ybWF0dGVySGVscGVyLCBoZWxwZXJfMS5Gb3JtYXR0ZXJIZWxwZXIpO1xufVxuZXhwb3J0cy5yZWdpc3RlclR5cGVzID0gcmVnaXN0ZXJUeXBlcztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNlcnZpY2VSZWdpc3RyeS5qcy5tYXAiXX0=