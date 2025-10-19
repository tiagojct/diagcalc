# DIAGCALC - Melhorias Implementadas

**Data:** 19 de outubro de 2025  
**Versão:** 3.1

## 🎨 Design Minimalista Flexoki

### Esquema de Cores
- Implementado o esquema de cores **Flexoki** completo
- Paleta neutra com tons de bege/creme (#FFFCF0 a #100F0F)
- Acentos em azul, ciano, laranja e verde
- Design flat sem sombras volumétricas
- Bordas mais proeminentes (2px) com cantos menos arredondados (4px-8px)

### Modo Escuro
- ✅ **Toggle de tema** no cabeçalho
- Persistência de preferência no `localStorage`
- Respeita preferência do sistema operativo
- Paleta escura Flexoki otimizada para leitura noturna
- Transições suaves entre temas

## 📊 Novos Cenários Clínicos

### Casos Reais da Literatura Médica
Adicionados **7 novos cenários** baseados em estudos publicados:

1. **D-dímero para embolia pulmonar**
   - Righini M, et al. JAMA. 2014

2. **Troponina ultrassensível para EAM**
   - Reichlin T, et al. N Engl J Med. 2009

3. **Mamografia de rastreio**
   - Kopans DB, et al. Radiology. 2020

4. **Teste rápido antigénio COVID-19**
   - Dinnes J, et al. Cochrane Database Syst Rev. 2022

5. **ELISA para HIV**
   - Masciotra S, et al. J Clin Microbiol. 2013

6. **Teste rápido para Streptococcus**
   - Cohen JF, et al. Cochrane Database Syst Rev. 2016

7. **Radiografia de tórax para pneumonia**
   - Hagaman JT, et al. Am J Med Sci. 2009

### Referências Integradas
- Cada cenário médico inclui:
  - Descrição contextual
  - Autores e título do estudo
  - Journal e ano de publicação
  - DOI e link direto
- Visualização automática ao selecionar cenário

## 📈 Nomograma de Fagan

### Visualização Gráfica
- ✅ **Canvas interativo** desenhado dinamicamente
- Três escalas logarítmicas:
  - Probabilidade pré-teste
  - Likelihood ratio (LR+ e LR-)
  - Probabilidade pós-teste
- Linhas de conexão coloridas:
  - 🟠 Laranja para teste positivo (LR+)
  - 🟢 Verde para teste negativo (LR-)
- Marcadores percentuais em todas as escalas
- Responsivo e adaptado para dark mode

### Educação Visual
- Permite compreender intuitivamente o impacto dos LRs
- Mostra graficamente o teorema de Bayes
- Facilita a interpretação de múltiplos resultados

## 📚 Recursos Educativos

### Seção de Referências Bibliográficas
Nova seção com três categorias:

#### Literatura de Apoio
- Akobeng AK - Understanding diagnostic tests
- McGee S - Simplifying likelihood ratios
- Fagan TJ - Nomogram for Bayes theorem (original)

#### Recursos Online
- Centre for Evidence-Based Medicine (CEBM)
- StatPearls - Sensitivity and Specificity
- Deeks & Altman - BMJ series

#### Calculadoras Complementares
- MDCalc
- ClinCalc

### Links Externos
- Todos os links abrem em nova aba
- Atributos `rel="noopener noreferrer"` para segurança
- DOIs clicáveis para acesso direto aos artigos

## 🎯 Melhorias de UX

### Interface
- Seletor de cenários organizado com `<optgroup>`
- Separação visual entre cenários genéricos e casos reais
- Feedback visual ao selecionar cenários com referências
- Estilos melhorados para elementos de formulário

### Acessibilidade
- Ícones semânticos (📚 para referências)
- Estrutura HTML semântica mantida
- ARIA labels preservados
- Contraste adequado em ambos os temas

### Responsividade
- Canvas Fagan adaptável a diferentes tamanhos
- Toggle de tema centralizado em mobile
- Tooltips otimizados para telas pequenas
- Grid responsivo mantido e melhorado

## 🔧 Melhorias Técnicas

### JavaScript
- Modularização de funções
- Gestão de estado do tema
- Renderização dinâmica do canvas
- Suporte a device pixel ratio (DPR)

### CSS
- Variáveis CSS para temas
- Transições suaves
- Sistema de cores consistente
- Suporte completo a dark mode

### Performance
- Código otimizado
- Sem dependências externas
- localStorage para persistência leve

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome/Edge (90+)
- Firefox (88+)
- Safari (14+)
- Browsers modernos com suporte a ES6 e Canvas API

### Dispositivos
- Desktop (otimizado)
- Tablet (responsivo)
- Mobile (layout adaptado)

## 🚀 Próximas Melhorias Sugeridas

### Futuras Implementações
- [ ] Exportação de resultados para PDF/CSV
- [ ] Histórico de cálculos com comparação
- [ ] Tutorial interativo para novos utilizadores
- [ ] Internacionalização (EN, ES)
- [ ] PWA com service worker (offline)
- [ ] Tooltips inline com definições
- [ ] Mais cenários clínicos
- [ ] Testes automatizados

## 📄 Arquivos Modificados

- `index.html` - Estrutura HTML atualizada
- `styles.css` - Tema Flexoki e dark mode
- `script.js` - Novos cenários, tema e nomograma
- `UPDATES.md` - Este documento (novo)

## 💡 Como Usar as Novas Funcionalidades

### Alternar Tema
1. Clique no botão **◐** (ou ☀ em dark mode) no cabeçalho
2. A preferência é salva automaticamente

### Explorar Cenários Médicos
1. Selecione um cenário em "Casos da literatura médica"
2. Leia a referência bibliográfica que aparece
3. Clique no DOI para aceder ao artigo original
4. Ajuste os valores conforme necessário

### Interpretar o Nomograma de Fagan
1. Calcule os resultados com qualquer cenário
2. O nomograma aparece automaticamente
3. Observe as linhas coloridas conectando as probabilidades
4. Compreenda visualmente o impacto dos likelihood ratios

### Consultar Referências
1. Role até à seção "Recursos e referências"
2. Expanda cada categoria clicando no título
3. Aceda aos links externos para aprofundar conhecimentos

---

**Desenvolvido com ❤️ para educação em medicina baseada em evidências**
