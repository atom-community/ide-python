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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4dEhvc3RlZFR5cGVzLmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwicGF0aF8xIiwicmVxdWlyZSIsImh0bWxDb250ZW50XzEiLCJzdHJpbmdzXzEiLCJ1cmlfMSIsInZzY01vY2tFeHRIb3N0ZWRUeXBlcyIsImlsbGVnYWxBcmd1bWVudCIsIm1zZyIsIkVycm9yIiwiRGlzcG9zYWJsZSIsImNvbnN0cnVjdG9yIiwiY2FsbE9uRGlzcG9zZSIsIl9jYWxsT25EaXNwb3NlIiwiZnJvbSIsImRpc3Bvc2FibGVzIiwiZGlzcG9zYWJsZSIsImRpc3Bvc2UiLCJ1bmRlZmluZWQiLCJQb3NpdGlvbiIsImxpbmUiLCJjaGFyYWN0ZXIiLCJfbGluZSIsIl9jaGFyYWN0ZXIiLCJNaW4iLCJwb3NpdGlvbnMiLCJyZXN1bHQiLCJwb3AiLCJwIiwiaXNCZWZvcmUiLCJNYXgiLCJpc0FmdGVyIiwiaXNQb3NpdGlvbiIsIm90aGVyIiwiaXNCZWZvcmVPckVxdWFsIiwiaXNBZnRlck9yRXF1YWwiLCJpc0VxdWFsIiwiY29tcGFyZVRvIiwidHJhbnNsYXRlIiwibGluZURlbHRhT3JDaGFuZ2UiLCJjaGFyYWN0ZXJEZWx0YSIsImxpbmVEZWx0YSIsIndpdGgiLCJsaW5lT3JDaGFuZ2UiLCJ0b0pTT04iLCJSYW5nZSIsInN0YXJ0TGluZU9yU3RhcnQiLCJzdGFydENvbHVtbk9yRW5kIiwiZW5kTGluZSIsImVuZENvbHVtbiIsInN0YXJ0IiwiZW5kIiwiX3N0YXJ0IiwiX2VuZCIsImlzUmFuZ2UiLCJ0aGluZyIsImNvbnRhaW5zIiwicG9zaXRpb25PclJhbmdlIiwiaW50ZXJzZWN0aW9uIiwidW5pb24iLCJpc0VtcHR5IiwiaXNTaW5nbGVMaW5lIiwic3RhcnRPckNoYW5nZSIsIlNlbGVjdGlvbiIsImFuY2hvckxpbmVPckFuY2hvciIsImFuY2hvckNvbHVtbk9yQWN0aXZlIiwiYWN0aXZlTGluZSIsImFjdGl2ZUNvbHVtbiIsImFuY2hvciIsImFjdGl2ZSIsIl9hbmNob3IiLCJfYWN0aXZlIiwiaXNTZWxlY3Rpb24iLCJpc1JldmVyc2VkIiwiRW5kT2ZMaW5lIiwiVGV4dEVkaXQiLCJyYW5nZSIsIm5ld1RleHQiLCJpc1RleHRFZGl0IiwicmVwbGFjZSIsImluc2VydCIsInBvc2l0aW9uIiwiZGVsZXRlIiwic2V0RW5kT2ZMaW5lIiwiZW9sIiwicmV0IiwibmV3RW9sIiwiX3JhbmdlIiwiX25ld1RleHQiLCJfbmV3RW9sIiwiV29ya3NwYWNlRWRpdCIsIl9zZXFQb29sIiwiX3Jlc291cmNlRWRpdHMiLCJfdGV4dEVkaXRzIiwiTWFwIiwiY3JlYXRlRmlsZSIsInVyaSIsIm9wdGlvbnMiLCJkZWxldGVGaWxlIiwicmVuYW1lRmlsZSIsIm9sZFVyaSIsIm5ld1VyaSIsImVkaXQiLCJhcnJheSIsImdldCIsInB1c2giLCJzZXQiLCJyZXNvdXJjZSIsImhhcyIsInRvU3RyaW5nIiwiZWRpdHMiLCJkYXRhIiwic2VxIiwic2xpY2UiLCJlbnRyaWVzIiwicmVzIiwiZm9yRWFjaCIsImFsbEVudHJpZXMiLCJzaXplIiwibGVuZ3RoIiwiU25pcHBldFN0cmluZyIsIl90YWJzdG9wIiwiaXNTbmlwcGV0U3RyaW5nIiwiX2VzY2FwZSIsImFwcGVuZFRleHQiLCJzdHJpbmciLCJhcHBlbmRUYWJzdG9wIiwibnVtYmVyIiwiYXBwZW5kUGxhY2Vob2xkZXIiLCJuZXN0ZWQiLCJhcHBlbmRWYXJpYWJsZSIsIm5hbWUiLCJkZWZhdWx0VmFsdWUiLCJEaWFnbm9zdGljVGFnIiwiRGlhZ25vc3RpY1NldmVyaXR5IiwiTG9jYXRpb24iLCJyYW5nZU9yUG9zaXRpb24iLCJpc0xvY2F0aW9uIiwidnNjVXJpIiwiVVJJIiwiaXNVcmkiLCJEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uIiwibG9jYXRpb24iLCJtZXNzYWdlIiwiaXMiLCJEaWFnbm9zdGljIiwic2V2ZXJpdHkiLCJzb3VyY2UiLCJjb2RlIiwiSG92ZXIiLCJjb250ZW50cyIsIkFycmF5IiwiaXNBcnJheSIsInZzY01vY2tIdG1sQ29udGVudCIsImlzTWFya2Rvd25TdHJpbmciLCJEb2N1bWVudEhpZ2hsaWdodEtpbmQiLCJEb2N1bWVudEhpZ2hsaWdodCIsImtpbmQiLCJUZXh0IiwiU3ltYm9sS2luZCIsIlN5bWJvbEluZm9ybWF0aW9uIiwicmFuZ2VPckNvbnRhaW5lciIsImxvY2F0aW9uT3JVcmkiLCJjb250YWluZXJOYW1lIiwiU3ltYm9sSW5mb3JtYXRpb24yIiwiY2hpbGRyZW4iLCJkZWZpbmluZ1JhbmdlIiwiQ29kZUFjdGlvblRyaWdnZXIiLCJDb2RlQWN0aW9uIiwidGl0bGUiLCJDb2RlQWN0aW9uS2luZCIsImFwcGVuZCIsInBhcnRzIiwic2VwIiwidnNjTW9ja1N0cmluZ3MiLCJzdGFydHNXaXRoIiwiRW1wdHkiLCJRdWlja0ZpeCIsIlJlZmFjdG9yIiwiUmVmYWN0b3JFeHRyYWN0IiwiUmVmYWN0b3JJbmxpbmUiLCJSZWZhY3RvclJld3JpdGUiLCJTb3VyY2UiLCJTb3VyY2VPcmdhbml6ZUltcG9ydHMiLCJDb2RlTGVucyIsImNvbW1hbmQiLCJpc1Jlc29sdmVkIiwiTWFya2Rvd25TdHJpbmciLCJhcHBlbmRNYXJrZG93biIsImFwcGVuZENvZGVibG9jayIsImxhbmd1YWdlIiwiUGFyYW1ldGVySW5mb3JtYXRpb24iLCJsYWJlbCIsImRvY3VtZW50YXRpb24iLCJTaWduYXR1cmVJbmZvcm1hdGlvbiIsInBhcmFtZXRlcnMiLCJTaWduYXR1cmVIZWxwIiwic2lnbmF0dXJlcyIsIkNvbXBsZXRpb25UcmlnZ2VyS2luZCIsIkNvbXBsZXRpb25JdGVtS2luZCIsIkNvbXBsZXRpb25JdGVtIiwiZGV0YWlsIiwic29ydFRleHQiLCJmaWx0ZXJUZXh0IiwiaW5zZXJ0VGV4dCIsInRleHRFZGl0IiwiQ29tcGxldGlvbkxpc3QiLCJpdGVtcyIsImlzSW5jb21wbGV0ZSIsIlZpZXdDb2x1bW4iLCJTdGF0dXNCYXJBbGlnbm1lbnQiLCJUZXh0RWRpdG9yTGluZU51bWJlcnNTdHlsZSIsIlRleHREb2N1bWVudFNhdmVSZWFzb24iLCJUZXh0RWRpdG9yUmV2ZWFsVHlwZSIsIlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kIiwiRGVjb3JhdGlvblJhbmdlQmVoYXZpb3IiLCJmcm9tVmFsdWUiLCJzIiwiS2V5Ym9hcmQiLCJNb3VzZSIsIkNvbW1hbmQiLCJEb2N1bWVudExpbmsiLCJ0YXJnZXQiLCJDb2xvciIsInJlZCIsImdyZWVuIiwiYmx1ZSIsImFscGhhIiwiQ29sb3JJbmZvcm1hdGlvbiIsImNvbG9yIiwiQ29sb3JQcmVzZW50YXRpb24iLCJDb2xvckZvcm1hdCIsIlNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlIiwiVGFza1JldmVhbEtpbmQiLCJUYXNrUGFuZWxLaW5kIiwiVGFza0dyb3VwIiwiaWQiLCJfbGFiZWwiLCJfaWQiLCJDbGVhbiIsIkJ1aWxkIiwiUmVidWlsZCIsIlRlc3QiLCJQcm9jZXNzRXhlY3V0aW9uIiwicHJvY2VzcyIsInZhcmcxIiwidmFyZzIiLCJfcHJvY2VzcyIsIl9hcmdzIiwiX29wdGlvbnMiLCJhcmdzIiwiY29tcHV0ZUlkIiwiU2hlbGxFeGVjdXRpb24iLCJhcmcwIiwiYXJnMSIsImFyZzIiLCJfY29tbWFuZCIsIl9jb21tYW5kTGluZSIsImNvbW1hbmRMaW5lIiwiU2hlbGxRdW90aW5nIiwiVGFza1Njb3BlIiwiVGFzayIsImRlZmluaXRpb24iLCJhcmczIiwiYXJnNCIsImFyZzUiLCJhcmc2IiwicHJvYmxlbU1hdGNoZXJzIiwiZXhlY3V0aW9uIiwiR2xvYmFsIiwiV29ya3NwYWNlIiwiX3Byb2JsZW1NYXRjaGVycyIsIl9oYXNEZWZpbmVkTWF0Y2hlcnMiLCJfaXNCYWNrZ3JvdW5kIiwiX19pZCIsImNsZWFyIiwiX3Njb3BlIiwiX2RlZmluaXRpb24iLCJfZXhlY3V0aW9uIiwidHlwZSIsInNjb3BlIiwiX25hbWUiLCJoYXNEZWZpbmVkTWF0Y2hlcnMiLCJpc0JhY2tncm91bmQiLCJfc291cmNlIiwiZ3JvdXAiLCJfZ3JvdXAiLCJwcmVzZW50YXRpb25PcHRpb25zIiwiX3ByZXNlbnRhdGlvbk9wdGlvbnMiLCJQcm9ncmVzc0xvY2F0aW9uIiwiVHJlZUl0ZW0iLCJjb2xsYXBzaWJsZVN0YXRlIiwiVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlIiwiTm9uZSIsInJlc291cmNlVXJpIiwiVGhlbWVJY29uIiwiRmlsZSIsIkZvbGRlciIsIlRoZW1lQ29sb3IiLCJDb25maWd1cmF0aW9uVGFyZ2V0IiwiUmVsYXRpdmVQYXR0ZXJuIiwiYmFzZSIsInBhdHRlcm4iLCJmc1BhdGgiLCJwYXRoVG9SZWxhdGl2ZSIsInRvIiwicmVsYXRpdmUiLCJCcmVha3BvaW50IiwiZW5hYmxlZCIsImNvbmRpdGlvbiIsImhpdENvbmRpdGlvbiIsImxvZ01lc3NhZ2UiLCJTb3VyY2VCcmVha3BvaW50IiwiRnVuY3Rpb25CcmVha3BvaW50IiwiZnVuY3Rpb25OYW1lIiwiRGVidWdBZGFwdGVyRXhlY3V0YWJsZSIsIkxvZ0xldmVsIiwiRmlsZUNoYW5nZVR5cGUiLCJGaWxlU3lzdGVtRXJyb3IiLCJ1cmlPck1lc3NhZ2UiLCJ0ZXJtaW5hdG9yIiwic2V0UHJvdG90eXBlT2YiLCJwcm90b3R5cGUiLCJjYXB0dXJlU3RhY2tUcmFjZSIsIkZpbGVFeGlzdHMiLCJtZXNzYWdlT3JVcmkiLCJGaWxlTm90Rm91bmQiLCJGaWxlTm90QURpcmVjdG9yeSIsIkZpbGVJc0FEaXJlY3RvcnkiLCJOb1Blcm1pc3Npb25zIiwiVW5hdmFpbGFibGUiLCJGb2xkaW5nUmFuZ2UiLCJGb2xkaW5nUmFuZ2VLaW5kIiwiQ29tbWVudFRocmVhZENvbGxhcHNpYmxlU3RhdGUiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0MsRSxDQUNBO0FBQ0E7O0FBQ0EsTUFBTUMsTUFBTSxHQUFHQyxPQUFPLENBQUMs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QUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxRQUFELENBQVYsR0FBdUIsQ0FBeEIsQ0FBVixHQUF1QyxRQUF2QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxXQUFELENBQVYsR0FBMEIsQ0FBM0IsQ0FBVixHQUEwQyxXQUExQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxTQUFELENBQVYsR0FBd0IsQ0FBekIsQ0FBVixHQUF3QyxTQUF4QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxPQUFELENBQVYsR0FBc0IsQ0FBdkIsQ0FBVixHQUFzQyxPQUF0QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxRQUFELENBQVYsR0FBdUIsQ0FBeEIsQ0FBVixHQUF1QyxRQUF2QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFELENBQVYsR0FBeUIsQ0FBMUIsQ0FBVixHQUF5QyxVQUF6QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxPQUFELENBQVYsR0FBc0IsQ0FBdkIsQ0FBVixHQUFzQyxPQUF0QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxhQUFELENBQVYsR0FBNEIsQ0FBN0IsQ0FBVixHQUE0QyxhQUE1QztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxNQUFELENBQVYsR0FBcUIsQ0FBdEIsQ0FBVixHQUFxQyxNQUFyQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxXQUFELENBQVYsR0FBMEIsRUFBM0IsQ0FBVixHQUEyQyxXQUEzQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFELENBQVYsR0FBeUIsRUFBMUIsQ0FBVixHQUEwQyxVQUExQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFELENBQVYsR0FBeUIsRUFBMUIsQ0FBVixHQUEwQyxVQUExQztBQUNBQSxJQUFBQSxVQUFVLENBQUNBLFVBQVUsQ0FBQyxVQUFE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QUQsQ0FBbEIsR0FBNkIsRUFBOUIsQ0FBbEIsR0FBc0QsTUFBdEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE9BQUQsQ0FBbEIsR0FBOEIsRUFBL0IsQ0FBbEIsR0FBdUQsT0FBdkQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE1BQUQsQ0FBbEIsR0FBNkIsRUFBOUIsQ0FBbEIsR0FBc0QsTUFBdEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFNBQUQsQ0FBbEIsR0FBZ0MsRUFBakMsQ0FBbEIsR0FBeUQsU0FBekQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFNBQUQsQ0FBbEIsR0FBZ0MsRUFBakMsQ0FBbEIsR0FBeUQsU0FBekQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE9BQUQsQ0FBbEIsR0FBOEIsRUFBL0IsQ0FBbEIsR0FBdUQsT0FBdkQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLE1BQUQsQ0FBbEIsR0FBNkIsRUFBOUIsQ0FBbEIsR0FBc0QsTUFBdEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFdBQUQsQ0FBbEIsR0FBa0MsRUFBbkMsQ0FBbEIsR0FBMkQsV0FBM0Q7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFFBQUQsQ0FBbEIsR0FBK0IsRUFBaEMsQ0FBbEIsR0FBd0QsUUFBeEQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFlBQUQsQ0FBbEIsR0FBbUMsRUFBcEMsQ0FBbEIsR0FBNEQsWUFBNUQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFVBQUQsQ0FBbEIsR0FBaUMsRUFBbEMsQ0FBbEIsR0FBMEQsVUFBMUQ7QUFDQUEsSUFBQUEsa0JBQWtCLENBQUNBLGtCQUFrQixDQUFDLFFBQUQsQ0FBbEIsR0FBK0IsRUFBaEMsQ0FBbEIsR0FBd0QsUUFBeEQ7QUFD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QUlDLGdCQUFKOztBQUNBLEdBQUMsVUFBVUEsZ0JBQVYsRUFBNEI7QUFDekJBLElBQUFBLGdCQUFnQixDQUFDQSxnQkFBZ0IsQ0FBQyxTQUFELENBQWhCLEdBQThCLENBQS9CLENBQWhCLEdBQW9ELFNBQXBEO0FBQ0FBLElBQUFBLGdCQUFnQixDQUFDQSxnQkFBZ0IsQ0FBQyxTQUFELENBQWhCLEdBQThCLENBQS9CLENBQWhCLEdBQW9ELFNBQXBEO0FBQ0FBLElBQUFBLGdCQUFnQixDQUFDQSxnQkFBZ0IsQ0FBQyxRQUFELENBQWhCLEdBQTZCLENBQTlCLENBQWhCLEdBQW1ELFFBQW5EO0FBQ0gsR0FKRCxFQUlHQSxnQkFBZ0IsR0FBR3RVLHFCQUFxQixDQUFDc1UsZ0JBQXRCLEtBQTJDdFUscUJBQXFCLENBQUNzVSxnQkFBdEIsR0FBeUMsRUFBcEYsQ0FKdEIsRUFuL0M4QixDQXcvQzlCOzs7QUFDQSxNQUFJQyw2QkFBSjs7QUFDQSxHQUFDLFVBQVVBLDZCQUFWLEVBQXlDO0FBQ3RDO0FBQ1I7QUFDQTtBQUNRQSxJQUFBQSw2QkFBNkIsQ0FBQ0EsNkJBQTZCLENBQUMsV0FBRCxDQUE3QixHQUE2QyxDQUE5QyxDQUE3QixHQUFnRixXQUFoRjtBQUNBO0FBQ1I7QUFDQTs7QUFDUUEsSUFBQUEsNkJBQTZCLENBQUNBLDZCQUE2QixDQUFDLFVBQUQsQ0FBN0IsR0FBNEMsQ0FBN0MsQ0FBN0IsR0FBK0UsVUFBL0U7QUFDSCxHQVRELEVBU0dBLDZCQUE2QixHQUFHdlUscUJBQXFCLENBQUN1VSw2QkFBdEIsS0FBd0R2VSxxQkFBcUIsQ0FBQ3VVLDZCQUF0QixHQUFzRCxFQUE5RyxDQVRuQztBQVVILENBcGdERCxFQW9nREd2VSxxQkFBcUIsR0FBR1AsT0FBTyxDQUFDTyxxQkFBUixLQUFrQ1AsT0FBTyxDQUFDTyxxQkFBUixHQUFnQyxFQUFsRSxDQXBnRDNCIiwic291cmNlc0NvbnRlbnQiOlsiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cclxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbid1c2Ugc3RyaWN0JztcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4vLyBpbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuLy8gdHNsaW50OmRpc2FibGU6YWxsXHJcbmNvbnN0IHBhdGhfMSA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5jb25zdCBodG1sQ29udGVudF8xID0gcmVxdWlyZShcIi4vaHRtbENvbnRlbnRcIik7XHJcbmNvbnN0IHN0cmluZ3NfMSA9IHJlcXVpcmUoXCIuL3N0cmluZ3NcIik7XHJcbmNvbnN0IHVyaV8xID0gcmVxdWlyZShcIi4vdXJpXCIpO1xyXG52YXIgdnNjTW9ja0V4dEhvc3RlZFR5cGVzO1xyXG4oZnVuY3Rpb24gKHZzY01vY2tFeHRIb3N0ZWRUeXBlcykge1xyXG4gICAgLy8gdHNsaW50OmRpc2FibGU6YWxsXHJcbiAgICBjb25zdCBpbGxlZ2FsQXJndW1lbnQgPSAobXNnID0gJ0lsbGVnYWwgQXJndW1lbnQnKSA9PiBuZXcgRXJyb3IobXNnKTtcclxuICAgIGNsYXNzIERpc3Bvc2FibGUge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGNhbGxPbkRpc3Bvc2UpIHtcclxuICAgICAgICAgICAgdGhpcy5fY2FsbE9uRGlzcG9zZSA9IGNhbGxPbkRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyBmcm9tKC4uLmRpc3Bvc2FibGVzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGlzcG9zYWJsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBkaXNwb3NhYmxlIG9mIGRpc3Bvc2FibGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNwb3NhYmxlICYmIHR5cGVvZiBkaXNwb3NhYmxlLmRpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3Bvc2FibGUuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGRpc3Bvc2FibGVzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGlzcG9zZSgpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9jYWxsT25EaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWxsT25EaXNwb3NlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWxsT25EaXNwb3NlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpc3Bvc2FibGUgPSBEaXNwb3NhYmxlO1xyXG4gICAgY2xhc3MgUG9zaXRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGxpbmUsIGNoYXJhY3Rlcikge1xyXG4gICAgICAgICAgICBpZiAobGluZSA8IDApIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbGluZSBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2NoYXJhY3RlciBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2xpbmUgPSBsaW5lO1xyXG4gICAgICAgICAgICB0aGlzLl9jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyBNaW4oLi4ucG9zaXRpb25zKSB7XHJcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSBwb3NpdGlvbnMucG9wKCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHAgb2YgcG9zaXRpb25zKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocC5pc0JlZm9yZShyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgTWF4KC4uLnBvc2l0aW9ucykge1xyXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gcG9zaXRpb25zLnBvcCgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIHBvc2l0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHAuaXNBZnRlcihyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgaXNQb3NpdGlvbihvdGhlcikge1xyXG4gICAgICAgICAgICBpZiAoIW90aGVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG90aGVyIGluc3RhbmNlb2YgUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gb3RoZXI7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGluZSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIGNoYXJhY3RlciA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGxpbmUoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgY2hhcmFjdGVyKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2hhcmFjdGVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpc0JlZm9yZShvdGhlcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fbGluZSA8IG90aGVyLl9saW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3RoZXIuX2xpbmUgPCB0aGlzLl9saW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoYXJhY3RlciA8IG90aGVyLl9jaGFyYWN0ZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlzQmVmb3JlT3JFcXVhbChvdGhlcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fbGluZSA8IG90aGVyLl9saW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3RoZXIuX2xpbmUgPCB0aGlzLl9saW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoYXJhY3RlciA8PSBvdGhlci5fY2hhcmFjdGVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpc0FmdGVyKG90aGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5pc0JlZm9yZU9yRXF1YWwob3RoZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpc0FmdGVyT3JFcXVhbChvdGhlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gIXRoaXMuaXNCZWZvcmUob3RoZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpc0VxdWFsKG90aGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lID09PSBvdGhlci5fbGluZSAmJiB0aGlzLl9jaGFyYWN0ZXIgPT09IG90aGVyLl9jaGFyYWN0ZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbXBhcmVUbyhvdGhlcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fbGluZSA8IG90aGVyLl9saW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5fbGluZSA+IG90aGVyLmxpbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gZXF1YWwgbGluZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NoYXJhY3RlciA8IG90aGVyLl9jaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9jaGFyYWN0ZXIgPiBvdGhlci5fY2hhcmFjdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBlcXVhbCBsaW5lIGFuZCBjaGFyYWN0ZXJcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0cmFuc2xhdGUobGluZURlbHRhT3JDaGFuZ2UsIGNoYXJhY3RlckRlbHRhID0gMCkge1xyXG4gICAgICAgICAgICBpZiAobGluZURlbHRhT3JDaGFuZ2UgPT09IG51bGwgfHwgY2hhcmFjdGVyRGVsdGEgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBsaW5lRGVsdGE7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGluZURlbHRhT3JDaGFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5lRGVsdGEgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBsaW5lRGVsdGFPckNoYW5nZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgICAgIGxpbmVEZWx0YSA9IGxpbmVEZWx0YU9yQ2hhbmdlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGluZURlbHRhID0gdHlwZW9mIGxpbmVEZWx0YU9yQ2hhbmdlLmxpbmVEZWx0YSA9PT0gJ251bWJlcicgPyBsaW5lRGVsdGFPckNoYW5nZS5saW5lRGVsdGEgOiAwO1xyXG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyRGVsdGEgPSB0eXBlb2YgbGluZURlbHRhT3JDaGFuZ2UuY2hhcmFjdGVyRGVsdGEgPT09ICdudW1iZXInID8gbGluZURlbHRhT3JDaGFuZ2UuY2hhcmFjdGVyRGVsdGEgOiAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChsaW5lRGVsdGEgPT09IDAgJiYgY2hhcmFjdGVyRGVsdGEgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUG9zaXRpb24odGhpcy5saW5lICsgbGluZURlbHRhLCB0aGlzLmNoYXJhY3RlciArIGNoYXJhY3RlckRlbHRhKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgd2l0aChsaW5lT3JDaGFuZ2UsIGNoYXJhY3RlciA9IHRoaXMuY2hhcmFjdGVyKSB7XHJcbiAgICAgICAgICAgIGlmIChsaW5lT3JDaGFuZ2UgPT09IG51bGwgfHwgY2hhcmFjdGVyID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgbGluZTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaW5lT3JDaGFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5lID0gdGhpcy5saW5lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBsaW5lT3JDaGFuZ2UgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5lID0gbGluZU9yQ2hhbmdlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGluZSA9IHR5cGVvZiBsaW5lT3JDaGFuZ2UubGluZSA9PT0gJ251bWJlcicgPyBsaW5lT3JDaGFuZ2UubGluZSA6IHRoaXMubGluZTtcclxuICAgICAgICAgICAgICAgIGNoYXJhY3RlciA9IHR5cGVvZiBsaW5lT3JDaGFuZ2UuY2hhcmFjdGVyID09PSAnbnVtYmVyJyA/IGxpbmVPckNoYW5nZS5jaGFyYWN0ZXIgOiB0aGlzLmNoYXJhY3RlcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobGluZSA9PT0gdGhpcy5saW5lICYmIGNoYXJhY3RlciA9PT0gdGhpcy5jaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUG9zaXRpb24obGluZSwgY2hhcmFjdGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9KU09OKCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBsaW5lOiB0aGlzLmxpbmUsIGNoYXJhY3RlcjogdGhpcy5jaGFyYWN0ZXIgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUG9zaXRpb24gPSBQb3NpdGlvbjtcclxuICAgIGNsYXNzIFJhbmdlIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihzdGFydExpbmVPclN0YXJ0LCBzdGFydENvbHVtbk9yRW5kLCBlbmRMaW5lLCBlbmRDb2x1bW4pIHtcclxuICAgICAgICAgICAgbGV0IHN0YXJ0O1xyXG4gICAgICAgICAgICBsZXQgZW5kO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXJ0TGluZU9yU3RhcnQgPT09ICdudW1iZXInICYmIHR5cGVvZiBzdGFydENvbHVtbk9yRW5kID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgZW5kTGluZSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIGVuZENvbHVtbiA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gbmV3IFBvc2l0aW9uKHN0YXJ0TGluZU9yU3RhcnQsIHN0YXJ0Q29sdW1uT3JFbmQpO1xyXG4gICAgICAgICAgICAgICAgZW5kID0gbmV3IFBvc2l0aW9uKGVuZExpbmUsIGVuZENvbHVtbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoc3RhcnRMaW5lT3JTdGFydCBpbnN0YW5jZW9mIFBvc2l0aW9uICYmIHN0YXJ0Q29sdW1uT3JFbmQgaW5zdGFuY2VvZiBQb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBzdGFydExpbmVPclN0YXJ0O1xyXG4gICAgICAgICAgICAgICAgZW5kID0gc3RhcnRDb2x1bW5PckVuZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXN0YXJ0IHx8ICFlbmQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmd1bWVudHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc3RhcnQuaXNCZWZvcmUoZW5kKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnQgPSBzdGFydDtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2VuZCA9IGVuZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0ID0gZW5kO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZW5kID0gc3RhcnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIGlzUmFuZ2UodGhpbmcpIHtcclxuICAgICAgICAgICAgaWYgKHRoaW5nIGluc3RhbmNlb2YgUmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gUG9zaXRpb24uaXNQb3NpdGlvbih0aGluZy5zdGFydClcclxuICAgICAgICAgICAgICAgICYmIFBvc2l0aW9uLmlzUG9zaXRpb24odGhpbmcuZW5kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHN0YXJ0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RhcnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBlbmQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbmQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnRhaW5zKHBvc2l0aW9uT3JSYW5nZSkge1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb25PclJhbmdlIGluc3RhbmNlb2YgUmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRhaW5zKHBvc2l0aW9uT3JSYW5nZS5fc3RhcnQpXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgdGhpcy5jb250YWlucyhwb3NpdGlvbk9yUmFuZ2UuX2VuZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAocG9zaXRpb25PclJhbmdlIGluc3RhbmNlb2YgUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbk9yUmFuZ2UuaXNCZWZvcmUodGhpcy5fc3RhcnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2VuZC5pc0JlZm9yZShwb3NpdGlvbk9yUmFuZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpc0VxdWFsKG90aGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGFydC5pc0VxdWFsKG90aGVyLl9zdGFydCkgJiYgdGhpcy5fZW5kLmlzRXF1YWwob3RoZXIuX2VuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGludGVyc2VjdGlvbihvdGhlcikge1xyXG4gICAgICAgICAgICBsZXQgc3RhcnQgPSBQb3NpdGlvbi5NYXgob3RoZXIuc3RhcnQsIHRoaXMuX3N0YXJ0KTtcclxuICAgICAgICAgICAgbGV0IGVuZCA9IFBvc2l0aW9uLk1pbihvdGhlci5lbmQsIHRoaXMuX2VuZCk7XHJcbiAgICAgICAgICAgIGlmIChzdGFydC5pc0FmdGVyKGVuZCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMgaGFwcGVucyB3aGVuIHRoZXJlIGlzIG5vIG92ZXJsYXA6XHJcbiAgICAgICAgICAgICAgICAvLyB8LS0tLS18XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICB8LS0tLXxcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBSYW5nZShzdGFydCwgZW5kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdW5pb24ob3RoZXIpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbnMob3RoZXIpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChvdGhlci5jb250YWlucyh0aGlzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBzdGFydCA9IFBvc2l0aW9uLk1pbihvdGhlci5zdGFydCwgdGhpcy5fc3RhcnQpO1xyXG4gICAgICAgICAgICBsZXQgZW5kID0gUG9zaXRpb24uTWF4KG90aGVyLmVuZCwgdGhpcy5lbmQpO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJhbmdlKHN0YXJ0LCBlbmQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgaXNFbXB0eSgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXJ0LmlzRXF1YWwodGhpcy5fZW5kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGlzU2luZ2xlTGluZSgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXJ0LmxpbmUgPT09IHRoaXMuX2VuZC5saW5lO1xyXG4gICAgICAgIH1cclxuICAgICAgICB3aXRoKHN0YXJ0T3JDaGFuZ2UsIGVuZCA9IHRoaXMuZW5kKSB7XHJcbiAgICAgICAgICAgIGlmIChzdGFydE9yQ2hhbmdlID09PSBudWxsIHx8IGVuZCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHN0YXJ0O1xyXG4gICAgICAgICAgICBpZiAoIXN0YXJ0T3JDaGFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gdGhpcy5zdGFydDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChQb3NpdGlvbi5pc1Bvc2l0aW9uKHN0YXJ0T3JDaGFuZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IHN0YXJ0T3JDaGFuZ2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IHN0YXJ0T3JDaGFuZ2Uuc3RhcnQgfHwgdGhpcy5zdGFydDtcclxuICAgICAgICAgICAgICAgIGVuZCA9IHN0YXJ0T3JDaGFuZ2UuZW5kIHx8IHRoaXMuZW5kO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzdGFydC5pc0VxdWFsKHRoaXMuX3N0YXJ0KSAmJiBlbmQuaXNFcXVhbCh0aGlzLmVuZCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmFuZ2Uoc3RhcnQsIGVuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRvSlNPTigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFt0aGlzLnN0YXJ0LCB0aGlzLmVuZF07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlJhbmdlID0gUmFuZ2U7XHJcbiAgICBjbGFzcyBTZWxlY3Rpb24gZXh0ZW5kcyBSYW5nZSB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoYW5jaG9yTGluZU9yQW5jaG9yLCBhbmNob3JDb2x1bW5PckFjdGl2ZSwgYWN0aXZlTGluZSwgYWN0aXZlQ29sdW1uKSB7XHJcbiAgICAgICAgICAgIGxldCBhbmNob3I7XHJcbiAgICAgICAgICAgIGxldCBhY3RpdmU7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYW5jaG9yTGluZU9yQW5jaG9yID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgYW5jaG9yQ29sdW1uT3JBY3RpdmUgPT09ICdudW1iZXInICYmIHR5cGVvZiBhY3RpdmVMaW5lID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgYWN0aXZlQ29sdW1uID09PSAnbnVtYmVyJykge1xyXG4gICAgICAgICAgICAgICAgYW5jaG9yID0gbmV3IFBvc2l0aW9uKGFuY2hvckxpbmVPckFuY2hvciwgYW5jaG9yQ29sdW1uT3JBY3RpdmUpO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlID0gbmV3IFBvc2l0aW9uKGFjdGl2ZUxpbmUsIGFjdGl2ZUNvbHVtbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoYW5jaG9yTGluZU9yQW5jaG9yIGluc3RhbmNlb2YgUG9zaXRpb24gJiYgYW5jaG9yQ29sdW1uT3JBY3RpdmUgaW5zdGFuY2VvZiBQb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgYW5jaG9yID0gYW5jaG9yTGluZU9yQW5jaG9yO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlID0gYW5jaG9yQ29sdW1uT3JBY3RpdmU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFhbmNob3IgfHwgIWFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50cycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN1cGVyKGFuY2hvciwgYWN0aXZlKTtcclxuICAgICAgICAgICAgdGhpcy5fYW5jaG9yID0gYW5jaG9yO1xyXG4gICAgICAgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyBpc1NlbGVjdGlvbih0aGluZykge1xyXG4gICAgICAgICAgICBpZiAodGhpbmcgaW5zdGFuY2VvZiBTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gUmFuZ2UuaXNSYW5nZSh0aGluZylcclxuICAgICAgICAgICAgICAgICYmIFBvc2l0aW9uLmlzUG9zaXRpb24odGhpbmcuYW5jaG9yKVxyXG4gICAgICAgICAgICAgICAgJiYgUG9zaXRpb24uaXNQb3NpdGlvbih0aGluZy5hY3RpdmUpXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2YgdGhpbmcuaXNSZXZlcnNlZCA9PT0gJ2Jvb2xlYW4nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYW5jaG9yKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYW5jaG9yO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYWN0aXZlKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgaXNSZXZlcnNlZCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FuY2hvciA9PT0gdGhpcy5fZW5kO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b0pTT04oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydDogdGhpcy5zdGFydCxcclxuICAgICAgICAgICAgICAgIGVuZDogdGhpcy5lbmQsXHJcbiAgICAgICAgICAgICAgICBhY3RpdmU6IHRoaXMuYWN0aXZlLFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yOiB0aGlzLmFuY2hvclxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TZWxlY3Rpb24gPSBTZWxlY3Rpb247XHJcbiAgICBsZXQgRW5kT2ZMaW5lO1xyXG4gICAgKGZ1bmN0aW9uIChFbmRPZkxpbmUpIHtcclxuICAgICAgICBFbmRPZkxpbmVbRW5kT2ZMaW5lW1wiTEZcIl0gPSAxXSA9IFwiTEZcIjtcclxuICAgICAgICBFbmRPZkxpbmVbRW5kT2ZMaW5lW1wiQ1JMRlwiXSA9IDJdID0gXCJDUkxGXCI7XHJcbiAgICB9KShFbmRPZkxpbmUgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRW5kT2ZMaW5lIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRW5kT2ZMaW5lID0ge30pKTtcclxuICAgIGNsYXNzIFRleHRFZGl0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgbmV3VGV4dCkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XHJcbiAgICAgICAgICAgIHRoaXMubmV3VGV4dCA9IG5ld1RleHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyBpc1RleHRFZGl0KHRoaW5nKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGluZyBpbnN0YW5jZW9mIFRleHRFZGl0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFJhbmdlLmlzUmFuZ2UodGhpbmcpXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2YgdGhpbmcubmV3VGV4dCA9PT0gJ3N0cmluZyc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyByZXBsYWNlKHJhbmdlLCBuZXdUZXh0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGV4dEVkaXQocmFuZ2UsIG5ld1RleHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgaW5zZXJ0KHBvc2l0aW9uLCBuZXdUZXh0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBUZXh0RWRpdC5yZXBsYWNlKG5ldyBSYW5nZShwb3NpdGlvbiwgcG9zaXRpb24pLCBuZXdUZXh0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIGRlbGV0ZShyYW5nZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gVGV4dEVkaXQucmVwbGFjZShyYW5nZSwgJycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgc2V0RW5kT2ZMaW5lKGVvbCkge1xyXG4gICAgICAgICAgICBsZXQgcmV0ID0gbmV3IFRleHRFZGl0KHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgcmV0Lm5ld0VvbCA9IGVvbDtcclxuICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJhbmdlKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmFuZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCByYW5nZSh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgIVJhbmdlLmlzUmFuZ2UodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3JhbmdlJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fcmFuZ2UgPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IG5ld1RleHQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uZXdUZXh0IHx8ICcnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXQgbmV3VGV4dCh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCduZXdUZXh0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fbmV3VGV4dCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbmV3RW9sKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbmV3RW9sO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXQgbmV3RW9sKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ25ld0VvbCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX25ld0VvbCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b0pTT04oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy5yYW5nZSxcclxuICAgICAgICAgICAgICAgIG5ld1RleHQ6IHRoaXMubmV3VGV4dCxcclxuICAgICAgICAgICAgICAgIG5ld0VvbDogdGhpcy5fbmV3RW9sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0ID0gVGV4dEVkaXQ7XHJcbiAgICBjbGFzcyBXb3Jrc3BhY2VFZGl0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgdGhpcy5fc2VxUG9vbCA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuX3Jlc291cmNlRWRpdHMgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5fdGV4dEVkaXRzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBjcmVhdGVSZXNvdXJjZSh1cmk6IHZzY29kZS5VcmkpOiB2b2lkIHtcclxuICAgICAgICAvLyBcdHRoaXMucmVuYW1lUmVzb3VyY2UodW5kZWZpbmVkLCB1cmkpO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICAvLyBkZWxldGVSZXNvdXJjZSh1cmk6IHZzY29kZS5VcmkpOiB2b2lkIHtcclxuICAgICAgICAvLyBcdHRoaXMucmVuYW1lUmVzb3VyY2UodXJpLCB1bmRlZmluZWQpO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICAvLyByZW5hbWVSZXNvdXJjZShmcm9tOiB2c2NvZGUuVXJpLCB0bzogdnNjb2RlLlVyaSk6IHZvaWQge1xyXG4gICAgICAgIC8vIFx0dGhpcy5fcmVzb3VyY2VFZGl0cy5wdXNoKHsgc2VxOiB0aGlzLl9zZXFQb29sKyssIGZyb20sIHRvIH0pO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICAvLyByZXNvdXJjZUVkaXRzKCk6IFt2c2NvZGUuVXJpLCB2c2NvZGUuVXJpXVtdIHtcclxuICAgICAgICAvLyBcdHJldHVybiB0aGlzLl9yZXNvdXJjZUVkaXRzLm1hcCgoeyBmcm9tLCB0byB9KSA9PiAoPFt2c2NvZGUuVXJpLCB2c2NvZGUuVXJpXT5bZnJvbSwgdG9dKSk7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIGNyZWF0ZUZpbGUodXJpLCBvcHRpb25zKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGVGaWxlKHVyaSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVuYW1lRmlsZShvbGRVcmksIG5ld1VyaSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVwbGFjZSh1cmksIHJhbmdlLCBuZXdUZXh0KSB7XHJcbiAgICAgICAgICAgIGxldCBlZGl0ID0gbmV3IFRleHRFZGl0KHJhbmdlLCBuZXdUZXh0KTtcclxuICAgICAgICAgICAgbGV0IGFycmF5ID0gdGhpcy5nZXQodXJpKTtcclxuICAgICAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICBhcnJheS5wdXNoKGVkaXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXJyYXkgPSBbZWRpdF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zZXQodXJpLCBhcnJheSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluc2VydChyZXNvdXJjZSwgcG9zaXRpb24sIG5ld1RleHQpIHtcclxuICAgICAgICAgICAgdGhpcy5yZXBsYWNlKHJlc291cmNlLCBuZXcgUmFuZ2UocG9zaXRpb24sIHBvc2l0aW9uKSwgbmV3VGV4dCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlbGV0ZShyZXNvdXJjZSwgcmFuZ2UpIHtcclxuICAgICAgICAgICAgdGhpcy5yZXBsYWNlKHJlc291cmNlLCByYW5nZSwgJycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBoYXModXJpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl90ZXh0RWRpdHMuaGFzKHVyaS50b1N0cmluZygpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0KHVyaSwgZWRpdHMpIHtcclxuICAgICAgICAgICAgbGV0IGRhdGEgPSB0aGlzLl90ZXh0RWRpdHMuZ2V0KHVyaS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgaWYgKCFkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhID0geyBzZXE6IHRoaXMuX3NlcVBvb2wrKywgdXJpLCBlZGl0czogW10gfTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3RleHRFZGl0cy5zZXQodXJpLnRvU3RyaW5nKCksIGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghZWRpdHMpIHtcclxuICAgICAgICAgICAgICAgIGRhdGEuZWRpdHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhLmVkaXRzID0gZWRpdHMuc2xpY2UoMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0KHVyaSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3RleHRFZGl0cy5oYXModXJpLnRvU3RyaW5nKCkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZWRpdHMgfSA9IHRoaXMuX3RleHRFZGl0cy5nZXQodXJpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gZWRpdHMgPyBlZGl0cy5zbGljZSgpIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyaWVzKCkge1xyXG4gICAgICAgICAgICBjb25zdCByZXMgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5fdGV4dEVkaXRzLmZvckVhY2godmFsdWUgPT4gcmVzLnB1c2goW3ZhbHVlLnVyaSwgdmFsdWUuZWRpdHNdKSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXMuc2xpY2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWxsRW50cmllcygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW50cmllcygpO1xyXG4gICAgICAgICAgICAvLyBcdC8vIHVzZSB0aGUgJ3NlcScgdGhlIHdlIGhhdmUgYXNzaWduZWQgd2hlbiBpbnNlcnRpbmdcclxuICAgICAgICAgICAgLy8gXHQvLyB0aGUgb3BlcmF0aW9uIGFuZCB1c2UgdGhhdCBvcmRlciBpbiB0aGUgcmVzdWx0aW5nXHJcbiAgICAgICAgICAgIC8vIFx0Ly8gYXJyYXlcclxuICAgICAgICAgICAgLy8gXHRjb25zdCByZXM6IChbdnNjVXJpLlVSSSwgVGV4dEVkaXRbXV0gfCBbdnNjVXJpLlVSSSx2c2NVcmkuVVJJXSlbXSA9IFtdO1xyXG4gICAgICAgICAgICAvLyBcdHRoaXMuX3RleHRFZGl0cy5mb3JFYWNoKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgLy8gXHRcdGNvbnN0IHsgc2VxLCB1cmksIGVkaXRzIH0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgLy8gXHRcdHJlc1tzZXFdID0gW3VyaSwgZWRpdHNdO1xyXG4gICAgICAgICAgICAvLyBcdH0pO1xyXG4gICAgICAgICAgICAvLyBcdHRoaXMuX3Jlc291cmNlRWRpdHMuZm9yRWFjaCh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFx0XHRjb25zdCB7IHNlcSwgZnJvbSwgdG8gfSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAvLyBcdFx0cmVzW3NlcV0gPSBbZnJvbSwgdG9dO1xyXG4gICAgICAgICAgICAvLyBcdH0pO1xyXG4gICAgICAgICAgICAvLyBcdHJldHVybiByZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBzaXplKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdGV4dEVkaXRzLnNpemUgKyB0aGlzLl9yZXNvdXJjZUVkaXRzLmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9KU09OKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLldvcmtzcGFjZUVkaXQgPSBXb3Jrc3BhY2VFZGl0O1xyXG4gICAgY2xhc3MgU25pcHBldFN0cmluZyB7XHJcbiAgICAgICAgY29uc3RydWN0b3IodmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy5fdGFic3RvcCA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZSB8fCAnJztcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIGlzU25pcHBldFN0cmluZyh0aGluZykge1xyXG4gICAgICAgICAgICBpZiAodGhpbmcgaW5zdGFuY2VvZiBTbmlwcGV0U3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGluZy52YWx1ZSA9PT0gJ3N0cmluZyc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyBfZXNjYXBlKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXCR8fXxcXFxcL2csICdcXFxcJCYnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXBwZW5kVGV4dChzdHJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBTbmlwcGV0U3RyaW5nLl9lc2NhcGUoc3RyaW5nKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFwcGVuZFRhYnN0b3AobnVtYmVyID0gdGhpcy5fdGFic3RvcCsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJyQnO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IG51bWJlcjtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFwcGVuZFBsYWNlaG9sZGVyKHZhbHVlLCBudW1iZXIgPSB0aGlzLl90YWJzdG9wKyspIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmVzdGVkID0gbmV3IFNuaXBwZXRTdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIG5lc3RlZC5fdGFic3RvcCA9IHRoaXMuX3RhYnN0b3A7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZShuZXN0ZWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdGFic3RvcCA9IG5lc3RlZC5fdGFic3RvcDtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gbmVzdGVkLnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBTbmlwcGV0U3RyaW5nLl9lc2NhcGUodmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJyR7JztcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBudW1iZXI7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJzonO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IHZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9ICd9JztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFwcGVuZFZhcmlhYmxlKG5hbWUsIGRlZmF1bHRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRlZmF1bHRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmVzdGVkID0gbmV3IFNuaXBwZXRTdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIG5lc3RlZC5fdGFic3RvcCA9IHRoaXMuX3RhYnN0b3A7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWUobmVzdGVkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3RhYnN0b3AgPSBuZXN0ZWQuX3RhYnN0b3A7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBuZXN0ZWQudmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRlZmF1bHRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZS5yZXBsYWNlKC9cXCR8fS9nLCAnXFxcXCQmJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnJHsnO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlICs9IG5hbWU7XHJcbiAgICAgICAgICAgIGlmIChkZWZhdWx0VmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJzonO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSArPSBkZWZhdWx0VmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnfSc7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5TbmlwcGV0U3RyaW5nID0gU25pcHBldFN0cmluZztcclxuICAgIGxldCBEaWFnbm9zdGljVGFnO1xyXG4gICAgKGZ1bmN0aW9uIChEaWFnbm9zdGljVGFnKSB7XHJcbiAgICAgICAgRGlhZ25vc3RpY1RhZ1tEaWFnbm9zdGljVGFnW1wiVW5uZWNlc3NhcnlcIl0gPSAxXSA9IFwiVW5uZWNlc3NhcnlcIjtcclxuICAgIH0pKERpYWdub3N0aWNUYWcgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRGlhZ25vc3RpY1RhZyB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWNUYWcgPSB7fSkpO1xyXG4gICAgbGV0IERpYWdub3N0aWNTZXZlcml0eTtcclxuICAgIChmdW5jdGlvbiAoRGlhZ25vc3RpY1NldmVyaXR5KSB7XHJcbiAgICAgICAgRGlhZ25vc3RpY1NldmVyaXR5W0RpYWdub3N0aWNTZXZlcml0eVtcIkhpbnRcIl0gPSAzXSA9IFwiSGludFwiO1xyXG4gICAgICAgIERpYWdub3N0aWNTZXZlcml0eVtEaWFnbm9zdGljU2V2ZXJpdHlbXCJJbmZvcm1hdGlvblwiXSA9IDJdID0gXCJJbmZvcm1hdGlvblwiO1xyXG4gICAgICAgIERpYWdub3N0aWNTZXZlcml0eVtEaWFnbm9zdGljU2V2ZXJpdHlbXCJXYXJuaW5nXCJdID0gMV0gPSBcIldhcm5pbmdcIjtcclxuICAgICAgICBEaWFnbm9zdGljU2V2ZXJpdHlbRGlhZ25vc3RpY1NldmVyaXR5W1wiRXJyb3JcIl0gPSAwXSA9IFwiRXJyb3JcIjtcclxuICAgIH0pKERpYWdub3N0aWNTZXZlcml0eSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljU2V2ZXJpdHkgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EaWFnbm9zdGljU2V2ZXJpdHkgPSB7fSkpO1xyXG4gICAgY2xhc3MgTG9jYXRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHVyaSwgcmFuZ2VPclBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXJpID0gdXJpO1xyXG4gICAgICAgICAgICBpZiAoIXJhbmdlT3JQb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgLy90aGF0J3MgT0tcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChyYW5nZU9yUG9zaXRpb24gaW5zdGFuY2VvZiBSYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5nZSA9IHJhbmdlT3JQb3NpdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChyYW5nZU9yUG9zaXRpb24gaW5zdGFuY2VvZiBQb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5nZSA9IG5ldyBSYW5nZShyYW5nZU9yUG9zaXRpb24sIHJhbmdlT3JQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lsbGVnYWwgYXJndW1lbnQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgaXNMb2NhdGlvbih0aGluZykge1xyXG4gICAgICAgICAgICBpZiAodGhpbmcgaW5zdGFuY2VvZiBMb2NhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF0aGluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBSYW5nZS5pc1JhbmdlKHRoaW5nLnJhbmdlKVxyXG4gICAgICAgICAgICAgICAgJiYgdXJpXzEudnNjVXJpLlVSSS5pc1VyaSh0aGluZy51cmkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b0pTT04oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB1cmk6IHRoaXMudXJpLFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHRoaXMucmFuZ2VcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuTG9jYXRpb24gPSBMb2NhdGlvbjtcclxuICAgIGNsYXNzIERpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGxvY2F0aW9uLCBtZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb24gPSBsb2NhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIGlzKHRoaW5nKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoaW5nLm1lc3NhZ2UgPT09ICdzdHJpbmcnXHJcbiAgICAgICAgICAgICAgICAmJiB0aGluZy5sb2NhdGlvblxyXG4gICAgICAgICAgICAgICAgJiYgUmFuZ2UuaXNSYW5nZSh0aGluZy5sb2NhdGlvbi5yYW5nZSlcclxuICAgICAgICAgICAgICAgICYmIHVyaV8xLnZzY1VyaS5VUkkuaXNVcmkodGhpbmcubG9jYXRpb24udXJpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiA9IERpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb247XHJcbiAgICBjbGFzcyBEaWFnbm9zdGljIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgbWVzc2FnZSwgc2V2ZXJpdHkgPSBEaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZSA9IHJhbmdlO1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG4gICAgICAgICAgICB0aGlzLnNldmVyaXR5ID0gc2V2ZXJpdHk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRvSlNPTigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHNldmVyaXR5OiBEaWFnbm9zdGljU2V2ZXJpdHlbdGhpcy5zZXZlcml0eV0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiB0aGlzLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy5yYW5nZSxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogdGhpcy5zb3VyY2UsXHJcbiAgICAgICAgICAgICAgICBjb2RlOiB0aGlzLmNvZGUsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRpYWdub3N0aWMgPSBEaWFnbm9zdGljO1xyXG4gICAgY2xhc3MgSG92ZXIge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGNvbnRlbnRzLCByYW5nZSkge1xyXG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRzKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lsbGVnYWwgYXJndW1lbnQsIGNvbnRlbnRzIG11c3QgYmUgZGVmaW5lZCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNvbnRlbnRzKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50cyA9IGNvbnRlbnRzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGh0bWxDb250ZW50XzEudnNjTW9ja0h0bWxDb250ZW50LmlzTWFya2Rvd25TdHJpbmcoY29udGVudHMpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRzID0gW2NvbnRlbnRzXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudHMgPSBbY29udGVudHNdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuSG92ZXIgPSBIb3ZlcjtcclxuICAgIGxldCBEb2N1bWVudEhpZ2hsaWdodEtpbmQ7XHJcbiAgICAoZnVuY3Rpb24gKERvY3VtZW50SGlnaGxpZ2h0S2luZCkge1xyXG4gICAgICAgIERvY3VtZW50SGlnaGxpZ2h0S2luZFtEb2N1bWVudEhpZ2hsaWdodEtpbmRbXCJUZXh0XCJdID0gMF0gPSBcIlRleHRcIjtcclxuICAgICAgICBEb2N1bWVudEhpZ2hsaWdodEtpbmRbRG9jdW1lbnRIaWdobGlnaHRLaW5kW1wiUmVhZFwiXSA9IDFdID0gXCJSZWFkXCI7XHJcbiAgICAgICAgRG9jdW1lbnRIaWdobGlnaHRLaW5kW0RvY3VtZW50SGlnaGxpZ2h0S2luZFtcIldyaXRlXCJdID0gMl0gPSBcIldyaXRlXCI7XHJcbiAgICB9KShEb2N1bWVudEhpZ2hsaWdodEtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRIaWdobGlnaHRLaW5kIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRIaWdobGlnaHRLaW5kID0ge30pKTtcclxuICAgIGNsYXNzIERvY3VtZW50SGlnaGxpZ2h0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwga2luZCA9IERvY3VtZW50SGlnaGxpZ2h0S2luZC5UZXh0KSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcclxuICAgICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9KU09OKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHRoaXMucmFuZ2UsXHJcbiAgICAgICAgICAgICAgICBraW5kOiBEb2N1bWVudEhpZ2hsaWdodEtpbmRbdGhpcy5raW5kXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Eb2N1bWVudEhpZ2hsaWdodCA9IERvY3VtZW50SGlnaGxpZ2h0O1xyXG4gICAgbGV0IFN5bWJvbEtpbmQ7XHJcbiAgICAoZnVuY3Rpb24gKFN5bWJvbEtpbmQpIHtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJGaWxlXCJdID0gMF0gPSBcIkZpbGVcIjtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJNb2R1bGVcIl0gPSAxXSA9IFwiTW9kdWxlXCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTmFtZXNwYWNlXCJdID0gMl0gPSBcIk5hbWVzcGFjZVwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlBhY2thZ2VcIl0gPSAzXSA9IFwiUGFja2FnZVwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkNsYXNzXCJdID0gNF0gPSBcIkNsYXNzXCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTWV0aG9kXCJdID0gNV0gPSBcIk1ldGhvZFwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlByb3BlcnR5XCJdID0gNl0gPSBcIlByb3BlcnR5XCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRmllbGRcIl0gPSA3XSA9IFwiRmllbGRcIjtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJDb25zdHJ1Y3RvclwiXSA9IDhdID0gXCJDb25zdHJ1Y3RvclwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkVudW1cIl0gPSA5XSA9IFwiRW51bVwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkludGVyZmFjZVwiXSA9IDEwXSA9IFwiSW50ZXJmYWNlXCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiRnVuY3Rpb25cIl0gPSAxMV0gPSBcIkZ1bmN0aW9uXCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiVmFyaWFibGVcIl0gPSAxMl0gPSBcIlZhcmlhYmxlXCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiQ29uc3RhbnRcIl0gPSAxM10gPSBcIkNvbnN0YW50XCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiU3RyaW5nXCJdID0gMTRdID0gXCJTdHJpbmdcIjtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJOdW1iZXJcIl0gPSAxNV0gPSBcIk51bWJlclwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkJvb2xlYW5cIl0gPSAxNl0gPSBcIkJvb2xlYW5cIjtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJBcnJheVwiXSA9IDE3XSA9IFwiQXJyYXlcIjtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJPYmplY3RcIl0gPSAxOF0gPSBcIk9iamVjdFwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIktleVwiXSA9IDE5XSA9IFwiS2V5XCI7XHJcbiAgICAgICAgU3ltYm9sS2luZFtTeW1ib2xLaW5kW1wiTnVsbFwiXSA9IDIwXSA9IFwiTnVsbFwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkVudW1NZW1iZXJcIl0gPSAyMV0gPSBcIkVudW1NZW1iZXJcIjtcclxuICAgICAgICBTeW1ib2xLaW5kW1N5bWJvbEtpbmRbXCJTdHJ1Y3RcIl0gPSAyMl0gPSBcIlN0cnVjdFwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIkV2ZW50XCJdID0gMjNdID0gXCJFdmVudFwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIk9wZXJhdG9yXCJdID0gMjRdID0gXCJPcGVyYXRvclwiO1xyXG4gICAgICAgIFN5bWJvbEtpbmRbU3ltYm9sS2luZFtcIlR5cGVQYXJhbWV0ZXJcIl0gPSAyNV0gPSBcIlR5cGVQYXJhbWV0ZXJcIjtcclxuICAgIH0pKFN5bWJvbEtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU3ltYm9sS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN5bWJvbEtpbmQgPSB7fSkpO1xyXG4gICAgY2xhc3MgU3ltYm9sSW5mb3JtYXRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKG5hbWUsIGtpbmQsIHJhbmdlT3JDb250YWluZXIsIGxvY2F0aW9uT3JVcmksIGNvbnRhaW5lck5hbWUpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJOYW1lID0gY29udGFpbmVyTmFtZTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByYW5nZU9yQ29udGFpbmVyID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXJOYW1lID0gcmFuZ2VPckNvbnRhaW5lcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobG9jYXRpb25PclVyaSBpbnN0YW5jZW9mIExvY2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2F0aW9uID0gbG9jYXRpb25PclVyaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChyYW5nZU9yQ29udGFpbmVyIGluc3RhbmNlb2YgUmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jYXRpb24gPSBuZXcgTG9jYXRpb24obG9jYXRpb25PclVyaSwgcmFuZ2VPckNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdG9KU09OKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxyXG4gICAgICAgICAgICAgICAga2luZDogU3ltYm9sS2luZFt0aGlzLmtpbmRdLFxyXG4gICAgICAgICAgICAgICAgbG9jYXRpb246IHRoaXMubG9jYXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJOYW1lOiB0aGlzLmNvbnRhaW5lck5hbWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU3ltYm9sSW5mb3JtYXRpb24gPSBTeW1ib2xJbmZvcm1hdGlvbjtcclxuICAgIGNsYXNzIFN5bWJvbEluZm9ybWF0aW9uMiBleHRlbmRzIFN5bWJvbEluZm9ybWF0aW9uIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihuYW1lLCBraW5kLCBjb250YWluZXJOYW1lLCBsb2NhdGlvbikge1xyXG4gICAgICAgICAgICBzdXBlcihuYW1lLCBraW5kLCBjb250YWluZXJOYW1lLCBsb2NhdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5kZWZpbmluZ1JhbmdlID0gbG9jYXRpb24ucmFuZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN5bWJvbEluZm9ybWF0aW9uMiA9IFN5bWJvbEluZm9ybWF0aW9uMjtcclxuICAgIGxldCBDb2RlQWN0aW9uVHJpZ2dlcjtcclxuICAgIChmdW5jdGlvbiAoQ29kZUFjdGlvblRyaWdnZXIpIHtcclxuICAgICAgICBDb2RlQWN0aW9uVHJpZ2dlcltDb2RlQWN0aW9uVHJpZ2dlcltcIkF1dG9tYXRpY1wiXSA9IDFdID0gXCJBdXRvbWF0aWNcIjtcclxuICAgICAgICBDb2RlQWN0aW9uVHJpZ2dlcltDb2RlQWN0aW9uVHJpZ2dlcltcIk1hbnVhbFwiXSA9IDJdID0gXCJNYW51YWxcIjtcclxuICAgIH0pKENvZGVBY3Rpb25UcmlnZ2VyID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvZGVBY3Rpb25UcmlnZ2VyIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUFjdGlvblRyaWdnZXIgPSB7fSkpO1xyXG4gICAgY2xhc3MgQ29kZUFjdGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IodGl0bGUsIGtpbmQpIHtcclxuICAgICAgICAgICAgdGhpcy50aXRsZSA9IHRpdGxlO1xyXG4gICAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2RlQWN0aW9uID0gQ29kZUFjdGlvbjtcclxuICAgIGNsYXNzIENvZGVBY3Rpb25LaW5kIHtcclxuICAgICAgICBjb25zdHJ1Y3Rvcih2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFwcGVuZChwYXJ0cykge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IENvZGVBY3Rpb25LaW5kKHRoaXMudmFsdWUgPyB0aGlzLnZhbHVlICsgQ29kZUFjdGlvbktpbmQuc2VwICsgcGFydHMgOiBwYXJ0cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnRhaW5zKG90aGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlID09PSBvdGhlci52YWx1ZSB8fCBzdHJpbmdzXzEudnNjTW9ja1N0cmluZ3Muc3RhcnRzV2l0aChvdGhlci52YWx1ZSwgdGhpcy52YWx1ZSArIENvZGVBY3Rpb25LaW5kLnNlcCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgQ29kZUFjdGlvbktpbmQuc2VwID0gJy4nO1xyXG4gICAgQ29kZUFjdGlvbktpbmQuRW1wdHkgPSBuZXcgQ29kZUFjdGlvbktpbmQoJycpO1xyXG4gICAgQ29kZUFjdGlvbktpbmQuUXVpY2tGaXggPSBDb2RlQWN0aW9uS2luZC5FbXB0eS5hcHBlbmQoJ3F1aWNrZml4Jyk7XHJcbiAgICBDb2RlQWN0aW9uS2luZC5SZWZhY3RvciA9IENvZGVBY3Rpb25LaW5kLkVtcHR5LmFwcGVuZCgncmVmYWN0b3InKTtcclxuICAgIENvZGVBY3Rpb25LaW5kLlJlZmFjdG9yRXh0cmFjdCA9IENvZGVBY3Rpb25LaW5kLlJlZmFjdG9yLmFwcGVuZCgnZXh0cmFjdCcpO1xyXG4gICAgQ29kZUFjdGlvbktpbmQuUmVmYWN0b3JJbmxpbmUgPSBDb2RlQWN0aW9uS2luZC5SZWZhY3Rvci5hcHBlbmQoJ2lubGluZScpO1xyXG4gICAgQ29kZUFjdGlvbktpbmQuUmVmYWN0b3JSZXdyaXRlID0gQ29kZUFjdGlvbktpbmQuUmVmYWN0b3IuYXBwZW5kKCdyZXdyaXRlJyk7XHJcbiAgICBDb2RlQWN0aW9uS2luZC5Tb3VyY2UgPSBDb2RlQWN0aW9uS2luZC5FbXB0eS5hcHBlbmQoJ3NvdXJjZScpO1xyXG4gICAgQ29kZUFjdGlvbktpbmQuU291cmNlT3JnYW5pemVJbXBvcnRzID0gQ29kZUFjdGlvbktpbmQuU291cmNlLmFwcGVuZCgnb3JnYW5pemVJbXBvcnRzJyk7XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29kZUFjdGlvbktpbmQgPSBDb2RlQWN0aW9uS2luZDtcclxuICAgIGNsYXNzIENvZGVMZW5zIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihyYW5nZSwgY29tbWFuZCkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlID0gcmFuZ2U7XHJcbiAgICAgICAgICAgIHRoaXMuY29tbWFuZCA9IGNvbW1hbmQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBpc1Jlc29sdmVkKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmNvbW1hbmQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvZGVMZW5zID0gQ29kZUxlbnM7XHJcbiAgICBjbGFzcyBNYXJrZG93blN0cmluZyB7XHJcbiAgICAgICAgY29uc3RydWN0b3IodmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlIHx8ICcnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhcHBlbmRUZXh0KHZhbHVlKSB7XHJcbiAgICAgICAgICAgIC8vIGVzY2FwZSBtYXJrZG93biBzeW50YXggdG9rZW5zOiBodHRwOi8vZGFyaW5nZmlyZWJhbGwubmV0L3Byb2plY3RzL21hcmtkb3duL3N5bnRheCNiYWNrc2xhc2hcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSB2YWx1ZS5yZXBsYWNlKC9bXFxcXGAqX3t9W1xcXSgpIytcXC0uIV0vZywgJ1xcXFwkJicpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgICAgYXBwZW5kTWFya2Rvd24odmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSB2YWx1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFwcGVuZENvZGVibG9jayhjb2RlLCBsYW5ndWFnZSA9ICcnKSB7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJ1xcbmBgYCc7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gbGFuZ3VhZ2U7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gJ1xcbic7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgKz0gY29kZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSArPSAnXFxuYGBgXFxuJztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLk1hcmtkb3duU3RyaW5nID0gTWFya2Rvd25TdHJpbmc7XHJcbiAgICBjbGFzcyBQYXJhbWV0ZXJJbmZvcm1hdGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IobGFiZWwsIGRvY3VtZW50YXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xyXG4gICAgICAgICAgICB0aGlzLmRvY3VtZW50YXRpb24gPSBkb2N1bWVudGF0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5QYXJhbWV0ZXJJbmZvcm1hdGlvbiA9IFBhcmFtZXRlckluZm9ybWF0aW9uO1xyXG4gICAgY2xhc3MgU2lnbmF0dXJlSW5mb3JtYXRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGxhYmVsLCBkb2N1bWVudGF0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFiZWwgPSBsYWJlbDtcclxuICAgICAgICAgICAgdGhpcy5kb2N1bWVudGF0aW9uID0gZG9jdW1lbnRhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNpZ25hdHVyZUluZm9ybWF0aW9uID0gU2lnbmF0dXJlSW5mb3JtYXRpb247XHJcbiAgICBjbGFzcyBTaWduYXR1cmVIZWxwIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgdGhpcy5zaWduYXR1cmVzID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNpZ25hdHVyZUhlbHAgPSBTaWduYXR1cmVIZWxwO1xyXG4gICAgbGV0IENvbXBsZXRpb25UcmlnZ2VyS2luZDtcclxuICAgIChmdW5jdGlvbiAoQ29tcGxldGlvblRyaWdnZXJLaW5kKSB7XHJcbiAgICAgICAgQ29tcGxldGlvblRyaWdnZXJLaW5kW0NvbXBsZXRpb25UcmlnZ2VyS2luZFtcIkludm9rZVwiXSA9IDBdID0gXCJJbnZva2VcIjtcclxuICAgICAgICBDb21wbGV0aW9uVHJpZ2dlcktpbmRbQ29tcGxldGlvblRyaWdnZXJLaW5kW1wiVHJpZ2dlckNoYXJhY3RlclwiXSA9IDFdID0gXCJUcmlnZ2VyQ2hhcmFjdGVyXCI7XHJcbiAgICAgICAgQ29tcGxldGlvblRyaWdnZXJLaW5kW0NvbXBsZXRpb25UcmlnZ2VyS2luZFtcIlRyaWdnZXJGb3JJbmNvbXBsZXRlQ29tcGxldGlvbnNcIl0gPSAyXSA9IFwiVHJpZ2dlckZvckluY29tcGxldGVDb21wbGV0aW9uc1wiO1xyXG4gICAgfSkoQ29tcGxldGlvblRyaWdnZXJLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbXBsZXRpb25UcmlnZ2VyS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbXBsZXRpb25UcmlnZ2VyS2luZCA9IHt9KSk7XHJcbiAgICBsZXQgQ29tcGxldGlvbkl0ZW1LaW5kO1xyXG4gICAgKGZ1bmN0aW9uIChDb21wbGV0aW9uSXRlbUtpbmQpIHtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVGV4dFwiXSA9IDBdID0gXCJUZXh0XCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIk1ldGhvZFwiXSA9IDFdID0gXCJNZXRob2RcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiRnVuY3Rpb25cIl0gPSAyXSA9IFwiRnVuY3Rpb25cIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiQ29uc3RydWN0b3JcIl0gPSAzXSA9IFwiQ29uc3RydWN0b3JcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiRmllbGRcIl0gPSA0XSA9IFwiRmllbGRcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVmFyaWFibGVcIl0gPSA1XSA9IFwiVmFyaWFibGVcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiQ2xhc3NcIl0gPSA2XSA9IFwiQ2xhc3NcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiSW50ZXJmYWNlXCJdID0gN10gPSBcIkludGVyZmFjZVwiO1xyXG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJNb2R1bGVcIl0gPSA4XSA9IFwiTW9kdWxlXCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlByb3BlcnR5XCJdID0gOV0gPSBcIlByb3BlcnR5XCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlVuaXRcIl0gPSAxMF0gPSBcIlVuaXRcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVmFsdWVcIl0gPSAxMV0gPSBcIlZhbHVlXCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkVudW1cIl0gPSAxMl0gPSBcIkVudW1cIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiS2V5d29yZFwiXSA9IDEzXSA9IFwiS2V5d29yZFwiO1xyXG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJTbmlwcGV0XCJdID0gMTRdID0gXCJTbmlwcGV0XCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkNvbG9yXCJdID0gMTVdID0gXCJDb2xvclwiO1xyXG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJGaWxlXCJdID0gMTZdID0gXCJGaWxlXCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlJlZmVyZW5jZVwiXSA9IDE3XSA9IFwiUmVmZXJlbmNlXCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkZvbGRlclwiXSA9IDE4XSA9IFwiRm9sZGVyXCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkVudW1NZW1iZXJcIl0gPSAxOV0gPSBcIkVudW1NZW1iZXJcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiQ29uc3RhbnRcIl0gPSAyMF0gPSBcIkNvbnN0YW50XCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIlN0cnVjdFwiXSA9IDIxXSA9IFwiU3RydWN0XCI7XHJcbiAgICAgICAgQ29tcGxldGlvbkl0ZW1LaW5kW0NvbXBsZXRpb25JdGVtS2luZFtcIkV2ZW50XCJdID0gMjJdID0gXCJFdmVudFwiO1xyXG4gICAgICAgIENvbXBsZXRpb25JdGVtS2luZFtDb21wbGV0aW9uSXRlbUtpbmRbXCJPcGVyYXRvclwiXSA9IDIzXSA9IFwiT3BlcmF0b3JcIjtcclxuICAgICAgICBDb21wbGV0aW9uSXRlbUtpbmRbQ29tcGxldGlvbkl0ZW1LaW5kW1wiVHlwZVBhcmFtZXRlclwiXSA9IDI0XSA9IFwiVHlwZVBhcmFtZXRlclwiO1xyXG4gICAgfSkoQ29tcGxldGlvbkl0ZW1LaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbXBsZXRpb25JdGVtS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbXBsZXRpb25JdGVtS2luZCA9IHt9KSk7XHJcbiAgICBjbGFzcyBDb21wbGV0aW9uSXRlbSB7XHJcbiAgICAgICAgY29uc3RydWN0b3IobGFiZWwsIGtpbmQpIHtcclxuICAgICAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xyXG4gICAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b0pTT04oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogdGhpcy5sYWJlbCxcclxuICAgICAgICAgICAgICAgIGtpbmQ6IENvbXBsZXRpb25JdGVtS2luZFt0aGlzLmtpbmRdLFxyXG4gICAgICAgICAgICAgICAgZGV0YWlsOiB0aGlzLmRldGFpbCxcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IHRoaXMuZG9jdW1lbnRhdGlvbixcclxuICAgICAgICAgICAgICAgIHNvcnRUZXh0OiB0aGlzLnNvcnRUZXh0LFxyXG4gICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogdGhpcy5maWx0ZXJUZXh0LFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogdGhpcy5pbnNlcnRUZXh0LFxyXG4gICAgICAgICAgICAgICAgdGV4dEVkaXQ6IHRoaXMudGV4dEVkaXRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29tcGxldGlvbkl0ZW0gPSBDb21wbGV0aW9uSXRlbTtcclxuICAgIGNsYXNzIENvbXBsZXRpb25MaXN0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihpdGVtcyA9IFtdLCBpc0luY29tcGxldGUgPSBmYWxzZSkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXM7XHJcbiAgICAgICAgICAgIHRoaXMuaXNJbmNvbXBsZXRlID0gaXNJbmNvbXBsZXRlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21wbGV0aW9uTGlzdCA9IENvbXBsZXRpb25MaXN0O1xyXG4gICAgbGV0IFZpZXdDb2x1bW47XHJcbiAgICAoZnVuY3Rpb24gKFZpZXdDb2x1bW4pIHtcclxuICAgICAgICBWaWV3Q29sdW1uW1ZpZXdDb2x1bW5bXCJBY3RpdmVcIl0gPSAtMV0gPSBcIkFjdGl2ZVwiO1xyXG4gICAgICAgIFZpZXdDb2x1bW5bVmlld0NvbHVtbltcIk9uZVwiXSA9IDFdID0gXCJPbmVcIjtcclxuICAgICAgICBWaWV3Q29sdW1uW1ZpZXdDb2x1bW5bXCJUd29cIl0gPSAyXSA9IFwiVHdvXCI7XHJcbiAgICAgICAgVmlld0NvbHVtbltWaWV3Q29sdW1uW1wiVGhyZWVcIl0gPSAzXSA9IFwiVGhyZWVcIjtcclxuICAgIH0pKFZpZXdDb2x1bW4gPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVmlld0NvbHVtbiB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlZpZXdDb2x1bW4gPSB7fSkpO1xyXG4gICAgbGV0IFN0YXR1c0JhckFsaWdubWVudDtcclxuICAgIChmdW5jdGlvbiAoU3RhdHVzQmFyQWxpZ25tZW50KSB7XHJcbiAgICAgICAgU3RhdHVzQmFyQWxpZ25tZW50W1N0YXR1c0JhckFsaWdubWVudFtcIkxlZnRcIl0gPSAxXSA9IFwiTGVmdFwiO1xyXG4gICAgICAgIFN0YXR1c0JhckFsaWdubWVudFtTdGF0dXNCYXJBbGlnbm1lbnRbXCJSaWdodFwiXSA9IDJdID0gXCJSaWdodFwiO1xyXG4gICAgfSkoU3RhdHVzQmFyQWxpZ25tZW50ID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN0YXR1c0JhckFsaWdubWVudCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlN0YXR1c0JhckFsaWdubWVudCA9IHt9KSk7XHJcbiAgICBsZXQgVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGU7XHJcbiAgICAoZnVuY3Rpb24gKFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlKSB7XHJcbiAgICAgICAgVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbXCJPZmZcIl0gPSAwXSA9IFwiT2ZmXCI7XHJcbiAgICAgICAgVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGVbXCJPblwiXSA9IDFdID0gXCJPblwiO1xyXG4gICAgICAgIFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1RleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlW1wiUmVsYXRpdmVcIl0gPSAyXSA9IFwiUmVsYXRpdmVcIjtcclxuICAgIH0pKFRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JMaW5lTnVtYmVyc1N0eWxlIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvckxpbmVOdW1iZXJzU3R5bGUgPSB7fSkpO1xyXG4gICAgbGV0IFRleHREb2N1bWVudFNhdmVSZWFzb247XHJcbiAgICAoZnVuY3Rpb24gKFRleHREb2N1bWVudFNhdmVSZWFzb24pIHtcclxuICAgICAgICBUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1RleHREb2N1bWVudFNhdmVSZWFzb25bXCJNYW51YWxcIl0gPSAxXSA9IFwiTWFudWFsXCI7XHJcbiAgICAgICAgVGV4dERvY3VtZW50U2F2ZVJlYXNvbltUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1wiQWZ0ZXJEZWxheVwiXSA9IDJdID0gXCJBZnRlckRlbGF5XCI7XHJcbiAgICAgICAgVGV4dERvY3VtZW50U2F2ZVJlYXNvbltUZXh0RG9jdW1lbnRTYXZlUmVhc29uW1wiRm9jdXNPdXRcIl0gPSAzXSA9IFwiRm9jdXNPdXRcIjtcclxuICAgIH0pKFRleHREb2N1bWVudFNhdmVSZWFzb24gPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dERvY3VtZW50U2F2ZVJlYXNvbiB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHREb2N1bWVudFNhdmVSZWFzb24gPSB7fSkpO1xyXG4gICAgbGV0IFRleHRFZGl0b3JSZXZlYWxUeXBlO1xyXG4gICAgKGZ1bmN0aW9uIChUZXh0RWRpdG9yUmV2ZWFsVHlwZSkge1xyXG4gICAgICAgIFRleHRFZGl0b3JSZXZlYWxUeXBlW1RleHRFZGl0b3JSZXZlYWxUeXBlW1wiRGVmYXVsdFwiXSA9IDBdID0gXCJEZWZhdWx0XCI7XHJcbiAgICAgICAgVGV4dEVkaXRvclJldmVhbFR5cGVbVGV4dEVkaXRvclJldmVhbFR5cGVbXCJJbkNlbnRlclwiXSA9IDFdID0gXCJJbkNlbnRlclwiO1xyXG4gICAgICAgIFRleHRFZGl0b3JSZXZlYWxUeXBlW1RleHRFZGl0b3JSZXZlYWxUeXBlW1wiSW5DZW50ZXJJZk91dHNpZGVWaWV3cG9ydFwiXSA9IDJdID0gXCJJbkNlbnRlcklmT3V0c2lkZVZpZXdwb3J0XCI7XHJcbiAgICAgICAgVGV4dEVkaXRvclJldmVhbFR5cGVbVGV4dEVkaXRvclJldmVhbFR5cGVbXCJBdFRvcFwiXSA9IDNdID0gXCJBdFRvcFwiO1xyXG4gICAgfSkoVGV4dEVkaXRvclJldmVhbFR5cGUgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvclJldmVhbFR5cGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yUmV2ZWFsVHlwZSA9IHt9KSk7XHJcbiAgICBsZXQgVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQ7XHJcbiAgICAoZnVuY3Rpb24gKFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kKSB7XHJcbiAgICAgICAgVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmRbVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmRbXCJLZXlib2FyZFwiXSA9IDFdID0gXCJLZXlib2FyZFwiO1xyXG4gICAgICAgIFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kW1RleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kW1wiTW91c2VcIl0gPSAyXSA9IFwiTW91c2VcIjtcclxuICAgICAgICBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZFtUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZFtcIkNvbW1hbmRcIl0gPSAzXSA9IFwiQ29tbWFuZFwiO1xyXG4gICAgfSkoVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCA9IHt9KSk7XHJcbiAgICAvKipcclxuICAgICAqIFRoZXNlIHZhbHVlcyBtYXRjaCB2ZXJ5IGNhcmVmdWxseSB0aGUgdmFsdWVzIG9mIGBUcmFja2VkUmFuZ2VTdGlja2luZXNzYFxyXG4gICAgICovXHJcbiAgICBsZXQgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3I7XHJcbiAgICAoZnVuY3Rpb24gKERlY29yYXRpb25SYW5nZUJlaGF2aW9yKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJhY2tlZFJhbmdlU3RpY2tpbmVzcy5BbHdheXNHcm93c1doZW5UeXBpbmdBdEVkZ2VzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbXCJPcGVuT3BlblwiXSA9IDBdID0gXCJPcGVuT3BlblwiO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRyYWNrZWRSYW5nZVN0aWNraW5lc3MuTmV2ZXJHcm93c1doZW5UeXBpbmdBdEVkZ2VzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbXCJDbG9zZWRDbG9zZWRcIl0gPSAxXSA9IFwiQ2xvc2VkQ2xvc2VkXCI7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJhY2tlZFJhbmdlU3RpY2tpbmVzcy5Hcm93c09ubHlXaGVuVHlwaW5nQmVmb3JlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbRGVjb3JhdGlvblJhbmdlQmVoYXZpb3JbXCJPcGVuQ2xvc2VkXCJdID0gMl0gPSBcIk9wZW5DbG9zZWRcIjtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBUcmFja2VkUmFuZ2VTdGlja2luZXNzLkdyb3dzT25seVdoZW5UeXBpbmdBZnRlclxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERlY29yYXRpb25SYW5nZUJlaGF2aW9yW0RlY29yYXRpb25SYW5nZUJlaGF2aW9yW1wiQ2xvc2VkT3BlblwiXSA9IDNdID0gXCJDbG9zZWRPcGVuXCI7XHJcbiAgICB9KShEZWNvcmF0aW9uUmFuZ2VCZWhhdmlvciA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EZWNvcmF0aW9uUmFuZ2VCZWhhdmlvciB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkRlY29yYXRpb25SYW5nZUJlaGF2aW9yID0ge30pKTtcclxuICAgIChmdW5jdGlvbiAoVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQpIHtcclxuICAgICAgICBmdW5jdGlvbiBmcm9tVmFsdWUocykge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHMpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2tleWJvYXJkJzogcmV0dXJuIFRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kLktleWJvYXJkO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbW91c2UnOiByZXR1cm4gVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQuTW91c2U7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdhcGknOiByZXR1cm4gVGV4dEVkaXRvclNlbGVjdGlvbkNoYW5nZUtpbmQuQ29tbWFuZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZC5mcm9tVmFsdWUgPSBmcm9tVmFsdWU7XHJcbiAgICB9KShUZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UZXh0RWRpdG9yU2VsZWN0aW9uQ2hhbmdlS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRleHRFZGl0b3JTZWxlY3Rpb25DaGFuZ2VLaW5kID0ge30pKTtcclxuICAgIGNsYXNzIERvY3VtZW50TGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IocmFuZ2UsIHRhcmdldCkge1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0ICYmICEodGFyZ2V0IGluc3RhbmNlb2YgdXJpXzEudnNjVXJpLlVSSSkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgndGFyZ2V0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFSYW5nZS5pc1JhbmdlKHJhbmdlKSB8fCByYW5nZS5pc0VtcHR5KSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ3JhbmdlJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5yYW5nZSA9IHJhbmdlO1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRG9jdW1lbnRMaW5rID0gRG9jdW1lbnRMaW5rO1xyXG4gICAgY2xhc3MgQ29sb3Ige1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHJlZCwgZ3JlZW4sIGJsdWUsIGFscGhhKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkID0gcmVkO1xyXG4gICAgICAgICAgICB0aGlzLmdyZWVuID0gZ3JlZW47XHJcbiAgICAgICAgICAgIHRoaXMuYmx1ZSA9IGJsdWU7XHJcbiAgICAgICAgICAgIHRoaXMuYWxwaGEgPSBhbHBoYTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQ29sb3IgPSBDb2xvcjtcclxuICAgIGNsYXNzIENvbG9ySW5mb3JtYXRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHJhbmdlLCBjb2xvcikge1xyXG4gICAgICAgICAgICBpZiAoY29sb3IgJiYgIShjb2xvciBpbnN0YW5jZW9mIENvbG9yKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb2xvcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghUmFuZ2UuaXNSYW5nZShyYW5nZSkgfHwgcmFuZ2UuaXNFbXB0eSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdyYW5nZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2UgPSByYW5nZTtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IGNvbG9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvckluZm9ybWF0aW9uID0gQ29sb3JJbmZvcm1hdGlvbjtcclxuICAgIGNsYXNzIENvbG9yUHJlc2VudGF0aW9uIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihsYWJlbCkge1xyXG4gICAgICAgICAgICBpZiAoIWxhYmVsIHx8IHR5cGVvZiBsYWJlbCAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbGFiZWwnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmxhYmVsID0gbGFiZWw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbG9yUHJlc2VudGF0aW9uID0gQ29sb3JQcmVzZW50YXRpb247XHJcbiAgICBsZXQgQ29sb3JGb3JtYXQ7XHJcbiAgICAoZnVuY3Rpb24gKENvbG9yRm9ybWF0KSB7XHJcbiAgICAgICAgQ29sb3JGb3JtYXRbQ29sb3JGb3JtYXRbXCJSR0JcIl0gPSAwXSA9IFwiUkdCXCI7XHJcbiAgICAgICAgQ29sb3JGb3JtYXRbQ29sb3JGb3JtYXRbXCJIRVhcIl0gPSAxXSA9IFwiSEVYXCI7XHJcbiAgICAgICAgQ29sb3JGb3JtYXRbQ29sb3JGb3JtYXRbXCJIU0xcIl0gPSAyXSA9IFwiSFNMXCI7XHJcbiAgICB9KShDb2xvckZvcm1hdCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db2xvckZvcm1hdCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbG9yRm9ybWF0ID0ge30pKTtcclxuICAgIGxldCBTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZTtcclxuICAgIChmdW5jdGlvbiAoU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGUpIHtcclxuICAgICAgICBTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtcIkVycm9yXCJdID0gMF0gPSBcIkVycm9yXCI7XHJcbiAgICAgICAgU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGVbU291cmNlQ29udHJvbElucHV0Qm94VmFsaWRhdGlvblR5cGVbXCJXYXJuaW5nXCJdID0gMV0gPSBcIldhcm5pbmdcIjtcclxuICAgICAgICBTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZVtcIkluZm9ybWF0aW9uXCJdID0gMl0gPSBcIkluZm9ybWF0aW9uXCI7XHJcbiAgICB9KShTb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Tb3VyY2VDb250cm9sSW5wdXRCb3hWYWxpZGF0aW9uVHlwZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlNvdXJjZUNvbnRyb2xJbnB1dEJveFZhbGlkYXRpb25UeXBlID0ge30pKTtcclxuICAgIGxldCBUYXNrUmV2ZWFsS2luZDtcclxuICAgIChmdW5jdGlvbiAoVGFza1JldmVhbEtpbmQpIHtcclxuICAgICAgICBUYXNrUmV2ZWFsS2luZFtUYXNrUmV2ZWFsS2luZFtcIkFsd2F5c1wiXSA9IDFdID0gXCJBbHdheXNcIjtcclxuICAgICAgICBUYXNrUmV2ZWFsS2luZFtUYXNrUmV2ZWFsS2luZFtcIlNpbGVudFwiXSA9IDJdID0gXCJTaWxlbnRcIjtcclxuICAgICAgICBUYXNrUmV2ZWFsS2luZFtUYXNrUmV2ZWFsS2luZFtcIk5ldmVyXCJdID0gM10gPSBcIk5ldmVyXCI7XHJcbiAgICB9KShUYXNrUmV2ZWFsS2luZCA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrUmV2ZWFsS2luZCB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tSZXZlYWxLaW5kID0ge30pKTtcclxuICAgIGxldCBUYXNrUGFuZWxLaW5kO1xyXG4gICAgKGZ1bmN0aW9uIChUYXNrUGFuZWxLaW5kKSB7XHJcbiAgICAgICAgVGFza1BhbmVsS2luZFtUYXNrUGFuZWxLaW5kW1wiU2hhcmVkXCJdID0gMV0gPSBcIlNoYXJlZFwiO1xyXG4gICAgICAgIFRhc2tQYW5lbEtpbmRbVGFza1BhbmVsS2luZFtcIkRlZGljYXRlZFwiXSA9IDJdID0gXCJEZWRpY2F0ZWRcIjtcclxuICAgICAgICBUYXNrUGFuZWxLaW5kW1Rhc2tQYW5lbEtpbmRbXCJOZXdcIl0gPSAzXSA9IFwiTmV3XCI7XHJcbiAgICB9KShUYXNrUGFuZWxLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2tQYW5lbEtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrUGFuZWxLaW5kID0ge30pKTtcclxuICAgIGNsYXNzIFRhc2tHcm91cCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoaWQsIF9sYWJlbCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGlkICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCduYW1lJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBfbGFiZWwgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ25hbWUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9pZCA9IGlkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgZnJvbSh2YWx1ZSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjbGVhbic6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5DbGVhbjtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2J1aWxkJzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVGFza0dyb3VwLkJ1aWxkO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAncmVidWlsZCc6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5SZWJ1aWxkO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAndGVzdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRhc2tHcm91cC5UZXN0O1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBpZCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFRhc2tHcm91cC5DbGVhbiA9IG5ldyBUYXNrR3JvdXAoJ2NsZWFuJywgJ0NsZWFuJyk7XHJcbiAgICBUYXNrR3JvdXAuQnVpbGQgPSBuZXcgVGFza0dyb3VwKCdidWlsZCcsICdCdWlsZCcpO1xyXG4gICAgVGFza0dyb3VwLlJlYnVpbGQgPSBuZXcgVGFza0dyb3VwKCdyZWJ1aWxkJywgJ1JlYnVpbGQnKTtcclxuICAgIFRhc2tHcm91cC5UZXN0ID0gbmV3IFRhc2tHcm91cCgndGVzdCcsICdUZXN0Jyk7XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGFza0dyb3VwID0gVGFza0dyb3VwO1xyXG4gICAgY2xhc3MgUHJvY2Vzc0V4ZWN1dGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IocHJvY2VzcywgdmFyZzEsIHZhcmcyKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgncHJvY2VzcycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MgPSBwcm9jZXNzO1xyXG4gICAgICAgICAgICBpZiAodmFyZzEgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFyZzEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXJncyA9IHZhcmcxO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB2YXJnMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB2YXJnMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5fYXJncyA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hcmdzID0gW107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHByb2Nlc3MoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcm9jZXNzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXQgcHJvY2Vzcyh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdwcm9jZXNzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fcHJvY2VzcyA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYXJncygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FyZ3M7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBhcmdzKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gW107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fYXJncyA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgb3B0aW9ucygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBvcHRpb25zKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29tcHV0ZUlkKCkge1xyXG4gICAgICAgICAgICAvLyBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpO1xyXG4gICAgICAgICAgICAvLyBoYXNoLnVwZGF0ZSgncHJvY2VzcycpO1xyXG4gICAgICAgICAgICAvLyBpZiAodGhpcy5fcHJvY2VzcyAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBoYXNoLnVwZGF0ZSh0aGlzLl9wcm9jZXNzKTtcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICAvLyBpZiAodGhpcy5fYXJncyAmJiB0aGlzLl9hcmdzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgLy8gICAgIGZvciAobGV0IGFyZyBvZiB0aGlzLl9hcmdzKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgaGFzaC51cGRhdGUoYXJnKTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICAvLyByZXR1cm4gaGFzaC5kaWdlc3QoJ2hleCcpO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBzdXBwb3J0ZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuUHJvY2Vzc0V4ZWN1dGlvbiA9IFByb2Nlc3NFeGVjdXRpb247XHJcbiAgICBjbGFzcyBTaGVsbEV4ZWN1dGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoYXJnMCwgYXJnMSwgYXJnMikge1xyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhcmcxKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhcmcwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kIGNhblxcJ3QgYmUgdW5kZWZpbmVkIG9yIG51bGwnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnMCAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIGFyZzAudmFsdWUgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jb21tYW5kID0gYXJnMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2FyZ3MgPSBhcmcxO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IGFyZzI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyZzAgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kTGluZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fY29tbWFuZExpbmUgPSBhcmcwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IGFyZzE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGNvbW1hbmRMaW5lKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29tbWFuZExpbmU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBjb21tYW5kTGluZSh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kTGluZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2NvbW1hbmRMaW5lID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBjb21tYW5kKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29tbWFuZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0IGNvbW1hbmQodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIHZhbHVlLnZhbHVlICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdjb21tYW5kJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fY29tbWFuZCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYXJncygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FyZ3M7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBhcmdzKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2FyZ3MgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IG9wdGlvbnMoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXQgb3B0aW9ucyh2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9vcHRpb25zID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbXB1dGVJZCgpIHtcclxuICAgICAgICAgICAgLy8gY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdtZDUnKTtcclxuICAgICAgICAgICAgLy8gaGFzaC51cGRhdGUoJ3NoZWxsJyk7XHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9jb21tYW5kTGluZSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBoYXNoLnVwZGF0ZSh0aGlzLl9jb21tYW5kTGluZSk7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgLy8gaWYgKHRoaXMuX2NvbW1hbmQgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAvLyAgICAgaGFzaC51cGRhdGUodHlwZW9mIHRoaXMuX2NvbW1hbmQgPT09ICdzdHJpbmcnID8gdGhpcy5fY29tbWFuZCA6IHRoaXMuX2NvbW1hbmQudmFsdWUpO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLl9hcmdzICYmIHRoaXMuX2FyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAvLyAgICAgZm9yIChsZXQgYXJnIG9mIHRoaXMuX2FyZ3MpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBoYXNoLnVwZGF0ZSh0eXBlb2YgYXJnID09PSAnc3RyaW5nJyA/IGFyZyA6IGFyZy52YWx1ZSk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgLy8gcmV0dXJuIGhhc2guZGlnZXN0KCdoZXgnKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3Qgc3Bwb3J0ZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU2hlbGxFeGVjdXRpb24gPSBTaGVsbEV4ZWN1dGlvbjtcclxuICAgIGxldCBTaGVsbFF1b3Rpbmc7XHJcbiAgICAoZnVuY3Rpb24gKFNoZWxsUXVvdGluZykge1xyXG4gICAgICAgIFNoZWxsUXVvdGluZ1tTaGVsbFF1b3RpbmdbXCJFc2NhcGVcIl0gPSAxXSA9IFwiRXNjYXBlXCI7XHJcbiAgICAgICAgU2hlbGxRdW90aW5nW1NoZWxsUXVvdGluZ1tcIlN0cm9uZ1wiXSA9IDJdID0gXCJTdHJvbmdcIjtcclxuICAgICAgICBTaGVsbFF1b3RpbmdbU2hlbGxRdW90aW5nW1wiV2Vha1wiXSA9IDNdID0gXCJXZWFrXCI7XHJcbiAgICB9KShTaGVsbFF1b3RpbmcgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU2hlbGxRdW90aW5nIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuU2hlbGxRdW90aW5nID0ge30pKTtcclxuICAgIGxldCBUYXNrU2NvcGU7XHJcbiAgICAoZnVuY3Rpb24gKFRhc2tTY29wZSkge1xyXG4gICAgICAgIFRhc2tTY29wZVtUYXNrU2NvcGVbXCJHbG9iYWxcIl0gPSAxXSA9IFwiR2xvYmFsXCI7XHJcbiAgICAgICAgVGFza1Njb3BlW1Rhc2tTY29wZVtcIldvcmtzcGFjZVwiXSA9IDJdID0gXCJXb3Jrc3BhY2VcIjtcclxuICAgIH0pKFRhc2tTY29wZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrU2NvcGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UYXNrU2NvcGUgPSB7fSkpO1xyXG4gICAgY2xhc3MgVGFzayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoZGVmaW5pdGlvbiwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNikge1xyXG4gICAgICAgICAgICB0aGlzLmRlZmluaXRpb24gPSBkZWZpbml0aW9uO1xyXG4gICAgICAgICAgICBsZXQgcHJvYmxlbU1hdGNoZXJzO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZzIgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBhcmcyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2UgPSBhcmczO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRpb24gPSBhcmc0O1xyXG4gICAgICAgICAgICAgICAgcHJvYmxlbU1hdGNoZXJzID0gYXJnNTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChhcmcyID09PSBUYXNrU2NvcGUuR2xvYmFsIHx8IGFyZzIgPT09IFRhc2tTY29wZS5Xb3Jrc3BhY2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gYXJnMjtcclxuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IGFyZzM7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZSA9IGFyZzQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvbiA9IGFyZzU7XHJcbiAgICAgICAgICAgICAgICBwcm9ibGVtTWF0Y2hlcnMgPSBhcmc2O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBhcmcyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lID0gYXJnMztcclxuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlID0gYXJnNDtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0aW9uID0gYXJnNTtcclxuICAgICAgICAgICAgICAgIHByb2JsZW1NYXRjaGVycyA9IGFyZzY7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9ibGVtTWF0Y2hlcnMgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9ibGVtTWF0Y2hlcnMgPSBbcHJvYmxlbU1hdGNoZXJzXTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycyA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwcm9ibGVtTWF0Y2hlcnMpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9ibGVtTWF0Y2hlcnMgPSBwcm9ibGVtTWF0Y2hlcnM7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9oYXNEZWZpbmVkTWF0Y2hlcnMgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvYmxlbU1hdGNoZXJzID0gW107XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9oYXNEZWZpbmVkTWF0Y2hlcnMgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9pc0JhY2tncm91bmQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IF9pZCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19pZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0IF9pZCh2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9faWQgPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2xlYXIoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9faWQgPT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX19pZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5fc2NvcGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuX2RlZmluaXRpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9leGVjdXRpb24gaW5zdGFuY2VvZiBQcm9jZXNzRXhlY3V0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWZpbml0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdwcm9jZXNzJyxcclxuICAgICAgICAgICAgICAgICAgICBpZDogdGhpcy5fZXhlY3V0aW9uLmNvbXB1dGVJZCgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuX2V4ZWN1dGlvbiBpbnN0YW5jZW9mIFNoZWxsRXhlY3V0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWZpbml0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzaGVsbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2V4ZWN1dGlvbi5jb21wdXRlSWQoKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgZGVmaW5pdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZmluaXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBkZWZpbml0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwIHx8IHZhbHVlID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ0tpbmQgY2FuXFwndCBiZSB1bmRlZmluZWQgb3IgbnVsbCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fZGVmaW5pdGlvbiA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgc2NvcGUoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zY29wZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0IHRhcmdldCh2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3Njb3BlID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBuYW1lKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0IG5hbWUodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWxBcmd1bWVudCgnbmFtZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fbmFtZSA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgZXhlY3V0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXQgZXhlY3V0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9leGVjdXRpb24gPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHByb2JsZW1NYXRjaGVycygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2JsZW1NYXRjaGVycztcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0IHByb2JsZW1NYXRjaGVycyh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9ibGVtTWF0Y2hlcnMgPSBbXTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fcHJvYmxlbU1hdGNoZXJzID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMuX2hhc0RlZmluZWRNYXRjaGVycyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBoYXNEZWZpbmVkTWF0Y2hlcnMoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9oYXNEZWZpbmVkTWF0Y2hlcnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBpc0JhY2tncm91bmQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0JhY2tncm91bmQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBpc0JhY2tncm91bmQodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSB0cnVlICYmIHZhbHVlICE9PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2lzQmFja2dyb3VuZCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgc291cmNlKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXQgc291cmNlKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdzb3VyY2UgbXVzdCBiZSBhIHN0cmluZyBvZiBsZW5ndGggPiAwJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9zb3VyY2UgPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGdyb3VwKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ3JvdXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBncm91cCh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHZvaWQgMCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZ3JvdXAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9ncm91cCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgcHJlc2VudGF0aW9uT3B0aW9ucygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXNlbnRhdGlvbk9wdGlvbnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldCBwcmVzZW50YXRpb25PcHRpb25zKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9wcmVzZW50YXRpb25PcHRpb25zID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRhc2sgPSBUYXNrO1xyXG4gICAgbGV0IFByb2dyZXNzTG9jYXRpb247XHJcbiAgICAoZnVuY3Rpb24gKFByb2dyZXNzTG9jYXRpb24pIHtcclxuICAgICAgICBQcm9ncmVzc0xvY2F0aW9uW1Byb2dyZXNzTG9jYXRpb25bXCJTb3VyY2VDb250cm9sXCJdID0gMV0gPSBcIlNvdXJjZUNvbnRyb2xcIjtcclxuICAgICAgICBQcm9ncmVzc0xvY2F0aW9uW1Byb2dyZXNzTG9jYXRpb25bXCJXaW5kb3dcIl0gPSAxMF0gPSBcIldpbmRvd1wiO1xyXG4gICAgICAgIFByb2dyZXNzTG9jYXRpb25bUHJvZ3Jlc3NMb2NhdGlvbltcIk5vdGlmaWNhdGlvblwiXSA9IDE1XSA9IFwiTm90aWZpY2F0aW9uXCI7XHJcbiAgICB9KShQcm9ncmVzc0xvY2F0aW9uID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlByb2dyZXNzTG9jYXRpb24gfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Qcm9ncmVzc0xvY2F0aW9uID0ge30pKTtcclxuICAgIGNsYXNzIFRyZWVJdGVtIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihhcmcxLCBjb2xsYXBzaWJsZVN0YXRlID0gVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlLk5vbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xsYXBzaWJsZVN0YXRlID0gY29sbGFwc2libGVTdGF0ZTtcclxuICAgICAgICAgICAgaWYgKGFyZzEgaW5zdGFuY2VvZiB1cmlfMS52c2NVcmkuVVJJKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlc291cmNlVXJpID0gYXJnMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGFiZWwgPSBhcmcxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlRyZWVJdGVtID0gVHJlZUl0ZW07XHJcbiAgICBsZXQgVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlO1xyXG4gICAgKGZ1bmN0aW9uIChUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUpIHtcclxuICAgICAgICBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1wiTm9uZVwiXSA9IDBdID0gXCJOb25lXCI7XHJcbiAgICAgICAgVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1RyZWVJdGVtQ29sbGFwc2libGVTdGF0ZVtcIkNvbGxhcHNlZFwiXSA9IDFdID0gXCJDb2xsYXBzZWRcIjtcclxuICAgICAgICBUcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGVbVHJlZUl0ZW1Db2xsYXBzaWJsZVN0YXRlW1wiRXhwYW5kZWRcIl0gPSAyXSA9IFwiRXhwYW5kZWRcIjtcclxuICAgIH0pKFRyZWVJdGVtQ29sbGFwc2libGVTdGF0ZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UcmVlSXRlbUNvbGxhcHNpYmxlU3RhdGUgPSB7fSkpO1xyXG4gICAgY2xhc3MgVGhlbWVJY29uIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihpZCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gaWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgVGhlbWVJY29uLkZpbGUgPSBuZXcgVGhlbWVJY29uKCdmaWxlJyk7XHJcbiAgICBUaGVtZUljb24uRm9sZGVyID0gbmV3IFRoZW1lSWNvbignZm9sZGVyJyk7XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuVGhlbWVJY29uID0gVGhlbWVJY29uO1xyXG4gICAgY2xhc3MgVGhlbWVDb2xvciB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoaWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IGlkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5UaGVtZUNvbG9yID0gVGhlbWVDb2xvcjtcclxuICAgIGxldCBDb25maWd1cmF0aW9uVGFyZ2V0O1xyXG4gICAgKGZ1bmN0aW9uIChDb25maWd1cmF0aW9uVGFyZ2V0KSB7XHJcbiAgICAgICAgQ29uZmlndXJhdGlvblRhcmdldFtDb25maWd1cmF0aW9uVGFyZ2V0W1wiR2xvYmFsXCJdID0gMV0gPSBcIkdsb2JhbFwiO1xyXG4gICAgICAgIENvbmZpZ3VyYXRpb25UYXJnZXRbQ29uZmlndXJhdGlvblRhcmdldFtcIldvcmtzcGFjZVwiXSA9IDJdID0gXCJXb3Jrc3BhY2VcIjtcclxuICAgICAgICBDb25maWd1cmF0aW9uVGFyZ2V0W0NvbmZpZ3VyYXRpb25UYXJnZXRbXCJXb3Jrc3BhY2VGb2xkZXJcIl0gPSAzXSA9IFwiV29ya3NwYWNlRm9sZGVyXCI7XHJcbiAgICB9KShDb25maWd1cmF0aW9uVGFyZ2V0ID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbmZpZ3VyYXRpb25UYXJnZXQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db25maWd1cmF0aW9uVGFyZ2V0ID0ge30pKTtcclxuICAgIGNsYXNzIFJlbGF0aXZlUGF0dGVybiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoYmFzZSwgcGF0dGVybikge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGJhc2UgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWJhc2UgfHwgIXVyaV8xLnZzY1VyaS5VUkkuaXNVcmkoYmFzZS51cmkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdiYXNlJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdwYXR0ZXJuJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5iYXNlID0gdHlwZW9mIGJhc2UgPT09ICdzdHJpbmcnID8gYmFzZSA6IGJhc2UudXJpLmZzUGF0aDtcclxuICAgICAgICAgICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcGF0aFRvUmVsYXRpdmUoZnJvbSwgdG8pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBhdGhfMS5yZWxhdGl2ZShmcm9tLCB0byk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLlJlbGF0aXZlUGF0dGVybiA9IFJlbGF0aXZlUGF0dGVybjtcclxuICAgIGNsYXNzIEJyZWFrcG9pbnQge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGVuYWJsZWQsIGNvbmRpdGlvbiwgaGl0Q29uZGl0aW9uLCBsb2dNZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5hYmxlZCA9IHR5cGVvZiBlbmFibGVkID09PSAnYm9vbGVhbicgPyBlbmFibGVkIDogdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25kaXRpb24gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmRpdGlvbiA9IGNvbmRpdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGhpdENvbmRpdGlvbiA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29uZGl0aW9uID0gaGl0Q29uZGl0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbG9nTWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9nTWVzc2FnZSA9IGxvZ01lc3NhZ2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuQnJlYWtwb2ludCA9IEJyZWFrcG9pbnQ7XHJcbiAgICBjbGFzcyBTb3VyY2VCcmVha3BvaW50IGV4dGVuZHMgQnJlYWtwb2ludCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IobG9jYXRpb24sIGVuYWJsZWQsIGNvbmRpdGlvbiwgaGl0Q29uZGl0aW9uLCBsb2dNZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKGVuYWJsZWQsIGNvbmRpdGlvbiwgaGl0Q29uZGl0aW9uLCBsb2dNZXNzYWdlKTtcclxuICAgICAgICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsQXJndW1lbnQoJ2xvY2F0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbiA9IGxvY2F0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Tb3VyY2VCcmVha3BvaW50ID0gU291cmNlQnJlYWtwb2ludDtcclxuICAgIGNsYXNzIEZ1bmN0aW9uQnJlYWtwb2ludCBleHRlbmRzIEJyZWFrcG9pbnQge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGZ1bmN0aW9uTmFtZSwgZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpIHtcclxuICAgICAgICAgICAgc3VwZXIoZW5hYmxlZCwgY29uZGl0aW9uLCBoaXRDb25kaXRpb24sIGxvZ01lc3NhZ2UpO1xyXG4gICAgICAgICAgICBpZiAoIWZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbEFyZ3VtZW50KCdmdW5jdGlvbk5hbWUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmZ1bmN0aW9uTmFtZSA9IGZ1bmN0aW9uTmFtZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRnVuY3Rpb25CcmVha3BvaW50ID0gRnVuY3Rpb25CcmVha3BvaW50O1xyXG4gICAgY2xhc3MgRGVidWdBZGFwdGVyRXhlY3V0YWJsZSB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoY29tbWFuZCwgYXJncykge1xyXG4gICAgICAgICAgICB0aGlzLmNvbW1hbmQgPSBjb21tYW5kO1xyXG4gICAgICAgICAgICB0aGlzLmFyZ3MgPSBhcmdzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5EZWJ1Z0FkYXB0ZXJFeGVjdXRhYmxlID0gRGVidWdBZGFwdGVyRXhlY3V0YWJsZTtcclxuICAgIGxldCBMb2dMZXZlbDtcclxuICAgIChmdW5jdGlvbiAoTG9nTGV2ZWwpIHtcclxuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIlRyYWNlXCJdID0gMV0gPSBcIlRyYWNlXCI7XHJcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJEZWJ1Z1wiXSA9IDJdID0gXCJEZWJ1Z1wiO1xyXG4gICAgICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiSW5mb1wiXSA9IDNdID0gXCJJbmZvXCI7XHJcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJXYXJuaW5nXCJdID0gNF0gPSBcIldhcm5pbmdcIjtcclxuICAgICAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIkVycm9yXCJdID0gNV0gPSBcIkVycm9yXCI7XHJcbiAgICAgICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJDcml0aWNhbFwiXSA9IDZdID0gXCJDcml0aWNhbFwiO1xyXG4gICAgICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiT2ZmXCJdID0gN10gPSBcIk9mZlwiO1xyXG4gICAgfSkoTG9nTGV2ZWwgPSB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuTG9nTGV2ZWwgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Mb2dMZXZlbCA9IHt9KSk7XHJcbiAgICAvLyNyZWdpb24gZmlsZSBhcGlcclxuICAgIGxldCBGaWxlQ2hhbmdlVHlwZTtcclxuICAgIChmdW5jdGlvbiAoRmlsZUNoYW5nZVR5cGUpIHtcclxuICAgICAgICBGaWxlQ2hhbmdlVHlwZVtGaWxlQ2hhbmdlVHlwZVtcIkNoYW5nZWRcIl0gPSAxXSA9IFwiQ2hhbmdlZFwiO1xyXG4gICAgICAgIEZpbGVDaGFuZ2VUeXBlW0ZpbGVDaGFuZ2VUeXBlW1wiQ3JlYXRlZFwiXSA9IDJdID0gXCJDcmVhdGVkXCI7XHJcbiAgICAgICAgRmlsZUNoYW5nZVR5cGVbRmlsZUNoYW5nZVR5cGVbXCJEZWxldGVkXCJdID0gM10gPSBcIkRlbGV0ZWRcIjtcclxuICAgIH0pKEZpbGVDaGFuZ2VUeXBlID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZpbGVDaGFuZ2VUeXBlIHx8ICh2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRmlsZUNoYW5nZVR5cGUgPSB7fSkpO1xyXG4gICAgY2xhc3MgRmlsZVN5c3RlbUVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHVyaU9yTWVzc2FnZSwgY29kZSwgdGVybWluYXRvcikge1xyXG4gICAgICAgICAgICBzdXBlcih1cmlfMS52c2NVcmkuVVJJLmlzVXJpKHVyaU9yTWVzc2FnZSkgPyB1cmlPck1lc3NhZ2UudG9TdHJpbmcodHJ1ZSkgOiB1cmlPck1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBjb2RlID8gYCR7Y29kZX0gKEZpbGVTeXN0ZW1FcnJvcilgIDogYEZpbGVTeXN0ZW1FcnJvcmA7XHJcbiAgICAgICAgICAgIC8vIHdvcmthcm91bmQgd2hlbiBleHRlbmRpbmcgYnVpbHRpbiBvYmplY3RzIGFuZCB3aGVuIGNvbXBpbGluZyB0byBFUzUsIHNlZTpcclxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0LXdpa2kvYmxvYi9tYXN0ZXIvQnJlYWtpbmctQ2hhbmdlcy5tZCNleHRlbmRpbmctYnVpbHQtaW5zLWxpa2UtZXJyb3ItYXJyYXktYW5kLW1hcC1tYXktbm8tbG9uZ2VyLXdvcmtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBPYmplY3Quc2V0UHJvdG90eXBlT2YgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBGaWxlU3lzdGVtRXJyb3IucHJvdG90eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB0ZXJtaW5hdG9yID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBuaWNlIHN0YWNrIHRyYWNlc1xyXG4gICAgICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGVybWluYXRvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIEZpbGVFeGlzdHMobWVzc2FnZU9yVXJpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmlsZVN5c3RlbUVycm9yKG1lc3NhZ2VPclVyaSwgJ0VudHJ5RXhpc3RzJywgRmlsZVN5c3RlbUVycm9yLkZpbGVFeGlzdHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgRmlsZU5vdEZvdW5kKG1lc3NhZ2VPclVyaSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpbGVTeXN0ZW1FcnJvcihtZXNzYWdlT3JVcmksICdFbnRyeU5vdEZvdW5kJywgRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RGb3VuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YXRpYyBGaWxlTm90QURpcmVjdG9yeShtZXNzYWdlT3JVcmkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaWxlU3lzdGVtRXJyb3IobWVzc2FnZU9yVXJpLCAnRW50cnlOb3RBRGlyZWN0b3J5JywgRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RBRGlyZWN0b3J5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIEZpbGVJc0FEaXJlY3RvcnkobWVzc2FnZU9yVXJpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmlsZVN5c3RlbUVycm9yKG1lc3NhZ2VPclVyaSwgJ0VudHJ5SXNBRGlyZWN0b3J5JywgRmlsZVN5c3RlbUVycm9yLkZpbGVJc0FEaXJlY3RvcnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0aWMgTm9QZXJtaXNzaW9ucyhtZXNzYWdlT3JVcmkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaWxlU3lzdGVtRXJyb3IobWVzc2FnZU9yVXJpLCAnTm9QZXJtaXNzaW9ucycsIEZpbGVTeXN0ZW1FcnJvci5Ob1Blcm1pc3Npb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIFVuYXZhaWxhYmxlKG1lc3NhZ2VPclVyaSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpbGVTeXN0ZW1FcnJvcihtZXNzYWdlT3JVcmksICdVbmF2YWlsYWJsZScsIEZpbGVTeXN0ZW1FcnJvci5VbmF2YWlsYWJsZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZpbGVTeXN0ZW1FcnJvciA9IEZpbGVTeXN0ZW1FcnJvcjtcclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgLy8jcmVnaW9uIGZvbGRpbmcgYXBpXHJcbiAgICBjbGFzcyBGb2xkaW5nUmFuZ2Uge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHN0YXJ0LCBlbmQsIGtpbmQpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xyXG4gICAgICAgICAgICB0aGlzLmVuZCA9IGVuZDtcclxuICAgICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2c2NNb2NrRXh0SG9zdGVkVHlwZXMuRm9sZGluZ1JhbmdlID0gRm9sZGluZ1JhbmdlO1xyXG4gICAgbGV0IEZvbGRpbmdSYW5nZUtpbmQ7XHJcbiAgICAoZnVuY3Rpb24gKEZvbGRpbmdSYW5nZUtpbmQpIHtcclxuICAgICAgICBGb2xkaW5nUmFuZ2VLaW5kW0ZvbGRpbmdSYW5nZUtpbmRbXCJDb21tZW50XCJdID0gMV0gPSBcIkNvbW1lbnRcIjtcclxuICAgICAgICBGb2xkaW5nUmFuZ2VLaW5kW0ZvbGRpbmdSYW5nZUtpbmRbXCJJbXBvcnRzXCJdID0gMl0gPSBcIkltcG9ydHNcIjtcclxuICAgICAgICBGb2xkaW5nUmFuZ2VLaW5kW0ZvbGRpbmdSYW5nZUtpbmRbXCJSZWdpb25cIl0gPSAzXSA9IFwiUmVnaW9uXCI7XHJcbiAgICB9KShGb2xkaW5nUmFuZ2VLaW5kID0gdnNjTW9ja0V4dEhvc3RlZFR5cGVzLkZvbGRpbmdSYW5nZUtpbmQgfHwgKHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Gb2xkaW5nUmFuZ2VLaW5kID0ge30pKTtcclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgbGV0IENvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlO1xyXG4gICAgKGZ1bmN0aW9uIChDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERldGVybWluZXMgYW4gaXRlbSBpcyBjb2xsYXBzZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZVtDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZVtcIkNvbGxhcHNlZFwiXSA9IDBdID0gXCJDb2xsYXBzZWRcIjtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEZXRlcm1pbmVzIGFuIGl0ZW0gaXMgZXhwYW5kZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZVtDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZVtcIkV4cGFuZGVkXCJdID0gMV0gPSBcIkV4cGFuZGVkXCI7XHJcbiAgICB9KShDb21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSA9IHZzY01vY2tFeHRIb3N0ZWRUeXBlcy5Db21tZW50VGhyZWFkQ29sbGFwc2libGVTdGF0ZSB8fCAodnNjTW9ja0V4dEhvc3RlZFR5cGVzLkNvbW1lbnRUaHJlYWRDb2xsYXBzaWJsZVN0YXRlID0ge30pKTtcclxufSkodnNjTW9ja0V4dEhvc3RlZFR5cGVzID0gZXhwb3J0cy52c2NNb2NrRXh0SG9zdGVkVHlwZXMgfHwgKGV4cG9ydHMudnNjTW9ja0V4dEhvc3RlZFR5cGVzID0ge30pKTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXh0SG9zdGVkVHlwZXMuanMubWFwIl19