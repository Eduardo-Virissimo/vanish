# AGENTS.md — regras para mexer no Vanish

Instruções para qualquer agente de IA (ou pessoa) que for alterar este projeto. Leia antes de
mudar código. A documentação fica em [`docs/`](docs/README.md):

- [docs/MAINTENANCE.md](docs/MAINTENANCE.md): **como adicionar pastas e categorias** (comece por aqui)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): estrutura e funcionamento
- [docs/SAFETY-AUDIT.md](docs/SAFETY-AUDIT.md): o que é apagado e por que é seguro
- [docs/CLEANUP-CANDIDATES.md](docs/CLEANUP-CANDIDATES.md): alvos pesquisados e proibidos
- [docs/DESIGN.md](docs/DESIGN.md): visual
- [docs/ROADMAP.md](docs/ROADMAP.md): o que vem depois
- [docs/RELEASE.md](docs/RELEASE.md): instalador e publicação de versões (atualização automática)

## Comandos

```bash
npm install          # dependências
npm run typecheck    # SEMPRE rodar depois de mudar código; precisa passar sem erros
npm test             # SEMPRE rodar: regras de segurança das categorias + motor em pastas falsas
npm run build        # compila src/ → dist/
npm start            # build + abre o app
npm run dist         # gera o instalador em release/ (publicar: tag vX.Y.Z, ver docs/RELEASE.md)
npm run logo         # regenera assets/logo.svg (ícone) e assets/mark.svg (símbolo)
npm run icon         # regenera assets/icon.png (depois do logo)
```

Ambiente: Windows 11, Node 24, Electron 45, TypeScript 7 (modo estrito), esbuild.

## Regra nº 1: segurança do que é apagado

Este app **apaga arquivos**. Um erro aqui destrói dados do usuário.

- Só se apaga o **conteúdo** de pastas listadas em `src/cleaner/categories/` (um arquivo por categoria). Nunca a pasta
  raiz, nunca caminhos montados a partir de dados da tela.
- **Nunca seguir links simbólicos nem junções** (`fs-walk.ts` já pula; não remover essa checagem).
- Nova categoria ou pasta só entra se o programa dono **recria os arquivos sozinho** e se apagar
  não perde nada do usuário (senhas, histórico, configurações, saves de jogos). Na dúvida, não entra.
- **Sem fonte, não entra.** Se a documentação do programa disser para limpar só com o comando dele
  (ex.: `uv cache clean`, `pnpm store prune`), não apague por caminho.
- `npm test` (`tests/categories.test.ts`) recusa pastas fora das áreas permitidas, pastas do sistema e
  dados do usuário. As regras ficam em `src/cleaner/safety.ts` e o motor as aplica **também no PC do
  usuário** (variáveis como `TEMP` podem estar erradas lá); não remover essa checagem. **Nunca afrouxe essas regras para fazer uma categoria passar**; se precisar mudar
  uma regra, explique na auditoria.
- Temporários respeitam idade mínima (`minAgeMs`); não reduzir sem motivo.
- Toda pasta nova precisa de uma linha na [auditoria](docs/SAFETY-AUDIT.md) com fonte. Alvos
  arriscados usam `optIn: true` (começam desmarcados) e, se preciso, um `guard` em
  `src/cleaner/guards.ts`. Nunca implementar algo da lista 🔴 de
  [CLEANUP-CANDIDATES.md](docs/CLEANUP-CANDIDATES.md).
- Travas (`guard`) são checadas na análise **e** de novo na limpeza; não remover a segunda checagem.
- A tela nunca recebe permissão para apagar ou abrir caminhos arbitrários: `clean` só aceita ids
  de categoria conhecidos e `folder:open` só caminhos da última análise.
- **Nunca rodar a limpeza de verdade no PC do usuário para testar.** Teste o motor em pastas
  falsas (ver "Como testar").

## Arquitetura (não quebrar)

- `renderer/` não importa nada de Node nem de `cleaner/`/`main/`. Só fala com o main por
  `window.cleaner` (preload).
- Canal novo de IPC: declarar em `src/shared/ipc.ts` (`InvokeMap`/`EventMap` **e** a lista
  `INVOKE_CHANNELS`/`EVENT_CHANNELS`), implementar em `src/main/ipc.ts`. O preload recusa canais
  fora da lista.
- Tipos usados pelos dois lados ficam em `src/shared/`.
- **Uma categoria = um arquivo** em `src/cleaner/categories/` (texto, cor, ícone, aviso, pastas),
  registrado no `index.ts`. A tela não tem nada específico de categoria: nada de `if (id === 'trash')`;
  use os campos (`warning.level`, `optIn`, `guard`).
- Um assunto por arquivo; arquivos com mais de ~150 linhas devem ser divididos.
- Estado da tela muda só no `controller.ts`; as views só leem o estado e desenham.
- CSS: um arquivo por parte da tela em `styles/`, cores e medidas só via tokens (`tokens.css`).
- A CSP bloqueia `style="..."` no HTML gerado: use `el.style.setProperty(...)` no TypeScript.

