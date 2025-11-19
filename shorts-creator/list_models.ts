import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API key found in .env.local");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

async function listModels() {
    try {
        // The SDK might not have a direct listModels on the client instance in this version, 
        // but let's try to use the models endpoint if possible or just infer from documentation.
        // Actually, the error message suggested calling ListModels. 
        // In the node SDK, it's usually via the API client.
        // Let's try to use the REST API directly if the SDK is obscure, but let's try SDK first.
        // Since I don't have the full SDK docs in memory, I'll try a simple fetch to the API endpoint.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                if (m.name.includes('imagen')) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
            // Also print all just in case
            console.log("\nAll Models:");
            data.models.forEach((m: any) => console.log(m.name));

        } else {
            console.error("Failed to list models:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
