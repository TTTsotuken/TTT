// Gemini翻訳サービス
class GeminiService {
    constructor() {
      this.apiUrl = `${this.apiUrl}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;
      
      // 言語コードマッピング（GeminiはISO 639-1コードをサポート）
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
      if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY') {
        console.error('❌ Gemini APIキーが設定されていません。元のテキストを返します。');
        return text;
      }
      
      try {
        console.log('Gemini翻訳リクエスト送信:', { text, targetLang: targetLangCode });
        
        const targetLangName = this.languageMap[targetLangCode] || targetLangCode;
        const sourceLangName = this.languageMap[sourceLangCode] || sourceLangCode;
        
        let prompt = `以下のテキストを${targetLangName}に翻訳してください。翻訳結果のみを出力してください。`;
        if (sourceLangCode !== 'auto') {
            prompt = `以下の${sourceLangName}のテキストを${targetLangName}に翻訳してください。翻訳結果のみを出力してください。`;
        }
        
        const url = `${this.apiUrl}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { text: `テキスト: "${text}"` }
                ]
              }
            ],
            generationConfig: {
               // 翻訳用途のためtemperatureを低めに設定
               temperature: 0.1 
            }
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini APIエラーレスポンス:', errorData);
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
  
        const data = await response.json();
        console.log('Gemini API レスポンス:', data);
        
        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
        if (!translatedText) {
          throw new Error('翻訳結果が取得できませんでした');
        }
        
        // 不要な引用符などを除去
        const cleanTranslatedText = translatedText.replace(/^["']|["']$/g, '').trim();
  
        console.log('翻訳完了:', cleanTranslatedText);
        
        return cleanTranslatedText;
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
  
  console.log('✅ Gemini Translation Service 初期化完了');
