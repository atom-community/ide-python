// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

const characters_1 = require("./characters");

const characterStream_1 = require("./characterStream");

const textRangeCollection_1 = require("./textRangeCollection");

const types_1 = require("./types");

var QuoteType;

(function (QuoteType) {
  QuoteType[QuoteType["None"] = 0] = "None";
  QuoteType[QuoteType["Single"] = 1] = "Single";
  QuoteType[QuoteType["Double"] = 2] = "Double";
  QuoteType[QuoteType["TripleSingle"] = 3] = "TripleSingle";
  QuoteType[QuoteType["TripleDouble"] = 4] = "TripleDouble";
})(QuoteType || (QuoteType = {}));

class Token extends types_1.TextRange {
  constructor(type, start, length) {
    super(start, length);
    this.type = type;
  }

}

class Tokenizer {
  constructor() {
    this.cs = new characterStream_1.CharacterStream('');
    this.tokens = [];
    this.mode = types_1.TokenizerMode.Full;
  }

  tokenize(text, start, length, mode) {
    if (start === undefined) {
      start = 0;
    } else if (start < 0 || start >= text.length) {
      throw new Error('Invalid range start');
    }

    if (length === undefined) {
      length = text.length;
    } else if (length < 0 || start + length > text.length) {
      throw new Error('Invalid range length');
    }

    this.mode = mode !== undefined ? mode : types_1.TokenizerMode.Full;
    this.cs = new characterStream_1.CharacterStream(text);
    this.cs.position = start;
    const end = start + length;

    while (!this.cs.isEndOfStream()) {
      this.AddNextToken();

      if (this.cs.position >= end) {
        break;
      }
    }

    return new textRangeCollection_1.TextRangeCollection(this.tokens);
  }

  AddNextToken() {
    this.cs.skipWhitespace();

    if (this.cs.isEndOfStream()) {
      return;
    }

    if (!this.handleCharacter()) {
      this.cs.moveNext();
    }
  } // tslint:disable-next-line:cyclomatic-complexity


  handleCharacter() {
    // f-strings, b-strings, etc
    const stringPrefixLength = this.getStringPrefixLength();

    if (stringPrefixLength >= 0) {
      // Indeed a string
      this.cs.advance(stringPrefixLength);
      const quoteType = this.getQuoteType();

      if (quoteType !== QuoteType.None) {
        this.handleString(quoteType, stringPrefixLength);
        return true;
      }
    }

    if (this.cs.currentChar === 35
    /* Hash */
    ) {
      this.handleComment();
      return true;
    }

    if (this.mode === types_1.TokenizerMode.CommentsAndStrings) {
      return false;
    }

    switch (this.cs.currentChar) {
      case 40
      /* OpenParenthesis */
      :
        this.tokens.push(new Token(types_1.TokenType.OpenBrace, this.cs.position, 1));
        break;

      case 41
      /* CloseParenthesis */
      :
        this.tokens.push(new Token(types_1.TokenType.CloseBrace, this.cs.position, 1));
        break;

      case 91
      /* OpenBracket */
      :
        this.tokens.push(new Token(types_1.TokenType.OpenBracket, this.cs.position, 1));
        break;

      case 93
      /* CloseBracket */
      :
        this.tokens.push(new Token(types_1.TokenType.CloseBracket, this.cs.position, 1));
        break;

      case 123
      /* OpenBrace */
      :
        this.tokens.push(new Token(types_1.TokenType.OpenCurly, this.cs.position, 1));
        break;

      case 125
      /* CloseBrace */
      :
        this.tokens.push(new Token(types_1.TokenType.CloseCurly, this.cs.position, 1));
        break;

      case 44
      /* Comma */
      :
        this.tokens.push(new Token(types_1.TokenType.Comma, this.cs.position, 1));
        break;

      case 59
      /* Semicolon */
      :
        this.tokens.push(new Token(types_1.TokenType.Semicolon, this.cs.position, 1));
        break;

      case 58
      /* Colon */
      :
        this.tokens.push(new Token(types_1.TokenType.Colon, this.cs.position, 1));
        break;

      default:
        if (this.isPossibleNumber()) {
          if (this.tryNumber()) {
            return true;
          }
        }

        if (this.cs.currentChar === 46
        /* Period */
        ) {
          this.tokens.push(new Token(types_1.TokenType.Operator, this.cs.position, 1));
          break;
        }

        if (!this.tryIdentifier()) {
          if (!this.tryOperator()) {
            this.handleUnknown();
          }
        }

        return true;
    }

    return false;
  }

  tryIdentifier() {
    const start = this.cs.position;

    if (characters_1.isIdentifierStartChar(this.cs.currentChar)) {
      this.cs.moveNext();

      while (characters_1.isIdentifierChar(this.cs.currentChar)) {
        this.cs.moveNext();
      }
    }

    if (this.cs.position > start) {
      // const text = this.cs.getText().substr(start, this.cs.position - start);
      // const type = this.keywords.find((value, index) => value === text) ? TokenType.Keyword : TokenType.Identifier;
      this.tokens.push(new Token(types_1.TokenType.Identifier, start, this.cs.position - start));
      return true;
    }

    return false;
  } // tslint:disable-next-line:cyclomatic-complexity


  isPossibleNumber() {
    if (characters_1.isDecimal(this.cs.currentChar)) {
      return true;
    }

    if (this.cs.currentChar === 46
    /* Period */
    && characters_1.isDecimal(this.cs.nextChar)) {
      return true;
    }

    const next = this.cs.currentChar === 45
    /* Hyphen */
    || this.cs.currentChar === 43
    /* Plus */
    ? 1 : 0; // Next character must be decimal or a dot otherwise
    // it is not a number. No whitespace is allowed.

    if (characters_1.isDecimal(this.cs.lookAhead(next)) || this.cs.lookAhead(next) === 46
    /* Period */
    ) {
      // Check what previous token is, if any
      if (this.tokens.length === 0) {
        // At the start of the file this can only be a number
        return true;
      }

      const prev = this.tokens[this.tokens.length - 1];

      if (prev.type === types_1.TokenType.OpenBrace || prev.type === types_1.TokenType.OpenBracket || prev.type === types_1.TokenType.Comma || prev.type === types_1.TokenType.Colon || prev.type === types_1.TokenType.Semicolon || prev.type === types_1.TokenType.Operator) {
        return true;
      }
    }

    if (this.cs.lookAhead(next) === 48
    /* _0 */
    ) {
      const nextNext = this.cs.lookAhead(next + 1);

      if (nextNext === 120
      /* x */
      || nextNext === 88
      /* X */
      ) {
        return true;
      }

      if (nextNext === 98
      /* b */
      || nextNext === 66
      /* B */
      ) {
        return true;
      }

      if (nextNext === 111
      /* o */
      || nextNext === 79
      /* O */
      ) {
        return true;
      }
    }

    return false;
  } // tslint:disable-next-line:cyclomatic-complexity


