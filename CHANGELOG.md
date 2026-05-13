# Changelog

Todas as alterações relevantes deste projeto são registadas aqui. As datas seguem o formato ISO (AAAA-MM-DD).

## [3.13.0] - 2026-05-13

### Adicionado
- **Painel "Inter-rater agreement (Cohen's κ)"** como ferramenta companheira na resource-grid — útil quando o "teste" é um juízo humano (imagiologia, anatomia patológica, classificação clínica). Aceita os quatro cell counts da tabela rater 1 × rater 2 e devolve:
  - κ com IC 95% (variância de Fleiss 1969).
  - Concordância observada (`p_o`) e esperada (`p_e`).
  - N total.
  - Interpretação qualitativa segundo Landis & Koch 1977 (Poor / Slight / Fair / Moderate / Substantial / Almost perfect).
- Nova função pública: `calcCohenKappa({ bothPos, only1Pos, only2Pos, bothNeg })` → `{ value, ci, observed, expected, n, interpretation }` ou `null` em entradas inválidas; `interpretKappa(value)` para o rótulo qualitativo.
- 5 testes adicionais (concordância perfeita → κ=1, raters independentes → κ≈0, exemplo derivado, entrada vazia/negativa → null, mapeamento Landis-Koch dos seis intervalos).

## [3.12.0] - 2026-05-13

### Adicionado
- **Controlo da correcção de continuidade** para os IC de LR+, LR− e DOR — três modos:
  - `auto` (default): aplica +0,5 a todas as células apenas quando alguma é zero (comportamento histórico).
  - `always`: aplica +0,5 sempre, mesmo sem células zero.
  - `never`: não aplica correcção; devolve `null` quando o cálculo falha (log de 0).
- Versão web: nova secção colapsável "Advanced settings" abaixo do formulário com um `<select>` que persiste a escolha em `localStorage` (`diagcalc-continuity`). Alterar o modo recalcula automaticamente se já houver um resultado.
- CLI: novo flag `--continuity auto|always|never` (default `auto`); valor inválido falha com exit 1 e mensagem de uso.
- Engine: `calcLogRatioCI(x1, n1, x2, n2, { continuityCorrection })` e `calcDOR(tp, fp, fn, tn, { continuityCorrection })`; `calculateMetrics` propaga a opção. Caso útil para ensino: comparar lado a lado os IC com e sem correcção.
- 3 testes adicionais (`never` devolve null quando justificado, `always` produz CI ligeiramente diferente do default, opção propaga-se pelo `calculateMetrics`).

## [3.11.0] - 2026-05-13

### Adicionado
- **NNS (Number Needed to Screen)** como nova métrica em todas as interfaces — `NNS = 1 / (sensibilidade × probabilidade pré-teste)`. Indica quantas pessoas é preciso testar para detectar um verdadeiro caso à prevalência indicada. Apresentado arredondado para cima (não há "0,5 pessoas"); ∞ quando a sensibilidade ou a prevalência são zero. Particularmente revelador em cenários de rastreio: o preset Mammography produz NNS=143 a 1% de prevalência, mostrando porque é que campanhas populacionais exigem volumes elevados.
- Novas funções públicas: `formatNNS(value)` e `interpretNNS(value)` (interpretação automática a 4 níveis: eficiente / moderado / baixo rendimento / muito baixo rendimento).
- 4 testes adicionais (cálculo numérico, dois casos infinitos, formatação).

### Alterado
- Versão web, TUI e CLI: carta/linha NNS adicionada à secção "Performance Measures" (depois do DOR). Exports texto/Markdown da TUI também a incluem.

## [3.10.1] - 2026-05-13

### Adicionado
- A saída `--format json` da CLI passa a incluir um bloco `engine` reprodutível com o nome da ferramenta, versão (`3.10.1`), métodos de IC usados (Wilson para proporções, Simel-Samsa-Matchar log-normal para razões de verosimilhança, delta-method para probabilidades pós-teste, log-normal para DOR) e timestamp UTC (`generatedAt`). Pensado para colar directamente numa secção de métodos ou registar para auditoria.

## [3.10.0] - 2026-05-13

### Adicionado
- **Reconstrução de curvas ROC** a partir de múltiplos cutoffs na versão web — painel colapsável "Build an ROC curve" sob os resultados que aceita uma tabela editável de linhas `(cutoff, TP, FP, FN, TN)`, recalcula em tempo real à medida que o utilizador escreve, e desenha:
  - Linha ROC ligando os pontos do utilizador, com extensão automática para (0,0) e (1,1) na cor `--primary-color` (Queequeg).
  - Diagonal de oportunidade tracejada em cinzento Ishmael.
  - Ponto óptimo de Youden destacado em Pip, com o valor do cutoff inscrito ao lado.
  - AUC trapezoidal inscrita no canto da área de plot e replicada num cartão de resumo abaixo com sens/spec/J do óptimo.
