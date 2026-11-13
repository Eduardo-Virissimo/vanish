# Arquitetura — Vanish

Como o código está organizado e como as partes conversam. Para mudanças do dia a dia (adicionar
pastas e categorias), veja o [guia de manutenção](MAINTENANCE.md).

## Estrutura de pastas

```
cleaner/
├── README.md               apresentação e como rodar
├── AGENTS.md               regras para quem (pessoa ou IA) for mexer no código
├── docs/                   documentação (índice em docs/README.md)
│   └── reference/          imagens de referência (mockup original, fantasma antigo)
├── assets/                 arquivos gerados pelos scripts de logo
│   ├── logo.svg            ícone: símbolo no quadrado escuro; fonte do icon.png
│   ├── mark.svg            só o símbolo (pixels se desfazendo): abertura e menu
│   └── icon.png            ícone da janela/barra de tarefas
├── scripts/
│   ├── build.mjs           compila src/ → dist/ com o esbuild e copia os assets
│   ├── test.mjs            compila tests/ e roda com o executor de testes do Node
│   ├── make-logo.mjs       desenha o símbolo e salva os SVGs
│   └── render-icon.cjs     transforma o logo.svg em icon.png usando o próprio Electron
├── tests/
│   ├── categories.test.ts  regras de segurança de TODAS as categorias (o "guarda-costas")
│   └── engine.test.ts      motor de análise/limpeza em pastas falsas
├── src/
│   ├── shared/             usado pelos dois lados (main e tela)
│   │   ├── types.ts        formatos de dados: categoria, pasta, aviso, resultado, disco
│   │   └── ipc.ts          lista dos canais de comunicação e o que cada um envia/recebe
│   │
│   ├── cleaner/            o "motor": sabe O QUE apagar e COMO (roda no main, com acesso ao disco)
│   │   ├── categories/     UM ARQUIVO POR CATEGORIA: nome, cor, ícone, aviso e pastas
│   │   │   ├── index.ts        a lista, na ordem em que aparece na tela
│   │   │   ├── _icon.ts        cor dos detalhes "vazados" dos ícones
│   │   │   └── temp · browsers · apps · dev · games · thumbs · errors · update · trash (.ts)
│   │   ├── paths.ts        pastas do Windows (%TEMP%, %LOCALAPPDATA%…) e atalhos para caches
│   │   ├── types.ts        tipos Target (uma pasta), Category, Guard e defineCategory()
│   │   ├── guards.ts       travas checadas antes de analisar/limpar (ex.: reinício pendente)
│   │   ├── fs-walk.ts      percorre pastas sem seguir links; resolve "*" nos caminhos
│   │   ├── engine.ts       scanCategory (só lê) e cleanCategory (apaga), com detalhe por pasta
│   │   └── recycle-bin.ts  lê o tamanho e esvazia a Lixeira
│   │
│   ├── main/               processo principal do Electron
│   │   ├── index.ts        entrada: registra o IPC e abre a janela
│   │   ├── window.ts       cria a janela (tamanho, cores, segurança, trazer para a frente)
│   │   ├── ipc.ts          responde aos pedidos da tela usando o motor
│   │   └── timing.ts       utilitários: limitar envios e impedir duas tarefas ao mesmo tempo
│   │
│   ├── preload/
│   │   └── index.ts        ponte segura: expõe window.cleaner para a tela
│   │
│   └── renderer/           a tela (roda como uma página web, sem acesso ao Node)
│       ├── index.html      esqueleto da página
│       ├── main.ts         entrada: monta as views, liga os botões, abre a tela de abertura
│       ├── controller.ts   ações (analisar, limpar, confirmar) e reação aos avisos do main
│       ├── state.ts        estado da tela e consultas (o que está selecionado, quanto soma…)
│       ├── format.ts       formata bytes ("9,4 GB"), plurais e caminhos
│       ├── dom.ts          atalho $() para buscar elementos
│       ├── global.d.ts     diz ao TypeScript que window.cleaner existe
│       ├── views/          cada parte da tela se desenha a partir do estado
│       │   ├── splash.ts       tela de abertura (símbolo + "vanish" sobre preto)
│       │   ├── header.ts       espaço usado, status e "Analisar de novo"
│       │   ├── categories.ts   grade de categorias com checkbox
│       │   ├── footer.ts       mensagem e botão de limpar (que abre a confirmação)
│       │   ├── confirm.ts      diálogo "Apagar X GB?" com o aviso de cada categoria
│       │   └── panel.ts        menu do ☰: marca e as pastas reais
│       ├── bar/            a barra de pixels (canvas)
│       │   ├── pixel-bar.ts    estado e loop de animação (orquestra o resto)
│       │   ├── layout.ts       cálculo puro: quanto cada bloco ocupa e animação dos tamanhos
│       │   ├── paint.ts        desenho: trilha e onda de análise, blocos, faísca, bloom
│       │   ├── cells.ts        os quadradinhos: pulso, surgimento com "pop"
│       │   ├── particles.ts    fagulhas que sobem da faísca de limpeza
│       │   └── geometry.ts     medidas, tipos e utilitários compartilhados
│       ├── fonts/          Sora (fonte do nome) + licença OFL-Sora.txt
│       └── styles/         CSS separado por parte da tela, juntado em app.css no build
│           ├── index.css       importa os outros
│           ├── fonts.css · tokens.css · base.css
│           └── header · bar · categories · footer · panel · folders · confirm · splash (.css)
│
├── .tmp/                   testes compilados (gerado, não editar)
└── dist/                   gerado pelo build (não editar)
```

