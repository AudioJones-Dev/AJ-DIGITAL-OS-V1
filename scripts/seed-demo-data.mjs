#!/usr/bin/env node
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const runsDirectory = path.resolve(repoRoot, "src", "data", "runs");
const eventsDirectory = path.resolve(repoRoot, "src", "data", "reports", "runs");

const now = new Date("2026-04-20T12:00:00.000Z");

const timestamp = (offsetMinutes) => new Date(now.getTime() + offsetMinutes * 60_000).toISOString();

const runRecords = [
  {
    runId: "run_demo_pending_001",
    workflowId: "blog-authority",
    taskType: "blog_post",
    clientId: "client_demo",
    status: "pending_approval",
    createdAt: timestamp(-240),
    updatedAt: timestamp(-210),
    revisionCount: 0,
    approvalRequired: true,
    approvalStatus: "pending",
    warnings: [],
    errors: [],
  },
  {
    runId: "run_demo_approved_001",
    workflowId: "transcript-to-content",
    taskType: "repurpose_transcript",
    clientId: "client_demo",
    status: "approved",
    createdAt: timestamp(-180),
    updatedAt: timestamp(-150),
    revisionCount: 0,
    approvalRequired: true,
    approvalStatus: "approved",
    approvedAt: timestamp(-150),
    approvedBy: "QA",
    warnings: [],
    errors: [],
  },
  {
    runId: "run_demo_executed_001",
    workflowId: "blog-authority",
    taskType: "blog_post",
    clientId: "client_demo",
    status: "executed",
    createdAt: timestamp(-120),
    updatedAt: timestamp(-90),
    revisionCount: 0,
    approvalRequired: true,
    approvalStatus: "approved",
    approvedAt: timestamp(-100),
    approvedBy: "Editor",
    publishedPath: "src/data/clients/client_demo/outputs/run_demo_executed_001",
    publishedFiles: ["article.md", "metadata.json"],
    warnings: [],
    errors: [],
  },
  {
    runId: "run_demo_failed_001",
    workflowId: "transcript-to-content",
    taskType: "repurpose_transcript",
    clientId: "client_demo",
    status: "validation_failed",
    createdAt: timestamp(-60),
    updatedAt: timestamp(-30),
    revisionCount: 1,
    approvalRequired: true,
    approvalStatus: "not_requested",
    warnings: ["Transcript confidence was low in one section."],
    errors: ["Validation failed due to missing required summary section."],
  },
];

const runEventsByRunId = {
  run_demo_pending_001: [
    { type: "run_created", message: "Run created." },
    { type: "workflow_started", message: "Workflow started." },
    { type: "workflow_completed", message: "Workflow completed." },
    { type: "validation_passed", message: "Validation passed." },
    { type: "approval_requested", message: "Approval requested." },
  ],
  run_demo_approved_001: [
    { type: "run_created", message: "Run created." },
    { type: "workflow_started", message: "Workflow started." },
    { type: "workflow_completed", message: "Workflow completed." },
    { type: "validation_passed", message: "Validation passed." },
    { type: "approval_requested", message: "Approval requested." },
    { type: "approval_approved", message: "Run approved." },
  ],
  run_demo_executed_001: [
    { type: "run_created", message: "Run created." },
    { type: "workflow_completed", message: "Workflow completed." },
    { type: "validation_passed", message: "Validation passed." },
    { type: "approval_approved", message: "Run approved." },
    { type: "execution_started", message: "Execution started." },
    { type: "artifact_written", message: "Published output written.", metadata: { fileName: "article.md" } },
    { type: "execution_completed", message: "Execution completed." },
  ],
  run_demo_failed_001: [
    { type: "run_created", message: "Run created." },
    { type: "workflow_started", message: "Workflow started." },
    { type: "validation_failed", message: "Validation failed." },
    { type: "error", message: "Validation failed due to missing required summary section." },
  ],
};

const parseArgs = () => ({
  reset: !process.argv.includes("--no-reset"),
});

const sanitizeRunId = (runId) => runId.replace(/[^a-zA-Z0-9-_]/g, "_");

const seed = async () => {
  const args = parseArgs();

  if (args.reset) {
    await rm(runsDirectory, { recursive: true, force: true });
    await rm(eventsDirectory, { recursive: true, force: true });
  }

  await mkdir(runsDirectory, { recursive: true });
  await mkdir(eventsDirectory, { recursive: true });

  for (const run of runRecords) {
    const runFilePath = path.join(runsDirectory, `${sanitizeRunId(run.runId)}.json`);
    await writeFile(runFilePath, `${JSON.stringify(run, null, 2)}\n`, "utf-8");

    const runEvents = (runEventsByRunId[run.runId] ?? []).map((event, index) => ({
      eventId: `${run.runId}_event_${index + 1}`,
      runId: run.runId,
      type: event.type,
      timestamp: timestamp(-200 + index),
      ...(event.message ? { message: event.message } : {}),
      ...(event.metadata ? { metadata: event.metadata } : {}),
    }));

    const eventsFilePath = path.join(eventsDirectory, `${sanitizeRunId(run.runId)}.events.json`);
    await writeFile(eventsFilePath, `${JSON.stringify(runEvents, null, 2)}\n`, "utf-8");
  }

  console.log(`Seeded ${runRecords.length} demo runs into src/data/runs and src/data/reports/runs.`);
};

await seed();
