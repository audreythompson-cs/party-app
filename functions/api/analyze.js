/**
 * POST /api/analyze
 * Cloudflare Pages Function to securely generate a custom SVG avatar using Gemini 2.5 Flash.
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

    // Construct the payload for Gemini API
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
      ]
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

    // Return the generated raw SVG string directly
    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' }
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
