// LibreTranslate翻訳サービス (完全無料・APIキー不要)
class LibreTranslateService {
  constructor() {
    // 複数のミラーサーバーを用意（フォールバック対応）
    this.apiUrls = [
      'https://translate.argosopentech.com/translate',  // Argos Open Tech (推奨)
      'https://libretranslate.de/translate',             // ドイツのミラー
      'https://translate.terraprint.co/translate'        // Terraprint
    ];
    this.currentUrlIndex = 0;
    
    // LibreTranslate言語コードマッピング（拡張版）
    this.languageMap = {
      // 基本言語
      'ja': 'ja',
      'en': 'en',
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
      'vi': 'vi',
      'tr': 'tr',
      'pl': 'pl',
      'uk': 'uk',
      'id': 'id',
      'sv': 'sv',
      'cs': 'cs',
      'fi': 'fi',
      'el': 'el',
      'he': 'he',
      'hu': 'hu',
      'fa': 'fa',
      'nl': 'nl',
      'da': 'da',
      'nb': 'no',
      'ro': 'ro',
      'sk': 'sk',
      'bg': 'bg',
      'sr': 'sr',
      'sl': 'sl',
      'et': 'et',
      'lv': 'lv',
      'lt': 'lt',
      'ur': 'ur',
      'bn': 'bn',
      'sq': 'sq',
      'az': 'az',
      'ca': 'ca',
      'eo': 'eo',
      'eu': 'eu',
      'gl': 'gl',
      'ga': 'ga',
      'ky': 'ky',
      'ms': 'ms',
      'tl': 'tl',
      
      // 中国語の特殊処理
      'zh': 'zh',
      'zh-Hans': 'zh',  // 簡体字 → zh
      'zh-Hant': 'zh',  // 繁体字 → zh (LibreTranslateは簡体字メイン)
      'zh-CN': 'zh',
      'zh-TW': 'zh',
      
      // ポルトガル語の特殊処理
      'pt-BR': 'pt',  // ブラジルポルトガル語 → pt
      'pt-PT': 'pt'   // ポルトガルポルトガル語 → pt
    };
  }

  // 言語コードを正規化
  normalizeLangCode(langCode) {
    if (!langCode || langCode === 'auto') return 'auto';
    
    // マッピングに存在する場合はそれを使用
    if (this.languageMap[langCode]) {
      return this.languageMap[langCode];
    }
    
    // ハイフンで分割して最初の部分を使用 (例: zh-Hans → zh)
    const baseLang = langCode.split('-')[0].toLowerCase();
    if (this.languageMap[baseLang]) {
      console.log(`言語コード正規化: ${langCode} → ${baseLang}`);
      return this.languageMap[baseLang];
    }
    
    // 見つからない場合は英語にフォールバック
    console.warn(`未対応の言語コード: ${langCode}、英語(en)を使用します`);
    return 'en';
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    try {
      // 空のテキストチェック
      if (!text || text.trim() === '') {
        console.warn('空のテキストが渡されました');
        return text;
      }

      console.log('🌐 LibreTranslate翻訳開始:', { 
        text: text.substring(0, 50) + '...', 
        source: sourceLangCode,
        target: targetLangCode 
      });
      
      // 言語コードを正規化
      const targetLang = this.normalizeLangCode(targetLangCode);
      const sourceLang = this.normalizeLangCode(sourceLangCode);
      
      console.log('正規化された言語コード:', { source: sourceLang, target: targetLang });
      
      // 同じ言語の場合は翻訳をスキップ
      if (sourceLang === targetLang && sourceLang !== 'auto') {
        console.log('同じ言語のため翻訳をスキップ');
        return text;
      }
      
      const requestBody = {
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      };
      
      console.log('LibreTranslate APIリクエスト:', requestBody);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ LibreTranslate APIエラー:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`翻訳APIエラー: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ LibreTranslate APIレスポンス:', data);
      
      const translatedText = data.translatedText;

      if (!translatedText) {
        throw new Error('翻訳結果が空です');
      }

      console.log('✅ 翻訳完了:', translatedText.substring(0, 50) + '...');
      
      return translatedText;
    } catch (error) {
      console.error('❌ 翻訳エラー:', error);
      console.error('エラー詳細:', {
        message: error.message,
        stack: error.stack
      });
      
      // エラー時は元のテキストを返す
      console.warn('⚠️ 翻訳に失敗したため、元のテキストを返します');
      return text;
    }
  }

  // サポートされている言語かチェック
  isLanguageSupported(langCode) {
    const normalized = this.normalizeLangCode(langCode);
    return normalized !== 'en' || langCode === 'en' || langCode === 'auto';
  }

  // 利用可能な言語コードの一覧を取得
  getSupportedLanguages() {
    return Object.keys(this.languageMap);
  }
}

// サービスとして登録
window.libreTranslateService = new LibreTranslateService();
window.geminiService = window.libreTranslateService; // 互換性のため

console.log('✅ LibreTranslate Service 初期化完了');
console.log(`📝 対応言語数: ${window.libreTranslateService.getSupportedLanguages().length}`);
