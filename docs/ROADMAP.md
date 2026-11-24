# Roadmap — Vanish

Status em 12/11/2026. A ordem dentro de cada fase é a prioridade sugerida.

## ✅ Feito

### v0.1 — Primeira versão (JavaScript)
- Electron + Node, janela escura no estilo do mockup.
- Análise de 8 categorias seguras: temporários, navegadores, cache de apps, desenvolvimento,
  miniaturas, relatórios de erro, Windows Update e Lixeira.
- Limpeza que só apaga o conteúdo de pastas conhecidas, sem seguir links, pulando arquivos em uso.
- Barra de pixels em canvas com faísca e fagulhas na limpeza.

### v0.2 — TypeScript e organização
- Conversão para TypeScript (modo estrito) com esbuild.
- Código separado por processo (`main`, `preload`, `renderer`, `cleaner`, `shared`) e por assunto.
- Contrato de IPC tipado e com lista de canais permitidos.
- README com a estrutura de pastas.

### v0.3 — Visual e transparência
- Bloom nos pixels, pulso dos pixels parados, onda durante a análise, surgimento pixel a pixel.
- Marca gerada por script (hoje: símbolo de pixels se desfazendo, nome **Vanish** em Sora); ícone da janela e da barra de tarefas.
- Menu (☰ na barra de título) com o logo grande, o nome e as pastas reais de cada categoria;
  clicar abre no Explorador.
- Tela de abertura "Vanish".
- Correções: cliques bloqueados nos controles do topo, janela abrindo atrás das outras, barra
  em branco após redimensionar, corrida entre avisos e resposta da análise.
- Documentação organizada em `docs/` (arquitetura, design, roadmap) + AGENTS.md na raiz.
- **Auditoria de segurança** de todas as pastas ([SAFETY-AUDIT.md](SAFETY-AUDIT.md)) e pesquisa de
  novos alvos ([CLEANUP-CANDIDATES.md](CLEANUP-CANDIDATES.md)).
- Por causa da auditoria: Windows Update **bloqueado** quando há atualização esperando reiniciar;
  Lixeira e Windows Update começam **desmarcadas**.
- Diálogo de confirmação com o aviso de cada categoria (perigo pede "Entendi").

### v0.4 — Fácil manutenção
- **Uma categoria = um arquivo** (`src/cleaner/categories/`): adicionar uma não mexe na tela.
- **Testes automáticos** (`npm test`): guarda-costas das categorias (áreas permitidas, pastas
  proibidas, dados do usuário, auditoria) e o motor em pastas falsas.
- Guia [MAINTENANCE.md](MAINTENANCE.md); arquivos grandes divididos (barra, CSS do menu).
- **Novos lugares**, todos com fonte: categoria **Jogos e gráficos** (shaders do DirectX, NVIDIA e
  AMD; cache web da Steam e da Epic), cache do Electron, e caches de Obsidian, Notion e Postman.
- `*` no meio do nome de uma pasta (`webcache*`).

### v0.5 (em andamento) — Dia a dia
- **Uma janela só**: abrir de novo traz a janela que já está aberta.
- **Atalhos**: Ctrl+R / F5 analisa de novo; Ctrl+Enter abre a confirmação (nunca confirma).
  Menu padrão do Electron removido (ele recarregava a página no Ctrl+R).
- **Lembra o que foi desmarcado** entre sessões (nunca lembra uma categoria marcada: as arriscadas
  sempre começam desmarcadas).
- **Progresso na barra de tarefas** do Windows (análise e limpeza).
- **Abrir como administrador**: linha embaixo das categorias quando alguma precisa de admin.
- **Histórico em pixels** na gaveta: total liberado e as últimas 8 semanas.
- **Instalador de um clique** (`npm run dist`) e **atualização automática** pelas releases do GitHub,
  publicadas pelo GitHub Actions ao criar uma tag `vX.Y.Z` (docs/RELEASE.md).
