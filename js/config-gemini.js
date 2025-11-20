// Gemini API設定ファイル
const GEMINI_CONFIG = {
    // Gemini APIキーを設定してください
    apiKey: "AIzaSyA-JYRIY6a6SD6Eb2YE3EmSk8iDK4Y5C2c",
    
    // 使用するモデル名
    model: "gemini-2.5-flash"
  };
  
  // 設定の検証
  function validateGeminiConfig() {
    if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY') {
      console.warn('⚠️ Gemini APIキーが設定されていません');
    }
  }
  
  validateGeminiConfig();
