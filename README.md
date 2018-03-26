# IDE-python package

[![Greenkeeper badge](https://badges.greenkeeper.io/lgeiger/ide-python.svg)](https://greenkeeper.io/)

Python language support for [Atom-IDE](https://ide.atom.io/), powered by the [Python language server](https://github.com/palantir/python-language-server).

![ide-python](https://user-images.githubusercontent.com/13285808/30352538-b9687a76-9820-11e7-8876-c22751645d36.png)

## Requirements

[`ide-python`](https://atom.io/packages/ide-python) requires [Atom `1.21+`](https://atom.io/), [Python language server 0.17+`](https://github.com/palantir/python-language-server) and the [`atom-ide-ui`](https://atom.io/packages/atom-ide-ui) package to expose the functionality within Atom.

## Feature Providers

* [Jedi](https://github.com/davidhalter/jedi) for Completions, Definitions, Hover, References, Signature Help, and Symbols
* [Rope](https://github.com/python-rope/rope) for Completions and renaming
* [Pyflakes](https://github.com/PyCQA/pyflakes) linter to detect various errors
* [McCabe](https://github.com/PyCQA/mccabe) linter for complexity checking
* [pycodestyle](https://github.com/PyCQA/pycodestyle) linter for style checking
* [pydocstyle](https://github.com/PyCQA/pydocstyle) linter for docstring style checking
* [autopep8](https://github.com/hhatto/autopep8) for code formatting (preferred over YAPF)
* [YAPF](https://github.com/google/yapf) for code formatting

## Installation

### Language Server

Install the language server (we recommend version 0.17.0 or newer) with:

```bash
pip install 'python-language-server[all]'
```

This command will install the language server and all supported feature providers, which can be enabled or disabled in the settings. Checkout the [official installation instructions](https://github.com/palantir/python-language-server#installation) on how to install only the providers you need.

Verify that everything is correctly installed and `pyls` is on your `PATH` by running `pyls --help` from the command line.
It should return

```bash
usage: pyls [-h] [--tcp] [--host HOST] [--port PORT]
            [--log-config LOG_CONFIG | --log-file LOG_FILE] [-v]

Python Language Server
...
```

Depending on your Python setup `pyls` may be installed in a non default folder. In this case either add the directory to your `PATH` or edit the "Python Language Server Path" setting of `ide-python` to point to the `pyls` executable.

### Atom Package

Install `ide-python` and [`atom-ide-ui`](https://atom.io/packages/atom-ide-ui) from _Install_ in Atom's settings or run:

```bash
apm install atom-ide-ui
apm install ide-python
```

## Configuration

Configuration is loaded from zero or more configuration sources.

* `pycodestyle`: discovered in `~/.config/pycodestyle`, `setup.cfg`, `tox.ini` and `pycodestyle.cfg`
* `flake8`: discovered in `~/.config/flake8`, `setup.cfg`, `tox.ini` and `flake8.cfg`

Overall configuration is computed first from user configuration (in home directory), overridden by configuration in the `ide-python` settings, and then overridden by configuration discovered in the current project.

## Contributing

Always feel free to help out! Whether it's [filing bugs and feature requests](https://github.com/lgeiger/ide-python/issues/new) or working on some of the [open issues](https://github.com/lgeiger/ide-python/issues), Atom's [guide for contributing to packages](https://github.com/atom/atom/blob/master/docs/contributing-to-packages.md) will help get you started.

## License

MIT License. See [the license](LICENSE.md) for more details.
