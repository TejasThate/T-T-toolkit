const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiError extends Error {
  status: number;
  code?: string;
  request_id?: string;
}

export async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  retries: number = 2
): Promise<T> {
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: "Unknown error" };
        }
        const error = new Error(errData.detail || errData.error || `HTTP error ${res.status}`) as ApiError;
        error.status = res.status;
        error.code = errData.code;
        error.request_id = errData.request_id || res.headers.get("x-request-id");
        throw error;
      }
      return await res.json();
    } catch (e: any) {
      // Retry on network errors or 5xx server errors
      const isRetryable = e.name === 'AbortError' || !e.status || e.status >= 500;
      if (attempt < retries && isRetryable) {
        attempt++;
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
      } else {
        throw e;
      }
    }
  }
  throw new Error("API request failed");
}
