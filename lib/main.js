const cp = require("child_process");
const { shell } = require("electron");
const { AutoLanguageClient } = require("atom-languageclient");
const { Directory } = require("atom");

// Ref: https://github.com/nteract/hydrogen/blob/master/lib/autocomplete-provider.js#L33
// adapted from http://stackoverflow.com/q/5474008
const PYTHON_REGEX = /(([^\d\W]|[\u00A0-\uFFFF])[\w.\u00A0-\uFFFF]*)|\.$/;

class PythonLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.python"];
  }
  getLanguageName() {
    return "Python";
  }
  getServerName() {
    return "pyls";
  }

  postInitialization({ connection }) {
    this._disposable.add(
      atom.config.observe("ide-python.pylsPlugins", params => {
        connection.didChangeConfiguration({
          settings: { pyls: { plugins: params } }
        });
      })
    );
  }

  async startServerProcess(projectPath) {
    await new Promise(resolve => atom.whenShellEnvironmentLoaded(resolve));

    var entries = await new Promise(resolve =>
      new Directory(projectPath).getEntries((error, entries) => {
        if (error === null) {
          resolve(entries);
        } else {
          resolve(null);
        }
      }));

    var venvPath = null;

    if (entries) {
      for (let entry of entries) {
        if (entry.isDirectory()) {
          if (entry.getBaseName() === 'bin' &&
              await entry.getFile('python').exists()) {
            venvPath = projectPath;
            break;
          } else {
            if (await entry.getSubdirectory('bin').getFile('python').exists()) {
              venvPath = entry.getPath();
              break;
            }
          }
        }
      }
    }

    var pylsEnvironment = Object.assign({}, process.env);

    if (venvPath) {
      pylsEnvironment['VIRTUAL_ENV'] = venvPath;
    }

    const childProcess = cp.spawn(atom.config.get("ide-python.pylsPath"), {
      cwd: projectPath,
      env: pylsEnvironment
    });
    childProcess.on("error", err =>
      atom.notifications.addError(
        "Unable to start the Python language server.",
        {
          dismissable: true,
          buttons: [
            {
              text: "Install Instructions",
              onDidClick: () =>
                atom.workspace.open("atom://config/packages/ide-python")
            },
            {
              text: "Download Python",
              onDidClick: () =>
                shell.openExternal("https://www.python.org/downloads/")
            }
          ],
          description:
            "This can occur if you do not have Python installed or if it is not in your path.\n\n Make sure to install `pyls` by running:\n```\npip install python-language-server\n```"
        }
      )
    );
    return childProcess;
  }

  async getSuggestions(request) {
    if (!PYTHON_REGEX.test(request.prefix)) return null;
    return super.getSuggestions(request);
  }
}

module.exports = new PythonLanguageClient();
