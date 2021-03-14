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

const vscode = require("vscode");

const productInstaller_1 = require("../common/installer/productInstaller");

const types_1 = require("../common/types");

const stopWatch_1 = require("../common/utils/stopWatch");

const telemetry_1 = require("../telemetry");

const constants_1 = require("../telemetry/constants");

const baseFormatter_1 = require("./baseFormatter");

class BlackFormatter extends baseFormatter_1.BaseFormatter {
  constructor(serviceContainer) {
    super('black', productInstaller_1.Product.black, serviceContainer);
  }

  formatDocument(document, options, token, range) {
    const stopWatch = new stopWatch_1.StopWatch();
    const settings = this.serviceContainer.get(types_1.IConfigurationService).getSettings(document.uri);
    const hasCustomArgs = Array.isArray(settings.formatting.blackArgs) && settings.formatting.blackArgs.length > 0;
    const formatSelection = range ? !range.isEmpty : false;

    if (formatSelection) {
      const errorMessage = () => __awaiter(this, void 0, void 0, function* () {
        // Black does not support partial formatting on purpose.
        yield vscode.window.showErrorMessage('Black does not support the "Format Selection" command');
        return [];
      });

      return errorMessage();
    }

    const blackArgs = ['--diff', '--quiet'];
    const promise = super.provideDocumentFormattingEdits(document, options, token, blackArgs);
    telemetry_1.sendTelemetryWhenDone(constants_1.FORMAT, promise, stopWatch, {
      tool: 'black',
      hasCustomArgs,
      formatSelection
    });
    return promise;
  }

}

