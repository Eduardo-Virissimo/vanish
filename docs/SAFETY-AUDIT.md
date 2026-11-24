# Auditoria de segurança — o que o Vanish apaga

Revisão de **cada pasta** que o app limpa hoje: o que tem lá, se apagar pode causar problema e
o que o app faz para evitar. Feita em 12/11/2026 e ampliada em 13/11/2026, sobre `src/cleaner/categories/`.

> Regra usada: uma pasta só é segura se **(1)** o programa dono recria os arquivos sozinho e
> **(2)** apagar não perde nada do usuário (senhas, histórico, configurações, downloads, saves).

## Resumo

| Categoria | Veredito | Começa marcada? | Observação |
|---|---|---|---|
| Temporários | 🟢 Seguro | sim | só arquivos com mais de 24 h |
| Navegadores | 🟢 Seguro | sim | só cache; histórico, senhas e cookies ficam |
| Cache de apps | 🟢 Seguro | sim | Spotify: só o cache de streaming, não as músicas baixadas |
| Desenvolvimento | 🟢 Seguro | sim | pacotes são baixados de novo (demora mais o próximo install) |
| Jogos e gráficos | 🟢 Seguro | sim | shaders são refeitos (jogos podem engasgar na 1ª vez); cookies e login dos launchers ficam |
| Miniaturas | 🟢 Seguro | sim | o Explorador recria; ícones podem piscar em branco um instante |
| Relatórios de erro | 🟢 Seguro | sim | perde relatórios antigos que talvez um suporte pedisse |
| Windows Update | 🟡 Cuidado | **não** | **bloqueado** quando há atualização esperando reiniciar |
| Lixeira | 🟡 Cuidado | **não** | são arquivos do usuário; apagar é irreversível |

🟢 seguro · 🟡 seguro com condições (o app aplica as condições) · 🔴 não fazer

### Correções feitas por causa desta auditoria

1. **Windows Update ganhou uma trava** (`src/cleaner/guards.ts`): se o Windows tiver uma
   atualização esperando reiniciar (chaves `WindowsUpdate\Auto Update\RebootRequired` ou
   `Component Based Servicing\RebootPending` no registro), a categoria aparece como
   "Reinicie antes" e **não pode ser limpa**. A trava é checada na análise e de novo na hora de
   apagar. No PC onde a auditoria foi feita, as duas chaves existiam: antes da correção o app
   teria apagado 741,7 MB de downloads de uma atualização pendente.
2. **Lixeira e Windows Update começam desmarcadas** (`optIn: true`): só são limpas se o
   usuário marcar.

## Proteções que valem para tudo

