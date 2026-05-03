const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "Something went wrong.");
  }

  return payload as T;
}
