import { readFileSync, writeFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8")),
  lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const group of ["dependencies", "devDependencies"])
  for (const name of Object.keys(pkg[group])) {
    const version = JSON.parse(
      readFileSync(`node_modules/${name}/package.json`, "utf8"),
    ).version;
    pkg[group][name] = version;
    lock.packages[""][group][name] = version;
  }
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
writeFileSync("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
console.log("Pinned direct dependencies to the installed, verified versions.");
