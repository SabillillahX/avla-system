import api from './axios';

export type ClassStatus = 'draft' | 'published' | 'archived';

export interface ClassTeacher {
  id: string;
  name: string;
  email: string;
}

export interface ClassCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CourseClass {
  id: string;
  name: string;
  description: string | null;
  teacher: ClassTeacher | null;
  category: ClassCategory | null;
  category_id: string | null;
  status: ClassStatus | null;
  short_description: string | null;
  thumbnail_url: string | null;
  preview_video_id: string | null;
  price: string | number | null;
  discount_price: string | number | null;
  is_free: boolean | null;
  rating?: number | null;
  rating_count?: number | null;
  badges?: string[] | null;
  language: string | null;
  level: string | null;
  has_certificate: boolean | null;
  what_you_will_learn: string[] | null;
  requirements: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  links?: Record<string, string | null>;
  meta?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export const classesApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<CourseClass>>>('/classes', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<CourseClass>>(`/classes/${id}`);
    return response.data;
  },

  create: async (payload: Record<string, unknown> | FormData) => {
    const response = await api.post<ApiResponse<CourseClass>>('/classes', payload);
    return response.data;
  },

  update: async (id: string, payload: Record<string, unknown> | FormData) => {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      const response = await api.post<ApiResponse<CourseClass>>(`/classes/${id}`, payload);
      return response.data;
    }
    const response = await api.put<ApiResponse<CourseClass>>(`/classes/${id}`, payload);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/classes/${id}`);
    return response.data;
  },

  enroll: async (id: string) => {
    const response = await api.post<ApiResponse<{ class_id: string }>>(`/classes/${id}/enroll`);
    return response.data;
  },

  enrolled: async () => {
    const response = await api.get<ApiResponse<PaginatedResponse<CourseClass>>>('/classes/enrolled');
    return response.data;
  },
};
