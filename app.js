// Translation Quiz (Frontend-only) for GitHub Pages
// - Uses a public translation endpoint (LibreTranslate) directly from the browser.
// - IMPORTANT: many public endpoints block cross-origin POSTs. If you get a CORS error,
//   follow README instructions to deploy a tiny proxy (Cloudflare Worker or Render) and set ENDPOINT accordingly.

// ============ CONFIG ============
// You can change ENDPOINT to your own proxy that adds Access-Control-Allow-Origin: *
// Examples:
// - Public: https://libretranslate.de/translate  (may or may not allow CORS)
// - Proxy (recommended if CORS blocked): https://your-proxy.example.com/translate
const ENDPOINT = "https://libretranslate.de/translate";

// Minimum built-in EIKEN word map (used for quizzes). You can expand this list.
const EIKEN_MAP = {
  "apple": {meaning:"りんご", level:"5級"},
  "book": {meaning:"本", level:"5級"},
  "cat": {meaning:"猫", level:"5級"},
  "dog": {meaning:"犬", level:"5級"},
  "beautiful": {meaning:"美しい", level:"4級"},
  "computer": {meaning:"コンピュータ", level:"3級"},
  "engineer": {meaning:"技術者", level:"準2級"},
  "efficient": {meaning:"効率的な", level:"2級"},
  "artificial": {meaning:"人工の", level:"準1級"},
  "sustainable": {meaning:"持続可能な", level:"1級"}
};

// ============ UI REFS ============
const inputText = document.getElementById('inputText');
const translateBtn = document.getElementById('translateBtn');
const translatedText = document.getElementById('translatedText');
const wordList = document.getElementById('wordList');
const speakBtn = document.getElementById('speakBtn');
const makeQuiz = document.getElementById('makeQuiz');
const quizArea = document.getElementById('quizArea');
const targetLang = document.getElementById('targetLang');
const numQ = document.getElementById('numQ');
const startRec = document.getElementById('startRec');
const endpointDisplay = document.getElementById('endpointDisplay');
endpointDisplay.textContent = ENDPOINT;

// ============ Speech Recognition (optional) ============
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
  recognition.onerror = (e) => { console.error('Speech error', e); alert('音声入力でエラーが発生しました。'); }
}
startRec.addEventListener('click', () => {
  if (!recognition) { alert('このブラウザは音声入力に未対応です。Chrome等でお試しください。'); return }
  recognition.start();
});

// ============ Helpers ============
function extractWords(text){
  const re = /[A-Za-z']+/g;
  const arr = text.match(re) || [];
  const seen = [];
  for(const w of arr){
    const lw = w.toLowerCase();
    if(lw.length>1 && !seen.includes(lw)) seen.push(lw);
  }
  return seen;
}

async function translateText(text, target){
  const payload = { q: text, source: "auto", target: target, format: "text" };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error('HTTP '+res.status+' '+t);
    }
    const data = await res.json();
    // LibreTranslate returns { translatedText: "..." }
    return data.translatedText || data.translated || data.result || "";
  } catch(err){
    console.error("translate error:", err);
    throw err;
  }
}

function annotateWords(words){
  return words.map(w=>{
    const info = EIKEN_MAP[w] || {meaning:"", level:"Unknown"};
    return {word:w, meaning:info.meaning, level:info.level};
  });
}

// ============ UI Logic ============
translateBtn.addEventListener('click', async ()=>{
  const text = inputText.value.trim();
  if(!text){ alert('テキストを入力してください'); return; }
  translateBtn.disabled = true;
  translatedText.textContent = '翻訳中...';
  try {
    const translated = await translateText(text, targetLang.value);
    translatedText.textContent = translated || '(翻訳が空です)';
    const words = extractWords(translated);
    const annotated = annotateWords(words);
    wordList.innerHTML = '';
    annotated.forEach(w=>{
      const li = document.createElement('li');
      li.textContent = `${w.word} — EIKEN: ${w.level} — 訳: ${w.meaning || '-'}`;
      wordList.appendChild(li);
    });
    window._last_words = annotated;
  } catch(e){
    translatedText.textContent = '(翻訳エラー: コンソールを確認)';
    alert('翻訳に失敗しました。CORSエラーか、エンドポイントがブラウザからのPOSTを許可していない可能性があります。READMEの対処法を確認してください。');
  } finally {
    translateBtn.disabled = false;
  }
});

speakBtn.addEventListener('click', ()=>{
  const text = translatedText.textContent || inputText.value;
  if(!('speechSynthesis' in window)){ alert('読み上げに未対応のブラウザです'); return; }
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = targetLang.value==='en' ? 'en-US' : 'ja-JP';
  window.speechSynthesis.speak(utt);
});

makeQuiz.addEventListener('click', ()=>{
  const words = window._last_words || [];
  const n = parseInt(numQ.value || '5');
  if(!words.length){ alert('まず翻訳して単語を抽出してください'); return; }
  const pool = words.slice();
  // fill up to n with available words
  const questions = [];
  for(let i=0;i<Math.min(n,pool.length);i++){
    const w = pool[i];
    const correct = w.meaning || '(訳がありません)';
    // create distractors from EIKEN_MAP values
    const meanings = Object.values(EIKEN_MAP).map(v=>v.meaning).filter(m=>m && m!==correct);
    // pick 3 distractors
    const opts = [];
    while(opts.length<3 && meanings.length){
      const idx = Math.floor(Math.random()*meanings.length);
      const m = meanings.splice(idx,1)[0];
      if(!opts.includes(m)) opts.push(m);
    }
    opts.push(correct);
    // shuffle
    for(let j=opts.length-1;j>0;j--){ const k=Math.floor(Math.random()*(j+1)); [opts[j],opts[k]]=[opts[k],opts[j]]; }
    questions.push({word:w.word, level:w.level, options:opts, answer:correct});
  }
  renderQuiz(questions);
});

function renderQuiz(questions){
  quizArea.innerHTML = '';
  if(!questions.length){ quizArea.textContent = '出題できる問題がありません。'; return; }
  questions.forEach((q,idx)=>{
    const div = document.createElement('div');
    div.className = 'question';
    const h = document.createElement('h4');
    h.textContent = `${idx+1}. ${q.word} (EIKEN: ${q.level})`;
    div.appendChild(h);
    q.options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.type='button';
      btn.textContent = opt;
      btn.style.marginRight='8px';
      btn.addEventListener('click', ()=>{
        if(opt===q.answer){
          btn.style.background='#16a34a';
          alert('正解！');
        } else {
          btn.style.background='#dc2626';
          alert('不正解… 正答: ' + q.answer);
        }
      });
      div.appendChild(btn);
    });
    quizArea.appendChild(div);
  });
}

// expose for debugging
window._config = { endpoint: ENDPOINT };
