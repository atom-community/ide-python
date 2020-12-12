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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmRhU2VydmljZS5qcyJdLCJuYW1lcyI6WyJfX2RlY29yYXRlIiwiZGVjb3JhdG9ycyIsInRhcmdldCIsImtleSIsImRlc2MiLCJjIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiciIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImQiLCJSZWZsZWN0IiwiZGVjb3JhdGUiLCJpIiwiZGVmaW5lUHJvcGVydHkiLCJfX3BhcmFtIiwicGFyYW1JbmRleCIsImRlY29yYXRvciIsIl9fYXdhaXRlciIsInRoaXNBcmciLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZnVsZmlsbGVkIiwidmFsdWUiLCJzdGVwIiwibmV4dCIsImUiLCJyZWplY3RlZCIsInJlc3VsdCIsImRvbmUiLCJ0aGVuIiwiYXBwbHkiLCJleHBvcnRzIiwiaW52ZXJzaWZ5XzEiLCJyZXF1aXJlIiwicGF0aCIsInNlbXZlcl8xIiwibG9nZ2VyXzEiLCJ0eXBlc18xIiwidHlwZXNfMiIsInR5cGVzXzMiLCJ2ZXJzaW9uXzEiLCJ0eXBlc180IiwiY29udHJhY3RzXzEiLCJjb25kYUhlbHBlcl8xIiwidW50aWxkaWZ5IiwiQ29uZGFMb2NhdGlvbnNHbG9iIiwiY29uZGFHbG9iUGF0aHNGb3JXaW5kb3dzIiwiQ29uZGFMb2NhdGlvbnNHbG9iV2luIiwiam9pbiIsIkNvbmRhU2VydmljZSIsImNvbnN0cnVjdG9yIiwic2VydmljZUNvbnRhaW5lciIsInJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEiLCJjb25kYUhlbHBlciIsIkNvbmRhSGVscGVyIiwicHJvY2Vzc1NlcnZpY2VGYWN0b3J5IiwiZ2V0IiwiSVByb2Nlc3NTZXJ2aWNlRmFjdG9yeSIsInBsYXRmb3JtIiwiSVBsYXRmb3JtU2VydmljZSIsImxvZ2dlciIsIklMb2dnZXIiLCJjb25kYUVudmlyb25tZW50c0ZpbGUiLCJob21lRGlyIiwiaXNXaW5kb3dzIiwicHJvY2VzcyIsImVudiIsIlVTRVJQUk9GSUxFIiwiSE9NRSIsIkhPTUVQQVRIIiwidW5kZWZpbmVkIiwiZGlzcG9zZSIsImdldENvbmRhRmlsZSIsImNvbmRhRmlsZSIsImdldENvbmRhRmlsZUltcGwiLCJpc0NvbmRhQXZhaWxhYmxlIiwiaXNBdmFpbGFibGUiLCJnZXRDb25kYVZlcnNpb24iLCJ2ZXJzaW9uIiwiY2F0Y2giLCJwcm9jZXNzU2VydmljZSIsImNyZWF0ZSIsImluZm8iLCJnZXRDb25kYUluZm8iLCJ2ZXJzaW9uU3RyaW5nIiwiY29uZGFfdmVyc2lvbiIsInN0ZE91dCIsImV4ZWMiLCJzdGRvdXQiLCJ0cmltIiwic3RhcnRzV2l0aCIsInN1YnN0cmluZyIsInBhcnNlIiwiTG9nZ2VyIiwid2FybiIsIlNlbVZlciIsImlzQ29uZGFJbkN1cnJlbnRQYXRoIiwib3V0cHV0IiwiY29uZGFJbmZvIiwiSlNPTiIsImV4IiwiaXNDb25kYUVudmlyb25tZW50IiwiaW50ZXJwcmV0ZXJQYXRoIiwiZnMiLCJJRmlsZVN5c3RlbSIsImRpciIsImRpcm5hbWUiLCJjb25kYU1ldGFEaXJlY3RvcnkiLCJkaXJlY3RvcnlFeGlzdHMiLCJnZXRDb25kYUVudmlyb25tZW50IiwiaXNDb25kYUVudiIsImVudmlyb25tZW50cyIsImdldENvbmRhRW52aXJvbm1lbnRzIiwic3ViRGlyTmFtZSIsImJhc2VuYW1lIiwiZ29VcE9uTGV2ZWwiLCJpbmRleE9mIiwidG9VcHBlckNhc2UiLCJpbnRlcnByZXRlclBhdGhUb01hdGNoIiwibWF0Y2hpbmdFbnZzIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwiaXRlbSIsImFyZVBhdGhzU2FtZSIsIm5hbWUiLCJpZ25vcmVDYWNoZSIsInBlcnNpc3RlbnRGYWN0b3J5IiwiSVBlcnNpc3RlbnRTdGF0ZUZhY3RvcnkiLCJnbG9iYWxQZXJzaXN0ZW5jZSIsImNyZWF0ZUdsb2JhbFBlcnNpc3RlbnRTdGF0ZSIsImRhdGEiLCJlbnZJbmZvIiwicGFyc2VDb25kYUVudmlyb25tZW50TmFtZXMiLCJ1cGRhdGVWYWx1ZSIsImxvZ0luZm9ybWF0aW9uIiwiZ2V0SW50ZXJwcmV0ZXJQYXRoIiwiY29uZGFFbnZpcm9ubWVudFBhdGgiLCJyZWxhdGl2ZVBhdGgiLCJnZXRBY3RpdmF0ZWRDb25kYUVudmlyb25tZW50IiwiaW50ZXJwcmV0ZXIiLCJpbnB1dEVudmlyb25tZW50IiwidHlwZSIsIkludGVycHJldGVyVHlwZSIsIkNvbmRhIiwiYWN0aXZhdGVkRW52aXJvbm1lbnQiLCJhc3NpZ24iLCJlbnZQYXRoIiwiY29uZGFQYXRoIiwiUGF0aCIsImNvbmNhdCIsIlBBVEgiLCJDT05EQV9QUkVGSVgiLCJlbnZOYW1lIiwiQ09OREFfREVGQVVMVF9FTlYiLCJkZXRlY3RDb25kYUVudmlyb25tZW50IiwiZGlzcGxheU5hbWUiLCJjb21wYW55RGlzcGxheU5hbWUiLCJnZXRMYXRlc3RWZXJzaW9uIiwiaW50ZXJwcmV0ZXJzIiwic29ydGVkSW50ZXJwcmV0ZXJzIiwic29ydCIsImEiLCJiIiwiY29tcGFyZVZlcnNpb24iLCJzZXR0aW5ncyIsIklDb25maWd1cmF0aW9uU2VydmljZSIsImdldFNldHRpbmdzIiwiZmlsZVN5c3RlbSIsInNldHRpbmciLCJnZXRJbnRlcnByZXRlcnMiLCJjb25kYUludGVycHJldGVycyIsImNvbmRhSW50ZXJwcmV0ZXIiLCJmaWxlRXhpc3RzIiwiZ2V0Q29uZGFGaWxlRnJvbUtub3duTG9jYXRpb25zIiwiZ2xvYlBhdHRlcm4iLCJjb25kYUZpbGVzIiwic2VhcmNoIiwiZmFpbFJlYXNvbiIsInZhbGlkQ29uZGFGaWxlcyIsImluamVjdGFibGUiLCJpbmplY3QiLCJJU2VydmljZUNvbnRhaW5lciIsIklJbnRlcnByZXRlckxvY2F0b3JTZXJ2aWNlIiwibmFtZWQiLCJXSU5ET1dTX1JFR0lTVFJZX1NFUlZJQ0UiLCJvcHRpb25hbCJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsSUFBSUEsVUFBVSxHQUFJLFVBQVEsU0FBS0EsVUFBZCxJQUE2QixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ25GLE1BQUlDLENBQUMsR0FBR0MsU0FBUyxDQUFDQyxNQUFsQjtBQUFBLE1BQTBCQyxDQUFDLEdBQUdILENBQUMsR0FBRyxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLElBQUksS0FBSyxJQUFULEdBQWdCQSxJQUFJLEdBQUdLLE1BQU0sQ0FBQ0Msd0JBQVAsQ0FBZ0NSLE1BQWhDLEVBQXdDQyxHQUF4QyxDQUF2QixHQUFzRUMsSUFBckg7QUFBQSxNQUEySE8sQ0FBM0g7QUFDQSxNQUFJLE9BQU9DLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0IsT0FBT0EsT0FBTyxDQUFDQyxRQUFmLEtBQTRCLFVBQS9ELEVBQTJFTCxDQUFDLEdBQUdJLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQlosVUFBakIsRUFBNkJDLE1BQTdCLEVBQXFDQyxHQUFyQyxFQUEwQ0MsSUFBMUMsQ0FBSixDQUEzRSxLQUNLLEtBQUssSUFBSVUsQ0FBQyxHQUFHYixVQUFVLENBQUNNLE1BQVgsR0FBb0IsQ0FBakMsRUFBb0NPLENBQUMsSUFBSSxDQUF6QyxFQUE0Q0EsQ0FBQyxFQUE3QyxFQUFpRCxJQUFJSCxDQUFDLEdBQUdWLFVBQVUsQ0FBQ2EsQ0FBRCxDQUFsQixFQUF1Qk4sQ0FBQyxHQUFHLENBQUNILENBQUMsR0FBRyxDQUFKLEdBQVFNLENBQUMsQ0FBQ0gsQ0FBRCxDQUFULEdBQWVILENBQUMsR0FBRyxDQUFKLEdBQVFNLENBQUMsQ0FBQ1QsTUFBRCxFQUFTQyxHQUFULEVBQWNLLENBQWQsQ0FBVCxHQUE0QkcsQ0FBQyxDQUFDVCxNQUFELEVBQVNDLEdBQVQsQ0FBN0MsS0FBK0RLLENBQW5FO0FBQzdFLFNBQU9ILENBQUMsR0FBRyxDQUFKLElBQVNHLENBQVQsSUFBY0MsTUFBTSxDQUFDTSxjQUFQLENBQXNCYixNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNLLENBQW5DLENBQWQsRUFBcURBLENBQTVEO0FBQ0gsQ0FMRDs7QUFNQSxJQUFJUSxPQUFPLEdBQUksVUFBUSxTQUFLQSxPQUFkLElBQTBCLFVBQVVDLFVBQVYsRUFBc0JDLFNBQXRCLEVBQWlDO0FBQ3JFLFNBQU8sVUFBVWhCLE1BQVYsRUFBa0JDLEdBQWxCLEVBQXVCO0FBQUVlLElBQUFBLFNBQVMsQ0FBQ2hCLE1BQUQsRUFBU0MsR0FBVCxFQUFjYyxVQUFkLENBQVQ7QUFBcUMsR0FBckU7QUFDSCxDQUZEOztBQUdBLElBQUlFLFNBQVMsR0FBSSxVQUFRLFNBQUtBLFNBQWQsSUFBNEIsVUFBVUMsT0FBVixFQUFtQkMsVUFBbkIsRUFBK0JDLENBQS9CLEVBQWtDQyxTQUFsQyxFQUE2QztBQUNyRixTQUFPLEtBQUtELENBQUMsS0FBS0EsQ0FBQyxHQUFHRSxPQUFULENBQU4sRUFBeUIsVUFBVUMsT0FBVixFQUFtQkMsTUFBbkIsRUFBMkI7QUFDdkQsYUFBU0MsU0FBVCxDQUFtQkMsS0FBbkIsRUFBMEI7QUFBRSxVQUFJO0FBQUVDLFFBQUFBLElBQUksQ0FBQ04sU0FBUyxDQUFDTyxJQUFWLENBQWVGLEtBQWYsQ0FBRCxDQUFKO0FBQThCLE9BQXBDLENBQXFDLE9BQU9HLENBQVAsRUFBVTtBQUFFTCxRQUFBQSxNQUFNLENBQUNLLENBQUQsQ0FBTjtBQUFZO0FBQUU7O0FBQzNGLGFBQVNDLFFBQVQsQ0FBa0JKLEtBQWxCLEVBQXlCO0FBQUUsVUFBSTtBQUFFQyxRQUFBQSxJQUFJLENBQUNOLFNBQVMsQ0FBQyxPQUFELENBQVQsQ0FBbUJLLEtBQW5CLENBQUQsQ0FBSjtBQUFrQyxPQUF4QyxDQUF5QyxPQUFPRyxDQUFQLEVBQVU7QUFBRUwsUUFBQUEsTUFBTSxDQUFDSyxDQUFELENBQU47QUFBWTtBQUFFOztBQUM5RixhQUFTRixJQUFULENBQWNJLE1BQWQsRUFBc0I7QUFBRUEsTUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWNULE9BQU8sQ0FBQ1EsTUFBTSxDQUFDTCxLQUFSLENBQXJCLEdBQXNDLElBQUlOLENBQUosQ0FBTSxVQUFVRyxPQUFWLEVBQW1CO0FBQUVBLFFBQUFBLE9BQU8sQ0FBQ1EsTUFBTSxDQUFDTCxLQUFSLENBQVA7QUFBd0IsT0FBbkQsRUFBcURPLElBQXJELENBQTBEUixTQUExRCxFQUFxRUssUUFBckUsQ0FBdEM7QUFBdUg7O0FBQy9JSCxJQUFBQSxJQUFJLENBQUMsQ0FBQ04sU0FBUyxHQUFHQSxTQUFTLENBQUNhLEtBQVYsQ0FBZ0JoQixPQUFoQixFQUF5QkMsVUFBVSxJQUFJLEVBQXZDLENBQWIsRUFBeURTLElBQXpELEVBQUQsQ0FBSjtBQUNILEdBTE0sQ0FBUDtBQU1ILENBUEQ7O0FBUUFyQixNQUFNLENBQUNNLGNBQVAsQ0FBc0JzQixPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFVCxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNVSxXQUFXLEdBQUdDLE9BQU8sQ0FBQyxXQUFELENBQTNCOztBQUNBLE1BQU1DLElBQUksR0FBR0QsT0FBTyxDQUFDLE1BQUQsQ0FBcEI7O0FBQ0EsTUFBTUUsUUFBUSxHQUFHRixPQUFPLENBQUMsUUFBRCxDQUF4Qjs7QUFDQSxNQUFNRyxRQUFRLEdBQUdILE9BQU8sQ0FBQyx3QkFBRCxDQUF4Qjs7QUFDQSxNQUFNSSxPQUFPLEdBQUdKLE9BQU8sQ0FBQyxnQ0FBRCxDQUF2Qjs7QUFDQSxNQUFNSyxPQUFPLEdBQUdMLE9BQU8sQ0FBQywrQkFBRCxDQUF2Qjs7QUFDQSxNQUFNTSxPQUFPLEdBQUdOLE9BQU8sQ0FBQyx1QkFBRCxDQUF2Qjs7QUFDQSxNQUFNTyxTQUFTLEdBQUdQLE9BQU8sQ0FBQywrQkFBRCxDQUF6Qjs7QUFDQSxNQUFNUSxPQUFPLEdBQUdSLE9BQU8sQ0FBQyxvQkFBRCxDQUF2Qjs7QUFDQSxNQUFNUyxXQUFXLEdBQUdULE9BQU8sQ0FBQyxpQkFBRCxDQUEzQjs7QUFDQSxNQUFNVSxhQUFhLEdBQUdWLE9BQU8sQ0FBQyxlQUFELENBQTdCLEMsQ0FDQTs7O0FBQ0EsTUFBTVcsU0FBUyxHQUFHWCxPQUFPLENBQUMsV0FBRCxDQUF6QixDLENBQ0E7QUFDQTs7O0FBQ0FGLE9BQU8sQ0FBQ2Msa0JBQVIsR0FBNkJELFNBQVMsQ0FBQyxxQkFBRCxDQUF0QyxDLENBQ0E7O0FBQ0EsTUFBTUUsd0JBQXdCLEdBQUcsQ0FDN0IsOENBRDZCLEVBRTdCLDZDQUY2QixFQUc3QkYsU0FBUyxDQUFDLG1DQUFELENBSG9CLEVBSTdCQSxTQUFTLENBQUMsa0NBQUQsQ0FKb0IsRUFLN0JBLFNBQVMsQ0FBQywyREFBRCxDQUxvQixFQU03QkEsU0FBUyxDQUFDLDBEQUFELENBTm9CLENBQWpDLEMsQ0FRQTs7QUFDQWIsT0FBTyxDQUFDZ0IscUJBQVIsR0FBaUMsSUFBR0Qsd0JBQXdCLENBQUNFLElBQXpCLENBQThCLEdBQTlCLENBQW1DLEdBQXZFO0FBQ0E7QUFDQTtBQUNBOztBQUNBLElBQUlDLFlBQVksR0FBRyxNQUFNQSxZQUFOLENBQW1CO0FBQ2xDQyxFQUFBQSxXQUFXLENBQUNDLGdCQUFELEVBQW1CQyxzQkFBbkIsRUFBMkM7QUFDbEQsU0FBS0QsZ0JBQUwsR0FBd0JBLGdCQUF4QjtBQUNBLFNBQUtDLHNCQUFMLEdBQThCQSxzQkFBOUI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLElBQUlWLGFBQWEsQ0FBQ1csV0FBbEIsRUFBbkI7QUFDQSxTQUFLQyxxQkFBTCxHQUE2QixLQUFLSixnQkFBTCxDQUFzQkssR0FBdEIsQ0FBMEJsQixPQUFPLENBQUNtQixzQkFBbEMsQ0FBN0I7QUFDQSxTQUFLQyxRQUFMLEdBQWdCLEtBQUtQLGdCQUFMLENBQXNCSyxHQUF0QixDQUEwQm5CLE9BQU8sQ0FBQ3NCLGdCQUFsQyxDQUFoQjtBQUNBLFNBQUtDLE1BQUwsR0FBYyxLQUFLVCxnQkFBTCxDQUFzQkssR0FBdEIsQ0FBMEJqQixPQUFPLENBQUNzQixPQUFsQyxDQUFkO0FBQ0g7O0FBQ0QsTUFBSUMscUJBQUosR0FBNEI7QUFDeEIsVUFBTUMsT0FBTyxHQUFHLEtBQUtMLFFBQUwsQ0FBY00sU0FBZCxHQUEwQkMsT0FBTyxDQUFDQyxHQUFSLENBQVlDLFdBQXRDLEdBQXFERixPQUFPLENBQUNDLEdBQVIsQ0FBWUUsSUFBWixJQUFvQkgsT0FBTyxDQUFDQyxHQUFSLENBQVlHLFFBQXJHO0FBQ0EsV0FBT04sT0FBTyxHQUFHN0IsSUFBSSxDQUFDYyxJQUFMLENBQVVlLE9BQVYsRUFBbUIsUUFBbkIsRUFBNkIsa0JBQTdCLENBQUgsR0FBc0RPLFNBQXBFO0FBQ0g7QUFDRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0k7OztBQUNBQyxFQUFBQSxPQUFPLEdBQUcsQ0FBRztBQUNiO0FBQ0o7QUFDQTs7O0FBQ0lDLEVBQUFBLFlBQVksR0FBRztBQUNYLFdBQU8zRCxTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxVQUFJLENBQUMsS0FBSzRELFNBQVYsRUFBcUI7QUFDakIsYUFBS0EsU0FBTCxHQUFpQixLQUFLQyxnQkFBTCxFQUFqQjtBQUNILE9BSCtDLENBSWhEOzs7QUFDQSxZQUFNRCxTQUFTLEdBQUcsTUFBTSxLQUFLQSxTQUE3QjtBQUNBLGFBQU9BLFNBQVA7QUFDSCxLQVBlLENBQWhCO0FBUUg7QUFDRDtBQUNKO0FBQ0E7OztBQUNJRSxFQUFBQSxnQkFBZ0IsR0FBRztBQUNmLFdBQU85RCxTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxVQUFJLE9BQU8sS0FBSytELFdBQVosS0FBNEIsU0FBaEMsRUFBMkM7QUFDdkMsZUFBTyxLQUFLQSxXQUFaO0FBQ0g7O0FBQ0QsYUFBTyxLQUFLQyxlQUFMLEdBQ0ZoRCxJQURFLENBQ0dpRCxPQUFPLElBQUksS0FBS0YsV0FBTCxHQUFtQkUsT0FBTyxLQUFLUixTQUQ3QyxFQUVGUyxLQUZFLENBRUksTUFBTSxLQUFLSCxXQUFMLEdBQW1CLEtBRjdCLENBQVA7QUFHSCxLQVBlLENBQWhCO0FBUUg7QUFDRDtBQUNKO0FBQ0E7OztBQUNJQyxFQUFBQSxlQUFlLEdBQUc7QUFDZCxXQUFPaEUsU0FBUyxDQUFDLElBQUQsRUFBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDaEQsWUFBTW1FLGNBQWMsR0FBRyxNQUFNLEtBQUt6QixxQkFBTCxDQUEyQjBCLE1BQTNCLEVBQTdCO0FBQ0EsWUFBTUMsSUFBSSxHQUFHLE1BQU0sS0FBS0MsWUFBTCxHQUFvQkosS0FBcEIsQ0FBMEIsTUFBTVQsU0FBaEMsQ0FBbkI7QUFDQSxVQUFJYyxhQUFKOztBQUNBLFVBQUlGLElBQUksSUFBSUEsSUFBSSxDQUFDRyxhQUFqQixFQUFnQztBQUM1QkQsUUFBQUEsYUFBYSxHQUFHRixJQUFJLENBQUNHLGFBQXJCO0FBQ0gsT0FGRCxNQUdLO0FBQ0QsY0FBTUMsTUFBTSxHQUFHLE1BQU0sS0FBS2QsWUFBTCxHQUNoQjNDLElBRGdCLENBQ1g0QyxTQUFTLElBQUlPLGNBQWMsQ0FBQ08sSUFBZixDQUFvQmQsU0FBcEIsRUFBK0IsQ0FBQyxXQUFELENBQS9CLEVBQThDLEVBQTlDLENBREYsRUFFaEI1QyxJQUZnQixDQUVYRixNQUFNLElBQUlBLE1BQU0sQ0FBQzZELE1BQVAsQ0FBY0MsSUFBZCxFQUZDLEVBR2hCVixLQUhnQixDQUdWLE1BQU1ULFNBSEksQ0FBckI7QUFJQWMsUUFBQUEsYUFBYSxHQUFJRSxNQUFNLElBQUlBLE1BQU0sQ0FBQ0ksVUFBUCxDQUFrQixRQUFsQixDQUFYLEdBQTBDSixNQUFNLENBQUNLLFNBQVAsQ0FBaUIsU0FBUzFGLE1BQTFCLEVBQWtDd0YsSUFBbEMsRUFBMUMsR0FBcUZILE1BQXJHO0FBQ0g7O0FBQ0QsVUFBSSxDQUFDRixhQUFMLEVBQW9CO0FBQ2hCO0FBQ0g7O0FBQ0QsWUFBTU4sT0FBTyxHQUFHM0MsUUFBUSxDQUFDeUQsS0FBVCxDQUFlUixhQUFmLEVBQThCLElBQTlCLENBQWhCOztBQUNBLFVBQUlOLE9BQUosRUFBYTtBQUNULGVBQU9BLE9BQVA7QUFDSCxPQXBCK0MsQ0FxQmhEOzs7QUFDQTFDLE1BQUFBLFFBQVEsQ0FBQ3lELE1BQVQsQ0FBZ0JDLElBQWhCLENBQXNCLHFDQUFvQ1YsYUFBYyxFQUF4RTtBQUNBLGFBQU8sSUFBSWpELFFBQVEsQ0FBQzRELE1BQWIsQ0FBb0IsT0FBcEIsQ0FBUDtBQUNILEtBeEJlLENBQWhCO0FBeUJIO0FBQ0Q7QUFDSjtBQUNBOzs7QUFDSUMsRUFBQUEsb0JBQW9CLEdBQUc7QUFDbkIsV0FBT25GLFNBQVMsQ0FBQyxJQUFELEVBQU8sS0FBSyxDQUFaLEVBQWUsS0FBSyxDQUFwQixFQUF1QixhQUFhO0FBQ2hELFlBQU1tRSxjQUFjLEdBQUcsTUFBTSxLQUFLekIscUJBQUwsQ0FBMkIwQixNQUEzQixFQUE3QjtBQUNBLGFBQU9ELGNBQWMsQ0FBQ08sSUFBZixDQUFvQixPQUFwQixFQUE2QixDQUFDLFdBQUQsQ0FBN0IsRUFDRjFELElBREUsQ0FDR29FLE1BQU0sSUFBSUEsTUFBTSxDQUFDVCxNQUFQLENBQWN2RixNQUFkLEdBQXVCLENBRHBDLEVBRUY4RSxLQUZFLENBRUksTUFBTSxLQUZWLENBQVA7QUFHSCxLQUxlLENBQWhCO0FBTUg7QUFDRDtBQUNKO0FBQ0E7OztBQUNJSSxFQUFBQSxZQUFZLEdBQUc7QUFDWCxXQUFPdEUsU0FBUyxDQUFDLElBQUQsRUFBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDaEQsVUFBSTtBQUNBLGNBQU00RCxTQUFTLEdBQUcsTUFBTSxLQUFLRCxZQUFMLEVBQXhCO0FBQ0EsY0FBTVEsY0FBYyxHQUFHLE1BQU0sS0FBS3pCLHFCQUFMLENBQTJCMEIsTUFBM0IsRUFBN0I7QUFDQSxjQUFNaUIsU0FBUyxHQUFHLE1BQU1sQixjQUFjLENBQUNPLElBQWYsQ0FBb0JkLFNBQXBCLEVBQStCLENBQUMsTUFBRCxFQUFTLFFBQVQsQ0FBL0IsRUFBbUQ1QyxJQUFuRCxDQUF3RG9FLE1BQU0sSUFBSUEsTUFBTSxDQUFDVCxNQUF6RSxDQUF4QjtBQUNBLGVBQU9XLElBQUksQ0FBQ1AsS0FBTCxDQUFXTSxTQUFYLENBQVA7QUFDSCxPQUxELENBTUEsT0FBT0UsRUFBUCxFQUFXLENBQ1A7QUFDQTtBQUNBO0FBQ0g7QUFDSixLQVplLENBQWhCO0FBYUg7QUFDRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0lDLEVBQUFBLGtCQUFrQixDQUFDQyxlQUFELEVBQWtCO0FBQ2hDLFdBQU96RixTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxZQUFNMEYsRUFBRSxHQUFHLEtBQUtwRCxnQkFBTCxDQUFzQkssR0FBdEIsQ0FBMEJuQixPQUFPLENBQUNtRSxXQUFsQyxDQUFYO0FBQ0EsWUFBTUMsR0FBRyxHQUFHdkUsSUFBSSxDQUFDd0UsT0FBTCxDQUFhSixlQUFiLENBQVo7QUFDQSxZQUFNdEMsU0FBUyxHQUFHLEtBQUtiLGdCQUFMLENBQXNCSyxHQUF0QixDQUEwQm5CLE9BQU8sQ0FBQ3NCLGdCQUFsQyxFQUFvREssU0FBdEU7QUFDQSxZQUFNMkMsa0JBQWtCLEdBQUczQyxTQUFTLEdBQUc5QixJQUFJLENBQUNjLElBQUwsQ0FBVXlELEdBQVYsRUFBZSxZQUFmLENBQUgsR0FBa0N2RSxJQUFJLENBQUNjLElBQUwsQ0FBVXlELEdBQVYsRUFBZSxJQUFmLEVBQXFCLFlBQXJCLENBQXRFO0FBQ0EsYUFBT0YsRUFBRSxDQUFDSyxlQUFILENBQW1CRCxrQkFBbkIsQ0FBUDtBQUNILEtBTmUsQ0FBaEI7QUFPSDtBQUNEO0FBQ0o7QUFDQTs7O0FBQ0lFLEVBQUFBLG1CQUFtQixDQUFDUCxlQUFELEVBQWtCO0FBQ2pDLFdBQU96RixTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxZQUFNaUcsVUFBVSxHQUFHLE1BQU0sS0FBS1Qsa0JBQUwsQ0FBd0JDLGVBQXhCLENBQXpCOztBQUNBLFVBQUksQ0FBQ1EsVUFBTCxFQUFpQjtBQUNiO0FBQ0g7O0FBQ0QsVUFBSUMsWUFBWSxHQUFHLE1BQU0sS0FBS0Msb0JBQUwsQ0FBMEIsS0FBMUIsQ0FBekI7QUFDQSxZQUFNUCxHQUFHLEdBQUd2RSxJQUFJLENBQUN3RSxPQUFMLENBQWFKLGVBQWIsQ0FBWixDQU5nRCxDQU9oRDs7QUFDQSxZQUFNVyxVQUFVLEdBQUcvRSxJQUFJLENBQUNnRixRQUFMLENBQWNULEdBQWQsQ0FBbkI7QUFDQSxZQUFNVSxXQUFXLEdBQUcsQ0FBQyxLQUFELEVBQVEsU0FBUixFQUFtQkMsT0FBbkIsQ0FBMkJILFVBQVUsQ0FBQ0ksV0FBWCxFQUEzQixNQUF5RCxDQUFDLENBQTlFO0FBQ0EsWUFBTUMsc0JBQXNCLEdBQUdILFdBQVcsR0FBR2pGLElBQUksQ0FBQ2MsSUFBTCxDQUFVeUQsR0FBVixFQUFlLElBQWYsQ0FBSCxHQUEwQkEsR0FBcEU7QUFDQSxZQUFNRixFQUFFLEdBQUcsS0FBS3BELGdCQUFMLENBQXNCSyxHQUF0QixDQUEwQm5CLE9BQU8sQ0FBQ21FLFdBQWxDLENBQVgsQ0FYZ0QsQ0FZaEQ7O0FBQ0EsVUFBSWUsWUFBWSxHQUFHQyxLQUFLLENBQUNDLE9BQU4sQ0FBY1YsWUFBZCxJQUE4QkEsWUFBWSxDQUFDVyxNQUFiLENBQW9CQyxJQUFJLElBQUlwQixFQUFFLENBQUNxQixZQUFILENBQWdCRCxJQUFJLENBQUN6RixJQUFyQixFQUEyQm9GLHNCQUEzQixDQUE1QixDQUE5QixHQUFnSCxFQUFuSTs7QUFDQSxVQUFJQyxZQUFZLENBQUN0SCxNQUFiLEtBQXdCLENBQTVCLEVBQStCO0FBQzNCOEcsUUFBQUEsWUFBWSxHQUFHLE1BQU0sS0FBS0Msb0JBQUwsQ0FBMEIsSUFBMUIsQ0FBckI7QUFDQU8sUUFBQUEsWUFBWSxHQUFHQyxLQUFLLENBQUNDLE9BQU4sQ0FBY1YsWUFBZCxJQUE4QkEsWUFBWSxDQUFDVyxNQUFiLENBQW9CQyxJQUFJLElBQUlwQixFQUFFLENBQUNxQixZQUFILENBQWdCRCxJQUFJLENBQUN6RixJQUFyQixFQUEyQm9GLHNCQUEzQixDQUE1QixDQUE5QixHQUFnSCxFQUEvSDtBQUNIOztBQUNELFVBQUlDLFlBQVksQ0FBQ3RILE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7QUFDekIsZUFBTztBQUFFNEgsVUFBQUEsSUFBSSxFQUFFTixZQUFZLENBQUMsQ0FBRCxDQUFaLENBQWdCTSxJQUF4QjtBQUE4QjNGLFVBQUFBLElBQUksRUFBRW9GO0FBQXBDLFNBQVA7QUFDSCxPQXBCK0MsQ0FxQmhEO0FBQ0E7O0FBQ0gsS0F2QmUsQ0FBaEI7QUF3Qkg7QUFDRDtBQUNKO0FBQ0E7OztBQUNJTixFQUFBQSxvQkFBb0IsQ0FBQ2MsV0FBRCxFQUFjO0FBQzlCLFdBQU9qSCxTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRDtBQUNBLFlBQU1rSCxpQkFBaUIsR0FBRyxLQUFLNUUsZ0JBQUwsQ0FBc0JLLEdBQXRCLENBQTBCakIsT0FBTyxDQUFDeUYsdUJBQWxDLENBQTFCLENBRmdELENBR2hEOztBQUNBLFlBQU1DLGlCQUFpQixHQUFHRixpQkFBaUIsQ0FBQ0csMkJBQWxCLENBQThDLG9CQUE5QyxFQUFvRTVELFNBQXBFLENBQTFCOztBQUNBLFVBQUksQ0FBQ3dELFdBQUQsSUFBZ0JHLGlCQUFpQixDQUFDM0csS0FBdEMsRUFBNkM7QUFDekMsZUFBTzJHLGlCQUFpQixDQUFDM0csS0FBbEIsQ0FBd0I2RyxJQUEvQjtBQUNIOztBQUNELFVBQUk7QUFDQSxjQUFNMUQsU0FBUyxHQUFHLE1BQU0sS0FBS0QsWUFBTCxFQUF4QjtBQUNBLGNBQU1RLGNBQWMsR0FBRyxNQUFNLEtBQUt6QixxQkFBTCxDQUEyQjBCLE1BQTNCLEVBQTdCO0FBQ0EsY0FBTW1ELE9BQU8sR0FBRyxNQUFNcEQsY0FBYyxDQUFDTyxJQUFmLENBQW9CZCxTQUFwQixFQUErQixDQUFDLEtBQUQsRUFBUSxNQUFSLENBQS9CLEVBQWdENUMsSUFBaEQsQ0FBcURvRSxNQUFNLElBQUlBLE1BQU0sQ0FBQ1QsTUFBdEUsQ0FBdEI7QUFDQSxjQUFNdUIsWUFBWSxHQUFHLEtBQUsxRCxXQUFMLENBQWlCZ0YsMEJBQWpCLENBQTRDRCxPQUE1QyxDQUFyQjtBQUNBLGNBQU1ILGlCQUFpQixDQUFDSyxXQUFsQixDQUE4QjtBQUFFSCxVQUFBQSxJQUFJLEVBQUVwQjtBQUFSLFNBQTlCLENBQU47QUFDQSxlQUFPQSxZQUFQO0FBQ0gsT0FQRCxDQVFBLE9BQU9YLEVBQVAsRUFBVztBQUNQLGNBQU02QixpQkFBaUIsQ0FBQ0ssV0FBbEIsQ0FBOEI7QUFBRUgsVUFBQUEsSUFBSSxFQUFFN0Q7QUFBUixTQUE5QixDQUFOLENBRE8sQ0FFUDtBQUNBO0FBQ0E7O0FBQ0EsYUFBS1YsTUFBTCxDQUFZMkUsY0FBWixDQUEyQixpREFBM0IsRUFBOEVuQyxFQUE5RTtBQUNIO0FBQ0osS0F2QmUsQ0FBaEI7QUF3Qkg7QUFDRDtBQUNKO0FBQ0E7OztBQUNJb0MsRUFBQUEsa0JBQWtCLENBQUNDLG9CQUFELEVBQXVCO0FBQ3JDO0FBQ0EsVUFBTUMsWUFBWSxHQUFHLEtBQUtoRixRQUFMLENBQWNNLFNBQWQsR0FBMEIsWUFBMUIsR0FBeUM5QixJQUFJLENBQUNjLElBQUwsQ0FBVSxLQUFWLEVBQWlCLFFBQWpCLENBQTlEO0FBQ0EsV0FBT2QsSUFBSSxDQUFDYyxJQUFMLENBQVV5RixvQkFBVixFQUFnQ0MsWUFBaEMsQ0FBUDtBQUNIO0FBQ0Q7QUFDSjtBQUNBO0FBQ0E7QUFDSTtBQUNBOzs7QUFDQUMsRUFBQUEsNEJBQTRCLENBQUNDLFdBQUQsRUFBY0MsZ0JBQWQsRUFBZ0M7QUFDeEQsUUFBSUQsV0FBVyxDQUFDRSxJQUFaLEtBQXFCcEcsV0FBVyxDQUFDcUcsZUFBWixDQUE0QkMsS0FBckQsRUFBNEQ7QUFDeEQ7QUFDSDs7QUFDRCxVQUFNQyxvQkFBb0IsR0FBRzlJLE1BQU0sQ0FBQytJLE1BQVAsQ0FBYyxFQUFkLEVBQWtCTCxnQkFBbEIsQ0FBN0I7QUFDQSxVQUFNN0UsU0FBUyxHQUFHLEtBQUtOLFFBQUwsQ0FBY00sU0FBaEM7O0FBQ0EsUUFBSTRFLFdBQVcsQ0FBQ08sT0FBaEIsRUFBeUI7QUFDckIsVUFBSW5GLFNBQUosRUFBZTtBQUNYO0FBQ0EsY0FBTW9GLFNBQVMsR0FBR2xILElBQUksQ0FBQ2MsSUFBTCxDQUFVNEYsV0FBVyxDQUFDTyxPQUF0QixFQUErQixTQUEvQixDQUFsQjtBQUNBRixRQUFBQSxvQkFBb0IsQ0FBQ0ksSUFBckIsR0FBNEJELFNBQVMsQ0FBQ0UsTUFBVixDQUFpQixHQUFqQixFQUF1QixHQUFFVCxnQkFBZ0IsQ0FBQ1EsSUFBakIsR0FBd0JSLGdCQUFnQixDQUFDUSxJQUF6QyxHQUFnRCxFQUFHLEVBQTVFLENBQTVCO0FBQ0gsT0FKRCxNQUtLO0FBQ0Q7QUFDQSxjQUFNRCxTQUFTLEdBQUdsSCxJQUFJLENBQUNjLElBQUwsQ0FBVTRGLFdBQVcsQ0FBQ08sT0FBdEIsRUFBK0IsS0FBL0IsQ0FBbEI7QUFDQUYsUUFBQUEsb0JBQW9CLENBQUNNLElBQXJCLEdBQTRCSCxTQUFTLENBQUNFLE1BQVYsQ0FBaUIsR0FBakIsRUFBdUIsR0FBRVQsZ0JBQWdCLENBQUNVLElBQWpCLEdBQXdCVixnQkFBZ0IsQ0FBQ1UsSUFBekMsR0FBZ0QsRUFBRyxFQUE1RSxDQUE1QjtBQUNILE9BVm9CLENBV3JCOzs7QUFDQU4sTUFBQUEsb0JBQW9CLENBQUNPLFlBQXJCLEdBQW9DWixXQUFXLENBQUNPLE9BQWhEO0FBQ0g7O0FBQ0QsUUFBSVAsV0FBVyxDQUFDYSxPQUFoQixFQUF5QjtBQUNyQlIsTUFBQUEsb0JBQW9CLENBQUNTLGlCQUFyQixHQUF5Q2QsV0FBVyxDQUFDYSxPQUFyRDtBQUNIOztBQUNELFdBQU9SLG9CQUFQO0FBQ0g7QUFDRDtBQUNKO0FBQ0E7OztBQUNJVSxFQUFBQSxzQkFBc0IsQ0FBQ2YsV0FBRCxFQUFjO0FBQ2hDLFdBQU9BLFdBQVcsQ0FBQ0UsSUFBWixLQUFxQnBHLFdBQVcsQ0FBQ3FHLGVBQVosQ0FBNEJDLEtBQWpELElBQ0gsQ0FBQ0osV0FBVyxDQUFDZ0IsV0FBWixHQUEwQmhCLFdBQVcsQ0FBQ2dCLFdBQXRDLEdBQW9ELEVBQXJELEVBQXlEdkMsV0FBekQsR0FBdUVELE9BQXZFLENBQStFLFVBQS9FLEtBQThGLENBRDNGLElBRUgsQ0FBQ3dCLFdBQVcsQ0FBQ2lCLGtCQUFaLEdBQWlDakIsV0FBVyxDQUFDaUIsa0JBQTdDLEdBQWtFLEVBQW5FLEVBQXVFeEMsV0FBdkUsR0FBcUZELE9BQXJGLENBQTZGLFVBQTdGLEtBQTRHLENBRnpHLElBR0gsQ0FBQ3dCLFdBQVcsQ0FBQ2lCLGtCQUFaLEdBQWlDakIsV0FBVyxDQUFDaUIsa0JBQTdDLEdBQWtFLEVBQW5FLEVBQXVFeEMsV0FBdkUsR0FBcUZELE9BQXJGLENBQTZGLFdBQTdGLEtBQTZHLENBSGpIO0FBSUg7QUFDRDtBQUNKO0FBQ0E7OztBQUNJMEMsRUFBQUEsZ0JBQWdCLENBQUNDLFlBQUQsRUFBZTtBQUMzQixVQUFNQyxrQkFBa0IsR0FBR0QsWUFBWSxDQUFDckMsTUFBYixDQUFvQmtCLFdBQVcsSUFBSUEsV0FBVyxDQUFDOUQsT0FBWixJQUF1QjhELFdBQVcsQ0FBQzlELE9BQVosQ0FBb0I3RSxNQUFwQixHQUE2QixDQUF2RixDQUEzQixDQUQyQixDQUUzQjs7QUFDQStKLElBQUFBLGtCQUFrQixDQUFDQyxJQUFuQixDQUF3QixDQUFDQyxDQUFELEVBQUlDLENBQUosS0FBVTNILFNBQVMsQ0FBQzRILGNBQVYsQ0FBeUJGLENBQUMsQ0FBQ3BGLE9BQTNCLEVBQW9DcUYsQ0FBQyxDQUFDckYsT0FBdEMsQ0FBbEM7O0FBQ0EsUUFBSWtGLGtCQUFrQixDQUFDL0osTUFBbkIsR0FBNEIsQ0FBaEMsRUFBbUM7QUFDL0IsYUFBTytKLGtCQUFrQixDQUFDQSxrQkFBa0IsQ0FBQy9KLE1BQW5CLEdBQTRCLENBQTdCLENBQXpCO0FBQ0g7QUFDSjtBQUNEO0FBQ0o7QUFDQTs7O0FBQ0l5RSxFQUFBQSxnQkFBZ0IsR0FBRztBQUNmLFdBQU83RCxTQUFTLENBQUMsSUFBRCxFQUFPLEtBQUssQ0FBWixFQUFlLEtBQUssQ0FBcEIsRUFBdUIsYUFBYTtBQUNoRCxZQUFNd0osUUFBUSxHQUFHLEtBQUtsSCxnQkFBTCxDQUFzQkssR0FBdEIsQ0FBMEJqQixPQUFPLENBQUMrSCxxQkFBbEMsRUFBeURDLFdBQXpELEVBQWpCO0FBQ0EsWUFBTUMsVUFBVSxHQUFHLEtBQUtySCxnQkFBTCxDQUFzQkssR0FBdEIsQ0FBMEJuQixPQUFPLENBQUNtRSxXQUFsQyxDQUFuQjtBQUNBLFlBQU1pRSxPQUFPLEdBQUdKLFFBQVEsQ0FBQ2pCLFNBQXpCOztBQUNBLFVBQUlxQixPQUFPLElBQUlBLE9BQU8sS0FBSyxFQUEzQixFQUErQjtBQUMzQixlQUFPQSxPQUFQO0FBQ0g7O0FBQ0QsWUFBTTdGLFdBQVcsR0FBRyxNQUFNLEtBQUtvQixvQkFBTCxFQUExQjs7QUFDQSxVQUFJcEIsV0FBSixFQUFpQjtBQUNiLGVBQU8sT0FBUDtBQUNIOztBQUNELFVBQUksS0FBS2xCLFFBQUwsQ0FBY00sU0FBZCxJQUEyQixLQUFLWixzQkFBcEMsRUFBNEQ7QUFDeEQsY0FBTTJHLFlBQVksR0FBRyxNQUFNLEtBQUszRyxzQkFBTCxDQUE0QnNILGVBQTVCLEVBQTNCO0FBQ0EsY0FBTUMsaUJBQWlCLEdBQUdaLFlBQVksQ0FBQ3JDLE1BQWIsQ0FBb0IsS0FBS2lDLHNCQUF6QixDQUExQjtBQUNBLGNBQU1pQixnQkFBZ0IsR0FBRyxLQUFLZCxnQkFBTCxDQUFzQmEsaUJBQXRCLENBQXpCO0FBQ0EsWUFBSXZCLFNBQVMsR0FBR3dCLGdCQUFnQixHQUFHMUksSUFBSSxDQUFDYyxJQUFMLENBQVVkLElBQUksQ0FBQ3dFLE9BQUwsQ0FBYWtFLGdCQUFnQixDQUFDMUksSUFBOUIsQ0FBVixFQUErQyxXQUEvQyxDQUFILEdBQWlFLEVBQWpHOztBQUNBLFlBQUksTUFBTXNJLFVBQVUsQ0FBQ0ssVUFBWCxDQUFzQnpCLFNBQXRCLENBQVYsRUFBNEM7QUFDeEMsaUJBQU9BLFNBQVA7QUFDSCxTQVB1RCxDQVF4RDtBQUNBOzs7QUFDQUEsUUFBQUEsU0FBUyxHQUFHd0IsZ0JBQWdCLEdBQUcxSSxJQUFJLENBQUNjLElBQUwsQ0FBVWQsSUFBSSxDQUFDd0UsT0FBTCxDQUFha0UsZ0JBQWdCLENBQUMxSSxJQUE5QixDQUFWLEVBQStDLFNBQS9DLEVBQTBELFdBQTFELENBQUgsR0FBNEUsRUFBeEc7O0FBQ0EsWUFBSSxNQUFNc0ksVUFBVSxDQUFDSyxVQUFYLENBQXNCekIsU0FBdEIsQ0FBVixFQUE0QztBQUN4QyxpQkFBT0EsU0FBUDtBQUNIO0FBQ0o7O0FBQ0QsYUFBTyxLQUFLMEIsOEJBQUwsRUFBUDtBQUNILEtBM0JlLENBQWhCO0FBNEJIO0FBQ0Q7QUFDSjtBQUNBO0FBQ0E7OztBQUNJQSxFQUFBQSw4QkFBOEIsR0FBRztBQUM3QixXQUFPakssU0FBUyxDQUFDLElBQUQsRUFBTyxLQUFLLENBQVosRUFBZSxLQUFLLENBQXBCLEVBQXVCLGFBQWE7QUFDaEQsWUFBTTJKLFVBQVUsR0FBRyxLQUFLckgsZ0JBQUwsQ0FBc0JLLEdBQXRCLENBQTBCbkIsT0FBTyxDQUFDbUUsV0FBbEMsQ0FBbkI7QUFDQSxZQUFNdUUsV0FBVyxHQUFHLEtBQUtySCxRQUFMLENBQWNNLFNBQWQsR0FBMEJqQyxPQUFPLENBQUNnQixxQkFBbEMsR0FBMERoQixPQUFPLENBQUNjLGtCQUF0RjtBQUNBLFlBQU1tSSxVQUFVLEdBQUcsTUFBTVIsVUFBVSxDQUFDUyxNQUFYLENBQWtCRixXQUFsQixFQUNwQmhHLEtBRG9CLENBQ2JtRyxVQUFELElBQWdCO0FBQ3ZCOUksUUFBQUEsUUFBUSxDQUFDeUQsTUFBVCxDQUFnQkMsSUFBaEIsQ0FBcUIsdUNBQXJCLEVBQStELHVFQUFzRW9GLFVBQVcsRUFBaEo7QUFDQSxlQUFPLEVBQVA7QUFDSCxPQUp3QixDQUF6QjtBQUtBLFlBQU1DLGVBQWUsR0FBR0gsVUFBVSxDQUFDdEQsTUFBWCxDQUFrQjBCLFNBQVMsSUFBSUEsU0FBUyxDQUFDbkosTUFBVixHQUFtQixDQUFsRCxDQUF4QjtBQUNBLGFBQU9rTCxlQUFlLENBQUNsTCxNQUFoQixLQUEyQixDQUEzQixHQUErQixPQUEvQixHQUF5Q2tMLGVBQWUsQ0FBQyxDQUFELENBQS9EO0FBQ0gsS0FWZSxDQUFoQjtBQVdIOztBQS9SaUMsQ0FBdEM7QUFpU0FsSSxZQUFZLEdBQUd2RCxVQUFVLENBQUMsQ0FDdEJzQyxXQUFXLENBQUNvSixVQUFaLEVBRHNCLEVBRXRCMUssT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQ3FKLE1BQVosQ0FBbUI1SSxPQUFPLENBQUM2SSxpQkFBM0IsQ0FBSixDQUZlLEVBR3RCNUssT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQ3FKLE1BQVosQ0FBbUIzSSxXQUFXLENBQUM2SSwwQkFBL0IsQ0FBSixDQUhlLEVBR2tEN0ssT0FBTyxDQUFDLENBQUQsRUFBSXNCLFdBQVcsQ0FBQ3dKLEtBQVosQ0FBa0I5SSxXQUFXLENBQUMrSSx3QkFBOUIsQ0FBSixDQUh6RCxFQUd1SC9LLE9BQU8sQ0FBQyxDQUFELEVBQUlzQixXQUFXLENBQUMwSixRQUFaLEVBQUosQ0FIOUgsQ0FBRCxFQUl0QnpJLFlBSnNCLENBQXpCO0FBS0FsQixPQUFPLENBQUNrQixZQUFSLEdBQXVCQSxZQUF2QiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xudmFyIF9fcGFyYW0gPSAodGhpcyAmJiB0aGlzLl9fcGFyYW0pIHx8IGZ1bmN0aW9uIChwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cbn07XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IGludmVyc2lmeV8xID0gcmVxdWlyZShcImludmVyc2lmeVwiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IHNlbXZlcl8xID0gcmVxdWlyZShcInNlbXZlclwiKTtcbmNvbnN0IGxvZ2dlcl8xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvbW1vbi9sb2dnZXJcIik7XG5jb25zdCB0eXBlc18xID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvbW1vbi9wbGF0Zm9ybS90eXBlc1wiKTtcbmNvbnN0IHR5cGVzXzIgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29tbW9uL3Byb2Nlc3MvdHlwZXNcIik7XG5jb25zdCB0eXBlc18zID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvbW1vbi90eXBlc1wiKTtcbmNvbnN0IHZlcnNpb25fMSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb21tb24vdXRpbHMvdmVyc2lvblwiKTtcbmNvbnN0IHR5cGVzXzQgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW9jL3R5cGVzXCIpO1xuY29uc3QgY29udHJhY3RzXzEgPSByZXF1aXJlKFwiLi4vLi4vY29udHJhY3RzXCIpO1xuY29uc3QgY29uZGFIZWxwZXJfMSA9IHJlcXVpcmUoXCIuL2NvbmRhSGVscGVyXCIpO1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXJlcXVpcmUtaW1wb3J0cyBuby12YXItcmVxdWlyZXNcbmNvbnN0IHVudGlsZGlmeSA9IHJlcXVpcmUoJ3VudGlsZGlmeScpO1xuLy8gVGhpcyBnbG9iIHBhdHRlcm4gd2lsbCBtYXRjaCBhbGwgb2YgdGhlIGZvbGxvd2luZzpcbi8vIH4vYW5hY29uZGEvYmluL2NvbmRhLCB+L2FuYWNvbmRhMy9iaW4vY29uZGEsIH4vbWluaWNvbmRhL2Jpbi9jb25kYSwgfi9taW5pY29uZGEzL2Jpbi9jb25kYVxuZXhwb3J0cy5Db25kYUxvY2F0aW9uc0dsb2IgPSB1bnRpbGRpZnkoJ34vKmNvbmRhKi9iaW4vY29uZGEnKTtcbi8vIC4uLmFuZCBmb3Igd2luZG93cywgdGhlIGtub3duIGRlZmF1bHQgaW5zdGFsbCBsb2NhdGlvbnM6XG5jb25zdCBjb25kYUdsb2JQYXRoc0ZvcldpbmRvd3MgPSBbXG4gICAgJy9Qcm9ncmFtRGF0YS9bTW1daW5pY29uZGEqL1NjcmlwdHMvY29uZGEuZXhlJyxcbiAgICAnL1Byb2dyYW1EYXRhL1tBYV1uYWNvbmRhKi9TY3JpcHRzL2NvbmRhLmV4ZScsXG4gICAgdW50aWxkaWZ5KCd+L1tNbV1pbmljb25kYSovU2NyaXB0cy9jb25kYS5leGUnKSxcbiAgICB1bnRpbGRpZnkoJ34vW0FhXW5hY29uZGEqL1NjcmlwdHMvY29uZGEuZXhlJyksXG4gICAgdW50aWxkaWZ5KCd+L0FwcERhdGEvTG9jYWwvQ29udGludXVtL1tNbV1pbmljb25kYSovU2NyaXB0cy9jb25kYS5leGUnKSxcbiAgICB1bnRpbGRpZnkoJ34vQXBwRGF0YS9Mb2NhbC9Db250aW51dW0vW0FhXW5hY29uZGEqL1NjcmlwdHMvY29uZGEuZXhlJylcbl07XG4vLyBmb3JtYXQgZm9yIGdsb2IgcHJvY2Vzc2luZzpcbmV4cG9ydHMuQ29uZGFMb2NhdGlvbnNHbG9iV2luID0gYHske2NvbmRhR2xvYlBhdGhzRm9yV2luZG93cy5qb2luKCcsJyl9fWA7XG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgYSBjb25kYSBpbnN0YWxsYXRpb24uXG4gKi9cbmxldCBDb25kYVNlcnZpY2UgPSBjbGFzcyBDb25kYVNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKHNlcnZpY2VDb250YWluZXIsIHJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEpIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlQ29udGFpbmVyID0gc2VydmljZUNvbnRhaW5lcjtcbiAgICAgICAgdGhpcy5yZWdpc3RyeUxvb2t1cEZvckNvbmRhID0gcmVnaXN0cnlMb29rdXBGb3JDb25kYTtcbiAgICAgICAgdGhpcy5jb25kYUhlbHBlciA9IG5ldyBjb25kYUhlbHBlcl8xLkNvbmRhSGVscGVyKCk7XG4gICAgICAgIHRoaXMucHJvY2Vzc1NlcnZpY2VGYWN0b3J5ID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18yLklQcm9jZXNzU2VydmljZUZhY3RvcnkpO1xuICAgICAgICB0aGlzLnBsYXRmb3JtID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQbGF0Zm9ybVNlcnZpY2UpO1xuICAgICAgICB0aGlzLmxvZ2dlciA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JTG9nZ2VyKTtcbiAgICB9XG4gICAgZ2V0IGNvbmRhRW52aXJvbm1lbnRzRmlsZSgpIHtcbiAgICAgICAgY29uc3QgaG9tZURpciA9IHRoaXMucGxhdGZvcm0uaXNXaW5kb3dzID8gcHJvY2Vzcy5lbnYuVVNFUlBST0ZJTEUgOiAocHJvY2Vzcy5lbnYuSE9NRSB8fCBwcm9jZXNzLmVudi5IT01FUEFUSCk7XG4gICAgICAgIHJldHVybiBob21lRGlyID8gcGF0aC5qb2luKGhvbWVEaXIsICcuY29uZGEnLCAnZW52aXJvbm1lbnRzLnR4dCcpIDogdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWxlYXNlIGFueSBoZWxkIHJlc291cmNlcy5cbiAgICAgKlxuICAgICAqIENhbGxlZCBieSBWUyBDb2RlIHRvIGluZGljYXRlIGl0IGlzIGRvbmUgd2l0aCB0aGUgcmVzb3VyY2UuXG4gICAgICovXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWVtcHR5XG4gICAgZGlzcG9zZSgpIHsgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgcGF0aCB0byB0aGUgXCJjb25kYSBmaWxlXCIuXG4gICAgICovXG4gICAgZ2V0Q29uZGFGaWxlKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbmRhRmlsZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZGFGaWxlID0gdGhpcy5nZXRDb25kYUZpbGVJbXBsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdW5uZWNlc3NhcnktbG9jYWwtdmFyaWFibGVcbiAgICAgICAgICAgIGNvbnN0IGNvbmRhRmlsZSA9IHlpZWxkIHRoaXMuY29uZGFGaWxlO1xuICAgICAgICAgICAgcmV0dXJuIGNvbmRhRmlsZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIElzIHRoZXJlIGEgY29uZGEgaW5zdGFsbCB0byB1c2U/XG4gICAgICovXG4gICAgaXNDb25kYUF2YWlsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5pc0F2YWlsYWJsZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNBdmFpbGFibGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb25kYVZlcnNpb24oKVxuICAgICAgICAgICAgICAgIC50aGVuKHZlcnNpb24gPT4gdGhpcy5pc0F2YWlsYWJsZSA9IHZlcnNpb24gIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gdGhpcy5pc0F2YWlsYWJsZSA9IGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgY29uZGEgdmVyc2lvbi5cbiAgICAgKi9cbiAgICBnZXRDb25kYVZlcnNpb24oKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzU2VydmljZSA9IHlpZWxkIHRoaXMucHJvY2Vzc1NlcnZpY2VGYWN0b3J5LmNyZWF0ZSgpO1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHlpZWxkIHRoaXMuZ2V0Q29uZGFJbmZvKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGxldCB2ZXJzaW9uU3RyaW5nO1xuICAgICAgICAgICAgaWYgKGluZm8gJiYgaW5mby5jb25kYV92ZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgdmVyc2lvblN0cmluZyA9IGluZm8uY29uZGFfdmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZE91dCA9IHlpZWxkIHRoaXMuZ2V0Q29uZGFGaWxlKClcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oY29uZGFGaWxlID0+IHByb2Nlc3NTZXJ2aWNlLmV4ZWMoY29uZGFGaWxlLCBbJy0tdmVyc2lvbiddLCB7fSkpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKHJlc3VsdCA9PiByZXN1bHQuc3Rkb3V0LnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgdmVyc2lvblN0cmluZyA9IChzdGRPdXQgJiYgc3RkT3V0LnN0YXJ0c1dpdGgoJ2NvbmRhICcpKSA/IHN0ZE91dC5zdWJzdHJpbmcoJ2NvbmRhICcubGVuZ3RoKS50cmltKCkgOiBzdGRPdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXZlcnNpb25TdHJpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gc2VtdmVyXzEucGFyc2UodmVyc2lvblN0cmluZywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXNlIGEgYm9ndXMgdmVyc2lvbiwgYXQgbGVhc3QgdG8gaW5kaWNhdGUgdGhlIGZhY3QgdGhhdCBhIHZlcnNpb24gd2FzIHJldHVybmVkLlxuICAgICAgICAgICAgbG9nZ2VyXzEuTG9nZ2VyLndhcm4oYFVuYWJsZSB0byBwYXJzZSBWZXJzaW9uIG9mIENvbmRhLCAke3ZlcnNpb25TdHJpbmd9YCk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHNlbXZlcl8xLlNlbVZlcignMC4wLjEnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbiB0aGUgc2hlbGwgZmluZCBjb25kYSAodG8gcnVuIGl0KT9cbiAgICAgKi9cbiAgICBpc0NvbmRhSW5DdXJyZW50UGF0aCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NTZXJ2aWNlID0geWllbGQgdGhpcy5wcm9jZXNzU2VydmljZUZhY3RvcnkuY3JlYXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzc1NlcnZpY2UuZXhlYygnY29uZGEnLCBbJy0tdmVyc2lvbiddKVxuICAgICAgICAgICAgICAgIC50aGVuKG91dHB1dCA9PiBvdXRwdXQuc3Rkb3V0Lmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaW5mbyByZXBvcnRlZCBieSB0aGUgY29uZGEgaW5zdGFsbC5cbiAgICAgKi9cbiAgICBnZXRDb25kYUluZm8oKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRhRmlsZSA9IHlpZWxkIHRoaXMuZ2V0Q29uZGFGaWxlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1NlcnZpY2UgPSB5aWVsZCB0aGlzLnByb2Nlc3NTZXJ2aWNlRmFjdG9yeS5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYUluZm8gPSB5aWVsZCBwcm9jZXNzU2VydmljZS5leGVjKGNvbmRhRmlsZSwgWydpbmZvJywgJy0tanNvbiddKS50aGVuKG91dHB1dCA9PiBvdXRwdXQuc3Rkb3V0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShjb25kYUluZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICAgICAgLy8gRmFpbGVkIGJlY2F1c2UgZWl0aGVyOlxuICAgICAgICAgICAgICAgIC8vICAgMS4gY29uZGEgaXMgbm90IGluc3RhbGxlZC5cbiAgICAgICAgICAgICAgICAvLyAgIDIuIGBjb25kYSBpbmZvIC0tanNvbmAgaGFzIGNoYW5nZWQgc2lnbmF0dXJlLlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcHl0aG9uIGludGVycHJldGVyIGlzIGEgY29uZGEgZW52aXJvbm1lbnQgb3Igbm90LlxuICAgICAqIFRoZSBjaGVjayBpcyBkb25lIGJ5IHNpbXBseSBsb29raW5nIGZvciB0aGUgJ2NvbmRhLW1ldGEnIGRpcmVjdG9yeS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJwcmV0ZXJQYXRoXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59XG4gICAgICogQG1lbWJlcm9mIENvbmRhU2VydmljZVxuICAgICAqL1xuICAgIGlzQ29uZGFFbnZpcm9ubWVudChpbnRlcnByZXRlclBhdGgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklGaWxlU3lzdGVtKTtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IHBhdGguZGlybmFtZShpbnRlcnByZXRlclBhdGgpO1xuICAgICAgICAgICAgY29uc3QgaXNXaW5kb3dzID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklQbGF0Zm9ybVNlcnZpY2UpLmlzV2luZG93cztcbiAgICAgICAgICAgIGNvbnN0IGNvbmRhTWV0YURpcmVjdG9yeSA9IGlzV2luZG93cyA/IHBhdGguam9pbihkaXIsICdjb25kYS1tZXRhJykgOiBwYXRoLmpvaW4oZGlyLCAnLi4nLCAnY29uZGEtbWV0YScpO1xuICAgICAgICAgICAgcmV0dXJuIGZzLmRpcmVjdG9yeUV4aXN0cyhjb25kYU1ldGFEaXJlY3RvcnkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIChlbnYgbmFtZSwgaW50ZXJwcmV0ZXIgZmlsZW5hbWUpIGZvciB0aGUgaW50ZXJwcmV0ZXIuXG4gICAgICovXG4gICAgZ2V0Q29uZGFFbnZpcm9ubWVudChpbnRlcnByZXRlclBhdGgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzQ29uZGFFbnYgPSB5aWVsZCB0aGlzLmlzQ29uZGFFbnZpcm9ubWVudChpbnRlcnByZXRlclBhdGgpO1xuICAgICAgICAgICAgaWYgKCFpc0NvbmRhRW52KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGVudmlyb25tZW50cyA9IHlpZWxkIHRoaXMuZ2V0Q29uZGFFbnZpcm9ubWVudHMoZmFsc2UpO1xuICAgICAgICAgICAgY29uc3QgZGlyID0gcGF0aC5kaXJuYW1lKGludGVycHJldGVyUGF0aCk7XG4gICAgICAgICAgICAvLyBJZiBpbnRlcnByZXRlciBpcyBpbiBiaW4gb3IgU2NyaXB0cywgdGhlbiBnbyB1cCBvbmUgbGV2ZWxcbiAgICAgICAgICAgIGNvbnN0IHN1YkRpck5hbWUgPSBwYXRoLmJhc2VuYW1lKGRpcik7XG4gICAgICAgICAgICBjb25zdCBnb1VwT25MZXZlbCA9IFsnQklOJywgJ1NDUklQVFMnXS5pbmRleE9mKHN1YkRpck5hbWUudG9VcHBlckNhc2UoKSkgIT09IC0xO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJwcmV0ZXJQYXRoVG9NYXRjaCA9IGdvVXBPbkxldmVsID8gcGF0aC5qb2luKGRpciwgJy4uJykgOiBkaXI7XG4gICAgICAgICAgICBjb25zdCBmcyA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMS5JRmlsZVN5c3RlbSk7XG4gICAgICAgICAgICAvLyBGcm9tIHRoZSBsaXN0IG9mIGNvbmRhIGVudmlyb25tZW50cyBmaW5kIHRoaXMgZGlyLlxuICAgICAgICAgICAgbGV0IG1hdGNoaW5nRW52cyA9IEFycmF5LmlzQXJyYXkoZW52aXJvbm1lbnRzKSA/IGVudmlyb25tZW50cy5maWx0ZXIoaXRlbSA9PiBmcy5hcmVQYXRoc1NhbWUoaXRlbS5wYXRoLCBpbnRlcnByZXRlclBhdGhUb01hdGNoKSkgOiBbXTtcbiAgICAgICAgICAgIGlmIChtYXRjaGluZ0VudnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZW52aXJvbm1lbnRzID0geWllbGQgdGhpcy5nZXRDb25kYUVudmlyb25tZW50cyh0cnVlKTtcbiAgICAgICAgICAgICAgICBtYXRjaGluZ0VudnMgPSBBcnJheS5pc0FycmF5KGVudmlyb25tZW50cykgPyBlbnZpcm9ubWVudHMuZmlsdGVyKGl0ZW0gPT4gZnMuYXJlUGF0aHNTYW1lKGl0ZW0ucGF0aCwgaW50ZXJwcmV0ZXJQYXRoVG9NYXRjaCkpIDogW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdFbnZzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBtYXRjaGluZ0VudnNbMF0ubmFtZSwgcGF0aDogaW50ZXJwcmV0ZXJQYXRoVG9NYXRjaCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgc3RpbGwgbm90IGF2YWlsYWJsZSwgdGhlbiB0aGUgdXNlciBjcmVhdGVkIHRoZSBlbnYgYWZ0ZXIgc3RhcnRpbmcgdnMgY29kZS5cbiAgICAgICAgICAgIC8vIFRoZSBvbmx5IHNvbHV0aW9uIGlzIHRvIGdldCB0aGUgdXNlciB0byByZS1zdGFydCB2c2NvZGUuXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGxpc3Qgb2YgY29uZGEgZW52cyAoYnkgbmFtZSwgaW50ZXJwcmV0ZXIgZmlsZW5hbWUpLlxuICAgICAqL1xuICAgIGdldENvbmRhRW52aXJvbm1lbnRzKGlnbm9yZUNhY2hlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyBHbG9iYWwgY2FjaGUuXG4gICAgICAgICAgICBjb25zdCBwZXJzaXN0ZW50RmFjdG9yeSA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JUGVyc2lzdGVudFN0YXRlRmFjdG9yeSk7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICBjb25zdCBnbG9iYWxQZXJzaXN0ZW5jZSA9IHBlcnNpc3RlbnRGYWN0b3J5LmNyZWF0ZUdsb2JhbFBlcnNpc3RlbnRTdGF0ZSgnQ09OREFfRU5WSVJPTk1FTlRTJywgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGlmICghaWdub3JlQ2FjaGUgJiYgZ2xvYmFsUGVyc2lzdGVuY2UudmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsUGVyc2lzdGVuY2UudmFsdWUuZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFGaWxlID0geWllbGQgdGhpcy5nZXRDb25kYUZpbGUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzU2VydmljZSA9IHlpZWxkIHRoaXMucHJvY2Vzc1NlcnZpY2VGYWN0b3J5LmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudkluZm8gPSB5aWVsZCBwcm9jZXNzU2VydmljZS5leGVjKGNvbmRhRmlsZSwgWydlbnYnLCAnbGlzdCddKS50aGVuKG91dHB1dCA9PiBvdXRwdXQuc3Rkb3V0KTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSB0aGlzLmNvbmRhSGVscGVyLnBhcnNlQ29uZGFFbnZpcm9ubWVudE5hbWVzKGVudkluZm8pO1xuICAgICAgICAgICAgICAgIHlpZWxkIGdsb2JhbFBlcnNpc3RlbmNlLnVwZGF0ZVZhbHVlKHsgZGF0YTogZW52aXJvbm1lbnRzIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBlbnZpcm9ubWVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCBnbG9iYWxQZXJzaXN0ZW5jZS51cGRhdGVWYWx1ZSh7IGRhdGE6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgYmVjYXVzZSBlaXRoZXI6XG4gICAgICAgICAgICAgICAgLy8gICAxLiBjb25kYSBpcyBub3QgaW5zdGFsbGVkLlxuICAgICAgICAgICAgICAgIC8vICAgMi4gYGNvbmRhIGVudiBsaXN0IGhhcyBjaGFuZ2VkIHNpZ25hdHVyZS5cbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5sb2dJbmZvcm1hdGlvbignRmFpbGVkIHRvIGdldCBjb25kYSBlbnZpcm9ubWVudCBsaXN0IGZyb20gY29uZGEnLCBleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGludGVycHJldGVyJ3MgZmlsZW5hbWUgZm9yIHRoZSBnaXZlbiBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBnZXRJbnRlcnByZXRlclBhdGgoY29uZGFFbnZpcm9ubWVudFBhdGgpIHtcbiAgICAgICAgLy8gd2hlcmUgdG8gZmluZCB0aGUgUHl0aG9uIGJpbmFyeSB3aXRoaW4gYSBjb25kYSBlbnYuXG4gICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHRoaXMucGxhdGZvcm0uaXNXaW5kb3dzID8gJ3B5dGhvbi5leGUnIDogcGF0aC5qb2luKCdiaW4nLCAncHl0aG9uJyk7XG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oY29uZGFFbnZpcm9ubWVudFBhdGgsIHJlbGF0aXZlUGF0aCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZvciB0aGUgZ2l2ZW4gaW50ZXJwcmV0ZXIgcmV0dXJuIGFuIGFjdGl2YXRlZCBDb25kYSBlbnZpcm9ubWVudCBvYmplY3RcbiAgICAgKiB3aXRoIHRoZSBjb3JyZWN0IGFkZGl0aW9uIHRvIHRoZSBwYXRoIGFuZCBlbnZpcm9ubWVudGFsIHZhcmlhYmxlc1xuICAgICAqL1xuICAgIC8vIEJhc2UgTm9kZS5qcyBTcGF3bk9wdGlvbnMgdXNlcyBhbnkgZm9yIGVudmlyb25tZW50LCBzbyB1c2UgdGhhdCBoZXJlIGFzIHdlbGxcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgZ2V0QWN0aXZhdGVkQ29uZGFFbnZpcm9ubWVudChpbnRlcnByZXRlciwgaW5wdXRFbnZpcm9ubWVudCkge1xuICAgICAgICBpZiAoaW50ZXJwcmV0ZXIudHlwZSAhPT0gY29udHJhY3RzXzEuSW50ZXJwcmV0ZXJUeXBlLkNvbmRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aXZhdGVkRW52aXJvbm1lbnQgPSBPYmplY3QuYXNzaWduKHt9LCBpbnB1dEVudmlyb25tZW50KTtcbiAgICAgICAgY29uc3QgaXNXaW5kb3dzID0gdGhpcy5wbGF0Zm9ybS5pc1dpbmRvd3M7XG4gICAgICAgIGlmIChpbnRlcnByZXRlci5lbnZQYXRoKSB7XG4gICAgICAgICAgICBpZiAoaXNXaW5kb3dzKSB7XG4gICAgICAgICAgICAgICAgLy8gV2luZG93czogUGF0aCwgOyBhcyBzZXBhcmF0b3IsICdTY3JpcHRzJyBhcyBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kYVBhdGggPSBwYXRoLmpvaW4oaW50ZXJwcmV0ZXIuZW52UGF0aCwgJ1NjcmlwdHMnKTtcbiAgICAgICAgICAgICAgICBhY3RpdmF0ZWRFbnZpcm9ubWVudC5QYXRoID0gY29uZGFQYXRoLmNvbmNhdCgnOycsIGAke2lucHV0RW52aXJvbm1lbnQuUGF0aCA/IGlucHV0RW52aXJvbm1lbnQuUGF0aCA6ICcnfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTWFjOiBQQVRILCA6IGFzIHNlcGFyYXRvciwgJ2JpbicgYXMgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFQYXRoID0gcGF0aC5qb2luKGludGVycHJldGVyLmVudlBhdGgsICdiaW4nKTtcbiAgICAgICAgICAgICAgICBhY3RpdmF0ZWRFbnZpcm9ubWVudC5QQVRIID0gY29uZGFQYXRoLmNvbmNhdCgnOicsIGAke2lucHV0RW52aXJvbm1lbnQuUEFUSCA/IGlucHV0RW52aXJvbm1lbnQuUEFUSCA6ICcnfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ29uZGEgYWxzbyB3YW50cyBhIGNvdXBsZSBvZiBlbnZpcm9ubWVudGFsIHZhcmlhYmxlcyBzZXRcbiAgICAgICAgICAgIGFjdGl2YXRlZEVudmlyb25tZW50LkNPTkRBX1BSRUZJWCA9IGludGVycHJldGVyLmVudlBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGludGVycHJldGVyLmVudk5hbWUpIHtcbiAgICAgICAgICAgIGFjdGl2YXRlZEVudmlyb25tZW50LkNPTkRBX0RFRkFVTFRfRU5WID0gaW50ZXJwcmV0ZXIuZW52TmFtZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWN0aXZhdGVkRW52aXJvbm1lbnQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIElzIHRoZSBnaXZlbiBpbnRlcnByZXRlciBmcm9tIGNvbmRhP1xuICAgICAqL1xuICAgIGRldGVjdENvbmRhRW52aXJvbm1lbnQoaW50ZXJwcmV0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGludGVycHJldGVyLnR5cGUgPT09IGNvbnRyYWN0c18xLkludGVycHJldGVyVHlwZS5Db25kYSB8fFxuICAgICAgICAgICAgKGludGVycHJldGVyLmRpc3BsYXlOYW1lID8gaW50ZXJwcmV0ZXIuZGlzcGxheU5hbWUgOiAnJykudG9VcHBlckNhc2UoKS5pbmRleE9mKCdBTkFDT05EQScpID49IDAgfHxcbiAgICAgICAgICAgIChpbnRlcnByZXRlci5jb21wYW55RGlzcGxheU5hbWUgPyBpbnRlcnByZXRlci5jb21wYW55RGlzcGxheU5hbWUgOiAnJykudG9VcHBlckNhc2UoKS5pbmRleE9mKCdBTkFDT05EQScpID49IDAgfHxcbiAgICAgICAgICAgIChpbnRlcnByZXRlci5jb21wYW55RGlzcGxheU5hbWUgPyBpbnRlcnByZXRlci5jb21wYW55RGlzcGxheU5hbWUgOiAnJykudG9VcHBlckNhc2UoKS5pbmRleE9mKCdDT05USU5VVU0nKSA+PSAwO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGhpZ2hlc3QgUHl0aG9uIHZlcnNpb24gZnJvbSB0aGUgZ2l2ZW4gbGlzdC5cbiAgICAgKi9cbiAgICBnZXRMYXRlc3RWZXJzaW9uKGludGVycHJldGVycykge1xuICAgICAgICBjb25zdCBzb3J0ZWRJbnRlcnByZXRlcnMgPSBpbnRlcnByZXRlcnMuZmlsdGVyKGludGVycHJldGVyID0+IGludGVycHJldGVyLnZlcnNpb24gJiYgaW50ZXJwcmV0ZXIudmVyc2lvbi5sZW5ndGggPiAwKTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBzb3J0ZWRJbnRlcnByZXRlcnMuc29ydCgoYSwgYikgPT4gdmVyc2lvbl8xLmNvbXBhcmVWZXJzaW9uKGEudmVyc2lvbiwgYi52ZXJzaW9uKSk7XG4gICAgICAgIGlmIChzb3J0ZWRJbnRlcnByZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNvcnRlZEludGVycHJldGVyc1tzb3J0ZWRJbnRlcnByZXRlcnMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBcImNvbmRhIGZpbGVcIiwgaWYgdGhlcmUgaXMgb25lIChpbiBrbm93biBsb2NhdGlvbnMpLlxuICAgICAqL1xuICAgIGdldENvbmRhRmlsZUltcGwoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuc2VydmljZUNvbnRhaW5lci5nZXQodHlwZXNfMy5JQ29uZmlndXJhdGlvblNlcnZpY2UpLmdldFNldHRpbmdzKCk7XG4gICAgICAgICAgICBjb25zdCBmaWxlU3lzdGVtID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklGaWxlU3lzdGVtKTtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmcgPSBzZXR0aW5ncy5jb25kYVBhdGg7XG4gICAgICAgICAgICBpZiAoc2V0dGluZyAmJiBzZXR0aW5nICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXR0aW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaXNBdmFpbGFibGUgPSB5aWVsZCB0aGlzLmlzQ29uZGFJbkN1cnJlbnRQYXRoKCk7XG4gICAgICAgICAgICBpZiAoaXNBdmFpbGFibGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NvbmRhJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXRmb3JtLmlzV2luZG93cyAmJiB0aGlzLnJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcnByZXRlcnMgPSB5aWVsZCB0aGlzLnJlZ2lzdHJ5TG9va3VwRm9yQ29uZGEuZ2V0SW50ZXJwcmV0ZXJzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFJbnRlcnByZXRlcnMgPSBpbnRlcnByZXRlcnMuZmlsdGVyKHRoaXMuZGV0ZWN0Q29uZGFFbnZpcm9ubWVudCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGFJbnRlcnByZXRlciA9IHRoaXMuZ2V0TGF0ZXN0VmVyc2lvbihjb25kYUludGVycHJldGVycyk7XG4gICAgICAgICAgICAgICAgbGV0IGNvbmRhUGF0aCA9IGNvbmRhSW50ZXJwcmV0ZXIgPyBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKGNvbmRhSW50ZXJwcmV0ZXIucGF0aCksICdjb25kYS5leGUnKSA6ICcnO1xuICAgICAgICAgICAgICAgIGlmICh5aWVsZCBmaWxlU3lzdGVtLmZpbGVFeGlzdHMoY29uZGFQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uZGFQYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBDb25kYSBwYXRoIGhhcyBjaGFuZ2VkIGxvY2F0aW9ucywgY2hlY2sgdGhlIG5ldyBsb2NhdGlvbiBpbiB0aGUgc2NyaXB0cyBkaXJlY3RvcnkgYWZ0ZXIgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICAvLyB0aGUgb2xkIGxvY2F0aW9uXG4gICAgICAgICAgICAgICAgY29uZGFQYXRoID0gY29uZGFJbnRlcnByZXRlciA/IHBhdGguam9pbihwYXRoLmRpcm5hbWUoY29uZGFJbnRlcnByZXRlci5wYXRoKSwgJ1NjcmlwdHMnLCAnY29uZGEuZXhlJykgOiAnJztcbiAgICAgICAgICAgICAgICBpZiAoeWllbGQgZmlsZVN5c3RlbS5maWxlRXhpc3RzKGNvbmRhUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmRhUGF0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb25kYUZpbGVGcm9tS25vd25Mb2NhdGlvbnMoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgcGF0aCB0byB0aGUgXCJjb25kYSBmaWxlXCIsIGlmIHRoZXJlIGlzIG9uZSAoaW4ga25vd24gbG9jYXRpb25zKS5cbiAgICAgKiBOb3RlOiBGb3Igbm93IHdlIHNpbXBseSByZXR1cm4gdGhlIGZpcnN0IG9uZSBmb3VuZC5cbiAgICAgKi9cbiAgICBnZXRDb25kYUZpbGVGcm9tS25vd25Mb2NhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlU3lzdGVtID0gdGhpcy5zZXJ2aWNlQ29udGFpbmVyLmdldCh0eXBlc18xLklGaWxlU3lzdGVtKTtcbiAgICAgICAgICAgIGNvbnN0IGdsb2JQYXR0ZXJuID0gdGhpcy5wbGF0Zm9ybS5pc1dpbmRvd3MgPyBleHBvcnRzLkNvbmRhTG9jYXRpb25zR2xvYldpbiA6IGV4cG9ydHMuQ29uZGFMb2NhdGlvbnNHbG9iO1xuICAgICAgICAgICAgY29uc3QgY29uZGFGaWxlcyA9IHlpZWxkIGZpbGVTeXN0ZW0uc2VhcmNoKGdsb2JQYXR0ZXJuKVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZmFpbFJlYXNvbikgPT4ge1xuICAgICAgICAgICAgICAgIGxvZ2dlcl8xLkxvZ2dlci53YXJuKCdEZWZhdWx0IGNvbmRhIGxvY2F0aW9uIHNlYXJjaCBmYWlsZWQuJywgYFNlYXJjaGluZyBmb3IgZGVmYXVsdCBpbnN0YWxsIGxvY2F0aW9ucyBmb3IgY29uZGEgcmVzdWx0cyBpbiBlcnJvcjogJHtmYWlsUmVhc29ufWApO1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRDb25kYUZpbGVzID0gY29uZGFGaWxlcy5maWx0ZXIoY29uZGFQYXRoID0+IGNvbmRhUGF0aC5sZW5ndGggPiAwKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxpZENvbmRhRmlsZXMubGVuZ3RoID09PSAwID8gJ2NvbmRhJyA6IHZhbGlkQ29uZGFGaWxlc1swXTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbkNvbmRhU2VydmljZSA9IF9fZGVjb3JhdGUoW1xuICAgIGludmVyc2lmeV8xLmluamVjdGFibGUoKSxcbiAgICBfX3BhcmFtKDAsIGludmVyc2lmeV8xLmluamVjdCh0eXBlc180LklTZXJ2aWNlQ29udGFpbmVyKSksXG4gICAgX19wYXJhbSgxLCBpbnZlcnNpZnlfMS5pbmplY3QoY29udHJhY3RzXzEuSUludGVycHJldGVyTG9jYXRvclNlcnZpY2UpKSwgX19wYXJhbSgxLCBpbnZlcnNpZnlfMS5uYW1lZChjb250cmFjdHNfMS5XSU5ET1dTX1JFR0lTVFJZX1NFUlZJQ0UpKSwgX19wYXJhbSgxLCBpbnZlcnNpZnlfMS5vcHRpb25hbCgpKVxuXSwgQ29uZGFTZXJ2aWNlKTtcbmV4cG9ydHMuQ29uZGFTZXJ2aWNlID0gQ29uZGFTZXJ2aWNlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uZGFTZXJ2aWNlLmpzLm1hcCJdfQ==