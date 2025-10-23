// common.js の Wordbook, API_URL, fetchWithBackoff が利用可能

const quizQuestion = document.getElementById('quiz-question');
const quizInput = document.getElementById('quiz-input');
const submitQuizButton = document.getElementById('submit-quiz-button');
const quizFeedback = document.getElementById('quiz-feedback');
const nextQuizButton = document.getElementById('next-quiz-button');
const quizLoading = document.getElementById('quiz-loading');
const noWordsMessage = document.getElementById('no-words-message');
const quizContent = document.getElementById('quiz-content');

let currentQuiz = null;

// =========================================================================
// 1. クイズ生成ロジック
// =========================================================================

function startQuizMode() {
    if (wordbook.words.length === 0) {
        noWordsMessage.classList.remove('hidden');
        quizContent.classList.add('hidden');
        return;
    }
    
    noWordsMessage.classList.add('hidden');
    quizContent.classList.remove('hidden');
    generateQuiz();
}

function generateQuiz() {
    if (wordbook.words.length === 0) return;
    
    // UIを初期化
    quizQuestion.innerHTML = '';
    quizInput.value = '';
    quizInput.disabled = true;
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
        const response = await fetchWithBackoff(API_URL, {
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
            quizInput.disabled = false;
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

// =========================================================================
// 2. 解答判定ロジック
// =========================================================================

function submitQuiz() {
    if (!currentQuiz) return;
    
    const userAnswer = quizInput.value.trim().toLowerCase();
    const correctAnswer = currentQuiz.correct_answer.trim().toLowerCase();
    
    quizInput.disabled = true;
    submitQuizButton.disabled = true;
    nextQuizButton.classList.remove('hidden');

    if (userAnswer === correctAnswer) {
        quizFeedback.textContent = '✅ 正解です！';
        quizFeedback.classList.remove('text-red-600');
        quizFeedback.classList.add('text-green-600');
    } else {
        // 空欄を正解で埋める
        const filledQuestion = currentQuiz.quiz_sentence.replace('___', `**${currentQuiz.correct_answer}**`);
        quizFeedback.innerHTML = `❌ 不正解です。<br>正解は「**${currentQuiz.correct_answer}**」でした。<br>全文: ${filledQuestion}`;
        quizFeedback.classList.remove('text-green-600');
        quizFeedback.classList.add('text-red-600');
    }
}

// =========================================================================
// 3. イベントリスナー設定
// =========================================================================

window.addEventListener('load', () => {
    submitQuizButton.addEventListener('click', submitQuiz);
    nextQuizButton.addEventListener('click', generateQuiz);
    
    // Enterキーで解答を送信
    quizInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !submitQuizButton.disabled) {
            submitQuiz();
        }
    });

    // 画面ロード時にクイズを開始
    startQuizMode();
});