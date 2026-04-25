/**
 * Approval Resolution CLI
 *
 * Usage:
 *   node dist/security/approvals/approval-cli.js list
 *   node dist/security/approvals/approval-cli.js approve <approvalId>
 *   node dist/security/approvals/approval-cli.js deny <approvalId>
 *
 * Exit codes:
 *   0  success
 *   1  user / action error (missing ID, expired, not found, bad command)
 *   2  unexpected system error
 */

import { ApprovalService } from "./approval-service.js";
import { PersistentApprovalStore } from "./persistent-approval-store.js";
import type { ApprovalRequest } from "./approval-types.js";

const ACTOR_ID = process.env.AJ_OPERATOR_ID ?? "operator-cli";

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value + " ".repeat(width - value.length);
}

const LIST_COLS: Array<{ header: string; key: keyof ApprovalRequest; width: number }> = [
  { header: "approvalId",   key: "approvalId",      width: 38 },
  { header: "requestedAt",  key: "requestedAt",     width: 26 },
  { header: "expiresAt",    key: "expiresAt",       width: 26 },
  { header: "category",     key: "actionCategory",  width: 24 },
  { header: "risk",         key: "risk",            width: 10 },
  { header: "environment",  key: "environment",     width: 12 },
  { header: "clientId",     key: "clientId",        width: 20 },
  { header: "target",       key: "target",          width: 30 },
  { header: "reason",       key: "reason",          width: 50 },
];

function formatTable(approvals: ApprovalRequest[]): string {
  if (approvals.length === 0) {
    return "No pending approvals.";
  }

  const separator = LIST_COLS.map((c) => "-".repeat(c.width)).join("  ");
  const header    = LIST_COLS.map((c) => pad(c.header, c.width)).join("  ");

  const rows = approvals.map((a) =>
    LIST_COLS.map((c) => {
      const raw = a[c.key];
      return pad(raw != null ? String(raw) : "", c.width);
    }).join("  "),
  );

  return [header, separator, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

async function cmdList(service: ApprovalService): Promise<number> {
  const pending = await service.listPendingApprovals();
  console.log(formatTable(pending));
  return 0;
}

async function cmdApprove(service: ApprovalService, approvalId: string): Promise<number> {
  const existing = await service.getApprovalById(approvalId);
  if (!existing) {
    console.error(`Error: Approval not found: ${approvalId}`);
    return 1;
  }
  if (existing.status === "expired") {
    console.error(`Error: Approval ${approvalId} has expired and cannot be approved.`);
    return 1;
  }

  const updated = await service.approvePendingRequest({
    approvalId,
    actorId: ACTOR_ID,
    channel: "cli",
  });
  console.log(`Approved: ${updated.approvalId} (by ${updated.approvedBy ?? ACTOR_ID})`);
  return 0;
}

async function cmdDeny(service: ApprovalService, approvalId: string): Promise<number> {
  const existing = await service.getApprovalById(approvalId);
  if (!existing) {
    console.error(`Error: Approval not found: ${approvalId}`);
    return 1;
  }
  if (existing.status === "expired") {
    console.error(`Error: Approval ${approvalId} has expired and cannot be denied.`);
    return 1;
  }

  const updated = await service.denyPendingRequest({
    approvalId,
    actorId: ACTOR_ID,
    channel: "cli",
  });
  console.log(`Denied: ${updated.approvalId} (by ${updated.approvedBy ?? ACTOR_ID})`);
  return 0;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runApprovalCli(
  argv: string[],
  service?: ApprovalService,
): Promise<number> {
  const svc = service ?? new ApprovalService(new PersistentApprovalStore());
  const [command, approvalId] = argv;

  try {
    switch (command) {
      case "list": {
        return await cmdList(svc);
      }
      case "approve": {
        if (!approvalId) {
          console.error("Usage: approval-cli approve <approvalId>");
          return 1;
        }
        return await cmdApprove(svc, approvalId);
      }
      case "deny": {
        if (!approvalId) {
          console.error("Usage: approval-cli deny <approvalId>");
          return 1;
        }
        return await cmdDeny(svc, approvalId);
      }
      default: {
        console.error(`Unknown command: ${command ?? "(none)"}`);
        console.error("Commands: list | approve <id> | deny <id>");
        return 1;
      }
    }
  } catch (err: unknown) {
    console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
    return 2;
  }
}

// ---------------------------------------------------------------------------
// Direct execution
// ---------------------------------------------------------------------------

if (
  process.argv[1] != null &&
  (process.argv[1].endsWith("approval-cli.ts") || process.argv[1].endsWith("approval-cli.js"))
) {
  runApprovalCli(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(2);
    });
}