- **Novos caches**: node-gyp e Composer (`files`, `repo`). Deno e TypeScript ficaram de fora
  (comando próprio / sem fonte), registrado na auditoria.

### v0.4.1 — Revisão de design (impeccable critique, nota 26/40)
- **Erro nunca vira sucesso**: análise ou limpeza que falha mostra o problema e a saída
  ("Analisar de novo"), em vez de "Está tudo limpo" ou "0 arquivos apagados".
- **Diálogo proporcional ao risco**: só caches → "Limpar X?", tom tranquilo e botão cinza;
  com a Lixeira → "Apagar X?", vermelho e "Entendi". "Feche antes" virou um bloco de etiquetas
  (campo `closeFirst`); ⚠ só para o que não volta; novo ícone de Relatórios de erro.
- **Topo**: o número grande é quanto dá para liberar; no fim da limpeza ele sobe até o total
  liberado, com a cor da faísca. Disco usado e "última limpeza há N dias" viram contexto.
- **Acessibilidade**: token `--dim` (≥ 4,5:1) para texto de estado, vermelho com 4,95:1, motivo de
  "Precisa de admin"/"Reinicie antes" alcançável pelo teclado, anúncios só pelo rodapé, anel de
  foco do ☰ por dentro.
- **Interface**: checkbox com ✓ de pixels; botão "Limpar" em vidro cinza; símbolo do Vanish no rodapé.
- **Pixels pelo app**: ☰ cujas linhas acendem nas cores das categorias (hover e ao virar X); histórico subindo pixel a pixel com brilho; ícone de análise em espiral 3×3, número grande pixelando ao mudar, diálogo surgindo em mosaico, borda da gaveta com pixels LED nas cores das categorias, pontos de categoria em LED, pixel piscando quando está tudo limpo.
- **Gaveta (☰)**: marca fixa no topo, cabeçalho de categoria que gruda ao rolar, resumo "X GB em N pastas", nome da pasta em destaque no caminho, desmarcadas recolhidas, rolagem abaixo do X.
- **Barra em "LED de vidro"** (`bar/led.ts`): pixels com reflexo, degradê de calor, vidro nos vazios, cantos em degrau e bloom em três camadas.
- **Barra de pixels mais viva** (`bar/effects.ts`): bloco desmarcado adormece em cinza pixel a pixel e reacende com lampejo; onda de luz no hover; pixels se desfazendo na diagonal atrás da faísca; um pixel caindo na pilha de vez em quando.
- Detalhes: tamanhos sem quatro dígitos ("1,0 GB"), caminhos completos que quebram só nas barras,
  cores do rodapé e do diálogo em tokens, sem brilho nos pontos da gaveta.

## 🎯 Rumo à v1.0 (revisão de 23/11/2026)

Segurança primeiro, depois bugs, depois produto e mais lugares para limpar.

**Versões publicadas nesta fase:** 0.5.1 saiu com o instalador dividido em duas releases com a
mesma tag (o link de download dava 404) e foi retirada. **0.5.2** tem o mesmo conteúdo, publicada
pelo workflow corrigido (release criada antes do envio dos arquivos) e pelo fluxo `dev` → `main`
([GIT.md](GIT.md)).

