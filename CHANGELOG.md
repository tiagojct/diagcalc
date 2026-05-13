# Changelog

Todas as alterações relevantes deste projeto são registadas aqui. As datas seguem o formato ISO (AAAA-MM-DD).

## [4.1.2] - 2026-05-14

### Alterado
- **"Fill synthetic cutoffs" agora é idempotente e dá feedback visível.** Cliques sucessivos substituem o scaffold sintético em vez de o duplicar (apaga as linhas `roc-row--synthetic` existentes antes de adicionar as novas — 5 ↔ 5, nunca 10, 15, 20). Após adicionar, a tabela faz auto-scroll para a primeira linha sintética e o readout mostra durante 5 segundos uma mensagem confirmando "Added N synthetic cutoffs from a binormal fit (seed: …)" — antes a única dica era a curva no canvas mudar, fácil de não notar quando o AUC já estava alto. O fluxo headless (`playwright`) confirma: D-dimer → Calculate → abrir disclosure → clicar = 2 → 7 linhas; clicar duas vezes = ainda 7 linhas; readout começa com a mensagem flash.

## [4.1.1] - 2026-05-14

### Corrigido
- **"Fill synthetic cutoffs" não fazia nada quando a tabela ROC estava vazia.** O botão tentava semear a partir da primeira linha da tabela e, se essa estivesse vazia (cenário comum logo após abrir o painel sem ter ainda corrido Calculate), saía em silêncio. Agora cai automaticamente nos valores do formulário principal (TP / FP / FN / TN) se a tabela não tiver nenhuma linha válida, e mostra mensagens de erro distintas para "sem dados" vs "dados degenerados" no readout.
- **Chevron de disclosure menos pesado.** A versão anterior usava um triângulo CSS preenchido (`border-style: solid`) que, embora não fosse o glifo Unicode antigo, lia-se quase idêntico em corpos pequenos. Reescrito como dois traços de 1,5 px (`border-right` + `border-bottom`) rodados 45° — um "›" em outline, fininho, no estilo de chevron moderno. Roda 90° para apontar para baixo em `[open]`.

## [4.1.0] - 2026-05-14

### Adicionado
- **Construtor ROC ganha "Fill synthetic cutoffs"** — botão que toma a primeira linha válida da tabela (TP/FP/FN/TN), ajusta um modelo binormal de variância igual (`d = Φ⁻¹(sens) + Φ⁻¹(spec)`) e enche cinco linhas adicionais com cutoffs sintéticos espaçados uniformemente em FPR. Os totais P e N são preservados, pelo que as contagens sintéticas vivem na mesma escala que o caso observado. As linhas sintéticas aparecem com border tracejado e texto esbatido para serem distinguíveis das que o utilizador inseriu; clicar e editar qualquer célula promove-as a linhas "reais". Útil quando se tem um único 2×2 e se quer visualizar a curva implícita sem ter de procurar (ou inventar) sete pontos.
- `core.stdNormalCdf(x)` e `core.invStdNormal(p)` — aproximações polinomiais (Abramowitz–Stegun 7.1.26 para Φ, Acklam para Φ⁻¹). Publicadas no `module.exports` para reutilização em ferramentas futuras (p.ex. intervalos de credibilidade bayesianos).
- `core.generateSyntheticRocPoints(observed, count)` — gerador determinístico de cutoffs sintéticos a partir de um único 2×2 observado.

### Alterado
- **Markers de disclosure unificados.** Os seis painéis colapsáveis (advanced settings, history, ROC, decision threshold, sequential test, prevalence explorer) usavam glifos Unicode "▸"/"▾" que renderizavam bloqueados e pesados em macOS. Substituídos por uma única chevron desenhada em CSS (`border-style` triangle) que herda a cor do texto via `currentColor`, gira 90° em `[open]` e respeita `prefers-reduced-motion`. Resultado: marker mais magro, mais consistente entre browsers, e um único bloco em vez de seis pares de regras `::before`.

## [4.0.3] - 2026-05-13

### Corrigido
- **Valores grandes da tira de cabeçalho alinhados em linha.** As cartas com etiqueta de duas linhas ("Post-test probability (positive result)") deixavam o número a flutuar mais abaixo do que em "Sensitivity" / "Specificity". As etiquetas reservam agora altura para duas linhas (`min-height` em `.results-headline .result-card h3`), pelo que os quatro números ficam na mesma baseline.

