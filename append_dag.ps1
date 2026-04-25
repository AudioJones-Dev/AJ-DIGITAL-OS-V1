Set-Location 'C:\dev\AJ-DIGITAL-OS'

$dagExports = @"


export { DagCreateCommand } from "./dag-create.command.js";
export type { DagCreateCommandInput, DagCreateCommandResult } from "./dag-create.command.js";

export { DagListCommand } from "./dag-list.command.js";
export type { DagListCommandInput, DagListCommandResult } from "./dag-list.command.js";

export { DagInspectCommand } from "./dag-inspect.command.js";
export type { DagInspectCommandInput, DagInspectCommandResult } from "./dag-inspect.command.js";

export { DagExecuteCommand } from "./dag-execute.command.js";
export type { DagExecuteCommandInput, DagExecuteCommandResult } from "./dag-execute.command.js";

export { DagRetryNodeCommand } from "./dag-retry-node.command.js";
export type { DagRetryNodeCommandInput, DagRetryNodeCommandResult } from "./dag-retry-node.command.js";

export { DagSkipNodeCommand } from "./dag-skip-node.command.js";
export type { DagSkipNodeCommandInput, DagSkipNodeCommandResult } from "./dag-skip-node.command.js";

export { DagAuditCommand } from "./dag-audit.command.js";
export type { DagAuditCommandInput, DagAuditCommandResult } from "./dag-audit.command.js";

export { DagOutputsCommand } from "./dag-outputs.command.js";
export type { DagOutputsCommandInput, DagOutputsCommandResult } from "./dag-outputs.command.js";
"@

Add-Content 'src/commands/index.ts' $dagExports
Write-Host "Appended DAG exports"
