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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4dEhvc3RlZFR5cGVzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwicGF0aF8xIiwicmVxdWlyZSIsImh0bWxDb250ZW50XzEiLCJzdHJpbmdzXzEiLCJ1cmlfMSIsInZzY01vY2tFeHRIb3N0ZWRUeXBlcyIsImlsbGVnYWxBcmd1bWVudCIsIm1zZyIsIkVycm9yIiwiRGlzcG9zYWJsZSIsImNvbnN0cnVjdG9yIiwiY2FsbE9uRGlzcG9zZSIsIl9jYWxsT25EaXNwb3NlIiwiZnJvbSIsImRpc3Bvc2FibGVzIiwiZGlzcG9zYWJsZSIsImRpc3Bvc2UiLCJ1bmRlZmluZWQiLCJQb3NpdGlvbiIsImxpbmUiLCJjaGFyYWN0ZXIiLCJfbGluZSIsIl9jaGFyYWN0ZXIiLCJNaW4iLCJwb3NpdGlvbnMiLCJyZXN1bHQiLCJwb3AiLCJwIiwiaXNCZWZvcmUiLCJNYXgiLCJpc0FmdGVyIiwiaXNQb3NpdGlvbiIsIm90aGVyIiwiaXNCZWZvcmVPckVxdWFsIiwiaXNBZnRlck9yRXF1YWwiLCJpc0VxdWFsIiwiY29tcGFyZVRvIiwidHJhbnNsYXRlIiwibGluZURlbHRhT3JDaGFuZ2UiLCJjaGFyYWN0ZXJEZWx0YSIsImxpbmVEZWx0YSIsIndpdGgiLCJsaW5lT3JDaGFuZ2UiLCJ0b0pTT04iLCJSYW5nZSIsInN0YXJ0TGluZU9yU3RhcnQiLCJzdGFydENvbHVtbk9yRW5kIiwiZW5kTGluZSIsImVuZENvbHVtbiIsInN0YXJ0IiwiZW5kIiwiX3N0YXJ0IiwiX2VuZCIsImlzUmFuZ2UiLCJ0aGluZyIsImNvbnRhaW5zIiwicG9zaXRpb25PclJhbmdlIiwiaW50ZXJzZWN0aW9uIiwidW5pb24iLCJpc0VtcHR5IiwiaXNTaW5nbGVMaW5lIiwic3RhcnRPckNoYW5nZSIsIlNlbGVjdGlvbiIsImFuY2hvckxpbmVPckFuY2hvciIsImFuY2hvckNvbHVtbk9yQWN0aXZlIiwiYWN0aXZlTGluZSIsImFjdGl2ZUNvbHVtbiIsImFuY2hvciIsImFjdGl2ZSIsIl9hbmNob3IiLCJfYWN0aXZlIiwiaXNTZWxlY3Rpb24iLCJpc1JldmVyc2VkIiwiRW5kT2ZMaW5lIiwiVGV4dEVkaXQiLCJyYW5nZSIsIm5ld1RleHQiLCJpc1RleHRFZGl0IiwicmVwbGFjZSIsImluc2VydCIsInBvc2l0aW9uIiwiZGVsZXRlIiwic2V0RW5kT2ZMaW5lIiwiZW9sIiwicmV0IiwibmV3RW9sIiwiX3JhbmdlIiwiX25ld1RleHQiLCJfbmV3RW9sIiwiV29ya3NwYWNlRWRpdCIsIl9zZXFQb29sIiwiX3Jlc291cmNlRWRpdHMiLCJfdGV4dEVkaXRzIiwiTWFwIiwiY3JlYXRlRmlsZSIsInVyaSIsIm9wdGlvbnMiLCJkZWxldGVGaWxlIiwicmVuYW1lRmlsZSIsIm9sZFVyaSIsIm5ld1VyaSIsImVkaXQiLCJhcnJheSIsImdldCIsInB1c2giLCJzZXQiLCJyZXNvdXJjZSIsImhhcyIsInRvU3RyaW5nIiwiZWRpdHMiLCJkYXRhIiwic2VxIiwic2xpY2UiLCJlbnRyaWVzIiwicmVzIiwiZm9yRWFjaCIsImFsbEVudHJpZXMiLCJzaXplIiwibGVuZ3RoIiwiU25pcHBldFN0cmluZyIsIl90YWJzdG9wIiwiaXNTbmlwcGV0U3RyaW5nIiwiX2VzY2FwZSIsImFwcGVuZFRleHQiLCJzdHJpbmciLCJhcHBlbmRUYWJzdG9wIiwibnVtYmVyIiwiYXBwZW5kUGxhY2Vob2xkZXIiLCJuZXN0ZWQiLCJhcHBlbmRWYXJpYWJsZSIsIm5hbWUiLCJkZWZhdWx0VmFsdWUiLCJEaWFnbm9zdGljVGFnIiwiRGlhZ25vc3RpY1NldmVyaXR5IiwiTG9jYXRpb24iLCJyYW5nZU9yUG9zaXRpb24iLCJpc0xvY2F0aW9uIiwidnNjVXJpIiwiVVJJIiwiaXNVcmkiLCJEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uIiwibG9jYXRpb24iLCJtZXNzYWdlIiwiaXMiLCJEaWFnbm9zdGljIiwic2V2ZXJpdHkiLCJzb3VyY2UiLCJjb2RlIiwiSG92ZXIiLCJjb250ZW50cyIsIkFycmF5IiwiaXNBcnJheSIsInZzY01vY2tIdG1sQ29udGVudCIsImlzTWFya2Rvd25TdHJpbmciLCJEb2N1bWVudEhpZ2hsaWdodEtpbmQiLCJEb2N1bWVudEhpZ2hsaWdodCIsImtpbmQiLCJUZXh0IiwiU3ltYm9sS2luZCIsIlN5bWJvbEluZm9ybWF0aW9uIiwicmFuZ2VPckNvbnRhaW5lciIsImxvY2F0aW9uT3JVcmkiLCJjb250YWluZXJOYW1lIiwiU3ltYm9sSW5mb3JtYXRpb24yIiwiY2hpbGRyZW4iLCJkZWZpbmluZ1JhbmdlIiwiQ29kZUFjdGlvblRyaWdnZXIiLCJDb2RlQWN0aW9uIiwidGl0bGUiLCJDb2RlQWN0aW9uS2luZCIsImFwcGVuZCIsInBhcnRzIiwic2VwIiwidnNjTW9ja1N0cmluZ3MiLCJzdGFydHNXaXRoIiwiRW1wdHkiLCJRdWlja0ZpeCIsIlJlZmFjdG9yIiwiUmVmYWN0b3JFeHRyYWN0IiwiUmVmYWN0b3JJbmxpbmUiLCJSZWZhY3RvclJld3JpdGUiLCJTb3VyY2UiLCJTb3VyY2VPcmdhbml6ZUltcG9ydHMiLCJDb2RlTGVucyIsImNvbW1hbmQiLCJpc1Jlc29sdmVkIiwiTWFya2Rvd25TdHJpbmciLCJhcHBlbmRNYXJrZG93biIsImFwcGVuZENvZGVibG9jayIsImxhbmd1YWdlIiwiUGFyYW1ldGVySW5mb3JtYXRpb24iLCJsYWJlbCIsImRvY3VtZW50YXRpb24iLCJTaWduYXR1cmVJbmZvcm1hdGlvbiIsInBhcmFtZXRlcnMiLCJTaWduYXR1cmVIZWxwIiwic2lnbmF0dXJlcyIsIkNvbXBsZXRpb25UcmlnZ2VyS2luZCIsIkNvbXBsZXRpb25JdGVtS2luZCIsIkNvbXBsZXRpb25JdGVtIiwiZGV0YWlsIiwic29ydFRleHQiLCJmaWx0ZXJUZXh0IiwiaW5zZXJ0VGV4dCIsInRleHRFZGl0IiwiQ29tcGxldGlvbkxpc3QiLCJpdGVtcyIsImlzSW5jb21wbGV0ZSIsIlZpZXdDb2x1bW4iLCJTdGF0dXNCYXJBbGlnbm1lbnQiLCJUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZSIsIlRleHREb2N1bWVudFNhdmVSZWFzb24iLCJUZXh0RWRpdG9yUmV2ZWFsVHlwZSIsIlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kIiwiRGVjb3JhdGlvblJhbmdlQmVoYXZpb3IiLCJmcm9tVmFsdWUiLCJzIiwiS2V5Ym9hcmQiLCJNb3VzZSIsIkNvbW1hbmQiLCJEb2N1bWVudExpbmsiLCJ0YXJnZXQiLCJDb2xvciIsInJlZCIsImdyZWVuIiwiYmx1ZSIsImFscGhhIiwiQ29sb3JJbmZvcm1hdGlvbiIsImNvbG9yIiwiQ29sb3JQcmVzZW50YXRpb24iLCJDb2xvckZvcm1hdCIsIlNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlIiwiVGFza1JldmVhbEtpbmQiLCJUYXNrUGFuZWxLaW5kIiwiVGFza0dyb3VwIiwiaWQiLCJfbGFiZWwiLCJfaWQiLCJDbGVhbiIsIkJ1aWxkIiwiUmVidWlsZCIsIlRlc3QiLCJQcm9jZXNzRXhlY3V0aW9uIiwicHJvY2VzcyIsInZhcmcxIiwidmFyZzIiLCJfcHJvY2VzcyIsIl9hcmdzIiwiX29wdGlvbnMiLCJhcmdzIiwiY29tcHV0ZUlkIiwiU2hlbGxFeGVjdXRpb24iLCJhcmcwIiwiYXJnMSIsImFyZzIiLCJfY29tbWFuZCIsIl9jb21tYW5kTGluZSIsImNvbW1hbmRMaW5lIiwiU2hlbGxRdW90aW5nIiwiVGFza1Njb3BlIiwiVGFzayIsImRlZmluaXRpb24iLCJhcmczIiwiYXJnNCIsImFyZzUiLCJhcmc2IiwicHJvYmxlbU1hdGNoZXJzIiwiZXhlY3V0aW9uIiwiR2xvYmFsIiwiV29ya3NwYWNlIiwiX3Byb2JsZW1NYXRjaGVycyIsIl9oYXNEZWZpbmVkTWF0Y2hlcnMiLCJfaXNCYWNrZ3JvdW5kIiwiX19pZCIsImNsZWFyIiwiX3Njb3BlIiwiX2RlZmluaXRpb24iLCJfZXhlY3V0aW9uIiwidHlwZSIsInNjb3BlIiwiX25hbWUiLCJoYXNEZWZpbmVkTWF0Y2hlcnMiLCJpc0JhY2tncm91bmQiLCJfc291cmNlIiwiZ3JvdXAiLCJfZ3JvdXAiLCJwcmVzZW50YXRpb25PcHRpb25zIiwiX3ByZXNlbnRhdGlvbk9wdGlvbnMiLCJQcm9ncmVzc0xvY2F0aW9uIiwiVHJlZUl0ZW0iLCJjb2xsYXBzaWJsZVN0YXRlIiwiVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlIiwiTm9uZSIsInJlc291cmNlVXJpIiwiVGhlbWVJY29uIiwiRmlsZSIsIkZvbGRlciIsIlRoZW1lQ29sb3IiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiUmVsYXRpdmVQYXR0ZXJuIiwiYmFzZSIsInBhdHRlcm4iLCJmc1BhdGgiLCJwYXRoVG9SZWxhdGl2ZSIsInRvIiwicmVsYXRpdmUiLCJCcmVha3BvaW50IiwiZW5hYmxlZCIsImNvbmRpdGlvbiIsImhpdENvbmRpdGlvbiIsImxvZ01lc3NhZ2UiLCJTb3VyY2VCcmVha3BvaW50IiwiRnVuY3Rpb25CcmVha3BvaW50IiwiZnVuY3Rpb25OYW1lIiwiRGVidWdBZGFwdGVyRXhlY3V0YWJsZSIsIkxvZ0xldmVsIiwiRmlsZUNoYW5nZVR5cGUiLCJGaWxlU3lzdGVtRXJyb3IiLCJ1cmlPck1lc3NhZ2UiLCJ0ZXJtaW5hdG9yIiwic2V0UHJvdG90eXBlT2YiLCJwcm90b3R5cGUiLCJjYXB0dXJlU3RhY2tUcmFjZSIsIkZpbGVFeGlzdHMiLCJtZXNzYWdlT3JVcmkiLCJGaWxlTm90Rm91bmQiLCJGaWxlTm90QURpcmVjdG9yeSIsIkZpbGVJc0FEaXJlY3RvcnkiLCJOb1Blcm1pc3Npb25zIiwiVW5hdmFpbGFibGUiLCJGb2xkaW5nUmFuZ2UiLCJGb2xkaW5nUmFuZ2VLaW5kIiwiQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGUiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0MsRSxDQUNBO0FBQ0E7O0FBQ0EsTUFBTUMsTUFBTSxHQUFHQyxPQUFPLENBQUMs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QUFDLFFBQUQsQ0FBVixHQUF1QixDQUF4QixDQUFWLEdBQXVDLFFBQXZDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFdBQUQsQ0FBVixHQUEwQixDQUEzQixDQUFWLEdBQTBDLFdBQTFDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFNBQUQsQ0FBVixHQUF3QixDQUF6QixDQUFWLEdBQXdDLFNBQXhDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLE9BQUQsQ0FBVixHQUFzQixDQUF2QixDQUFWLEdBQXNDLE9BQXRDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFFBQUQsQ0FBVixHQUF1QixDQUF4QixDQUFWLEdBQXVDLFFBQXZDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFVBQUQsQ0FBVixHQUF5QixDQUExQixDQUFWLEdBQXlDLFVBQXpDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLE9BQUQsQ0FBVixHQUFzQixDQUF2QixDQUFWLEdBQXNDLE9BQXRDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLGFBQUQsQ0FBVixHQUE0QixDQUE3QixDQUFWLEdBQTRDLGFBQTVDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLE1BQUQsQ0FBVixHQUFxQixDQUF0QixDQUFWLEdBQXFDLE1BQXJDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFdBQUQsQ0FBVixHQUEwQixFQUEzQixDQUFWLEdBQTJDLFdBQTNDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFVBQUQsQ0FBVixHQUF5QixFQUExQixDQUFWLEdBQTBDLFVBQTFDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFVBQUQsQ0FBVixHQUF5QixFQUExQixDQUFWLEdBQTBDLFVBQTFDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFVBQUQsQ0FBVixHQUF5QixFQUExQixDQUFWLEdBQTBDLFVBQTFDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFFBQUQsQ0FBVixHQUF1QixFQUF4QixDQUFWLEdBQXdDLFFBQXhDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFFBQUQsQ0FBVixHQUF1QixFQUF4QixDQUFWLEdBQXdDLFFBQXhDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFNBQUQsQ0FBVixHQUF3QixFQUF6QixDQUFWLEdBQXlDLFNBQXpDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLE9BQUQsQ0FBVixHQUFzQixFQUF2QixDQUFWLEdBQXVDLE9BQXZDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFFBQUQsQ0FBVixHQUF1QixFQUF4QixDQUFWLEdBQXdDLFFBQXhDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLEtBQUQsQ0FBVixHQUFvQixFQUFyQixDQUFWLEdBQXFDLEtBQXJDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLE1BQUQsQ0FBVixHQUFxQixFQUF0QixDQUFWLEdBQXNDLE1BQXRDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFlBQUQsQ0FBVixHQUEyQixFQUE1QixDQUFWLEdBQTRDLFlBQTVDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFFBQUQsQ0FBVixHQUF1QixFQUF4QixDQUFWLEdBQXdDLFFBQXhDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLE9BQUQsQ0FBVixHQUFzQixFQUF2QixDQUFWLEdBQXVDLE9BQXZDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLFVBQUQsQ0FBVixHQUF5QixFQUExQixDQUFWLEdBQTBDLFVBQTFDO0FBQ0FBLElBQUFBLFVBQVUsQ0FBQ0EsVUFBVSxDQUFDLGVBQUQsQ0FBVixHQUE4QixFQUEvQixDQUFWLEdBQStDLGVBQS9DO0FBQ0gsR0EzQkQsRUEyQkdBLFVBQVUsR0FBR3pKLHFCQUFxQixDQUFDeUosVUFBdEIsS0FBcUN6SixxQkFBcUIsQ0FBQ3lKLFVBQXRCLEdBQW1DLEVBQXhFLENBM0JoQjs7QUE0QkEsUUFBTUMsaUJBQU4sQ0FBd0I7QUFDcEJySixJQUFBQSxXQUFXLENBQUN3SCxJQUFELEVBQU8wQixJQUFQLEVBQWFJLGdCQUFiLEVBQStCQyxhQUEvQixFQUE4Q0MsYUFBOUMsRUFBNkQ7QUFDcEUsV0FBS2hDLElBQUwsR0FBWUEsSUFBWjtBQUNBLFdBQUswQixJQUFMLEdBQVlBLElBQVo7QUFDQSxXQUFLTSxhQUFMLEdBQXFCQSxhQUFyQjs7QUFDQSxVQUFJLE9BQU9GLGdCQUFQLEtBQTRCLFFBQWhDLEVBQTBDO0FBQ3RDLGFBQUtFLGFBQUwsR0FBcUJGLGdCQUFyQjtBQUNIOztBQUNELFVBQUlDLGFBQWEsWUFBWTNCLFFBQTdCLEVBQXVDO0FBQ25DLGFBQUtPLFFBQUwsR0FBZ0JvQixhQUFoQjtBQUNILE9BRkQsTUFHSyxJQUFJRCxnQkFBZ0IsWUFBWXBILEtBQWhDLEVBQXVDO0FBQ3hDLGFBQUtpRyxRQUFMLEdBQWdCLElBQUlQLFFBQUosQ0FBYTJCLGFBQWIsRUFBNEJELGdCQUE1QixDQUFoQjtBQUNIO0FBQ0o7O0FBQ0RySCxJQUFBQSxNQUFNLEdBQUc7QUFDTCxhQUFPO0FBQ0h1RixRQUFBQSxJQUFJLEVBQUUsS0FBS0EsSUFEUjtBQUVIMEIsUUFBQUEsSUFBSSxFQUFFRSxVQUFVLENBQUMsS0FBS0YsSUFBTixDQUZiO0FBR0hmLFFBQUFBLFFBQVEsRUFBRSxLQUFLQSxRQUhaO0FBSUhxQixRQUFBQSxhQUFhLEVBQUUsS0FBS0E7QUFKakIsT0FBUDtBQU1IOztBQXRCbUI7O0FBd0J4QjdKLEVBQUFBLHFCQUFxQixDQUFDMEosaUJBQXRCLEdBQTBDQSxpQkFBMUM7O0FBQ0EsUUFBTUksa0JBQU4sU0FBaUNKLGlCQUFqQyxDQUFtRDtBQUMvQ3JKLElBQUFBLFdBQVcsQ0FBQ3dILElBQUQsRUFBTzBCLElBQVAsRUFBYU0sYUFBYixFQUE0QnJCLFFBQTVCLEVBQXNDO0FBQzdDLFlBQU1YLElBQU4sRUFBWTBCLElBQVosRUFBa0JNLGFBQWxCLEVBQWlDckIsUUFBakM7QUFDQSxXQUFLdUIsUUFBTCxHQUFnQixFQUFoQjtBQUNBLFdBQUtDLGFBQUwsR0FBcUJ4QixRQUFRLENBQUNsRSxLQUE5QjtBQUNIOztBQUw4Qzs7QUFPbkR0RSxFQUFBQSxxQkFBcUIsQ0FBQzhKLGtCQUF0QixHQUEyQ0Esa0JBQTNDO0FBQ0EsTUFBSUcsaUJBQUo7O0FBQ0EsR0FBQyxVQUFVQSxpQkFBVixFQUE2QjtBQUMxQkEsSUFBQUEsaUJBQWlCLENBQUNBLGlCQUFpQixDQUFDLFdBQUQsQ0FBakIsR0FBaUMsQ0FBbEMsQ0FBakIsR0FBd0QsV0FBeEQ7QUFDQUEsSUFBQUEsaUJBQWlCLENBQUNBLGlCQUFpQixDQUFDLFFBQUQsQ0FBakIsR0FBOEIsQ0FBL0IsQ0FBakIsR0FBcUQsUUFBckQ7QUFDSCxHQUhELEVBR0dBLGlCQUFpQixHQUFHaksscUJBQXFCLENBQUNpSyxpQkFBdEIsS0FBNENqSyxxQkFBcUIsQ0FBQ2lLLGlCQUF0QixHQUEwQyxFQUF0RixDQUh2Qjs7QUFJQSxRQUFNQyxVQUFOLENBQWlCO0FBQ2I3SixJQUFBQSxXQUFXLENBQUM4SixLQUFELEVBQVFaLElBQVIsRUFBYztBQUNyQixXQUFLWSxLQUFMLEdBQWFBLEtBQWI7QUFDQSxXQUFLWixJQUFMLEdBQVlBLElBQVo7QUFDSDs7QUFKWTs7QUFNakJ2SixFQUFBQSxxQkFBcUIsQ0FBQ2tLLFVBQXRCLEdBQW1DQSxVQUFuQzs7QUFDQSxRQUFNRSxjQUFOLENBQXFCO0FBQ2pCL0osSUFBQUEsV0FBVyxDQUFDWCxLQUFELEVBQVE7QUFDZixXQUFLQSxLQUFMLEdBQWFBLEtBQWI7QUFDSDs7QUFDRDJLLElBQUFBLE1BQU0sQ0FBQ0MsS0FBRCxFQUFRO0FBQ1YsYUFBTyxJQUFJRixjQUFKLENBQW1CLEtBQUsxSyxLQUFMLEdBQWEsS0FBS0EsS0FBTCxHQUFhMEssY0FBYyxDQUFDRyxHQUE1QixHQUFrQ0QsS0FBL0MsR0FBdURBLEtBQTFFLENBQVA7QUFDSDs7QUFDRHBILElBQUFBLFFBQVEsQ0FBQ3ZCLEtBQUQsRUFBUTtBQUNaLGFBQU8sS0FBS2pDLEtBQUwsS0FBZWlDLEtBQUssQ0FBQ2pDLEtBQXJCLElBQThCSSxTQUFTLENBQUMwSyxjQUFWLENBQXlCQyxVQUF6QixDQUFvQzlJLEtBQUssQ0FBQ2pDLEtBQTFDLEVBQWlELEtBQUtBLEtBQUwsR0FBYTBLLGNBQWMsQ0FBQ0csR0FBN0UsQ0FBckM7QUFDSDs7QUFUZ0I7O0FBV3JCSCxFQUFBQSxjQUFjLENBQUNHLEdBQWYsR0FBcUIsR0FBckI7QUFDQUgsRUFBQUEsY0FBYyxDQUFDTSxLQUFmLEdBQXVCLElBQUlOLGNBQUosQ0FBbUIsRUFBbkIsQ0FBdkI7QUFDQUEsRUFBQUEsY0FBYyxDQUFDTyxRQUFmLEdBQTBCUCxjQUFjLENBQUNNLEtBQWYsQ0FBcUJMLE1BQXJCLENBQTRCLFVBQTVCLENBQTFCO0FBQ0FELEVBQUFBLGNBQWMsQ0FBQ1EsUUFBZixHQUEwQlIsY0FBYyxDQUFDTSxLQUFmLENBQXFCTCxNQUFyQixDQUE0QixVQUE1QixDQUExQjtBQUNBRCxFQUFBQSxjQUFjLENBQUNTLGVBQWYsR0FBaUNULGNBQWMsQ0FBQ1EsUUFBZixDQUF3QlAsTUFBeEIsQ0FBK0IsU0FBL0IsQ0FBakM7QUFDQUQsRUFBQUEsY0FBYyxDQUFDVSxjQUFmLEdBQWdDVixjQUFjLENBQUNRLFFBQWYsQ0FBd0JQLE1BQXhCLENBQStCLFFBQS9CLENBQWhDO0FBQ0FELEVBQUFBLGNBQWMsQ0FBQ1csZUFBZixHQUFpQ1gsY0FBYyxDQUFDUSxRQUFmLENBQXdCUCxNQUF4QixDQUErQixTQUEvQixDQUFqQztBQUNBRCxFQUFBQSxjQUFjLENBQUNZLE1BQWYsR0FBd0JaLGNBQWMsQ0FBQ00sS0FBZixDQUFxQkwsTUFBckIsQ0FBNEIsUUFBNUIsQ0FBeEI7QUFDQUQsRUFBQUEsY0FBYyxDQUFDYSxxQkFBZixHQUF1Q2IsY0FBYyxDQUFDWSxNQUFmLENBQXNCWCxNQUF0QixDQUE2QixpQkFBN0IsQ0FBdkM7QUFDQXJLLEVBQUFBLHFCQUFxQixDQUFDb0ssY0FBdEIsR0FBdUNBLGNBQXZDOztBQUNBLFFBQU1jLFFBQU4sQ0FBZTtBQUNYN0ssSUFBQUEsV0FBVyxDQUFDaUUsS0FBRCxFQUFRNkcsT0FBUixFQUFpQjtBQUN4QixXQUFLN0csS0FBTCxHQUFhQSxLQUFiO0FBQ0EsV0FBSzZHLE9BQUwsR0FBZUEsT0FBZjtBQUNIOztBQUNhLFFBQVZDLFVBQVUsR0FBRztBQUNiLGFBQU8sQ0FBQyxDQUFDLEtBQUtELE9BQWQ7QUFDSDs7QUFQVTs7QUFTZm5MLEVBQUFBLHFCQUFxQixDQUFDa0wsUUFBdEIsR0FBaUNBLFFBQWpDOztBQUNBLFFBQU1HLGNBQU4sQ0FBcUI7QUFDakJoTCxJQUFBQSxXQUFXLENBQUNYLEtBQUQsRUFBUTtBQUNmLFdBQUtBLEtBQUwsR0FBYUEsS0FBSyxJQUFJLEVBQXRCO0FBQ0g7O0FBQ0Q0SCxJQUFBQSxVQUFVLENBQUM1SCxLQUFELEVBQVE7QUFDZDtBQUNBLFdBQUtBLEtBQUwsSUFBY0EsS0FBSyxDQUFDK0UsT0FBTixDQUFjLHVCQUFkLEVBQXVDLE1BQXZDLENBQWQ7QUFDQSxhQUFPLElBQVA7QUFDSDs7QUFDRDZHLElBQUFBLGNBQWMsQ0FBQzVMLEtBQUQsRUFBUTtBQUNsQixXQUFLQSxLQUFMLElBQWNBLEtBQWQ7QUFDQSxhQUFPLElBQVA7QUFDSDs7QUFDRDZMLElBQUFBLGVBQWUsQ0FBQ3pDLElBQUQsRUFBTzBDLFFBQVEsR0FBRyxFQUFsQixFQUFzQjtBQUNqQyxXQUFLOUwsS0FBTCxJQUFjLE9BQWQ7QUFDQSxXQUFLQSxLQUFMLElBQWM4TCxRQUFkO0FBQ0EsV0FBSzlMLEtBQUwsSUFBYyxJQUFkO0FBQ0EsV0FBS0EsS0FBTCxJQUFjb0osSUFBZDtBQUNBLFdBQUtwSixLQUFMLElBQWMsU0FBZDtBQUNBLGFBQU8sSUFBUDtBQUNIOztBQXBCZ0I7O0FBc0JyQk0sRUFBQUEscUJBQXFCLENBQUNxTCxjQUF0QixHQUF1Q0EsY0FBdkM7O0FBQ0EsUUFBTUksb0JBQU4sQ0FBMkI7QUFDdkJwTCxJQUFBQSxXQUFXLENBQUNxTCxLQUFELEVBQVFDLGFBQVIsRUFBdUI7QUFDOUIsV0FBS0QsS0FBTCxHQUFhQSxLQUFiO0FBQ0EsV0FBS0MsYUFBTCxHQUFxQkEsYUFBckI7QUFDSDs7QUFKc0I7O0FBTTNCM0wsRUFBQUEscUJBQXFCLENBQUN5TCxvQkFBdEIsR0FBNkNBLG9CQUE3Qzs7QUFDQSxRQUFNRyxvQkFBTixDQUEyQjtBQUN2QnZMLElBQUFBLFdBQVcsQ0FBQ3FMLEtBQUQsRUFBUUMsYUFBUixFQUF1QjtBQUM5QixXQUFLRCxLQUFMLEdBQWFBLEtBQWI7QUFDQSxXQUFLQyxhQUFMLEdBQXFCQSxhQUFyQjtBQUNBLFdBQUtFLFVBQUwsR0FBa0IsRUFBbEI7QUFDSDs7QUFMc0I7O0FBTzNCN0wsRUFBQUEscUJBQXFCLENBQUM0TCxvQkFBdEIsR0FBNkNBLG9CQUE3Qzs7QUFDQSxRQUFNRSxhQUFOLENBQW9CO0FBQ2hCekwsSUFBQUEsV0FBVyxHQUFHO0FBQ1YsV0FBSzBMLFVBQUwsR0FBa0IsRUFBbEI7QUFDSDs7QUFIZTs7QUFLcEIvTCxFQUFBQSxxQkFBcUIsQ0FBQzhMLGFBQXRCLEdBQXNDQSxhQUF0QztBQUNBLE1BQUlFLHFCQUFKOztBQUNBLEdBQUMsVUFBVUEscUJBQVYsRUFBaUM7QUFDOUJBLElBQUFBLHFCQUFxQixDQUFDQSxxQkFBcUIsQ0FBQyxRQUFELENBQXJCLEdBQWtDLENBQW5DLENBQXJCLEdBQTZELFFBQTdEO0FBQ0FBLElBQUFBLHFCQUFxQixDQUFDQSxxQkFBcUIsQ0FBQyxrQkFBRCxDQUFyQixHQUE0QyxDQUE3QyxDQUFyQixHQUF1RSxrQkFBdkU7QUFDQUEsSUFBQUEscUJBQXFCLENBQUNBLHFCQUFxQixDQUFDLGlDQUFELENBQXJCLEdBQTJELENBQTVELENBQXJCLEdBQXNGLGlDQUF0RjtBQUNILEdBSkQsRUFJR0EscUJBQXFCLEdBQUdoTSxxQkFBcUIsQ0FBQ2dNLHFCQUF0QixLQUFnRGhNLHFCQUFxQixDQUFDZ00scUJBQXRCLEdBQThDLEVBQTlGLENBSjNCOztBQUtBLE1BQUlDLGtCQUFKOztBQUNBLEdBQUMsVUFBVUEsa0JBQVYsRUFBOEI7QUFDM0JBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxNQUFELENBQWxCLEdBQTZCLENBQTlCLENBQWxCLEdBQXFELE1BQXJEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxRQUFELENBQWxCLEdBQStCLENBQWhDLENBQWxCLEdBQXVELFFBQXZEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxVQUFELENBQWxCLEdBQWlDLENBQWxDLENBQWxCLEdBQXlELFVBQXpEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxhQUFELENBQWxCLEdBQW9DLENBQXJDLENBQWxCLEdBQTRELGFBQTVEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxPQUFELENBQWxCLEdBQThCLENBQS9CLENBQWxCLEdBQXNELE9BQXREO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxVQUFELENBQWxCLEdBQWlDLENBQWxDLENBQWxCLEdBQXlELFVBQXpEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxPQUFELENBQWxCLEdBQThCLENBQS9CLENBQWxCLEdBQXNELE9BQXREO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxXQUFELENBQWxCLEdBQWtDLENBQW5DLENBQWxCLEdBQTBELFdBQTFEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxRQUFELENBQWxCLEdBQStCLENBQWhDLENBQWxCLEdBQXVELFFBQXZEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxVQUFELENBQWxCLEdBQWlDLENBQWxDLENBQWxCLEdBQXlELFVBQXpEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxNQUFELENBQWxCLEdBQTZCLEVBQTlCLENBQWxCLEdBQXNELE1BQXREO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxPQUFELENBQWxCLEdBQThCLEVBQS9CLENBQWxCLEdBQXVELE9BQXZEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxNQUFELENBQWxCLEdBQTZCLEVBQTlCLENBQWxCLEdBQXNELE1BQXREO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxTQUFELENBQWxCLEdBQWdDLEVBQWpDLENBQWxCLEdBQXlELFNBQXpEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxTQUFELENBQWxCLEdBQWdDLEVBQWpDLENBQWxCLEdBQXlELFNBQXpEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxPQUFELENBQWxCLEdBQThCLEVBQS9CLENBQWxCLEdBQXVELE9BQXZEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxNQUFELENBQWxCLEdBQTZCLEVBQTlCLENBQWxCLEdBQXNELE1BQXREO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxXQUFELENBQWxCLEdBQWtDLEVBQW5DLENBQWxCLEdBQTJELFdBQTNEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxRQUFELENBQWxCLEdBQStCLEVBQWhDLENBQWxCLEdBQXdELFFBQXhEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxZQUFELENBQWxCLEdBQW1DLEVBQXBDLENBQWxCLEdBQTRELFlBQTVEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxVQUFELENBQWxCLEdBQWlDLEVBQWxDLENBQWxCLEdBQTBELFVBQTFEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQyxRQUFELENBQWxCLEdBQStCLEVBQWhDLENBQWxCLEdBQXdELFFBQXhEO0FBQ0FBLElBQUFBLGtCQUFrQixDQUFDQSxrQkFBa0Is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LENBQUNBLGdCQUFnQixDQUFDLFNBQUQsQ0FBaEIsR0FBOEIsQ0FBL0IsQ0FBaEIsR0FBb0QsU0FBcEQ7QUFDQUEsSUFBQUEsZ0JBQWdCLENBQUNBLGdCQUFnQixDQUFDLFNBQUQsQ0FBaEIsR0FBOEIsQ0FBL0IsQ0FBaEIsR0FBb0QsU0FBcEQ7QUFDQUEsSUFBQUEsZ0JBQWdCLENBQUNBLGdCQUFnQixDQUFDLFFBQUQsQ0FBaEIsR0FBNkIsQ0FBOUIsQ0FBaEIsR0FBbUQsUUFBbkQ7QUFDSCxHQUpELEVBSUdBLGdCQUFnQixHQUFHdFUscUJBQXFCLENBQUNzVSxnQkFBdEIsS0FBMkN0VSxxQkFBcUIsQ0FBQ3NVLGdCQUF0QixHQUF5QyxFQUFwRixDQUp0QixFQW4vQzhCLENBdy9DOUI7OztBQUNBLE1BQUlDLDZCQUFKOztBQUNBLEdBQUMsVUFBVUEsNkJBQVYsRUFBeUM7QUFDdEM7QUFDUjtBQUNBO0FBQ1FBLElBQUFBLDZCQUE2QixDQUFDQSw2QkFBNkIsQ0FBQyxXQUFELENBQTdCLEdBQTZDLENBQTlDLENBQTdCLEdBQWdGLFdBQWhGO0FBQ0E7QUFDUjtBQUNBOztBQUNRQSxJQUFBQSw2QkFBNkIsQ0FBQ0EsNkJBQTZCLENBQUMsVUFBRCxDQUE3QixHQUE0QyxDQUE3QyxDQUE3QixHQUErRSxVQUEvRTtBQUNILEdBVEQsRUFTR0EsNkJBQTZCLEdBQUd2VSxxQkFBcUIsQ0FBQ3VVLDZCQUF0QixLQUF3RHZVLHFCQUFxQixDQUFDdVUsNkJBQXRCLEdBQXNELEVBQTlHLENBVG5DO0FBVUgsQ0FwZ0RELEVBb2dER3ZVLHFCQUFxQixHQUFHUCxPQUFPLENBQUNPLHFCQUFSLEtBQWtDUCxPQUFPLENBQUNPLHFCQUFSLEdBQWdDLEVBQWxFLENBcGdEM0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbid1c2Ugc3RyaWN0Jztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbi8vIGltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuLy8gdHNsaW50OmRpc2FibGU6YWxsXG5jb25zdCBwYXRoXzEgPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGh0bWxDb250ZW50XzEgPSByZXF1aXJlKFwiLi9odG1sQ29udGVudFwiKTtcbmNvbnN0IHN0cmluZ3NfMSA9IHJlcXVpcmUoXCIuL3N0cmluZ3NcIik7XG5jb25zdCB1cmlfMSA9IHJlcXVpcmUoXCIuL3VyaVwiKTtcbnZhciB2c2NNb2NrRXh0SG9zdGVkVHlwZXM7XG4oZnVuY3Rpb24gKHZzY01vY2tFeHRIb3N0ZWRUeXBlcykge1xuICAgIC8vIHRzbGludDpkaXNhYmxlOmFsbFxuICAgIGNvbnN0IGlsbGVnYWxBcmd1bWVudCA9IChtc2cgPSAnSWxsZWdhbCBBcmd1bWVudCcpID0+IG5ldyBFcnJvcihtc2cpO1xuICAgIGNsYXNzIERpc3Bvc2FibGUge1xuICAgICAgICBjb25zdHJ1Y3RvcihjYWxsT25EaXNwb3NlKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWxsT25EaXNwb3NlID0gY2FsbE9uRGlzcG9zZTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgZnJvbSguLi5kaXNwb3NhYmxlcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcG9zYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZGlzcG9zYWJsZSBvZiBkaXNwb3NhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3Bvc2FibGUgJiYgdHlwZW9mIGRpc3Bvc2FibGUuZGlzcG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRpc3Bvc2FibGVzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2NhbGxPbkRpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWxsT25EaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FsbE9uRGlzcG9zZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRGlzcG9zYWJsZSA9IERpc3Bvc2FibGU7XG4gICAgY2xhc3MgUG9zaXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihsaW5lLCBjaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIGlmIChsaW5lIDwgMCkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbGluZSBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoYXJhY3RlciA8IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2NoYXJhY3RlciBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbGluZSA9IGxpbmU7XG4gICAgICAgICAgICB0aGlzLl9jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIE1pbiguLi5wb3NpdGlvbnMpIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSBwb3NpdGlvbnMucG9wKCk7XG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIHBvc2l0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChwLmlzQmVmb3JlKHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBNYXgoLi4ucG9zaXRpb25zKSB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gcG9zaXRpb25zLnBvcCgpO1xuICAgICAgICAgICAgZm9yIChsZXQgcCBvZiBwb3NpdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAocC5pc0FmdGVyKHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpc1Bvc2l0aW9uKG90aGVyKSB7XG4gICAgICAgICAgICBpZiAoIW90aGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG90aGVyIGluc3RhbmNlb2YgUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gb3RoZXI7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbmUgPT09ICdudW1iZXInICYmIHR5cGVvZiBjaGFyYWN0ZXIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGxpbmUoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGluZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgY2hhcmFjdGVyKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoYXJhY3RlcjtcbiAgICAgICAgfVxuICAgICAgICBpc0JlZm9yZShvdGhlcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xpbmUgPCBvdGhlci5fbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG90aGVyLl9saW5lIDwgdGhpcy5fbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jaGFyYWN0ZXIgPCBvdGhlci5fY2hhcmFjdGVyO1xuICAgICAgICB9XG4gICAgICAgIGlzQmVmb3JlT3JFcXVhbChvdGhlcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xpbmUgPCBvdGhlci5fbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG90aGVyLl9saW5lIDwgdGhpcy5fbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jaGFyYWN0ZXIgPD0gb3RoZXIuX2NoYXJhY3RlcjtcbiAgICAgICAgfVxuICAgICAgICBpc0FmdGVyKG90aGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gIXRoaXMuaXNCZWZvcmVPckVxdWFsKG90aGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpc0FmdGVyT3JFcXVhbChvdGhlcikge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmlzQmVmb3JlKG90aGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpc0VxdWFsKG90aGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGluZSA9PT0gb3RoZXIuX2xpbmUgJiYgdGhpcy5fY2hhcmFjdGVyID09PSBvdGhlci5fY2hhcmFjdGVyO1xuICAgICAgICB9XG4gICAgICAgIGNvbXBhcmVUbyhvdGhlcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xpbmUgPCBvdGhlci5fbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuX2xpbmUgPiBvdGhlci5saW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBlcXVhbCBsaW5lXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NoYXJhY3RlciA8IG90aGVyLl9jaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9jaGFyYWN0ZXIgPiBvdGhlci5fY2hhcmFjdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZXF1YWwgbGluZSBhbmQgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0cmFuc2xhdGUobGluZURlbHRhT3JDaGFuZ2UsIGNoYXJhY3RlckRlbHRhID0gMCkge1xuICAgICAgICAgICAgaWYgKGxpbmVEZWx0YU9yQ2hhbmdlID09PSBudWxsIHx8IGNoYXJhY3RlckRlbHRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgbGluZURlbHRhO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaW5lRGVsdGFPckNoYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBsaW5lRGVsdGEgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIGxpbmVEZWx0YU9yQ2hhbmdlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGxpbmVEZWx0YSA9IGxpbmVEZWx0YU9yQ2hhbmdlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGluZURlbHRhID0gdHlwZW9mIGxpbmVEZWx0YU9yQ2hhbmdlLmxpbmVEZWx0YSA9PT0gJ251bWJlcicgPyBsaW5lRGVsdGFPckNoYW5nZS5saW5lRGVsdGEgOiAwO1xuICAgICAgICAgICAgICAgIGNoYXJhY3RlckRlbHRhID0gdHlwZW9mIGxpbmVEZWx0YU9yQ2hhbmdlLmNoYXJhY3RlckRlbHRhID09PSAnbnVtYmVyJyA/IGxpbmVEZWx0YU9yQ2hhbmdlLmNoYXJhY3RlckRlbHRhIDogMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsaW5lRGVsdGEgPT09IDAgJiYgY2hhcmFjdGVyRGVsdGEgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUG9zaXRpb24odGhpcy5saW5lICsgbGluZURlbHRhLCB0aGlzLmNoYXJhY3RlciArIGNoYXJhY3RlckRlbHRhKTtcbiAgICAgICAgfVxuICAgICAgICB3aXRoKGxpbmVPckNoYW5nZSwgY2hhcmFjdGVyID0gdGhpcy5jaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIGlmIChsaW5lT3JDaGFuZ2UgPT09IG51bGwgfHwgY2hhcmFjdGVyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgbGluZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGluZU9yQ2hhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGxpbmUgPSB0aGlzLmxpbmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgbGluZU9yQ2hhbmdlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGxpbmUgPSBsaW5lT3JDaGFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBsaW5lID0gdHlwZW9mIGxpbmVPckNoYW5nZS5saW5lID09PSAnbnVtYmVyJyA/IGxpbmVPckNoYW5nZS5saW5lIDogdGhpcy5saW5lO1xuICAgICAgICAgICAgICAgIGNoYXJhY3RlciA9IHR5cGVvZiBsaW5lT3JDaGFuZ2UuY2hhcmFjdGVyID09PSAnbnVtYmVyJyA/IGxpbmVPckNoYW5nZS5jaGFyYWN0ZXIgOiB0aGlzLmNoYXJhY3RlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsaW5lID09PSB0aGlzLmxpbmUgJiYgY2hhcmFjdGVyID09PSB0aGlzLmNoYXJhY3Rlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQb3NpdGlvbihsaW5lLCBjaGFyYWN0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGxpbmU6IHRoaXMubGluZSwgY2hhcmFjdGVyOiB0aGlzLmNoYXJhY3RlciB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Qb3NpdGlvbiA9IFBvc2l0aW9uO1xuICAgIGNsYXNzIFJhbmdlIHtcbiAgICAgICAgY29uc3RydWN0b3Ioc3RhcnRMaW5lT3JTdGFydCwgc3RhcnRDb2x1bW5PckVuZCwgZW5kTGluZSwgZW5kQ29sdW1uKSB7XG4gICAgICAgICAgICBsZXQgc3RhcnQ7XG4gICAgICAgICAgICBsZXQgZW5kO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGFydExpbmVPclN0YXJ0ID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygc3RhcnRDb2x1bW5PckVuZCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIGVuZExpbmUgPT09ICdudW1iZXInICYmIHR5cGVvZiBlbmRDb2x1bW4gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSBuZXcgUG9zaXRpb24oc3RhcnRMaW5lT3JTdGFydCwgc3RhcnRDb2x1bW5PckVuZCk7XG4gICAgICAgICAgICAgICAgZW5kID0gbmV3IFBvc2l0aW9uKGVuZExpbmUsIGVuZENvbHVtbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzdGFydExpbmVPclN0YXJ0IGluc3RhbmNlb2YgUG9zaXRpb24gJiYgc3RhcnRDb2x1bW5PckVuZCBpbnN0YW5jZW9mIFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSBzdGFydExpbmVPclN0YXJ0O1xuICAgICAgICAgICAgICAgIGVuZCA9IHN0YXJ0Q29sdW1uT3JFbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN0YXJ0IHx8ICFlbmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYXJndW1lbnRzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RhcnQuaXNCZWZvcmUoZW5kKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5kID0gZW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnQgPSBlbmQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5kID0gc3RhcnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGlzUmFuZ2UodGhpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGluZyBpbnN0YW5jZW9mIFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFBvc2l0aW9uLmlzUG9zaXRpb24odGhpbmcuc3RhcnQpXG4gICAgICAgICAgICAgICAgJiYgUG9zaXRpb24uaXNQb3NpdGlvbih0aGluZy5lbmQpO1xuICAgICAgICB9XG4gICAgICAgIGdldCBzdGFydCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGFydDtcbiAgICAgICAgfVxuICAgICAgICBnZXQgZW5kKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VuZDtcbiAgICAgICAgfVxuICAgICAgICBjb250YWlucyhwb3NpdGlvbk9yUmFuZ2UpIHtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbk9yUmFuZ2UgaW5zdGFuY2VvZiBSYW5nZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRhaW5zKHBvc2l0aW9uT3JSYW5nZS5fc3RhcnQpXG4gICAgICAgICAgICAgICAgICAgICYmIHRoaXMuY29udGFpbnMocG9zaXRpb25PclJhbmdlLl9lbmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocG9zaXRpb25PclJhbmdlIGluc3RhbmNlb2YgUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb25PclJhbmdlLmlzQmVmb3JlKHRoaXMuX3N0YXJ0KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9lbmQuaXNCZWZvcmUocG9zaXRpb25PclJhbmdlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlzRXF1YWwob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGFydC5pc0VxdWFsKG90aGVyLl9zdGFydCkgJiYgdGhpcy5fZW5kLmlzRXF1YWwob3RoZXIuX2VuZCk7XG4gICAgICAgIH1cbiAgICAgICAgaW50ZXJzZWN0aW9uKG90aGVyKSB7XG4gICAgICAgICAgICBsZXQgc3RhcnQgPSBQb3NpdGlvbi5NYXgob3RoZXIuc3RhcnQsIHRoaXMuX3N0YXJ0KTtcbiAgICAgICAgICAgIGxldCBlbmQgPSBQb3NpdGlvbi5NaW4ob3RoZXIuZW5kLCB0aGlzLl9lbmQpO1xuICAgICAgICAgICAgaWYgKHN0YXJ0LmlzQWZ0ZXIoZW5kKSkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaGFwcGVucyB3aGVuIHRoZXJlIGlzIG5vIG92ZXJsYXA6XG4gICAgICAgICAgICAgICAgLy8gfC0tLS0tfFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgIHwtLS0tfFxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICB9XG4gICAgICAgIHVuaW9uKG90aGVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb250YWlucyhvdGhlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG90aGVyLmNvbnRhaW5zKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHN0YXJ0ID0gUG9zaXRpb24uTWluKG90aGVyLnN0YXJ0LCB0aGlzLl9zdGFydCk7XG4gICAgICAgICAgICBsZXQgZW5kID0gUG9zaXRpb24uTWF4KG90aGVyLmVuZCwgdGhpcy5lbmQpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgaXNFbXB0eSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGFydC5pc0VxdWFsKHRoaXMuX2VuZCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGlzU2luZ2xlTGluZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGFydC5saW5lID09PSB0aGlzLl9lbmQubGluZTtcbiAgICAgICAgfVxuICAgICAgICB3aXRoKHN0YXJ0T3JDaGFuZ2UsIGVuZCA9IHRoaXMuZW5kKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRPckNoYW5nZSA9PT0gbnVsbCB8fCBlbmQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBzdGFydDtcbiAgICAgICAgICAgIGlmICghc3RhcnRPckNoYW5nZSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0ID0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFBvc2l0aW9uLmlzUG9zaXRpb24oc3RhcnRPckNoYW5nZSkpIHtcbiAgICAgICAgICAgICAgICBzdGFydCA9IHN0YXJ0T3JDaGFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGFydCA9IHN0YXJ0T3JDaGFuZ2Uuc3RhcnQgfHwgdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICBlbmQgPSBzdGFydE9yQ2hhbmdlLmVuZCB8fCB0aGlzLmVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGFydC5pc0VxdWFsKHRoaXMuX3N0YXJ0KSAmJiBlbmQuaXNFcXVhbCh0aGlzLmVuZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIFt0aGlzLnN0YXJ0LCB0aGlzLmVuZF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlJhbmdlID0gUmFuZ2U7XG4gICAgY2xhc3MgU2VsZWN0aW9uIGV4dGVuZHMgUmFuZ2Uge1xuICAgICAgICBjb25zdHJ1Y3RvcihhbmNob3JMaW5lT3JBbmNob3IsIGFuY2hvckNvbHVtbk9yQWN0aXZlLCBhY3RpdmVMaW5lLCBhY3RpdmVDb2x1bW4pIHtcbiAgICAgICAgICAgIGxldCBhbmNob3I7XG4gICAgICAgICAgICBsZXQgYWN0aXZlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhbmNob3JMaW5lT3JBbmNob3IgPT09ICdudW1iZXInICYmIHR5cGVvZiBhbmNob3JDb2x1bW5PckFjdGl2ZSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIGFjdGl2ZUxpbmUgPT09ICdudW1iZXInICYmIHR5cGVvZiBhY3RpdmVDb2x1bW4gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yID0gbmV3IFBvc2l0aW9uKGFuY2hvckxpbmVPckFuY2hvciwgYW5jaG9yQ29sdW1uT3JBY3RpdmUpO1xuICAgICAgICAgICAgICAgIGFjdGl2ZSA9IG5ldyBQb3NpdGlvbihhY3RpdmVMaW5lLCBhY3RpdmVDb2x1bW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYW5jaG9yTGluZU9yQW5jaG9yIGluc3RhbmNlb2YgUG9zaXRpb24gJiYgYW5jaG9yQ29sdW1uT3JBY3RpdmUgaW5zdGFuY2VvZiBQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGFuY2hvciA9IGFuY2hvckxpbmVPckFuY2hvcjtcbiAgICAgICAgICAgICAgICBhY3RpdmUgPSBhbmNob3JDb2x1bW5PckFjdGl2ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYW5jaG9yIHx8ICFhY3RpdmUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYXJndW1lbnRzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdXBlcihhbmNob3IsIGFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9hbmNob3IgPSBhbmNob3I7XG4gICAgICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGlzU2VsZWN0aW9uKHRoaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpbmcgaW5zdGFuY2VvZiBTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gUmFuZ2UuaXNSYW5nZSh0aGluZylcbiAgICAgICAgICAgICAgICAmJiBQb3NpdGlvbi5pc1Bvc2l0aW9uKHRoaW5nLmFuY2hvcilcbiAgICAgICAgICAgICAgICAmJiBQb3NpdGlvbi5pc1Bvc2l0aW9uKHRoaW5nLmFjdGl2ZSlcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2YgdGhpbmcuaXNSZXZlcnNlZCA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICB9XG4gICAgICAgIGdldCBhbmNob3IoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYW5jaG9yO1xuICAgICAgICB9XG4gICAgICAgIGdldCBhY3RpdmUoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBpc1JldmVyc2VkKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FuY2hvciA9PT0gdGhpcy5fZW5kO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHRoaXMuc3RhcnQsXG4gICAgICAgICAgICAgICAgZW5kOiB0aGlzLmVuZCxcbiAgICAgICAgICAgICAgICBhY3RpdmU6IHRoaXMuYWN0aXZlLFxuICAgICAgICAgICAgICAgIGFuY2hvcjogdGhpcy5hbmNob3JcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNlbGVjdGlvbiA9IFNlbGVjdGlvbjtcbiAgICBsZXQgRW5kT2ZMaW5lO1xuICAgIChmdW5jdGlvbiAoRW5kT2ZMaW5lKSB7XG4gICAgICAgIEVuZE9mTGluZVtFbmRPZkxpbmVbXCJMRlwiXSA9IDFdID0gXCJMRlwiO1xuICAgICAgICBFbmRPZkxpbmVbRW5kT2ZMaW5lW1wiQ1JMRlwiXSA9IDJdID0gXCJDUkxGXCI7XG4gICAgfSkoRW5kT2ZMaW5lID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkVuZE9mTGluZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkVuZE9mTGluZSA9IHt9KSk7XG4gICAgY2xhc3MgVGV4dEVkaXQge1xuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgbmV3VGV4dCkge1xuICAgICAgICAgICAgdGhpcy5yYW5nZSA9IHJhbmdlO1xuICAgICAgICAgICAgdGhpcy5uZXdUZXh0ID0gbmV3VGV4dDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgaXNUZXh0RWRpdCh0aGluZykge1xuICAgICAgICAgICAgaWYgKHRoaW5nIGluc3RhbmNlb2YgVGV4dEVkaXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gUmFuZ2UuaXNSYW5nZSh0aGluZylcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2YgdGhpbmcubmV3VGV4dCA9PT0gJ3N0cmluZyc7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIHJlcGxhY2UocmFuZ2UsIG5ld1RleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGV4dEVkaXQocmFuZ2UsIG5ld1RleHQpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBpbnNlcnQocG9zaXRpb24sIG5ld1RleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBUZXh0RWRpdC5yZXBsYWNlKG5ldyBSYW5nZShwb3NpdGlvbiwgcG9zaXRpb24pLCBuZXdUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgZGVsZXRlKHJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm4gVGV4dEVkaXQucmVwbGFjZShyYW5nZSwgJycpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBzZXRFbmRPZkxpbmUoZW9sKSB7XG4gICAgICAgICAgICBsZXQgcmV0ID0gbmV3IFRleHRFZGl0KHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIHJldC5uZXdFb2wgPSBlb2w7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG4gICAgICAgIGdldCByYW5nZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yYW5nZTtcbiAgICAgICAgfVxuICAgICAgICBzZXQgcmFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhUmFuZ2UuaXNSYW5nZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3JhbmdlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9yYW5nZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBuZXdUZXh0KCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX25ld1RleHQgfHwgJyc7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IG5ld1RleHQodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCduZXdUZXh0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9uZXdUZXh0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IG5ld0VvbCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uZXdFb2w7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IG5ld0VvbCh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ25ld0VvbCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbmV3RW9sID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy5yYW5nZSxcbiAgICAgICAgICAgICAgICBuZXdUZXh0OiB0aGlzLm5ld1RleHQsXG4gICAgICAgICAgICAgICAgbmV3RW9sOiB0aGlzLl9uZXdFb2xcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0ID0gVGV4dEVkaXQ7XG4gICAgY2xhc3MgV29ya3NwYWNlRWRpdCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgdGhpcy5fc2VxUG9vbCA9IDA7XG4gICAgICAgICAgICB0aGlzLl9yZXNvdXJjZUVkaXRzID0gW107XG4gICAgICAgICAgICB0aGlzLl90ZXh0RWRpdHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY3JlYXRlUmVzb3VyY2UodXJpOiB2c2NvZGUuVXJpKTogdm9pZCB7XG4gICAgICAgIC8vIFx0dGhpcy5yZW5hbWVSZXNvdXJjZSh1bmRlZmluZWQsIHVyaSk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gZGVsZXRlUmVzb3VyY2UodXJpOiB2c2NvZGUuVXJpKTogdm9pZCB7XG4gICAgICAgIC8vIFx0dGhpcy5yZW5hbWVSZXNvdXJjZSh1cmksIHVuZGVmaW5lZCk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gcmVuYW1lUmVzb3VyY2UoZnJvbTogdnNjb2RlLlVyaSwgdG86IHZzY29kZS5VcmkpOiB2b2lkIHtcbiAgICAgICAgLy8gXHR0aGlzLl9yZXNvdXJjZUVkaXRzLnB1c2goeyBzZXE6IHRoaXMuX3NlcVBvb2wrKywgZnJvbSwgdG8gfSk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gcmVzb3VyY2VFZGl0cygpOiBbdnNjb2RlLlVyaSwgdnNjb2RlLlVyaV1bXSB7XG4gICAgICAgIC8vIFx0cmV0dXJuIHRoaXMuX3Jlc291cmNlRWRpdHMubWFwKCh7IGZyb20sIHRvIH0pID0+ICg8W3ZzY29kZS5VcmksIHZzY29kZS5VcmldPltmcm9tLCB0b10pKTtcbiAgICAgICAgLy8gfVxuICAgICAgICBjcmVhdGVGaWxlKHVyaSwgb3B0aW9ucykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlRmlsZSh1cmksIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJlbmFtZUZpbGUob2xkVXJpLCBuZXdVcmksIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJlcGxhY2UodXJpLCByYW5nZSwgbmV3VGV4dCkge1xuICAgICAgICAgICAgbGV0IGVkaXQgPSBuZXcgVGV4dEVkaXQocmFuZ2UsIG5ld1RleHQpO1xuICAgICAgICAgICAgbGV0IGFycmF5ID0gdGhpcy5nZXQodXJpKTtcbiAgICAgICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgICAgICAgIGFycmF5LnB1c2goZWRpdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcnJheSA9IFtlZGl0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0KHVyaSwgYXJyYXkpO1xuICAgICAgICB9XG4gICAgICAgIGluc2VydChyZXNvdXJjZSwgcG9zaXRpb24sIG5ld1RleHQpIHtcbiAgICAgICAgICAgIHRoaXMucmVwbGFjZShyZXNvdXJjZSwgbmV3IFJhbmdlKHBvc2l0aW9uLCBwb3NpdGlvbiksIG5ld1RleHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZShyZXNvdXJjZSwgcmFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMucmVwbGFjZShyZXNvdXJjZSwgcmFuZ2UsICcnKTtcbiAgICAgICAgfVxuICAgICAgICBoYXModXJpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdGV4dEVkaXRzLmhhcyh1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICAgICAgc2V0KHVyaSwgZWRpdHMpIHtcbiAgICAgICAgICAgIGxldCBkYXRhID0gdGhpcy5fdGV4dEVkaXRzLmdldCh1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0geyBzZXE6IHRoaXMuX3NlcVBvb2wrKywgdXJpLCBlZGl0czogW10gfTtcbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0RWRpdHMuc2V0KHVyaS50b1N0cmluZygpLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZWRpdHMpIHtcbiAgICAgICAgICAgICAgICBkYXRhLmVkaXRzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YS5lZGl0cyA9IGVkaXRzLnNsaWNlKDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGdldCh1cmkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fdGV4dEVkaXRzLmhhcyh1cmkudG9TdHJpbmcoKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgeyBlZGl0cyB9ID0gdGhpcy5fdGV4dEVkaXRzLmdldCh1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICByZXR1cm4gZWRpdHMgPyBlZGl0cy5zbGljZSgpIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMoKSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuX3RleHRFZGl0cy5mb3JFYWNoKHZhbHVlID0+IHJlcy5wdXNoKFt2YWx1ZS51cmksIHZhbHVlLmVkaXRzXSkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcy5zbGljZSgpO1xuICAgICAgICB9XG4gICAgICAgIGFsbEVudHJpZXMoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzKCk7XG4gICAgICAgICAgICAvLyBcdC8vIHVzZSB0aGUgJ3NlcScgdGhlIHdlIGhhdmUgYXNzaWduZWQgd2hlbiBpbnNlcnRpbmdcbiAgICAgICAgICAgIC8vIFx0Ly8gdGhlIG9wZXJhdGlvbiBhbmQgdXNlIHRoYXQgb3JkZXIgaW4gdGhlIHJlc3VsdGluZ1xuICAgICAgICAgICAgLy8gXHQvLyBhcnJheVxuICAgICAgICAgICAgLy8gXHRjb25zdCByZXM6IChbdnNjVXJpLlVSSSwgVGV4dEVkaXRbXV0gfCBbdnNjVXJpLlVSSSx2c2NVcmkuVVJJXSlbXSA9IFtdO1xuICAgICAgICAgICAgLy8gXHR0aGlzLl90ZXh0RWRpdHMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAvLyBcdFx0Y29uc3QgeyBzZXEsIHVyaSwgZWRpdHMgfSA9IHZhbHVlO1xuICAgICAgICAgICAgLy8gXHRcdHJlc1tzZXFdID0gW3VyaSwgZWRpdHNdO1xuICAgICAgICAgICAgLy8gXHR9KTtcbiAgICAgICAgICAgIC8vIFx0dGhpcy5fcmVzb3VyY2VFZGl0cy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgICAgIC8vIFx0XHRjb25zdCB7IHNlcSwgZnJvbSwgdG8gfSA9IHZhbHVlO1xuICAgICAgICAgICAgLy8gXHRcdHJlc1tzZXFdID0gW2Zyb20sIHRvXTtcbiAgICAgICAgICAgIC8vIFx0fSk7XG4gICAgICAgICAgICAvLyBcdHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHNpemUoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdGV4dEVkaXRzLnNpemUgKyB0aGlzLl9yZXNvdXJjZUVkaXRzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLldvcmtzcGFjZUVkaXQgPSBXb3Jrc3BhY2VFZGl0O1xuICAgIGNsYXNzIFNuaXBwZXRTdHJpbmcge1xuICAgICAgICBjb25zdHJ1Y3Rvcih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fdGFic3RvcCA9IDE7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWUgfHwgJyc7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGlzU25pcHBldFN0cmluZyh0aGluZykge1xuICAgICAgICAgICAgaWYgKHRoaW5nIGluc3RhbmNlb2YgU25pcHBldFN0cmluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhpbmcudmFsdWUgPT09ICdzdHJpbmcnO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBfZXNjYXBlKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwkfH18XFxcXC9nLCAnXFxcXCQmJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kVGV4dChzdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gU25pcHBldFN0cmluZy5fZXNjYXBlKHN0cmluZyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRUYWJzdG9wKG51bWJlciA9IHRoaXMuX3RhYnN0b3ArKykge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnJCc7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IG51bWJlcjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGFwcGVuZFBsYWNlaG9sZGVyKHZhbHVlLCBudW1iZXIgPSB0aGlzLl90YWJzdG9wKyspIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXN0ZWQgPSBuZXcgU25pcHBldFN0cmluZygpO1xuICAgICAgICAgICAgICAgIG5lc3RlZC5fdGFic3RvcCA9IHRoaXMuX3RhYnN0b3A7XG4gICAgICAgICAgICAgICAgdmFsdWUobmVzdGVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWJzdG9wID0gbmVzdGVkLl90YWJzdG9wO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbmVzdGVkLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBTbmlwcGV0U3RyaW5nLl9lc2NhcGUodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnJHsnO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBudW1iZXI7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICc6JztcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICd9JztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGFwcGVuZFZhcmlhYmxlKG5hbWUsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0VmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXN0ZWQgPSBuZXcgU25pcHBldFN0cmluZygpO1xuICAgICAgICAgICAgICAgIG5lc3RlZC5fdGFic3RvcCA9IHRoaXMuX3RhYnN0b3A7XG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlKG5lc3RlZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFic3RvcCA9IG5lc3RlZC5fdGFic3RvcDtcbiAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBuZXN0ZWQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgZGVmYXVsdFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZS5yZXBsYWNlKC9cXCR8fS9nLCAnXFxcXCQmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICckeyc7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IG5hbWU7XG4gICAgICAgICAgICBpZiAoZGVmYXVsdFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnOic7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICd9JztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TbmlwcGV0U3RyaW5nID0gU25pcHBldFN0cmluZztcbiAgICBsZXQgRGlhZ25vc3RpY1RhZztcbiAgICAoZnVuY3Rpb24gKERpYWdub3N0aWNUYWcpIHtcbiAgICAgICAgRGlhZ25vc3RpY1RhZ1tEaWFnbm9zdGljVGFnW1wiVW5uZWNlc3NhcnlcIl0gPSAxXSA9IFwiVW5uZWNlc3NhcnlcIjtcbiAgICB9KShEaWFnbm9zdGljVGFnID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWNUYWcgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljVGFnID0ge30pKTtcbiAgICBsZXQgRGlhZ25vc3RpY1NldmVyaXR5O1xuICAgIChmdW5jdGlvbiAoRGlhZ25vc3RpY1NldmVyaXR5KSB7XG4gICAgICAgIERpYWdub3N0aWNTZXZlcml0eVtEaWFnbm9zdGljU2V2ZXJpdHlbXCJIaW50XCJdID0gM10gPSBcIkhpbnRcIjtcbiAgICAgICAgRGlhZ25vc3RpY1NldmVyaXR5W0RpYWdub3N0aWNTZXZlcml0eVtcIkluZm9ybWF0aW9uXCJdID0gMl0gPSBcIkluZm9ybWF0aW9uXCI7XG4gICAgICAgIERpYWdub3N0aWNTZXZlcml0eVtEaWFnbm9zdGljU2V2ZXJpdHlbXCJXYXJuaW5nXCJdID0gMV0gPSBcIldhcm5pbmdcIjtcbiAgICAgICAgRGlhZ25vc3RpY1NldmVyaXR5W0RpYWdub3N0aWNTZXZlcml0eVtcIkVycm9yXCJdID0gMF0gPSBcIkVycm9yXCI7XG4gICAgfSkoRGlhZ25vc3RpY1NldmVyaXR5ID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWNTZXZlcml0eSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWNTZXZlcml0eSA9IHt9KSk7XG4gICAgY2xhc3MgTG9jYXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3Rvcih1cmksIHJhbmdlT3JQb3NpdGlvbikge1xuICAgICAgICAgICAgdGhpcy51cmkgPSB1cmk7XG4gICAgICAgICAgICBpZiAoIXJhbmdlT3JQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIC8vdGhhdCdzIE9LXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyYW5nZU9yUG9zaXRpb24gaW5zdGFuY2VvZiBSYW5nZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZU9yUG9zaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyYW5nZU9yUG9zaXRpb24gaW5zdGFuY2VvZiBQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMucmFuZ2UgPSBuZXcgUmFuZ2UocmFuZ2VPclBvc2l0aW9uLCByYW5nZU9yUG9zaXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbGxlZ2FsIGFyZ3VtZW50Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGlzTG9jYXRpb24odGhpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGluZyBpbnN0YW5jZW9mIExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFJhbmdlLmlzUmFuZ2UodGhpbmcucmFuZ2UpXG4gICAgICAgICAgICAgICAgJiYgdXJpXzEudnNjVXJpLlVSSS5pc1VyaSh0aGluZy51cmkpO1xuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJpOiB0aGlzLnVyaSxcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy5yYW5nZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuTG9jYXRpb24gPSBMb2NhdGlvbjtcbiAgICBjbGFzcyBEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IobG9jYXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb24gPSBsb2NhdGlvbjtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIGlzKHRoaW5nKSB7XG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGluZy5tZXNzYWdlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICYmIHRoaW5nLmxvY2F0aW9uXG4gICAgICAgICAgICAgICAgJiYgUmFuZ2UuaXNSYW5nZSh0aGluZy5sb2NhdGlvbi5yYW5nZSlcbiAgICAgICAgICAgICAgICAmJiB1cmlfMS52c2NVcmkuVVJJLmlzVXJpKHRoaW5nLmxvY2F0aW9uLnVyaSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb24gPSBEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uO1xuICAgIGNsYXNzIERpYWdub3N0aWMge1xuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgbWVzc2FnZSwgc2V2ZXJpdHkgPSBEaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgICAgICB0aGlzLnNldmVyaXR5ID0gc2V2ZXJpdHk7XG4gICAgICAgIH1cbiAgICAgICAgdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZXZlcml0eTogRGlhZ25vc3RpY1NldmVyaXR5W3RoaXMuc2V2ZXJpdHldLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHRoaXMubWVzc2FnZSxcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy5yYW5nZSxcbiAgICAgICAgICAgICAgICBzb3VyY2U6IHRoaXMuc291cmNlLFxuICAgICAgICAgICAgICAgIGNvZGU6IHRoaXMuY29kZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWMgPSBEaWFnbm9zdGljO1xuICAgIGNsYXNzIEhvdmVyIHtcbiAgICAgICAgY29uc3RydWN0b3IoY29udGVudHMsIHJhbmdlKSB7XG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRzKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbGxlZ2FsIGFyZ3VtZW50LCBjb250ZW50cyBtdXN0IGJlIGRlZmluZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNvbnRlbnRzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudHMgPSBjb250ZW50cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGh0bWxDb250ZW50XzEudnNjTW9ja0h0bWxDb250ZW50LmlzTWFya2Rvd25TdHJpbmcoY29udGVudHMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50cyA9IFtjb250ZW50c107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRzID0gW2NvbnRlbnRzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuSG92ZXIgPSBIb3ZlcjtcbiAgICBsZXQgRG9jdW1lbnRIaWdobGlnaHRLaW5kO1xuICAgIChmdW5jdGlvbiAoRG9jdW1lbnRIaWdobGlnaHRLaW5kKSB7XG4gICAgICAgIERvY3VtZW50SGlnaGxpZ2h0S2luZFtEb2N1bWVudEhpZ2hsaWdodEtpbmRbXCJUZXh0XCJdID0gMF0gPSBcIlRleHRcIjtcbiAgICAgICAgRG9jdW1lbnRIaWdobGlnaHRLaW5kW0RvY3VtZW50SGlnaGxpZ2h0S2luZFtcIlJlYWRcIl0gPSAxXSA9IFwiUmVhZFwiO1xuICAgICAgICBEb2N1bWVudEhpZ2hsaWdodEtpbmRbRG9jdW1lbnRIaWdobGlnaHRLaW5kW1wiV3JpdGVcIl0gPSAyXSA9IFwiV3JpdGVcIjtcbiAgICB9KShEb2N1bWVudEhpZ2hsaWdodEtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRIaWdobGlnaHRLaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRIaWdobGlnaHRLaW5kID0ge30pKTtcbiAgICBjbGFzcyBEb2N1bWVudEhpZ2hsaWdodCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHJhbmdlLCBraW5kID0gRG9jdW1lbnRIaWdobGlnaHRLaW5kLlRleHQpIHtcbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gICAgICAgIH1cbiAgICAgICAgdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy5yYW5nZSxcbiAgICAgICAgICAgICAgICBraW5kOiBEb2N1bWVudEhpZ2hsaWdodEtpbmRbdGhpcy5raW5kXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRIaWdobGlnaHQgPSBEb2N1bWVudEhpZ2hsaWdodDtcbiAgICBsZXQgU3ltYm9sS2luZDtcbiAgICAoZnVuY3Rpb24gKFN5bWJvbEtpbmQpIHtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRmlsZVwiXSA9IDBdID0gXCJGaWxlXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk1vZHVsZVwiXSA9IDFdID0gXCJNb2R1bGVcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTmFtZXNwYWNlXCJdID0gMl0gPSBcIk5hbWVzcGFjZVwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJQYWNrYWdlXCJdID0gM10gPSBcIlBhY2thZ2VcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiQ2xhc3NcIl0gPSA0XSA9IFwiQ2xhc3NcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTWV0aG9kXCJdID0gNV0gPSBcIk1ldGhvZFwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJQcm9wZXJ0eVwiXSA9IDZdID0gXCJQcm9wZXJ0eVwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJGaWVsZFwiXSA9IDddID0gXCJGaWVsZFwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJDb25zdHJ1Y3RvclwiXSA9IDhdID0gXCJDb25zdHJ1Y3RvclwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJFbnVtXCJdID0gOV0gPSBcIkVudW1cIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiSW50ZXJmYWNlXCJdID0gMTBdID0gXCJJbnRlcmZhY2VcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRnVuY3Rpb25cIl0gPSAxMV0gPSBcIkZ1bmN0aW9uXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlZhcmlhYmxlXCJdID0gMTJdID0gXCJWYXJpYWJsZVwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJDb25zdGFudFwiXSA9IDEzXSA9IFwiQ29uc3RhbnRcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiU3RyaW5nXCJdID0gMTRdID0gXCJTdHJpbmdcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTnVtYmVyXCJdID0gMTVdID0gXCJOdW1iZXJcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiQm9vbGVhblwiXSA9IDE2XSA9IFwiQm9vbGVhblwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJBcnJheVwiXSA9IDE3XSA9IFwiQXJyYXlcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiT2JqZWN0XCJdID0gMThdID0gXCJPYmplY3RcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiS2V5XCJdID0gMTldID0gXCJLZXlcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTnVsbFwiXSA9IDIwXSA9IFwiTnVsbFwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJFbnVtTWVtYmVyXCJdID0gMjFdID0gXCJFbnVtTWVtYmVyXCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlN0cnVjdFwiXSA9IDIyXSA9IFwiU3RydWN0XCI7XG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkV2ZW50XCJdID0gMjNdID0gXCJFdmVudFwiO1xuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJPcGVyYXRvclwiXSA9IDI0XSA9IFwiT3BlcmF0b3JcIjtcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiVHlwZVBhcmFtZXRlclwiXSA9IDI1XSA9IFwiVHlwZVBhcmFtZXRlclwiO1xuICAgIH0pKFN5bWJvbEtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU3ltYm9sS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN5bWJvbEtpbmQgPSB7fSkpO1xuICAgIGNsYXNzIFN5bWJvbEluZm9ybWF0aW9uIHtcbiAgICAgICAgY29uc3RydWN0b3IobmFtZSwga2luZCwgcmFuZ2VPckNvbnRhaW5lciwgbG9jYXRpb25PclVyaSwgY29udGFpbmVyTmFtZSkge1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lck5hbWUgPSBjb250YWluZXJOYW1lO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByYW5nZU9yQ29udGFpbmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyTmFtZSA9IHJhbmdlT3JDb250YWluZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9jYXRpb25PclVyaSBpbnN0YW5jZW9mIExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2NhdGlvbiA9IGxvY2F0aW9uT3JVcmk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyYW5nZU9yQ29udGFpbmVyIGluc3RhbmNlb2YgUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2F0aW9uID0gbmV3IExvY2F0aW9uKGxvY2F0aW9uT3JVcmksIHJhbmdlT3JDb250YWluZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmRbdGhpcy5raW5kXSxcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogdGhpcy5sb2NhdGlvbixcbiAgICAgICAgICAgICAgICBjb250YWluZXJOYW1lOiB0aGlzLmNvbnRhaW5lck5hbWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN5bWJvbEluZm9ybWF0aW9uID0gU3ltYm9sSW5mb3JtYXRpb247XG4gICAgY2xhc3MgU3ltYm9sSW5mb3JtYXRpb24yIGV4dGVuZHMgU3ltYm9sSW5mb3JtYXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihuYW1lLCBraW5kLCBjb250YWluZXJOYW1lLCBsb2NhdGlvbikge1xuICAgICAgICAgICAgc3VwZXIobmFtZSwga2luZCwgY29udGFpbmVyTmFtZSwgbG9jYXRpb24pO1xuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgdGhpcy5kZWZpbmluZ1JhbmdlID0gbG9jYXRpb24ucmFuZ2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN5bWJvbEluZm9ybWF0aW9uMiA9IFN5bWJvbEluZm9ybWF0aW9uMjtcbiAgICBsZXQgQ29kZUFjdGlvblRyaWdnZXI7XG4gICAgKGZ1bmN0aW9uIChDb2RlQWN0aW9uVHJpZ2dlcikge1xuICAgICAgICBDb2RlQWN0aW9uVHJpZ2dlcltDb2RlQWN0aW9uVHJpZ2dlcltcIkF1dG9tYXRpY1wiXSA9IDFdID0gXCJBdXRvbWF0aWNcIjtcbiAgICAgICAgQ29kZUFjdGlvblRyaWdnZXJbQ29kZUFjdGlvblRyaWdnZXJbXCJNYW51YWxcIl0gPSAyXSA9IFwiTWFudWFsXCI7XG4gICAgfSkoQ29kZUFjdGlvblRyaWdnZXIgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUFjdGlvblRyaWdnZXIgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2RlQWN0aW9uVHJpZ2dlciA9IHt9KSk7XG4gICAgY2xhc3MgQ29kZUFjdGlvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHRpdGxlLCBraW5kKSB7XG4gICAgICAgICAgICB0aGlzLnRpdGxlID0gdGl0bGU7XG4gICAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2RlQWN0aW9uID0gQ29kZUFjdGlvbjtcbiAgICBjbGFzcyBDb2RlQWN0aW9uS2luZCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kKHBhcnRzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IENvZGVBY3Rpb25LaW5kKHRoaXMudmFsdWUgPyB0aGlzLnZhbHVlICsgQ29kZUFjdGlvbktpbmQuc2VwICsgcGFydHMgOiBwYXJ0cyk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGFpbnMob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlID09PSBvdGhlci52YWx1ZSB8fCBzdHJpbmdzXzEudnNjTW9ja1N0cmluZ3Muc3RhcnRzV2l0aChvdGhlci52YWx1ZSwgdGhpcy52YWx1ZSArIENvZGVBY3Rpb25LaW5kLnNlcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgQ29kZUFjdGlvbktpbmQuc2VwID0gJy4nO1xuICAgIENvZGVBY3Rpb25LaW5kLkVtcHR5ID0gbmV3IENvZGVBY3Rpb25LaW5kKCcnKTtcbiAgICBDb2RlQWN0aW9uS2luZC5RdWlja0ZpeCA9IENvZGVBY3Rpb25LaW5kLkVtcHR5LmFwcGVuZCgncXVpY2tmaXgnKTtcbiAgICBDb2RlQWN0aW9uS2luZC5SZWZhY3RvciA9IENvZGVBY3Rpb25LaW5kLkVtcHR5LmFwcGVuZCgncmVmYWN0b3InKTtcbiAgICBDb2RlQWN0aW9uS2luZC5SZWZhY3RvckV4dHJhY3QgPSBDb2RlQWN0aW9uS2luZC5SZWZhY3Rvci5hcHBlbmQoJ2V4dHJhY3QnKTtcbiAgICBDb2RlQWN0aW9uS2luZC5SZWZhY3RvcklubGluZSA9IENvZGVBY3Rpb25LaW5kLlJlZmFjdG9yLmFwcGVuZCgnaW5saW5lJyk7XG4gICAgQ29kZUFjdGlvbktpbmQuUmVmYWN0b3JSZXdyaXRlID0gQ29kZUFjdGlvbktpbmQuUmVmYWN0b3IuYXBwZW5kKCdyZXdyaXRlJyk7XG4gICAgQ29kZUFjdGlvbktpbmQuU291cmNlID0gQ29kZUFjdGlvbktpbmQuRW1wdHkuYXBwZW5kKCdzb3VyY2UnKTtcbiAgICBDb2RlQWN0aW9uS2luZC5Tb3VyY2VPcmdhbml6ZUltcG9ydHMgPSBDb2RlQWN0aW9uS2luZC5Tb3VyY2UuYXBwZW5kKCdvcmdhbml6ZUltcG9ydHMnKTtcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUFjdGlvbktpbmQgPSBDb2RlQWN0aW9uS2luZDtcbiAgICBjbGFzcyBDb2RlTGVucyB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHJhbmdlLCBjb21tYW5kKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XG4gICAgICAgICAgICB0aGlzLmNvbW1hbmQgPSBjb21tYW5kO1xuICAgICAgICB9XG4gICAgICAgIGdldCBpc1Jlc29sdmVkKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5jb21tYW5kO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2RlTGVucyA9IENvZGVMZW5zO1xuICAgIGNsYXNzIE1hcmtkb3duU3RyaW5nIHtcbiAgICAgICAgY29uc3RydWN0b3IodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZSB8fCAnJztcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRUZXh0KHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBlc2NhcGUgbWFya2Rvd24gc3ludGF4IHRva2VuczogaHR0cDovL2RhcmluZ2ZpcmViYWxsLm5ldC9wcm9qZWN0cy9tYXJrZG93bi9zeW50YXgjYmFja3NsYXNoXG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IHZhbHVlLnJlcGxhY2UoL1tcXFxcYCpfe31bXFxdKCkjK1xcLS4hXS9nLCAnXFxcXCQmJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRNYXJrZG93bih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSB2YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGFwcGVuZENvZGVibG9jayhjb2RlLCBsYW5ndWFnZSA9ICcnKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICdcXG5gYGAnO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBsYW5ndWFnZTtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJ1xcbic7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IGNvZGU7XG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICdcXG5gYGBcXG4nO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLk1hcmtkb3duU3RyaW5nID0gTWFya2Rvd25TdHJpbmc7XG4gICAgY2xhc3MgUGFyYW1ldGVySW5mb3JtYXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihsYWJlbCwgZG9jdW1lbnRhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICAgICAgICAgICAgdGhpcy5kb2N1bWVudGF0aW9uID0gZG9jdW1lbnRhdGlvbjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUGFyYW1ldGVySW5mb3JtYXRpb24gPSBQYXJhbWV0ZXJJbmZvcm1hdGlvbjtcbiAgICBjbGFzcyBTaWduYXR1cmVJbmZvcm1hdGlvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGxhYmVsLCBkb2N1bWVudGF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmxhYmVsID0gbGFiZWw7XG4gICAgICAgICAgICB0aGlzLmRvY3VtZW50YXRpb24gPSBkb2N1bWVudGF0aW9uO1xuICAgICAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gW107XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNpZ25hdHVyZUluZm9ybWF0aW9uID0gU2lnbmF0dXJlSW5mb3JtYXRpb247XG4gICAgY2xhc3MgU2lnbmF0dXJlSGVscCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgdGhpcy5zaWduYXR1cmVzID0gW107XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNpZ25hdHVyZUhlbHAgPSBTaWduYXR1cmVIZWxwO1xuICAgIGxldCBDb21wbGV0aW9uVHJpZ2dlcktpbmQ7XG4gICAgKGZ1bmN0aW9uIChDb21wbGV0aW9uVHJpZ2dlcktpbmQpIHtcbiAgICAgICAgQ29tcGxldGlvblRyaWdnZXJLaW5kW0NvbXBsZXRpb25UcmlnZ2VyS2luZFtcIkludm9rZVwiXSA9IDBdID0gXCJJbnZva2VcIjtcbiAgICAgICAgQ29tcGxldGlvblRyaWdnZXJLaW5kW0NvbXBsZXRpb25UcmlnZ2VyS2luZFtcIlRyaWdnZXJDaGFyYWN0ZXJcIl0gPSAxXSA9IFwiVHJpZ2dlckNoYXJhY3RlclwiO1xuICAgICAgICBDb21wbGV0aW9uVHJpZ2dlcktpbmRbQ29tcGxldGlvblRyaWdnZXJLaW5kW1wiVHJpZ2dlckZvckluY29tcGxldGVDb21wbGV0aW9uc1wiXSA9IDJdID0gXCJUcmlnZ2VyRm9ySW5jb21wbGV0ZUNvbXBsZXRpb25zXCI7XG4gICAgfSkoQ29tcGxldGlvblRyaWdnZXJLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbXBsZXRpb25UcmlnZ2VyS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbXBsZXRpb25UcmlnZ2VyS2luZCA9IHt9KSk7XG4gICAgbGV0IENvbXBsZXRpb25JdGVtS2luZDtcbiAgICAoZnVuY3Rpb24gKENvbXBsZXRpb25JdGVtS2luZCkge1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVGV4dFwiXSA9IDBdID0gXCJUZXh0XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJNZXRob2RcIl0gPSAxXSA9IFwiTWV0aG9kXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJGdW5jdGlvblwiXSA9IDJdID0gXCJGdW5jdGlvblwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiQ29uc3RydWN0b3JcIl0gPSAzXSA9IFwiQ29uc3RydWN0b3JcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkZpZWxkXCJdID0gNF0gPSBcIkZpZWxkXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJWYXJpYWJsZVwiXSA9IDVdID0gXCJWYXJpYWJsZVwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiQ2xhc3NcIl0gPSA2XSA9IFwiQ2xhc3NcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkludGVyZmFjZVwiXSA9IDddID0gXCJJbnRlcmZhY2VcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIk1vZHVsZVwiXSA9IDhdID0gXCJNb2R1bGVcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlByb3BlcnR5XCJdID0gOV0gPSBcIlByb3BlcnR5XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJVbml0XCJdID0gMTBdID0gXCJVbml0XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJWYWx1ZVwiXSA9IDExXSA9IFwiVmFsdWVcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkVudW1cIl0gPSAxMl0gPSBcIkVudW1cIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIktleXdvcmRcIl0gPSAxM10gPSBcIktleXdvcmRcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlNuaXBwZXRcIl0gPSAxNF0gPSBcIlNuaXBwZXRcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkNvbG9yXCJdID0gMTVdID0gXCJDb2xvclwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiRmlsZVwiXSA9IDE2XSA9IFwiRmlsZVwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiUmVmZXJlbmNlXCJdID0gMTddID0gXCJSZWZlcmVuY2VcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkZvbGRlclwiXSA9IDE4XSA9IFwiRm9sZGVyXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJFbnVtTWVtYmVyXCJdID0gMTldID0gXCJFbnVtTWVtYmVyXCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJDb25zdGFudFwiXSA9IDIwXSA9IFwiQ29uc3RhbnRcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlN0cnVjdFwiXSA9IDIxXSA9IFwiU3RydWN0XCI7XG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJFdmVudFwiXSA9IDIyXSA9IFwiRXZlbnRcIjtcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIk9wZXJhdG9yXCJdID0gMjNdID0gXCJPcGVyYXRvclwiO1xuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVHlwZVBhcmFtZXRlclwiXSA9IDI0XSA9IFwiVHlwZVBhcmFtZXRlclwiO1xuICAgIH0pKENvbXBsZXRpb25JdGVtS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uSXRlbUtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uSXRlbUtpbmQgPSB7fSkpO1xuICAgIGNsYXNzIENvbXBsZXRpb25JdGVtIHtcbiAgICAgICAgY29uc3RydWN0b3IobGFiZWwsIGtpbmQpIHtcbiAgICAgICAgICAgIHRoaXMubGFiZWwgPSBsYWJlbDtcbiAgICAgICAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gICAgICAgIH1cbiAgICAgICAgdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBsYWJlbDogdGhpcy5sYWJlbCxcbiAgICAgICAgICAgICAgICBraW5kOiBDb21wbGV0aW9uSXRlbUtpbmRbdGhpcy5raW5kXSxcbiAgICAgICAgICAgICAgICBkZXRhaWw6IHRoaXMuZGV0YWlsLFxuICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IHRoaXMuZG9jdW1lbnRhdGlvbixcbiAgICAgICAgICAgICAgICBzb3J0VGV4dDogdGhpcy5zb3J0VGV4dCxcbiAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiB0aGlzLmZpbHRlclRleHQsXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogdGhpcy5pbnNlcnRUZXh0LFxuICAgICAgICAgICAgICAgIHRleHRFZGl0OiB0aGlzLnRleHRFZGl0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uSXRlbSA9IENvbXBsZXRpb25JdGVtO1xuICAgIGNsYXNzIENvbXBsZXRpb25MaXN0IHtcbiAgICAgICAgY29uc3RydWN0b3IoaXRlbXMgPSBbXSwgaXNJbmNvbXBsZXRlID0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcbiAgICAgICAgICAgIHRoaXMuaXNJbmNvbXBsZXRlID0gaXNJbmNvbXBsZXRlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uTGlzdCA9IENvbXBsZXRpb25MaXN0O1xuICAgIGxldCBWaWV3Q29sdW1uO1xuICAgIChmdW5jdGlvbiAoVmlld0NvbHVtbikge1xuICAgICAgICBWaWV3Q29sdW1uW1ZpZXdDb2x1bW5bXCJBY3RpdmVcIl0gPSAtMV0gPSBcIkFjdGl2ZVwiO1xuICAgICAgICBWaWV3Q29sdW1uW1ZpZXdDb2x1bW5bXCJPbmVcIl0gPSAxXSA9IFwiT25lXCI7XG4gICAgICAgIFZpZXdDb2x1bW5bVmlld0NvbHVtbltcIlR3b1wiXSA9IDJdID0gXCJUd29cIjtcbiAgICAgICAgVmlld0NvbHVtbltWaWV3Q29sdW1uW1wiVGhyZWVcIl0gPSAzXSA9IFwiVGhyZWVcIjtcbiAgICB9KShWaWV3Q29sdW1uID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlZpZXdDb2x1bW4gfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5WaWV3Q29sdW1uID0ge30pKTtcbiAgICBsZXQgU3RhdHVzQmFyQWxpZ25tZW50O1xuICAgIChmdW5jdGlvbiAoU3RhdHVzQmFyQWxpZ25tZW50KSB7XG4gICAgICAgIFN0YXR1c0JhckFsaWdubWVudFtTdGF0dXNCYXJBbGlnbm1lbnRbXCJMZWZ0XCJdID0gMV0gPSBcIkxlZnRcIjtcbiAgICAgICAgU3RhdHVzQmFyQWxpZ25tZW50W1N0YXR1c0JhckFsaWdubWVudFtcIlJpZ2h0XCJdID0gMl0gPSBcIlJpZ2h0XCI7XG4gICAgfSkoU3RhdHVzQmFyQWxpZ25tZW50ID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN0YXR1c0JhckFsaWdubWVudCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN0YXR1c0JhckFsaWdubWVudCA9IHt9KSk7XG4gICAgbGV0IFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlO1xuICAgIChmdW5jdGlvbiAoVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGUpIHtcbiAgICAgICAgVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbXCJPZmZcIl0gPSAwXSA9IFwiT2ZmXCI7XG4gICAgICAgIFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1RleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1wiT25cIl0gPSAxXSA9IFwiT25cIjtcbiAgICAgICAgVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbXCJSZWxhdGl2ZVwiXSA9IDJdID0gXCJSZWxhdGl2ZVwiO1xuICAgIH0pKFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGUgPSB7fSkpO1xuICAgIGxldCBUZXh0RG9jdW1lbnRTYXZlUmVhc29uO1xuICAgIChmdW5jdGlvbiAoVGV4dERvY3VtZW50U2F2ZVJlYXNvbikge1xuICAgICAgICBUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1RleHREb2N1bWVudFNhdmVSZWFzb25bXCJNYW51YWxcIl0gPSAxXSA9IFwiTWFudWFsXCI7XG4gICAgICAgIFRleHREb2N1bWVudFNhdmVSZWFzb25bVGV4dERvY3VtZW50U2F2ZVJlYXNvbltcIkFmdGVyRGVsYXlcIl0gPSAyXSA9IFwiQWZ0ZXJEZWxheVwiO1xuICAgICAgICBUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1RleHREb2N1bWVudFNhdmVSZWFzb25bXCJGb2N1c091dFwiXSA9IDNdID0gXCJGb2N1c091dFwiO1xuICAgIH0pKFRleHREb2N1bWVudFNhdmVSZWFzb24gPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dERvY3VtZW50U2F2ZVJlYXNvbiB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHREb2N1bWVudFNhdmVSZWFzb24gPSB7fSkpO1xuICAgIGxldCBUZXh0RWRpdG9yUmV2ZWFsVHlwZTtcbiAgICAoZnVuY3Rpb24gKFRleHRFZGl0b3JSZXZlYWxUeXBlKSB7XG4gICAgICAgIFRleHRFZGl0b3JSZXZlYWxUeXBlW1RleHRFZGl0b3JSZXZlYWxUeXBlW1wiRGVmYXVsdFwiXSA9IDBdID0gXCJEZWZhdWx0XCI7XG4gICAgICAgIFRleHRFZGl0b3JSZXZlYWxUeXBlW1RleHRFZGl0b3JSZXZlYWxUeXBlW1wiSW5DZW50ZXJcIl0gPSAxXSA9IFwiSW5DZW50ZXJcIjtcbiAgICAgICAgVGV4dEVkaXRvclJldmVhbFR5cGVbVGV4dEVkaXRvclJldmVhbFR5cGVbXCJJbkNlbnRlcklmT3V0c2lkZVZpZXdwb3J0XCJdID0gMl0gPSBcIkluQ2VudGVySWZPdXRzaWRlVmlld3BvcnRcIjtcbiAgICAgICAgVGV4dEVkaXRvclJldmVhbFR5cGVbVGV4dEVkaXRvclJldmVhbFR5cGVbXCJBdFRvcFwiXSA9IDNdID0gXCJBdFRvcFwiO1xuICAgIH0pKFRleHRFZGl0b3JSZXZlYWxUeXBlID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JSZXZlYWxUeXBlIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvclJldmVhbFR5cGUgPSB7fSkpO1xuICAgIGxldCBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZDtcbiAgICAoZnVuY3Rpb24gKFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kKSB7XG4gICAgICAgIFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kW1RleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kW1wiS2V5Ym9hcmRcIl0gPSAxXSA9IFwiS2V5Ym9hcmRcIjtcbiAgICAgICAgVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmRbVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmRbXCJNb3VzZVwiXSA9IDJdID0gXCJNb3VzZVwiO1xuICAgICAgICBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZFtUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZFtcIkNvbW1hbmRcIl0gPSAzXSA9IFwiQ29tbWFuZFwiO1xuICAgIH0pKFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQgPSB7fSkpO1xuICAgIC8qKlxuICAgICAqIFRoZXNlIHZhbHVlcyBtYXRjaCB2ZXJ5IGNhcmVmdWxseSB0aGUgdmFsdWVzIG9mIGBUcmFja2VkUmFuZ2VTdGlja2luZXNzYFxuICAgICAqL1xuICAgIGxldCBEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcjtcbiAgICAoZnVuY3Rpb24gKERlY29yYXRpb25SYW5nZUJlaGF2aW9yKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmFja2VkUmFuZ2VTdGlja2luZXNzLkFsd2F5c0dyb3dzV2hlblR5cGluZ0F0RWRnZXNcbiAgICAgICAgICovXG4gICAgICAgIERlY29yYXRpb25SYW5nZUJlaGF2aW9yW0RlY29yYXRpb25SYW5nZUJlaGF2aW9yW1wiT3Blbk9wZW5cIl0gPSAwXSA9IFwiT3Blbk9wZW5cIjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyYWNrZWRSYW5nZVN0aWNraW5lc3MuTmV2ZXJHcm93c1doZW5UeXBpbmdBdEVkZ2VzXG4gICAgICAgICAqL1xuICAgICAgICBEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcltEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcltcIkNsb3NlZENsb3NlZFwiXSA9IDFdID0gXCJDbG9zZWRDbG9zZWRcIjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyYWNrZWRSYW5nZVN0aWNraW5lc3MuR3Jvd3NPbmx5V2hlblR5cGluZ0JlZm9yZVxuICAgICAgICAgKi9cbiAgICAgICAgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbXCJPcGVuQ2xvc2VkXCJdID0gMl0gPSBcIk9wZW5DbG9zZWRcIjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyYWNrZWRSYW5nZVN0aWNraW5lc3MuR3Jvd3NPbmx5V2hlblR5cGluZ0FmdGVyXG4gICAgICAgICAqL1xuICAgICAgICBEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcltEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvcltcIkNsb3NlZE9wZW5cIl0gPSAzXSA9IFwiQ2xvc2VkT3BlblwiO1xuICAgIH0pKERlY29yYXRpb25SYW5nZUJlaGF2aW9yID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRlY29yYXRpb25SYW5nZUJlaGF2aW9yIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRGVjb3JhdGlvblJhbmdlQmVoYXZpb3IgPSB7fSkpO1xuICAgIChmdW5jdGlvbiAoVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQpIHtcbiAgICAgICAgZnVuY3Rpb24gZnJvbVZhbHVlKHMpIHtcbiAgICAgICAgICAgIHN3aXRjaCAocykge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2tleWJvYXJkJzogcmV0dXJuIFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kLktleWJvYXJkO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21vdXNlJzogcmV0dXJuIFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kLk1vdXNlO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FwaSc6IHJldHVybiBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZC5Db21tYW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZC5mcm9tVmFsdWUgPSBmcm9tVmFsdWU7XG4gICAgfSkoVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCA9IHt9KSk7XG4gICAgY2xhc3MgRG9jdW1lbnRMaW5rIHtcbiAgICAgICAgY29uc3RydWN0b3IocmFuZ2UsIHRhcmdldCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldCAmJiAhKHRhcmdldCBpbnN0YW5jZW9mIHVyaV8xLnZzY1VyaS5VUkkpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCd0YXJnZXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghUmFuZ2UuaXNSYW5nZShyYW5nZSkgfHwgcmFuZ2UuaXNFbXB0eSkge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgncmFuZ2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Eb2N1bWVudExpbmsgPSBEb2N1bWVudExpbms7XG4gICAgY2xhc3MgQ29sb3Ige1xuICAgICAgICBjb25zdHJ1Y3RvcihyZWQsIGdyZWVuLCBibHVlLCBhbHBoYSkge1xuICAgICAgICAgICAgdGhpcy5yZWQgPSByZWQ7XG4gICAgICAgICAgICB0aGlzLmdyZWVuID0gZ3JlZW47XG4gICAgICAgICAgICB0aGlzLmJsdWUgPSBibHVlO1xuICAgICAgICAgICAgdGhpcy5hbHBoYSA9IGFscGhhO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvciA9IENvbG9yO1xuICAgIGNsYXNzIENvbG9ySW5mb3JtYXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgY29sb3IpIHtcbiAgICAgICAgICAgIGlmIChjb2xvciAmJiAhKGNvbG9yIGluc3RhbmNlb2YgQ29sb3IpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb2xvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFSYW5nZS5pc1JhbmdlKHJhbmdlKSB8fCByYW5nZS5pc0VtcHR5KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdyYW5nZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yYW5nZSA9IHJhbmdlO1xuICAgICAgICAgICAgdGhpcy5jb2xvciA9IGNvbG9yO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvckluZm9ybWF0aW9uID0gQ29sb3JJbmZvcm1hdGlvbjtcbiAgICBjbGFzcyBDb2xvclByZXNlbnRhdGlvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGxhYmVsKSB7XG4gICAgICAgICAgICBpZiAoIWxhYmVsIHx8IHR5cGVvZiBsYWJlbCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2xhYmVsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxhYmVsID0gbGFiZWw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbG9yUHJlc2VudGF0aW9uID0gQ29sb3JQcmVzZW50YXRpb247XG4gICAgbGV0IENvbG9yRm9ybWF0O1xuICAgIChmdW5jdGlvbiAoQ29sb3JGb3JtYXQpIHtcbiAgICAgICAgQ29sb3JGb3JtYXRbQ29sb3JGb3JtYXRbXCJSR0JcIl0gPSAwXSA9IFwiUkdCXCI7XG4gICAgICAgIENvbG9yRm9ybWF0W0NvbG9yRm9ybWF0W1wiSEVYXCJdID0gMV0gPSBcIkhFWFwiO1xuICAgICAgICBDb2xvckZvcm1hdFtDb2xvckZvcm1hdFtcIkhTTFwiXSA9IDJdID0gXCJIU0xcIjtcbiAgICB9KShDb2xvckZvcm1hdCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvckZvcm1hdCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbG9yRm9ybWF0ID0ge30pKTtcbiAgICBsZXQgU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGU7XG4gICAgKGZ1bmN0aW9uIChTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZSkge1xuICAgICAgICBTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtcIkVycm9yXCJdID0gMF0gPSBcIkVycm9yXCI7XG4gICAgICAgIFNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlW1NvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlW1wiV2FybmluZ1wiXSA9IDFdID0gXCJXYXJuaW5nXCI7XG4gICAgICAgIFNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlW1NvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlW1wiSW5mb3JtYXRpb25cIl0gPSAyXSA9IFwiSW5mb3JtYXRpb25cIjtcbiAgICB9KShTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Tb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlID0ge30pKTtcbiAgICBsZXQgVGFza1JldmVhbEtpbmQ7XG4gICAgKGZ1bmN0aW9uIChUYXNrUmV2ZWFsS2luZCkge1xuICAgICAgICBUYXNrUmV2ZWFsS2luZFtUYXNrUmV2ZWFsS2luZFtcIkFsd2F5c1wiXSA9IDFdID0gXCJBbHdheXNcIjtcbiAgICAgICAgVGFza1JldmVhbEtpbmRbVGFza1JldmVhbEtpbmRbXCJTaWxlbnRcIl0gPSAyXSA9IFwiU2lsZW50XCI7XG4gICAgICAgIFRhc2tSZXZlYWxLaW5kW1Rhc2tSZXZlYWxLaW5kW1wiTmV2ZXJcIl0gPSAzXSA9IFwiTmV2ZXJcIjtcbiAgICB9KShUYXNrUmV2ZWFsS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrUmV2ZWFsS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tSZXZlYWxLaW5kID0ge30pKTtcbiAgICBsZXQgVGFza1BhbmVsS2luZDtcbiAgICAoZnVuY3Rpb24gKFRhc2tQYW5lbEtpbmQpIHtcbiAgICAgICAgVGFza1BhbmVsS2luZFtUYXNrUGFuZWxLaW5kW1wiU2hhcmVkXCJdID0gMV0gPSBcIlNoYXJlZFwiO1xuICAgICAgICBUYXNrUGFuZWxLaW5kW1Rhc2tQYW5lbEtpbmRbXCJEZWRpY2F0ZWRcIl0gPSAyXSA9IFwiRGVkaWNhdGVkXCI7XG4gICAgICAgIFRhc2tQYW5lbEtpbmRbVGFza1BhbmVsS2luZFtcIk5ld1wiXSA9IDNdID0gXCJOZXdcIjtcbiAgICB9KShUYXNrUGFuZWxLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tQYW5lbEtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrUGFuZWxLaW5kID0ge30pKTtcbiAgICBjbGFzcyBUYXNrR3JvdXAge1xuICAgICAgICBjb25zdHJ1Y3RvcihpZCwgX2xhYmVsKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbmFtZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBfbGFiZWwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCduYW1lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9pZCA9IGlkO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBmcm9tKHZhbHVlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnY2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVGFza0dyb3VwLkNsZWFuO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2J1aWxkJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5CdWlsZDtcbiAgICAgICAgICAgICAgICBjYXNlICdyZWJ1aWxkJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5SZWJ1aWxkO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rlc3QnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVGFza0dyb3VwLlRlc3Q7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBnZXQgaWQoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgVGFza0dyb3VwLkNsZWFuID0gbmV3IFRhc2tHcm91cCgnY2xlYW4nLCAnQ2xlYW4nKTtcbiAgICBUYXNrR3JvdXAuQnVpbGQgPSBuZXcgVGFza0dyb3VwKCdidWlsZCcsICdCdWlsZCcpO1xuICAgIFRhc2tHcm91cC5SZWJ1aWxkID0gbmV3IFRhc2tHcm91cCgncmVidWlsZCcsICdSZWJ1aWxkJyk7XG4gICAgVGFza0dyb3VwLlRlc3QgPSBuZXcgVGFza0dyb3VwKCd0ZXN0JywgJ1Rlc3QnKTtcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGFza0dyb3VwID0gVGFza0dyb3VwO1xuICAgIGNsYXNzIFByb2Nlc3NFeGVjdXRpb24ge1xuICAgICAgICBjb25zdHJ1Y3Rvcihwcm9jZXNzLCB2YXJnMSwgdmFyZzIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3Byb2Nlc3MnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MgPSBwcm9jZXNzO1xuICAgICAgICAgICAgaWYgKHZhcmcxICE9PSB2b2lkIDApIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YXJnMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXJncyA9IHZhcmcxO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vcHRpb25zID0gdmFyZzI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vcHRpb25zID0gdmFyZzE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2FyZ3MgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FyZ3MgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBnZXQgcHJvY2VzcygpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcm9jZXNzO1xuICAgICAgICB9XG4gICAgICAgIHNldCBwcm9jZXNzKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgncHJvY2VzcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fcHJvY2VzcyA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBhcmdzKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FyZ3M7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IGFyZ3ModmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fYXJncyA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBvcHRpb25zKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IG9wdGlvbnModmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb21wdXRlSWQoKSB7XG4gICAgICAgICAgICAvLyBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpO1xuICAgICAgICAgICAgLy8gaGFzaC51cGRhdGUoJ3Byb2Nlc3MnKTtcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9wcm9jZXNzICE9PSB2b2lkIDApIHtcbiAgICAgICAgICAgIC8vICAgICBoYXNoLnVwZGF0ZSh0aGlzLl9wcm9jZXNzKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9hcmdzICYmIHRoaXMuX2FyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gICAgIGZvciAobGV0IGFyZyBvZiB0aGlzLl9hcmdzKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGhhc2gudXBkYXRlKGFyZyk7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgLy8gcmV0dXJuIGhhc2guZGlnZXN0KCdoZXgnKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IHN1cHBvcnRlZCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Qcm9jZXNzRXhlY3V0aW9uID0gUHJvY2Vzc0V4ZWN1dGlvbjtcbiAgICBjbGFzcyBTaGVsbEV4ZWN1dGlvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGFyZzEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmcwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnY29tbWFuZCBjYW5cXCd0IGJlIHVuZGVmaW5lZCBvciBudWxsJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnMCAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIGFyZzAudmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnY29tbWFuZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9jb21tYW5kID0gYXJnMDtcbiAgICAgICAgICAgICAgICB0aGlzLl9hcmdzID0gYXJnMTtcbiAgICAgICAgICAgICAgICB0aGlzLl9vcHRpb25zID0gYXJnMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnMCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kTGluZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9jb21tYW5kTGluZSA9IGFyZzA7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IGFyZzE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGNvbW1hbmRMaW5lKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbW1hbmRMaW5lO1xuICAgICAgICB9XG4gICAgICAgIHNldCBjb21tYW5kTGluZSh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2NvbW1hbmRMaW5lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jb21tYW5kTGluZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBjb21tYW5kKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbW1hbmQ7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IGNvbW1hbmQodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmIHR5cGVvZiB2YWx1ZS52YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2NvbW1hbmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2NvbW1hbmQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgYXJncygpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hcmdzO1xuICAgICAgICB9XG4gICAgICAgIHNldCBhcmdzKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9hcmdzID0gdmFsdWUgfHwgW107XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IG9wdGlvbnMoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBzZXQgb3B0aW9ucyh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbXB1dGVJZCgpIHtcbiAgICAgICAgICAgIC8vIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1Jyk7XG4gICAgICAgICAgICAvLyBoYXNoLnVwZGF0ZSgnc2hlbGwnKTtcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9jb21tYW5kTGluZSAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAvLyAgICAgaGFzaC51cGRhdGUodGhpcy5fY29tbWFuZExpbmUpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgLy8gaWYgKHRoaXMuX2NvbW1hbmQgIT09IHZvaWQgMCkge1xuICAgICAgICAgICAgLy8gICAgIGhhc2gudXBkYXRlKHR5cGVvZiB0aGlzLl9jb21tYW5kID09PSAnc3RyaW5nJyA/IHRoaXMuX2NvbW1hbmQgOiB0aGlzLl9jb21tYW5kLnZhbHVlKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9hcmdzICYmIHRoaXMuX2FyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gICAgIGZvciAobGV0IGFyZyBvZiB0aGlzLl9hcmdzKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGhhc2gudXBkYXRlKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnID8gYXJnIDogYXJnLnZhbHVlKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvLyByZXR1cm4gaGFzaC5kaWdlc3QoJ2hleCcpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3Qgc3Bwb3J0ZWQnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU2hlbGxFeGVjdXRpb24gPSBTaGVsbEV4ZWN1dGlvbjtcbiAgICBsZXQgU2hlbGxRdW90aW5nO1xuICAgIChmdW5jdGlvbiAoU2hlbGxRdW90aW5nKSB7XG4gICAgICAgIFNoZWxsUXVvdGluZ1tTaGVsbFF1b3RpbmdbXCJFc2NhcGVcIl0gPSAxXSA9IFwiRXNjYXBlXCI7XG4gICAgICAgIFNoZWxsUXVvdGluZ1tTaGVsbFF1b3RpbmdbXCJTdHJvbmdcIl0gPSAyXSA9IFwiU3Ryb25nXCI7XG4gICAgICAgIFNoZWxsUXVvdGluZ1tTaGVsbFF1b3RpbmdbXCJXZWFrXCJdID0gM10gPSBcIldlYWtcIjtcbiAgICB9KShTaGVsbFF1b3RpbmcgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU2hlbGxRdW90aW5nIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU2hlbGxRdW90aW5nID0ge30pKTtcbiAgICBsZXQgVGFza1Njb3BlO1xuICAgIChmdW5jdGlvbiAoVGFza1Njb3BlKSB7XG4gICAgICAgIFRhc2tTY29wZVtUYXNrU2NvcGVbXCJHbG9iYWxcIl0gPSAxXSA9IFwiR2xvYmFsXCI7XG4gICAgICAgIFRhc2tTY29wZVtUYXNrU2NvcGVbXCJXb3Jrc3BhY2VcIl0gPSAyXSA9IFwiV29ya3NwYWNlXCI7XG4gICAgfSkoVGFza1Njb3BlID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tTY29wZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tTY29wZSA9IHt9KSk7XG4gICAgY2xhc3MgVGFzayB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGRlZmluaXRpb24sIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpIHtcbiAgICAgICAgICAgIHRoaXMuZGVmaW5pdGlvbiA9IGRlZmluaXRpb247XG4gICAgICAgICAgICBsZXQgcHJvYmxlbU1hdGNoZXJzO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IGFyZzI7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2UgPSBhcmczO1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0aW9uID0gYXJnNDtcbiAgICAgICAgICAgICAgICBwcm9ibGVtTWF0Y2hlcnMgPSBhcmc1O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYXJnMiA9PT0gVGFza1Njb3BlLkdsb2JhbCB8fCBhcmcyID09PSBUYXNrU2NvcGUuV29ya3NwYWNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBhcmcyO1xuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IGFyZzM7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2UgPSBhcmc0O1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0aW9uID0gYXJnNTtcbiAgICAgICAgICAgICAgICBwcm9ibGVtTWF0Y2hlcnMgPSBhcmc2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBhcmcyO1xuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IGFyZzM7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2UgPSBhcmc0O1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0aW9uID0gYXJnNTtcbiAgICAgICAgICAgICAgICBwcm9ibGVtTWF0Y2hlcnMgPSBhcmc2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9ibGVtTWF0Y2hlcnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvYmxlbU1hdGNoZXJzID0gW3Byb2JsZW1NYXRjaGVyc107XG4gICAgICAgICAgICAgICAgdGhpcy5faGFzRGVmaW5lZE1hdGNoZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocHJvYmxlbU1hdGNoZXJzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb2JsZW1NYXRjaGVycyA9IHByb2JsZW1NYXRjaGVycztcbiAgICAgICAgICAgICAgICB0aGlzLl9oYXNEZWZpbmVkTWF0Y2hlcnMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvYmxlbU1hdGNoZXJzID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5faGFzRGVmaW5lZE1hdGNoZXJzID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9pc0JhY2tncm91bmQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgX2lkKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19pZDtcbiAgICAgICAgfVxuICAgICAgICBzZXQgX2lkKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9faWQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9faWQgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX19pZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuX3Njb3BlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fZGVmaW5pdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmICh0aGlzLl9leGVjdXRpb24gaW5zdGFuY2VvZiBQcm9jZXNzRXhlY3V0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVmaW5pdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Byb2Nlc3MnLFxuICAgICAgICAgICAgICAgICAgICBpZDogdGhpcy5fZXhlY3V0aW9uLmNvbXB1dGVJZCgpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuX2V4ZWN1dGlvbiBpbnN0YW5jZW9mIFNoZWxsRXhlY3V0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVmaW5pdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3NoZWxsJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2V4ZWN1dGlvbi5jb21wdXRlSWQoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGRlZmluaXRpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZGVmaW5pdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBzZXQgZGVmaW5pdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB2b2lkIDAgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ0tpbmQgY2FuXFwndCBiZSB1bmRlZmluZWQgb3IgbnVsbCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fZGVmaW5pdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBzY29wZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zY29wZTtcbiAgICAgICAgfVxuICAgICAgICBzZXQgdGFyZ2V0KHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl9zY29wZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBuYW1lKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX25hbWU7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IG5hbWUodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCduYW1lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl9uYW1lID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGV4ZWN1dGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRpb247XG4gICAgICAgIH1cbiAgICAgICAgc2V0IGV4ZWN1dGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl9leGVjdXRpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgcHJvYmxlbU1hdGNoZXJzKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2JsZW1NYXRjaGVycztcbiAgICAgICAgfVxuICAgICAgICBzZXQgcHJvYmxlbU1hdGNoZXJzKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvYmxlbU1hdGNoZXJzID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5faGFzRGVmaW5lZE1hdGNoZXJzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fcHJvYmxlbU1hdGNoZXJzID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9oYXNEZWZpbmVkTWF0Y2hlcnMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGdldCBoYXNEZWZpbmVkTWF0Y2hlcnMoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faGFzRGVmaW5lZE1hdGNoZXJzO1xuICAgICAgICB9XG4gICAgICAgIGdldCBpc0JhY2tncm91bmQoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNCYWNrZ3JvdW5kO1xuICAgICAgICB9XG4gICAgICAgIHNldCBpc0JhY2tncm91bmQodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdHJ1ZSAmJiB2YWx1ZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5faXNCYWNrZ3JvdW5kID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHNvdXJjZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHNvdXJjZSh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdzb3VyY2UgbXVzdCBiZSBhIHN0cmluZyBvZiBsZW5ndGggPiAwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2UgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgZ3JvdXAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ3JvdXA7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IGdyb3VwKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHZvaWQgMCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyb3VwID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX2dyb3VwID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHByZXNlbnRhdGlvbk9wdGlvbnMoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJlc2VudGF0aW9uT3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBzZXQgcHJlc2VudGF0aW9uT3B0aW9ucyh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl9wcmVzZW50YXRpb25PcHRpb25zID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2sgPSBUYXNrO1xuICAgIGxldCBQcm9ncmVzc0xvY2F0aW9uO1xuICAgIChmdW5jdGlvbiAoUHJvZ3Jlc3NMb2NhdGlvbikge1xuICAgICAgICBQcm9ncmVzc0xvY2F0aW9uW1Byb2dyZXNzTG9jYXRpb25bXCJTb3VyY2VDb250cm9sXCJdID0gMV0gPSBcIlNvdXJjZUNvbnRyb2xcIjtcbiAgICAgICAgUHJvZ3Jlc3NMb2NhdGlvbltQcm9ncmVzc0xvY2F0aW9uW1wiV2luZG93XCJdID0gMTBdID0gXCJXaW5kb3dcIjtcbiAgICAgICAgUHJvZ3Jlc3NMb2NhdGlvbltQcm9ncmVzc0xvY2F0aW9uW1wiTm90aWZpY2F0aW9uXCJdID0gMTVdID0gXCJOb3RpZmljYXRpb25cIjtcbiAgICB9KShQcm9ncmVzc0xvY2F0aW9uID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlByb2dyZXNzTG9jYXRpb24gfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Qcm9ncmVzc0xvY2F0aW9uID0ge30pKTtcbiAgICBjbGFzcyBUcmVlSXRlbSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGFyZzEsIGNvbGxhcHNpYmxlU3RhdGUgPSBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUuTm9uZSkge1xuICAgICAgICAgICAgdGhpcy5jb2xsYXBzaWJsZVN0YXRlID0gY29sbGFwc2libGVTdGF0ZTtcbiAgICAgICAgICAgIGlmIChhcmcxIGluc3RhbmNlb2YgdXJpXzEudnNjVXJpLlVSSSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzb3VyY2VVcmkgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYWJlbCA9IGFyZzE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRyZWVJdGVtID0gVHJlZUl0ZW07XG4gICAgbGV0IFRyZWVJdGVtQ29sbGFwc2libGVTdGF0ZTtcbiAgICAoZnVuY3Rpb24gKFRyZWVJdGVtQ29sbGFwc2libGVTdGF0ZSkge1xuICAgICAgICBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1wiTm9uZVwiXSA9IDBdID0gXCJOb25lXCI7XG4gICAgICAgIFRyZWVJdGVtQ29sbGFwc2libGVTdGF0ZVtUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbXCJDb2xsYXBzZWRcIl0gPSAxXSA9IFwiQ29sbGFwc2VkXCI7XG4gICAgICAgIFRyZWVJdGVtQ29sbGFwc2libGVTdGF0ZVtUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbXCJFeHBhbmRlZFwiXSA9IDJdID0gXCJFeHBhbmRlZFwiO1xuICAgIH0pKFRyZWVJdGVtQ29sbGFwc2libGVTdGF0ZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUgPSB7fSkpO1xuICAgIGNsYXNzIFRoZW1lSWNvbiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgVGhlbWVJY29uLkZpbGUgPSBuZXcgVGhlbWVJY29uKCdmaWxlJyk7XG4gICAgVGhlbWVJY29uLkZvbGRlciA9IG5ldyBUaGVtZUljb24oJ2ZvbGRlcicpO1xuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UaGVtZUljb24gPSBUaGVtZUljb247XG4gICAgY2xhc3MgVGhlbWVDb2xvciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRoZW1lQ29sb3IgPSBUaGVtZUNvbG9yO1xuICAgIGxldCBDb25maWd1cmF0aW9uVGFyZ2V0O1xuICAgIChmdW5jdGlvbiAoQ29uZmlndXJhdGlvblRhcmdldCkge1xuICAgICAgICBDb25maWd1cmF0aW9uVGFyZ2V0W0NvbmZpZ3VyYXRpb25UYXJnZXRbXCJHbG9iYWxcIl0gPSAxXSA9IFwiR2xvYmFsXCI7XG4gICAgICAgIENvbmZpZ3VyYXRpb25UYXJnZXRbQ29uZmlndXJhdGlvblRhcmdldFtcIldvcmtzcGFjZVwiXSA9IDJdID0gXCJXb3Jrc3BhY2VcIjtcbiAgICAgICAgQ29uZmlndXJhdGlvblRhcmdldFtDb25maWd1cmF0aW9uVGFyZ2V0W1wiV29ya3NwYWNlRm9sZGVyXCJdID0gM10gPSBcIldvcmtzcGFjZUZvbGRlclwiO1xuICAgIH0pKENvbmZpZ3VyYXRpb25UYXJnZXQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29uZmlndXJhdGlvblRhcmdldCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbmZpZ3VyYXRpb25UYXJnZXQgPSB7fSkpO1xuICAgIGNsYXNzIFJlbGF0aXZlUGF0dGVybiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGJhc2UsIHBhdHRlcm4pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYmFzZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWJhc2UgfHwgIXVyaV8xLnZzY1VyaS5VUkkuaXNVcmkoYmFzZS51cmkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnYmFzZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3BhdHRlcm4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYmFzZSA9IHR5cGVvZiBiYXNlID09PSAnc3RyaW5nJyA/IGJhc2UgOiBiYXNlLnVyaS5mc1BhdGg7XG4gICAgICAgICAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICAgICAgICB9XG4gICAgICAgIHBhdGhUb1JlbGF0aXZlKGZyb20sIHRvKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aF8xLnJlbGF0aXZlKGZyb20sIHRvKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUmVsYXRpdmVQYXR0ZXJuID0gUmVsYXRpdmVQYXR0ZXJuO1xuICAgIGNsYXNzIEJyZWFrcG9pbnQge1xuICAgICAgICBjb25zdHJ1Y3RvcihlbmFibGVkLCBjb25kaXRpb24sIGhpdENvbmRpdGlvbiwgbG9nTWVzc2FnZSkge1xuICAgICAgICAgICAgdGhpcy5lbmFibGVkID0gdHlwZW9mIGVuYWJsZWQgPT09ICdib29sZWFuJyA/IGVuYWJsZWQgOiB0cnVlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25kaXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25kaXRpb24gPSBjb25kaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGhpdENvbmRpdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvbmRpdGlvbiA9IGhpdENvbmRpdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbG9nTWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ01lc3NhZ2UgPSBsb2dNZXNzYWdlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5CcmVha3BvaW50ID0gQnJlYWtwb2ludDtcbiAgICBjbGFzcyBTb3VyY2VCcmVha3BvaW50IGV4dGVuZHMgQnJlYWtwb2ludCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGxvY2F0aW9uLCBlbmFibGVkLCBjb25kaXRpb24sIGhpdENvbmRpdGlvbiwgbG9nTWVzc2FnZSkge1xuICAgICAgICAgICAgc3VwZXIoZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpO1xuICAgICAgICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdsb2NhdGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbiA9IGxvY2F0aW9uO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Tb3VyY2VCcmVha3BvaW50ID0gU291cmNlQnJlYWtwb2ludDtcbiAgICBjbGFzcyBGdW5jdGlvbkJyZWFrcG9pbnQgZXh0ZW5kcyBCcmVha3BvaW50IHtcbiAgICAgICAgY29uc3RydWN0b3IoZnVuY3Rpb25OYW1lLCBlbmFibGVkLCBjb25kaXRpb24sIGhpdENvbmRpdGlvbiwgbG9nTWVzc2FnZSkge1xuICAgICAgICAgICAgc3VwZXIoZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpO1xuICAgICAgICAgICAgaWYgKCFmdW5jdGlvbk5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2Z1bmN0aW9uTmFtZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5mdW5jdGlvbk5hbWUgPSBmdW5jdGlvbk5hbWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZ1bmN0aW9uQnJlYWtwb2ludCA9IEZ1bmN0aW9uQnJlYWtwb2ludDtcbiAgICBjbGFzcyBEZWJ1Z0FkYXB0ZXJFeGVjdXRhYmxlIHtcbiAgICAgICAgY29uc3RydWN0b3IoY29tbWFuZCwgYXJncykge1xuICAgICAgICAgICAgdGhpcy5jb21tYW5kID0gY29tbWFuZDtcbiAgICAgICAgICAgIHRoaXMuYXJncyA9IGFyZ3M7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRlYnVnQWRhcHRlckV4ZWN1dGFibGUgPSBEZWJ1Z0FkYXB0ZXJFeGVjdXRhYmxlO1xuICAgIGxldCBMb2dMZXZlbDtcbiAgICAoZnVuY3Rpb24gKExvZ0xldmVsKSB7XG4gICAgICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiVHJhY2VcIl0gPSAxXSA9IFwiVHJhY2VcIjtcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJEZWJ1Z1wiXSA9IDJdID0gXCJEZWJ1Z1wiO1xuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIkluZm9cIl0gPSAzXSA9IFwiSW5mb1wiO1xuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIldhcm5pbmdcIl0gPSA0XSA9IFwiV2FybmluZ1wiO1xuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIkVycm9yXCJdID0gNV0gPSBcIkVycm9yXCI7XG4gICAgICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiQ3JpdGljYWxcIl0gPSA2XSA9IFwiQ3JpdGljYWxcIjtcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJPZmZcIl0gPSA3XSA9IFwiT2ZmXCI7XG4gICAgfSkoTG9nTGV2ZWwgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuTG9nTGV2ZWwgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Mb2dMZXZlbCA9IHt9KSk7XG4gICAgLy8jcmVnaW9uIGZpbGUgYXBpXG4gICAgbGV0IEZpbGVDaGFuZ2VUeXBlO1xuICAgIChmdW5jdGlvbiAoRmlsZUNoYW5nZVR5cGUpIHtcbiAgICAgICAgRmlsZUNoYW5nZVR5cGVbRmlsZUNoYW5nZVR5cGVbXCJDaGFuZ2VkXCJdID0gMV0gPSBcIkNoYW5nZWRcIjtcbiAgICAgICAgRmlsZUNoYW5nZVR5cGVbRmlsZUNoYW5nZVR5cGVbXCJDcmVhdGVkXCJdID0gMl0gPSBcIkNyZWF0ZWRcIjtcbiAgICAgICAgRmlsZUNoYW5nZVR5cGVbRmlsZUNoYW5nZVR5cGVbXCJEZWxldGVkXCJdID0gM10gPSBcIkRlbGV0ZWRcIjtcbiAgICB9KShGaWxlQ2hhbmdlVHlwZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5GaWxlQ2hhbmdlVHlwZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZpbGVDaGFuZ2VUeXBlID0ge30pKTtcbiAgICBjbGFzcyBGaWxlU3lzdGVtRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHVyaU9yTWVzc2FnZSwgY29kZSwgdGVybWluYXRvcikge1xuICAgICAgICAgICAgc3VwZXIodXJpXzEudnNjVXJpLlVSSS5pc1VyaSh1cmlPck1lc3NhZ2UpID8gdXJpT3JNZXNzYWdlLnRvU3RyaW5nKHRydWUpIDogdXJpT3JNZXNzYWdlKTtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IGNvZGUgPyBgJHtjb2RlfSAoRmlsZVN5c3RlbUVycm9yKWAgOiBgRmlsZVN5c3RlbUVycm9yYDtcbiAgICAgICAgICAgIC8vIHdvcmthcm91bmQgd2hlbiBleHRlbmRpbmcgYnVpbHRpbiBvYmplY3RzIGFuZCB3aGVuIGNvbXBpbGluZyB0byBFUzUsIHNlZTpcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC13aWtpL2Jsb2IvbWFzdGVyL0JyZWFraW5nLUNoYW5nZXMubWQjZXh0ZW5kaW5nLWJ1aWx0LWlucy1saWtlLWVycm9yLWFycmF5LWFuZC1tYXAtbWF5LW5vLWxvbmdlci13b3JrXG4gICAgICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5zZXRQcm90b3R5cGVPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBGaWxlU3lzdGVtRXJyb3IucHJvdG90eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRlcm1pbmF0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAvLyBuaWNlIHN0YWNrIHRyYWNlc1xuICAgICAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRlcm1pbmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBGaWxlRXhpc3RzKG1lc3NhZ2VPclVyaSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaWxlU3lzdGVtRXJyb3IobWVzc2FnZU9yVXJpLCAnRW50cnlFeGlzdHMnLCBGaWxlU3lzdGVtRXJyb3IuRmlsZUV4aXN0cyk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIEZpbGVOb3RGb3VuZChtZXNzYWdlT3JVcmkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmlsZVN5c3RlbUVycm9yKG1lc3NhZ2VPclVyaSwgJ0VudHJ5Tm90Rm91bmQnLCBGaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEZvdW5kKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgRmlsZU5vdEFEaXJlY3RvcnkobWVzc2FnZU9yVXJpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpbGVTeXN0ZW1FcnJvcihtZXNzYWdlT3JVcmksICdFbnRyeU5vdEFEaXJlY3RvcnknLCBGaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEFEaXJlY3RvcnkpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBGaWxlSXNBRGlyZWN0b3J5KG1lc3NhZ2VPclVyaSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaWxlU3lzdGVtRXJyb3IobWVzc2FnZU9yVXJpLCAnRW50cnlJc0FEaXJlY3RvcnknLCBGaWxlU3lzdGVtRXJyb3IuRmlsZUlzQURpcmVjdG9yeSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGljIE5vUGVybWlzc2lvbnMobWVzc2FnZU9yVXJpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpbGVTeXN0ZW1FcnJvcihtZXNzYWdlT3JVcmksICdOb1Blcm1pc3Npb25zJywgRmlsZVN5c3RlbUVycm9yLk5vUGVybWlzc2lvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRpYyBVbmF2YWlsYWJsZShtZXNzYWdlT3JVcmkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmlsZVN5c3RlbUVycm9yKG1lc3NhZ2VPclVyaSwgJ1VuYXZhaWxhYmxlJywgRmlsZVN5c3RlbUVycm9yLlVuYXZhaWxhYmxlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRmlsZVN5c3RlbUVycm9yID0gRmlsZVN5c3RlbUVycm9yO1xuICAgIC8vI2VuZHJlZ2lvblxuICAgIC8vI3JlZ2lvbiBmb2xkaW5nIGFwaVxuICAgIGNsYXNzIEZvbGRpbmdSYW5nZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHN0YXJ0LCBlbmQsIGtpbmQpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgIHRoaXMuZW5kID0gZW5kO1xuICAgICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRm9sZGluZ1JhbmdlID0gRm9sZGluZ1JhbmdlO1xuICAgIGxldCBGb2xkaW5nUmFuZ2VLaW5kO1xuICAgIChmdW5jdGlvbiAoRm9sZGluZ1JhbmdlS2luZCkge1xuICAgICAgICBGb2xkaW5nUmFuZ2VLaW5kW0ZvbGRpbmdSYW5nZUtpbmRbXCJDb21tZW50XCJdID0gMV0gPSBcIkNvbW1lbnRcIjtcbiAgICAgICAgRm9sZGluZ1JhbmdlS2luZFtGb2xkaW5nUmFuZ2VLaW5kW1wiSW1wb3J0c1wiXSA9IDJdID0gXCJJbXBvcnRzXCI7XG4gICAgICAgIEZvbGRpbmdSYW5nZUtpbmRbRm9sZGluZ1JhbmdlS2luZFtcIlJlZ2lvblwiXSA9IDNdID0gXCJSZWdpb25cIjtcbiAgICB9KShGb2xkaW5nUmFuZ2VLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZvbGRpbmdSYW5nZUtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Gb2xkaW5nUmFuZ2VLaW5kID0ge30pKTtcbiAgICAvLyNlbmRyZWdpb25cbiAgICBsZXQgQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGU7XG4gICAgKGZ1bmN0aW9uIChDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lcyBhbiBpdGVtIGlzIGNvbGxhcHNlZFxuICAgICAgICAgKi9cbiAgICAgICAgQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGVbQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGVbXCJDb2xsYXBzZWRcIl0gPSAwXSA9IFwiQ29sbGFwc2VkXCI7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmVzIGFuIGl0ZW0gaXMgZXhwYW5kZWRcbiAgICAgICAgICovXG4gICAgICAgIENvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlW0NvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlW1wiRXhwYW5kZWRcIl0gPSAxXSA9IFwiRXhwYW5kZWRcIjtcbiAgICB9KShDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlID0ge30pKTtcbn0pKHZzY01vY2tFeHRIb3N0ZWRUeXBlcyA9IGV4cG9ydHMudnNjTW9ja0V4dEhvc3RlZFR5cGVzIHx8IChleHBvcnRzLnZzY01vY2tFeHRIb3N0ZWRUeXBlcyA9IHt9KSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1leHRIb3N0ZWRUeXBlcy5qcy5tYXAiXX0=