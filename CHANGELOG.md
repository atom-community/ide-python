## [1.9.7](https://github.com/lgeiger/ide-python/compare/v1.9.6...v1.9.7) (2021-08-24)


### Bug Fixes

* fix replacing $PIPENV_PATH in the python path ([5789f41](https://github.com/lgeiger/ide-python/commit/5789f417d4f7ce0c37c34945f96f6e2001731143))

## [1.9.6](https://github.com/lgeiger/ide-python/compare/v1.9.5...v1.9.6) (2021-08-10)


### Bug Fixes

* configs not working for the deprecated pyls ([8e29121](https://github.com/lgeiger/ide-python/commit/8e291211dc5930363d3ad146f8c05594f40a8211))
* fallback to the other pyls if one doesn't exist ([902102b](https://github.com/lgeiger/ide-python/commit/902102bed3e675bb00007eec94ef7af5d6059d7c))

## [1.9.5](https://github.com/lgeiger/ide-python/compare/v1.9.4...v1.9.5) (2021-08-07)


### Bug Fixes

* config works with pylsp / pyls ([c6a873f](https://github.com/lgeiger/ide-python/commit/c6a873fb5219eb2f94da1a5530e277a0a01bb941))

## [1.9.4](https://github.com/lgeiger/ide-python/compare/v1.9.3...v1.9.4) (2021-07-17)


### Bug Fixes

* add eslint ([c26448e](https://github.com/lgeiger/ide-python/commit/c26448e85bd7874d74e04af7692b776c3f403481))
* default to python3 and fallback to python ([2850374](https://github.com/lgeiger/ide-python/commit/2850374140890fff815512bf83ecf4b4c7a97a5d))
* lazy-load log4js ([6e11dde](https://github.com/lgeiger/ide-python/commit/6e11dde88cad24aab526fb3644e4a1fb3c6186b2))
* lazy-load RemoteDebuggerCommandService ([c7fff17](https://github.com/lgeiger/ide-python/commit/c7fff17e002225371cbf036b8614daac0c7e62ac))
* merge activate methods ([e15d390](https://github.com/lgeiger/ide-python/commit/e15d390b937692dd31dd3eda68805b5ff78fdc08))
* remove excess async ([e52839f](https://github.com/lgeiger/ide-python/commit/e52839f4b1c42e577958baa4876ebb595d90bb25))
* update atom-languageclient ([cf16a1e](https://github.com/lgeiger/ide-python/commit/cf16a1ebdb953c6efd3af8c38bf51e90fac52a75))
* use accurate type comparisons and remove unused reject parameters ([dfe5b0d](https://github.com/lgeiger/ide-python/commit/dfe5b0dcc0caf9b4d315c22563ead00a1911d157))

## [1.9.3](https://github.com/lgeiger/ide-python/compare/v1.9.2...v1.9.3) (2021-06-13)


### Bug Fixes

* the project was not detected ([#344](https://github.com/lgeiger/ide-python/issues/344)) ([a811510](https://github.com/lgeiger/ide-python/commit/a8115105b64422db9fc42214d1402199005f8875))

## [1.9.2](https://github.com/lgeiger/ide-python/compare/v1.9.1...v1.9.2) (2021-06-10)


### Bug Fixes

* make python a class attribute ([#338](https://github.com/lgeiger/ide-python/issues/338)) ([4d34da9](https://github.com/lgeiger/ide-python/commit/4d34da93174561f37b01af433817f7a1f9f5d23b)), closes [#336](https://github.com/lgeiger/ide-python/issues/336) [#335](https://github.com/lgeiger/ide-python/issues/335) [#337](https://github.com/lgeiger/ide-python/issues/337)

## [1.9.1](https://github.com/lgeiger/ide-python/compare/v1.9.0...v1.9.1) (2021-06-09)


### Bug Fixes

* rename pyls-path config to pyls for consistency ([1bb76b5](https://github.com/lgeiger/ide-python/commit/1bb76b5137157a640582da375102252308b94de1))

# [1.9.0](https://github.com/lgeiger/ide-python/compare/v1.8.0...v1.9.0) (2021-06-09)


### Bug Fixes

* update react ([62049b9](https://github.com/lgeiger/ide-python/commit/62049b9999c462894e3bdd301555b5c7468e9ab7))
* use which to detect pylsp ([a2c8444](https://github.com/lgeiger/ide-python/commit/a2c844429a717add01d07369a4e0ef0e3255334e))


### Features

* default to python-lsp-server (pylsp) instead of pyls ([01dfc6c](https://github.com/lgeiger/ide-python/commit/01dfc6cafc0d22a146e7b1cd960cf13ce7e74bae))
* install atom-ide-base by default ([7bd1e14](https://github.com/lgeiger/ide-python/commit/7bd1e14a706fc8197b952268fc858dc77e468e42))
* make the path to pyls executable configurable ([ad4d166](https://github.com/lgeiger/ide-python/commit/ad4d16630b126e73347995ea8dd3f136ddd06e38))
* update atom-languageclient ([cb1db60](https://github.com/lgeiger/ide-python/commit/cb1db60b26fb5edb0c560ed9248ce3b648751fec))
* update atom-languageclient + use pylsp ([#334](https://github.com/lgeiger/ide-python/issues/334)) ([b56f580](https://github.com/lgeiger/ide-python/commit/b56f580b0f340720fdfe6592e3b9da113bb7fa54))
* use spawn capabilities of language client ([1cd5126](https://github.com/lgeiger/ide-python/commit/1cd512688fcf457ccd0f5982781b4ffef89540f8))

# [1.8.0](https://github.com/lgeiger/ide-python/compare/v1.7.4...v1.8.0) (2021-03-23)


### Features

* add support for pyls-mypy ([#232](https://github.com/lgeiger/ide-python/issues/232)) ([fb48958](https://github.com/lgeiger/ide-python/commit/fb489582ff25538e026f91815ee58e8a16654688))

## [1.7.4](https://github.com/lgeiger/ide-python/compare/v1.7.3...v1.7.4) (2021-03-09)


### Bug Fixes

* update languageclient ([#291](https://github.com/lgeiger/ide-python/issues/291)) ([a52eadf](https://github.com/lgeiger/ide-python/commit/a52eadf4ff491bd25762c1167905daa27faaaa71))

## [1.7.3](https://github.com/lgeiger/ide-python/compare/v1.7.2...v1.7.3) (2021-01-31)


### Bug Fixes

* **deps:** update atom-languageclient to ^1.0.6 ([d078249](https://github.com/lgeiger/ide-python/commit/d0782490c405fbc3a762cad6c0c687be1f86a74b))

## [1.7.2](https://github.com/lgeiger/ide-python/compare/v1.7.1...v1.7.2) (2021-01-05)


### Bug Fixes

* revert atom-languageclient to fix autocomplete adds initial typing ([cf23b43](https://github.com/lgeiger/ide-python/commit/cf23b432e5834c882b913525c851969552b5a68e))

## [1.7.1](https://github.com/lgeiger/ide-python/compare/v1.7.0...v1.7.1) (2020-12-13)


### Bug Fixes

* bump atom-languageclient ([9e34245](https://github.com/lgeiger/ide-python/commit/9e34245f5389475b0cdff073c539d1bf42f31ced))

# Changelog

See: https://github.com/lgeiger/ide-python/releases
