from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.dmaic_gate.charter import CharterValidation, parse_trailers, validate_charter
from tools.dmaic_gate.registry import Component, component_for_path, load_components, matches_any, normalize_path, parse_simple_yaml
from tools.dmaic_gate.telemetry import append_event


DEFAULT_TEST_GLOBS = ["**/test_*.py", "**/*_test.py", "**/*.test.*", "**/tests/**", "**/__tests__/**"]
BLOCKED_STATUSES = {"Blocked", "Delete Candidate"}
SOURCE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".sh",
    ".ps1",
    ".yml",
    ".yaml",
    ".json",
    ".toml",
}


@dataclass(frozen=True)
class GateConfig:
    mode: str
    charters_dir: Path
    registry: Path
    telemetry: Path
    test_globs: list[str]


@dataclass(frozen=True)
class GateResult:
    decision: str
    exit_code: int
    reasons: list[str]
    messages: list[str]
    telemetry_event: dict[str, object]


def load_config(root: Path) -> GateConfig:
    config_path = root / ".dmaic/gate.config.yaml"
    default_mode = "enforce" if os.environ.get("CI", "").lower() == "true" else "warn"
    raw = {
        "mode": default_mode,
        "charters_dir": "memory/dmaic/charters",
        "registry": ".dmaic/components.yaml",
        "telemetry": "memory/dmaic/telemetry/gate-events.jsonl",
        "test_globs": DEFAULT_TEST_GLOBS,
    }
    if config_path.exists():
        parsed = parse_simple_yaml(config_path.read_text(encoding="utf-8"))
        raw.update({key: value for key, value in parsed.items() if value not in ("", None)})

    mode = str(raw.get("mode", default_mode)).strip().lower()
    if mode not in {"enforce", "warn", "off"}:
        mode = default_mode
    test_globs = raw.get("test_globs", DEFAULT_TEST_GLOBS)
    if not isinstance(test_globs, list):
        test_globs = DEFAULT_TEST_GLOBS
    return GateConfig(
        mode=mode,
        charters_dir=root / str(raw.get("charters_dir", "memory/dmaic/charters")),
        registry=root / str(raw.get("registry", ".dmaic/components.yaml")),
        telemetry=root / str(raw.get("telemetry", "memory/dmaic/telemetry/gate-events.jsonl")),
        test_globs=[str(glob) for glob in test_globs],
    )


