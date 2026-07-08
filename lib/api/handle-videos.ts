import api from "./axios";
import {
  ApiResponse,
  AssessmentQuestion,
  PaginatedVideos,
  Quiz,
  QuizListResponse,
  UpdateVideoPayload,
  UploadVideoPayload,
  Video,
} from "../types/handle-videos";
import { AxiosProgressEvent } from "axios";

export interface UpdateAssessmentPayload {
  video_id: string;
  type: string;
  question: string;
  correct_answer?: string | null;
}

export interface CreateAssessmentPayload extends UpdateAssessmentPayload {}

export interface UpdateQuizzesPayload {
  quizzes: Array<{
    trigger_time: number;
    question: string;
    options: string[];
    correct_answer: string;
    explanation?: string | null;
  }>;
}

export const videosApi = {
  getVideos: async (page = 1): Promise<PaginatedVideos> => {
    const response = await api.get<ApiResponse<PaginatedVideos>>("/videos", {
      params: { page },
    });
    return response.data.data;
  },

  getVideoById: async (videoId: string): Promise<Video> => {
    const response = await api.get<ApiResponse<Video>>(`/videos/${videoId}`);
    return response.data.data;
  },

  getVideoQuizzes: async (videoId: string): Promise<Quiz[]> => {
    const response = await api.get<QuizListResponse>(`/videos/${videoId}/quizzes`);
    return response.data.data;
  },

  getVideoAssessments: async (videoId: string): Promise<any[]> => {
    const response = await api.get(`/questions`, { params: { video_id: videoId } });
    return response.data.data;
  },

  uploadVideo: async (
    payload: UploadVideoPayload,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<Video> => {
    if (payload.source_type === "url" || !payload.video_file) {
      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("source_type", payload.source_type);

      if (payload.description) formData.append("description", payload.description);
      if (payload.category_id) formData.append("category_id", payload.category_id);
      if (payload.course_id) formData.append("course_id", payload.course_id);
      if (payload.section_id) formData.append("chapter_id", payload.section_id);
      if (payload.thumbnail_file) formData.append("thumbnail", payload.thumbnail_file);
      if (payload.generate_ai_quiz !== undefined) {
        formData.append("generate_ai", payload.generate_ai_quiz ? "1" : "0");
      }
      if (payload.require_grading !== undefined) {
        formData.append("require_grading", payload.require_grading ? "1" : "0");
      }
      if (payload.passing_score !== undefined) {
        formData.append("passing_score", payload.passing_score.toString());
      }
      if (payload.source_type === "url" && payload.video_url) {
        formData.append("video_url", payload.video_url);
      }

      const response = await api.post<ApiResponse<Video>>("/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      });
      return response.data.data;
    }

    // Chunking logic for file upload to prevent payload too large errors
    const file = payload.video_file;
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let lastResponse;
    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const isFinalChunk = i === totalChunks - 1;

      const formData = new FormData();
      formData.append("is_chunk", "1");
      formData.append("upload_id", uploadId);
      formData.append("chunk_index", i.toString());
      formData.append("total_chunks", totalChunks.toString());
      formData.append("video_file", chunk, file.name);

      if (isFinalChunk) {
        formData.append("title", payload.title);
        formData.append("source_type", payload.source_type);
        if (payload.description) formData.append("description", payload.description);
        if (payload.category_id) formData.append("category_id", payload.category_id);
        if (payload.course_id) formData.append("course_id", payload.course_id);
        if (payload.section_id) formData.append("chapter_id", payload.section_id);
        if (payload.thumbnail_file) formData.append("thumbnail", payload.thumbnail_file);
        if (payload.generate_ai_quiz !== undefined) {
          formData.append("generate_ai", payload.generate_ai_quiz ? "1" : "0");
        }
        if (payload.require_grading !== undefined) {
          formData.append("require_grading", payload.require_grading ? "1" : "0");
        }
        if (payload.passing_score !== undefined) {
          formData.append("passing_score", payload.passing_score.toString());
        }
        formData.append("file_name", file.name);
      }

      lastResponse = await api.post<ApiResponse<Video> | { message: string, progress: number }>("/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const chunkLoaded = progressEvent.loaded;
            const previousChunksLoaded = i * chunkSize;
            const totalLoaded = previousChunksLoaded + chunkLoaded;

            const fakeEvent = {
              loaded: totalLoaded,
              total: file.size,
              bytes: progressEvent.bytes,
            } as AxiosProgressEvent;
            onUploadProgress(fakeEvent);
          }
        }
      });
    }

    return (lastResponse?.data as ApiResponse<Video>).data;
  },

  updateVideo: async (
    videoId: string,
    payload: UpdateVideoPayload
  ): Promise<Video> => {
    const formData = new FormData();
    formData.append("_method", "PATCH");

    if (payload.title !== undefined) formData.append("title", payload.title);
    if (payload.description !== undefined) formData.append("description", payload.description);
    if (payload.category_id !== undefined) formData.append("category_id", payload.category_id);
    if (payload.course_id !== undefined) formData.append("course_id", payload.course_id);
    if (payload.section_id !== undefined) formData.append("chapter_id", payload.section_id);
    if (payload.thumbnail_file) formData.append("thumbnail", payload.thumbnail_file);
    if (payload.require_grading !== undefined) {
      formData.append("require_grading", payload.require_grading ? "1" : "0");
    }
    if (payload.passing_score !== undefined) {
      formData.append("passing_score", payload.passing_score.toString());
    }

    const response = await api.post<ApiResponse<Video>>(
      `/videos/${videoId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },

  deleteVideo: async (videoId: string): Promise<void> => {
    await api.delete(`/videos/${videoId}`);
  },

  updateAssessment: async (uuid: string, payload: UpdateAssessmentPayload): Promise<AssessmentQuestion> => {
    const response = await api.put<ApiResponse<AssessmentQuestion>>(`/questions/${uuid}`, payload);
    return response.data.data;
  },

  createAssessment: async (payload: CreateAssessmentPayload): Promise<AssessmentQuestion> => {
    const response = await api.post<ApiResponse<AssessmentQuestion>>(`/questions`, payload);
    return response.data.data;
  },

  deleteAssessment: async (uuid: string): Promise<void> => {
    await api.delete(`/questions/${uuid}`);
  },

  updateQuizzes: async (videoId: string, payload: UpdateQuizzesPayload): Promise<void> => {
    await api.post(`/videos/${videoId}/quizzes`, payload);
  },
};