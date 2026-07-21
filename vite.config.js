import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Atualiza o service worker sozinho quando há build novo — evita
      // o usuário ficar preso numa versão antiga por cache do PWA.
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "HDL 40+",
        short_name: "HDL 40+",
        description:
          "Acompanhamento pessoal de HDL: treinos em zona de FC, alimentação, peso/FC de repouso e exames de sangue.",
        lang: "pt-BR",
        theme_color: "#F2F2F7",
        background_color: "#F2F2F7",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // Sem chamadas de rede/API no app (tudo é local) — o precache padrão
      // do plugin já cobre o app shell (HTML/JS/CSS buildados). Não há
      // necessidade de runtime caching customizado.
      devOptions: {
        // Permite testar o SW também em `vite dev`, sem afetar o build.
        enabled: true,
        type: "module",
      },
    }),
  ],
});
