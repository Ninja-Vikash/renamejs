#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const index_1 = require("./index");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
program
    .name("caselyjs")
    .description("Transform codebase file and directory casing")
    .version("2.0.0")
    .argument("[path]", "Path to process", ".")
    .option("-c, --case <type>", "Target case: camel, kebab, pascal", "kebab")
    .option("-e, --ext <extensions>", "Comma separated extensions", "js,jsx,ts,tsx")
    .option("-f, --full", "Rename directories as well", false)
    .option("--dry", "Dry run (show changes without applying)", false)
    .action(async (path, options) => {
    console.log(chalk_1.default.blue.bold(`\n🚀 CaselyJS starting in ${path}...`));
    index_1.casely.config({
        path: path,
        case: options.case,
        file: options.ext.split(","),
        operate: options.full ? "full" : "partial",
        dryRun: options.dry,
    });
    console.log(`\n[CONFIG] { path: '${path}',  case: '${options.case}', operate: '${options.full ? "full" : "partial"}' }\n`);
    await index_1.casely.execute();
    console.log(chalk_1.default.green.bold("\n✨ Casing transformation complete!"));
});
program.parse();
//# sourceMappingURL=bin.js.map