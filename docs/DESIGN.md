# Design — Vanish

Como o Vanish deve parecer e se comportar. Vale para qualquer tela ou recurso novo.

## Conceito

**Pixels de luz num fundo escuro.** O disco é mostrado como uma grade de pixels que brilham
(bloom), cada categoria com a sua cor. Limpar é literalmente ver os pixels sendo apagados por uma
faísca. O símbolo é uma grade de pixels **se desfazendo**: arquivos sumindo.

**Nome: Vanish** ("sumir"): é o que acontece com os arquivos que só ocupam espaço e o que o
símbolo mostra, pixels sumindo. Curto, sem acento, funciona em qualquer idioma. Escrito "Vanish"
no texto corrido; na marca (abertura e menu) aparece em minúsculas: "vanish".

Referência inicial: um mockup de outro app (só no PC do autor, em `docs/reference/mockup-original.png`, fora do repositório por ser design de terceiros)
(barra de pixels com glow, grade de categorias, barra de ação no rodapé).

**Acabamento "LED de vidro"** (`bar/led.ts`): cada pixel aceso é um LED, com um fio de reflexo em
cima e sombra embaixo; a cor de cada bloco esquenta de baixo para cima (topo até 12% mais escuro,
fundo até 28% mais claro); a luz se acumula no fundo e vaza para os pixels apagados; os
quadradinhos vazios parecem vidro escuro; o contorno dos blocos tem cantos em degrau, como pixel
art; o bloom tem três camadas (véu largo, halo e brilho justo).

Princípios:

1. **Uma coisa brilha.** A barra de pixels é o centro visual. O resto da tela é calmo, cinza e
   discreto, para não competir com ela.
2. **Movimento mostra o que está acontecendo.** Cada animação corresponde a um estado real
   (analisando, pronto, limpando). Nada se mexe só para enfeitar.
3. **Transparência antes de apagar.** O usuário sempre consegue ver o que vai ser apagado
   (coluna de pastas) e sempre confirma antes (botão em dois passos).
4. **Nada de layout pulando.** Abrir painéis e trocar estados não pode redimensionar a janela nem
   empurrar o conteúdo. Painéis deslizam por cima.

## Cores

Definidas em `src/renderer/styles/tokens.css`. Toda cor com matiz é token; só luz e sombra de
relevo (branco ou preto translúcido em reflexos, sombras e hover) ficam direto no CSS de cada parte.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#1B1C1F` | fundo do app |
| `--bg-foot` | `#17181A` | rodapé |
| `--line` | `rgba(255,255,255,.07)` | divisórias e contornos |
| `--text` | `#F3F3F5` | texto principal |
| `--soft` | `#C9CBD1` | texto secundário importante (status, mensagens) |
| `--muted` | `#8E9099` | rótulos, tamanhos, controles discretos |
| `--dim` | `#878992` | texto de estado que precisa ser lido ("Precisa de admin", "Vazia"); ≥ 4,5:1 no fundo e na gaveta |
| `--faint` | `#5C5E66` | só o que está desabilitado (não precisa ser lido) |
| `--btn` / `--btn-hover` | `#2A2B30` / `#34353B` | botão principal (Limpar) |
| `--primary` / `--primary-hover` | `#3A3C44` / `#45474F` | confirmar uma limpeza só de caches no diálogo: o mesmo cinza, um tom acima do "Cancelar" |
| `--danger` / `--danger-text` | `#CC3A3F` / `#FF9A9D` | apagar o que não volta (branco sobre ele: 4,95:1) |
| `--spark` | `#FFD9A0` | número liberado no fim da limpeza (cor da faísca) |
| `--brand-blue` / `--brand-cyan` | `#3D8BFF` / `#68CCFF` | cores do símbolo: gráfico do histórico e LED de "Atualizar" |
| `--on-danger` | `#FFFFFF` | texto do botão vermelho |
| `--splash-bg` | `#000000` | fundo da tela de abertura |
| — | `#000000` | só na tela de abertura |
| `--surface-panel` / `--surface-modal` | `#1F2023` / `#202125` | gaveta / diálogo |

**Cores das categorias** (cada uma no arquivo da categoria em `src/cleaner/categories/`, usadas na barra, nos
checkboxes, nos ícones e na coluna de pastas):

