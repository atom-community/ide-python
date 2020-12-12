"use strict"; // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

Object.defineProperty(exports, "__esModule", {
  value: true
});

const vscode_1 = require("vscode");

const braceCounter_1 = require("../language/braceCounter");

const textBuilder_1 = require("../language/textBuilder");

const textRangeCollection_1 = require("../language/textRangeCollection");

const tokenizer_1 = require("../language/tokenizer");

const types_1 = require("../language/types");

const keywordsWithSpaceBeforeBrace = ['and', 'as', 'assert', 'await', 'del', 'except', 'elif', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'raise', 'return', 'while', 'with', 'yield'];

class LineFormatter {
  constructor() {
    this.builder = new textBuilder_1.TextBuilder();
    this.tokens = new textRangeCollection_1.TextRangeCollection([]);
    this.braceCounter = new braceCounter_1.BraceCounter();
    this.text = '';
    this.lineNumber = 0;
  } // tslint:disable-next-line:cyclomatic-complexity


  formatLine(document, lineNumber) {
    this.document = document;
    this.lineNumber = lineNumber;
    this.text = document.lineAt(lineNumber).text;
    this.tokens = new tokenizer_1.Tokenizer().tokenize(this.text);
    this.builder = new textBuilder_1.TextBuilder();
    this.braceCounter = new braceCounter_1.BraceCounter();

    if (this.tokens.count === 0) {
      return this.text;
    }

    const ws = this.text.substr(0, this.tokens.getItemAt(0).start);

    if (ws.length > 0) {
      this.builder.append(ws); // Preserve leading indentation.
    }

    for (let i = 0; i < this.tokens.count; i += 1) {
      const t = this.tokens.getItemAt(i);
      const prev = i > 0 ? this.tokens.getItemAt(i - 1) : undefined;
      const next = i < this.tokens.count - 1 ? this.tokens.getItemAt(i + 1) : undefined;

      switch (t.type) {
        case types_1.TokenType.Operator:
          this.handleOperator(i);
          break;

        case types_1.TokenType.Comma:
          this.builder.append(',');

          if (next && !this.isCloseBraceType(next.type) && next.type !== types_1.TokenType.Colon) {
            this.builder.softAppendSpace();
          }

          break;

        case types_1.TokenType.Identifier:
          if (prev && !this.isOpenBraceType(prev.type) && prev.type !== types_1.TokenType.Colon && prev.type !== types_1.TokenType.Operator) {
            this.builder.softAppendSpace();
          }

          const id = this.text.substring(t.start, t.end);
          this.builder.append(id);

          if (this.isKeywordWithSpaceBeforeBrace(id) && next && this.isOpenBraceType(next.type)) {
            // for x in ()
            this.builder.softAppendSpace();
          }

          break;

        case types_1.TokenType.Colon:
          // x: 1 if not in slice, x[1:y] if inside the slice.
          this.builder.append(':');

          if (!this.braceCounter.isOpened(types_1.TokenType.OpenBracket) && next && next.type !== types_1.TokenType.Colon) {
            // Not inside opened [[ ... ] sequence.
            this.builder.softAppendSpace();
          }

          break;

        case types_1.TokenType.Comment:
          // Add 2 spaces before in-line comment per PEP guidelines.
          if (prev) {
            this.builder.softAppendSpace(2);
          }

          this.builder.append(this.text.substring(t.start, t.end));
          break;

        case types_1.TokenType.Semicolon:
          this.builder.append(';');
          break;

        default:
          this.handleOther(t, i);
          break;
      }
    }

    return this.builder.getText();
  } // tslint:disable-next-line:cyclomatic-complexity


  handleOperator(index) {
    const t = this.tokens.getItemAt(index);
    const prev = index > 0 ? this.tokens.getItemAt(index - 1) : undefined;
    const opCode = this.text.charCodeAt(t.start);
    const next = index < this.tokens.count - 1 ? this.tokens.getItemAt(index + 1) : undefined;

    if (t.length === 1) {
      switch (opCode) {
        case 61
        /* Equal */
        :
          this.handleEqual(t, index);
          return;

        case 46
        /* Period */
        :
          if (prev && this.isKeyword(prev, 'from')) {
            this.builder.softAppendSpace();
          }

          this.builder.append('.');

          if (next && this.isKeyword(next, 'import')) {
            this.builder.softAppendSpace();
          }

          return;

        case 64
        /* At */
        :
          if (prev) {
            // Binary case
            this.builder.softAppendSpace();
            this.builder.append('@');
            this.builder.softAppendSpace();
          } else {
            this.builder.append('@');
          }

          return;

        case 33
        /* ExclamationMark */
        :
          this.builder.append('!');
          return;

        case 42
        /* Asterisk */
        :
          if (prev && this.isKeyword(prev, 'lambda')) {
            this.builder.softAppendSpace();
            this.builder.append('*');
            return;
          }

          if (this.handleStarOperator(t, prev)) {
            return;
          }

          break;

        default:
          break;
      }
    } else if (t.length === 2) {
      if (this.text.charCodeAt(t.start) === 42
      /* Asterisk */
      && this.text.charCodeAt(t.start + 1) === 42
      /* Asterisk */
      ) {
          if (this.handleStarOperator(t, prev)) {
            return;
          }
        }
    } // Do not append space if operator is preceded by '(' or ',' as in foo(**kwarg)


    if (prev && (this.isOpenBraceType(prev.type) || prev.type === types_1.TokenType.Comma)) {
      this.builder.append(this.text.substring(t.start, t.end));
      return;
    }

    this.builder.softAppendSpace();
    this.builder.append(this.text.substring(t.start, t.end)); // Check unary case

    if (prev && prev.type === types_1.TokenType.Operator) {
      if (opCode === 45
      /* Hyphen */
      || opCode === 43
      /* Plus */
      || opCode === 126
      /* Tilde */
      ) {
          return;
        }
    }

    this.builder.softAppendSpace();
  }

