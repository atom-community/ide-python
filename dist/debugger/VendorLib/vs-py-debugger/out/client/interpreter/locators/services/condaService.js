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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmRhU2VydmljZS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX3BhcmFtIiwicGFyYW1JbmRleCIsImRlY29yYXRvciIsIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJleHBvcnRzIiwiaW52ZXJzaWZ5XzEiLCJyZXF1aXJlIiwicGF0aCIsInNlbXZlcl8xIiwibG9nZ2VyXzEiLCJ0eXBlc18xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJ2ZXJzaW9uXzEiLCJ0eXBlc180IiwiY29udHJhY3RzXzEiLCJjb25kYUhlbHBlcl8xIiwidW50aWxkaWZ5IiwiQ29uZGFMb2NhdGlvbnNHbG9iIiwiY29uZGFHbG9iUGF0aHNGb3JXaW5kb3dzIiwiQ29uZGFMb2NhdGlvbnNHbG9iV2luIiwiam9pbiIsIkNvbmRhU2VydmljZSIsImNvbnN0cnVjdG9yIiwic2VydmljZUNvbnRhaW5lciIsInJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEiLCJjb25kYUhlbHBlciIsIkNvbmRhSGVscGVyIiwicHJvY2Vzc1NlcnZpY2VGYWN0b3J5IiwiZ2V0IiwiSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSIsInBsYXRmb3JtIiwiSVBsYXRmb3JtU2VydmljZSIsImxvZ2dlciIsIklMb2dnZXIiLCJjb25kYUVudmlyb25tZW50c0ZpbGUiLCJob21lRGlyIiwiaXNXaW5kb3dzIiwicHJvY2VzcyIsImVudiIsIlVTRVJQUk9GSUxFIiwiSE9NRSIsIkhPTUVQQVRIIiwidW5kZWZpbmVkIiwiZGlzcG9zZSIsImdldENvbmRhRmlsZSIsImNvbmRhRmlsZSIsImdldENvbmRhRmlsZUltcGwiLCJpc0NvbmRhQXZhaWxhYmxlIiwiaXNBdmFpbGFibGUiLCJnZXRDb25kYVZlcnNpb24iLCJ2ZXJzaW9uIiwiY2F0Y2giLCJwcm9jZXNzU2VydmljZSIsImNyZWF0ZSIsImluZm8iLCJnZXRDb25kYUluZm8iLCJ2ZXJzaW9uU3RyaW5nIiwiY29uZGFfdmVyc2lvbiIsInN0ZE91dCIsImV4ZWMiLCJzdGRvdXQiLCJ0cmltIiwic3RhcnRzV2l0aCIsInN1YnN0cmluZyIsInBhcnNlIiwiTG9nZ2VyIiwid2FybiIsIlNlbVZlciIsImlzQ29uZGFJbkN1cnJlbnRQYXRoIiwib3V0cHV0IiwiY29uZGFJbmZvIiwiSlNPTiIsImV4IiwiaXNDb25kYUVudmlyb25tZW50IiwiaW50ZXJwcmV0ZXJQYXRoIiwiZnMiLCJJRmlsZVN5c3RlbSIsImRpciIsImRpcm5hbWUiLCJjb25kYU1ldGFEaXJlY3RvcnkiLCJkaXJlY3RvcnlFeGlzdHMiLCJnZXRDb25kYUVudmlyb25tZW50IiwiaXNDb25kYUVudiIsImVudmlyb25tZW50cyIsImdldENvbmRhRW52aXJvbm1lbnRzIiwic3ViRGlyTmFtZSIsImJhc2VuYW1lIiwiZ29VcE9uTGV2ZWwiLCJpbmRleE9mIiwidG9VcHBlckNhc2UiLCJpbnRlcnByZXRlclBhdGhUb01hdGNoIiwibWF0Y2hpbmdFbnZzIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwiaXRlbSIsImFyZVBhdGhzU2FtZSIsIm5hbWUiLCJpZ25vcmVDYWNoZSIsInBlcnNpc3RlbnRGYWN0b3J5IiwiSVBlcnNpc3RlbnRTdGF0ZUZhY3RvcnkiLCJnbG9iYWxQZXJzaXN0ZW5jZSIsImNyZWF0ZUdsb2JhbFBlcnNpc3RlbnRTdGF0ZSIsImRhdGEiLCJlbnZJbmZvIiwicGFyc2VDb25kYUVudmlyb25tZW50TmFtZXMiLCJ1cGRhdGVWYWx1ZSIsImxvZ0luZm9ybWF0aW9uIiwiZ2V0SW50ZXJwcmV0ZXJQYXRoIiwiY29uZGFFbnZpcm9ubWVudFBhdGgiLCJyZWxhdGl2ZVBhdGgiLCJnZXRBY3RpdmF0ZWRDb25kYUVudmlyb25tZW50IiwiaW50ZXJwcmV0ZXIiLCJpbnB1dEVudmlyb25tZW50IiwidHlwZSIsIkludGVycHJldGVyVHlwZSIsIkNvbmRhIiwiYWN0aXZhdGVkRW52aXJvbm1lbnQiLCJhc3NpZ24iLCJlbnZQYXRoIiwiY29uZGFQYXRoIiwiUGF0aCIsImNvbmNhdCIsIlBBVEgiLCJDT05EQV9QUkVGSVgiLCJlbnZOYW1lIiwiQ09OREFfREVGQVVMVF9FTlYiLCJkZXRlY3RDb25kYUVudmlyb25tZW50IiwiZGlzcGxheU5hbWUiLCJjb21wYW55RGlzcGxheU5hbWUiLCJnZXRMYXRlc3RWZXJzaW9uIiwiaW50ZXJwcmV0ZXJzIiwic29ydGVkSW50ZXJwcmV0ZXJzIiwic29ydCIsImEiLCJiIiwiY29tcGFyZVZlcnNpb24iLCJzZXR0aW5ncyIsIklDb25maWd1cmF0aW9uU2VydmljZSIsImdldFNldHRpbmdzIiwiZmlsZVN5c3RlbSIsInNldHRpbmciLCJnZXRJbnRlcnByZXRlcnMiLCJjb25kYUludGVycHJldGVycyIsImNvbmRhSW50ZXJwcmV0ZXIiLCJmaWxlRXhpc3RzIiwiZ2V0Q29uZGFGaWxlRnJvbUtub3duTG9jYXRpb25zIiwiZ2xvYlBhdHRlcm4iLCJjb25kYUZpbGVzIiwic2VhcmNoIiwiZmFpbFJlYXNvbiIsInZhbGlkQ29uZGFGaWxlcyIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciIsIklJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlIiwibmFtZWQiLCJXSU5ET1dTX1JFR0lTVFJZX1NFUlZJQ0UiLCJvcHRpb25hbCJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxN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V0FBVyxDQUFDcUosTUFBWixDQUFtQjVJLE9BQU8sQ0FBQzZJLGlCQUEzQixDQUFKLENBRmUsRUFHdEI1SyxPQUFPLENBQUMsQ0FBRCxFQUFJc0IsV0FBVyxDQUFDcUosTUFBWixDQUFtQjNJLFdBQVcsQ0FBQzZJLDBCQUEvQixDQUFKLENBSGUsRUFHa0Q3SyxPQUFPLENBQUMsQ0FBRCxFQUFJc0IsV0FBVyxDQUFDd0osS0FBWixDQUFrQjlJLFdBQVcsQ0FBQytJLHdCQUE5QixDQUFKLENBSHpELEVBR3VIL0ssT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQzBKLFFBQVosRUFBSixDQUg5SCxDQUFELEVBSXRCekksWUFKc0IsQ0FBekI7QUFLQWxCLE9BQU8sQ0FBQ2tCLFlBQVIsR0FBdUJBLFlBQXZCIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgX19wYXJhbSA9ICh0aGlzICYmIHRoaXMuX19wYXJhbSkgfHwgZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgaW52ZXJzaWZ5XzEgPSByZXF1aXJlKFwiaW52ZXJzaWZ5XCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3Qgc2VtdmVyXzEgPSByZXF1aXJlKFwic2VtdmVyXCIpO1xuY29uc3QgbG9nZ2VyXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL2xvZ2dlclwiKTtcbmNvbnN0IHR5cGVzXzEgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3BsYXRmb3JtL3R5cGVzXCIpO1xuY29uc3QgdHlwZXNfMiA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb21tb24vcHJvY2Vzcy90eXBlc1wiKTtcbmNvbnN0IHR5cGVzXzMgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3R5cGVzXCIpO1xuY29uc3QgdmVyc2lvbl8xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvbW1vbi91dGlscy92ZXJzaW9uXCIpO1xuY29uc3QgdHlwZXNfNCA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pb2MvdHlwZXNcIik7XG5jb25zdCBjb250cmFjdHNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jb250cmFjdHNcIik7XG5jb25zdCBjb25kYUhlbHBlcl8xID0gcmVxdWlyZShcIi4vY29uZGFIZWxwZXJcIik7XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzIG5vLXZhci1yZXF1aXJlc1xuY29uc3QgdW50aWxkaWZ5ID0gcmVxdWlyZSgndW50aWxkaWZ5Jyk7XG4vLyBUaGlzIGdsb2IgcGF0dGVybiB3aWxsIG1hdGNoIGFsbCBvZiB0aGUgZm9sbG93aW5nOlxuLy8gfi9hbmFjb25kYS9iaW4vY29uZGEsIH4vYW5hY29uZGEzL2Jpbi9jb25kYSwgfi9taW5pY29uZGEvYmluL2NvbmRhLCB+L21pbmljb25kYTMvYmluL2NvbmRhXG5leHBvcnRzLkNvbmRhTG9jYXRpb25zR2xvYiA9IHVudGlsZGlmeSgnfi8qY29uZGEqL2Jpbi9jb25kYScpO1xuLy8gLi4uYW5kIGZvciB3aW5kb3dzLCB0aGUga25vd24gZGVmYXVsdCBpbnN0YWxsIGxvY2F0aW9uczpcbmNvbnN0IGNvbmRhR2xvYlBhdGhzRm9yV2luZG93cyA9IFtcbiAgICAnL1Byb2dyYW1EYXRhL1tNbV1pbmljb25kYSovU2NyaXB0cy9jb25kYS5leGUnLFxuICAgICcvUHJvZ3JhbURhdGEvW0FhXW5hY29uZGEqL1NjcmlwdHMvY29uZGEuZXhlJyxcbiAgICB1bnRpbGRpZnkoJ34vW01tXWluaWNvbmRhKi9TY3JpcHRzL2NvbmRhLmV4ZScpLFxuICAgIHVudGlsZGlmeSgnfi9bQWFdbmFjb25kYSovU2NyaXB0cy9jb25kYS5leGUnKSxcbiAgICB1bnRpbGRpZnkoJ34vQXBwRGF0YS9Mb2NhbC9Db250aW51dW0vW01tXWluaWNvbmRhKi9TY3JpcHRzL2NvbmRhLmV4ZScpLFxuICAgIHVudGlsZGlmeSgnfi9BcHBEYXRhL0xvY2FsL0NvbnRpbnV1bS9bQWFdbmFjb25kYSovU2NyaXB0cy9jb25kYS5leGUnKVxuXTtcbi8vIGZvcm1hdCBmb3IgZ2xvYiBwcm9jZXNzaW5nOlxuZXhwb3J0cy5Db25kYUxvY2F0aW9uc0dsb2JXaW4gPSBgeyR7Y29uZGFHbG9iUGF0aHNGb3JXaW5kb3dzLmpvaW4oJywnKX19YDtcbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCBhIGNvbmRhIGluc3RhbGxhdGlvbi5cbiAqL1xubGV0IENvbmRhU2VydmljZSA9IGNsYXNzIENvbmRhU2VydmljZSB7XG4gICAgY29uc3RydWN0b3Ioc2VydmljZUNvbnRhaW5lciwgcmVnaXN0cnlMb29rdXBGb3JDb25kYSkge1xuICAgICAgICB0aGlzLnNlcnZpY2VDb250YWluZXIgPSBzZXJ2aWNlQ29udGFpbmVyO1xuICAgICAgICB0aGlzLnJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEgPSByZWdpc3RyeUxvb2t1cEZvckNvbmRhO1xuICAgICAgICB0aGlzLmNvbmRhSGVscGVyID0gbmV3IGNvbmRhSGVscGVyXzEuQ29uZGFIZWxwZXIoKTtcbiAgICAgICAgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzIuSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSk7XG4gICAgICAgIHRoaXMucGxhdGZvcm0gPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSVBsYXRmb3JtU2VydmljZSk7XG4gICAgICAgIHRoaXMubG9nZ2VyID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklMb2dnZXIpO1xuICAgIH1cbiAgICBnZXQgY29uZGFFbnZpcm9ubWVudHNGaWxlKCkge1xuICAgICAgICBjb25zdCBob21lRGlyID0gdGhpcy5wbGF0Zm9ybS5pc1dpbmRvd3MgPyBwcm9jZXNzLmVudi5VU0VSUFJPRklMRSA6IChwcm9jZXNzLmVudi5IT01FIHx8IHByb2Nlc3MuZW52LkhPTUVQQVRIKTtcbiAgICAgICAgcmV0dXJuIGhvbWVEaXIgPyBwYXRoLmpvaW4oaG9tZURpciwgJy5jb25kYScsICdlbnZpcm9ubWVudHMudHh0JykgOiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlbGVhc2UgYW55IGhlbGQgcmVzb3VyY2VzLlxuICAgICAqXG4gICAgICogQ2FsbGVkIGJ5IFZTIENvZGUgdG8gaW5kaWNhdGUgaXQgaXMgZG9uZSB3aXRoIHRoZSByZXNvdXJjZS5cbiAgICAgKi9cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICBkaXNwb3NlKCkgeyB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBcImNvbmRhIGZpbGVcIi5cbiAgICAgKi9cbiAgICBnZXRDb25kYUZpbGUoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY29uZGFGaWxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25kYUZpbGUgPSB0aGlzLmdldENvbmRhRmlsZUltcGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bm5lY2Vzc2FyeS1sb2NhbC12YXJpYWJsZVxuICAgICAgICAgICAgY29uc3QgY29uZGFGaWxlID0geWllbGQgdGhpcy5jb25kYUZpbGU7XG4gICAgICAgICAgICByZXR1cm4gY29uZGFGaWxlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSXMgdGhlcmUgYSBjb25kYSBpbnN0YWxsIHRvIHVzZT9cbiAgICAgKi9cbiAgICBpc0NvbmRhQXZhaWxhYmxlKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmlzQXZhaWxhYmxlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc0F2YWlsYWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbmRhVmVyc2lvbigpXG4gICAgICAgICAgICAgICAgLnRoZW4odmVyc2lvbiA9PiB0aGlzLmlzQXZhaWxhYmxlID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB0aGlzLmlzQXZhaWxhYmxlID0gZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBjb25kYSB2ZXJzaW9uLlxuICAgICAqL1xuICAgIGdldENvbmRhVmVyc2lvbigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NTZXJ2aWNlID0geWllbGQgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkuY3JlYXRlKCk7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0geWllbGQgdGhpcy5nZXRDb25kYUluZm8oKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpO1xuICAgICAgICAgICAgbGV0IHZlcnNpb25TdHJpbmc7XG4gICAgICAgICAgICBpZiAoaW5mbyAmJiBpbmZvLmNvbmRhX3ZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uU3RyaW5nID0gaW5mby5jb25kYV92ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RkT3V0ID0geWllbGQgdGhpcy5nZXRDb25kYUZpbGUoKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihjb25kYUZpbGUgPT4gcHJvY2Vzc1NlcnZpY2UuZXhlYyhjb25kYUZpbGUsIFsnLS12ZXJzaW9uJ10sIHt9KSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzdWx0ID0+IHJlc3VsdC5zdGRvdXQudHJpbSgpKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uU3RyaW5nID0gKHN0ZE91dCAmJiBzdGRPdXQuc3RhcnRzV2l0aCgnY29uZGEgJykpID8gc3RkT3V0LnN1YnN0cmluZygnY29uZGEgJy5sZW5ndGgpLnRyaW0oKSA6IHN0ZE91dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdmVyc2lvblN0cmluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBzZW12ZXJfMS5wYXJzZSh2ZXJzaW9uU3RyaW5nLCB0cnVlKTtcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZlcnNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVc2UgYSBib2d1cyB2ZXJzaW9uLCBhdCBsZWFzdCB0byBpbmRpY2F0ZSB0aGUgZmFjdCB0aGF0IGEgdmVyc2lvbiB3YXMgcmV0dXJuZWQuXG4gICAgICAgICAgICBsb2dnZXJfMS5Mb2dnZXIud2FybihgVW5hYmxlIHRvIHBhcnNlIFZlcnNpb24gb2YgQ29uZGEsICR7dmVyc2lvblN0cmluZ31gKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgc2VtdmVyXzEuU2VtVmVyKCcwLjAuMScpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FuIHRoZSBzaGVsbCBmaW5kIGNvbmRhICh0byBydW4gaXQpP1xuICAgICAqL1xuICAgIGlzQ29uZGFJbkN1cnJlbnRQYXRoKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1NlcnZpY2UgPSB5aWVsZCB0aGlzLnByb2Nlc3NTZXJ2aWNlRmFjdG9yeS5jcmVhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzU2VydmljZS5leGVjKCdjb25kYScsIFsnLS12ZXJzaW9uJ10pXG4gICAgICAgICAgICAgICAgLnRoZW4ob3V0cHV0ID0+IG91dHB1dC5zdGRvdXQubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBpbmZvIHJlcG9ydGVkIGJ5IHRoZSBjb25kYSBpbnN0YWxsLlxuICAgICAqL1xuICAgIGdldENvbmRhSW5mbygpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFGaWxlID0geWllbGQgdGhpcy5nZXRDb25kYUZpbGUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzU2VydmljZSA9IHlpZWxkIHRoaXMucHJvY2Vzc1NlcnZpY2VGYWN0b3J5LmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRhSW5mbyA9IHlpZWxkIHByb2Nlc3NTZXJ2aWNlLmV4ZWMoY29uZGFGaWxlLCBbJ2luZm8nLCAnLS1qc29uJ10pLnRoZW4ob3V0cHV0ID0+IG91dHB1dC5zdGRvdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGNvbmRhSW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgYmVjYXVzZSBlaXRoZXI6XG4gICAgICAgICAgICAgICAgLy8gICAxLiBjb25kYSBpcyBub3QgaW5zdGFsbGVkLlxuICAgICAgICAgICAgICAgIC8vICAgMi4gYGNvbmRhIGluZm8gLS1qc29uYCBoYXMgY2hhbmdlZCBzaWduYXR1cmUuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBweXRob24gaW50ZXJwcmV0ZXIgaXMgYSBjb25kYSBlbnZpcm9ubWVudCBvciBub3QuXG4gICAgICogVGhlIGNoZWNrIGlzIGRvbmUgYnkgc2ltcGx5IGxvb2tpbmcgZm9yIHRoZSAnY29uZGEtbWV0YScgZGlyZWN0b3J5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcnByZXRlclBhdGhcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn1cbiAgICAgKiBAbWVtYmVyb2YgQ29uZGFTZXJ2aWNlXG4gICAgICovXG4gICAgaXNDb25kYUVudmlyb25tZW50KGludGVycHJldGVyUGF0aCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgZnMgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xuICAgICAgICAgICAgY29uc3QgZGlyID0gcGF0aC5kaXJuYW1lKGludGVycHJldGVyUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBpc1dpbmRvd3MgPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSVBsYXRmb3JtU2VydmljZSkuaXNXaW5kb3dzO1xuICAgICAgICAgICAgY29uc3QgY29uZGFNZXRhRGlyZWN0b3J5ID0gaXNXaW5kb3dzID8gcGF0aC5qb2luKGRpciwgJ2NvbmRhLW1ldGEnKSA6IHBhdGguam9pbihkaXIsICcuLicsICdjb25kYS1tZXRhJyk7XG4gICAgICAgICAgICByZXR1cm4gZnMuZGlyZWN0b3J5RXhpc3RzKGNvbmRhTWV0YURpcmVjdG9yeSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gKGVudiBuYW1lLCBpbnRlcnByZXRlciBmaWxlbmFtZSkgZm9yIHRoZSBpbnRlcnByZXRlci5cbiAgICAgKi9cbiAgICBnZXRDb25kYUVudmlyb25tZW50KGludGVycHJldGVyUGF0aCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgY29uc3QgaXNDb25kYUVudiA9IHlpZWxkIHRoaXMuaXNDb25kYUVudmlyb25tZW50KGludGVycHJldGVyUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWlzQ29uZGFFbnYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgZW52aXJvbm1lbnRzID0geWllbGQgdGhpcy5nZXRDb25kYUVudmlyb25tZW50cyhmYWxzZSk7XG4gICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmRpcm5hbWUoaW50ZXJwcmV0ZXJQYXRoKTtcbiAgICAgICAgICAgIC8vIElmIGludGVycHJldGVyIGlzIGluIGJpbiBvciBTY3JpcHRzLCB0aGVuIGdvIHVwIG9uZSBsZXZlbFxuICAgICAgICAgICAgY29uc3Qgc3ViRGlyTmFtZSA9IHBhdGguYmFzZW5hbWUoZGlyKTtcbiAgICAgICAgICAgIGNvbnN0IGdvVXBPbkxldmVsID0gWydCSU4nLCAnU0NSSVBUUyddLmluZGV4T2Yoc3ViRGlyTmFtZS50b1VwcGVyQ2FzZSgpKSAhPT0gLTE7XG4gICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlclBhdGhUb01hdGNoID0gZ29VcE9uTGV2ZWwgPyBwYXRoLmpvaW4oZGlyLCAnLi4nKSA6IGRpcjtcbiAgICAgICAgICAgIGNvbnN0IGZzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklGaWxlU3lzdGVtKTtcbiAgICAgICAgICAgIC8vIEZyb20gdGhlIGxpc3Qgb2YgY29uZGEgZW52aXJvbm1lbnRzIGZpbmQgdGhpcyBkaXIuXG4gICAgICAgICAgICBsZXQgbWF0Y2hpbmdFbnZzID0gQXJyYXkuaXNBcnJheShlbnZpcm9ubWVudHMpID8gZW52aXJvbm1lbnRzLmZpbHRlcihpdGVtID0+IGZzLmFyZVBhdGhzU2FtZShpdGVtLnBhdGgsIGludGVycHJldGVyUGF0aFRvTWF0Y2gpKSA6IFtdO1xuICAgICAgICAgICAgaWYgKG1hdGNoaW5nRW52cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudHMgPSB5aWVsZCB0aGlzLmdldENvbmRhRW52aXJvbm1lbnRzKHRydWUpO1xuICAgICAgICAgICAgICAgIG1hdGNoaW5nRW52cyA9IEFycmF5LmlzQXJyYXkoZW52aXJvbm1lbnRzKSA/IGVudmlyb25tZW50cy5maWx0ZXIoaXRlbSA9PiBmcy5hcmVQYXRoc1NhbWUoaXRlbS5wYXRoLCBpbnRlcnByZXRlclBhdGhUb01hdGNoKSkgOiBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXRjaGluZ0VudnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IG1hdGNoaW5nRW52c1swXS5uYW1lLCBwYXRoOiBpbnRlcnByZXRlclBhdGhUb01hdGNoIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiBzdGlsbCBub3QgYXZhaWxhYmxlLCB0aGVuIHRoZSB1c2VyIGNyZWF0ZWQgdGhlIGVudiBhZnRlciBzdGFydGluZyB2cyBjb2RlLlxuICAgICAgICAgICAgLy8gVGhlIG9ubHkgc29sdXRpb24gaXMgdG8gZ2V0IHRoZSB1c2VyIHRvIHJlLXN0YXJ0IHZzY29kZS5cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgbGlzdCBvZiBjb25kYSBlbnZzIChieSBuYW1lLCBpbnRlcnByZXRlciBmaWxlbmFtZSkuXG4gICAgICovXG4gICAgZ2V0Q29uZGFFbnZpcm9ubWVudHMoaWdub3JlQ2FjaGUpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIC8vIEdsb2JhbCBjYWNoZS5cbiAgICAgICAgICAgIGNvbnN0IHBlcnNpc3RlbnRGYWN0b3J5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklQZXJzaXN0ZW50U3RhdGVGYWN0b3J5KTtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgIGNvbnN0IGdsb2JhbFBlcnNpc3RlbmNlID0gcGVyc2lzdGVudEZhY3RvcnkuY3JlYXRlR2xvYmFsUGVyc2lzdGVudFN0YXRlKCdDT05EQV9FTlZJUk9OTUVOVFMnLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgaWYgKCFpZ25vcmVDYWNoZSAmJiBnbG9iYWxQZXJzaXN0ZW5jZS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxQZXJzaXN0ZW5jZS52YWx1ZS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYUZpbGUgPSB5aWVsZCB0aGlzLmdldENvbmRhRmlsZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NTZXJ2aWNlID0geWllbGQgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW52SW5mbyA9IHlpZWxkIHByb2Nlc3NTZXJ2aWNlLmV4ZWMoY29uZGFGaWxlLCBbJ2VudicsICdsaXN0J10pLnRoZW4ob3V0cHV0ID0+IG91dHB1dC5zdGRvdXQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudmlyb25tZW50cyA9IHRoaXMuY29uZGFIZWxwZXIucGFyc2VDb25kYUVudmlyb25tZW50TmFtZXMoZW52SW5mbyk7XG4gICAgICAgICAgICAgICAgeWllbGQgZ2xvYmFsUGVyc2lzdGVuY2UudXBkYXRlVmFsdWUoeyBkYXRhOiBlbnZpcm9ubWVudHMgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudmlyb25tZW50cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgIHlpZWxkIGdsb2JhbFBlcnNpc3RlbmNlLnVwZGF0ZVZhbHVlKHsgZGF0YTogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCBiZWNhdXNlIGVpdGhlcjpcbiAgICAgICAgICAgICAgICAvLyAgIDEuIGNvbmRhIGlzIG5vdCBpbnN0YWxsZWQuXG4gICAgICAgICAgICAgICAgLy8gICAyLiBgY29uZGEgZW52IGxpc3QgaGFzIGNoYW5nZWQgc2lnbmF0dXJlLlxuICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZ0luZm9ybWF0aW9uKCdGYWlsZWQgdG8gZ2V0IGNvbmRhIGVudmlyb25tZW50IGxpc3QgZnJvbSBjb25kYScsIGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaW50ZXJwcmV0ZXIncyBmaWxlbmFtZSBmb3IgdGhlIGdpdmVuIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIGdldEludGVycHJldGVyUGF0aChjb25kYUVudmlyb25tZW50UGF0aCkge1xuICAgICAgICAvLyB3aGVyZSB0byBmaW5kIHRoZSBQeXRob24gYmluYXJ5IHdpdGhpbiBhIGNvbmRhIGVudi5cbiAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gdGhpcy5wbGF0Zm9ybS5pc1dpbmRvd3MgPyAncHl0aG9uLmV4ZScgOiBwYXRoLmpvaW4oJ2JpbicsICdweXRob24nKTtcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihjb25kYUVudmlyb25tZW50UGF0aCwgcmVsYXRpdmVQYXRoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRm9yIHRoZSBnaXZlbiBpbnRlcnByZXRlciByZXR1cm4gYW4gYWN0aXZhdGVkIENvbmRhIGVudmlyb25tZW50IG9iamVjdFxuICAgICAqIHdpdGggdGhlIGNvcnJlY3QgYWRkaXRpb24gdG8gdGhlIHBhdGggYW5kIGVudmlyb25tZW50YWwgdmFyaWFibGVzXG4gICAgICovXG4gICAgLy8gQmFzZSBOb2RlLmpzIFNwYXduT3B0aW9ucyB1c2VzIGFueSBmb3IgZW52aXJvbm1lbnQsIHNvIHVzZSB0aGF0IGhlcmUgYXMgd2VsbFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBnZXRBY3RpdmF0ZWRDb25kYUVudmlyb25tZW50KGludGVycHJldGVyLCBpbnB1dEVudmlyb25tZW50KSB7XG4gICAgICAgIGlmIChpbnRlcnByZXRlci50eXBlICE9PSBjb250cmFjdHNfMS5JbnRlcnByZXRlclR5cGUuQ29uZGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhY3RpdmF0ZWRFbnZpcm9ubWVudCA9IE9iamVjdC5hc3NpZ24oe30sIGlucHV0RW52aXJvbm1lbnQpO1xuICAgICAgICBjb25zdCBpc1dpbmRvd3MgPSB0aGlzLnBsYXRmb3JtLmlzV2luZG93cztcbiAgICAgICAgaWYgKGludGVycHJldGVyLmVudlBhdGgpIHtcbiAgICAgICAgICAgIGlmIChpc1dpbmRvd3MpIHtcbiAgICAgICAgICAgICAgICAvLyBXaW5kb3dzOiBQYXRoLCA7IGFzIHNlcGFyYXRvciwgJ1NjcmlwdHMnIGFzIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRhUGF0aCA9IHBhdGguam9pbihpbnRlcnByZXRlci5lbnZQYXRoLCAnU2NyaXB0cycpO1xuICAgICAgICAgICAgICAgIGFjdGl2YXRlZEVudmlyb25tZW50LlBhdGggPSBjb25kYVBhdGguY29uY2F0KCc7JywgYCR7aW5wdXRFbnZpcm9ubWVudC5QYXRoID8gaW5wdXRFbnZpcm9ubWVudC5QYXRoIDogJyd9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBNYWM6IFBBVEgsIDogYXMgc2VwYXJhdG9yLCAnYmluJyBhcyBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYVBhdGggPSBwYXRoLmpvaW4oaW50ZXJwcmV0ZXIuZW52UGF0aCwgJ2JpbicpO1xuICAgICAgICAgICAgICAgIGFjdGl2YXRlZEVudmlyb25tZW50LlBBVEggPSBjb25kYVBhdGguY29uY2F0KCc6JywgYCR7aW5wdXRFbnZpcm9ubWVudC5QQVRIID8gaW5wdXRFbnZpcm9ubWVudC5QQVRIIDogJyd9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDb25kYSBhbHNvIHdhbnRzIGEgY291cGxlIG9mIGVudmlyb25tZW50YWwgdmFyaWFibGVzIHNldFxuICAgICAgICAgICAgYWN0aXZhdGVkRW52aXJvbm1lbnQuQ09OREFfUFJFRklYID0gaW50ZXJwcmV0ZXIuZW52UGF0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW50ZXJwcmV0ZXIuZW52TmFtZSkge1xuICAgICAgICAgICAgYWN0aXZhdGVkRW52aXJvbm1lbnQuQ09OREFfREVGQVVMVF9FTlYgPSBpbnRlcnByZXRlci5lbnZOYW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhY3RpdmF0ZWRFbnZpcm9ubWVudDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSXMgdGhlIGdpdmVuIGludGVycHJldGVyIGZyb20gY29uZGE/XG4gICAgICovXG4gICAgZGV0ZWN0Q29uZGFFbnZpcm9ubWVudChpbnRlcnByZXRlcikge1xuICAgICAgICByZXR1cm4gaW50ZXJwcmV0ZXIudHlwZSA9PT0gY29udHJhY3RzXzEuSW50ZXJwcmV0ZXJUeXBlLkNvbmRhIHx8XG4gICAgICAgICAgICAoaW50ZXJwcmV0ZXIuZGlzcGxheU5hbWUgPyBpbnRlcnByZXRlci5kaXNwbGF5TmFtZSA6ICcnKS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ0FOQUNPTkRBJykgPj0gMCB8fFxuICAgICAgICAgICAgKGludGVycHJldGVyLmNvbXBhbnlEaXNwbGF5TmFtZSA/IGludGVycHJldGVyLmNvbXBhbnlEaXNwbGF5TmFtZSA6ICcnKS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ0FOQUNPTkRBJykgPj0gMCB8fFxuICAgICAgICAgICAgKGludGVycHJldGVyLmNvbXBhbnlEaXNwbGF5TmFtZSA/IGludGVycHJldGVyLmNvbXBhbnlEaXNwbGF5TmFtZSA6ICcnKS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ0NPTlRJTlVVTScpID49IDA7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaGlnaGVzdCBQeXRob24gdmVyc2lvbiBmcm9tIHRoZSBnaXZlbiBsaXN0LlxuICAgICAqL1xuICAgIGdldExhdGVzdFZlcnNpb24oaW50ZXJwcmV0ZXJzKSB7XG4gICAgICAgIGNvbnN0IHNvcnRlZEludGVycHJldGVycyA9IGludGVycHJldGVycy5maWx0ZXIoaW50ZXJwcmV0ZXIgPT4gaW50ZXJwcmV0ZXIudmVyc2lvbiAmJiBpbnRlcnByZXRlci52ZXJzaW9uLmxlbmd0aCA+IDApO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIHNvcnRlZEludGVycHJldGVycy5zb3J0KChhLCBiKSA9PiB2ZXJzaW9uXzEuY29tcGFyZVZlcnNpb24oYS52ZXJzaW9uLCBiLnZlcnNpb24pKTtcbiAgICAgICAgaWYgKHNvcnRlZEludGVycHJldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gc29ydGVkSW50ZXJwcmV0ZXJzW3NvcnRlZEludGVycHJldGVycy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHBhdGggdG8gdGhlIFwiY29uZGEgZmlsZVwiLCBpZiB0aGVyZSBpcyBvbmUgKGluIGtub3duIGxvY2F0aW9ucykuXG4gICAgICovXG4gICAgZ2V0Q29uZGFGaWxlSW1wbCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18zLklDb25maWd1cmF0aW9uU2VydmljZSkuZ2V0U2V0dGluZ3MoKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVTeXN0ZW0gPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZyA9IHNldHRpbmdzLmNvbmRhUGF0aDtcbiAgICAgICAgICAgIGlmIChzZXR0aW5nICYmIHNldHRpbmcgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpc0F2YWlsYWJsZSA9IHlpZWxkIHRoaXMuaXNDb25kYUluQ3VycmVudFBhdGgoKTtcbiAgICAgICAgICAgIGlmIChpc0F2YWlsYWJsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnY29uZGEnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGxhdGZvcm0uaXNXaW5kb3dzICYmIHRoaXMucmVnaXN0cnlMb29rdXBGb3JDb25kYSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGludGVycHJldGVycyA9IHlpZWxkIHRoaXMucmVnaXN0cnlMb29rdXBGb3JDb25kYS5nZXRJbnRlcnByZXRlcnMoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYUludGVycHJldGVycyA9IGludGVycHJldGVycy5maWx0ZXIodGhpcy5kZXRlY3RDb25kYUVudmlyb25tZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYUludGVycHJldGVyID0gdGhpcy5nZXRMYXRlc3RWZXJzaW9uKGNvbmRhSW50ZXJwcmV0ZXJzKTtcbiAgICAgICAgICAgICAgICBsZXQgY29uZGFQYXRoID0gY29uZGFJbnRlcnByZXRlciA/IHBhdGguam9pbihwYXRoLmRpcm5hbWUoY29uZGFJbnRlcnByZXRlci5wYXRoKSwgJ2NvbmRhLmV4ZScpIDogJyc7XG4gICAgICAgICAgICAgICAgaWYgKHlpZWxkIGZpbGVTeXN0ZW0uZmlsZUV4aXN0cyhjb25kYVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25kYVBhdGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIENvbmRhIHBhdGggaGFzIGNoYW5nZWQgbG9jYXRpb25zLCBjaGVjayB0aGUgbmV3IGxvY2F0aW9uIGluIHRoZSBzY3JpcHRzIGRpcmVjdG9yeSBhZnRlciBjaGVja2luZ1xuICAgICAgICAgICAgICAgIC8vIHRoZSBvbGQgbG9jYXRpb25cbiAgICAgICAgICAgICAgICBjb25kYVBhdGggPSBjb25kYUludGVycHJldGVyID8gcGF0aC5qb2luKHBhdGguZGlybmFtZShjb25kYUludGVycHJldGVyLnBhdGgpLCAnU2NyaXB0cycsICdjb25kYS5leGUnKSA6ICcnO1xuICAgICAgICAgICAgICAgIGlmICh5aWVsZCBmaWxlU3lzdGVtLmZpbGVFeGlzdHMoY29uZGFQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uZGFQYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbmRhRmlsZUZyb21Lbm93bkxvY2F0aW9ucygpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBcImNvbmRhIGZpbGVcIiwgaWYgdGhlcmUgaXMgb25lIChpbiBrbm93biBsb2NhdGlvbnMpLlxuICAgICAqIE5vdGU6IEZvciBub3cgd2Ugc2ltcGx5IHJldHVybiB0aGUgZmlyc3Qgb25lIGZvdW5kLlxuICAgICAqL1xuICAgIGdldENvbmRhRmlsZUZyb21Lbm93bkxvY2F0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVTeXN0ZW0gPSB0aGlzLnNlcnZpY2VDb250YWluZXIuZ2V0KHR5cGVzXzEuSUZpbGVTeXN0ZW0pO1xuICAgICAgICAgICAgY29uc3QgZ2xvYlBhdHRlcm4gPSB0aGlzLnBsYXRmb3JtLmlzV2luZG93cyA/IGV4cG9ydHMuQ29uZGFMb2NhdGlvbnNHbG9iV2luIDogZXhwb3J0cy5Db25kYUxvY2F0aW9uc0dsb2I7XG4gICAgICAgICAgICBjb25zdCBjb25kYUZpbGVzID0geWllbGQgZmlsZVN5c3RlbS5zZWFyY2goZ2xvYlBhdHRlcm4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKChmYWlsUmVhc29uKSA9PiB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyXzEuTG9nZ2VyLndhcm4oJ0RlZmF1bHQgY29uZGEgbG9jYXRpb24gc2VhcmNoIGZhaWxlZC4nLCBgU2VhcmNoaW5nIGZvciBkZWZhdWx0IGluc3RhbGwgbG9jYXRpb25zIGZvciBjb25kYSByZXN1bHRzIGluIGVycm9yOiAke2ZhaWxSZWFzb259YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB2YWxpZENvbmRhRmlsZXMgPSBjb25kYUZpbGVzLmZpbHRlcihjb25kYVBhdGggPT4gY29uZGFQYXRoLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgcmV0dXJuIHZhbGlkQ29uZGFGaWxlcy5sZW5ndGggPT09IDAgPyAnY29uZGEnIDogdmFsaWRDb25kYUZpbGVzWzBdO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuQ29uZGFTZXJ2aWNlID0gX19kZWNvcmF0ZShbXG4gICAgaW52ZXJzaWZ5XzEuaW5qZWN0YWJsZSgpLFxuICAgIF9fcGFyYW0oMCwgaW52ZXJzaWZ5XzEuaW5qZWN0KHR5cGVzXzQuSVNlcnZpY2VDb250YWluZXIpKSxcbiAgICBfX3BhcmFtKDEsIGludmVyc2lmeV8xLmluamVjdChjb250cmFjdHNfMS5JSW50ZXJwcmV0ZXJMb2NhdG9yU2VydmljZSkpLCBfX3BhcmFtKDEsIGludmVyc2lmeV8xLm5hbWVkKGNvbnRyYWN0c18xLldJTkRPV1NfUkVHSVNUUllfU0VSVklDRSkpLCBfX3BhcmFtKDEsIGludmVyc2lmeV8xLm9wdGlvbmFsKCkpXG5dLCBDb25kYVNlcnZpY2UpO1xuZXhwb3J0cy5Db25kYVNlcnZpY2UgPSBDb25kYVNlcnZpY2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb25kYVNlcnZpY2UuanMubWFwIl19