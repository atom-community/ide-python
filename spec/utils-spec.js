const path = require("path");
const { detectVirtualEnv } = require("../lib/utils");

const venvFixturesDir = path.join(__dirname, "fixtures", "venv");

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
