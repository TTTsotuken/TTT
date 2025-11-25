// Gemini API設定ファイル
const GEMINI_CONFIG = {
    // Gemini APIキーを設定してください
    apiKey: "AIzaSyDjE5GIuuB5no3FJwkbtyBc7ln5wjWr4D8",
    
    // 使用するモデル名
    model: "gemini-2.5-flash-preview-09-2025"
  };
  
  // 設定の検証
  function validateGeminiConfig() {
    if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY') {
      console.warn('⚠️ Gemini APIキーが設定されていません');
    }
  }
  
  validateGeminiConfig();
