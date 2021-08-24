const { shell } = require("electron")
const whichSync = require("which").sync
const { AutoLanguageClient } = require("atom-languageclient")
const { detectVirtualEnv, detectPipEnv, replacePipEnvPathVar, sanitizeConfig } = require("./utils")

import { createDebuggerProvider, activate as debuggerActivate, dispose as debuggerDispose } from "./debugger/main"

// Ref: https://github.com/nteract/hydrogen/blob/master/lib/autocomplete-provider.js#L33
// adapted from http://stackoverflow.com/q/5474008
const PYTHON_REGEX = /(([^\W\d]|[\u00A0-\uFFFF])[\w.\u00A0-\uFFFF]*)|\.$/

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
          atom.notifications.addSuccess("ide-python: atom-ide-base was installed and enabled...")
        })
    }
    // Remove deprecated option
    atom.config.unset("ide-python.pylsPath")
    debuggerActivate()
  }

  /* eslint-disable class-methods-use-this */
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

  getPyLs() {
    if (this.pyls === undefined) {
      let pyls = atom.config.get("ide-python.pyls") || "pylsp"
      // check if it exists
      if (whichSync(pyls, { nothrow: true }) === null) {
        // use the other one if it doesn't exist
        pyls = pyls === "pylsp" ? "pyls" : "pylsp"
      }
      // cache
      this.pyls = pyls
    }
    return this.pyls
  }

  mapConfigurationObject(configuration) {
    const lsp = this.getPyLs()
    return {
      [lsp]: {
        configurationSources: configuration.pylsConfigurationSources,
        rope: sanitizeConfig(configuration.rope),
        plugins: configuration.pylsPlugins,
      },
    }
  }
  /* eslint-enable class-methods-use-this */

  async startServerProcess(projectPath) {
    const venvPath = (await detectPipEnv(projectPath)) || (await detectVirtualEnv(projectPath))
    const pylsEnvironment = Object.assign({}, process.env)
    if (venvPath) {
      pylsEnvironment.VIRTUAL_ENV = venvPath
    }

    let pythonBin = atom.config.get("ide-python.python") || "python3"

    // replace $PIPENV_PATH in the path
    pythonBin = replacePipEnvPathVar(pythonBin, venvPath)

    // check if it exists
    if (whichSync(pythonBin, { nothrow: true }) === null) {
      pythonBin = "python"
    }
    this.python = pythonBin

    const childProcess = super.spawn(this.python, ["-m", this.getPyLs()], {
      cwd: projectPath,
      env: pylsEnvironment,
    })
    return childProcess
  }

  onSpawnError(err) {
    const description =
      err.code === "ENOENT"
        ? `No Python interpreter found at \`${this.python}\`.`
        : `Could not spawn the Python interpreter \`${this.python}\`.`
    atom.notifications.addError("`ide-python` could not launch your Python runtime.", {
      dismissable: true,
      description: `${description}<p>If you have Python installed please set "Python Executable" setting correctly. If you do not please install Python.</p>`,
    })
  }

  onSpawnClose(code, signal) {
    if (code !== 0 && signal === null) {
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

  getSuggestions(request) {
    if (!PYTHON_REGEX.test(request.prefix)) {
      return null
    }
    return super.getSuggestions(request)
  }

  deactivate() {
    debuggerDispose()
    return Promise.race([super.deactivate(), this.createTimeoutPromise(2000)])
  }

  createTimeoutPromise(milliseconds) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
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