- A primeira linha é pré-preenchida automaticamente com o 2×2 do teste actual após `Calculate`, permitindo ao utilizador adicionar progressivamente mais cutoffs sem reintroduzir dados.
- Nova função pública: `calculateROC(rows)` → `{ points, auc, optimalIndex, optimalPoint }`. Ignora linhas inválidas, ordena por FPR ascendente (sens descendente em empates), e calcula a AUC pela regra dos trapézios incluindo os ancoradouros (0,0) e (1,1).
- 4 testes adicionais (classificador perfeito → AUC=1, classificador aleatório → AUC=0.5, ordem ascendente da FPR + Youden no meio, entrada vazia → null).

## [3.9.0] - 2026-05-13

### Adicionado
- Seis cenários clínicos com referências bibliográficas, expandindo o repositório de presets de 10 → 16:
  - **Wells score (≥2) para TVP** — Wells PS, et al. *N Engl J Med.* 2003;349(13):1227-1235.
  - **HEART score (≥4) para MACE em dor torácica** — Backus BE, et al. *Int J Cardiol.* 2013;168(3):2153-2158.
  - **CURB-65 (≥2) para PAC grave** — Lim WS, et al. *Thorax.* 2003;58(5):377-382.
  - **qSOFA (≥2) para rastreio de sépsis** — Seymour CW, et al. *JAMA.* 2016;315(8):762-774.
  - **APGAR < 7 aos 5 min para desfecho neonatal grave** — Casey BM, McIntire DD, Leveno KJ. *N Engl J Med.* 2001;344(7):467-471.
  - **FAST ecografia para trauma abdominal contuso** — Rozycki GS, et al. *Ann Surg.* 1998;228(4):557-567.
- O preset APGAR é particularmente útil em ensino por ilustrar um teste muito específico mas pouco sensível em prevalência muito baixa — perfeito para demonstrar como o IC do LR− e a probabilidade pós-teste (−) se comportam nesses extremos.

## [3.8.1] - 2026-05-13

### Adicionado
- **Resumo textual do nomograma de Fagan** por baixo do canvas — `<dl>` semântica com pré-teste, LR+, LR−, post-test (+) e post-test (−). O canvas passa a ter `role="img"` e `aria-describedby="faganSummary"`, permitindo a leitores de ecrã obter o conteúdo do gráfico em texto. Sighted users também ganham uma leitura compacta dos valores chave em fonte monoespaçada.

## [3.8.0] - 2026-05-13

### Adicionado
- **Razão de probabilidades de diagnóstico (DOR)** como nova métrica em todas as interfaces — `DOR = (TP · TN) / (FP · FN)` com IC 95% log-normal (`SE = √(1/TP + 1/FP + 1/FN + 1/TN)`) e correcção de continuidade `+0,5` quando alguma célula é zero. Interpretação automática (≥100 muito forte, ≥10 útil, >1 limitada, ≤1 problemática).
- **Avisos de viés** no painel de resultados sempre que o motor detecta:
  - Grupo de doentes com `N < 30` (sensibilidade imprecisa).
  - Grupo de não-doentes com `N < 30` (especificidade imprecisa).
  - Prevalência do estudo a divergir mais de 20 pontos percentuais da probabilidade pré-teste do utilizador — recorda que PPV/NPV reflectem a prevalência do estudo, e que para o paciente concreto se deve ler as probabilidades pós-teste.
- Novas funções públicas: `calcDOR(tp, fp, fn, tn)`, `interpretDOR(value)` e `buildBiasWarnings({ tp, fp, fn, tn, preTestProb })`.
- 6 novos testes (cálculo do DOR, correcção de continuidade, presença da carta DOR no `calculateMetrics`, comportamento dos avisos em três cenários).

### Alterado
- Versão web: carta DOR adicionada à grelha de resultados (entre NPV e LR+); avisos surgem num callout amarelo (acento Pip) acima dos cartões.
- TUI: DOR renderizado no bloco "Performance Measures" com tonalidade própria (Tashtego ≥10, Pip 1–10, Ahab ≤1); avisos aparecem como bloco "Heads up" no painel de resultados.
- CLI texto: secção "Heads up" no topo do relatório quando há avisos; linha DOR adicionada à secção de métricas. `--format json` ganha um campo `warnings` (array de strings).

