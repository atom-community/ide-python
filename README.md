# IDE-python package

[![Greenkeeper badge](https://badges.greenkeeper.io/lgeiger/ide-python.svg)](https://greenkeeper.io/)

Python language support for [Atom-IDE](https://ide.atom.io/), powered by the [Python language server](https://github.com/palantir/python-language-server).

![ide-python](https://user-images.githubusercontent.com/13285808/30352538-b9687a76-9820-11e7-8876-c22751645d36.png)

## Requirements
[`ide-python`](https://atom.io/packages/ide-python) requires [Atom `1.21+`](https://atom.io/) and the [`atom-ide-ui`](https://atom.io/packages/atom-ide-ui) package to expose the functionality within Atom.

## Feature Providers
* [Jedi](https://github.com/davidhalter/jedi) for Completions, Definitions, Hover, References, Signature Help, and Symbols
* [Rope](https://github.com/python-rope/rope) for Completions and renaming
* [Pyflakes](https://github.com/PyCQA/pyflakes) linter to detect various errors
* [McCabe](https://github.com/PyCQA/mccabe) linter for complexity checking
* [pycodestyle](https://github.com/PyCQA/pycodestyle) linter for style checking
* [pydocstyle](https://github.com/PyCQA/pydocstyle) linter for docstring style checking
* [YAPF](https://github.com/google/yapf) for code formatting

## Installation
Install the language server with
```bash
pip install python-language-server
```

Verify that everything is correctly installed and `pyls` is on your `PATH` by running `pyls --help` from the command line.
It should return
```bash
usage: pyls [-h] [--tcp] [--host HOST] [--port PORT]
            [--log-config LOG_CONFIG | --log-file LOG_FILE] [-v]

Python Language Server
...
```

## Contributing
Always feel free to help out!  Whether it's [filing bugs and feature requests](https://github.com/lgeiger/ide-python/issues/new) or working on some of the [open issues](https://github.com/lgeiger/ide-python/issues), Atom's [guide for contributing to packages](https://github.com/atom/atom/blob/master/docs/contributing-to-packages.md) will help get you started.

## License
MIT License.  See [the license](LICENSE.md) for more details.
