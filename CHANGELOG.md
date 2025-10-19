# Changelog

Todas as alterações relevantes deste projeto são registadas aqui. As datas seguem o formato ISO (AAAA-MM-DD).

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

