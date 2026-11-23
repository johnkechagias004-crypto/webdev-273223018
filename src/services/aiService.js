export async function generateGroupDescription(subject, goals, notes, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey) {
    return {
      description: `Default study group for ${subject}: ${goals}. (Generated via fallback heuristic)`,
      studyPlan: `1. Review notes: ${notes || 'none'}\n2. Weekly sessions`
    };
  }

  const controller = new AbortController();
  const onTimeout = () => controller.abort();
  const timeoutId = setTimeout(onTimeout, 5000);

  try {
    const prompt = `Suggest a study group description and study plan for subject: ${subject}, goals: ${goals}, notes: ${notes}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Model provider error');
    }

    const data = await response.json();
    const text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '';
    return {
      description: text || `Fallback description for ${subject}`,
      studyPlan: 'Default study plan'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      description: `Fallback description for ${subject} - ${goals}. AI assistance unavailable.`,
      studyPlan: `Default fallback study plan. Manual input allowed.`
    };
  }
}