exports.BlackFormatter = BlackFormatter;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJsYWNrRm9ybWF0dGVyLmpzIl0sIm5hbWVzIjpbIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2c2NvZGUiLCJyZXF1aXJlIiwicHJvZHVjdEluc3RhbGxlcl8xIiwidHlwZXNfMSIsInN0b3BXYXRjaF8xIiwidGVsZW1ldHJ5XzEiLCJjb25zdGFudHNfMSIsImJhc2VGb3JtYXR0ZXJfMSIsIkJsYWNrRm9ybWF0dGVyIiwiQmFzZUZvcm1hdHRlciIsImNvbnN0cnVjdG9yIiwic2VydmljZUNvbnRhaW5lciIsIlByb2R1Y3QiLCJibGFjayIsImZvcm1hdERvY3VtZW50IiwiZG9jdW1lbnQiLCJvcHRpb25zIiwidG9rZW4iLCJyYW5nZSIsInN0b3BXYXRjaCIsIlN0b3BXYXRjaCIsInNldHRpbmdzIiwiZ2V0IiwiSUNvbmZpZ3VyYXRpb25TZXJ2aWNlIiwiZ2V0U2V0dGluZ3MiLCJ1cmkiLCJoYXNDdXN0b21BcmdzIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9ybWF0dGluZyIsImJsYWNrQXJncyIsImxlbmd0aCIsImZvcm1hdFNlbGVjdGlvbiIsImlzRW1wdHkiLCJlcnJvck1lc3NhZ2UiLCJ3aW5kb3ciLCJzaG93RXJyb3JNZXNzYWdlIiwicHJvbWlzZSIsInByb3ZpZGVEb2N1bWVudEZvcm1hdHRpbmdFZGl0cyIsInNlbmRUZWxlbWV0cnlXaGVuRG9uZSIsIkZPUk1BVCIsInRvb2wiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQSxJQUFJQSxTQUFTLEdBQUksVUFBUSxTQUFLQSxTQUFkLElBQTRCLFVBQVVDLE9BQVYsRUFBbUJDLFVBQW5C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TUFBOUIsR0FBdUMsQ0FBN0c7QUFDQSxVQUFNQyxlQUFlLEdBQUdkLEtBQUssR0FBRyxDQUFDQSxLQUFLLENBQUNlLE9BQVYsR0FBb0IsS0FBakQ7O0FBQ0EsUUFBSUQsZUFBSixFQUFxQjtBQUNqQixZQUFNRSxZQUFZLEdBQUcsTUFBTXZELFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ3BFO0FBQ0EsY0FBTXFCLE1BQU0sQ0FBQ21DLE1BQVAsQ0FBY0MsZ0JBQWQsQ0FBK0IsdURBQS9CLENBQU47QUFDQSxlQUFPLEVBQVA7QUFDSCxPQUptQyxDQUFwQzs7QUFLQSxhQUFPRixZQUFZLEVBQW5CO0FBQ0g7O0FBQ0QsVUFBTUosU0FBUyxHQUFHLENBQUMsUUFBRCxFQUFXLFNBQVgsQ0FBbEI7QUFDQSxVQUFNTyxPQUFPLEdBQUcsTUFBTUMsOEJBQU4sQ0FBcUN2QixRQUFyQyxFQUErQ0MsT0FBL0MsRUFBd0RDLEtBQXhELEVBQStEYSxTQUEvRCxDQUFoQjtBQUNBekIsSUFBQUEsV0FBVyxDQUFDa0MscUJBQVosQ0FBa0NqQyxXQUFXLENBQUNrQyxNQUE5QyxFQUFzREgsT0FBdEQsRUFBK0RsQixTQUEvRCxFQUEwRTtBQUFFc0IsTUFBQUEsSUFBSSxFQUFFLE9BQVI7QUFBaUJmLE1BQUFBLGFBQWpCO0FBQWdDTSxNQUFBQTtBQUFoQyxLQUExRTtBQUNBLFdBQU9LLE9BQVA7QUFDSDs7QUFyQnNEOztBQXVCM0R0QyxPQUFPLENBQUNTLGNBQVIsR0FBeUJBLGNBQXpCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4ndXNlIHN0cmljdCc7XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IHZzY29kZSA9IHJlcXVpcmUoXCJ2c2NvZGVcIik7XG5jb25zdCBwcm9kdWN0SW5zdGFsbGVyXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2luc3RhbGxlci9wcm9kdWN0SW5zdGFsbGVyXCIpO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdHlwZXNcIik7XG5jb25zdCBzdG9wV2F0Y2hfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHMvc3RvcFdhdGNoXCIpO1xuY29uc3QgdGVsZW1ldHJ5XzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5XCIpO1xuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vdGVsZW1ldHJ5L2NvbnN0YW50c1wiKTtcbmNvbnN0IGJhc2VGb3JtYXR0ZXJfMSA9IHJlcXVpcmUoXCIuL2Jhc2VGb3JtYXR0ZXJcIik7XG5jbGFzcyBCbGFja0Zvcm1hdHRlciBleHRlbmRzIGJhc2VGb3JtYXR0ZXJfMS5CYXNlRm9ybWF0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlQ29udGFpbmVyKSB7XG4gICAgICAgIHN1cGVyKCdibGFjaycsIHByb2R1Y3RJbnN0YWxsZXJfMS5Qcm9kdWN0LmJsYWNrLCBzZXJ2aWNlQ29udGFpbmVyKTtcbiAgICB9XG4gICAgZm9ybWF0RG9jdW1lbnQoZG9jdW1lbnQsIG9wdGlvbnMsIHRva2VuLCByYW5nZSkge1xuICAgICAgICBjb25zdCBzdG9wV2F0Y2ggPSBuZXcgc3RvcFdhdGNoXzEuU3RvcFdhdGNoKCk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklDb25maWd1cmF0aW9uU2VydmljZSkuZ2V0U2V0dGluZ3MoZG9jdW1lbnQudXJpKTtcbiAgICAgICAgY29uc3QgaGFzQ3VzdG9tQXJncyA9IEFycmF5LmlzQXJyYXkoc2V0dGluZ3MuZm9ybWF0dGluZy5ibGFja0FyZ3MpICYmIHNldHRpbmdzLmZvcm1hdHRpbmcuYmxhY2tBcmdzLmxlbmd0aCA+IDA7XG4gICAgICAgIGNvbnN0IGZvcm1hdFNlbGVjdGlvbiA9IHJhbmdlID8gIXJhbmdlLmlzRW1wdHkgOiBmYWxzZTtcbiAgICAgICAgaWYgKGZvcm1hdFNlbGVjdGlvbikge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gKCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIC8vIEJsYWNrIGRvZXMgbm90IHN1cHBvcnQgcGFydGlhbCBmb3JtYXR0aW5nIG9uIHB1cnBvc2UuXG4gICAgICAgICAgICAgICAgeWllbGQgdnNjb2RlLndpbmRvdy5zaG93RXJyb3JNZXNzYWdlKCdCbGFjayBkb2VzIG5vdCBzdXBwb3J0IHRoZSBcIkZvcm1hdCBTZWxlY3Rpb25cIiBjb21tYW5kJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JNZXNzYWdlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmxhY2tBcmdzID0gWyctLWRpZmYnLCAnLS1xdWlldCddO1xuICAgICAgICBjb25zdCBwcm9taXNlID0gc3VwZXIucHJvdmlkZURvY3VtZW50Rm9ybWF0dGluZ0VkaXRzKGRvY3VtZW50LCBvcHRpb25zLCB0b2tlbiwgYmxhY2tBcmdzKTtcbiAgICAgICAgdGVsZW1ldHJ5XzEuc2VuZFRlbGVtZXRyeVdoZW5Eb25lKGNvbnN0YW50c18xLkZPUk1BVCwgcHJvbWlzZSwgc3RvcFdhdGNoLCB7IHRvb2w6ICdibGFjaycsIGhhc0N1c3RvbUFyZ3MsIGZvcm1hdFNlbGVjdGlvbiB9KTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxufVxuZXhwb3J0cy5CbGFja0Zvcm1hdHRlciA9IEJsYWNrRm9ybWF0dGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YmxhY2tGb3JtYXR0ZXIuanMubWFwIl19