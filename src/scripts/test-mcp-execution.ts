import { classifyMcpTask, type McpTaskClassification } from "../mcp/mcp-task-classifier.js";
import { evaluateMcpPolicy } from "../mcp/mcp-policy.js";

type CaseDef = {
  name: string;
  task: string;
  expectedClassification: McpTaskClassification;
  expectedApproved: boolean;
};

const cases: CaseDef[] = [
  {
    name: "list files in C:\\dev\\aj-digital-os",
    task: "list files in C:\\dev\\aj-digital-os",
    expectedClassification: "filesystem_task",
    expectedApproved: true,
  },
  {
    name: "read package.json",
    task: "read package.json",
    expectedClassification: "filesystem_task",
    expectedApproved: true,
  },
  {
    name: "run git status",
    task: "run git status",
    expectedClassification: "shell_task",
    expectedApproved: true,
  },
  {
    name: "blocked delete files",
    task: "delete files in C:\\dev\\aj-digital-os",
    expectedClassification: "unsafe_task",
    expectedApproved: false,
  },
  {
    name: "blocked read .env",
    task: "read C:\\dev\\aj-digital-os\\.env",
    expectedClassification: "filesystem_task",
    expectedApproved: false,
  },
  {
    name: "blocked access AppData",
    task: "list files in C:\\Users\\tyron.AUDIOJONES\\AppData",
    expectedClassification: "filesystem_task",
    expectedApproved: false,
  },
];

async function main(): Promise<void> {
  let passed = 0;

  for (const c of cases) {
    const classification = classifyMcpTask(c.task);
    const policy = evaluateMcpPolicy({ task: c.task, classification });

    const ok = classification === c.expectedClassification && policy.approved === c.expectedApproved;
    if (ok) passed += 1;

    console.log(
      JSON.stringify(
        {
          case: c.name,
          ok,
          classification,
          approved: policy.approved,
          reason: policy.reason,
          plannedAction: policy.plannedAction,
        },
        null,
        2,
      ),
    );
  }

  const summary = `${passed}/${cases.length} MCP policy checks passed`;
  console.log(summary);

  if (passed !== cases.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("MCP execution smoke test failed:", err);
  process.exit(1);
});
