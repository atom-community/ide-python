const cp = require("child_process");
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
        { dismissable: true }
      )
    );
    return childProcess;
  }
}

module.exports = new PythonLanguageClient();
