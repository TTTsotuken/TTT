// Google Translate (非公式API・完全無料・高速)
class GoogleTranslateService {
  constructor() {
    // translate.googleapis.comの非公式エンドポイント
    this.apiUrl = 'https://translate.googleapis.com/translate_a/single';
    
    // 言語コードマッピング
    this.languageMap = {
      'ja': 'ja',
      'en': 'en',
      'ne': 'ne',
      'zh-CN': 'zh-CN',
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
      console.log('Google翻訳リクエスト送信:', { text, targetLang: targetLangCode });
      
      const targetLang = this.languageMap[targetLangCode] || 'en';
      const sourceLang = sourceLangCode === 'auto' ? 'auto' : (this.languageMap[sourceLangCode] || 'auto');
      
      // Google Translateの非公式APIパラメータ
      const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text
      });
      
      const url = `${this.apiUrl}?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Google Translate API レスポンス:', data);
      
      // レスポンスの形式: [[[翻訳文, 原文, null, null, ...]], ...]
      const translatedText = data[0]?.map(item => item[0]).join('');

      if (!translatedText) {
        throw new Error('翻訳結果が取得できませんでした');
      }

      console.log('翻訳完了:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      
      // エラー時は元のテキストを返す
      console.warn('Google翻訳に失敗したため、元のテキストを返します');
      return text;
    }
  }
}

// サービスとして登録
window.googleTranslateService = new GoogleTranslateService();
window.geminiService = window.googleTranslateService; // 互換性のため

console.log('✅ Google Translate Service 初期化完了 (非公式API・完全無料・高速)');