## [3.7.0] - 2026-05-13

### Adicionado
- **Limiares de decisão de Pauker–Kassirer** (1980) — painel colapsável "Decision thresholds" na versão web com slider para a probabilidade de ação (treatment threshold, Pt, default 30%) e barra horizontal com três zonas coloridas:
  - **Vermelha (Ahab)** — "não testar": pré-teste tão baixo que mesmo um resultado positivo não atinge Pt.
  - **Amarela (Pip)** — "teste útil": o resultado do teste pode atravessar Pt.
  - **Verde (Tashtego)** — "tratar sem testar": pré-teste tão alto que mesmo um resultado negativo se mantém acima de Pt.
- Marcadores na barra para Pt (preto, com etiqueta) e para a probabilidade pré-teste actual (azul Queequeg, com seta). Resumo numérico em cartas com `testingThreshold`, `Pt`, `testTreatmentThreshold` e a classificação textual do pré-teste actual.
- Nova função pública no motor: `calculateThresholds({ treatmentThreshold, lrPositive, lrNegative })` → `{ treatmentThreshold, testingThreshold, testTreatmentThreshold }`. Resolve `P = Pt / (Pt + (1 − Pt) · LR)` para LR+ e LR− respectivamente, com tratamento explícito de LR+ = ∞ (testingThreshold → 0) e LR− = 0 (testTreatmentThreshold → 1).
- 4 testes adicionais cobrindo o cálculo numérico, casos infinitos/zero e rejeição de Pt fora de (0, 1).

## [3.6.0] - 2026-05-13

### Adicionado
- **Modo encadeado / teste sequencial** nas três interfaces — modela o fluxo clínico real em que um teste alimenta o seguinte (D-dimer → CT-PA, antigénio rápido → PCR, rastreio → confirmatório).
  - **Web:** secção colapsável "Chain a second test" sob a grelha de resultados, com seletor "follow up on positive/negative result of test 1", matriz 2x2 para o teste 2 e cartas de resultado dedicadas. A pré-teste do teste 2 é calculada automaticamente a partir da probabilidade pós-teste relevante do teste 1 e mostrada num banner com acento Daggoo.
  - **TUI:** nova tecla `+` que pega no pós-teste (+) do caso actual e arranca um novo caso ad hoc com esse valor como pré-teste, mantendo a sensibilidade/especificidade do teste 2 por preencher. O painel de atalhos foi atualizado.
  - **CLI:** flags `--chain --tp2 N --fp2 N --fn2 N --tn2 N` para um relatório encadeado no mesmo comando; `--chain-from positive|negative` (default `positive`) escolhe qual ramo do teste 1 seguir; o JSON inclui agora um campo `chained` com o input e as métricas completas do segundo teste.
- Teste de identidade em `test/core.test.js` que confirma `pre-odds × LR1⁺ × LR2⁺ = post-odds` após encadear duas calculateMetrics (assumindo independência condicional).

## [3.5.0] - 2026-05-13

### Adicionado
- **Explorador de sensibilidade à prevalência** na versão web — secção colapsável por baixo da grelha de resultados que mantém a sensibilidade e a especificidade fixas e permite arrastar um slider de prevalência (0,1% a 99,9%) para ver, em tempo real, como PPV, NPV e probabilidades pós-teste respondem. Ferramenta-chave para demonstrar o "paradoxo do rastreio" (PPV colapsa em populações de baixa prevalência mesmo com testes excelentes).
- **Gráfico PPV/NPV vs. prevalência** desenhado em canvas com escala 0–100% nos dois eixos, curvas separadas para PPV (acento Stubb) e NPV (acento Tashtego), e marcador vertical (acento Queequeg) na prevalência atual. O canvas redesenha-se automaticamente ao alternar o tema claro/escuro.
- Teste dourado que confirma a identidade `PPV(p) ≡ Post-test(+) = sens·p / (sens·p + (1−spec)·(1−p))` ao longo de quatro prevalências distintas, garantindo coerência entre o slider e o motor `calculateMetrics`.

### Alterado
- O slider usa o thumb em `--primary-color`, anel de foco em `--crew-starbuck` e os cartões de leitura partilham o estilo dos cartões de resultado. Cumpre `prefers-reduced-motion`.

## [3.4.0] - 2026-05-13

