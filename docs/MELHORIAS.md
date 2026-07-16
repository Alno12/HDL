# HDL 40+ · Plano de melhorias

Análise do estado atual do aplicativo e das melhorias com maior potencial de
impacto, organizadas por prioridade. O app hoje é um SPA React de arquivo
único (`src/App.jsx`, ~1.000 linhas), com dados salvos apenas no
`localStorage` do navegador.

---

## 🔴 Prioridade alta — risco de perder dados ou de registrar errado

### 1. Proteção real dos dados (hoje tudo vive só no `localStorage`)

Este é o maior risco do app. Todo o histórico — treinos, medidas, exames —
existe em um único navegador. É perdido se o usuário:

- limpar os dados do navegador (ou o iOS/Android limpar sozinho por falta de espaço);
- trocar de celular;
- usar o app em modo anônimo sem perceber.

**O que fazer, em ordem de esforço:**

| Etapa | Esforço | Ganho |
|---|---|---|
| Lembrete de backup automático (aviso mensal para exportar o JSON) | baixo | evita a perda silenciosa |
| Migrar de `localStorage` para IndexedDB + API de persistência (`navigator.storage.persist()`) | baixo | o navegador para de apagar os dados sozinho |
| Sincronização em nuvem (Supabase/Firebase, login simples) | alto | multi-dispositivo, backup contínuo |

São dados de saúde: se houver sincronização em nuvem, documentar claramente
onde os dados ficam e criptografar em repouso.

### 2. Corrigir o bug de fuso horário na data "de hoje"

`todayStr()` usa `new Date().toISOString()`, que retorna a data em **UTC**.
No Brasil (UTC−3), a partir das **21h** o app considera que já é o dia
seguinte: o peso "de hoje" cai no dia errado, o treino da noite vai para
amanhã e a semana pode virar mais cedo.

```js
// hoje (errado à noite no Brasil):
const todayStr = () => new Date().toISOString().slice(0, 10);

// correção (data local):
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
```

É uma correção pequena com efeito direto na confiabilidade de **todos** os
registros feitos à noite — justamente o horário em que muita gente anota o dia.

### 3. Validação dos dados de entrada

Hoje os campos aceitam qualquer número: peso de 800 kg, FC de 15 bpm, treino
com data futura, exame com HDL maior que o colesterol total. Uma digitação
errada polui os gráficos e as médias por semanas.

- Faixas de sanidade com aviso (não bloqueio): peso 30–250 kg, FC 30–220 bpm, minutos 1–600.
- `max={today}` no campo de data do treino (os outros modais já têm, o de treino não).
- Alerta se o novo peso diferir do último em mais de ~3 kg ("confirma esse valor?").
- Consistência de exame: HDL < CT, TG > 0.

---

## 🟠 Prioridade média — muda a experiência de uso diário

### 4. Transformar em PWA instalável e offline

O app é de uso diário no celular, mas hoje é só uma página web: sem ícone na
tela inicial, sem funcionar offline garantido, e as fontes vêm do Google
Fonts (rede). Falta pouco:

- `manifest.json` com ícone e cores (o `theme-color` já existe no HTML);
- service worker (plugin `vite-plugin-pwa` resolve com pouca configuração);
- servir as fontes Sora e IBM Plex Sans localmente (hoje um `@import` de CDN dentro de `<style>`).

Com isso o app abre instantaneamente, funciona no avião e ganha cara de app de verdade.

### 5. Lembretes diários

Agora que peso e FC são registros **diários**, o app deveria lembrar o
usuário. Sem lembrete, registro diário vira registro esporádico.

- Notificação local do PWA ("Bom dia! Registre seu peso e FC de repouso").
- Indicador visível na Home quando o dia ainda está sem medida (ex.: um ponto no card "Medidas de hoje").

### 6. Reduzir a fricção do registro

Cada toque a menos aumenta a adesão:

- `inputMode="decimal"` / `inputMode="numeric"` nos campos numéricos — abre o teclado certo no celular (hoje `type="number"` sozinho não garante isso no iOS);
- pré-preencher o peso com o último valor registrado (normalmente varia pouco);
- botões de minutos frequentes no modal de treino (30 / 40 / 45 / 60) além do campo livre;
- lembrar o último tipo de treino usado em vez de um padrão fixo.