  handleStarOperator(current, prev) {
    if (this.text.charCodeAt(current.start) === 42
    /* Asterisk */
    && this.text.charCodeAt(current.start + 1) === 42
    /* Asterisk */
    ) {
        if (!prev || prev.type !== types_1.TokenType.Identifier && prev.type !== types_1.TokenType.Number) {
          this.builder.append('**');
          return true;
        }

        if (prev && this.isKeyword(prev, 'lambda')) {
          this.builder.softAppendSpace();
          this.builder.append('**');
          return true;
        }
      } // Check previous line for the **/* condition


    const lastLine = this.getPreviousLineTokens();
    const lastToken = lastLine && lastLine.count > 0 ? lastLine.getItemAt(lastLine.count - 1) : undefined;

    if (lastToken && (this.isOpenBraceType(lastToken.type) || lastToken.type === types_1.TokenType.Comma)) {
      this.builder.append(this.text.substring(current.start, current.end));
      return true;
    }

    return false;
  }

  handleEqual(t, index) {
    if (this.isMultipleStatements(index) && !this.braceCounter.isOpened(types_1.TokenType.OpenBrace)) {
      // x = 1; x, y = y, x
      this.builder.softAppendSpace();
      this.builder.append('=');
      this.builder.softAppendSpace();
      return;
    } // Check if this is = in function arguments. If so, do not add spaces around it.


    if (this.isEqualsInsideArguments(index)) {
      this.builder.append('=');
      return;
    }

    this.builder.softAppendSpace();
    this.builder.append('=');
    this.builder.softAppendSpace();
  }

  handleOther(t, index) {
    if (this.isBraceType(t.type)) {
      this.braceCounter.countBrace(t);
      this.builder.append(this.text.substring(t.start, t.end));
      return;
    }

    const prev = index > 0 ? this.tokens.getItemAt(index - 1) : undefined;

    if (prev && prev.length === 1 && this.text.charCodeAt(prev.start) === 61
    /* Equal */
    && this.isEqualsInsideArguments(index - 1)) {
      // Don't add space around = inside function arguments.
      this.builder.append(this.text.substring(t.start, t.end));
      return;
    }

    if (prev && (this.isOpenBraceType(prev.type) || prev.type === types_1.TokenType.Colon)) {
      // Don't insert space after (, [ or { .
      this.builder.append(this.text.substring(t.start, t.end));
      return;
    }

    if (t.type === types_1.TokenType.Number && prev && prev.type === types_1.TokenType.Operator && prev.length === 1 && this.text.charCodeAt(prev.start) === 126
    /* Tilde */
    ) {
        // Special case for ~ before numbers
        this.builder.append(this.text.substring(t.start, t.end));
        return;
      }

    if (t.type === types_1.TokenType.Unknown) {
      this.handleUnknown(t);
    } else {
      // In general, keep tokens separated.
      this.builder.softAppendSpace();
      this.builder.append(this.text.substring(t.start, t.end));
    }
  }

  handleUnknown(t) {
    const prevChar = t.start > 0 ? this.text.charCodeAt(t.start - 1) : 0;

    if (prevChar === 32
    /* Space */
    || prevChar === 9
    /* Tab */
    ) {
        this.builder.softAppendSpace();
      }

    this.builder.append(this.text.substring(t.start, t.end));
    const nextChar = t.end < this.text.length - 1 ? this.text.charCodeAt(t.end) : 0;

    if (nextChar === 32
    /* Space */
    || nextChar === 9
    /* Tab */
    ) {
        this.builder.softAppendSpace();
      }
  } // tslint:disable-next-line:cyclomatic-complexity


  isEqualsInsideArguments(index) {
    if (index < 1) {
      return false;
    } // We are looking for IDENT = ?


    const prev = this.tokens.getItemAt(index - 1);

    if (prev.type !== types_1.TokenType.Identifier) {
      return false;
    }

    if (index > 1 && this.tokens.getItemAt(index - 2).type === types_1.TokenType.Colon) {
      return false; // Type hint should have spaces around like foo(x: int = 1) per PEP 8
    }

    return this.isInsideFunctionArguments(this.tokens.getItemAt(index).start);
  }

  isOpenBraceType(type) {
    return type === types_1.TokenType.OpenBrace || type === types_1.TokenType.OpenBracket || type === types_1.TokenType.OpenCurly;
  }

  isCloseBraceType(type) {
    return type === types_1.TokenType.CloseBrace || type === types_1.TokenType.CloseBracket || type === types_1.TokenType.CloseCurly;
  }

  isBraceType(type) {
    return this.isOpenBraceType(type) || this.isCloseBraceType(type);
  }

  isMultipleStatements(index) {
    for (let i = index; i >= 0; i -= 1) {
      if (this.tokens.getItemAt(i).type === types_1.TokenType.Semicolon) {
        return true;
      }
    }

    return false;
  }

  isKeywordWithSpaceBeforeBrace(s) {
    return keywordsWithSpaceBeforeBrace.indexOf(s) >= 0;
  }

  isKeyword(t, keyword) {
    return t.type === types_1.TokenType.Identifier && t.length === keyword.length && this.text.substr(t.start, t.length) === keyword;
  } // tslint:disable-next-line:cyclomatic-complexity


