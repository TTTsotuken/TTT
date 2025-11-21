// MyMemory翻訳サービス (完全無料・APIキー不要)
// 世界最大の翻訳メモリ + ModernMT機械翻訳
class MyMemoryTranslationService {
  constructor() {
    this.apiUrl = 'https://api.mymemory.translated.net/get';
    
    // MyMemory対応言語マッピング（ISO 639-1コード）
    this.languageMap = {
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
      'eu': 'eu',
      'gl': 'gl',
      'ga': 'ga',
      'ms': 'ms',
      'tl': 'tl',
      
      // 中国語の処理
      'zh': 'zh',
      'zh-Hans': 'zh-CN',
      'zh-Hant': 'zh-TW',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      
      // ポルトガル語
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT'
    };
    
    // キャッシュで同じ翻訳を繰り返さない
    this.translationCache = new Map();
    this.maxCacheSize = 100;
  }

  // 言語コードを正規化
  normalizeLangCode(langCode) {
    if (!langCode) return 'en';
    
    // マッピングに存在する場合
    if (this.languageMap[langCode]) {
      return this.languageMap[langCode];
    }
    
    // ハイフンで分割 (zh-Hans → zh)
    const baseLang = langCode.split('-')[0].toLowerCase();
    if (this.languageMap[baseLang]) {
      console.log(`言語コード正規化: ${langCode} → ${baseLang}`);
      return this.languageMap[baseLang];
    }
    
    // デフォルトは英語
    console.warn(`未対応の言語コード: ${langCode}、英語を使用`);
    return 'en';
  }

  // キャッシュキーを生成
  getCacheKey(text, sourceLang, targetLang) {
    return `${sourceLang}:${targetLang}:${text}`;
  }

  // キャッシュから取得
  getFromCache(text, sourceLang, targetLang) {
    const key = this.getCacheKey(text, sourceLang, targetLang);
    return this.translationCache.get(key);
  }

  // キャッシュに保存
  saveToCache(text, sourceLang, targetLang, translation) {
    const key = this.getCacheKey(text, sourceLang, targetLang);
    
    // キャッシュサイズ制限
    if (this.translationCache.size >= this.maxCacheSize) {
      const firstKey = this.translationCache.keys().next().value;
      this.translationCache.delete(firstKey);
    }
    
    this.translationCache.set(key, translation);
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    // 空のテキストチェック
    if (!text || text.trim() === '') {
      console.warn('空のテキストが渡されました');
      return text;
    }

    console.log('🌐 MyMemory翻訳開始:', { 
      text: text.substring(0, 50) + '...', 
      source: sourceLangCode,
      target: targetLangCode 
    });
    
    // 言語コードを正規化
    const targetLang = this.normalizeLangCode(targetLangCode);
    const sourceLang = sourceLangCode === 'auto' ? '' : this.normalizeLangCode(sourceLangCode);
    
    console.log('正規化された言語コード:', { source: sourceLang || 'auto', target: targetLang });
    
    // 同じ言語の場合は翻訳をスキップ
    if (sourceLang && sourceLang === targetLang) {
      console.log('同じ言語のため翻訳をスキップ');
      return text;
    }

    // キャッシュチェック
    const cached = this.getFromCache(text, sourceLang || 'auto', targetLang);
    if (cached) {
      console.log('💾 キャッシュから取得');
      return cached;
    }

    try {
      // APIリクエストのURLを構築
      const langPair = sourceLang ? `${sourceLang}|${targetLang}` : targetLang;
      const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      
      console.log('🔄 MyMemory APIリクエスト:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('❌ MyMemory APIエラー:', response.status, response.statusText);
        throw new Error(`MyMemory API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 MyMemory APIレスポンス:', data);
      
      // レスポンスコードチェック
      if (data.responseStatus !== 200) {
        console.error('❌ 翻訳失敗:', data.responseDetails);
        throw new Error(data.responseDetails || '翻訳に失敗しました');
      }

      const translatedText = data.responseData.translatedText;

      if (!translatedText) {
        throw new Error('翻訳結果が空です');
      }

      console.log('✅ 翻訳成功:', translatedText.substring(0, 50) + '...');
      console.log(`📊 一致率: ${data.responseData.match || 'N/A'}`);
      
      // キャッシュに保存
      this.saveToCache(text, sourceLang || 'auto', targetLang, translatedText);
      
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
    return normalized !== 'en' || langCode === 'en';
  }

  // 利用可能な言語コードの一覧を取得
  getSupportedLanguages() {
    return Object.keys(this.languageMap);
  }

  // キャッシュをクリア
  clearCache() {
    this.translationCache.clear();
    console.log('🗑️ 翻訳キャッシュをクリアしました');
  }
}

// サービスとして登録
window.myMemoryService = new MyMemoryTranslationService();
window.libreTranslateService = window.myMemoryService; // 互換性のため
window.geminiService = window.myMemoryService; // 互換性のため

console.log('✅ MyMemory Translation Service 初期化完了');
console.log('🌍 世界最大の翻訳メモリ + ModernMT機械翻訳');
console.log(`📝 対応言語数: ${window.myMemoryService.getSupportedLanguages().length}`);
console.log('💰 完全無料: 1日5,000文字（メール登録で50,000文字）');