| Categoria | Cor |
|---|---|
| Temporários | `#3D8BFF` azul |
| Navegadores | `#2FD467` verde |
| Cache de apps | `#FF4FA3` rosa |
| Desenvolvimento | `#8B6CFF` violeta |
| Jogos e gráficos | `#FF8A3D` laranja |
| Miniaturas | `#22D3EE` ciano |
| Relatórios de erro | `#FFC531` âmbar |
| Windows Update | `#B8BCC6` prata |
| Lixeira | `#FF4D4D` vermelho |

Faísca e fagulhas: tons quentes `#FFF4E0`, `#FFE3B3`, `#FFB45E`, `#FFD9A0`.

O app é só escuro (não há tema claro).

## Tipografia

Fontes do próprio Windows 11, mais uma fonte de pixel só para o nome:

| Papel | Fonte | Onde |
|---|---|---|
| Marca | **Sora** 600 (geométrica de cantos suaves, licença OFL, vai junto com o app em `src/renderer/fonts/`) | **só** o nome, em minúsculas ("vanish"): tela de abertura (46 px) e topo do menu (28 px), espaçamento -0,01em e leve brilho azul |
| Display | Segoe UI Variable Display, 600 | número grande (40 px: quanto dá para liberar), títulos |
| Texto | Segoe UI Variable Text | todo o resto (15–16,5 px) |
| Caminhos | Cascadia Mono (Consolas de reserva) | caminhos de pastas e arquivos (12–13 px) |

