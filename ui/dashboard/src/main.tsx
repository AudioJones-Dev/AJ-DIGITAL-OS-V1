import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    background-color: #0f172a;
    color: #e2e8f0;
  }
  code {
    font-family: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace;
    font-size: 12px;
    color: #94a3b8;
  }
  a { color: #60a5fa; }
  a:hover { color: #93bbfd; }
  ::selection { background: #2563eb33; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
`;

// Inject global styles
const style = document.createElement("style");
style.textContent = globalCSS;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
