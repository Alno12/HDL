# HDL 40+ — Acompanhamento pessoal

App pessoal para acompanhar hábitos que ajudam a subir o HDL: minutos de exercício em zona de frequência cardíaca, alimentação (peixe, castanhas, aveia, azeite), peso, FC de repouso e exames de lipidograma.

Todos os dados ficam **salvos localmente no navegador** (localStorage) — não há servidor nem conta. Use a exportação (JSON/CSV) em Configurações para fazer backup.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview   # para conferir o build antes de publicar
```

Os arquivos finais ficam em `dist/`.

## Publicar no Netlify

**Opção A — pelo painel do Netlify (mais simples):**
1. Suba este repositório para o GitHub.
2. No Netlify: "Add new site" → "Import an existing project" → escolha o repositório.
3. Configurações de build (o `netlify.toml` já define isso, mas confira):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy.

**Opção B — Netlify CLI:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

## Primeiro uso

O app abre com **12 semanas de dados de exemplo** para você ver os gráficos e estatísticas funcionando. Quando for usar de verdade, vá em **⚙ Configurações → "Zerar dados (começar meu uso real)"**.

## Estrutura

```
src/
  main.jsx   → ponto de entrada React
  App.jsx    → aplicativo inteiro (telas, componentes, cálculos, persistência)
index.html
vite.config.js
netlify.toml
```

Projeto de arquivo único por simplicidade — é um app pessoal, não uma base de código de equipe.
