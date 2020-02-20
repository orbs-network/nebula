import { Argv } from "yargs";

export function updateOptions(yargs: Argv) {
  return yargs
    .option("file", {
      describe:
        "a JSON file representing all flags here for the terminal sake!",
      alias: "f",
      default: undefined
    })
    .option("name", {
      describe: "name of your constellation",
      default: false
    })
    .option("region", {})
    .option("config-path", {})
    .option("chain-version", {});
}
