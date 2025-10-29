// 設定ファイル
const CONFIG = {
  // Firebase設定（Firebase Consoleから取得）
  firebase: {
  apiKey: "AIzaSyDLsRsitmY4uPX6a_-RTtq1X1EfQW4L7Uw",
  authDomain: "translation-chat-561ae.firebaseapp.com",
  databaseURL: "https://translation-chat-561ae-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "translation-chat-561ae",
  storageBucket: "translation-chat-561ae.firebasestorage.app",
  messagingSenderId: "731320381667",
  appId: "1:731320381667:web:9b256ebf09de1e935455d6"
  },
  
  // Gemini AI設定
  gemini: {
    apiKey: "AIzaSyBSnVC1nRpYx3L7uzUPOw7dgJlvCCqQ840",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
  },
  
  // 言語設定
  languages: [
    { code: 'ja', name: '日本語', geminiCode: 'Japanese' },
    { code: 'en', name: 'English', geminiCode: 'English' },
    { code: 'zh-CN', name: '中文', geminiCode: 'Chinese' },
    { code: 'ko', name: '한국어', geminiCode: 'Korean' },
    { code: 'es', name: 'Español', geminiCode: 'Spanish' },
    { code: 'fr', name: 'Français', geminiCode: 'French' },
    { code: 'de', name: 'Deutsch', geminiCode: 'German' },
    { code: 'it', name: 'Italiano', geminiCode: 'Italian' },
    { code: 'pt', name: 'Português', geminiCode: 'Portuguese' },
    { code: 'ru', name: 'Русский', geminiCode: 'Russian' },
    { code: 'ar', name: 'العربية', geminiCode: 'Arabic' },
    { code: 'hi', name: 'हिन्दी', geminiCode: 'Hindi' },
    { code: 'th', name: 'ไทย', geminiCode: 'Thai' },
    { code: 'vi', name: 'Tiếng Việt', geminiCode: 'Vietnamese' }
  ],
  
  // アプリ設定
  app: {
    inactivityTimeout: 15 * 60 * 1000, // 15分
    maxUsersPerRoom: 2
  }
};

// 設定の検証
function validateConfig() {
  if (!CONFIG.firebase.apiKey || CONFIG.firebase.apiKey === 'YOUR_FIREBASE_API_KEY') {
    console.warn('⚠️ Firebase APIキーが設定されていません');
  }
  if (!CONFIG.gemini.apiKey || CONFIG.gemini.apiKey === 'YOUR_GEMINI_API_KEY') {
    console.warn('⚠️ Gemini APIキーが設定されていません');
  }
}

validateConfig();
