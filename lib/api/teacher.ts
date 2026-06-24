import api from './axios';

export interface TeacherExperience {
  title: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface TeacherEducation {
  school: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
}

export interface TeacherCertification {
  name: string;
  issuer?: string;
  issued_date?: string;
  credential_url?: string;
  image_url?: string;
}

export interface TeacherPortfolio {
  title: string;
  url?: string;
  description?: string;
  image_url?: string;
}

export interface TeacherApplicationPayload {
  headline: string;
  bio?: string;
  experiences: TeacherExperience[];
  educations: TeacherEducation[];
  certifications: TeacherCertification[];
  portfolios: TeacherPortfolio[];
  skills: string[];
}

export interface TeacherApplication extends TeacherApplicationPayload {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const teacherApplicationApi = {
  // Fetch the current user's own application (null if they haven't applied yet)
  get: async (): Promise<{ data: TeacherApplication | null }> => {
    const response = await api.get<{ data: TeacherApplication | null }>('/teacher-application');
    return response.data;
  },

  // Submit (or resubmit after a rejection) a teacher application
  submit: async (
    payload: TeacherApplicationPayload,
  ): Promise<{ message: string; data: TeacherApplication }> => {
    const response = await api.post<{ message: string; data: TeacherApplication }>(
      '/teacher-application',
      payload,
    );
    return response.data;
  },

  // Upload a supporting image (certification / portfolio), returns its public URL
  uploadImage: async (image: File): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append('image', image);
    const response = await api.post<{ url: string; path: string }>(
      '/teacher-application/upload-image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