1. ✅ **Conferir as pastas no PC do usuário** (`src/cleaner/safety.ts`): `TEMP=C:\` ou
   `LOCALAPPDATA` estranho bloqueiam a categoria em vez de apagar o disco. As regras dos testes e do
   app agora são as mesmas.
2. ✅ **Idade mínima pela data mais nova** entre criação e modificação (arquivos extraídos de zip
   mantêm a data antiga).
3. ✅ **Erro numa categoria não vira mais "Vazia"**: análise com erro aparece como "Não analisada";
   limpeza com erro numa categoria mostra o nome dela e leva para "Analisar de novo".
4. ✅ **Admin detectado pelo nível de integridade** (`whoami /groups`, `main/integrity.ts`), não mais
   por `net session`.
5. ✅ **Aviso quando o "Abrir como administrador" troca de conta**: a cópia elevada recebe o SID de
   quem pediu e, se for outra conta, avisa de quem são os caches e a Lixeira que serão limpos.
6. ✅ **Lixeira conta cada item uma vez** (os arquivos `$I` de informação não entram na contagem).
7. ✅ **Fechar no meio da limpeza** pergunta antes; ✅ **log em arquivo**
   (`%APPDATA%\Vanish\logs\vanish.log`). Falta: botão "Copiar diagnóstico" na gaveta.
8. ✅ `LICENSE` (ISC) e CI em todo push (`.github/workflows/ci.yml`). Falta: tela "Sobre" (versão,
   GitHub, procurar atualização).
9. Tipo de alvo "rodar comando" (item 4 abaixo) e `Code\CachedExtensionVSIXs` (2,1 GB no PC
   auditado; falta fonte).

## 🔜 Próximo — v0.5: pronto para usar no dia a dia

1. ✅ **Instalador `.exe`** com electron-builder e **atualização automática** pelo GitHub (feito; ver
   [RELEASE.md](RELEASE.md)). Sem assinatura de código, por decisão (16/11/2026).
2. ✅ **"Abrir como administrador"** feito (v0.5). Falta:
   Com admin, parar o serviço `wuauserv` antes de limpar o Windows Update e religar depois.
3. ✅ **Fechar os riscos restantes da auditoria**: arquivos em `PendingFileRenameOperations` são
   pulados em todas as categorias (`cleaner/pending-renames.ts`).
4. **Limpar com o comando do próprio programa** (`uv cache clean`, `pnpm store prune`,
   `Delete-DeliveryOptimizationCache`): um tipo de alvo que roda um comando em vez de apagar.
5. **Teste de interface com cliques reais** (Playwright para Electron): abrir o app, clicar no ☰,
   em "Analisar de novo", marcar/desmarcar, confirmar limpeza em pastas falsas.
6. ✅ **Uma janela só** (feito).
7. **Confirmar em fonte** os candidatos 🟢 que faltam (TypeScript, outros shaders) e
   incluir ([CLEANUP-CANDIDATES.md](CLEANUP-CANDIDATES.md)).
8. **Mais caches de desenvolvimento**: node-gyp e Composer já entraram; Deno e uv só com o tipo de alvo "rodar comando" (item 4).

## 🗓️ Depois — v0.6: mais controle

- **Excluir pastas específicas** pela coluna de pastas (desmarcar uma pasta, não só a categoria),
  lembrando a escolha.
- ✅ **Histórico de limpezas** (gráfico de 8 semanas na gaveta). Falta: ver por dia/mês.
- **Configurações**: idade mínima dos temporários (hoje 24 h), categorias ligadas por padrão.
- **Limpeza agendada** (ex.: toda semana), com aviso do Windows mostrando quanto foi liberado.

## 💡 Ideias (avaliar antes de fazer)

Novas categorias estão pesquisadas e classificadas em
[CLEANUP-CANDIDATES.md](CLEANUP-CANDIDATES.md). As 🟡 (Otimização de Entrega, `Windows.old`,
Gradle/Maven, `node_modules` antigos, outros apps Electron…) só entram com opt-in, admin e aviso.

Outras:

- Analisar outros discos além do C:.
- Mostrar os maiores arquivos de cada categoria na coluna de pastas.
- Versão em inglês.

## ❌ Fora do escopo

- "Otimizar" o registro do Windows, desfragmentar, "acelerar" o PC: não ajudam de verdade e
  podem quebrar coisas.
- Apagar arquivos pessoais (Downloads, Documentos, Área de trabalho) automaticamente.
- Seguir links/junções ou apagar pastas que não sejam caches conhecidos.
- Tudo da lista 🔴 de [CLEANUP-CANDIDATES.md](CLEANUP-CANDIDATES.md) (WinSxS, Installer,
  Prefetch, dados de navegador além do cache…).
