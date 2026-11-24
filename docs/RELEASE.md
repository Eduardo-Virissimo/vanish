# Publicar uma versão nova

O Vanish é distribuído como um **instalador de um clique** (`Vanish-Setup.exe`) pelas
[Releases do GitHub](https://github.com/Eduardo-Virissimo/vanish/releases). Quem já instalou recebe
as versões novas sozinho: o app confere o GitHub ao abrir e a cada 6 horas, baixa em segundo plano
e instala quando é fechado (ou na hora, pelo botão "Atualizar para x.y.z" no topo).

## Passo a passo

O caminho das branches (`dev` → `main`) e o formato dos commits estão em [GIT.md](GIT.md).

1. Numa branch `chore/release-X.Y.Z` saindo da `dev`, suba a versão
   (`npm version 0.5.2 --no-git-tag-version`). Use [versionamento semântico](https://semver.org/lang/pt-BR/):
   correção → último número; recurso novo → do meio.
2. Rode `npm run typecheck` e `npm test`, faça o commit `chore(release): 0.5.2` e junte na `dev`.
3. Junte a `dev` na `main` e crie a tag **na `main`** com **a mesma versão**, com `v` na frente:
   ```bash
   git switch main && git merge --no-ff dev
   git tag v0.5.2
   git push origin main v0.5.2
   ```
4. Pronto. O GitHub Actions ([`.github/workflows/release.yml`](../.github/workflows/release.yml))
   roda typecheck e testes, cria a release como **rascunho** (com notas geradas dos commits), gera
   o instalador, envia os arquivos e só então publica, depois de conferir que os três estão lá e
   que existe uma única release com essa tag. (Criar a release antes evita um problema da v0.5.1:
   o electron-builder enviava os arquivos em paralelo e criou **duas** releases com a mesma tag,
   e o link de download do README dava 404.) A release tem três arquivos:
   - `Vanish-Setup.exe`: o instalador (é o que as pessoas baixam). O nome não muda entre versões,
     então o link `releases/latest/download/Vanish-Setup.exe` (botão do README) sempre baixa a última;
   - `Vanish-Setup.exe.blockmap`: deixa a atualização baixar só o que mudou;
   - `latest.yml`: é o que o app instalado lê para saber se existe versão nova.
     **Não apague esses dois últimos da release**, senão a atualização automática para.

Se a tag e o `package.json` não baterem, o workflow para antes de publicar e diz qual ajustar.

## Testar o instalador no seu PC (sem publicar)

```bash
npm run dist     # gera release/Vanish-Setup.exe e release/win-unpacked/Vanish.exe
```

Com o Smart App Control ligado, o `npm run dist` falha no fim (ver "Assinatura de código" abaixo).
`release/win-unpacked/Vanish.exe` abre o app empacotado sem instalar. Feche antes o Vanish de
desenvolvimento (`npm start`): como o app só permite uma janela, a cópia nova fecharia sozinha.

## Como a instalação funciona

- Instala só para o usuário atual, em `%LOCALAPPDATA%\Programs\Vanish`, sem pedir administrador.
- Cria atalho no menu Iniciar e na área de trabalho, e abre o Vanish no fim.
- Desinstala pelo "Adicionar ou remover programas" do Windows. O histórico de limpezas
  (`%APPDATA%\Vanish`) fica, para não se perder numa reinstalação. Todos os lugares onde o app
  coloca arquivos estão no [README › Desinstalar](../README.md#desinstalar).

## Assinatura de código (antivírus, SmartScreen e Smart App Control)

O instalador e o app **ainda não são assinados**. Consequências:

- **Smart App Control** (Windows 11, "Controle Inteligente de Aplicativos"): quando está ligado,
  **bloqueia** qualquer `.exe` sem assinatura de uma autoridade do Trusted Root Program da
  Microsoft, sem botão de "executar assim mesmo". Ele também impede o `npm run dist` local de
  terminar: o electron-builder precisa executar o instalador temporário para gerar o
  desinstalador, e o Windows bloqueia (erro `spawn UNKNOWN`; no Visualizador de Eventos,
  CodeIntegrity 3077). No PC do autor ele está ligado (16/11/2026). **Enquanto não houver
  assinatura, gere o instalador pelo GitHub Actions** (as máquinas do GitHub não têm esse bloqueio).
- **SmartScreen**: em PCs sem Smart App Control, aparece "O Windows protegeu o computador";
  dá para seguir em **Mais informações → Executar assim mesmo**.
- **Antivírus**: executáveis novos e sem assinatura chamam mais atenção das heurísticas.

**Decisão (16/11/2026): o Vanish fica sem assinatura.** As opções abaixo ficam registradas caso isso
mude um dia.

Assinar resolve o Smart App Control na hora (ele confia em assinatura de autoridade do Trusted Root
Program). O SmartScreen ainda pode avisar nas primeiras semanas, até o certificado ganhar reputação.
Opções pesquisadas em 16/11/2026:

| Opção | Custo | Quem pode | Observação |
|---|---|---|---|
| [SignPath Foundation](https://signpath.org/) (código aberto) | grátis | projetos com licença aprovada pela OSI, repositório público, sem código proprietário | o editor que aparece é "SignPath Foundation"; pede MFA no GitHub e normalmente uma release já publicada; integra com GitHub Actions |
| [Azure Artifact Signing](https://azure.microsoft.com/products/artifact-signing) (ex-Trusted Signing) | ~US$ 9,99/mês | empresas dos EUA, Canadá, UE e Reino Unido; **pessoa física só EUA e Canadá** | não serve para pessoa física no Brasil |
| Certificado comercial OV (ex.: Certum, Sectigo) | pago, por ano | pessoa física ou empresa, com verificação de identidade | o editor que aparece é o seu nome; hoje a chave fica em token/nuvem (HSM) |

Quando houver certificado, a assinatura entra no workflow (`win.signtoolOptions` ou um script
`sign` do electron-builder), assinando **todos** os binários (app, instalador e desinstalador),
como a Microsoft pede. Assinar depois do build quebraria o `latest.yml` (o hash muda), então a
assinatura tem que acontecer dentro do próprio electron-builder.

## O que não fazer

- Não publicar à mão um `.exe` sem o `latest.yml`: os apps instalados não enxergam a versão.
- Não reaproveitar uma tag (apagar e criar `v0.5.1` de novo): quem já baixou fica numa versão
  diferente da que a release mostra. Suba para `0.5.2`.
- Não deixar o repositório privado: o atualizador lê as releases sem senha.
