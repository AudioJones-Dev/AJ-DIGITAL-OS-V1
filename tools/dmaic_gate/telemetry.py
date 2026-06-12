from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def append_event(
    path: Path,
    *,
    ref: str,
    charter: str,
    mode: str,
    decision: str,
    reasons: list[str],
    components: list[str],
    source: str | None = None,
) -> dict[str, Any]:
    path.parent.mkdir(parents=True, exist_ok=True)
    event = {
        "ts": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "ref": ref,
        "charter": charter,
        "mode": mode,
        "decision": decision,
        "reasons": reasons,
        "components": components,
        "source": source or ref,
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, separators=(",", ":")) + "\n")
    return event
