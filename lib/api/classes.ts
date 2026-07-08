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

export interface CourseSection {
  id: string;
  class_id: string;
  title: string;
  order: number;
  is_published: boolean;
  videos?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface PrerequisiteCourse {
  id: string;
  name: string;
  thumbnail_url: string | null;
}

export interface CourseBatchInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  status: 'upcoming' | 'active' | 'expired' | 'closed';
  max_students: number | null;
  enrolled_count: number;
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
  prerequisites?: PrerequisiteCourse[] | null;
  sections?: CourseSection[] | null;
  students?: unknown[] | null;
  students_count?: number | null;
  active_batch?: CourseBatchInfo | null;
  batches?: CourseBatchInfo[] | null;
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
    const response = await api.get<ApiResponse<PaginatedResponse<CourseClass>>>('/courses', { params });
    return response.data;
  },

  get: async (id: string, batchId?: string) => {
    const params = batchId ? { batch_id: batchId } : undefined;
    const response = await api.get<ApiResponse<CourseClass>>(`/courses/${id}`, { params });
    return response.data;
  },

  create: async (payload: Record<string, unknown> | FormData) => {
    const response = await api.post<ApiResponse<CourseClass>>('/courses', payload);
    return response.data;
  },

  update: async (id: string, payload: Record<string, unknown> | FormData) => {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      const response = await api.post<ApiResponse<CourseClass>>(`/courses/${id}`, payload);
      return response.data;
    }
    const response = await api.put<ApiResponse<CourseClass>>(`/courses/${id}`, payload);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/courses/${id}`);
    return response.data;
  },

  enroll: async (id: string) => {
    const response = await api.post<ApiResponse<{ class_id: string }>>(`/courses/${id}/enroll`);
    return response.data;
  },

  enrolled: async () => {
    const response = await api.get<ApiResponse<PaginatedResponse<CourseClass>>>('/courses/enrolled');
    return response.data;
  },

  createSection: async (classId: string, payload: { title: string; order?: number; is_published?: boolean }) => {
    const response = await api.post<ApiResponse<any>>(`/courses/${classId}/sections`, payload);
    return response.data;
  },

  updateSection: async (classId: string, sectionId: string, payload: { title: string; order?: number; is_published?: boolean }) => {
    const response = await api.put<ApiResponse<any>>(`/courses/${classId}/sections/${sectionId}`, payload);
    return response.data;
  },

  deleteSection: async (classId: string, sectionId: string) => {
    const response = await api.delete<ApiResponse<null>>(`/courses/${classId}/sections/${sectionId}`);
    return response.data;
  },

  updateSectionOrder: async (classId: string, order: string[]) => {
    const response = await api.post<ApiResponse<null>>(`/courses/${classId}/sections/order`, { order });
    return response.data;
  },
};
