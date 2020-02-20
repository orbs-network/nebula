import chalk from "chalk";
import path from "path";
import fs from "fs";
const readFile = fs.readFileSync;
import { isEmpty } from "lodash";

export type FileOptions = RawOptions & {
  name?: any;
  cachePath?: any;
  fileMode?: boolean;
  _file?: string;
  __fileDirname?: any;
};

export type Handler = (
  params: FileOptions
) => Promise<{ ok: boolean; result: any }>;

export type RawOptions = {
  file?: string;
  orbsPrivateKey?: string;
  sslCertificatePath?: any;
  sslPrivateKeyPath?: any;
  name?: any;
  cachePath?: any;
  fileMode?: boolean | undefined;
  _file?: string | undefined;
};
export function getComposeFileOrFlagsHandler(handler: Handler) {
  let argsAsFile;

  return (argv: RawOptions) => {
    let _argv = {} as FileOptions;

    if (argv.file !== undefined && argv.file !== "") {
      try {
        let pathToRequire = resolveHome(argv.file);
        if (pathToRequire.substr(0, 1) !== "/") {
          pathToRequire = path.join(process.cwd(), pathToRequire);
        }

        argsAsFile = JSON.parse(readFile(pathToRequire, "utf8").toString());
        argsAsFile._file = argv.file;
        argsAsFile.fileMode = true;
        argsAsFile.__fileDirname = path.dirname(pathToRequire);
      } catch (err) {
        logRed("Problem opening your arguments file!");
        logRed(err);
        process.exit(1);
      }

      _argv = argsAsFile;
    } else {
      _argv = argv;
    }

    if (!isEmpty(argv.orbsPrivateKey)) {
      _argv.orbsPrivateKey = argv.orbsPrivateKey;
    }

    if (!isEmpty(argv.sslCertificatePath)) {
      _argv.sslCertificatePath = argv.sslCertificatePath;
    }

    if (!isEmpty(argv.sslPrivateKeyPath)) {
      _argv.sslPrivateKeyPath = argv.sslPrivateKeyPath;
    }

    return handler(_argv);
  };
}

export function resolveHome(filepath: string) {
  if (filepath[0] === "~") {
    return path.join(process.env.HOME || "./", filepath.slice(1));
  }
  return filepath;
}

export function ValidateIPaddress(ipaddress: string) {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ipaddress
    )
  ) {
    return true;
  }
  return false;
}

export function logGreen(text: string) {
  console.log(chalk.greenBright(text));
}

export function logRed(text: string) {
  console.log(chalk.redBright(text));
}
