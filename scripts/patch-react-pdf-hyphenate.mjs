import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

/** Node 24 + CJS (tsx) potřebuje `require` v exports mapě @react-pdf/hyphenate. */
const pkgPath = path.join(
  process.cwd(),
  "node_modules/@react-pdf/hyphenate/package.json",
);

if (!existsSync(pkgPath)) process.exit(0);

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const exportsMap = pkg.exports;
if (!exportsMap?.["."]?.require) {
  pkg.exports = {
    ".": {
      types: "./lib/index.d.ts",
      import: "./lib/index.js",
      require: "./lib/index.js",
      default: "./lib/index.js",
    },
    "./*": {
      types: "./lib/*.d.ts",
      import: "./lib/*.js",
      require: "./lib/*.js",
      default: "./lib/*.js",
    },
  };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("patched @react-pdf/hyphenate exports for Node CJS");
}
