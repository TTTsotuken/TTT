from flask import Flask, render_template, request, jsonify
def api_translate():
body = request.json
text = body.get('text','')
target = body.get('target','en')
translated = translate_text(text, source='auto', target=target)
words = extract_words(translated if target=='en' else text if target!='en' else translated)


annotated = []
for w in words:
info = eiken_map.get(w, {'level':'Unknown','jp':''})
annotated.append({'word': w, 'level': info['level'], 'jp': info['jp']})


return jsonify({'translated': translated, 'words': annotated})




@app.route('/api/quiz', methods=['POST'])
def api_quiz():
body = request.json
words = body.get('words', []) # list of {'word','level','jp'}
num_questions = int(body.get('num', 5))


# use only words that have japanese translation in our CSV
candidates = [w for w in words if w.get('jp')]
if not candidates:
# fall back: build from words and ask for meaning via remote translation
# For simplicity, return empty
return jsonify({'questions': []})


questions = []
pool = list(eiken_map.keys())


for i, w in enumerate(random.sample(candidates, min(num_questions, len(candidates)))):
correct = w['jp']
# pick 3 distractors
distractors = set()
attempts = 0
while len(distractors) < 3 and attempts < 50:
c = random.choice(pool)
if c != w['word'] and eiken_map.get(c,{}).get('jp') and eiken_map[c]['jp'] != correct:
distractors.add(eiken_map[c]['jp'])
attempts += 1
options = list(distractors) + [correct]
random.shuffle(options)
questions.append({
'word': w['word'],
'level': w.get('level','Unknown'),
'options': options,
'answer': correct
})


return jsonify({'questions': questions})




if __name__ == '__main__':
app.run(debug=True)
