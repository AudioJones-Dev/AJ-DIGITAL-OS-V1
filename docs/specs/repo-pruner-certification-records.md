# Repo Pruner Certification Records

This append-only evidence ledger supplements the SHA-bound canonical specification at `docs/specs/repo-pruner.md`. An entry here records certification evidence without changing the canonical specification bytes or expanding execution authority.

## 2026-08-03 - `0.4.2-p4` T6 recertification

- Technical result: `passed`; harness version `1`; problems: none.
- Governed source commit: `94f94c5a2fcbc7c874df6eb56657e4406db111d3`.
- Bound canonical specification SHA-256: `F8F54810E561B09C3251FEFB77A62D679D93B633090969D18D7100A88D4BF09B`.
- Fixture source aggregate SHA-256: `3FB60676CD577009C9A0D4BCEF818849AF497D8AD9D3EEC3B6E507CDEE5248B9` across 41 tracked files.
- Certification fixture commit: `d0b230507f97dd31a7dcef41e1fd3c7afc59c460`.
- Certification fixture tree: `7ba0c67e7a64dfb8e430182d1f2a7dbadb0d182c`.
- Configuration SHA-256: `5AFBB16A85606DFA6D48BCB808104A4C487FE0578B978FFA104A44F3A1A59906`.
- Skill lockfile SHA-256: `2A7D884408D75C876A1C765E1210D1466913CB1C2BF98E950306AF1AB0BFFD13`.
- Approved matrix: Windows `win32-x64` / NT `10.0.26200.8973`; Node `24.18.0`; npm `11.16.0`; Git `2.55.0.windows.3`; PowerShell `7.6.3`; Claude Code `2.1.220`; Codex CLI `0.146.0`; Cursor `3.14.7`.
- Claude Code, Codex CLI, and Cursor each emitted 20 records totaling 14,560 bytes with findings SHA-256 `11BCB9BCF71C0748187B2D32A4AC5971716873EA0E200845C210A8CCB9AA6604`.
- Every host clone remained clean at the identical fixture commit and tree; each runner manifest reported `target_type: fixture`, `outcome: complete`, and `certification_eligible: true`.

## Authority limits

- This was fixture-only certification. No live repository was scanned.
- This record does not authorize a live run, remediation, registry mutation, skill synchronization, external publication, commit, push, or pull request.
- The governed worktree remained clean. Generated evidence stayed inside isolated temporary fixture clones.
- A Claude post-session hook cancellation and failed Codex MCP authentication handshakes were non-parity host diagnostics; the host runners and canonical T6 harness exited successfully, and the fixture artifacts remained clean.
