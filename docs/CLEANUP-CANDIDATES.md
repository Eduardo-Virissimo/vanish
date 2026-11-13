# Candidatos — outras coisas que podem ser limpas

Pesquisa de novos alvos para o Vanish, **ainda não implementados** (os já implementados estão logo abaixo). Cada um tem veredito,
riscos e como deveria entrar no app. Antes de implementar qualquer um, ele precisa passar pelas
mesmas regras da [auditoria de segurança](SAFETY-AUDIT.md) e virar linha lá.

🟢 bom candidato · 🟡 só com condições (opt-in, admin, aviso) · 🔴 não fazer

## ✅ Já implementados (13/11/2026)

Saíram desta lista e estão na [auditoria](SAFETY-AUDIT.md): cache de shaders do DirectX, NVIDIA
(`DXCache`, `GLCache`) e AMD (`DxCache`); cache web da Steam (só as pastas de cache da `htmlcache`)
e da Epic (`webcache*`); cache do Electron; caches de Obsidian, Notion e Postman (só as pastas de
cache).

## 🟢 Bons candidatos (prioridade)

| Alvo | Caminho | Por que é seguro | Falta |
|---|---|---|---|
| Cache de Internet do Windows | `%LOCALAPPDATA%\Microsoft\Windows\INetCache` | cache de páginas de componentes antigos/WebView; recriado | fonte; libera pouco (0,4 MB no PC auditado). **Não** confundir com `WebCache` (banco de dados preso pelo sistema) |
| Cache do node-gyp | `%LOCALAPPDATA%\node-gyp\Cache` | arquivos do Node baixados para compilar módulos | fonte oficial do local da cache (59 MB no PC auditado) |
| Cache de tipos do TypeScript | `%LOCALAPPDATA%\Microsoft\TypeScript\<versão>` | tipos que o editor baixa para JavaScript | fonte (46 MB no PC auditado) |
| Cache do Composer (PHP) | `%LOCALAPPDATA%\Composer` (só `cache`/`files`) | equivale a `composer clear-cache` | confirmar subpastas |
| Cache do Deno | `%LOCALAPPDATA%\deno` (`deps`, `gen`) | baixa/compila de novo | confirmar subpastas |
| Outros apps Electron | `Cache`, `Code Cache`, `GPUCache` de Figma, WhatsApp (versão Electron) etc. | mesmo formato de Discord/Slack | conferir caminho de cada um; apps da Microsoft Store ficam em `Packages\...` |
| Outros caches de shaders | AMD `VkCache`/`GLCache`, NVIDIA `NV_Cache`, Intel `ShaderCache` | o driver recria (provável) | **fonte confiável**: a pesquisa só achou sites de baixa qualidade |

## 🟡 Só com condições

| Alvo | Caminho | Condição | Por quê |
|---|---|---|---|
| Cache do uv (Python) | `%LOCALAPPDATA%\uv\cache` | **só com o comando** `uv cache clean`; nunca apagar à mão | a documentação do uv diz que apagar arquivos da cache diretamente pode corromper ([uv][uv]) |
| Loja do pnpm | `%LOCALAPPDATA%\pnpm\store` | **só com o comando** `pnpm store prune` | os projetos usam arquivos ligados à loja; o próprio pnpm tem o comando para limpar o que não é usado. Falta fonte sobre apagar à mão (604 MB no PC auditado) |
| Service Worker do Notion | `%APPDATA%\Notion\Partitions\notion\Service Worker` | opt-in, com aviso | guarda arquivos para o Notion funcionar offline (1,4 GB no PC auditado); o app baixa de novo, mas offline fica quebrado até lá |
| Otimização de Entrega | varia com a versão do Windows (as fontes divergem); não apagar por caminho | usar o cmdlet `Delete-DeliveryOptimizationCache` em vez de apagar arquivos; precisa de admin | o Windows guarda dados ligados a esses arquivos; o cmdlet limpa os dois juntos ([Microsoft Learn][do]). Conferir o nome com `Get-Command *DeliveryOptimization*` |
| Despejos de memória do sistema | `C:\Windows\MEMORY.DMP`, `C:\Windows\Minidump` | admin; opt-in | úteis para investigar telas azuis |
| Logs do sistema antigos | `C:\Windows\Logs\CBS\CbsPersist_*.cab` | admin; só `.cab` antigos | logs ativos não podem ser tocados |
| Cache de shaders do Steam | `steamapps\shadercache` em cada biblioteca | opt-in | recriado, mas jogos podem engasgar e o Steam pode baixar de novo vários GB |
| Cache de mídia da Adobe | `%APPDATA%\Adobe\Common\Media Cache Files`, `Media Cache` | opt-in, com Premiere/After Effects fechados | recriado, mas reabrir projetos grandes demora |
| Cache do Gradle | `~\.gradle\caches` | opt-in | seguro, mas o próximo build baixa muita coisa |
| Repositório do Maven | `~\.m2\repository` | opt-in | idem; builds offline quebram |
| Cache do Cargo (Rust) | `~\.cargo\registry\cache` | opt-in | o `registry\src` e `bin` não devem ser tocados |
| Navegadores do Playwright | `%LOCALAPPDATA%\ms-playwright` | opt-in | centenas de MB; baixa de novo com `npx playwright install` |
| Caches do JetBrains | `%LOCALAPPDATA%\JetBrains\<IDE>\caches` | opt-in, com a IDE fechada | a IDE reindexa tudo (demora) |
| `node_modules` de projetos antigos | qualquer pasta de projeto | **só escolha manual**, nunca automático | é recriado com `npm install`, mas são pastas de projeto do usuário |
| `Windows.old` | `C:\Windows.old` | admin; aviso forte; usar o próprio Windows (Configurações › Armazenamento) | apagar tira a opção de voltar para a versão anterior do Windows |
| Teams novo | `%LOCALAPPDATA%\Packages\MSTeams_8wekyb3d8bbwe\LocalCache` | opt-in, Teams fechado | apaga idioma e contas de outras organizações ([topedia][newteams]) |

