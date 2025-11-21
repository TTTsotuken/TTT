// LibreTranslate翻訳サービス (完全無料・APIキー不要)
class LibreTranslateService {
  constructor() {
    // 公式サーバー
    this.apiUrl = 'https://libretranslate.com/translate';
    
    // LibreTranslate言語コードマッピング（公式サポート言語のみ）
    this.languageMap = {
      'ja': 'ja',  // 日本語
      'en': 'en',  // 英語
      'zh': 'zh',  // 中国語
      'ko': 'ko',  // 韓国語
      'es': 'es',  // スペイン語
      'fr': 'fr',  // フランス語
      'de': 'de',  // ドイツ語
      'it': 'it',  // イタリア語
      'pt': 'pt',  // ポルトガル語
      'ru': 'ru',  // ロシア語
      'ar': 'ar',  // アラビア語
      'hi': 'hi',  // ヒンディー語
      'th': 'th',  // タイ語
      'vi': 'vi',  // ベトナム語
      'tr': 'tr',  // トルコ語
      'pl': 'pl',  // ポーランド語
      'uk': 'uk',  // ウクライナ語
      'id': 'id',  // インドネシア語
      'sv': 'sv',  // スウェーデン語
      'cs': 'cs',  // チェコ語
      'fi': 'fi',  // フィンランド語
      'el': 'el',  // ギリシャ語
      'he': 'he',  // ヘブライ語
      'hu': 'hu',  // ハンガリー語
      'fa': 'fa'   // ペルシャ語
    };
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    try {
      console.log('LibreTranslate翻訳リクエスト送信:', { text, targetLang: targetLangCode });
      
      const targetLang = this.languageMap[targetLangCode] || 'en';
      const sourceLang = sourceLangCode === 'auto' ? 'auto' : (this.languageMap[sourceLangCode] || 'auto');
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('LibreTranslate APIエラーレスポンス:', errorData);
        throw new Error(`LibreTranslate API error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('LibreTranslate API レスポンス:', data);
      
      const translatedText = data.translatedText;

      if (!translatedText) {
        throw new Error('翻訳結果が取得できませんでした');
      }

      console.log('翻訳完了:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻訳エラー:', error);
      
      // エラー時は元のテキストを返す
      console.warn('LibreTranslate翻訳に失敗したため、元のテキストを返します');
      return text;
    }
  }
}

// サービスとして登録
window.libreTranslateService = new LibreTranslateService();
window.geminiService = window.libreTranslateService; // 互換性のため

console.log('✅ LibreTranslate Service 初期化完了 (完全無料・APIキー不要)');
