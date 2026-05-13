# Changelog

Todas as alterações relevantes deste projeto são registadas aqui. As datas seguem o formato ISO (AAAA-MM-DD).

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
