"use strict"; // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

Object.defineProperty(exports, "__esModule", {
  value: true
});

const types_1 = require("../../common/types");

class BaseErrorHandler {
  constructor(product, outputChannel, serviceContainer) {
    this.product = product;
    this.outputChannel = outputChannel;
    this.serviceContainer = serviceContainer;
    this.logger = this.serviceContainer.get(types_1.ILogger);
    this.installer = this.serviceContainer.get(types_1.IInstaller);
  }

  get nextHandler() {
    return this.handler;
  }

  setNextHandler(handler) {
    this.handler = handler;
  }

}

exports.BaseErrorHandler = BaseErrorHandler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJhc2VFcnJvckhhbmRsZXIuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJ0eXBlc18xIiwicmVxdWlyZSIsIkJhc2VFcnJvckhhbmRsZXIiLCJjb25zdHJ1Y3RvciIsInByb2R1Y3QiLCJvdXRwdXRDaGFubmVsIiwic2VydmljZUNvbnRhaW5lciIsImxvZ2dlciIsImdldCIsIklMb2dnZXIiLCJpbnN0YWxsZXIiLCJJSW5zdGFsbGVyIiwibmV4dEhhbmRsZXIiLCJoYW5kbGVyIiwic2V0TmV4dEhhbmRsZXIiXSwibWFwcGluZ3MiOiJBQUFBLGEsQ0FDQTtBQUNBOztBQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0FBQUVDLEVBQUFBLEtBQUssRUFBRTtBQUFULENBQTdDOztBQUNBLE1BQU1DLE9BQU8sR0FBR0MsT0FBTyxDQUFDLG9CQUFELENBQXZCOztBQUNBLE1BQU1DLGdCQUFOLENBQXVCO0FBQ25CQyxFQUFBQSxXQUFXLENBQUNDLE9BQUQsRUFBVUMsYUFBVixFQUF5QkMsZ0JBQXpCLEVBQTJDO0FBQ2xELFNBQUtGLE9BQUwsR0FBZUEsT0FBZjtBQUNBLFNBQUtDLGFBQUwsR0FBcUJBLGFBQXJCO0FBQ0EsU0FBS0MsZ0JBQUwsR0FBd0JBLGdCQUF4QjtBQUNBLFNBQUtDLE1BQUwsR0FBYyxLQUFLRCxnQkFBTCxDQUFzQkUsR0FBdEIsQ0FBMEJSLE9BQU8sQ0FBQ1MsT0FBbEMsQ0FBZDtBQUNBLFNBQUtDLFNBQUwsR0FBaUIsS0FBS0osZ0JBQUwsQ0FBc0JFLEdBQXRCLENBQTBCUixPQUFPLENBQUNXLFVBQWxDLENBQWpCO0FBQ0g7O0FBQ0QsTUFBSUMsV0FBSixHQUFrQjtBQUNkLFdBQU8sS0FBS0MsT0FBWjtBQUNIOztBQUNEQyxFQUFBQSxjQUFjLENBQUNELE9BQUQsRUFBVTtBQUNwQixTQUFLQSxPQUFMLEdBQWVBLE9BQWY7QUFDSDs7QUFia0I7O0FBZXZCZixPQUFPLENBQUNJLGdCQUFSLEdBQTJCQSxnQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi90eXBlc1wiKTtcclxuY2xhc3MgQmFzZUVycm9ySGFuZGxlciB7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcm9kdWN0LCBvdXRwdXRDaGFubmVsLCBzZXJ2aWNlQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdGhpcy5wcm9kdWN0ID0gcHJvZHVjdDtcclxuICAgICAgICB0aGlzLm91dHB1dENoYW5uZWwgPSBvdXRwdXRDaGFubmVsO1xyXG4gICAgICAgIHRoaXMuc2VydmljZUNvbnRhaW5lciA9IHNlcnZpY2VDb250YWluZXI7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUxvZ2dlcik7XHJcbiAgICAgICAgdGhpcy5pbnN0YWxsZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUluc3RhbGxlcik7XHJcbiAgICB9XHJcbiAgICBnZXQgbmV4dEhhbmRsZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlcjtcclxuICAgIH1cclxuICAgIHNldE5leHRIYW5kbGVyKGhhbmRsZXIpIHtcclxuICAgICAgICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQmFzZUVycm9ySGFuZGxlciA9IEJhc2VFcnJvckhhbmRsZXI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWJhc2VFcnJvckhhbmRsZXIuanMubWFwIl19