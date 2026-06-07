#!/usr/bin/env python3
"""
AJ Codex Repo-Local Hook: PreToolUse + PermissionRequest
Enforces AJ-DIGITAL-OS control-plane write policy.

CORRECTION APPLIED (approved by ChatGPT review, 2026-05-23):
  Original pattern only caught path-before-verb order.
  Corrected to use independent WRITE_VERBS + CONTROL_PLANE checks,
  catching both:
    - Command-first:  Remove-Item C:\\AJ-DIGITAL-OS\\...
    - Path-first:     C:\\AJ-DIGITAL-OS\\... | Out-File ...
    - Mixed position: Copy-Item src C:\\AJ-DIGITAL-OS\\dest
"""
import sys
import json
import re

# ---------------------------------------------------------------------------
# Policy configuration
# ---------------------------------------------------------------------------

# Write verbs that mutate the filesystem (case-insensitive)
WRITE_VERBS = r"\b(remove-item|rm|del|erase|set-content|out-file|move-item|copy-item|new-item)\b"

# The control plane path — double-escaped for regex
CONTROL_PLANE = r"C:\\AJ-DIGITAL-OS"


def deny(reason: str) -> dict:
    return {"decision": "block", "reason": reason}


def main():
    try:
        raw = sys.stdin.read()
        event = json.loads(raw) if raw.strip() else {}
    except Exception:
        event = {}

    # Extract command string from various tool input shapes
    tool_input = (
        event.get("tool", {}).get("input", {})
        or event.get("tool_input", {})
        or {}
    )
    cmd = (
        tool_input.get("command", "")
        or tool_input.get("cmd", "")
        or tool_input.get("script", "")
        or ""
    )

    # ---------------------------------------------------------------------------
    # BIDIRECTIONAL write-block: catches verb-first AND path-first order.
    #
    # We check for the presence of BOTH a write verb AND the control-plane path
    # anywhere in the command string — no assumed order.
    #
    # Per approved design note: copy-item to C:\AJ-DIGITAL-OS is blocked here
    # (Phase 1 strict mode). Approved audit/report artifact copies must be
    # executed manually by the human/operator after review.
    # ---------------------------------------------------------------------------
    verb_present         = re.search(WRITE_VERBS,    cmd, re.IGNORECASE) is not None
    control_plane_present = re.search(CONTROL_PLANE, cmd, re.IGNORECASE) is not None

    if verb_present and control_plane_present:
        result = deny(
            "AJ-DIGITAL-OS repo-local policy blocks writes to C:\\AJ-DIGITAL-OS "
            "from automated Codex hooks. "
            "If writing approved audit/report artifacts or PATH_AUTHORITY docs, "
            "execute the command manually after human/operator review and approval."
        )
        print(json.dumps(result))
        sys.exit(0)

    # No match — allow
    sys.exit(0)


if __name__ == "__main__":
    main()