  isInsideFunctionArguments(position) {
    if (!this.document) {
      return false; // unable to determine
    } // Walk up until beginning of the document or line with 'def IDENT(' or line ending with :
    // IDENT( by itself is not reliable since they can be nested in IDENT(IDENT(a), x=1)


    let start = new vscode_1.Position(0, 0);

    for (let i = this.lineNumber; i >= 0; i -= 1) {
      const line = this.document.lineAt(i);
      const lineTokens = new tokenizer_1.Tokenizer().tokenize(line.text);

      if (lineTokens.count === 0) {
        continue;
      } // 'def IDENT('


      const first = lineTokens.getItemAt(0);

      if (lineTokens.count >= 3 && first.length === 3 && line.text.substr(first.start, first.length) === 'def' && lineTokens.getItemAt(1).type === types_1.TokenType.Identifier && lineTokens.getItemAt(2).type === types_1.TokenType.OpenBrace) {
        start = line.range.start;
        break;
      }

      if (lineTokens.count > 0 && i < this.lineNumber) {
        // One of previous lines ends with :
        const last = lineTokens.getItemAt(lineTokens.count - 1);

        if (last.type === types_1.TokenType.Colon) {
          start = this.document.lineAt(i + 1).range.start;
          break;
        } else if (lineTokens.count > 1) {
          const beforeLast = lineTokens.getItemAt(lineTokens.count - 2);

          if (beforeLast.type === types_1.TokenType.Colon && last.type === types_1.TokenType.Comment) {
            start = this.document.lineAt(i + 1).range.start;
            break;
          }
        }
      }
    } // Now tokenize from the nearest reasonable point


    const currentLine = this.document.lineAt(this.lineNumber);
    const text = this.document.getText(new vscode_1.Range(start, currentLine.range.end));
    const tokens = new tokenizer_1.Tokenizer().tokenize(text); // Translate position in the line being formatted to the position in the tokenized block

    position = this.document.offsetAt(currentLine.range.start) + position - this.document.offsetAt(start); // Walk tokens locating narrowest function signature as in IDENT( | )

    let funcCallStartIndex = -1;
    let funcCallEndIndex = -1;

    for (let i = 0; i < tokens.count - 1; i += 1) {
      const t = tokens.getItemAt(i);

      if (t.type === types_1.TokenType.Identifier) {
        const next = tokens.getItemAt(i + 1);

        if (next.type === types_1.TokenType.OpenBrace && !this.isKeywordWithSpaceBeforeBrace(text.substr(t.start, t.length))) {
          // We are at IDENT(, try and locate the closing brace
          let closeBraceIndex = this.findClosingBrace(tokens, i + 1); // Closing brace is not required in case construct is not yet terminated

          closeBraceIndex = closeBraceIndex > 0 ? closeBraceIndex : tokens.count - 1; // Are we in range?

          if (position > next.start && position < tokens.getItemAt(closeBraceIndex).start) {
            funcCallStartIndex = i;
            funcCallEndIndex = closeBraceIndex;
          }
        }
      }
    } // Did we find anything?


    if (funcCallStartIndex < 0) {
      // No? See if we are between 'lambda' and ':'
      for (let i = 0; i < tokens.count; i += 1) {
        const t = tokens.getItemAt(i);

        if (t.type === types_1.TokenType.Identifier && text.substr(t.start, t.length) === 'lambda') {
          if (position < t.start) {
            break; // Position is before the nearest 'lambda'
          }

          let colonIndex = this.findNearestColon(tokens, i + 1); // Closing : is not required in case construct is not yet terminated

          colonIndex = colonIndex > 0 ? colonIndex : tokens.count - 1;

          if (position > t.start && position < tokens.getItemAt(colonIndex).start) {
            funcCallStartIndex = i;
            funcCallEndIndex = colonIndex;
          }
        }
      }
    }

    return funcCallStartIndex >= 0 && funcCallEndIndex > 0;
  }

  findNearestColon(tokens, index) {
    for (let i = index; i < tokens.count; i += 1) {
      if (tokens.getItemAt(i).type === types_1.TokenType.Colon) {
        return i;
      }
    }

    return -1;
  }

  findClosingBrace(tokens, index) {
    const braceCounter = new braceCounter_1.BraceCounter();

    for (let i = index; i < tokens.count; i += 1) {
      const t = tokens.getItemAt(i);

      if (t.type === types_1.TokenType.OpenBrace || t.type === types_1.TokenType.CloseBrace) {
        braceCounter.countBrace(t);
      }

      if (braceCounter.count === 0) {
        return i;
      }
    }

    return -1;
  }

  getPreviousLineTokens() {
    if (!this.document || this.lineNumber === 0) {
      return undefined; // unable to determine
    }

    const line = this.document.lineAt(this.lineNumber - 1);
    return new tokenizer_1.Tokenizer().tokenize(line.text);
  }

}