## Convenções

- Textos da interface, comentários e documentação em **português do Brasil**.
- Regras de texto e visual em [docs/DESIGN.md](docs/DESIGN.md) (frase normal, botões dizem o que
  fazem, mensagens sem desculpas).
- Nomes de código em inglês (`scanCategory`, `FolderInfo`).
- Documentação **só** em `docs/` (exceto `README.md` e `AGENTS.md`, que ficam na raiz).
- Ao criar algo novo (canal, pasta, script, animação), atualizar `docs/ARCHITECTURE.md` e, se for
  visual, `docs/DESIGN.md`. Pasta limpa nova → `docs/SAFETY-AUDIT.md`.
- Ao terminar uma entrega, atualizar `docs/ROADMAP.md`.

## Como testar

1. `npm run typecheck` sem erros.
2. `npm test` sem falhas. Mudou o motor? Acrescente um caso em `tests/engine.test.ts` (pastas
   falsas no diretório temporário; nunca pastas reais).
3. **Interface**: abrir o app e conferir com print. Para cliques, usar
   `webContents.sendInputEvent` (mouseDown/mouseUp) nas coordenadas do botão e checar
   `document.elementFromPoint` nesse ponto. **`element.click()` via JavaScript não serve como
   teste**: pula a verificação do que está por baixo do mouse e já escondeu um bug.
4. Ganchos de debug temporários (prints, cliques) nunca ficam no código entregue.

## Armadilhas já encontradas

| Problema | Causa | Como evitar |
|---|---|---|
| Botões do topo visíveis mas sem clique | margem negativa do canvas "vazava" (colapso de margem) e a caixa da barra cobria os botões | `.bar-wrap` com `display: flow-root` e `pointer-events: none`; testar com clique real |
| Barra de pixels em branco depois de redimensionar | mudar o tamanho do canvas apaga o desenho, e o Chromium pausa `requestAnimationFrame` em janela encoberta | redesenhar na hora dentro do `resize()` |
| Bloco da barra minúsculo às vezes | o aviso `scan:category` pode chegar **depois** da resposta do `invoke('scan')` | a barra usa a lista devolvida pelo `invoke`, não os avisos |
| `npm start` "não muda nada" | janela abria atrás das outras; ou havia uma janela antiga aberta | `window.ts` traz para a frente; fechar o app antes de rodar de novo |
| Janela voltando fora do lugar ao restaurar tamanho | `getBounds()` logo após `setBounds()` vem atrasado | guardar o valor pedido, não o lido |
| Arquivo com BOM/encoding errado | `Set-Content` do PowerShell 5.1 grava com BOM/ANSI | editar com as ferramentas de arquivo ou `UTF8Encoding($false)` |
| Linhas grudadas ao remover blocos de código | substituições que apagam a quebra de linha | conferir o trecho depois de remover |
| App empacotado ou `npm start` fecha sozinho ao abrir | trava de "uma janela só": outra cópia do Vanish (inclusive um `electron.exe` de desenvolvimento esquecido) já está aberta | fechar todas as cópias (`Get-Process electron, Vanish | Stop-Process`) antes de abrir |
| Animação CSS parada / print atrasado no teste | janela do Electron coberta por outras: o Chromium pausa animações e quadros | `Page.bringToFront` + `Emulation.setFocusEmulationEnabled` no teste por CDP |

## Decisões do usuário (não reverter sem pedir)

- Menu (☰) fica na **barra de título, à esquerda**, sem logo nem nome ao lado. Abre **dentro** da
  janela, deslizando da esquerda, com o símbolo e o nome no topo e as pastas embaixo.
  Nada de redimensionar a janela.
- Topo do app: "Analisar de novo" só texto + ícone, sem cara de botão.
- Faísca só na limpeza; surgimento da barra é pixel a pixel.
- Nome do app: **Vanish**, escrito em minúsculas na fonte Sora (só o nome usa essa fonte). Símbolo: grade de pixels se desfazendo na diagonal (inspirado na barra, sem copiar). Sem violeta e sem mascote ilustrado.
  Tela de abertura preta com o símbolo e o nome no meio.
- ☰ colado no canto superior esquerdo da janela. Ao abrir, a gaveta ocupa a altura inteira e o ☰
  desliza junto até o canto dela, virando o X de fechar (não existe outro botão de fechar).
- Rodapé com sombra suave para cima.
- Lixeira e Windows Update começam desmarcadas; Windows Update bloqueado com reinício pendente.
- "Limpar" sempre passa pelo diálogo de confirmação com o aviso de cada categoria. Categoria nova com efeito colateral precisa de `warning` no arquivo dela (`danger` só para perda que não volta, e exige `optIn`).
- Símbolo: grade de pixels se desfazendo na diagonal (azul → ciano). O fantasma ilustrado (`docs/reference/fantasma-holo-1024.png`) foi abandonado.
