// 設定ファイル - LibreTranslate完全対応版
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
  
  // ★★★ LibreTranslate公式対応言語のみ（50言語）★★★
  // ネパール語(ne)、zh-CNは非対応のため削除
  languages: [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' },
    { code: 'zh-Hans', name: '中文(简体)' },
    { code: 'zh-Hant', name: '中文(繁體)' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'th', name: 'ไทย' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'ms', name: 'Bahasa Melayu' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'pl', name: 'Polski' },
    { code: 'uk', name: 'Українська' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'sv', name: 'Svenska' },
    { code: 'da', name: 'Dansk' },
    { code: 'nb', name: 'Norsk' },
    { code: 'fi', name: 'Suomi' },
    { code: 'cs', name: 'Čeština' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'he', name: 'עברית' },
    { code: 'hu', name: 'Magyar' },
    { code: 'ro', name: 'Română' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'bg', name: 'Български' },
    { code: 'sr', name: 'Српски' },
    { code: 'sl', name: 'Slovenščina' },
    { code: 'et', name: 'Eesti' },
    { code: 'lv', name: 'Latviešu' },
    { code: 'lt', name: 'Lietuvių' },
    { code: 'fa', name: 'فارسی' },
    { code: 'ur', name: 'اردو' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'sq', name: 'Shqip' },
    { code: 'az', name: 'Azərbaycan' },
    { code: 'ca', name: 'Català' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'eu', name: 'Euskara' },
    { code: 'gl', name: 'Galego' },
    { code: 'ga', name: 'Gaeilge' },
    { code: 'ky', name: 'Кыргызча' }
  ],
  
  // アプリ設定
  app: {
    inactivityTimeout: 10 * 60 * 1000, // 10分
    maxUsersPerRoom: 2
  }
};

// 設定の検証
function validateConfig() {
  if (!CONFIG.firebase.apiKey || CONFIG.firebase.apiKey === 'YOUR_FIREBASE_API_KEY') {
    console.warn('⚠️ Firebase APIキーが設定されていません');
  }
  console.log(`✅ LibreTranslate対応言語: ${CONFIG.languages.length}言語`);
}

validateConfig();
