import path from "path";

import { pathResolver } from "./tools/resolver.js";
import { caseIdentifier } from "./tools/case-identifier.js";
import { mutateCase } from "./tools/mutate-case.js";

// ------------------------------------------------

let defaultConfig = {
  path: "",
  file: ["js", "jsx"],
  case: "kebab",
  operate: "partial",
};

// -------------------------------------------------

export const rename = {
  config(options = {}) {
    defaultConfig = {
      ...defaultConfig,
      ...options,
    };
  },

  async execute() {
    const { files, folders } = pathResolver(defaultConfig.path, {
      recursive: true,
    });

    for (const file of files) {
      const value = file.split("/").pop();
      const fullPath = path.resolve(file);
      const [fileName, fileExt] = value.split(".");
      const currentCase = caseIdentifier(fileName);

      if (defaultConfig.file.includes(fileExt)) {
        if (currentCase !== defaultConfig.case) {
          await mutateCase(fullPath, currentCase, defaultConfig.case);
        }
      }
    }

    if (defaultConfig.operate === "full") {
      for (const folder of folders) {
        const value = folder.split("/").pop();
        const fullPath = path.resolve(folder);
        const currentCase = caseIdentifier(value);

        if (currentCase !== defaultConfig.case) {
          await mutateCase(fullPath, currentCase, defaultConfig.case);
        }
      }
    }
  },
};
