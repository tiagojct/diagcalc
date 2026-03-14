# Changelog

Todas as alterações relevantes deste projeto são registadas aqui. As datas seguem o formato ISO (AAAA-MM-DD).

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
