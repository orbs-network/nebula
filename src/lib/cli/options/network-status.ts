import { Argv } from "yargs";

export function networkStatusOptions(yargs: Argv) {
  return yargs.option("config-path", {}).option("vchain", {});
}