### Alterado
- **Gradientes da matriz de confusão substituídos por cores chapadas.** Os blocos "Disease +/−" e "Test +/−" tinham `linear-gradient(180deg, primary → primary-strong)` e `linear-gradient(180deg, secondary → log-700)` — destacavam-se demais para o tom minimalista do resto da app. Passam a `background-color` chapado (`--primary` e `--log-700`).

## [4.0.2] - 2026-05-13

### Alterado
- **Tira Bayesiana com setas inequívocas e layout mais legível.** Cada linha passa a ter cinco colunas em desktop: rótulo da linha → valor pré-teste à esquerda → eixo 0–100 % → valor pós-teste à direita → "LR × N". A direcção do teste é evidente porque os dois valores estão fisicamente em lados opostos da seta, e a seta em si tem agora 11 px de largura (era 7) e ponta-em-X. Para teste negativo o eixo ganha a classe `rtl` e a seta inverte-se. As marcas de tick em 0/25/50/75 foram retiradas — eram ruído sem retorno.
- **Passagem geral por "mais minimalismo".** Os cartões de resultado perdem o fundo, o border e o padding interno: passam a ser pura tipografia + indicador visual (barra ou banda). A grelha de resultados secundária ganha uma divisória horizontal de 1 px no topo em vez de cada carta ter o seu próprio cartão. O painel `.panel` deixa de ter fundo e raio — o workspace dual-pane separa-se por uma única linha vertical entre formulário e resultados. A barra inline reduz de 6 px para 3 px e perde o border; o indicador de banda reduz de 10 px para 6 px com opacidades mais suaves e marcador mais discreto (3 × 12 px).
- O resultado é um painel direito que parece um *dashboard* de leitura rápida: número grande, indicador visual fininho, IC e nota em texto. Menos tinta por carta, mesma informação.

### Notas técnicas
- `renderBayesianUpdate` foi reescrita: passa a emitir 5 nós DOM por linha (label, from, axis, to, lr) em vez de um axis com sub-labels posicionadas absolutamente. Mais robusto contra overflow e mais fácil de adaptar em mobile (`grid-template-areas`).
- A heading "Pre-test X % → post-test" foi removida; o valor pré-teste aparece agora directamente em cada linha.
- Print stylesheet revisto para os novos selectores (`.bayesian-axis-trail`, `.bayesian-axis-pre`, `.bayesian-axis-post`).

## [4.0.1] - 2026-05-13

### Alterado
- **Tira Bayesiana redesenhada.** Cada linha mostra agora um eixo 0–100 % com tick marks em 0/25/50/75/100, um marcador pré-teste (anel pequeno e oco, etiquetado "pre X %" por cima) e um marcador pós-teste (disco grande preenchido com o acento da linha, etiquetado com o valor em baixo). O trilho entre os dois é um gradiente direccional com setinha — o olho segue claramente a "saltada" sem ter de adivinhar qual dos pontos é qual. Etiquetas saltam para o lado oposto quando o valor cai perto da extremidade direita.
- **Cartas de percentagem ganham barras de preenchimento inline** (sensibilidade, especificidade, PPV, NPV, pós-teste +, pós-teste −). 6 px de altura, debaixo do valor numérico, preenchidas com o acento da carta (Stubb / Tashtego / Starbuck conforme o caso). A magnitude da medida passa a ser legível em meio segundo sem ter de descodificar dígitos.
- **Cartas LR+ / LR− / DOR ganham indicadores de banda.** Quatro segmentos coloridos representando os escalões clínicos (LR+: weak / limited / useful / rule-in; LR−: rule-out / useful / limited / weak; DOR: poor / limited / useful / very strong) com um marcador vertical na posição interpolada do valor actual. Mostra de imediato em que escalão clínico o resultado cai, sem o leitor ter de memorizar os limiares.

### Notas técnicas
- Novas helpers em `script.js`: `renderInlineBar(value, variant)`, `renderBand(metric, kind)`, `bandPosition(value, stops)`. `BAND_DEFS` define os stops e labels para os três tipos de banda (`lr-plus`, `lr-minus`, `dor`).
- Stops das bandas espelham os escalões já existentes em `interpretLRPositive` / `interpretLRNegative` / `interpretDOR` no motor — o visual e o texto estão a contar a mesma história.
- Tira Bayesiana e novos indicadores são print-safe (escalas de cinzentos no `@media print`) e respeitam `prefers-reduced-motion` através do transition global.

## [4.0.0] - 2026-05-13 — "Clinical Dashboard"