### 7. Onboarding: dados de exemplo confundem o uso real

Hoje um usuário novo abre o app já com 12 semanas de dados falsos
(`demoState()`), e o botão de zerar fica escondido nas configurações. Risco
real de misturar dados de demonstração com registros verdadeiros.

- Na primeira abertura, perguntar: **"Explorar com dados de exemplo"** ou **"Começar meu acompanhamento"**.
- Banner permanente enquanto os dados de demonstração estiverem carregados ("Você está vendo dados de exemplo — toque para começar do zero").

---

## 🟡 Prioridade média — análise e motivação

### 8. Gráficos diários de peso e FC (hoje só a média semanal)

Os dados agora são diários, mas os gráficos de tendência ainda mostram uma
média por semana. Com dados diários dá para mostrar:

- pontos diários com **média móvel de 7 dias** por cima (padrão em apps de peso — a linha suave é o que importa, os pontos mostram a flutuação normal);
- seletor de período (4 semanas / 3 meses / 1 ano / tudo — hoje é fixo em 12 semanas, e um usuário de longo prazo perde o histórico antigo nos gráficos).

### 9. Conectar o esforço ao resultado (a razão de existir do app)

O objetivo do app é subir o HDL, mas nada liga os exames ao que foi feito
entre eles. Ideias de alto valor:

- no card de cada exame, mostrar o resumo do período desde o exame anterior ("média de 132 min/sem em zona · adesão alimentar 84% · −1,7 kg");
- linha vertical no gráfico de minutos marcando as datas dos exames;
- projeção simples: "no ritmo atual, próxima meta de exame sugerida para outubro".

### 10. Importar dados do relógio / apps de treino

FC média e minutos em zona normalmente já existem no smartwatch. Digitar de
novo é retrabalho e fonte de erro.

- Importação de CSV do Strava/Garmin/Polar (esforço baixo, sem API);
- Integração com Google Fit / Apple Health via PWA é limitada — se um dia houver app nativo, é o caminho natural.

---

## 🔵 Dívida técnica — não muda o produto, mas destrava tudo acima

### 11. Quebrar o `App.jsx`

Um único arquivo de ~1.000 linhas com estado, cálculos, gráficos, modais e
telas. Funciona, mas qualquer melhoria acima fica mais cara. Divisão natural,
sem mudar comportamento:

```
src/
  lib/dates.js        # mondayOf, addDays, fmtBR…
  lib/stats.js        # weekMinutes, weekVitalsAvg, delta, mean…
  lib/storage.js      # loadState, saveState, migrateState
  components/         # Card, Modal, Field, ZoneBar, Line, Bars…
  screens/            # Home, Trends, Registros, Exams
  modals/             # TreinoModal, DiaModal, VitalsModal, ExameModal, ConfigModal
  App.jsx             # só estado global + navegação
```

### 12. Testes das funções de cálculo

Zero testes hoje. As funções puras (`ldlOf`, `mondayOf`, `weekVitalsAvg`,
`migrateState`, `delta`) são exatamente as que geram os números que o usuário
leva ao médico — e as mais fáceis de testar. Vitest + ~20 testes cobrem o
essencial em uma tarde. A migração de dados (`migrateState`) em especial
nunca deveria mudar sem teste.

### 13. Pequenos acertos

- Substituir `confirm()`/`alert()` nativos por um diálogo próprio (o `confirm` do iOS quebra a imersão e não é estilizável).
- IDs com `String(Date.now())` podem colidir em importações; usar `crypto.randomUUID()`.
- Versionar o schema do estado (`{ version: 4, ... }`) para as próximas migrações serem explícitas em vez de heurísticas.
- Modo escuro (o app é usado de manhã cedo e à noite — exatamente quando a tela clara incomoda).

---

## Sugestão de sequência

1. **Agora (uma sessão):** fuso horário (#2), validação (#3), teclado numérico e pré-preenchimento (#6).
2. **Curto prazo:** PWA + offline (#4), lembrete de backup (#1, etapa 1), onboarding sem dados demo (#7).
3. **Médio prazo:** gráficos diários com média móvel (#8), resumo por exame (#9), refatoração (#11) + testes (#12).
4. **Longo prazo:** sincronização em nuvem (#1, etapa 3), importação de CSV do relógio (#10).
