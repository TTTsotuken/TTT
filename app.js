const startRec = document.getElementById('startRec');
const inputText = document.getElementById('inputText');
const translateBtn = document.getElementById('translateBtn');
const translatedText = document.getElementById('translatedText');
const wordList = document.getElementById('wordList');
const speakBtn = document.getElementById('speakBtn');
const makeQuiz = document.getElementById('makeQuiz');
const quizArea = document.getElementById('quizArea');
const targetLang = document.getElementById('targetLang');

let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (e) => {
    const t = e.results[0][0].transcript;
    inputText.value += (inputText.value ? ' ' : '') + t;
  }
  recognition.onerror = (e) => { console.error('Speech error', e); alert('音声入力でエラーが発生しました。コンソールを確認してください。'); }
}

startRec.addEventListener('click', () => {
  if (!recognition) { alert('このブラウザは音声入力に未対応です。Chrome等でお試しください。'); return }
  recognition.start();
});

translateBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) { alert('テキストを入力してください'); return }
  translateBtn.disabled = true;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({text, target: targetLang.value})
    });
    const data = await res.json();
    translatedText.textContent = data.translated || '(翻訳失敗)';
    wordList.innerHTML = '';
    (data.words || []).forEach(w => {
      const li = document.createElement('li');
      li.textContent = `${w.word} — EIKEN: ${w.level} — 訳: ${w.meaning || '-'}`;
      wordList.appendChild(li);
    });
    window._last_words = data.words || [];
  } catch (e) {
    alert('翻訳エラーが発生しました。コンソールを確認してください。');
    console.error(e);
  } finally {
    translateBtn.disabled = false;
  }
});

speakBtn.addEventListener('click', () => {
  const text = translatedText.textContent || inputText.value;
  if (!('speechSynthesis' in window)) { alert('このブラウザは読み上げに未対応です。'); return }
  const utter = new SpeechSynthesisUtterance(text);
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
  if (!questions.length) { quizArea.textContent = '出題できる問題がありません。単語に日本語訳が含まれている必要があります。'; return }
  questions.forEach((q, idx) => {
    const container = document.createElement('div');
    container.className = 'question';
    const h = document.createElement('h4');
    h.textContent = `${idx+1}. ${q.word} (EIKEN: ${q.level})`;
    container.appendChild(h);

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt;
      btn.style.marginRight = '8px';
      btn.addEventListener('click', () => {
        if (opt === q.answer) {
          btn.style.background = '#16a34a';
          alert('正解！');
        } else {
          btn.style.background = '#dc2626';
          alert('不正解… 正答: ' + q.answer);
        }
      });
      container.appendChild(btn);
    });

    quizArea.appendChild(container);
  });
}
