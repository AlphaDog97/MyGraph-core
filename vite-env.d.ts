/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT?: string;
  readonly VITE_APPWRITE_PROJECT_ID?: string;
  readonly VITE_APPWRITE_DATABASE_ID?: string;
  readonly VITE_APPWRITE_TABLE_GRAPHS_ID?: string;
  readonly VITE_APPWRITE_TABLE_NODES_ID?: string;
  readonly VITE_APPWRITE_TABLE_EDGES_ID?: string;
  readonly VITE_APPWRITE_TABLE_TAGS_ID?: string;
  readonly VITE_APPWRITE_TABLE_NODE_TAGS_ID?: string;
  readonly VITE_APPWRITE_TABLE_USER_PREFERENCES_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