def git_names(root: Path, args: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git diff failed")
    return [normalize_path(line) for line in result.stdout.splitlines() if line.strip()]


def staged_files(root: Path) -> list[str]:
    return git_names(root, ["diff", "--cached", "--name-only", "--diff-filter=ACMRT"])


def unstaged_tracked_files(root: Path) -> list[str]:
    return git_names(root, ["diff", "--name-only", "--diff-filter=ACMRT"])


def untracked_files(root: Path) -> list[str]:
    return git_names(root, ["ls-files", "--others", "--exclude-standard"])


def range_files(root: Path, diff_range: str) -> list[str]:
    return git_names(root, ["diff", "--name-only", "--diff-filter=ACMRT", diff_range])


def worktree_files(root: Path) -> list[str]:
    staged = staged_files(root)
    unstaged = unstaged_tracked_files(root)
    untracked = untracked_files(root)
    components, registry_errors = load_components(load_config(root).registry)
    if registry_errors:
        scoped_untracked = untracked
    else:
        scoped_untracked = [path for path in untracked if component_for_path(path, components) is not None]
    return sorted(set(staged + unstaged + scoped_untracked))


def read_message_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def read_message(root: Path, message_path: Path | None = None) -> str:
    if message_path is not None:
        return read_message_file(message_path)
    for env_name in ("DMAIC_COMMIT_MESSAGE", "DMAIC_PR_BODY"):
        value = os.environ.get(env_name)
        if value:
            return value
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if event_path:
        try:
            event = json.loads(Path(event_path).read_text(encoding="utf-8"))
            body = event.get("pull_request", {}).get("body")
            if body:
                return str(body)
        except (OSError, json.JSONDecodeError):
            pass
    edit_message = root / ".git/COMMIT_EDITMSG"
    if edit_message.exists():
        try:
            return edit_message.read_text(encoding="utf-8")
        except OSError:
            return ""
    return ""


def is_test_path(path: str, test_globs: list[str]) -> bool:
    return matches_any(path, test_globs)


def is_source_path(path: str) -> bool:
    suffix = Path(path).suffix.lower()
    return suffix in SOURCE_EXTENSIONS


def non_test_paths(paths: list[str], test_globs: list[str]) -> list[str]:
    return [path for path in paths if not is_test_path(path, test_globs)]


def source_paths(paths: list[str], test_globs: list[str]) -> list[str]:
    return [path for path in non_test_paths(paths, test_globs) if is_source_path(path)]


def evaluate_components(
    paths: list[str],
    components: list[Component],
    trailers: dict[str, str],
    test_globs: list[str],
) -> tuple[list[str], list[str], list[Component]]:
    reasons: list[str] = []
    component_labels: list[str] = []
    touched_components: dict[str, Component] = {}
    for path in non_test_paths(paths, test_globs):
        component = component_for_path(path, components)
        if component is None:
            reasons.append(f"ungoverned component: {path}")
            component_labels.append(f"UNGOVERNED:{path}")
            continue
        component_labels.append(component.id)
        touched_components[component.id] = component
        if component.status in BLOCKED_STATUSES:
            reasons.append(f"component {component.id} status is {component.status}")
        if component.status == "Deprecated" and "migration" not in trailers:
            reasons.append(f"component {component.id} status is Deprecated without Migration trailer")
    return reasons, sorted(set(component_labels)), list(touched_components.values())


def greenfield_acceptance_reasons(root: Path, components: list[Component]) -> list[str]:
    reasons: list[str] = []
    for component in components:
        test_paths = component.test_paths or []
        if not test_paths:
            reasons.append(f"acceptance test missing for component {component.id}")
            continue
        if not any((root / test_path).exists() for test_path in test_paths):
            reasons.append(f"acceptance test missing for component {component.id}")
    return reasons


def apply_mode(config_mode: str, decision: str, reasons: list[str], messages: list[str]) -> tuple[int, list[str]]:
    if config_mode == "off":
        messages.append("DMAIC gate mode is off; logging pass and exiting 0")
        return 0, []
    if decision == "block":
        if config_mode == "warn":
            messages.append("WARN mode: would block, exiting 0")
            return 0, reasons
        return 1, reasons
    return 0, reasons


def evaluate_precheck(root: Path, changed_files: list[str]) -> GateResult:
    root = root.resolve()
    config = load_config(root)
    paths = [normalize_path(path) for path in changed_files]
    reasons: list[str] = []
    messages: list[str] = []
    components_seen: list[str] = []

    if config.mode == "off":
        return GateResult(decision="pass", exit_code=0, reasons=["gate off"], messages=["DMAIC gate precheck mode is off; exiting 0"], telemetry_event={})

    components, registry_errors = load_components(config.registry)
    if registry_errors:
        reasons.extend(registry_errors)
    else:
        for path in non_test_paths(paths, config.test_globs):
            component = component_for_path(path, components)
            if component is None:
                reasons.append(f"ungoverned component: {path}")
                components_seen.append(f"UNGOVERNED:{path}")
                continue
            components_seen.append(component.id)
            if component.status in BLOCKED_STATUSES:
                reasons.append(f"component {component.id} status is {component.status}")

    decision = "block" if reasons else "pass"
    exit_code, final_reasons = apply_mode(config.mode, decision, reasons, messages)
    return GateResult(decision=decision, exit_code=exit_code, reasons=final_reasons, messages=messages, telemetry_event={"components": sorted(set(components_seen))})


def evaluate_gate(root: Path, changed_files: list[str], message: str, ref: str = "staged", source: str | None = None) -> GateResult:
    root = root.resolve()
    config = load_config(root)
    paths = [normalize_path(path) for path in changed_files]
    trailers = parse_trailers(message)
    reasons: list[str] = []
    messages: list[str] = []
    components_seen: list[str] = []
    charter_id = trailers.get("charter", "none")
    mode = "none"
    decision = "pass"

    if config.mode == "off":
        event = append_event(
            config.telemetry,
            ref=ref,
            charter=charter_id,
            mode=mode,
            decision="pass",
            reasons=["gate off"],
            components=[],
            source=source or ref,
        )
        return GateResult(decision="pass", exit_code=0, reasons=["gate off"], messages=["DMAIC gate mode is off; exiting 0"], telemetry_event=event)

    if "dmaic-skip" in trailers:
        messages.append(f"WARNING: DMAIC-Skip bypass used: {trailers['dmaic-skip']}")
        event = append_event(
            config.telemetry,
            ref=ref,
            charter=charter_id,
            mode=mode,
            decision="bypass",
            reasons=[trailers["dmaic-skip"]],
            components=[],
            source=source or ref,
        )
        return GateResult(decision="bypass", exit_code=0, reasons=[trailers["dmaic-skip"]], messages=messages, telemetry_event=event)

    if charter_id == "trivial":
        if trailers.get("reason"):
            event = append_event(
                config.telemetry,
                ref=ref,
                charter="trivial",
                mode=mode,
                decision="bypass",
                reasons=[trailers["reason"]],
                components=[],
                source=source or ref,
            )
            return GateResult(decision="bypass", exit_code=0, reasons=[trailers["reason"]], messages=messages, telemetry_event=event)
        reasons.append("trivial charter requires Reason trailer")

    charter_validation = CharterValidation(charter_id=charter_id, mode="none", reasons=[])
    if charter_id not in {"none", "trivial"}:
        charter_validation = validate_charter(config.charters_dir, charter_id)
        mode = charter_validation.mode
        reasons.extend(charter_validation.reasons)
    elif charter_id == "none" and source_paths(paths, config.test_globs):
        reasons.append("no governing charter")

    components, registry_errors = load_components(config.registry)
    if registry_errors:
        reasons.extend(registry_errors)
    elif paths:
        component_reasons, components_seen, touched_components = evaluate_components(paths, components, trailers, config.test_globs)
        reasons.extend(component_reasons)
        if mode == "greenfield":
            reasons.extend(greenfield_acceptance_reasons(root, touched_components))

    if mode == "improvement" and source_paths(paths, config.test_globs) and not any(is_test_path(path, config.test_globs) for path in paths):
        reasons.append("fix without regression test")

    if reasons:
        decision = "block"

    exit_code, final_reasons = apply_mode(config.mode, decision, reasons, messages)
    event = append_event(
        config.telemetry,
        ref=ref,
        charter=charter_id,
        mode=mode,
        decision=decision,
        reasons=final_reasons,
        components=components_seen,
        source=source or ref,
    )
    return GateResult(decision=decision, exit_code=exit_code, reasons=final_reasons, messages=messages, telemetry_event=event)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the DMAIC enforcement gate.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--staged", action="store_true", help="Inspect staged files.")
    group.add_argument("--commit-msg", dest="commit_msg", help="Inspect staged files and read trailers from the git commit message file.")
    group.add_argument("--precheck", action="store_true", help="Run the staged component-status precheck only; writes no telemetry.")
    group.add_argument("--worktree", action="store_true", help="Inspect staged, unstaged tracked, and registry-scoped untracked files.")
    group.add_argument("--range", dest="diff_range", help="Inspect files changed in base..head.")
    parser.add_argument("--source", help="Telemetry source label. Defaults to staged or range invocation mode.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    root = Path.cwd()
    try:
        if args.staged:
            files = staged_files(root)
            ref = "staged"
            invocation_source = "staged"
            message = read_message(root)
        elif args.commit_msg:
            files = staged_files(root)
            ref = "commit-msg"
            invocation_source = "commit-msg"
            message = read_message(root, Path(args.commit_msg))
        elif args.precheck:
            result = evaluate_precheck(root=root, changed_files=staged_files(root))
            for message in result.messages:
                print(message, file=sys.stderr)
            if result.decision == "block":
                print("DMAIC gate precheck blocked this change:", file=sys.stderr)
                for reason in result.reasons:
                    print(f"- {reason}", file=sys.stderr)
            else:
                print("DMAIC gate precheck passed.", file=sys.stderr)
            return result.exit_code
        elif args.worktree:
            files = worktree_files(root)
            ref = "worktree"
            invocation_source = "worktree"
            message = read_message(root)
        else:
            files = range_files(root, args.diff_range)
            ref = args.diff_range
            invocation_source = "range"
            message = read_message(root)
        result = evaluate_gate(root=root, changed_files=files, message=message, ref=ref, source=args.source or invocation_source)
    except Exception as exc:
        config = load_config(root)
        if getattr(args, "precheck", False):
            reason = f"gate failed safely: {exc}"
            print(reason, file=sys.stderr)
            return 1 if config.mode == "enforce" else 0
        if getattr(args, "staged", False):
            ref = "staged"
            invocation_source = "staged"
        elif getattr(args, "commit_msg", None):
            ref = "commit-msg"
            invocation_source = "commit-msg"
        elif getattr(args, "worktree", False):
            ref = "worktree"
            invocation_source = "worktree"
        else:
            ref = str(getattr(args, "diff_range", "unknown"))
            invocation_source = "range"
        reason = f"gate failed safely: {exc}"
        event = append_event(
            config.telemetry,
            ref=ref,
            charter="none",
            mode="none",
            decision="block",
            reasons=[reason],
            components=[],
            source=getattr(args, "source", None) or invocation_source,
        )
        print(reason, file=sys.stderr)
        print(json.dumps(event, separators=(",", ":")), file=sys.stderr)
        return 1 if config.mode == "enforce" else 0

    for message in result.messages:
        print(message, file=sys.stderr)
    if result.decision == "block":
        print("DMAIC gate blocked this change:", file=sys.stderr)
        for reason in result.reasons:
            print(f"- {reason}", file=sys.stderr)
    elif result.decision == "pass":
        print("DMAIC gate passed.", file=sys.stderr)
    else:
        print("DMAIC gate bypassed.", file=sys.stderr)
    return result.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
