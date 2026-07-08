import api from "./axios";
import {
  AssessmentQuestionsResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from "../types/assessment";

export const assessmentApi = {
  getQuestions: async (videoId: string, batchId?: string): Promise<AssessmentQuestionsResponse> => {
    const url = batchId ? `/questions?video_id=${videoId}&batch_id=${batchId}` : `/questions?video_id=${videoId}`;
    const response = await api.get<AssessmentQuestionsResponse>(url);
    return response.data;
  },

  submitAnswer: async (
    payload: SubmitAnswerPayload
  ): Promise<SubmitAnswerResponse> => {
    const response = await api.post<SubmitAnswerResponse>(
      "/question-answers",
      payload
    );
    return response.data;
  },

  getStudentAnswersByClass: async (classId: string) => {
    const response = await api.get(`/courses/${classId}/student-answers`);
    return response.data;
  },

  gradeAnswer: async (answerId: string, payload: { score: number | null; feedback: string | null; is_correct: boolean | null }) => {
    const response = await api.put(`/question-answers/${answerId}/grade`, payload);
    return response.data;
  },

  updateScore: async (questionId: string, payload: { batch_id?: string | null; score?: number | null; feedback?: string | null; is_correct?: boolean | null; ai_score_suggestion?: number | null; ai_feedback_suggestion?: string | null }) => {
    const response = await api.put(`/question-answers/${questionId}/score`, payload);
    return response.data;
  }
};