## Por que essa divisão

O Electron roda o app em **três lugares separados**, e cada pasta corresponde a um deles:

| Pasta | Onde roda | Pode acessar o disco? |
|---|---|---|
| `main/` + `cleaner/` | processo principal (Node.js) | sim |
| `preload/` | ponte entre os dois | só o necessário para a ponte |
| `renderer/` | a janela (como um navegador) | não |

A tela **nunca** mexe em arquivos diretamente. Ela pede ao processo principal pelos canais
definidos em `shared/ipc.ts`, e o preload só deixa passar esses canais. Assim, mesmo que algo dê
errado na tela, ela não consegue apagar nada fora da lista de categorias.

**Uma categoria = um arquivo.** Tudo de uma categoria (o que mostrar e o que apagar) mora em
`src/cleaner/categories/<id>.ts`. A tela recebe nome, cor, ícone, aviso e marcação padrão pelo
`app:init`; os caminhos nunca saem do processo principal. Por isso adicionar uma categoria não
exige mexer na tela.

**Testes como trava de segurança.** `tests/categories.test.ts` recusa qualquer categoria que
aponte para fora das áreas permitidas, para pastas do sistema ou para dados do usuário, ou que
falte na auditoria. Regras em [MAINTENANCE.md](MAINTENANCE.md).

## Canais de comunicação (IPC)

Definidos em `src/shared/ipc.ts`.

| Canal | Tipo | O que faz |
|---|---|---|
| `app:init` | pedido | categorias (sem os caminhos) e a pasta do usuário |
| `disk:info` | pedido | tamanho total e livre do disco do sistema |
| `scan` | pedido | analisa todas as categorias e devolve os resultados |
| `clean` | pedido | limpa as categorias pedidas (só ids conhecidos) |
| `folder:open` | pedido | abre no Explorador uma pasta **da última análise** (outras são recusadas) |
| `window:splash-done` | pedido | a abertura terminou; a barra de título volta à cor do app |
| `progress:path` | aviso | arquivo sendo lido/apagado agora (no máximo a cada 60 ms) |
| `scan:category` | aviso | uma categoria terminou de ser analisada |
| `clean:start` / `clean:progress` / `clean:category` | aviso | início, bytes apagados até agora e resultado de cada categoria |

## Fluxos

### Abertura
A janela nasce preta e mostra o símbolo e "vanish" por ~2 s (um clique pula). A análise já
começa por trás; ao sumir, a tela chama `window:splash-done`.

### Análise
1. `renderer/controller.ts` chama `invoke('scan')`.
2. `main/ipc.ts` roda `scanCategory` para cada categoria, em paralelo.
3. Antes de ler, o motor confere a trava da categoria (`guards.ts`); se falhar, a categoria volta
   com `blocked` e a tela mostra o motivo.
4. Cada categoria que termina vira um aviso `scan:category` (a linha na tela atualiza).
5. O `invoke('scan')` devolve todos os resultados juntos; só então a barra acende.
   (Avisos e a resposta do invoke podem chegar fora de ordem, por isso a barra usa a resposta.)

### Limpeza
1. **Limpar** abre o diálogo de confirmação (`views/confirm.ts`) com o aviso de cada categoria;
   só o **Apagar** do diálogo chama `invoke('clean', ids)`.
2. O main limpa uma categoria por vez. O motor confere a trava **de novo** antes de apagar.
3. Avisos `clean:start`, `clean:progress` e `clean:category` (com o que sobrou em cada pasta).
4. A barra usa o progresso real para mover a faísca.

```
renderer                     preload                 main + cleaner
────────                     ───────                 ──────────────
invoke('scan')        ──▶    confere o canal   ──▶   guard → scanCategory() × N
                      ◀──                      ◀──   progress:path, scan:category, resposta
invoke('clean', ids)  ──▶                      ──▶   guard → cleanCategory() uma por vez
                      ◀──                      ◀──   clean:start, clean:progress, clean:category
invoke('folder:open') ──▶                      ──▶   só abre pastas da última análise
```
