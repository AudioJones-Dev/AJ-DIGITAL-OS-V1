export interface JsonFileStoreOptions {
  /** If true, corrupt files return an empty state instead of throwing. */
  tolerateCorruption?: boolean;
}

export interface JsonlLogStoreOptions {
  /** Fields to omit from persisted records. */
  redactFields?: string[];
}
