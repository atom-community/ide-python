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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRva2VuaXplci5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImNoYXJhY3RlcnNfMSIsInJlcXVpcmUiLCJjaGFyYWN0ZXJTdHJlYW1fMSIsInRleHRSYW5nZUNvbGxlY3Rpb25fMSIsInR5cGVzXzEiLCJRdW90ZVR5cGUiLCJUb2tlbiIsIlRleHRSYW5nZSIsImNvbnN0cnVjdG9yIiwidHlwZSIsInN0YXJ0IiwibGVuZ3RoIiwiVG9rZW5pemVyIiwiY3MiLCJDaGFyYWN0ZXJTdHJlYW0iLCJ0b2tlbnMiLCJtb2RlIiwiVG9rZW5pemVyTW9kZSIsIkZ1bGwiLCJ0b2tlbml6ZSIsInRleHQiLCJ1bmRlZmluZWQiLCJFcnJvciIsInBvc2l0aW9uIiwiZW5kIiwiaXNFbmRPZlN0cmVhbSIsIkFkZE5leHRUb2tlbiIsIlRleHRSYW5nZUNvbGxlY3Rpb24iLCJza2lwV2hpdGVzcGFjZSIsImhhbmRsZUNoYXJhY3RlciIsIm1vdmVOZXh0Iiwic3RyaW5nUHJlZml4TGVuZ3RoIiwiZ2V0U3RyaW5nUHJlZml4TGVuZ3RoIiwiYWR2YW5jZSIsInF1b3RlVHlwZSIsImdldFF1b3RlVHlwZSIsIk5vbmUiLCJoYW5kbGVTdHJpbmciLCJjdXJyZW50Q2hhciIsImhhbmRsZUNvbW1lbnQiLCJDb21tZW50c0FuZFN0cmluZ3MiLCJwdXNoIiwiVG9rZW5UeXBlIiwiT3BlbkJyYWNlIiwiQ2xvc2VCcmFjZSIsIk9wZW5CcmFja2V0IiwiQ2xvc2VCcmFja2V0IiwiT3BlbkN1cmx5IiwiQ2xvc2VDdXJseSIsIkNvbW1hIiwiU2VtaWNvbG9uIiwiQ29sb24iLCJpc1Bvc3NpYmxlTnVtYmVyIiwidHJ5TnVtYmVyIiwiT3BlcmF0b3IiLCJ0cnlJZGVudGlmaWVyIiwidHJ5T3BlcmF0b3IiLCJoYW5kbGVVbmtub3duIiwiaXNJZGVudGlmaWVyU3RhcnRDaGFyIiwiaXNJZGVudGlmaWVyQ2hhciIsIklkZW50aWZpZXIiLCJpc0RlY2ltYWwiLCJuZXh0Q2hhciIsIm5leHQiLCJsb29rQWhlYWQiLCJwcmV2IiwibmV4dE5leHQiLCJsZWFkaW5nU2lnbiIsInJhZGl4IiwiaXNIZXgiLCJpc0JpbmFyeSIsImlzT2N0YWwiLCJnZXRUZXh0Iiwic3Vic3RyIiwiaXNOYU4iLCJwYXJzZUludCIsIk51bWJlciIsImRlY2ltYWwiLCJza2lwRmxvYXRpbmdQb2ludENhbmRpZGF0ZSIsInBhcnNlRmxvYXQiLCJza2lwVG9XaGl0ZXNwYWNlIiwiVW5rbm93biIsInNraXBUb0VvbCIsIkNvbW1lbnQiLCJwcmVmaXgiLCJ0b0xvd2VyQ2FzZSIsIlRyaXBsZVNpbmdsZSIsIlNpbmdsZSIsIlRyaXBsZURvdWJsZSIsIkRvdWJsZSIsInNraXBUb1NpbmdsZUVuZFF1b3RlIiwic2tpcFRvVHJpcGxlRW5kUXVvdGUiLCJTdHJpbmciLCJxdW90ZSIsImFsbG93U2lnbiIsInNraXBGcmFjdGlvbmFsTnVtYmVyIiwic2tpcERlY2ltYWxOdW1iZXIiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxZQUFZLEdBQUdDLE9BQU8sQ0FBQyxjQUFELENBQTVCOztBQUNBLE1BQU1DLGlCQUFpQixHQUFHRCxPQUFPLENBQUMsbUJBQUQsQ0FBakM7O0FBQ0EsTUFBTUUscUJBQXFCLEdBQUdGLE9BQU8sQ0FBQyx1QkFBRCxDQUFyQzs7QUFDQSxNQUFNRyxPQUFPLEdBQUdILE9BQU8sQ0FBQyxTQUFELENBQXZCOztBQUNBLElBQUlJLFNBQUo7O0FBQ0EsQ0FBQyxVQUFVQSxTQUFWLEVBQXFCO0FBQ2xCQSxFQUFBQSxTQUFTLENBQUNBLFNBQVMsQ0FBQyxNQUFELENBQVQsR0FBb0IsQ0FBckIsQ0FBVCxHQUFtQyxNQUFuQztBQUNBQSxFQUFBQSxTQUFTLENBQUNBLFNBQVMsQ0FBQyxRQUFELENB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QUEzQixPQUEyQyxLQUFLekIsRUFBTCxDQUFReUIsV0FBUixLQUF3QjtBQUFHO0FBQTNFLEtBQWIsRUFBcUc7QUFDakcsV0FBS3pCLEVBQUwsQ0FBUWlCLFFBQVIsR0FEaUcsQ0FDN0U7QUFDdkI7O0FBQ0QsV0FBTzlCLFlBQVksQ0FBQzZELFNBQWIsQ0FBdUIsS0FBS2hELEVBQUwsQ0FBUXlCLFdBQS9CLENBQVAsRUFBb0Q7QUFDaEQsV0FBS3pCLEVBQUwsQ0FBUWlCLFFBQVIsR0FEZ0QsQ0FDNUI7QUFDdkI7QUFDSjs7QUFoYlc7O0FBa2JoQmhDLE9BQU8sQ0FBQ2MsU0FBUixHQUFvQkEsU0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgY2hhcmFjdGVyc18xID0gcmVxdWlyZShcIi4vY2hhcmFjdGVyc1wiKTtcclxuY29uc3QgY2hhcmFjdGVyU3RyZWFtXzEgPSByZXF1aXJlKFwiLi9jaGFyYWN0ZXJTdHJlYW1cIik7XHJcbmNvbnN0IHRleHRSYW5nZUNvbGxlY3Rpb25fMSA9IHJlcXVpcmUoXCIuL3RleHRSYW5nZUNvbGxlY3Rpb25cIik7XHJcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi90eXBlc1wiKTtcclxudmFyIFF1b3RlVHlwZTtcclxuKGZ1bmN0aW9uIChRdW90ZVR5cGUpIHtcclxuICAgIFF1b3RlVHlwZVtRdW90ZVR5cGVbXCJOb25lXCJdID0gMF0gPSBcIk5vbmVcIjtcclxuICAgIFF1b3RlVHlwZVtRdW90ZVR5cGVbXCJTaW5nbGVcIl0gPSAxXSA9IFwiU2luZ2xlXCI7XHJcbiAgICBRdW90ZVR5cGVbUXVvdGVUeXBlW1wiRG91YmxlXCJdID0gMl0gPSBcIkRvdWJsZVwiO1xyXG4gICAgUXVvdGVUeXBlW1F1b3RlVHlwZVtcIlRyaXBsZVNpbmdsZVwiXSA9IDNdID0gXCJUcmlwbGVTaW5nbGVcIjtcclxuICAgIFF1b3RlVHlwZVtRdW90ZVR5cGVbXCJUcmlwbGVEb3VibGVcIl0gPSA0XSA9IFwiVHJpcGxlRG91YmxlXCI7XHJcbn0pKFF1b3RlVHlwZSB8fCAoUXVvdGVUeXBlID0ge30pKTtcclxuY2xhc3MgVG9rZW4gZXh0ZW5kcyB0eXBlc18xLlRleHRSYW5nZSB7XHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlLCBzdGFydCwgbGVuZ3RoKSB7XHJcbiAgICAgICAgc3VwZXIoc3RhcnQsIGxlbmd0aCk7XHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgIH1cclxufVxyXG5jbGFzcyBUb2tlbml6ZXIge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jcyA9IG5ldyBjaGFyYWN0ZXJTdHJlYW1fMS5DaGFyYWN0ZXJTdHJlYW0oJycpO1xyXG4gICAgICAgIHRoaXMudG9rZW5zID0gW107XHJcbiAgICAgICAgdGhpcy5tb2RlID0gdHlwZXNfMS5Ub2tlbml6ZXJNb2RlLkZ1bGw7XHJcbiAgICB9XHJcbiAgICB0b2tlbml6ZSh0ZXh0LCBzdGFydCwgbGVuZ3RoLCBtb2RlKSB7XHJcbiAgICAgICAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgc3RhcnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGV4dC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJhbmdlIHN0YXJ0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsZW5ndGggPSB0ZXh0Lmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAobGVuZ3RoIDwgMCB8fCBzdGFydCArIGxlbmd0aCA+IHRleHQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByYW5nZSBsZW5ndGgnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZSAhPT0gdW5kZWZpbmVkID8gbW9kZSA6IHR5cGVzXzEuVG9rZW5pemVyTW9kZS5GdWxsO1xyXG4gICAgICAgIHRoaXMuY3MgPSBuZXcgY2hhcmFjdGVyU3RyZWFtXzEuQ2hhcmFjdGVyU3RyZWFtKHRleHQpO1xyXG4gICAgICAgIHRoaXMuY3MucG9zaXRpb24gPSBzdGFydDtcclxuICAgICAgICBjb25zdCBlbmQgPSBzdGFydCArIGxlbmd0aDtcclxuICAgICAgICB3aGlsZSAoIXRoaXMuY3MuaXNFbmRPZlN0cmVhbSgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuQWRkTmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNzLnBvc2l0aW9uID49IGVuZCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyB0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEuVGV4dFJhbmdlQ29sbGVjdGlvbih0aGlzLnRva2Vucyk7XHJcbiAgICB9XHJcbiAgICBBZGROZXh0VG9rZW4oKSB7XHJcbiAgICAgICAgdGhpcy5jcy5za2lwV2hpdGVzcGFjZSgpO1xyXG4gICAgICAgIGlmICh0aGlzLmNzLmlzRW5kT2ZTdHJlYW0oKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5oYW5kbGVDaGFyYWN0ZXIoKSkge1xyXG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxyXG4gICAgaGFuZGxlQ2hhcmFjdGVyKCkge1xyXG4gICAgICAgIC8vIGYtc3RyaW5ncywgYi1zdHJpbmdzLCBldGNcclxuICAgICAgICBjb25zdCBzdHJpbmdQcmVmaXhMZW5ndGggPSB0aGlzLmdldFN0cmluZ1ByZWZpeExlbmd0aCgpO1xyXG4gICAgICAgIGlmIChzdHJpbmdQcmVmaXhMZW5ndGggPj0gMCkge1xyXG4gICAgICAgICAgICAvLyBJbmRlZWQgYSBzdHJpbmdcclxuICAgICAgICAgICAgdGhpcy5jcy5hZHZhbmNlKHN0cmluZ1ByZWZpeExlbmd0aCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHF1b3RlVHlwZSA9IHRoaXMuZ2V0UXVvdGVUeXBlKCk7XHJcbiAgICAgICAgICAgIGlmIChxdW90ZVR5cGUgIT09IFF1b3RlVHlwZS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0cmluZyhxdW90ZVR5cGUsIHN0cmluZ1ByZWZpeExlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMzUgLyogSGFzaCAqLykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUNvbW1lbnQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IHR5cGVzXzEuVG9rZW5pemVyTW9kZS5Db21tZW50c0FuZFN0cmluZ3MpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzd2l0Y2ggKHRoaXMuY3MuY3VycmVudENoYXIpIHtcclxuICAgICAgICAgICAgY2FzZSA0MCAvKiBPcGVuUGFyZW50aGVzaXMgKi86XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UsIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDQxIC8qIENsb3NlUGFyZW50aGVzaXMgKi86XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNlLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA5MSAvKiBPcGVuQnJhY2tldCAqLzpcclxuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFja2V0LCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA5MyAvKiBDbG9zZUJyYWNrZXQgKi86XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNrZXQsIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDEyMyAvKiBPcGVuQnJhY2UgKi86XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVuQ3VybHksIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDEyNSAvKiBDbG9zZUJyYWNlICovOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VDdXJseSwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNDQgLyogQ29tbWEgKi86XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5Db21tYSwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNTkgLyogU2VtaWNvbG9uICovOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuU2VtaWNvbG9uLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA1OCAvKiBDb2xvbiAqLzpcclxuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzUG9zc2libGVOdW1iZXIoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeU51bWJlcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0NiAvKiBQZXJpb2QgKi8pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVyYXRvciwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRyeUlkZW50aWZpZXIoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50cnlPcGVyYXRvcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVW5rbm93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICB0cnlJZGVudGlmaWVyKCkge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbjtcclxuICAgICAgICBpZiAoY2hhcmFjdGVyc18xLmlzSWRlbnRpZmllclN0YXJ0Q2hhcih0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xyXG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XHJcbiAgICAgICAgICAgIHdoaWxlIChjaGFyYWN0ZXJzXzEuaXNJZGVudGlmaWVyQ2hhcih0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmNzLnBvc2l0aW9uID4gc3RhcnQpIHtcclxuICAgICAgICAgICAgLy8gY29uc3QgdGV4dCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cihzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KTtcclxuICAgICAgICAgICAgLy8gY29uc3QgdHlwZSA9IHRoaXMua2V5d29yZHMuZmluZCgodmFsdWUsIGluZGV4KSA9PiB2YWx1ZSA9PT0gdGV4dCkgPyBUb2tlblR5cGUuS2V5d29yZCA6IFRva2VuVHlwZS5JZGVudGlmaWVyO1xyXG4gICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5JZGVudGlmaWVyLCBzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XHJcbiAgICBpc1Bvc3NpYmxlTnVtYmVyKCkge1xyXG4gICAgICAgIGlmIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDYgLyogUGVyaW9kICovICYmIGNoYXJhY3RlcnNfMS5pc0RlY2ltYWwodGhpcy5jcy5uZXh0Q2hhcikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG5leHQgPSAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDUgLyogSHlwaGVuICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQzIC8qIFBsdXMgKi8pID8gMSA6IDA7XHJcbiAgICAgICAgLy8gTmV4dCBjaGFyYWN0ZXIgbXVzdCBiZSBkZWNpbWFsIG9yIGEgZG90IG90aGVyd2lzZVxyXG4gICAgICAgIC8vIGl0IGlzIG5vdCBhIG51bWJlci4gTm8gd2hpdGVzcGFjZSBpcyBhbGxvd2VkLlxyXG4gICAgICAgIGlmIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MubG9va0FoZWFkKG5leHQpKSB8fCB0aGlzLmNzLmxvb2tBaGVhZChuZXh0KSA9PT0gNDYgLyogUGVyaW9kICovKSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIHdoYXQgcHJldmlvdXMgdG9rZW4gaXMsIGlmIGFueVxyXG4gICAgICAgICAgICBpZiAodGhpcy50b2tlbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBdCB0aGUgc3RhcnQgb2YgdGhlIGZpbGUgdGhpcyBjYW4gb25seSBiZSBhIG51bWJlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudG9rZW5zW3RoaXMudG9rZW5zLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBpZiAocHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2VcclxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNrZXRcclxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWFcclxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29sb25cclxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuU2VtaWNvbG9uXHJcbiAgICAgICAgICAgICAgICB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5jcy5sb29rQWhlYWQobmV4dCkgPT09IDQ4IC8qIF8wICovKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHROZXh0ID0gdGhpcy5jcy5sb29rQWhlYWQobmV4dCArIDEpO1xyXG4gICAgICAgICAgICBpZiAobmV4dE5leHQgPT09IDEyMCAvKiB4ICovIHx8IG5leHROZXh0ID09PSA4OCAvKiBYICovKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobmV4dE5leHQgPT09IDk4IC8qIGIgKi8gfHwgbmV4dE5leHQgPT09IDY2IC8qIEIgKi8pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChuZXh0TmV4dCA9PT0gMTExIC8qIG8gKi8gfHwgbmV4dE5leHQgPT09IDc5IC8qIE8gKi8pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcclxuICAgIHRyeU51bWJlcigpIHtcclxuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb247XHJcbiAgICAgICAgbGV0IGxlYWRpbmdTaWduID0gMDtcclxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDUgLyogSHlwaGVuICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQzIC8qIFBsdXMgKi8pIHtcclxuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBTa2lwIGxlYWRpbmcgKy8tXHJcbiAgICAgICAgICAgIGxlYWRpbmdTaWduID0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ4IC8qIF8wICovKSB7XHJcbiAgICAgICAgICAgIGxldCByYWRpeCA9IDA7XHJcbiAgICAgICAgICAgIC8vIFRyeSBoZXggPT4gaGV4aW50ZWdlcjogXCIwXCIgKFwieFwiIHwgXCJYXCIpIChbXCJfXCJdIGhleGRpZ2l0KStcclxuICAgICAgICAgICAgaWYgKCh0aGlzLmNzLm5leHRDaGFyID09PSAxMjAgLyogeCAqLyB8fCB0aGlzLmNzLm5leHRDaGFyID09PSA4OCAvKiBYICovKSAmJiBjaGFyYWN0ZXJzXzEuaXNIZXgodGhpcy5jcy5sb29rQWhlYWQoMikpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMik7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzSGV4KHRoaXMuY3MuY3VycmVudENoYXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmFkaXggPSAxNjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBUcnkgYmluYXJ5ID0+IGJpbmludGVnZXI6IFwiMFwiIChcImJcIiB8IFwiQlwiKSAoW1wiX1wiXSBiaW5kaWdpdCkrXHJcbiAgICAgICAgICAgIGlmICgodGhpcy5jcy5uZXh0Q2hhciA9PT0gOTggLyogYiAqLyB8fCB0aGlzLmNzLm5leHRDaGFyID09PSA2NiAvKiBCICovKSAmJiBjaGFyYWN0ZXJzXzEuaXNCaW5hcnkodGhpcy5jcy5sb29rQWhlYWQoMikpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMik7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzQmluYXJ5KHRoaXMuY3MuY3VycmVudENoYXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmFkaXggPSAyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIFRyeSBvY3RhbCA9PiBvY3RpbnRlZ2VyOiBcIjBcIiAoXCJvXCIgfCBcIk9cIikgKFtcIl9cIl0gb2N0ZGlnaXQpK1xyXG4gICAgICAgICAgICBpZiAoKHRoaXMuY3MubmV4dENoYXIgPT09IDExMSAvKiBvICovIHx8IHRoaXMuY3MubmV4dENoYXIgPT09IDc5IC8qIE8gKi8pICYmIGNoYXJhY3RlcnNfMS5pc09jdGFsKHRoaXMuY3MubG9va0FoZWFkKDIpKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcy5hZHZhbmNlKDIpO1xyXG4gICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJhY3RlcnNfMS5pc09jdGFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmFkaXggPSA4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyYWRpeCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIoc3RhcnQgKyBsZWFkaW5nU2lnbiwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0IC0gbGVhZGluZ1NpZ24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihwYXJzZUludCh0ZXh0LCByYWRpeCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuTnVtYmVyLCBzdGFydCwgdGV4dC5sZW5ndGggKyBsZWFkaW5nU2lnbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBkZWNpbWFsID0gZmFsc2U7XHJcbiAgICAgICAgLy8gVHJ5IGRlY2ltYWwgaW50ID0+XHJcbiAgICAgICAgLy8gICAgZGVjaW50ZWdlcjogbm9uemVyb2RpZ2l0IChbXCJfXCJdIGRpZ2l0KSogfCBcIjBcIiAoW1wiX1wiXSBcIjBcIikqXHJcbiAgICAgICAgLy8gICAgbm9uemVyb2RpZ2l0OiBcIjFcIi4uLlwiOVwiXHJcbiAgICAgICAgLy8gICAgZGlnaXQ6IFwiMFwiLi4uXCI5XCJcclxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA+PSA0OSAvKiBfMSAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyIDw9IDU3IC8qIF85ICovKSB7XHJcbiAgICAgICAgICAgIHdoaWxlIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGVjaW1hbCA9IHRoaXMuY3MuY3VycmVudENoYXIgIT09IDQ2IC8qIFBlcmlvZCAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSAxMDEgLyogZSAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSA2OSAvKiBFICovO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDggLyogXzAgKi8pIHsgLy8gXCIwXCIgKFtcIl9cIl0gXCIwXCIpKlxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDggLyogXzAgKi8gfHwgdGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gOTUgLyogVW5kZXJzY29yZSAqLykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRlY2ltYWwgPSB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSA0NiAvKiBQZXJpb2QgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gMTAxIC8qIGUgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gNjkgLyogRSAqLztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRlY2ltYWwpIHtcclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cihzdGFydCArIGxlYWRpbmdTaWduLCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQgLSBsZWFkaW5nU2lnbik7XHJcbiAgICAgICAgICAgIGlmICghaXNOYU4ocGFyc2VJbnQodGV4dCwgMTApKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuTnVtYmVyLCBzdGFydCwgdGV4dC5sZW5ndGggKyBsZWFkaW5nU2lnbikpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gRmxvYXRpbmcgcG9pbnQuIFNpZ24gd2FzIGFscmVhZHkgc2tpcHBlZCBvdmVyLlxyXG4gICAgICAgIGlmICgodGhpcy5jcy5jdXJyZW50Q2hhciA+PSA0OCAvKiBfMCAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyIDw9IDU3IC8qIF85ICovKSB8fFxyXG4gICAgICAgICAgICAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDYgLyogUGVyaW9kICovICYmIHRoaXMuY3MubmV4dENoYXIgPj0gNDggLyogXzAgKi8gJiYgdGhpcy5jcy5uZXh0Q2hhciA8PSA1NyAvKiBfOSAqLykpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc2tpcEZsb2F0aW5nUG9pbnRDYW5kaWRhdGUoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gdGhpcy5jcy5nZXRUZXh0KCkuc3Vic3RyKHN0YXJ0LCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihwYXJzZUZsb2F0KHRleHQpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLk51bWJlciwgc3RhcnQsIHRoaXMuY3MucG9zaXRpb24gLSBzdGFydCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY3MucG9zaXRpb24gPSBzdGFydDtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XHJcbiAgICB0cnlPcGVyYXRvcigpIHtcclxuICAgICAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgICAgICBjb25zdCBuZXh0Q2hhciA9IHRoaXMuY3MubmV4dENoYXI7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLmNzLmN1cnJlbnRDaGFyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgNDMgLyogUGx1cyAqLzpcclxuICAgICAgICAgICAgY2FzZSAzOCAvKiBBbXBlcnNhbmQgKi86XHJcbiAgICAgICAgICAgIGNhc2UgMTI0IC8qIEJhciAqLzpcclxuICAgICAgICAgICAgY2FzZSA5NCAvKiBDYXJldCAqLzpcclxuICAgICAgICAgICAgY2FzZSA2MSAvKiBFcXVhbCAqLzpcclxuICAgICAgICAgICAgY2FzZSAzMyAvKiBFeGNsYW1hdGlvbk1hcmsgKi86XHJcbiAgICAgICAgICAgIGNhc2UgMzcgLyogUGVyY2VudCAqLzpcclxuICAgICAgICAgICAgY2FzZSAxMjYgLyogVGlsZGUgKi86XHJcbiAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDQ1IC8qIEh5cGhlbiAqLzpcclxuICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyB8fCBuZXh0Q2hhciA9PT0gNjIgLyogR3JlYXRlciAqLyA/IDIgOiAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNDIgLyogQXN0ZXJpc2sgKi86XHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09IDQyIC8qIEFzdGVyaXNrICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDYxIC8qIEVxdWFsICovID8gMyA6IDI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDQ3IC8qIFNsYXNoICovOlxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSA0NyAvKiBTbGFzaCAqLykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMuY3MubG9va0FoZWFkKDIpID09PSA2MSAvKiBFcXVhbCAqLyA/IDMgOiAyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gbmV4dENoYXIgPT09IDYxIC8qIEVxdWFsICovID8gMiA6IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA2MCAvKiBMZXNzICovOlxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSA2MiAvKiBHcmVhdGVyICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5leHRDaGFyID09PSA2MCAvKiBMZXNzICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDYxIC8qIEVxdWFsICovID8gMyA6IDI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDYyIC8qIEdyZWF0ZXIgKi86XHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09IDYyIC8qIEdyZWF0ZXIgKi8pIHtcclxuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gNjEgLyogRXF1YWwgKi8gPyAzIDogMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyA/IDIgOiAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNjQgLyogQXQgKi86XHJcbiAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVyYXRvciwgdGhpcy5jcy5wb3NpdGlvbiwgbGVuZ3RoKSk7XHJcbiAgICAgICAgdGhpcy5jcy5hZHZhbmNlKGxlbmd0aCk7XHJcbiAgICAgICAgcmV0dXJuIGxlbmd0aCA+IDA7XHJcbiAgICB9XHJcbiAgICBoYW5kbGVVbmtub3duKCkge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbjtcclxuICAgICAgICB0aGlzLmNzLnNraXBUb1doaXRlc3BhY2UoKTtcclxuICAgICAgICBjb25zdCBsZW5ndGggPSB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQ7XHJcbiAgICAgICAgaWYgKGxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuVW5rbm93biwgc3RhcnQsIGxlbmd0aCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaGFuZGxlQ29tbWVudCgpIHtcclxuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb247XHJcbiAgICAgICAgdGhpcy5jcy5za2lwVG9Fb2woKTtcclxuICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5Db21tZW50LCBzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KSk7XHJcbiAgICB9XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XHJcbiAgICBnZXRTdHJpbmdQcmVmaXhMZW5ndGgoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDM5IC8qIFNpbmdsZVF1b3RlICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDM0IC8qIERvdWJsZVF1b3RlICovKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBTaW1wbGUgc3RyaW5nLCBubyBwcmVmaXhcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuY3MubmV4dENoYXIgPT09IDM5IC8qIFNpbmdsZVF1b3RlICovIHx8IHRoaXMuY3MubmV4dENoYXIgPT09IDM0IC8qIERvdWJsZVF1b3RlICovKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jcy5jdXJyZW50Q2hhcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxMDIgLyogZiAqLzpcclxuICAgICAgICAgICAgICAgIGNhc2UgNzAgLyogRiAqLzpcclxuICAgICAgICAgICAgICAgIGNhc2UgMTE0IC8qIHIgKi86XHJcbiAgICAgICAgICAgICAgICBjYXNlIDgyIC8qIFIgKi86XHJcbiAgICAgICAgICAgICAgICBjYXNlIDk4IC8qIGIgKi86XHJcbiAgICAgICAgICAgICAgICBjYXNlIDY2IC8qIEIgKi86XHJcbiAgICAgICAgICAgICAgICBjYXNlIDExNyAvKiB1ICovOlxyXG4gICAgICAgICAgICAgICAgY2FzZSA4NSAvKiBVICovOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxOyAvLyBzaW5nbGUtY2hhciBwcmVmaXggbGlrZSB1XCJcIiBvciByXCJcIlxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDM5IC8qIFNpbmdsZVF1b3RlICovIHx8IHRoaXMuY3MubG9va0FoZWFkKDIpID09PSAzNCAvKiBEb3VibGVRdW90ZSAqLykge1xyXG4gICAgICAgICAgICBjb25zdCBwcmVmaXggPSB0aGlzLmNzLmdldFRleHQoKS5zdWJzdHIodGhpcy5jcy5wb3NpdGlvbiwgMikudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgc3dpdGNoIChwcmVmaXgpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3JmJzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3VyJzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2JyJzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMjtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4gICAgZ2V0UXVvdGVUeXBlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcy5uZXh0Q2hhciA9PT0gMzkgLyogU2luZ2xlUXVvdGUgKi8gJiYgdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDM5IC8qIFNpbmdsZVF1b3RlICovXHJcbiAgICAgICAgICAgICAgICA/IFF1b3RlVHlwZS5UcmlwbGVTaW5nbGVcclxuICAgICAgICAgICAgICAgIDogUXVvdGVUeXBlLlNpbmdsZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDM0IC8qIERvdWJsZVF1b3RlICovKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNzLm5leHRDaGFyID09PSAzNCAvKiBEb3VibGVRdW90ZSAqLyAmJiB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi9cclxuICAgICAgICAgICAgICAgID8gUXVvdGVUeXBlLlRyaXBsZURvdWJsZVxyXG4gICAgICAgICAgICAgICAgOiBRdW90ZVR5cGUuRG91YmxlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gUXVvdGVUeXBlLk5vbmU7XHJcbiAgICB9XHJcbiAgICBoYW5kbGVTdHJpbmcocXVvdGVUeXBlLCBzdHJpbmdQcmVmaXhMZW5ndGgpIHtcclxuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb24gLSBzdHJpbmdQcmVmaXhMZW5ndGg7XHJcbiAgICAgICAgaWYgKHF1b3RlVHlwZSA9PT0gUXVvdGVUeXBlLlNpbmdsZSB8fCBxdW90ZVR5cGUgPT09IFF1b3RlVHlwZS5Eb3VibGUpIHtcclxuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgICAgICAgICB0aGlzLnNraXBUb1NpbmdsZUVuZFF1b3RlKHF1b3RlVHlwZSA9PT0gUXVvdGVUeXBlLlNpbmdsZVxyXG4gICAgICAgICAgICAgICAgPyAzOSAvKiBTaW5nbGVRdW90ZSAqL1xyXG4gICAgICAgICAgICAgICAgOiAzNCAvKiBEb3VibGVRdW90ZSAqLyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMyk7XHJcbiAgICAgICAgICAgIHRoaXMuc2tpcFRvVHJpcGxlRW5kUXVvdGUocXVvdGVUeXBlID09PSBRdW90ZVR5cGUuVHJpcGxlU2luZ2xlXHJcbiAgICAgICAgICAgICAgICA/IDM5IC8qIFNpbmdsZVF1b3RlICovXHJcbiAgICAgICAgICAgICAgICA6IDM0IC8qIERvdWJsZVF1b3RlICovKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuU3RyaW5nLCBzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KSk7XHJcbiAgICB9XHJcbiAgICBza2lwVG9TaW5nbGVFbmRRdW90ZShxdW90ZSkge1xyXG4gICAgICAgIHdoaWxlICghdGhpcy5jcy5pc0VuZE9mU3RyZWFtKCkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDEwIC8qIExpbmVGZWVkICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDEzIC8qIENhcnJpYWdlUmV0dXJuICovKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFVudGVybWluYXRlZCBzaW5nbGUtbGluZSBzdHJpbmdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gOTIgLyogQmFja3NsYXNoICovICYmIHRoaXMuY3MubmV4dENoYXIgPT09IHF1b3RlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMik7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gcXVvdGUpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xyXG4gICAgfVxyXG4gICAgc2tpcFRvVHJpcGxlRW5kUXVvdGUocXVvdGUpIHtcclxuICAgICAgICB3aGlsZSAoIXRoaXMuY3MuaXNFbmRPZlN0cmVhbSgpICYmICh0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSBxdW90ZSB8fCB0aGlzLmNzLm5leHRDaGFyICE9PSBxdW90ZSB8fCB0aGlzLmNzLmxvb2tBaGVhZCgyKSAhPT0gcXVvdGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jcy5hZHZhbmNlKDMpO1xyXG4gICAgfVxyXG4gICAgc2tpcEZsb2F0aW5nUG9pbnRDYW5kaWRhdGUoYWxsb3dTaWduKSB7XHJcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGVuZCBvZiB0aGUgcG90ZW50aWFsIGZsb2F0aW5nIHBvaW50IG51bWJlclxyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbjtcclxuICAgICAgICB0aGlzLnNraXBGcmFjdGlvbmFsTnVtYmVyKGFsbG93U2lnbik7XHJcbiAgICAgICAgaWYgKHRoaXMuY3MucG9zaXRpb24gPiBzdGFydCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMTAxIC8qIGUgKi8gfHwgdGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNjkgLyogRSAqLykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBPcHRpb25hbCBleHBvbmVudCBzaWduXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5za2lwRGVjaW1hbE51bWJlcih0cnVlKTsgLy8gc2tpcCBleHBvbmVudCB2YWx1ZVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5jcy5wb3NpdGlvbiA+IHN0YXJ0O1xyXG4gICAgfVxyXG4gICAgc2tpcEZyYWN0aW9uYWxOdW1iZXIoYWxsb3dTaWduKSB7XHJcbiAgICAgICAgdGhpcy5za2lwRGVjaW1hbE51bWJlcihhbGxvd1NpZ24pO1xyXG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0NiAvKiBQZXJpb2QgKi8pIHtcclxuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBPcHRpb25hbCBwZXJpb2RcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5za2lwRGVjaW1hbE51bWJlcihmYWxzZSk7XHJcbiAgICB9XHJcbiAgICBza2lwRGVjaW1hbE51bWJlcihhbGxvd1NpZ24pIHtcclxuICAgICAgICBpZiAoYWxsb3dTaWduICYmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0NSAvKiBIeXBoZW4gKi8gfHwgdGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDMgLyogUGx1cyAqLykpIHtcclxuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBPcHRpb25hbCBzaWduXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdoaWxlIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTsgLy8gc2tpcCBpbnRlZ2VyIHBhcnRcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Ub2tlbml6ZXIgPSBUb2tlbml6ZXI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRva2VuaXplci5qcy5tYXAiXX0=