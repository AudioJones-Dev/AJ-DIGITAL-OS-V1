from __future__ import annotations

import json
import subprocess
from pathlib import Path

from tools.dmaic_gate.dmaic_gate import evaluate_gate, main, worktree_files


COMPLETE_CHARTER = """# Build Charter: Payment fix
- Mode: improvement
- Owner: dev@audiojones.com

## Define
Fix a repeatable payment handling regression with clear acceptance criteria and component scope.

## Measure
The measurable signal is a regression test that fails before the fix and passes after the change.

## Analyze
The confirmed root cause is a parsing branch that accepted malformed provider responses without validation.
"""

GREENFIELD_CHARTER = """# Build Charter: Payment component
- Mode: greenfield
- Owner: dev@audiojones.com

## Define
Create a new component under a governed path with clear acceptance criteria and owner.

## Measure
The measurable signal is the existence of the registered acceptance test for this component.

## Analyze
The selected design is a local file/diff gate with no network calls and one shared entrypoint.
"""

PLACEHOLDER_CHARTER = """# Build Charter: Payment fix
- Mode: improvement
- Owner: dev@audiojones.com

## Define
Fix a repeatable payment handling regression with clear acceptance criteria and component scope.

## Measure
The measurable signal is a regression test that fails before the fix and passes after the change.

## Analyze
TODO
"""


def write_file(root: Path, rel_path: str, content: str = "") -> Path:
    path = root / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def write_config(root: Path, mode: str = "enforce", registry: str = ".dmaic/components.yaml") -> None:
    write_file(
        root,
        ".dmaic/gate.config.yaml",
        "\n".join(
            [
                f"mode: {mode}",
                "charters_dir: memory/dmaic/charters",
                f"registry: {registry}",
                "telemetry: memory/dmaic/telemetry/gate-events.jsonl",
                'test_globs: ["**/test_*.py","**/*_test.py","**/*.test.*","**/tests/**","**/__tests__/**"]',
                "",
            ]
        ),
    )


def write_registry(root: Path, status: str = "Ready for Sprint", paths: list[str] | None = None) -> None:
    component_paths = paths or ["src/payments/**"]
    path_lines = "\n".join(f'      - "{path}"' for path in component_paths)
    write_file(
        root,
        ".dmaic/components.yaml",
        f"""version: 1
components:
  - id: payment-core
    paths:
{path_lines}
    test_paths:
      - "tests/test_payments.py"
    status: {status}
    owner: dev@audiojones.com
""",
    )


def write_charter(root: Path, charter_id: str = "payment-fix", content: str = COMPLETE_CHARTER) -> None:
    write_file(root, f"memory/dmaic/charters/{charter_id}.md", content)


def run_gate(root: Path, changed_files: list[str], message: str, ref: str = "test"):
    result = evaluate_gate(root=root, changed_files=changed_files, message=message, ref=ref)
    telemetry_path = root / "memory/dmaic/telemetry/gate-events.jsonl"
    lines = telemetry_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    event = json.loads(lines[0])
    return result, event


def read_single_event(root: Path) -> dict[str, object]:
    telemetry_path = root / "memory/dmaic/telemetry/gate-events.jsonl"
    lines = telemetry_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    return json.loads(lines[0])


def git(root: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=root, text=True, capture_output=True, check=False)
    assert result.returncode == 0, result.stderr
    return result.stdout


def init_git_repo(root: Path) -> None:
    git(root, "init")
    git(root, "config", "user.email", "dev@audiojones.com")
    git(root, "config", "user.name", "AJ Digital Test")


def commit_all(root: Path, message: str = "baseline") -> None:
    git(root, "add", ".")
    git(root, "commit", "-m", message)


