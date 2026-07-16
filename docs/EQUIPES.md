# HDL 40+ · Equipe de subagentes e orquestração

Este repositório define uma equipe de subagentes de IA em `.claude/agents/`.
Qualquer sessão do Claude Code (ou outro orquestrador compatível) que abrir o
repositório carrega a equipe automaticamente e pode delegar trabalho a ela.
O roadmap que a equipe executa está em [`docs/MELHORIAS.md`](MELHORIAS.md).

## A equipe

Os agentes são organizados por **domínio de atuação**, não por item do
roadmap: qualquer melhoria futura que caia num domínio já tem dono. Os itens
do `docs/MELHORIAS.md` citados abaixo são os exemplos atuais, não o limite
do escopo.

### Planejamento e apoio

| Agente | Papel | Modelo | Por quê este modelo |
|---|---|---|---|
| `arquiteto` | Planos de mudanças estruturais, evolução de schema, escolha de tecnologia, design de features futuras (só planeja) | **opus** | decisões de arquitetura exigem julgamento; erro aqui custa caro em todo o resto |
| `explorador` | Localizar código, mapear usos de função/campo, levantar contexto para briefs (somente leitura) | **haiku** | tarefa mecânica de busca; rapidez e custo baixo importam mais que profundidade |
| `documentador` | Atualizar MELHORIAS.md/EQUIPES.md/CLAUDE.md/README após entregas; textos de ajuda | **haiku** | escrita curta e factual sobre trabalho já verificado |

### Implementação

| Agente | Domínio (atual e futuro) | Exemplos atuais | Modelo | Por quê este modelo |
|---|---|---|---|---|
| `dados-guardiao` | Persistência, schema, migrações, backup, validação, datas/fuso | itens 1, 2, 3, 13 | **sonnet** | implementação especializada com regras claras definidas no prompt |
| `ux-mobile` | Interface, fricção de uso, onboarding, modo escuro, acessibilidade, telas novas | itens 6, 7, 13 | **sonnet** | idem |
| `graficos-analista` | Gráficos SVG, estatísticas, correlações, projeções, métricas novas | itens 8, 9 | **sonnet** | idem |
| `pwa-engenheiro` | Manifest, service worker, offline, assets, notificações, build/deploy, performance | itens 4, 5 | **sonnet** | idem |
| `integracoes` | Sync em nuvem, import CSV de relógios (Strava/Garmin/Polar), APIs externas, autenticação | itens 1 (etapa 3), 10 | **sonnet** | idem |

### Qualidade (etapas obrigatórias do pipeline)

| Agente | Papel | Modelo | Por quê este modelo |
|---|---|---|---|
| `qa-verificador` | Verificação ponta a ponta de qualquer entrega; testes Vitest (item 12) | **sonnet** | segue roteiro rigoroso; precisa executar bem, não decidir |
| `revisor-codigo` | Revisão do diff antes do commit (somente leitura) | **opus** | achar bug sutil em diff é a tarefa de maior exigência de raciocínio da equipe |

O item 11 (refatoração do `App.jsx`) começa no `arquiteto` (plano por
etapas), é executado pelo agente do domínio de cada módulo extraído e
fechado pelo `qa-verificador` garantindo comportamento idêntico antes/depois.

### Critério de escolha de modelo (para agentes futuros)

- **haiku** — tarefas mecânicas e de leitura: buscar, listar, resumir,
  atualizar documentação factual. Otimiza custo e latência.
- **sonnet** — implementação com escopo definido: o prompt do agente
  contém as regras do domínio e o modelo executa com qualidade.
- **opus** — julgamento com consequências: arquitetura, revisão de código,
  qualquer decisão difícil de reverter.
- O orquestrador pode sobrescrever o modelo por chamada (parâmetro `model`
  da ferramenta `Agent`) quando uma tarefa específica exigir mais ou menos
  capacidade que o padrão do agente.

## Fluxo de trabalho padrão

Para cada item de trabalho (do roadmap ou pedido novo do usuário), o
orquestrador segue este pipeline:

```
1. PLANEJAR    Definir escopo curto e critério de aceitação observável.
               Mudança estrutural ou tecnologia nova → arquiteto primeiro.
               Precisa de contexto do código → explorador (barato).
2. IMPLEMENTAR Delegar ao agente do domínio com um brief completo
               (o agente começa "frio": diga o objetivo, os arquivos, o
               critério de aceitação e o que NÃO mudar).
3. VERIFICAR   Delegar ao qa-verificador. Reprovou → volta ao passo 2
               com o relatório de reprodução.
4. REVISAR     Delegar ao revisor-codigo com o diff. Achados confirmados
               → volta ao passo 2.
5. ENTREGAR    Commit no branch da sessão (mensagem em português), push,
               e documentador atualiza o status em MELHORIAS.md.
```

### Regras de orquestração

- **Um item do roadmap por vez.** Escopo pequeno, verificado e commitado
  vale mais que três itens pela metade num diff gigante.
- **Brief completo na delegação.** Subagentes não veem a conversa do
  orquestrador. Todo brief deve conter: o item do roadmap, o critério de
  aceitação, os arquivos prováveis e as restrições ("não mude o shape do
  estado", "não toque nos gráficos").
- **Trabalho paralelo só sem interseção de arquivos.** Enquanto quase tudo
  vive em `src/App.jsx`, implementações são em série; `qa-verificador`
  escrevendo testes de funções puras e `pwa-engenheiro` mexendo em config
  podem rodar em paralelo com segurança (ou usar isolamento por worktree).
- **Nada é "pronto" sem os passos 3 e 4.** Build passando não é verificação.
- **Dados do usuário são sagrados.** Qualquer mudança que toque em
  persistência passa obrigatoriamente pelo cenário de migração do
  `qa-verificador` (estado antigo semeado → reload → dados intactos).
- **Escalar ao humano** quando: a decisão muda o produto (novo serviço em
  nuvem, remoção de recurso), o critério de aceitação é ambíguo, ou dois
  agentes divergem sobre arquitetura.

## Como delegar (Claude Code)

Na sessão do orquestrador, os agentes são invocados pela ferramenta de
subagentes (`Agent`), pelo nome definido no frontmatter:

```
Agent(subagent_type: "dados-guardiao",
      prompt: "Item 2 do docs/MELHORIAS.md: corrigir todayStr() para data
               local. Critério: às 22h de Brasília um registro cai no dia
               atual, não no seguinte. Verifique todos os usos de
               toISOString em src/App.jsx. Não mude o shape do estado.")
```

Outro modelo orquestrador pode usar o mesmo arquivo `.md` de cada agente
como system prompt e reproduzir o pipeline acima.

## Adicionando agentes futuros

Criar `.claude/agents/<nome>.md` com frontmatter `name`, `description`
(inclua **quando** usá-lo), `model` (obrigatório — escolha pelo critério da
seção acima e justifique na tabela) e opcionalmente `tools` (restrinja a
leitura para agentes que não devem editar). Corpo = system prompt do agente.
Regras para um bom agente novo:

- Domínio com fronteira clara (o que ele faz e o que ele **não** faz),
  definido para durar além do roadmap atual;
- Instruções específicas deste projeto, não genéricas — aponte arquivos,
  funções e armadilhas reais;
- Critério de verificação próprio no final do prompt (todo agente termina
  dizendo como provou que o trabalho funciona);
- Registrar o agente na tabela acima.
