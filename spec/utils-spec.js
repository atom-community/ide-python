const path = require("path");
const { detectVirtualEnv, sanitizeConfig, detectPipEnv } = require("../lib/utils");

const venvFixturesDir = path.join(__dirname, "fixtures", "venv");
const pipEnvFixturesDir = path.join(__dirname, "fixtures", "pipenv");

describe("detectVirtualEnv", () => {
  it("detects no virtual env when there isn't any", () => {
    waitsForPromise(() => {
      return detectVirtualEnv(path.join(venvFixturesDir, "none")).then(venv => {
        expect(venv).toBeUndefined();
      });
    });
  });

  it("detects a Unix virtual env at the root", () => {
    const projectPath = path.join(venvFixturesDir, "unix");
    waitsForPromise(() => {
      return detectVirtualEnv(projectPath).then(venv => {
        expect(venv).toEqual(projectPath);
      });
    });
  });

  it("detects a Windows virtual env at the root", () => {
    const projectPath = path.join(venvFixturesDir, "windows");
    waitsForPromise(() => {
      return detectVirtualEnv(projectPath).then(venv => {
        expect(venv).toEqual(projectPath);
      });
    });
  });

  it("detects a Unix virtual env in a subdirectory", () => {
    const projectPath = path.join(venvFixturesDir, "unix-subdir");
    const venvPath = path.join(projectPath, "venv");
    waitsForPromise(() => {
      return detectVirtualEnv(projectPath).then(venv => {
        expect(venv).toEqual(venvPath);
      });
    });
  });

  it("detects a Windows virtual env in a subdirectory", () => {
    const projectPath = path.join(venvFixturesDir, "windows-subdir");
    const venvPath = path.join(projectPath, "venv");
    waitsForPromise(() => {
      return detectVirtualEnv(projectPath).then(venv => {
        expect(venv).toEqual(venvPath);
      });
    });
  });
});

describe("detect PipEnv", () => {
  it("with no pipenv", () => {
    waitsForPromise(() => {
      return detectPipEnv(path.join(pipEnvFixturesDir, "none")).then(venv => {
        expect(venv).toBeNull();
      });
    });
  });

  it("with Unix pipenv", () => {
    waitsForPromise(() => {
      return detectPipEnv(path.join(pipEnvFixturesDir, "unix")).then(venv => {
        expect(venv).toBe('/home/tvallois/.local/share/virtualenvs/unix-XZE001N_');
      });
    });
  });
});

describe("sanitizeConfig", () => {
  it("converts 'null' to null", () => {
    const config = {
      ropeFolder: "null",
      extensionModules: ["numpy", "pandas"]
    };
    expect(sanitizeConfig(config)).toEqual({
      ropeFolder: null,
      extensionModules: ["numpy", "pandas"]
    });
  });

  it("doesn't change object", () => {
    const config = {
      ropeFolder: ".ropeproject",
      extensionModules: ["numpy", "pandas"]
    };
    expect(sanitizeConfig(config)).toEqual(config);
  });
});
