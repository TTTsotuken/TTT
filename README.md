# Translation Quiz App (Flask)

This is a simple translation + quiz web app (Flask) that:
- translates text via LibreTranslate
- extracts words from translations
- shows EIKEN (英検) level per word based on `eiken_wordlist.csv`
- generates multiple-choice quizzes using the extracted words

## Quick start (local)

1. Python 3.9+ is required.
2. Create and activate virtualenv:
   ```
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # mac / linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run:
   ```
   python app.py
   ```
5. Open: http://127.0.0.1:5000

## Deploy to Render (example)

1. Push this repo to GitHub.
2. Create a new Web Service on Render and connect the repo.
3. Build Command: `pip install -r requirements.txt`
   Start Command: `python app.py`

## Notes

- This project uses the public LibreTranslate endpoint by default (`https://libretranslate.de/translate`).
  If you want to use another endpoint or API key, set the `TRANSLATE_API` environment variable.
- No database is required for this ZIP; everything runs from files.

