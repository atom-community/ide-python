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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRva2VuaXplci5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImNoYXJhY3RlcnNfMSIsInJlcXVpcmUiLCJjaGFyYWN0ZXJTdHJlYW1fMSIsInRleHRSYW5nZUNvbGxlY3Rpb25fMSIsInR5cGVzXzEiLCJRdW90ZVR5cGUiLCJUb2tlbiIsIlRleHRSYW5nZSIsImNvbnN0cnVjdG9yIiwidHlwZSIsInN0YXJ0IiwibGVuZ3RoIiwiVG9rZW5pemVyIiwiY3MiLCJDaGFyYWN0ZXJTdHJlYW0iLCJ0b2tlbnMiLCJtb2RlIiwiVG9rZW5pemVyTW9kZSIsIkZ1bGwiLCJ0b2tlbml6ZSIsInRleHQiLCJ1bmRlZmluZWQiLCJFcnJvciIsInBvc2l0aW9uIiwiZW5kIiwiaXNFbmRPZlN0cmVhbSIsIkFkZE5leHRUb2tlbiIsIlRleHRSYW5nZUNvbGxlY3Rpb24iLCJza2lwV2hpdGVzcGFjZSIsImhhbmRsZUNoYXJhY3RlciIsIm1vdmVOZXh0Iiwic3RyaW5nUHJlZml4TGVuZ3RoIiwiZ2V0U3RyaW5nUHJlZml4TGVuZ3RoIiwiYWR2YW5jZSIsInF1b3RlVHlwZSIsImdldFF1b3RlVHlwZSIsIk5vbmUiLCJoYW5kbGVTdHJpbmciLCJjdXJyZW50Q2hhciIsImhhbmRsZUNvbW1lbnQiLCJDb21tZW50c0FuZFN0cmluZ3MiLCJwdXNoIiwiVG9rZW5UeXBlIiwiT3BlbkJyYWNlIiwiQ2xvc2VCcmFjZSIsIk9wZW5CcmFja2V0IiwiQ2xvc2VCcmFja2V0IiwiT3BlbkN1cmx5IiwiQ2xvc2VDdXJseSIsIkNvbW1hIiwiU2VtaWNvbG9uIiwiQ29sb24iLCJpc1Bvc3NpYmxlTnVtYmVyIiwidHJ5TnVtYmVyIiwiT3BlcmF0b3IiLCJ0cnlJZGVudGlmaWVyIiwidHJ5T3BlcmF0b3IiLCJoYW5kbGVVbmtub3duIiwiaXNJZGVudGlmaWVyU3RhcnRDaGFyIiwiaXNJZGVudGlmaWVyQ2hhciIsIklkZW50aWZpZXIiLCJpc0RlY2ltYWwiLCJuZXh0Q2hhciIsIm5leHQiLCJsb29rQWhlYWQiLCJwcmV2IiwibmV4dE5leHQiLCJsZWFkaW5nU2lnbiIsInJhZGl4IiwiaXNIZXgiLCJpc0JpbmFyeSIsImlzT2N0YWwiLCJnZXRUZXh0Iiwic3Vic3RyIiwiaXNOYU4iLCJwYXJzZUludCIsIk51bWJlciIsImRlY2ltYWwiLCJza2lwRmxvYXRpbmdQb2ludENhbmRpZGF0ZSIsInBhcnNlRmxvYXQiLCJza2lwVG9XaGl0ZXNwYWNlIiwiVW5rbm93biIsInNraXBUb0VvbCIsIkNvbW1lbnQiLCJwcmVmaXgiLCJ0b0xvd2VyQ2FzZSIsIlRyaXBsZVNpbmdsZSIsIlNpbmdsZSIsIlRyaXBsZURvdWJsZSIsIkRvdWJsZSIsInNraXBUb1NpbmdsZUVuZFF1b3RlIiwic2tpcFRvVHJpcGxlRW5kUXVvdGUiLCJTdHJpbmciLCJxdW90ZSIsImFsbG93U2lnbiIsInNraXBGcmFjdGlvbmFsTnVtYmVyIiwic2tpcERlY2ltYWxOdW1iZXIiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxZQUFZLEdBQUdDLE9BQU8sQ0FBQyxjQUFELENBQTVCOztBQUNBLE1BQU1DLGlCQUFpQixHQUFHRCxPQUFPLENBQUMsbUJBQUQsQ0FBakM7O0FBQ0EsTUFBTUUscUJBQXFCLEdBQUdGLE9BQU8sQ0FBQyx1QkFBRCxDQUFyQzs7QUFDQSxNQUFNRyxPQUFPLEdBQUdILE9BQU8sQ0FBQyxTQUFELENBQXZCOztBQUNBLElBQUlJLFNBQUo7O0FBQ0EsQ0FBQyxVQUFVQSxTQUFWLEVBQXFCO0FBQ2xCQSxFQUFBQSxTQUFTLENBQUNBLFNBQVMsQ0FBQyxNQUFELENBQVQsR0FBb0IsQ0FBckIsQ0FBVCxHQUFtQyxNQUFuQztBQUNBQSxFQUFBQSxTQUFTLENBQUNBLFNBQVMsQ0FBQyxRQUFELENB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QUEzQixPQUEyQyxLQUFLekIsRUFBTCxDQUFReUIsV0FBUixLQUF3QjtBQUFHO0FBQTNFLEtBQWIsRUFBcUc7QUFDakcsV0FBS3pCLEVBQUwsQ0FBUWlCLFFBQVIsR0FEaUcsQ0FDN0U7QUFDdkI7O0FBQ0QsV0FBTzlCLFlBQVksQ0FBQzZELFNBQWIsQ0FBdUIsS0FBS2hELEVBQUwsQ0FBUXlCLFdBQS9CLENBQVAsRUFBb0Q7QUFDaEQsV0FBS3pCLEVBQUwsQ0FBUWlCLFFBQVIsR0FEZ0QsQ0FDNUI7QUFDdkI7QUFDSjs7QUFoYlc7O0FBa2JoQmhDLE9BQU8sQ0FBQ2MsU0FBUixHQUFvQkEsU0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbid1c2Ugc3RyaWN0Jztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IGNoYXJhY3RlcnNfMSA9IHJlcXVpcmUoXCIuL2NoYXJhY3RlcnNcIik7XG5jb25zdCBjaGFyYWN0ZXJTdHJlYW1fMSA9IHJlcXVpcmUoXCIuL2NoYXJhY3RlclN0cmVhbVwiKTtcbmNvbnN0IHRleHRSYW5nZUNvbGxlY3Rpb25fMSA9IHJlcXVpcmUoXCIuL3RleHRSYW5nZUNvbGxlY3Rpb25cIik7XG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4vdHlwZXNcIik7XG52YXIgUXVvdGVUeXBlO1xuKGZ1bmN0aW9uIChRdW90ZVR5cGUpIHtcbiAgICBRdW90ZVR5cGVbUXVvdGVUeXBlW1wiTm9uZVwiXSA9IDBdID0gXCJOb25lXCI7XG4gICAgUXVvdGVUeXBlW1F1b3RlVHlwZVtcIlNpbmdsZVwiXSA9IDFdID0gXCJTaW5nbGVcIjtcbiAgICBRdW90ZVR5cGVbUXVvdGVUeXBlW1wiRG91YmxlXCJdID0gMl0gPSBcIkRvdWJsZVwiO1xuICAgIFF1b3RlVHlwZVtRdW90ZVR5cGVbXCJUcmlwbGVTaW5nbGVcIl0gPSAzXSA9IFwiVHJpcGxlU2luZ2xlXCI7XG4gICAgUXVvdGVUeXBlW1F1b3RlVHlwZVtcIlRyaXBsZURvdWJsZVwiXSA9IDRdID0gXCJUcmlwbGVEb3VibGVcIjtcbn0pKFF1b3RlVHlwZSB8fCAoUXVvdGVUeXBlID0ge30pKTtcbmNsYXNzIFRva2VuIGV4dGVuZHMgdHlwZXNfMS5UZXh0UmFuZ2Uge1xuICAgIGNvbnN0cnVjdG9yKHR5cGUsIHN0YXJ0LCBsZW5ndGgpIHtcbiAgICAgICAgc3VwZXIoc3RhcnQsIGxlbmd0aCk7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgfVxufVxuY2xhc3MgVG9rZW5pemVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5jcyA9IG5ldyBjaGFyYWN0ZXJTdHJlYW1fMS5DaGFyYWN0ZXJTdHJlYW0oJycpO1xuICAgICAgICB0aGlzLnRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLm1vZGUgPSB0eXBlc18xLlRva2VuaXplck1vZGUuRnVsbDtcbiAgICB9XG4gICAgdG9rZW5pemUodGV4dCwgc3RhcnQsIGxlbmd0aCwgbW9kZSkge1xuICAgICAgICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhcnQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0ZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJhbmdlIHN0YXJ0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZW5ndGggPSB0ZXh0Lmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChsZW5ndGggPCAwIHx8IHN0YXJ0ICsgbGVuZ3RoID4gdGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByYW5nZSBsZW5ndGgnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm1vZGUgPSBtb2RlICE9PSB1bmRlZmluZWQgPyBtb2RlIDogdHlwZXNfMS5Ub2tlbml6ZXJNb2RlLkZ1bGw7XG4gICAgICAgIHRoaXMuY3MgPSBuZXcgY2hhcmFjdGVyU3RyZWFtXzEuQ2hhcmFjdGVyU3RyZWFtKHRleHQpO1xuICAgICAgICB0aGlzLmNzLnBvc2l0aW9uID0gc3RhcnQ7XG4gICAgICAgIGNvbnN0IGVuZCA9IHN0YXJ0ICsgbGVuZ3RoO1xuICAgICAgICB3aGlsZSAoIXRoaXMuY3MuaXNFbmRPZlN0cmVhbSgpKSB7XG4gICAgICAgICAgICB0aGlzLkFkZE5leHRUb2tlbigpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3MucG9zaXRpb24gPj0gZW5kKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyB0ZXh0UmFuZ2VDb2xsZWN0aW9uXzEuVGV4dFJhbmdlQ29sbGVjdGlvbih0aGlzLnRva2Vucyk7XG4gICAgfVxuICAgIEFkZE5leHRUb2tlbigpIHtcbiAgICAgICAgdGhpcy5jcy5za2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICBpZiAodGhpcy5jcy5pc0VuZE9mU3RyZWFtKCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuaGFuZGxlQ2hhcmFjdGVyKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y3ljbG9tYXRpYy1jb21wbGV4aXR5XG4gICAgaGFuZGxlQ2hhcmFjdGVyKCkge1xuICAgICAgICAvLyBmLXN0cmluZ3MsIGItc3RyaW5ncywgZXRjXG4gICAgICAgIGNvbnN0IHN0cmluZ1ByZWZpeExlbmd0aCA9IHRoaXMuZ2V0U3RyaW5nUHJlZml4TGVuZ3RoKCk7XG4gICAgICAgIGlmIChzdHJpbmdQcmVmaXhMZW5ndGggPj0gMCkge1xuICAgICAgICAgICAgLy8gSW5kZWVkIGEgc3RyaW5nXG4gICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2Uoc3RyaW5nUHJlZml4TGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IHF1b3RlVHlwZSA9IHRoaXMuZ2V0UXVvdGVUeXBlKCk7XG4gICAgICAgICAgICBpZiAocXVvdGVUeXBlICE9PSBRdW90ZVR5cGUuTm9uZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RyaW5nKHF1b3RlVHlwZSwgc3RyaW5nUHJlZml4TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMzUgLyogSGFzaCAqLykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVDb21tZW50KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5tb2RlID09PSB0eXBlc18xLlRva2VuaXplck1vZGUuQ29tbWVudHNBbmRTdHJpbmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoICh0aGlzLmNzLmN1cnJlbnRDaGFyKSB7XG4gICAgICAgICAgICBjYXNlIDQwIC8qIE9wZW5QYXJlbnRoZXNpcyAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2UsIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDEgLyogQ2xvc2VQYXJlbnRoZXNpcyAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNlLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDkxIC8qIE9wZW5CcmFja2V0ICovOlxuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLk9wZW5CcmFja2V0LCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDkzIC8qIENsb3NlQnJhY2tldCAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5DbG9zZUJyYWNrZXQsIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTIzIC8qIE9wZW5CcmFjZSAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVuQ3VybHksIHRoaXMuY3MucG9zaXRpb24sIDEpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI1IC8qIENsb3NlQnJhY2UgKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuQ2xvc2VDdXJseSwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0NCAvKiBDb21tYSAqLzpcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5Db21tYSwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA1OSAvKiBTZW1pY29sb24gKi86XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuU2VtaWNvbG9uLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU4IC8qIENvbG9uICovOlxuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uLCB0aGlzLmNzLnBvc2l0aW9uLCAxKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzUG9zc2libGVOdW1iZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlOdW1iZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ2IC8qIFBlcmlvZCAqLykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5PcGVyYXRvciwgdGhpcy5jcy5wb3NpdGlvbiwgMSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRyeUlkZW50aWZpZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudHJ5T3BlcmF0b3IoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVVbmtub3duKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnlJZGVudGlmaWVyKCkge1xuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb247XG4gICAgICAgIGlmIChjaGFyYWN0ZXJzXzEuaXNJZGVudGlmaWVyU3RhcnRDaGFyKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzSWRlbnRpZmllckNoYXIodGhpcy5jcy5jdXJyZW50Q2hhcikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MucG9zaXRpb24gPiBzdGFydCkge1xuICAgICAgICAgICAgLy8gY29uc3QgdGV4dCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cihzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KTtcbiAgICAgICAgICAgIC8vIGNvbnN0IHR5cGUgPSB0aGlzLmtleXdvcmRzLmZpbmQoKHZhbHVlLCBpbmRleCkgPT4gdmFsdWUgPT09IHRleHQpID8gVG9rZW5UeXBlLktleXdvcmQgOiBUb2tlblR5cGUuSWRlbnRpZmllcjtcbiAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLklkZW50aWZpZXIsIHN0YXJ0LCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQpKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmN5Y2xvbWF0aWMtY29tcGxleGl0eVxuICAgIGlzUG9zc2libGVOdW1iZXIoKSB7XG4gICAgICAgIGlmIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDYgLyogUGVyaW9kICovICYmIGNoYXJhY3RlcnNfMS5pc0RlY2ltYWwodGhpcy5jcy5uZXh0Q2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5leHQgPSAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDUgLyogSHlwaGVuICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQzIC8qIFBsdXMgKi8pID8gMSA6IDA7XG4gICAgICAgIC8vIE5leHQgY2hhcmFjdGVyIG11c3QgYmUgZGVjaW1hbCBvciBhIGRvdCBvdGhlcndpc2VcbiAgICAgICAgLy8gaXQgaXMgbm90IGEgbnVtYmVyLiBObyB3aGl0ZXNwYWNlIGlzIGFsbG93ZWQuXG4gICAgICAgIGlmIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MubG9va0FoZWFkKG5leHQpKSB8fCB0aGlzLmNzLmxvb2tBaGVhZChuZXh0KSA9PT0gNDYgLyogUGVyaW9kICovKSB7XG4gICAgICAgICAgICAvLyBDaGVjayB3aGF0IHByZXZpb3VzIHRva2VuIGlzLCBpZiBhbnlcbiAgICAgICAgICAgIGlmICh0aGlzLnRva2Vucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBBdCB0aGUgc3RhcnQgb2YgdGhlIGZpbGUgdGhpcyBjYW4gb25seSBiZSBhIG51bWJlclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudG9rZW5zW3RoaXMudG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuT3BlbkJyYWNlXG4gICAgICAgICAgICAgICAgfHwgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5PcGVuQnJhY2tldFxuICAgICAgICAgICAgICAgIHx8IHByZXYudHlwZSA9PT0gdHlwZXNfMS5Ub2tlblR5cGUuQ29tbWFcbiAgICAgICAgICAgICAgICB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLkNvbG9uXG4gICAgICAgICAgICAgICAgfHwgcHJldi50eXBlID09PSB0eXBlc18xLlRva2VuVHlwZS5TZW1pY29sb25cbiAgICAgICAgICAgICAgICB8fCBwcmV2LnR5cGUgPT09IHR5cGVzXzEuVG9rZW5UeXBlLk9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MubG9va0FoZWFkKG5leHQpID09PSA0OCAvKiBfMCAqLykge1xuICAgICAgICAgICAgY29uc3QgbmV4dE5leHQgPSB0aGlzLmNzLmxvb2tBaGVhZChuZXh0ICsgMSk7XG4gICAgICAgICAgICBpZiAobmV4dE5leHQgPT09IDEyMCAvKiB4ICovIHx8IG5leHROZXh0ID09PSA4OCAvKiBYICovKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV4dE5leHQgPT09IDk4IC8qIGIgKi8gfHwgbmV4dE5leHQgPT09IDY2IC8qIEIgKi8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXh0TmV4dCA9PT0gMTExIC8qIG8gKi8gfHwgbmV4dE5leHQgPT09IDc5IC8qIE8gKi8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICB0cnlOdW1iZXIoKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbjtcbiAgICAgICAgbGV0IGxlYWRpbmdTaWduID0gMDtcbiAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQ1IC8qIEh5cGhlbiAqLyB8fCB0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0MyAvKiBQbHVzICovKSB7XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7IC8vIFNraXAgbGVhZGluZyArLy1cbiAgICAgICAgICAgIGxlYWRpbmdTaWduID0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDggLyogXzAgKi8pIHtcbiAgICAgICAgICAgIGxldCByYWRpeCA9IDA7XG4gICAgICAgICAgICAvLyBUcnkgaGV4ID0+IGhleGludGVnZXI6IFwiMFwiIChcInhcIiB8IFwiWFwiKSAoW1wiX1wiXSBoZXhkaWdpdCkrXG4gICAgICAgICAgICBpZiAoKHRoaXMuY3MubmV4dENoYXIgPT09IDEyMCAvKiB4ICovIHx8IHRoaXMuY3MubmV4dENoYXIgPT09IDg4IC8qIFggKi8pICYmIGNoYXJhY3RlcnNfMS5pc0hleCh0aGlzLmNzLmxvb2tBaGVhZCgyKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJhY3RlcnNfMS5pc0hleCh0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJhZGl4ID0gMTY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUcnkgYmluYXJ5ID0+IGJpbmludGVnZXI6IFwiMFwiIChcImJcIiB8IFwiQlwiKSAoW1wiX1wiXSBiaW5kaWdpdCkrXG4gICAgICAgICAgICBpZiAoKHRoaXMuY3MubmV4dENoYXIgPT09IDk4IC8qIGIgKi8gfHwgdGhpcy5jcy5uZXh0Q2hhciA9PT0gNjYgLyogQiAqLykgJiYgY2hhcmFjdGVyc18xLmlzQmluYXJ5KHRoaXMuY3MubG9va0FoZWFkKDIpKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3MuYWR2YW5jZSgyKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzQmluYXJ5KHRoaXMuY3MuY3VycmVudENoYXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmFkaXggPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVHJ5IG9jdGFsID0+IG9jdGludGVnZXI6IFwiMFwiIChcIm9cIiB8IFwiT1wiKSAoW1wiX1wiXSBvY3RkaWdpdCkrXG4gICAgICAgICAgICBpZiAoKHRoaXMuY3MubmV4dENoYXIgPT09IDExMSAvKiBvICovIHx8IHRoaXMuY3MubmV4dENoYXIgPT09IDc5IC8qIE8gKi8pICYmIGNoYXJhY3RlcnNfMS5pc09jdGFsKHRoaXMuY3MubG9va0FoZWFkKDIpKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3MuYWR2YW5jZSgyKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzT2N0YWwodGhpcy5jcy5jdXJyZW50Q2hhcikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByYWRpeCA9IDg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmFkaXggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cihzdGFydCArIGxlYWRpbmdTaWduLCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQgLSBsZWFkaW5nU2lnbik7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihwYXJzZUludCh0ZXh0LCByYWRpeCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLk51bWJlciwgc3RhcnQsIHRleHQubGVuZ3RoICsgbGVhZGluZ1NpZ24pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCBkZWNpbWFsID0gZmFsc2U7XG4gICAgICAgIC8vIFRyeSBkZWNpbWFsIGludCA9PlxuICAgICAgICAvLyAgICBkZWNpbnRlZ2VyOiBub256ZXJvZGlnaXQgKFtcIl9cIl0gZGlnaXQpKiB8IFwiMFwiIChbXCJfXCJdIFwiMFwiKSpcbiAgICAgICAgLy8gICAgbm9uemVyb2RpZ2l0OiBcIjFcIi4uLlwiOVwiXG4gICAgICAgIC8vICAgIGRpZ2l0OiBcIjBcIi4uLlwiOVwiXG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID49IDQ5IC8qIF8xICovICYmIHRoaXMuY3MuY3VycmVudENoYXIgPD0gNTcgLyogXzkgKi8pIHtcbiAgICAgICAgICAgIHdoaWxlIChjaGFyYWN0ZXJzXzEuaXNEZWNpbWFsKHRoaXMuY3MuY3VycmVudENoYXIpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVjaW1hbCA9IHRoaXMuY3MuY3VycmVudENoYXIgIT09IDQ2IC8qIFBlcmlvZCAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSAxMDEgLyogZSAqLyAmJiB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSA2OSAvKiBFICovO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0OCAvKiBfMCAqLykgeyAvLyBcIjBcIiAoW1wiX1wiXSBcIjBcIikqXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDggLyogXzAgKi8gfHwgdGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gOTUgLyogVW5kZXJzY29yZSAqLykge1xuICAgICAgICAgICAgICAgIHRoaXMuY3MubW92ZU5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlY2ltYWwgPSB0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSA0NiAvKiBQZXJpb2QgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gMTAxIC8qIGUgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciAhPT0gNjkgLyogRSAqLztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVjaW1hbCkge1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cihzdGFydCArIGxlYWRpbmdTaWduLCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQgLSBsZWFkaW5nU2lnbik7XG4gICAgICAgICAgICBpZiAoIWlzTmFOKHBhcnNlSW50KHRleHQsIDEwKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5OdW1iZXIsIHN0YXJ0LCB0ZXh0Lmxlbmd0aCArIGxlYWRpbmdTaWduKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmxvYXRpbmcgcG9pbnQuIFNpZ24gd2FzIGFscmVhZHkgc2tpcHBlZCBvdmVyLlxuICAgICAgICBpZiAoKHRoaXMuY3MuY3VycmVudENoYXIgPj0gNDggLyogXzAgKi8gJiYgdGhpcy5jcy5jdXJyZW50Q2hhciA8PSA1NyAvKiBfOSAqLykgfHxcbiAgICAgICAgICAgICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSA0NiAvKiBQZXJpb2QgKi8gJiYgdGhpcy5jcy5uZXh0Q2hhciA+PSA0OCAvKiBfMCAqLyAmJiB0aGlzLmNzLm5leHRDaGFyIDw9IDU3IC8qIF85ICovKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2tpcEZsb2F0aW5nUG9pbnRDYW5kaWRhdGUoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cihzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKHBhcnNlRmxvYXQodGV4dCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLk51bWJlciwgc3RhcnQsIHRoaXMuY3MucG9zaXRpb24gLSBzdGFydCkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jcy5wb3NpdGlvbiA9IHN0YXJ0O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICB0cnlPcGVyYXRvcigpIHtcbiAgICAgICAgbGV0IGxlbmd0aCA9IDA7XG4gICAgICAgIGNvbnN0IG5leHRDaGFyID0gdGhpcy5jcy5uZXh0Q2hhcjtcbiAgICAgICAgc3dpdGNoICh0aGlzLmNzLmN1cnJlbnRDaGFyKSB7XG4gICAgICAgICAgICBjYXNlIDQzIC8qIFBsdXMgKi86XG4gICAgICAgICAgICBjYXNlIDM4IC8qIEFtcGVyc2FuZCAqLzpcbiAgICAgICAgICAgIGNhc2UgMTI0IC8qIEJhciAqLzpcbiAgICAgICAgICAgIGNhc2UgOTQgLyogQ2FyZXQgKi86XG4gICAgICAgICAgICBjYXNlIDYxIC8qIEVxdWFsICovOlxuICAgICAgICAgICAgY2FzZSAzMyAvKiBFeGNsYW1hdGlvbk1hcmsgKi86XG4gICAgICAgICAgICBjYXNlIDM3IC8qIFBlcmNlbnQgKi86XG4gICAgICAgICAgICBjYXNlIDEyNiAvKiBUaWxkZSAqLzpcbiAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDUgLyogSHlwaGVuICovOlxuICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyB8fCBuZXh0Q2hhciA9PT0gNjIgLyogR3JlYXRlciAqLyA/IDIgOiAxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0MiAvKiBBc3RlcmlzayAqLzpcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09IDQyIC8qIEFzdGVyaXNrICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMuY3MubG9va0FoZWFkKDIpID09PSA2MSAvKiBFcXVhbCAqLyA/IDMgOiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gbmV4dENoYXIgPT09IDYxIC8qIEVxdWFsICovID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0NyAvKiBTbGFzaCAqLzpcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09IDQ3IC8qIFNsYXNoICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMuY3MubG9va0FoZWFkKDIpID09PSA2MSAvKiBFcXVhbCAqLyA/IDMgOiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gbmV4dENoYXIgPT09IDYxIC8qIEVxdWFsICovID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2MCAvKiBMZXNzICovOlxuICAgICAgICAgICAgICAgIGlmIChuZXh0Q2hhciA9PT0gNjIgLyogR3JlYXRlciAqLykge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChuZXh0Q2hhciA9PT0gNjAgLyogTGVzcyAqLykge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gNjEgLyogRXF1YWwgKi8gPyAzIDogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyA/IDIgOiAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjIgLyogR3JlYXRlciAqLzpcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09IDYyIC8qIEdyZWF0ZXIgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5jcy5sb29rQWhlYWQoMikgPT09IDYxIC8qIEVxdWFsICovID8gMyA6IDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSBuZXh0Q2hhciA9PT0gNjEgLyogRXF1YWwgKi8gPyAyIDogMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDY0IC8qIEF0ICovOlxuICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5leHRDaGFyID09PSA2MSAvKiBFcXVhbCAqLyA/IDIgOiAxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50b2tlbnMucHVzaChuZXcgVG9rZW4odHlwZXNfMS5Ub2tlblR5cGUuT3BlcmF0b3IsIHRoaXMuY3MucG9zaXRpb24sIGxlbmd0aCkpO1xuICAgICAgICB0aGlzLmNzLmFkdmFuY2UobGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGxlbmd0aCA+IDA7XG4gICAgfVxuICAgIGhhbmRsZVVua25vd24oKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5jcy5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5jcy5za2lwVG9XaGl0ZXNwYWNlKCk7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMuY3MucG9zaXRpb24gLSBzdGFydDtcbiAgICAgICAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMudG9rZW5zLnB1c2gobmV3IFRva2VuKHR5cGVzXzEuVG9rZW5UeXBlLlVua25vd24sIHN0YXJ0LCBsZW5ndGgpKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaGFuZGxlQ29tbWVudCgpIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLmNzLnBvc2l0aW9uO1xuICAgICAgICB0aGlzLmNzLnNraXBUb0VvbCgpO1xuICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5Db21tZW50LCBzdGFydCwgdGhpcy5jcy5wb3NpdGlvbiAtIHN0YXJ0KSk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjeWNsb21hdGljLWNvbXBsZXhpdHlcbiAgICBnZXRTdHJpbmdQcmVmaXhMZW5ndGgoKSB7XG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLyB8fCB0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAzNCAvKiBEb3VibGVRdW90ZSAqLykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIFNpbXBsZSBzdHJpbmcsIG5vIHByZWZpeFxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNzLm5leHRDaGFyID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLyB8fCB0aGlzLmNzLm5leHRDaGFyID09PSAzNCAvKiBEb3VibGVRdW90ZSAqLykge1xuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmNzLmN1cnJlbnRDaGFyKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxMDIgLyogZiAqLzpcbiAgICAgICAgICAgICAgICBjYXNlIDcwIC8qIEYgKi86XG4gICAgICAgICAgICAgICAgY2FzZSAxMTQgLyogciAqLzpcbiAgICAgICAgICAgICAgICBjYXNlIDgyIC8qIFIgKi86XG4gICAgICAgICAgICAgICAgY2FzZSA5OCAvKiBiICovOlxuICAgICAgICAgICAgICAgIGNhc2UgNjYgLyogQiAqLzpcbiAgICAgICAgICAgICAgICBjYXNlIDExNyAvKiB1ICovOlxuICAgICAgICAgICAgICAgIGNhc2UgODUgLyogVSAqLzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7IC8vIHNpbmdsZS1jaGFyIHByZWZpeCBsaWtlIHVcIlwiIG9yIHJcIlwiXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY3MubG9va0FoZWFkKDIpID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLyB8fCB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi8pIHtcbiAgICAgICAgICAgIGNvbnN0IHByZWZpeCA9IHRoaXMuY3MuZ2V0VGV4dCgpLnN1YnN0cih0aGlzLmNzLnBvc2l0aW9uLCAyKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgc3dpdGNoIChwcmVmaXgpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdyZic6XG4gICAgICAgICAgICAgICAgY2FzZSAndXInOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2JyJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBnZXRRdW90ZVR5cGUoKSB7XG4gICAgICAgIGlmICh0aGlzLmNzLmN1cnJlbnRDaGFyID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqLykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3MubmV4dENoYXIgPT09IDM5IC8qIFNpbmdsZVF1b3RlICovICYmIHRoaXMuY3MubG9va0FoZWFkKDIpID09PSAzOSAvKiBTaW5nbGVRdW90ZSAqL1xuICAgICAgICAgICAgICAgID8gUXVvdGVUeXBlLlRyaXBsZVNpbmdsZVxuICAgICAgICAgICAgICAgIDogUXVvdGVUeXBlLlNpbmdsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi8pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNzLm5leHRDaGFyID09PSAzNCAvKiBEb3VibGVRdW90ZSAqLyAmJiB0aGlzLmNzLmxvb2tBaGVhZCgyKSA9PT0gMzQgLyogRG91YmxlUXVvdGUgKi9cbiAgICAgICAgICAgICAgICA/IFF1b3RlVHlwZS5UcmlwbGVEb3VibGVcbiAgICAgICAgICAgICAgICA6IFF1b3RlVHlwZS5Eb3VibGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFF1b3RlVHlwZS5Ob25lO1xuICAgIH1cbiAgICBoYW5kbGVTdHJpbmcocXVvdGVUeXBlLCBzdHJpbmdQcmVmaXhMZW5ndGgpIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLmNzLnBvc2l0aW9uIC0gc3RyaW5nUHJlZml4TGVuZ3RoO1xuICAgICAgICBpZiAocXVvdGVUeXBlID09PSBRdW90ZVR5cGUuU2luZ2xlIHx8IHF1b3RlVHlwZSA9PT0gUXVvdGVUeXBlLkRvdWJsZSkge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgICAgICAgICAgdGhpcy5za2lwVG9TaW5nbGVFbmRRdW90ZShxdW90ZVR5cGUgPT09IFF1b3RlVHlwZS5TaW5nbGVcbiAgICAgICAgICAgICAgICA/IDM5IC8qIFNpbmdsZVF1b3RlICovXG4gICAgICAgICAgICAgICAgOiAzNCAvKiBEb3VibGVRdW90ZSAqLyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNzLmFkdmFuY2UoMyk7XG4gICAgICAgICAgICB0aGlzLnNraXBUb1RyaXBsZUVuZFF1b3RlKHF1b3RlVHlwZSA9PT0gUXVvdGVUeXBlLlRyaXBsZVNpbmdsZVxuICAgICAgICAgICAgICAgID8gMzkgLyogU2luZ2xlUXVvdGUgKi9cbiAgICAgICAgICAgICAgICA6IDM0IC8qIERvdWJsZVF1b3RlICovKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRva2Vucy5wdXNoKG5ldyBUb2tlbih0eXBlc18xLlRva2VuVHlwZS5TdHJpbmcsIHN0YXJ0LCB0aGlzLmNzLnBvc2l0aW9uIC0gc3RhcnQpKTtcbiAgICB9XG4gICAgc2tpcFRvU2luZ2xlRW5kUXVvdGUocXVvdGUpIHtcbiAgICAgICAgd2hpbGUgKCF0aGlzLmNzLmlzRW5kT2ZTdHJlYW0oKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDEwIC8qIExpbmVGZWVkICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDEzIC8qIENhcnJpYWdlUmV0dXJuICovKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBVbnRlcm1pbmF0ZWQgc2luZ2xlLWxpbmUgc3RyaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gOTIgLyogQmFja3NsYXNoICovICYmIHRoaXMuY3MubmV4dENoYXIgPT09IHF1b3RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcy5hZHZhbmNlKDIpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IHF1b3RlKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpO1xuICAgIH1cbiAgICBza2lwVG9UcmlwbGVFbmRRdW90ZShxdW90ZSkge1xuICAgICAgICB3aGlsZSAoIXRoaXMuY3MuaXNFbmRPZlN0cmVhbSgpICYmICh0aGlzLmNzLmN1cnJlbnRDaGFyICE9PSBxdW90ZSB8fCB0aGlzLmNzLm5leHRDaGFyICE9PSBxdW90ZSB8fCB0aGlzLmNzLmxvb2tBaGVhZCgyKSAhPT0gcXVvdGUpKSB7XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jcy5hZHZhbmNlKDMpO1xuICAgIH1cbiAgICBza2lwRmxvYXRpbmdQb2ludENhbmRpZGF0ZShhbGxvd1NpZ24pIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGVuZCBvZiB0aGUgcG90ZW50aWFsIGZsb2F0aW5nIHBvaW50IG51bWJlclxuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMuY3MucG9zaXRpb247XG4gICAgICAgIHRoaXMuc2tpcEZyYWN0aW9uYWxOdW1iZXIoYWxsb3dTaWduKTtcbiAgICAgICAgaWYgKHRoaXMuY3MucG9zaXRpb24gPiBzdGFydCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3MuY3VycmVudENoYXIgPT09IDEwMSAvKiBlICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDY5IC8qIEUgKi8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7IC8vIE9wdGlvbmFsIGV4cG9uZW50IHNpZ25cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2tpcERlY2ltYWxOdW1iZXIodHJ1ZSk7IC8vIHNraXAgZXhwb25lbnQgdmFsdWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5jcy5wb3NpdGlvbiA+IHN0YXJ0O1xuICAgIH1cbiAgICBza2lwRnJhY3Rpb25hbE51bWJlcihhbGxvd1NpZ24pIHtcbiAgICAgICAgdGhpcy5za2lwRGVjaW1hbE51bWJlcihhbGxvd1NpZ24pO1xuICAgICAgICBpZiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDYgLyogUGVyaW9kICovKSB7XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7IC8vIE9wdGlvbmFsIHBlcmlvZFxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2tpcERlY2ltYWxOdW1iZXIoZmFsc2UpO1xuICAgIH1cbiAgICBza2lwRGVjaW1hbE51bWJlcihhbGxvd1NpZ24pIHtcbiAgICAgICAgaWYgKGFsbG93U2lnbiAmJiAodGhpcy5jcy5jdXJyZW50Q2hhciA9PT0gNDUgLyogSHlwaGVuICovIHx8IHRoaXMuY3MuY3VycmVudENoYXIgPT09IDQzIC8qIFBsdXMgKi8pKSB7XG4gICAgICAgICAgICB0aGlzLmNzLm1vdmVOZXh0KCk7IC8vIE9wdGlvbmFsIHNpZ25cbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoY2hhcmFjdGVyc18xLmlzRGVjaW1hbCh0aGlzLmNzLmN1cnJlbnRDaGFyKSkge1xuICAgICAgICAgICAgdGhpcy5jcy5tb3ZlTmV4dCgpOyAvLyBza2lwIGludGVnZXIgcGFydFxuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5Ub2tlbml6ZXIgPSBUb2tlbml6ZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD10b2tlbml6ZXIuanMubWFwIl19