def test_complete_improvement_charter_with_test_change_passes(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_charter(tmp_path)

    result, event = run_gate(
        tmp_path,
        ["src/payments/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix",
    )

    assert result.exit_code == 0
    assert event["decision"] == "pass"


def test_code_change_without_charter_blocks(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    result, event = run_gate(tmp_path, ["src/payments/handler.py"], "Fix payment bug")

    assert result.exit_code == 1
    assert "no governing charter" in result.reasons
    assert event["decision"] == "block"


def test_missing_charter_file_blocks(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    result, _ = run_gate(tmp_path, ["src/payments/handler.py"], "Fix payment bug\n\nCharter: missing")

    assert result.exit_code == 1
    assert "charter file missing: memory/dmaic/charters/missing.md" in result.reasons


def test_empty_analyze_section_blocks(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_charter(tmp_path, content=PLACEHOLDER_CHARTER)

    result, _ = run_gate(
        tmp_path,
        ["src/payments/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix",
    )

    assert result.exit_code == 1
    assert "diagnostic gates not cleared: Analyze" in result.reasons


def test_improvement_source_change_without_test_blocks(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_charter(tmp_path)

    result, _ = run_gate(tmp_path, ["src/payments/handler.py"], "Fix payment bug\n\nCharter: payment-fix")

    assert result.exit_code == 1
    assert "fix without regression test" in result.reasons


def test_ungoverned_touched_path_blocks(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_charter(tmp_path)

    result, event = run_gate(
        tmp_path,
        ["src/unknown/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix",
    )

    assert result.exit_code == 1
    assert "ungoverned component: src/unknown/handler.py" in result.reasons
    assert "UNGOVERNED:src/unknown/handler.py" in event["components"]


def test_blocked_component_status_blocks(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path, status="Blocked")
    write_charter(tmp_path)

    result, _ = run_gate(
        tmp_path,
        ["src/payments/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix",
    )

    assert result.exit_code == 1
    assert "component payment-core status is Blocked" in result.reasons


def test_deprecated_requires_migration_trailer(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path, status="Deprecated")
    write_charter(tmp_path)

    blocked, _ = run_gate(
        tmp_path,
        ["src/payments/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix",
    )

    assert blocked.exit_code == 1
    assert "component payment-core status is Deprecated without Migration trailer" in blocked.reasons

    (tmp_path / "memory/dmaic/telemetry/gate-events.jsonl").unlink()
    passed, event = run_gate(
        tmp_path,
        ["src/payments/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix\nMigration: mig-123",
    )

    assert passed.exit_code == 0
    assert event["decision"] == "pass"


def test_trivial_charter_with_reason_bypasses(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    result, event = run_gate(
        tmp_path,
        ["src/payments/handler.py"],
        "Fix typo\n\nCharter: trivial\nReason: spelling-only comment fix",
    )

    assert result.exit_code == 0
    assert event["decision"] == "bypass"
    assert event["charter"] == "trivial"


def test_dmaic_skip_bypasses_with_visible_warning(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    result, event = run_gate(tmp_path, ["src/payments/handler.py"], "Hotfix\n\nDMAIC-Skip: emergency patch")

    assert result.exit_code == 0
    assert "WARNING: DMAIC-Skip bypass used: emergency patch" in result.messages
    assert event["decision"] == "bypass"


def test_warn_mode_never_blocks_but_logs_would_block(tmp_path: Path) -> None:
    write_config(tmp_path, mode="warn")
    write_registry(tmp_path)

    result, event = run_gate(tmp_path, ["src/payments/handler.py"], "Fix payment bug")

    assert result.exit_code == 0
    assert result.decision == "block"
    assert event["decision"] == "block"
    assert "WARN mode: would block, exiting 0" in result.messages


def test_missing_registry_in_enforce_blocks_without_traceback(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_charter(tmp_path)

    result, event = run_gate(
        tmp_path,
        ["src/payments/handler.py", "tests/test_payments.py"],
        "Fix payment bug\n\nCharter: payment-fix",
    )

    assert result.exit_code == 1
    assert "registry missing: create .dmaic/components.yaml" in result.reasons
    assert "Traceback" not in "\n".join(result.messages)
    assert event["decision"] == "block"


def test_greenfield_requires_registered_acceptance_test_file(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_charter(tmp_path, content=GREENFIELD_CHARTER)

    blocked, _ = run_gate(tmp_path, ["src/payments/new_component.py"], "Build component\n\nCharter: payment-fix")

    assert blocked.exit_code == 1
    assert "acceptance test missing for component payment-core" in blocked.reasons

    (tmp_path / "memory/dmaic/telemetry/gate-events.jsonl").unlink()
    write_file(tmp_path, "tests/test_payments.py", "def test_acceptance():\n    assert True\n")
    passed, event = run_gate(tmp_path, ["src/payments/new_component.py"], "Build component\n\nCharter: payment-fix")

    assert passed.exit_code == 0
    assert event["mode"] == "greenfield"


def test_codex_runtime_source_blocks_and_tags_telemetry(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    write_file(tmp_path, "src/payments/handler.py", "def handler():\n    return 'changed'\n")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("tools.dmaic_gate.dmaic_gate.staged_files", lambda root: ["src/payments/handler.py"])
    monkeypatch.delenv("DMAIC_COMMIT_MESSAGE", raising=False)

    exit_code = main(["--staged", "--source", "codex-runtime"])
    event = read_single_event(tmp_path)

    assert exit_code == 1
    assert event["decision"] == "block"
    assert event["source"] == "codex-runtime"


def test_default_source_matches_invocation_mode(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    write_file(tmp_path, "src/payments/handler.py", "def handler():\n    return 'changed'\n")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("tools.dmaic_gate.dmaic_gate.staged_files", lambda root: ["src/payments/handler.py"])
    monkeypatch.delenv("DMAIC_COMMIT_MESSAGE", raising=False)

    exit_code = main(["--staged"])
    event = read_single_event(tmp_path)

    assert exit_code == 1
    assert event["decision"] == "block"
    assert event["source"] == "staged"


def test_range_default_source_is_range_not_ref(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    write_file(tmp_path, "src/payments/handler.py", "def handler():\n    return 'changed'\n")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("tools.dmaic_gate.dmaic_gate.range_files", lambda root, diff_range: ["src/payments/handler.py"])
    monkeypatch.delenv("DMAIC_COMMIT_MESSAGE", raising=False)

    exit_code = main(["--range", "base..head"])
    event = read_single_event(tmp_path)

    assert exit_code == 1
    assert event["ref"] == "base..head"
    assert event["source"] == "range"


def test_commit_msg_valid_pass(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_charter(tmp_path)
    message_file = write_file(tmp_path, "COMMIT_MSG", "Fix payment bug\n\nCharter: payment-fix\n")

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("tools.dmaic_gate.dmaic_gate.staged_files", lambda root: ["src/payments/handler.py", "tests/test_payments.py"])

    exit_code = main(["--commit-msg", str(message_file)])
    event = read_single_event(tmp_path)

    assert exit_code == 0
    assert event["decision"] == "pass"
    assert event["source"] == "commit-msg"


def test_commit_msg_no_charter_block(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    message_file = write_file(tmp_path, "COMMIT_MSG", "Fix payment bug\n")

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("tools.dmaic_gate.dmaic_gate.staged_files", lambda root: ["src/payments/handler.py"])

    exit_code = main(["--commit-msg", str(message_file)])
    event = read_single_event(tmp_path)

    assert exit_code == 1
    assert "no governing charter" in event["reasons"]
    assert event["decision"] == "block"
    assert event["source"] == "commit-msg"


def test_precheck_ungoverned_block_no_telemetry(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("tools.dmaic_gate.dmaic_gate.staged_files", lambda root: ["src/unknown/handler.py"])

    exit_code = main(["--precheck"])

    assert exit_code == 1
    assert not (tmp_path / "memory/dmaic/telemetry/gate-events.jsonl").exists()


def test_worktree_sees_unstaged_tracked_block(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_file(tmp_path, "src/payments/handler.py", "def handler():\n    return 'baseline'\n")
    init_git_repo(tmp_path)
    commit_all(tmp_path)
    write_file(tmp_path, "src/payments/handler.py", "def handler():\n    return 'changed'\n")

    monkeypatch.chdir(tmp_path)
    exit_code = main(["--worktree"])
    event = read_single_event(tmp_path)

    assert exit_code == 1
    assert event["decision"] == "block"
    assert event["source"] == "worktree"
    assert "no governing charter" in event["reasons"]


def test_worktree_untracked_scratch_ignored(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    init_git_repo(tmp_path)
    commit_all(tmp_path)
    write_file(tmp_path, "scratch/note.py", "print('scratch')\n")

    monkeypatch.chdir(tmp_path)
    exit_code = main(["--worktree"])
    event = read_single_event(tmp_path)

    assert exit_code == 0
    assert event["decision"] == "pass"
    assert event["components"] == []
    assert event["source"] == "worktree"


def test_worktree_untracked_in_governed_path_enforced(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    init_git_repo(tmp_path)
    commit_all(tmp_path)
    write_file(tmp_path, "src/payments/new_handler.py", "def handler():\n    return 'new'\n")

    monkeypatch.chdir(tmp_path)
    exit_code = main(["--worktree"])
    event = read_single_event(tmp_path)

    assert exit_code == 1
    assert event["decision"] == "block"
    assert "no governing charter" in event["reasons"]
    assert event["components"] == ["payment-core"]


def test_worktree_union_staged_and_unstaged(tmp_path: Path) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    write_file(tmp_path, "src/payments/staged.py", "VALUE = 'baseline'\n")
    write_file(tmp_path, "src/payments/unstaged.py", "VALUE = 'baseline'\n")
    init_git_repo(tmp_path)
    commit_all(tmp_path)
    write_file(tmp_path, "src/payments/staged.py", "VALUE = 'staged'\n")
    write_file(tmp_path, "src/payments/unstaged.py", "VALUE = 'unstaged'\n")
    git(tmp_path, "add", "src/payments/staged.py")

    files = worktree_files(tmp_path)

    assert "src/payments/staged.py" in files
    assert "src/payments/unstaged.py" in files


def test_worktree_empty_changeset_pass(tmp_path: Path, monkeypatch) -> None:
    write_config(tmp_path)
    write_registry(tmp_path)
    init_git_repo(tmp_path)
    commit_all(tmp_path)

    monkeypatch.chdir(tmp_path)
    exit_code = main(["--worktree"])
    event = read_single_event(tmp_path)

    assert exit_code == 0
    assert event["decision"] == "pass"
    assert event["source"] == "worktree"
