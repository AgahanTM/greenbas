// --- MEVCUT KODUNUZ ---
import Constants from 'expo-constants';
import { File } from "expo-file-system";
import { Alert } from "react-native";

// Use the API key from your environment variables
const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY;

// Check for API Key presence at runtime
if (!GEMINI_API_KEY) {
    Alert.alert("Configuration Error", "GEMINI_API_KEY is missing. Check your .env file and app.config.js.");
    throw new Error("API Key is missing.");
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Define the type for the meal data for strong type safety
export interface Meal {
  meal_name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MealRecognitionPrompt = `Являясь AI по распознаванию блюд, определите еду на этом изображении и верните ТОЛЬКО объект JSON со следующей структурой:
{
  "meal_name": "...",
  "description": "...",
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0
}`;

/**
 * Analyzes an image URI to identify a meal and its nutritional information.
 * @param {string} uri - The local URI of the image to analyze.
 * @param {string} [mimeType="image/jpeg"] - The MIME type of the image.
 * @returns {Promise<Meal>} - A promise that resolves to the parsed meal data.
 */
export const analyzeImageWithGemini = async (uri: string, mimeType: string = "image/jpeg"): Promise<Meal> => {
  try {
    // 1. Convert local file to Base64 using new File API
    const file = new File(uri);
    const base64Image = await file.base64();

    // Validate MIME type (Gemini supports jpeg, png, webp, heic, heif)
    const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Unsupported image format: ${mimeType}. Convert to JPEG or PNG.`);
    }

    // 2. Make the Gemini API call
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: MealRecognitionPrompt },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          },
        ],
      }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No content returned from Gemini API.");
    }
    
    // 3. Robust JSON parsing (handling markdown fences from LLM)
    try {
        const cleanedText = text.replace(/```json|```/g, "").trim();
        const jsonStart = cleanedText.indexOf("{");
        const jsonEnd = cleanedText.lastIndexOf("}") + 1;
        const jsonString = cleanedText.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonString);
    } catch (parseError) {
        console.error("Failed to parse JSON from API response:", text);
        throw new Error("Received an invalid format from the AI. Response was not a valid JSON object.");
    }
  } catch (error) {
    // Re-throw the error to be caught by the component
    throw error;
  }
};

// --- YENİ EKLEME: ZeroWaste AI Önerisi ---
const ZeroWastePrompt = (itemsList: string) => `
You are a helpful zero-waste chef. Given these pantry items: (${itemsList}),
produce 3 simple recipe ideas (title + 1-line instruction) and 3 quick tips to avoid food waste using these ingredients.
Keep it short, actionable, and in Russian. Respond in plain text only.
`;

/**
 * getMealSuggestions
 * @param itemsList - "egg, tomato, cheese" gibi virgülle ayrılmış pantry öğeleri
 * @returns Promise<string> - AI tarafından oluşturulan öneri metni
 */
export const getMealSuggestions = async (itemsList: string): Promise<string> => {
  try {
    const prompt = ZeroWastePrompt(itemsList);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      const message = err?.error?.message || response.statusText || "Gemini API hatası";
      throw new Error(message);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data?.candidates?.[0]?.content ?? null;

    if (!text) {
      const alt = JSON.stringify(data).slice(0, 500);
      throw new Error("Gemini'den uygun yanıt gelmedi: " + alt);
    }

    return String(text).trim();
  } catch (error: any) {
    console.error("getMealSuggestions error:", error);
    throw new Error(error?.message || "Öneri alınamadı");
  }
};