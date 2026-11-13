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

## 🔜 Próximo — v0.5: pronto para usar no dia a dia

1. **Instalador `.exe`** com electron-builder (ícone `.ico` gerado a partir do `logo.svg`,
   atalho no menu Iniciar, desinstalador).
2. **Botão "Reiniciar como administrador"** quando alguma categoria mostrar "Precisa de admin".
   Com admin, parar o serviço `wuauserv` antes de limpar o Windows Update e religar depois.
3. **Fechar os riscos restantes da auditoria**: bloquear Temporários também quando houver
   reinício pendente (ou pular arquivos em `PendingFileRenameOperations`).
4. **Limpar com o comando do próprio programa** (`uv cache clean`, `pnpm store prune`,
   `Delete-DeliveryOptimizationCache`): um tipo de alvo que roda um comando em vez de apagar.
5. **Teste de interface com cliques reais** (Playwright para Electron): abrir o app, clicar no ☰,
   em "Analisar de novo", marcar/desmarcar, confirmar limpeza em pastas falsas.
6. **Uma janela só**: abrir o app de novo traz a janela que já está aberta para a frente.
7. **Confirmar em fonte** os candidatos 🟢 que faltam (node-gyp, TypeScript, outros shaders) e
   incluir ([CLEANUP-CANDIDATES.md](CLEANUP-CANDIDATES.md)).
8. **Mais caches de desenvolvimento** 🟢: Electron, node-gyp, uv, Composer, Deno.

## 🗓️ Depois — v0.6: mais controle

- **Excluir pastas específicas** pela coluna de pastas (desmarcar uma pasta, não só a categoria),
  lembrando a escolha.
- **Histórico de limpezas**: quanto foi liberado em cada dia.
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
