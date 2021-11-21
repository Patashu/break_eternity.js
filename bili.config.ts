import { Config } from "bili";

const config: Config = {
  input: "src/index.ts",
  extendRollupConfig: (config) => {
    config.outputConfig.exports = "auto";
    return config;
  },
  output: {
    format: ["umd", "umd-min", "esm", "cjs"],
    moduleName: "Decimal",
    sourceMap: false,
    fileName: (context, defaultFileName) => {
      switch (context.format) {
        case "umd":
          return context.minify ? "break_eternity.min.js" : "break_eternity.js";
        case "esm":
          return "break_eternity.esm.js";
        case "cjs":
          return "break_eternity.cjs.js";
        default:
          return defaultFileName;
      }
    },
  },
};

export default config;
