// common.js の Wordbook, logManager, LANGUAGES, API_URL, fetchWithBackoff が利用可能

const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const swapButton = document.getElementById('swap-button');
const inputTextarea = document.getElementById('input-text');
const outputDiv = document.getElementById('output-text');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const inputStatusDiv = document.getElementById('input-status');
const micButton = document.getElementById('mic-button');

// 新しい要素の定義
const outputControls = document.getElementById('output-controls');
const wordbookSaveButton = document.getElementById('wordbook-save-button');
const logSaveButton = document.getElementById('log-save-button');

const imageUploadInput = document.getElementById('image-upload');
const clearImageButton = document.getElementById('clear-image-button');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imageUploadLabel = document.getElementById('image-upload-label');
const inputTitle = document.getElementById('input-title');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const DEBOUNCE_DELAY = 500;
let debounceTimeout;
let recognition;
let isListening = false;
let isManualInput = true; 
let imageFile = null; 
let isImageMode = false; 

// 翻訳結果を一時的に保持するためのグローバル変数
let currentTranslationData = {
    sourceText: '',
    translatedText: '',
    keyWords: [],
    sourceLangCode: '',
    targetLangCode: '',
    isImage: false
};

// =========================================================================
// 1. 初期化とUI設定
// =========================================================================

function initializeLanguageSelectors() {
    LANGUAGES.forEach(lang => {
        const sourceOption = new Option(lang.name, lang.code);
        const targetOption = new Option(lang.name, lang.code);
        sourceLangSelect.add(sourceOption);
        targetLangSelect.add(targetOption);
    });
    
    sourceLangSelect.value = 'ja';
    targetLangSelect.value = 'en';
}

function swapLanguages() {
    const sourceCode = sourceLangSelect.value;
    const targetCode = targetLangSelect.value;
    sourceLangSelect.value = targetCode;
    targetLangSelect.value = sourceCode;
    
    if (isListening) {
        recognition.stop();
        recognition.lang = sourceLangSelect.value;
        recognition.start();
    }
    
    translateText();
}

// =========================================================================
// 2. 翻訳と重要語彙抽出ロジック
// =========================================================================

function handleTranslationResult(fullText, sourceLangCode, targetLangCode, sourceText, isImage) {
    const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    let translationText = fullText.substring(0, jsonMatch ? jsonMatch.index : fullText.length).trim();
    let keyWordsData = null;

    if (jsonMatch) {
        try {
            keyWordsData = JSON.parse(jsonMatch[1]);
        } catch (e) {
            console.error("Failed to parse key_words JSON:", e);
        }
    }
    
    outputDiv.textContent = translationText || '翻訳結果を取得できませんでした。';

    // 🚨 翻訳結果をグローバル変数に保存（自動登録はしない）
    currentTranslationData = {
        sourceText: sourceText,
        translatedText: translationText,
        keyWords: keyWordsData?.key_words || [],
        sourceLangCode: sourceLangCode,
        targetLangCode: targetLangCode,
        isImage: isImage
    };

    // 🚨 保存ボタンの表示を更新
    updateSaveButtons(true);
    
    if (keyWordsData && keyWordsData.key_words && keyWordsData.key_words.length > 0) {
        inputStatusDiv.textContent = `翻訳完了。重要語彙${keyWordsData.key_words.length}件を単語帳に登録できます。`;
    } else {
        inputStatusDiv.textContent = isImageMode ? '画像翻訳完了' : '翻訳完了';
        wordbookSaveButton.disabled = true; // 重要語彙がない場合は単語帳登録ボタンを無効化
    }
}