### Adicionado
- **Intervalos de confiança a 95% para LR+ e LR−** (método log-normal de Simel, Samsa & Matchar, *J Clin Epidemiol* 1991), com correção de continuidade automática (+0,5 em todas as células) quando alguma célula da matriz 2x2 é zero.
- **Intervalos de confiança a 95% para as probabilidades pós-teste**, propagados pelo método delta através da regra de Bayes a partir do CI da razão de verosimilhança correspondente. O resultado é o intervalo que o clínico cita quando comunica "probabilidade pós-teste = X% (IC 95%: Y%–Z%)".
- Novas funções públicas no motor partilhado: `calcLogRatioCI(x1, n1, x2, n2)` e `calcPostTestCI(preTest, lrCi)`.
- Testes dourados adicionais (D-dimer e exemplos sintéticos) que bloqueiam regressões nos cálculos de CI.

### Alterado
- Os cartões de resultado da versão web, as linhas da TUI e o relatório CLI passam a mostrar IC 95% para LR+, LR− e ambas as probabilidades pós-teste, usando o formatador correto de cada métrica (razão de verosimilhança em `1.23` / `12.3` vs. percentagem em `12,3%`).
- Os exports em texto e Markdown da TUI passam a incluir os mesmos IC 95% nas secções "Bayesian Update".
- A saída `--format json` da CLI inclui agora um campo `ci` para LR+, LR− e ambas as probabilidades pós-teste.

## [3.3.1] - 2026-05-13

### Técnico
- **Suite de testes automatizados** com `node:test` (sem dependências externas) cobrindo `validateInputs` em todos os limites (negativos, não inteiros, NaN, 0%, 99,9999%, 100%), valores dourados de `calculateMetrics` para os datasets HIV ELISA e D-dimer, propriedades dos intervalos de Wilson nos extremos 0/N e N/N, regressões dos bugs corrigidos em 3.2.4 (incluindo `calculateRatio(0, 0) === NaN`), formatadores em casos finitos e ∞/NaN, e validação automática de todos os presets em `lib/diagcalc-datasets.js`. 34 testes no total.
- Adicionado script `npm test` (`node --test test/core.test.js`).
- Workflow do GitHub Actions atualizado: novo job `test` que tem de passar antes do `deploy` para GitHub Pages, garantindo que nenhuma regressão de cálculo é publicada.

## [3.3.0] - 2026-05-13

### Alterado
- **Paleta visual migrada para Pequod** (github.com/tiagojct/pequod) — escala neutra Log em 12 passos (do papel quente `#F7F3EE` à tinta profunda `#0B1720`) e oito acentos nomeados com a tripulação do Pequod (Ahab, Starbuck, Queequeg, Pip, Ishmael, Stubb, Tashtego, Daggoo), com variantes claras e escuras dedicadas.
- **Tipografia migrada para Atkinson Hyperlegible Next** no corpo e na interface — tipo de letra desenhado pelo Braille Institute para leitores de baixa visão, melhora a legibilidade base para todos. JetBrains Mono mantém-se para a matriz 2x2, os valores numéricos das cartas de resultado e as etiquetas do nomograma de Fagan.
- Os mapeamentos semânticos (`--primary-color`, `--accent-warm`, `--success-color`, etc.) e os nomes legacy (`--base-*`, `--red`/`--orange`/...) foram preservados como aliases para manter compatibilidade com `script.js` e o esquema escuro existente, mas apontam agora para tokens Pequod.
- TUI atualizada para usar os hex codes da tripulação (Tashtego para STRONG/RULE-IN/RULE-OUT, Pip para MOD/USEFUL, Ahab para WEAK, Daggoo para EXTREME, Starbuck para INFO, Queequeg para seleção/foco). blessed faz fallback gracioso para a cor ANSI mais próxima em terminais sem truecolor.

## [3.2.4] - 2026-05-12

### Corrigido
- O nomograma de Fagan deixa de omitir silenciosamente a linha de LR- quando este é infinito (especificidade = 0). Agora a verificação é simétrica à do LR+.
- `calculateRatio(0, 0)` passa a devolver `NaN` em vez de `Infinity`, evitando que o caso indeterminado 0/0 seja confundido com um rácio infinito.
- Mensagem de validação da probabilidade pré-teste corrigida — descreve agora o intervalo real (`[0%, 100%)`), em vez do antigo "entre 0 e 99,9%".
- A versão web deixa de falhar silenciosamente quando algum dos scripts em `lib/` não carrega: regista um erro na consola e mostra mensagem no painel de feedback.
- Na TUI, `Ctrl-C` passa a terminar a aplicação mesmo com um modal aberto, evitando que o utilizador fique preso na janela de edição ou exportação.
- Os relatórios exportados (texto e Markdown) passam a usar o mesmo formato de probabilidade pré-teste que a interface (`formatPercentage`), eliminando a discrepância entre "18%" no ficheiro e "18.0%" no ecrã.
- A CLI rejeita explicitamente `--format` sem valor, em vez de o ignorar silenciosamente e devolver formato `text`.

