// 🔥 Firebase設定
// Firebase Consoleから取得した設定情報を入力してください
// https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyDLsRsitmY4uPX6a_-RTtq1X1EfQW4L7Uw",
  authDomain: "translation-chat-561ae.firebaseapp.com",
  databaseURL: "https://translation-chat-561ae-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "translation-chat-561ae",
  storageBucket: "translation-chat-561ae.firebasestorage.app",
  messagingSenderId: "731320381667",
  appId: "1:731320381667:web:9b256ebf09de1e935455d6"
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 🤖 Gemini API設定
// Google AI Studioから取得したAPIキーを入力してください
// https://makersuite.google.com/app/apikey
const GEMINI_API_KEY = "AIzaSyBSnVC1nRpYx3L7uzUPOw7dgJlvCCqQ840";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
