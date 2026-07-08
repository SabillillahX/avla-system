import axiosInstance from "./axios"
import { CourseBatch, CreateBatchPayload, UpdateBatchPayload } from "@/lib/types/batches"

interface ApiResponse<T> {
  message: string
  data: T
}

export const batchesApi = {
  list: (courseId: string) =>
    axiosInstance.get<ApiResponse<CourseBatch[]>>(`/courses/${courseId}/batches`),

  get: (courseId: string, batchId: string) =>
    axiosInstance.get<ApiResponse<CourseBatch>>(`/courses/${courseId}/batches/${batchId}`),

  create: (courseId: string, payload: CreateBatchPayload) =>
    axiosInstance.post<ApiResponse<CourseBatch>>(`/courses/${courseId}/batches`, payload),

  update: (courseId: string, batchId: string, payload: UpdateBatchPayload) =>
    axiosInstance.put<ApiResponse<CourseBatch>>(`/courses/${courseId}/batches/${batchId}`, payload),

  delete: (courseId: string, batchId: string) =>
    axiosInstance.delete<ApiResponse<null>>(`/courses/${courseId}/batches/${batchId}`),

  close: (courseId: string, batchId: string) =>
    axiosInstance.post<ApiResponse<CourseBatch>>(`/courses/${courseId}/batches/${batchId}/close`),

  invite: (courseId: string, batchId: string, payload: { user_identifier: string }) =>
    axiosInstance.post<ApiResponse<null>>(`/courses/${courseId}/batches/${batchId}/invite`, payload),
}
