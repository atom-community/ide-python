// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

const Prism = require("prismjs");

const React = require("react");

const transforms_1 = require("./transforms"); // Borrowed this from the prism stuff. Simpler than trying to
// get loadLanguages to behave with webpack. Does mean we might get out of date though.


const pythonGrammar = {
  // tslint:disable-next-line:object-literal-key-quotes
  'comment': {
    pattern: /(^|[^\\])#.*/,
    lookbehind: true
  },
  // tslint:disable-next-line:object-literal-key-quotes
  'triple-quoted-string': {
    pattern: /("""|''')[\s\S]+?\1/,
    greedy: true,
    alias: 'string'
  },
  // tslint:disable-next-line:object-literal-key-quotes
  'string': {
    pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,
    greedy: true
  },
  // tslint:disable-next-line:object-literal-key-quotes
  'function': {
    pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
    lookbehind: true
  },
  // tslint:disable-next-line:object-literal-key-quotes
  'class-name': {
    pattern: /(\bclass\s+)\w+/i,
    lookbehind: true
  },
  // tslint:disable-next-line:object-literal-key-quotes
  'keyword': /\b(?:as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|nonlocal|pass|print|raise|return|try|while|with|yield)\b/,
  // tslint:disable-next-line:object-literal-key-quotes
  'builtin': /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
  // tslint:disable-next-line:object-literal-key-quotes
  'boolean': /\b(?:True|False|None)\b/,
  // tslint:disable-next-line:object-literal-key-quotes
  'number': /(?:\b(?=\d)|\B(?=\.))(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
  // tslint:disable-next-line:object-literal-key-quotes
  'operator': /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]|\b(?:or|and|not)\b/,
  // tslint:disable-next-line:object-literal-key-quotes
  'punctuation': /[{}[\];(),.:]/
};

class Code extends React.Component {
  constructor(prop) {
    super(prop);
  }

  render() {
    const colorized = Prism.highlight(this.props.code, pythonGrammar);
    const Transform = transforms_1.transforms['text/html'];
    return React.createElement("pre", null, React.createElement("code", {
      className: 'language-python'
    }, React.createElement(Transform, {
      data: colorized
    })));
  }

}

exports.Code = Code;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvZGUuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJQcmlzbSIsInJlcXVpcmUiLCJSZWFjdCIsInRyYW5zZm9ybXNfMSIsInB5dGhvbkdyYW1tYXIiLCJwYXR0ZXJuIiwibG9va2JlaGluZCIsImdyZWVkeSIsImFsaWFzIiwiQ29kZSIsIkNvbXBvbmVudCIsImNvbnN0cnVjdG9yIiwicHJvcCIsInJlbmRlciIsImNvbG9yaXplZCIsImhpZ2hsaWdodCIsInByb3BzIiwiY29kZSIsIlRyYW5zZm9ybSIsInRyYW5zZm9ybXMiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NOYW1lIiwiZGF0YSJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0FBQUVDLEVBQUFBLEtBQUssRUFBRTtBQUFULENBQTdDOztBQUNBLE1BQU1DLEtBQUssR0FBR0MsT0FBTyxDQUFDLFNBQUQsQ0FBckI7O0FBQ0EsTUFBTUMsS0FBSyxHQUFHRCxPQUFPLENBQUMsT0FBRCxDQUFyQjs7QUFDQSxNQUFNRSxZQUFZLEdBQUdGLE9BQU8sQ0FBQyxjQUFELENBQTVCLEMsQ0FDQTtBQUNBOzs7QUFDQSxNQUFNRyxhQUFhLEdBQUc7QUFDbEI7QUFDQSxhQUFXO0FBQ1BDLElBQUFBLE9BQU8sRUFBRSxjQURGO0FBRVBDLElBQUFBLFVBQVUsRUFBRTtBQUZMLEdBRk87QUFNbEI7QUFDQSwwQkFBd0I7QUFDcEJELElBQUFBLE9BQU8sRUFBRSxxQkFEVztBQUVwQkUsSUFBQUEsTUFBTSxFQUFFLElBRlk7QUFHcEJDLElBQUFBLEtBQUssRUFBRTtBQUhhLEdBUE47QUFZbEI7QUFDQSxZQUFVO0FBQ05ILElBQUFBLE9BQU8sRUFBRSxpQ0FESDtBQUVORSxJQUFBQSxNQUFNLEVBQUU7QUFGRixHQWJRO0FBaUJsQjtBQUNBLGNBQVk7QUFDUkYsSUFBQUEsT0FBTyxFQUFFLDJDQUREO0FBRVJDLElBQUFBLFVBQVUsRUFBRTtBQUZKLEdBbEJNO0FBc0JsQjtBQUNBLGdCQUFjO0FBQ1ZELElBQUFBLE9BQU8sRUFBRSxrQkFEQztBQUVWQyxJQUFBQSxVQUFVLEVBQUU7QUFGRixHQXZCSTtBQTJCbEI7QUFDQSxhQUFXLHVMQTVCTztBQTZCbEI7QUFDQSxhQUFXLHFoQkE5Qk87QUErQmxCO0FBQ0EsYUFBVyx5QkFoQ087QUFpQ2xCO0FBQ0EsWUFBVSw0RkFsQ1E7QUFtQ2xCO0FBQ0EsY0FBWSxzRUFwQ007QUFxQ2xCO0FBQ0EsaUJBQWU7QUF0Q0csQ0FBdEI7O0FBd0NBLE1BQU1HLElBQU4sU0FBbUJQLEtBQUssQ0FBQ1EsU0FBekIsQ0FBbUM7QUFDL0JDLEVBQUFBLFdBQVcsQ0FBQ0MsSUFBRCxFQUFPO0FBQ2QsVUFBTUEsSUFBTjtBQUNIOztBQUNEQyxFQUFBQSxNQUFNLEdBQUc7QUFDTCxVQUFNQyxTQUFTLEdBQUdkLEtBQUssQ0FBQ2UsU0FBTixDQUFnQixLQUFLQyxLQUFMLENBQVdDLElBQTNCLEVBQWlDYixhQUFqQyxDQUFsQjtBQUNBLFVBQU1jLFNBQVMsR0FBR2YsWUFBWSxDQUFDZ0IsVUFBYixDQUF3QixXQUF4QixDQUFsQjtBQUNBLFdBQVFqQixLQUFLLENBQUNrQixhQUFOLENBQW9CLEtBQXBCLEVBQTJCLElBQTNCLEVBQ0psQixLQUFLLENBQUNrQixhQUFOLENBQW9CLE1BQXBCLEVBQTRCO0FBQUVDLE1BQUFBLFNBQVMsRUFBRTtBQUFiLEtBQTVCLEVBQ0luQixLQUFLLENBQUNrQixhQUFOLENBQW9CRixTQUFwQixFQUErQjtBQUFFSSxNQUFBQSxJQUFJLEVBQUVSO0FBQVIsS0FBL0IsQ0FESixDQURJLENBQVI7QUFHSDs7QUFWOEI7O0FBWW5DaEIsT0FBTyxDQUFDVyxJQUFSLEdBQWVBLElBQWYiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgUHJpc20gPSByZXF1aXJlKFwicHJpc21qc1wiKTtcclxuY29uc3QgUmVhY3QgPSByZXF1aXJlKFwicmVhY3RcIik7XHJcbmNvbnN0IHRyYW5zZm9ybXNfMSA9IHJlcXVpcmUoXCIuL3RyYW5zZm9ybXNcIik7XHJcbi8vIEJvcnJvd2VkIHRoaXMgZnJvbSB0aGUgcHJpc20gc3R1ZmYuIFNpbXBsZXIgdGhhbiB0cnlpbmcgdG9cclxuLy8gZ2V0IGxvYWRMYW5ndWFnZXMgdG8gYmVoYXZlIHdpdGggd2VicGFjay4gRG9lcyBtZWFuIHdlIG1pZ2h0IGdldCBvdXQgb2YgZGF0ZSB0aG91Z2guXHJcbmNvbnN0IHB5dGhvbkdyYW1tYXIgPSB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6b2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xyXG4gICAgJ2NvbW1lbnQnOiB7XHJcbiAgICAgICAgcGF0dGVybjogLyhefFteXFxcXF0pIy4qLyxcclxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcclxuICAgICd0cmlwbGUtcXVvdGVkLXN0cmluZyc6IHtcclxuICAgICAgICBwYXR0ZXJuOiAvKFwiXCJcInwnJycpW1xcc1xcU10rP1xcMS8sXHJcbiAgICAgICAgZ3JlZWR5OiB0cnVlLFxyXG4gICAgICAgIGFsaWFzOiAnc3RyaW5nJ1xyXG4gICAgfSxcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXHJcbiAgICAnc3RyaW5nJzoge1xyXG4gICAgICAgIHBhdHRlcm46IC8oXCJ8JykoPzpcXFxcLnwoPyFcXDEpW15cXFxcXFxyXFxuXSkqXFwxLyxcclxuICAgICAgICBncmVlZHk6IHRydWVcclxuICAgIH0sXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6b2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xyXG4gICAgJ2Z1bmN0aW9uJzoge1xyXG4gICAgICAgIHBhdHRlcm46IC8oKD86XnxcXHMpZGVmWyBcXHRdKylbYS16QS1aX11cXHcqKD89XFxzKlxcKCkvZyxcclxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcclxuICAgICdjbGFzcy1uYW1lJzoge1xyXG4gICAgICAgIHBhdHRlcm46IC8oXFxiY2xhc3NcXHMrKVxcdysvaSxcclxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcclxuICAgICdrZXl3b3JkJzogL1xcYig/OmFzfGFzc2VydHxhc3luY3xhd2FpdHxicmVha3xjbGFzc3xjb250aW51ZXxkZWZ8ZGVsfGVsaWZ8ZWxzZXxleGNlcHR8ZXhlY3xmaW5hbGx5fGZvcnxmcm9tfGdsb2JhbHxpZnxpbXBvcnR8aW58aXN8bGFtYmRhfG5vbmxvY2FsfHBhc3N8cHJpbnR8cmFpc2V8cmV0dXJufHRyeXx3aGlsZXx3aXRofHlpZWxkKVxcYi8sXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6b2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xyXG4gICAgJ2J1aWx0aW4nOiAvXFxiKD86X19pbXBvcnRfX3xhYnN8YWxsfGFueXxhcHBseXxhc2NpaXxiYXNlc3RyaW5nfGJpbnxib29sfGJ1ZmZlcnxieXRlYXJyYXl8Ynl0ZXN8Y2FsbGFibGV8Y2hyfGNsYXNzbWV0aG9kfGNtcHxjb2VyY2V8Y29tcGlsZXxjb21wbGV4fGRlbGF0dHJ8ZGljdHxkaXJ8ZGl2bW9kfGVudW1lcmF0ZXxldmFsfGV4ZWNmaWxlfGZpbGV8ZmlsdGVyfGZsb2F0fGZvcm1hdHxmcm96ZW5zZXR8Z2V0YXR0cnxnbG9iYWxzfGhhc2F0dHJ8aGFzaHxoZWxwfGhleHxpZHxpbnB1dHxpbnR8aW50ZXJufGlzaW5zdGFuY2V8aXNzdWJjbGFzc3xpdGVyfGxlbnxsaXN0fGxvY2Fsc3xsb25nfG1hcHxtYXh8bWVtb3J5dmlld3xtaW58bmV4dHxvYmplY3R8b2N0fG9wZW58b3JkfHBvd3xwcm9wZXJ0eXxyYW5nZXxyYXdfaW5wdXR8cmVkdWNlfHJlbG9hZHxyZXByfHJldmVyc2VkfHJvdW5kfHNldHxzZXRhdHRyfHNsaWNlfHNvcnRlZHxzdGF0aWNtZXRob2R8c3RyfHN1bXxzdXBlcnx0dXBsZXx0eXBlfHVuaWNocnx1bmljb2RlfHZhcnN8eHJhbmdlfHppcClcXGIvLFxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcclxuICAgICdib29sZWFuJzogL1xcYig/OlRydWV8RmFsc2V8Tm9uZSlcXGIvLFxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcclxuICAgICdudW1iZXInOiAvKD86XFxiKD89XFxkKXxcXEIoPz1cXC4pKSg/OjBbYm9dKT8oPzooPzpcXGR8MHhbXFxkYS1mXSlbXFxkYS1mXSpcXC4/XFxkKnxcXC5cXGQrKSg/OmVbKy1dP1xcZCspP2o/XFxiL2ksXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6b2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xyXG4gICAgJ29wZXJhdG9yJzogL1stKyU9XT0/fCE9fFxcKlxcKj89P3xcXC9cXC8/PT98PFs8PT5dP3w+Wz0+XT98WyZ8Xn5dfFxcYig/Om9yfGFuZHxub3QpXFxiLyxcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXHJcbiAgICAncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSwuOl0vXHJcbn07XHJcbmNsYXNzIENvZGUgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xyXG4gICAgY29uc3RydWN0b3IocHJvcCkge1xyXG4gICAgICAgIHN1cGVyKHByb3ApO1xyXG4gICAgfVxyXG4gICAgcmVuZGVyKCkge1xyXG4gICAgICAgIGNvbnN0IGNvbG9yaXplZCA9IFByaXNtLmhpZ2hsaWdodCh0aGlzLnByb3BzLmNvZGUsIHB5dGhvbkdyYW1tYXIpO1xyXG4gICAgICAgIGNvbnN0IFRyYW5zZm9ybSA9IHRyYW5zZm9ybXNfMS50cmFuc2Zvcm1zWyd0ZXh0L2h0bWwnXTtcclxuICAgICAgICByZXR1cm4gKFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwcmVcIiwgbnVsbCxcclxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImNvZGVcIiwgeyBjbGFzc05hbWU6ICdsYW5ndWFnZS1weXRob24nIH0sXHJcbiAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFRyYW5zZm9ybSwgeyBkYXRhOiBjb2xvcml6ZWQgfSkpKSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Db2RlID0gQ29kZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29kZS5qcy5tYXAiXX0=