import api from '../axios';
import type { TeacherApplication } from '../teacher';

export interface TeacherApplicationApplicant {
  id: string;
  name: string;
  email: string;
}

export interface AdminTeacherApplication extends TeacherApplication {
  user?: TeacherApplicationApplicant;
}

export interface PaginatedApplications {
  data: AdminTeacherApplication[];
  current_page: number;
  last_page: number;
  total: number;
}

export const adminTeacherApplicationApi = {
  // List applications, optionally filtered by status
  list: async (status?: string): Promise<{ data: PaginatedApplications }> => {
    const response = await api.get<{ data: PaginatedApplications }>('/admin/teacher-applications', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  approve: async (
    id: string,
    reviewNote?: string,
  ): Promise<{ message: string; data: AdminTeacherApplication }> => {
    const response = await api.post(`/admin/teacher-applications/${id}/approve`, {
      review_note: reviewNote,
    });
    return response.data;
  },

  reject: async (
    id: string,
    reviewNote: string,
  ): Promise<{ message: string; data: AdminTeacherApplication }> => {
    const response = await api.post(`/admin/teacher-applications/${id}/reject`, {
      review_note: reviewNote,
    });
    return response.data;
  },
};
