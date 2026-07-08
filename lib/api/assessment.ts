import api from "./axios";
import {
  AssessmentQuestionsResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from "../types/assessment";

export const assessmentApi = {
  getQuestions: async (videoId: string): Promise<AssessmentQuestionsResponse> => {
    const response = await api.get<AssessmentQuestionsResponse>(
      `/questions?video_id=${videoId}`
    );
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
  }
};
