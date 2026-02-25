import {
    GoogleGenerativeAI,
    type GenerativeModel,
    type ChatSession,
} from '@google/generative-ai';
import type { ChatMessage } from '@/types';

// ─── Client Singleton ──────────────────────────────────────────────────────
let _genAI: GoogleGenerativeAI | null = null;
let _flashModel: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!_genAI) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set');
        _genAI = new GoogleGenerativeAI(apiKey);
    }
    return _genAI;
}

function getFlashModel(): GenerativeModel {
    if (!_flashModel) {
        _flashModel = getGenAI().getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: `You are an expert linguistic assistant specializing in the Maltese language.
You have deep knowledge of Maltese morphology, etymology (Arabic, Sicilian, Italian, Latin roots),
and dialectal variation across Malta and Gozo. You respond in the dialect requested by the user.
When discussing linguistic terms, you use the terminology mode specified (standard or arabised).`,
        });
    }
    return _flashModel;
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface ChatOptions {
    dialect?: string;
    linguisticMode?: 'standard' | 'arabised';
    systemOverride?: string;
}

/**
 * Creates a new Gemini chat session for the dialect chatbot.
 */
export function createChatSession(options: ChatOptions = {}): ChatSession {
    const model = getGenAI().getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: options.systemOverride ??
            `You are a friendly Maltese language assistant. 
       ${options.dialect ? `Respond in the ${options.dialect} dialect of Maltese.` : 'Respond in Standard Maltese.'}
       ${options.linguisticMode === 'arabised' ? 'Use Arabised Maltese linguistic terminology when discussing grammar.' : ''}
       You help users learn and explore the Maltese language.`,
    });
    return model.startChat({ history: [] });
}

/**
 * Send a message to the dialect chatbot and return the response.
 */
export async function sendChatMessage(
    session: ChatSession,
    message: string,
): Promise<string> {
    const result = await session.sendMessage(message);
    return result.response.text();
}

// ─── Entry Explanation ─────────────────────────────────────────────────────

/**
 * Generate an AI explanation / extended notes for a dictionary entry.
 */
export async function explainEntry(
    headword: string,
    context: string,
): Promise<string> {
    const model = getFlashModel();
    const prompt = `Provide a concise linguistic note (2-3 sentences) about the Maltese word "${headword}".
Context: ${context}
Focus on: etymology, usage nuances, or interesting morphological features.
Response language: English.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

// ─── Is-Semmej (AI Namer) ─────────────────────────────────────────────────

/**
 * Given a concept description, suggest Maltese names using Semitic / Romance
 * morphological rules.
 */
export async function generateMalteseName(
    concept: string,
    preferred_roots?: string[],
): Promise<{ suggestions: Array<{ word: string; rationale: string }> }> {
    const model = getFlashModel();
    const prompt = `You are Is-Semmej, a Maltese naming AI.
Suggest 3 creative Maltese names/words for the following concept: "${concept}".
${preferred_roots?.length ? `Preferred consonantal roots to use: ${preferred_roots.join(', ')}` : ''}
For each suggestion provide:
1. The Maltese word
2. Its morphological rationale (which root, which pattern, what does it mean literally)

Return JSON: { "suggestions": [{ "word": "...", "rationale": "..." }] }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, '');
    try {
        return JSON.parse(text);
    } catch {
        return { suggestions: [] };
    }
}

// ─── Audio / TTS ───────────────────────────────────────────────────────────

/**
 * NOTE: Gemini's native TTS/audio generation is not available in the standard
 * REST API yet. Audio generation should be routed through a Cloudflare Pages
 * Function that calls the Gemini Audio API and uploads the result to R2.
 *
 * Stub: returns a placeholder promise.
 * TODO: implement via /api/generate-audio Pages Function.
 */
export async function generateEntryAudio(
    ipa: string,
    entryId: string,
): Promise<{ r2_object_key: string }> {
    const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipa, entry_id: entryId }),
    });
    if (!response.ok) throw new Error('Audio generation failed');
    return response.json();
}

// ─── Spelling & Grammar Checker ────────────────────────────────────────────

export async function checkMalteseText(
    text: string,
): Promise<{ corrected: string; issues: Array<{ original: string; suggestion: string; type: string }> }> {
    const model = getFlashModel();
    const prompt = `Check the following Maltese text for spelling and grammar errors.
Text: "${text}"
Return JSON: { "corrected": "...", "issues": [{ "original": "...", "suggestion": "...", "type": "spelling|grammar|style" }] }`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json\n?|\n?```/g, '');
    try {
        return JSON.parse(raw);
    } catch {
        return { corrected: text, issues: [] };
    }
}

// ─── History helper ────────────────────────────────────────────────────────
export function toGeminiHistory(messages: ChatMessage[]) {
    return messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
}
