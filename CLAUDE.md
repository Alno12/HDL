# HDL 40+ — Contexto do projeto

App pessoal de acompanhamento de HDL (colesterol): treinos em zona de FC,
alimentação, peso/FC de repouso diários e exames de sangue. Interface em
**pt-BR**, mobile-first (largura máx. 480px).

## Stack e arquitetura

- React 18 + Vite. **Sem** TypeScript, router, CSS externo ou biblioteca de UI.
- Todo o app vive em `src/App.jsx` (~1.000 linhas): telas, modais, gráficos SVG
  próprios (`Line`, `Bars`), cálculos e persistência. Refatoração para
  módulos está planejada (item 11 de `docs/MELHORIAS.md`) — até lá, edite
  esse arquivo com cuidado e mantenha o padrão existente.
- Estilos inline via objetos JS. Tokens de design no objeto `C`
  (cores: `mist`, `card`, `ink`, `zone`, `sea`, `mute`, `line`...).
  Fontes: Sora (títulos/números) e IBM Plex Sans (texto), hoje via Google Fonts.

## Estado e persistência

- `localStorage`, chave `hdl-app-state-v3`.
- Shape: `{ goals, workouts[], exams[], days{date→porções}, vitals{date→{weight,restHr}} }`.
- `vitals` é **diário** (era semanal em `weeks`; `migrateState()` converte
  backups antigos — nunca quebre essa migração).
- Datas sempre como string `YYYY-MM-DD`. Atenção: `todayStr()` hoje usa UTC
  (bug conhecido, item 2 de `docs/MELHORIAS.md`).

## Como verificar mudanças

```bash
npm install                 # se necessário
npx vite build              # deve passar sem erros
npx vite --port 5183        # servidor de dev
```

Screenshots mobile com Playwright (Chromium pré-instalado, **não** rodar
`playwright install`):

```js
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
```

Verifique sempre: as 4 abas (Home, Tendências, Registros, Exames), os modais
afetados e o console sem erros. Ao mexer em persistência, teste também a
migração: semear um estado antigo no `localStorage` e recarregar.

## Convenções

- Textos de UI e commits em português.
- Não commitar `node_modules/` nem `dist/` (já no `.gitignore`).
- Trabalhar apenas no branch designado da sessão; nunca push direto em `main`.
- Roadmap de melhorias priorizado: `docs/MELHORIAS.md`.
- Organização da equipe de subagentes: `docs/EQUIPES.md`.
