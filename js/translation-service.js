// LibreTranslate翻訳サービス (完全無料・オープンソース)
class TranslationService {
  constructor() {
    // 公式の無料サーバー
    this.apiUrl = 'https://libretranslate.com/translate';
    
    // 言語コードマッピング
    this.languageMap = {
      'ja': 'ja',
      'en': 'en',
      'zh-CN': 'zh',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ru': 'ru',
      'ar': 'ar',
      'hi': 'hi',
      'th': 'th',
      'vi': 'vi'
    };
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    try {
      console.log('翻訳リクエスト送信:', { text, targetLang: targetLangCode });
      
      const targetLang = this.languageMap[targetLangCode] || targetLangCode;
      const sourceLang = sourceLangCode === 'auto' ? 'auto' : (this.languageMap[sourceLangCode] || sourceLangCode);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API レスポンス:', data);
      
      const translatedText = data.translatedText;
      console.log('翻訳完了:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      throw error;
    }
  }
}

// geminiServiceの代わりにtranslationServiceとして登録
window.translationService = new TranslationService();
// 互換性のためgeminiServiceとしても登録
window.geminiService = window.translationService;
