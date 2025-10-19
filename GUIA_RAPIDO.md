# 🚀 Guia Rápido - DIAGCALC 3.1

## Índice
1. [Alternar entre Modo Claro e Escuro](#modo-escuro)
2. [Explorar Cenários da Literatura Médica](#cenários-clínicos)
3. [Interpretar o Nomograma de Fagan](#nomograma-de-fagan)
4. [Consultar Referências Bibliográficas](#referências)

---

## 🌓 Modo Escuro

### Como ativar
1. Localize o botão com o símbolo **◐** no canto superior direito do cabeçalho
2. Clique uma vez para alternar para modo escuro
3. O ícone muda para **☀** quando está em modo escuro
4. Clique novamente para voltar ao modo claro

### Notas
- A sua preferência é guardada automaticamente
- Da próxima vez que abrir a aplicação, o tema escolhido será aplicado
- Se não tiver preferência guardada, o DIAGCALC respeita a configuração do seu sistema operativo

---

## 📊 Cenários Clínicos

### Cenários Disponíveis

#### Genéricos (para treino básico)
- Programa de rastreio (prevalência baixa)
- Estudo caso-controlo
- Clínica especializada

#### Da Literatura Médica (casos reais)
1. **D-dímero para embolia pulmonar**
   - Wells score baixo + D-dímero
   - Referência: Righini M, et al. JAMA. 2014

2. **Troponina ultrassensível para EAM**
   - Diagnóstico de enfarte agudo do miocárdio
   - Referência: Reichlin T, et al. N Engl J Med. 2009

3. **Mamografia de rastreio**
   - Mulheres 50-69 anos
   - Referência: Kopans DB, et al. Radiology. 2020

4. **Teste rápido antigénio COVID-19**
   - Sintomáticos (primeiros 7 dias)
   - Referência: Dinnes J, et al. Cochrane. 2022

5. **ELISA para HIV**
   - Teste de 4ª geração
   - Referência: Masciotra S, et al. J Clin Microbiol. 2013

6. **Teste rápido para Streptococcus**
   - Faringite em crianças
   - Referência: Cohen JF, et al. Cochrane. 2016

7. **Radiografia de tórax para pneumonia**
   - Pneumonia adquirida na comunidade
   - Referência: Hagaman JT, et al. Am J Med Sci. 2009

### Como usar
1. Abra o menu "Carregar cenário de estudo"
2. Escolha um cenário da lista
3. Os valores da matriz de confusão são preenchidos automaticamente
4. **Novidade**: Uma caixa com a referência bibliográfica aparece abaixo do selector
5. Clique no DOI para aceder ao artigo original
6. Ajuste os valores conforme necessário
7. Clique em "Calcular resultados"

---

## 📈 Nomograma de Fagan

### O que é?
O Nomograma de Fagan é uma representação gráfica do teorema de Bayes que mostra visualmente como os likelihood ratios (LR) transformam a probabilidade pré-teste em probabilidade pós-teste.

### Como interpretar

#### Estrutura do gráfico
- **Escala esquerda**: Probabilidade pré-teste (%)
- **Escala central**: Likelihood Ratio (escala logarítmica)
- **Escala direita**: Probabilidade pós-teste (%)

#### Linhas coloridas
- 🟠 **Linha laranja (tracejada)**: Teste POSITIVO
  - Liga pré-teste → LR+ → pós-teste positivo
  - Mostra o aumento da probabilidade com resultado positivo

- 🟢 **Linha verde (tracejada)**: Teste NEGATIVO
  - Liga pré-teste → LR- → pós-teste negativo
  - Mostra a redução da probabilidade com resultado negativo

#### Como usar
1. Calcule os resultados de qualquer cenário
2. O nomograma aparece automaticamente acima dos cartões de resultados
3. Localize o ponto da probabilidade pré-teste na escala esquerda
4. Siga a linha laranja para ver o impacto de um resultado positivo
5. Siga a linha verde para ver o impacto de um resultado negativo
6. Compare as probabilidades pós-teste na escala direita

#### Exemplos de interpretação

**Teste com LR+ alto (>10)**
- A linha laranja sobe acentuadamente
- Grande aumento da probabilidade pós-teste
- Teste útil para **confirmar** diagnóstico

**Teste com LR- baixo (<0.1)**
- A linha verde desce acentuadamente
- Grande redução da probabilidade pós-teste
- Teste útil para **excluir** diagnóstico

**Teste com LR próximo de 1**
- As linhas ficam quase horizontais
- Pouco impacto na probabilidade
- Teste de utilidade clínica limitada

---

## 📚 Referências

### Seções disponíveis

#### 1. Literatura de Apoio
Artigos fundamentais sobre testes diagnósticos:
- Akobeng AK - Série didática sobre sensibilidade e especificidade
- McGee S - Simplificação dos likelihood ratios
- Fagan TJ - Artigo original do nomograma (1975)

#### 2. Recursos Online
Links para materiais educativos de qualidade:
- **CEBM Oxford** - Ferramentas de medicina baseada em evidências
- **StatPearls** - Livro didático online (acesso livre)
- **BMJ** - Série de artigos sobre testes diagnósticos

#### 3. Calculadoras Complementares
Outras ferramentas úteis:
- **MDCalc** - Calculadoras médicas validadas
- **ClinCalc** - Calculadora de tamanho amostral

### Como aceder
1. Role até ao final da página
2. Localize a seção "Recursos e referências"
3. Clique em cada categoria para expandir
4. Clique nos links para abrir em nova aba

---

## 💡 Dicas de Utilização

### Fluxo de Trabalho Recomendado

1. **Escolha um cenário**
   - Comece com cenários genéricos para familiarização
   - Avance para casos da literatura para treino avançado

2. **Calcule e observe**
   - Analise os cartões de resultados
   - Compare pré-teste vs. pós-teste no gráfico de barras
   - Estude o nomograma de Fagan

3. **Experimente alterações**
   - Modifique valores individualmente
   - Observe o impacto nos likelihood ratios
   - Compare diferentes prevalências

4. **Aprofunde conhecimentos**
   - Leia as referências bibliográficas
   - Consulte o guia de interpretação
   - Aceda aos recursos externos

### Cenários de Aprendizagem

#### Para iniciantes
- Comece com "Programa de rastreio"
- Observe a diferença entre sensibilidade e VPP
- Experimente mudar a prevalência

#### Para avançados
- Use cenários da literatura médica
- Compare LRs entre diferentes testes
- Analise criticamente os resultados no nomograma

#### Para docentes
- Use a função de impressão para criar exercícios
- Demonstre visualmente com o nomograma
- Partilhe referências bibliográficas com estudantes

---

## ❓ FAQ

### O nomograma não aparece?
- Certifique-se que clicou em "Calcular resultados"
- Verifique que os valores introduzidos são válidos
- O nomograma só aparece quando há LRs calculáveis

### Como guardar os resultados?
- Use o botão "Imprimir relatório"
- Configure a impressora para "Guardar como PDF"
- Ou tire um screenshot com Cmd+Shift+4 (Mac) ou Win+Shift+S (Windows)

### Posso usar dados reais dos meus doentes?
**NÃO.** A DIAGCALC é apenas para fins pedagógicos. Não introduza dados reais de doentes. Use apenas dados agregados e anonimizados de estudos publicados.

### O modo escuro não persiste?
- Verifique se o navegador permite localStorage
- Alguns modos privados/anónimos podem bloquear esta funcionalidade
- Limpar cookies/dados pode apagar a preferência guardada

### Onde posso reportar problemas?
- Contacte: tiagojacinto@med.up.pt
- Ou abra uma issue no repositório do projeto

---

## 🎓 Recursos Adicionais

### Para saber mais sobre:

**Testes diagnósticos**
- Consulte a seção "Guia de interpretação" na aplicação
- Leia os artigos da série Akobeng na seção de referências

**Teorema de Bayes aplicado**
- Artigo original de Fagan (1975)
- McGee S. sobre simplificação de LRs

**Medicina baseada em evidências**
- Website do CEBM Oxford
- Recursos do StatPearls

---

**Última atualização:** 19 de outubro de 2025  
**Versão:** 3.1