  tryNumber() {
    const start = this.cs.position;
    let leadingSign = 0;

    if (this.cs.currentChar === 45
    /* Hyphen */
    || this.cs.currentChar === 43
    /* Plus */
    ) {
      this.cs.moveNext(); // Skip leading +/-

      leadingSign = 1;
    }

    if (this.cs.currentChar === 48
    /* _0 */
    ) {
      let radix = 0; // Try hex => hexinteger: "0" ("x" | "X") (["_"] hexdigit)+

      if ((this.cs.nextChar === 120
      /* x */
      || this.cs.nextChar === 88
      /* X */
      ) && characters_1.isHex(this.cs.lookAhead(2))) {
        this.cs.advance(2);

        while (characters_1.isHex(this.cs.currentChar)) {
          this.cs.moveNext();
        }

        radix = 16;
      } // Try binary => bininteger: "0" ("b" | "B") (["_"] bindigit)+


      if ((this.cs.nextChar === 98
      /* b */
      || this.cs.nextChar === 66
      /* B */
      ) && characters_1.isBinary(this.cs.lookAhead(2))) {
        this.cs.advance(2);

        while (characters_1.isBinary(this.cs.currentChar)) {
          this.cs.moveNext();
        }

        radix = 2;
      } // Try octal => octinteger: "0" ("o" | "O") (["_"] octdigit)+


      if ((this.cs.nextChar === 111
      /* o */
      || this.cs.nextChar === 79
      /* O */
      ) && characters_1.isOctal(this.cs.lookAhead(2))) {
        this.cs.advance(2);

        while (characters_1.isOctal(this.cs.currentChar)) {
          this.cs.moveNext();
        }

        radix = 8;
      }

      if (radix > 0) {
        const text = this.cs.getText().substr(start + leadingSign, this.cs.position - start - leadingSign);

        if (!isNaN(parseInt(text, radix))) {
          this.tokens.push(new Token(types_1.TokenType.Number, start, text.length + leadingSign));
          return true;
        }
      }
    }

    let decimal = false; // Try decimal int =>
    //    decinteger: nonzerodigit (["_"] digit)* | "0" (["_"] "0")*
    //    nonzerodigit: "1"..."9"
    //    digit: "0"..."9"

    if (this.cs.currentChar >= 49
    /* _1 */
    && this.cs.currentChar <= 57
    /* _9 */
    ) {
      while (characters_1.isDecimal(this.cs.currentChar)) {
        this.cs.moveNext();
      }

      decimal = this.cs.currentChar !== 46
      /* Period */
      && this.cs.currentChar !== 101
      /* e */
      && this.cs.currentChar !== 69
      /* E */
      ;
    }

    if (this.cs.currentChar === 48
    /* _0 */
    ) {
      // "0" (["_"] "0")*
      while (this.cs.currentChar === 48
      /* _0 */
      || this.cs.currentChar === 95
      /* Underscore */
      ) {
        this.cs.moveNext();
      }

      decimal = this.cs.currentChar !== 46
      /* Period */
      && this.cs.currentChar !== 101
      /* e */
      && this.cs.currentChar !== 69
      /* E */
      ;
    }

    if (decimal) {
      const text = this.cs.getText().substr(start + leadingSign, this.cs.position - start - leadingSign);

      if (!isNaN(parseInt(text, 10))) {
        this.tokens.push(new Token(types_1.TokenType.Number, start, text.length + leadingSign));
        return true;
      }
    } // Floating point. Sign was already skipped over.


    if (this.cs.currentChar >= 48
    /* _0 */
    && this.cs.currentChar <= 57
    /* _9 */
    || this.cs.currentChar === 46
    /* Period */
    && this.cs.nextChar >= 48
    /* _0 */
    && this.cs.nextChar <= 57
    /* _9 */
    ) {
      if (this.skipFloatingPointCandidate(false)) {
        const text = this.cs.getText().substr(start, this.cs.position - start);

        if (!isNaN(parseFloat(text))) {
          this.tokens.push(new Token(types_1.TokenType.Number, start, this.cs.position - start));
          return true;
        }
      }
    }

    this.cs.position = start;
    return false;
  } // tslint:disable-next-line:cyclomatic-complexity


  tryOperator() {
    let length = 0;
    const nextChar = this.cs.nextChar;

    switch (this.cs.currentChar) {
      case 43
      /* Plus */
      :
      case 38
      /* Ampersand */
      :
      case 124
      /* Bar */
      :
      case 94
      /* Caret */
      :
      case 61
      /* Equal */
      :
      case 33
      /* ExclamationMark */
      :
      case 37
      /* Percent */
      :
      case 126
      /* Tilde */
      :
        length = nextChar === 61
        /* Equal */
        ? 2 : 1;
        break;

      case 45
      /* Hyphen */
      :
        length = nextChar === 61
        /* Equal */
        || nextChar === 62
        /* Greater */
        ? 2 : 1;
        break;

      case 42
      /* Asterisk */
      :
        if (nextChar === 42
        /* Asterisk */
        ) {
          length = this.cs.lookAhead(2) === 61
          /* Equal */
          ? 3 : 2;
        } else {
          length = nextChar === 61
          /* Equal */
          ? 2 : 1;
        }

        break;

      case 47
      /* Slash */
      :
        if (nextChar === 47
        /* Slash */
        ) {
          length = this.cs.lookAhead(2) === 61
          /* Equal */
          ? 3 : 2;
        } else {
          length = nextChar === 61
          /* Equal */
          ? 2 : 1;
        }

        break;

      case 60
      /* Less */
      :
        if (nextChar === 62
        /* Greater */
        ) {
          length = 2;
        } else if (nextChar === 60
        /* Less */
        ) {
          length = this.cs.lookAhead(2) === 61
          /* Equal */
          ? 3 : 2;
        } else {
          length = nextChar === 61
          /* Equal */
          ? 2 : 1;
        }

        break;

      case 62
      /* Greater */
      :
        if (nextChar === 62
        /* Greater */
        ) {
          length = this.cs.lookAhead(2) === 61
          /* Equal */
          ? 3 : 2;
        } else {
          length = nextChar === 61
          /* Equal */
          ? 2 : 1;
        }

        break;

      case 64
      /* At */
      :
        length = nextChar === 61
        /* Equal */
        ? 2 : 1;
        break;

      default:
        return false;
    }

    this.tokens.push(new Token(types_1.TokenType.Operator, this.cs.position, length));
    this.cs.advance(length);
    return length > 0;
  }

