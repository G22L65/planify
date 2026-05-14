/* ─── AI Generator (Gemini API) ─── */
const AIGenerator = (() => {
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  // Try multiple strategies to extract valid JSON from text
  function extractJSON(text) {
    // Strategy 1: Direct parse
    try { return JSON.parse(text); } catch(e) { /* continue */ }

    // Strategy 2: Extract from markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try { return JSON.parse(fenceMatch[1].trim()); } catch(e) { /* continue */ }
    }

    // Strategy 3: Find the first { and last } to extract embedded JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch(e) { /* continue */ }
    }

    return null;
  }

  async function generate(prompt, month, year, apiKey) {
    if (!apiKey) throw new Error('Please set your Gemini API key in Settings.');

    const systemPrompt = `You are an expert productivity coach and planner. Generate a structured monthly planner.
Return ONLY valid JSON with this exact structure:
{
  "categories": [
    { "name": "Category Name", "color": "#hexcolor" }
  ],
  "days": {
    "1": [{ "title": "Task name", "category": "Category Name", "time": "HH:MM" }],
    "2": [...]
  }
}
Rules:
- Month: ${Calendar.MONTH_NAMES[month]} ${year}
- Days in month: ${Calendar.getDaysInMonth(year, month)}
- Use 4-8 distinct categories
- IMPORTANT: Each category MUST have a vivid, bright, highly-saturated color that stands out on a dark background. Use bold colors like: #FF4D4F (red), #52C41A (green), #1890FF (blue), #FAAD14 (gold), #EB2F96 (magenta), #13C2C2 (cyan), #FA8C16 (orange), #722ED1 (purple). NO dull, dark, or muted colors. Every category must have a clearly DIFFERENT color.
- Each weekday should have 3-7 tasks
- Sundays can have lighter schedules or rest
- Tasks should be specific and actionable
- Time is optional, use 24h format if provided
- Make the plan realistic and balanced`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\nUser request: ' + prompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    };

    const resp = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${resp.status}`);
    }

    const data = await resp.json();
    console.log('Gemini raw response:', JSON.stringify(data).substring(0, 500));

    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts?.length) {
      throw new Error('Empty response from AI.');
    }

    // Gemini 2.5 Flash (thinking model) returns multiple parts:
    // - Thinking/reasoning parts (usually first)
    // - The actual JSON output (usually last)
    // Try each part in reverse order (JSON is typically the last part)
    const parts = candidate.content.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const partText = parts[i].text;
      if (!partText) continue;

      const parsed = extractJSON(partText);
      if (parsed && parsed.days && parsed.categories) {
        console.log('Successfully parsed JSON from part', i);
        return parsed;
      }
    }

    // If no part had valid structured JSON, try concatenating all parts
    const allText = parts.map(p => p.text || '').join('\n');
    const parsed = extractJSON(allText);
    if (parsed && parsed.days) return parsed;

    // Log what we received for debugging
    console.error('Could not parse any part. Parts received:', parts.map((p, i) => ({
      index: i,
      length: (p.text || '').length,
      preview: (p.text || '').substring(0, 200)
    })));

    throw new Error('AI response could not be parsed. Please try again.');
  }

  return { generate };
})();

