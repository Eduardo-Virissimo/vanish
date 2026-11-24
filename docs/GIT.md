# Fluxo de Git — branches, commits e versões

Como o código anda do computador até uma versão publicada. Vale para pessoas e para IA.
Resumo obrigatório em [AGENTS.md](../AGENTS.md); publicação em [RELEASE.md](RELEASE.md).

## Branches

| Branch | Para quê | Quem escreve nela |
|---|---|---|
| `main` | **o que foi publicado.** Cada commit aqui é uma versão (ou um hotfix) com tag `vX.Y.Z` | só merge de `dev` (versão) ou de `hotfix/*` |
| `dev` | integração: o que vai entrar na próxima versão. Precisa estar sempre passando no CI | só merge de branches de trabalho |
| `feat/<nome>` | recurso novo | commits do dia a dia |
| `fix/<nome>` | correção de bug | idem |
| `docs/<nome>`, `test/<nome>`, `refactor/<nome>`, `chore/<nome>`, `ci/<nome>` | o resto (mesmos tipos dos commits) | idem |
| `hotfix/<nome>` | correção urgente de uma versão já publicada | sai da `main` e volta para `main` **e** `dev` |

- Nome da branch em minúsculas, com hífen, curto: `fix/lixeira-contagem`, `feat/rodar-comando`.
- **Nunca** commitar direto em `main` ou `dev`. Toda mudança começa numa branch de trabalho
  criada a partir da `dev` atualizada:
  ```bash
  git switch dev && git pull
  git switch -c fix/lixeira-contagem
  ```
- Uma branch = um assunto. Se apareceu outro assunto no meio, outra branch.

## Commits — Conventional Commits em português

Formato: `tipo(escopo): descrição`, com a descrição no imperativo, minúscula, sem ponto final,
até ~72 caracteres. O escopo é opcional e aponta a parte do app.

```
fix(lixeira): contar cada item uma vez
feat(motor): tipo de alvo que roda o comando do próprio programa
docs(auditoria): fonte do cache de extensões do VS Code
```

| Tipo | Quando | Efeito na versão |
|---|---|---|
| `feat` | recurso novo para quem usa o app | sobe o **meio** (0.5.1 → 0.6.0) |
| `fix` | correção de bug | sobe o **último** (0.5.1 → 0.5.2) |
| `perf` | mais rápido, mesmo comportamento | último |
| `refactor` | muda o código sem mudar o comportamento | nenhum |
| `test` | só testes | nenhum |
| `docs` | só documentação | nenhum |
| `style` | só formatação/CSS sem mudar comportamento | nenhum |
| `build` | dependências, empacotamento, scripts de build | nenhum (ou último, se afeta o app) |
| `ci` | workflows do GitHub Actions | nenhum |
| `chore` | manutenção, e `chore(release): X.Y.Z` para subir a versão | — |

Escopos usados: `motor`, `categorias`, `seguranca`, `lixeira`, `admin`, `ipc`, `tela`, `barra`,
`gaveta`, `atualizacao`, `instalador`, `auditoria`, `release`.

- Mudança que quebra algo (ex.: muda o formato salvo no `localStorage`): `feat!:` ou `fix!:` e um
  rodapé `BREAKING CHANGE: <o que muda e o que fazer>`.
- Corpo do commit (opcional, depois de uma linha em branco): **por que** mudou, não o que mudou.
- Commits pequenos e que compilam: cada um passa em `npm run typecheck` e `npm test`.
- Os commits saem no nome do autor do repositório, **sem** linhas `Co-Authored-By` de IA.
- Nunca commitar `dist/`, `release/`, `.tmp/`, `node_modules/` nem arquivos com segredo.

## Juntar uma branch de trabalho na `dev`

1. Antes: `npm run typecheck`, `npm test` e, se mexeu na tela, abrir o app e conferir (ver
   [AGENTS.md](../AGENTS.md) › Como testar). Docs atualizadas (ARCHITECTURE, ROADMAP, auditoria...).
2. Atualizar com a `dev` se ela andou: `git rebase dev` (a branch é só sua) e testar de novo.
3. **De preferência por Pull Request** no GitHub (`feat/x` → `dev`): o CI roda e o histórico guarda
   a discussão. Título do PR no mesmo formato dos commits.
4. Sem PR (trabalho solo, mudança pequena): merge local sem fast-forward, para a branch aparecer
   no histórico:
   ```bash
   git switch dev
   git merge --no-ff fix/lixeira-contagem -m "Merge branch 'fix/lixeira-contagem' into dev"
   git push origin dev
   git branch -d fix/lixeira-contagem
   ```

## Publicar uma versão (`dev` → `main`)

1. Na `dev`, com o CI verde, decidir o número pela tabela de tipos acima (semver).
2. Branch `chore/release-X.Y.Z` saindo da `dev`: subir a versão
   (`npm version X.Y.Z --no-git-tag-version`), marcar o que entrou no [ROADMAP](ROADMAP.md), commit
   `chore(release): X.Y.Z`, juntar na `dev`.
3. PR `dev` → `main` (ou `git switch main && git merge --no-ff dev`).
4. Tag **na `main`**, no commit do merge, e enviar:
   ```bash
   git switch main && git pull
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```
5. O GitHub Actions publica a release (ver [RELEASE.md](RELEASE.md)). Conferir que o botão de
   download do README baixa o instalador novo.

Tags só na `main`, só no formato `vX.Y.Z`, e **nunca** reaproveitadas (apagar e recriar uma tag
confunde a atualização automática de quem já baixou).

## Hotfix (versão publicada com bug sério)

```bash
git switch main && git pull
git switch -c hotfix/<nome>
# corrigir, testar, subir a versão (último número), commit fix(...) + chore(release): X.Y.Z
git switch main && git merge --no-ff hotfix/<nome> && git tag vX.Y.Z
git switch dev && git merge --no-ff hotfix/<nome>
git push origin main dev vX.Y.Z
```

## Proteções no GitHub (configurar uma vez, no site)

Settings › Branches › Add rule, para `main` e para `dev`:
- **Require a pull request before merging** (só em `main`, se quiser liberar merge local na `dev`);
- **Require status checks to pass**: o job `check` do workflow **CI**;
- **Do not allow force pushes** e **do not allow deletions**.
