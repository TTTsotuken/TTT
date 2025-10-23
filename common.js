// =========================================================================
// 1. グローバル変数と共通関数
// =========================================================================

// **APIキーは安全のため、ダミーとしていますが、ご自身のキーに置き換えてください。**
const API_KEY = "AIzaSyACH-85K86fJxfJVXaKX3wdzUZTqAKT4l4"; 
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


// =========================================================================
// 2. 単語帳管理クラス (Wordbook) - LocalStorageによる一時保持
// =========================================================================

const WORDBOOK_STORAGE_KEY = 'geminiWordbookData';

class Wordbook {
    constructor() {
        this.words = this._load(WORDBOOK_STORAGE_KEY);
    }
    
    _load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error loading ${key} from localStorage:`, e);
            return [];
        }
    }

    _save(key) {
        try {
            localStorage.setItem(key, JSON.stringify(this.words));
        } catch (e) {
            console.error(`Error saving ${key} to localStorage:`, e);
        }
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
        this._save(WORDBOOK_STORAGE_KEY); 
        return true;
    }
    
    remove(id) {
        const numericId = Number(id); 
        this.words = this.words.filter(item => item.id !== numericId);
        this._save(WORDBOOK_STORAGE_KEY); 
    }
    
    removeSelected(ids) {
        const numericIds = ids.map(id => Number(id));
        this.words = this.words.filter(item => !numericIds.includes(item.id));
        this._save(WORDBOOK_STORAGE_KEY); 
    }
}

const wordbook = new Wordbook();


// =========================================================================
// 3. 翻訳ログ管理クラス (LogManager) - 新規追加
// =========================================================================

const LOG_STORAGE_KEY = 'geminiTranslationLogs';

class LogManager {
    constructor() {
        this.logs = this._load(LOG_STORAGE_KEY);
    }

    // common.js の Wordbook の _load, _save メソッドを再利用するか、
    // ここで独自に実装し、キーを変える。今回は Wordbook と同じ仕組みで実装。
    _load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error loading ${key} from localStorage:`, e);
            return [];
        }
    }

    _save(key) {
        try {
            localStorage.setItem(key, JSON.stringify(this.logs));
        } catch (e) {
            console.error(`Error saving ${key} to localStorage:`, e);
        }
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
        this._save(LOG_STORAGE_KEY);
        // ログの上限を設定してもよいが、ここではシンプルに保存のみとする
        return true;
    }

    clearLogs() {
        this.logs = [];
        this._save(LOG_STORAGE_KEY);
    }
}

const logManager = new LogManager();