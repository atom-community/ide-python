const cp = require("child_process");
const { shell } = require("electron");
const { AutoLanguageClient } = require("atom-languageclient");
const {
  detectVirtualEnv,
  detectPipEnv,
  replacePipEnvPathVar,
  sanitizeConfig
} = require("./utils");

// Ref: https://github.com/nteract/hydrogen/blob/master/lib/autocomplete-provider.js#L33
// adapted from http://stackoverflow.com/q/5474008
const PYTHON_REGEX = /(([^\d\W]|[\u00A0-\uFFFF])[\w.\u00A0-\uFFFF]*)|\.$/;

class PythonLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.python", "python"];
  }

  getLanguageName() {
    return "Python";
  }

  getServerName() {
    return "pyls";
  }

  getRootConfigurationKey() {
    return "ide-python";
  }

  activate() {
    // Remove deprecated option
    atom.config.unset("ide-python.pylsPath");
    super.activate();
  }

  mapConfigurationObject(configuration) {
    return {
      pyls: {
        configurationSources: configuration.pylsConfigurationSources,
        rope: sanitizeConfig(configuration.rope),
        plugins: configuration.pylsPlugins
      }
    };
  }

  async startServerProcess(projectPath) {
    const venvPath =
      (await detectPipEnv(projectPath)) ||
      (await detectVirtualEnv(projectPath));
    const pylsEnvironment = Object.assign({}, process.env);
    if (venvPath) {
      pylsEnvironment["VIRTUAL_ENV"] = venvPath;
    }
    const python = replacePipEnvPathVar(
      atom.config.get("ide-python.python"),
      venvPath
    );
    const childProcess = cp.spawn(python, ["-m", "pyls"], {
      cwd: projectPath,
      env: pylsEnvironment
    });
    childProcess.on("error", err => {
      const description =
        err.code == "ENOENT"
          ? `No Python interpreter found at \`${python}\`.`
          : `Could not spawn the Python interpreter \`${python}\`.`;
      atom.notifications.addError(
        "`ide-python` could not launch your Python runtime.",
        {
          dismissable: true,
          description: `${description}<p>If you have Python installed please set "Python Executable" setting correctly. If you do not please install Python.</p>`
        }
      );
    });

    childProcess.on("close", (code, signal) => {
      if (code !== 0 && signal == null) {
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
              "Make sure to install `pyls` 0.19 or newer by running:\n" +
              "```\n" +
              `${python} -m pip install 'python-language-server[all]'\n` +
              "```"
          }
        );
      }
    });
    return childProcess;
  }

  async getSuggestions(request) {
    if (!PYTHON_REGEX.test(request.prefix)) return null;
    return super.getSuggestions(request);
  }

  deactivate() {
    return Promise.race([super.deactivate(), this.createTimeoutPromise(2000)]);
  }

  createTimeoutPromise(milliseconds) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        clearTimeout(timeout);
        this.logger.error(
          `Server failed to shutdown in ${milliseconds}ms, forcing termination`
        );
        resolve();
      }, milliseconds);
    });
  }
}

module.exports = new PythonLanguageClient();
