from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


REQUIRED_SECTIONS = ("Define", "Measure", "Analyze")
PLACEHOLDER_VALUES = {"todo", "tbd", "placeholder", "<todo>", "<define>", "<measure>", "<analyze>"}


@dataclass(frozen=True)
class CharterValidation:
    charter_id: str
    mode: str
    reasons: list[str]


def parse_trailers(message: str) -> dict[str, str]:
    trailers: dict[str, str] = {}
    for line in message.splitlines():
        match = re.match(r"^\s*([A-Za-z][A-Za-z0-9-]*):\s*(.+?)\s*$", line)
        if match:
            trailers[match.group(1).lower()] = match.group(2).strip()
    return trailers


def extract_section(markdown: str, section: str) -> str:
    pattern = re.compile(rf"^##\s+{re.escape(section)}\s*$", re.MULTILINE | re.IGNORECASE)
    match = pattern.search(markdown)
    if not match:
        return ""
    next_heading = re.search(r"^##\s+", markdown[match.end() :], re.MULTILINE)
    end = match.end() + next_heading.start() if next_heading else len(markdown)
    return markdown[match.end() : end].strip()


def section_is_non_empty(text: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    normalized = text.strip().lower()
    if len(compact) < 40:
        return False
    if normalized in PLACEHOLDER_VALUES:
        return False
    if re.fullmatch(r"(todo|tbd|placeholder|coming soon)[\s.:-]*", normalized):
        return False
    return True


def validate_charter(charters_dir: Path, charter_id: str) -> CharterValidation:
    rel_path = Path("memory/dmaic/charters") / f"{charter_id}.md"
    charter_path = charters_dir / f"{charter_id}.md"
    if not charter_path.exists():
        return CharterValidation(charter_id=charter_id, mode="none", reasons=[f"charter file missing: {rel_path.as_posix()}"])
    try:
        content = charter_path.read_text(encoding="utf-8")
    except OSError as exc:
        return CharterValidation(charter_id=charter_id, mode="none", reasons=[f"charter unreadable: {exc}"])

    mode_match = re.search(r"^\s*-?\s*Mode:\s*(improvement|greenfield)\s*$", content, re.MULTILINE | re.IGNORECASE)
    mode = mode_match.group(1).lower() if mode_match else "none"
    reasons: list[str] = []
    if mode == "none":
        reasons.append("charter missing Mode line")
    empty_sections = [section for section in REQUIRED_SECTIONS if not section_is_non_empty(extract_section(content, section))]
    if empty_sections:
        reasons.append(f"diagnostic gates not cleared: {', '.join(empty_sections)}")
    return CharterValidation(charter_id=charter_id, mode=mode, reasons=reasons)
