# Error Recovery Flow Standard

## Purpose

Define how error recovery should be documented.

## Standard

Error recovery SHALL distinguish:

- recoverable error
- blocked action
- partial success
- terminal failure

The recovery flow SHOULD explain:

- what failed
- what was preserved
- what the user can retry
- what needs human escalation

## Acceptance Criteria

- Error states do not leave the user stranded.
- Recovery paths are explicit and safe.
