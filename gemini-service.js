// Gemini AI翻訳サービス
class GeminiService {
  async translate(text, targetLangCode) {
    const targetLang = CONFIG.languages.find(l => l.code === targetLangCode);
    
    if (!targetLang) {
      throw new Error('サポートされていない言語です');
    }

    const prompt = `Translate the following text to ${targetLang.geminiCode}. Only provide the translation, no explanations or additional text:\n\n${text}`;

    try {
      const response = await fetch(
        `${CONFIG.gemini.apiUrl}?key=${CONFIG.gemini.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini APIエラー:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.candidates[0].content.parts[0].text.trim();
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      throw error;
    }
  }
}

const geminiService = new GeminiService();
