# Translation Quiz App (Static, GitHub Pages)

This is a **frontend-only** version of the Translation + Quiz app designed to run on GitHub Pages
(or any static hosting). It performs translation from the browser using a public translation endpoint.

## How it works
- The page sends a POST request to a translation endpoint (default: https://libretranslate.de/translate).
- It receives translated text and extracts words (alphabetic tokens).
- It annotates words with a small built-in EIKEN map and builds multiple-choice quizzes.

## Important: CORS (Cross-Origin Resource Sharing)
Many public translation endpoints **do not** allow cross-origin POST requests from browsers.
If you see a CORS error in the browser console like:
```
Access to fetch at 'https://libretranslate.de/translate' from origin 'https://your-site.github.io' has been blocked by CORS policy
```
it means the endpoint does not send `Access-Control-Allow-Origin` and your request was blocked.

### Options if you get CORS errors
1. **Try another public instance**:
   - `https://libretranslate.de/translate` often works but may be rate-limited.
   - Replace ENDPOINT in `app.js` with the working instance URL.

2. **Deploy a tiny proxy (recommended)**:
   - Deploy a simple proxy that forwards POST requests to LibreTranslate and adds:
     `Access-Control-Allow-Origin: *`
   - Two quick proxy options:
     - **Cloudflare Workers** (fast and free). Example worker code is below.
     - **Render (or Vercel)**: deploy a tiny serverless function that proxies requests.

3. **Use your own LibreTranslate server**:
   - Self-host LibreTranslate (Docker) and enable CORS.

## Example Cloudflare Worker (proxy)
```javascript
// Cloudflare Worker: proxy and add CORS
addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = 'https://libretranslate.de/translate'; // target
  const req = new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  const res = await fetch(req);
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': res.headers.get('Content-Type') || 'application/json'
    }
  });
}
```

## Deploy to GitHub Pages
1. Create a repository (e.g. translation-quiz-frontend).
2. Put these files at the repository root: `index.html`, `app.js`, `style.css`, `README.md`.
3. Commit & push to GitHub.
4. In repository settings → Pages → Source: `main` branch / root.
5. Save. After a minute, your site will be available at `https://<youruser>.github.io/<repo>/`.

## Troubleshooting
- If translation fails: check browser console for CORS or network errors.
- If speech recognition doesn't work: use Chrome and allow microphone access.
- To change the translation endpoint, edit `ENDPOINT` at the top of `app.js`.

