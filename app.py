from flask import Flask, render_template, request, jsonify
import requests
import csv
import re
import os

app = Flask(__name__)

# Use LibreTranslate public endpoint by default.
TRANSLATE_API = os.getenv("TRANSLATE_API", "https://libretranslate.de/translate")

# Load EIKEN CSV data (word,meaning,level)
def load_eiken_data():
    eiken = {}
    path = os.path.join(os.path.dirname(__file__), "eiken_wordlist.csv")
    if not os.path.exists(path):
        return eiken
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            w = row.get("word","").strip().lower()
            if not w:
                continue
            eiken[w] = {
                "meaning": row.get("meaning","").strip(),
                "level": row.get("level","").strip()
            }
    return eiken

EIKEN_DATA = load_eiken_data()

word_re = re.compile(r"[A-Za-z']+")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/translate", methods=["POST"])
def api_translate():
    body = request.get_json() or {}
    text = body.get("text","").strip()
    target = body.get("target","en")
    if not text:
        return jsonify({"error":"no text"}), 400

    payload = {
        "q": text,
        "source": "auto",
        "target": target,
        "format": "text"
    }
    try:
        r = requests.post(TRANSLATE_API, json=payload, timeout=10)
        r.raise_for_status()
        data = r.json()
        translated = data.get("translatedText") or data.get("translated_text") or ""
    except Exception as e:
        translated = ""
        print("translate error:", e)

    # Extract words from translated text if English, otherwise from text
    source_for_words = translated if target.startswith("en") else translated
    words = word_re.findall(source_for_words)
    # normalize
    seen = []
    for w in words:
        lw = w.lower()
        if lw not in seen and len(lw) > 1:
            seen.append(lw)

    annotated = []
    for w in seen:
        info = EIKEN_DATA.get(w, {"meaning":"", "level":"Unknown"})
        annotated.append({"word": w, "meaning": info.get("meaning",""), "level": info.get("level","Unknown")})

    return jsonify({"translated": translated, "words": annotated})

@app.route("/api/quiz", methods=["POST"])
def api_quiz():
    body = request.get_json() or {}
    words = body.get("words", [])
    num = int(body.get("num", 5))
    # words: list of {word, meaning, level}
    candidates = [w for w in words if w.get("meaning")]
    if not candidates:
        return jsonify({"questions": []})
    import random
    questions = []
    pool = [v["meaning"] for v in EIKEN_DATA.values() if v.get("meaning")]
    for w in random.sample(candidates, min(num, len(candidates))):
        correct = w["meaning"]
        distractors = set()
        attempts = 0
        while len(distractors) < 3 and attempts < 200:
            d = random.choice(pool)
            if d != correct:
                distractors.add(d)
            attempts += 1
        opts = list(distractors) + [correct]
        random.shuffle(opts)
        questions.append({
            "word": w["word"],
            "level": w.get("level","Unknown"),
            "options": opts,
            "answer": correct
        })
    return jsonify({"questions": questions})

if __name__ == "__main__":
    # Use PORT env for deployment platforms
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