async function translateText() {
    // 翻訳開始時に古いデータをクリアし、ボタンを無効化
    updateSaveButtons(false);
    
    errorMessage.classList.add('hidden');
    outputDiv.textContent = '';

    const sourceLangCode = sourceLangSelect.value;
    const targetLangCode = targetLangSelect.value;
    const sourceLangName = LANGUAGES.find(l => l.code === sourceLangCode)?.name || sourceLangCode;
    const targetLangName = LANGUAGES.find(l => l.code === targetLangCode)?.name || targetLangCode;
    
    let parts = [];
    let userQuery = inputTextarea.value.trim();
    const isImageTranslation = isImageMode && imageFile;
    let sourceTextForLog = userQuery; 

    if (isImageTranslation) {
        inputStatusDiv.textContent = '画像認識と翻訳中...';
        // ... (画像翻訳のプロンプト処理は省略 - 変更なし) ...
        const [metadata, data] = imageFile.split(',');
        const mimeTypeMatch = metadata.match(/:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

        parts.push({ inlineData: { mimeType: mimeType, data: data } });
        const prompt = `この画像に含まれるテキスト（文字）を抽出し、そのテキストを${sourceLangName}と仮定して、${targetLangName}に翻訳してください。翻訳されたテキストのみを応答してください。`;
        parts.push({ text: prompt });
        sourceTextForLog = '【画像翻訳】'; 
        
    } else {
        if (userQuery.length === 0) {
            outputDiv.textContent = '翻訳結果がここに表示されます。';
            loadingIndicator.classList.add('hidden');
            if (!isListening) { inputStatusDiv.textContent = ''; }
            return;
        }
        
        inputStatusDiv.textContent = '翻訳と重要語彙抽出中...';
        
        const translationAndKeyWordsPrompt = `
            あなたはプロ翻訳者であり、言語学習をサポートするアシスタントです。

            [タスク1: 翻訳]
            以下の${sourceLangName}のテキストを${targetLangName}に翻訳してください。翻訳されたテキストのみを最初に出力してください。追加の説明やコメントは一切含めないでください。

            [タスク2: 重要語彙抽出]
            タスク1の翻訳結果の後に、翻訳元のテキストから**難易度の高い単語**や**新しい単語**を最大5つ抽出し、その対応する翻訳を以下のスキーマで必ず\`\`\`json ... \`\`\`ブロックで出力してください。

            JSONスキーマ:
            {
              "key_words": [
                {"original": "元のテキストの難易度の高い単語", "translation": "翻訳された単語", "context": "なぜ重要か（例：専門用語、多義語、スラングなど）"},
                // ... 最大5つの重要語彙
              ]
            }

            元のテキスト: ${userQuery}
        `;
        parts.push({ text: translationAndKeyWordsPrompt });
    }

    loadingIndicator.classList.remove('hidden');

    const systemPrompt = `あなたはプロフェッショナルで、非常に正確で自然な響きの言語翻訳者兼、言語解析アシスタントです。あなたの出力は、[タスク1: 翻訳]の結果と、それに続く[タスク2: 重要語彙抽出]のJSONブロックのみで構成される必要があります。`;
    
    const payload = {
        contents: [{ parts: parts }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetchWithBackoff(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const fullResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (fullResponseText) {
            handleTranslationResult(fullResponseText, sourceLangCode, targetLangCode, sourceTextForLog, isImageTranslation);
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

// =========================================================================
// 3. 手動保存ロジック
// =========================================================================

function updateSaveButtons(enabled) {
    wordbookSaveButton.disabled = !enabled;
    logSaveButton.disabled = !enabled;
    if (enabled) {
        outputControls.classList.remove('hidden');
    } else {
        outputControls.classList.add('hidden');
    }
}

function handleWordbookSave() {
    const { keyWords, sourceLangCode, targetLangCode } = currentTranslationData;
    
    if (keyWords.length === 0) {
        alert('登録する重要語彙がありません。');
        wordbookSaveButton.disabled = true;
        return;
    }
    
    let addedCount = 0;
    keyWords.forEach(wordObj => {
        // common.jsのwordbook.addを呼び出し、保存
        if(wordbook.add(wordObj.original, wordObj.translation, sourceLangCode, targetLangCode)) {
            addedCount++;
        }
    });

    if (addedCount > 0) {
        alert(`${addedCount}件の重要語彙を単語帳に登録しました。`);
        wordbookSaveButton.disabled = true; // 登録済みとしてボタンを無効化
    } else {
        alert('すべての語彙は既に単語帳に登録されています。');
    }
}

function handleLogSave() {
    const { sourceText, translatedText, sourceLangCode, targetLangCode, isImage } = currentTranslationData;
    
    if (!sourceText && !translatedText) {
        alert('ログに保存するデータがありません。');
        logSaveButton.disabled = true;
        return;
    }
    
    // common.jsのlogManager.addLogを呼び出し、保存
    logManager.addLog(sourceText, translatedText, sourceLangCode, targetLangCode, isImage);

    alert('翻訳ログを保存しました。');
    logSaveButton.disabled = true; // 保存済みとしてボタンを無効化
}

// =========================================================================
// 4. 画像と音声認識ロジック (省略)
// =========================================================================

function handleInput(isVoiceInput = false) {
    if (isImageMode) {
        clearImage(); 
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

// ... 音声認識、画像認識のロジック (変更なし、省略) ...

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
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        if (finalTranscript.trim().length > 0) {
            inputTextarea.value = finalTranscript;
            isManualInput = false; 
            handleInput(true);
        }
    };
    recognition.onend = () => { if (!isListening) { updateMicButtonState(false); } };
    recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        inputStatusDiv.textContent = `音声エラー: ${event.error === 'not-allowed' ? 'マイクの使用が許可されていません' : event.error}`;
        updateMicButtonState(false); 
        if (isListening) { recognition.stop(); }
    };
    
    sourceLangSelect.addEventListener('change', () => {
        recognition.lang = sourceLangSelect.value;
        if (isListening) { recognition.stop(); recognition.start(); }
    });
}

function toggleSpeechRecognition() {
    if (isImageMode) return; 
    
    if (isListening) {
        recognition.stop();
        updateMicButtonState(false);
    } else {
        try {
            recognition.lang = sourceLangSelect.value;
            recognition.start();
            updateMicButtonState(true);
            inputTextarea.value = ''; 
            isManualInput = false; 
        } catch (e) {
            console.error('Recognition start failed:', e);
            if (e.name === 'InvalidStateError') { recognition.stop(); updateMicButtonState(false); inputStatusDiv.textContent = '認識をリスタートしました'; } 
            else { inputStatusDiv.textContent = '認識の開始に失敗しました'; }
        }
    }
}

function updateMicButtonState(listening) {
    isListening = listening;
    if (listening) {
        micButton.classList.remove('bg-pink-600', 'hover:bg-pink-700', 'focus:ring-pink-300');
        micButton.classList.add('bg-indigo-500', 'hover:bg-indigo-600', 'focus:ring-indigo-300', 'listening-active');
        inputStatusDiv.textContent = '👂 話してください...';
    } else {
        micButton.classList.add('bg-pink-600', 'hover:bg-pink-700', 'focus:ring-pink-300');
        micButton.classList.remove('bg-indigo-500', 'hover:bg-indigo-600', 'focus:ring-indigo-300', 'listening-active');
        if (isManualInput) { inputStatusDiv.textContent = ''; } 
        else { inputStatusDiv.textContent = '停止しました。翻訳を待っています...'; }
    }
}

function encodeImageFileAsURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleImageUpload() {
    const file = imageUploadInput.files[0];
    if (!file) { clearImage(); return; }

    if (isListening) { recognition.stop(); updateMicButtonState(false); }
    
    try {
        const result = await encodeImageFileAsURL(file);
        imageFile = result;
        isImageMode = true;

        imagePreview.src = result;
        imagePreviewContainer.classList.remove('hidden');
        inputTextarea.classList.add('hidden');
        inputTitle.textContent = '翻訳元画像';
        imageUploadLabel.classList.add('hidden');
        clearImageButton.classList.remove('hidden');
        micButton.classList.add('hidden');
        
        inputStatusDiv.textContent = '画像が読み込まれました。翻訳を開始します...';
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

function clearImage() {
    imageFile = null;
    isImageMode = false;
    imageUploadInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    inputTextarea.classList.remove('hidden');
    inputTitle.textContent = '翻訳元テキスト (入力/音声)';
    imageUploadLabel.classList.remove('hidden');
    clearImageButton.classList.add('hidden');
    micButton.classList.remove('hidden');
    
    handleInput(false);
}

// =========================================================================
// 5. イベントリスナー設定
// =========================================================================

window.addEventListener('load', () => {
    initializeLanguageSelectors();
    setupSpeechRecognition();

    // 翻訳イベントリスナー
    inputTextarea.addEventListener('input', () => handleInput(false));
    sourceLangSelect.addEventListener('change', translateText);
    targetLangSelect.addEventListener('change', translateText);
    swapButton.addEventListener('click', swapLanguages);
    micButton.addEventListener('click', toggleSpeechRecognition);
    imageUploadInput.addEventListener('change', handleImageUpload);
    clearImageButton.addEventListener('click', clearImage);

    // 🚨 新しい保存ボタンのイベントリスナー
    wordbookSaveButton.addEventListener('click', handleWordbookSave);
    logSaveButton.addEventListener('click', handleLogSave);

    // 初期状態では保存ボタンを非表示/無効化
    updateSaveButtons(false); 
});