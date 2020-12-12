"use strict";

var __decorate = void 0 && (void 0).__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var __param = void 0 && (void 0).__param || function (paramIndex, decorator) {
  return function (target, key) {
    decorator(target, key, paramIndex);
  };
};

var __awaiter = void 0 && (void 0).__awaiter || function (thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : new P(function (resolve) {
        resolve(result.value);
      }).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

const inversify_1 = require("inversify");

const path = require("path");

const semver_1 = require("semver");

const logger_1 = require("../../../common/logger");

const types_1 = require("../../../common/platform/types");

const types_2 = require("../../../common/process/types");

const types_3 = require("../../../common/types");

const version_1 = require("../../../common/utils/version");

const types_4 = require("../../../ioc/types");

const contracts_1 = require("../../contracts");

const condaHelper_1 = require("./condaHelper"); // tslint:disable-next-line:no-require-imports no-var-requires


const untildify = require('untildify'); // This glob pattern will match all of the following:
// ~/anaconda/bin/conda, ~/anaconda3/bin/conda, ~/miniconda/bin/conda, ~/miniconda3/bin/conda


exports.CondaLocationsGlob = untildify('~/*conda*/bin/conda'); // ...and for windows, the known default install locations:

const condaGlobPathsForWindows = ['/ProgramData/[Mm]iniconda*/Scripts/conda.exe', '/ProgramData/[Aa]naconda*/Scripts/conda.exe', untildify('~/[Mm]iniconda*/Scripts/conda.exe'), untildify('~/[Aa]naconda*/Scripts/conda.exe'), untildify('~/AppData/Local/Continuum/[Mm]iniconda*/Scripts/conda.exe'), untildify('~/AppData/Local/Continuum/[Aa]naconda*/Scripts/conda.exe')]; // format for glob processing:

exports.CondaLocationsGlobWin = `{${condaGlobPathsForWindows.join(',')}}`;
/**
 * A wrapper around a conda installation.
 */

let CondaService = class CondaService {
  constructor(serviceContainer, registryLookupForConda) {
    this.serviceContainer = serviceContainer;
    this.registryLookupForConda = registryLookupForConda;
    this.condaHelper = new condaHelper_1.CondaHelper();
    this.processServiceFactory = this.serviceContainer.get(types_2.IProcessServiceFactory);
    this.platform = this.serviceContainer.get(types_1.IPlatformService);
    this.logger = this.serviceContainer.get(types_3.ILogger);
  }

  get condaEnvironmentsFile() {
    const homeDir = this.platform.isWindows ? process.env.USERPROFILE : process.env.HOME || process.env.HOMEPATH;
    return homeDir ? path.join(homeDir, '.conda', 'environments.txt') : undefined;
  }
  /**
   * Release any held resources.
   *
   * Called by VS Code to indicate it is done with the resource.
   */
  // tslint:disable-next-line:no-empty


  dispose() {}
  /**
   * Return the path to the "conda file".
   */


  getCondaFile() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.condaFile) {
        this.condaFile = this.getCondaFileImpl();
      } // tslint:disable-next-line:no-unnecessary-local-variable


      const condaFile = yield this.condaFile;
      return condaFile;
    });
  }
  /**
   * Is there a conda install to use?
   */


  isCondaAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      if (typeof this.isAvailable === 'boolean') {
        return this.isAvailable;
      }

      return this.getCondaVersion().then(version => this.isAvailable = version !== undefined).catch(() => this.isAvailable = false);
    });
  }
  /**
   * Return the conda version.
   */


  getCondaVersion() {
    return __awaiter(this, void 0, void 0, function* () {
      const processService = yield this.processServiceFactory.create();
      const info = yield this.getCondaInfo().catch(() => undefined);
      let versionString;

      if (info && info.conda_version) {
        versionString = info.conda_version;
      } else {
        const stdOut = yield this.getCondaFile().then(condaFile => processService.exec(condaFile, ['--version'], {})).then(result => result.stdout.trim()).catch(() => undefined);
        versionString = stdOut && stdOut.startsWith('conda ') ? stdOut.substring('conda '.length).trim() : stdOut;
      }

      if (!versionString) {
        return;
      }

      const version = semver_1.parse(versionString, true);

      if (version) {
        return version;
      } // Use a bogus version, at least to indicate the fact that a version was returned.


      logger_1.Logger.warn(`Unable to parse Version of Conda, ${versionString}`);
      return new semver_1.SemVer('0.0.1');
    });
  }
  /**
   * Can the shell find conda (to run it)?
   */


  isCondaInCurrentPath() {
    return __awaiter(this, void 0, void 0, function* () {
      const processService = yield this.processServiceFactory.create();
      return processService.exec('conda', ['--version']).then(output => output.stdout.length > 0).catch(() => false);
    });
  }
  /**
   * Return the info reported by the conda install.
   */


  getCondaInfo() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const condaFile = yield this.getCondaFile();
        const processService = yield this.processServiceFactory.create();
        const condaInfo = yield processService.exec(condaFile, ['info', '--json']).then(output => output.stdout);
        return JSON.parse(condaInfo);
      } catch (ex) {// Failed because either:
        //   1. conda is not installed.
        //   2. `conda info --json` has changed signature.
      }
    });
  }
  /**
   * Determines whether a python interpreter is a conda environment or not.
   * The check is done by simply looking for the 'conda-meta' directory.
   * @param {string} interpreterPath
   * @returns {Promise<boolean>}
   * @memberof CondaService
   */


  isCondaEnvironment(interpreterPath) {
    return __awaiter(this, void 0, void 0, function* () {
      const fs = this.serviceContainer.get(types_1.IFileSystem);
      const dir = path.dirname(interpreterPath);
      const isWindows = this.serviceContainer.get(types_1.IPlatformService).isWindows;
      const condaMetaDirectory = isWindows ? path.join(dir, 'conda-meta') : path.join(dir, '..', 'conda-meta');
      return fs.directoryExists(condaMetaDirectory);
    });
  }
  /**
   * Return (env name, interpreter filename) for the interpreter.
   */


  getCondaEnvironment(interpreterPath) {
    return __awaiter(this, void 0, void 0, function* () {
      const isCondaEnv = yield this.isCondaEnvironment(interpreterPath);

      if (!isCondaEnv) {
        return;
      }

      let environments = yield this.getCondaEnvironments(false);
      const dir = path.dirname(interpreterPath); // If interpreter is in bin or Scripts, then go up one level

      const subDirName = path.basename(dir);
      const goUpOnLevel = ['BIN', 'SCRIPTS'].indexOf(subDirName.toUpperCase()) !== -1;
      const interpreterPathToMatch = goUpOnLevel ? path.join(dir, '..') : dir;
      const fs = this.serviceContainer.get(types_1.IFileSystem); // From the list of conda environments find this dir.

      let matchingEnvs = Array.isArray(environments) ? environments.filter(item => fs.arePathsSame(item.path, interpreterPathToMatch)) : [];

      if (matchingEnvs.length === 0) {
        environments = yield this.getCondaEnvironments(true);
        matchingEnvs = Array.isArray(environments) ? environments.filter(item => fs.arePathsSame(item.path, interpreterPathToMatch)) : [];
      }

      if (matchingEnvs.length > 0) {
        return {
          name: matchingEnvs[0].name,
          path: interpreterPathToMatch
        };
      } // If still not available, then the user created the env after starting vs code.
      // The only solution is to get the user to re-start vscode.

    });
  }
  /**
   * Return the list of conda envs (by name, interpreter filename).
   */


  getCondaEnvironments(ignoreCache) {
    return __awaiter(this, void 0, void 0, function* () {
      // Global cache.
      const persistentFactory = this.serviceContainer.get(types_3.IPersistentStateFactory); // tslint:disable-next-line:no-any

      const globalPersistence = persistentFactory.createGlobalPersistentState('CONDA_ENVIRONMENTS', undefined);

      if (!ignoreCache && globalPersistence.value) {
        return globalPersistence.value.data;
      }

      try {
        const condaFile = yield this.getCondaFile();
        const processService = yield this.processServiceFactory.create();
        const envInfo = yield processService.exec(condaFile, ['env', 'list']).then(output => output.stdout);
        const environments = this.condaHelper.parseCondaEnvironmentNames(envInfo);
        yield globalPersistence.updateValue({
          data: environments
        });
        return environments;
      } catch (ex) {
        yield globalPersistence.updateValue({
          data: undefined
        }); // Failed because either:
        //   1. conda is not installed.
        //   2. `conda env list has changed signature.

        this.logger.logInformation('Failed to get conda environment list from conda', ex);
      }
    });
  }
  /**
   * Return the interpreter's filename for the given environment.
   */


  getInterpreterPath(condaEnvironmentPath) {
    // where to find the Python binary within a conda env.
    const relativePath = this.platform.isWindows ? 'python.exe' : path.join('bin', 'python');
    return path.join(condaEnvironmentPath, relativePath);
  }
  /**
   * For the given interpreter return an activated Conda environment object
   * with the correct addition to the path and environmental variables
   */
  // Base Node.js SpawnOptions uses any for environment, so use that here as well
  // tslint:disable-next-line:no-any


  getActivatedCondaEnvironment(interpreter, inputEnvironment) {
    if (interpreter.type !== contracts_1.InterpreterType.Conda) {
      return;
    }

    const activatedEnvironment = Object.assign({}, inputEnvironment);
    const isWindows = this.platform.isWindows;

    if (interpreter.envPath) {
      if (isWindows) {
        // Windows: Path, ; as separator, 'Scripts' as directory
        const condaPath = path.join(interpreter.envPath, 'Scripts');
        activatedEnvironment.Path = condaPath.concat(';', `${inputEnvironment.Path ? inputEnvironment.Path : ''}`);
      } else {
        // Mac: PATH, : as separator, 'bin' as directory
        const condaPath = path.join(interpreter.envPath, 'bin');
        activatedEnvironment.PATH = condaPath.concat(':', `${inputEnvironment.PATH ? inputEnvironment.PATH : ''}`);
      } // Conda also wants a couple of environmental variables set


      activatedEnvironment.CONDA_PREFIX = interpreter.envPath;
    }

    if (interpreter.envName) {
      activatedEnvironment.CONDA_DEFAULT_ENV = interpreter.envName;
    }

    return activatedEnvironment;
  }
  /**
   * Is the given interpreter from conda?
   */


  detectCondaEnvironment(interpreter) {
    return interpreter.type === contracts_1.InterpreterType.Conda || (interpreter.displayName ? interpreter.displayName : '').toUpperCase().indexOf('ANACONDA') >= 0 || (interpreter.companyDisplayName ? interpreter.companyDisplayName : '').toUpperCase().indexOf('ANACONDA') >= 0 || (interpreter.companyDisplayName ? interpreter.companyDisplayName : '').toUpperCase().indexOf('CONTINUUM') >= 0;
  }
  /**
   * Return the highest Python version from the given list.
   */


  getLatestVersion(interpreters) {
    const sortedInterpreters = interpreters.filter(interpreter => interpreter.version && interpreter.version.length > 0); // tslint:disable-next-line:no-non-null-assertion

    sortedInterpreters.sort((a, b) => version_1.compareVersion(a.version, b.version));

    if (sortedInterpreters.length > 0) {
      return sortedInterpreters[sortedInterpreters.length - 1];
    }
  }
  /**
   * Return the path to the "conda file", if there is one (in known locations).
   */


  getCondaFileImpl() {
    return __awaiter(this, void 0, void 0, function* () {
      const settings = this.serviceContainer.get(types_3.IConfigurationService).getSettings();
      const fileSystem = this.serviceContainer.get(types_1.IFileSystem);
      const setting = settings.condaPath;

      if (setting && setting !== '') {
        return setting;
      }

      const isAvailable = yield this.isCondaInCurrentPath();

      if (isAvailable) {
        return 'conda';
      }

      if (this.platform.isWindows && this.registryLookupForConda) {
        const interpreters = yield this.registryLookupForConda.getInterpreters();
        const condaInterpreters = interpreters.filter(this.detectCondaEnvironment);
        const condaInterpreter = this.getLatestVersion(condaInterpreters);
        let condaPath = condaInterpreter ? path.join(path.dirname(condaInterpreter.path), 'conda.exe') : '';

        if (yield fileSystem.fileExists(condaPath)) {
          return condaPath;
        } // Conda path has changed locations, check the new location in the scripts directory after checking
        // the old location


        condaPath = condaInterpreter ? path.join(path.dirname(condaInterpreter.path), 'Scripts', 'conda.exe') : '';

        if (yield fileSystem.fileExists(condaPath)) {
          return condaPath;
        }
      }

      return this.getCondaFileFromKnownLocations();
    });
  }
  /**
   * Return the path to the "conda file", if there is one (in known locations).
   * Note: For now we simply return the first one found.
   */


  getCondaFileFromKnownLocations() {
    return __awaiter(this, void 0, void 0, function* () {
      const fileSystem = this.serviceContainer.get(types_1.IFileSystem);
      const globPattern = this.platform.isWindows ? exports.CondaLocationsGlobWin : exports.CondaLocationsGlob;
      const condaFiles = yield fileSystem.search(globPattern).catch(failReason => {
        logger_1.Logger.warn('Default conda location search failed.', `Searching for default install locations for conda results in error: ${failReason}`);
        return [];
      });
      const validCondaFiles = condaFiles.filter(condaPath => condaPath.length > 0);
      return validCondaFiles.length === 0 ? 'conda' : validCondaFiles[0];
    });
  }

};
CondaService = __decorate([inversify_1.injectable(), __param(0, inversify_1.inject(types_4.IServiceContainer)), __param(1, inversify_1.inject(contracts_1.IInterpreterLocatorService)), __param(1, inversify_1.named(contracts_1.WINDOWS_REGISTRY_SERVICE)), __param(1, inversify_1.optional())], CondaService);
exports.CondaService = CondaService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmRhU2VydmljZS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX3BhcmFtIiwicGFyYW1JbmRleCIsImRlY29yYXRvciIsIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJleHBvcnRzIiwiaW52ZXJzaWZ5XzEiLCJyZXF1aXJlIiwicGF0aCIsInNlbXZlcl8xIiwibG9nZ2VyXzEiLCJ0eXBlc18xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJ2ZXJzaW9uXzEiLCJ0eXBlc180IiwiY29udHJhY3RzXzEiLCJjb25kYUhlbHBlcl8xIiwidW50aWxkaWZ5IiwiQ29uZGFMb2NhdGlvbnNHbG9iIiwiY29uZGFHbG9iUGF0aHNGb3JXaW5kb3dzIiwiQ29uZGFMb2NhdGlvbnNHbG9iV2luIiwiam9pbiIsIkNvbmRhU2VydmljZSIsImNvbnN0cnVjdG9yIiwic2VydmljZUNvbnRhaW5lciIsInJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEiLCJjb25kYUhlbHBlciIsIkNvbmRhSGVscGVyIiwicHJvY2Vzc1NlcnZpY2VGYWN0b3J5IiwiZ2V0IiwiSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSIsInBsYXRmb3JtIiwiSVBsYXRmb3JtU2VydmljZSIsImxvZ2dlciIsIklMb2dnZXIiLCJjb25kYUVudmlyb25tZW50c0ZpbGUiLCJob21lRGlyIiwiaXNXaW5kb3dzIiwicHJvY2VzcyIsImVudiIsIlVTRVJQUk9GSUxFIiwiSE9NRSIsIkhPTUVQQVRIIiwidW5kZWZpbmVkIiwiZGlzcG9zZSIsImdldENvbmRhRmlsZSIsImNvbmRhRmlsZSIsImdldENvbmRhRmlsZUltcGwiLCJpc0NvbmRhQXZhaWxhYmxlIiwiaXNBdmFpbGFibGUiLCJnZXRDb25kYVZlcnNpb24iLCJ2ZXJzaW9uIiwiY2F0Y2giLCJwcm9jZXNzU2VydmljZSIsImNyZWF0ZSIsImluZm8iLCJnZXRDb25kYUluZm8iLCJ2ZXJzaW9uU3RyaW5nIiwiY29uZGFfdmVyc2lvbiIsInN0ZE91dCIsImV4ZWMiLCJzdGRvdXQiLCJ0cmltIiwic3RhcnRzV2l0aCIsInN1YnN0cmluZyIsInBhcnNlIiwiTG9nZ2VyIiwid2FybiIsIlNlbVZlciIsImlzQ29uZGFJbkN1cnJlbnRQYXRoIiwib3V0cHV0IiwiY29uZGFJbmZvIiwiSlNPTiIsImV4IiwiaXNDb25kYUVudmlyb25tZW50IiwiaW50ZXJwcmV0ZXJQYXRoIiwiZnMiLCJJRmlsZVN5c3RlbSIsImRpciIsImRpcm5hbWUiLCJjb25kYU1ldGFEaXJlY3RvcnkiLCJkaXJlY3RvcnlFeGlzdHMiLCJnZXRDb25kYUVudmlyb25tZW50IiwiaXNDb25kYUVudiIsImVudmlyb25tZW50cyIsImdldENvbmRhRW52aXJvbm1lbnRzIiwic3ViRGlyTmFtZSIsImJhc2VuYW1lIiwiZ29VcE9uTGV2ZWwiLCJpbmRleE9mIiwidG9VcHBlckNhc2UiLCJpbnRlcnByZXRlclBhdGhUb01hdGNoIiwibWF0Y2hpbmdFbnZzIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwiaXRlbSIsImFyZVBhdGhzU2FtZSIsIm5hbWUiLCJpZ25vcmVDYWNoZSIsInBlcnNpc3RlbnRGYWN0b3J5IiwiSVBlcnNpc3RlbnRTdGF0ZUZhY3RvcnkiLCJnbG9iYWxQZXJzaXN0ZW5jZSIsImNyZWF0ZUdsb2JhbFBlcnNpc3RlbnRTdGF0ZSIsImRhdGEiLCJlbnZJbmZvIiwicGFyc2VDb25kYUVudmlyb25tZW50TmFtZXMiLCJ1cGRhdGVWYWx1ZSIsImxvZ0luZm9ybWF0aW9uIiwiZ2V0SW50ZXJwcmV0ZXJQYXRoIiwiY29uZGFFbnZpcm9ubWVudFBhdGgiLCJyZWxhdGl2ZVBhdGgiLCJnZXRBY3RpdmF0ZWRDb25kYUVudmlyb25tZW50IiwiaW50ZXJwcmV0ZXIiLCJpbnB1dEVudmlyb25tZW50IiwidHlwZSIsIkludGVycHJldGVyVHlwZSIsIkNvbmRhIiwiYWN0aXZhdGVkRW52aXJvbm1lbnQiLCJhc3NpZ24iLCJlbnZQYXRoIiwiY29uZGFQYXRoIiwiUGF0aCIsImNvbmNhdCIsIlBBVEgiLCJDT05EQV9QUkVGSVgiLCJlbnZOYW1lIiwiQ09OREFfREVGQVVMVF9FTlYiLCJkZXRlY3RDb25kYUVudmlyb25tZW50IiwiZGlzcGxheU5hbWUiLCJjb21wYW55RGlzcGxheU5hbWUiLCJnZXRMYXRlc3RWZXJzaW9uIiwiaW50ZXJwcmV0ZXJzIiwic29ydGVkSW50ZXJwcmV0ZXJzIiwic29ydCIsImEiLCJiIiwiY29tcGFyZVZlcnNpb24iLCJzZXR0aW5ncyIsIklDb25maWd1cmF0aW9uU2VydmljZSIsImdldFNldHRpbmdzIiwiZmlsZVN5c3RlbSIsInNldHRpbmciLCJnZXRJbnRlcnByZXRlcnMiLCJjb25kYUludGVycHJldGVycyIsImNvbmRhSW50ZXJwcmV0ZXIiLCJmaWxlRXhpc3RzIiwiZ2V0Q29uZGFGaWxlRnJvbUtub3duTG9jYXRpb25zIiwiZ2xvYlBhdHRlcm4iLCJjb25kYUZpbGVzIiwic2VhcmNoIiwiZmFpbFJlYXNvbiIsInZhbGlkQ29uZGFGaWxlcyIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciIsIklJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlIiwibmFtZWQiLCJXSU5ET1dTX1JFR0lTVFJZX1NFUlZJQ0UiLCJvcHRpb25hbCJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxN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QVcsQ0FBQ3FKLE1BQVosQ0FBbUI1SSxPQUFPLENBQUM2SSxpQkFBM0IsQ0FBSixDQUZlLEVBR3RCNUssT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQ3FKLE1BQVosQ0FBbUIzSSxXQUFXLENBQUM2SSwwQkFBL0IsQ0FBSixDQUhlLEVBR2tEN0ssT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQ3dKLEtBQVosQ0FBa0I5SSxXQUFXLENBQUMrSSx3QkFBOUIsQ0FBSixDQUh6RCxFQUd1SC9LLE9BQU8sQ0FBQyxDQUFELEVBQUlzQixXQUFXLENBQUMwSixRQUFaLEVBQUosQ0FIOUgsQ0FBRCxFQUl0QnpJLFlBSnNCLENBQXpCO0FBS0FsQixPQUFPLENBQUNrQixZQUFSLEdBQXVCQSxZQUF2QiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn07XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbmNvbnN0IHNlbXZlcl8xID0gcmVxdWlyZShcInNlbXZlclwiKTtcclxuY29uc3QgbG9nZ2VyXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL2xvZ2dlclwiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb21tb24vcGxhdGZvcm0vdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3Byb2Nlc3MvdHlwZXNcIik7XHJcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3R5cGVzXCIpO1xyXG5jb25zdCB2ZXJzaW9uXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3V0aWxzL3ZlcnNpb25cIik7XHJcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW9jL3R5cGVzXCIpO1xyXG5jb25zdCBjb250cmFjdHNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb250cmFjdHNcIik7XHJcbmNvbnN0IGNvbmRhSGVscGVyXzEgPSByZXF1aXJlKFwiLi9jb25kYUhlbHBlclwiKTtcclxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXJlcXVpcmUtaW1wb3J0cyBuby12YXItcmVxdWlyZXNcclxuY29uc3QgdW50aWxkaWZ5ID0gcmVxdWlyZSgndW50aWxkaWZ5Jyk7XHJcbi8vIFRoaXMgZ2xvYiBwYXR0ZXJuIHdpbGwgbWF0Y2ggYWxsIG9mIHRoZSBmb2xsb3dpbmc6XHJcbi8vIH4vYW5hY29uZGEvYmluL2NvbmRhLCB+L2FuYWNvbmRhMy9iaW4vY29uZGEsIH4vbWluaWNvbmRhL2Jpbi9jb25kYSwgfi9taW5pY29uZGEzL2Jpbi9jb25kYVxyXG5leHBvcnRzLkNvbmRhTG9jYXRpb25zR2xvYiA9IHVudGlsZGlmeSgnfi8qY29uZGEqL2Jpbi9jb25kYScpO1xyXG4vLyAuLi5hbmQgZm9yIHdpbmRvd3MsIHRoZSBrbm93biBkZWZhdWx0IGluc3RhbGwgbG9jYXRpb25zOlxyXG5jb25zdCBjb25kYUdsb2JQYXRoc0ZvcldpbmRvd3MgPSBbXHJcbiAgICAnL1Byb2dyYW1EYXRhL1tNbV1pbmljb25kYSovU2NyaXB0cy9jb25kYS5leGUnLFxyXG4gICAgJy9Qcm9ncmFtRGF0YS9bQWFdbmFjb25kYSovU2NyaXB0cy9jb25kYS5leGUnLFxyXG4gICAgdW50aWxkaWZ5KCd+L1tNbV1pbmljb25kYSovU2NyaXB0cy9jb25kYS5leGUnKSxcclxuICAgIHVudGlsZGlmeSgnfi9bQWFdbmFjb25kYSovU2NyaXB0cy9jb25kYS5leGUnKSxcclxuICAgIHVudGlsZGlmeSgnfi9BcHBEYXRhL0xvY2FsL0NvbnRpbnV1bS9bTW1daW5pY29uZGEqL1NjcmlwdHMvY29uZGEuZXhlJyksXHJcbiAgICB1bnRpbGRpZnkoJ34vQXBwRGF0YS9Mb2NhbC9Db250aW51dW0vW0FhXW5hY29uZGEqL1NjcmlwdHMvY29uZGEuZXhlJylcclxuXTtcclxuLy8gZm9ybWF0IGZvciBnbG9iIHByb2Nlc3Npbmc6XHJcbmV4cG9ydHMuQ29uZGFMb2NhdGlvbnNHbG9iV2luID0gYHske2NvbmRhR2xvYlBhdGhzRm9yV2luZG93cy5qb2luKCcsJyl9fWA7XHJcbi8qKlxyXG4gKiBBIHdyYXBwZXIgYXJvdW5kIGEgY29uZGEgaW5zdGFsbGF0aW9uLlxyXG4gKi9cclxubGV0IENvbmRhU2VydmljZSA9IGNsYXNzIENvbmRhU2VydmljZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlQ29udGFpbmVyLCByZWdpc3RyeUxvb2t1cEZvckNvbmRhKSB7XHJcbiAgICAgICAgdGhpcy5zZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZUNvbnRhaW5lcjtcclxuICAgICAgICB0aGlzLnJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEgPSByZWdpc3RyeUxvb2t1cEZvckNvbmRhO1xyXG4gICAgICAgIHRoaXMuY29uZGFIZWxwZXIgPSBuZXcgY29uZGFIZWxwZXJfMS5Db25kYUhlbHBlcigpO1xyXG4gICAgICAgIHRoaXMucHJvY2Vzc1NlcnZpY2VGYWN0b3J5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklQcm9jZXNzU2VydmljZUZhY3RvcnkpO1xyXG4gICAgICAgIHRoaXMucGxhdGZvcm0gPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSVBsYXRmb3JtU2VydmljZSk7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzMuSUxvZ2dlcik7XHJcbiAgICB9XHJcbiAgICBnZXQgY29uZGFFbnZpcm9ubWVudHNGaWxlKCkge1xyXG4gICAgICAgIGNvbnN0IGhvbWVEaXIgPSB0aGlzLnBsYXRmb3JtLmlzV2luZG93cyA/IHByb2Nlc3MuZW52LlVTRVJQUk9GSUxFIDogKHByb2Nlc3MuZW52LkhPTUUgfHwgcHJvY2Vzcy5lbnYuSE9NRVBBVEgpO1xyXG4gICAgICAgIHJldHVybiBob21lRGlyID8gcGF0aC5qb2luKGhvbWVEaXIsICcuY29uZGEnLCAnZW52aXJvbm1lbnRzLnR4dCcpIDogdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWxlYXNlIGFueSBoZWxkIHJlc291cmNlcy5cclxuICAgICAqXHJcbiAgICAgKiBDYWxsZWQgYnkgVlMgQ29kZSB0byBpbmRpY2F0ZSBpdCBpcyBkb25lIHdpdGggdGhlIHJlc291cmNlLlxyXG4gICAgICovXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcclxuICAgIGRpc3Bvc2UoKSB7IH1cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBcImNvbmRhIGZpbGVcIi5cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZGFGaWxlKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb25kYUZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29uZGFGaWxlID0gdGhpcy5nZXRDb25kYUZpbGVJbXBsKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVubmVjZXNzYXJ5LWxvY2FsLXZhcmlhYmxlXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbmRhRmlsZSA9IHlpZWxkIHRoaXMuY29uZGFGaWxlO1xyXG4gICAgICAgICAgICByZXR1cm4gY29uZGFGaWxlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBJcyB0aGVyZSBhIGNvbmRhIGluc3RhbGwgdG8gdXNlP1xyXG4gICAgICovXHJcbiAgICBpc0NvbmRhQXZhaWxhYmxlKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5pc0F2YWlsYWJsZSA9PT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc0F2YWlsYWJsZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb25kYVZlcnNpb24oKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4odmVyc2lvbiA9PiB0aGlzLmlzQXZhaWxhYmxlID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IHRoaXMuaXNBdmFpbGFibGUgPSBmYWxzZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFJldHVybiB0aGUgY29uZGEgdmVyc2lvbi5cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZGFWZXJzaW9uKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NTZXJ2aWNlID0geWllbGQgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkuY3JlYXRlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB5aWVsZCB0aGlzLmdldENvbmRhSW5mbygpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XHJcbiAgICAgICAgICAgIGxldCB2ZXJzaW9uU3RyaW5nO1xyXG4gICAgICAgICAgICBpZiAoaW5mbyAmJiBpbmZvLmNvbmRhX3ZlcnNpb24pIHtcclxuICAgICAgICAgICAgICAgIHZlcnNpb25TdHJpbmcgPSBpbmZvLmNvbmRhX3ZlcnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGRPdXQgPSB5aWVsZCB0aGlzLmdldENvbmRhRmlsZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oY29uZGFGaWxlID0+IHByb2Nlc3NTZXJ2aWNlLmV4ZWMoY29uZGFGaWxlLCBbJy0tdmVyc2lvbiddLCB7fSkpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzdWx0ID0+IHJlc3VsdC5zdGRvdXQudHJpbSgpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICAgICAgdmVyc2lvblN0cmluZyA9IChzdGRPdXQgJiYgc3RkT3V0LnN0YXJ0c1dpdGgoJ2NvbmRhICcpKSA/IHN0ZE91dC5zdWJzdHJpbmcoJ2NvbmRhICcubGVuZ3RoKS50cmltKCkgOiBzdGRPdXQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF2ZXJzaW9uU3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgdmVyc2lvbiA9IHNlbXZlcl8xLnBhcnNlKHZlcnNpb25TdHJpbmcsIHRydWUpO1xyXG4gICAgICAgICAgICBpZiAodmVyc2lvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZlcnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gVXNlIGEgYm9ndXMgdmVyc2lvbiwgYXQgbGVhc3QgdG8gaW5kaWNhdGUgdGhlIGZhY3QgdGhhdCBhIHZlcnNpb24gd2FzIHJldHVybmVkLlxyXG4gICAgICAgICAgICBsb2dnZXJfMS5Mb2dnZXIud2FybihgVW5hYmxlIHRvIHBhcnNlIFZlcnNpb24gb2YgQ29uZGEsICR7dmVyc2lvblN0cmluZ31gKTtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBzZW12ZXJfMS5TZW1WZXIoJzAuMC4xJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIENhbiB0aGUgc2hlbGwgZmluZCBjb25kYSAodG8gcnVuIGl0KT9cclxuICAgICAqL1xyXG4gICAgaXNDb25kYUluQ3VycmVudFBhdGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1NlcnZpY2UgPSB5aWVsZCB0aGlzLnByb2Nlc3NTZXJ2aWNlRmFjdG9yeS5jcmVhdGUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NTZXJ2aWNlLmV4ZWMoJ2NvbmRhJywgWyctLXZlcnNpb24nXSlcclxuICAgICAgICAgICAgICAgIC50aGVuKG91dHB1dCA9PiBvdXRwdXQuc3Rkb3V0Lmxlbmd0aCA+IDApXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm4gdGhlIGluZm8gcmVwb3J0ZWQgYnkgdGhlIGNvbmRhIGluc3RhbGwuXHJcbiAgICAgKi9cclxuICAgIGdldENvbmRhSW5mbygpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFGaWxlID0geWllbGQgdGhpcy5nZXRDb25kYUZpbGUoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NTZXJ2aWNlID0geWllbGQgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkuY3JlYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYUluZm8gPSB5aWVsZCBwcm9jZXNzU2VydmljZS5leGVjKGNvbmRhRmlsZSwgWydpbmZvJywgJy0tanNvbiddKS50aGVuKG91dHB1dCA9PiBvdXRwdXQuc3Rkb3V0KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGNvbmRhSW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgYmVjYXVzZSBlaXRoZXI6XHJcbiAgICAgICAgICAgICAgICAvLyAgIDEuIGNvbmRhIGlzIG5vdCBpbnN0YWxsZWQuXHJcbiAgICAgICAgICAgICAgICAvLyAgIDIuIGBjb25kYSBpbmZvIC0tanNvbmAgaGFzIGNoYW5nZWQgc2lnbmF0dXJlLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIERldGVybWluZXMgd2hldGhlciBhIHB5dGhvbiBpbnRlcnByZXRlciBpcyBhIGNvbmRhIGVudmlyb25tZW50IG9yIG5vdC5cclxuICAgICAqIFRoZSBjaGVjayBpcyBkb25lIGJ5IHNpbXBseSBsb29raW5nIGZvciB0aGUgJ2NvbmRhLW1ldGEnIGRpcmVjdG9yeS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcnByZXRlclBhdGhcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fVxyXG4gICAgICogQG1lbWJlcm9mIENvbmRhU2VydmljZVxyXG4gICAgICovXHJcbiAgICBpc0NvbmRhRW52aXJvbm1lbnQoaW50ZXJwcmV0ZXJQYXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgZnMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xyXG4gICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmRpcm5hbWUoaW50ZXJwcmV0ZXJQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgaXNXaW5kb3dzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQbGF0Zm9ybVNlcnZpY2UpLmlzV2luZG93cztcclxuICAgICAgICAgICAgY29uc3QgY29uZGFNZXRhRGlyZWN0b3J5ID0gaXNXaW5kb3dzID8gcGF0aC5qb2luKGRpciwgJ2NvbmRhLW1ldGEnKSA6IHBhdGguam9pbihkaXIsICcuLicsICdjb25kYS1tZXRhJyk7XHJcbiAgICAgICAgICAgIHJldHVybiBmcy5kaXJlY3RvcnlFeGlzdHMoY29uZGFNZXRhRGlyZWN0b3J5KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJuIChlbnYgbmFtZSwgaW50ZXJwcmV0ZXIgZmlsZW5hbWUpIGZvciB0aGUgaW50ZXJwcmV0ZXIuXHJcbiAgICAgKi9cclxuICAgIGdldENvbmRhRW52aXJvbm1lbnQoaW50ZXJwcmV0ZXJQYXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgaXNDb25kYUVudiA9IHlpZWxkIHRoaXMuaXNDb25kYUVudmlyb25tZW50KGludGVycHJldGVyUGF0aCk7XHJcbiAgICAgICAgICAgIGlmICghaXNDb25kYUVudikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBlbnZpcm9ubWVudHMgPSB5aWVsZCB0aGlzLmdldENvbmRhRW52aXJvbm1lbnRzKGZhbHNlKTtcclxuICAgICAgICAgICAgY29uc3QgZGlyID0gcGF0aC5kaXJuYW1lKGludGVycHJldGVyUGF0aCk7XHJcbiAgICAgICAgICAgIC8vIElmIGludGVycHJldGVyIGlzIGluIGJpbiBvciBTY3JpcHRzLCB0aGVuIGdvIHVwIG9uZSBsZXZlbFxyXG4gICAgICAgICAgICBjb25zdCBzdWJEaXJOYW1lID0gcGF0aC5iYXNlbmFtZShkaXIpO1xyXG4gICAgICAgICAgICBjb25zdCBnb1VwT25MZXZlbCA9IFsnQklOJywgJ1NDUklQVFMnXS5pbmRleE9mKHN1YkRpck5hbWUudG9VcHBlckNhc2UoKSkgIT09IC0xO1xyXG4gICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlclBhdGhUb01hdGNoID0gZ29VcE9uTGV2ZWwgPyBwYXRoLmpvaW4oZGlyLCAnLi4nKSA6IGRpcjtcclxuICAgICAgICAgICAgY29uc3QgZnMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xyXG4gICAgICAgICAgICAvLyBGcm9tIHRoZSBsaXN0IG9mIGNvbmRhIGVudmlyb25tZW50cyBmaW5kIHRoaXMgZGlyLlxyXG4gICAgICAgICAgICBsZXQgbWF0Y2hpbmdFbnZzID0gQXJyYXkuaXNBcnJheShlbnZpcm9ubWVudHMpID8gZW52aXJvbm1lbnRzLmZpbHRlcihpdGVtID0+IGZzLmFyZVBhdGhzU2FtZShpdGVtLnBhdGgsIGludGVycHJldGVyUGF0aFRvTWF0Y2gpKSA6IFtdO1xyXG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdFbnZzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgZW52aXJvbm1lbnRzID0geWllbGQgdGhpcy5nZXRDb25kYUVudmlyb25tZW50cyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIG1hdGNoaW5nRW52cyA9IEFycmF5LmlzQXJyYXkoZW52aXJvbm1lbnRzKSA/IGVudmlyb25tZW50cy5maWx0ZXIoaXRlbSA9PiBmcy5hcmVQYXRoc1NhbWUoaXRlbS5wYXRoLCBpbnRlcnByZXRlclBhdGhUb01hdGNoKSkgOiBbXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdFbnZzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IG1hdGNoaW5nRW52c1swXS5uYW1lLCBwYXRoOiBpbnRlcnByZXRlclBhdGhUb01hdGNoIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gSWYgc3RpbGwgbm90IGF2YWlsYWJsZSwgdGhlbiB0aGUgdXNlciBjcmVhdGVkIHRoZSBlbnYgYWZ0ZXIgc3RhcnRpbmcgdnMgY29kZS5cclxuICAgICAgICAgICAgLy8gVGhlIG9ubHkgc29sdXRpb24gaXMgdG8gZ2V0IHRoZSB1c2VyIHRvIHJlLXN0YXJ0IHZzY29kZS5cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJuIHRoZSBsaXN0IG9mIGNvbmRhIGVudnMgKGJ5IG5hbWUsIGludGVycHJldGVyIGZpbGVuYW1lKS5cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZGFFbnZpcm9ubWVudHMoaWdub3JlQ2FjaGUpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICAvLyBHbG9iYWwgY2FjaGUuXHJcbiAgICAgICAgICAgIGNvbnN0IHBlcnNpc3RlbnRGYWN0b3J5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQZXJzaXN0ZW50U3RhdGVGYWN0b3J5KTtcclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxyXG4gICAgICAgICAgICBjb25zdCBnbG9iYWxQZXJzaXN0ZW5jZSA9IHBlcnNpc3RlbnRGYWN0b3J5LmNyZWF0ZUdsb2JhbFBlcnNpc3RlbnRTdGF0ZSgnQ09OREFfRU5WSVJPTk1FTlRTJywgdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgaWYgKCFpZ25vcmVDYWNoZSAmJiBnbG9iYWxQZXJzaXN0ZW5jZS52YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFBlcnNpc3RlbmNlLnZhbHVlLmRhdGE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRhRmlsZSA9IHlpZWxkIHRoaXMuZ2V0Q29uZGFGaWxlKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzU2VydmljZSA9IHlpZWxkIHRoaXMucHJvY2Vzc1NlcnZpY2VGYWN0b3J5LmNyZWF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW52SW5mbyA9IHlpZWxkIHByb2Nlc3NTZXJ2aWNlLmV4ZWMoY29uZGFGaWxlLCBbJ2VudicsICdsaXN0J10pLnRoZW4ob3V0cHV0ID0+IG91dHB1dC5zdGRvdXQpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gdGhpcy5jb25kYUhlbHBlci5wYXJzZUNvbmRhRW52aXJvbm1lbnROYW1lcyhlbnZJbmZvKTtcclxuICAgICAgICAgICAgICAgIHlpZWxkIGdsb2JhbFBlcnNpc3RlbmNlLnVwZGF0ZVZhbHVlKHsgZGF0YTogZW52aXJvbm1lbnRzIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudmlyb25tZW50cztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIGdsb2JhbFBlcnNpc3RlbmNlLnVwZGF0ZVZhbHVlKHsgZGF0YTogdW5kZWZpbmVkIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gRmFpbGVkIGJlY2F1c2UgZWl0aGVyOlxyXG4gICAgICAgICAgICAgICAgLy8gICAxLiBjb25kYSBpcyBub3QgaW5zdGFsbGVkLlxyXG4gICAgICAgICAgICAgICAgLy8gICAyLiBgY29uZGEgZW52IGxpc3QgaGFzIGNoYW5nZWQgc2lnbmF0dXJlLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2dnZXIubG9nSW5mb3JtYXRpb24oJ0ZhaWxlZCB0byBnZXQgY29uZGEgZW52aXJvbm1lbnQgbGlzdCBmcm9tIGNvbmRhJywgZXgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFJldHVybiB0aGUgaW50ZXJwcmV0ZXIncyBmaWxlbmFtZSBmb3IgdGhlIGdpdmVuIGVudmlyb25tZW50LlxyXG4gICAgICovXHJcbiAgICBnZXRJbnRlcnByZXRlclBhdGgoY29uZGFFbnZpcm9ubWVudFBhdGgpIHtcclxuICAgICAgICAvLyB3aGVyZSB0byBmaW5kIHRoZSBQeXRob24gYmluYXJ5IHdpdGhpbiBhIGNvbmRhIGVudi5cclxuICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSB0aGlzLnBsYXRmb3JtLmlzV2luZG93cyA/ICdweXRob24uZXhlJyA6IHBhdGguam9pbignYmluJywgJ3B5dGhvbicpO1xyXG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oY29uZGFFbnZpcm9ubWVudFBhdGgsIHJlbGF0aXZlUGF0aCk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIEZvciB0aGUgZ2l2ZW4gaW50ZXJwcmV0ZXIgcmV0dXJuIGFuIGFjdGl2YXRlZCBDb25kYSBlbnZpcm9ubWVudCBvYmplY3RcclxuICAgICAqIHdpdGggdGhlIGNvcnJlY3QgYWRkaXRpb24gdG8gdGhlIHBhdGggYW5kIGVudmlyb25tZW50YWwgdmFyaWFibGVzXHJcbiAgICAgKi9cclxuICAgIC8vIEJhc2UgTm9kZS5qcyBTcGF3bk9wdGlvbnMgdXNlcyBhbnkgZm9yIGVudmlyb25tZW50LCBzbyB1c2UgdGhhdCBoZXJlIGFzIHdlbGxcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgIGdldEFjdGl2YXRlZENvbmRhRW52aXJvbm1lbnQoaW50ZXJwcmV0ZXIsIGlucHV0RW52aXJvbm1lbnQpIHtcclxuICAgICAgICBpZiAoaW50ZXJwcmV0ZXIudHlwZSAhPT0gY29udHJhY3RzXzEuSW50ZXJwcmV0ZXJUeXBlLkNvbmRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgYWN0aXZhdGVkRW52aXJvbm1lbnQgPSBPYmplY3QuYXNzaWduKHt9LCBpbnB1dEVudmlyb25tZW50KTtcclxuICAgICAgICBjb25zdCBpc1dpbmRvd3MgPSB0aGlzLnBsYXRmb3JtLmlzV2luZG93cztcclxuICAgICAgICBpZiAoaW50ZXJwcmV0ZXIuZW52UGF0aCkge1xyXG4gICAgICAgICAgICBpZiAoaXNXaW5kb3dzKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBXaW5kb3dzOiBQYXRoLCA7IGFzIHNlcGFyYXRvciwgJ1NjcmlwdHMnIGFzIGRpcmVjdG9yeVxyXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFQYXRoID0gcGF0aC5qb2luKGludGVycHJldGVyLmVudlBhdGgsICdTY3JpcHRzJyk7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmF0ZWRFbnZpcm9ubWVudC5QYXRoID0gY29uZGFQYXRoLmNvbmNhdCgnOycsIGAke2lucHV0RW52aXJvbm1lbnQuUGF0aCA/IGlucHV0RW52aXJvbm1lbnQuUGF0aCA6ICcnfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gTWFjOiBQQVRILCA6IGFzIHNlcGFyYXRvciwgJ2JpbicgYXMgZGlyZWN0b3J5XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYVBhdGggPSBwYXRoLmpvaW4oaW50ZXJwcmV0ZXIuZW52UGF0aCwgJ2JpbicpO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZhdGVkRW52aXJvbm1lbnQuUEFUSCA9IGNvbmRhUGF0aC5jb25jYXQoJzonLCBgJHtpbnB1dEVudmlyb25tZW50LlBBVEggPyBpbnB1dEVudmlyb25tZW50LlBBVEggOiAnJ31gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBDb25kYSBhbHNvIHdhbnRzIGEgY291cGxlIG9mIGVudmlyb25tZW50YWwgdmFyaWFibGVzIHNldFxyXG4gICAgICAgICAgICBhY3RpdmF0ZWRFbnZpcm9ubWVudC5DT05EQV9QUkVGSVggPSBpbnRlcnByZXRlci5lbnZQYXRoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaW50ZXJwcmV0ZXIuZW52TmFtZSkge1xyXG4gICAgICAgICAgICBhY3RpdmF0ZWRFbnZpcm9ubWVudC5DT05EQV9ERUZBVUxUX0VOViA9IGludGVycHJldGVyLmVudk5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhY3RpdmF0ZWRFbnZpcm9ubWVudDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogSXMgdGhlIGdpdmVuIGludGVycHJldGVyIGZyb20gY29uZGE/XHJcbiAgICAgKi9cclxuICAgIGRldGVjdENvbmRhRW52aXJvbm1lbnQoaW50ZXJwcmV0ZXIpIHtcclxuICAgICAgICByZXR1cm4gaW50ZXJwcmV0ZXIudHlwZSA9PT0gY29udHJhY3RzXzEuSW50ZXJwcmV0ZXJUeXBlLkNvbmRhIHx8XHJcbiAgICAgICAgICAgIChpbnRlcnByZXRlci5kaXNwbGF5TmFtZSA/IGludGVycHJldGVyLmRpc3BsYXlOYW1lIDogJycpLnRvVXBwZXJDYXNlKCkuaW5kZXhPZignQU5BQ09OREEnKSA+PSAwIHx8XHJcbiAgICAgICAgICAgIChpbnRlcnByZXRlci5jb21wYW55RGlzcGxheU5hbWUgPyBpbnRlcnByZXRlci5jb21wYW55RGlzcGxheU5hbWUgOiAnJykudG9VcHBlckNhc2UoKS5pbmRleE9mKCdBTkFDT05EQScpID49IDAgfHxcclxuICAgICAgICAgICAgKGludGVycHJldGVyLmNvbXBhbnlEaXNwbGF5TmFtZSA/IGludGVycHJldGVyLmNvbXBhbnlEaXNwbGF5TmFtZSA6ICcnKS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ0NPTlRJTlVVTScpID49IDA7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFJldHVybiB0aGUgaGlnaGVzdCBQeXRob24gdmVyc2lvbiBmcm9tIHRoZSBnaXZlbiBsaXN0LlxyXG4gICAgICovXHJcbiAgICBnZXRMYXRlc3RWZXJzaW9uKGludGVycHJldGVycykge1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZEludGVycHJldGVycyA9IGludGVycHJldGVycy5maWx0ZXIoaW50ZXJwcmV0ZXIgPT4gaW50ZXJwcmV0ZXIudmVyc2lvbiAmJiBpbnRlcnByZXRlci52ZXJzaW9uLmxlbmd0aCA+IDApO1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1ub24tbnVsbC1hc3NlcnRpb25cclxuICAgICAgICBzb3J0ZWRJbnRlcnByZXRlcnMuc29ydCgoYSwgYikgPT4gdmVyc2lvbl8xLmNvbXBhcmVWZXJzaW9uKGEudmVyc2lvbiwgYi52ZXJzaW9uKSk7XHJcbiAgICAgICAgaWYgKHNvcnRlZEludGVycHJldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzb3J0ZWRJbnRlcnByZXRlcnNbc29ydGVkSW50ZXJwcmV0ZXJzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBcImNvbmRhIGZpbGVcIiwgaWYgdGhlcmUgaXMgb25lIChpbiBrbm93biBsb2NhdGlvbnMpLlxyXG4gICAgICovXHJcbiAgICBnZXRDb25kYUZpbGVJbXBsKCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklDb25maWd1cmF0aW9uU2VydmljZSkuZ2V0U2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgY29uc3QgZmlsZVN5c3RlbSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JRmlsZVN5c3RlbSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmcgPSBzZXR0aW5ncy5jb25kYVBhdGg7XHJcbiAgICAgICAgICAgIGlmIChzZXR0aW5nICYmIHNldHRpbmcgIT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBpc0F2YWlsYWJsZSA9IHlpZWxkIHRoaXMuaXNDb25kYUluQ3VycmVudFBhdGgoKTtcclxuICAgICAgICAgICAgaWYgKGlzQXZhaWxhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NvbmRhJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5wbGF0Zm9ybS5pc1dpbmRvd3MgJiYgdGhpcy5yZWdpc3RyeUxvb2t1cEZvckNvbmRhKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB0aGlzLnJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEuZ2V0SW50ZXJwcmV0ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYUludGVycHJldGVycyA9IGludGVycHJldGVycy5maWx0ZXIodGhpcy5kZXRlY3RDb25kYUVudmlyb25tZW50KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRhSW50ZXJwcmV0ZXIgPSB0aGlzLmdldExhdGVzdFZlcnNpb24oY29uZGFJbnRlcnByZXRlcnMpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbmRhUGF0aCA9IGNvbmRhSW50ZXJwcmV0ZXIgPyBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKGNvbmRhSW50ZXJwcmV0ZXIucGF0aCksICdjb25kYS5leGUnKSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgaWYgKHlpZWxkIGZpbGVTeXN0ZW0uZmlsZUV4aXN0cyhjb25kYVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmRhUGF0aDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIENvbmRhIHBhdGggaGFzIGNoYW5nZWQgbG9jYXRpb25zLCBjaGVjayB0aGUgbmV3IGxvY2F0aW9uIGluIHRoZSBzY3JpcHRzIGRpcmVjdG9yeSBhZnRlciBjaGVja2luZ1xyXG4gICAgICAgICAgICAgICAgLy8gdGhlIG9sZCBsb2NhdGlvblxyXG4gICAgICAgICAgICAgICAgY29uZGFQYXRoID0gY29uZGFJbnRlcnByZXRlciA/IHBhdGguam9pbihwYXRoLmRpcm5hbWUoY29uZGFJbnRlcnByZXRlci5wYXRoKSwgJ1NjcmlwdHMnLCAnY29uZGEuZXhlJykgOiAnJztcclxuICAgICAgICAgICAgICAgIGlmICh5aWVsZCBmaWxlU3lzdGVtLmZpbGVFeGlzdHMoY29uZGFQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25kYVBhdGg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uZGFGaWxlRnJvbUtub3duTG9jYXRpb25zKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFJldHVybiB0aGUgcGF0aCB0byB0aGUgXCJjb25kYSBmaWxlXCIsIGlmIHRoZXJlIGlzIG9uZSAoaW4ga25vd24gbG9jYXRpb25zKS5cclxuICAgICAqIE5vdGU6IEZvciBub3cgd2Ugc2ltcGx5IHJldHVybiB0aGUgZmlyc3Qgb25lIGZvdW5kLlxyXG4gICAgICovXHJcbiAgICBnZXRDb25kYUZpbGVGcm9tS25vd25Mb2NhdGlvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgY29uc3QgZmlsZVN5c3RlbSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JRmlsZVN5c3RlbSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGdsb2JQYXR0ZXJuID0gdGhpcy5wbGF0Zm9ybS5pc1dpbmRvd3MgPyBleHBvcnRzLkNvbmRhTG9jYXRpb25zR2xvYldpbiA6IGV4cG9ydHMuQ29uZGFMb2NhdGlvbnNHbG9iO1xyXG4gICAgICAgICAgICBjb25zdCBjb25kYUZpbGVzID0geWllbGQgZmlsZVN5c3RlbS5zZWFyY2goZ2xvYlBhdHRlcm4pXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goKGZhaWxSZWFzb24pID0+IHtcclxuICAgICAgICAgICAgICAgIGxvZ2dlcl8xLkxvZ2dlci53YXJuKCdEZWZhdWx0IGNvbmRhIGxvY2F0aW9uIHNlYXJjaCBmYWlsZWQuJywgYFNlYXJjaGluZyBmb3IgZGVmYXVsdCBpbnN0YWxsIGxvY2F0aW9ucyBmb3IgY29uZGEgcmVzdWx0cyBpbiBlcnJvcjogJHtmYWlsUmVhc29ufWApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29uc3QgdmFsaWRDb25kYUZpbGVzID0gY29uZGFGaWxlcy5maWx0ZXIoY29uZGFQYXRoID0+IGNvbmRhUGF0aC5sZW5ndGggPiAwKTtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbGlkQ29uZGFGaWxlcy5sZW5ndGggPT09IDAgPyAnY29uZGEnIDogdmFsaWRDb25kYUZpbGVzWzBdO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5Db25kYVNlcnZpY2UgPSBfX2RlY29yYXRlKFtcclxuICAgIGludmVyc2lmeV8xLmluamVjdGFibGUoKSxcclxuICAgIF9fcGFyYW0oMCwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzQuSVNlcnZpY2VDb250YWluZXIpKSxcclxuICAgIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEuaW5qZWN0KGNvbnRyYWN0c18xLklJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlKSksIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEubmFtZWQoY29udHJhY3RzXzEuV0lORE9XU19SRUdJU1RSWV9TRVJWSUNFKSksIF9fcGFyYW0oMSwgaW52ZXJzaWZ5XzEub3B0aW9uYWwoKSlcclxuXSwgQ29uZGFTZXJ2aWNlKTtcclxuZXhwb3J0cy5Db25kYVNlcnZpY2UgPSBDb25kYVNlcnZpY2U7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbmRhU2VydmljZS5qcy5tYXAiXX0=