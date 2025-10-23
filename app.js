// =========================================================================
// 1. グローバル変数とUI要素の取得
// =========================================================================

// **APIキーは安全のため、ダミーとしていますが、ご自身のキーに置き換えてください。**
const apiKey = "AIzaSyAF3EpCc9PVf_4kxfHM6_7pxg_qs72YAYE"; 
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

// 既存のUI要素
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
const clearImageButton = document.getElementById('clear-image-button');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imageUploadLabel = document.getElementById('image-upload-label');
const inputTitle = document.getElementById('input-title');

// 学習機能のUI要素
const wordbookButton = document.getElementById('wordbook-button');
const wordbookContainer = document.getElementById('wordbook-container');
const wordbookList = document.getElementById('wordbook-list'); 
const deleteSelectedButton = document.getElementById('delete-selected-button'); 

const flashcardButton = document.getElementById('flashcard-button'); 
const flashcardMode = document.getElementById('flashcard-mode'); 
const cardArea = document.getElementById('flashcard-area'); 
const cardFront = document.getElementById('card-front'); 
const cardBack = document.getElementById('card-back'); 
const flipCardButton = document.getElementById('flip-card-button'); 
const nextCardButton = document.getElementById('next-card-button'); 

const quizButton = document.getElementById('quiz-button'); 
const quizMode = document.getElementById('quiz-mode'); 
const quizQuestion = document.getElementById('quiz-question'); 
const quizInput = document.getElementById('quiz-input'); 
const submitQuizButton = document.getElementById('submit-quiz-button'); 
const quizFeedback = document.getElementById('quiz-feedback'); 
const nextQuizButton = document.getElementById('next-quiz-button'); 
const quizLoading = document.getElementById('quiz-loading'); 

// 音声認識/画像認識関連の変数
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;
let isManualInput = true; 
let imageFile = null; 
let isImageMode = false; 

// 学習関連の変数
let currentCardIndex = 0;
let currentQuiz = null;

// 定数
const DEBOUNCE_DELAY = 500;
let debounceTimeout;

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

// =========================================================================
// 2. 単語帳管理クラス (Wordbook)
// =========================================================================

class Wordbook {
    constructor() {
        this.key = 'translationWordbook';
        this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.key);
            this.words = data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load wordbook from localStorage:", e);
            this.words = [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.words));
        } catch (e) {
            console.error("Failed to save wordbook to localStorage:", e);
        }
    }

    add(word, translation, sourceLang, targetLang) {
        // 重複チェック (元の単語と翻訳が同じであれば追加しない)
        if (this.words.some(item => item.word === word && item.translation === translation)) {
            return false; 
        }
        
        this.words.unshift({ // 新しいものを先頭に追加
            id: Date.now() + Math.floor(Math.random() * 1000), // ユニークIDを生成
            word,
            translation,
            sourceLang,
            targetLang,
            date: new Date().toISOString()
        });
        this.save();
        this.render();
        return true;
    }
    
    // 単体削除機能
    remove(id) {
        this.words = this.words.filter(item => item.id !== id);
        this.save();
        this.render();
    }
    
    // 複数削除機能
    removeSelected(ids) {
        // IDは数値として格納されているため、ids配列を数値に変換して比較
        const numericIds = ids.map(id => parseInt(id));
        this.words = this.words.filter(item => !numericIds.includes(item.id));
        this.save();
        this.render();
    }
    
    // 単語帳リストのUIを更新する
    render() {
        if (!wordbookList) return;
        
        wordbookList.innerHTML = '';
        const wordCount = this.words.length;

        if (wordCount === 0) {
            wordbookList.innerHTML = '<p class="text-gray-500 text-sm p-3">単語帳に登録された単語はありません。</p>';
            wordbookButton.textContent = `単語帳 (0件)`;
            flashcardButton.disabled = true;
            quizButton.disabled = true;
            deleteSelectedButton.disabled = true;
            return;
        }

        this.words.forEach(item => {
            const li = document.createElement('li');
            li.className = 'p-3 flex justify-between items-center text-sm hover:bg-gray-50 transition duration-100';
            li.setAttribute('data-id', item.id);
            li.innerHTML = `
                <div class="flex items-center space-x-3 w-full">
                    <input type="checkbox" data-id="${item.id}" class="word-checkbox form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out">
                    <div class="flex-1">
                        <span class="font-bold text-indigo-700">${item.word}</span> 
                        <span class="text-gray-600">→</span> 
                        <span class="text-green-700">${item.translation}</span>
                    </div>
                    <button class="remove-single-button text-red-400 hover:text-red-600 p-1" data-id="${item.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            `;
            wordbookList.appendChild(li);
        });
        
        // ボタン状態の更新
        wordbookButton.textContent = `単語帳 (${wordCount}件)`;
        flashcardButton.disabled = false;
        quizButton.disabled = false;
        
        // チェックボックスのイベントリスナー設定
        document.querySelectorAll('.word-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateDeleteSelectedButton);
        });
        // 単体削除ボタンのイベントリスナー設定
        document.querySelectorAll('.remove-single-button').forEach(button => {
            button.addEventListener('click', (e) => {
                // 親の li 要素を取得し、data-id からIDを取得
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                this.remove(id);
            });
        });

        updateDeleteSelectedButton();
    }
}

