// MyMemory翻訳サービス (完全無料・APIキー不要)
class TranslationService {
  constructor() {
    this.apiUrl = 'https://api.mymemory.translated.net/get';
    
    // 言語コードマッピング
    this.languageMap = {
      'ja': 'ja-JP',
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'ko': 'ko-KR',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'ru': 'ru-RU',
      'ar': 'ar-SA',
      'hi': 'hi-IN',
      'th': 'th-TH',
      'vi': 'vi-VN'
    };
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    try {
      console.log('翻訳リクエスト送信:', { text, targetLang: targetLangCode });
      
      // 言語コードを変換
      const targetLang = this.languageMap[targetLangCode] || targetLangCode;
      const sourceLang = sourceLangCode === 'auto' ? '' : (this.languageMap[sourceLangCode] || sourceLangCode);
      
      // MyMemory APIを使用
      const langPair = sourceLang ? `${sourceLang}|${targetLang}` : targetLang;
      const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      
      console.log('APIリクエストURL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API レスポンス:', data);
      
      // レスポンスの検証
      if (!data.responseData || !data.responseData.translatedText) {
        throw new Error('翻訳結果が取得できませんでした');
      }
      
      const translatedText = data.responseData.translatedText;
      console.log('翻訳完了:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      
      // エラー時は元のテキストを返す
      console.warn('翻訳に失敗したため、元のテキストを返します');
      return text;
    }
  }
}

// translationServiceとして登録
window.translationService = new TranslationService();
// 互換性のためgeminiServiceとしても登録
window.geminiService = window.translationService;

console.log('✅ MyMemory Translation Service 初期化完了');
