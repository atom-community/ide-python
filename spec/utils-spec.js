const path = require("path");
const mockSpawn = require("mock-spawn");
const assert = require("assert");
const child_process = require("child_process");
const {
  detectVirtualEnv,
  sanitizeConfig,
  detectPipEnv,
  replacePipEnvPathVar
} = require("../lib/utils");

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

describe("detect PipEnv", () => {
  const spawn = mockSpawn();
  child_process.spawn = spawn;
  spawn.sequence.add(function(cb) {
    this.emit("error", new Error("spawn ENOENT"));
    setTimeout(function() {
      return cb(8);
    }, 10);
  });
  it("with no pipenv", () => {
    waitsForPromise(() => {
      return detectPipEnv("/home/mock_pipenv").then(venv => {
        expect(venv).toBeNull();
        assert.equal("pipenv", spawn.calls[0].command);
        assert.deepEqual(["--venv"], spawn.calls[0].args);
      });
    });
  });

  it("with Unix pipenv", () => {
    spawn.sequence.add(
      spawn.simple(1, "/home/tvallois/.local/share/virtualenvs/unix-XZE001N_")
    );
    waitsForPromise(() => {
      return detectPipEnv("/home/mock_pipenv").then(venv => {
        expect(venv).toBe(
          "/home/tvallois/.local/share/virtualenvs/unix-XZE001N_"
        );
        assert.equal("pipenv", spawn.calls[1].command);
        assert.deepEqual(["--venv"], spawn.calls[1].args);
      });
    });
  });

  it("with Windows pipenv", () => {
    spawn.sequence.add(
      spawn.simple(
        1,
        "C:\\Program Files\\tvallois\\virtualenvs\\windows-XZE001N_"
      )
    );
    waitsForPromise(() => {
      return detectPipEnv("C:\\Program Files\\mock_pipenv").then(venv => {
        expect(venv).toBe(
          "C:\\Program Files\\tvallois\\virtualenvs\\windows-XZE001N_"
        );
        assert.equal("pipenv", spawn.calls[2].command);
        assert.deepEqual(["--venv"], spawn.calls[2].args);
      });
    });
  });
});

describe("replacePipEnvPathVar", () => {
  it("replace $PIPENV_PATH", () => {
    expect(
      replacePipEnvPathVar(
        "$PIPENV_PATH/bin/python",
        "/home/tvallois/.local/share/virtualenvs/unix-XZE001N_"
      )
    ).toEqual(
      "/home/tvallois/.local/share/virtualenvs/unix-XZE001N_/bin/python"
    );
  });

  it("no $PIPENV_PATH", () => {
    expect(
      replacePipEnvPathVar(
        "python",
        "/home/tvallois/.local/share/virtualenvs/unix-XZE001N_"
      )
    ).toEqual("python");
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
