"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Plus, HelpCircle, FileText } from "lucide-react"
import { toast } from "sonner"
import { videosApi } from "@/lib/api/handle-videos"
import { Quiz, AssessmentQuestion } from "@/lib/types/handle-videos"

export default function ManageQuestionsPage({ params }: { params: { videoId: string } }) {
  const router = useRouter()
  const { videoId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assessments, setAssessments] = useState<AssessmentQuestion[]>([])

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const [quizzesData, assessmentsData] = await Promise.all([
          videosApi.getVideoQuizzes(videoId),
          videosApi.getVideoAssessments(videoId)
        ])
        setQuizzes(quizzesData)
        setAssessments(assessmentsData)
      } catch (err) {
        toast.error("Failed to load questions")
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuestions()
  }, [videoId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              View AI Results & Assessments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review AI generated quizzes, semantic assessments, and add custom questions.
            </p>
          </div>
        </div>

        <Tabs defaultValue="quizzes" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl">
            <TabsTrigger value="quizzes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <HelpCircle className="w-4 h-4 mr-2" /> Video Quizzes ({quizzes.length})
            </TabsTrigger>
            <TabsTrigger value="assessments" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4 mr-2" /> Semantic Assessments ({assessments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="mt-6 space-y-4">
            {quizzes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No quizzes have been generated for this video.</p>
              </div>
            ) : (
              quizzes.map((quiz, index) => (
                <Card key={quiz.id || index} className="shadow-sm">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base font-medium flex items-start gap-3">
                      <span className="flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 w-6 h-6 rounded-full text-xs shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {quiz.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 pt-0 space-y-2">
                    <p className="text-sm text-gray-500 mb-2">Options:</p>
                    <ul className="space-y-1.5 pl-9">
                      {quiz.options.map((opt, i) => {
                        const isCorrect = opt === quiz.correct_answer;
                        const isMissingAnswer = !quiz.correct_answer;
                        return (
                        <li key={i} className={`text-sm p-2 rounded-md border ${isCorrect ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300" : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"}`}>
                          {opt} {isCorrect && <span className="text-xs ml-2 font-semibold opacity-70">(Correct Answer)</span>}
                        </li>
                      )})}
                    </ul>
                    <div className="mt-4 pl-9 space-y-1">
                      <p className="text-sm text-gray-500"><strong>Trigger time:</strong> {quiz.trigger_time}s</p>
                      {quiz.explanation && <p className="text-sm text-gray-500 mt-2"><strong>Feedback/Explanation:</strong> {quiz.explanation}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="assessments" className="mt-6 space-y-4">
            <div className="flex justify-end mb-4">
              <Button className="gap-2" onClick={() => toast.info("Add Question feature coming soon!")}>
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>
            
            {assessments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No assessments have been generated for this video.</p>
              </div>
            ) : (
              assessments.map((assessment, index) => {
                const keywords = Array.isArray(assessment.options) ? assessment.options : [];
                return (
                <Card key={assessment.uuid || index} className="shadow-sm border-l-4 border-l-purple-500">
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between gap-4 w-full">
                      <CardTitle className="text-base font-medium flex items-start gap-3 flex-1">
                        <span className="flex items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 w-6 h-6 rounded-full text-xs shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        {assessment.question}
                      </CardTitle>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded">
                          Type: {assessment.type}
                        </span>
                        {assessment.bloom_level && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded">
                            Bloom: {assessment.bloom_level}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-4 pt-0 space-y-3 pl-9">
                    {assessment.accepted_answers && assessment.accepted_answers.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Reference Answer</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {Array.isArray(assessment.accepted_answers) ? assessment.accepted_answers.join(", ") : assessment.accepted_answers}
                        </p>
                      </div>
                    )}
                    
                    {keywords.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Semantic Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {keywords.map((kw, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessment.explanation && (
                      <p className="text-sm text-gray-500 mt-2"><strong>Explanation:</strong> {assessment.explanation}</p>
                    )}
                  </CardContent>
                </Card>
              )})
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
