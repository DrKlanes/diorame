
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import { LanguageProvider } from "./i18n";
  import { installAnalytics } from "./analytics/analytics";
  import "./fonts";
  import "./index.css";

  // Una sola vez, antes del primer render: registra los listeners de salida
  // (visibilitychange / pagehide) que emiten session_depth. No envía nada aquí.
  installAnalytics();

  createRoot(document.getElementById("root")!).render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
