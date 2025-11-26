// Gemini API設定ファイル
// config-gemini.js
const GEMINI_CONFIG = {
    apiKey: "", 
    model: "gemini-2.0-flash"
};
  
  // 設定の検証
  function validateGeminiConfig() {
    if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY') {
      console.warn('⚠️ Gemini APIキーが設定されていません');
    }
  }
  
  validateGeminiConfig();
