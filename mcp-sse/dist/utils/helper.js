import dotenv from "dotenv";
dotenv.config();
export const ENV = {
    geminiApiKey: process.env.GEMINI_API ?? "",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
    allowedOrigins: process.env.ALLOWED_ORIGINS ?? "",
    port: Number(process.env.PORT ?? 8081),
};
export const REQUIRED_ENV_KEYS = ["geminiApiKey", "backendUrl"];
for (const key of REQUIRED_ENV_KEYS) {
    if (!ENV[key]) {
        console.error(`[Config] Missing required environment variable: ${key}`);
        process.exit(1);
    }
}
export const ALLOWED_ORIGINS = Array.from(new Set([
    ...ENV.allowedOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]));
// Quiz Parsing Constants
export function normalizeWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
}
export function stripOptionPrefix(value) {
    return value
        .replace(/^\s*[-*]\s+/, "")
        .replace(/^\s*[A-Da-d][\).:\-]\s+/, "")
        .replace(/^\s*\d+[\).:\-]\s+/, "")
        .trim();
}
export function stripWrappingQuotes(value) {
    return value.replace(/^['"`]+|['"`]+$/g, "").trim();
}
export function normalizeOptionText(value) {
    return normalizeWhitespace(stripWrappingQuotes(stripOptionPrefix(value)));
}
export function normalizeForComparison(value) {
    return normalizeOptionText(value).toLowerCase();
}
export function resolveCorrectAnswerText(rawCorrectAnswer, normalizedOptions) {
    const normalizedAnswer = normalizeForComparison(rawCorrectAnswer);
    if (!normalizedAnswer)
        return null;
    const exactMatch = normalizedOptions.find((option) => normalizeForComparison(option) === normalizedAnswer);
    if (exactMatch)
        return exactMatch;
    const labelMatch = normalizedAnswer.match(/(?:option\s*)?([a-d])/i);
    if (labelMatch) {
        const index = labelMatch[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
        if (index >= 0 && index < normalizedOptions.length) {
            return normalizedOptions[index];
        }
    }
    return null;
}
export function resolveCorrectAnswer(rawValue, normalizedOptions) {
    if (typeof rawValue === "number" && Number.isInteger(rawValue)) {
        const index = rawValue - 1;
        return index >= 0 && index < normalizedOptions.length
            ? normalizedOptions[index]
            : null;
    }
    if (typeof rawValue === "string") {
        return resolveCorrectAnswerText(rawValue, normalizedOptions);
    }
    return null;
}
export function extractNestedCandidateObjects(input) {
    if (!input || typeof input !== "object")
        return [];
    const root = input;
    const candidates = [root];
    for (const key of ["quiz", "result", "data", "item", "question_data", "mcq"]) {
        const value = root[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
            candidates.push(value);
        }
    }
    for (const key of ["quizzes", "questions", "items"]) {
        const value = root[key];
        if (Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (firstItem && typeof firstItem === "object") {
                candidates.push(firstItem);
            }
        }
    }
    return candidates;
}
export function coerceQuizFromObject(rawObject) {
    const candidates = extractNestedCandidateObjects(rawObject);
    for (const candidate of candidates) {
        const rawQuestion = candidate.question;
        const rawOptions = candidate.options;
        const rawCorrectAnswer = candidate.correct_answer ??
            candidate.correctAnswer ??
            candidate.answer ??
            candidate.correctOption;
        const rawExplanation = candidate.explanation;
        if (typeof rawQuestion !== "string" || !rawQuestion.trim())
            continue;
        if (!Array.isArray(rawOptions) || rawOptions.length < 2)
            continue;
        const normalizedOptions = rawOptions
            .filter((opt) => typeof opt === "string" && !!opt.trim())
            .map(normalizeOptionText)
            .filter(Boolean)
            .slice(0, 4);
        if (normalizedOptions.length !== 4)
            continue;
        const correctAnswer = resolveCorrectAnswer(rawCorrectAnswer, normalizedOptions);
        if (!correctAnswer)
            continue;
        return {
            question: normalizeWhitespace(rawQuestion),
            options: normalizedOptions,
            correct_answer: correctAnswer,
            explanation: typeof rawExplanation === "string" ? normalizeWhitespace(rawExplanation) : "",
        };
    }
    return null;
}
export function extractFirstJsonObject(input) {
    let inString = false;
    let isEscaped = false;
    let depth = 0;
    let startIndex = -1;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (isEscaped) {
            isEscaped = false;
            continue;
        }
        if (char === "\\") {
            isEscaped = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (inString)
            continue;
        if (char === "{") {
            if (depth === 0)
                startIndex = i;
            depth++;
        }
        else if (char === "}") {
            depth--;
            if (depth === 0 && startIndex !== -1) {
                return input.slice(startIndex, i + 1);
            }
        }
    }
    return null;
}
export function parseQuizFromLlmOutput(rawOutput) {
    const cleaned = rawOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
    const candidates = [cleaned, extractFirstJsonObject(cleaned)].filter((v) => Boolean(v));
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const coerced = coerceQuizFromObject(parsed);
            if (coerced)
                return coerced;
        }
        catch {
            // continue to next candidate
        }
    }
    return null;
}
// Assessment Parsing Functions
export function coerceAssessmentQuestionFromObject(rawObject) {
    if (typeof rawObject !== "object" || !rawObject)
        return null;
    const obj = rawObject;
    const type = obj.type;
    const difficulty = obj.difficulty_level;
    const question = obj.question;
    const metadata = obj.metadata;
    const correctAnswers = obj.correct_answers;
    const explanation = obj.explanation;
    if (!type || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5)
        return null;
    if (!question || typeof question !== "string" || !question.trim())
        return null;
    if (!Array.isArray(correctAnswers) || correctAnswers.length === 0)
        return null;
    const validTypes = ["multiple_choice", "short_answer", "essay"];
    if (!validTypes.includes(type))
        return null;
    let normalizedMetadata = null;
    if (type === "multiple_choice" && Array.isArray(metadata)) {
        const mcMetadata = metadata
            .filter((m) => typeof m === "string" && !!m.trim())
            .map(normalizeOptionText)
            .filter(Boolean)
            .slice(0, 4);
        if (mcMetadata.length === 4) {
            normalizedMetadata = mcMetadata;
            // Validate correct_answer is in options
            const correctAnswersNormalized = correctAnswers
                .filter((ans) => typeof ans === "string")
                .map(normalizeForComparison);
            const optionsNormalized = mcMetadata.map(normalizeForComparison);
            const allCorrectInOptions = correctAnswersNormalized.every((ans) => optionsNormalized.includes(ans));
            if (!allCorrectInOptions)
                return null;
        }
        else {
            return null;
        }
    }
    else if (type === "multiple_choice") {
        return null; // MC must have 4 options
    }
    const normalizedCorrectAnswers = correctAnswers
        .filter((ans) => typeof ans === "string" && !!ans.trim())
        .map(normalizeWhitespace)
        .filter(Boolean);
    if (normalizedCorrectAnswers.length === 0)
        return null;
    return {
        type: type,
        difficulty_level: difficulty,
        question: normalizeWhitespace(question),
        metadata: normalizedMetadata,
        correct_answers: normalizedCorrectAnswers,
        explanation: typeof explanation === "string" ? normalizeWhitespace(explanation) : "",
    };
}
export function parseAssessmentFromLlmOutput(rawOutput) {
    const cleaned = rawOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
    const candidates = [cleaned, extractFirstJsonObject(cleaned)].filter((v) => Boolean(v));
    const questions = [];
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    const coerced = coerceAssessmentQuestionFromObject(item);
                    if (coerced) {
                        questions.push(coerced);
                    }
                }
                if (questions.length > 0)
                    return questions;
            }
            else {
                const coerced = coerceAssessmentQuestionFromObject(parsed);
                if (coerced) {
                    questions.push(coerced);
                }
            }
        }
        catch {
            // continue to next candidate
        }
    }
    return questions;
}
