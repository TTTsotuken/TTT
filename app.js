// グローバル変数
// **APIキーは安全のため、ダミーとしていますが、ご自身のキーに置き換えてください。**
const apiKey = "AIzaSyACH-85K86fJxfJVXaKX3wdzUZTqAKT4l4"; 
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

// UI要素の取得
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const swapButton = document.getElementById('swap-button');
const inputTextarea = document.getElementById('input-text');
const outputDiv = document.getElementById('output-text');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const inputStatusDiv = document.getElementById('input-status');
const micButton = document.getElementById('mic-button');

// 画像関連のUI要素
const imageUploadInput = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imageUploadLabel = document.getElementById('image-upload-label');
const clearImageButton = document.getElementById('clear-image-button');
const inputTitle = document.getElementById('input-title');

// 音声認識関連の変数
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;
let isManualInput = true; 

// **画像認識関連のグローバル変数**
let imageFile = null; // Base64エンコードされた画像データ
let isImageMode = false; // 現在画像翻訳モードか

// 対応言語リスト (コードと表示名)
const languages = [
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

let debounceTimeout;
const DEBOUNCE_DELAY = 500; // 500ミリ秒の遅延

// =========================================================================
// 画像認識関連の関数
// =========================================================================

/**
 * FileオブジェクトをBase64データURLに変換します。
 * @param {File} file - アップロードされたファイルオブジェクト
 */
function encodeImageFileAsURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 画像ファイルの変更を処理し、プレビューとBase64データを設定します。
 */
async function handleImageUpload() {
    const file = imageUploadInput.files[0];
    if (!file) {
        clearImage();
        return;
    }

    // 画像認識中は音声認識を停止
    if (isListening) {
        recognition.stop();
        updateMicButtonState(false);
    }
    
    try {
        // Base64データに変換
        const result = await encodeImageFileAsURL(file);
        imageFile = result;
        isImageMode = true;

        // UIの更新
        imagePreview.src = result;
        imagePreviewContainer.classList.remove('hidden');
        inputTextarea.classList.add('hidden'); // 画像モードではテキストエリアを非表示に
        inputTitle.textContent = '翻訳元画像';
        imageUploadLabel.classList.add('hidden');
        clearImageButton.classList.remove('hidden');
        micButton.classList.add('hidden');
        
        inputStatusDiv.textContent = '画像が読み込まれました。翻訳を開始します...';

        // 翻訳をトリガー
        translateText();

    } catch (error) {
        console.error('Image processing failed:', error);
        imageFile = null;
        isImageMode = false;
        imagePreviewContainer.classList.add('hidden');
        inputStatusDiv.textContent = 'エラー: 画像の読み込みに失敗しました。';
        errorMessage.classList.remove('hidden');
    }
}

/**
 * 画像のアップロードをクリアし、UIをリセットします。
 */
function clearImage() {
    imageFile = null;
    isImageMode = false;
    imageUploadInput.value = ''; // inputをリセット
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    inputTextarea.classList.remove('hidden'); // テキストエリアを再表示
    inputTitle.textContent = '翻訳元テキスト (入力/音声)';
    imageUploadLabel.classList.remove('hidden');
    clearImageButton.classList.add('hidden');
    micButton.classList.remove('hidden');
    
    // テキスト翻訳に戻る
    handleInput(false);
}

// =========================================================================
// 音声認識関連の関数
// =========================================================================

function setupSpeechRecognition() {
    if (!SpeechRecognition) {
        micButton.disabled = true;
        micButton.classList.add('opacity-50', 'cursor-not-allowed');
        inputStatusDiv.textContent = 'エラー: このブラウザは音声認識をサポートしていません。';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = sourceLangSelect.value;
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if ((finalTranscript || interimTranscript).trim().length > 0) {
            inputTextarea.value = finalTranscript.length > 0 ? finalTranscript : interimTranscript;
            isManualInput = false; 
            handleInput(true);
        }
    };

    recognition.onend = () => {
        if (!isListening) {
            updateMicButtonState(false);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        inputStatusDiv.textContent = `音声エラー: ${event.error === 'not-allowed' ? 'マイクの使用が許可されていません' : event.error}`;
        updateMicButtonState(false); 
        if (isListening) {
            recognition.stop(); 
        }
    };
    
    sourceLangSelect.addEventListener('change', () => {
        recognition.lang = sourceLangSelect.value;
        if (isListening) {
            recognition.stop();
            recognition.start();
        }
    });
}

function toggleSpeechRecognition() {
    // 画像モードの場合は処理しない
    if (isImageMode) return; 
    
    if (isListening) {
        // 停止処理
        recognition.stop();
        updateMicButtonState(false);
    } else {
        // 開始処理
        try {
            recognition.lang = sourceLangSelect.value;
            recognition.start();
            updateMicButtonState(true);
            inputTextarea.value = ''; 
            isManualInput = false; 
        } catch (e) {
            console.error('Recognition start failed:', e);
            if (e.name === 'InvalidStateError') {
                recognition.stop();
                updateMicButtonState(false);
                inputStatusDiv.textContent = '認識をリスタートしました';
            } else {
                inputStatusDiv.textContent = '認識の開始に失敗しました';
            }
        }
    }
}

/**
 * マイクボタンのUI状態を更新する（色のクラス名変更を反映）
 * @param {boolean} listening - 音声認識中かどうか
 */
function updateMicButtonState(listening) {
    isListening = listening;
    if (listening) {
        // 静止時のピンク色を削除し、アクティブ時のインディゴ色を追加
        micButton.classList.remove('bg-pink-600', 'hover:bg-pink-700', 'focus:ring-pink-300');
        micButton.classList.add('bg-indigo-500', 'hover:bg-indigo-600', 'focus:ring-indigo-300', 'listening-active');
        inputStatusDiv.textContent = '👂 話してください...';
    } else {
        // アクティブ時のインディゴ色を削除し、静止時のピンク色を追加
        micButton.classList.add('bg-pink-600', 'hover:bg-pink-700', 'focus:ring-pink-300');
        micButton.classList.remove('bg-indigo-500', 'hover:bg-indigo-600', 'focus:ring-indigo-300', 'listening-active');
        if (isManualInput) {
            inputStatusDiv.textContent = '';
        } else {
            inputStatusDiv.textContent = '停止しました。翻訳を待っています...';
        }
    }
}

// =========================================================================
// 共通関数
// =========================================================================

function initializeLanguageSelectors() {
    languages.forEach(lang => {
        const sourceOption = new Option(lang.name, lang.code);
        const targetOption = new Option(lang.name, lang.code);
        sourceLangSelect.add(sourceOption);
        targetLangSelect.add(targetOption);
    });

    // デフォルト値: 日本語 -> 英語
    sourceLangSelect.value = 'ja';
    targetLangSelect.value = 'en';
}

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
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i === retries - 1) throw error; 
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Gemini APIを使用して翻訳を実行します。
 */
async function translateText() {
    errorMessage.classList.add('hidden');
    outputDiv.textContent = '';

    const sourceLangCode = sourceLangSelect.value;
    const targetLangCode = targetLangSelect.value;
    const sourceLangName = languages.find(l => l.code === sourceLangCode)?.name || sourceLangCode;
    const targetLangName = languages.find(l => l.code === targetLangCode)?.name || targetLangCode;
    
    // 翻訳のペイロードを格納する配列
    let parts = [];
    let userQuery = '';

    if (isImageMode && imageFile) {
        // 画像モードの場合
        inputStatusDiv.textContent = '画像認識と翻訳中...';
        
        // Base64からMIMEタイプとデータ本体を抽出
        const [metadata, data] = imageFile.split(',');
        const mimeTypeMatch = metadata.match(/:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg'; // デフォルト

        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: data
            }
        });
        
        // 画像から文字を抽出し、それを翻訳するプロンプトを追加
        const prompt = `この画像に含まれるテキスト（文字）を抽出し、その抽出したテキストを${sourceLangName}と仮定して、${targetLangName}に翻訳してください。翻訳されたテキストのみを応答してください。`;
        parts.push({ text: prompt });
        
    } else {
        // テキスト/音声モードの場合
        userQuery = inputTextarea.value.trim(); 
        
        if (userQuery.length === 0) {
            outputDiv.textContent = '翻訳結果がここに表示されます。';
            loadingIndicator.classList.add('hidden');
            if (!isListening) {
                inputStatusDiv.textContent = '';
            }
            return;
        }
        
        inputStatusDiv.textContent = '翻訳中...';
        // partsは後でまとめて設定されるため、ここではクリアしない
    }

    loadingIndicator.classList.remove('hidden');

    const systemPrompt = `あなたはプロフェッショナルで、非常に正確で自然な響きの言語翻訳者です。追加の解説や説明は一切含めず、翻訳されたテキストのみを提供してください。`;
    
    // テキスト翻訳の場合は、プロンプトに翻訳指示を追加
    if (!isImageMode) {
            const translationPrompt = `以下の${sourceLangName}のテキストを${targetLangName}に翻訳してください: ${userQuery}`;
            parts = [{ text: translationPrompt }];
    }

    const payload = {
        contents: [{ parts: parts }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        const response = await fetchWithBackoff(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const translatedText = candidate.content.parts[0].text;
            outputDiv.textContent = translatedText;
            if (!isListening && !isImageMode) {
                inputStatusDiv.textContent = '翻訳完了';
            } else if (isImageMode) {
                inputStatusDiv.textContent = '画像翻訳完了';
            }
        } else {
            outputDiv.textContent = 'エラー: 翻訳結果を取得できませんでした。';
            errorMessage.classList.remove('hidden');
            console.error("API Response Error:", result);
            inputStatusDiv.textContent = 'エラー';
        }

    } catch (error) {
        console.error("Translation API Call Failed:", error);
        outputDiv.textContent = 'エラー: サーバーとの通信に失敗しました。';
        errorMessage.classList.remove('hidden');
        inputStatusDiv.textContent = 'エラー';
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function handleInput(isVoiceInput = false) {
    // 画像モードを解除してから、テキスト/音声の入力を処理
    if (isImageMode) {
        clearImage(); 
        // clearImageがtranslateTextを呼び出す可能性があるため、ここでは処理を中断
        // ただし、clearImage内でhandleInputが呼ばれていることを前提とする
        return; 
    }
    
    if (isListening && !isVoiceInput) {
        recognition.stop();
        updateMicButtonState(false);
        isManualInput = true;
    } else if (!isVoiceInput) {
        isManualInput = true; 
    }
    
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    
    if (isManualInput) {
        inputStatusDiv.textContent = '入力中...';
    }
    
    debounceTimeout = setTimeout(() => {
        translateText();
    }, DEBOUNCE_DELAY);
}

function swapLanguages() {
    const sourceCode = sourceLangSelect.value;
    const targetCode = targetLangSelect.value;
    sourceLangSelect.value = targetCode;
    targetLangSelect.value = sourceCode;
    
    if (isListening) {
        recognition.stop();
        try {
            recognition.lang = sourceLangSelect.value;
            recognition.start();
        } catch (e) {
            console.error('Recognition restart failed after swap:', e);
            updateMicButtonState(false);
        }
    }
    
    // テキスト、または画像（存在する場合）の翻訳を再実行
    translateText();
}

// --- イベントリスナーの登録と初期化 ---

window.onload = () => {
    initializeLanguageSelectors();
    setupSpeechRecognition();

    // テキスト/音声のイベントリスナー
    inputTextarea.addEventListener('input', () => handleInput(false));
    sourceLangSelect.addEventListener('change', translateText);
    targetLangSelect.addEventListener('change', translateText);
    swapButton.addEventListener('click', swapLanguages);
    micButton.addEventListener('click', toggleSpeechRecognition);
    
    // 画像認識のイベントリスナー
    imageUploadInput.addEventListener('change', handleImageUpload);
    clearImageButton.addEventListener('click', clearImage);
};
