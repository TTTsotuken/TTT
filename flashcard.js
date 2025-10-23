// common.js の Wordbook が利用可能

const flashcardArea = document.getElementById('flashcard-area');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const flipCardButton = document.getElementById('flip-card-button');
const nextCardButton = document.getElementById('next-card-button');
const noWordsMessage = document.getElementById('no-words-message');
const controls = document.getElementById('controls');

let currentCardIndex = 0;

// =========================================================================
// 1. 学習ロジック
// =========================================================================

function startFlashcardMode() {
    const words = wordbook.words;
    if (words.length === 0) {
        noWordsMessage.classList.remove('hidden');
        flashcardArea.classList.add('hidden');
        controls.classList.add('hidden');
        return;
    }
    
    noWordsMessage.classList.add('hidden');
    flashcardArea.classList.remove('hidden');
    controls.classList.remove('hidden');
    
    currentCardIndex = 0;
    renderFlashcard();
}

function renderFlashcard() {
    const words = wordbook.words;
    if (words.length === 0) {
        startFlashcardMode(); // 単語がない場合はメッセージを表示
        return;
    }
    
    const cardData = words[currentCardIndex];
    
    // カードを裏返す前にリセット
    flashcardArea.classList.remove('is-flipped');
    
    // 進捗表示を含めてHTMLを更新
    const progress = `${currentCardIndex + 1} / ${words.length}`;
    cardFront.innerHTML = `<span class="text-3xl">${cardData.word}</span><br><span class="text-base text-gray-500 mt-2 block">${progress}</span>`;
    cardBack.innerHTML = `<span class="text-2xl">${cardData.translation}</span><br><span class="text-sm text-gray-500 mt-2 block">${cardData.sourceLang.toUpperCase()} → ${cardData.targetLang.toUpperCase()}</span>`;
}

function flipCard() {
    flashcardArea.classList.toggle('is-flipped');
}

function nextCard() {
    currentCardIndex = (currentCardIndex + 1) % wordbook.words.length;
    renderFlashcard();
}

// =========================================================================
// 2. イベントリスナー設定
// =========================================================================

window.addEventListener('load', () => {
    flipCardButton.addEventListener('click', flipCard);
    nextCardButton.addEventListener('click', nextCard);
    
    // 画面ロード時にフラッシュカード学習を開始
    startFlashcardMode();
});