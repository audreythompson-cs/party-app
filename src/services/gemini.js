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
 * Main entry point to analyze a selfie and generate a custom cartoon avatar.
 * Chooses the direct SDK call on localhost (if local key is present)
 * or the secure Cloudflare Pages Function proxy in production.
 * Returns the raw SVG string containing the "__SHIRT_COLOR__" placeholder token.
 */
export async function analyzeSelfieWithGemini(file) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost && LOCAL_API_KEY && LOCAL_API_KEY !== 'your_gemini_api_key') {
    console.log('Local dev detected: calling Gemini API client-side directly for custom SVG...');
    return callGeminiClientSide(file, LOCAL_API_KEY);
  }

  console.log('Production/deployed env detected: calling secure Cloudflare Pages Function proxy for custom SVG...');
  return callGeminiProxy(file);
}

/**
 * Calls the Cloudflare Pages Function at /api/analyze to securely generate custom SVG code.
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

  const rawText = await response.text();
  return cleanSvgContent(rawText);
}

/**
 * Calls the Gemini API directly from the client (for local dev convenience) to get custom SVG code.
 * Lazily imports the Google AI SDK to avoid bundling it on mobile clients in production.
 */
async function callGeminiClientSide(file, apiKey) {
  // Dynamically import the SDK only when needed locally
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash'
  });

  const imagePart = await fileToGenerativePart(file);
  const prompt = `
    You are an expert, creative vector graphic designer and illustrator.
    Create a modern, clean, flat-design cartoon avatar of the person in this selfie.
    
    Output ONLY a valid raw SVG string (enclosed in <svg>...</svg>). Do not include any explanation, do not include markdown code block formatting (like \`\`\`xml or \`\`\`svg), and do not wrap it in JSON. Return the raw SVG directly.
    
    SVG Design Requirements:
    1. viewBox="0 0 200 200".
    2. Use a circular background with a pleasant modern color (e.g. gradient or soft pastel).
    3. Draw a friendly, clean cartoon representation of the person: include face, ears, neck, eyes (with pupils/reflections), eyebrows, nose, mouth (smiling/friendly), hair, and clothing (torso).
    4. Crucial: Make sure the main clothing/shirt element uses the exact fill value of "__SHIRT_COLOR__" (fill="__SHIRT_COLOR__") so we can dynamically replace it client-side. Do not hardcode a shirt color!
    5. Capture their key features: match their real skin tone (e.g., #fbcfe8, #fdba74, #7c2d12, etc.), hairstyle/length, hair color, and facial characteristics (such as glasses or facial hair if present).
    6. Use clean, geometric vector shapes, paths, and solid colors. Keep it looking like a professional, premium flat icon.
    7. Ensure the SVG is valid, all tags are closed properly, and it contains no HTML tags or external assets.
  `;

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();
  return cleanSvgContent(responseText);
}

/**
 * Strips markdown code blocks (e.g., ```xml ... ``` or ```svg ... ```) if returned, 
 * ensuring only the raw <svg>...</svg> content is returned.
 */
function cleanSvgContent(text) {
  const startIdx = text.indexOf('<svg');
  const endIdx = text.lastIndexOf('</svg>');
  if (startIdx !== -1 && endIdx !== -1) {
    return text.substring(startIdx, endIdx + 6).trim();
  }
  return text.trim();
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