  handleUnknown() {
    const start = this.cs.position;
    this.cs.skipToWhitespace();
    const length = this.cs.position - start;

    if (length > 0) {
      this.tokens.push(new Token(types_1.TokenType.Unknown, start, length));
      return true;
    }

    return false;
  }

  handleComment() {
    const start = this.cs.position;
    this.cs.skipToEol();
    this.tokens.push(new Token(types_1.TokenType.Comment, start, this.cs.position - start));
  } // tslint:disable-next-line:cyclomatic-complexity


  getStringPrefixLength() {
    if (this.cs.currentChar === 39
    /* SingleQuote */
    || this.cs.currentChar === 34
    /* DoubleQuote */
    ) {
      return 0; // Simple string, no prefix
    }

    if (this.cs.nextChar === 39
    /* SingleQuote */
    || this.cs.nextChar === 34
    /* DoubleQuote */
    ) {
      switch (this.cs.currentChar) {
        case 102
        /* f */
        :
        case 70
        /* F */
        :
        case 114
        /* r */
        :
        case 82
        /* R */
        :
        case 98
        /* b */
        :
        case 66
        /* B */
        :
        case 117
        /* u */
        :
        case 85
        /* U */
        :
          return 1;
        // single-char prefix like u"" or r""

        default:
          break;
      }
    }

    if (this.cs.lookAhead(2) === 39
    /* SingleQuote */
    || this.cs.lookAhead(2) === 34
    /* DoubleQuote */
    ) {
      const prefix = this.cs.getText().substr(this.cs.position, 2).toLowerCase();

      switch (prefix) {
        case 'rf':
        case 'ur':
        case 'br':
          return 2;

        default:
          break;
      }
    }

    return -1;
  }

  getQuoteType() {
    if (this.cs.currentChar === 39
    /* SingleQuote */
    ) {
      return this.cs.nextChar === 39
      /* SingleQuote */
      && this.cs.lookAhead(2) === 39
      /* SingleQuote */
      ? QuoteType.TripleSingle : QuoteType.Single;
    }

    if (this.cs.currentChar === 34
    /* DoubleQuote */
    ) {
      return this.cs.nextChar === 34
      /* DoubleQuote */
      && this.cs.lookAhead(2) === 34
      /* DoubleQuote */
      ? QuoteType.TripleDouble : QuoteType.Double;
    }

    return QuoteType.None;
  }

  handleString(quoteType, stringPrefixLength) {
    const start = this.cs.position - stringPrefixLength;

    if (quoteType === QuoteType.Single || quoteType === QuoteType.Double) {
      this.cs.moveNext();
      this.skipToSingleEndQuote(quoteType === QuoteType.Single ? 39
      /* SingleQuote */
      : 34
      /* DoubleQuote */
      );
    } else {
      this.cs.advance(3);
      this.skipToTripleEndQuote(quoteType === QuoteType.TripleSingle ? 39
      /* SingleQuote */
      : 34
      /* DoubleQuote */
      );
    }

    this.tokens.push(new Token(types_1.TokenType.String, start, this.cs.position - start));
  }

  skipToSingleEndQuote(quote) {
    while (!this.cs.isEndOfStream()) {
      if (this.cs.currentChar === 10
      /* LineFeed */
      || this.cs.currentChar === 13
      /* CarriageReturn */
      ) {
        return; // Unterminated single-line string
      }

      if (this.cs.currentChar === 92
      /* Backslash */
      && this.cs.nextChar === quote) {
        this.cs.advance(2);
        continue;
      }

      if (this.cs.currentChar === quote) {
        break;
      }

      this.cs.moveNext();
    }

    this.cs.moveNext();
  }

  skipToTripleEndQuote(quote) {
    while (!this.cs.isEndOfStream() && (this.cs.currentChar !== quote || this.cs.nextChar !== quote || this.cs.lookAhead(2) !== quote)) {
      this.cs.moveNext();
    }

    this.cs.advance(3);
  }

  skipFloatingPointCandidate(allowSign) {
    // Determine end of the potential floating point number
    const start = this.cs.position;
    this.skipFractionalNumber(allowSign);

    if (this.cs.position > start) {
      if (this.cs.currentChar === 101
      /* e */
      || this.cs.currentChar === 69
      /* E */
      ) {
        this.cs.moveNext(); // Optional exponent sign
      }

      this.skipDecimalNumber(true); // skip exponent value
    }

    return this.cs.position > start;
  }

  skipFractionalNumber(allowSign) {
    this.skipDecimalNumber(allowSign);

    if (this.cs.currentChar === 46
    /* Period */
    ) {
      this.cs.moveNext(); // Optional period
    }

    this.skipDecimalNumber(false);
  }

  skipDecimalNumber(allowSign) {
    if (allowSign && (this.cs.currentChar === 45
    /* Hyphen */
    || this.cs.currentChar === 43
    /* Plus */
    )) {
      this.cs.moveNext(); // Optional sign
    }

    while (characters_1.isDecimal(this.cs.currentChar)) {
      this.cs.moveNext(); // skip integer part
    }
  }

}

