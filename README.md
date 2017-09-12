# IDE-python package

Python language support for Atom-IDE, powered by the [Python language server](https://github.com/palantir/python-language-server).

![ide-python](https://user-images.githubusercontent.com/13285808/30352538-b9687a76-9820-11e7-8876-c22751645d36.png)

## Early access
This package is currently an early access release.  You should also install the [atom-ide-ui](https://atom.io/packages/atom-ide-ui) package to expose the functionality within Atom.

## Features

* Auto completion
* Code format
* Diagnostics (errors & warnings)
* Document outline
* Find references
* Hover

## Installation

Install the language server with
```bash
pip install python-language-server
```

Verify that everything is correctly installed by running `pyls --help` from the command line.
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
