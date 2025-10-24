// クライアント側ロジック: 音声入力（Web Speech API）、翻訳API呼び出し、単語表示、クイズ表示
recognition.lang = 'ja-JP';
recognition.interimResults = false;
recognition.maxAlternatives = 1;
recognition.onresult = (e) => {
const t = e.results[0][0].transcript;
inputText.value += (inputText.value ? ' ' : '') + t;
}
recognition.onerror = (e) => { console.error('Speech error', e); }
}


startRec.addEventListener('click', () => {
if (!recognition) { alert('このブラウザは音声入力に未対応です。Chrome等でお試しください。'); return }
recognition.start();
});


translateBtn.addEventListener('click', async () => {
const text = inputText.value.trim();
if (!text) { alert('テキストを入力してください'); return }
const res = await fetch('/api/translate', {
method: 'POST', headers: {'Content-Type':'application/json'},
body: JSON.stringify({text, target: targetLang.value})
});
const data = await res.json();
translatedText.textContent = data.translated || '(翻訳失敗)';
// 単語表示
wordList.innerHTML = '';
data.words.forEach(w => {
const li = document.createElement('li');
li.textContent = `${w.word} — EIKEN: ${w.level} — Jp: ${w.jp || '-'} `;
wordList.appendChild(li);
});
// keep last words on window for quiz
window._last_words = data.words;
});


speakBtn.addEventListener('click', () => {
const text = translatedText.textContent || inputText.value;
if (!('speechSynthesis' in window)) { alert('このブラウザは読み上げに未対応です。'); return }
const utter = new SpeechSynthesisUtterance(text);
// 言語を targetLang に合わせる
utter.lang = targetLang.value === 'en' ? 'en-US' : 'ja-JP';
window.speechSynthesis.speak(utter);
});


makeQuiz.addEventListener('click', async () => {
const words = window._last_words || [];
const num = parseInt(document.getElementById('numQ').value || '5');
const res = await fetch('/api/quiz', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({words, num})});
const data = await res.json();
renderQuiz(data.questions || []);
});


function renderQuiz(questions){
quizArea.innerHTML = '';
if (!questions.length) { quizArea.textContent = '出題できる問題がありません。単語リストに日本語訳がある単語を含めてください。'; return }
questions.forEach((q, idx) => {
const container = document.createElement('div');
container.className = 'question';
const h = document.createElement('h4');
h.textContent = `${idx+1}. ${
