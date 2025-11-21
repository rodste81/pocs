
import { GoogleGenAI, Modality, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import { Scene } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;

/**
 * A wrapper function to make API calls with a retry mechanism for rate limit errors (429).
 * @param apiCall The function that makes the actual API call.
 * @param initialDelay The initial delay in milliseconds before the first retry.
 * @returns The result of the API call.
 */
async function makeApiCallWithRetry<T>(
    apiCall: () => Promise<T>,
    initialDelay: number = 30000
): Promise<T> {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < MAX_RETRIES) {
        try {
            return await apiCall();
        } catch (error: any) {
            const isRateLimitError = error.message && error.message.includes('429');

            if (!isRateLimitError) {
                console.error("Non-rate-limit error occurred, failing immediately:", JSON.stringify(error, null, 2));
                // Also log the message directly in case it's not enumerable
                console.error("Error message:", error.message);
                throw error;
            }

            attempt++;
            if (attempt >= MAX_RETRIES) {
                console.error(`API rate limit still present after ${MAX_RETRIES} attempts. Giving up.`);
                throw new Error("API_RATE_LIMIT_EXCEEDED");
            }

            console.warn(`API call failed (rate limit). Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
    // This part should be unreachable due to the logic inside the loop
    throw new Error("Exited retry loop unexpectedly.");
}


async function generateAudio(script: string): Promise<string> {
    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // A pleasant voice
                },
            },
        },
    });

    // The TTS model has a very low rate limit (2 RPM), so a long initial delay is crucial.
    // FIX: Explicitly provide the generic type to makeApiCallWithRetry to ensure the response is correctly typed.
    const response = await makeApiCallWithRetry<GenerateContentResponse>(apiCall, 60000); // 60s initial delay for TTS

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Failed to generate audio from TTS API after retries.");
    }
    return base64Audio;
}

async function generateImage(description: string, sceneNumber: number, allDescriptions: string[]): Promise<string> {
    const fullStoryboardContext = allDescriptions.map((desc, index) => `Cena ${index + 1}: ${desc}`).join('\n');

    // A prompt simplified to avoid meta-language that the model might draw.
    // It focuses on a direct command structure.
    const prompt = `Generate a single image for the scene described below.
Style: High-quality 3D cinematic animation, vibrant, detailed.
Visual Consistency: Use the full storyboard context to ensure characters and settings remain consistent across all scenes.

Full Storyboard Context:
${fullStoryboardContext}

Specific Scene to Generate:
"${description}"

IMPORTANT RULES:
- The image must be a SINGLE frame. NO multiple panels, NO collages, NO split screens.
- ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO SIGNAGE, NO SPEECH BUBBLES in the image. The image must be purely visual.
- The image aspect ratio is vertical (9:16).
- Focus on the visual elements described.`;

    const apiCall = () => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '9:16',
        },
    });

    const response = await makeApiCallWithRetry<GenerateImagesResponse>(apiCall, 5000);

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Failed to generate image from API after retries.");
    }
    return `data:image/jpeg;base64,${base64ImageBytes}`;
}

export async function generateFilename(storyboard: string): Promise<string> {
    const prompt = `Generate a short, concise, and relevant filename (slug format, no extension) for a video based on this storyboard. Max 5 words. Example: 'funny-cat-video'. Storyboard: "${storyboard.substring(0, 500)}..."`;

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.0-flash-exp", // Fast model for simple task
        contents: [{ parts: [{ text: prompt }] }],
    });

    try {
        const response = await makeApiCallWithRetry<GenerateContentResponse>(apiCall, 1000);
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return text ? text.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() : 'video';
    } catch (e) {
        console.error("Failed to generate filename, using default.", e);
        return `video-${Date.now()}`;
    }
}

export async function createSceneAssets(description: string, id: number, allDescriptions: string[]): Promise<Scene> {
    try {
        // Clean the description for narration/subtitle
        // Remove "Cena X:", "Scene X:", "CENA X -" etc.
        const subtitle = description.replace(/^(cena|scene)\s*\d+[\s:.-]*/i, '').trim();

        // Generate assets sequentially to respect API rate limits.
        // The functions now have built-in retries.
        const audio = await generateAudio(subtitle);
        const image = await generateImage(description, id, allDescriptions);

        return { id, description, subtitle, audio, image };
    } catch (error) {
        console.error(`Error processing scene ${id}:`, error);
        // Re-throw the error so the UI can catch it and display a specific message
        throw error;
    }
}