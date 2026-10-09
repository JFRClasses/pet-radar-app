export const API_URL = '/api';

export interface ApiResponse<T> {
  status: number;
  data: T;
  error: boolean;
  errorMessage?: string;
}

export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.error) {
    throw new Error(response.errorMessage ?? 'Ocurrió un error');
  }
  return response.data;
}
