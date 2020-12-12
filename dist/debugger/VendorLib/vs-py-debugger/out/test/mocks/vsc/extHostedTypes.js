/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
}); // import * as crypto from 'crypto';
// tslint:disable:all

const path_1 = require("path");

const htmlContent_1 = require("./htmlContent");

const strings_1 = require("./strings");

const uri_1 = require("./uri");

var vscMockExtHostedTypes;

(function (vscMockExtHostedTypes) {
  // tslint:disable:all
  const illegalArgument = (msg = 'Illegal Argument') => new Error(msg);

  class Disposable {
    constructor(callOnDispose) {
      this._callOnDispose = callOnDispose;
    }

    static from(...disposables) {
      return new Disposable(function () {
        if (disposables) {
          for (let disposable of disposables) {
            if (disposable && typeof disposable.dispose === 'function') {
              disposable.dispose();
            }
          }

          disposables = undefined;
        }
      });
    }

    dispose() {
      if (typeof this._callOnDispose === 'function') {
        this._callOnDispose();

        this._callOnDispose = undefined;
      }
    }

  }

  vscMockExtHostedTypes.Disposable = Disposable;

  class Position {
    constructor(line, character) {
      if (line < 0) {
        throw illegalArgument('line must be non-negative');
      }

      if (character < 0) {
        throw illegalArgument('character must be non-negative');
      }

      this._line = line;
      this._character = character;
    }

    static Min(...positions) {
      let result = positions.pop();

      for (let p of positions) {
        if (p.isBefore(result)) {
          result = p;
        }
      }

      return result;
    }

    static Max(...positions) {
      let result = positions.pop();

      for (let p of positions) {
        if (p.isAfter(result)) {
          result = p;
        }
      }

      return result;
    }

    static isPosition(other) {
      if (!other) {
        return false;
      }

      if (other instanceof Position) {
        return true;
      }

      let {
        line,
        character
      } = other;

      if (typeof line === 'number' && typeof character === 'number') {
        return true;
      }

      return false;
    }

    get line() {
      return this._line;
    }

    get character() {
      return this._character;
    }

    isBefore(other) {
      if (this._line < other._line) {
        return true;
      }

      if (other._line < this._line) {
        return false;
      }

      return this._character < other._character;
    }

    isBeforeOrEqual(other) {
      if (this._line < other._line) {
        return true;
      }

      if (other._line < this._line) {
        return false;
      }

      return this._character <= other._character;
    }

    isAfter(other) {
      return !this.isBeforeOrEqual(other);
    }

    isAfterOrEqual(other) {
      return !this.isBefore(other);
    }

    isEqual(other) {
      return this._line === other._line && this._character === other._character;
    }

    compareTo(other) {
      if (this._line < other._line) {
        return -1;
      } else if (this._line > other.line) {
        return 1;
      } else {
        // equal line
        if (this._character < other._character) {
          return -1;
        } else if (this._character > other._character) {
          return 1;
        } else {
          // equal line and character
          return 0;
        }
      }
    }

    translate(lineDeltaOrChange, characterDelta = 0) {
      if (lineDeltaOrChange === null || characterDelta === null) {
        throw illegalArgument();
      }

      let lineDelta;

      if (typeof lineDeltaOrChange === 'undefined') {
        lineDelta = 0;
      } else if (typeof lineDeltaOrChange === 'number') {
        lineDelta = lineDeltaOrChange;
      } else {
        lineDelta = typeof lineDeltaOrChange.lineDelta === 'number' ? lineDeltaOrChange.lineDelta : 0;
        characterDelta = typeof lineDeltaOrChange.characterDelta === 'number' ? lineDeltaOrChange.characterDelta : 0;
      }

      if (lineDelta === 0 && characterDelta === 0) {
        return this;
      }

      return new Position(this.line + lineDelta, this.character + characterDelta);
    }

    with(lineOrChange, character = this.character) {
      if (lineOrChange === null || character === null) {
        throw illegalArgument();
      }

      let line;

      if (typeof lineOrChange === 'undefined') {
        line = this.line;
      } else if (typeof lineOrChange === 'number') {
        line = lineOrChange;
      } else {
        line = typeof lineOrChange.line === 'number' ? lineOrChange.line : this.line;
        character = typeof lineOrChange.character === 'number' ? lineOrChange.character : this.character;
      }

      if (line === this.line && character === this.character) {
        return this;
      }

      return new Position(line, character);
    }

    toJSON() {
      return {
        line: this.line,
        character: this.character
      };
    }

  }

  vscMockExtHostedTypes.Position = Position;

  class Range {
    constructor(startLineOrStart, startColumnOrEnd, endLine, endColumn) {
      let start;
      let end;

      if (typeof startLineOrStart === 'number' && typeof startColumnOrEnd === 'number' && typeof endLine === 'number' && typeof endColumn === 'number') {
        start = new Position(startLineOrStart, startColumnOrEnd);
        end = new Position(endLine, endColumn);
      } else if (startLineOrStart instanceof Position && startColumnOrEnd instanceof Position) {
        start = startLineOrStart;
        end = startColumnOrEnd;
      }

      if (!start || !end) {
        throw new Error('Invalid arguments');
      }

      if (start.isBefore(end)) {
        this._start = start;
        this._end = end;
      } else {
        this._start = end;
        this._end = start;
      }
    }

    static isRange(thing) {
      if (thing instanceof Range) {
        return true;
      }

      if (!thing) {
        return false;
      }

      return Position.isPosition(thing.start) && Position.isPosition(thing.end);
    }

    get start() {
      return this._start;
    }

    get end() {
      return this._end;
    }

    contains(positionOrRange) {
      if (positionOrRange instanceof Range) {
        return this.contains(positionOrRange._start) && this.contains(positionOrRange._end);
      } else if (positionOrRange instanceof Position) {
        if (positionOrRange.isBefore(this._start)) {
          return false;
        }

        if (this._end.isBefore(positionOrRange)) {
          return false;
        }

        return true;
      }

      return false;
    }

    isEqual(other) {
      return this._start.isEqual(other._start) && this._end.isEqual(other._end);
    }

    intersection(other) {
      let start = Position.Max(other.start, this._start);
      let end = Position.Min(other.end, this._end);

      if (start.isAfter(end)) {
        // this happens when there is no overlap:
        // |-----|
        //          |----|
        return undefined;
      }

      return new Range(start, end);
    }

    union(other) {
      if (this.contains(other)) {
        return this;
      } else if (other.contains(this)) {
        return other;
      }

      let start = Position.Min(other.start, this._start);
      let end = Position.Max(other.end, this.end);
      return new Range(start, end);
    }

    get isEmpty() {
      return this._start.isEqual(this._end);
    }

    get isSingleLine() {
      return this._start.line === this._end.line;
    }

    with(startOrChange, end = this.end) {
      if (startOrChange === null || end === null) {
        throw illegalArgument();
      }

      let start;

      if (!startOrChange) {
        start = this.start;
      } else if (Position.isPosition(startOrChange)) {
        start = startOrChange;
      } else {
        start = startOrChange.start || this.start;
        end = startOrChange.end || this.end;
      }

      if (start.isEqual(this._start) && end.isEqual(this.end)) {
        return this;
      }

      return new Range(start, end);
    }

    toJSON() {
      return [this.start, this.end];
    }

  }

  vscMockExtHostedTypes.Range = Range;

  class Selection extends Range {
    constructor(anchorLineOrAnchor, anchorColumnOrActive, activeLine, activeColumn) {
      let anchor;
      let active;

      if (typeof anchorLineOrAnchor === 'number' && typeof anchorColumnOrActive === 'number' && typeof activeLine === 'number' && typeof activeColumn === 'number') {
        anchor = new Position(anchorLineOrAnchor, anchorColumnOrActive);
        active = new Position(activeLine, activeColumn);
      } else if (anchorLineOrAnchor instanceof Position && anchorColumnOrActive instanceof Position) {
        anchor = anchorLineOrAnchor;
        active = anchorColumnOrActive;
      }

      if (!anchor || !active) {
        throw new Error('Invalid arguments');
      }

      super(anchor, active);
      this._anchor = anchor;
      this._active = active;
    }

    static isSelection(thing) {
      if (thing instanceof Selection) {
        return true;
      }

      if (!thing) {
        return false;
      }

      return Range.isRange(thing) && Position.isPosition(thing.anchor) && Position.isPosition(thing.active) && typeof thing.isReversed === 'boolean';
    }

    get anchor() {
      return this._anchor;
    }

    get active() {
      return this._active;
    }

    get isReversed() {
      return this._anchor === this._end;
    }

    toJSON() {
      return {
        start: this.start,
        end: this.end,
        active: this.active,
        anchor: this.anchor
      };
    }

  }

  vscMockExtHostedTypes.Selection = Selection;
  let EndOfLine;

  (function (EndOfLine) {
    EndOfLine[EndOfLine["LF"] = 1] = "LF";
    EndOfLine[EndOfLine["CRLF"] = 2] = "CRLF";
  })(EndOfLine = vscMockExtHostedTypes.EndOfLine || (vscMockExtHostedTypes.EndOfLine = {}));

  class TextEdit {
    constructor(range, newText) {
      this.range = range;
      this.newText = newText;
    }

    static isTextEdit(thing) {
      if (thing instanceof TextEdit) {
        return true;
      }

      if (!thing) {
        return false;
      }

      return Range.isRange(thing) && typeof thing.newText === 'string';
    }

    static replace(range, newText) {
      return new TextEdit(range, newText);
    }

    static insert(position, newText) {
      return TextEdit.replace(new Range(position, position), newText);
    }

    static delete(range) {
      return TextEdit.replace(range, '');
    }

    static setEndOfLine(eol) {
      let ret = new TextEdit(undefined, undefined);
      ret.newEol = eol;
      return ret;
    }

    get range() {
      return this._range;
    }

    set range(value) {
      if (value && !Range.isRange(value)) {
        throw illegalArgument('range');
      }

      this._range = value;
    }

    get newText() {
      return this._newText || '';
    }

    set newText(value) {
      if (value && typeof value !== 'string') {
        throw illegalArgument('newText');
      }

      this._newText = value;
    }

    get newEol() {
      return this._newEol;
    }

    set newEol(value) {
      if (value && typeof value !== 'number') {
        throw illegalArgument('newEol');
      }

      this._newEol = value;
    }

    toJSON() {
      return {
        range: this.range,
        newText: this.newText,
        newEol: this._newEol
      };
    }

  }

  vscMockExtHostedTypes.TextEdit = TextEdit;

  class WorkspaceEdit {
    constructor() {
      this._seqPool = 0;
      this._resourceEdits = [];
      this._textEdits = new Map();
    } // createResource(uri: vscode.Uri): void {
    // 	this.renameResource(undefined, uri);
    // }
    // deleteResource(uri: vscode.Uri): void {
    // 	this.renameResource(uri, undefined);
    // }
    // renameResource(from: vscode.Uri, to: vscode.Uri): void {
    // 	this._resourceEdits.push({ seq: this._seqPool++, from, to });
    // }
    // resourceEdits(): [vscode.Uri, vscode.Uri][] {
    // 	return this._resourceEdits.map(({ from, to }) => (<[vscode.Uri, vscode.Uri]>[from, to]));
    // }


    createFile(uri, options) {
      throw new Error("Method not implemented.");
    }

    deleteFile(uri, options) {
      throw new Error("Method not implemented.");
    }

    renameFile(oldUri, newUri, options) {
      throw new Error("Method not implemented.");
    }

    replace(uri, range, newText) {
      let edit = new TextEdit(range, newText);
      let array = this.get(uri);

      if (array) {
        array.push(edit);
      } else {
        array = [edit];
      }

      this.set(uri, array);
    }

    insert(resource, position, newText) {
      this.replace(resource, new Range(position, position), newText);
    }

    delete(resource, range) {
      this.replace(resource, range, '');
    }

    has(uri) {
      return this._textEdits.has(uri.toString());
    }

    set(uri, edits) {
      let data = this._textEdits.get(uri.toString());

      if (!data) {
        data = {
          seq: this._seqPool++,
          uri,
          edits: []
        };

        this._textEdits.set(uri.toString(), data);
      }

      if (!edits) {
        data.edits = undefined;
      } else {
        data.edits = edits.slice(0);
      }
    }

    get(uri) {
      if (!this._textEdits.has(uri.toString())) {
        return undefined;
      }

      const {
        edits
      } = this._textEdits.get(uri.toString());

      return edits ? edits.slice() : undefined;
    }

    entries() {
      const res = [];

      this._textEdits.forEach(value => res.push([value.uri, value.edits]));

      return res.slice();
    }

    allEntries() {
      return this.entries(); // 	// use the 'seq' the we have assigned when inserting
      // 	// the operation and use that order in the resulting
      // 	// array
      // 	const res: ([vscUri.URI, TextEdit[]] | [vscUri.URI,vscUri.URI])[] = [];
      // 	this._textEdits.forEach(value => {
      // 		const { seq, uri, edits } = value;
      // 		res[seq] = [uri, edits];
      // 	});
      // 	this._resourceEdits.forEach(value => {
      // 		const { seq, from, to } = value;
      // 		res[seq] = [from, to];
      // 	});
      // 	return res;
    }

    get size() {
      return this._textEdits.size + this._resourceEdits.length;
    }

    toJSON() {
      return this.entries();
    }

  }

  vscMockExtHostedTypes.WorkspaceEdit = WorkspaceEdit;

  class SnippetString {
    constructor(value) {
      this._tabstop = 1;
      this.value = value || '';
    }

    static isSnippetString(thing) {
      if (thing instanceof SnippetString) {
        return true;
      }

      if (!thing) {
        return false;
      }

      return typeof thing.value === 'string';
    }

    static _escape(value) {
      return value.replace(/\$|}|\\/g, '\\$&');
    }

    appendText(string) {
      this.value += SnippetString._escape(string);
      return this;
    }

    appendTabstop(number = this._tabstop++) {
      this.value += '$';
      this.value += number;
      return this;
    }

    appendPlaceholder(value, number = this._tabstop++) {
      if (typeof value === 'function') {
        const nested = new SnippetString();
        nested._tabstop = this._tabstop;
        value(nested);
        this._tabstop = nested._tabstop;
        value = nested.value;
      } else {
        value = SnippetString._escape(value);
      }

      this.value += '${';
      this.value += number;
      this.value += ':';
      this.value += value;
      this.value += '}';
      return this;
    }

    appendVariable(name, defaultValue) {
      if (typeof defaultValue === 'function') {
        const nested = new SnippetString();
        nested._tabstop = this._tabstop;
        defaultValue(nested);
        this._tabstop = nested._tabstop;
        defaultValue = nested.value;
      } else if (typeof defaultValue === 'string') {
        defaultValue = defaultValue.replace(/\$|}/g, '\\$&');
      }

      this.value += '${';
      this.value += name;

      if (defaultValue) {
        this.value += ':';
        this.value += defaultValue;
      }

      this.value += '}';
      return this;
    }

  }

  vscMockExtHostedTypes.SnippetString = SnippetString;
  let DiagnosticTag;

  (function (DiagnosticTag) {
    DiagnosticTag[DiagnosticTag["Unnecessary"] = 1] = "Unnecessary";
  })(DiagnosticTag = vscMockExtHostedTypes.DiagnosticTag || (vscMockExtHostedTypes.DiagnosticTag = {}));

  let DiagnosticSeverity;

  (function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 3] = "Hint";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 2] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 1] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 0] = "Error";
  })(DiagnosticSeverity = vscMockExtHostedTypes.DiagnosticSeverity || (vscMockExtHostedTypes.DiagnosticSeverity = {}));

  class Location {
    constructor(uri, rangeOrPosition) {
      this.uri = uri;

      if (!rangeOrPosition) {//that's OK
      } else if (rangeOrPosition instanceof Range) {
        this.range = rangeOrPosition;
      } else if (rangeOrPosition instanceof Position) {
        this.range = new Range(rangeOrPosition, rangeOrPosition);
      } else {
        throw new Error('Illegal argument');
      }
    }

    static isLocation(thing) {
      if (thing instanceof Location) {
        return true;
      }

      if (!thing) {
        return false;
      }

      return Range.isRange(thing.range) && uri_1.vscUri.URI.isUri(thing.uri);
    }

    toJSON() {
      return {
        uri: this.uri,
        range: this.range
      };
    }

  }

  vscMockExtHostedTypes.Location = Location;

  class DiagnosticRelatedInformation {
    constructor(location, message) {
      this.location = location;
      this.message = message;
    }

    static is(thing) {
      if (!thing) {
        return false;
      }

      return typeof thing.message === 'string' && thing.location && Range.isRange(thing.location.range) && uri_1.vscUri.URI.isUri(thing.location.uri);
    }

  }

  vscMockExtHostedTypes.DiagnosticRelatedInformation = DiagnosticRelatedInformation;

  class Diagnostic {
    constructor(range, message, severity = DiagnosticSeverity.Error) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }

    toJSON() {
      return {
        severity: DiagnosticSeverity[this.severity],
        message: this.message,
        range: this.range,
        source: this.source,
        code: this.code
      };
    }

  }

  vscMockExtHostedTypes.Diagnostic = Diagnostic;

  class Hover {
    constructor(contents, range) {
      if (!contents) {
        throw new Error('Illegal argument, contents must be defined');
      }

      if (Array.isArray(contents)) {
        this.contents = contents;
      } else if (htmlContent_1.vscMockHtmlContent.isMarkdownString(contents)) {
        this.contents = [contents];
      } else {
        this.contents = [contents];
      }

      this.range = range;
    }

  }

  vscMockExtHostedTypes.Hover = Hover;
  let DocumentHighlightKind;

  (function (DocumentHighlightKind) {
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
  })(DocumentHighlightKind = vscMockExtHostedTypes.DocumentHighlightKind || (vscMockExtHostedTypes.DocumentHighlightKind = {}));

  class DocumentHighlight {
    constructor(range, kind = DocumentHighlightKind.Text) {
      this.range = range;
      this.kind = kind;
    }

    toJSON() {
      return {
        range: this.range,
        kind: DocumentHighlightKind[this.kind]
      };
    }

  }

  vscMockExtHostedTypes.DocumentHighlight = DocumentHighlight;
  let SymbolKind;

  (function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
  })(SymbolKind = vscMockExtHostedTypes.SymbolKind || (vscMockExtHostedTypes.SymbolKind = {}));

  class SymbolInformation {
    constructor(name, kind, rangeOrContainer, locationOrUri, containerName) {
      this.name = name;
      this.kind = kind;
      this.containerName = containerName;

      if (typeof rangeOrContainer === 'string') {
        this.containerName = rangeOrContainer;
      }

      if (locationOrUri instanceof Location) {
        this.location = locationOrUri;
      } else if (rangeOrContainer instanceof Range) {
        this.location = new Location(locationOrUri, rangeOrContainer);
      }
    }

    toJSON() {
      return {
        name: this.name,
        kind: SymbolKind[this.kind],
        location: this.location,
        containerName: this.containerName
      };
    }

  }

  vscMockExtHostedTypes.SymbolInformation = SymbolInformation;

  class SymbolInformation2 extends SymbolInformation {
    constructor(name, kind, containerName, location) {
      super(name, kind, containerName, location);
      this.children = [];
      this.definingRange = location.range;
    }

  }

  vscMockExtHostedTypes.SymbolInformation2 = SymbolInformation2;
  let CodeActionTrigger;

  (function (CodeActionTrigger) {
    CodeActionTrigger[CodeActionTrigger["Automatic"] = 1] = "Automatic";
    CodeActionTrigger[CodeActionTrigger["Manual"] = 2] = "Manual";
  })(CodeActionTrigger = vscMockExtHostedTypes.CodeActionTrigger || (vscMockExtHostedTypes.CodeActionTrigger = {}));

  class CodeAction {
    constructor(title, kind) {
      this.title = title;
      this.kind = kind;
    }

  }

  vscMockExtHostedTypes.CodeAction = CodeAction;

  class CodeActionKind {
    constructor(value) {
      this.value = value;
    }

    append(parts) {
      return new CodeActionKind(this.value ? this.value + CodeActionKind.sep + parts : parts);
    }

    contains(other) {
      return this.value === other.value || strings_1.vscMockStrings.startsWith(other.value, this.value + CodeActionKind.sep);
    }

  }

  CodeActionKind.sep = '.';
  CodeActionKind.Empty = new CodeActionKind('');
  CodeActionKind.QuickFix = CodeActionKind.Empty.append('quickfix');
  CodeActionKind.Refactor = CodeActionKind.Empty.append('refactor');
  CodeActionKind.RefactorExtract = CodeActionKind.Refactor.append('extract');
  CodeActionKind.RefactorInline = CodeActionKind.Refactor.append('inline');
  CodeActionKind.RefactorRewrite = CodeActionKind.Refactor.append('rewrite');
  CodeActionKind.Source = CodeActionKind.Empty.append('source');
  CodeActionKind.SourceOrganizeImports = CodeActionKind.Source.append('organizeImports');
  vscMockExtHostedTypes.CodeActionKind = CodeActionKind;

  class CodeLens {
    constructor(range, command) {
      this.range = range;
      this.command = command;
    }

    get isResolved() {
      return !!this.command;
    }

  }

  vscMockExtHostedTypes.CodeLens = CodeLens;

  class MarkdownString {
    constructor(value) {
      this.value = value || '';
    }

    appendText(value) {
      // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
      this.value += value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
      return this;
    }

    appendMarkdown(value) {
      this.value += value;
      return this;
    }

    appendCodeblock(code, language = '') {
      this.value += '\n```';
      this.value += language;
      this.value += '\n';
      this.value += code;
      this.value += '\n```\n';
      return this;
    }

  }

  vscMockExtHostedTypes.MarkdownString = MarkdownString;

  class ParameterInformation {
    constructor(label, documentation) {
      this.label = label;
      this.documentation = documentation;
    }

  }

  vscMockExtHostedTypes.ParameterInformation = ParameterInformation;

  class SignatureInformation {
    constructor(label, documentation) {
      this.label = label;
      this.documentation = documentation;
      this.parameters = [];
    }

  }

  vscMockExtHostedTypes.SignatureInformation = SignatureInformation;

  class SignatureHelp {
    constructor() {
      this.signatures = [];
    }

  }

  vscMockExtHostedTypes.SignatureHelp = SignatureHelp;
  let CompletionTriggerKind;

  (function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
  })(CompletionTriggerKind = vscMockExtHostedTypes.CompletionTriggerKind || (vscMockExtHostedTypes.CompletionTriggerKind = {}));

  let CompletionItemKind;

  (function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Text"] = 0] = "Text";
    CompletionItemKind[CompletionItemKind["Method"] = 1] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 2] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 3] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 4] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 5] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 6] = "Class";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Unit"] = 10] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 11] = "Value";
    CompletionItemKind[CompletionItemKind["Enum"] = 12] = "Enum";
    CompletionItemKind[CompletionItemKind["Keyword"] = 13] = "Keyword";
    CompletionItemKind[CompletionItemKind["Snippet"] = 14] = "Snippet";
    CompletionItemKind[CompletionItemKind["Color"] = 15] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 16] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 17] = "Reference";
    CompletionItemKind[CompletionItemKind["Folder"] = 18] = "Folder";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 19] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Constant"] = 20] = "Constant";
    CompletionItemKind[CompletionItemKind["Struct"] = 21] = "Struct";
    CompletionItemKind[CompletionItemKind["Event"] = 22] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 23] = "Operator";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
  })(CompletionItemKind = vscMockExtHostedTypes.CompletionItemKind || (vscMockExtHostedTypes.CompletionItemKind = {}));

  class CompletionItem {
    constructor(label, kind) {
      this.label = label;
      this.kind = kind;
    }

    toJSON() {
      return {
        label: this.label,
        kind: CompletionItemKind[this.kind],
        detail: this.detail,
        documentation: this.documentation,
        sortText: this.sortText,
        filterText: this.filterText,
        insertText: this.insertText,
        textEdit: this.textEdit
      };
    }

  }

  vscMockExtHostedTypes.CompletionItem = CompletionItem;

  class CompletionList {
    constructor(items = [], isIncomplete = false) {
      this.items = items;
      this.isIncomplete = isIncomplete;
    }

  }

  vscMockExtHostedTypes.CompletionList = CompletionList;
  let ViewColumn;

  (function (ViewColumn) {
    ViewColumn[ViewColumn["Active"] = -1] = "Active";
    ViewColumn[ViewColumn["One"] = 1] = "One";
    ViewColumn[ViewColumn["Two"] = 2] = "Two";
    ViewColumn[ViewColumn["Three"] = 3] = "Three";
  })(ViewColumn = vscMockExtHostedTypes.ViewColumn || (vscMockExtHostedTypes.ViewColumn = {}));

  let StatusBarAlignment;

  (function (StatusBarAlignment) {
    StatusBarAlignment[StatusBarAlignment["Left"] = 1] = "Left";
    StatusBarAlignment[StatusBarAlignment["Right"] = 2] = "Right";
  })(StatusBarAlignment = vscMockExtHostedTypes.StatusBarAlignment || (vscMockExtHostedTypes.StatusBarAlignment = {}));

  let TextEditorLineNumbersStyle;

  (function (TextEditorLineNumbersStyle) {
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Off"] = 0] = "Off";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["On"] = 1] = "On";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Relative"] = 2] = "Relative";
  })(TextEditorLineNumbersStyle = vscMockExtHostedTypes.TextEditorLineNumbersStyle || (vscMockExtHostedTypes.TextEditorLineNumbersStyle = {}));

  let TextDocumentSaveReason;

  (function (TextDocumentSaveReason) {
    TextDocumentSaveReason[TextDocumentSaveReason["Manual"] = 1] = "Manual";
    TextDocumentSaveReason[TextDocumentSaveReason["AfterDelay"] = 2] = "AfterDelay";
    TextDocumentSaveReason[TextDocumentSaveReason["FocusOut"] = 3] = "FocusOut";
  })(TextDocumentSaveReason = vscMockExtHostedTypes.TextDocumentSaveReason || (vscMockExtHostedTypes.TextDocumentSaveReason = {}));

  let TextEditorRevealType;

  (function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
  })(TextEditorRevealType = vscMockExtHostedTypes.TextEditorRevealType || (vscMockExtHostedTypes.TextEditorRevealType = {}));

  let TextEditorSelectionChangeKind;

  (function (TextEditorSelectionChangeKind) {
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Keyboard"] = 1] = "Keyboard";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Mouse"] = 2] = "Mouse";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Command"] = 3] = "Command";
  })(TextEditorSelectionChangeKind = vscMockExtHostedTypes.TextEditorSelectionChangeKind || (vscMockExtHostedTypes.TextEditorSelectionChangeKind = {}));
  /**
   * These values match very carefully the values of `TrackedRangeStickiness`
   */


  let DecorationRangeBehavior;

  (function (DecorationRangeBehavior) {
    /**
     * TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenOpen"] = 0] = "OpenOpen";
    /**
     * TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
     */

    DecorationRangeBehavior[DecorationRangeBehavior["ClosedClosed"] = 1] = "ClosedClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
     */

    DecorationRangeBehavior[DecorationRangeBehavior["OpenClosed"] = 2] = "OpenClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingAfter
     */

    DecorationRangeBehavior[DecorationRangeBehavior["ClosedOpen"] = 3] = "ClosedOpen";
  })(DecorationRangeBehavior = vscMockExtHostedTypes.DecorationRangeBehavior || (vscMockExtHostedTypes.DecorationRangeBehavior = {}));

  (function (TextEditorSelectionChangeKind) {
    function fromValue(s) {
      switch (s) {
        case 'keyboard':
          return TextEditorSelectionChangeKind.Keyboard;

        case 'mouse':
          return TextEditorSelectionChangeKind.Mouse;

        case 'api':
          return TextEditorSelectionChangeKind.Command;
      }

      return undefined;
    }

    TextEditorSelectionChangeKind.fromValue = fromValue;
  })(TextEditorSelectionChangeKind = vscMockExtHostedTypes.TextEditorSelectionChangeKind || (vscMockExtHostedTypes.TextEditorSelectionChangeKind = {}));

  class DocumentLink {
    constructor(range, target) {
      if (target && !(target instanceof uri_1.vscUri.URI)) {
        throw illegalArgument('target');
      }

      if (!Range.isRange(range) || range.isEmpty) {
        throw illegalArgument('range');
      }

      this.range = range;
      this.target = target;
    }

  }

  vscMockExtHostedTypes.DocumentLink = DocumentLink;

  class Color {
    constructor(red, green, blue, alpha) {
      this.red = red;
      this.green = green;
      this.blue = blue;
      this.alpha = alpha;
    }

  }

  vscMockExtHostedTypes.Color = Color;

  class ColorInformation {
    constructor(range, color) {
      if (color && !(color instanceof Color)) {
        throw illegalArgument('color');
      }

      if (!Range.isRange(range) || range.isEmpty) {
        throw illegalArgument('range');
      }

      this.range = range;
      this.color = color;
    }

  }

  vscMockExtHostedTypes.ColorInformation = ColorInformation;

  class ColorPresentation {
    constructor(label) {
      if (!label || typeof label !== 'string') {
        throw illegalArgument('label');
      }

      this.label = label;
    }

  }

  vscMockExtHostedTypes.ColorPresentation = ColorPresentation;
  let ColorFormat;

  (function (ColorFormat) {
    ColorFormat[ColorFormat["RGB"] = 0] = "RGB";
    ColorFormat[ColorFormat["HEX"] = 1] = "HEX";
    ColorFormat[ColorFormat["HSL"] = 2] = "HSL";
  })(ColorFormat = vscMockExtHostedTypes.ColorFormat || (vscMockExtHostedTypes.ColorFormat = {}));

  let SourceControlInputBoxValidationType;

  (function (SourceControlInputBoxValidationType) {
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Error"] = 0] = "Error";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Warning"] = 1] = "Warning";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Information"] = 2] = "Information";
  })(SourceControlInputBoxValidationType = vscMockExtHostedTypes.SourceControlInputBoxValidationType || (vscMockExtHostedTypes.SourceControlInputBoxValidationType = {}));

  let TaskRevealKind;

  (function (TaskRevealKind) {
    TaskRevealKind[TaskRevealKind["Always"] = 1] = "Always";
    TaskRevealKind[TaskRevealKind["Silent"] = 2] = "Silent";
    TaskRevealKind[TaskRevealKind["Never"] = 3] = "Never";
  })(TaskRevealKind = vscMockExtHostedTypes.TaskRevealKind || (vscMockExtHostedTypes.TaskRevealKind = {}));

  let TaskPanelKind;

  (function (TaskPanelKind) {
    TaskPanelKind[TaskPanelKind["Shared"] = 1] = "Shared";
    TaskPanelKind[TaskPanelKind["Dedicated"] = 2] = "Dedicated";
    TaskPanelKind[TaskPanelKind["New"] = 3] = "New";
  })(TaskPanelKind = vscMockExtHostedTypes.TaskPanelKind || (vscMockExtHostedTypes.TaskPanelKind = {}));

  class TaskGroup {
    constructor(id, _label) {
      if (typeof id !== 'string') {
        throw illegalArgument('name');
      }

      if (typeof _label !== 'string') {
        throw illegalArgument('name');
      }

      this._id = id;
    }

    static from(value) {
      switch (value) {
        case 'clean':
          return TaskGroup.Clean;

        case 'build':
          return TaskGroup.Build;

        case 'rebuild':
          return TaskGroup.Rebuild;

        case 'test':
          return TaskGroup.Test;

        default:
          return undefined;
      }
    }

    get id() {
      return this._id;
    }

  }

  TaskGroup.Clean = new TaskGroup('clean', 'Clean');
  TaskGroup.Build = new TaskGroup('build', 'Build');
  TaskGroup.Rebuild = new TaskGroup('rebuild', 'Rebuild');
  TaskGroup.Test = new TaskGroup('test', 'Test');
  vscMockExtHostedTypes.TaskGroup = TaskGroup;

  class ProcessExecution {
    constructor(process, varg1, varg2) {
      if (typeof process !== 'string') {
        throw illegalArgument('process');
      }

      this._process = process;

      if (varg1 !== void 0) {
        if (Array.isArray(varg1)) {
          this._args = varg1;
          this._options = varg2;
        } else {
          this._options = varg1;
        }
      }

      if (this._args === void 0) {
        this._args = [];
      }
    }

    get process() {
      return this._process;
    }

    set process(value) {
      if (typeof value !== 'string') {
        throw illegalArgument('process');
      }

      this._process = value;
    }

    get args() {
      return this._args;
    }

    set args(value) {
      if (!Array.isArray(value)) {
        value = [];
      }

      this._args = value;
    }

    get options() {
      return this._options;
    }

    set options(value) {
      this._options = value;
    }

    computeId() {
      // const hash = crypto.createHash('md5');
      // hash.update('process');
      // if (this._process !== void 0) {
      //     hash.update(this._process);
      // }
      // if (this._args && this._args.length > 0) {
      //     for (let arg of this._args) {
      //         hash.update(arg);
      //     }
      // }
      // return hash.digest('hex');
      throw new Error('Not supported');
    }

  }

  vscMockExtHostedTypes.ProcessExecution = ProcessExecution;

  class ShellExecution {
    constructor(arg0, arg1, arg2) {
      if (Array.isArray(arg1)) {
        if (!arg0) {
          throw illegalArgument('command can\'t be undefined or null');
        }

        if (typeof arg0 !== 'string' && typeof arg0.value !== 'string') {
          throw illegalArgument('command');
        }

        this._command = arg0;
        this._args = arg1;
        this._options = arg2;
      } else {
        if (typeof arg0 !== 'string') {
          throw illegalArgument('commandLine');
        }

        this._commandLine = arg0;
        this._options = arg1;
      }
    }

    get commandLine() {
      return this._commandLine;
    }

    set commandLine(value) {
      if (typeof value !== 'string') {
        throw illegalArgument('commandLine');
      }

      this._commandLine = value;
    }

    get command() {
      return this._command;
    }

    set command(value) {
      if (typeof value !== 'string' && typeof value.value !== 'string') {
        throw illegalArgument('command');
      }

      this._command = value;
    }

    get args() {
      return this._args;
    }

    set args(value) {
      this._args = value || [];
    }

    get options() {
      return this._options;
    }

    set options(value) {
      this._options = value;
    }

    computeId() {
      // const hash = crypto.createHash('md5');
      // hash.update('shell');
      // if (this._commandLine !== void 0) {
      //     hash.update(this._commandLine);
      // }
      // if (this._command !== void 0) {
      //     hash.update(typeof this._command === 'string' ? this._command : this._command.value);
      // }
      // if (this._args && this._args.length > 0) {
      //     for (let arg of this._args) {
      //         hash.update(typeof arg === 'string' ? arg : arg.value);
      //     }
      // }
      // return hash.digest('hex');
      throw new Error('Not spported');
    }

  }

  vscMockExtHostedTypes.ShellExecution = ShellExecution;
  let ShellQuoting;

  (function (ShellQuoting) {
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
  })(ShellQuoting = vscMockExtHostedTypes.ShellQuoting || (vscMockExtHostedTypes.ShellQuoting = {}));

  let TaskScope;

  (function (TaskScope) {
    TaskScope[TaskScope["Global"] = 1] = "Global";
    TaskScope[TaskScope["Workspace"] = 2] = "Workspace";
  })(TaskScope = vscMockExtHostedTypes.TaskScope || (vscMockExtHostedTypes.TaskScope = {}));

  class Task {
    constructor(definition, arg2, arg3, arg4, arg5, arg6) {
      this.definition = definition;
      let problemMatchers;

      if (typeof arg2 === 'string') {
        this.name = arg2;
        this.source = arg3;
        this.execution = arg4;
        problemMatchers = arg5;
      } else if (arg2 === TaskScope.Global || arg2 === TaskScope.Workspace) {
        this.target = arg2;
        this.name = arg3;
        this.source = arg4;
        this.execution = arg5;
        problemMatchers = arg6;
      } else {
        this.target = arg2;
        this.name = arg3;
        this.source = arg4;
        this.execution = arg5;
        problemMatchers = arg6;
      }

      if (typeof problemMatchers === 'string') {
        this._problemMatchers = [problemMatchers];
        this._hasDefinedMatchers = true;
      } else if (Array.isArray(problemMatchers)) {
        this._problemMatchers = problemMatchers;
        this._hasDefinedMatchers = true;
      } else {
        this._problemMatchers = [];
        this._hasDefinedMatchers = false;
      }

      this._isBackground = false;
    }

    get _id() {
      return this.__id;
    }

    set _id(value) {
      this.__id = value;
    }

    clear() {
      if (this.__id === void 0) {
        return;
      }

      this.__id = undefined;
      this._scope = undefined;
      this._definition = undefined;

      if (this._execution instanceof ProcessExecution) {
        this._definition = {
          type: 'process',
          id: this._execution.computeId()
        };
      } else if (this._execution instanceof ShellExecution) {
        this._definition = {
          type: 'shell',
          id: this._execution.computeId()
        };
      }
    }

    get definition() {
      return this._definition;
    }

    set definition(value) {
      if (value === void 0 || value === null) {
        throw illegalArgument('Kind can\'t be undefined or null');
      }

      this.clear();
      this._definition = value;
    }

    get scope() {
      return this._scope;
    }

    set target(value) {
      this.clear();
      this._scope = value;
    }

    get name() {
      return this._name;
    }

    set name(value) {
      if (typeof value !== 'string') {
        throw illegalArgument('name');
      }

      this.clear();
      this._name = value;
    }

    get execution() {
      return this._execution;
    }

    set execution(value) {
      if (value === null) {
        value = undefined;
      }

      this.clear();
      this._execution = value;
    }

    get problemMatchers() {
      return this._problemMatchers;
    }

    set problemMatchers(value) {
      if (!Array.isArray(value)) {
        this._problemMatchers = [];
        this._hasDefinedMatchers = false;
        return;
      }

      this.clear();
      this._problemMatchers = value;
      this._hasDefinedMatchers = true;
    }

    get hasDefinedMatchers() {
      return this._hasDefinedMatchers;
    }

    get isBackground() {
      return this._isBackground;
    }

    set isBackground(value) {
      if (value !== true && value !== false) {
        value = false;
      }

      this.clear();
      this._isBackground = value;
    }

    get source() {
      return this._source;
    }

    set source(value) {
      if (typeof value !== 'string' || value.length === 0) {
        throw illegalArgument('source must be a string of length > 0');
      }

      this.clear();
      this._source = value;
    }

    get group() {
      return this._group;
    }

    set group(value) {
      if (value === void 0 || value === null) {
        this._group = undefined;
        return;
      }

      this.clear();
      this._group = value;
    }

    get presentationOptions() {
      return this._presentationOptions;
    }

    set presentationOptions(value) {
      if (value === null) {
        value = undefined;
      }

      this.clear();
      this._presentationOptions = value;
    }

  }

  vscMockExtHostedTypes.Task = Task;
  let ProgressLocation;

  (function (ProgressLocation) {
    ProgressLocation[ProgressLocation["SourceControl"] = 1] = "SourceControl";
    ProgressLocation[ProgressLocation["Window"] = 10] = "Window";
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
  })(ProgressLocation = vscMockExtHostedTypes.ProgressLocation || (vscMockExtHostedTypes.ProgressLocation = {}));

  class TreeItem {
    constructor(arg1, collapsibleState = TreeItemCollapsibleState.None) {
      this.collapsibleState = collapsibleState;

      if (arg1 instanceof uri_1.vscUri.URI) {
        this.resourceUri = arg1;
      } else {
        this.label = arg1;
      }
    }

  }

  vscMockExtHostedTypes.TreeItem = TreeItem;
  let TreeItemCollapsibleState;

  (function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
  })(TreeItemCollapsibleState = vscMockExtHostedTypes.TreeItemCollapsibleState || (vscMockExtHostedTypes.TreeItemCollapsibleState = {}));

  class ThemeIcon {
    constructor(id) {
      this.id = id;
    }

  }

  ThemeIcon.File = new ThemeIcon('file');
  ThemeIcon.Folder = new ThemeIcon('folder');
  vscMockExtHostedTypes.ThemeIcon = ThemeIcon;

  class ThemeColor {
    constructor(id) {
      this.id = id;
    }

  }

  vscMockExtHostedTypes.ThemeColor = ThemeColor;
  let ConfigurationTarget;

  (function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["Global"] = 1] = "Global";
    ConfigurationTarget[ConfigurationTarget["Workspace"] = 2] = "Workspace";
    ConfigurationTarget[ConfigurationTarget["WorkspaceFolder"] = 3] = "WorkspaceFolder";
  })(ConfigurationTarget = vscMockExtHostedTypes.ConfigurationTarget || (vscMockExtHostedTypes.ConfigurationTarget = {}));

  class RelativePattern {
    constructor(base, pattern) {
      if (typeof base !== 'string') {
        if (!base || !uri_1.vscUri.URI.isUri(base.uri)) {
          throw illegalArgument('base');
        }
      }

      if (typeof pattern !== 'string') {
        throw illegalArgument('pattern');
      }

      this.base = typeof base === 'string' ? base : base.uri.fsPath;
      this.pattern = pattern;
    }

    pathToRelative(from, to) {
      return path_1.relative(from, to);
    }

  }

  vscMockExtHostedTypes.RelativePattern = RelativePattern;

  class Breakpoint {
    constructor(enabled, condition, hitCondition, logMessage) {
      this.enabled = typeof enabled === 'boolean' ? enabled : true;

      if (typeof condition === 'string') {
        this.condition = condition;
      }

      if (typeof hitCondition === 'string') {
        this.hitCondition = hitCondition;
      }

      if (typeof logMessage === 'string') {
        this.logMessage = logMessage;
      }
    }

  }

  vscMockExtHostedTypes.Breakpoint = Breakpoint;

  class SourceBreakpoint extends Breakpoint {
    constructor(location, enabled, condition, hitCondition, logMessage) {
      super(enabled, condition, hitCondition, logMessage);

      if (location === null) {
        throw illegalArgument('location');
      }

      this.location = location;
    }

  }

  vscMockExtHostedTypes.SourceBreakpoint = SourceBreakpoint;

  class FunctionBreakpoint extends Breakpoint {
    constructor(functionName, enabled, condition, hitCondition, logMessage) {
      super(enabled, condition, hitCondition, logMessage);

      if (!functionName) {
        throw illegalArgument('functionName');
      }

      this.functionName = functionName;
    }

  }

  vscMockExtHostedTypes.FunctionBreakpoint = FunctionBreakpoint;

  class DebugAdapterExecutable {
    constructor(command, args) {
      this.command = command;
      this.args = args;
    }

  }

  vscMockExtHostedTypes.DebugAdapterExecutable = DebugAdapterExecutable;
  let LogLevel;

  (function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    LogLevel[LogLevel["Info"] = 3] = "Info";
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    LogLevel[LogLevel["Error"] = 5] = "Error";
    LogLevel[LogLevel["Critical"] = 6] = "Critical";
    LogLevel[LogLevel["Off"] = 7] = "Off";
  })(LogLevel = vscMockExtHostedTypes.LogLevel || (vscMockExtHostedTypes.LogLevel = {})); //#region file api


  let FileChangeType;

  (function (FileChangeType) {
    FileChangeType[FileChangeType["Changed"] = 1] = "Changed";
    FileChangeType[FileChangeType["Created"] = 2] = "Created";
    FileChangeType[FileChangeType["Deleted"] = 3] = "Deleted";
  })(FileChangeType = vscMockExtHostedTypes.FileChangeType || (vscMockExtHostedTypes.FileChangeType = {}));

  class FileSystemError extends Error {
    constructor(uriOrMessage, code, terminator) {
      super(uri_1.vscUri.URI.isUri(uriOrMessage) ? uriOrMessage.toString(true) : uriOrMessage);
      this.name = code ? `${code} (FileSystemError)` : `FileSystemError`; // workaround when extending builtin objects and when compiling to ES5, see:
      // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

      if (typeof Object.setPrototypeOf === 'function') {
        Object.setPrototypeOf(this, FileSystemError.prototype);
      }

      if (typeof Error.captureStackTrace === 'function' && typeof terminator === 'function') {
        // nice stack traces
        Error.captureStackTrace(this, terminator);
      }
    }

    static FileExists(messageOrUri) {
      return new FileSystemError(messageOrUri, 'EntryExists', FileSystemError.FileExists);
    }

    static FileNotFound(messageOrUri) {
      return new FileSystemError(messageOrUri, 'EntryNotFound', FileSystemError.FileNotFound);
    }

    static FileNotADirectory(messageOrUri) {
      return new FileSystemError(messageOrUri, 'EntryNotADirectory', FileSystemError.FileNotADirectory);
    }

    static FileIsADirectory(messageOrUri) {
      return new FileSystemError(messageOrUri, 'EntryIsADirectory', FileSystemError.FileIsADirectory);
    }

    static NoPermissions(messageOrUri) {
      return new FileSystemError(messageOrUri, 'NoPermissions', FileSystemError.NoPermissions);
    }

    static Unavailable(messageOrUri) {
      return new FileSystemError(messageOrUri, 'Unavailable', FileSystemError.Unavailable);
    }

  }

  vscMockExtHostedTypes.FileSystemError = FileSystemError; //#endregion
  //#region folding api

  class FoldingRange {
    constructor(start, end, kind) {
      this.start = start;
      this.end = end;
      this.kind = kind;
    }

  }

  vscMockExtHostedTypes.FoldingRange = FoldingRange;
  let FoldingRangeKind;

  (function (FoldingRangeKind) {
    FoldingRangeKind[FoldingRangeKind["Comment"] = 1] = "Comment";
    FoldingRangeKind[FoldingRangeKind["Imports"] = 2] = "Imports";
    FoldingRangeKind[FoldingRangeKind["Region"] = 3] = "Region";
  })(FoldingRangeKind = vscMockExtHostedTypes.FoldingRangeKind || (vscMockExtHostedTypes.FoldingRangeKind = {})); //#endregion


  let CommentThreadCollapsibleState;

  (function (CommentThreadCollapsibleState) {
    /**
     * Determines an item is collapsed
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Collapsed"] = 0] = "Collapsed";
    /**
     * Determines an item is expanded
     */

    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Expanded"] = 1] = "Expanded";
  })(CommentThreadCollapsibleState = vscMockExtHostedTypes.CommentThreadCollapsibleState || (vscMockExtHostedTypes.CommentThreadCollapsibleState = {}));
})(vscMockExtHostedTypes = exports.vscMockExtHostedTypes || (exports.vscMockExtHostedTypes = {}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4dEhvc3RlZFR5cGVzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwicGF0aF8xIiwicmVxdWlyZSIsImh0bWxDb250ZW50XzEiLCJzdHJpbmdzXzEiLCJ1cmlfMSIsInZzY01vY2tFeHRIb3N0ZWRUeXBlcyIsImlsbGVnYWxBcmd1bWVudCIsIm1zZyIsIkVycm9yIiwiRGlzcG9zYWJsZSIsImNvbnN0cnVjdG9yIiwiY2FsbE9uRGlzcG9zZSIsIl9jYWxsT25EaXNwb3NlIiwiZnJvbSIsImRpc3Bvc2FibGVzIiwiZGlzcG9zYWJsZSIsImRpc3Bvc2UiLCJ1bmRlZmluZWQiLCJQb3NpdGlvbiIsImxpbmUiLCJjaGFyYWN0ZXIiLCJfbGluZSIsIl9jaGFyYWN0ZXIiLCJNaW4iLCJwb3NpdGlvbnMiLCJyZXN1bHQiLCJwb3AiLCJwIiwiaXNCZWZvcmUiLCJNYXgiLCJpc0FmdGVyIiwiaXNQb3NpdGlvbiIsIm90aGVyIiwiaXNCZWZvcmVPckVxdWFsIiwiaXNBZnRlck9yRXF1YWwiLCJpc0VxdWFsIiwiY29tcGFyZVRvIiwidHJhbnNsYXRlIiwibGluZURlbHRhT3JDaGFuZ2UiLCJjaGFyYWN0ZXJEZWx0YSIsImxpbmVEZWx0YSIsIndpdGgiLCJsaW5lT3JDaGFuZ2UiLCJ0b0pTT04iLCJSYW5nZSIsInN0YXJ0TGluZU9yU3RhcnQiLCJzdGFydENvbHVtbk9yRW5kIiwiZW5kTGluZSIsImVuZENvbHVtbiIsInN0YXJ0IiwiZW5kIiwiX3N0YXJ0IiwiX2VuZCIsImlzUmFuZ2UiLCJ0aGluZyIsImNvbnRhaW5zIiwicG9zaXRpb25PclJhbmdlIiwiaW50ZXJzZWN0aW9uIiwidW5pb24iLCJpc0VtcHR5IiwiaXNTaW5nbGVMaW5lIiwic3RhcnRPckNoYW5nZSIsIlNlbGVjdGlvbiIsImFuY2hvckxpbmVPckFuY2hvciIsImFuY2hvckNvbHVtbk9yQWN0aXZlIiwiYWN0aXZlTGluZSIsImFjdGl2ZUNvbHVtbiIsImFuY2hvciIsImFjdGl2ZSIsIl9hbmNob3IiLCJfYWN0aXZlIiwiaXNTZWxlY3Rpb24iLCJpc1JldmVyc2VkIiwiRW5kT2ZMaW5lIiwiVGV4dEVkaXQiLCJyYW5nZSIsIm5ld1RleHQiLCJpc1RleHRFZGl0IiwicmVwbGFjZSIsImluc2VydCIsInBvc2l0aW9uIiwiZGVsZXRlIiwic2V0RW5kT2ZMaW5lIiwiZW9sIiwicmV0IiwibmV3RW9sIiwiX3JhbmdlIiwiX25ld1RleHQiLCJfbmV3RW9sIiwiV29ya3NwYWNlRWRpdCIsIl9zZXFQb29sIiwiX3Jlc291cmNlRWRpdHMiLCJfdGV4dEVkaXRzIiwiTWFwIiwiY3JlYXRlRmlsZSIsInVyaSIsIm9wdGlvbnMiLCJkZWxldGVGaWxlIiwicmVuYW1lRmlsZSIsIm9sZFVyaSIsIm5ld1VyaSIsImVkaXQiLCJhcnJheSIsImdldCIsInB1c2giLCJzZXQiLCJyZXNvdXJjZSIsImhhcyIsInRvU3RyaW5nIiwiZWRpdHMiLCJkYXRhIiwic2VxIiwic2xpY2UiLCJlbnRyaWVzIiwicmVzIiwiZm9yRWFjaCIsImFsbEVudHJpZXMiLCJzaXplIiwibGVuZ3RoIiwiU25pcHBldFN0cmluZyIsIl90YWJzdG9wIiwiaXNTbmlwcGV0U3RyaW5nIiwiX2VzY2FwZSIsImFwcGVuZFRleHQiLCJzdHJpbmciLCJhcHBlbmRUYWJzdG9wIiwibnVtYmVyIiwiYXBwZW5kUGxhY2Vob2xkZXIiLCJuZXN0ZWQiLCJhcHBlbmRWYXJpYWJsZSIsIm5hbWUiLCJkZWZhdWx0VmFsdWUiLCJEaWFnbm9zdGljVGFnIiwiRGlhZ25vc3RpY1NldmVyaXR5IiwiTG9jYXRpb24iLCJyYW5nZU9yUG9zaXRpb24iLCJpc0xvY2F0aW9uIiwidnNjVXJpIiwiVVJJIiwiaXNVcmkiLCJEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uIiwibG9jYXRpb24iLCJtZXNzYWdlIiwiaXMiLCJEaWFnbm9zdGljIiwic2V2ZXJpdHkiLCJzb3VyY2UiLCJjb2RlIiwiSG92ZXIiLCJjb250ZW50cyIsIkFycmF5IiwiaXNBcnJheSIsInZzY01vY2tIdG1sQ29udGVudCIsImlzTWFya2Rvd25TdHJpbmciLCJEb2N1bWVudEhpZ2hsaWdodEtpbmQiLCJEb2N1bWVudEhpZ2hsaWdodCIsImtpbmQiLCJUZXh0IiwiU3ltYm9sS2luZCIsIlN5bWJvbEluZm9ybWF0aW9uIiwicmFuZ2VPckNvbnRhaW5lciIsImxvY2F0aW9uT3JVcmkiLCJjb250YWluZXJOYW1lIiwiU3ltYm9sSW5mb3JtYXRpb24yIiwiY2hpbGRyZW4iLCJkZWZpbmluZ1JhbmdlIiwiQ29kZUFjdGlvblRyaWdnZXIiLCJDb2RlQWN0aW9uIiwidGl0bGUiLCJDb2RlQWN0aW9uS2luZCIsImFwcGVuZCIsInBhcnRzIiwic2VwIiwidnNjTW9ja1N0cmluZ3MiLCJzdGFydHNXaXRoIiwiRW1wdHkiLCJRdWlja0ZpeCIsIlJlZmFjdG9yIiwiUmVmYWN0b3JFeHRyYWN0IiwiUmVmYWN0b3JJbmxpbmUiLCJSZWZhY3RvclJld3JpdGUiLCJTb3VyY2UiLCJTb3VyY2VPcmdhbml6ZUltcG9ydHMiLCJDb2RlTGVucyIsImNvbW1hbmQiLCJpc1Jlc29sdmVkIiwiTWFya2Rvd25TdHJpbmciLCJhcHBlbmRNYXJrZG93biIsImFwcGVuZENvZGVibG9jayIsImxhbmd1YWdlIiwiUGFyYW1ldGVySW5mb3JtYXRpb24iLCJsYWJlbCIsImRvY3VtZW50YXRpb24iLCJTaWduYXR1cmVJbmZvcm1hdGlvbiIsInBhcmFtZXRlcnMiLCJTaWduYXR1cmVIZWxwIiwic2lnbmF0dXJlcyIsIkNvbXBsZXRpb25UcmlnZ2VyS2luZCIsIkNvbXBsZXRpb25JdGVtS2luZCIsIkNvbXBsZXRpb25JdGVtIiwiZGV0YWlsIiwic29ydFRleHQiLCJmaWx0ZXJUZXh0IiwiaW5zZXJ0VGV4dCIsInRleHRFZGl0IiwiQ29tcGxldGlvbkxpc3QiLCJpdGVtcyIsImlzSW5jb21wbGV0ZSIsIlZpZXdDb2x1bW4iLCJTdGF0dXNCYXJBbGlnbm1lbnQiLCJUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZSIsIlRleHREb2N1bWVudFNhdmVSZWFzb24iLCJUZXh0RWRpdG9yUmV2ZWFsVHlwZSIsIlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kIiwiRGVjb3JhdGlvblJhbmdlQmVoYXZpb3IiLCJmcm9tVmFsdWUiLCJzIiwiS2V5Ym9hcmQiLCJNb3VzZSIsIkNvbW1hbmQiLCJEb2N1bWVudExpbmsiLCJ0YXJnZXQiLCJDb2xvciIsInJlZCIsImdyZWVuIiwiYmx1ZSIsImFscGhhIiwiQ29sb3JJbmZvcm1hdGlvbiIsImNvbG9yIiwiQ29sb3JQcmVzZW50YXRpb24iLCJDb2xvckZvcm1hdCIsIlNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlIiwiVGFza1JldmVhbEtpbmQiLCJUYXNrUGFuZWxLaW5kIiwiVGFza0dyb3VwIiwiaWQiLCJfbGFiZWwiLCJfaWQiLCJDbGVhbiIsIkJ1aWxkIiwiUmVidWlsZCIsIlRlc3QiLCJQcm9jZXNzRXhlY3V0aW9uIiwicHJvY2VzcyIsInZhcmcxIiwidmFyZzIiLCJfcHJvY2VzcyIsIl9hcmdzIiwiX29wdGlvbnMiLCJhcmdzIiwiY29tcHV0ZUlkIiwiU2hlbGxFeGVjdXRpb24iLCJhcmcwIiwiYXJnMSIsImFyZzIiLCJfY29tbWFuZCIsIl9jb21tYW5kTGluZSIsImNvbW1hbmRMaW5lIiwiU2hlbGxRdW90aW5nIiwiVGFza1Njb3BlIiwiVGFzayIsImRlZmluaXRpb24iLCJhcmczIiwiYXJnNCIsImFyZzUiLCJhcmc2IiwicHJvYmxlbU1hdGNoZXJzIiwiZXhlY3V0aW9uIiwiR2xvYmFsIiwiV29ya3NwYWNlIiwiX3Byb2JsZW1NYXRjaGVycyIsIl9oYXNEZWZpbmVkTWF0Y2hlcnMiLCJfaXNCYWNrZ3JvdW5kIiwiX19pZCIsImNsZWFyIiwiX3Njb3BlIiwiX2RlZmluaXRpb24iLCJfZXhlY3V0aW9uIiwidHlwZSIsInNjb3BlIiwiX25hbWUiLCJoYXNEZWZpbmVkTWF0Y2hlcnMiLCJpc0JhY2tncm91bmQiLCJfc291cmNlIiwiZ3JvdXAiLCJfZ3JvdXAiLCJwcmVzZW50YXRpb25PcHRpb25zIiwiX3ByZXNlbnRhdGlvbk9wdGlvbnMiLCJQcm9ncmVzc0xvY2F0aW9uIiwiVHJlZUl0ZW0iLCJjb2xsYXBzaWJsZVN0YXRlIiwiVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlIiwiTm9uZSIsInJlc291cmNlVXJpIiwiVGhlbWVJY29uIiwiRmlsZSIsIkZvbGRlciIsIlRoZW1lQ29sb3IiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiUmVsYXRpdmVQYXR0ZXJuIiwiYmFzZSIsInBhdHRlcm4iLCJmc1BhdGgiLCJwYXRoVG9SZWxhdGl2ZSIsInRvIiwicmVsYXRpdmUiLCJCcmVha3BvaW50IiwiZW5hYmxlZCIsImNvbmRpdGlvbiIsImhpdENvbmRpdGlvbiIsImxvZ01lc3NhZ2UiLCJTb3VyY2VCcmVha3BvaW50IiwiRnVuY3Rpb25CcmVha3BvaW50IiwiZnVuY3Rpb25OYW1lIiwiRGVidWdBZGFwdGVyRXhlY3V0YWJsZSIsIkxvZ0xldmVsIiwiRmlsZUNoYW5nZVR5cGUiLCJGaWxlU3lzdGVtRXJyb3IiLCJ1cmlPck1lc3NhZ2UiLCJ0ZXJtaW5hdG9yIiwic2V0UHJvdG90eXBlT2YiLCJwcm90b3R5cGUiLCJjYXB0dXJlU3RhY2tUcmFjZSIsIkZpbGVFeGlzdHMiLCJtZXNzYWdlT3JVcmkiLCJGaWxlTm90Rm91bmQiLCJGaWxlTm90QURpcmVjdG9yeSIsIkZpbGVJc0FEaXJlY3RvcnkiLCJOb1Blcm1pc3Npb25zIiwiVW5hdmFpbGFibGUiLCJGb2xkaW5nUmFuZ2UiLCJGb2xkaW5nUmFuZ2VLaW5kIiwiQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGUiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0MsRSxDQUNBO0FBQ0E7O0FBQ0EsTUFBTUMsTUFBTSxHQUFHQyxPQUFPLENBQUMs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QUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxRQUFELENBQVYsR0FBdUIsQ0FBeEIsQ0FBVixHQUF1QyxRQUF2QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxXQUFELENBQVYsR0FBMEIsQ0FBM0IsQ0FBVixHQUEwQyxXQUExQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxTQUFELENBQVYsR0FBd0IsQ0FBekIsQ0FBVixHQUF3QyxTQUF4QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxPQUFELENBQVYsR0FBc0IsQ0FBdkIsQ0FBVixHQUFzQyxPQUF0QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxRQUFELENBQVYsR0FBdUIsQ0FBeEIsQ0FBVixHQUF1QyxRQUF2QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFELENBQVYsR0FBeUIsQ0FBMUIsQ0FBVixHQUF5QyxVQUF6QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxPQUFELENBQVYsR0FBc0IsQ0FBdkIsQ0FBVixHQUFzQyxPQUF0QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxhQUFELENBQVYsR0FBNEIsQ0FBN0IsQ0FBVixHQUE0QyxhQUE1QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxNQUFELENBQVYsR0FBcUIsQ0FBdEIsQ0FBVixHQUFxQyxNQUFyQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxXQUFELENBQVYsR0FBMEIsRUFBM0IsQ0FBVixHQUEyQyxXQUEzQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFELENBQVYsR0FBeUIsRUFBMUIsQ0FBVixHQUEwQyxVQUExQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFELENBQVYsR0FBeUIsRUFBMUIsQ0FBVixHQUEwQyxVQUExQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFE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QUQsQ0FBbEIsR0FBNkIsRUFBOUIsQ0FBbEIsR0FBc0QsTUFBdEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE9BQUQsQ0FBbEIsR0FBOEIsRUFBL0IsQ0FBbEIsR0FBdUQsT0FBdkQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE1BQUQsQ0FBbEIsR0FBNkIsRUFBOUIsQ0FBbEIsR0FBc0QsTUFBdEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFNBQUQsQ0FBbEIsR0FBZ0MsRUFBakMsQ0FBbEIsR0FBeUQsU0FBekQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFNBQUQsQ0FBbEIsR0FBZ0MsRUFBakMsQ0FBbEIsR0FBeUQsU0FBekQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE9BQUQsQ0FBbEIsR0FBOEIsRUFBL0IsQ0FBbEIsR0FBdUQsT0FBdkQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE1BQUQsQ0FBbEIsR0FBNkIsRUFBOUIsQ0FBbEIsR0FBc0QsTUFBdEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFdBQUQsQ0FBbEIsR0FBa0MsRUFBbkMsQ0FBbEIsR0FBMkQsV0FBM0Q7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFFBQUQsQ0FBbEIsR0FBK0IsRUFBaEMsQ0FBbEIsR0FBd0QsUUFBeEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFlBQUQsQ0FBbEIsR0FBbUMsRUFBcEMsQ0FBbEIsR0FBNEQsWUFBNUQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFVBQUQsQ0FBbEIsR0FBaUMsRUFBbEMsQ0FBbEIsR0FBMEQsVUFBMUQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFFBQUQsQ0FBbEIsR0FBK0IsRUFBaEMsQ0FBbEIsR0FBd0QsUUFBeEQ7QUFD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QUlDLGdCQUFKOztBQUNBLEdBQUMsVUFBVUEsZ0JBQVYsRUFBNEI7QUFDekJBLElBQUFBLGdCQUFnQixDQUFDQSxnQkFBZ0IsQ0FBQyxTQUFELENBQWhCLEdBQThCLENBQS9CLENBQWhCLEdBQW9ELFNBQXBEO0FBQ0FBLElBQUFBLGdCQUFnQixDQUFDQSxnQkFBZ0IsQ0FBQyxTQUFELENBQWhCLEdBQThCLENBQS9CLENBQWhCLEdBQW9ELFNBQXBEO0FBQ0FBLElBQUFBLGdCQUFnQixDQUFDQSxnQkFBZ0IsQ0FBQyxRQUFELENBQWhCLEdBQTZCLENBQTlCLENBQWhCLEdBQW1ELFFBQW5EO0FBQ0gsR0FKRCxFQUlHQSxnQkFBZ0IsR0FBR3RVLHFCQUFxQixDQUFDc1UsZ0JBQXRCLEtBQTJDdFUscUJBQXFCLENBQUNzVSxnQkFBdEIsR0FBeUMsRUFBcEYsQ0FKdEIsRUFuL0M4QixDQXcvQzlCOzs7QUFDQSxNQUFJQyw2QkFBSjs7QUFDQSxHQUFDLFVBQVVBLDZCQUFWLEVBQXlDO0FBQ3RDO0FBQ1I7QUFDQTtBQUNRQSxJQUFBQSw2QkFBNkIsQ0FBQ0EsNkJBQTZCLENBQUMsV0FBRCxDQUE3QixHQUE2QyxDQUE5QyxDQUE3QixHQUFnRixXQUFoRjtBQUNBO0FBQ1I7QUFDQTs7QUFDUUEsSUFBQUEsNkJBQTZCLENBQUNBLDZCQUE2QixDQUFDLFVBQUQsQ0FBN0IsR0FBNEMsQ0FBN0MsQ0FBN0IsR0FBK0UsVUFBL0U7QUFDSCxHQVRELEVBU0dBLDZCQUE2QixHQUFHdlUscUJBQXFCLENBQUN1VSw2QkFBdEIsS0FBd0R2VSxxQkFBcUIsQ0FBQ3VVLDZCQUF0QixHQUFzRCxFQUE5RyxDQVRuQztBQVVILENBcGdERCxFQW9nREd2VSxxQkFBcUIsR0FBR1AsT0FBTyxDQUFDTyxxQkFBUixLQUFrQ1AsT0FBTyxDQUFDTyxxQkFBUixHQUFnQyxFQUFsRSxDQXBnRDNCIiwic291cmNlc0NvbnRlbnQiOlsiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG4ndXNlIHN0cmljdCc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG4vLyBpbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbi8vIHRzbGludDpkaXNhYmxlOmFsbFxuY29uc3QgcGF0aF8xID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBodG1sQ29udGVudF8xID0gcmVxdWlyZShcIi4vaHRtbENvbnRlbnRcIik7XG5jb25zdCBzdHJpbmdzXzEgPSByZXF1aXJlKFwiLi9zdHJpbmdzXCIpO1xuY29uc3QgdXJpXzEgPSByZXF1aXJlKFwiLi91cmlcIik7XG52YXIgdnNjTW9ja0V4dEhvc3RlZFR5cGVzO1xuKGZ1bmN0aW9uICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZTphbGxcbiAgICBjb25zdCBpbGxlZ2FsQXJndW1lbnQgPSAobXNnID0gJ0lsbGVnYWwgQXJndW1lbnQnKSA9PiBuZXcgRXJyb3IobXNnKTtcbiAgICBjbGFzcyBEaXNwb3NhYmxlIHtcbiAgICAgICAgY29uc3RydWN0b3IoY2FsbE9uRGlzcG9zZSkge1xuICAgICAgICAgICAgdGhpcy5fY2FsbE9uRGlzcG9zZSA9IGNhbGxPbkRpc3Bvc2U7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGZyb20oLi4uZGlzcG9zYWJsZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3Bvc2FibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGRpc3Bvc2FibGUgb2YgZGlzcG9zYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNwb3NhYmxlICYmIHR5cGVvZiBkaXNwb3NhYmxlLmRpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkaXNwb3NhYmxlcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBkaXNwb3NlKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9jYWxsT25EaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FsbE9uRGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhbGxPbkRpc3Bvc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpc3Bvc2FibGUgPSBEaXNwb3NhYmxlO1xuICAgIGNsYXNzIFBvc2l0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IobGluZSwgY2hhcmFjdGVyKSB7XG4gICAgICAgICAgICBpZiAobGluZSA8IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2xpbmUgbXVzdCBiZSBub24tbmVnYXRpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjaGFyYWN0ZXIgbXVzdCBiZSBub24tbmVnYXRpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xpbmUgPSBsaW5lO1xuICAgICAgICAgICAgdGhpcy5fY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBNaW4oLi4ucG9zaXRpb25zKSB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gcG9zaXRpb25zLnBvcCgpO1xuICAgICAgICAgICAgZm9yIChsZXQgcCBvZiBwb3NpdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAocC5pc0JlZm9yZShyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgTWF4KC4uLnBvc2l0aW9ucykge1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHBvc2l0aW9ucy5wb3AoKTtcbiAgICAgICAgICAgIGZvciAobGV0IHAgb2YgcG9zaXRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHAuaXNBZnRlcihyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgaXNQb3NpdGlvbihvdGhlcikge1xuICAgICAgICAgICAgaWYgKCFvdGhlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvdGhlciBpbnN0YW5jZW9mIFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IG90aGVyO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaW5lID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgY2hhcmFjdGVyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBsaW5lKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xpbmU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGNoYXJhY3RlcigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jaGFyYWN0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgaXNCZWZvcmUob3RoZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9saW5lIDwgb3RoZXIuX2xpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvdGhlci5fbGluZSA8IHRoaXMuX2xpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2hhcmFjdGVyIDwgb3RoZXIuX2NoYXJhY3RlcjtcbiAgICAgICAgfVxuICAgICAgICBpc0JlZm9yZU9yRXF1YWwob3RoZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9saW5lIDwgb3RoZXIuX2xpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvdGhlci5fbGluZSA8IHRoaXMuX2xpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2hhcmFjdGVyIDw9IG90aGVyLl9jaGFyYWN0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgaXNBZnRlcihvdGhlcikge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmlzQmVmb3JlT3JFcXVhbChvdGhlcik7XG4gICAgICAgIH1cbiAgICAgICAgaXNBZnRlck9yRXF1YWwob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5pc0JlZm9yZShvdGhlcik7XG4gICAgICAgIH1cbiAgICAgICAgaXNFcXVhbChvdGhlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xpbmUgPT09IG90aGVyLl9saW5lICYmIHRoaXMuX2NoYXJhY3RlciA9PT0gb3RoZXIuX2NoYXJhY3RlcjtcbiAgICAgICAgfVxuICAgICAgICBjb21wYXJlVG8ob3RoZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9saW5lIDwgb3RoZXIuX2xpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9saW5lID4gb3RoZXIubGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZXF1YWwgbGluZVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jaGFyYWN0ZXIgPCBvdGhlci5fY2hhcmFjdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5fY2hhcmFjdGVyID4gb3RoZXIuX2NoYXJhY3Rlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVxdWFsIGxpbmUgYW5kIGNoYXJhY3RlclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdHJhbnNsYXRlKGxpbmVEZWx0YU9yQ2hhbmdlLCBjaGFyYWN0ZXJEZWx0YSA9IDApIHtcbiAgICAgICAgICAgIGlmIChsaW5lRGVsdGFPckNoYW5nZSA9PT0gbnVsbCB8fCBjaGFyYWN0ZXJEZWx0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGxpbmVEZWx0YTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGluZURlbHRhT3JDaGFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgbGluZURlbHRhID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBsaW5lRGVsdGFPckNoYW5nZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBsaW5lRGVsdGEgPSBsaW5lRGVsdGFPckNoYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGxpbmVEZWx0YSA9IHR5cGVvZiBsaW5lRGVsdGFPckNoYW5nZS5saW5lRGVsdGEgPT09ICdudW1iZXInID8gbGluZURlbHRhT3JDaGFuZ2UubGluZURlbHRhIDogMDtcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJEZWx0YSA9IHR5cGVvZiBsaW5lRGVsdGFPckNoYW5nZS5jaGFyYWN0ZXJEZWx0YSA9PT0gJ251bWJlcicgPyBsaW5lRGVsdGFPckNoYW5nZS5jaGFyYWN0ZXJEZWx0YSA6IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGluZURlbHRhID09PSAwICYmIGNoYXJhY3RlckRlbHRhID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRoaXMubGluZSArIGxpbmVEZWx0YSwgdGhpcy5jaGFyYWN0ZXIgKyBjaGFyYWN0ZXJEZWx0YSk7XG4gICAgICAgIH1cbiAgICAgICAgd2l0aChsaW5lT3JDaGFuZ2UsIGNoYXJhY3RlciA9IHRoaXMuY2hhcmFjdGVyKSB7XG4gICAgICAgICAgICBpZiAobGluZU9yQ2hhbmdlID09PSBudWxsIHx8IGNoYXJhY3RlciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGxpbmU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbmVPckNoYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBsaW5lID0gdGhpcy5saW5lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIGxpbmVPckNoYW5nZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBsaW5lID0gbGluZU9yQ2hhbmdlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGluZSA9IHR5cGVvZiBsaW5lT3JDaGFuZ2UubGluZSA9PT0gJ251bWJlcicgPyBsaW5lT3JDaGFuZ2UubGluZSA6IHRoaXMubGluZTtcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXIgPSB0eXBlb2YgbGluZU9yQ2hhbmdlLmNoYXJhY3RlciA9PT0gJ251bWJlcicgPyBsaW5lT3JDaGFuZ2UuY2hhcmFjdGVyIDogdGhpcy5jaGFyYWN0ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGluZSA9PT0gdGhpcy5saW5lICYmIGNoYXJhY3RlciA9PT0gdGhpcy5jaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUG9zaXRpb24obGluZSwgY2hhcmFjdGVyKTtcbiAgICAgICAgfVxuICAgICAgICB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4geyBsaW5lOiB0aGlzLmxpbmUsIGNoYXJhY3RlcjogdGhpcy5jaGFyYWN0ZXIgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUG9zaXRpb24gPSBQb3NpdGlvbjtcbiAgICBjbGFzcyBSYW5nZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHN0YXJ0TGluZU9yU3RhcnQsIHN0YXJ0Q29sdW1uT3JFbmQsIGVuZExpbmUsIGVuZENvbHVtbikge1xuICAgICAgICAgICAgbGV0IHN0YXJ0O1xuICAgICAgICAgICAgbGV0IGVuZDtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhcnRMaW5lT3JTdGFydCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHN0YXJ0Q29sdW1uT3JFbmQgPT09ICdudW1iZXInICYmIHR5cGVvZiBlbmRMaW5lID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgZW5kQ29sdW1uID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHN0YXJ0ID0gbmV3IFBvc2l0aW9uKHN0YXJ0TGluZU9yU3RhcnQsIHN0YXJ0Q29sdW1uT3JFbmQpO1xuICAgICAgICAgICAgICAgIGVuZCA9IG5ldyBQb3NpdGlvbihlbmRMaW5lLCBlbmRDb2x1bW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc3RhcnRMaW5lT3JTdGFydCBpbnN0YW5jZW9mIFBvc2l0aW9uICYmIHN0YXJ0Q29sdW1uT3JFbmQgaW5zdGFuY2VvZiBQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIHN0YXJ0ID0gc3RhcnRMaW5lT3JTdGFydDtcbiAgICAgICAgICAgICAgICBlbmQgPSBzdGFydENvbHVtbk9yRW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdGFydCB8fCAhZW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50cycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0YXJ0LmlzQmVmb3JlKGVuZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMuX2VuZCA9IGVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0ID0gZW5kO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VuZCA9IHN0YXJ0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpc1JhbmdlKHRoaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpbmcgaW5zdGFuY2VvZiBSYW5nZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBQb3NpdGlvbi5pc1Bvc2l0aW9uKHRoaW5nLnN0YXJ0KVxuICAgICAgICAgICAgICAgICYmIFBvc2l0aW9uLmlzUG9zaXRpb24odGhpbmcuZW5kKTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgc3RhcnQoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RhcnQ7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGVuZCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbmQ7XG4gICAgICAgIH1cbiAgICAgICAgY29udGFpbnMocG9zaXRpb25PclJhbmdlKSB7XG4gICAgICAgICAgICBpZiAocG9zaXRpb25PclJhbmdlIGluc3RhbmNlb2YgUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb250YWlucyhwb3NpdGlvbk9yUmFuZ2UuX3N0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAmJiB0aGlzLmNvbnRhaW5zKHBvc2l0aW9uT3JSYW5nZS5fZW5kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHBvc2l0aW9uT3JSYW5nZSBpbnN0YW5jZW9mIFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uT3JSYW5nZS5pc0JlZm9yZSh0aGlzLl9zdGFydCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fZW5kLmlzQmVmb3JlKHBvc2l0aW9uT3JSYW5nZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpc0VxdWFsKG90aGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RhcnQuaXNFcXVhbChvdGhlci5fc3RhcnQpICYmIHRoaXMuX2VuZC5pc0VxdWFsKG90aGVyLl9lbmQpO1xuICAgICAgICB9XG4gICAgICAgIGludGVyc2VjdGlvbihvdGhlcikge1xuICAgICAgICAgICAgbGV0IHN0YXJ0ID0gUG9zaXRpb24uTWF4KG90aGVyLnN0YXJ0LCB0aGlzLl9zdGFydCk7XG4gICAgICAgICAgICBsZXQgZW5kID0gUG9zaXRpb24uTWluKG90aGVyLmVuZCwgdGhpcy5fZW5kKTtcbiAgICAgICAgICAgIGlmIChzdGFydC5pc0FmdGVyKGVuZCkpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGhhcHBlbnMgd2hlbiB0aGVyZSBpcyBubyBvdmVybGFwOlxuICAgICAgICAgICAgICAgIC8vIHwtLS0tLXxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICB8LS0tLXxcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgfVxuICAgICAgICB1bmlvbihvdGhlcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbnMob3RoZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChvdGhlci5jb250YWlucyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvdGhlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBzdGFydCA9IFBvc2l0aW9uLk1pbihvdGhlci5zdGFydCwgdGhpcy5fc3RhcnQpO1xuICAgICAgICAgICAgbGV0IGVuZCA9IFBvc2l0aW9uLk1heChvdGhlci5lbmQsIHRoaXMuZW5kKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGlzRW1wdHkoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RhcnQuaXNFcXVhbCh0aGlzLl9lbmQpO1xuICAgICAgICB9XG4gICAgICAgIGdldCBpc1NpbmdsZUxpbmUoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RhcnQubGluZSA9PT0gdGhpcy5fZW5kLmxpbmU7XG4gICAgICAgIH1cbiAgICAgICAgd2l0aChzdGFydE9yQ2hhbmdlLCBlbmQgPSB0aGlzLmVuZCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0T3JDaGFuZ2UgPT09IG51bGwgfHwgZW5kID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgc3RhcnQ7XG4gICAgICAgICAgICBpZiAoIXN0YXJ0T3JDaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICBzdGFydCA9IHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChQb3NpdGlvbi5pc1Bvc2l0aW9uKHN0YXJ0T3JDaGFuZ2UpKSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSBzdGFydE9yQ2hhbmdlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSBzdGFydE9yQ2hhbmdlLnN0YXJ0IHx8IHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICAgICAgZW5kID0gc3RhcnRPckNoYW5nZS5lbmQgfHwgdGhpcy5lbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RhcnQuaXNFcXVhbCh0aGlzLl9zdGFydCkgJiYgZW5kLmlzRXF1YWwodGhpcy5lbmQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiBbdGhpcy5zdGFydCwgdGhpcy5lbmRdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5SYW5nZSA9IFJhbmdlO1xuICAgIGNsYXNzIFNlbGVjdGlvbiBleHRlbmRzIFJhbmdlIHtcbiAgICAgICAgY29uc3RydWN0b3IoYW5jaG9yTGluZU9yQW5jaG9yLCBhbmNob3JDb2x1bW5PckFjdGl2ZSwgYWN0aXZlTGluZSwgYWN0aXZlQ29sdW1uKSB7XG4gICAgICAgICAgICBsZXQgYW5jaG9yO1xuICAgICAgICAgICAgbGV0IGFjdGl2ZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYW5jaG9yTGluZU9yQW5jaG9yID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgYW5jaG9yQ29sdW1uT3JBY3RpdmUgPT09ICdudW1iZXInICYmIHR5cGVvZiBhY3RpdmVMaW5lID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgYWN0aXZlQ29sdW1uID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGFuY2hvciA9IG5ldyBQb3NpdGlvbihhbmNob3JMaW5lT3JBbmNob3IsIGFuY2hvckNvbHVtbk9yQWN0aXZlKTtcbiAgICAgICAgICAgICAgICBhY3RpdmUgPSBuZXcgUG9zaXRpb24oYWN0aXZlTGluZSwgYWN0aXZlQ29sdW1uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGFuY2hvckxpbmVPckFuY2hvciBpbnN0YW5jZW9mIFBvc2l0aW9uICYmIGFuY2hvckNvbHVtbk9yQWN0aXZlIGluc3RhbmNlb2YgUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBhbmNob3IgPSBhbmNob3JMaW5lT3JBbmNob3I7XG4gICAgICAgICAgICAgICAgYWN0aXZlID0gYW5jaG9yQ29sdW1uT3JBY3RpdmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWFuY2hvciB8fCAhYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50cycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VwZXIoYW5jaG9yLCBhY3RpdmUpO1xuICAgICAgICAgICAgdGhpcy5fYW5jaG9yID0gYW5jaG9yO1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZlID0gYWN0aXZlO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpc1NlbGVjdGlvbih0aGluZykge1xuICAgICAgICAgICAgaWYgKHRoaW5nIGluc3RhbmNlb2YgU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFJhbmdlLmlzUmFuZ2UodGhpbmcpXG4gICAgICAgICAgICAgICAgJiYgUG9zaXRpb24uaXNQb3NpdGlvbih0aGluZy5hbmNob3IpXG4gICAgICAgICAgICAgICAgJiYgUG9zaXRpb24uaXNQb3NpdGlvbih0aGluZy5hY3RpdmUpXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIHRoaW5nLmlzUmV2ZXJzZWQgPT09ICdib29sZWFuJztcbiAgICAgICAgfVxuICAgICAgICBnZXQgYW5jaG9yKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FuY2hvcjtcbiAgICAgICAgfVxuICAgICAgICBnZXQgYWN0aXZlKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgaXNSZXZlcnNlZCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hbmNob3IgPT09IHRoaXMuX2VuZDtcbiAgICAgICAgfVxuICAgICAgICB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN0YXJ0OiB0aGlzLnN0YXJ0LFxuICAgICAgICAgICAgICAgIGVuZDogdGhpcy5lbmQsXG4gICAgICAgICAgICAgICAgYWN0aXZlOiB0aGlzLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICBhbmNob3I6IHRoaXMuYW5jaG9yXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TZWxlY3Rpb24gPSBTZWxlY3Rpb247XG4gICAgbGV0IEVuZE9mTGluZTtcbiAgICAoZnVuY3Rpb24gKEVuZE9mTGluZSkge1xuICAgICAgICBFbmRPZkxpbmVbRW5kT2ZMaW5lW1wiTEZcIl0gPSAxXSA9IFwiTEZcIjtcbiAgICAgICAgRW5kT2ZMaW5lW0VuZE9mTGluZVtcIkNSTEZcIl0gPSAyXSA9IFwiQ1JMRlwiO1xuICAgIH0pKEVuZE9mTGluZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5FbmRPZkxpbmUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5FbmRPZkxpbmUgPSB7fSkpO1xuICAgIGNsYXNzIFRleHRFZGl0IHtcbiAgICAgICAgY29uc3RydWN0b3IocmFuZ2UsIG5ld1RleHQpIHtcbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICAgIHRoaXMubmV3VGV4dCA9IG5ld1RleHQ7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGlzVGV4dEVkaXQodGhpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGluZyBpbnN0YW5jZW9mIFRleHRFZGl0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFJhbmdlLmlzUmFuZ2UodGhpbmcpXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIHRoaW5nLm5ld1RleHQgPT09ICdzdHJpbmcnO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyByZXBsYWNlKHJhbmdlLCBuZXdUZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRleHRFZGl0KHJhbmdlLCBuZXdUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgaW5zZXJ0KHBvc2l0aW9uLCBuZXdUZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gVGV4dEVkaXQucmVwbGFjZShuZXcgUmFuZ2UocG9zaXRpb24sIHBvc2l0aW9uKSwgbmV3VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGRlbGV0ZShyYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuIFRleHRFZGl0LnJlcGxhY2UocmFuZ2UsICcnKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgc2V0RW5kT2ZMaW5lKGVvbCkge1xuICAgICAgICAgICAgbGV0IHJldCA9IG5ldyBUZXh0RWRpdCh1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXQubmV3RW9sID0gZW9sO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgICAgICBnZXQgcmFuZ2UoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHJhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgIVJhbmdlLmlzUmFuZ2UodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdyYW5nZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fcmFuZ2UgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgbmV3VGV4dCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uZXdUZXh0IHx8ICcnO1xuICAgICAgICB9XG4gICAgICAgIHNldCBuZXdUZXh0KHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbmV3VGV4dCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbmV3VGV4dCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBuZXdFb2woKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbmV3RW9sO1xuICAgICAgICB9XG4gICAgICAgIHNldCBuZXdFb2wodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCduZXdFb2wnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX25ld0VvbCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmFuZ2U6IHRoaXMucmFuZ2UsXG4gICAgICAgICAgICAgICAgbmV3VGV4dDogdGhpcy5uZXdUZXh0LFxuICAgICAgICAgICAgICAgIG5ld0VvbDogdGhpcy5fbmV3RW9sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdCA9IFRleHRFZGl0O1xuICAgIGNsYXNzIFdvcmtzcGFjZUVkaXQge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHRoaXMuX3NlcVBvb2wgPSAwO1xuICAgICAgICAgICAgdGhpcy5fcmVzb3VyY2VFZGl0cyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5fdGV4dEVkaXRzID0gbmV3IE1hcCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNyZWF0ZVJlc291cmNlKHVyaTogdnNjb2RlLlVyaSk6IHZvaWQge1xuICAgICAgICAvLyBcdHRoaXMucmVuYW1lUmVzb3VyY2UodW5kZWZpbmVkLCB1cmkpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIGRlbGV0ZVJlc291cmNlKHVyaTogdnNjb2RlLlVyaSk6IHZvaWQge1xuICAgICAgICAvLyBcdHRoaXMucmVuYW1lUmVzb3VyY2UodXJpLCB1bmRlZmluZWQpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIHJlbmFtZVJlc291cmNlKGZyb206IHZzY29kZS5VcmksIHRvOiB2c2NvZGUuVXJpKTogdm9pZCB7XG4gICAgICAgIC8vIFx0dGhpcy5fcmVzb3VyY2VFZGl0cy5wdXNoKHsgc2VxOiB0aGlzLl9zZXFQb29sKyssIGZyb20sIHRvIH0pO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIHJlc291cmNlRWRpdHMoKTogW3ZzY29kZS5VcmksIHZzY29kZS5VcmldW10ge1xuICAgICAgICAvLyBcdHJldHVybiB0aGlzLl9yZXNvdXJjZUVkaXRzLm1hcCgoeyBmcm9tLCB0byB9KSA9PiAoPFt2c2NvZGUuVXJpLCB2c2NvZGUuVXJpXT5bZnJvbSwgdG9dKSk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgY3JlYXRlRmlsZSh1cmksIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZUZpbGUodXJpLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZW5hbWVGaWxlKG9sZFVyaSwgbmV3VXJpLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXBsYWNlKHVyaSwgcmFuZ2UsIG5ld1RleHQpIHtcbiAgICAgICAgICAgIGxldCBlZGl0ID0gbmV3IFRleHRFZGl0KHJhbmdlLCBuZXdUZXh0KTtcbiAgICAgICAgICAgIGxldCBhcnJheSA9IHRoaXMuZ2V0KHVyaSk7XG4gICAgICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICAgICAgICBhcnJheS5wdXNoKGVkaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJyYXkgPSBbZWRpdF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNldCh1cmksIGFycmF5KTtcbiAgICAgICAgfVxuICAgICAgICBpbnNlcnQocmVzb3VyY2UsIHBvc2l0aW9uLCBuZXdUZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnJlcGxhY2UocmVzb3VyY2UsIG5ldyBSYW5nZShwb3NpdGlvbiwgcG9zaXRpb24pLCBuZXdUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUocmVzb3VyY2UsIHJhbmdlKSB7XG4gICAgICAgICAgICB0aGlzLnJlcGxhY2UocmVzb3VyY2UsIHJhbmdlLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgaGFzKHVyaSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RleHRFZGl0cy5oYXModXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG4gICAgICAgIHNldCh1cmksIGVkaXRzKSB7XG4gICAgICAgICAgICBsZXQgZGF0YSA9IHRoaXMuX3RleHRFZGl0cy5nZXQodXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHsgc2VxOiB0aGlzLl9zZXFQb29sKyssIHVyaSwgZWRpdHM6IFtdIH07XG4gICAgICAgICAgICAgICAgdGhpcy5fdGV4dEVkaXRzLnNldCh1cmkudG9TdHJpbmcoKSwgZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWVkaXRzKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5lZGl0cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEuZWRpdHMgPSBlZGl0cy5zbGljZSgwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBnZXQodXJpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX3RleHRFZGl0cy5oYXModXJpLnRvU3RyaW5nKCkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHsgZWRpdHMgfSA9IHRoaXMuX3RleHRFZGl0cy5nZXQodXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgcmV0dXJuIGVkaXRzID8gZWRpdHMuc2xpY2UoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBlbnRyaWVzKCkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gW107XG4gICAgICAgICAgICB0aGlzLl90ZXh0RWRpdHMuZm9yRWFjaCh2YWx1ZSA9PiByZXMucHVzaChbdmFsdWUudXJpLCB2YWx1ZS5lZGl0c10pKTtcbiAgICAgICAgICAgIHJldHVybiByZXMuc2xpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBhbGxFbnRyaWVzKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW50cmllcygpO1xuICAgICAgICAgICAgLy8gXHQvLyB1c2UgdGhlICdzZXEnIHRoZSB3ZSBoYXZlIGFzc2lnbmVkIHdoZW4gaW5zZXJ0aW5nXG4gICAgICAgICAgICAvLyBcdC8vIHRoZSBvcGVyYXRpb24gYW5kIHVzZSB0aGF0IG9yZGVyIGluIHRoZSByZXN1bHRpbmdcbiAgICAgICAgICAgIC8vIFx0Ly8gYXJyYXlcbiAgICAgICAgICAgIC8vIFx0Y29uc3QgcmVzOiAoW3ZzY1VyaS5VUkksIFRleHRFZGl0W11dIHwgW3ZzY1VyaS5VUkksdnNjVXJpLlVSSV0pW10gPSBbXTtcbiAgICAgICAgICAgIC8vIFx0dGhpcy5fdGV4dEVkaXRzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICAgICAgLy8gXHRcdGNvbnN0IHsgc2VxLCB1cmksIGVkaXRzIH0gPSB2YWx1ZTtcbiAgICAgICAgICAgIC8vIFx0XHRyZXNbc2VxXSA9IFt1cmksIGVkaXRzXTtcbiAgICAgICAgICAgIC8vIFx0fSk7XG4gICAgICAgICAgICAvLyBcdHRoaXMuX3Jlc291cmNlRWRpdHMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAvLyBcdFx0Y29uc3QgeyBzZXEsIGZyb20sIHRvIH0gPSB2YWx1ZTtcbiAgICAgICAgICAgIC8vIFx0XHRyZXNbc2VxXSA9IFtmcm9tLCB0b107XG4gICAgICAgICAgICAvLyBcdH0pO1xuICAgICAgICAgICAgLy8gXHRyZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGdldCBzaXplKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RleHRFZGl0cy5zaXplICsgdGhpcy5fcmVzb3VyY2VFZGl0cy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW50cmllcygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Xb3Jrc3BhY2VFZGl0ID0gV29ya3NwYWNlRWRpdDtcbiAgICBjbGFzcyBTbmlwcGV0U3RyaW5nIHtcbiAgICAgICAgY29uc3RydWN0b3IodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3RhYnN0b3AgPSAxO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlIHx8ICcnO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpc1NuaXBwZXRTdHJpbmcodGhpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGluZyBpbnN0YW5jZW9mIFNuaXBwZXRTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoaW5nLnZhbHVlID09PSAnc3RyaW5nJztcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgX2VzY2FwZSh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcJHx9fFxcXFwvZywgJ1xcXFwkJicpO1xuICAgICAgICB9XG4gICAgICAgIGFwcGVuZFRleHQoc3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IFNuaXBwZXRTdHJpbmcuX2VzY2FwZShzdHJpbmcpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kVGFic3RvcChudW1iZXIgPSB0aGlzLl90YWJzdG9wKyspIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJyQnO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBudW1iZXI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRQbGFjZWhvbGRlcih2YWx1ZSwgbnVtYmVyID0gdGhpcy5fdGFic3RvcCsrKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmVzdGVkID0gbmV3IFNuaXBwZXRTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBuZXN0ZWQuX3RhYnN0b3AgPSB0aGlzLl90YWJzdG9wO1xuICAgICAgICAgICAgICAgIHZhbHVlKG5lc3RlZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFic3RvcCA9IG5lc3RlZC5fdGFic3RvcDtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG5lc3RlZC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gU25pcHBldFN0cmluZy5fZXNjYXBlKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJyR7JztcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gbnVtYmVyO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnOic7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnfSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRWYXJpYWJsZShuYW1lLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmVzdGVkID0gbmV3IFNuaXBwZXRTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBuZXN0ZWQuX3RhYnN0b3AgPSB0aGlzLl90YWJzdG9wO1xuICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZShuZXN0ZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhYnN0b3AgPSBuZXN0ZWQuX3RhYnN0b3A7XG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gbmVzdGVkLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRlZmF1bHRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWUucmVwbGFjZSgvXFwkfH0vZywgJ1xcXFwkJicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnJHsnO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBuYW1lO1xuICAgICAgICAgICAgaWYgKGRlZmF1bHRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJzonO1xuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gZGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnfSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU25pcHBldFN0cmluZyA9IFNuaXBwZXRTdHJpbmc7XG4gICAgbGV0IERpYWdub3N0aWNUYWc7XG4gICAgKGZ1bmN0aW9uIChEaWFnbm9zdGljVGFnKSB7XG4gICAgICAgIERpYWdub3N0aWNUYWdbRGlhZ25vc3RpY1RhZ1tcIlVubmVjZXNzYXJ5XCJdID0gMV0gPSBcIlVubmVjZXNzYXJ5XCI7XG4gICAgfSkoRGlhZ25vc3RpY1RhZyA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljVGFnIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRGlhZ25vc3RpY1RhZyA9IHt9KSk7XG4gICAgbGV0IERpYWdub3N0aWNTZXZlcml0eTtcbiAgICAoZnVuY3Rpb24gKERpYWdub3N0aWNTZXZlcml0eSkge1xuICAgICAgICBEaWFnbm9zdGljU2V2ZXJpdHlbRGlhZ25vc3RpY1NldmVyaXR5W1wiSGludFwiXSA9IDNdID0gXCJIaW50XCI7XG4gICAgICAgIERpYWdub3N0aWNTZXZlcml0eVtEaWFnbm9zdGljU2V2ZXJpdHlbXCJJbmZvcm1hdGlvblwiXSA9IDJdID0gXCJJbmZvcm1hdGlvblwiO1xuICAgICAgICBEaWFnbm9zdGljU2V2ZXJpdHlbRGlhZ25vc3RpY1NldmVyaXR5W1wiV2FybmluZ1wiXSA9IDFdID0gXCJXYXJuaW5nXCI7XG4gICAgICAgIERpYWdub3N0aWNTZXZlcml0eVtEaWFnbm9zdGljU2V2ZXJpdHlbXCJFcnJvclwiXSA9IDBdID0gXCJFcnJvclwiO1xuICAgIH0pKERpYWdub3N0aWNTZXZlcml0eSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljU2V2ZXJpdHkgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljU2V2ZXJpdHkgPSB7fSkpO1xuICAgIGNsYXNzIExvY2F0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IodXJpLCByYW5nZU9yUG9zaXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMudXJpID0gdXJpO1xuICAgICAgICAgICAgaWYgKCFyYW5nZU9yUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAvL3RoYXQncyBPS1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocmFuZ2VPclBvc2l0aW9uIGluc3RhbmNlb2YgUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2VPclBvc2l0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocmFuZ2VPclBvc2l0aW9uIGluc3RhbmNlb2YgUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmdlID0gbmV3IFJhbmdlKHJhbmdlT3JQb3NpdGlvbiwgcmFuZ2VPclBvc2l0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCBhcmd1bWVudCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpc0xvY2F0aW9uKHRoaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpbmcgaW5zdGFuY2VvZiBMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBSYW5nZS5pc1JhbmdlKHRoaW5nLnJhbmdlKVxuICAgICAgICAgICAgICAgICYmIHVyaV8xLnZzY1VyaS5VUkkuaXNVcmkodGhpbmcudXJpKTtcbiAgICAgICAgfVxuICAgICAgICB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHVyaTogdGhpcy51cmksXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHRoaXMucmFuZ2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkxvY2F0aW9uID0gTG9jYXRpb247XG4gICAgY2xhc3MgRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGxvY2F0aW9uLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB0aGlzLmxvY2F0aW9uID0gbG9jYXRpb247XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpcyh0aGluZykge1xuICAgICAgICAgICAgaWYgKCF0aGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhpbmcubWVzc2FnZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAmJiB0aGluZy5sb2NhdGlvblxuICAgICAgICAgICAgICAgICYmIFJhbmdlLmlzUmFuZ2UodGhpbmcubG9jYXRpb24ucmFuZ2UpXG4gICAgICAgICAgICAgICAgJiYgdXJpXzEudnNjVXJpLlVSSS5pc1VyaSh0aGluZy5sb2NhdGlvbi51cmkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uID0gRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbjtcbiAgICBjbGFzcyBEaWFnbm9zdGljIHtcbiAgICAgICAgY29uc3RydWN0b3IocmFuZ2UsIG1lc3NhZ2UsIHNldmVyaXR5ID0gRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICAgICAgdGhpcy5zZXZlcml0eSA9IHNldmVyaXR5O1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2V2ZXJpdHk6IERpYWdub3N0aWNTZXZlcml0eVt0aGlzLnNldmVyaXR5XSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiB0aGlzLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHRoaXMucmFuZ2UsXG4gICAgICAgICAgICAgICAgc291cmNlOiB0aGlzLnNvdXJjZSxcbiAgICAgICAgICAgICAgICBjb2RlOiB0aGlzLmNvZGUsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljID0gRGlhZ25vc3RpYztcbiAgICBjbGFzcyBIb3ZlciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGNvbnRlbnRzLCByYW5nZSkge1xuICAgICAgICAgICAgaWYgKCFjb250ZW50cykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCBhcmd1bWVudCwgY29udGVudHMgbXVzdCBiZSBkZWZpbmVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb250ZW50cykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRzID0gY29udGVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChodG1sQ29udGVudF8xLnZzY01vY2tIdG1sQ29udGVudC5pc01hcmtkb3duU3RyaW5nKGNvbnRlbnRzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudHMgPSBbY29udGVudHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50cyA9IFtjb250ZW50c107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkhvdmVyID0gSG92ZXI7XG4gICAgbGV0IERvY3VtZW50SGlnaGxpZ2h0S2luZDtcbiAgICAoZnVuY3Rpb24gKERvY3VtZW50SGlnaGxpZ2h0S2luZCkge1xuICAgICAgICBEb2N1bWVudEhpZ2hsaWdodEtpbmRbRG9jdW1lbnRIaWdobGlnaHRLaW5kW1wiVGV4dFwiXSA9IDBdID0gXCJUZXh0XCI7XG4gICAgICAgIERvY3VtZW50SGlnaGxpZ2h0S2luZFtEb2N1bWVudEhpZ2hsaWdodEtpbmRbXCJSZWFkXCJdID0gMV0gPSBcIlJlYWRcIjtcbiAgICAgICAgRG9jdW1lbnRIaWdobGlnaHRLaW5kW0RvY3VtZW50SGlnaGxpZ2h0S2luZFtcIldyaXRlXCJdID0gMl0gPSBcIldyaXRlXCI7XG4gICAgfSkoRG9jdW1lbnRIaWdobGlnaHRLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRvY3VtZW50SGlnaGxpZ2h0S2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRvY3VtZW50SGlnaGxpZ2h0S2luZCA9IHt9KSk7XG4gICAgY2xhc3MgRG9jdW1lbnRIaWdobGlnaHQge1xuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwga2luZCA9IERvY3VtZW50SGlnaGxpZ2h0S2luZC5UZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XG4gICAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmFuZ2U6IHRoaXMucmFuZ2UsXG4gICAgICAgICAgICAgICAga2luZDogRG9jdW1lbnRIaWdobGlnaHRLaW5kW3RoaXMua2luZF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRvY3VtZW50SGlnaGxpZ2h0ID0gRG9jdW1lbnRIaWdobGlnaHQ7XG4gICAgbGV0IFN5bWJvbEtpbmQ7XG4gICAgKGZ1bmN0aW9uIChTeW1ib2xLaW5kKSB7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkZpbGVcIl0gPSAwXSA9IFwiRmlsZVwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJNb2R1bGVcIl0gPSAxXSA9IFwiTW9kdWxlXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk5hbWVzcGFjZVwiXSA9IDJdID0gXCJOYW1lc3BhY2VcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiUGFja2FnZVwiXSA9IDNdID0gXCJQYWNrYWdlXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkNsYXNzXCJdID0gNF0gPSBcIkNsYXNzXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk1ldGhvZFwiXSA9IDVdID0gXCJNZXRob2RcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiUHJvcGVydHlcIl0gPSA2XSA9IFwiUHJvcGVydHlcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRmllbGRcIl0gPSA3XSA9IFwiRmllbGRcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiQ29uc3RydWN0b3JcIl0gPSA4XSA9IFwiQ29uc3RydWN0b3JcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRW51bVwiXSA9IDldID0gXCJFbnVtXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkludGVyZmFjZVwiXSA9IDEwXSA9IFwiSW50ZXJmYWNlXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkZ1bmN0aW9uXCJdID0gMTFdID0gXCJGdW5jdGlvblwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJWYXJpYWJsZVwiXSA9IDEyXSA9IFwiVmFyaWFibGVcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiQ29uc3RhbnRcIl0gPSAxM10gPSBcIkNvbnN0YW50XCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlN0cmluZ1wiXSA9IDE0XSA9IFwiU3RyaW5nXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk51bWJlclwiXSA9IDE1XSA9IFwiTnVtYmVyXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkJvb2xlYW5cIl0gPSAxNl0gPSBcIkJvb2xlYW5cIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiQXJyYXlcIl0gPSAxN10gPSBcIkFycmF5XCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk9iamVjdFwiXSA9IDE4XSA9IFwiT2JqZWN0XCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIktleVwiXSA9IDE5XSA9IFwiS2V5XCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk51bGxcIl0gPSAyMF0gPSBcIk51bGxcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRW51bU1lbWJlclwiXSA9IDIxXSA9IFwiRW51bU1lbWJlclwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJTdHJ1Y3RcIl0gPSAyMl0gPSBcIlN0cnVjdFwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJFdmVudFwiXSA9IDIzXSA9IFwiRXZlbnRcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiT3BlcmF0b3JcIl0gPSAyNF0gPSBcIk9wZXJhdG9yXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlR5cGVQYXJhbWV0ZXJcIl0gPSAyNV0gPSBcIlR5cGVQYXJhbWV0ZXJcIjtcbiAgICB9KShTeW1ib2xLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN5bWJvbEtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TeW1ib2xLaW5kID0ge30pKTtcbiAgICBjbGFzcyBTeW1ib2xJbmZvcm1hdGlvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKG5hbWUsIGtpbmQsIHJhbmdlT3JDb250YWluZXIsIGxvY2F0aW9uT3JVcmksIGNvbnRhaW5lck5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXJOYW1lID0gY29udGFpbmVyTmFtZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmFuZ2VPckNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lck5hbWUgPSByYW5nZU9yQ29udGFpbmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxvY2F0aW9uT3JVcmkgaW5zdGFuY2VvZiBMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMubG9jYXRpb24gPSBsb2NhdGlvbk9yVXJpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocmFuZ2VPckNvbnRhaW5lciBpbnN0YW5jZW9mIFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2NhdGlvbiA9IG5ldyBMb2NhdGlvbihsb2NhdGlvbk9yVXJpLCByYW5nZU9yQ29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kW3RoaXMua2luZF0sXG4gICAgICAgICAgICAgICAgbG9jYXRpb246IHRoaXMubG9jYXRpb24sXG4gICAgICAgICAgICAgICAgY29udGFpbmVyTmFtZTogdGhpcy5jb250YWluZXJOYW1lXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TeW1ib2xJbmZvcm1hdGlvbiA9IFN5bWJvbEluZm9ybWF0aW9uO1xuICAgIGNsYXNzIFN5bWJvbEluZm9ybWF0aW9uMiBleHRlbmRzIFN5bWJvbEluZm9ybWF0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IobmFtZSwga2luZCwgY29udGFpbmVyTmFtZSwgbG9jYXRpb24pIHtcbiAgICAgICAgICAgIHN1cGVyKG5hbWUsIGtpbmQsIGNvbnRhaW5lck5hbWUsIGxvY2F0aW9uKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgIHRoaXMuZGVmaW5pbmdSYW5nZSA9IGxvY2F0aW9uLnJhbmdlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TeW1ib2xJbmZvcm1hdGlvbjIgPSBTeW1ib2xJbmZvcm1hdGlvbjI7XG4gICAgbGV0IENvZGVBY3Rpb25UcmlnZ2VyO1xuICAgIChmdW5jdGlvbiAoQ29kZUFjdGlvblRyaWdnZXIpIHtcbiAgICAgICAgQ29kZUFjdGlvblRyaWdnZXJbQ29kZUFjdGlvblRyaWdnZXJbXCJBdXRvbWF0aWNcIl0gPSAxXSA9IFwiQXV0b21hdGljXCI7XG4gICAgICAgIENvZGVBY3Rpb25UcmlnZ2VyW0NvZGVBY3Rpb25UcmlnZ2VyW1wiTWFudWFsXCJdID0gMl0gPSBcIk1hbnVhbFwiO1xuICAgIH0pKENvZGVBY3Rpb25UcmlnZ2VyID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvZGVBY3Rpb25UcmlnZ2VyIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUFjdGlvblRyaWdnZXIgPSB7fSkpO1xuICAgIGNsYXNzIENvZGVBY3Rpb24ge1xuICAgICAgICBjb25zdHJ1Y3Rvcih0aXRsZSwga2luZCkge1xuICAgICAgICAgICAgdGhpcy50aXRsZSA9IHRpdGxlO1xuICAgICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUFjdGlvbiA9IENvZGVBY3Rpb247XG4gICAgY2xhc3MgQ29kZUFjdGlvbktpbmQge1xuICAgICAgICBjb25zdHJ1Y3Rvcih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFwcGVuZChwYXJ0cykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDb2RlQWN0aW9uS2luZCh0aGlzLnZhbHVlID8gdGhpcy52YWx1ZSArIENvZGVBY3Rpb25LaW5kLnNlcCArIHBhcnRzIDogcGFydHMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRhaW5zKG90aGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZSA9PT0gb3RoZXIudmFsdWUgfHwgc3RyaW5nc18xLnZzY01vY2tTdHJpbmdzLnN0YXJ0c1dpdGgob3RoZXIudmFsdWUsIHRoaXMudmFsdWUgKyBDb2RlQWN0aW9uS2luZC5zZXApO1xuICAgICAgICB9XG4gICAgfVxuICAgIENvZGVBY3Rpb25LaW5kLnNlcCA9ICcuJztcbiAgICBDb2RlQWN0aW9uS2luZC5FbXB0eSA9IG5ldyBDb2RlQWN0aW9uS2luZCgnJyk7XG4gICAgQ29kZUFjdGlvbktpbmQuUXVpY2tGaXggPSBDb2RlQWN0aW9uS2luZC5FbXB0eS5hcHBlbmQoJ3F1aWNrZml4Jyk7XG4gICAgQ29kZUFjdGlvbktpbmQuUmVmYWN0b3IgPSBDb2RlQWN0aW9uS2luZC5FbXB0eS5hcHBlbmQoJ3JlZmFjdG9yJyk7XG4gICAgQ29kZUFjdGlvbktpbmQuUmVmYWN0b3JFeHRyYWN0ID0gQ29kZUFjdGlvbktpbmQuUmVmYWN0b3IuYXBwZW5kKCdleHRyYWN0Jyk7XG4gICAgQ29kZUFjdGlvbktpbmQuUmVmYWN0b3JJbmxpbmUgPSBDb2RlQWN0aW9uS2luZC5SZWZhY3Rvci5hcHBlbmQoJ2lubGluZScpO1xuICAgIENvZGVBY3Rpb25LaW5kLlJlZmFjdG9yUmV3cml0ZSA9IENvZGVBY3Rpb25LaW5kLlJlZmFjdG9yLmFwcGVuZCgncmV3cml0ZScpO1xuICAgIENvZGVBY3Rpb25LaW5kLlNvdXJjZSA9IENvZGVBY3Rpb25LaW5kLkVtcHR5LmFwcGVuZCgnc291cmNlJyk7XG4gICAgQ29kZUFjdGlvbktpbmQuU291cmNlT3JnYW5pemVJbXBvcnRzID0gQ29kZUFjdGlvbktpbmQuU291cmNlLmFwcGVuZCgnb3JnYW5pemVJbXBvcnRzJyk7XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvZGVBY3Rpb25LaW5kID0gQ29kZUFjdGlvbktpbmQ7XG4gICAgY2xhc3MgQ29kZUxlbnMge1xuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgY29tbWFuZCkge1xuICAgICAgICAgICAgdGhpcy5yYW5nZSA9IHJhbmdlO1xuICAgICAgICAgICAgdGhpcy5jb21tYW5kID0gY29tbWFuZDtcbiAgICAgICAgfVxuICAgICAgICBnZXQgaXNSZXNvbHZlZCgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuY29tbWFuZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUxlbnMgPSBDb2RlTGVucztcbiAgICBjbGFzcyBNYXJrZG93blN0cmluZyB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWUgfHwgJyc7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kVGV4dCh2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZXNjYXBlIG1hcmtkb3duIHN5bnRheCB0b2tlbnM6IGh0dHA6Ly9kYXJpbmdmaXJlYmFsbC5uZXQvcHJvamVjdHMvbWFya2Rvd24vc3ludGF4I2JhY2tzbGFzaFxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSB2YWx1ZS5yZXBsYWNlKC9bXFxcXGAqX3t9W1xcXSgpIytcXC0uIV0vZywgJ1xcXFwkJicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kTWFya2Rvd24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRDb2RlYmxvY2soY29kZSwgbGFuZ3VhZ2UgPSAnJykge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnXFxuYGBgJztcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gbGFuZ3VhZ2U7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICdcXG4nO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBjb2RlO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnXFxuYGBgXFxuJztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5NYXJrZG93blN0cmluZyA9IE1hcmtkb3duU3RyaW5nO1xuICAgIGNsYXNzIFBhcmFtZXRlckluZm9ybWF0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IobGFiZWwsIGRvY3VtZW50YXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMubGFiZWwgPSBsYWJlbDtcbiAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRhdGlvbiA9IGRvY3VtZW50YXRpb247XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlBhcmFtZXRlckluZm9ybWF0aW9uID0gUGFyYW1ldGVySW5mb3JtYXRpb247XG4gICAgY2xhc3MgU2lnbmF0dXJlSW5mb3JtYXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihsYWJlbCwgZG9jdW1lbnRhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICAgICAgICAgICAgdGhpcy5kb2N1bWVudGF0aW9uID0gZG9jdW1lbnRhdGlvbjtcbiAgICAgICAgICAgIHRoaXMucGFyYW1ldGVycyA9IFtdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TaWduYXR1cmVJbmZvcm1hdGlvbiA9IFNpZ25hdHVyZUluZm9ybWF0aW9uO1xuICAgIGNsYXNzIFNpZ25hdHVyZUhlbHAge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHRoaXMuc2lnbmF0dXJlcyA9IFtdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TaWduYXR1cmVIZWxwID0gU2lnbmF0dXJlSGVscDtcbiAgICBsZXQgQ29tcGxldGlvblRyaWdnZXJLaW5kO1xuICAgIChmdW5jdGlvbiAoQ29tcGxldGlvblRyaWdnZXJLaW5kKSB7XG4gICAgICAgIENvbXBsZXRpb25UcmlnZ2VyS2luZFtDb21wbGV0aW9uVHJpZ2dlcktpbmRbXCJJbnZva2VcIl0gPSAwXSA9IFwiSW52b2tlXCI7XG4gICAgICAgIENvbXBsZXRpb25UcmlnZ2VyS2luZFtDb21wbGV0aW9uVHJpZ2dlcktpbmRbXCJUcmlnZ2VyQ2hhcmFjdGVyXCJdID0gMV0gPSBcIlRyaWdnZXJDaGFyYWN0ZXJcIjtcbiAgICAgICAgQ29tcGxldGlvblRyaWdnZXJLaW5kW0NvbXBsZXRpb25UcmlnZ2VyS2luZFtcIlRyaWdnZXJGb3JJbmNvbXBsZXRlQ29tcGxldGlvbnNcIl0gPSAyXSA9IFwiVHJpZ2dlckZvckluY29tcGxldGVDb21wbGV0aW9uc1wiO1xuICAgIH0pKENvbXBsZXRpb25UcmlnZ2VyS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uVHJpZ2dlcktpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uVHJpZ2dlcktpbmQgPSB7fSkpO1xuICAgIGxldCBDb21wbGV0aW9uSXRlbUtpbmQ7XG4gICAgKGZ1bmN0aW9uIChDb21wbGV0aW9uSXRlbUtpbmQpIHtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlRleHRcIl0gPSAwXSA9IFwiVGV4dFwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiTWV0aG9kXCJdID0gMV0gPSBcIk1ldGhvZFwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiRnVuY3Rpb25cIl0gPSAyXSA9IFwiRnVuY3Rpb25cIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkNvbnN0cnVjdG9yXCJdID0gM10gPSBcIkNvbnN0cnVjdG9yXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJGaWVsZFwiXSA9IDRdID0gXCJGaWVsZFwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVmFyaWFibGVcIl0gPSA1XSA9IFwiVmFyaWFibGVcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkNsYXNzXCJdID0gNl0gPSBcIkNsYXNzXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJJbnRlcmZhY2VcIl0gPSA3XSA9IFwiSW50ZXJmYWNlXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJNb2R1bGVcIl0gPSA4XSA9IFwiTW9kdWxlXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJQcm9wZXJ0eVwiXSA9IDldID0gXCJQcm9wZXJ0eVwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVW5pdFwiXSA9IDEwXSA9IFwiVW5pdFwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVmFsdWVcIl0gPSAxMV0gPSBcIlZhbHVlXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJFbnVtXCJdID0gMTJdID0gXCJFbnVtXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJLZXl3b3JkXCJdID0gMTNdID0gXCJLZXl3b3JkXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJTbmlwcGV0XCJdID0gMTRdID0gXCJTbmlwcGV0XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJDb2xvclwiXSA9IDE1XSA9IFwiQ29sb3JcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkZpbGVcIl0gPSAxNl0gPSBcIkZpbGVcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlJlZmVyZW5jZVwiXSA9IDE3XSA9IFwiUmVmZXJlbmNlXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJGb2xkZXJcIl0gPSAxOF0gPSBcIkZvbGRlclwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiRW51bU1lbWJlclwiXSA9IDE5XSA9IFwiRW51bU1lbWJlclwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiQ29uc3RhbnRcIl0gPSAyMF0gPSBcIkNvbnN0YW50XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJTdHJ1Y3RcIl0gPSAyMV0gPSBcIlN0cnVjdFwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiRXZlbnRcIl0gPSAyMl0gPSBcIkV2ZW50XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJPcGVyYXRvclwiXSA9IDIzXSA9IFwiT3BlcmF0b3JcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlR5cGVQYXJhbWV0ZXJcIl0gPSAyNF0gPSBcIlR5cGVQYXJhbWV0ZXJcIjtcbiAgICB9KShDb21wbGV0aW9uSXRlbUtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29tcGxldGlvbkl0ZW1LaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29tcGxldGlvbkl0ZW1LaW5kID0ge30pKTtcbiAgICBjbGFzcyBDb21wbGV0aW9uSXRlbSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGxhYmVsLCBraW5kKSB7XG4gICAgICAgICAgICB0aGlzLmxhYmVsID0gbGFiZWw7XG4gICAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbGFiZWw6IHRoaXMubGFiZWwsXG4gICAgICAgICAgICAgICAga2luZDogQ29tcGxldGlvbkl0ZW1LaW5kW3RoaXMua2luZF0sXG4gICAgICAgICAgICAgICAgZGV0YWlsOiB0aGlzLmRldGFpbCxcbiAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiB0aGlzLmRvY3VtZW50YXRpb24sXG4gICAgICAgICAgICAgICAgc29ydFRleHQ6IHRoaXMuc29ydFRleHQsXG4gICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogdGhpcy5maWx0ZXJUZXh0LFxuICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IHRoaXMuaW5zZXJ0VGV4dCxcbiAgICAgICAgICAgICAgICB0ZXh0RWRpdDogdGhpcy50ZXh0RWRpdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29tcGxldGlvbkl0ZW0gPSBDb21wbGV0aW9uSXRlbTtcbiAgICBjbGFzcyBDb21wbGV0aW9uTGlzdCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGl0ZW1zID0gW10sIGlzSW5jb21wbGV0ZSA9IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXM7XG4gICAgICAgICAgICB0aGlzLmlzSW5jb21wbGV0ZSA9IGlzSW5jb21wbGV0ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29tcGxldGlvbkxpc3QgPSBDb21wbGV0aW9uTGlzdDtcbiAgICBsZXQgVmlld0NvbHVtbjtcbiAgICAoZnVuY3Rpb24gKFZpZXdDb2x1bW4pIHtcbiAgICAgICAgVmlld0NvbHVtbltWaWV3Q29sdW1uW1wiQWN0aXZlXCJdID0gLTFdID0gXCJBY3RpdmVcIjtcbiAgICAgICAgVmlld0NvbHVtbltWaWV3Q29sdW1uW1wiT25lXCJdID0gMV0gPSBcIk9uZVwiO1xuICAgICAgICBWaWV3Q29sdW1uW1ZpZXdDb2x1bW5bXCJUd29cIl0gPSAyXSA9IFwiVHdvXCI7XG4gICAgICAgIFZpZXdDb2x1bW5bVmlld0NvbHVtbltcIlRocmVlXCJdID0gM10gPSBcIlRocmVlXCI7XG4gICAgfSkoVmlld0NvbHVtbiA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5WaWV3Q29sdW1uIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVmlld0NvbHVtbiA9IHt9KSk7XG4gICAgbGV0IFN0YXR1c0JhckFsaWdubWVudDtcbiAgICAoZnVuY3Rpb24gKFN0YXR1c0JhckFsaWdubWVudCkge1xuICAgICAgICBTdGF0dXNCYXJBbGlnbm1lbnRbU3RhdHVzQmFyQWxpZ25tZW50W1wiTGVmdFwiXSA9IDFdID0gXCJMZWZ0XCI7XG4gICAgICAgIFN0YXR1c0JhckFsaWdubWVudFtTdGF0dXNCYXJBbGlnbm1lbnRbXCJSaWdodFwiXSA9IDJdID0gXCJSaWdodFwiO1xuICAgIH0pKFN0YXR1c0JhckFsaWdubWVudCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TdGF0dXNCYXJBbGlnbm1lbnQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TdGF0dXNCYXJBbGlnbm1lbnQgPSB7fSkpO1xuICAgIGxldCBUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZTtcbiAgICAoZnVuY3Rpb24gKFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlKSB7XG4gICAgICAgIFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1RleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1wiT2ZmXCJdID0gMF0gPSBcIk9mZlwiO1xuICAgICAgICBUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZVtUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZVtcIk9uXCJdID0gMV0gPSBcIk9uXCI7XG4gICAgICAgIFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1RleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1wiUmVsYXRpdmVcIl0gPSAyXSA9IFwiUmVsYXRpdmVcIjtcbiAgICB9KShUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlID0ge30pKTtcbiAgICBsZXQgVGV4dERvY3VtZW50U2F2ZVJlYXNvbjtcbiAgICAoZnVuY3Rpb24gKFRleHREb2N1bWVudFNhdmVSZWFzb24pIHtcbiAgICAgICAgVGV4dERvY3VtZW50U2F2ZVJlYXNvbltUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1wiTWFudWFsXCJdID0gMV0gPSBcIk1hbnVhbFwiO1xuICAgICAgICBUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1RleHREb2N1bWVudFNhdmVSZWFzb25bXCJBZnRlckRlbGF5XCJdID0gMl0gPSBcIkFmdGVyRGVsYXlcIjtcbiAgICAgICAgVGV4dERvY3VtZW50U2F2ZVJlYXNvbltUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1wiRm9jdXNPdXRcIl0gPSAzXSA9IFwiRm9jdXNPdXRcIjtcbiAgICB9KShUZXh0RG9jdW1lbnRTYXZlUmVhc29uID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHREb2N1bWVudFNhdmVSZWFzb24gfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RG9jdW1lbnRTYXZlUmVhc29uID0ge30pKTtcbiAgICBsZXQgVGV4dEVkaXRvclJldmVhbFR5cGU7XG4gICAgKGZ1bmN0aW9uIChUZXh0RWRpdG9yUmV2ZWFsVHlwZSkge1xuICAgICAgICBUZXh0RWRpdG9yUmV2ZWFsVHlwZVtUZXh0RWRpdG9yUmV2ZWFsVHlwZVtcIkRlZmF1bHRcIl0gPSAwXSA9IFwiRGVmYXVsdFwiO1xuICAgICAgICBUZXh0RWRpdG9yUmV2ZWFsVHlwZVtUZXh0RWRpdG9yUmV2ZWFsVHlwZVtcIkluQ2VudGVyXCJdID0gMV0gPSBcIkluQ2VudGVyXCI7XG4gICAgICAgIFRleHRFZGl0b3JSZXZlYWxUeXBlW1RleHRFZGl0b3JSZXZlYWxUeXBlW1wiSW5DZW50ZXJJZk91dHNpZGVWaWV3cG9ydFwiXSA9IDJdID0gXCJJbkNlbnRlcklmT3V0c2lkZVZpZXdwb3J0XCI7XG4gICAgICAgIFRleHRFZGl0b3JSZXZlYWxUeXBlW1RleHRFZGl0b3JSZXZlYWxUeXBlW1wiQXRUb3BcIl0gPSAzXSA9IFwiQXRUb3BcIjtcbiAgICB9KShUZXh0RWRpdG9yUmV2ZWFsVHlwZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yUmV2ZWFsVHlwZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JSZXZlYWxUeXBlID0ge30pKTtcbiAgICBsZXQgVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQ7XG4gICAgKGZ1bmN0aW9uIChUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCkge1xuICAgICAgICBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZFtUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZFtcIktleWJvYXJkXCJdID0gMV0gPSBcIktleWJvYXJkXCI7XG4gICAgICAgIFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kW1RleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kW1wiTW91c2VcIl0gPSAyXSA9IFwiTW91c2VcIjtcbiAgICAgICAgVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmRbVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmRbXCJDb21tYW5kXCJdID0gM10gPSBcIkNvbW1hbmRcIjtcbiAgICB9KShUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kID0ge30pKTtcbiAgICAvKipcbiAgICAgKiBUaGVzZSB2YWx1ZXMgbWF0Y2ggdmVyeSBjYXJlZnVsbHkgdGhlIHZhbHVlcyBvZiBgVHJhY2tlZFJhbmdlU3RpY2tpbmVzc2BcbiAgICAgKi9cbiAgICBsZXQgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3I7XG4gICAgKGZ1bmN0aW9uIChEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogVHJhY2tlZFJhbmdlU3RpY2tpbmVzcy5BbHdheXNHcm93c1doZW5UeXBpbmdBdEVkZ2VzXG4gICAgICAgICAqL1xuICAgICAgICBEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcltEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcltcIk9wZW5PcGVuXCJdID0gMF0gPSBcIk9wZW5PcGVuXCI7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmFja2VkUmFuZ2VTdGlja2luZXNzLk5ldmVyR3Jvd3NXaGVuVHlwaW5nQXRFZGdlc1xuICAgICAgICAgKi9cbiAgICAgICAgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbXCJDbG9zZWRDbG9zZWRcIl0gPSAxXSA9IFwiQ2xvc2VkQ2xvc2VkXCI7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmFja2VkUmFuZ2VTdGlja2luZXNzLkdyb3dzT25seVdoZW5UeXBpbmdCZWZvcmVcbiAgICAgICAgICovXG4gICAgICAgIERlY29yYXRpb25SYW5nZUJlaGF2aW9yW0RlY29yYXRpb25SYW5nZUJlaGF2aW9yW1wiT3BlbkNsb3NlZFwiXSA9IDJdID0gXCJPcGVuQ2xvc2VkXCI7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmFja2VkUmFuZ2VTdGlja2luZXNzLkdyb3dzT25seVdoZW5UeXBpbmdBZnRlclxuICAgICAgICAgKi9cbiAgICAgICAgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbXCJDbG9zZWRPcGVuXCJdID0gM10gPSBcIkNsb3NlZE9wZW5cIjtcbiAgICB9KShEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvciA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EZWNvcmF0aW9uUmFuZ2VCZWhhdmlvciB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRlY29yYXRpb25SYW5nZUJlaGF2aW9yID0ge30pKTtcbiAgICAoZnVuY3Rpb24gKFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kKSB7XG4gICAgICAgIGZ1bmN0aW9uIGZyb21WYWx1ZShzKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHMpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdrZXlib2FyZCc6IHJldHVybiBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZC5LZXlib2FyZDtcbiAgICAgICAgICAgICAgICBjYXNlICdtb3VzZSc6IHJldHVybiBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZC5Nb3VzZTtcbiAgICAgICAgICAgICAgICBjYXNlICdhcGknOiByZXR1cm4gVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQuQ29tbWFuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQuZnJvbVZhbHVlID0gZnJvbVZhbHVlO1xuICAgIH0pKFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQgPSB7fSkpO1xuICAgIGNsYXNzIERvY3VtZW50TGluayB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHJhbmdlLCB0YXJnZXQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgJiYgISh0YXJnZXQgaW5zdGFuY2VvZiB1cmlfMS52c2NVcmkuVVJJKSkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgndGFyZ2V0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIVJhbmdlLmlzUmFuZ2UocmFuZ2UpIHx8IHJhbmdlLmlzRW1wdHkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3JhbmdlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRMaW5rID0gRG9jdW1lbnRMaW5rO1xuICAgIGNsYXNzIENvbG9yIHtcbiAgICAgICAgY29uc3RydWN0b3IocmVkLCBncmVlbiwgYmx1ZSwgYWxwaGEpIHtcbiAgICAgICAgICAgIHRoaXMucmVkID0gcmVkO1xuICAgICAgICAgICAgdGhpcy5ncmVlbiA9IGdyZWVuO1xuICAgICAgICAgICAgdGhpcy5ibHVlID0gYmx1ZTtcbiAgICAgICAgICAgIHRoaXMuYWxwaGEgPSBhbHBoYTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29sb3IgPSBDb2xvcjtcbiAgICBjbGFzcyBDb2xvckluZm9ybWF0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IocmFuZ2UsIGNvbG9yKSB7XG4gICAgICAgICAgICBpZiAoY29sb3IgJiYgIShjb2xvciBpbnN0YW5jZW9mIENvbG9yKSkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnY29sb3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghUmFuZ2UuaXNSYW5nZShyYW5nZSkgfHwgcmFuZ2UuaXNFbXB0eSkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgncmFuZ2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICAgIHRoaXMuY29sb3IgPSBjb2xvcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29sb3JJbmZvcm1hdGlvbiA9IENvbG9ySW5mb3JtYXRpb247XG4gICAgY2xhc3MgQ29sb3JQcmVzZW50YXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihsYWJlbCkge1xuICAgICAgICAgICAgaWYgKCFsYWJlbCB8fCB0eXBlb2YgbGFiZWwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdsYWJlbCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvclByZXNlbnRhdGlvbiA9IENvbG9yUHJlc2VudGF0aW9uO1xuICAgIGxldCBDb2xvckZvcm1hdDtcbiAgICAoZnVuY3Rpb24gKENvbG9yRm9ybWF0KSB7XG4gICAgICAgIENvbG9yRm9ybWF0W0NvbG9yRm9ybWF0W1wiUkdCXCJdID0gMF0gPSBcIlJHQlwiO1xuICAgICAgICBDb2xvckZvcm1hdFtDb2xvckZvcm1hdFtcIkhFWFwiXSA9IDFdID0gXCJIRVhcIjtcbiAgICAgICAgQ29sb3JGb3JtYXRbQ29sb3JGb3JtYXRbXCJIU0xcIl0gPSAyXSA9IFwiSFNMXCI7XG4gICAgfSkoQ29sb3JGb3JtYXQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29sb3JGb3JtYXQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvckZvcm1hdCA9IHt9KSk7XG4gICAgbGV0IFNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlO1xuICAgIChmdW5jdGlvbiAoU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGUpIHtcbiAgICAgICAgU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGVbU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGVbXCJFcnJvclwiXSA9IDBdID0gXCJFcnJvclwiO1xuICAgICAgICBTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtcIldhcm5pbmdcIl0gPSAxXSA9IFwiV2FybmluZ1wiO1xuICAgICAgICBTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtcIkluZm9ybWF0aW9uXCJdID0gMl0gPSBcIkluZm9ybWF0aW9uXCI7XG4gICAgfSkoU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGUgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Tb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZSA9IHt9KSk7XG4gICAgbGV0IFRhc2tSZXZlYWxLaW5kO1xuICAgIChmdW5jdGlvbiAoVGFza1JldmVhbEtpbmQpIHtcbiAgICAgICAgVGFza1JldmVhbEtpbmRbVGFza1JldmVhbEtpbmRbXCJBbHdheXNcIl0gPSAxXSA9IFwiQWx3YXlzXCI7XG4gICAgICAgIFRhc2tSZXZlYWxLaW5kW1Rhc2tSZXZlYWxLaW5kW1wiU2lsZW50XCJdID0gMl0gPSBcIlNpbGVudFwiO1xuICAgICAgICBUYXNrUmV2ZWFsS2luZFtUYXNrUmV2ZWFsS2luZFtcIk5ldmVyXCJdID0gM10gPSBcIk5ldmVyXCI7XG4gICAgfSkoVGFza1JldmVhbEtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGFza1JldmVhbEtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrUmV2ZWFsS2luZCA9IHt9KSk7XG4gICAgbGV0IFRhc2tQYW5lbEtpbmQ7XG4gICAgKGZ1bmN0aW9uIChUYXNrUGFuZWxLaW5kKSB7XG4gICAgICAgIFRhc2tQYW5lbEtpbmRbVGFza1BhbmVsS2luZFtcIlNoYXJlZFwiXSA9IDFdID0gXCJTaGFyZWRcIjtcbiAgICAgICAgVGFza1BhbmVsS2luZFtUYXNrUGFuZWxLaW5kW1wiRGVkaWNhdGVkXCJdID0gMl0gPSBcIkRlZGljYXRlZFwiO1xuICAgICAgICBUYXNrUGFuZWxLaW5kW1Rhc2tQYW5lbEtpbmRbXCJOZXdcIl0gPSAzXSA9IFwiTmV3XCI7XG4gICAgfSkoVGFza1BhbmVsS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrUGFuZWxLaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGFza1BhbmVsS2luZCA9IHt9KSk7XG4gICAgY2xhc3MgVGFza0dyb3VwIHtcbiAgICAgICAgY29uc3RydWN0b3IoaWQsIF9sYWJlbCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ25hbWUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgX2xhYmVsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbmFtZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5faWQgPSBpZDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgZnJvbSh2YWx1ZSkge1xuICAgICAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2NsZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5DbGVhbjtcbiAgICAgICAgICAgICAgICBjYXNlICdidWlsZCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUYXNrR3JvdXAuQnVpbGQ7XG4gICAgICAgICAgICAgICAgY2FzZSAncmVidWlsZCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUYXNrR3JvdXAuUmVidWlsZDtcbiAgICAgICAgICAgICAgICBjYXNlICd0ZXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5UZXN0O1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGlkKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgICAgICB9XG4gICAgfVxuICAgIFRhc2tHcm91cC5DbGVhbiA9IG5ldyBUYXNrR3JvdXAoJ2NsZWFuJywgJ0NsZWFuJyk7XG4gICAgVGFza0dyb3VwLkJ1aWxkID0gbmV3IFRhc2tHcm91cCgnYnVpbGQnLCAnQnVpbGQnKTtcbiAgICBUYXNrR3JvdXAuUmVidWlsZCA9IG5ldyBUYXNrR3JvdXAoJ3JlYnVpbGQnLCAnUmVidWlsZCcpO1xuICAgIFRhc2tHcm91cC5UZXN0ID0gbmV3IFRhc2tHcm91cCgndGVzdCcsICdUZXN0Jyk7XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tHcm91cCA9IFRhc2tHcm91cDtcbiAgICBjbGFzcyBQcm9jZXNzRXhlY3V0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IocHJvY2VzcywgdmFyZzEsIHZhcmcyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdwcm9jZXNzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9wcm9jZXNzID0gcHJvY2VzcztcbiAgICAgICAgICAgIGlmICh2YXJnMSAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFyZzEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FyZ3MgPSB2YXJnMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IHZhcmcyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IHZhcmcxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9hcmdzID09PSB2b2lkIDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hcmdzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHByb2Nlc3MoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJvY2VzcztcbiAgICAgICAgfVxuICAgICAgICBzZXQgcHJvY2Vzcyh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3Byb2Nlc3MnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgYXJncygpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hcmdzO1xuICAgICAgICB9XG4gICAgICAgIHNldCBhcmdzKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2FyZ3MgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgb3B0aW9ucygpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIHNldCBvcHRpb25zKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9vcHRpb25zID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgY29tcHV0ZUlkKCkge1xuICAgICAgICAgICAgLy8gY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdtZDUnKTtcbiAgICAgICAgICAgIC8vIGhhc2gudXBkYXRlKCdwcm9jZXNzJyk7XG4gICAgICAgICAgICAvLyBpZiAodGhpcy5fcHJvY2VzcyAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAvLyAgICAgaGFzaC51cGRhdGUodGhpcy5fcHJvY2Vzcyk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvLyBpZiAodGhpcy5fYXJncyAmJiB0aGlzLl9hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vICAgICBmb3IgKGxldCBhcmcgb2YgdGhpcy5fYXJncykge1xuICAgICAgICAgICAgLy8gICAgICAgICBoYXNoLnVwZGF0ZShhcmcpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUHJvY2Vzc0V4ZWN1dGlvbiA9IFByb2Nlc3NFeGVjdXRpb247XG4gICAgY2xhc3MgU2hlbGxFeGVjdXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihhcmcwLCBhcmcxLCBhcmcyKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhcmcxKSkge1xuICAgICAgICAgICAgICAgIGlmICghYXJnMCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2NvbW1hbmQgY2FuXFwndCBiZSB1bmRlZmluZWQgb3IgbnVsbCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyZzAgIT09ICdzdHJpbmcnICYmIHR5cGVvZiBhcmcwLnZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2NvbW1hbmQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fY29tbWFuZCA9IGFyZzA7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXJncyA9IGFyZzE7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IGFyZzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyZzAgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnY29tbWFuZExpbmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fY29tbWFuZExpbmUgPSBhcmcwO1xuICAgICAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGdldCBjb21tYW5kTGluZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb21tYW5kTGluZTtcbiAgICAgICAgfVxuICAgICAgICBzZXQgY29tbWFuZExpbmUodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kTGluZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fY29tbWFuZExpbmUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgY29tbWFuZCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb21tYW5kO1xuICAgICAgICB9XG4gICAgICAgIHNldCBjb21tYW5kKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJyAmJiB0eXBlb2YgdmFsdWUudmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jb21tYW5kID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGFyZ3MoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYXJncztcbiAgICAgICAgfVxuICAgICAgICBzZXQgYXJncyh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fYXJncyA9IHZhbHVlIHx8IFtdO1xuICAgICAgICB9XG4gICAgICAgIGdldCBvcHRpb25zKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IG9wdGlvbnModmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb21wdXRlSWQoKSB7XG4gICAgICAgICAgICAvLyBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpO1xuICAgICAgICAgICAgLy8gaGFzaC51cGRhdGUoJ3NoZWxsJyk7XG4gICAgICAgICAgICAvLyBpZiAodGhpcy5fY29tbWFuZExpbmUgIT09IHZvaWQgMCkge1xuICAgICAgICAgICAgLy8gICAgIGhhc2gudXBkYXRlKHRoaXMuX2NvbW1hbmRMaW5lKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9jb21tYW5kICE9PSB2b2lkIDApIHtcbiAgICAgICAgICAgIC8vICAgICBoYXNoLnVwZGF0ZSh0eXBlb2YgdGhpcy5fY29tbWFuZCA9PT0gJ3N0cmluZycgPyB0aGlzLl9jb21tYW5kIDogdGhpcy5fY29tbWFuZC52YWx1ZSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvLyBpZiAodGhpcy5fYXJncyAmJiB0aGlzLl9hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vICAgICBmb3IgKGxldCBhcmcgb2YgdGhpcy5fYXJncykge1xuICAgICAgICAgICAgLy8gICAgICAgICBoYXNoLnVwZGF0ZSh0eXBlb2YgYXJnID09PSAnc3RyaW5nJyA/IGFyZyA6IGFyZy52YWx1ZSk7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgLy8gcmV0dXJuIGhhc2guZGlnZXN0KCdoZXgnKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IHNwcG9ydGVkJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNoZWxsRXhlY3V0aW9uID0gU2hlbGxFeGVjdXRpb247XG4gICAgbGV0IFNoZWxsUXVvdGluZztcbiAgICAoZnVuY3Rpb24gKFNoZWxsUXVvdGluZykge1xuICAgICAgICBTaGVsbFF1b3RpbmdbU2hlbGxRdW90aW5nW1wiRXNjYXBlXCJdID0gMV0gPSBcIkVzY2FwZVwiO1xuICAgICAgICBTaGVsbFF1b3RpbmdbU2hlbGxRdW90aW5nW1wiU3Ryb25nXCJdID0gMl0gPSBcIlN0cm9uZ1wiO1xuICAgICAgICBTaGVsbFF1b3RpbmdbU2hlbGxRdW90aW5nW1wiV2Vha1wiXSA9IDNdID0gXCJXZWFrXCI7XG4gICAgfSkoU2hlbGxRdW90aW5nID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNoZWxsUXVvdGluZyB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNoZWxsUXVvdGluZyA9IHt9KSk7XG4gICAgbGV0IFRhc2tTY29wZTtcbiAgICAoZnVuY3Rpb24gKFRhc2tTY29wZSkge1xuICAgICAgICBUYXNrU2NvcGVbVGFza1Njb3BlW1wiR2xvYmFsXCJdID0gMV0gPSBcIkdsb2JhbFwiO1xuICAgICAgICBUYXNrU2NvcGVbVGFza1Njb3BlW1wiV29ya3NwYWNlXCJdID0gMl0gPSBcIldvcmtzcGFjZVwiO1xuICAgIH0pKFRhc2tTY29wZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrU2NvcGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrU2NvcGUgPSB7fSkpO1xuICAgIGNsYXNzIFRhc2sge1xuICAgICAgICBjb25zdHJ1Y3RvcihkZWZpbml0aW9uLCBhcmcyLCBhcmczLCBhcmc0LCBhcmc1LCBhcmc2KSB7XG4gICAgICAgICAgICB0aGlzLmRlZmluaXRpb24gPSBkZWZpbml0aW9uO1xuICAgICAgICAgICAgbGV0IHByb2JsZW1NYXRjaGVycztcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnMiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBhcmcyO1xuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlID0gYXJnMztcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvbiA9IGFyZzQ7XG4gICAgICAgICAgICAgICAgcHJvYmxlbU1hdGNoZXJzID0gYXJnNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGFyZzIgPT09IFRhc2tTY29wZS5HbG9iYWwgfHwgYXJnMiA9PT0gVGFza1Njb3BlLldvcmtzcGFjZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gYXJnMjtcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBhcmczO1xuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlID0gYXJnNDtcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvbiA9IGFyZzU7XG4gICAgICAgICAgICAgICAgcHJvYmxlbU1hdGNoZXJzID0gYXJnNjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gYXJnMjtcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBhcmczO1xuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlID0gYXJnNDtcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvbiA9IGFyZzU7XG4gICAgICAgICAgICAgICAgcHJvYmxlbU1hdGNoZXJzID0gYXJnNjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvYmxlbU1hdGNoZXJzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb2JsZW1NYXRjaGVycyA9IFtwcm9ibGVtTWF0Y2hlcnNdO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycyA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHByb2JsZW1NYXRjaGVycykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9ibGVtTWF0Y2hlcnMgPSBwcm9ibGVtTWF0Y2hlcnM7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFzRGVmaW5lZE1hdGNoZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb2JsZW1NYXRjaGVycyA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5faXNCYWNrZ3JvdW5kID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IF9pZCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9faWQ7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IF9pZCh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fX2lkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXIoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fX2lkID09PSB2b2lkIDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9faWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl9zY29wZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuX2RlZmluaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXhlY3V0aW9uIGluc3RhbmNlb2YgUHJvY2Vzc0V4ZWN1dGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlZmluaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdwcm9jZXNzJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2V4ZWN1dGlvbi5jb21wdXRlSWQoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9leGVjdXRpb24gaW5zdGFuY2VvZiBTaGVsbEV4ZWN1dGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlZmluaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzaGVsbCcsXG4gICAgICAgICAgICAgICAgICAgIGlkOiB0aGlzLl9leGVjdXRpb24uY29tcHV0ZUlkKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGdldCBkZWZpbml0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZmluaXRpb247XG4gICAgICAgIH1cbiAgICAgICAgc2V0IGRlZmluaXRpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwIHx8IHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdLaW5kIGNhblxcJ3QgYmUgdW5kZWZpbmVkIG9yIG51bGwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX2RlZmluaXRpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgc2NvcGUoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2NvcGU7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHRhcmdldCh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fc2NvcGUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgbmFtZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uYW1lO1xuICAgICAgICB9XG4gICAgICAgIHNldCBuYW1lKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbmFtZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fbmFtZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBleGVjdXRpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHNldCBleGVjdXRpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fZXhlY3V0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHByb2JsZW1NYXRjaGVycygpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcm9ibGVtTWF0Y2hlcnM7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHByb2JsZW1NYXRjaGVycyh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb2JsZW1NYXRjaGVycyA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX3Byb2JsZW1NYXRjaGVycyA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5faGFzRGVmaW5lZE1hdGNoZXJzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgaGFzRGVmaW5lZE1hdGNoZXJzKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycztcbiAgICAgICAgfVxuICAgICAgICBnZXQgaXNCYWNrZ3JvdW5kKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzQmFja2dyb3VuZDtcbiAgICAgICAgfVxuICAgICAgICBzZXQgaXNCYWNrZ3JvdW5kKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IHRydWUgJiYgdmFsdWUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX2lzQmFja2dyb3VuZCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBzb3VyY2UoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlO1xuICAgICAgICB9XG4gICAgICAgIHNldCBzb3VyY2UodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnc291cmNlIG11c3QgYmUgYSBzdHJpbmcgb2YgbGVuZ3RoID4gMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGdyb3VwKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dyb3VwO1xuICAgICAgICB9XG4gICAgICAgIHNldCBncm91cCh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB2b2lkIDAgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncm91cCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl9ncm91cCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBwcmVzZW50YXRpb25PcHRpb25zKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXNlbnRhdGlvbk9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHByZXNlbnRhdGlvbk9wdGlvbnModmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fcHJlc2VudGF0aW9uT3B0aW9ucyA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrID0gVGFzaztcbiAgICBsZXQgUHJvZ3Jlc3NMb2NhdGlvbjtcbiAgICAoZnVuY3Rpb24gKFByb2dyZXNzTG9jYXRpb24pIHtcbiAgICAgICAgUHJvZ3Jlc3NMb2NhdGlvbltQcm9ncmVzc0xvY2F0aW9uW1wiU291cmNlQ29udHJvbFwiXSA9IDFdID0gXCJTb3VyY2VDb250cm9sXCI7XG4gICAgICAgIFByb2dyZXNzTG9jYXRpb25bUHJvZ3Jlc3NMb2NhdGlvbltcIldpbmRvd1wiXSA9IDEwXSA9IFwiV2luZG93XCI7XG4gICAgICAgIFByb2dyZXNzTG9jYXRpb25bUHJvZ3Jlc3NMb2NhdGlvbltcIk5vdGlmaWNhdGlvblwiXSA9IDE1XSA9IFwiTm90aWZpY2F0aW9uXCI7XG4gICAgfSkoUHJvZ3Jlc3NMb2NhdGlvbiA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Qcm9ncmVzc0xvY2F0aW9uIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUHJvZ3Jlc3NMb2NhdGlvbiA9IHt9KSk7XG4gICAgY2xhc3MgVHJlZUl0ZW0ge1xuICAgICAgICBjb25zdHJ1Y3RvcihhcmcxLCBjb2xsYXBzaWJsZVN0YXRlID0gVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlLk5vbmUpIHtcbiAgICAgICAgICAgIHRoaXMuY29sbGFwc2libGVTdGF0ZSA9IGNvbGxhcHNpYmxlU3RhdGU7XG4gICAgICAgICAgICBpZiAoYXJnMSBpbnN0YW5jZW9mIHVyaV8xLnZzY1VyaS5VUkkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc291cmNlVXJpID0gYXJnMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubGFiZWwgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UcmVlSXRlbSA9IFRyZWVJdGVtO1xuICAgIGxldCBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGU7XG4gICAgKGZ1bmN0aW9uIChUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUpIHtcbiAgICAgICAgVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1RyZWVJdGVtQ29sbGFwc2libGVTdGF0ZVtcIk5vbmVcIl0gPSAwXSA9IFwiTm9uZVwiO1xuICAgICAgICBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1wiQ29sbGFwc2VkXCJdID0gMV0gPSBcIkNvbGxhcHNlZFwiO1xuICAgICAgICBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1wiRXhwYW5kZWRcIl0gPSAyXSA9IFwiRXhwYW5kZWRcIjtcbiAgICB9KShUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlID0ge30pKTtcbiAgICBjbGFzcyBUaGVtZUljb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihpZCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB9XG4gICAgfVxuICAgIFRoZW1lSWNvbi5GaWxlID0gbmV3IFRoZW1lSWNvbignZmlsZScpO1xuICAgIFRoZW1lSWNvbi5Gb2xkZXIgPSBuZXcgVGhlbWVJY29uKCdmb2xkZXInKTtcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGhlbWVJY29uID0gVGhlbWVJY29uO1xuICAgIGNsYXNzIFRoZW1lQ29sb3Ige1xuICAgICAgICBjb25zdHJ1Y3RvcihpZCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UaGVtZUNvbG9yID0gVGhlbWVDb2xvcjtcbiAgICBsZXQgQ29uZmlndXJhdGlvblRhcmdldDtcbiAgICAoZnVuY3Rpb24gKENvbmZpZ3VyYXRpb25UYXJnZXQpIHtcbiAgICAgICAgQ29uZmlndXJhdGlvblRhcmdldFtDb25maWd1cmF0aW9uVGFyZ2V0W1wiR2xvYmFsXCJdID0gMV0gPSBcIkdsb2JhbFwiO1xuICAgICAgICBDb25maWd1cmF0aW9uVGFyZ2V0W0NvbmZpZ3VyYXRpb25UYXJnZXRbXCJXb3Jrc3BhY2VcIl0gPSAyXSA9IFwiV29ya3NwYWNlXCI7XG4gICAgICAgIENvbmZpZ3VyYXRpb25UYXJnZXRbQ29uZmlndXJhdGlvblRhcmdldFtcIldvcmtzcGFjZUZvbGRlclwiXSA9IDNdID0gXCJXb3Jrc3BhY2VGb2xkZXJcIjtcbiAgICB9KShDb25maWd1cmF0aW9uVGFyZ2V0ID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbmZpZ3VyYXRpb25UYXJnZXQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db25maWd1cmF0aW9uVGFyZ2V0ID0ge30pKTtcbiAgICBjbGFzcyBSZWxhdGl2ZVBhdHRlcm4ge1xuICAgICAgICBjb25zdHJ1Y3RvcihiYXNlLCBwYXR0ZXJuKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGJhc2UgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFiYXNlIHx8ICF1cmlfMS52c2NVcmkuVVJJLmlzVXJpKGJhc2UudXJpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2Jhc2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhdHRlcm4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdwYXR0ZXJuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmJhc2UgPSB0eXBlb2YgYmFzZSA9PT0gJ3N0cmluZycgPyBiYXNlIDogYmFzZS51cmkuZnNQYXRoO1xuICAgICAgICAgICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgICAgICAgfVxuICAgICAgICBwYXRoVG9SZWxhdGl2ZShmcm9tLCB0bykge1xuICAgICAgICAgICAgcmV0dXJuIHBhdGhfMS5yZWxhdGl2ZShmcm9tLCB0byk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlJlbGF0aXZlUGF0dGVybiA9IFJlbGF0aXZlUGF0dGVybjtcbiAgICBjbGFzcyBCcmVha3BvaW50IHtcbiAgICAgICAgY29uc3RydWN0b3IoZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuZW5hYmxlZCA9IHR5cGVvZiBlbmFibGVkID09PSAnYm9vbGVhbicgPyBlbmFibGVkIDogdHJ1ZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZGl0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBoaXRDb25kaXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb25kaXRpb24gPSBoaXRDb25kaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxvZ01lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dNZXNzYWdlID0gbG9nTWVzc2FnZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQnJlYWtwb2ludCA9IEJyZWFrcG9pbnQ7XG4gICAgY2xhc3MgU291cmNlQnJlYWtwb2ludCBleHRlbmRzIEJyZWFrcG9pbnQge1xuICAgICAgICBjb25zdHJ1Y3Rvcihsb2NhdGlvbiwgZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpIHtcbiAgICAgICAgICAgIHN1cGVyKGVuYWJsZWQsIGNvbmRpdGlvbiwgaGl0Q29uZGl0aW9uLCBsb2dNZXNzYWdlKTtcbiAgICAgICAgICAgIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbG9jYXRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9jYXRpb24gPSBsb2NhdGlvbjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU291cmNlQnJlYWtwb2ludCA9IFNvdXJjZUJyZWFrcG9pbnQ7XG4gICAgY2xhc3MgRnVuY3Rpb25CcmVha3BvaW50IGV4dGVuZHMgQnJlYWtwb2ludCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGZ1bmN0aW9uTmFtZSwgZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpIHtcbiAgICAgICAgICAgIHN1cGVyKGVuYWJsZWQsIGNvbmRpdGlvbiwgaGl0Q29uZGl0aW9uLCBsb2dNZXNzYWdlKTtcbiAgICAgICAgICAgIGlmICghZnVuY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdmdW5jdGlvbk5hbWUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZnVuY3Rpb25OYW1lID0gZnVuY3Rpb25OYW1lO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5GdW5jdGlvbkJyZWFrcG9pbnQgPSBGdW5jdGlvbkJyZWFrcG9pbnQ7XG4gICAgY2xhc3MgRGVidWdBZGFwdGVyRXhlY3V0YWJsZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGNvbW1hbmQsIGFyZ3MpIHtcbiAgICAgICAgICAgIHRoaXMuY29tbWFuZCA9IGNvbW1hbmQ7XG4gICAgICAgICAgICB0aGlzLmFyZ3MgPSBhcmdzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EZWJ1Z0FkYXB0ZXJFeGVjdXRhYmxlID0gRGVidWdBZGFwdGVyRXhlY3V0YWJsZTtcbiAgICBsZXQgTG9nTGV2ZWw7XG4gICAgKGZ1bmN0aW9uIChMb2dMZXZlbCkge1xuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIlRyYWNlXCJdID0gMV0gPSBcIlRyYWNlXCI7XG4gICAgICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiRGVidWdcIl0gPSAyXSA9IFwiRGVidWdcIjtcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJJbmZvXCJdID0gM10gPSBcIkluZm9cIjtcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJXYXJuaW5nXCJdID0gNF0gPSBcIldhcm5pbmdcIjtcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJFcnJvclwiXSA9IDVdID0gXCJFcnJvclwiO1xuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIkNyaXRpY2FsXCJdID0gNl0gPSBcIkNyaXRpY2FsXCI7XG4gICAgICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiT2ZmXCJdID0gN10gPSBcIk9mZlwiO1xuICAgIH0pKExvZ0xldmVsID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkxvZ0xldmVsIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuTG9nTGV2ZWwgPSB7fSkpO1xuICAgIC8vI3JlZ2lvbiBmaWxlIGFwaVxuICAgIGxldCBGaWxlQ2hhbmdlVHlwZTtcbiAgICAoZnVuY3Rpb24gKEZpbGVDaGFuZ2VUeXBlKSB7XG4gICAgICAgIEZpbGVDaGFuZ2VUeXBlW0ZpbGVDaGFuZ2VUeXBlW1wiQ2hhbmdlZFwiXSA9IDFdID0gXCJDaGFuZ2VkXCI7XG4gICAgICAgIEZpbGVDaGFuZ2VUeXBlW0ZpbGVDaGFuZ2VUeXBlW1wiQ3JlYXRlZFwiXSA9IDJdID0gXCJDcmVhdGVkXCI7XG4gICAgICAgIEZpbGVDaGFuZ2VUeXBlW0ZpbGVDaGFuZ2VUeXBlW1wiRGVsZXRlZFwiXSA9IDNdID0gXCJEZWxldGVkXCI7XG4gICAgfSkoRmlsZUNoYW5nZVR5cGUgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRmlsZUNoYW5nZVR5cGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5GaWxlQ2hhbmdlVHlwZSA9IHt9KSk7XG4gICAgY2xhc3MgRmlsZVN5c3RlbUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAgICAgICBjb25zdHJ1Y3Rvcih1cmlPck1lc3NhZ2UsIGNvZGUsIHRlcm1pbmF0b3IpIHtcbiAgICAgICAgICAgIHN1cGVyKHVyaV8xLnZzY1VyaS5VUkkuaXNVcmkodXJpT3JNZXNzYWdlKSA/IHVyaU9yTWVzc2FnZS50b1N0cmluZyh0cnVlKSA6IHVyaU9yTWVzc2FnZSk7XG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBjb2RlID8gYCR7Y29kZX0gKEZpbGVTeXN0ZW1FcnJvcilgIDogYEZpbGVTeXN0ZW1FcnJvcmA7XG4gICAgICAgICAgICAvLyB3b3JrYXJvdW5kIHdoZW4gZXh0ZW5kaW5nIGJ1aWx0aW4gb2JqZWN0cyBhbmQgd2hlbiBjb21waWxpbmcgdG8gRVM1LCBzZWU6XG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQtd2lraS9ibG9iL21hc3Rlci9CcmVha2luZy1DaGFuZ2VzLm1kI2V4dGVuZGluZy1idWlsdC1pbnMtbGlrZS1lcnJvci1hcnJheS1hbmQtbWFwLW1heS1uby1sb25nZXItd29ya1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBPYmplY3Quc2V0UHJvdG90eXBlT2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgRmlsZVN5c3RlbUVycm9yLnByb3RvdHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB0ZXJtaW5hdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgLy8gbmljZSBzdGFjayB0cmFjZXNcbiAgICAgICAgICAgICAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0ZXJtaW5hdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgRmlsZUV4aXN0cyhtZXNzYWdlT3JVcmkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmlsZVN5c3RlbUVycm9yKG1lc3NhZ2VPclVyaSwgJ0VudHJ5RXhpc3RzJywgRmlsZVN5c3RlbUVycm9yLkZpbGVFeGlzdHMpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBGaWxlTm90Rm91bmQobWVzc2FnZU9yVXJpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpbGVTeXN0ZW1FcnJvcihtZXNzYWdlT3JVcmksICdFbnRyeU5vdEZvdW5kJywgRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RGb3VuZCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIEZpbGVOb3RBRGlyZWN0b3J5KG1lc3NhZ2VPclVyaSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaWxlU3lzdGVtRXJyb3IobWVzc2FnZU9yVXJpLCAnRW50cnlOb3RBRGlyZWN0b3J5JywgRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RBRGlyZWN0b3J5KTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgRmlsZUlzQURpcmVjdG9yeShtZXNzYWdlT3JVcmkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmlsZVN5c3RlbUVycm9yKG1lc3NhZ2VPclVyaSwgJ0VudHJ5SXNBRGlyZWN0b3J5JywgRmlsZVN5c3RlbUVycm9yLkZpbGVJc0FEaXJlY3RvcnkpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBOb1Blcm1pc3Npb25zKG1lc3NhZ2VPclVyaSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaWxlU3lzdGVtRXJyb3IobWVzc2FnZU9yVXJpLCAnTm9QZXJtaXNzaW9ucycsIEZpbGVTeXN0ZW1FcnJvci5Ob1Blcm1pc3Npb25zKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgVW5hdmFpbGFibGUobWVzc2FnZU9yVXJpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpbGVTeXN0ZW1FcnJvcihtZXNzYWdlT3JVcmksICdVbmF2YWlsYWJsZScsIEZpbGVTeXN0ZW1FcnJvci5VbmF2YWlsYWJsZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZpbGVTeXN0ZW1FcnJvciA9IEZpbGVTeXN0ZW1FcnJvcjtcbiAgICAvLyNlbmRyZWdpb25cbiAgICAvLyNyZWdpb24gZm9sZGluZyBhcGlcbiAgICBjbGFzcyBGb2xkaW5nUmFuZ2Uge1xuICAgICAgICBjb25zdHJ1Y3RvcihzdGFydCwgZW5kLCBraW5kKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICB0aGlzLmVuZCA9IGVuZDtcbiAgICAgICAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZvbGRpbmdSYW5nZSA9IEZvbGRpbmdSYW5nZTtcbiAgICBsZXQgRm9sZGluZ1JhbmdlS2luZDtcbiAgICAoZnVuY3Rpb24gKEZvbGRpbmdSYW5nZUtpbmQpIHtcbiAgICAgICAgRm9sZGluZ1JhbmdlS2luZFtGb2xkaW5nUmFuZ2VLaW5kW1wiQ29tbWVudFwiXSA9IDFdID0gXCJDb21tZW50XCI7XG4gICAgICAgIEZvbGRpbmdSYW5nZUtpbmRbRm9sZGluZ1JhbmdlS2luZFtcIkltcG9ydHNcIl0gPSAyXSA9IFwiSW1wb3J0c1wiO1xuICAgICAgICBGb2xkaW5nUmFuZ2VLaW5kW0ZvbGRpbmdSYW5nZUtpbmRbXCJSZWdpb25cIl0gPSAzXSA9IFwiUmVnaW9uXCI7XG4gICAgfSkoRm9sZGluZ1JhbmdlS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Gb2xkaW5nUmFuZ2VLaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRm9sZGluZ1JhbmdlS2luZCA9IHt9KSk7XG4gICAgLy8jZW5kcmVnaW9uXG4gICAgbGV0IENvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlO1xuICAgIChmdW5jdGlvbiAoQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZXMgYW4gaXRlbSBpcyBjb2xsYXBzZWRcbiAgICAgICAgICovXG4gICAgICAgIENvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlW0NvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlW1wiQ29sbGFwc2VkXCJdID0gMF0gPSBcIkNvbGxhcHNlZFwiO1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lcyBhbiBpdGVtIGlzIGV4cGFuZGVkXG4gICAgICAgICAqL1xuICAgICAgICBDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZVtDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZVtcIkV4cGFuZGVkXCJdID0gMV0gPSBcIkV4cGFuZGVkXCI7XG4gICAgfSkoQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGUgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSA9IHt9KSk7XG59KSh2c2NNb2NrRXh0SG9zdGVkVHlwZXMgPSBleHBvcnRzLnZzY01vY2tFeHRIb3N0ZWRUeXBlcyB8fCAoZXhwb3J0cy52c2NNb2NrRXh0SG9zdGVkVHlwZXMgPSB7fSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXh0SG9zdGVkVHlwZXMuanMubWFwIl19