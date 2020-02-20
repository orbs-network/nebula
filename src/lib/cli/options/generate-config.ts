import { Argv } from "yargs";

export function generateConfigOptions(yargs: Argv) {
  return yargs.option("config-path", {}).help("help");
}
