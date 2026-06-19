import api from "./axios";
import {
  ApiResponse,
  PaginatedVideos,
  Quiz,
  QuizListResponse,
  UpdateVideoPayload,
  UploadVideoPayload,
  Video,
} from "../types/handle-videos";
import { AxiosProgressEvent } from "axios";

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
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("source_type", payload.source_type);

    if (payload.description) formData.append("description", payload.description);
    if (payload.category_id) formData.append("category_id", payload.category_id);
    if (payload.class_id) formData.append("class_id", payload.class_id);
    if (payload.section_id) formData.append("section_id", payload.section_id);
    if (payload.thumbnail_file) formData.append("thumbnail", payload.thumbnail_file);
    if (payload.generate_ai_quiz !== undefined) {
      formData.append("generate_ai", payload.generate_ai_quiz ? "1" : "0");
    }

    if (payload.source_type === "file" && payload.video_file) {
      formData.append("video_file", payload.video_file);
    } else if (payload.source_type === "url" && payload.video_url) {
      formData.append("video_url", payload.video_url);
    }

    const response = await api.post<ApiResponse<Video>>("/videos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
    return response.data.data;
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
    if (payload.class_id !== undefined) formData.append("class_id", payload.class_id);
    if (payload.section_id !== undefined) formData.append("section_id", payload.section_id);
    if (payload.thumbnail_file) formData.append("thumbnail", payload.thumbnail_file);

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
};