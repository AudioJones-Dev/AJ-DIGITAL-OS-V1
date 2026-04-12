export type TaskCategoryId =
  | "research"
  | "lead-gen"
  | "content"
  | "ops"
  | "client-work"
  | "review";

export interface TaskCategoryDefinition {
  id: TaskCategoryId;
  label: string;
  description: string;
  defaultFolderName: string;
  colorToken: string;
}

export interface TaskFolderRecord {
  folderId: string;
  name: string;
  categoryId: TaskCategoryId;
  sortOrder: number;
  parentFolderId?: string | undefined;
  clientId?: string | undefined;
  archivedAt?: string | undefined;
  metadata: Record<string, unknown>;
}

export const DEFAULT_TASK_CATEGORIES: TaskCategoryDefinition[] = [
  {
    id: "research",
    label: "Research",
    description: "Discovery, analysis, and information gathering tasks.",
    defaultFolderName: "Research Inbox",
    colorToken: "blue",
  },
  {
    id: "lead-gen",
    label: "Lead Gen",
    description: "Outbound prospecting, qualification, and pipeline support tasks.",
    defaultFolderName: "Lead Pipeline",
    colorToken: "green",
  },
  {
    id: "content",
    label: "Content",
    description: "Writing, editorial planning, publishing, and asset creation tasks.",
    defaultFolderName: "Content Studio",
    colorToken: "orange",
  },
  {
    id: "ops",
    label: "Ops",
    description: "Operational maintenance, scheduling, systems, and coordination tasks.",
    defaultFolderName: "Ops Queue",
    colorToken: "slate",
  },
  {
    id: "client-work",
    label: "Client Work",
    description: "Client-specific tasks that need scoped folders and execution context.",
    defaultFolderName: "Client Workspace",
    colorToken: "purple",
  },
  {
    id: "review",
    label: "Review",
    description: "Approval, QA, revision, and sign-off tasks.",
    defaultFolderName: "Review Desk",
    colorToken: "amber",
  },
];