- Só apaga o **conteúdo** das pastas listadas; nunca a pasta em si (`engine.ts`).
- **Confere as pastas no PC do usuário, não só nos testes** (`safety.ts`, desde 23/11/2026). As
  pastas-base vêm de variáveis de ambiente; num PC com `TEMP=C:\` (já visto em guias antigos e
  programas mal-comportados) o app apagaria tudo o que tivesse mais de 24 h no disco. Agora toda
  pasta resolvida precisa estar numa área permitida cuja base tem o formato esperado
  (`...\AppData\Local`, `...\AppData\Roaming`, `X:\Windows`, uma pasta chamada `Temp`/`Tmp` que não
  seja a raiz de um disco), não pode ser nem conter uma pasta proibida e não pode passar por dados
  do usuário. Se uma falhar, a categoria inteira fica "Bloqueada" e nada dela é lido ou apagado.
  A checagem é feita na análise e de novo na limpeza.
- **Não segue links nem junções** (`fs-walk.ts`): um atalho dentro de um cache nunca leva a
  apagar algo fora dele. Testado com uma junção apontando para uma pasta com um arquivo: o
  arquivo de fora continuou intacto.
- Arquivos **em uso** não são apagados (o Windows não deixa); o app pula e conta como "ficaram
  para a próxima". Por isso limpar com o navegador aberto é seguro, só libera menos.
- O usuário vê **todas as pastas reais** antes de limpar (☰).
- **Diálogo de confirmação com avisos:** antes de apagar, cada categoria marcada aparece com o que vai acontecer, e os programas que precisam estar fechados aparecem num bloco "feche antes" (campo `closeFirst`). Só com caches o diálogo é leve ("Limpar X?"); se houver algo que não volta (Lixeira), ele vira "Apagar X?", esse item aparece primeiro, em vermelho, e o botão só libera depois de marcar "Entendi". O foco começa em "Cancelar", para um Enter apressado não apagar nada.
- A tela não consegue pedir para apagar nada fora da lista (IPC só aceita ids de categoria).

## Detalhe por categoria

### Temporários 🟢
| Pasta | O que é |
|---|---|
| `%TEMP%` (`~\AppData\Local\Temp`) | arquivos temporários do usuário |
| `C:\Windows\Temp` | temporários do sistema (precisa de admin para a maior parte) |

- Programas criam e deveriam apagar esses arquivos; o que sobra é lixo. É a mesma coisa que a
  "Limpeza de Disco" do Windows oferece.
- **Risco:** um instalador em andamento pode estar usando arquivos dali.
  **Proteção:** só apaga arquivos com mais de **24 horas**, e arquivos em uso são pulados.
  Subpastas recentes também não são removidas.
- **A idade conta a data mais nova entre criação e modificação** (desde 23/11/2026). Quem extrai
  um zip ou instalador mantém a data de modificação original dos arquivos (ex.: 2023), mas a data
  de criação é a da extração. Antes só a modificação era olhada, e um instalador extraído minutos
  antes podia ter arquivos apagados no meio da instalação.
- **Risco residual (baixo):** um instalador que pediu para terminar algo "na próxima
  reinicialização" pode apontar para um arquivo em Temp com mais de 24 h. Ver ideia no fim.

### Navegadores 🟢
Para Chrome, Edge e Brave (cada perfil): `Cache`, `Code Cache`, `GPUCache`, mais `ShaderCache` e
`GrShaderCache`. Opera: `Opera Stable\Cache`. Firefox: `Profiles\*\cache2` (pasta local, separada
do perfil com os dados).

- São cópias de páginas, scripts já compilados e shaders da placa de vídeo. O navegador baixa ou
  gera de novo.
- **Não** são tocados: `History`, `Cookies`, `Login Data` (senhas), `Bookmarks`, `Preferences`,
  extensões, `Local Storage`, `IndexedDB`. Ou seja, ninguém é deslogado de nada.
- **Efeito colateral:** os primeiros sites abertos carregam um pouco mais devagar.

### Cache de apps 🟢
| App | Pastas | Fonte |
|---|---|---|
| Discord, VS Code, Slack | `Cache`, `Code Cache`, `GPUCache` (VS Code também `CachedData`) | formato padrão do Chromium/Electron |
| Teams (clássico) | `Cache`, `Code Cache`, `GPUCache` em `%APPDATA%\Microsoft\Teams` | a Microsoft manda limpar essas pastas para resolver problemas e diz que não se perde dados do usuário ([Microsoft Learn][teams]) |
| Obsidian | `Cache`, `Code Cache`, `GPUCache` em `%APPDATA%\obsidian` | formato padrão do Electron; plugins e `IndexedDB` ficam |
| Notion, Postman | `Partitions\*\Cache`, `Code Cache`, `GPUCache` | sessões separadas em `Partitions`; **só** as pastas de cache. O `Service Worker` do Notion (1,4 GB no PC auditado, arquivos para funcionar offline), `IndexedDB` e `Local Storage` ficam |
| Spotify | `%LOCALAPPDATA%\Spotify\Data` | cache de streaming; as músicas **baixadas para ouvir offline** ficam em outra pasta (`Storage` ou a escolhida nas configurações), que **não** é tocada ([comunidade Spotify][spotify]) |

- O Teams **novo** (`MSTeams_8wekyb3d8bbwe`) **não** está na lista de propósito: limpar a pasta
  dele apaga configurações locais como idioma e contas de outras organizações ([topedia][newteams]).
- VS Code `CachedData` é código das extensões já compilado; o VS Code recompila ao abrir.

### Desenvolvimento 🟢
| Pasta | Equivale a | Observação |
|---|---|---|
| `npm-cache` | `npm cache clean --force` | `npx` também baixa de novo |
| `Yarn\Cache` | `yarn cache clean` (Yarn 1) | o cache do Yarn 2+ (`Yarn\Berry`) **não** é tocado, porque projetos Plug'n'Play dependem dele |
| `pip\Cache` | `pip cache purge` | |
| `NuGet\v3-cache` | `dotnet nuget locals http-cache --clear` | é só o cache HTTP; a pasta de pacotes instalados (`.nuget\packages`) **não** é tocada ([Microsoft Learn][nuget]) |
| `go-build` | `go clean -cache` | |
| `electron\Cache` | cache do `@electron/get` | versões do Electron baixadas pelo `npm install`; baixa de novo ([@electron/get][electron-get]) |
| `node-gyp\Cache` | `node-gyp remove <versão>` | cabeçalhos do Node baixados para compilar módulos nativos. O README define `--devdir` como "SDK download directory (default is OS cache directory)" e diz que o node-gyp "downloads the necessary development files or headers for the target version": no próximo build ele baixa de novo ([node-gyp][node-gyp]) |
| `Composer\files`, `Composer\repo` | `composer clear-cache` | padrão no Windows: `C:\Users\<user>\AppData\Local\Composer`; `files` "stores the zip archives of packages", `repo` guarda metadados de repositórios ([Composer][composer]). Os clones de repositório (`vcs`) **não** são tocados |

- **Fora de propósito:** a cache do **uv** (a documentação dele diz que só é seguro limpar com `uv cache clean`, apagar à mão pode corromper ([uv][uv])), `pnpm\store`, `.nuget\packages` e `Yarn\Berry`. A cache do **Deno** também fica de fora: a documentação oferece `deno clean` para isso ([Deno][deno-clean]), então segue a regra "limpar só com o comando do programa". A cache de tipos do **TypeScript** (`Microsoft\TypeScript`) fica de fora por falta de fonte oficial do local no Windows.

- **Efeito colateral:** o próximo `npm install`, `pip install`, build etc. baixa/compila de novo
  e demora mais. Sem internet, instalar pacotes que estavam só no cache falha até voltar a conexão.

### Jogos e gráficos 🟢
| Pasta | O que é | Fonte |
|---|---|---|
| `%LOCALAPPDATA%\D3DSCache` | cache de shaders do DirectX | é a opção "Cache de Sombreador DirectX" da Limpeza de Disco; o Windows refaz ([WiseCleaner][wise]) |
| `NVIDIA\DXCache`, `NVIDIA\GLCache` | cache de shaders do driver NVIDIA | regeneráveis; jogos, saves e configurações não são tocados ([NvidiaShaderCleanup][nv]) |
| `AMD\DxCache` | cache de shaders do driver AMD | o driver refaz; equivale a "Redefinir cache de shaders" do Adrenalin (fontes comunitárias, ver nota) |
| `Steam\htmlcache\*\Cache` etc. | cache do navegador interno da Steam | `htmlcache` é um navegador Chromium: **só** `Cache`, `Code Cache`, `GPUCache` e shaders, como nos navegadores. Cookies e login da loja ficam ([fórum Steam][steam]) |
| `EpicGamesLauncher\Saved\webcache*` | cache web do launcher da Epic | a própria ajuda da Epic manda apagar `webcache`, `webcache_4147`, `webcache_4430` com o launcher fechado ([Epic][epic]) |

- **Efeito colateral:** na primeira vez, jogos podem engasgar enquanto refazem os shaders; arquivos presos pelo driver são pulados.
- **Fora por falta de fonte confiável:** AMD `VkCache`/`GLCache`, NVIDIA `NV_Cache`, Intel `ShaderCache`.
- **Nota:** para AMD e Steam as fontes são comunitárias (sem documentação oficial); por isso só pastas de cache entram, e cookies/perfis ficam.

### Miniaturas 🟢
Só os arquivos `thumbcache_*.db` e `iconcache_*.db` de `...\Microsoft\Windows\Explorer` (sem
entrar em subpastas). É a opção "Miniaturas" da Limpeza de Disco do Windows.
- O Explorador mantém alguns abertos; esses são pulados.
- **Efeito colateral:** pastas com muitas fotos demoram para mostrar as miniaturas na próxima vez;
  ícones podem aparecer em branco por um instante.

### Relatórios de erro 🟢
`CrashDumps` e as pastas `WER\ReportArchive` e `WER\ReportQueue` (do usuário e de `ProgramData`).
- São relatórios de travamentos já enviados ou na fila. Equivale a "Relatórios de erros do
  Windows" na Limpeza de Disco.
- **Efeito colateral:** se um suporte técnico ou desenvolvedor pediu um dump de um travamento,
  ele some. Para quem não está investigando um travamento, não faz diferença.

### Windows Update 🟡
`C:\Windows\SoftwareDistribution\Download` (só arquivos com mais de 24 h; precisa de admin).

- É seguro apagar **depois** que as atualizações baixadas foram instaladas. Antes disso, a
  atualização pendente precisa ser baixada de novo, e há quem desaconselhe apagar sem parar o
  serviço do Windows Update ([Microsoft Q&A][wu-qa], [Microsoft Q&A][wu-qa2]).
- **Proteções:** começa desmarcada; **bloqueada** enquanto houver reinicialização pendente; só
  arquivos com mais de 24 h; arquivos em uso pelo serviço são pulados.
- **Melhoria possível:** parar o serviço `wuauserv` antes de limpar e religar depois (precisa de
  admin). Ver [ROADMAP.md](ROADMAP.md).

### Lixeira 🟡
`X:\$Recycle.Bin\<usuário>` em todos os discos; esvaziada pelo próprio Windows (`Clear-RecycleBin`).
- **São arquivos do usuário.** Depois de esvaziar não dá para recuperar pelo Windows.
- **Proteções:** começa **desmarcada**; o rodapé avisa "A lixeira é esvaziada de vez"; a coluna
  de pastas mostra quanto tem em cada disco.

## Riscos conhecidos que ainda não têm proteção

| Risco | Chance | Ideia de proteção |
|---|---|---|
| Arquivo em Temp com mais de 24 h ainda necessário para um instalador terminar após reiniciar | baixa | também bloquear Temp quando houver reinicialização pendente, ou ler `PendingFileRenameOperations` e pular esses arquivos |
| Usuário com dump de travamento que um suporte pediu | baixa | mostrar data dos relatórios na coluna de pastas |
| Pasta de cache de um app mudar de função numa atualização futura do app | baixa | rever esta auditoria a cada versão grande; a coluna de pastas deixa o usuário conferir |

## Fontes

- [teams]: https://learn.microsoft.com/en-us/troubleshoot/microsoftteams/teams-administration/clear-teams-cache — Microsoft Learn, limpar o cache do Teams.
- [newteams]: https://blog-en.topedia.com/2023/11/clear-the-cache-of-the-new-teams-client-v2/ — cache do Teams novo e o que se perde.
- [spotify]: https://community.spotify.com/t5/Desktop-Windows/What-s-on-Appdata-Local-Spotify-Data/td-p/1675857 — comunidade Spotify, o que é a pasta `Data`.
- [nuget]: https://learn.microsoft.com/en-us/nuget/consume-packages/managing-the-global-packages-and-cache-folders — Microsoft Learn, pastas de cache do NuGet.
- [wu-qa]: https://learn.microsoft.com/en-us/answers/questions/2445673/is-it-safe-to-delete-files-under-c-windowssoftware — Microsoft Q&A, apagar `SoftwareDistribution\Download`.
- [wu-qa2]: https://learn.microsoft.com/en-gb/answers/questions/1334760/what-will-happen-if-i-delete-software-distribution — Microsoft Q&A, o que acontece ao apagar a pasta.
- [electron-get]: https://packages.electronjs.org/get — @electron/get, local da cache.
- [uv]: https://docs.astral.sh/uv/concepts/cache — uv, nunca apagar a cache à mão.
- [wise]: https://www.wisecleaner.com/think-tank/772-What-Is-DirectX-Shader-Cache-and-How-to-Clear-It.html — cache de shaders do DirectX.
- [nv]: https://github.com/Kkthnx/NvidiaShaderCleanup — caches da NVIDIA são regeneráveis.
- [steam]: https://steamcommunity.com/discussions/forum/1/558747288083286747 — fórum Steam, htmlcache.
- [epic]: https://www.epicgames.com/help/epic-games-store-c-32735058/a20673770 — ajuda da Epic, limpar a cache do launcher.

As respostas do Microsoft Q&A e da comunidade Spotify são de usuários e moderadores, não
documentação oficial; por isso Windows Update ficou com proteções extras.

[teams]: https://learn.microsoft.com/en-us/troubleshoot/microsoftteams/teams-administration/clear-teams-cache
[newteams]: https://blog-en.topedia.com/2023/11/clear-the-cache-of-the-new-teams-client-v2/
[spotify]: https://community.spotify.com/t5/Desktop-Windows/What-s-on-Appdata-Local-Spotify-Data/td-p/1675857
[nuget]: https://learn.microsoft.com/en-us/nuget/consume-packages/managing-the-global-packages-and-cache-folders
[wu-qa]: https://learn.microsoft.com/en-us/answers/questions/2445673/is-it-safe-to-delete-files-under-c-windowssoftware
[wu-qa2]: https://learn.microsoft.com/en-gb/answers/questions/1334760/what-will-happen-if-i-delete-software-distribution
[electron-get]: https://packages.electronjs.org/get
[uv]: https://docs.astral.sh/uv/concepts/cache
[node-gyp]: https://github.com/nodejs/node-gyp/blob/main/README.md
[composer]: https://getcomposer.org/doc/06-config.md
[deno-clean]: https://docs.deno.com/runtime/reference/cli/clean/
[wise]: https://www.wisecleaner.com/think-tank/772-What-Is-DirectX-Shader-Cache-and-How-to-Clear-It.html
[nv]: https://github.com/Kkthnx/NvidiaShaderCleanup
[steam]: https://steamcommunity.com/discussions/forum/1/558747288083286747
[epic]: https://www.epicgames.com/help/epic-games-store-c-32735058/a20673770
