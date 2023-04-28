import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Filter } from "./types/filter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filterFiles = await fs.readdir(join(__dirname, "filters"));
const filters: Filter[] = (
  await Promise.all(
    filterFiles.map(async (file) => {
      const filter = await import(join(__dirname, "filters", file));
      return Object.values(filter) as Filter[];
    })
  )
).flat();

export default filters;
