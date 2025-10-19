# DIAGCALC 3.1

DIAGCALC é uma calculadora interativa concebida para apoiar estudantes das áreas da saúde na interpretação de testes diagnósticos. A aplicação permite explorar de forma guiada medidas como sensibilidade, especificidade, valores preditivos, likelihood ratios e probabilidades pós-teste.

## ✨ Novidades da versão 3.1

### 🎨 Design Minimalista Flexoki
- Novo esquema de cores Flexoki com paleta neutra e elegante
- **Modo escuro** com toggle funcional e persistência de preferência
- Interface limpa sem sombras volumétricas, focada no conteúdo

### 📊 Casos Clínicos Reais
- **7 novos cenários** baseados na literatura médica publicada
- Referências bibliográficas completas com DOIs clicáveis
- Estudos de D-dímero, troponina, mamografia, COVID-19, HIV, e mais

### 📈 Nomograma de Fagan
- Visualização gráfica interativa do teorema de Bayes
- Conexão visual entre probabilidade pré-teste, LR e pós-teste
- Renderização dinâmica adaptada ao tema escolhido

### 📚 Recursos Educativos
- Seção de referências bibliográficas expandida
- Links para recursos externos de qualidade
- Calculadoras complementares recomendadas

## Funcionalidades principais
- Introdução de dados através de uma matriz de confusão com validação em tempo real
- **10 cenários pré-configurados**: 3 genéricos e 7 da literatura médica
- Cálculo automático de intervalos de confiança a 95% com o método de Wilson
- Cartões de resultados com notas interpretativas e painel comparativo das probabilidades pré e pós-teste
- **Nomograma de Fagan** para visualização gráfica dos likelihood ratios
- Guia textual com definições, dicas clínicas e ligações para referências adicionais
- **Modo escuro/claro** com alternância fácil
- Botão de impressão para gerar relatórios de estudo

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
- `index.html` — Marcações principais da aplicação
- `styles.css` — Estilos Flexoki e definições de layout responsivo com dark mode
- `script.js` — Lógica de cálculo, validação, interação, tema e renderização do nomograma
- `CHANGELOG.md` — Histórico detalhado das versões
- `UPDATES.md` — Documentação completa das melhorias da v3.1
- `LICENSE` — Licença MIT

## Contribuições e evolução
Sugestões e contributos são bem-vindos. Consulte o `CHANGELOG.md` para acompanhar a evolução da aplicação. Planeia-se incluir novas visualizações e traduções no futuro.

## Licença
Distribuído sob a licença MIT. Consulte o ficheiro `LICENSE` para mais detalhes.