Versão maior dedicada ao **facelift visual** da aplicação web. A álgebra de diagnóstico, a CLI e a TUI mantêm-se inalteradas; toda a mudança ocorre na "casca" que rodeia o motor.

### Adicionado
- **Barra de aplicação compacta (`.app-bar`)** sticky no topo da página com a marca DIAGCALC, uma faixa "Case: …" em tempo real (sai de "No case yet" → "Case: HIV ELISA" → "Ad-hoc case" conforme o estado), e os controlos de idioma + tema. Substitui a hero "intro" anterior que ocupava ~6rem.
- **Workspace de duas colunas** a ≥ 960 px (formulário à esquerda em ~34 %, resultados à direita), a colapsar para uma única coluna abaixo. O painel de resultados fica sticky-top no desktop, mantendo as métricas-chave visíveis enquanto se rola até aos painéis auxiliares.
- **Hierarquia visual nos resultados:**
  - `#resultsHeadline` — quatro cartas grandes com sensibilidade, especificidade, probabilidade pós-teste (+) e pós-teste (−), com bordas-acento Stubb / Tashtego nas pós-teste.
  - `#bayesianUpdate` — barra horizontal compacta com a actualização Bayesiana inline (pré-teste → pós-teste positivo / negativo com a "saltada" do LR anotada).
  - `#resultsSecondary` — grelha de seis cartas menores com PPV, NPV, LR+, LR−, DOR e NNS.
- **Tokens de design** explícitos no `:root`: `--space-1`..`--space-8` (grelha de 4 px), `--text-xs`..`--text-3xl`, `--radius-1`..`--radius-3` + `--radius-pill`, `--duration-fast/base/slow`, `--ease-out`, `--shadow-1/--shadow-2`.
- Painel "About DIAGCALC" na resource-grid acomodando os três destaques que viviam na hero. Mantém as chaves i18n existentes (`intro.tag`, `intro.lead`, `intro.highlight*`).
- Novas chaves i18n: `app.case.empty`, `app.case.prefix`, `app.case.adhoc`, `about.h` (en + pt-PT).

### Alterado
- O painel `.panel-library` (selector de dataset) e o painel `.panel-inputs` (matriz 2×2 + pré-teste + Calculate) fundem-se num único `.panel-form`, eliminando a duplicação de bordas e títulos. Tudo cabe agora num único cartão à esquerda.
- A função `renderResults` foi factorizada em três renderers (`renderHeadline`, `renderSecondary`, `renderBayesianUpdate`) que partilham um helper `renderMetricCard(metric, opts)` com variantes `size: "lg" | "sm"` e `accent: "warm" | "cool" | "neutral"`. O painel de teste encadeado continua a usar a versão simples `renderResults`.
- Botões e controlos passam a usar uma escala de espaçamento consistente, anel de foco visível em `--secondary` (Starbuck) e transições subordinadas a `prefers-reduced-motion`.

### Removido / Breaking
- **Aliases CSS legacy removidos.** Forks que sobrescrevam variáveis de tema têm de migrar:
  - `--base-100`..`--base-1000` → use `--log-50`..`--log-950` directamente.
  - `--red`, `--orange`, `--yellow`, `--green`, `--cyan`, `--blue`, `--purple`, `--magenta` → use `--crew-{ahab,stubb,pip,tashtego,starbuck,queequeg,daggoo}` directamente.
  - `--background-color` → `--bg`.
  - `--surface-color`, `--panel-bg`, `--panel-soft-bg`, `--matrix-bg`, `--highlight-bg`, `--reference-bg` → colapsados em `--surface` e `--surface-soft`.
  - `--text-color` → `--text`; `--muted-text`, `--reference-muted` → `--text-muted`; `--heading-strong` → `--text-strong`.
  - `--border-color` → `--border`.
  - `--primary-color` → `--primary`; `--primary-dark` → `--primary-strong`; `--secondary-color` → `--secondary`; `--success-color` → `--success`.
  - `--page-accent-cool`, `--page-accent-warm`, `--intro-gradient-end` → removidos (a nova app-bar não usa o gradiente da hero).
  - Novos: `--warning`, `--error`, `--axis` (anteriormente acedido como `--base-600` em `script.js`).