Números de tamanho usam `font-variant-numeric: tabular-nums` para não "dançar".

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ☰                                                ─  ▢  ✕     │ barra de título (40 px, arrastável)
├─────────────────────────────────────────────────────────────┤
│ 9,4 GB para liberar                        ⟳ Analisar de novo │
│ 187,5 GB usados de 222,5 GB em C: · última limpeza há 9 dias │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │▓▓▓▓│▓▓▓▓│▓▓▓│▓▓▓▓▓▓▓▓▓▓▓▓│▓│▓│▓▓▓│▓│    barra de pixels   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ☑ ● Temporários  857 MB  ☑ ● Navegadores 1,1 GB  ☑ ● …       │ grade 3 colunas
├─────────────────────────────────────────────────────────────┤
│ ◈ 9,4 GB selecionados. Os apps recriam…      [ Limpar 9,4 GB ]│ rodapé
└─────────────────────────────────────────────────────────────┘
```

- Janela padrão 980 × 560, mínima 820 × 540. Margem lateral de 32 px.
- Tudo alinhado à esquerda; ações à direita (topo e rodapé).
- A barra de título não tem logo nem nome: só o ☰ colado no canto esquerdo (46 × 40 px, mesmo
  tamanho dos botões do Windows no canto direito) e os botões do Windows.
- O menu do ☰ é uma gaveta de 420 px **da altura inteira da janela** (cobre a barra de título) que
  desliza da esquerda **por cima** do conteúdo. O próprio ☰ desliza junto, para no canto direito da
  gaveta e **vira um X** (as linhas giram), que é o botão de fechar. Com o fundo escurecido
  atrás. Dentro dele: um cabeçalho compacto (símbolo de 40 px ao lado do nome); abaixo, as pastas que
  serão limpas. A marca e o X ficam fixos no topo; o resto rola.

## Componentes

| Componente | Regras |
|---|---|
| **Controles** | "Analisar de novo" (topo do app) é texto + ícone, sem fundo nem borda. O ☰ fica na barra de título, só ícone, com `-webkit-app-region: no-drag` e `aria-label`. Ambos cinza (`--muted`), ficam claros no hover; o ☰ fica destacado com o menu aberto. |
| **Botão principal** | só um por tela: "Limpar X GB" no rodapé (`.btn-clean`), em vidro cinza (degradê `--btn-hover` → `--btn`, luz de 1 px em cima, borda fina, sombra curta). Sem ícone; ao apertar, afunda 1 px. Desabilitado fica chapado. Sem pixels nem branco (o usuário não gostou). Ele não apaga: abre o diálogo de confirmação. Ao lado da mensagem do rodapé fica o símbolo do Vanish (`mark.svg`, 26 px). |
| **Diálogo de confirmação** | O peso acompanha o risco. **Só caches**: "Limpar X GB?", frase tranquila ("os apps recriam o que precisarem"), efeitos colaterais em texto simples cinza, botão cinza um tom acima do "Cancelar" (`.btn.primary`). **Com algo que não volta** (aviso `danger`, ex.: Lixeira): "Apagar X GB?", esse item primeiro, em vermelho com ⚠, "Entendi" obrigatório e botão vermelho. O ⚠ fica só para o perigo. Antes da lista, o bloco "Para liberar tudo, feche antes:" com uma etiqueta por programa (campo `closeFirst`). Título e botões fixos; só a lista rola, com o pé esmaecido enquanto houver mais itens. Foco começa em **Cancelar**; Esc, clique fora e Cancelar fecham sem apagar. |
| **Categoria** | checkbox de pixel (ao marcar, enche com a cor e o ✓ desenhado em 7 pixels acende um a um) + ícone + nome + tamanho. Em janela estreita (< 900 px) o texto diminui um pouco. Desmarcada: nome e ícone apagados. Vazia, sem permissão ("Precisa de admin") ou bloqueada ("Reinicie antes", "Bloqueada" ou "Não analisada", conforme o motivo): nome e ícone apagados, motivo curto em `--dim` no lugar do tamanho e a explicação completa no tooltip e no `aria-description` (a linha continua focável com `aria-disabled`, para o teclado chegar ao motivo). Categorias arriscadas (Lixeira, Windows Update) começam desmarcadas. Hover destaca o bloco dela na barra e manda uma onda de luz por ele; desmarcada, o bloco dela adormece em cinza. |
| **Menu (☰)** | pontos das categorias são LEDs (reflexo em cima, sombra embaixo, halo curto), iguais aos do diálogo. Topo: cabeçalho compacto (símbolo pequeno ao lado do nome), **fixo** na linha do X enquanto o resto rola. Embaixo do título, o resumo do que vai acontecer ("5,2 GB em 57 pastas", só categorias marcadas). Por categoria: ponto colorido, nome e tamanho, num cabeçalho que **gruda** logo abaixo da marca enquanto as pastas dela rolam. Pastas em fonte mono, maiores primeiro: o caminho até a pasta em `--muted` e o **nome da pasta em destaque**; quebra de linha só depois das barras; a regra embaixo. Categoria desmarcada mostra só "Desmarcada: não será limpa" e as pastas ficam recolhidas em "Ver N pastas". A barra de rolagem começa abaixo do X. |
| **Topo** | número grande = quanto dá para liberar ("para liberar"); depois de limpar, o total liberado ("liberados"); "Tudo limpo" quando não há nada; "—" + o problema quando algo falhou. Linha de baixo: parado, o disco usado e "última limpeza há N dias" em `--muted`; trabalhando, o verbo ("Analisando", "Limpando") + caminho atual em mono, cortado no meio. Só o rodapé (`#msg`) é `aria-live`. |
| **Precisa de administrador** | linha discreta embaixo das categorias (`--muted`, ícone de escudo em traço): "Windows Update precisa de administrador." + botão com cara de link "Abrir como administrador" (`.link-btn`, sublinhado fino). Só aparece se alguma categoria tiver `denied` e o app não estiver elevado. |
| **Aberto em outra conta** | mesma linha discreta, com ícone de pessoa no tom `--danger-text` e texto em `--soft`: "O Vanish foi aberto como administrador na conta \"X\". O que ele limpa agora (...) é dessa conta, não da sua." Só aparece quando o UAC reabriu o app na conta de outro administrador (`otherAccount`). |
| **Histórico (gaveta)** | logo abaixo da marca: "Liberado com o Vanish", total em display 28 px, "liberados em N limpezas" e um gráfico de 8 semanas: cada semana é uma coluna de 10 pixels largos, acesos de baixo para cima no degradê do símbolo (azul `#3D8BFF` → ciano `#68CCFF`) com acabamento LED; apagados como o vidro vazio da barra. A semana atual tem um traço embaixo. Tooltip por coluna com a data e o total. |
| **Atalhos** | Ctrl+R ou F5: analisar de novo. Ctrl+Enter: abre a confirmação (nunca confirma; com o diálogo aberto os atalhos não funcionam). Esc fecha diálogo e gaveta. Os atalhos aparecem no tooltip dos botões. |

Ícones das categorias: SVG 24×24 preenchidos com a cor da categoria; detalhes "vazados" na cor
do fundo (campo `icon` de cada arquivo em `src/cleaner/categories/`).

## Animação

Cada estado tem **uma** animação, sempre ligada a algo real:

