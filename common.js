// =========================================================================
// 1. グローバル変数と共通関数
// =========================================================================

// **APIキーは安全のため、ダミーとしていますが、ご自身のキーに置き換えてください。**
const API_KEY = "AIzaSyAF3EpCc9PVf_4kxfHM6_7pxg_qs72YAYE"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

// 対応言語リスト
const LANGUAGES = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: '英語' },
    { code: 'zh', name: '中国語' },
    { code: 'ko', name: '韓国語' },
    { code: 'es', name: 'スペイン語' },
    { code: 'fr', name: 'フランス語' },
    { code: 'de', name: 'ドイツ語' },
    { code: 'pt', name: 'ポルトガル語' },
    { code: 'ru', name: 'ロシア語' },
    { code: 'ar', name: 'アラビア語' },
];

// --- 共通のAPI通信関数 ---
async function fetchWithBackoff(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 && i < retries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; 
            }
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Body: ${errorBody}`);
            }
            return response;
        } catch (error) {
            if (i === retries - 1) throw error; 
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// --- LocalStorage 共通ロジック (データの永続化を実現) ---
function _load(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error loading ${key} from localStorage:`, e);
        return [];
    }
}

function _save(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
    }
}


// =========================================================================
// 2. 単語帳管理クラス (Wordbook) - 永続化と重複回避
// =========================================================================

const WORDBOOK_STORAGE_KEY = 'geminiWordbookData';

class Wordbook {
    constructor() {
        this.words = _load(WORDBOOK_STORAGE_KEY);
    }
    
    add(word, translation, sourceLang, targetLang) {
        if (!word || !translation) return false;
        
        // 重複チェック
        if (this.words.some(item => item.word === word && item.translation === translation)) {
            return false; 
        }
        
        this.words.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000), 
            word,
            translation,
            sourceLang,
            targetLang,
            date: new Date().toISOString()
        });
        _save(WORDBOOK_STORAGE_KEY, this.words); 
        return true;
    }
    
    remove(id) {
        const numericId = Number(id); 
        this.words = this.words.filter(item => item.id !== numericId);
        _save(WORDBOOK_STORAGE_KEY, this.words); 
    }
    
    removeSelected(ids) {
        const numericIds = ids.map(id => Number(id));
        this.words = this.words.filter(item => !numericIds.includes(item.id));
        _save(WORDBOOK_STORAGE_KEY, this.words); 
    }
}

const wordbook = new Wordbook();


// =========================================================================
// 3. 翻訳ログ管理クラス (LogManager) - 永続化を保証
// =========================================================================

const LOG_STORAGE_KEY = 'geminiTranslationLogs';

class LogManager {
    constructor() {
        this.logs = _load(LOG_STORAGE_KEY);
    }

    addLog(sourceText, translatedText, sourceLang, targetLang, isImage) {
        if (!sourceText && !translatedText) return false;
        
        this.logs.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000),
            sourceText,
            translatedText,
            sourceLang,
            targetLang,
            isImage: isImage || false,
            date: new Date().toISOString()
        });
        _save(LOG_STORAGE_KEY, this.logs); 
        return true;
    }

    // 🚨 ログを個別削除するメソッドを追加 🚨
    remove(id) {
        const numericId = Number(id); 
        this.logs = this.logs.filter(item => item.id !== numericId);
        _save(LOG_STORAGE_KEY, this.logs); 
    }
    
    // 🚨 ログを複数選択で削除するメソッドを追加 🚨
    removeSelected(ids) {
        const numericIds = ids.map(id => Number(id));
        this.logs = this.logs.filter(item => !numericIds.includes(item.id));
        _save(LOG_STORAGE_KEY, this.logs); 
    }

    clearLogs() {
        this.logs = [];
        _save(LOG_STORAGE_KEY, this.logs); 
    }
}

const logManager = new LogManager();