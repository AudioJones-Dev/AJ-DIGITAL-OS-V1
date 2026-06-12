from __future__ import annotations

import fnmatch
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


VALID_STATUSES = {
    "Canonical",
    "Ready for Sprint",
    "Experimental",
    "Needs Refactor",
    "Blocked",
    "Deprecated",
    "Delete Candidate",
}


@dataclass(frozen=True)
class Component:
    id: str
    paths: list[str]
    status: str
    owner: str = ""
    test_paths: list[str] | None = None


def normalize_path(path: str | Path) -> str:
    return str(path).replace("\\", "/").lstrip("./")


def matches_any(path: str, patterns: list[str]) -> bool:
    normalized = normalize_path(path)
    for pattern in patterns:
        candidate = normalize_path(pattern)
        if fnmatch.fnmatchcase(normalized, candidate):
            return True
        if candidate.endswith("/**") and normalized.startswith(candidate[:-3].rstrip("/") + "/"):
            return True
    return False


def strip_comment(line: str) -> str:
    in_quote: str | None = None
    for index, char in enumerate(line):
        if char in {"'", '"'}:
            in_quote = None if in_quote == char else char
        if char == "#" and in_quote is None:
            return line[:index]
    return line


def parse_scalar(value: str) -> Any:
    value = strip_comment(value).strip()
    if not value:
        return ""
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        parts = re.findall(r'"([^"]*)"|\'([^\']*)\'|([^,\s][^,]*)', inner)
        return [(double or single or bare).strip().strip('"').strip("'") for double, single, bare in parts]
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    if value.isdigit():
        return int(value)
    return value


def parse_simple_yaml(text: str) -> dict[str, Any]:
    data: dict[str, Any] = {}
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        raw = strip_comment(lines[index]).rstrip()
        if not raw.strip():
            index += 1
            continue
        if not raw.startswith(" ") and ":" in raw:
            key, value = raw.split(":", 1)
            key = key.strip()
            value = value.strip()
            if value:
                data[key] = parse_scalar(value)
                index += 1
                continue
            if key == "components":
                components: list[dict[str, Any]] = []
                index += 1
                while index < len(lines):
                    item_line = strip_comment(lines[index]).rstrip()
                    if not item_line.strip():
                        index += 1
                        continue
                    if not item_line.startswith("  "):
                        break
                    if item_line.startswith("  - "):
                        component: dict[str, Any] = {}
                        remainder = item_line[4:].strip()
                        if remainder and ":" in remainder:
                            item_key, item_value = remainder.split(":", 1)
                            component[item_key.strip()] = parse_scalar(item_value)
                        index += 1
                        while index < len(lines):
                            field_line = strip_comment(lines[index]).rstrip()
                            if not field_line.strip():
                                index += 1
                                continue
                            if field_line.startswith("  - ") or not field_line.startswith("    "):
                                break
                            field_text = field_line[4:]
                            if ":" not in field_text:
                                index += 1
                                continue
                            field_key, field_value = field_text.split(":", 1)
                            field_key = field_key.strip()
                            field_value = field_value.strip()
                            if field_value:
                                component[field_key] = parse_scalar(field_value)
                                index += 1
                                continue
                            values: list[str] = []
                            index += 1
                            while index < len(lines):
                                list_line = strip_comment(lines[index]).rstrip()
                                if not list_line.strip():
                                    index += 1
                                    continue
                                if not list_line.startswith("      - "):
                                    break
                                values.append(str(parse_scalar(list_line[8:])))
                                index += 1
                            component[field_key] = values
                        components.append(component)
                        continue
                    index += 1
                data[key] = components
                continue
            data[key] = {}
        index += 1
    return data


def load_components(registry_path: Path) -> tuple[list[Component], list[str]]:
    if not registry_path.exists():
        display_path = ".dmaic/components.yaml"
        return [], [f"registry missing: create {display_path}"]
    try:
        parsed = parse_simple_yaml(registry_path.read_text(encoding="utf-8"))
    except OSError as exc:
        return [], [f"registry unreadable: {exc}"]

    errors: list[str] = []
    components: list[Component] = []
    raw_components = parsed.get("components")
    if not isinstance(raw_components, list):
        return [], ["registry invalid: components list is required"]

    for raw_component in raw_components:
        if not isinstance(raw_component, dict):
            errors.append("registry invalid: component entry must be a map")
            continue
        component_id = str(raw_component.get("id", "")).strip()
        status = str(raw_component.get("status", "")).strip()
        paths = raw_component.get("paths")
        test_paths = raw_component.get("test_paths")
        if not component_id:
            errors.append("registry invalid: component id is required")
        if status not in VALID_STATUSES:
            errors.append(f"registry invalid: component {component_id or '<unknown>'} has invalid status {status or '<missing>'}")
        if not isinstance(paths, list) or not all(str(path).strip() for path in paths):
            errors.append(f"registry invalid: component {component_id or '<unknown>'} paths are required")
            paths = []
        if test_paths is not None and not isinstance(test_paths, list):
            errors.append(f"registry invalid: component {component_id or '<unknown>'} test_paths must be a list")
            test_paths = []
        if component_id and status in VALID_STATUSES and paths:
            components.append(
                Component(
                    id=component_id,
                    paths=[str(path) for path in paths],
                    status=status,
                    owner=str(raw_component.get("owner", "")).strip(),
                    test_paths=[str(path) for path in test_paths] if isinstance(test_paths, list) else [],
                )
            )
    return components, errors


def component_for_path(path: str, components: list[Component]) -> Component | None:
    for component in components:
        if matches_any(path, component.paths):
            return component
    return None
