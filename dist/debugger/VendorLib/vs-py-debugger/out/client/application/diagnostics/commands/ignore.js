// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

const types_1 = require("../types");

const base_1 = require("./base");

class IgnoreDiagnosticCommand extends base_1.BaseDiagnosticCommand {
  constructor(diagnostic, serviceContainer, scope) {
    super(diagnostic);
    this.serviceContainer = serviceContainer;
    this.scope = scope;
  }

  invoke() {
    const filter = this.serviceContainer.get(types_1.IDiagnosticFilterService);
    return filter.ignoreDiagnostic(this.diagnostic.code, this.scope);
  }

}

exports.IgnoreDiagnosticCommand = IgnoreDiagnosticCommand;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlnbm9yZS5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsInR5cGVzXzEiLCJyZXF1aXJlIiwiYmFzZV8xIiwiSWdub3JlRGlhZ25vc3RpY0NvbW1hbmQiLCJCYXNlRGlhZ25vc3RpY0NvbW1hbmQiLCJjb25zdHJ1Y3RvciIsImRpYWdub3N0aWMiLCJzZXJ2aWNlQ29udGFpbmVyIiwic2NvcGUiLCJpbnZva2UiLCJmaWx0ZXIiLCJnZXQiLCJJRGlhZ25vc3RpY0ZpbHRlclNlcnZpY2UiLCJpZ25vcmVEaWFnbm9zdGljIiwiY29kZSJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0FBQUVDLEVBQUFBLEtBQUssRUFBRTtBQUFULENBQTdDOztBQUNBLE1BQU1DLE9BQU8sR0FBR0MsT0FBTyxDQUFDLFVBQUQsQ0FBdkI7O0FBQ0EsTUFBTUMsTUFBTSxHQUFHRCxPQUFPLENBQUMsUUFBRCxDQUF0Qjs7QUFDQSxNQUFNRSx1QkFBTixTQUFzQ0QsTUFBTSxDQUFDRSxxQkFBN0MsQ0FBbUU7QUFDL0RDLEVBQUFBLFdBQVcsQ0FBQ0MsVUFBRCxFQUFhQyxnQkFBYixFQUErQkMsS0FBL0IsRUFBc0M7QUFDN0MsVUFBTUYsVUFBTjtBQUNBLFNBQUtDLGdCQUFMLEdBQXdCQSxnQkFBeEI7QUFDQSxTQUFLQyxLQUFMLEdBQWFBLEtBQWI7QUFDSDs7QUFDREMsRUFBQUEsTUFBTSxHQUFHO0FBQ0wsVUFBTUMsTUFBTSxHQUFHLEtBQUtILGdCQUFMLENBQXNCSSxHQUF0QixDQUEwQlgsT0FBTyxDQUFDWSx3QkFBbEMsQ0FBZjtBQUNBLFdBQU9GLE1BQU0sQ0FBQ0csZ0JBQVAsQ0FBd0IsS0FBS1AsVUFBTCxDQUFnQlEsSUFBeEMsRUFBOEMsS0FBS04sS0FBbkQsQ0FBUDtBQUNIOztBQVQ4RDs7QUFXbkVWLE9BQU8sQ0FBQ0ssdUJBQVIsR0FBa0NBLHVCQUFsQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuJ3VzZSBzdHJpY3QnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi90eXBlc1wiKTtcbmNvbnN0IGJhc2VfMSA9IHJlcXVpcmUoXCIuL2Jhc2VcIik7XG5jbGFzcyBJZ25vcmVEaWFnbm9zdGljQ29tbWFuZCBleHRlbmRzIGJhc2VfMS5CYXNlRGlhZ25vc3RpY0NvbW1hbmQge1xuICAgIGNvbnN0cnVjdG9yKGRpYWdub3N0aWMsIHNlcnZpY2VDb250YWluZXIsIHNjb3BlKSB7XG4gICAgICAgIHN1cGVyKGRpYWdub3N0aWMpO1xuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIgPSBzZXJ2aWNlQ29udGFpbmVyO1xuICAgICAgICB0aGlzLnNjb3BlID0gc2NvcGU7XG4gICAgfVxuICAgIGludm9rZSgpIHtcbiAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklEaWFnbm9zdGljRmlsdGVyU2VydmljZSk7XG4gICAgICAgIHJldHVybiBmaWx0ZXIuaWdub3JlRGlhZ25vc3RpYyh0aGlzLmRpYWdub3N0aWMuY29kZSwgdGhpcy5zY29wZSk7XG4gICAgfVxufVxuZXhwb3J0cy5JZ25vcmVEaWFnbm9zdGljQ29tbWFuZCA9IElnbm9yZURpYWdub3N0aWNDb21tYW5kO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aWdub3JlLmpzLm1hcCJdfQ==