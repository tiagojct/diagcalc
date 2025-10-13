# DIAGCALC 3.0

DIAGCALC é uma calculadora interativa concebida para apoiar estudantes das áreas da saúde na interpretação de testes diagnósticos. A aplicação permite explorar de forma guiada medidas como sensibilidade, especificidade, valores preditivos, likelihood ratios e probabilidades pós-teste.

## Funcionalidades principais
- Introdução de dados através de uma matriz de confusão com validação em tempo real.
- Cenários de estudo pré-configurados (rastreiros, estudos caso-controlo e clínica especializada) para experimentação rápida.
- Cálculo automático de intervalos de confiança a 95% com o método de Wilson.
- Cartões de resultados com notas interpretativas e painel comparativo das probabilidades pré e pós-teste.
- Guia textual com definições, dicas clínicas e ligações para referências adicionais.
- Botão de impressão para gerar relatórios de estudo.

## Pré-requisitos
- Browser moderno (Chrome, Firefox, Edge ou Safari) com suporte a ES6.
- Não são necessárias dependências adicionais: todos os recursos são ficheiros estáticos.

## Como utilizar
1. Abra o ficheiro `index.html` num navegador.
2. Opcionalmente, selecione um cenário de estudo pré-definido para preencher automaticamente a matriz.
3. Introduza valores inteiros para VP, FP, FN e VN, bem como a probabilidade pré-teste (em percentagem).
4. Clique em "Calcular resultados" para gerar as métricas e o gráfico comparativo.
5. Utilize o botão "Imprimir relatório" para exportar os resultados para PDF ou papel.

## Estrutura do projeto
- `index.html` — Marcações principais da aplicação.
- `styles.css` — Estilos e definições de layout responsivo.
- `script.js` — Lógica de cálculo, validação e interação com o utilizador.
- `CHANGELOG.md` — Histórico resumido das versões.

## Contribuições e evolução
Sugestões e contributos são bem-vindos. Consulte o `CHANGELOG.md` para acompanhar a evolução da aplicação. Planeia-se incluir novas visualizações e traduções no futuro.

## Licença
Distribuído sob a licença MIT. Consulte o ficheiro `LICENSE` para mais detalhes.

