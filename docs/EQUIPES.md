# HDL 40+ · Equipe de subagentes e orquestração

Este repositório define uma equipe de subagentes de IA em `.claude/agents/`.
Qualquer sessão do Claude Code (ou outro orquestrador compatível) que abrir o
repositório carrega a equipe automaticamente e pode delegar trabalho a ela.
O roadmap que a equipe executa está em [`docs/MELHORIAS.md`](MELHORIAS.md).

## A equipe

| Agente | Papel | Itens do roadmap | Modelo |
|---|---|---|---|
| `dados-guardiao` | Persistência, schema, migrações, backup, validação, fuso horário | 1, 2, 3, 13 | sonnet |
| `ux-mobile` | Formulários, fricção de registro, onboarding, modo escuro, acessibilidade | 6, 7, 13 | sonnet |
| `graficos-analista` | Gráficos SVG, médias móveis, período, correlação exames×hábitos | 8, 9 | sonnet |
| `pwa-engenheiro` | Manifest, service worker, offline, fontes locais, notificações | 4, 5 | sonnet |
| `qa-verificador` | Verificação ponta a ponta pós-implementação; testes Vitest | 12 (+ todos) | sonnet |
| `revisor-codigo` | Revisão do diff antes do commit (somente leitura) | transversal | opus |

O item 10 (importação CSV de relógios) fica com `dados-guardiao` (parsing e
schema) em parceria com `ux-mobile` (fluxo de importação). O item 11
(refatoração do `App.jsx`) é do orquestrador — decisão de arquitetura — com
`qa-verificador` garantindo comportamento idêntico antes/depois.

## Fluxo de trabalho padrão

Para cada item do roadmap, o orquestrador segue este pipeline:

```
1. PLANEJAR    Ler MELHORIAS.md, escolher o item, definir escopo curto e
               critério de aceitação observável.
2. IMPLEMENTAR Delegar ao agente especialista com um brief completo
               (o agente começa "frio": diga o item, os arquivos, o
               critério de aceitação e o que NÃO mudar).
3. VERIFICAR   Delegar ao qa-verificador. Reprovou → volta ao passo 2
               com o relatório de reprodução.
4. REVISAR     Delegar ao revisor-codigo com o diff. Achados confirmados
               → volta ao passo 2.
5. ENTREGAR    Commit no branch da sessão (mensagem em português),
               push, atualizar o status em MELHORIAS.md.
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
(inclua **quando** usá-lo e os itens do roadmap que cobre), `model` e
opcionalmente `tools`. Corpo = system prompt do agente. Regras para um bom
agente novo:

- Papel com fronteira clara (o que ele faz e o que ele **não** faz);
- Instruções específicas deste projeto, não genéricas — aponte arquivos,
  funções e armadilhas reais;
- Critério de verificação próprio no final do prompt (todo agente termina
  dizendo como provou que o trabalho funciona);
- Registrar o agente na tabela acima.