const wordbook = new Wordbook();


// =========================================================================
// 3. 補助関数（画像、音声、通信）
// =========================================================================

// --- 画像認識の補助関数 ---
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
    if (!file) {
        clearImage();
        return;
    }

    if (isListening) {
        recognition.stop();
        updateMicButtonState(false);
    }
    
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

// --- 音声認識の補助関数 ---
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

function updateMicButtonState(listening) {
    isListening = listening;
    if (listening) {
        micButton.classList.remove('bg-pink-600', 'hover:bg-pink-700', 'focus:ring-pink-300');
        micButton.classList.add('bg-indigo-500', 'hover:bg-indigo-600', 'focus:ring-indigo-300', 'listening-active');
        inputStatusDiv.textContent = '👂 話してください...';
    } else {
        micButton.classList.add('bg-pink-600', 'hover:bg-pink-700', 'focus:ring-pink-300');
        micButton.classList.remove('bg-indigo-500', 'hover:bg-indigo-600', 'focus:ring-indigo-300', 'listening-active');
        if (isManualInput) {
            inputStatusDiv.textContent = '';
        } else {
            inputStatusDiv.textContent = '停止しました。翻訳を待っています...';
        }
    }
}


// --- 汎用通信/初期化の補助関数 ---
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

function initializeLanguageSelectors() {
    // 言語セレクタの初期化
    languages.forEach(lang => {
        const sourceOption = new Option(lang.name, lang.code);
        const targetOption = new Option(lang.name, lang.code);
        sourceLangSelect.add(sourceOption);
        targetLangSelect.add(targetOption);
    });
    
    // デフォルト値: 日本語 -> 英語
    sourceLangSelect.value = 'ja';
    targetLangSelect.value = 'en';
    
    // 単語帳の初期描画
    wordbook.render();
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
    
    translateText();
}

// =========================================================================
// 4. 翻訳ロジック（重要語彙抽出のみ）
// =========================================================================

/**
 * 翻訳結果と重要語彙のJSONを分離・処理し、UIに表示します。
 */
