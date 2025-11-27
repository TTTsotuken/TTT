// Gemini API設定ファイル
const GEMINI_CONFIG = {
    // Gemini APIキーを設定してください
    apiKey: "AIzaSyCAt6ga0D1sO90CsKsH5vuBZ2l77EB1-a8",
    
    // 使用するモデル名
    model: "gemini-1.5-flash"
  };
  
  // 設定の検証
  function validateGeminiConfig() {
    if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY') {
      console.warn('⚠️ Gemini APIキーが設定されていません');
    }
  }
  
  validateGeminiConfig();
