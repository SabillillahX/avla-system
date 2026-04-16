export type VideoSourceType = "file" | "url";
export type VideoStatus = "pending" | "processing" | "completed" | "failed";
export type ViewMode = "grid" | "list";

export interface Video {
  id: string;
  user_id: number;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_path: string | null;
  source_type: VideoSourceType;
  original_url: string | null;
  original_path: string | null;
  compressed_video_path: string | null;
  mp3_audio_path: string | null;
  status: VideoStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginatedVideos {
  data: Video[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface UploadVideoPayload {
  title: string;
  description?: string;
  category?: string;
  thumbnail_file?: File;
  source_type: VideoSourceType;
  video_file?: File;
  video_url?: string;
}

export interface UpdateVideoPayload {
  title?: string;
  description?: string;
  category?: string;
  thumbnail_file?: File;
}