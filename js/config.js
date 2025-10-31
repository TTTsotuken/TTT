// 設定ファイル
const CONFIG = {
  // Firebase設定(Firebase Consoleから取得)
  firebase: {
    apiKey: "AIzaSyDLsRsitmY4uPX6a_-RTtq1X1EfQW4L7Uw",
    authDomain: "translation-chat-561ae.firebaseapp.com",
    databaseURL: "https://translation-chat-561ae-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "translation-chat-561ae",
    storageBucket: "translation-chat-561ae.firebasestorage.app",
    messagingSenderId: "731320381667",
    appId: "1:731320381667:web:9b256ebf09de1e935455d6"
  },
  
  // 言語設定
  languages: [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' },
    { code: 'zh-CN', name: '中文' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'th', name: 'ไทย' },
    { code: 'vi', name: 'Tiếng Việt' }
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
}

validateConfig();
