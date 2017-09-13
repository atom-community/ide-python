const cp = require("child_process");
const { shell } = require("electron");
const { AutoLanguageClient } = require("atom-languageclient");

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
  startServerProcess(projectPath) {
    const childProcess = cp.spawn("pyls", {
      cwd: projectPath
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
}

module.exports = new PythonLanguageClient();
