
# Changelog

Check the **[Releases]** for the actual files.

<br>
<br>

## [![Badge 1.9.7]][1.9.7]

### Fixes

- Fixed replacing `$PIPENV_PATH` in python path
    
  [<kbd>  5789f41  </kbd>][5789f41]

<br>
<br>

## [![Badge 1.9.6]][1.9.6]

### Fixes

- Configs not working for the deprecated `pyls` 

  [<kbd>  8e29121  </kbd>][8e29121]

- Fallback to the other `pyls` if one doesn't exist 

  [<kbd>  902102b  </kbd>][902102b]

<br>
<br>

## [![Badge 1.9.5]][1.9.5]

### Fixes

* Config works with `pylsp` / `pyls`

  [<kbd>  c6a873f  </kbd>][c6a873f]


<br>
<br>

## [![Badge 1.9.4]][1.9.4]

### Fixes

- Added `eslint` 

  [<kbd>  c26448e  </kbd>][c26448e]

- Default to `python3` and fallback to `python` 

  [<kbd>  2850374  </kbd>][2850374]
  
- Lazy-load `log4js` 

  [<kbd>  6e11dde  </kbd>][6e11dde]
  
- Lazy-load `RemoteDebuggerCommandService` 

  [<kbd>  c7fff17  </kbd>][c7fff17]
  
- Merge activate methods
 
  [<kbd>  e15d390  </kbd>][e15d390]

- Remove excess async 

  [<kbd>  e52839f  </kbd>][e52839f]
  
- Update `atom-languageclient` 
    
  [<kbd>  cf16a1e  </kbd>][cf16a1e]

- Use accurate type comparisons & <br>
  remove unused reject parameters

  [<kbd>  dfe5b0d  </kbd>][dfe5b0d]

<br>
<br>

## [![Badge 1.9.3]][1.9.3]

### Fixes

