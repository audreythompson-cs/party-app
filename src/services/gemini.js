import { GoogleGenerativeAI } from '@google/generative-ai';

// Retrieve the API Key from import.meta.env (for local dev)
const LOCAL_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Checks if Gemini analysis should be enabled.
 * - On localhost, we require VITE_GEMINI_API_KEY to be set.
 * - In production (Cloudflare), we assume the serverless function /api/analyze is available.
 */
export function isGeminiConfigured() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return typeof LOCAL_API_KEY === 'string' && LOCAL_API_KEY.trim().length > 0 && LOCAL_API_KEY !== 'your_gemini_api_key';
  }
  
  // In production, the backend Pages Function handles key security
  return true;
}

/**
 * Main entry point to analyze a selfie and generate features.
 * Returns the classification JSON object (containing skinTone, hairColor, hairStyle, etc.).
 */
export async function analyzeSelfieWithGemini(file) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost && LOCAL_API_KEY && LOCAL_API_KEY !== 'your_gemini_api_key') {
    console.log('Local dev detected: calling Gemini API client-side directly for JSON features...');
    return callGeminiClientSide(file, LOCAL_API_KEY);
  }

  console.log('Production/deployed env detected: calling secure Cloudflare Pages Function proxy for JSON features...');
  return callGeminiProxy(file);
}

/**
 * Calls the Cloudflare Pages Function at /api/analyze to securely retrieve JSON features.
 */
async function callGeminiProxy(file) {
  const base64Data = await fileToBase64(file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image: base64Data,
      mimeType: file.type
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Proxy API returned status ${response.status}`);
  }

  const data = await response.json();
  return sanitizeFeatures(data);
}

/**
 * Calls the Gemini API directly from the client (for local dev convenience) to get JSON features.
 */
async function callGeminiClientSide(file, apiKey) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          skinTone: { 
            type: 'string', 
            enum: ['fair-ivory', 'light-peach', 'medium-olive', 'bronze-tan', 'deep-cocoa']
          },
          hairColor: { 
            type: 'string', 
            enum: ['black', 'dark-brown', 'medium-brown', 'blonde', 'red-auburn', 'grey', 'white-platinum', 'dyed-teal', 'dyed-purple']
          },
          hairStyle: { 
            type: 'string', 
            enum: ['short-crop', 'spiky', 'long-bob', 'curly-afro', 'bald', 'cap', 'side-part', 'braids-dreads', 'long-straight']
          },
          facialHair: { 
            type: 'string', 
            enum: ['none', 'stubble', 'full-beard', 'goatee', 'mustache']
          },
          glasses: { 
            type: 'string', 
            enum: ['none', 'round', 'square', 'sunglasses']
          },
          eyeStyle: { 
            type: 'string', 
            enum: ['default', 'happy', 'wink']
          },
          mouthStyle: { 
            type: 'string', 
            enum: ['smile', 'grin', 'smirk', 'neutral']
          }
        },
        required: ['skinTone', 'hairColor', 'hairStyle', 'facialHair', 'glasses', 'eyeStyle', 'mouthStyle']
      }
    }
  });

  const imagePart = await fileToGenerativePart(file);
  const prompt = `
    You are an expert avatar styling assistant. 
    Analyze the person in this selfie and classify their features to compile a cartoon avatar.
    
    Look closely at:
    1. Skin tone (fair/ivory, light/peach, medium/olive, bronze/tan, or deep/cocoa).
    2. Hair color (black, dark brown, medium brown, blonde, red/auburn, grey, white/platinum, dyed teal, or dyed purple).
    3. Hairstyle/length (short-crop, spiky, long-bob, curly-afro, bald, cap/hat, side-part, braids-dreads, or long-straight).
    4. Facial hair (none, stubble, full-beard, goatee, or mustache).
    5. Glasses (none, round, square, or sunglasses).
    6. Eye expression (default, happy/smiling, or wink).
    7. Mouth shape (smile, grin, smirk, or neutral).
    
    Choose the values strictly from the options defined in the JSON schema.
  `;

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();
  const data = JSON.parse(responseText);
  return sanitizeFeatures(data);
}

/**
 * Sanitizes and validates the feature keys to ensure they match expected enum options.
 */
function sanitizeFeatures(data) {
  const defaults = {
    skinTone: 'light-peach',
    hairColor: 'black',
    hairStyle: 'short-crop',
    facialHair: 'none',
    glasses: 'none',
    eyeStyle: 'default',
    mouthStyle: 'smile'
  };

  return {
    skinTone: ['fair-ivory', 'light-peach', 'medium-olive', 'bronze-tan', 'deep-cocoa'].includes(data.skinTone) ? data.skinTone : defaults.skinTone,
    hairColor: ['black', 'dark-brown', 'medium-brown', 'blonde', 'red-auburn', 'grey', 'white-platinum', 'dyed-teal', 'dyed-purple'].includes(data.hairColor) ? data.hairColor : defaults.hairColor,
    hairStyle: ['short-crop', 'spiky', 'long-bob', 'curly-afro', 'bald', 'cap', 'side-part', 'braids-dreads', 'long-straight'].includes(data.hairStyle) ? data.hairStyle : defaults.hairStyle,
    facialHair: ['none', 'stubble', 'full-beard', 'goatee', 'mustache'].includes(data.facialHair) ? data.facialHair : defaults.facialHair,
    glasses: ['none', 'round', 'square', 'sunglasses'].includes(data.glasses) ? data.glasses : defaults.glasses,
    eyeStyle: ['default', 'happy', 'wink'].includes(data.eyeStyle) ? data.eyeStyle : defaults.eyeStyle,
    mouthStyle: ['smile', 'grin', 'smirk', 'neutral'].includes(data.mouthStyle) ? data.mouthStyle : defaults.mouthStyle
  };
}

/**
 * Helper to convert File to raw Base64 string.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to convert File to Gemini SDK inline data object.
 */
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
