import type { AssistantRuntimeResult } from "../services/runtime/assistant-runtime.js";

export const renderAssistantHuman = (result: AssistantRuntimeResult): void => {
  console.log("AJ DIGITAL OS ASSISTANT");
  console.log("=======================");
  console.log(`Status: ${result.ok ? "ok" : "error"}`);
  console.log(`Mode: ${result.mode}`);
  console.log(`Execution: ${result.execution}`);
  console.log(`Client: ${result.clientId}`);
  console.log(`Brand: ${result.brandContext.brandName ?? result.brandContext.selectedBrandId ?? "-"}`);
  console.log(`Brand Resolution: ${result.brandContext.resolution}`);
  console.log(`Brand Manifest: ${result.brandContext.manifestPath ?? "-"}`);
  console.log(`Task: ${result.task}`);
  console.log(`Conversation Thread: ${result.conversation?.threadId ?? "-"}`);
  console.log(`Conversation Resolution: ${result.conversation?.resolution ?? "-"}`);
  console.log(`Agent Profile: ${result.agentProfile?.displayName ?? "-"}`);
  console.log(`Model Profile: ${result.modelProfile?.displayName ?? "-"}`);
  console.log(`Selected Skill: ${result.skillMatch.selectedSkillName ?? "-"}`);
  console.log(`Selected Workflow: ${result.workflowMatch.workflowId ?? "-"}`);
  console.log(`Task Type: ${result.workflowMatch.taskType ?? "-"}`);
  console.log(`Route: ${result.route.provider}/${result.route.model}`);
  console.log(`Route Reason: ${result.route.reason}`);
  console.log(`Side Effects Allowed: ${result.executionPolicy.sideEffectsAllowed ? "yes" : "no"}`);
  console.log(`Deliverable Persistence: ${result.executionPolicy.deliverablePersistenceAllowed ? "yes" : "no"}`);
  console.log(`Stitched Context: ${result.stitchedContext ? `${result.stitchedContext.sourceCount} sources / ${result.stitchedContext.totalCharacters} chars` : "-"}`);
  console.log(`Semantic Memory: ${result.semanticMemory ? `${result.semanticMemory.selectedCount}/${result.semanticMemory.resultCount}` : "-"}`);
  console.log(`Skill Allowed Tools: ${result.skillMatch.allowedTools.length > 0 ? result.skillMatch.allowedTools.join(", ") : "-"}`);

  if (result.advisory) {
    console.log("");
    console.log("Advisory Summary");
    console.log(result.advisory.summary);
    console.log("");
    console.log("Advisory Response");
    console.log(result.advisory.response);

    if (result.advisory.nextSteps.length > 0) {
      console.log("");
      console.log("Next Steps");
      for (const step of result.advisory.nextSteps) {
        console.log(`- ${step}`);
      }
    }

    if (result.advisory.risks.length > 0) {
      console.log("");
      console.log("Risks");
      for (const risk of result.advisory.risks) {
        console.log(`- ${risk}`);
      }
    }
  }

  if (result.orchestration) {
    console.log("");
    console.log("Orchestration");
    console.log(`Run ID: ${result.orchestration.runId}`);
    console.log(`Workflow: ${result.orchestration.workflowId}`);
    console.log(`Status: ${result.orchestration.status}`);
    console.log(`Approval Required: ${result.orchestration.approvalRequired ? "yes" : "no"}`);
    console.log(`Approval Status: ${result.orchestration.approvalStatus}`);
  }

  if (result.warnings.length > 0) {
    console.log("");
    console.log("Warnings");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (result.errors.length > 0) {
    console.log("");
    console.log("Errors");
    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }

  if (result.semanticMemory?.sources.length) {
    console.log("");
    console.log("Semantic Memory Sources");
    for (const source of result.semanticMemory.sources) {
      console.log(`- ${source.label}${source.score !== undefined ? ` | ${source.score.toFixed(3)}` : ""}`);
    }
  }
};

export const renderAssistantInline = (result: AssistantRuntimeResult): void => {
  if (result.brandContext.selectedBrandId || result.brandContext.brandName) {
    console.log(`brand> ${result.brandContext.brandName ?? result.brandContext.selectedBrandId}`);
  }
  console.log(`assistant> ${result.advisory?.summary ?? result.task}`);

  if (result.advisory?.response) {
    console.log(result.advisory.response);
  }

  if (result.orchestration) {
    console.log(`run> ${result.orchestration.runId} | ${result.orchestration.status} | approval ${result.orchestration.approvalStatus}`);
  }

  if (result.advisory?.nextSteps.length) {
    console.log("next>");
    for (const step of result.advisory.nextSteps) {
      console.log(`- ${step}`);
    }
  }

  if (result.advisory?.risks.length) {
    console.log("risks>");
    for (const risk of result.advisory.risks) {
      console.log(`- ${risk}`);
    }
  }

  if (result.warnings.length) {
    console.log("warnings>");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (result.semanticMemory?.sources.length) {
    console.log("memory>");
    for (const source of result.semanticMemory.sources.slice(0, 3)) {
      console.log(`- ${source.label}${source.score !== undefined ? ` | ${source.score.toFixed(3)}` : ""}`);
    }
  }

  if (result.errors.length) {
    console.log("errors>");
    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }
};