## [3.2.2] - 2026-03-14

### Corrigido
- Melhoria do contraste no modo escuro da interface web, removendo cores claras fixas que deixavam alguns blocos e textos pouco legíveis.

### Técnico
- Atualização dos metadados do pacote npm para apontar para o domínio final `diagcalc.tiagojct.eu`.

## [3.2.3] - 2026-03-14

### Corrigido
- Definição explícita da cor do texto e dos placeholders dos campos numéricos no modo escuro da interface web, para evitar inputs pouco legíveis em alguns browsers.

## [3.2] - 2026-03-13

### Adicionado
- **TUI para terminal** com navegação por teclado, carregamento de cenários e painel de resultados.
- **CLI textual** para cálculo direto via argumentos (`--dataset`, `--tp`, `--fp`, `--fn`, `--tn`, `--pre`).
- **`package.json` e dependência `blessed`** para suportar a experiência em terminal.
- **Comando curto `diag`** para a CLI/TUI após `npm link` ou instalação global.
- **Workflow de GitHub Pages** para publicação automática da versão web.

### Alterado
- A versão web passa a consumir um motor de cálculo partilhado com a CLI e a TUI.
- Os cenários pré-definidos foram movidos para um módulo partilhado reutilizável.
- A interface web foi reorganizada num layout de três colunas inspirado na TUI e passou a usar a fonte JetBrains Mono.
- A TUI passou a ter edição direta no formulário, editor de matriz 2x2 e exportação de relatórios em texto/Markdown.

### Técnico
- Extração da lógica de validação, métricas, intervalos de confiança e formatação para `lib/diagcalc-core.js`.
- Criação de `lib/diagcalc-datasets.js` para unificar os dados de exemplo em todas as interfaces.
- Adição de `bin/diagcalc.js` como ponto de entrada para execução no terminal.
- Suporte a `--format json` na CLI para integração com scripts e automações.

## [3.1] - 2025-10-19

### Adicionado
- **Esquema de cores Flexoki**: Design minimalista com paleta neutra e acentos discretos.
- **Modo escuro**: Toggle funcional com persistência de preferência no localStorage e respeito à preferência do sistema.
- **7 novos cenários clínicos**: Casos reais da literatura médica com referências bibliográficas completas (D-dímero, troponina, mamografia, COVID-19, HIV, Streptococcus, pneumonia).
- **Nomograma de Fagan**: Visualização gráfica interativa das relações entre probabilidade pré-teste, likelihood ratios e probabilidade pós-teste.
- **Seção de referências bibliográficas**: Recursos educativos organizados em literatura de apoio, recursos online e calculadoras complementares.
- **Exibição de referências**: Cada cenário médico mostra automaticamente a citação bibliográfica com DOI clicável.

### Alterado
- Reorganização dos cenários no selector com grupos separados (genéricos vs. literatura médica).
- Estilo visual simplificado: remoção de sombras volumétricas, bordas mais proeminentes, cantos menos arredondados.
- Paleta de cores completamente reformulada com variáveis CSS para suporte a dark mode.
- Botões e inputs com estilo flat e transições suaves.
- Melhorias de responsividade para canvas e elementos novos em dispositivos móveis.

### Técnico
- Refatoração da estrutura de dados dos cenários para incluir metadados.
- Implementação de renderização dinâmica de canvas com suporte a device pixel ratio.
- Sistema de temas com variáveis CSS e persistência em localStorage.
- Modularização de funções JavaScript para gestão de tema e visualizações.

## [3.0] - 2025-10-02
- Remodelação completa da interface com cabeçalho informativo, secções semânticas e destaque para o percurso pedagógico.
- Introdução de cenários de exemplo pré-definidos para facilitar a exploração de diferentes contextos clínicos.
- Validação reforçada dos dados introduzidos e mensagens de feedback mais claras para o utilizador.
- Cálculo de intervalos de confiança pelo método de Wilson e apresentação dos resultados em cartões interpretativos.
- Novo painel comparativo entre probabilidades pré e pós-teste, exibido em formato gráfico.
- Botão de impressão para gerar um relatório de apoio ao estudo.
- Guia de interpretação expandido com referências adicionais para aprofundamento teórico.

## [2.0] - 2024-??-??
- Ajustes iniciais de estilo e introdução da tipografia Inter.
- Reorganização básica do layout e melhoria das cores de contraste.

## [1.0] - 2023-??-??
- Versão inicial da DIAGCALC com formulário simples para cálculo das métricas diagnósticas.
