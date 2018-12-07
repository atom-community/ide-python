const { Directory } = require("atom");

const VIRTUAL_ENV_BIN_DIRS = ["bin", "Scripts"];
const VIRTUAL_ENV_EXECUTABLES = ["python", "python.exe"];

async function detectVirtualEnv(path, pipenvPath) {
  let projectName = "";
  if (path.includes('/')){
    projectName = path.split('/');
  } else {
    projectName = path.split('\\');
  }
  projectName = projectName[projectName.length - 2];
  if (pipenvPath) {
    path = pipenvPath;
  }
  let entries = await new Promise(resolve =>
    new Directory(path).getEntries((error, entries) => {
      if (error === null) {
        resolve(entries);
      } else {
        resolve(null);
      }
    })
  );
  if (pipenvPath) {
    entries = entries.filter(entry => entry.getBaseName().startsWith(projectName));
  }
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

function sanitizeConfig(config) {
  Object.entries(config).forEach(([key, value]) => {
    if (value === "null") {
      config[key] = null;
    }
  });
  return config;
}

exports.detectVirtualEnv = detectVirtualEnv;
exports.sanitizeConfig = sanitizeConfig;
