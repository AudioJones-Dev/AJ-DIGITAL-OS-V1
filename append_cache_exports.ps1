Set-Location 'C:\dev\AJ-DIGITAL-OS'

# Append cache command exports to commands/index.ts
$cacheExports = @"


export { CacheLookupCommand } from "./cache-lookup.command.js";
export type {
  CacheLookupCommandInput,
  CacheLookupCommandResult,
} from "./cache-lookup.command.js";

export { CacheWriteCommand } from "./cache-write.command.js";
export type {
  CacheWriteCommandInput,
  CacheWriteCommandResult,
} from "./cache-write.command.js";

export { CacheInvalidateCommand } from "./cache-invalidate.command.js";
export type {
  CacheInvalidateCommandInput,
  CacheInvalidateCommandResult,
} from "./cache-invalidate.command.js";

export { CacheListCommand } from "./cache-list.command.js";
export type {
  CacheListCommandInput,
  CacheListCommandResult,
} from "./cache-list.command.js";

export { CacheAuditCommand } from "./cache-audit.command.js";
export type {
  CacheAuditCommandInput,
  CacheAuditCommandResult,
} from "./cache-audit.command.js";

export { CacheStatsCommand } from "./cache-stats.command.js";
export type {
  CacheStatsCommandInput,
  CacheStatsCommandResult,
} from "./cache-stats.command.js";
"@

Add-Content 'src/commands/index.ts' $cacheExports
Write-Host "Appended cache exports to commands/index.ts"
