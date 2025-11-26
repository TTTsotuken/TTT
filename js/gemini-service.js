// Gemini翻訳サービス (Cloudflare Workers経由)
class GeminiService {
  constructor() {
    this.apiUrl = 'https://workernametranslation-api.st324a2112i-takahashi.workers.dev/translate';
  }

  async translate(text, targetLangCode, sourceLangCode = 'auto') {
    try {
      console.log('🌐 Gemini翻訳リクエスト開始:', { 
        text, 
        targetLangCode, 
        sourceLangCode 
      });
      
      // Workersが期待する形式: { text, targetLang }
      // targetLangは言語コード（ja, en, neなど）
      const requestBody = {
        text: text,
        targetLang: targetLangCode  // 言語コードをそのまま送信
      };
      
      console.log('📤 送信データ:', requestBody);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({}));
        } else {
          const textError = await response.text().catch(() => 'Unknown error');
          errorData = { error: textError, rawError: textError };
        }
        
        console.error('❌ Cloudflare Workers APIエラー詳細:');
        console.error('  - HTTPステータス:', response.status);
        console.error('  - エラーデータ:', errorData);
        console.error('  - レスポンスヘッダー:', [...response.headers.entries()]);
        
        throw new Error(`Translation API error: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('✅ Cloudflare Workers API レスポンス:', data);
      
      // Workersのレスポンス形式: { success: true, translatedText: "...", originalText: "..." }
      const translatedText = data.translatedText;

      if (!translatedText) {
        console.error('❌ レスポンスから翻訳テキストを抽出できませんでした');
        console.error('レスポンス全体:', JSON.stringify(data, null, 2));
        throw new Error('翻訳結果が取得できませんでした');
      }
      
      console.log('✅ 翻訳完了:', translatedText);
      
      return translatedText.trim();
    } catch (error) {
      console.error('❌ 翻訳エラー:', error);
      console.error('エラーの詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // エラー時は元のテキストを返す
      console.warn('⚠️ Gemini翻訳に失敗したため、元のテキストを返します');
      return text;
    }
  }
}

// サービスとして登録
window.geminiService = new GeminiService();

console.log('✅ Gemini Translation Service (Cloudflare Workers) 初期化完了');
