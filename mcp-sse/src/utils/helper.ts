
import dotenv from "dotenv";
import { ParsedQuiz, UnknownRecord } from "./interface.js";

dotenv.config();

export const ENV = {
    geminiApiKey: process.env.GEMINI_API ?? "",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
    allowedOrigins: process.env.ALLOWED_ORIGINS ?? "",
    port: Number(process.env.PORT ?? 8081),
} as const;

export const REQUIRED_ENV_KEYS = ["geminiApiKey", "backendUrl"] as const;

for (const key of REQUIRED_ENV_KEYS) {
    if (!ENV[key]) {
        console.error(`[Config] Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

export const ALLOWED_ORIGINS: string[] = Array.from(
    new Set([
        ...ENV.allowedOrigins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])
);

// Quiz Parsing Constants
export function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function stripOptionPrefix(value: string): string {
    return value
        .replace(/^\s*[-*]\s+/, "")
        .replace(/^\s*[A-Da-d][\).:\-]\s+/, "")
        .replace(/^\s*\d+[\).:\-]\s+/, "")
        .trim();
}

export function stripWrappingQuotes(value: string): string {
    return value.replace(/^['"`]+|['"`]+$/g, "").trim();
}

export function normalizeOptionText(value: string): string {
    return normalizeWhitespace(stripWrappingQuotes(stripOptionPrefix(value)));
}

export function normalizeForComparison(value: string): string {
    return normalizeOptionText(value).toLowerCase();
}

export function resolveCorrectAnswerText(
    rawCorrectAnswer: string,
    normalizedOptions: string[]
): string | null {
    const normalizedAnswer = normalizeForComparison(rawCorrectAnswer);
    if (!normalizedAnswer) return null;

    const exactMatch = normalizedOptions.find(
        (option) => normalizeForComparison(option) === normalizedAnswer
    );
    if (exactMatch) return exactMatch;

    const labelMatch = normalizedAnswer.match(/(?:option\s*)?([a-d])/i);
    if (labelMatch) {
        const index = labelMatch[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
        if (index >= 0 && index < normalizedOptions.length) {
            return normalizedOptions[index];
        }
    }

    return null;
}

export function resolveCorrectAnswer(
    rawValue: unknown,
    normalizedOptions: string[]
): string | null {
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

export function extractNestedCandidateObjects(input: unknown): UnknownRecord[] {
    if (!input || typeof input !== "object") return [];

    const root = input as UnknownRecord;
    const candidates: UnknownRecord[] = [root];

    for (const key of ["quiz", "result", "data", "item", "question_data", "mcq"]) {
        const value = root[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
            candidates.push(value as UnknownRecord);
        }
    }

    for (const key of ["quizzes", "questions", "items"]) {
        const value = root[key];
        if (Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (firstItem && typeof firstItem === "object") {
                candidates.push(firstItem as UnknownRecord);
            }
        }
    }

    return candidates;
}

export function coerceQuizFromObject(rawObject: unknown): ParsedQuiz | null {
    const candidates = extractNestedCandidateObjects(rawObject);

    for (const candidate of candidates) {
        const rawQuestion = candidate.question;
        const rawOptions = candidate.options;
        const rawCorrectAnswer =
            candidate.correct_answer ??
            candidate.correctAnswer ??
            candidate.answer ??
            candidate.correctOption;
        const rawExplanation = candidate.explanation;

        if (typeof rawQuestion !== "string" || !rawQuestion.trim()) continue;
        if (!Array.isArray(rawOptions) || rawOptions.length < 2) continue;

        const normalizedOptions = rawOptions
            .filter((opt): opt is string => typeof opt === "string" && !!opt.trim())
            .map(normalizeOptionText)
            .filter(Boolean)
            .slice(0, 4);

        if (normalizedOptions.length !== 4) continue;

        const correctAnswer = resolveCorrectAnswer(rawCorrectAnswer, normalizedOptions);
        if (!correctAnswer) continue;

        return {
            question: normalizeWhitespace(rawQuestion),
            options: normalizedOptions as [string, string, string, string],
            correct_answer: correctAnswer,
            explanation:
                typeof rawExplanation === "string" ? normalizeWhitespace(rawExplanation) : "",
        };
    }

    return null;
}

export function extractFirstJsonObject(input: string): string | null {
    let inString = false;
    let isEscaped = false;
    let depth = 0;
    let startIndex = -1;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (isEscaped) { isEscaped = false; continue; }
        if (char === "\\") { isEscaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (char === "{") {
            if (depth === 0) startIndex = i;
            depth++;
        } else if (char === "}") {
            depth--;
            if (depth === 0 && startIndex !== -1) {
                return input.slice(startIndex, i + 1);
            }
        }
    }

    return null;
}

export function parseQuizFromLlmOutput(rawOutput: string): ParsedQuiz | null {
    const cleaned = rawOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
    const candidates = [cleaned, extractFirstJsonObject(cleaned)].filter(
        (v): v is string => Boolean(v)
    );

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const coerced = coerceQuizFromObject(parsed);
            if (coerced) return coerced;
        } catch {
            // continue to next candidate
        }
    }

    return null;
}