- Project detection

  [<kbd>  a811510  </kbd>][a811510]   [<kbd>  #344  </kbd>][#344]

<br>
<br>

## [![Badge 1.9.2]][1.9.2]

### Fixes

- Made python a class attribute 

  [<kbd>  4d34da9  </kbd>][4d34da9]   [<kbd>  #338  </kbd>][#338]

  Closes:
  - [<kbd>  #335  </kbd>][#335]
  - [<kbd>  #336  </kbd>][#336]
  - [<kbd>  #337  </kbd>][#337]

<br>
<br>

## [![Badge 1.9.1]][1.9.1]

### Fixes

- Renamed `pyls-path` config to `pyls` for consistency

  [<kbd>  1bb76b5  </kbd>][1bb76b5]


<br>
<br>

## [![Badge 1.9.0]][1.9.0]

### Fixes

- Updated `react`
 
  [<kbd>  62049b9  </kbd>][62049b9]
  
- Use `which` to detect `pylsp`
 
  [<kbd>  a2c8444  </kbd>][a2c8444]


<br>

### Features

- Default to `python-lsp-server` ( `pylsp` ) instead of `pyls`

  [<kbd>  01dfc6c  </kbd>][01dfc6c]

- Install `atom-ide-base` by default

  [<kbd>  7bd1e14  </kbd>][7bd1e14]

- Make the path to `pyls` executable configurable
    
  [<kbd>  ad4d166  </kbd>][ad4d166]

- Updated `atom-languageclient`

  [<kbd>  cb1db60  </kbd>][cb1db60]

- Update `atom-languageclient` + use `pylsp`
    
  [<kbd>  b56f580  </kbd>][b56f580]   [<kbd>  #334  </kbd>][#334]

- Use spawn capabilities of language client

  [<kbd>  1cd5126  </kbd>][1cd5126]


<br>
<br>

## [![Badge 1.8.0]][1.8.0]

### Features

- Added support for `pyls-mypy`

  [<kbd>  fb48958  </kbd>][fb48958]   [<kbd>  #232  </kbd>][#232]

<br>
<br>

## [![Badge 1.7.4]][1.7.4]

### Fixes

- Updated language client

  [<kbd>  a52eadf  </kbd>][a52eadf]   [<kbd>  #291  </kbd>][#291]

<br>
<br>

## [![Badge 1.7.3]][1.7.3]

### Fixes

- `atom-languageclient`  **→**  `^1.0.6`

  [<kbd>  d078249  </kbd>][d078249]

<br>
<br>

## [![Badge 1.7.2]][1.7.2]

### Fixes

- Reverted `atom-languageclient` to <br>
  fix auto-complete adds initial typing
  
  [<kbd>  cf23b43  </kbd>][cf23b43]

<br>
<br>

## [![Badge 1.7.1]][1.7.1]

### Fixes

- Bumped `atom-languageclient`

  [<kbd>  9e34245  </kbd>][9e34245]

<br>


<!--
    
    Issue / Commit links are not actually needed 
    as GitHub automatically links them, however
    this does not work in forks and thus may
    confuse people when previewing changes of PRs.
    
    The solution to this of course is to simply
    move the content of this Changelog to each
    respective releases description  and delete 
    this file.
    
-->


<!----------------------------------------------------------------------------->

[Releases]: https://github.com/atom-community/ide-python/releases


<!---------------------------------{ Issues }---------------------------------->

[#291]: https://github.com/lgeiger/ide-python/issues/291
[#232]: https://github.com/lgeiger/ide-python/issues/232
[#334]: https://github.com/lgeiger/ide-python/issues/334
[#338]: https://github.com/lgeiger/ide-python/issues/338
[#336]: https://github.com/lgeiger/ide-python/issues/336
[#335]: https://github.com/lgeiger/ide-python/issues/335
[#337]: https://github.com/lgeiger/ide-python/issues/337
[#344]: https://github.com/lgeiger/ide-python/issues/344


<!---------------------------------{ Commits }--------------------------------->

[9e34245]: https://github.com/lgeiger/ide-python/commit/9e34245f5389475b0cdff073c539d1bf42f31ced
[cf23b43]: https://github.com/lgeiger/ide-python/commit/cf23b432e5834c882b913525c851969552b5a68e
[d078249]: https://github.com/lgeiger/ide-python/commit/d0782490c405fbc3a762cad6c0c687be1f86a74b
[a52eadf]: https://github.com/lgeiger/ide-python/commit/a52eadf4ff491bd25762c1167905daa27faaaa71
[fb48958]: https://github.com/lgeiger/ide-python/commit/fb489582ff25538e026f91815ee58e8a16654688
[62049b9]: https://github.com/lgeiger/ide-python/commit/62049b9999c462894e3bdd301555b5c7468e9ab7
[a2c8444]: https://github.com/lgeiger/ide-python/commit/a2c844429a717add01d07369a4e0ef0e3255334e
[01dfc6c]: https://github.com/lgeiger/ide-python/commit/01dfc6cafc0d22a146e7b1cd960cf13ce7e74bae
[7bd1e14]: https://github.com/lgeiger/ide-python/commit/7bd1e14a706fc8197b952268fc858dc77e468e42
[ad4d166]: https://github.com/lgeiger/ide-python/commit/ad4d16630b126e73347995ea8dd3f136ddd06e38
[cb1db60]: https://github.com/lgeiger/ide-python/commit/cb1db60b26fb5edb0c560ed9248ce3b648751fec
[b56f580]: https://github.com/lgeiger/ide-python/commit/b56f580b0f340720fdfe6592e3b9da113bb7fa54
[1cd5126]: https://github.com/lgeiger/ide-python/commit/1cd512688fcf457ccd0f5982781b4ffef89540f8
[1bb76b5]: https://github.com/lgeiger/ide-python/commit/1bb76b5137157a640582da375102252308b94de1
[4d34da9]: https://github.com/lgeiger/ide-python/commit/4d34da93174561f37b01af433817f7a1f9f5d23b
[a811510]: https://github.com/lgeiger/ide-python/commit/a8115105b64422db9fc42214d1402199005f8875
[c26448e]: https://github.com/lgeiger/ide-python/commit/c26448e85bd7874d74e04af7692b776c3f403481
[2850374]: https://github.com/lgeiger/ide-python/commit/2850374140890fff815512bf83ecf4b4c7a97a5d
[6e11dde]: https://github.com/lgeiger/ide-python/commit/6e11dde88cad24aab526fb3644e4a1fb3c6186b2
[c7fff17]: https://github.com/lgeiger/ide-python/commit/c7fff17e002225371cbf036b8614daac0c7e62ac
[e15d390]: https://github.com/lgeiger/ide-python/commit/e15d390b937692dd31dd3eda68805b5ff78fdc08
[e52839f]: https://github.com/lgeiger/ide-python/commit/e52839f4b1c42e577958baa4876ebb595d90bb25
[cf16a1e]: https://github.com/lgeiger/ide-python/commit/cf16a1ebdb953c6efd3af8c38bf51e90fac52a75
[dfe5b0d]: https://github.com/lgeiger/ide-python/commit/dfe5b0dcc0caf9b4d315c22563ead00a1911d157
[c6a873f]: https://github.com/lgeiger/ide-python/commit/c6a873fb5219eb2f94da1a5530e277a0a01bb941
[8e29121]: https://github.com/lgeiger/ide-python/commit/8e291211dc5930363d3ad146f8c05594f40a8211
[902102b]: https://github.com/lgeiger/ide-python/commit/902102bed3e675bb00007eec94ef7af5d6059d7c
[5789f41]: https://github.com/lgeiger/ide-python/commit/5789f417d4f7ce0c37c34945f96f6e2001731143


<!--------------------------------{ Versions }--------------------------------->

[1.7.1]: https://github.com/lgeiger/ide-python/compare/v1.7.0...v1.7.1
[1.7.2]: https://github.com/lgeiger/ide-python/compare/v1.7.1...v1.7.2
[1.7.3]: https://github.com/lgeiger/ide-python/compare/v1.7.2...v1.7.3
[1.7.4]: https://github.com/lgeiger/ide-python/compare/v1.7.3...v1.7.4
[1.8.0]: https://github.com/lgeiger/ide-python/compare/v1.7.4...v1.8.0
[1.9.0]: https://github.com/lgeiger/ide-python/compare/v1.8.0...v1.9.0
[1.9.1]: https://github.com/lgeiger/ide-python/compare/v1.9.0...v1.9.1
[1.9.2]: https://github.com/lgeiger/ide-python/compare/v1.9.1...v1.9.2
[1.9.3]: https://github.com/lgeiger/ide-python/compare/v1.9.2...v1.9.3
[1.9.4]: https://github.com/lgeiger/ide-python/compare/v1.9.3...v1.9.4
[1.9.5]: https://github.com/lgeiger/ide-python/compare/v1.9.4...v1.9.5
[1.9.6]: https://github.com/lgeiger/ide-python/compare/v1.9.5...v1.9.6
[1.9.7]: https://github.com/lgeiger/ide-python/compare/v1.9.6...v1.9.7


<!---------------------------------{ Badges }---------------------------------->

[Badge 1.7.1]: https://img.shields.io/badge/1.7.1-2020_/_12_/_13-6399c4?style=for-the-badge
[Badge 1.7.2]: https://img.shields.io/badge/1.7.2-2021_/_01_/_05-6399c4?style=for-the-badge
[Badge 1.7.3]: https://img.shields.io/badge/1.7.3-2021_/_01_/_31-6399c4?style=for-the-badge
[Badge 1.7.4]: https://img.shields.io/badge/1.7.4-2021_/_13_/_09-6399c4?style=for-the-badge
[Badge 1.8.0]: https://img.shields.io/badge/1.8.0-2021_/_03_/_23-78af9f?style=for-the-badge
[Badge 1.9.0]: https://img.shields.io/badge/1.9.0-2021_/_06_/_09-e5ab42?style=for-the-badge
[Badge 1.9.1]: https://img.shields.io/badge/1.9.1-2021_/_06_/_09-e5ab42?style=for-the-badge
[Badge 1.9.2]: https://img.shields.io/badge/1.9.2-2021_/_06_/_10-e5ab42?style=for-the-badge
[Badge 1.9.3]: https://img.shields.io/badge/1.9.3-2021_/_06_/_13-e5ab42?style=for-the-badge
[Badge 1.9.4]: https://img.shields.io/badge/1.9.4-2021_/_07_/_17-e5ab42?style=for-the-badge
[Badge 1.9.5]: https://img.shields.io/badge/1.9.5-2021_/_08_/_07-e5ab42?style=for-the-badge
[Badge 1.9.6]: https://img.shields.io/badge/1.9.6-2021_/_08_/_10-e5ab42?style=for-the-badge
[Badge 1.9.7]: https://img.shields.io/badge/1.9.7-2021_/_08_/_24-e5ab42?style=for-the-badge


