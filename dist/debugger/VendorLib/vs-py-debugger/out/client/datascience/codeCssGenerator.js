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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvZGVDc3NHZW5lcmF0b3IuanMiXSwibmFtZXMiOlsiX19kZWNvcmF0ZSIsImRlY29yYXRvcnMiLCJ0YXJnZXQiLCJrZXkiLCJkZXNjIiwiYyIsImFyZ3VtZW50cyIsImxlbmd0aCIsInIiLCJPYmplY3QiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJkIiwiUmVmbGVjdCIsImRlY29yYXRlIiwiaSIsImRlZmluZVByb3BlcnR5IiwiX19wYXJhbSIsInBhcmFtSW5kZXgiLCJkZWNvcmF0b3IiLCJfX2F3YWl0ZXIiLCJ0aGlzQXJnIiwiX2FyZ3VtZW50cyIsIlAiLCJnZW5lcmF0b3IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImZ1bGZpbGxlZCIsInZhbHVlIiwic3RlcCIsIm5leHQiLCJlIiwicmVqZWN0ZWQiLCJyZXN1bHQiLCJkb25lIiwidGhlbiIsImFwcGx5IiwiZXhwb3J0cyIsImZtIiwicmVxdWlyZSIsImZzIiwiaW52ZXJzaWZ5XzEiLCJwYXRoIiwidHlwZXNfMSIsInR5cGVzXzIiLCJDb2RlQ3NzR2VuZXJhdG9yIiwiY29uc3RydWN0b3IiLCJ3b3Jrc3BhY2VTZXJ2aWNlIiwiY3VycmVudFByb2Nlc3MiLCJsb2dnZXIiLCJnZW5lcmF0ZVRoZW1lQ3NzIiwid29ya2JlbmNoIiwiZ2V0Q29uZmlndXJhdGlvbiIsInRoZW1lIiwiZ2V0IiwiZWRpdG9yIiwidW5kZWZpbmVkIiwiZm9udCIsImZvbnRTaXplIiwidG9rZW5Db2xvcnMiLCJmaW5kVG9rZW5Db2xvcnMiLCJnZW5lcmF0ZUNzcyIsImVyciIsImxvZ0Vycm9yIiwiZ2V0U2NvcGVDb2xvciIsInNjb3BlIiwibWF0Y2giLCJmaW5kSW5kZXgiLCJlbnRyeSIsInNjb3BlcyIsIkFycmF5IiwiaXNBcnJheSIsImZpbmQiLCJ2IiwidG9TdHJpbmciLCJmb3VuZCIsInNldHRpbmdzIiwiZm9udEZhbWlseSIsImNvbW1lbnQiLCJudW1lcmljIiwic3RyaW5nQ29sb3IiLCJrZXl3b3JkIiwib3BlcmF0b3IiLCJ2YXJpYWJsZSIsImRlZiIsIm1lcmdlQ29sb3JzIiwiY29sb3JzMSIsImNvbG9yczIiLCJyZWFkVG9rZW5Db2xvcnMiLCJ0aGVtZUZpbGUiLCJ0b2tlbkNvbnRlbnQiLCJyZWFkRmlsZSIsIkpTT04iLCJwYXJzZSIsImluY2x1ZGUiLCJpbmNsdWRlUGF0aCIsImpvaW4iLCJkaXJuYW1lIiwiaW5jbHVkZWRDb2xvcnMiLCJjdXJyZW50RXhlIiwiZXhlY1BhdGgiLCJjdXJyZW50UGF0aCIsImV4dGVuc2lvbnNQYXRoIiwicGF0aEV4aXN0cyIsImVzY2FwZWRUaGVtZU5hbWUiLCJyZXBsYWNlIiwic2VhcmNoT3B0aW9ucyIsInJlY3Vyc2l2ZVNlYXJjaCIsImZpbGVGaWx0ZXIiLCJmaWxlTmFtZVBhdHRlcm4iLCJjb250ZW50IiwiUmVnRXhwIiwibWF0Y2hlciIsIkZpbGVNYXRjaGVyIiwicmVzdWx0cyIsImNvbnRlbnRzIiwianNvbiIsImNvbnRyaWJ1dGVzIiwidGhlbWVzIiwiaW5kZXgiLCJkZWZhdWx0VGhlbWVGaWxlIiwiX19kaXJuYW1lIiwiaW5qZWN0YWJsZSIsImluamVjdCIsIklXb3Jrc3BhY2VTZXJ2aWNlIiwiSUN1cnJlbnRQcm9jZXNzIiwiSUxvZ2dlciJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBOztBQUNBLElBQUlBLFVBQVUsR0FBSSxVQUFRLFNBQUtBLFVBQWQsSUFBNkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNuRixNQUFJQyxDQUFDLEdBQUdDLFNBQVMsQ0FBQ0MsTUFBbEI7QUFBQSxNQUEwQkMsQ0FBQyxHQUFHSCxDQUFDLEdBQUcsQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxJQUFJLEtBQUssSUFBVCxHQUFnQkEsSUFBSSxHQUFHSyxNQUFNLENBQUNDLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBQXJIO0FBQUEsTUFBMkhPLENBQTNIO0FBQ0Es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QmdDLGdCQUFyQixDQUFQO0FBQ0gsS0FwRDBDLENBQTNDO0FBcURIOztBQXBSeUMsQ0FBOUM7QUFzUkEzRSxnQkFBZ0IsR0FBRzdDLFVBQVUsQ0FBQyxDQUMxQnlDLFdBQVcsQ0FBQ2lGLFVBQVosRUFEMEIsRUFFMUIxRyxPQUFPLENBQUMsQ0FBRCxFQUFJeUIsV0FBVyxDQUFDa0YsTUFBWixDQUFtQmhGLE9BQU8sQ0FBQ2lGLGlCQUEzQixDQUFKLENBRm1CLEVBRzFCNUcsT0FBTyxDQUFDLENBQUQsRUFBSXlCLFdBQVcsQ0FBQ2tGLE1BQVosQ0FBbUIvRSxPQUFPLENBQUNpRixlQUEzQixDQUFKLENBSG1CLEVBSTFCN0csT0FBTyxDQUFDLENBQUQsRUFBSXlCLFdBQVcsQ0FBQ2tGLE1BQVosQ0FBbUIvRSxPQUFPLENBQUNrRixPQUEzQixDQUFKLENBSm1CLENBQUQsRUFLMUJqRixnQkFMMEIsQ0FBN0I7QUFNQVIsT0FBTyxDQUFDUSxnQkFBUixHQUEyQkEsZ0JBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuJ3VzZSBzdHJpY3QnO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn07XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZm0gPSByZXF1aXJlKFwiZmlsZS1tYXRjaGVyXCIpO1xyXG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmcy1leHRyYVwiKTtcclxuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2FwcGxpY2F0aW9uL3R5cGVzXCIpO1xyXG5jb25zdCB0eXBlc18yID0gcmVxdWlyZShcIi4uL2NvbW1vbi90eXBlc1wiKTtcclxuLy8gVGhpcyBjbGFzcyBnZW5lcmF0ZXMgY3NzIHVzaW5nIHRoZSBjdXJyZW50IHRoZW1lIGluIG9yZGVyIHRvIGNvbG9yaXplIGNvZGUuXHJcbi8vXHJcbi8vIE5PVEU6IFRoaXMgaXMgYWxsIGEgYmlnIGhhY2suIEl0J3MgcmVseWluZyBvbiB0aGUgdGhlbWUganNvbiBmaWxlcyB0byBoYXZlIGEgY2VydGFpbiBmb3JtYXRcclxuLy8gaW4gb3JkZXIgZm9yIHRoaXMgdG8gd29yay5cclxuLy8gU2VlIHRoaXMgdnNjb2RlIGlzc3VlIGZvciB0aGUgcmVhbCB3YXkgd2UgdGhpbmsgdGhpcyBzaG91bGQgaGFwcGVuOlxyXG4vLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L3ZzY29kZS9pc3N1ZXMvMzI4MTNcclxubGV0IENvZGVDc3NHZW5lcmF0b3IgPSBjbGFzcyBDb2RlQ3NzR2VuZXJhdG9yIHtcclxuICAgIGNvbnN0cnVjdG9yKHdvcmtzcGFjZVNlcnZpY2UsIGN1cnJlbnRQcm9jZXNzLCBsb2dnZXIpIHtcclxuICAgICAgICB0aGlzLndvcmtzcGFjZVNlcnZpY2UgPSB3b3Jrc3BhY2VTZXJ2aWNlO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2Nlc3MgPSBjdXJyZW50UHJvY2VzcztcclxuICAgICAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlcjtcclxuICAgICAgICB0aGlzLmdlbmVyYXRlVGhlbWVDc3MgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBjb21wdXRlIG91ciBjdXJyZW50IHRoZW1lLlxyXG4gICAgICAgICAgICAgICAgY29uc3Qgd29ya2JlbmNoID0gdGhpcy53b3Jrc3BhY2VTZXJ2aWNlLmdldENvbmZpZ3VyYXRpb24oJ3dvcmtiZW5jaCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGhlbWUgPSB3b3JrYmVuY2guZ2V0KCdjb2xvclRoZW1lJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlZGl0b3IgPSB0aGlzLndvcmtzcGFjZVNlcnZpY2UuZ2V0Q29uZmlndXJhdGlvbignZWRpdG9yJywgdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbnQgPSBlZGl0b3IuZ2V0KCdmb250RmFtaWx5Jyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmb250U2l6ZSA9IGVkaXRvci5nZXQoJ2ZvbnRTaXplJyk7XHJcbiAgICAgICAgICAgICAgICAvLyBUaGVuIHdlIGhhdmUgdG8gZmluZCB3aGVyZSB0aGUgdGhlbWUgcmVzb3VyY2VzIGFyZSBsb2FkZWQgZnJvbVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoZW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW5Db2xvcnMgPSB5aWVsZCB0aGlzLmZpbmRUb2tlbkNvbG9ycyh0aGVtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHRva2VucyBvYmplY3QgdGhlbiBjb250YWlucyB0aGUgbmVjZXNzYXJ5IGRhdGEgdG8gZ2VuZXJhdGUgb3VyIGNzc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbkNvbG9ycyAmJiBmb250ICYmIGZvbnRTaXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdlbmVyYXRlQ3NzKHRva2VuQ29sb3JzLCBmb250LCBmb250U2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIC8vIE9uIGVycm9yIGRvbid0IGZhaWwsIGp1c3QgbG9nXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dFcnJvcihlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmdldFNjb3BlQ29sb3IgPSAodG9rZW5Db2xvcnMsIHNjb3BlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFNlYXJjaCB0aHJvdWdoIHRoZSBzY29wZXMgb24gdGhlIGpzb24gb2JqZWN0XHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdG9rZW5Db2xvcnMuZmluZEluZGV4KGVudHJ5ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjb3BlcyA9IGVudHJ5WydzY29wZSddO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZXMgJiYgQXJyYXkuaXNBcnJheShzY29wZXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY29wZXMuZmluZCh2ID0+IHYgIT09IG51bGwgJiYgdi50b1N0cmluZygpID09PSBzY29wZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHNjb3BlcyAmJiBzY29wZXMudG9TdHJpbmcoKSA9PT0gc2NvcGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29uc3QgZm91bmQgPSBtYXRjaCA+PSAwID8gdG9rZW5Db2xvcnNbbWF0Y2hdIDogbnVsbDtcclxuICAgICAgICAgICAgaWYgKGZvdW5kICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGZvdW5kWydzZXR0aW5ncyddO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzICYmIHNldHRpbmdzICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzWydmb3JlZ3JvdW5kJ107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBlZGl0b3IgZm9yZWdyb3VuZFxyXG4gICAgICAgICAgICByZXR1cm4gJ3ZhcigtLXZzY29kZS1lZGl0b3ItZm9yZWdyb3VuZCknO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1mdW5jLWJvZHktbGVuZ3RoXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZUNzcyA9ICh0b2tlbkNvbG9ycywgZm9udEZhbWlseSwgZm9udFNpemUpID0+IHtcclxuICAgICAgICAgICAgLy8gVGhlcmUncyBhIHNldCBvZiB2YWx1ZXMgdGhhdCBuZWVkIHRvIGJlIGZvdW5kXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSB0aGlzLmdldFNjb3BlQ29sb3IodG9rZW5Db2xvcnMsICdjb21tZW50Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IG51bWVyaWMgPSB0aGlzLmdldFNjb3BlQ29sb3IodG9rZW5Db2xvcnMsICdjb25zdGFudC5udW1lcmljJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0cmluZ0NvbG9yID0gdGhpcy5nZXRTY29wZUNvbG9yKHRva2VuQ29sb3JzLCAnc3RyaW5nJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleXdvcmQgPSB0aGlzLmdldFNjb3BlQ29sb3IodG9rZW5Db2xvcnMsICdrZXl3b3JkJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gdGhpcy5nZXRTY29wZUNvbG9yKHRva2VuQ29sb3JzLCAna2V5d29yZC5vcGVyYXRvcicpO1xyXG4gICAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHRoaXMuZ2V0U2NvcGVDb2xvcih0b2tlbkNvbG9ycywgJ3ZhcmlhYmxlJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlZiA9ICd2YXIoLS12c2NvZGUtZWRpdG9yLWZvcmVncm91bmQpJztcclxuICAgICAgICAgICAgLy8gVXNlIHRoZXNlIHZhbHVlcyB0byBmaWxsIGluIG91ciBmb3JtYXQgc3RyaW5nXHJcbiAgICAgICAgICAgIHJldHVybiBgXHJcbiAgICAgICAgOnJvb3Qge1xyXG4gICAgICAgICAgICAtLWNvbW1lbnQtY29sb3I6ICR7Y29tbWVudH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0sXHJcbiAgICAgICAgcHJlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSB7XHJcbiAgICAgICAgICAgIGNvbG9yOiAke2RlZn07XHJcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7XHJcbiAgICAgICAgICAgIHRleHQtc2hhZG93OiBub25lO1xyXG4gICAgICAgICAgICBmb250LWZhbWlseTogJHtmb250RmFtaWx5fTtcclxuICAgICAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICAgICAgd2hpdGUtc3BhY2U6IHByZTtcclxuICAgICAgICAgICAgd29yZC1zcGFjaW5nOiBub3JtYWw7XHJcbiAgICAgICAgICAgIHdvcmQtYnJlYWs6IG5vcm1hbDtcclxuICAgICAgICAgICAgd29yZC13cmFwOiBub3JtYWw7XHJcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogJHtmb250U2l6ZX1weDtcclxuXHJcbiAgICAgICAgICAgIC1tb3otdGFiLXNpemU6IDQ7XHJcbiAgICAgICAgICAgIC1vLXRhYi1zaXplOiA0O1xyXG4gICAgICAgICAgICB0YWItc2l6ZTogNDtcclxuXHJcbiAgICAgICAgICAgIC13ZWJraXQtaHlwaGVuczogbm9uZTtcclxuICAgICAgICAgICAgLW1vei1oeXBoZW5zOiBub25lO1xyXG4gICAgICAgICAgICAtbXMtaHlwaGVuczogbm9uZTtcclxuICAgICAgICAgICAgaHlwaGVuczogbm9uZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl06Oi1tb3otc2VsZWN0aW9uLCBwcmVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdIDo6LW1vei1zZWxlY3Rpb24sXHJcbiAgICAgICAgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl06Oi1tb3otc2VsZWN0aW9uLCBjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSA6Oi1tb3otc2VsZWN0aW9uIHtcclxuICAgICAgICAgICAgdGV4dC1zaGFkb3c6IG5vbmU7XHJcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLXZzY29kZS1lZGl0b3Itc2VsZWN0aW9uQmFja2dyb3VuZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcmVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdOjpzZWxlY3Rpb24sIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gOjpzZWxlY3Rpb24sXHJcbiAgICAgICAgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl06OnNlbGVjdGlvbiwgY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gOjpzZWxlY3Rpb24ge1xyXG4gICAgICAgICAgICB0ZXh0LXNoYWRvdzogbm9uZTtcclxuICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tdnNjb2RlLWVkaXRvci1zZWxlY3Rpb25CYWNrZ3JvdW5kKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEBtZWRpYSBwcmludCB7XHJcbiAgICAgICAgICAgIGNvZGVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdLFxyXG4gICAgICAgICAgICBwcmVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdIHtcclxuICAgICAgICAgICAgICAgIHRleHQtc2hhZG93OiBub25lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBDb2RlIGJsb2NrcyAqL1xyXG4gICAgICAgIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0ge1xyXG4gICAgICAgICAgICBwYWRkaW5nOiAxZW07XHJcbiAgICAgICAgICAgIG1hcmdpbjogLjVlbSAwO1xyXG4gICAgICAgICAgICBvdmVyZmxvdzogYXV0bztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIDpub3QocHJlKSA+IGNvZGVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdLFxyXG4gICAgICAgIHByZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0ge1xyXG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIElubGluZSBjb2RlICovXHJcbiAgICAgICAgOm5vdChwcmUpID4gY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0ge1xyXG4gICAgICAgICAgICBwYWRkaW5nOiAuMWVtO1xyXG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiAuM2VtO1xyXG4gICAgICAgICAgICB3aGl0ZS1zcGFjZTogbm9ybWFsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLnRva2VuLmNvbW1lbnQsXHJcbiAgICAgICAgLnRva2VuLnByb2xvZyxcclxuICAgICAgICAudG9rZW4uZG9jdHlwZSxcclxuICAgICAgICAudG9rZW4uY2RhdGEge1xyXG4gICAgICAgICAgICBjb2xvcjogJHtjb21tZW50fTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC50b2tlbi5wdW5jdHVhdGlvbiB7XHJcbiAgICAgICAgICAgIGNvbG9yOiAke2RlZn07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAubmFtZXNwYWNlIHtcclxuICAgICAgICAgICAgb3BhY2l0eTogLjc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAudG9rZW4ucHJvcGVydHksXHJcbiAgICAgICAgLnRva2VuLnRhZyxcclxuICAgICAgICAudG9rZW4uYm9vbGVhbixcclxuICAgICAgICAudG9rZW4ubnVtYmVyLFxyXG4gICAgICAgIC50b2tlbi5jb25zdGFudCxcclxuICAgICAgICAudG9rZW4uc3ltYm9sLFxyXG4gICAgICAgIC50b2tlbi5kZWxldGVkIHtcclxuICAgICAgICAgICAgY29sb3I6ICR7bnVtZXJpY307XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAudG9rZW4uc2VsZWN0b3IsXHJcbiAgICAgICAgLnRva2VuLmF0dHItbmFtZSxcclxuICAgICAgICAudG9rZW4uc3RyaW5nLFxyXG4gICAgICAgIC50b2tlbi5jaGFyLFxyXG4gICAgICAgIC50b2tlbi5idWlsdGluLFxyXG4gICAgICAgIC50b2tlbi5pbnNlcnRlZCB7XHJcbiAgICAgICAgICAgIGNvbG9yOiAke3N0cmluZ0NvbG9yfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC50b2tlbi5vcGVyYXRvcixcclxuICAgICAgICAudG9rZW4uZW50aXR5LFxyXG4gICAgICAgIC50b2tlbi51cmwsXHJcbiAgICAgICAgLmxhbmd1YWdlLWNzcyAudG9rZW4uc3RyaW5nLFxyXG4gICAgICAgIC5zdHlsZSAudG9rZW4uc3RyaW5nIHtcclxuICAgICAgICAgICAgY29sb3I6ICR7b3BlcmF0b3J9O1xyXG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC50b2tlbi5hdHJ1bGUsXHJcbiAgICAgICAgLnRva2VuLmF0dHItdmFsdWUsXHJcbiAgICAgICAgLnRva2VuLmtleXdvcmQge1xyXG4gICAgICAgICAgICBjb2xvcjogJHtrZXl3b3JkfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC50b2tlbi5mdW5jdGlvbixcclxuICAgICAgICAudG9rZW4uY2xhc3MtbmFtZSB7XHJcbiAgICAgICAgICAgIGNvbG9yOiAke2tleXdvcmR9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLnRva2VuLnJlZ2V4LFxyXG4gICAgICAgIC50b2tlbi5pbXBvcnRhbnQsXHJcbiAgICAgICAgLnRva2VuLnZhcmlhYmxlIHtcclxuICAgICAgICAgICAgY29sb3I6ICR7dmFyaWFibGV9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLnRva2VuLmltcG9ydGFudCxcclxuICAgICAgICAudG9rZW4uYm9sZCB7XHJcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgICAgIH1cclxuICAgICAgICAudG9rZW4uaXRhbGljIHtcclxuICAgICAgICAgICAgZm9udC1zdHlsZTogaXRhbGljO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLnRva2VuLmVudGl0eSB7XHJcbiAgICAgICAgICAgIGN1cnNvcjogaGVscDtcclxuICAgICAgICB9XHJcbmA7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLm1lcmdlQ29sb3JzID0gKGNvbG9yczEsIGNvbG9yczIpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIFsuLi5jb2xvcnMxLCAuLi5jb2xvcnMyXTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMucmVhZFRva2VuQ29sb3JzID0gKHRoZW1lRmlsZSkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBjb25zdCB0b2tlbkNvbnRlbnQgPSB5aWVsZCBmcy5yZWFkRmlsZSh0aGVtZUZpbGUsICd1dGY4Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRoZW1lID0gSlNPTi5wYXJzZSh0b2tlbkNvbnRlbnQpO1xyXG4gICAgICAgICAgICBjb25zdCB0b2tlbkNvbG9ycyA9IHRoZW1lWyd0b2tlbkNvbG9ycyddO1xyXG4gICAgICAgICAgICBpZiAodG9rZW5Db2xvcnMgJiYgdG9rZW5Db2xvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gVGhpcyB0aGVtZSBtYXkgaW5jbHVkZSBvdGhlcnMuIElmIHNvIHdlIG5lZWQgdG8gY29tYmluZSB0aGUgdHdvIHRvZ2V0aGVyXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmNsdWRlID0gdGhlbWUgPyB0aGVtZVsnaW5jbHVkZSddIDogdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGUgJiYgaW5jbHVkZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluY2x1ZGVQYXRoID0gcGF0aC5qb2luKHBhdGguZGlybmFtZSh0aGVtZUZpbGUpLCBpbmNsdWRlLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluY2x1ZGVkQ29sb3JzID0geWllbGQgdGhpcy5yZWFkVG9rZW5Db2xvcnMoaW5jbHVkZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1lcmdlQ29sb3JzKHRva2VuQ29sb3JzLCBpbmNsdWRlZENvbG9ycyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBUaGVtZSBpcyBhIHJvb3QsIGRvbid0IG5lZWQgdG8gaW5jbHVkZSBvdGhlcnNcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbkNvbG9ycztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5maW5kVG9rZW5Db2xvcnMgPSAodGhlbWUpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4ZSA9IHRoaXMuY3VycmVudFByb2Nlc3MuZXhlY1BhdGg7XHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50UGF0aCA9IHBhdGguZGlybmFtZShjdXJyZW50RXhlKTtcclxuICAgICAgICAgICAgLy8gU2hvdWxkIGJlIHNvbWV3aGVyZSB1bmRlciBjdXJyZW50UGF0aC9yZXNvdXJjZXMvYXBwL2V4dGVuc2lvbnMgaW5zaWRlIG9mIGEganNvbiBmaWxlXHJcbiAgICAgICAgICAgIGxldCBleHRlbnNpb25zUGF0aCA9IHBhdGguam9pbihjdXJyZW50UGF0aCwgJ3Jlc291cmNlcycsICdhcHAnLCAnZXh0ZW5zaW9ucycpO1xyXG4gICAgICAgICAgICBpZiAoISh5aWVsZCBmcy5wYXRoRXhpc3RzKGV4dGVuc2lvbnNQYXRoKSkpIHtcclxuICAgICAgICAgICAgICAgIC8vIE1pZ2h0IGJlIG9uIG1hYyBvciBsaW51eC4gdHJ5IGEgZGlmZmVyZW50IHBhdGhcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRQYXRoID0gcGF0aC5yZXNvbHZlKGN1cnJlbnRQYXRoLCAnLi4vLi4vLi4vLi4nKTtcclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNQYXRoID0gcGF0aC5qb2luKGN1cnJlbnRQYXRoLCAncmVzb3VyY2VzJywgJ2FwcCcsICdleHRlbnNpb25zJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gU2VhcmNoIHRocm91Z2ggYWxsIG9mIHRoZSBqc29uIGZpbGVzIGZvciB0aGUgdGhlbWUgbmFtZVxyXG4gICAgICAgICAgICBjb25zdCBlc2NhcGVkVGhlbWVOYW1lID0gdGhlbWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaE9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICBwYXRoOiBleHRlbnNpb25zUGF0aCxcclxuICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZVNlYXJjaDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGZpbGVGaWx0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZVBhdHRlcm46ICcqKi8qLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG5ldyBSZWdFeHAoYGlkWycsXCJdOlxcXFxzKlsnLFwiXSR7ZXNjYXBlZFRoZW1lTmFtZX1bJyxcIl1gKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbmV3IGZtLkZpbGVNYXRjaGVyKCk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0geWllbGQgbWF0Y2hlci5maW5kKHNlYXJjaE9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBmaXJzdCByZXN1bHQgaWYgd2UgaGF2ZSBvbmVcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIGJlIHRoZSBwYXRoIHRvIHRoZSBmaWxlLiBMb2FkIGl0IGFzIGEganNvbiBvYmplY3RcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50cyA9IHlpZWxkIGZzLnJlYWRGaWxlKHJlc3VsdHNbMF0sICd1dGY4Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoY29udGVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZXJlIHNob3VsZCBiZSBhIGNvbnRyaWJ1dGVzIHNlY3Rpb25cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250cmlidXRlcyA9IGpzb25bJ2NvbnRyaWJ1dGVzJ107XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBzaG91bGQgaGF2ZSBhIHRoZW1lcyBzZWN0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGhlbWVzID0gY29udHJpYnV0ZXNbJ3RoZW1lcyddO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIE9uZSBvZiB0aGVzZSAoaXQncyBhbiBhcnJheSksIHNob3VsZCBoYXZlIG91ciBtYXRjaGluZyB0aGVtZSBlbnRyeVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhlbWVzLmZpbmRJbmRleChlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUgIT09IG51bGwgJiYgZVsnaWQnXSA9PT0gdGhlbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSBpbmRleCA+PSAwID8gdGhlbWVzW2luZGV4XSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gdGhlIHBhdGggZW50cnkgc2hvdWxkIGNvbnRhaW4gYSByZWxhdGl2ZSBwYXRoIHRvIHRoZSBqc29uIGZpbGUgd2l0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdG9rZW5zIGluIGl0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRoZW1lRmlsZSA9IHBhdGguam9pbihwYXRoLmRpcm5hbWUocmVzdWx0c1swXSksIGZvdW5kWydwYXRoJ10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geWllbGQgdGhpcy5yZWFkVG9rZW5Db2xvcnModGhlbWVGaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgLy8gU3dhbGxvdyBhbnkgZXhjZXB0aW9ucyB3aXRoIHNlYXJjaGluZyBvciBwYXJzaW5nXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dFcnJvcihlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIFdlIHNob3VsZCByZXR1cm4gYSBkZWZhdWx0LiBUaGUgdnNjb2RlLWxpZ2h0IHRoZW1lXHJcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRUaGVtZUZpbGUgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnZGVmYXVsdFRoZW1lLmpzb24nKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVhZFRva2VuQ29sb3JzKGRlZmF1bHRUaGVtZUZpbGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5Db2RlQ3NzR2VuZXJhdG9yID0gX19kZWNvcmF0ZShbXHJcbiAgICBpbnZlcnNpZnlfMS5pbmplY3RhYmxlKCksXHJcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18xLklXb3Jrc3BhY2VTZXJ2aWNlKSksXHJcbiAgICBfX3BhcmFtKDEsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc18yLklDdXJyZW50UHJvY2VzcykpLFxyXG4gICAgX19wYXJhbSgyLCBpbnZlcnNpZnlfMS5pbmplY3QodHlwZXNfMi5JTG9nZ2VyKSlcclxuXSwgQ29kZUNzc0dlbmVyYXRvcik7XHJcbmV4cG9ydHMuQ29kZUNzc0dlbmVyYXRvciA9IENvZGVDc3NHZW5lcmF0b3I7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvZGVDc3NHZW5lcmF0b3IuanMubWFwIl19