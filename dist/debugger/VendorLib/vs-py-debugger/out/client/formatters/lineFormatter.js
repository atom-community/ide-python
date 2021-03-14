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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbmVGb3JtYXR0ZXIuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJ2c2NvZGVfMSIsInJlcXVpcmUiLCJicmFjZUNvdW50ZXJfMSIsInRleHRCdWlsZGVyXzEiLCJ0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEiLCJ0b2tlbml6ZXJfMSIsInR5cGVzXzEiLCJrZXl3b3Jkc1dpdGhTcGFjZUJlZm9yZUJyYWNlIiwiTGluZUZvcm1hdHRlciIsImNvbnN0cnVjdG9yIiwiYnVpbGRlciIsIlRleHRCdWlsZGVyIiwidG9rZW5zIiwiVGV4dFJhbmdlQ29sbGVjdGlvbiIsImJyYWNlQ291bnRlciIsIkJyYWNlQ291bnRlciIsInRleHQiLCJsaW5lTnVtYmVyIiwiZm9ybWF0TGluZSIsImRvY3VtZW50IiwibGluZUF0IiwiVG9rZW5pemVyIiwidG9rZW5pemUiLCJjb3VudCIsIndzIiwic3Vic3RyIiwiZ2V0SXRlbUF0Iiwic3RhcnQiLCJsZW5ndGgiLCJhcHBlbmQiLCJpIiwidCIsInByZXYiLCJ1bmRlZmluZWQiLCJuZXh0IiwidHlwZSIsIlRva2VuVHlwZSIsIk9wZXJhdG9yIiwiaGFuZGxlT3BlcmF0b3IiLCJDb21tYSIsImlzQ2xvc2VCcmFjZVR5cGUiLCJDb2xvbiIsInNvZnRBcHBlbmRTcGFjZSIsIklkZW50aWZpZXIiLCJpc09wZW5CcmFjZVR5cGUiLCJpZCIsInN1YnN0cmluZyIsImVuZCIsImlzS2V5d29yZFdpdGhTcGFjZUJlZm9yZUJyYWNlIiwiaXNPcGVuZWQiLCJPcGVuQnJhY2tldCIsIkNvbW1lbnQiLCJTZW1pY29sb24iLCJoYW5kbGVPdGhlciIsImdldFRleHQiLCJpbmRleCIsIm9wQ29kZSIsImNoYXJDb2RlQXQiLCJoYW5kbGVFcXVhbCIsImlzS2V5d29yZCIsImhhbmRsZVN0YXJPcGVyYXRvciIsImN1cnJlbnQiLCJOdW1iZXIiLCJsYXN0TGluZSIsImdldFByZXZpb3VzTGluZVRva2VucyIsImxhc3RUb2tlbiIsImlzTXVsdGlwbGVTdGF0ZW1lbnRzIiwiT3BlbkJyYWNlIiwiaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMiLCJpc0JyYWNlVHlwZSIsImNvdW50QnJhY2UiLCJVbmtub3duIiwiaGFuZGxlVW5rbm93biIsInByZXZDaGFyIiwibmV4dENoYXIiLCJpc0luc2lkZUZ1bmN0aW9uQXJndW1lbnRzIiwiT3BlbkN1cmx5IiwiQ2xvc2VCcmFjZSIsIkNsb3NlQnJhY2tldCIsIkNsb3NlQ3VybHkiLCJzIiwiaW5kZXhPZiIsImtleXdvcmQiLCJwb3NpdGlvbiIsIlBvc2l0aW9uIiwibGluZSIsImxpbmVUb2tlbnMiLCJmaXJzdCIsInJhbmdlIiwibGFzdCIsImJlZm9yZUxhc3QiLCJjdXJyZW50TGluZSIsIlJhbmdlIiwib2Zmc2V0QXQiLCJmdW5jQ2FsbFN0YXJ0SW5kZXgiLCJmdW5jQ2FsbEVuZEluZGV4IiwiY2xvc2VCcmFjZUluZGV4IiwiZmluZENsb3NpbmdCcmFjZSIsImNvbG9uSW5kZXgiLCJmaW5kTmVhcmVzdENvbG9uIl0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxRQUFRLEdBQUdDLE9BQU8sQ0FBQyxRQUFELENBQXhCOztBQUNBLE1BQU1DLGNBQWMsR0FBR0QsT0FBTyxDQUFDLDBCQUFELENBQTlCOztBQUNBLE1BQU1FLGFBQWEsR0FBR0YsT0FBTyxDQUFDLHlCQUFELENBQTdCOztBQUNBLE1BQU1HLHFCQUFxQixHQUFHSCxPQUFPLENBQUMsaUNBQUQsQ0FBckM7O0FBQ0EsTUFBTUksV0FBVyxHQUFHSixPQUFPLENBQUMsdUJBQUQsQ0FBM0I7O0FBQ0EsTUFBTUssT0FBTyxHQUFHTCxPQUFPLENBQUMsbUJBQUQsQ0FBdkI7O0FBQ0EsTUFBTU0sNEJBQTRCLEdBQUcsQ0FDakMsS0FEaUMs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QyxNQUFkLENBQXFCLEtBQUtILFVBQUwsR0FBa0IsQ0FBdkMsQ0FBYjtBQUNBLFdBQU8sSUFBSVosV0FBVyxDQUFDZ0IsU0FBaEIsR0FBNEJDLFFBQTVCLENBQXFDK0QsSUFBSSxDQUFDckUsSUFBMUMsQ0FBUDtBQUNIOztBQXRYZTs7QUF3WHBCbEIsT0FBTyxDQUFDVSxhQUFSLEdBQXdCQSxhQUF4QiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCB2c2NvZGVfMSA9IHJlcXVpcmUoXCJ2c2NvZGVcIik7XG5jb25zdCBicmFjZUNvdW50ZXJfMSA9IHJlcXVpcmUoXCIuLi9sYW5ndWFnZS9icmFjZUNvdW50ZXJcIik7XG5jb25zdCB0ZXh0QnVpbGRlcl8xID0gcmVxdWlyZShcIi4uL2xhbmd1YWdlL3RleHRCdWlsZGVyXCIpO1xuY29uc3QgdGV4dFJhbmdlQ29sbGVjdGlvbl8xID0gcmVxdWlyZShcIi4uL2xhbmd1YWdlL3RleHRSYW5nZUNvbGxlY3Rpb25cIik7XG5jb25zdCB0b2tlbml6ZXJfMSA9IHJlcXVpcmUoXCIuLi9sYW5ndWFnZS90b2tlbml6ZXJcIik7XG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uL2xhbmd1YWdlL3R5cGVzXCIpO1xuY29uc3Qga2V5d29yZHNXaXRoU3BhY2VCZWZvcmVCcmFjZSA9IFtcbiAgICAnYW5kJywgJ2FzJywgJ2Fzc2VydCcsICdhd2FpdCcsXG4gICAgJ2RlbCcsXG4gICAgJ2V4Y2VwdCcsICdlbGlmJyxcbiAgICAnZm9yJywgJ2Zyb20nLFxuICAgICdnbG9iYWwnLFxuICAgICdpZicsICdpbXBvcnQnLCAnaW4nLCAnaXMnLFxuICAgICdsYW1iZGEnLFxuICAgICdub25sb2NhbCcsICdub3QnLFxuICAgICdvcicsXG4gICAgJ3JhaXNlJywgJ3JldHVybicsXG4gICAgJ3doaWxlJywgJ3dpdGgnLFxuICAgICd5aWVsZCdcbl07XG5jbGFzcyBMaW5lRm9ybWF0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5idWlsZGVyID0gbmV3IHRleHRCdWlsZGVyXzEuVGV4dEJ1aWxkZXIoKTtcbiAgICAgICAgdGhpcy50b2tlbnMgPSBuZXcgdGV4dFJhbmdlQ29sbGVjdGlvbl8xLlRleHRSYW5nZUNvbGxlY3Rpb24oW10pO1xuICAgICAgICB0aGlzLmJyYWNlQ291bnRlciA9IG5ldyBicmFjZUNvdW50ZXJfMS5CcmFjZUNvdW50ZXIoKTtcbiAgICAgICAgdGhpcy50ZXh0ID0gJyc7XG4gICAgICAgIHRoaXMubGluZU51bWJlciA9IDA7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICBmb3JtYXRMaW5lKGRvY3VtZW50LCBsaW5lTnVtYmVyKSB7XG4gICAgICAgIHRoaXMuZG9jdW1lbnQgPSBkb2N1bWVudDtcbiAgICAgICAgdGhpcy5saW5lTnVtYmVyID0gbGluZU51bWJlcjtcbiAgICAgICAgdGhpcy50ZXh0ID0gZG9jdW1lbnQubGluZUF0KGxpbmVOdW1iZXIpLnRleHQ7XG4gICAgICAgIHRoaXMudG9rZW5zID0gbmV3IHRva2VuaXplcl8xLlRva2VuaXplcigpLnRva2VuaXplKHRoaXMudGV4dCk7XG4gICAgICAgIHRoaXMuYnVpbGRlciA9IG5ldyB0ZXh0QnVpbGRlcl8xLlRleHRCdWlsZGVyKCk7XG4gICAgICAgIHRoaXMuYnJhY2VDb3VudGVyID0gbmV3IGJyYWNlQ291bnRlcl8xLkJyYWNlQ291bnRlcigpO1xuICAgICAgICBpZiAodGhpcy50b2tlbnMuY291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd3MgPSB0aGlzLnRleHQuc3Vic3RyKDAsIHRoaXMudG9rZW5zLmdldEl0ZW1BdCgwKS5zdGFydCk7XG4gICAgICAgIGlmICh3cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHdzKTsgLy8gUHJlc2VydmUgbGVhZGluZyBpbmRlbnRhdGlvbi5cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudG9rZW5zLmNvdW50OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaSk7XG4gICAgICAgICAgICBjb25zdCBwcmV2ID0gaSA+IDAgPyB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaSAtIDEpIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgbmV4dCA9IGkgPCB0aGlzLnRva2Vucy5jb3VudCAtIDEgPyB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaSArIDEpIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgc3dpdGNoICh0LnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZU9wZXJhdG9yKGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1hOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCcsJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICYmICF0aGlzLmlzQ2xvc2VCcmFjZVR5cGUobmV4dC50eXBlKSAmJiBuZXh0LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldiAmJiAhdGhpcy5pc09wZW5CcmFjZVR5cGUocHJldi50eXBlKSAmJiBwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uICYmIHByZXYudHlwZSAhPT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNLZXl3b3JkV2l0aFNwYWNlQmVmb3JlQnJhY2UoaWQpICYmIG5leHQgJiYgdGhpcy5pc09wZW5CcmFjZVR5cGUobmV4dC50eXBlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm9yIHggaW4gKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uOlxuICAgICAgICAgICAgICAgICAgICAvLyB4OiAxIGlmIG5vdCBpbiBzbGljZSwgeFsxOnldIGlmIGluc2lkZSB0aGUgc2xpY2UuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJzonKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJyYWNlQ291bnRlci5pc09wZW5lZCh0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2tldCkgJiYgKG5leHQgJiYgbmV4dC50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCBpbnNpZGUgb3BlbmVkIFtbIC4uLiBdIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWVudDpcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIDIgc3BhY2VzIGJlZm9yZSBpbi1saW5lIGNvbW1lbnQgcGVyIFBFUCBndWlkZWxpbmVzLlxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB0eXBlc18xLlRva2VuVHlwZS5TZW1pY29sb246XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJzsnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVPdGhlcih0LCBpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYnVpbGRlci5nZXRUZXh0KCk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICBoYW5kbGVPcGVyYXRvcihpbmRleCkge1xuICAgICAgICBjb25zdCB0ID0gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4KTtcbiAgICAgICAgY29uc3QgcHJldiA9IGluZGV4ID4gMCA/IHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCAtIDEpIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBvcENvZGUgPSB0aGlzLnRleHQuY2hhckNvZGVBdCh0LnN0YXJ0KTtcbiAgICAgICAgY29uc3QgbmV4dCA9IGluZGV4IDwgdGhpcy50b2tlbnMuY291bnQgLSAxID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4ICsgMSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc3dpdGNoIChvcENvZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDYxIC8qIEVxdWFsICovOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUVxdWFsKHQsIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgNDYgLyogUGVyaW9kICovOlxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldiAmJiB0aGlzLmlzS2V5d29yZChwcmV2LCAnZnJvbScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnLicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAmJiB0aGlzLmlzS2V5d29yZChuZXh0LCAnaW1wb3J0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY2FzZSA2NCAvKiBBdCAqLzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJpbmFyeSBjYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCdAJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCdAJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgMzMgLyogRXhjbGFtYXRpb25NYXJrICovOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCchJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIDQyIC8qIEFzdGVyaXNrICovOlxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldiAmJiB0aGlzLmlzS2V5d29yZChwcmV2LCAnbGFtYmRhJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJyonKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5oYW5kbGVTdGFyT3BlcmF0b3IodCwgcHJldikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0Lmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4dC5jaGFyQ29kZUF0KHQuc3RhcnQpID09PSA0MiAvKiBBc3RlcmlzayAqLyAmJiB0aGlzLnRleHQuY2hhckNvZGVBdCh0LnN0YXJ0ICsgMSkgPT09IDQyIC8qIEFzdGVyaXNrICovKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlU3Rhck9wZXJhdG9yKHQsIHByZXYpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gRG8gbm90IGFwcGVuZCBzcGFjZSBpZiBvcGVyYXRvciBpcyBwcmVjZWRlZCBieSAnKCcgb3IgJywnIGFzIGluIGZvbygqKmt3YXJnKVxuICAgICAgICBpZiAocHJldiAmJiAodGhpcy5pc09wZW5CcmFjZVR5cGUocHJldi50eXBlKSB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1hKSkge1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcbiAgICAgICAgLy8gQ2hlY2sgdW5hcnkgY2FzZVxuICAgICAgICBpZiAocHJldiAmJiBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yKSB7XG4gICAgICAgICAgICBpZiAob3BDb2RlID09PSA0NSAvKiBIeXBoZW4gKi8gfHwgb3BDb2RlID09PSA0MyAvKiBQbHVzICovIHx8IG9wQ29kZSA9PT0gMTI2IC8qIFRpbGRlICovKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICB9XG4gICAgaGFuZGxlU3Rhck9wZXJhdG9yKGN1cnJlbnQsIHByZXYpIHtcbiAgICAgICAgaWYgKHRoaXMudGV4dC5jaGFyQ29kZUF0KGN1cnJlbnQuc3RhcnQpID09PSA0MiAvKiBBc3RlcmlzayAqLyAmJiB0aGlzLnRleHQuY2hhckNvZGVBdChjdXJyZW50LnN0YXJ0ICsgMSkgPT09IDQyIC8qIEFzdGVyaXNrICovKSB7XG4gICAgICAgICAgICBpZiAoIXByZXYgfHwgKHByZXYudHlwZSAhPT0gdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllciAmJiBwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLk51bWJlcikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCcqKicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByZXYgJiYgdGhpcy5pc0tleXdvcmQocHJldiwgJ2xhbWJkYScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJyoqJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgcHJldmlvdXMgbGluZSBmb3IgdGhlICoqLyogY29uZGl0aW9uXG4gICAgICAgIGNvbnN0IGxhc3RMaW5lID0gdGhpcy5nZXRQcmV2aW91c0xpbmVUb2tlbnMoKTtcbiAgICAgICAgY29uc3QgbGFzdFRva2VuID0gbGFzdExpbmUgJiYgbGFzdExpbmUuY291bnQgPiAwID8gbGFzdExpbmUuZ2V0SXRlbUF0KGxhc3RMaW5lLmNvdW50IC0gMSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChsYXN0VG9rZW4gJiYgKHRoaXMuaXNPcGVuQnJhY2VUeXBlKGxhc3RUb2tlbi50eXBlKSB8fCBsYXN0VG9rZW4udHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWEpKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcoY3VycmVudC5zdGFydCwgY3VycmVudC5lbmQpKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaGFuZGxlRXF1YWwodCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNNdWx0aXBsZVN0YXRlbWVudHMoaW5kZXgpICYmICF0aGlzLmJyYWNlQ291bnRlci5pc09wZW5lZCh0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UpKSB7XG4gICAgICAgICAgICAvLyB4ID0gMTsgeCwgeSA9IHksIHhcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJz0nKTtcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzID0gaW4gZnVuY3Rpb24gYXJndW1lbnRzLiBJZiBzbywgZG8gbm90IGFkZCBzcGFjZXMgYXJvdW5kIGl0LlxuICAgICAgICBpZiAodGhpcy5pc0VxdWFsc0luc2lkZUFyZ3VtZW50cyhpbmRleCkpIHtcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJz0nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJz0nKTtcbiAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgIH1cbiAgICBoYW5kbGVPdGhlcih0LCBpbmRleCkge1xuICAgICAgICBpZiAodGhpcy5pc0JyYWNlVHlwZSh0LnR5cGUpKSB7XG4gICAgICAgICAgICB0aGlzLmJyYWNlQ291bnRlci5jb3VudEJyYWNlKHQpO1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJldiA9IGluZGV4ID4gMCA/IHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCAtIDEpIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAocHJldiAmJiBwcmV2Lmxlbmd0aCA9PT0gMSAmJiB0aGlzLnRleHQuY2hhckNvZGVBdChwcmV2LnN0YXJ0KSA9PT0gNjEgLyogRXF1YWwgKi8gJiYgdGhpcy5pc0VxdWFsc0luc2lkZUFyZ3VtZW50cyhpbmRleCAtIDEpKSB7XG4gICAgICAgICAgICAvLyBEb24ndCBhZGQgc3BhY2UgYXJvdW5kID0gaW5zaWRlIGZ1bmN0aW9uIGFyZ3VtZW50cy5cbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmV2ICYmICh0aGlzLmlzT3BlbkJyYWNlVHlwZShwcmV2LnR5cGUpIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29sb24pKSB7XG4gICAgICAgICAgICAvLyBEb24ndCBpbnNlcnQgc3BhY2UgYWZ0ZXIgKCwgWyBvciB7IC5cbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk51bWJlciAmJiBwcmV2ICYmIHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3IgJiYgcHJldi5sZW5ndGggPT09IDEgJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQocHJldi5zdGFydCkgPT09IDEyNiAvKiBUaWxkZSAqLykge1xuICAgICAgICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciB+IGJlZm9yZSBudW1iZXJzXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Vbmtub3duKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVVua25vd24odCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBJbiBnZW5lcmFsLCBrZWVwIHRva2VucyBzZXBhcmF0ZWQuXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBoYW5kbGVVbmtub3duKHQpIHtcbiAgICAgICAgY29uc3QgcHJldkNoYXIgPSB0LnN0YXJ0ID4gMCA/IHRoaXMudGV4dC5jaGFyQ29kZUF0KHQuc3RhcnQgLSAxKSA6IDA7XG4gICAgICAgIGlmIChwcmV2Q2hhciA9PT0gMzIgLyogU3BhY2UgKi8gfHwgcHJldkNoYXIgPT09IDkgLyogVGFiICovKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgIGNvbnN0IG5leHRDaGFyID0gdC5lbmQgPCB0aGlzLnRleHQubGVuZ3RoIC0gMSA/IHRoaXMudGV4dC5jaGFyQ29kZUF0KHQuZW5kKSA6IDA7XG4gICAgICAgIGlmIChuZXh0Q2hhciA9PT0gMzIgLyogU3BhY2UgKi8gfHwgbmV4dENoYXIgPT09IDkgLyogVGFiICovKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxuICAgIGlzRXF1YWxzSW5zaWRlQXJndW1lbnRzKGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA8IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBhcmUgbG9va2luZyBmb3IgSURFTlQgPSA/XG4gICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaW5kZXggLSAxKTtcbiAgICAgICAgaWYgKHByZXYudHlwZSAhPT0gdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmRleCA+IDEgJiYgdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4IC0gMikudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29sb24pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gVHlwZSBoaW50IHNob3VsZCBoYXZlIHNwYWNlcyBhcm91bmQgbGlrZSBmb28oeDogaW50ID0gMSkgcGVyIFBFUCA4XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnNpZGVGdW5jdGlvbkFyZ3VtZW50cyh0aGlzLnRva2Vucy5nZXRJdGVtQXQoaW5kZXgpLnN0YXJ0KTtcbiAgICB9XG4gICAgaXNPcGVuQnJhY2VUeXBlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFjZSB8fCB0eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2tldCB8fCB0eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQ3VybHk7XG4gICAgfVxuICAgIGlzQ2xvc2VCcmFjZVR5cGUodHlwZSkge1xuICAgICAgICByZXR1cm4gdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VCcmFjZSB8fCB0eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNrZXQgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VDdXJseTtcbiAgICB9XG4gICAgaXNCcmFjZVR5cGUodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc09wZW5CcmFjZVR5cGUodHlwZSkgfHwgdGhpcy5pc0Nsb3NlQnJhY2VUeXBlKHR5cGUpO1xuICAgIH1cbiAgICBpc011bHRpcGxlU3RhdGVtZW50cyhpbmRleCkge1xuICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPj0gMDsgaSAtPSAxKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50b2tlbnMuZ2V0SXRlbUF0KGkpLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLlNlbWljb2xvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaXNLZXl3b3JkV2l0aFNwYWNlQmVmb3JlQnJhY2Uocykge1xuICAgICAgICByZXR1cm4ga2V5d29yZHNXaXRoU3BhY2VCZWZvcmVCcmFjZS5pbmRleE9mKHMpID49IDA7XG4gICAgfVxuICAgIGlzS2V5d29yZCh0LCBrZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiB0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIgJiYgdC5sZW5ndGggPT09IGtleXdvcmQubGVuZ3RoICYmIHRoaXMudGV4dC5zdWJzdHIodC5zdGFydCwgdC5sZW5ndGgpID09PSBrZXl3b3JkO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgaXNJbnNpZGVGdW5jdGlvbkFyZ3VtZW50cyhwb3NpdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMuZG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gdW5hYmxlIHRvIGRldGVybWluZVxuICAgICAgICB9XG4gICAgICAgIC8vIFdhbGsgdXAgdW50aWwgYmVnaW5uaW5nIG9mIHRoZSBkb2N1bWVudCBvciBsaW5lIHdpdGggJ2RlZiBJREVOVCgnIG9yIGxpbmUgZW5kaW5nIHdpdGggOlxuICAgICAgICAvLyBJREVOVCggYnkgaXRzZWxmIGlzIG5vdCByZWxpYWJsZSBzaW5jZSB0aGV5IGNhbiBiZSBuZXN0ZWQgaW4gSURFTlQoSURFTlQoYSksIHg9MSlcbiAgICAgICAgbGV0IHN0YXJ0ID0gbmV3IHZzY29kZV8xLlBvc2l0aW9uKDAsIDApO1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5saW5lTnVtYmVyOyBpID49IDA7IGkgLT0gMSkge1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IHRoaXMuZG9jdW1lbnQubGluZUF0KGkpO1xuICAgICAgICAgICAgY29uc3QgbGluZVRva2VucyA9IG5ldyB0b2tlbml6ZXJfMS5Ub2tlbml6ZXIoKS50b2tlbml6ZShsaW5lLnRleHQpO1xuICAgICAgICAgICAgaWYgKGxpbmVUb2tlbnMuY291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICdkZWYgSURFTlQoJ1xuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBsaW5lVG9rZW5zLmdldEl0ZW1BdCgwKTtcbiAgICAgICAgICAgIGlmIChsaW5lVG9rZW5zLmNvdW50ID49IDMgJiZcbiAgICAgICAgICAgICAgICBmaXJzdC5sZW5ndGggPT09IDMgJiYgbGluZS50ZXh0LnN1YnN0cihmaXJzdC5zdGFydCwgZmlyc3QubGVuZ3RoKSA9PT0gJ2RlZicgJiZcbiAgICAgICAgICAgICAgICBsaW5lVG9rZW5zLmdldEl0ZW1BdCgxKS50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyICYmXG4gICAgICAgICAgICAgICAgbGluZVRva2Vucy5nZXRJdGVtQXQoMikudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNlKSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSBsaW5lLnJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxpbmVUb2tlbnMuY291bnQgPiAwICYmIGkgPCB0aGlzLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmUgb2YgcHJldmlvdXMgbGluZXMgZW5kcyB3aXRoIDpcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gbGluZVRva2Vucy5nZXRJdGVtQXQobGluZVRva2Vucy5jb3VudCAtIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsYXN0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gdGhpcy5kb2N1bWVudC5saW5lQXQoaSArIDEpLnJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobGluZVRva2Vucy5jb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlTGFzdCA9IGxpbmVUb2tlbnMuZ2V0SXRlbUF0KGxpbmVUb2tlbnMuY291bnQgLSAyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlZm9yZUxhc3QudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29sb24gJiYgbGFzdC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db21tZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IHRoaXMuZG9jdW1lbnQubGluZUF0KGkgKyAxKS5yYW5nZS5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIE5vdyB0b2tlbml6ZSBmcm9tIHRoZSBuZWFyZXN0IHJlYXNvbmFibGUgcG9pbnRcbiAgICAgICAgY29uc3QgY3VycmVudExpbmUgPSB0aGlzLmRvY3VtZW50LmxpbmVBdCh0aGlzLmxpbmVOdW1iZXIpO1xuICAgICAgICBjb25zdCB0ZXh0ID0gdGhpcy5kb2N1bWVudC5nZXRUZXh0KG5ldyB2c2NvZGVfMS5SYW5nZShzdGFydCwgY3VycmVudExpbmUucmFuZ2UuZW5kKSk7XG4gICAgICAgIGNvbnN0IHRva2VucyA9IG5ldyB0b2tlbml6ZXJfMS5Ub2tlbml6ZXIoKS50b2tlbml6ZSh0ZXh0KTtcbiAgICAgICAgLy8gVHJhbnNsYXRlIHBvc2l0aW9uIGluIHRoZSBsaW5lIGJlaW5nIGZvcm1hdHRlZCB0byB0aGUgcG9zaXRpb24gaW4gdGhlIHRva2VuaXplZCBibG9ja1xuICAgICAgICBwb3NpdGlvbiA9IHRoaXMuZG9jdW1lbnQub2Zmc2V0QXQoY3VycmVudExpbmUucmFuZ2Uuc3RhcnQpICsgcG9zaXRpb24gLSB0aGlzLmRvY3VtZW50Lm9mZnNldEF0KHN0YXJ0KTtcbiAgICAgICAgLy8gV2FsayB0b2tlbnMgbG9jYXRpbmcgbmFycm93ZXN0IGZ1bmN0aW9uIHNpZ25hdHVyZSBhcyBpbiBJREVOVCggfCApXG4gICAgICAgIGxldCBmdW5jQ2FsbFN0YXJ0SW5kZXggPSAtMTtcbiAgICAgICAgbGV0IGZ1bmNDYWxsRW5kSW5kZXggPSAtMTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMuY291bnQgLSAxOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0b2tlbnMuZ2V0SXRlbUF0KGkpO1xuICAgICAgICAgICAgaWYgKHQudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHQgPSB0b2tlbnMuZ2V0SXRlbUF0KGkgKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UgJiYgIXRoaXMuaXNLZXl3b3JkV2l0aFNwYWNlQmVmb3JlQnJhY2UodGV4dC5zdWJzdHIodC5zdGFydCwgdC5sZW5ndGgpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBhcmUgYXQgSURFTlQoLCB0cnkgYW5kIGxvY2F0ZSB0aGUgY2xvc2luZyBicmFjZVxuICAgICAgICAgICAgICAgICAgICBsZXQgY2xvc2VCcmFjZUluZGV4ID0gdGhpcy5maW5kQ2xvc2luZ0JyYWNlKHRva2VucywgaSArIDEpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDbG9zaW5nIGJyYWNlIGlzIG5vdCByZXF1aXJlZCBpbiBjYXNlIGNvbnN0cnVjdCBpcyBub3QgeWV0IHRlcm1pbmF0ZWRcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VCcmFjZUluZGV4ID0gY2xvc2VCcmFjZUluZGV4ID4gMCA/IGNsb3NlQnJhY2VJbmRleCA6IHRva2Vucy5jb3VudCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFyZSB3ZSBpbiByYW5nZT9cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID4gbmV4dC5zdGFydCAmJiBwb3NpdGlvbiA8IHRva2Vucy5nZXRJdGVtQXQoY2xvc2VCcmFjZUluZGV4KS5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY0NhbGxTdGFydEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsRW5kSW5kZXggPSBjbG9zZUJyYWNlSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gRGlkIHdlIGZpbmQgYW55dGhpbmc/XG4gICAgICAgIGlmIChmdW5jQ2FsbFN0YXJ0SW5kZXggPCAwKSB7XG4gICAgICAgICAgICAvLyBObz8gU2VlIGlmIHdlIGFyZSBiZXR3ZWVuICdsYW1iZGEnIGFuZCAnOidcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmNvdW50OyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gdG9rZW5zLmdldEl0ZW1BdChpKTtcbiAgICAgICAgICAgICAgICBpZiAodC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyICYmIHRleHQuc3Vic3RyKHQuc3RhcnQsIHQubGVuZ3RoKSA9PT0gJ2xhbWJkYScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uIDwgdC5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIFBvc2l0aW9uIGlzIGJlZm9yZSB0aGUgbmVhcmVzdCAnbGFtYmRhJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb2xvbkluZGV4ID0gdGhpcy5maW5kTmVhcmVzdENvbG9uKHRva2VucywgaSArIDEpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDbG9zaW5nIDogaXMgbm90IHJlcXVpcmVkIGluIGNhc2UgY29uc3RydWN0IGlzIG5vdCB5ZXQgdGVybWluYXRlZFxuICAgICAgICAgICAgICAgICAgICBjb2xvbkluZGV4ID0gY29sb25JbmRleCA+IDAgPyBjb2xvbkluZGV4IDogdG9rZW5zLmNvdW50IC0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID4gdC5zdGFydCAmJiBwb3NpdGlvbiA8IHRva2Vucy5nZXRJdGVtQXQoY29sb25JbmRleCkuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsU3RhcnRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jQ2FsbEVuZEluZGV4ID0gY29sb25JbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVuY0NhbGxTdGFydEluZGV4ID49IDAgJiYgZnVuY0NhbGxFbmRJbmRleCA+IDA7XG4gICAgfVxuICAgIGZpbmROZWFyZXN0Q29sb24odG9rZW5zLCBpbmRleCkge1xuICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPCB0b2tlbnMuY291bnQ7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHRva2Vucy5nZXRJdGVtQXQoaSkudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29sb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGZpbmRDbG9zaW5nQnJhY2UodG9rZW5zLCBpbmRleCkge1xuICAgICAgICBjb25zdCBicmFjZUNvdW50ZXIgPSBuZXcgYnJhY2VDb3VudGVyXzEuQnJhY2VDb3VudGVyKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSBpbmRleDsgaSA8IHRva2Vucy5jb3VudDsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCB0ID0gdG9rZW5zLmdldEl0ZW1BdChpKTtcbiAgICAgICAgICAgIGlmICh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFjZSB8fCB0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNsb3NlQnJhY2UpIHtcbiAgICAgICAgICAgICAgICBicmFjZUNvdW50ZXIuY291bnRCcmFjZSh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChicmFjZUNvdW50ZXIuY291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGdldFByZXZpb3VzTGluZVRva2VucygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50IHx8IHRoaXMubGluZU51bWJlciA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDsgLy8gdW5hYmxlIHRvIGRldGVybWluZVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxpbmUgPSB0aGlzLmRvY3VtZW50LmxpbmVBdCh0aGlzLmxpbmVOdW1iZXIgLSAxKTtcbiAgICAgICAgcmV0dXJuIG5ldyB0b2tlbml6ZXJfMS5Ub2tlbml6ZXIoKS50b2tlbml6ZShsaW5lLnRleHQpO1xuICAgIH1cbn1cbmV4cG9ydHMuTGluZUZvcm1hdHRlciA9IExpbmVGb3JtYXR0ZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1saW5lRm9ybWF0dGVyLmpzLm1hcCJdfQ==