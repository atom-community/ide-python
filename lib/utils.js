const { Directory } = require("atom");

const VIRTUAL_ENV_BIN_DIRS = ["bin", "Scripts"];
const VIRTUAL_ENV_EXECUTABLES = ["python", "python.exe"];

async function detectVirtualEnv(path) {
  const entries = await new Promise(resolve =>
    new Directory(path).getEntries((error, entries) => {
      if (error === null) {
        resolve(entries);
      } else {
        resolve(null);
      }
    })
  );

  if (entries) {
    for (let entry of entries) {
      if (entry.isDirectory()) {
        if (VIRTUAL_ENV_BIN_DIRS.indexOf(entry.getBaseName()) !== -1) {
          for (let executable of VIRTUAL_ENV_EXECUTABLES) {
            if (await entry.getFile(executable).exists()) {
              return path;
            }
          }
        } else {
          for (let dir_name of VIRTUAL_ENV_BIN_DIRS) {
            for (let executable of VIRTUAL_ENV_EXECUTABLES) {
              if (
                await entry
                  .getSubdirectory(dir_name)
                  .getFile(executable)
                  .exists()
              ) {
                return entry.getPath();
              }
            }
          }
        }
      }
    }
  }
}

exports.detectVirtualEnv = detectVirtualEnv;
