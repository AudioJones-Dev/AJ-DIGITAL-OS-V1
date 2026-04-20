#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const commands = [
  {
    command: ["node", "dist/cli.js", "help"],
    expect: ["AJ DIGITAL OS HELP"],
  },
  {
    command: ["node", "dist/cli.js", "dashboard"],
    expect: ["AJ DIGITAL OS DASHBOARD", "Total Runs: 4"],
  },
  {
    command: ["node", "dist/cli.js", "operator-console"],
    expect: ["AJ DIGITAL OS OPERATOR CONSOLE"],
  },
  {
    command: ["node", "dist/cli.js", "run-summary", "--runId", "run_demo_pending_001"],
    expect: ["AJ DIGITAL OS RUN SUMMARY", "Run ID: run_demo_pending_001"],
  },
  {
    command: ["node", "dist/cli.js", "list-pending-approvals"],
    expect: ["AJ DIGITAL OS PENDING APPROVALS", "Total Pending: 1"],
  },
  {
    command: ["node", "dist/cli.js", "approve-run", "--runId", "run_demo_pending_001", "--decision", "approve", "--actor", "SmokeTest"],
    expect: ["AJ DIGITAL OS APPROVE RUN", "New Status: approved"],
  },
];

const run = (commandParts) => spawnSync(commandParts[0], commandParts.slice(1), {
  encoding: "utf-8",
  stdio: "pipe",
});

const execute = (name, commandParts, expectedSubstrings) => {
  const result = run(commandParts);
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status}.\n${combined}`);
  }

  for (const needle of expectedSubstrings) {
    if (!combined.includes(needle)) {
      throw new Error(`${name} missing expected output: "${needle}".\n${combined}`);
    }
  }
};

execute("build", ["npm", "run", "build"], ["tsc"]);
execute("seed", ["node", "scripts/seed-demo-data.mjs"], ["Seeded 4 demo runs"]);

for (const entry of commands) {
  execute(entry.command.join(" "), entry.command, entry.expect);
}

console.log(`Smoke suite passed (${commands.length} commands).`);
