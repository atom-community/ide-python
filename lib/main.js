const { shell } = require("electron")
const whichSync = require("which").sync
const { AutoLanguageClient } = require("atom-languageclient")
const { detectVirtualEnv, detectPipEnv, replacePipEnvPathVar, sanitizeConfig } = require("./utils")

import { createDebuggerProvider, activate as debuggerActivate, dispose as debuggerDispose } from "./debugger/main"

// Ref: https://github.com/nteract/hydrogen/blob/master/lib/autocomplete-provider.js#L33
// adapted from http://stackoverflow.com/q/5474008
const PYTHON_REGEX = /(([^\d\W]|[\u00A0-\uFFFF])[\w.\u00A0-\uFFFF]*)|\.$/

class PythonLanguageClient extends AutoLanguageClient {
  activate() {
    super.activate()
    if (!atom.packages.isPackageLoaded("atom-ide-base")) {
      // install if not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("atom-package-deps")
        .install("ide-python", true)
        .then(() => {
          // enable if disabled
          atom.packages.enablePackage("atom-ide-base")
          atom.notifications.addSuccess("ide-pyhon: atom-ide-base was installed and enabled...")
        })
    }
  }

  getGrammarScopes() {
    return ["source.python", "python"]
  }

  getLanguageName() {
    return "Python"
  }

  getServerName() {
    return "pyls"
  }

  getRootConfigurationKey() {
    return "ide-python"
  }

  activate() {
    // Remove deprecated option
    atom.config.unset("ide-python.pylsPath")
    super.activate()
    debuggerActivate()
  }

  mapConfigurationObject(configuration) {
    return {
      pyls: {
        configurationSources: configuration.pylsConfigurationSources,
        rope: sanitizeConfig(configuration.rope),
        plugins: configuration.pylsPlugins,
      },
    }
  }

  async startServerProcess(projectPath) {
    const venvPath = (await detectPipEnv(projectPath)) || (await detectVirtualEnv(projectPath))
    const pylsEnvironment = Object.assign({}, process.env)
    if (venvPath) {
      pylsEnvironment["VIRTUAL_ENV"] = venvPath
    }
    this.python = replacePipEnvPathVar(atom.config.get("ide-python.python"), venvPath)

    let pyls = atom.config.get("ide-python.pyls") || "pylsp"
    // check if it exists
    if (whichSync(pyls, { nothrow: true }) === null) {
      pyls = "pyls"
    }
    const childProcess = super.spawn(this.python, ["-m", pyls], {
      cwd: projectPath,
      env: pylsEnvironment,
    })
    return childProcess
  }

  onSpawnError(err) {
    const description =
      err.code == "ENOENT"
        ? `No Python interpreter found at \`${this.python}\`.`
        : `Could not spawn the Python interpreter \`${this.python}\`.`
    atom.notifications.addError("`ide-python` could not launch your Python runtime.", {
      dismissable: true,
      description: `${description}<p>If you have Python installed please set "Python Executable" setting correctly. If you do not please install Python.</p>`,
    })
  }

  onSpawnClose(code, signal) {
    if (code !== 0 && signal == null) {
      atom.notifications.addError("Unable to start the Python language server.", {
        dismissable: true,
        buttons: [
          {
            text: "Install Instructions",
            onDidClick: () => atom.workspace.open("atom://config/packages/ide-python"),
          },
          {
            text: "Download Python",
            onDidClick: () => shell.openExternal("https://www.python.org/downloads/"),
          },
        ],
        description:
          "Make sure to install `pylsp` 0.19 or newer by running:\n" +
          "```\n" +
          `${this.python} -m pip install 'python-lsp-server[all]'\n` +
          `${this.python} -m pip install git+https://github.com/tomv564/pyls-mypy.git\n` +
          "```",
      })
    }
  }

  async getSuggestions(request) {
    if (!PYTHON_REGEX.test(request.prefix)) return null
    return super.getSuggestions(request)
  }

  deactivate() {
    debuggerDispose()
    return Promise.race([super.deactivate(), this.createTimeoutPromise(2000)])
  }

  createTimeoutPromise(milliseconds) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        clearTimeout(timeout)
        this.logger.error(`Server failed to shutdown in ${milliseconds}ms, forcing termination`)
        resolve()
      }, milliseconds)
    })
  }
}

const pythonClient = new PythonLanguageClient()
pythonClient.createDebuggerProvider = createDebuggerProvider // add the debugger
module.exports = pythonClient
