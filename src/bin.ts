#!/usr/bin/env node
import { Command } from "commander";
import { casely } from "./index";
import chalk from "chalk";

const program = new Command();

program
  .name("caselyjs")
  .description("Transform codebase file and directory casing")
  .version("2.0.0")
  .argument("[path]", "Path to process", ".")
  .option("-c, --case <type>", "Target case: camel, kebab, pascal", "kebab")
  .option(
    "-e, --ext <extensions>",
    "Comma separated extensions",
    "js,jsx,ts,tsx",
  )
  .option("-f, --full", "Rename directories as well", false)
  .option("--dry", "Dry run (show changes without applying)", false)
  .action(async (path, options) => {
    console.log(chalk.blue.bold(`\n🚀 CaselyJS starting in ${path}...`));

    casely.config({
      path: path,
      case: options.case,
      file: options.ext.split(","),
      operate: options.full ? "full" : "partial",
      dryRun: options.dry,
    });

    console.log(
      `\n[CONFIG] { path: '${path}',  case: '${options.case}', operate: '${options.full ? "full" : "partial"}' }\n`,
    );

    await casely.execute();
    console.log(chalk.green.bold("\n✨ Casing transformation complete!"));
  });

program.parse();
