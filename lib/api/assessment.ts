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
};
