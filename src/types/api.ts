/** Standard envelope every backend endpoint is expected to return. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
  /** Field-level validation errors, keyed by field name. */
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
