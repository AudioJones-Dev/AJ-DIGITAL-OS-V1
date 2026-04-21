---
name: transcript-to-content
description: Convert source transcript material into reusable content assets.
triggers:
  - transcript
  - repurpose
  - clips
allowedTools:
  - summarize
  - extract
modelPreference: ollama/llama3.1:8b
contextMode: transcript
workflowId: workflow.transcript_to_content.v1
approvalRequired: false
---
Turn transcript material into hooks, titles, captions, and short-form content assets while preserving the original intent and voice.
