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

Definidas em `src/renderer/styles/tokens.css`.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#1B1C1F` | fundo do app |
| `--bg-foot` | `#17181A` | rodapé |
| `--line` | `rgba(255,255,255,.07)` | divisórias e contornos |
| `--text` | `#F3F3F5` | texto principal |
| `--soft` | `#C9CBD1` | texto secundário importante (status, mensagens) |
| `--muted` | `#8E9099` | rótulos, tamanhos, controles discretos |
| `--faint` | `#5C5E66` | desabilitado, vazio |
| `--btn` / `--btn-hover` | `#2A2B30` / `#34353B` | botão principal (Limpar) |
| `--danger` | `#E5484D` | confirmação de apagar |
| — | `#000000` | só na tela de abertura |
| — | `#1F2023` | fundo da coluna de pastas |

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
| Display | Segoe UI Variable Display, 600 | número grande do disco (40 px), títulos |
| Texto | Segoe UI Variable Text | todo o resto (15–16,5 px) |
| Caminhos | Cascadia Mono (Consolas de reserva) | caminhos de pastas e arquivos (12–13 px) |

Números de tamanho usam `font-variant-numeric: tabular-nums` para não "dançar".

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ☰                                                ─  ▢  ✕     │ barra de título (40 px, arrastável)
├─────────────────────────────────────────────────────────────┤
│ 187,5 GB de 222,5 GB usados em C:        ⟳ Analisar de novo │
│ Dá para liberar 9,4 GB                                      │
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
  serão limpas. Tudo rola junto; o X fica sempre visível.

## Componentes

| Componente | Regras |
|---|---|
| **Controles** | "Analisar de novo" (topo do app) é texto + ícone, sem fundo nem borda. O ☰ fica na barra de título, só ícone, com `-webkit-app-region: no-drag` e `aria-label`. Ambos cinza (`--muted`), ficam claros no hover; o ☰ fica destacado com o menu aberto. |
| **Botão principal** | só um por tela: "Limpar X GB" no rodapé. Fundo `--btn`. Ele não apaga: abre o diálogo de confirmação. |
| **Diálogo de confirmação** | "Apagar X GB?" com cada categoria marcada e **o que vai acontecer** (campo `warning` de cada categoria). Perigo (vermelho, ex.: Lixeira) aparece **primeiro** e exige marcar "Entendi" para liberar o "Apagar"; atenção (ícone âmbar) explica efeitos colaterais. Título e botões fixos, só a lista rola. Foco começa em **Cancelar**; Esc, clique fora e Cancelar fecham sem apagar. "Apagar" bloqueado fica apagado (`.btn.danger:disabled`). |
| **Categoria** | checkbox colorido + ícone + nome + tamanho. Desmarcada: nome e ícone apagados. Vazia, sem permissão ("Precisa de admin") ou bloqueada ("Reinicie antes"): tudo em `--faint`, sem clique, motivo no tooltip. Categorias arriscadas (Lixeira, Windows Update) começam desmarcadas. Hover destaca o bloco dela na barra. |
| **Menu (☰)** | topo: cabeçalho compacto, símbolo pequeno ao lado do nome. Depois, por categoria: ponto colorido com glow, nome, tamanho; pastas em fonte mono, maiores primeiro, com a regra embaixo. |
| **Status** | uma linha: verbo ("Analisando", "Limpando") + caminho atual em mono, cortado no meio. |

Ícones das categorias: SVG 24×24 preenchidos com a cor da categoria; detalhes "vazados" na cor
do fundo (campo `icon` de cada arquivo em `src/cleaner/categories/`).

## Animação

Cada estado tem **uma** animação, sempre ligada a algo real:

| Estado | Animação | Código |
|---|---|---|
| Abrindo o app | tela preta; o símbolo surge nítido de um brilho, o nome aparece, tudo dissolve | `splash.css`, `views/splash.ts` |
| Analisando | onda de luz "chiada" passa pelos pixels vazios da barra | `scanWave` (`bar/paint.ts`) |
| Análise pronta | blocos se materializam pixel a pixel, de baixo para cima, com "pop" e lampejo branco, em cascata | `reveal()` / `cellAppear` |
| Parado | pixels acesos pulsam devagar; de vez em quando um dá um lampejo | `cellLight` |
| Limpando | **faísca** com fagulhas "come" o bloco da direita para a esquerda, no ritmo real dos bytes | `progress()` + `particles.ts` |
| Abrir o menu (☰) | gaveta desliza da esquerda (260 ms), o ☰ desliza junto e vira X, fundo escurece | `panel.css` |

Regras:

- A faísca é **exclusiva da limpeza**. Não usar faísca para outras coisas.
- Animar só `transform` e `opacity` em elementos HTML (nada que faça a página recalcular layout).
- Canvas: parado redesenha a 30 fps; sempre redesenhar na hora depois de mudar o tamanho.
- Com "reduzir movimento" do Windows ligado, tudo fica estático (CSS e canvas).

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