| Estado | Animação | Código |
|---|---|---|
| Abrindo o app | tela preta; o símbolo surge nítido de um brilho, o nome aparece, tudo dissolve | `splash.css`, `views/splash.ts` |
| Analisando | onda de luz "chiada" passa pelos pixels vazios da barra | `scanWave` (`bar/paint.ts`) |
| Analisando (botão) | o ícone de "Analisar de novo" vira uma grade 3×3 de pixels que acendem em espiral (borda no sentido horário, centro por último), deixando rastro | `.px-spin` (`header.css`) |
| Análise pronta | blocos se materializam pixel a pixel, de baixo para cima, com "pop" e lampejo branco, em cascata | `reveal()` / `cellAppear` (`appear.ts`) |
| Parado | (15 quadros/s com foco, 5 sem foco, nada minimizado) pixels acesos pulsam devagar; de vez em quando um dá um lampejo; a cada 2,5–6 s um pixel cai do topo do bloco e pousa na pilha (lixo acumulando) | `cellLight`, `dropAt` (`effects.ts`) |
| Passar o mouse/foco na categoria | onda de luz atravessa o bloco dela, inclinada (as linhas de baixo na frente), acendendo até os pixels apagados | `ripple` (`effects.ts`) |
| Marcar / desmarcar | desmarcada, o bloco **adormece** pixel a pixel (ordem aleatória fixa, ~350 ms) até ficar cinza, sem brilho e com contorno apagado; marcada, reacende pixel a pixel com lampejo branco. A barra mostra o que vai ser limpo | `wakeState` (`effects.ts`) |
| Limpando | **faísca** com fagulhas "come" o bloco da direita para a esquerda, no ritmo real dos bytes; logo atrás dela os pixels **se desfazem na diagonal** (somem primeiro em cima e longe da faísca, esquentam e sobem para a direita), como o símbolo do Vanish | `progress()` + `particles.ts` + `dissolveLeft` (`effects.ts`) |
| Fim da análise / da limpeza | o número grande passa por blocos de 8, 5 e 3 px até ficar nítido (420 ms, filtros SVG `#px8`/`#px5`/`#px3`); no fim da limpeza ele também sobe de 0 até o total liberado (700 ms) chegando na cor da faísca e esfriando até o branco | `views/tween.ts`, `freed-in` (`header.css`) |
| Abrir o menu (☰) | gaveta desliza da esquerda (260 ms), o ☰ desliza junto e as linhas giram até o X, piscando no meio do giro nas cores de três categorias (azul, rosa, ciano); no hover as linhas se soltam para os lados, acendem nessas cores com brilho e voltam (`views/menu-icon.ts`). O símbolo do topo fica parado. As colunas do histórico sobem pixel a pixel com "pop" e lampejo, o pixel do topo de cada uma fica com brilho fixo (sem animação contínua: um pulso e uma faixa de luz custavam ~90% de um núcleo com a gaveta aberta). Fundo escurece. A borda direita da gaveta é um fio de luz com pixels LED do tamanho dos da barra (6 px) em três colunas cada vez mais ralas, nas cores das categorias (na ordem da barra, de cima para baixo, uma cor se misturando na próxima), com o mesmo bloom da barra (halo largo + brilho justo) e alguns pixels quentes de núcleo branco. Com a gaveta aberta eles vivem como a barra parada: cada um pulsa no seu ritmo, de vez em quando um dá um lampejo, e a cada ~1,6 s um pixel da ponta se solta e flutua para cima e para a direita, encolhendo e esquentando até sumir (30 fps, só com a gaveta aberta; parado com "reduzir movimento"); desenhada ao abrir (`views/panel-edge.ts`) | `panel.css`, `history.css` |
| Diálogo de confirmação | surge num mosaico: quadrados de 18 px crescem do centro até cobrir tudo (300 ms, 6 degraus); some do mesmo jeito, mais rápido (150 ms) | `modal-mosaic` + `--tile` (`confirm.css`) |
| Nada para limpar | a barra fica só com o vidro vazio e um pixel piscando devagar no meio, embaixo, como um cursor esperando | `drawRestingPixel` (`paint.ts`) |

Regras:

- A faísca é **exclusiva da limpeza**. Não usar faísca para outras coisas.
- Animar só `transform` e `opacity` em elementos HTML (nada que faça a página recalcular layout).
- Canvas: parado redesenha a 30 fps; sempre redesenhar na hora depois de mudar o tamanho.
- Com "reduzir movimento" do Windows ligado, tudo fica estático (CSS e canvas): marcar/desmarcar troca a cor do bloco na hora, sem onda, queda nem pedaços voando.

### Bloom (brilho)

A barra é desenhada duas vezes: uma imagem nítida e uma camada só com o que brilha (pixels acesos,
contornos, faísca, fagulhas). A camada de brilho é borrada (14 px e 4 px) e somada por cima com
`globalCompositeOperation = 'lighter'`. Pixels mais fortes ganham um núcleo quase branco.