- `.intro`, `.intro-highlights`, `.highlight`, `.tag`, `.lead`, `.header-controls`, `.results-grid`, `.probability-chart`, `.chart-row`, `.chart-fill`, `.chart-bar` removidos do CSS. Funções correspondentes (`renderProbabilityChart`, `clearProbabilityChart`, `createChartRow`) removidas de `script.js`.
- Elemento `#probabilityChart` e `#results` removidos do `index.html`. Quem dependa destes IDs (extensões, screenshots automáticos, scripts externos) tem de actualizar para `#resultsHeadline`, `#resultsSecondary` e `#bayesianUpdate`.

### Notas técnicas
- Os 77 testes (`core.test.js` + `smoke.test.js`) continuam a passar. O smoke-test de cobertura de chaves i18n validou automaticamente que as novas chaves `app.case.*` e `about.h` existem nas duas locales.
- O motor partilhado (`lib/diagcalc-core.js`), a CLI (`bin/diagcalc.js`) e a TUI (`tui/index.js`) ficaram intactos — `node bin/diagcalc.js --dataset ddimer` produz os mesmos números.
- A estilização das colapsáveis auxiliares (prevalence explorer, decision thresholds, ROC builder, sequential test, kappa, history, STARD, interpretation guide) **fica preservada** mas adopta passivamente os novos tokens de espaçamento. A revisão estética painel-a-painel está planeada para **4.1**.

## [3.16.1] - 2026-05-13

### Adicionado
- **Testes de smoke do bundle de deploy** em `test/smoke.test.js` — 8 testes adicionais, sem dependências externas (sem browser, sem Playwright):
  - Cada `<script src>` e `<link rel="stylesheet" href>` local no `index.html` aponta para um ficheiro existente.
  - `script.js` é carregado depois de todos os scripts em `lib/` de que depende.
  - O conjunto de ficheiros que o workflow do GitHub Pages copia (index.html, script.js, styles.css, `lib/`) cobre todos os assets locais referenciados.
  - O motor partilhado (`lib/diagcalc-core.js`) expõe as 17 funções que a UI consome — qualquer renomeação ou remoção falha o build.
  - O módulo de datasets expõe `datasets`, `getDataset`, `listDatasets`.
  - O módulo de i18n expõe o seu API público e contém as duas tabelas (`en`, `pt-PT`).
  - Cada chave `data-i18n` / `data-i18n-attr` no HTML resolve em ambas as locales.
- O workflow de GitHub Pages corre o suite alargado (`node --test test/core.test.js test/smoke.test.js`) — 77 testes que têm de passar antes do deploy.

### Notas técnicas
- A escolha foi não trazer Playwright / Puppeteer (~100 MB+ com browsers) só para um smoke test: a maioria dos modos de falha que o plano destacava ("regressions in `<script>` order or asset paths") são puramente estruturais e são cobertos por inspecção estática do HTML.

## [3.16.0] - 2026-05-13

### Adicionado
- **Scaffolding i18n (en / pt-PT)** — novo módulo `lib/diagcalc-i18n.js` (UMD, sem dependências) que expõe `translations`, `setLocale`, `getLocale`, `detectLocale`, `t(key, vars)`, `applyToDom(root?)`, e `availableLocales()`.
- Selector de idioma no cabeçalho da versão web (English / Português) com detecção automática (`navigator.language` → fallback `localStorage` → fallback `en`) e persistência em `localStorage` (chave `diagcalc-lang`).
- Atributos `data-i18n` aplicados às áreas de tráfego elevado: cabeçalho/destaques, painéis Library e Editor (kicker + heading + help), grelha do 2×2 (Disease +/−, Test +/−), legenda da matriz, label e help-text do pré-teste, "Advanced settings" (incluindo as três opções de continuidade), botões Calculate / Clear, painel Results (kicker, heading, help, Print report) e nomograma de Fagan (título, help, etiquetas do resumo). Atributos via `data-i18n-attr="attr=key;..."` para `aria-label` e `<optgroup label="...">`.
- Mensagens dinâmicas (`feedback.calc.ok`, `feedback.cleared`, `feedback.scenario.loaded`, `feedback.history.reloaded`) passam pelo `t()` com substituição `{label}` quando aplicável.

### Notas técnicas
- Conteúdo clínico mais longo (interpretation guide, lista STARD, referências, painéis especializados como prevalence/threshold/ROC/kappa/history) **fica em inglês** nesta fase — alargar a cobertura a essas zonas é trivial (acrescentar chaves à tabela + `data-i18n` aos elementos) mas é deixado para um PR seguinte para manter o âmbito controlado.
- As mensagens vindas do motor (`lib/diagcalc-core.js`: notas de sens/spec, interpretações de LR/DOR/NNS/κ, mensagens de validação) **permanecem em inglês** para que (1) os 69 testes dourados continuem válidos e (2) a terminologia clínica não se desdobre em variantes através de locales.

