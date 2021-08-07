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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbmVGb3JtYXR0ZXIuanMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJ2c2NvZGVfMSIsInJlcXVpcmUiLCJicmFjZUNvdW50ZXJfMSIsInRleHRCdWlsZGVyXzEiLCJ0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEiLCJ0b2tlbml6ZXJfMSIsInR5cGVzXzEiLCJrZXl3b3Jkc1dpdGhTcGFjZUJlZm9yZUJyYWNlIiwiTGluZUZvcm1hdHRlciIsImNvbnN0cnVjdG9yIiwiYnVpbGRlciIsIlRleHRCdWlsZGVyIiwidG9rZW5zIiwiVGV4dFJhbmdlQ29sbGVjdGlvbiIsImJyYWNlQ291bnRlciIsIkJyYWNlQ291bnRlciIsInRleHQiLCJsaW5lTnVtYmVyIiwiZm9ybWF0TGluZSIsImRvY3VtZW50IiwibGluZUF0IiwiVG9rZW5pemVyIiwidG9rZW5pemUiLCJjb3VudCIsIndzIiwic3Vic3RyIiwiZ2V0SXRlbUF0Iiwic3RhcnQiLCJsZW5ndGgiLCJhcHBlbmQiLCJpIiwidCIsInByZXYiLCJ1bmRlZmluZWQiLCJuZXh0IiwidHlwZSIsIlRva2VuVHlwZSIsIk9wZXJhdG9yIiwiaGFuZGxlT3BlcmF0b3IiLCJDb21tYSIsImlzQ2xvc2VCcmFjZVR5cGUiLCJDb2xvbiIsInNvZnRBcHBlbmRTcGFjZSIsIklkZW50aWZpZXIiLCJpc09wZW5CcmFjZVR5cGUiLCJpZCIsInN1YnN0cmluZyIsImVuZCIsImlzS2V5d29yZFdpdGhTcGFjZUJlZm9yZUJyYWNlIiwiaXNPcGVuZWQiLCJPcGVuQnJhY2tldCIsIkNvbW1lbnQiLCJTZW1pY29sb24iLCJoYW5kbGVPdGhlciIsImdldFRleHQiLCJpbmRleCIsIm9wQ29kZSIsImNoYXJDb2RlQXQiLCJoYW5kbGVFcXVhbCIsImlzS2V5d29yZCIsImhhbmRsZVN0YXJPcGVyYXRvciIsImN1cnJlbnQiLCJOdW1iZXIiLCJsYXN0TGluZSIsImdldFByZXZpb3VzTGluZVRva2VucyIsImxhc3RUb2tlbiIsImlzTXVsdGlwbGVTdGF0ZW1lbnRzIiwiT3BlbkJyYWNlIiwiaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMiLCJpc0JyYWNlVHlwZSIsImNvdW50QnJhY2UiLCJVbmtub3duIiwiaGFuZGxlVW5rbm93biIsInByZXZDaGFyIiwibmV4dENoYXIiLCJpc0luc2lkZUZ1bmN0aW9uQXJndW1lbnRzIiwiT3BlbkN1cmx5IiwiQ2xvc2VCcmFjZSIsIkNsb3NlQnJhY2tldCIsIkNsb3NlQ3VybHkiLCJzIiwiaW5kZXhPZiIsImtleXdvcmQiLCJwb3NpdGlvbiIsIlBvc2l0aW9uIiwibGluZSIsImxpbmVUb2tlbnMiLCJmaXJzdCIsInJhbmdlIiwibGFzdCIsImJlZm9yZUxhc3QiLCJjdXJyZW50TGluZSIsIlJhbmdlIiwib2Zmc2V0QXQiLCJmdW5jQ2FsbFN0YXJ0SW5kZXgiLCJmdW5jQ2FsbEVuZEluZGV4IiwiY2xvc2VCcmFjZUluZGV4IiwiZmluZENsb3NpbmdCcmFjZSIsImNvbG9uSW5kZXgiLCJmaW5kTmVhcmVzdENvbG9uIl0sIm1hcHBpbmdzIjoiQUFBQSxhLENBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxRQUFRLEdBQUdDLE9BQU8sQ0FBQyxRQUFELENBQXhCOztBQUNBLE1BQU1DLGNBQWMsR0FBR0QsT0FBTyxDQUFDLDBCQUFELENBQTlCOztBQUNBLE1BQU1FLGFBQWEsR0FBR0YsT0FBTyxDQUFDLHlCQUFELENBQTdCOztBQUNBLE1BQU1HLHFCQUFxQixHQUFHSCxPQUFPLENBQUMsaUNBQUQsQ0FBckM7O0FBQ0EsTUFBTUksV0FBVyxHQUFHSixPQUFPLENBQUMsdUJBQUQsQ0FBM0I7O0FBQ0EsTUFBTUssT0FBTyxHQUFHTCxPQUFPLENBQUMsbUJBQUQsQ0FBdkI7O0FBQ0EsTUFBTU0sNEJBQTRCLEdBQUcsQ0FDakMsS0FEaUMs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TUFBZCxDQUFxQixLQUFLSCxVQUFMLEdBQWtCLENBQXZDLENBQWI7QUFDQSxXQUFPLElBQUlaLFdBQVcsQ0FBQ2dCLFNBQWhCLEdBQTRCQyxRQUE1QixDQUFxQytELElBQUksQ0FBQ3JFLElBQTFDLENBQVA7QUFDSDs7QUF0WGU7O0FBd1hwQmxCLE9BQU8sQ0FBQ1UsYUFBUixHQUF3QkEsYUFBeEIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgdnNjb2RlXzEgPSByZXF1aXJlKFwidnNjb2RlXCIpO1xuY29uc3QgYnJhY2VDb3VudGVyXzEgPSByZXF1aXJlKFwiLi4vbGFuZ3VhZ2UvYnJhY2VDb3VudGVyXCIpO1xuY29uc3QgdGV4dEJ1aWxkZXJfMSA9IHJlcXVpcmUoXCIuLi9sYW5ndWFnZS90ZXh0QnVpbGRlclwiKTtcbmNvbnN0IHRleHRSYW5nZUNvbGxlY3Rpb25fMSA9IHJlcXVpcmUoXCIuLi9sYW5ndWFnZS90ZXh0UmFuZ2VDb2xsZWN0aW9uXCIpO1xuY29uc3QgdG9rZW5pemVyXzEgPSByZXF1aXJlKFwiLi4vbGFuZ3VhZ2UvdG9rZW5pemVyXCIpO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi9sYW5ndWFnZS90eXBlc1wiKTtcbmNvbnN0IGtleXdvcmRzV2l0aFNwYWNlQmVmb3JlQnJhY2UgPSBbXG4gICAgJ2FuZCcsICdhcycsICdhc3NlcnQnLCAnYXdhaXQnLFxuICAgICdkZWwnLFxuICAgICdleGNlcHQnLCAnZWxpZicsXG4gICAgJ2ZvcicsICdmcm9tJyxcbiAgICAnZ2xvYmFsJyxcbiAgICAnaWYnLCAnaW1wb3J0JywgJ2luJywgJ2lzJyxcbiAgICAnbGFtYmRhJyxcbiAgICAnbm9ubG9jYWwnLCAnbm90JyxcbiAgICAnb3InLFxuICAgICdyYWlzZScsICdyZXR1cm4nLFxuICAgICd3aGlsZScsICd3aXRoJyxcbiAgICAneWllbGQnXG5dO1xuY2xhc3MgTGluZUZvcm1hdHRlciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuYnVpbGRlciA9IG5ldyB0ZXh0QnVpbGRlcl8xLlRleHRCdWlsZGVyKCk7XG4gICAgICAgIHRoaXMudG9rZW5zID0gbmV3IHRleHRSYW5nZUNvbGxlY3Rpb25fMS5UZXh0UmFuZ2VDb2xsZWN0aW9uKFtdKTtcbiAgICAgICAgdGhpcy5icmFjZUNvdW50ZXIgPSBuZXcgYnJhY2VDb3VudGVyXzEuQnJhY2VDb3VudGVyKCk7XG4gICAgICAgIHRoaXMudGV4dCA9ICcnO1xuICAgICAgICB0aGlzLmxpbmVOdW1iZXIgPSAwO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgZm9ybWF0TGluZShkb2N1bWVudCwgbGluZU51bWJlcikge1xuICAgICAgICB0aGlzLmRvY3VtZW50ID0gZG9jdW1lbnQ7XG4gICAgICAgIHRoaXMubGluZU51bWJlciA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHRoaXMudGV4dCA9IGRvY3VtZW50LmxpbmVBdChsaW5lTnVtYmVyKS50ZXh0O1xuICAgICAgICB0aGlzLnRva2VucyA9IG5ldyB0b2tlbml6ZXJfMS5Ub2tlbml6ZXIoKS50b2tlbml6ZSh0aGlzLnRleHQpO1xuICAgICAgICB0aGlzLmJ1aWxkZXIgPSBuZXcgdGV4dEJ1aWxkZXJfMS5UZXh0QnVpbGRlcigpO1xuICAgICAgICB0aGlzLmJyYWNlQ291bnRlciA9IG5ldyBicmFjZUNvdW50ZXJfMS5CcmFjZUNvdW50ZXIoKTtcbiAgICAgICAgaWYgKHRoaXMudG9rZW5zLmNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50ZXh0O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdzID0gdGhpcy50ZXh0LnN1YnN0cigwLCB0aGlzLnRva2Vucy5nZXRJdGVtQXQoMCkuc3RhcnQpO1xuICAgICAgICBpZiAod3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh3cyk7IC8vIFByZXNlcnZlIGxlYWRpbmcgaW5kZW50YXRpb24uXG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRva2Vucy5jb3VudDsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCB0ID0gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGkpO1xuICAgICAgICAgICAgY29uc3QgcHJldiA9IGkgPiAwID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGkgLSAxKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBpIDwgdGhpcy50b2tlbnMuY291bnQgLSAxID8gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGkgKyAxKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHN3aXRjaCAodC50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSB0eXBlc18xLlRva2VuVHlwZS5PcGVyYXRvcjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVPcGVyYXRvcihpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB0eXBlc18xLlRva2VuVHlwZS5Db21tYTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnLCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAmJiAhdGhpcy5pc0Nsb3NlQnJhY2VUeXBlKG5leHQudHlwZSkgJiYgbmV4dC50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYgJiYgIXRoaXMuaXNPcGVuQnJhY2VUeXBlKHByZXYudHlwZSkgJiYgcHJldi50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbiAmJiBwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZChpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzS2V5d29yZFdpdGhTcGFjZUJlZm9yZUJyYWNlKGlkKSAmJiBuZXh0ICYmIHRoaXMuaXNPcGVuQnJhY2VUeXBlKG5leHQudHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvciB4IGluICgpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbjpcbiAgICAgICAgICAgICAgICAgICAgLy8geDogMSBpZiBub3QgaW4gc2xpY2UsIHhbMTp5XSBpZiBpbnNpZGUgdGhlIHNsaWNlLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCc6Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5icmFjZUNvdW50ZXIuaXNPcGVuZWQodHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNrZXQpICYmIChuZXh0ICYmIG5leHQudHlwZSAhPT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29sb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3QgaW5zaWRlIG9wZW5lZCBbWyAuLi4gXSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCAyIHNwYWNlcyBiZWZvcmUgaW4tbGluZSBjb21tZW50IHBlciBQRVAgZ3VpZGVsaW5lcy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdHlwZXNfMS5Ub2tlblR5cGUuU2VtaWNvbG9uOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCc7Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlT3RoZXIodCwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmJ1aWxkZXIuZ2V0VGV4dCgpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgaGFuZGxlT3BlcmF0b3IoaW5kZXgpIHtcbiAgICAgICAgY29uc3QgdCA9IHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCk7XG4gICAgICAgIGNvbnN0IHByZXYgPSBpbmRleCA+IDAgPyB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaW5kZXggLSAxKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3Qgb3BDb2RlID0gdGhpcy50ZXh0LmNoYXJDb2RlQXQodC5zdGFydCk7XG4gICAgICAgIGNvbnN0IG5leHQgPSBpbmRleCA8IHRoaXMudG9rZW5zLmNvdW50IC0gMSA/IHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCArIDEpIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAodC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAob3BDb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSA2MSAvKiBFcXVhbCAqLzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcXVhbCh0LCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIDQ2IC8qIFBlcmlvZCAqLzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYgJiYgdGhpcy5pc0tleXdvcmQocHJldiwgJ2Zyb20nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgdGhpcy5pc0tleXdvcmQobmV4dCwgJ2ltcG9ydCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgNjQgLyogQXQgKi86XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCaW5hcnkgY2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnQCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnQCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIDMzIC8qIEV4Y2xhbWF0aW9uTWFyayAqLzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnIScpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY2FzZSA0MiAvKiBBc3RlcmlzayAqLzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYgJiYgdGhpcy5pc0tleXdvcmQocHJldiwgJ2xhbWJkYScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCcqJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlU3Rhck9wZXJhdG9yKHQsIHByZXYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodC5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRleHQuY2hhckNvZGVBdCh0LnN0YXJ0KSA9PT0gNDIgLyogQXN0ZXJpc2sgKi8gJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQodC5zdGFydCArIDEpID09PSA0MiAvKiBBc3RlcmlzayAqLykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhbmRsZVN0YXJPcGVyYXRvcih0LCBwcmV2KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIERvIG5vdCBhcHBlbmQgc3BhY2UgaWYgb3BlcmF0b3IgaXMgcHJlY2VkZWQgYnkgJygnIG9yICcsJyBhcyBpbiBmb28oKiprd2FyZylcbiAgICAgICAgaWYgKHByZXYgJiYgKHRoaXMuaXNPcGVuQnJhY2VUeXBlKHByZXYudHlwZSkgfHwgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db21tYSkpIHtcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgIC8vIENoZWNrIHVuYXJ5IGNhc2VcbiAgICAgICAgaWYgKHByZXYgJiYgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVyYXRvcikge1xuICAgICAgICAgICAgaWYgKG9wQ29kZSA9PT0gNDUgLyogSHlwaGVuICovIHx8IG9wQ29kZSA9PT0gNDMgLyogUGx1cyAqLyB8fCBvcENvZGUgPT09IDEyNiAvKiBUaWxkZSAqLykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgfVxuICAgIGhhbmRsZVN0YXJPcGVyYXRvcihjdXJyZW50LCBwcmV2KSB7XG4gICAgICAgIGlmICh0aGlzLnRleHQuY2hhckNvZGVBdChjdXJyZW50LnN0YXJ0KSA9PT0gNDIgLyogQXN0ZXJpc2sgKi8gJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQoY3VycmVudC5zdGFydCArIDEpID09PSA0MiAvKiBBc3RlcmlzayAqLykge1xuICAgICAgICAgICAgaWYgKCFwcmV2IHx8IChwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIgJiYgcHJldi50eXBlICE9PSB0eXBlc18xLlRva2VuVHlwZS5OdW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCgnKionKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcmV2ICYmIHRoaXMuaXNLZXl3b3JkKHByZXYsICdsYW1iZGEnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCcqKicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIENoZWNrIHByZXZpb3VzIGxpbmUgZm9yIHRoZSAqKi8qIGNvbmRpdGlvblxuICAgICAgICBjb25zdCBsYXN0TGluZSA9IHRoaXMuZ2V0UHJldmlvdXNMaW5lVG9rZW5zKCk7XG4gICAgICAgIGNvbnN0IGxhc3RUb2tlbiA9IGxhc3RMaW5lICYmIGxhc3RMaW5lLmNvdW50ID4gMCA/IGxhc3RMaW5lLmdldEl0ZW1BdChsYXN0TGluZS5jb3VudCAtIDEpIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAobGFzdFRva2VuICYmICh0aGlzLmlzT3BlbkJyYWNlVHlwZShsYXN0VG9rZW4udHlwZSkgfHwgbGFzdFRva2VuLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1hKSkge1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKGN1cnJlbnQuc3RhcnQsIGN1cnJlbnQuZW5kKSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGhhbmRsZUVxdWFsKHQsIGluZGV4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzTXVsdGlwbGVTdGF0ZW1lbnRzKGluZGV4KSAmJiAhdGhpcy5icmFjZUNvdW50ZXIuaXNPcGVuZWQodHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNlKSkge1xuICAgICAgICAgICAgLy8geCA9IDE7IHgsIHkgPSB5LCB4XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCc9Jyk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuc29mdEFwcGVuZFNwYWNlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyA9IGluIGZ1bmN0aW9uIGFyZ3VtZW50cy4gSWYgc28sIGRvIG5vdCBhZGQgc3BhY2VzIGFyb3VuZCBpdC5cbiAgICAgICAgaWYgKHRoaXMuaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMoaW5kZXgpKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCc9Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKCc9Jyk7XG4gICAgICAgIHRoaXMuYnVpbGRlci5zb2Z0QXBwZW5kU3BhY2UoKTtcbiAgICB9XG4gICAgaGFuZGxlT3RoZXIodCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNCcmFjZVR5cGUodC50eXBlKSkge1xuICAgICAgICAgICAgdGhpcy5icmFjZUNvdW50ZXIuY291bnRCcmFjZSh0KTtcbiAgICAgICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByZXYgPSBpbmRleCA+IDAgPyB0aGlzLnRva2Vucy5nZXRJdGVtQXQoaW5kZXggLSAxKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHByZXYgJiYgcHJldi5sZW5ndGggPT09IDEgJiYgdGhpcy50ZXh0LmNoYXJDb2RlQXQocHJldi5zdGFydCkgPT09IDYxIC8qIEVxdWFsICovICYmIHRoaXMuaXNFcXVhbHNJbnNpZGVBcmd1bWVudHMoaW5kZXggLSAxKSkge1xuICAgICAgICAgICAgLy8gRG9uJ3QgYWRkIHNwYWNlIGFyb3VuZCA9IGluc2lkZSBmdW5jdGlvbiBhcmd1bWVudHMuXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJldiAmJiAodGhpcy5pc09wZW5CcmFjZVR5cGUocHJldi50eXBlKSB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSkge1xuICAgICAgICAgICAgLy8gRG9uJ3QgaW5zZXJ0IHNwYWNlIGFmdGVyICgsIFsgb3IgeyAuXG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIuYXBwZW5kKHRoaXMudGV4dC5zdWJzdHJpbmcodC5zdGFydCwgdC5lbmQpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5OdW1iZXIgJiYgcHJldiAmJiBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yICYmIHByZXYubGVuZ3RoID09PSAxICYmIHRoaXMudGV4dC5jaGFyQ29kZUF0KHByZXYuc3RhcnQpID09PSAxMjYgLyogVGlsZGUgKi8pIHtcbiAgICAgICAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgfiBiZWZvcmUgbnVtYmVyc1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHQudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuVW5rbm93bikge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVVbmtub3duKHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gSW4gZ2VuZXJhbCwga2VlcCB0b2tlbnMgc2VwYXJhdGVkLlxuICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLmFwcGVuZCh0aGlzLnRleHQuc3Vic3RyaW5nKHQuc3RhcnQsIHQuZW5kKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaGFuZGxlVW5rbm93bih0KSB7XG4gICAgICAgIGNvbnN0IHByZXZDaGFyID0gdC5zdGFydCA+IDAgPyB0aGlzLnRleHQuY2hhckNvZGVBdCh0LnN0YXJ0IC0gMSkgOiAwO1xuICAgICAgICBpZiAocHJldkNoYXIgPT09IDMyIC8qIFNwYWNlICovIHx8IHByZXZDaGFyID09PSA5IC8qIFRhYiAqLykge1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnVpbGRlci5hcHBlbmQodGhpcy50ZXh0LnN1YnN0cmluZyh0LnN0YXJ0LCB0LmVuZCkpO1xuICAgICAgICBjb25zdCBuZXh0Q2hhciA9IHQuZW5kIDwgdGhpcy50ZXh0Lmxlbmd0aCAtIDEgPyB0aGlzLnRleHQuY2hhckNvZGVBdCh0LmVuZCkgOiAwO1xuICAgICAgICBpZiAobmV4dENoYXIgPT09IDMyIC8qIFNwYWNlICovIHx8IG5leHRDaGFyID09PSA5IC8qIFRhYiAqLykge1xuICAgICAgICAgICAgdGhpcy5idWlsZGVyLnNvZnRBcHBlbmRTcGFjZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICBpc0VxdWFsc0luc2lkZUFyZ3VtZW50cyhpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPCAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgYXJlIGxvb2tpbmcgZm9yIElERU5UID0gP1xuICAgICAgICBjb25zdCBwcmV2ID0gdGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4IC0gMSk7XG4gICAgICAgIGlmIChwcmV2LnR5cGUgIT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5kZXggPiAxICYmIHRoaXMudG9rZW5zLmdldEl0ZW1BdChpbmRleCAtIDIpLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFR5cGUgaGludCBzaG91bGQgaGF2ZSBzcGFjZXMgYXJvdW5kIGxpa2UgZm9vKHg6IGludCA9IDEpIHBlciBQRVAgOFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmlzSW5zaWRlRnVuY3Rpb25Bcmd1bWVudHModGhpcy50b2tlbnMuZ2V0SXRlbUF0KGluZGV4KS5zdGFydCk7XG4gICAgfVxuICAgIGlzT3BlbkJyYWNlVHlwZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNrZXQgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkN1cmx5O1xuICAgIH1cbiAgICBpc0Nsb3NlQnJhY2VUeXBlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNsb3NlQnJhY2UgfHwgdHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VCcmFja2V0IHx8IHR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNsb3NlQ3VybHk7XG4gICAgfVxuICAgIGlzQnJhY2VUeXBlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNPcGVuQnJhY2VUeXBlKHR5cGUpIHx8IHRoaXMuaXNDbG9zZUJyYWNlVHlwZSh0eXBlKTtcbiAgICB9XG4gICAgaXNNdWx0aXBsZVN0YXRlbWVudHMoaW5kZXgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGkgLT0gMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudG9rZW5zLmdldEl0ZW1BdChpKS50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5TZW1pY29sb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlzS2V5d29yZFdpdGhTcGFjZUJlZm9yZUJyYWNlKHMpIHtcbiAgICAgICAgcmV0dXJuIGtleXdvcmRzV2l0aFNwYWNlQmVmb3JlQnJhY2UuaW5kZXhPZihzKSA+PSAwO1xuICAgIH1cbiAgICBpc0tleXdvcmQodCwga2V5d29yZCkge1xuICAgICAgICByZXR1cm4gdC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyICYmIHQubGVuZ3RoID09PSBrZXl3b3JkLmxlbmd0aCAmJiB0aGlzLnRleHQuc3Vic3RyKHQuc3RhcnQsIHQubGVuZ3RoKSA9PT0ga2V5d29yZDtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxuICAgIGlzSW5zaWRlRnVuY3Rpb25Bcmd1bWVudHMocG9zaXRpb24pIHtcbiAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIHVuYWJsZSB0byBkZXRlcm1pbmVcbiAgICAgICAgfVxuICAgICAgICAvLyBXYWxrIHVwIHVudGlsIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQgb3IgbGluZSB3aXRoICdkZWYgSURFTlQoJyBvciBsaW5lIGVuZGluZyB3aXRoIDpcbiAgICAgICAgLy8gSURFTlQoIGJ5IGl0c2VsZiBpcyBub3QgcmVsaWFibGUgc2luY2UgdGhleSBjYW4gYmUgbmVzdGVkIGluIElERU5UKElERU5UKGEpLCB4PTEpXG4gICAgICAgIGxldCBzdGFydCA9IG5ldyB2c2NvZGVfMS5Qb3NpdGlvbigwLCAwKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMubGluZU51bWJlcjsgaSA+PSAwOyBpIC09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSB0aGlzLmRvY3VtZW50LmxpbmVBdChpKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVUb2tlbnMgPSBuZXcgdG9rZW5pemVyXzEuVG9rZW5pemVyKCkudG9rZW5pemUobGluZS50ZXh0KTtcbiAgICAgICAgICAgIGlmIChsaW5lVG9rZW5zLmNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAnZGVmIElERU5UKCdcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gbGluZVRva2Vucy5nZXRJdGVtQXQoMCk7XG4gICAgICAgICAgICBpZiAobGluZVRva2Vucy5jb3VudCA+PSAzICYmXG4gICAgICAgICAgICAgICAgZmlyc3QubGVuZ3RoID09PSAzICYmIGxpbmUudGV4dC5zdWJzdHIoZmlyc3Quc3RhcnQsIGZpcnN0Lmxlbmd0aCkgPT09ICdkZWYnICYmXG4gICAgICAgICAgICAgICAgbGluZVRva2Vucy5nZXRJdGVtQXQoMSkudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllciAmJlxuICAgICAgICAgICAgICAgIGxpbmVUb2tlbnMuZ2V0SXRlbUF0KDIpLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFjZSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGluZS5yYW5nZS5zdGFydDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsaW5lVG9rZW5zLmNvdW50ID4gMCAmJiBpIDwgdGhpcy5saW5lTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gT25lIG9mIHByZXZpb3VzIGxpbmVzIGVuZHMgd2l0aCA6XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IGxpbmVUb2tlbnMuZ2V0SXRlbUF0KGxpbmVUb2tlbnMuY291bnQgLSAxKTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvbikge1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IHRoaXMuZG9jdW1lbnQubGluZUF0KGkgKyAxKS5yYW5nZS5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxpbmVUb2tlbnMuY291bnQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZUxhc3QgPSBsaW5lVG9rZW5zLmdldEl0ZW1BdChsaW5lVG9rZW5zLmNvdW50IC0gMik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmVMYXN0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uICYmIGxhc3QudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSB0aGlzLmRvY3VtZW50LmxpbmVBdChpICsgMSkucmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBOb3cgdG9rZW5pemUgZnJvbSB0aGUgbmVhcmVzdCByZWFzb25hYmxlIHBvaW50XG4gICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lID0gdGhpcy5kb2N1bWVudC5saW5lQXQodGhpcy5saW5lTnVtYmVyKTtcbiAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuZG9jdW1lbnQuZ2V0VGV4dChuZXcgdnNjb2RlXzEuUmFuZ2Uoc3RhcnQsIGN1cnJlbnRMaW5lLnJhbmdlLmVuZCkpO1xuICAgICAgICBjb25zdCB0b2tlbnMgPSBuZXcgdG9rZW5pemVyXzEuVG9rZW5pemVyKCkudG9rZW5pemUodGV4dCk7XG4gICAgICAgIC8vIFRyYW5zbGF0ZSBwb3NpdGlvbiBpbiB0aGUgbGluZSBiZWluZyBmb3JtYXR0ZWQgdG8gdGhlIHBvc2l0aW9uIGluIHRoZSB0b2tlbml6ZWQgYmxvY2tcbiAgICAgICAgcG9zaXRpb24gPSB0aGlzLmRvY3VtZW50Lm9mZnNldEF0KGN1cnJlbnRMaW5lLnJhbmdlLnN0YXJ0KSArIHBvc2l0aW9uIC0gdGhpcy5kb2N1bWVudC5vZmZzZXRBdChzdGFydCk7XG4gICAgICAgIC8vIFdhbGsgdG9rZW5zIGxvY2F0aW5nIG5hcnJvd2VzdCBmdW5jdGlvbiBzaWduYXR1cmUgYXMgaW4gSURFTlQoIHwgKVxuICAgICAgICBsZXQgZnVuY0NhbGxTdGFydEluZGV4ID0gLTE7XG4gICAgICAgIGxldCBmdW5jQ2FsbEVuZEluZGV4ID0gLTE7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmNvdW50IC0gMTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCB0ID0gdG9rZW5zLmdldEl0ZW1BdChpKTtcbiAgICAgICAgICAgIGlmICh0LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0ID0gdG9rZW5zLmdldEl0ZW1BdChpICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHQudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNlICYmICF0aGlzLmlzS2V5d29yZFdpdGhTcGFjZUJlZm9yZUJyYWNlKHRleHQuc3Vic3RyKHQuc3RhcnQsIHQubGVuZ3RoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgYXJlIGF0IElERU5UKCwgdHJ5IGFuZCBsb2NhdGUgdGhlIGNsb3NpbmcgYnJhY2VcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNsb3NlQnJhY2VJbmRleCA9IHRoaXMuZmluZENsb3NpbmdCcmFjZSh0b2tlbnMsIGkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xvc2luZyBicmFjZSBpcyBub3QgcmVxdWlyZWQgaW4gY2FzZSBjb25zdHJ1Y3QgaXMgbm90IHlldCB0ZXJtaW5hdGVkXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlQnJhY2VJbmRleCA9IGNsb3NlQnJhY2VJbmRleCA+IDAgPyBjbG9zZUJyYWNlSW5kZXggOiB0b2tlbnMuY291bnQgLSAxO1xuICAgICAgICAgICAgICAgICAgICAvLyBBcmUgd2UgaW4gcmFuZ2U/XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA+IG5leHQuc3RhcnQgJiYgcG9zaXRpb24gPCB0b2tlbnMuZ2V0SXRlbUF0KGNsb3NlQnJhY2VJbmRleCkuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNDYWxsU3RhcnRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jQ2FsbEVuZEluZGV4ID0gY2xvc2VCcmFjZUluZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIERpZCB3ZSBmaW5kIGFueXRoaW5nP1xuICAgICAgICBpZiAoZnVuY0NhbGxTdGFydEluZGV4IDwgMCkge1xuICAgICAgICAgICAgLy8gTm8/IFNlZSBpZiB3ZSBhcmUgYmV0d2VlbiAnbGFtYmRhJyBhbmQgJzonXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5jb3VudDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IHRva2Vucy5nZXRJdGVtQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKHQudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuSWRlbnRpZmllciAmJiB0ZXh0LnN1YnN0cih0LnN0YXJ0LCB0Lmxlbmd0aCkgPT09ICdsYW1iZGEnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA8IHQuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBQb3NpdGlvbiBpcyBiZWZvcmUgdGhlIG5lYXJlc3QgJ2xhbWJkYSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgY29sb25JbmRleCA9IHRoaXMuZmluZE5lYXJlc3RDb2xvbih0b2tlbnMsIGkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xvc2luZyA6IGlzIG5vdCByZXF1aXJlZCBpbiBjYXNlIGNvbnN0cnVjdCBpcyBub3QgeWV0IHRlcm1pbmF0ZWRcbiAgICAgICAgICAgICAgICAgICAgY29sb25JbmRleCA9IGNvbG9uSW5kZXggPiAwID8gY29sb25JbmRleCA6IHRva2Vucy5jb3VudCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA+IHQuc3RhcnQgJiYgcG9zaXRpb24gPCB0b2tlbnMuZ2V0SXRlbUF0KGNvbG9uSW5kZXgpLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jQ2FsbFN0YXJ0SW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY0NhbGxFbmRJbmRleCA9IGNvbG9uSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZ1bmNDYWxsU3RhcnRJbmRleCA+PSAwICYmIGZ1bmNDYWxsRW5kSW5kZXggPiAwO1xuICAgIH1cbiAgICBmaW5kTmVhcmVzdENvbG9uKHRva2VucywgaW5kZXgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpIDwgdG9rZW5zLmNvdW50OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh0b2tlbnMuZ2V0SXRlbUF0KGkpLnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBmaW5kQ2xvc2luZ0JyYWNlKHRva2VucywgaW5kZXgpIHtcbiAgICAgICAgY29uc3QgYnJhY2VDb3VudGVyID0gbmV3IGJyYWNlQ291bnRlcl8xLkJyYWNlQ291bnRlcigpO1xuICAgICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPCB0b2tlbnMuY291bnQ7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgdCA9IHRva2Vucy5nZXRJdGVtQXQoaSk7XG4gICAgICAgICAgICBpZiAodC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UgfHwgdC50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNlKSB7XG4gICAgICAgICAgICAgICAgYnJhY2VDb3VudGVyLmNvdW50QnJhY2UodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYnJhY2VDb3VudGVyLmNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBnZXRQcmV2aW91c0xpbmVUb2tlbnMoKSB7XG4gICAgICAgIGlmICghdGhpcy5kb2N1bWVudCB8fCB0aGlzLmxpbmVOdW1iZXIgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIHVuYWJsZSB0byBkZXRlcm1pbmVcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsaW5lID0gdGhpcy5kb2N1bWVudC5saW5lQXQodGhpcy5saW5lTnVtYmVyIC0gMSk7XG4gICAgICAgIHJldHVybiBuZXcgdG9rZW5pemVyXzEuVG9rZW5pemVyKCkudG9rZW5pemUobGluZS50ZXh0KTtcbiAgICB9XG59XG5leHBvcnRzLkxpbmVGb3JtYXR0ZXIgPSBMaW5lRm9ybWF0dGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGluZUZvcm1hdHRlci5qcy5tYXAiXX0=