## Marca

Tudo gerado por `scripts/make-logo.mjs`.

### Símbolo: pixels se desfazendo

Uma grade 4 × 4 de pixels quadrados (cantos arredondados) que **se desfaz na diagonal**: a metade
de baixo à esquerda é um bloco sólido e brilhante; em direção ao alto à direita os pixels
**encolhem** até virar pontinhos, e o canto some. É o nome **Vanish** ("sumir")
em forma de símbolo.

- **Inspirado na barra, sem copiar:** pixels quadrados, brilho e "cheio embaixo" vêm da barra;
  a forma é própria.
- **Cor:** uma só família, azul `#3D8BFF` (canto sólido) → ciano claro (pontinhos). O desfazer
  vem do tamanho, não de transparência, para a cor não escurecer.
- **Brilho:** só nos pixels sólidos, suave.
- **Arquivos:** `assets/logo.svg` (símbolo no quadrado escuro `#16171A`, deslocado um pouco para o
  alto à direita para compensar o peso visual) → `assets/icon.png`; `assets/mark.svg` (só o
  símbolo, fundo transparente).

### Uso com o nome

- Tela de abertura: símbolo (150 px) em cima, **vanish** (Sora 600, 46 px, minúsculas) embaixo.
- Topo do menu ☰: cabeçalho compacto, símbolo pequeno (40 px) à esquerda e o nome (21 px) ao lado.

### Regras

- **Sem violeta** na identidade (regra da skill taste). O violeta só existe como cor da
  categoria Desenvolvimento.
- Legível em 32 px.
- Sem mascote ilustrado e sem copiar a barra: o símbolo sugere, não repete.

Para mudar: edite o script e rode `npm run logo && npm run icon`. Nunca edite os SVGs à mão.

## Textos

- Português do Brasil, frase normal (só a primeira letra maiúscula), sem gírias.
- O botão diz exatamente o que acontece: "Limpar 9,4 GB", "Apagar 9,4 GB", "Analisar de novo".
- Mensagens explicam o que aconteceu e o que fazer: "3 arquivos estavam em uso e ficaram para a
  próxima limpeza." Nunca pedir desculpas, nunca ser vago.
- Tamanhos em base 1024, como o Explorador ("9,4 GB", "857,5 MB").
- Avisar quando algo é irreversível ("Isso não pode ser desfeito", "A lixeira é esvaziada de vez").

## Acessibilidade

- Foco visível em tudo (`:focus-visible` com contorno branco).
- Categorias são `role="checkbox"` com `aria-checked`.
- Controles só com ícone têm `aria-label` e `title`.
- Esc fecha a coluna de pastas e cancela a confirmação.
- Respeitar "reduzir movimento".

## O que já foi testado e rejeitado

- **Logo e nome pequenos na barra de título**: tirados; a marca aparece dentro do menu.
- **Menu abrindo embaixo da barra de título com o ☰ parado e um X separado**: trocado pela gaveta
  de altura inteira com o ☰ que desliza e vira X.
- **Nomes "Faxina", "Dudu Cleaner" e "Vanish"**: trocados por **Vanish**, que descreve o símbolo.
- **Fonte de pixel Silkscreen no nome**: dura e "de videogame", brigava com os quadrados arredondados do símbolo. Trocada pela Sora.
- **Primeiras versões do fantasma**: grade 14 × 15 com cabeça quadrada, pixels apagados
  aleatórios, olhos feitos de quadradinhos separados (pareciam janelas), sem pupila nem boca e
  glow forte demais. Ficavam "esquisitos".
- **Fantasma detalhado com rosto** (olhos com pupila, sorriso, volume, gradiente de 6 cores):
  "medonho". Lição: menos detalhe, mais símbolo.
- **Fantasma minimalista liso** (silhueta sólida com gradiente): não combinava com a barra.
- **Fantasma no estilo da barra**: combinava, mas ainda não "prestava".
- **Wordmark + mini barra embaixo e ícone "G" de pixels**: a mini barra era uma cópia do gráfico.
  Lição: a marca deve ser **inspirada** na barra, não uma miniatura dela.
- **Abrir as pastas aumentando a janela** (para a direita e depois para a esquerda): a janela
  "bugava" visualmente enquanto crescia. Painéis ficam **dentro** da janela.
- **Botões do topo com fundo e borda**: pesados demais. Topo usa controles discretos.
- **Faísca na entrada dos blocos**: a faísca ficou reservada para a limpeza; a entrada usa o
  surgimento pixel a pixel.
