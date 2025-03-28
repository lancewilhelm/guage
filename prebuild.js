import "dotenv/config";
import fs from "fs";
import path from "path";

// Decide which database provider to use based on an environment variable
const isPostgres = !!process.env.DATABASE_URL;

// Directory where your DB files live. Adjust this if your folder structure differs.
const dbDir = "utils/db";

// Determine the source file names based on your DB type
const cloudSource = path.join(
  dbDir,
  isPostgres ? "cloud.pg.ts" : "cloud.sqlite.ts",
);
const schemaSource = path.join(
  dbDir,
  isPostgres ? "schema.pg.ts" : "schema.sqlite.ts",
);

// Define the target file names that your application will always import
const cloudTarget = path.join(dbDir, "cloud.ts");
const schemaTarget = path.join(dbDir, "schema.ts");

try {
  fs.copyFileSync(cloudSource, cloudTarget);
  fs.copyFileSync(schemaSource, schemaTarget);
  console.log(`Copied ${cloudSource} → ${cloudTarget}`);
  console.log(`Copied ${schemaSource} → ${schemaTarget}`);
} catch (error) {
  console.error("Error during prebuild:", error);
  process.exit(1);
}
