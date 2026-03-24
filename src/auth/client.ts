const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  console.warn(
    "Appwrite auth is disabled: missing VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID."
  );
}

export const isAuthConfigured = Boolean(endpoint && projectId);
export const appwriteEndpoint = endpoint ?? "";
export const appwriteProjectId = projectId ?? "";
