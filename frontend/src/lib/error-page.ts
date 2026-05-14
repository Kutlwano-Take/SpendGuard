export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SpendGuard is unavailable</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f1220;
        color: #f3f4f6;
        font: 15px/1.5 Inter, system-ui, sans-serif;
        padding: 24px;
      }
      .card {
        width: min(420px, 100%);
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.6);
      }
      h1 { margin: 0 0 12px; font-size: 1.6rem; }
      p { margin: 0 0 20px; color: #d1d5db; }
      a, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 6px;
        padding: 10px 18px;
        border-radius: 999px;
        border: 0;
        text-decoration: none;
        font: inherit;
        cursor: pointer;
      }
      .primary { background: linear-gradient(135deg, #f4d35e, #8b5cf6); color: #151521; }
      .secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #f3f4f6;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>SpendGuard could not load</h1>
      <p>The frontend hit an unexpected issue. Refresh the page or head back home.</p>
      <div>
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
