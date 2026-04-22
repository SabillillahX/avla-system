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

  uploadVideo: async (payload: UploadVideoPayload): Promise<Video> => {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("source_type", payload.source_type);

    if (payload.description) formData.append("description", payload.description);
    if (payload.category) formData.append("category", payload.category);
    if (payload.thumbnail_file) formData.append("thumbnail", payload.thumbnail_file);

    if (payload.source_type === "file" && payload.video_file) {
      formData.append("video_file", payload.video_file);
    } else if (payload.source_type === "url" && payload.video_url) {
      formData.append("video_url", payload.video_url);
    }

    const response = await api.post<ApiResponse<Video>>("/videos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
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
    if (payload.category !== undefined) formData.append("category", payload.category);
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