## 🔴 Não fazer (aparece em "limpadores" por aí, mas é perigoso ou inútil)

| Alvo | Por quê |
|---|---|
| `C:\Windows\WinSxS` | componentes do Windows; apagar à mão quebra atualizações. O jeito certo é `DISM /Online /Cleanup-Image /StartComponentCleanup` |
| `C:\Windows\Installer` | necessário para desinstalar e reparar programas |
| `C:\Windows\Prefetch` | o Windows usa para abrir programas mais rápido; apagar deixa tudo mais lento por um tempo e não libera quase nada |
| `C:\Windows\SoftwareDistribution` inteira (fora `Download`) | contém o banco de dados do Windows Update |
| Dados do navegador além do cache | `History`, `Cookies`, `Login Data`, `Local Storage`, `IndexedDB`: desloga o usuário e perde dados |
| `%LOCALAPPDATA%\Microsoft\Windows\WebCache` | banco de dados em uso pelo sistema |
| `~\.nuget\packages` | pacotes instalados; builds offline quebram (só o cache HTTP é seguro) ([Microsoft Learn][nuget]) |
| `Yarn\Berry\cache` | projetos Yarn Plug'n'Play dependem dele |
| Modelos de IA (`~\.cache\huggingface`, `~\.ollama`) | o usuário baixou de propósito; podem ser dezenas de GB para baixar de novo |
| Imagens do Docker / discos do WSL (`.vhdx`) | contêm dados; limpar só com `docker system prune` e com o usuário decidindo |
| `OfficeFileCache` | pode ter arquivos ainda não enviados ao OneDrive/SharePoint |
| Pastas `Packages\*` dos apps da Store em geral | cada app guarda dados diferentes; só caminhos específicos confirmados |
| Downloads, Documentos, Área de trabalho | arquivos pessoais |
| "Limpar o registro" | não libera espaço e pode quebrar programas |

## Como implementar um candidato

1. Confirmar o caminho num PC real e o que tem dentro.
2. Confirmar em fonte (documentação oficial de preferência) que o programa recria os arquivos.
3. Seguir o [guia de manutenção](MAINTENANCE.md): adicionar no arquivo da categoria em
   `src/cleaner/categories/` (ou criar um). Se for 🟡, usar
   `optIn: true` e, se precisar, um `guard` novo em `guards.ts`.
4. Testar o motor numa pasta falsa (ver [AGENTS.md](../AGENTS.md)).
5. Mover a linha deste arquivo para a [auditoria](SAFETY-AUDIT.md), com a fonte.

## Fontes

- [wise]: https://www.wisecleaner.com/think-tank/772-What-Is-DirectX-Shader-Cache-and-How-to-Clear-It.html
- [nv]: https://github.com/Kkthnx/NvidiaShaderCleanup
- [do]: https://learn.microsoft.com/en-us/windows/deployment/do/waas-delivery-optimization-monitor
- [newteams]: https://blog-en.topedia.com/2023/11/clear-the-cache-of-the-new-teams-client-v2/
- [nuget]: https://learn.microsoft.com/en-us/nuget/consume-packages/managing-the-global-packages-and-cache-folders

Os caminhos marcados "confirmar" vêm de conhecimento geral e precisam ser checados num PC real
antes de entrar no app.

[wise]: https://www.wisecleaner.com/think-tank/772-What-Is-DirectX-Shader-Cache-and-How-to-Clear-It.html
[nv]: https://github.com/Kkthnx/NvidiaShaderCleanup
[do]: https://learn.microsoft.com/en-us/windows/deployment/do/waas-delivery-optimization-monitor
[newteams]: https://blog-en.topedia.com/2023/11/clear-the-cache-of-the-new-teams-client-v2/
[nuget]: https://learn.microsoft.com/en-us/nuget/consume-packages/managing-the-global-packages-and-cache-folders
[uv]: https://docs.astral.sh/uv/concepts/cache