exports.LineFormatter = LineFormatter;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbmVGb3JtYXR0ZXIuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJ2c2NvZGVfMSIsInJlcXVpcmUiLCJicmFjZUNvdW50ZXJfMSIsInRleHRCdWlsZGVyXzEiLCJ0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEiLCJ0b2tlbml6ZXJfMSIsInR5cGVzXzEiLCJrZXl3b3Jkc1dpdGhTcGFjZUJlZm9yZUJyYWNlIiwiTGluZUZvcm1hdHRlciIsImNvbnN0cnVjdG9yIiwiYnVpbGRlciIsIlRleHRCdWlsZGVyIiwidG9rZW5zIiwiVGV4dFJhbmdlQ29sbGVjdGlvbiIsImJyYWNlQ291bnRlciIsIkJyYWNlQ291bnRlciIsInRleHQiLCJsaW5lTnVtYmVyIiwiZm9ybWF0TGluZSIsImRvY3VtZW50IiwibGluZUF0IiwiVG9rZW5pemVyIiwidG9rZW5pemUiLCJjb3VudCIsIndzIiwic3Vic3RyIiwiZ2V0SXRlbUF0Iiwic3RhcnQiLCJsZW5ndGgiLCJhcHBlbmQiLCJpIiwidCIsInByZXYiLCJ1bmRlZmluZWQiLCJuZXh0IiwidHlwZSIsIlRva2VuVHlwZSIsIk9wZXJhdG9yIiwiaGFuZGxlT3BlcmF0b3IiLCJDb21tYSIsImlzQ2xvc2VCcmFjZVR5cGUiLCJDb2xvbiIsInNvZnRBcHBlbmRTcGFjZSIsIklkZW50aWZpZXIiLCJpc09wZW5CcmFjZVR5cGUiLCJpZCIsInN1YnN0cmluZyIsImVuZCIsImlzS2V5d29yZFdpdGhTcGFjZUJlZm9yZUJyYWNlIiwiaXNPcGVuZWQiLCJPcGVuQnJhY2tldCIsIkNvbW1lbnQiLCJTZW1pY29sb24iLCJoYW5kbGVPdGhlciIsImdldFRleHQiLCJpbmRleCIsIm9wQ29kZSIsImNoYXJDb2RlQXQiLCJoYW5kbGVFcXVhbCIsImlzS2V5d29yZCIsImhhbmRsZVN0YXJPcGVyYXRvciIsImN1cnJlbnQiLCJOdW1iZXIiLCJsYXN0TGluZSIsImdldFByZXZpb3VzTGluZVRva2VucyIsImxhc3RUb2tlbiIsImlzTXVsdGlwbGVTdGF0ZW1lbnRzIiwiT3BlbkJyYWNlIiwiaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMiLCJpc0JyYWNlVHlwZSIsImNvdW50QnJhY2UiLCJVbmtub3duIiwiaGFuZGxlVW5rbm93biIsInByZXZDaGFyIiwibmV4dENoYXIiLCJpc0luc2lkZUZ1bmN0aW9uQXJndW1lbnRzIiwiT3BlbkN1cmx5IiwiQ2xvc2VCcmFjZSIsIkNsb3NlQnJhY2tldCIsIkNsb3NlQ3VybHkiLCJzIiwiaW5kZXhPZiIsImtleXdvcmQiLCJwb3NpdGlvbiIsIlBvc2l0aW9uIiwibGluZSIsImxpbmVUb2tlbnMiLCJmaXJzdCIsInJhbmdlIiwibGFzdCIsImJlZm9yZUxhc3QiLCJjdXJyZW50TGluZSIsIlJhbmdlIiwib2Zmc2V0QXQiLCJmdW5jQ2FsbFN0YXJ0SW5kZXgiLCJmdW5jQ2FsbEVuZEluZGV4IiwiY2xvc2VCcmFjZUluZGV4IiwiZmluZENsb3NpbmdCcmFjZSIsImNvbG9uSW5kZXgiLCJmaW5kTmVhcmVzdENvbG9uIl0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxRQUFRLEdBQUdDLE9BQU8sQ0FBQyxRQUFELENBQXhCOztBQUNBLE1BQU1DLGNBQWMsR0FBR0QsT0FBTyxDQUFDLDBCQUFELENBQTlCOztBQUNBLE1BQU1FLGFBQWEsR0FBR0YsT0FBTyxDQUFDLHlCQUFELENBQTdCOztBQUNBLE1BQU1HLHFCQUFxQixHQUFHSCxPQUFPLENBQUMsaUNBQUQsQ0FBckM7O0FBQ0EsTUFBTUksV0FBVyxHQUFHSixPQUFPLENBQUMsdUJBQUQsQ0FBM0I7O0FBQ0EsTUFBTUssT0FBTyxHQUFHTCxPQUFPLENBQUMsbUJBQUQsQ0FBdkI7O0FBQ0EsTUFBTU0sNEJBQTRCLEdBQUcsQ0FDakMsS0FEaUMs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QyxNQUFkLENBQXFCLEtBQUtILFVBQUwsR0FBa0IsQ0FBdkMsQ0FBYjtBQUNBLFdBQU8sSUFBSVosV0FBVyxDQUFDZ0IsU0FBaEIsR0FBNEJDLFFBQTVCLENBQXFDK0QsSUFBSSxDQUFDckUsSUFBMUMsQ0FBUDtBQUNIOztBQXRYZTs7QUF3WHBCbEIsT0FBTyxDQUFDVSxhQUFSLEdBQXdCQSxhQUF4QiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG4vLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IHZzY29kZV8xID0gcmVxdWlyZShcInZzY29kZVwiKTtcclxuY29uc3QgYnJhY2VDb3VudGVyXzEgPSByZXF1aXJlKFwiLi4vbGFuZ3VhZ2UvYnJhY2VDb3VudGVyXCIpO1xyXG5jb25zdCB0ZXh0QnVpbGRlcl8xID0gcmVxdWlyZShcIi4uL2xhbmd1YWdlL3RleHRCdWlsZGVyXCIpO1xyXG5jb25zdCB0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEgPSByZXF1aXJlKFwiLi4vbGFuZ3VhZ2UvdGV4dFJhbmdlQ29sbGVjdGlvblwiKTtcclxuY29uc3QgdG9rZW5pemVyXzEgPSByZXF1aXJlKFwiLi4vbGFuZ3VhZ2UvdG9rZW5pemVyXCIpO1xyXG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uL2xhbmd1YWdlL3R5cGVzXCIpO1xyXG5jb25zdCBrZXl3b3Jkc1dpdGhTcGFjZUJlZm9yZUJyYWNlID0gW1xyXG4gICAgJ2FuZCcsICdhcycsICdhc3NlcnQnLCAnYXdhaXQnLFxyXG4gICAgJ2RlbCcsXHJcbiAgICAnZXhjZXB0JywgJ2VsaWYnLFxyXG4gICAgJ2ZvcicsICdmcm9tJyxcclxuICAgICdnbG9iYWwnLFxyXG4gICAgJ2lmJywgJ2ltcG9ydCcsICdpbicsICdpcycsXHJcbiAgICAnbGFtYmRhJyxcclxuICAgICdub25sb2NhbCcsICdub3QnLFxyXG4gICAgJ29yJyxcclxuICAgICdyYWlzZScsICdyZXR1cm4nLFxyXG4gICAgJ3doaWxlJywgJ3dpdGgnLFxyXG4gICAgJ3lpZWxkJ1xyXG5dO1xyXG5jbGFzcyBMaW5lRm9ybWF0dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuYnVpbGRlciA9IG5ldyB0ZXh0QnVpbGRlcl8xLlRleHRCdWlsZGVyKCk7XHJcbiAgICAgICAgdGhpcy50b2tlbnMgPSBuZXcgdGV4dFJhbmdlQ29sbGVjdGlvbl8xLlRleHRSYW5nZUNvbGxlY3Rpb24oW10pO1xyXG4gICAgICAgIHRoaXMuYnJhY2VDb3VudGVyID0gbmV3IGJyYWNlQ291bnRlcl8xLkJyYWNlQ291bnRlcigpO1xyXG4gICAgICAgIHRoaXMudGV4dCA9ICcnO1xyXG4gICAgICAgIHRoaXMubGluZU51bWJlciA9IDA7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XHJcbiAgICBmb3JtYXRMaW5lKGRvY3VtZW50LCBsaW5lTnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5kb2N1bWVudCA9IGRvY3VtZW50O1xyXG4gICAgICAgIHRoaXMubGluZU51bWJlciA9IGxpbmVOdW1iZXI7XHJcbiAgICAgICAgdGhpcy50ZXh0ID0gZG9jdW1lbnQubGluZUF0KGxpbmVOdW1iZXIpLnRleHQ7XHJcbiAgICAgICAgdGhpcy50b2tlbnMgPSBuZXcgdG9rZW5pemVyXzEuVG9rZW5pemVyKCkudG9rZW5pemUodGhpcy50ZXh0KTtcclxuICAgICAgICB0aGlzLmJ1aWxkZXIgPSBuZXcgdGV4dEJ1aWxkZXJfMS5UZXh0QnVpbGRlcigpO1xyXG4gICAgICAgIHRoaXMuYnJhY2VDb3VudGVyID0gbmV3IGJyYWNlQ291bnRlcl8xLkJyYWNlQ291bnRlcigpO1xyXG4gICAgICAgIGlmICh0aGlzLnRva2Vucy5jb3VudCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50ZXh0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB3cyA9IHRoaXMudGV4dC5zdWJzdHIoMCwgdGhpcy50b2tlbnMuZ2V0SXRlbUF0KDApLnN0YXJ0KTtcclxuICAgICAgICBpZiAod3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHdzKTsgLy8gUHJlc2VydmUgbGVhZGluZyBpbmRlbnRhdGlvbi5cclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRva2Vucy5jb3VudDsgaSArPSAxKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZXYgPSBpID4gMCA/IHRoaXMudG9rZW5zLmdldEl0ZW1BdChpIC0gMSkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBpIDwgdGhpcy50b2tlbnMuY291bnQgLSAxID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGkgKyAxKSA6IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgc3dpdGNoICh0LnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3I6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVPcGVyYXRvcihpKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWE6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnLCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICYmICF0aGlzLmlzQ2xvc2VCcmFjZVR5cGUobmV4dC50eXBlKSAmJiBuZXh0LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYgJiYgIXRoaXMuaXNPcGVuQnJhY2VUeXBlKHByZXYudHlwZSkgJiYgcHJldi50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbiAmJiBwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKGlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0tleXdvcmRXaXRoU3BhY2VCZWZvcmVCcmFjZShpZCkgJiYgbmV4dCAmJiB0aGlzLmlzT3BlbkJyYWNlVHlwZShuZXh0LnR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvciB4IGluICgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHg6IDEgaWYgbm90IGluIHNsaWNlLCB4WzE6eV0gaWYgaW5zaWRlIHRoZSBzbGljZS5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCc6Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJyYWNlQ291bnRlci5pc09wZW5lZCh0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2tldCkgJiYgKG5leHQgJiYgbmV4dC50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IGluc2lkZSBvcGVuZWQgW1sgLi4uIF0gc2VxdWVuY2UuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1lbnQ6XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIDIgc3BhY2VzIGJlZm9yZSBpbi1saW5lIGNvbW1lbnQgcGVyIFBFUCBndWlkZWxpbmVzLlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSB0eXBlc18xLlRva2VuVHlwZS5TZW1pY29sb246XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnOycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZU90aGVyKHQsIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLmJ1aWxkZXIuZ2V0VGV4dCgpO1xyXG4gICAgfVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxyXG4gICAgaGFuZGxlT3BlcmF0b3IoaW5kZXgpIHtcclxuICAgICAgICBjb25zdCB0ID0gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4KTtcclxuICAgICAgICBjb25zdCBwcmV2ID0gaW5kZXggPiAwID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4IC0gMSkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgY29uc3Qgb3BDb2RlID0gdGhpcy50ZXh0LmNoYXJDb2RlQXQodC5zdGFydCk7XHJcbiAgICAgICAgY29uc3QgbmV4dCA9IGluZGV4IDwgdGhpcy50b2tlbnMuY291bnQgLSAxID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4ICsgMSkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKHQubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDYxIC8qIEVxdWFsICovOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXF1YWwodCwgaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNhc2UgNDYgLyogUGVyaW9kICovOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2ICYmIHRoaXMuaXNLZXl3b3JkKHByZXYsICdmcm9tJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgdGhpcy5pc0tleXdvcmQobmV4dCwgJ2ltcG9ydCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA2NCAvKiBBdCAqLzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCaW5hcnkgY2FzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJ0AnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnQCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBjYXNlIDMzIC8qIEV4Y2xhbWF0aW9uTWFyayAqLzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCchJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0MiAvKiBBc3RlcmlzayAqLzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldiAmJiB0aGlzLmlzS2V5d29yZChwcmV2LCAnbGFtYmRhJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCcqJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlU3Rhck9wZXJhdG9yKHQsIHByZXYpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHQubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRleHQuY2hhckNvZGVBdCh0LnN0YXJ0KSA9PT0gNDIgLyogQXN0ZXJpc2sgKi8gJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQodC5zdGFydCArIDEpID09PSA0MiAvKiBBc3RlcmlzayAqLykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlU3Rhck9wZXJhdG9yKHQsIHByZXYpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIERvIG5vdCBhcHBlbmQgc3BhY2UgaWYgb3BlcmF0b3IgaXMgcHJlY2VkZWQgYnkgJygnIG9yICcsJyBhcyBpbiBmb28oKiprd2FyZylcclxuICAgICAgICBpZiAocHJldiAmJiAodGhpcy5pc09wZW5CcmFjZVR5cGUocHJldi50eXBlKSB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1hKSkge1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XHJcbiAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XHJcbiAgICAgICAgLy8gQ2hlY2sgdW5hcnkgY2FzZVxyXG4gICAgICAgIGlmIChwcmV2ICYmIHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgaWYgKG9wQ29kZSA9PT0gNDUgLyogSHlwaGVuICovIHx8IG9wQ29kZSA9PT0gNDMgLyogUGx1cyAqLyB8fCBvcENvZGUgPT09IDEyNiAvKiBUaWxkZSAqLykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgIH1cclxuICAgIGhhbmRsZVN0YXJPcGVyYXRvcihjdXJyZW50LCBwcmV2KSB7XHJcbiAgICAgICAgaWYgKHRoaXMudGV4dC5jaGFyQ29kZUF0KGN1cnJlbnQuc3RhcnQpID09PSA0MiAvKiBBc3RlcmlzayAqLyAmJiB0aGlzLnRleHQuY2hhckNvZGVBdChjdXJyZW50LnN0YXJ0ICsgMSkgPT09IDQyIC8qIEFzdGVyaXNrICovKSB7XHJcbiAgICAgICAgICAgIGlmICghcHJldiB8fCAocHJldi50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyICYmIHByZXYudHlwZSAhPT0gdHlwZXNfMS5Ub2tlblR5cGUuTnVtYmVyKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnKionKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChwcmV2ICYmIHRoaXMuaXNLZXl3b3JkKHByZXYsICdsYW1iZGEnKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnKionKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIENoZWNrIHByZXZpb3VzIGxpbmUgZm9yIHRoZSAqKi8qIGNvbmRpdGlvblxyXG4gICAgICAgIGNvbnN0IGxhc3RMaW5lID0gdGhpcy5nZXRQcmV2aW91c0xpbmVUb2tlbnMoKTtcclxuICAgICAgICBjb25zdCBsYXN0VG9rZW4gPSBsYXN0TGluZSAmJiBsYXN0TGluZS5jb3VudCA+IDAgPyBsYXN0TGluZS5nZXRJdGVtQXQobGFzdExpbmUuY291bnQgLSAxKSA6IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAobGFzdFRva2VuICYmICh0aGlzLmlzT3BlbkJyYWNlVHlwZShsYXN0VG9rZW4udHlwZSkgfHwgbGFzdFRva2VuLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1hKSkge1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcoY3VycmVudC5zdGFydCwgY3VycmVudC5lbmQpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGhhbmRsZUVxdWFsKHQsIGluZGV4KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNNdWx0aXBsZVN0YXRlbWVudHMoaW5kZXgpICYmICF0aGlzLmJyYWNlQ291bnRlci5pc09wZW5lZCh0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UpKSB7XHJcbiAgICAgICAgICAgIC8vIHggPSAxOyB4LCB5ID0geSwgeFxyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJz0nKTtcclxuICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgPSBpbiBmdW5jdGlvbiBhcmd1bWVudHMuIElmIHNvLCBkbyBub3QgYWRkIHNwYWNlcyBhcm91bmQgaXQuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMoaW5kZXgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJz0nKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XHJcbiAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnPScpO1xyXG4gICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgIH1cclxuICAgIGhhbmRsZU90aGVyKHQsIGluZGV4KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNCcmFjZVR5cGUodC50eXBlKSkge1xyXG4gICAgICAgICAgICB0aGlzLmJyYWNlQ291bnRlci5jb3VudEJyYWNlKHQpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBwcmV2ID0gaW5kZXggPiAwID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4IC0gMSkgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKHByZXYgJiYgcHJldi5sZW5ndGggPT09IDEgJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQocHJldi5zdGFydCkgPT09IDYxIC8qIEVxdWFsICovICYmIHRoaXMuaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMoaW5kZXggLSAxKSkge1xyXG4gICAgICAgICAgICAvLyBEb24ndCBhZGQgc3BhY2UgYXJvdW5kID0gaW5zaWRlIGZ1bmN0aW9uIGFyZ3VtZW50cy5cclxuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHByZXYgJiYgKHRoaXMuaXNPcGVuQnJhY2VUeXBlKHByZXYudHlwZSkgfHwgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikpIHtcclxuICAgICAgICAgICAgLy8gRG9uJ3QgaW5zZXJ0IHNwYWNlIGFmdGVyICgsIFsgb3IgeyAuXHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk51bWJlciAmJiBwcmV2ICYmIHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3IgJiYgcHJldi5sZW5ndGggPT09IDEgJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQocHJldi5zdGFydCkgPT09IDEyNiAvKiBUaWxkZSAqLykge1xyXG4gICAgICAgICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIH4gYmVmb3JlIG51bWJlcnNcclxuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHQudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuVW5rbm93bikge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVVua25vd24odCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBJbiBnZW5lcmFsLCBrZWVwIHRva2VucyBzZXBhcmF0ZWQuXHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaGFuZGxlVW5rbm93bih0KSB7XHJcbiAgICAgICAgY29uc3QgcHJldkNoYXIgPSB0LnN0YXJ0ID4gMCA/IHRoaXMudGV4dC5jaGFyQ29kZUF0KHQuc3RhcnQgLSAxKSA6IDA7XHJcbiAgICAgICAgaWYgKHByZXZDaGFyID09PSAzMiAvKiBTcGFjZSAqLyB8fCBwcmV2Q2hhciA9PT0gOSAvKiBUYWIgKi8pIHtcclxuICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcclxuICAgICAgICBjb25zdCBuZXh0Q2hhciA9IHQuZW5kIDwgdGhpcy50ZXh0Lmxlbmd0aCAtIDEgPyB0aGlzLnRleHQuY2hhckNvZGVBdCh0LmVuZCkgOiAwO1xyXG4gICAgICAgIGlmIChuZXh0Q2hhciA9PT0gMzIgLyogU3BhY2UgKi8gfHwgbmV4dENoYXIgPT09IDkgLyogVGFiICovKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XHJcbiAgICBpc0VxdWFsc0luc2lkZUFyZ3VtZW50cyhpbmRleCkge1xyXG4gICAgICAgIGlmIChpbmRleCA8IDEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBXZSBhcmUgbG9va2luZyBmb3IgSURFTlQgPSA/XHJcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCAtIDEpO1xyXG4gICAgICAgIGlmIChwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaW5kZXggPiAxICYmIHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCAtIDIpLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gVHlwZSBoaW50IHNob3VsZCBoYXZlIHNwYWNlcyBhcm91bmQgbGlrZSBmb28oeDogaW50ID0gMSkgcGVyIFBFUCA4XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLmlzSW5zaWRlRnVuY3Rpb25Bcmd1bWVudHModGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4KS5zdGFydCk7XHJcbiAgICB9XHJcbiAgICBpc09wZW5CcmFjZVR5cGUodHlwZSkge1xyXG4gICAgICAgIHJldHVybiB0eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNrZXQgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkN1cmx5O1xyXG4gICAgfVxyXG4gICAgaXNDbG9zZUJyYWNlVHlwZSh0eXBlKSB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNsb3NlQnJhY2UgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VCcmFja2V0IHx8IHR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNsb3NlQ3VybHk7XHJcbiAgICB9XHJcbiAgICBpc0JyYWNlVHlwZSh0eXBlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNPcGVuQnJhY2VUeXBlKHR5cGUpIHx8IHRoaXMuaXNDbG9zZUJyYWNlVHlwZSh0eXBlKTtcclxuICAgIH1cclxuICAgIGlzTXVsdGlwbGVTdGF0ZW1lbnRzKGluZGV4KSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGkgLT0gMSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50b2tlbnMuZ2V0SXRlbUF0KGkpLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLlNlbWljb2xvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaXNLZXl3b3JkV2l0aFNwYWNlQmVmb3JlQnJhY2Uocykge1xyXG4gICAgICAgIHJldHVybiBrZXl3b3Jkc1dpdGhTcGFjZUJlZm9yZUJyYWNlLmluZGV4T2YocykgPj0gMDtcclxuICAgIH1cclxuICAgIGlzS2V5d29yZCh0LCBrZXl3b3JkKSB7XHJcbiAgICAgICAgcmV0dXJuIHQudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllciAmJiB0Lmxlbmd0aCA9PT0ga2V5d29yZC5sZW5ndGggJiYgdGhpcy50ZXh0LnN1YnN0cih0LnN0YXJ0LCB0Lmxlbmd0aCkgPT09IGtleXdvcmQ7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XHJcbiAgICBpc0luc2lkZUZ1bmN0aW9uQXJndW1lbnRzKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gdW5hYmxlIHRvIGRldGVybWluZVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBXYWxrIHVwIHVudGlsIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQgb3IgbGluZSB3aXRoICdkZWYgSURFTlQoJyBvciBsaW5lIGVuZGluZyB3aXRoIDpcclxuICAgICAgICAvLyBJREVOVCggYnkgaXRzZWxmIGlzIG5vdCByZWxpYWJsZSBzaW5jZSB0aGV5IGNhbiBiZSBuZXN0ZWQgaW4gSURFTlQoSURFTlQoYSksIHg9MSlcclxuICAgICAgICBsZXQgc3RhcnQgPSBuZXcgdnNjb2RlXzEuUG9zaXRpb24oMCwgMCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMubGluZU51bWJlcjsgaSA+PSAwOyBpIC09IDEpIHtcclxuICAgICAgICAgICAgY29uc3QgbGluZSA9IHRoaXMuZG9jdW1lbnQubGluZUF0KGkpO1xyXG4gICAgICAgICAgICBjb25zdCBsaW5lVG9rZW5zID0gbmV3IHRva2VuaXplcl8xLlRva2VuaXplcigpLnRva2VuaXplKGxpbmUudGV4dCk7XHJcbiAgICAgICAgICAgIGlmIChsaW5lVG9rZW5zLmNvdW50ID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyAnZGVmIElERU5UKCdcclxuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBsaW5lVG9rZW5zLmdldEl0ZW1BdCgwKTtcclxuICAgICAgICAgICAgaWYgKGxpbmVUb2tlbnMuY291bnQgPj0gMyAmJlxyXG4gICAgICAgICAgICAgICAgZmlyc3QubGVuZ3RoID09PSAzICYmIGxpbmUudGV4dC5zdWJzdHIoZmlyc3Quc3RhcnQsIGZpcnN0Lmxlbmd0aCkgPT09ICdkZWYnICYmXHJcbiAgICAgICAgICAgICAgICBsaW5lVG9rZW5zLmdldEl0ZW1BdCgxKS50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyICYmXHJcbiAgICAgICAgICAgICAgICBsaW5lVG9rZW5zLmdldEl0ZW1BdCgyKS50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UpIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGluZS5yYW5nZS5zdGFydDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChsaW5lVG9rZW5zLmNvdW50ID4gMCAmJiBpIDwgdGhpcy5saW5lTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBPbmUgb2YgcHJldmlvdXMgbGluZXMgZW5kcyB3aXRoIDpcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBsaW5lVG9rZW5zLmdldEl0ZW1BdChsaW5lVG9rZW5zLmNvdW50IC0gMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGFzdC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gdGhpcy5kb2N1bWVudC5saW5lQXQoaSArIDEpLnJhbmdlLnN0YXJ0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobGluZVRva2Vucy5jb3VudCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmVMYXN0ID0gbGluZVRva2Vucy5nZXRJdGVtQXQobGluZVRva2Vucy5jb3VudCAtIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmVMYXN0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uICYmIGxhc3QudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IHRoaXMuZG9jdW1lbnQubGluZUF0KGkgKyAxKS5yYW5nZS5zdGFydDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIE5vdyB0b2tlbml6ZSBmcm9tIHRoZSBuZWFyZXN0IHJlYXNvbmFibGUgcG9pbnRcclxuICAgICAgICBjb25zdCBjdXJyZW50TGluZSA9IHRoaXMuZG9jdW1lbnQubGluZUF0KHRoaXMubGluZU51bWJlcik7XHJcbiAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuZG9jdW1lbnQuZ2V0VGV4dChuZXcgdnNjb2RlXzEuUmFuZ2Uoc3RhcnQsIGN1cnJlbnRMaW5lLnJhbmdlLmVuZCkpO1xyXG4gICAgICAgIGNvbnN0IHRva2VucyA9IG5ldyB0b2tlbml6ZXJfMS5Ub2tlbml6ZXIoKS50b2tlbml6ZSh0ZXh0KTtcclxuICAgICAgICAvLyBUcmFuc2xhdGUgcG9zaXRpb24gaW4gdGhlIGxpbmUgYmVpbmcgZm9ybWF0dGVkIHRvIHRoZSBwb3NpdGlvbiBpbiB0aGUgdG9rZW5pemVkIGJsb2NrXHJcbiAgICAgICAgcG9zaXRpb24gPSB0aGlzLmRvY3VtZW50Lm9mZnNldEF0KGN1cnJlbnRMaW5lLnJhbmdlLnN0YXJ0KSArIHBvc2l0aW9uIC0gdGhpcy5kb2N1bWVudC5vZmZzZXRBdChzdGFydCk7XHJcbiAgICAgICAgLy8gV2FsayB0b2tlbnMgbG9jYXRpbmcgbmFycm93ZXN0IGZ1bmN0aW9uIHNpZ25hdHVyZSBhcyBpbiBJREVOVCggfCApXHJcbiAgICAgICAgbGV0IGZ1bmNDYWxsU3RhcnRJbmRleCA9IC0xO1xyXG4gICAgICAgIGxldCBmdW5jQ2FsbEVuZEluZGV4ID0gLTE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMuY291bnQgLSAxOyBpICs9IDEpIHtcclxuICAgICAgICAgICAgY29uc3QgdCA9IHRva2Vucy5nZXRJdGVtQXQoaSk7XHJcbiAgICAgICAgICAgIGlmICh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5leHQgPSB0b2tlbnMuZ2V0SXRlbUF0KGkgKyAxKTtcclxuICAgICAgICAgICAgICAgIGlmIChuZXh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFjZSAmJiAhdGhpcy5pc0tleXdvcmRXaXRoU3BhY2VCZWZvcmVCcmFjZSh0ZXh0LnN1YnN0cih0LnN0YXJ0LCB0Lmxlbmd0aCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgYXJlIGF0IElERU5UKCwgdHJ5IGFuZCBsb2NhdGUgdGhlIGNsb3NpbmcgYnJhY2VcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2xvc2VCcmFjZUluZGV4ID0gdGhpcy5maW5kQ2xvc2luZ0JyYWNlKHRva2VucywgaSArIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIENsb3NpbmcgYnJhY2UgaXMgbm90IHJlcXVpcmVkIGluIGNhc2UgY29uc3RydWN0IGlzIG5vdCB5ZXQgdGVybWluYXRlZFxyXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlQnJhY2VJbmRleCA9IGNsb3NlQnJhY2VJbmRleCA+IDAgPyBjbG9zZUJyYWNlSW5kZXggOiB0b2tlbnMuY291bnQgLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFyZSB3ZSBpbiByYW5nZT9cclxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPiBuZXh0LnN0YXJ0ICYmIHBvc2l0aW9uIDwgdG9rZW5zLmdldEl0ZW1BdChjbG9zZUJyYWNlSW5kZXgpLnN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsU3RhcnRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsRW5kSW5kZXggPSBjbG9zZUJyYWNlSW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIERpZCB3ZSBmaW5kIGFueXRoaW5nP1xyXG4gICAgICAgIGlmIChmdW5jQ2FsbFN0YXJ0SW5kZXggPCAwKSB7XHJcbiAgICAgICAgICAgIC8vIE5vPyBTZWUgaWYgd2UgYXJlIGJldHdlZW4gJ2xhbWJkYScgYW5kICc6J1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5jb3VudDsgaSArPSAxKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gdG9rZW5zLmdldEl0ZW1BdChpKTtcclxuICAgICAgICAgICAgICAgIGlmICh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIgJiYgdGV4dC5zdWJzdHIodC5zdGFydCwgdC5sZW5ndGgpID09PSAnbGFtYmRhJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA8IHQuc3RhcnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIFBvc2l0aW9uIGlzIGJlZm9yZSB0aGUgbmVhcmVzdCAnbGFtYmRhJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgY29sb25JbmRleCA9IHRoaXMuZmluZE5lYXJlc3RDb2xvbih0b2tlbnMsIGkgKyAxKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDbG9zaW5nIDogaXMgbm90IHJlcXVpcmVkIGluIGNhc2UgY29uc3RydWN0IGlzIG5vdCB5ZXQgdGVybWluYXRlZFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9uSW5kZXggPSBjb2xvbkluZGV4ID4gMCA/IGNvbG9uSW5kZXggOiB0b2tlbnMuY291bnQgLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA+IHQuc3RhcnQgJiYgcG9zaXRpb24gPCB0b2tlbnMuZ2V0SXRlbUF0KGNvbG9uSW5kZXgpLnN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsU3RhcnRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsRW5kSW5kZXggPSBjb2xvbkluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZnVuY0NhbGxTdGFydEluZGV4ID49IDAgJiYgZnVuY0NhbGxFbmRJbmRleCA+IDA7XHJcbiAgICB9XHJcbiAgICBmaW5kTmVhcmVzdENvbG9uKHRva2VucywgaW5kZXgpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPCB0b2tlbnMuY291bnQ7IGkgKz0gMSkge1xyXG4gICAgICAgICAgICBpZiAodG9rZW5zLmdldEl0ZW1BdChpKS50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4gICAgZmluZENsb3NpbmdCcmFjZSh0b2tlbnMsIGluZGV4KSB7XHJcbiAgICAgICAgY29uc3QgYnJhY2VDb3VudGVyID0gbmV3IGJyYWNlQ291bnRlcl8xLkJyYWNlQ291bnRlcigpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSBpbmRleDsgaSA8IHRva2Vucy5jb3VudDsgaSArPSAxKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0b2tlbnMuZ2V0SXRlbUF0KGkpO1xyXG4gICAgICAgICAgICBpZiAodC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UgfHwgdC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNlKSB7XHJcbiAgICAgICAgICAgICAgICBicmFjZUNvdW50ZXIuY291bnRCcmFjZSh0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYnJhY2VDb3VudGVyLmNvdW50ID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9XHJcbiAgICBnZXRQcmV2aW91c0xpbmVUb2tlbnMoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50IHx8IHRoaXMubGluZU51bWJlciA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyB1bmFibGUgdG8gZGV0ZXJtaW5lXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGxpbmUgPSB0aGlzLmRvY3VtZW50LmxpbmVBdCh0aGlzLmxpbmVOdW1iZXIgLSAxKTtcclxuICAgICAgICByZXR1cm4gbmV3IHRva2VuaXplcl8xLlRva2VuaXplcigpLnRva2VuaXplKGxpbmUudGV4dCk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5MaW5lRm9ybWF0dGVyID0gTGluZUZvcm1hdHRlcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGluZUZvcm1hdHRlci5qcy5tYXAiXX0=