exports.Tokenizer = Tokenizer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRva2VuaXplci5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImNoYXJhY3RlcnNfMSIsInJlcXVpcmUiLCJjaGFyYWN0ZXJTdHJlYW1fMSIsInRleHRSYW5nZUNvbGxlY3Rpb25fMSIsInR5cGVzXzEiLCJRdW90ZVR5cGUiLCJUb2tlbiIsIlRleHRSYW5nZSIsImNvbnN0cnVjdG9yIiwidHlwZSIsInN0YXJ0IiwibGVuZ3RoIiwiVG9rZW5pemVyIiwiY3MiLCJDaGFyYWN0ZXJTdHJlYW0iLCJ0b2tlbnMiLCJtb2RlIiwiVG9rZW5pemVyTW9kZSIsIkZ1bGwiLCJ0b2tlbml6ZSIsInRleHQiLCJ1bmRlZmluZWQiLCJFcnJvciIsInBvc2l0aW9uIiwiZW5kIiwiaXNFbmRPZlN0cmVhbSIsIkFkZE5leHRUb2tlbiIsIlRleHRSYW5nZUNvbGxlY3Rpb24iLCJza2lwV2hpdGVzcGFjZSIsImhhbmRsZUNoYXJhY3RlciIsIm1vdmVOZXh0Iiwic3RyaW5nUHJlZml4TGVuZ3RoIiwiZ2V0U3RyaW5nUHJlZml4TGVuZ3RoIiwiYWR2YW5jZSIsInF1b3RlVHlwZSIsImdldFF1b3RlVHlwZSIsIk5vbmUiLCJoYW5kbGVTdHJpbmciLCJjdXJyZW50Q2hhciIsImhhbmRsZUNvbW1lbnQiLCJDb21tZW50c0FuZFN0cmluZ3MiLCJwdXNoIiwiVG9rZW5UeXBlIiwiT3BlbkJyYWNlIiwiQ2xvc2VCcmFjZSIsIk9wZW5CcmFja2V0IiwiQ2xvc2VCcmFja2V0IiwiT3BlbkN1cmx5IiwiQ2xvc2VDdXJseSIsIkNvbW1hIiwiU2VtaWNvbG9uIiwiQ29sb24iLCJpc1Bvc3NpYmxlTnVtYmVyIiwidHJ5TnVtYmVyIiwiT3BlcmF0b3IiLCJ0cnlJZGVudGlmaWVyIiwidHJ5T3BlcmF0b3IiLCJoYW5kbGVVbmtub3duIiwiaXNJZGVudGlmaWVyU3RhcnRDaGFyIiwiaXNJZGVudGlmaWVyQ2hhciIsIklkZW50aWZpZXIiLCJpc0RlY2ltYWwiLCJuZXh0Q2hhciIsIm5leHQiLCJsb29rQWhlYWQiLCJwcmV2IiwibmV4dE5leHQiLCJsZWFkaW5nU2lnbiIsInJhZGl4IiwiaXNIZXgiLCJpc0JpbmFyeSIsImlzT2N0YWwiLCJnZXRUZXh0Iiwic3Vic3RyIiwiaXNOYU4iLCJwYXJzZUludCIsIk51bWJlciIsImRlY2ltYWwiLCJza2lwRmxvYXRpbmdQb2ludENhbmRpZGF0ZSIsInBhcnNlRmxvYXQiLCJza2lwVG9XaGl0ZXNwYWNlIiwiVW5rbm93biIsInNraXBUb0VvbCIsIkNvbW1lbnQiLCJwcmVmaXgiLCJ0b0xvd2VyQ2FzZSIsIlRyaXBsZVNpbmdsZSIsIlNpbmdsZSIsIlRyaXBsZURvdWJsZSIsIkRvdWJsZSIsInNraXBUb1NpbmdsZUVuZFF1b3RlIiwic2tpcFRvVHJpcGxlRW5kUXVvdGUiLCJTdHJpbmciLCJxdW90ZSIsImFsbG93U2lnbiIsInNraXBGcmFjdGlvbmFsTnVtYmVyIiwic2tpcERlY2ltYWxOdW1iZXIiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxZQUFZLEdBQUdDLE9BQU8sQ0FBQyxjQUFELENBQTVCOztBQUNBLE1BQU1DLGlCQUFpQixHQUFHRCxPQUFPLENBQUMsbUJBQUQsQ0FBakM7O0FBQ0EsTUFBTUUscUJBQXFCLEdBQUdGLE9BQU8sQ0FBQyx1QkFBRCxDQUFyQzs7QUFDQSxNQUFNRyxPQUFPLEdBQUdILE9BQU8sQ0FBQyxTQUFELENBQXZCOztBQUNBLElBQUlJLFNBQUo7O0FBQ0EsQ0FBQyxVQUFVQSxTQUFWLEVBQXFCO0FBQ2xCQSxFQUFBQSxTQUFTLENBQUNBLFNBQVMsQ0FBQyxNQUFELENBQVQsR0FBb0IsQ0FBckIsQ0FBVCxHQUFtQyxNQUFuQztBQUNBQSxFQUFBQSxTQUFTLENBQUNBLFNBQVMsQ0FBQyxRQUFELENB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LEVBQUwsQ0FBUXlCLFdBQVIsS0FBd0I7QUFBRztBQUEzRSxLQUFiLEVBQXFHO0FBQ2pHLFdBQUt6QixFQUFMLENBQVFpQixRQUFSLEdBRGlHLENBQzdFO0FBQ3ZCOztBQUNELFdBQU85QixZQUFZLENBQUM2RCxTQUFiLENBQXVCLEtBQUtoRCxFQUFMLENBQVF5QixXQUEvQixDQUFQLEVBQW9EO0FBQ2hELFdBQUt6QixFQUFMLENBQVFpQixRQUFSLEdBRGdELENBQzVCO0FBQ3ZCO0FBQ0o7O0FBaGJXOztBQWtiaEJoQyxPQUFPLENBQUNjLFNBQVIsR0FBb0JBLFNBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4ndXNlIHN0cmljdCc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBjaGFyYWN0ZXJzXzEgPSByZXF1aXJlKFwiLi9jaGFyYWN0ZXJzXCIpO1xuY29uc3QgY2hhcmFjdGVyU3RyZWFtXzEgPSByZXF1aXJlKFwiLi9jaGFyYWN0ZXJTdHJlYW1cIik7XG5jb25zdCB0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEgPSByZXF1aXJlKFwiLi90ZXh0UmFuZ2VDb2xsZWN0aW9uXCIpO1xuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpO1xudmFyIFF1b3RlVHlwZTtcbihmdW5jdGlvbiAoUXVvdGVUeXBlKSB7XG4gICAgUXVvdGVUeXBlW1F1b3RlVHlwZVtcIk5vbmVcIl0gPSAwXSA9IFwiTm9uZVwiO1xuICAgIFF1b3RlVHlwZVtRdW90ZVR5cGVbXCJTaW5nbGVcIl0gPSAxXSA9IFwiU2luZ2xlXCI7XG4gICAgUXVvdGVUeXBlW1F1b3RlVHlwZVtcIkRvdWJsZVwiXSA9IDJdID0gXCJEb3VibGVcIjtcbiAgICBRdW90ZVR5cGVbUXVvdGVUeXBlW1wiVHJpcGxlU2luZ2xlXCJdID0gM10gPSBcIlRyaXBsZVNpbmdsZVwiO1xuICAgIFF1b3RlVHlwZVtRdW90ZVR5cGVbXCJUcmlwbGVEb3VibGVcIl0gPSA0XSA9IFwiVHJpcGxlRG91YmxlXCI7XG59KShRdW90ZVR5cGUgfHwgKFF1b3RlVHlwZSA9IHt9KSk7XG5jbGFzcyBUb2tlbiBleHRlbmRzIHR5cGVzXzEuVGV4dFJhbmdlIHtcbiAgICBjb25zdHJ1Y3Rvcih0eXBlLCBzdGFydCwgbGVuZ3RoKSB7XG4gICAgICAgIHN1cGVyKHN0YXJ0LCBsZW5ndGgpO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIH1cbn1cbmNsYXNzIFRva2VuaXplciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuY3MgPSBuZXcgY2hhcmFjdGVyU3RyZWFtXzEuQ2hhcmFjdGVyU3RyZWFtKCcnKTtcbiAgICAgICAgdGhpcy50b2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5tb2RlID0gdHlwZXNfMS5Ub2tlbml6ZXJNb2RlLkZ1bGw7XG4gICAgfVxuICAgIHRva2VuaXplKHRleHQsIHN0YXJ0LCBsZW5ndGgsIG1vZGUpIHtcbiAgICAgICAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByYW5nZSBzdGFydCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGVuZ3RoID0gdGV4dC5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobGVuZ3RoIDwgMCB8fCBzdGFydCArIGxlbmd0aCA+IHRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmFuZ2UgbGVuZ3RoJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZSAhPT0gdW5kZWZpbmVkID8gbW9kZSA6IHR5cGVzXzEuVG9rZW5pemVyTW9kZS5GdWxsO1xuICAgICAgICB0aGlzLmNzID0gbmV3IGNoYXJhY3RlclN0cmVhbV8xLkNoYXJhY3RlclN0cmVhbSh0ZXh0KTtcbiAgICAgICAgdGhpcy5jcy5wb3NpdGlvbiA9IHN0YXJ0O1xuICAgICAgICBjb25zdCBlbmQgPSBzdGFydCArIGxlbmd0aDtcbiAgICAgICAgd2hpbGUgKCF0aGlzLmNzLmlzRW5kT2ZTdHJlYW0oKSkge1xuICAgICAgICAgICAgdGhpcy5BZGROZXh0VG9rZW4oKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmNzLnBvc2l0aW9uID49IGVuZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgdGV4dFJhbmdlQ29sbGVjdGlvbl8xLlRleHRSYW5nZUNvbGxlY3Rpb24odGhpcy50b2tlbnMpO1xuICAgIH1cbiAgICBBZGROZXh0VG9rZW4oKSB7XG4gICAgICAgIHRoaXMuY3Muc2tpcFdoaXRlc3BhY2UoKTtcbiAgICAgICAgaWYgKHRoaXMuY3MuaXNFbmRPZlN0cmVhbSgpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmhhbmRsZUNoYXJhY3RlcigpKSB7XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxuICAgIGhhbmRsZUNoYXJhY3RlcigpIHtcbiAgICAgICAgLy8gZi1zdHJpbmdzLCBiLXN0cmluZ3MsIGV0Y1xuICAgICAgICBjb25zdCBzdHJpbmdQcmVmaXhMZW5ndGggPSB0aGlzLmdldFN0cmluZ1ByZWZpeExlbmd0aCgpO1xuICAgICAgICBpZiAoc3RyaW5nUHJlZml4TGVuZ3RoID49IDApIHtcbiAgICAgICAgICAgIC8vIEluZGVlZCBhIHN0cmluZ1xuICAgICAgICAgICAgdGhpcy5jcy5hZHZhbmNlKHN0cmluZ1ByZWZpeExlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCBxdW90ZVR5cGUgPSB0aGlzLmdldFF1b3RlVHlwZSgpO1xuICAgICAgICAgICAgaWYgKHF1b3RlVHlwZSAhPT0gUXVvdGVUeXBlLk5vbmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0cmluZyhxdW90ZVR5cGUsIHN0cmluZ1ByZWZpeExlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDM1IC8qIEhhc2ggKi8pIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlQ29tbWVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gdHlwZXNfMS5Ub2tlbml6ZXJNb2RlLkNvbW1lbnRzQW5kU3RyaW5ncykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAodGhpcy5jcy5jdXJyZW50Q2hhcikge1xuICAgICAgICAgICAgY2FzZSA0MCAvKiBPcGVuUGFyZW50aGVzaXMgKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNlLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQxIC8qIENsb3NlUGFyZW50aGVzaXMgKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VCcmFjZSwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5MSAvKiBPcGVuQnJhY2tldCAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2tldCwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5MyAvKiBDbG9zZUJyYWNrZXQgKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VCcmFja2V0LCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyMyAvKiBPcGVuQnJhY2UgKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuT3BlbkN1cmx5LCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyNSAvKiBDbG9zZUJyYWNlICovOlxuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLkNsb3NlQ3VybHksIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDQgLyogQ29tbWEgKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuQ29tbWEsIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNTkgLyogU2VtaWNvbG9uICovOlxuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLlNlbWljb2xvbiwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA1OCAvKiBDb2xvbiAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5Db2xvbiwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1Bvc3NpYmxlTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5TnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0NiAvKiBQZXJpb2QgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3IsIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy50cnlJZGVudGlmaWVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRyeU9wZXJhdG9yKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVW5rbm93bigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5SWRlbnRpZmllcigpIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLmNzLnBvc2l0aW9uO1xuICAgICAgICBpZiAoY2hhcmFjdGVyc18xLmlzSWRlbnRpZmllclN0YXJ0Q2hhcih0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICAgICAgd2hpbGUgKGNoYXJhY3RlcnNfMS5pc0lkZW50aWZpZXJDaGFyKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNzLnBvc2l0aW9uID4gc3RhcnQpIHtcbiAgICAgICAgICAgIC8vIGNvbnN0IHRleHQgPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIoc3RhcnQsIHRoaXMuY3MucG9zaXRpb24gLSBzdGFydCk7XG4gICAgICAgICAgICAvLyBjb25zdCB0eXBlID0gdGhpcy5rZXl3b3Jkcy5maW5kKCh2YWx1ZSwgaW5kZXgpID0+IHZhbHVlID09PSB0ZXh0KSA/IFRva2VuVHlwZS5LZXl3b3JkIDogVG9rZW5UeXBlLklkZW50aWZpZXI7XG4gICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyLCBzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICBpc1Bvc3NpYmxlTnVtYmVyKCkge1xuICAgICAgICBpZiAoY2hhcmFjdGVyc18xLmlzRGVjaW1hbCh0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ2IC8qIFBlcmlvZCAqLyAmJiBjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MubmV4dENoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXh0ID0gKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ1IC8qIEh5cGhlbiAqLyB8fCB0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0MyAvKiBQbHVzICovKSA/IDEgOiAwO1xuICAgICAgICAvLyBOZXh0IGNoYXJhY3RlciBtdXN0IGJlIGRlY2ltYWwgb3IgYSBkb3Qgb3RoZXJ3aXNlXG4gICAgICAgIC8vIGl0IGlzIG5vdCBhIG51bWJlci4gTm8gd2hpdGVzcGFjZSBpcyBhbGxvd2VkLlxuICAgICAgICBpZiAoY2hhcmFjdGVyc18xLmlzRGVjaW1hbCh0aGlzLmNzLmxvb2tBaGVhZChuZXh0KSkgfHwgdGhpcy5jcy5sb29rQWhlYWQobmV4dCkgPT09IDQ2IC8qIFBlcmlvZCAqLykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgd2hhdCBwcmV2aW91cyB0b2tlbiBpcywgaWYgYW55XG4gICAgICAgICAgICBpZiAodGhpcy50b2tlbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQXQgdGhlIHN0YXJ0IG9mIHRoZSBmaWxlIHRoaXMgY2FuIG9ubHkgYmUgYSBudW1iZXJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnRva2Vuc1t0aGlzLnRva2Vucy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFjZVxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNrZXRcbiAgICAgICAgICAgICAgICB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbW1hXG4gICAgICAgICAgICAgICAgfHwgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5Db2xvblxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuU2VtaWNvbG9uXG4gICAgICAgICAgICAgICAgfHwgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNzLmxvb2tBaGVhZChuZXh0KSA9PT0gNDggLyogXzAgKi8pIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHROZXh0ID0gdGhpcy5jcy5sb29rQWhlYWQobmV4dCArIDEpO1xuICAgICAgICAgICAgaWYgKG5leHROZXh0ID09PSAxMjAgLyogeCAqLyB8fCBuZXh0TmV4dCA9PT0gODggLyogWCAqLykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5leHROZXh0ID09PSA5OCAvKiBiICovIHx8IG5leHROZXh0ID09PSA2NiAvKiBCICovKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV4dE5leHQgPT09IDExMSAvKiBvICovIHx8IG5leHROZXh0ID09PSA3OSAvKiBPICovKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgdHJ5TnVtYmVyKCkge1xuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb247XG4gICAgICAgIGxldCBsZWFkaW5nU2lnbiA9IDA7XG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0NSAvKiBIeXBoZW4gKi8gfHwgdGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDMgLyogUGx1cyAqLykge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBTa2lwIGxlYWRpbmcgKy8tXG4gICAgICAgICAgICBsZWFkaW5nU2lnbiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ4IC8qIF8wICovKSB7XG4gICAgICAgICAgICBsZXQgcmFkaXggPSAwO1xuICAgICAgICAgICAgLy8gVHJ5IGhleCA9PiBoZXhpbnRlZ2VyOiBcIjBcIiAoXCJ4XCIgfCBcIlhcIikgKFtcIl9cIl0gaGV4ZGlnaXQpK1xuICAgICAgICAgICAgaWYgKCh0aGlzLmNzLm5leHRDaGFyID09PSAxMjAgLyogeCAqLyB8fCB0aGlzLmNzLm5leHRDaGFyID09PSA4OCAvKiBYICovKSAmJiBjaGFyYWN0ZXJzXzEuaXNIZXgodGhpcy5jcy5sb29rQWhlYWQoMikpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcy5hZHZhbmNlKDIpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChjaGFyYWN0ZXJzXzEuaXNIZXgodGhpcy5jcy5jdXJyZW50Q2hhcikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByYWRpeCA9IDE2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVHJ5IGJpbmFyeSA9PiBiaW5pbnRlZ2VyOiBcIjBcIiAoXCJiXCIgfCBcIkJcIikgKFtcIl9cIl0gYmluZGlnaXQpK1xuICAgICAgICAgICAgaWYgKCh0aGlzLmNzLm5leHRDaGFyID09PSA5OCAvKiBiICovIHx8IHRoaXMuY3MubmV4dENoYXIgPT09IDY2IC8qIEIgKi8pICYmIGNoYXJhY3RlcnNfMS5pc0JpbmFyeSh0aGlzLmNzLmxvb2tBaGVhZCgyKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJhY3RlcnNfMS5pc0JpbmFyeSh0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJhZGl4ID0gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFRyeSBvY3RhbCA9PiBvY3RpbnRlZ2VyOiBcIjBcIiAoXCJvXCIgfCBcIk9cIikgKFtcIl9cIl0gb2N0ZGlnaXQpK1xuICAgICAgICAgICAgaWYgKCh0aGlzLmNzLm5leHRDaGFyID09PSAxMTEgLyogbyAqLyB8fCB0aGlzLmNzLm5leHRDaGFyID09PSA3OSAvKiBPICovKSAmJiBjaGFyYWN0ZXJzXzEuaXNPY3RhbCh0aGlzLmNzLmxvb2tBaGVhZCgyKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJhY3RlcnNfMS5pc09jdGFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmFkaXggPSA4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJhZGl4ID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIoc3RhcnQgKyBsZWFkaW5nU2lnbiwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0IC0gbGVhZGluZ1NpZ24pO1xuICAgICAgICAgICAgICAgIGlmICghaXNOYU4ocGFyc2VJbnQodGV4dCwgcmFkaXgpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5OdW1iZXIsIHN0YXJ0LCB0ZXh0Lmxlbmd0aCArIGxlYWRpbmdTaWduKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgZGVjaW1hbCA9IGZhbHNlO1xuICAgICAgICAvLyBUcnkgZGVjaW1hbCBpbnQgPT5cbiAgICAgICAgLy8gICAgZGVjaW50ZWdlcjogbm9uemVyb2RpZ2l0IChbXCJfXCJdIGRpZ2l0KSogfCBcIjBcIiAoW1wiX1wiXSBcIjBcIikqXG4gICAgICAgIC8vICAgIG5vbnplcm9kaWdpdDogXCIxXCIuLi5cIjlcIlxuICAgICAgICAvLyAgICBkaWdpdDogXCIwXCIuLi5cIjlcIlxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA+PSA0OSAvKiBfMSAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyIDw9IDU3IC8qIF85ICovKSB7XG4gICAgICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzRGVjaW1hbCh0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlY2ltYWwgPSB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSA0NiAvKiBQZXJpb2QgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gMTAxIC8qIGUgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gNjkgLyogRSAqLztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDggLyogXzAgKi8pIHsgLy8gXCIwXCIgKFtcIl9cIl0gXCIwXCIpKlxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ4IC8qIF8wICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDk1IC8qIFVuZGVyc2NvcmUgKi8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWNpbWFsID0gdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gNDYgLyogUGVyaW9kICovICYmIHRoaXMuY3MuY3VycmVudENoYXIgIT09IDEwMSAvKiBlICovICYmIHRoaXMuY3MuY3VycmVudENoYXIgIT09IDY5IC8qIEUgKi87XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlY2ltYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIoc3RhcnQgKyBsZWFkaW5nU2lnbiwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0IC0gbGVhZGluZ1NpZ24pO1xuICAgICAgICAgICAgaWYgKCFpc05hTihwYXJzZUludCh0ZXh0LCAxMCkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuTnVtYmVyLCBzdGFydCwgdGV4dC5sZW5ndGggKyBsZWFkaW5nU2lnbikpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEZsb2F0aW5nIHBvaW50LiBTaWduIHdhcyBhbHJlYWR5IHNraXBwZWQgb3Zlci5cbiAgICAgICAgaWYgKCh0aGlzLmNzLmN1cnJlbnRDaGFyID49IDQ4IC8qIF8wICovICYmIHRoaXMuY3MuY3VycmVudENoYXIgPD0gNTcgLyogXzkgKi8pIHx8XG4gICAgICAgICAgICAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDYgLyogUGVyaW9kICovICYmIHRoaXMuY3MubmV4dENoYXIgPj0gNDggLyogXzAgKi8gJiYgdGhpcy5jcy5uZXh0Q2hhciA8PSA1NyAvKiBfOSAqLykpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNraXBGbG9hdGluZ1BvaW50Q2FuZGlkYXRlKGZhbHNlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIoc3RhcnQsIHRoaXMuY3MucG9zaXRpb24gLSBzdGFydCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihwYXJzZUZsb2F0KHRleHQpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5OdW1iZXIsIHN0YXJ0LCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3MucG9zaXRpb24gPSBzdGFydDtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgdHJ5T3BlcmF0b3IoKSB7XG4gICAgICAgIGxldCBsZW5ndGggPSAwO1xuICAgICAgICBjb25zdCBuZXh0Q2hhciA9IHRoaXMuY3MubmV4dENoYXI7XG4gICAgICAgIHN3aXRjaCAodGhpcy5jcy5jdXJyZW50Q2hhcikge1xuICAgICAgICAgICAgY2FzZSA0MyAvKiBQbHVzICovOlxuICAgICAgICAgICAgY2FzZSAzOCAvKiBBbXBlcnNhbmQgKi86XG4gICAgICAgICAgICBjYXNlIDEyNCAvKiBCYXIgKi86XG4gICAgICAgICAgICBjYXNlIDk0IC8qIENhcmV0ICovOlxuICAgICAgICAgICAgY2FzZSA2MSAvKiBFcXVhbCAqLzpcbiAgICAgICAgICAgIGNhc2UgMzMgLyogRXhjbGFtYXRpb25NYXJrICovOlxuICAgICAgICAgICAgY2FzZSAzNyAvKiBQZXJjZW50ICovOlxuICAgICAgICAgICAgY2FzZSAxMjYgLyogVGlsZGUgKi86XG4gICAgICAgICAgICAgICAgbGVuZ3RoID0gbmV4dENoYXIgPT09IDYxIC8qIEVxdWFsICovID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ1IC8qIEh5cGhlbiAqLzpcbiAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gfHwgbmV4dENoYXIgPT09IDYyIC8qIEdyZWF0ZXIgKi8gPyAyIDogMTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDIgLyogQXN0ZXJpc2sgKi86XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSA0MiAvKiBBc3RlcmlzayAqLykge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gNjEgLyogRXF1YWwgKi8gPyAzIDogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyA/IDIgOiAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDcgLyogU2xhc2ggKi86XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSA0NyAvKiBTbGFzaCAqLykge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gNjEgLyogRXF1YWwgKi8gPyAzIDogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyA/IDIgOiAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjAgLyogTGVzcyAqLzpcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09IDYyIC8qIEdyZWF0ZXIgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobmV4dENoYXIgPT09IDYwIC8qIExlc3MgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDYxIC8qIEVxdWFsICovID8gMyA6IDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDYyIC8qIEdyZWF0ZXIgKi86XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSA2MiAvKiBHcmVhdGVyICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMuY3MubG9va0FoZWFkKDIpID09PSA2MSAvKiBFcXVhbCAqLyA/IDMgOiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gbmV4dENoYXIgPT09IDYxIC8qIEVxdWFsICovID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2NCAvKiBBdCAqLzpcbiAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yLCB0aGlzLmNzLnBvc2l0aW9uLCBsZW5ndGgpKTtcbiAgICAgICAgdGhpcy5jcy5hZHZhbmNlKGxlbmd0aCk7XG4gICAgICAgIHJldHVybiBsZW5ndGggPiAwO1xuICAgIH1cbiAgICBoYW5kbGVVbmtub3duKCkge1xuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb247XG4gICAgICAgIHRoaXMuY3Muc2tpcFRvV2hpdGVzcGFjZSgpO1xuICAgICAgICBjb25zdCBsZW5ndGggPSB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQ7XG4gICAgICAgIGlmIChsZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5Vbmtub3duLCBzdGFydCwgbGVuZ3RoKSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGhhbmRsZUNvbW1lbnQoKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5jcy5za2lwVG9Fb2woKTtcbiAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuQ29tbWVudCwgc3RhcnQsIHRoaXMuY3MucG9zaXRpb24gLSBzdGFydCkpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgZ2V0U3RyaW5nUHJlZml4TGVuZ3RoKCkge1xuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMzkgLyogU2luZ2xlUXVvdGUgKi8gfHwgdGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi8pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBTaW1wbGUgc3RyaW5nLCBubyBwcmVmaXhcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jcy5uZXh0Q2hhciA9PT0gMzkgLyogU2luZ2xlUXVvdGUgKi8gfHwgdGhpcy5jcy5uZXh0Q2hhciA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi8pIHtcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jcy5jdXJyZW50Q2hhcikge1xuICAgICAgICAgICAgICAgIGNhc2UgMTAyIC8qIGYgKi86XG4gICAgICAgICAgICAgICAgY2FzZSA3MCAvKiBGICovOlxuICAgICAgICAgICAgICAgIGNhc2UgMTE0IC8qIHIgKi86XG4gICAgICAgICAgICAgICAgY2FzZSA4MiAvKiBSICovOlxuICAgICAgICAgICAgICAgIGNhc2UgOTggLyogYiAqLzpcbiAgICAgICAgICAgICAgICBjYXNlIDY2IC8qIEIgKi86XG4gICAgICAgICAgICAgICAgY2FzZSAxMTcgLyogdSAqLzpcbiAgICAgICAgICAgICAgICBjYXNlIDg1IC8qIFUgKi86XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxOyAvLyBzaW5nbGUtY2hhciBwcmVmaXggbGlrZSB1XCJcIiBvciByXCJcIlxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gMzkgLyogU2luZ2xlUXVvdGUgKi8gfHwgdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDM0IC8qIERvdWJsZVF1b3RlICovKSB7XG4gICAgICAgICAgICBjb25zdCBwcmVmaXggPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIodGhpcy5jcy5wb3NpdGlvbiwgMikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHN3aXRjaCAocHJlZml4KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncmYnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ3VyJzpcbiAgICAgICAgICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAyO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgZ2V0UXVvdGVUeXBlKCkge1xuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMzkgLyogU2luZ2xlUXVvdGUgKi8pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNzLm5leHRDaGFyID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLyAmJiB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gMzkgLyogU2luZ2xlUXVvdGUgKi9cbiAgICAgICAgICAgICAgICA/IFF1b3RlVHlwZS5UcmlwbGVTaW5nbGVcbiAgICAgICAgICAgICAgICA6IFF1b3RlVHlwZS5TaW5nbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDM0IC8qIERvdWJsZVF1b3RlICovKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcy5uZXh0Q2hhciA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi8gJiYgdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDM0IC8qIERvdWJsZVF1b3RlICovXG4gICAgICAgICAgICAgICAgPyBRdW90ZVR5cGUuVHJpcGxlRG91YmxlXG4gICAgICAgICAgICAgICAgOiBRdW90ZVR5cGUuRG91YmxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBRdW90ZVR5cGUuTm9uZTtcbiAgICB9XG4gICAgaGFuZGxlU3RyaW5nKHF1b3RlVHlwZSwgc3RyaW5nUHJlZml4TGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbiAtIHN0cmluZ1ByZWZpeExlbmd0aDtcbiAgICAgICAgaWYgKHF1b3RlVHlwZSA9PT0gUXVvdGVUeXBlLlNpbmdsZSB8fCBxdW90ZVR5cGUgPT09IFF1b3RlVHlwZS5Eb3VibGUpIHtcbiAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICAgICAgICAgIHRoaXMuc2tpcFRvU2luZ2xlRW5kUXVvdGUocXVvdGVUeXBlID09PSBRdW90ZVR5cGUuU2luZ2xlXG4gICAgICAgICAgICAgICAgPyAzOSAvKiBTaW5nbGVRdW90ZSAqL1xuICAgICAgICAgICAgICAgIDogMzQgLyogRG91YmxlUXVvdGUgKi8pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jcy5hZHZhbmNlKDMpO1xuICAgICAgICAgICAgdGhpcy5za2lwVG9UcmlwbGVFbmRRdW90ZShxdW90ZVR5cGUgPT09IFF1b3RlVHlwZS5UcmlwbGVTaW5nbGVcbiAgICAgICAgICAgICAgICA/IDM5IC8qIFNpbmdsZVF1b3RlICovXG4gICAgICAgICAgICAgICAgOiAzNCAvKiBEb3VibGVRdW90ZSAqLyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuU3RyaW5nLCBzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KSk7XG4gICAgfVxuICAgIHNraXBUb1NpbmdsZUVuZFF1b3RlKHF1b3RlKSB7XG4gICAgICAgIHdoaWxlICghdGhpcy5jcy5pc0VuZE9mU3RyZWFtKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAxMCAvKiBMaW5lRmVlZCAqLyB8fCB0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAxMyAvKiBDYXJyaWFnZVJldHVybiAqLykge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gVW50ZXJtaW5hdGVkIHNpbmdsZS1saW5lIHN0cmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDkyIC8qIEJhY2tzbGFzaCAqLyAmJiB0aGlzLmNzLm5leHRDaGFyID09PSBxdW90ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3MuYWR2YW5jZSgyKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSBxdW90ZSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICB9XG4gICAgc2tpcFRvVHJpcGxlRW5kUXVvdGUocXVvdGUpIHtcbiAgICAgICAgd2hpbGUgKCF0aGlzLmNzLmlzRW5kT2ZTdHJlYW0oKSAmJiAodGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gcXVvdGUgfHwgdGhpcy5jcy5uZXh0Q2hhciAhPT0gcXVvdGUgfHwgdGhpcy5jcy5sb29rQWhlYWQoMikgIT09IHF1b3RlKSkge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3MuYWR2YW5jZSgzKTtcbiAgICB9XG4gICAgc2tpcEZsb2F0aW5nUG9pbnRDYW5kaWRhdGUoYWxsb3dTaWduKSB7XG4gICAgICAgIC8vIERldGVybWluZSBlbmQgb2YgdGhlIHBvdGVudGlhbCBmbG9hdGluZyBwb2ludCBudW1iZXJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLmNzLnBvc2l0aW9uO1xuICAgICAgICB0aGlzLnNraXBGcmFjdGlvbmFsTnVtYmVyKGFsbG93U2lnbik7XG4gICAgICAgIGlmICh0aGlzLmNzLnBvc2l0aW9uID4gc3RhcnQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAxMDEgLyogZSAqLyB8fCB0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA2OSAvKiBFICovKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBPcHRpb25hbCBleHBvbmVudCBzaWduXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNraXBEZWNpbWFsTnVtYmVyKHRydWUpOyAvLyBza2lwIGV4cG9uZW50IHZhbHVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuY3MucG9zaXRpb24gPiBzdGFydDtcbiAgICB9XG4gICAgc2tpcEZyYWN0aW9uYWxOdW1iZXIoYWxsb3dTaWduKSB7XG4gICAgICAgIHRoaXMuc2tpcERlY2ltYWxOdW1iZXIoYWxsb3dTaWduKTtcbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ2IC8qIFBlcmlvZCAqLykge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBPcHRpb25hbCBwZXJpb2RcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNraXBEZWNpbWFsTnVtYmVyKGZhbHNlKTtcbiAgICB9XG4gICAgc2tpcERlY2ltYWxOdW1iZXIoYWxsb3dTaWduKSB7XG4gICAgICAgIGlmIChhbGxvd1NpZ24gJiYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ1IC8qIEh5cGhlbiAqLyB8fCB0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0MyAvKiBQbHVzICovKSkge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBPcHRpb25hbCBzaWduXG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGNoYXJhY3RlcnNfMS5pc0RlY2ltYWwodGhpcy5jcy5jdXJyZW50Q2hhcikpIHtcbiAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTsgLy8gc2tpcCBpbnRlZ2VyIHBhcnRcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuVG9rZW5pemVyID0gVG9rZW5pemVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dG9rZW5pemVyLmpzLm1hcCJdfQ==