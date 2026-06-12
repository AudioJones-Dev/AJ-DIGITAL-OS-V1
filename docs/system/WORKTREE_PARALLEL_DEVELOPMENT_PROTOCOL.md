# WORKTREE PARALLEL DEVELOPMENT PROTOCOL
Status: Repo Copy
Canonical Version: 1.0
Owner: AJ Digital LLC
Canonical Source: AJ-DIGITAL-VAULT/02-OPERATING-SYSTEM/Protocols/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md
Applies To: All Repositories, Agents, Contributors, Contractors, and Automation Systems
---
# Purpose
This repository copy derives from the canonical Obsidian protocol.

This protocol defines how parallel development is performed across all AJ Digital repositories.
The objective is to:
- Prevent scope contamination
- Reduce merge conflicts
- Isolate agent work
- Improve review quality
- Maintain repository integrity
- Enable parallel execution by multiple agents and humans
---
# Core Principle
One Task
=
One Branch
=
One Worktree
No exceptions.
Every meaningful unit of work must be isolated.
---
# Required Workflow
## Step 1 — Create Worktree
Every task begins with a dedicated worktree.
Example:
feature/client-portal-auth
docs/worktree-protocol
fix/billing-calculation
---
## Step 2 — Define Scope
Before modifications begin:
Required:
- Objective
- Allowed files
- Expected deliverable
- Validation requirements
Example:
Allowed Files:
docs/system/*
AGENTS.md
Forbidden:
package.json
.env
database/*
secrets/*
---
## Step 3 — Execute
Execution occurs only inside the assigned worktree.
Agents may not modify:
- main
- production
- unrelated worktrees
---
## Step 4 — Validate
Before review:
Required:
- git status
- diff summary
- validation results
- risk assessment
Example:
Status:
Clean
Files Changed:
3
Tests:
Passed
Risk:
Low
---
## Step 5 — Review
Every worktree must receive review before merge.
Review includes:
- Scope verification
- Protocol compliance
- Documentation review
- Risk review
---
## Step 6 — Human Approval
Human approval is required before:
- Merge
- Push to protected branch
- Production deployment
- Governance changes
Agents may recommend.
Humans approve.
---
## Step 7 — Merge
Approved worktrees may merge into target branches.
Merge strategy determined by repository governance.
---
## Step 8 — Cleanup
After merge or abandonment:
Delete:
- Branch
- Worktree
- Temporary artifacts
Maintain clean repository state.
---
# Required Reporting Format
Every worktree must produce:
Branch:
Path:
Objective:
Files Changed:
Validation:
Risks:
Recommended Action:
---
# Forbidden Actions
Agents may not:
- Commit directly to main
- Merge without approval
- Expand scope without approval
- Modify forbidden files
- Bypass validation
- Modify other active worktrees
---
# Agent Requirements
All AI agents operating within AJ Digital repositories must comply with this protocol.
This includes:
- Codex
- Claude Code
- OpenClaw
- Hermes
- Future agent systems
---
# Relationship To Other Protocols
This protocol operates alongside:
- GOAL Protocol
- DMAIC Protocol
- DOX Standard
- Documentation Architecture Standard
- Agent Governance Standards
---
# Success Criteria
A repository is considered compliant when:
✓ Worktrees are used for all development
✓ Direct main modifications are prohibited
✓ Review occurs before merge
✓ Human approval is enforced
✓ Cleanup occurs after completion
✓ Documentation remains current
---
# Doctrine
Repository safety is achieved through isolation.
Parallel development is achieved through worktrees.
Quality is achieved through review.
Authority remains with humans.
