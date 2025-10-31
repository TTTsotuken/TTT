// Gemini AI翻訳サービス
class GeminiService {
  async translate(text, targetLangCode) {
    const targetLang = CONFIG.languages.find(l => l.code === targetLangCode);
    
    if (!targetLang) {
      throw new Error('サポートされていない言語です');
    }

    const prompt = `Translate the following text to ${targetLang.geminiCode}. Only provide the translation, no explanations or additional text:\n\n${text}`;

    try {
      // v1エンドポイントとgemini-1.5-flashモデルを使用
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${CONFIG.gemini.apiKey}`;
      
      console.log('翻訳リクエスト送信:', { text, targetLang: targetLang.name });
      
      const response = await fetch(apiUrl, {
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
      });

      console.log('APIレスポンスステータス:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini APIエラー:', errorData);
        
        // より詳細なエラーメッセージ
        if (errorData.error) {
          throw new Error(`API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API レスポンス:', data);
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid API response structure');
      }
      
      const translatedText = data.candidates[0].content.parts[0].text.trim();
      console.log('翻訳完了:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      throw error;
    }
  }
}

window.geminiService = new GeminiService();
