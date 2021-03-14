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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvZGUuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJQcmlzbSIsInJlcXVpcmUiLCJSZWFjdCIsInRyYW5zZm9ybXNfMSIsInB5dGhvbkdyYW1tYXIiLCJwYXR0ZXJuIiwibG9va2JlaGluZCIsImdyZWVkeSIsImFsaWFzIiwiQ29kZSIsIkNvbXBvbmVudCIsImNvbnN0cnVjdG9yIiwicHJvcCIsInJlbmRlciIsImNvbG9yaXplZCIsImhpZ2hsaWdodCIsInByb3BzIiwiY29kZSIsIlRyYW5zZm9ybSIsInRyYW5zZm9ybXMiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NOYW1lIiwiZGF0YSJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0FBQUVDLEVBQUFBLEtBQUssRUFBRTtBQUFULENBQTdDOztBQUNBLE1BQU1DLEtBQUssR0FBR0MsT0FBTyxDQUFDLFNBQUQsQ0FBckI7O0FBQ0EsTUFBTUMsS0FBSyxHQUFHRCxPQUFPLENBQUMsT0FBRCxDQUFyQjs7QUFDQSxNQUFNRSxZQUFZLEdBQUdGLE9BQU8sQ0FBQyxjQUFELENBQTVCLEMsQ0FDQTtBQUNBOzs7QUFDQSxNQUFNRyxhQUFhLEdBQUc7QUFDbEI7QUFDQSxhQUFXO0FBQ1BDLElBQUFBLE9BQU8sRUFBRSxjQURGO0FBRVBDLElBQUFBLFVBQVUsRUFBRTtBQUZMLEdBRk87QUFNbEI7QUFDQSwwQkFBd0I7QUFDcEJELElBQUFBLE9BQU8sRUFBRSxxQkFEVztBQUVwQkUsSUFBQUEsTUFBTSxFQUFFLElBRlk7QUFHcEJDLElBQUFBLEtBQUssRUFBRTtBQUhhLEdBUE47QUFZbEI7QUFDQSxZQUFVO0FBQ05ILElBQUFBLE9BQU8sRUFBRSxpQ0FESDtBQUVORSxJQUFBQSxNQUFNLEVBQUU7QUFGRixHQWJRO0FBaUJsQjtBQUNBLGNBQVk7QUFDUkYsSUFBQUEsT0FBTyxFQUFFLDJDQUREO0FBRVJDLElBQUFBLFVBQVUsRUFBRTtBQUZKLEdBbEJNO0FBc0JsQjtBQUNBLGdCQUFjO0FBQ1ZELElBQUFBLE9BQU8sRUFBRSxrQkFEQztBQUVWQyxJQUFBQSxVQUFVLEVBQUU7QUFGRixHQXZCSTtBQTJCbEI7QUFDQSxhQUFXLHVMQTVCTztBQTZCbEI7QUFDQSxhQUFXLHFoQkE5Qk87QUErQmxCO0FBQ0EsYUFBVyx5QkFoQ087QUFpQ2xCO0FBQ0EsWUFBVSw0RkFsQ1E7QUFtQ2xCO0FBQ0EsY0FBWSxzRUFwQ007QUFxQ2xCO0FBQ0EsaUJBQWU7QUF0Q0csQ0FBdEI7O0FBd0NBLE1BQU1HLElBQU4sU0FBbUJQLEtBQUssQ0FBQ1EsU0FBekIsQ0FBbUM7QUFDL0JDLEVBQUFBLFdBQVcsQ0FBQ0MsSUFBRCxFQUFPO0FBQ2QsVUFBTUEsSUFBTjtBQUNIOztBQUNEQyxFQUFBQSxNQUFNLEdBQUc7QUFDTCxVQUFNQyxTQUFTLEdBQUdkLEtBQUssQ0FBQ2UsU0FBTixDQUFnQixLQUFLQyxLQUFMLENBQVdDLElBQTNCLEVBQWlDYixhQUFqQyxDQUFsQjtBQUNBLFVBQU1jLFNBQVMsR0FBR2YsWUFBWSxDQUFDZ0IsVUFBYixDQUF3QixXQUF4QixDQUFsQjtBQUNBLFdBQVFqQixLQUFLLENBQUNrQixhQUFOLENBQW9CLEtBQXBCLEVBQTJCLElBQTNCLEVBQ0psQixLQUFLLENBQUNrQixhQUFOLENBQW9CLE1BQXBCLEVBQTRCO0FBQUVDLE1BQUFBLFNBQVMsRUFBRTtBQUFiLEtBQTVCLEVBQ0luQixLQUFLLENBQUNrQixhQUFOLENBQW9CRixTQUFwQixFQUErQjtBQUFFSSxNQUFBQSxJQUFJLEVBQUVSO0FBQVIsS0FBL0IsQ0FESixDQURJLENBQVI7QUFHSDs7QUFWOEI7O0FBWW5DaEIsT0FBTyxDQUFDVyxJQUFSLEdBQWVBLElBQWYiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbid1c2Ugc3RyaWN0Jztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IFByaXNtID0gcmVxdWlyZShcInByaXNtanNcIik7XG5jb25zdCBSZWFjdCA9IHJlcXVpcmUoXCJyZWFjdFwiKTtcbmNvbnN0IHRyYW5zZm9ybXNfMSA9IHJlcXVpcmUoXCIuL3RyYW5zZm9ybXNcIik7XG4vLyBCb3Jyb3dlZCB0aGlzIGZyb20gdGhlIHByaXNtIHN0dWZmLiBTaW1wbGVyIHRoYW4gdHJ5aW5nIHRvXG4vLyBnZXQgbG9hZExhbmd1YWdlcyB0byBiZWhhdmUgd2l0aCB3ZWJwYWNrLiBEb2VzIG1lYW4gd2UgbWlnaHQgZ2V0IG91dCBvZiBkYXRlIHRob3VnaC5cbmNvbnN0IHB5dGhvbkdyYW1tYXIgPSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcbiAgICAnY29tbWVudCc6IHtcbiAgICAgICAgcGF0dGVybjogLyhefFteXFxcXF0pIy4qLyxcbiAgICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgIH0sXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcbiAgICAndHJpcGxlLXF1b3RlZC1zdHJpbmcnOiB7XG4gICAgICAgIHBhdHRlcm46IC8oXCJcIlwifCcnJylbXFxzXFxTXSs/XFwxLyxcbiAgICAgICAgZ3JlZWR5OiB0cnVlLFxuICAgICAgICBhbGlhczogJ3N0cmluZydcbiAgICB9LFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXG4gICAgJ3N0cmluZyc6IHtcbiAgICAgICAgcGF0dGVybjogLyhcInwnKSg/OlxcXFwufCg/IVxcMSlbXlxcXFxcXHJcXG5dKSpcXDEvLFxuICAgICAgICBncmVlZHk6IHRydWVcbiAgICB9LFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXG4gICAgJ2Z1bmN0aW9uJzoge1xuICAgICAgICBwYXR0ZXJuOiAvKCg/Ol58XFxzKWRlZlsgXFx0XSspW2EtekEtWl9dXFx3Kig/PVxccypcXCgpL2csXG4gICAgICAgIGxvb2tiZWhpbmQ6IHRydWVcbiAgICB9LFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXG4gICAgJ2NsYXNzLW5hbWUnOiB7XG4gICAgICAgIHBhdHRlcm46IC8oXFxiY2xhc3NcXHMrKVxcdysvaSxcbiAgICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgIH0sXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcbiAgICAna2V5d29yZCc6IC9cXGIoPzphc3xhc3NlcnR8YXN5bmN8YXdhaXR8YnJlYWt8Y2xhc3N8Y29udGludWV8ZGVmfGRlbHxlbGlmfGVsc2V8ZXhjZXB0fGV4ZWN8ZmluYWxseXxmb3J8ZnJvbXxnbG9iYWx8aWZ8aW1wb3J0fGlufGlzfGxhbWJkYXxub25sb2NhbHxwYXNzfHByaW50fHJhaXNlfHJldHVybnx0cnl8d2hpbGV8d2l0aHx5aWVsZClcXGIvLFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXG4gICAgJ2J1aWx0aW4nOiAvXFxiKD86X19pbXBvcnRfX3xhYnN8YWxsfGFueXxhcHBseXxhc2NpaXxiYXNlc3RyaW5nfGJpbnxib29sfGJ1ZmZlcnxieXRlYXJyYXl8Ynl0ZXN8Y2FsbGFibGV8Y2hyfGNsYXNzbWV0aG9kfGNtcHxjb2VyY2V8Y29tcGlsZXxjb21wbGV4fGRlbGF0dHJ8ZGljdHxkaXJ8ZGl2bW9kfGVudW1lcmF0ZXxldmFsfGV4ZWNmaWxlfGZpbGV8ZmlsdGVyfGZsb2F0fGZvcm1hdHxmcm96ZW5zZXR8Z2V0YXR0cnxnbG9iYWxzfGhhc2F0dHJ8aGFzaHxoZWxwfGhleHxpZHxpbnB1dHxpbnR8aW50ZXJufGlzaW5zdGFuY2V8aXNzdWJjbGFzc3xpdGVyfGxlbnxsaXN0fGxvY2Fsc3xsb25nfG1hcHxtYXh8bWVtb3J5dmlld3xtaW58bmV4dHxvYmplY3R8b2N0fG9wZW58b3JkfHBvd3xwcm9wZXJ0eXxyYW5nZXxyYXdfaW5wdXR8cmVkdWNlfHJlbG9hZHxyZXByfHJldmVyc2VkfHJvdW5kfHNldHxzZXRhdHRyfHNsaWNlfHNvcnRlZHxzdGF0aWNtZXRob2R8c3RyfHN1bXxzdXBlcnx0dXBsZXx0eXBlfHVuaWNocnx1bmljb2RlfHZhcnN8eHJhbmdlfHppcClcXGIvLFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXG4gICAgJ2Jvb2xlYW4nOiAvXFxiKD86VHJ1ZXxGYWxzZXxOb25lKVxcYi8sXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9iamVjdC1saXRlcmFsLWtleS1xdW90ZXNcbiAgICAnbnVtYmVyJzogLyg/OlxcYig/PVxcZCl8XFxCKD89XFwuKSkoPzowW2JvXSk/KD86KD86XFxkfDB4W1xcZGEtZl0pW1xcZGEtZl0qXFwuP1xcZCp8XFwuXFxkKykoPzplWystXT9cXGQrKT9qP1xcYi9pLFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvYmplY3QtbGl0ZXJhbC1rZXktcXVvdGVzXG4gICAgJ29wZXJhdG9yJzogL1stKyU9XT0/fCE9fFxcKlxcKj89P3xcXC9cXC8/PT98PFs8PT5dP3w+Wz0+XT98WyZ8Xn5dfFxcYig/Om9yfGFuZHxub3QpXFxiLyxcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6b2JqZWN0LWxpdGVyYWwta2V5LXF1b3Rlc1xuICAgICdwdW5jdHVhdGlvbic6IC9be31bXFxdOygpLC46XS9cbn07XG5jbGFzcyBDb2RlIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wKSB7XG4gICAgICAgIHN1cGVyKHByb3ApO1xuICAgIH1cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IGNvbG9yaXplZCA9IFByaXNtLmhpZ2hsaWdodCh0aGlzLnByb3BzLmNvZGUsIHB5dGhvbkdyYW1tYXIpO1xuICAgICAgICBjb25zdCBUcmFuc2Zvcm0gPSB0cmFuc2Zvcm1zXzEudHJhbnNmb3Jtc1sndGV4dC9odG1sJ107XG4gICAgICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChcInByZVwiLCBudWxsLFxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImNvZGVcIiwgeyBjbGFzc05hbWU6ICdsYW5ndWFnZS1weXRob24nIH0sXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChUcmFuc2Zvcm0sIHsgZGF0YTogY29sb3JpemVkIH0pKSkpO1xuICAgIH1cbn1cbmV4cG9ydHMuQ29kZSA9IENvZGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb2RlLmpzLm1hcCJdfQ==