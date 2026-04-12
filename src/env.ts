import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {
  // .env is optional — may not exist in CI or production
}
