import { appwriteEndpoint, appwriteProjectId, isAuthConfigured } from "./client";

export type AuthUser = {
  $id: string;
  email: string;
  name: string;
  status: boolean;
  emailVerification: boolean;
};

export type AuthSession = {
  $id: string;
  userId: string;
  expire: string;
};

type AppwriteErrorResponse = {
  code?: number;
  message?: string;
  type?: string;
};

function ensureConfigured() {
  if (!isAuthConfigured) {
    throw new Error(
      "Appwrite is not configured. Please set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID."
    );
  }
}

async function appwriteRequest<T>(path: string, init?: RequestInit): Promise<T> {
  ensureConfigured();
  const response = await fetch(`${appwriteEndpoint}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": appwriteProjectId,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: AppwriteErrorResponse | null = null;
    try {
      payload = (await response.json()) as AppwriteErrorResponse;
    } catch {
      payload = null;
    }

    const error = new Error(payload?.message ?? `Request failed with ${response.status}`) as Error & {
      code?: number;
    };
    error.code = payload?.code ?? response.status;
    throw error;
  }

  return (await response.json()) as T;
}

function isUnauthorizedError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 401;
}

function uniqueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `user-${Date.now()}`;
}

export async function registerWithEmail(email: string, password: string) {
  await appwriteRequest<AuthUser>("/account", {
    method: "POST",
    body: JSON.stringify({ userId: uniqueId(), email, password }),
  });
  return loginWithEmail(email, password);
}

export async function loginWithEmail(email: string, password: string) {
  return appwriteRequest<AuthSession>("/account/sessions/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured) return null;
  try {
    return await appwriteRequest<AuthSession>("/account/sessions/current");
  } catch (error) {
    if (isUnauthorizedError(error)) return null;
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isAuthConfigured) return null;
  try {
    return await appwriteRequest<AuthUser>("/account");
  } catch (error) {
    if (isUnauthorizedError(error)) return null;
    throw error;
  }
}

export async function logoutCurrentSession() {
  if (!isAuthConfigured) return;
  try {
    await appwriteRequest<{ $id: string }>("/account/sessions/current", {
      method: "DELETE",
    });
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;
  }
}