## [3.15.0] - 2026-05-13

### Adicionado
- **Histórico de cálculos com vista de comparação** na versão web — cada `Calculate` bem sucedido grava o caso (input + resumo das principais métricas) em `localStorage` (chave `diagcalc-history`, máximo 10 entradas, dedup em re-cálculos consecutivos idênticos).
- Painel colapsável "History" mostra a lista por ordem decrescente de data. Cada item exibe: dataset/label, TP/FP/FN/TN e pré-teste, valores rápidos de sens/spec/post+/post− e timestamp local. Botões por linha: **Reload** repõe os valores no formulário e recalcula; **×** elimina a entrada. Botão "Clear all history" no fim com confirmação.
- **Comparação lado-a-lado:** marcar dois ou mais checkboxes faz aparecer uma tabela compacta acima da lista com TP/FP/FN/TN, pré-teste, sens, spec, PPV, NPV, LR+, LR−, post+ e post− alinhados por caso. Útil para discutir "o que mudou quando alterámos o ponto de corte?" em sala de aula.
- Tudo o que é guardado fica no browser do utilizador (continua a respeitar o footer de privacidade introduzido em 3.14.2). O painel é também escondido na exportação PDF e nos seus event listeners `beforeprint`.

## [3.14.2] - 2026-05-13

### Adicionado
- **`lib/README.md`** — referência completa da API pública do motor partilhado, agrupada por categoria (cálculo, IC, primitivas matemáticas, formatadores, parsers de input) com a assinatura, retorno e notas de cada export. Pensado para contribuidores e agentes AI que tenham de manter ou estender o motor.
- **`lastReviewed: "2026-05-13"`** em cada um dos 13 presets com referência bibliográfica em `lib/diagcalc-datasets.js`. Marca a data em que a entrada foi auditada — útil quando estimativas de desempenho ficam desactualizadas (e.g., antigénios COVID vs novas variantes).
- **Nota de privacidade** no rodapé da versão web — "🔒 All calculations run locally in your browser. No inputs, datasets, or results leave this device." — sinal de confiança para utilização clínica/académica.

## [3.14.1] - 2026-05-13

### Adicionado
- **Painel "STARD essentials"** na resource-grid — checklist condensada (6 itens) inspirada no STARD 2015 que nudges o utilizador a interrogar a origem dos números antes de os interpretar:
  1. Padrão de referência (incorporation bias).
  2. Espectro de doentes (recrutamento consecutivo/aleatório).
  3. Verificação parcial vs total do gold standard.
  4. Cegamento entre teste índice e referência.
  5. Resultados indeterminados — para onde foram os "?"s.
  6. Subgrupos clinicamente significativos.
- Inclui hiperligação para o checklist completo no EQUATOR Network. Pensado para uso em sessões de critical appraisal sem deixar o aluno isolado nos números do 2×2.

## [3.14.0] - 2026-05-13

### Adicionado
- **Exportação para PDF** através do botão "Print report" já existente — novo bloco `@media print` em `styles.css` que transforma a página numa folha A4 com:
  - Cabeçalho compacto (apenas título DIAGCALC, sem destaques nem tag), seguido da matriz 2×2 com TP/FP/FN/TN e da probabilidade pré-teste introduzida.
  - Grelha de resultados (sensibilidade, especificidade, PPV, NPV, DOR, NNS, LR+, LR−, pré-teste e pós-testes) em duas colunas, com `page-break-inside: avoid` em cada carta.
  - Nomograma de Fagan (canvas + `<dl>` semântica) e listas de citações em hiperligações expandidas no formato `(URL)` para arquivo permanente.
  - Esquemas claros forçados (`#FFFFFF` fundo, `#000000` texto) independentemente do tema activo no ecrã.
- Ouvintes `beforeprint` / `afterprint` no `script.js` expandem todos os `<details>` da página antes da impressão (excepto os painéis "Explore prevalence", "Chain a second test", "Decision thresholds" e "Build an ROC curve" que ficam escondidos) e restauram o estado original depois.
- Painéis interactivos (slider de prevalência, encadeamento, limiares, ROC, κ, guia de interpretação, avisos de viés, footer) escondidos no PDF para manter uma folha limpa.

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
