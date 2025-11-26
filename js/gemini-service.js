// Gemini翻訳サービス (Cloudflare Workers経由)
class GeminiService {
  constructor() {
    this.apiUrl = 'https://workernametranslation-api.st324a2112i-takahashi.workers.dev/translate';
    
    // 言語コードマッピング
    this.languageMap = {
      'ja': 'Japanese',
      'en': 'English',
      'ne': 'Nepali',
      'zh-CN': 'Chinese (Simplified)',
      'ko': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese'
    };
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    try {
      console.log('Gemini翻訳リクエスト送信:', { text, targetLang: targetLangCode, sourceLang: sourceLangCode });
      
      const targetLangName = this.languageMap[targetLangCode] || targetLangCode;
      const sourceLangName = this.languageMap[sourceLangCode] || sourceLangCode;
      
      // Cloudflare Workersにリクエストを送信
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          targetLang: targetLangName,
          sourceLang: sourceLangName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cloudflare Workers APIエラーレスポンス:', errorData);
        throw new Error(`Translation API error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Cloudflare Workers API レスポンス:', data);
      
      const translatedText = data.translatedText;

      if (!translatedText) {
        throw new Error('翻訳結果が取得できませんでした');
      }
      
      console.log('翻訳完了:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      
      // エラー時は元のテキストを返す
      console.warn('Gemini翻訳に失敗したため、元のテキストを返します');
      return text;
    }
  }
}

// サービスとして登録
window.geminiService = new GeminiService();

console.log('✅ Gemini Translation Service (Cloudflare Workers) 初期化完了');