function handleTranslationResult(fullText, sourceLangCode, targetLangCode) {
    const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    let translationText = fullText.substring(0, jsonMatch ? jsonMatch.index : fullText.length).trim();
    let keyWordsData = null;

    if (jsonMatch) {
        try {
            const parsedData = JSON.parse(jsonMatch[1]);
            keyWordsData = parsedData;
        } catch (e) {
            console.error("Failed to parse key_words JSON:", e);
        }
    }
    
    // UIへの反映
    outputDiv.textContent = translationText || '翻訳結果を取得できませんでした。';
    
    // 単語帳の更新 (重要語彙を自動抽出)
    if (keyWordsData && keyWordsData.key_words && keyWordsData.key_words.length > 0) {
        keyWordsData.key_words.forEach(wordObj => {
            wordbook.add(wordObj.original, wordObj.translation, sourceLangCode, targetLangCode);
        });
        inputStatusDiv.textContent = `翻訳完了。重要語彙${keyWordsData.key_words.length}件を単語帳に自動登録しました。`;
    } else {
        inputStatusDiv.textContent = isImageMode ? '画像翻訳完了' : '翻訳完了';
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
    
    let parts = [];
    let userQuery = inputTextarea.value.trim();

    if (isImageMode && imageFile) {
        // 画像モードの場合
        inputStatusDiv.textContent = '画像認識と翻訳中...';
        
        const [metadata, data] = imageFile.split(',');
        const mimeTypeMatch = metadata.match(/:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: data
            }
        });
        
        const prompt = `この画像に含まれるテキスト（文字）を抽出し、そのテキストを${sourceLangName}と仮定して、${targetLangName}に翻訳してください。翻訳されたテキストのみを応答してください。`;
        parts.push({ text: prompt });
        
    } else {
        // テキスト/音声モードの場合
        if (userQuery.length === 0) {
            outputDiv.textContent = '翻訳結果がここに表示されます。';
            loadingIndicator.classList.add('hidden');
            if (!isListening) { inputStatusDiv.textContent = ''; }
            return;
        }
        
        inputStatusDiv.textContent = '翻訳と重要語彙抽出中...';
        
        // 重要語彙抽出のプロンプト
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
        const fullResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (fullResponseText) {
            handleTranslationResult(fullResponseText, sourceLangCode, targetLangCode);
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

// =========================================================================
// 5. 単語帳の削除機能関連
// =========================================================================

function updateDeleteSelectedButton() {
    const checkedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
    deleteSelectedButton.disabled = checkedCheckboxes.length === 0;
}

function deleteSelectedWords() {
    const checkedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
    // data-id属性から文字列としてIDを取得
    const idsToDelete = Array.from(checkedCheckboxes).map(cb => cb.getAttribute('data-id'));
    
    if (idsToDelete.length > 0) {
        wordbook.removeSelected(idsToDelete);
    }
}


// =========================================================================
// 6. フラッシュカード学習機能
// =========================================================================

function startFlashcardMode() {
    if (wordbook.words.length === 0) return;
    
    // 他の学習モードを閉じる
    quizMode.classList.add('hidden');
    wordbookContainer.classList.add('hidden');
    
    flashcardMode.classList.remove('hidden');
    currentCardIndex = 0;
    
    renderFlashcard();
}

function renderFlashcard() {
    if (wordbook.words.length === 0) {
        flashcardMode.classList.add('hidden');
        return;
    }
    
    const cardData = wordbook.words[currentCardIndex];
    cardArea.classList.remove('is-flipped');
    
    // 進捗表示を含めてHTMLを更新
    const progress = `${currentCardIndex + 1} / ${wordbook.words.length}`;
    cardFront.innerHTML = `<span class="text-3xl">${cardData.word}</span><br><span class="text-base text-gray-500 mt-2 block">${progress}</span>`;
    cardBack.innerHTML = `<span class="text-2xl">${cardData.translation}</span><br><span class="text-sm text-gray-500 mt-2 block">${cardData.sourceLang} → ${cardData.targetLang}</span>`;
}

function flipCard() {
    cardArea.classList.toggle('is-flipped');
}

function nextCard() {
    currentCardIndex = (currentCardIndex + 1) % wordbook.words.length;
    renderFlashcard();
}


// =========================================================================
// 7. 穴埋めクイズ自動生成機能
// =========================================================================

function startQuizMode() {
    if (wordbook.words.length === 0) return;
    
    // 他の学習モードを閉じる
    flashcardMode.classList.add('hidden');
    wordbookContainer.classList.add('hidden');
    
    quizMode.classList.remove('hidden');
    generateQuiz();
}

function generateQuiz() {
    if (wordbook.words.length === 0) {
        quizMode.classList.add('hidden');
        return;
    }
    
    // UIを初期化
    quizQuestion.textContent = '';
    quizInput.value = '';
    submitQuizButton.disabled = true;
    nextQuizButton.classList.add('hidden');
    quizFeedback.textContent = '';
    quizLoading.classList.remove('hidden');

    // 単語帳からランダムに問題を選ぶ
    const randomIndex = Math.floor(Math.random() * wordbook.words.length);
    const selectedWord = wordbook.words[randomIndex];
    
    generateQuizFromWord(selectedWord);
}

async function generateQuizFromWord(wordData) {
    
    const prompt = `
        以下の単語をターゲット言語(${wordData.targetLang})で穴埋めクイズとして出題するための文章を作成してください。
        
        [タスク]
        1. ターゲット言語の文章を作成し、その中に穴埋め部分（空欄）を「___」で表してください。
        2. 穴埋め部分に入る単語は、翻訳元単語「${wordData.word}」の翻訳「${wordData.translation}」と同じか、その単語の活用形、または適切な類義語として使用できるものにしてください。
        3. 回答には穴埋め単語のみを使用してください。

        [JSONスキーマ]
        {
          "quiz_sentence": "空欄を含む文章",
          "correct_answer": "空欄に入る単語"
        }
        
        このJSONスキーマのみを\`\`\`json ... \`\`\`ブロックで出力し、他の説明は不要です。
    `;
    
    const systemPrompt = `あなたは優れた言語教師であり、穴埋めクイズをJSON形式で作成します。`;
    
    const payload = {
        contents: [{ parts: [{text: prompt}] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetchWithBackoff(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        const fullResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonMatch = fullResponseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        
        if (jsonMatch) {
            currentQuiz = JSON.parse(jsonMatch[1]);
            quizQuestion.textContent = currentQuiz.quiz_sentence;
            submitQuizButton.disabled = false;
        } else {
            quizQuestion.textContent = '問題生成に失敗しました。単語帳の別の単語を試してください。';
        }
        
    } catch (error) {
        console.error("Quiz API Call Failed:", error);
        quizQuestion.textContent = '問題生成中にエラーが発生しました。';
    } finally {
        quizLoading.classList.add('hidden');
    }
}

function submitQuiz() {
    if (!currentQuiz) return;
    
    const userAnswer = quizInput.value.trim().toLowerCase();
    const correctAnswer = currentQuiz.correct_answer.trim().toLowerCase();
    
    submitQuizButton.disabled = true;
    nextQuizButton.classList.remove('hidden');

    if (userAnswer === correctAnswer) {
        quizFeedback.textContent = '✅ 正解です！';
        quizFeedback.classList.remove('text-red-600');
        quizFeedback.classList.add('text-green-600');
    } else {
        quizFeedback.textContent = `❌ 不正解です。正解は「${currentQuiz.correct_answer}」でした。`;
        quizFeedback.classList.remove('text-green-600');
        quizFeedback.classList.add('text-red-600');
    }
}


// =========================================================================
// 8. イベントリスナーと初期化
// =========================================================================

window.onload = () => {
    // 既存機能の初期化
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
    
    // 単語帳/削除機能のイベントリスナー
    wordbookButton.addEventListener('click', () => {
        wordbookContainer.classList.toggle('hidden');
        flashcardMode.classList.add('hidden');
        quizMode.classList.add('hidden');
    });
    deleteSelectedButton.addEventListener('click', deleteSelectedWords);

    // フラッシュカード機能のイベントリスナー
    flashcardButton.addEventListener('click', startFlashcardMode);
    flipCardButton.addEventListener('click', flipCard);
    nextCardButton.addEventListener('click', nextCard);

    // クイズ機能のイベントリスナー
    quizButton.addEventListener('click', startQuizMode);
    submitQuizButton.addEventListener('click', submitQuiz);
    nextQuizButton.addEventListener('click', generateQuiz);
    
    // 画面ロード時に単語帳のレンダリングを行い、学習ボタンの有効/無効を判定
    wordbook.render();
};