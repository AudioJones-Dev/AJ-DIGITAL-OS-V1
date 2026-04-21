---
name: publish-to-sanity
description: Prepare approved content for publishing to a Sanity-backed content workflow.
triggers:
  - publish
  - sanity
  - cms
allowedTools:
  - validate
  - publish
modelPreference: ollama/llama3.1:8b
contextMode: publishing
workflowId: blog-authority
approvalRequired: true
---
Validate publishing prerequisites, map approved assets to publish-ready fields, and prepare a clean handoff for the publishing layer.
