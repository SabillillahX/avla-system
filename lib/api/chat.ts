import api from './axios';
import type { ApiResponse, PaginatedResponse } from './classes';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
}

export interface ClassChatMessage {
  id: string;
  class_id: string;
  message: string;
  user: ChatUser | null;
  created_at: string;
}

export const classChatApi = {
  listMessages: async (classId: string, page = 1) => {
    const response = await api.get<ApiResponse<PaginatedResponse<ClassChatMessage>>>(
      `/classes/${classId}/chat/messages`,
      { params: { page } }
    );
    return response.data;
  },

  sendMessage: async (classId: string, message: string) => {
    const response = await api.post<ApiResponse<ClassChatMessage>>(
      `/classes/${classId}/chat/messages`,
      { message }
    );
    return response.data;
  },
};
