// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

var __decorate = void 0 && (void 0).__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var __param = void 0 && (void 0).__param || function (paramIndex, decorator) {
  return function (target, key) {
    decorator(target, key, paramIndex);
  };
};

var __awaiter = void 0 && (void 0).__awaiter || function (thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : new P(function (resolve) {
        resolve(result.value);
      }).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

const fm = require("file-matcher");

const fs = require("fs-extra");

const inversify_1 = require("inversify");

const path = require("path");

const types_1 = require("../common/application/types");

const types_2 = require("../common/types"); // This class generates css using the current theme in order to colorize code.
//
// NOTE: This is all a big hack. It's relying on the theme json files to have a certain format
// in order for this to work.
// See this vscode issue for the real way we think this should happen:
// https://github.com/Microsoft/vscode/issues/32813


let CodeCssGenerator = class CodeCssGenerator {
  constructor(workspaceService, currentProcess, logger) {
    this.workspaceService = workspaceService;
    this.currentProcess = currentProcess;
    this.logger = logger;

    this.generateThemeCss = () => __awaiter(this, void 0, void 0, function* () {
      try {
        // First compute our current theme.
        const workbench = this.workspaceService.getConfiguration('workbench');
        const theme = workbench.get('colorTheme');
        const editor = this.workspaceService.getConfiguration('editor', undefined);
        const font = editor.get('fontFamily');
        const fontSize = editor.get('fontSize'); // Then we have to find where the theme resources are loaded from

        if (theme) {
          const tokenColors = yield this.findTokenColors(theme); // The tokens object then contains the necessary data to generate our css

          if (tokenColors && font && fontSize) {
            return this.generateCss(tokenColors, font, fontSize);
          }
        }
      } catch (err) {
        // On error don't fail, just log
        this.logger.logError(err);
      }

      return '';
    });

    this.getScopeColor = (tokenColors, scope) => {
      // Search through the scopes on the json object
      const match = tokenColors.findIndex(entry => {
        if (entry) {
          const scopes = entry['scope'];

          if (scopes && Array.isArray(scopes)) {
            if (scopes.find(v => v !== null && v.toString() === scope)) {
              return true;
            }
          } else if (scopes && scopes.toString() === scope) {
            return true;
          }
        }

        return false;
      });
      const found = match >= 0 ? tokenColors[match] : null;

      if (found !== null) {
        const settings = found['settings'];

        if (settings && settings !== null) {
          return settings['foreground'];
        }
      } // Default to editor foreground


      return 'var(--vscode-editor-foreground)';
    }; // tslint:disable-next-line:max-func-body-length


    this.generateCss = (tokenColors, fontFamily, fontSize) => {
      // There's a set of values that need to be found
      const comment = this.getScopeColor(tokenColors, 'comment');
      const numeric = this.getScopeColor(tokenColors, 'constant.numeric');
      const stringColor = this.getScopeColor(tokenColors, 'string');
      const keyword = this.getScopeColor(tokenColors, 'keyword');
      const operator = this.getScopeColor(tokenColors, 'keyword.operator');
      const variable = this.getScopeColor(tokenColors, 'variable');
      const def = 'var(--vscode-editor-foreground)'; // Use these values to fill in our format string

      return `
        :root {
            --comment-color: ${comment}
        }
        code[class*="language-"],
        pre[class*="language-"] {
            color: ${def};
            background: none;
            text-shadow: none;
            font-family: ${fontFamily};
            text-align: left;
            white-space: pre;
            word-spacing: normal;
            word-break: normal;
            word-wrap: normal;
            font-size: ${fontSize}px;

            -moz-tab-size: 4;
            -o-tab-size: 4;
            tab-size: 4;

            -webkit-hyphens: none;
            -moz-hyphens: none;
            -ms-hyphens: none;
            hyphens: none;
        }

        pre[class*="language-"]::-moz-selection, pre[class*="language-"] ::-moz-selection,
        code[class*="language-"]::-moz-selection, code[class*="language-"] ::-moz-selection {
            text-shadow: none;
            background: var(--vscode-editor-selectionBackground);
        }

        pre[class*="language-"]::selection, pre[class*="language-"] ::selection,
        code[class*="language-"]::selection, code[class*="language-"] ::selection {
            text-shadow: none;
            background: var(--vscode-editor-selectionBackground);
        }

        @media print {
            code[class*="language-"],
            pre[class*="language-"] {
                text-shadow: none;
            }
        }

        /* Code blocks */
        pre[class*="language-"] {
            padding: 1em;
            margin: .5em 0;
            overflow: auto;
        }

        :not(pre) > code[class*="language-"],
        pre[class*="language-"] {
            background: transparent;
        }

        /* Inline code */
        :not(pre) > code[class*="language-"] {
            padding: .1em;
            border-radius: .3em;
            white-space: normal;
        }

        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
            color: ${comment};
        }

        .token.punctuation {
            color: ${def};
        }

        .namespace {
            opacity: .7;
        }

        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
            color: ${numeric};
        }

        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
            color: ${stringColor};
        }

        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
            color: ${operator};
            background: transparent;
        }

        .token.atrule,
        .token.attr-value,
        .token.keyword {
            color: ${keyword};
        }

        .token.function,
        .token.class-name {
            color: ${keyword};
        }

        .token.regex,
        .token.important,
        .token.variable {
            color: ${variable};
        }

        .token.important,
        .token.bold {
            font-weight: bold;
        }
        .token.italic {
            font-style: italic;
        }

        .token.entity {
            cursor: help;
        }
`;
    };

    this.mergeColors = (colors1, colors2) => {
      return [...colors1, ...colors2];
    };

    this.readTokenColors = themeFile => __awaiter(this, void 0, void 0, function* () {
      const tokenContent = yield fs.readFile(themeFile, 'utf8');
      const theme = JSON.parse(tokenContent);
      const tokenColors = theme['tokenColors'];

      if (tokenColors && tokenColors.length > 0) {
        // This theme may include others. If so we need to combine the two together
        const include = theme ? theme['include'] : undefined;

        if (include && include !== null) {
          const includePath = path.join(path.dirname(themeFile), include.toString());
          const includedColors = yield this.readTokenColors(includePath);
          return this.mergeColors(tokenColors, includedColors);
        } // Theme is a root, don't need to include others


        return tokenColors;
      }

      return [];
    });

    this.findTokenColors = theme => __awaiter(this, void 0, void 0, function* () {
      const currentExe = this.currentProcess.execPath;
      let currentPath = path.dirname(currentExe); // Should be somewhere under currentPath/resources/app/extensions inside of a json file

      let extensionsPath = path.join(currentPath, 'resources', 'app', 'extensions');

      if (!(yield fs.pathExists(extensionsPath))) {
        // Might be on mac or linux. try a different path
        currentPath = path.resolve(currentPath, '../../../..');
        extensionsPath = path.join(currentPath, 'resources', 'app', 'extensions');
      } // Search through all of the json files for the theme name


      const escapedThemeName = theme.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const searchOptions = {
        path: extensionsPath,
        recursiveSearch: true,
        fileFilter: {
          fileNamePattern: '**/*.json',
          content: new RegExp(`id[',"]:\\s*[',"]${escapedThemeName}[',"]`)
        }
      };
      const matcher = new fm.FileMatcher();

      try {
        const results = yield matcher.find(searchOptions); // Use the first result if we have one

        if (results && results.length > 0) {
          // This should be the path to the file. Load it as a json object
          const contents = yield fs.readFile(results[0], 'utf8');
          const json = JSON.parse(contents); // There should be a contributes section

          const contributes = json['contributes']; // This should have a themes section

          const themes = contributes['themes']; // One of these (it's an array), should have our matching theme entry

          const index = themes.findIndex(e => {
            return e !== null && e['id'] === theme;
          });
          const found = index >= 0 ? themes[index] : null;

          if (found !== null) {
            // Then the path entry should contain a relative path to the json file with
            // the tokens in it
            const themeFile = path.join(path.dirname(results[0]), found['path']);
            return yield this.readTokenColors(themeFile);
          }
        }
      } catch (err) {
        // Swallow any exceptions with searching or parsing
        this.logger.logError(err);
      } // We should return a default. The vscode-light theme


      const defaultThemeFile = path.join(__dirname, 'defaultTheme.json');
      return this.readTokenColors(defaultThemeFile);
    });
  }

};
CodeCssGenerator = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_1.IWorkspaceService)), __param(1, inversify_1.inject(types_2.ICurrentProcess)), __param(2, inversify_1.inject(types_2.ILogger))], CodeCssGenerator);
exports.CodeCssGenerator = CodeCssGenerator;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvZGVDc3NHZW5lcmF0b3IuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImZtIiwicmVxdWlyZSIsImZzIiwiaW52ZXJzaWZ5XzEiLCJwYXRoIiwidHlwZXNfMSIsInR5cGVzXzIiLCJDb2RlQ3NzR2VuZXJhdG9yIiwiY29uc3RydWN0b3IiLCJ3b3Jrc3BhY2VTZXJ2aWNlIiwiY3VycmVudFByb2Nlc3MiLCJsb2dnZXIiLCJnZW5lcmF0ZVRoZW1lQ3NzIiwid29ya2JlbmNoIiwiZ2V0Q29uZmlndXJhdGlvbiIsInRoZW1lIiwiZ2V0IiwiZWRpdG9yIiwidW5kZWZpbmVkIiwiZm9udCIsImZvbnRTaXplIiwidG9rZW5Db2xvcnMiLCJmaW5kVG9rZW5Db2xvcnMiLCJnZW5lcmF0ZUNzcyIsImVyciIsImxvZ0Vycm9yIiwiZ2V0U2NvcGVDb2xvciIsInNjb3BlIiwibWF0Y2giLCJmaW5kSW5kZXgiLCJlbnRyeSIsInNjb3BlcyIsIkFycmF5IiwiaXNBcnJheSIsImZpbmQiLCJ2IiwidG9TdHJpbmciLCJmb3VuZCIsInNldHRpbmdzIiwiZm9udEZhbWlseSIsImNvbW1lbnQiLCJudW1lcmljIiwic3RyaW5nQ29sb3IiLCJrZXl3b3JkIiwib3BlcmF0b3IiLCJ2YXJpYWJsZSIsImRlZiIsIm1lcmdlQ29sb3JzIiwiY29sb3JzMSIsImNvbG9yczIiLCJyZWFkVG9rZW5Db2xvcnMiLCJ0aGVtZUZpbGUiLCJ0b2tlbkNvbnRlbnQiLCJyZWFkRmlsZSIsIkpTT04iLCJwYXJzZSIsImluY2x1ZGUiLCJpbmNsdWRlUGF0aCIsImpvaW4iLCJkaXJuYW1lIiwiaW5jbHVkZWRDb2xvcnMiLCJjdXJyZW50RXhlIiwiZXhlY1BhdGgiLCJjdXJyZW50UGF0aCIsImV4dGVuc2lvbnNQYXRoIiwicGF0aEV4aXN0cyIsImVzY2FwZWRUaGVtZU5hbWUiLCJyZXBsYWNlIiwic2VhcmNoT3B0aW9ucyIsInJlY3Vyc2l2ZVNlYXJjaCIsImZpbGVGaWx0ZXIiLCJmaWxlTmFtZVBhdHRlcm4iLCJjb250ZW50IiwiUmVnRXhwIiwibWF0Y2hlciIsIkZpbGVNYXRjaGVyIiwicmVzdWx0cyIsImNvbnRlbnRzIiwianNvbiIsImNvbnRyaWJ1dGVzIiwidGhlbWVzIiwiaW5kZXgiLCJkZWZhdWx0VGhlbWVGaWxlIiwiX19kaXJuYW1lIiwiaW5qZWN0YWJsZSIsImluamVjdCIsIklXb3Jrc3BhY2VTZXJ2aWNlIiwiSUN1cnJlbnRQcm9jZXNzIiwiSUxvZ2dlciJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0Es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QmdDLGdCQUFyQixDQUFQO0FBQ0gsS0FwRDBDLENBQTNDO0FBcURIOztBQXBSeUMsQ0FBOUM7QUFzUkEzRSxnQkFBZ0IsR0FBRzdDLFVBQVUsQ0FBQyxDQUMxQnlDLFdBQVcsQ0FBQ2lGLFVBQVosRUFEMEIsRUFFMUIxRyxPQUFPLENBQUMsQ0FBRCxFQUFJeUIsV0FBVyxDQUFDa0YsTUFBWixDQUFtQmhGLE9BQU8sQ0FBQ2lGLGlCQUEzQixDQUFKLENBRm1CLEVBRzFCNUcsT0FBTyxDQUFDLENBQUQsRUFBSXlCLFdBQVcsQ0FBQ2tGLE1BQVosQ0FBbUIvRSxPQUFPLENBQUNpRixlQUEzQixDQUFKLENBSG1CLEVBSTFCN0csT0FBTyxDQUFDLENBQUQsRUFBSXlCLFdBQVcsQ0FBQ2tGLE1BQVosQ0FBbUIvRSxPQUFPLENBQUNrRixPQUEzQixDQUFKLENBSm1CLENBQUQsRUFLMUJqRixnQkFMMEIsQ0FBN0I7QUFNQVIsT0FBTyxDQUFDUSxnQkFBUixHQUEyQkEsZ0JBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4ndXNlIHN0cmljdCc7XG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZm0gPSByZXF1aXJlKFwiZmlsZS1tYXRjaGVyXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XG5jb25zdCBpbnZlcnNpZnlfMSA9IHJlcXVpcmUoXCJpbnZlcnNpZnlcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9hcHBsaWNhdGlvbi90eXBlc1wiKTtcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vY29tbW9uL3R5cGVzXCIpO1xuLy8gVGhpcyBjbGFzcyBnZW5lcmF0ZXMgY3NzIHVzaW5nIHRoZSBjdXJyZW50IHRoZW1lIGluIG9yZGVyIHRvIGNvbG9yaXplIGNvZGUuXG4vL1xuLy8gTk9URTogVGhpcyBpcyBhbGwgYSBiaWcgaGFjay4gSXQncyByZWx5aW5nIG9uIHRoZSB0aGVtZSBqc29uIGZpbGVzIHRvIGhhdmUgYSBjZXJ0YWluIGZvcm1hdFxuLy8gaW4gb3JkZXIgZm9yIHRoaXMgdG8gd29yay5cbi8vIFNlZSB0aGlzIHZzY29kZSBpc3N1ZSBmb3IgdGhlIHJlYWwgd2F5IHdlIHRoaW5rIHRoaXMgc2hvdWxkIGhhcHBlbjpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvdnNjb2RlL2lzc3Vlcy8zMjgxM1xubGV0IENvZGVDc3NHZW5lcmF0b3IgPSBjbGFzcyBDb2RlQ3NzR2VuZXJhdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VTZXJ2aWNlLCBjdXJyZW50UHJvY2VzcywgbG9nZ2VyKSB7XG4gICAgICAgIHRoaXMud29ya3NwYWNlU2VydmljZSA9IHdvcmtzcGFjZVNlcnZpY2U7XG4gICAgICAgIHRoaXMuY3VycmVudFByb2Nlc3MgPSBjdXJyZW50UHJvY2VzcztcbiAgICAgICAgdGhpcy5sb2dnZXIgPSBsb2dnZXI7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVUaGVtZUNzcyA9ICgpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY29tcHV0ZSBvdXIgY3VycmVudCB0aGVtZS5cbiAgICAgICAgICAgICAgICBjb25zdCB3b3JrYmVuY2ggPSB0aGlzLndvcmtzcGFjZVNlcnZpY2UuZ2V0Q29uZmlndXJhdGlvbignd29ya2JlbmNoJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGhlbWUgPSB3b3JrYmVuY2guZ2V0KCdjb2xvclRoZW1lJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZWRpdG9yID0gdGhpcy53b3Jrc3BhY2VTZXJ2aWNlLmdldENvbmZpZ3VyYXRpb24oJ2VkaXRvcicsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9udCA9IGVkaXRvci5nZXQoJ2ZvbnRGYW1pbHknKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmb250U2l6ZSA9IGVkaXRvci5nZXQoJ2ZvbnRTaXplJyk7XG4gICAgICAgICAgICAgICAgLy8gVGhlbiB3ZSBoYXZlIHRvIGZpbmQgd2hlcmUgdGhlIHRoZW1lIHJlc291cmNlcyBhcmUgbG9hZGVkIGZyb21cbiAgICAgICAgICAgICAgICBpZiAodGhlbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW5Db2xvcnMgPSB5aWVsZCB0aGlzLmZpbmRUb2tlbkNvbG9ycyh0aGVtZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSB0b2tlbnMgb2JqZWN0IHRoZW4gY29udGFpbnMgdGhlIG5lY2Vzc2FyeSBkYXRhIHRvIGdlbmVyYXRlIG91ciBjc3NcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuQ29sb3JzICYmIGZvbnQgJiYgZm9udFNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdlbmVyYXRlQ3NzKHRva2VuQ29sb3JzLCBmb250LCBmb250U2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gT24gZXJyb3IgZG9uJ3QgZmFpbCwganVzdCBsb2dcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dFcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5nZXRTY29wZUNvbG9yID0gKHRva2VuQ29sb3JzLCBzY29wZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2VhcmNoIHRocm91Z2ggdGhlIHNjb3BlcyBvbiB0aGUganNvbiBvYmplY3RcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdG9rZW5Db2xvcnMuZmluZEluZGV4KGVudHJ5ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NvcGVzID0gZW50cnlbJ3Njb3BlJ107XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZXMgJiYgQXJyYXkuaXNBcnJheShzY29wZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGVzLmZpbmQodiA9PiB2ICE9PSBudWxsICYmIHYudG9TdHJpbmcoKSA9PT0gc2NvcGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoc2NvcGVzICYmIHNjb3Blcy50b1N0cmluZygpID09PSBzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IG1hdGNoID49IDAgPyB0b2tlbkNvbG9yc1ttYXRjaF0gOiBudWxsO1xuICAgICAgICAgICAgaWYgKGZvdW5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBmb3VuZFsnc2V0dGluZ3MnXTtcbiAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MgJiYgc2V0dGluZ3MgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzWydmb3JlZ3JvdW5kJ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBlZGl0b3IgZm9yZWdyb3VuZFxuICAgICAgICAgICAgcmV0dXJuICd2YXIoLS12c2NvZGUtZWRpdG9yLWZvcmVncm91bmQpJztcbiAgICAgICAgfTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1mdW5jLWJvZHktbGVuZ3RoXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVDc3MgPSAodG9rZW5Db2xvcnMsIGZvbnRGYW1pbHksIGZvbnRTaXplKSA9PiB7XG4gICAgICAgICAgICAvLyBUaGVyZSdzIGEgc2V0IG9mIHZhbHVlcyB0aGF0IG5lZWQgdG8gYmUgZm91bmRcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSB0aGlzLmdldFNjb3BlQ29sb3IodG9rZW5Db2xvcnMsICdjb21tZW50Jyk7XG4gICAgICAgICAgICBjb25zdCBudW1lcmljID0gdGhpcy5nZXRTY29wZUNvbG9yKHRva2VuQ29sb3JzLCAnY29uc3RhbnQubnVtZXJpYycpO1xuICAgICAgICAgICAgY29uc3Qgc3RyaW5nQ29sb3IgPSB0aGlzLmdldFNjb3BlQ29sb3IodG9rZW5Db2xvcnMsICdzdHJpbmcnKTtcbiAgICAgICAgICAgIGNvbnN0IGtleXdvcmQgPSB0aGlzLmdldFNjb3BlQ29sb3IodG9rZW5Db2xvcnMsICdrZXl3b3JkJyk7XG4gICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IHRoaXMuZ2V0U2NvcGVDb2xvcih0b2tlbkNvbG9ycywgJ2tleXdvcmQub3BlcmF0b3InKTtcbiAgICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gdGhpcy5nZXRTY29wZUNvbG9yKHRva2VuQ29sb3JzLCAndmFyaWFibGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZiA9ICd2YXIoLS12c2NvZGUtZWRpdG9yLWZvcmVncm91bmQpJztcbiAgICAgICAgICAgIC8vIFVzZSB0aGVzZSB2YWx1ZXMgdG8gZmlsbCBpbiBvdXIgZm9ybWF0IHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgOnJvb3Qge1xuICAgICAgICAgICAgLS1jb21tZW50LWNvbG9yOiAke2NvbW1lbnR9XG4gICAgICAgIH1cbiAgICAgICAgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0sXG4gICAgICAgIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0ge1xuICAgICAgICAgICAgY29sb3I6ICR7ZGVmfTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7XG4gICAgICAgICAgICB0ZXh0LXNoYWRvdzogbm9uZTtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAke2ZvbnRGYW1pbHl9O1xuICAgICAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcbiAgICAgICAgICAgIHdoaXRlLXNwYWNlOiBwcmU7XG4gICAgICAgICAgICB3b3JkLXNwYWNpbmc6IG5vcm1hbDtcbiAgICAgICAgICAgIHdvcmQtYnJlYWs6IG5vcm1hbDtcbiAgICAgICAgICAgIHdvcmQtd3JhcDogbm9ybWFsO1xuICAgICAgICAgICAgZm9udC1zaXplOiAke2ZvbnRTaXplfXB4O1xuXG4gICAgICAgICAgICAtbW96LXRhYi1zaXplOiA0O1xuICAgICAgICAgICAgLW8tdGFiLXNpemU6IDQ7XG4gICAgICAgICAgICB0YWItc2l6ZTogNDtcblxuICAgICAgICAgICAgLXdlYmtpdC1oeXBoZW5zOiBub25lO1xuICAgICAgICAgICAgLW1vei1oeXBoZW5zOiBub25lO1xuICAgICAgICAgICAgLW1zLWh5cGhlbnM6IG5vbmU7XG4gICAgICAgICAgICBoeXBoZW5zOiBub25lO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlW2NsYXNzKj1cImxhbmd1YWdlLVwiXTo6LW1vei1zZWxlY3Rpb24sIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gOjotbW96LXNlbGVjdGlvbixcbiAgICAgICAgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl06Oi1tb3otc2VsZWN0aW9uLCBjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSA6Oi1tb3otc2VsZWN0aW9uIHtcbiAgICAgICAgICAgIHRleHQtc2hhZG93OiBub25lO1xuICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tdnNjb2RlLWVkaXRvci1zZWxlY3Rpb25CYWNrZ3JvdW5kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl06OnNlbGVjdGlvbiwgcHJlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSA6OnNlbGVjdGlvbixcbiAgICAgICAgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl06OnNlbGVjdGlvbiwgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gOjpzZWxlY3Rpb24ge1xuICAgICAgICAgICAgdGV4dC1zaGFkb3c6IG5vbmU7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS12c2NvZGUtZWRpdG9yLXNlbGVjdGlvbkJhY2tncm91bmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgQG1lZGlhIHByaW50IHtcbiAgICAgICAgICAgIGNvZGVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdLFxuICAgICAgICAgICAgcHJlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSB7XG4gICAgICAgICAgICAgICAgdGV4dC1zaGFkb3c6IG5vbmU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKiBDb2RlIGJsb2NrcyAqL1xuICAgICAgICBwcmVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IDFlbTtcbiAgICAgICAgICAgIG1hcmdpbjogLjVlbSAwO1xuICAgICAgICAgICAgb3ZlcmZsb3c6IGF1dG87XG4gICAgICAgIH1cblxuICAgICAgICA6bm90KHByZSkgPiBjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSxcbiAgICAgICAgcHJlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIElubGluZSBjb2RlICovXG4gICAgICAgIDpub3QocHJlKSA+IGNvZGVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IC4xZW07XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiAuM2VtO1xuICAgICAgICAgICAgd2hpdGUtc3BhY2U6IG5vcm1hbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC50b2tlbi5jb21tZW50LFxuICAgICAgICAudG9rZW4ucHJvbG9nLFxuICAgICAgICAudG9rZW4uZG9jdHlwZSxcbiAgICAgICAgLnRva2VuLmNkYXRhIHtcbiAgICAgICAgICAgIGNvbG9yOiAke2NvbW1lbnR9O1xuICAgICAgICB9XG5cbiAgICAgICAgLnRva2VuLnB1bmN0dWF0aW9uIHtcbiAgICAgICAgICAgIGNvbG9yOiAke2RlZn07XG4gICAgICAgIH1cblxuICAgICAgICAubmFtZXNwYWNlIHtcbiAgICAgICAgICAgIG9wYWNpdHk6IC43O1xuICAgICAgICB9XG5cbiAgICAgICAgLnRva2VuLnByb3BlcnR5LFxuICAgICAgICAudG9rZW4udGFnLFxuICAgICAgICAudG9rZW4uYm9vbGVhbixcbiAgICAgICAgLnRva2VuLm51bWJlcixcbiAgICAgICAgLnRva2VuLmNvbnN0YW50LFxuICAgICAgICAudG9rZW4uc3ltYm9sLFxuICAgICAgICAudG9rZW4uZGVsZXRlZCB7XG4gICAgICAgICAgICBjb2xvcjogJHtudW1lcmljfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC50b2tlbi5zZWxlY3RvcixcbiAgICAgICAgLnRva2VuLmF0dHItbmFtZSxcbiAgICAgICAgLnRva2VuLnN0cmluZyxcbiAgICAgICAgLnRva2VuLmNoYXIsXG4gICAgICAgIC50b2tlbi5idWlsdGluLFxuICAgICAgICAudG9rZW4uaW5zZXJ0ZWQge1xuICAgICAgICAgICAgY29sb3I6ICR7c3RyaW5nQ29sb3J9O1xuICAgICAgICB9XG5cbiAgICAgICAgLnRva2VuLm9wZXJhdG9yLFxuICAgICAgICAudG9rZW4uZW50aXR5LFxuICAgICAgICAudG9rZW4udXJsLFxuICAgICAgICAubGFuZ3VhZ2UtY3NzIC50b2tlbi5zdHJpbmcsXG4gICAgICAgIC5zdHlsZSAudG9rZW4uc3RyaW5nIHtcbiAgICAgICAgICAgIGNvbG9yOiAke29wZXJhdG9yfTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLnRva2VuLmF0cnVsZSxcbiAgICAgICAgLnRva2VuLmF0dHItdmFsdWUsXG4gICAgICAgIC50b2tlbi5rZXl3b3JkIHtcbiAgICAgICAgICAgIGNvbG9yOiAke2tleXdvcmR9O1xuICAgICAgICB9XG5cbiAgICAgICAgLnRva2VuLmZ1bmN0aW9uLFxuICAgICAgICAudG9rZW4uY2xhc3MtbmFtZSB7XG4gICAgICAgICAgICBjb2xvcjogJHtrZXl3b3JkfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC50b2tlbi5yZWdleCxcbiAgICAgICAgLnRva2VuLmltcG9ydGFudCxcbiAgICAgICAgLnRva2VuLnZhcmlhYmxlIHtcbiAgICAgICAgICAgIGNvbG9yOiAke3ZhcmlhYmxlfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC50b2tlbi5pbXBvcnRhbnQsXG4gICAgICAgIC50b2tlbi5ib2xkIHtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgICB9XG4gICAgICAgIC50b2tlbi5pdGFsaWMge1xuICAgICAgICAgICAgZm9udC1zdHlsZTogaXRhbGljO1xuICAgICAgICB9XG5cbiAgICAgICAgLnRva2VuLmVudGl0eSB7XG4gICAgICAgICAgICBjdXJzb3I6IGhlbHA7XG4gICAgICAgIH1cbmA7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMubWVyZ2VDb2xvcnMgPSAoY29sb3JzMSwgY29sb3JzMikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi5jb2xvcnMxLCAuLi5jb2xvcnMyXTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5yZWFkVG9rZW5Db2xvcnMgPSAodGhlbWVGaWxlKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCB0b2tlbkNvbnRlbnQgPSB5aWVsZCBmcy5yZWFkRmlsZSh0aGVtZUZpbGUsICd1dGY4Jyk7XG4gICAgICAgICAgICBjb25zdCB0aGVtZSA9IEpTT04ucGFyc2UodG9rZW5Db250ZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHRva2VuQ29sb3JzID0gdGhlbWVbJ3Rva2VuQ29sb3JzJ107XG4gICAgICAgICAgICBpZiAodG9rZW5Db2xvcnMgJiYgdG9rZW5Db2xvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgdGhlbWUgbWF5IGluY2x1ZGUgb3RoZXJzLiBJZiBzbyB3ZSBuZWVkIHRvIGNvbWJpbmUgdGhlIHR3byB0b2dldGhlclxuICAgICAgICAgICAgICAgIGNvbnN0IGluY2x1ZGUgPSB0aGVtZSA/IHRoZW1lWydpbmNsdWRlJ10gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGUgJiYgaW5jbHVkZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmNsdWRlUGF0aCA9IHBhdGguam9pbihwYXRoLmRpcm5hbWUodGhlbWVGaWxlKSwgaW5jbHVkZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5jbHVkZWRDb2xvcnMgPSB5aWVsZCB0aGlzLnJlYWRUb2tlbkNvbG9ycyhpbmNsdWRlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1lcmdlQ29sb3JzKHRva2VuQ29sb3JzLCBpbmNsdWRlZENvbG9ycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRoZW1lIGlzIGEgcm9vdCwgZG9uJ3QgbmVlZCB0byBpbmNsdWRlIG90aGVyc1xuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbkNvbG9ycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZmluZFRva2VuQ29sb3JzID0gKHRoZW1lKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXhlID0gdGhpcy5jdXJyZW50UHJvY2Vzcy5leGVjUGF0aDtcbiAgICAgICAgICAgIGxldCBjdXJyZW50UGF0aCA9IHBhdGguZGlybmFtZShjdXJyZW50RXhlKTtcbiAgICAgICAgICAgIC8vIFNob3VsZCBiZSBzb21ld2hlcmUgdW5kZXIgY3VycmVudFBhdGgvcmVzb3VyY2VzL2FwcC9leHRlbnNpb25zIGluc2lkZSBvZiBhIGpzb24gZmlsZVxuICAgICAgICAgICAgbGV0IGV4dGVuc2lvbnNQYXRoID0gcGF0aC5qb2luKGN1cnJlbnRQYXRoLCAncmVzb3VyY2VzJywgJ2FwcCcsICdleHRlbnNpb25zJyk7XG4gICAgICAgICAgICBpZiAoISh5aWVsZCBmcy5wYXRoRXhpc3RzKGV4dGVuc2lvbnNQYXRoKSkpIHtcbiAgICAgICAgICAgICAgICAvLyBNaWdodCBiZSBvbiBtYWMgb3IgbGludXguIHRyeSBhIGRpZmZlcmVudCBwYXRoXG4gICAgICAgICAgICAgICAgY3VycmVudFBhdGggPSBwYXRoLnJlc29sdmUoY3VycmVudFBhdGgsICcuLi8uLi8uLi8uLicpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNQYXRoID0gcGF0aC5qb2luKGN1cnJlbnRQYXRoLCAncmVzb3VyY2VzJywgJ2FwcCcsICdleHRlbnNpb25zJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTZWFyY2ggdGhyb3VnaCBhbGwgb2YgdGhlIGpzb24gZmlsZXMgZm9yIHRoZSB0aGVtZSBuYW1lXG4gICAgICAgICAgICBjb25zdCBlc2NhcGVkVGhlbWVOYW1lID0gdGhlbWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHBhdGg6IGV4dGVuc2lvbnNQYXRoLFxuICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZVNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmaWxlRmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lUGF0dGVybjogJyoqLyouanNvbicsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG5ldyBSZWdFeHAoYGlkWycsXCJdOlxcXFxzKlsnLFwiXSR7ZXNjYXBlZFRoZW1lTmFtZX1bJyxcIl1gKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbmV3IGZtLkZpbGVNYXRjaGVyKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSB5aWVsZCBtYXRjaGVyLmZpbmQoc2VhcmNoT3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBmaXJzdCByZXN1bHQgaWYgd2UgaGF2ZSBvbmVcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBzaG91bGQgYmUgdGhlIHBhdGggdG8gdGhlIGZpbGUuIExvYWQgaXQgYXMgYSBqc29uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50cyA9IHlpZWxkIGZzLnJlYWRGaWxlKHJlc3VsdHNbMF0sICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGNvbnRlbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlcmUgc2hvdWxkIGJlIGEgY29udHJpYnV0ZXMgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250cmlidXRlcyA9IGpzb25bJ2NvbnRyaWJ1dGVzJ107XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIGhhdmUgYSB0aGVtZXMgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aGVtZXMgPSBjb250cmlidXRlc1sndGhlbWVzJ107XG4gICAgICAgICAgICAgICAgICAgIC8vIE9uZSBvZiB0aGVzZSAoaXQncyBhbiBhcnJheSksIHNob3VsZCBoYXZlIG91ciBtYXRjaGluZyB0aGVtZSBlbnRyeVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoZW1lcy5maW5kSW5kZXgoZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZSAhPT0gbnVsbCAmJiBlWydpZCddID09PSB0aGVtZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gaW5kZXggPj0gMCA/IHRoZW1lc1tpbmRleF0gOiBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gdGhlIHBhdGggZW50cnkgc2hvdWxkIGNvbnRhaW4gYSByZWxhdGl2ZSBwYXRoIHRvIHRoZSBqc29uIGZpbGUgd2l0aFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHRva2VucyBpbiBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGhlbWVGaWxlID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShyZXN1bHRzWzBdKSwgZm91bmRbJ3BhdGgnXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geWllbGQgdGhpcy5yZWFkVG9rZW5Db2xvcnModGhlbWVGaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBTd2FsbG93IGFueSBleGNlcHRpb25zIHdpdGggc2VhcmNoaW5nIG9yIHBhcnNpbmdcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dFcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gV2Ugc2hvdWxkIHJldHVybiBhIGRlZmF1bHQuIFRoZSB2c2NvZGUtbGlnaHQgdGhlbWVcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRUaGVtZUZpbGUgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnZGVmYXVsdFRoZW1lLmpzb24nKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbkNvbG9ycyhkZWZhdWx0VGhlbWVGaWxlKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbkNvZGVDc3NHZW5lcmF0b3IgPSBfX2RlY29yYXRlKFtcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXG4gICAgX19wYXJhbSgwLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMS5JV29ya3NwYWNlU2VydmljZSkpLFxuICAgIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzIuSUN1cnJlbnRQcm9jZXNzKSksXG4gICAgX19wYXJhbSgyLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMi5JTG9nZ2VyKSlcbl0sIENvZGVDc3NHZW5lcmF0b3IpO1xuZXhwb3J0cy5Db2RlQ3NzR2VuZXJhdG9yID0gQ29kZUNzc0dlbmVyYXRvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvZGVDc3NHZW5lcmF0b3IuanMubWFwIl19