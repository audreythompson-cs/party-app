/**
 * POST /api/analyze
 * Cloudflare Pages Function to securely classify portrait selfies into structured JSON avatar features.
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Retrieve API key securely from Cloudflare Environment Variables
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'GEMINI_API_KEY environment variable is not configured in the Cloudflare Dashboard.' 
        }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse image and mimeType from request body
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing "image" (base64 string) or "mimeType" in request body.' }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Construct the payload for Gemini API with structured JSON output
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: image
              }
            }
          ]
        }
      ],
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
    };

    // Call Google's Gemini REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API returned an error status.', 
          status: response.status, 
          details: errorData 
        }), 
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: 'No content returned from Gemini response.' }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the generated JSON structure
    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error in proxy function.', message: err.message }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
