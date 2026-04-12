export const buildWorkflowPolicy = (workflowId: string): string => {
  return [
    `Workflow policy for "${workflowId}":`,
    "Return work that is structured, reusable, and aligned with the workflow objective.",
  ].join("\n");
};
