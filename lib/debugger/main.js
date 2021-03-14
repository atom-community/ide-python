import type { AutoGenConfig, NuclideDebuggerProvider } from "@atom-ide-community/nuclide-debugger-common/types"

import UniversalDisposable from "@atom-ide-community/nuclide-commons/UniversalDisposable"
import * as React from "react"
import { AutoGenLaunchAttachProvider } from "@atom-ide-community/nuclide-debugger-common/AutoGenLaunchAttachProvider"
import { listenToRemoteDebugCommands, setRpcService } from "./utils"
import path from "path"

export const NUCLIDE_PYTHON_DEBUGGER_DEX_URI =
  "https://our.intern.facebook.com/intern/dex/python-and-fbcode/debugging/#nuclide"

let _subscriptions: UniversalDisposable
export function activate() {
  _subscriptions = new UniversalDisposable(listenToRemoteDebugCommands())
}

export function dispose() {
  _subscriptions.dispose()
}

export function createDebuggerProvider(): NuclideDebuggerProvider {
  return {
    type: "python",
    getLaunchAttachProvider: (connection) => {
      return new AutoGenLaunchAttachProvider("Python", connection, getPythonAutoGenConfig())
    },
  }
}

// TODO this service does not exist
// export function consumeRpcService(rpcService: nuclide$RpcService): IDisposable {
//   return setRpcService(rpcService);
// }

export function getPythonAutoGenConfig(): AutoGenConfig {
  const program = {
    name: "program",
    type: "path",
    description: "Absolute path to the program.",
    required: true,
    visible: true,
  }
  const pythonPath = {
    name: "pythonPath",
    type: "path",
    description: "Path to python executable.",
    required: true,
    visible: true,
  }
  const cwd = {
    name: "cwd",
    type: "path",
    description:
      "(Optional) Absolute path to the working directory of the program being debugged. Default is the root directory of the file.",
    required: true,
    visible: true,
  }
  const args = {
    name: "args",
    type: "array",
    itemType: "string",
    description: "Command line arguments passed to the program",
    defaultValue: [],
    required: false,
    visible: true,
  }
  const stopOnEntry = {
    name: "stopOnEntry",
    type: "boolean",
    description: "Automatically stop after launch.",
    defaultValue: false,
    required: false,
    visible: true,
  }
  const debugOptions = {
    name: "debugOptions",
    type: "array",
    itemType: "string",
    description: "Advanced options, view read me for further details.",
    defaultValue: ["WaitOnAbnormalExit", "WaitOnNormalExit", "RedirectOutput"],
    required: false,
    visible: false,
  }
  const env = {
    name: "env",
    type: "object",
    description: "(Optional) Environment variables (e.g. SHELL=/bin/bash PATH=/bin)",
    defaultValue: {},
    required: false,
    visible: true,
  }
  const consoleEnum = {
    name: "console",
    type: "enum",
    enums: ["internalConsole", "integratedTerminal"],
    description: "",
    defaultValue: "internalConsole",
    required: true,
    visible: true,
  }

  const adapterExecutable = {
    command: "node",
    args: [path.resolve(path.join(__dirname, "VendorLib/vs-py-debugger/out/client/debugger/debugAdapter/main.js"))],
  }
  const adapterRoot = path.resolve(path.join(__dirname, "VendorLib/vs-py-debugger"))

  return {
    launch: {
      launch: true,
      vsAdapterType: "python",
      adapterExecutable,
      adapterRoot,
      properties: [program, pythonPath, cwd, args, stopOnEntry, debugOptions, env, consoleEnum],
      scriptPropertyName: "program",
      scriptExtension: ".py",
      cwdPropertyName: "cwd",
      header: isNuclideEnvironment() ? (
        <p>
          This is intended to debug python script files.
          <br />
          To debug buck targets, you should <a href={NUCLIDE_PYTHON_DEBUGGER_DEX_URI}>use the buck toolbar instead</a>.
        </p>
      ) : null,
      getProcessName(values) {
        let processName = values.program
        const lastSlash = processName.lastIndexOf("/")
        if (lastSlash >= 0) {
          processName = processName.substring(lastSlash + 1, processName.length)
        }
        processName += " (Python)"
        return processName
      },
    },
    attach: null,
  }
}

function isNuclideEnvironment(): boolean {
  return atom.packages.isPackageLoaded("nuclide")
}
