// Gemini AI翻訳サービス
class GeminiService {
  constructor() {
    // 試すべきエンドポイントのリスト（優先順位順）
    this.endpoints = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    ];
    this.workingEndpoint = null;
  }

  async translate(text, targetLangCode) {
    const targetLang = CONFIG.languages.find(l => l.code === targetLangCode);
    
    if (!targetLang) {
      throw new Error('サポートされていない言語です');
    }

    const prompt = `Translate the following text to ${targetLang.geminiCode}. Only provide the translation, no explanations or additional text:\n\n${text}`;

    // すでに動作するエンドポイントが見つかっている場合はそれを使用
    if (this.workingEndpoint) {
      return await this.tryTranslate(this.workingEndpoint, prompt);
    }

    // 各エンドポイントを試す
    for (const endpoint of this.endpoints) {
      try {
        console.log(`試行中: ${endpoint}`);
        const result = await this.tryTranslate(endpoint, prompt);
        this.workingEndpoint = endpoint;
        console.log(`✅ 成功したエンドポイント: ${endpoint}`);
        return result;
      } catch (error) {
        console.warn(`❌ 失敗: ${endpoint}`, error.message);
        continue;
      }
    }

    throw new Error('すべてのエンドポイントで翻訳に失敗しました。APIキーを確認してください。');
  }

  async tryTranslate(endpoint, prompt) {
    const apiUrl = `${endpoint}?key=${CONFIG.gemini.apiKey}`;
    
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

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid API response structure');
    }
    
    const translatedText = data.candidates[0].content.parts[0].text.trim();
    return translatedText;
  }
}

window.geminiService = new GeminiService();
