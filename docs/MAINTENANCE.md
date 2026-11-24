# Manutenção — como mexer no Vanish sem quebrar nada

Guia prático para as mudanças mais comuns. A regra de ouro: **`npm test` precisa passar** antes de
abrir o app. Ele confere as regras de segurança de todas as categorias e o motor de limpeza.

## Adicionar uma pasta numa categoria que já existe

Exemplo: limpar o cache de um app novo feito em Electron.

1. **Confirme que é seguro.** O programa dono recria os arquivos sozinho? Apagar não perde nada
   do usuário (senhas, histórico, configurações, downloads, saves)? Procure uma **fonte** (ajuda
   oficial do programa, de preferência). Sem fonte, não entra.
2. **Olhe a pasta num PC real.** Veja o que tem dentro e quanto ocupa. Se dados e cache estão
   misturados (como no `Partitions` do Notion), aponte só para as subpastas de cache.
3. **Adicione no arquivo da categoria**, em `src/cleaner/categories/<categoria>.ts`, dentro de
   `targets`. Atalhos prontos em `src/cleaner/paths.ts`:

   | Atalho | Para quê |
   |---|---|
   | `chromiumCaches(pasta)` | navegador Chromium (Chrome, Edge, Brave, a `htmlcache` da Steam): só `Cache`, `Code Cache`, `GPUCache` e shaders de cada perfil |
   | `electronCaches(pasta)` | app Electron comum (Discord, Slack, Obsidian) |
   | `partitionCaches(pasta)` | app Electron com `Partitions\*` (Notion, Postman) |
   | `{ path, minAgeMs: DAY }` | só arquivos com mais de 24 h |
   | `{ path, match: /^x_.*\.db$/i, shallow: true }` | só arquivos com esse nome, sem subpastas |
   | `'*'` no caminho | qualquer subpasta (`Profiles\*\cache2`) ou parte do nome (`webcache*`) |
   | `note: '...'` | explicação que aparece no menu ☰ ao lado da pasta |

4. **Registre na auditoria** (`docs/SAFETY-AUDIT.md`), na seção da categoria: a pasta, o que é e
   a fonte. Se a pasta tirar algo da lista de [candidatos](CLEANUP-CANDIDATES.md), tire de lá.
5. **Rode `npm test`.** Se ele recusar a pasta, leia a mensagem: ela diz qual regra foi quebrada.
6. **Abra o app** (`npm start`) e confira a pasta no menu ☰.

## Criar uma categoria nova

1. **Crie** `src/cleaner/categories/<id>.ts` (o nome do arquivo é o id, em minúsculas). Copie um
   arquivo parecido e troque tudo:

   ```ts
   import { join } from 'node:path';
   import { LOCAL } from '../paths';
   import { defineCategory } from '../types';
   import { CUT } from './_icon';

   export default defineCategory({
     id: 'exemplo',                 // igual ao nome do arquivo
     name: 'Exemplo',               // o que aparece na tela
     color: '#00C2A8',              // cor única (o teste recusa repetida)
     icon: `<rect ... fill="currentColor"/><path ... stroke="${CUT}"/>`, // SVG 24×24
     hint: 'O que é limpo, em uma frase.',
     warning: { level: 'caution', text: 'O que muda para o usuário depois de limpar.' },
     targets: [{ path: join(LOCAL, 'Exemplo', 'Cache') }],
   });
   ```

2. **Registre** em `src/cleaner/categories/index.ts`, na posição em que deve aparecer na tela.
3. **Escreva a seção** `### Exemplo` em `docs/SAFETY-AUDIT.md` e uma linha na tabela de resumo.
   O teste falha se faltar.
4. `npm test`, depois `npm start`. A grade tem 3 colunas: 9 categorias fecham 3 × 3; a 10ª abre
   uma linha nova (confira se a janela ainda cabe).

Não precisa mexer em mais nada: a tela recebe nome, cor, ícone e aviso pelo IPC.

### Aviso (`warning`) e marcação

| Situação | O que usar |
|---|---|
| Sem efeito colateral | sem `warning` |
| Efeito colateral (algo fica mais lento, baixa de novo) | `warning: { level: 'caution', text }`: diga o que muda e o que **continua** ("Senhas e logins continuam") |
| Precisa fechar um programa antes para limpar tudo | `closeFirst: 'Steam e Epic'` (vira uma etiqueta "feche antes" no diálogo); não repita isso no `warning` |
| Perda que não volta (arquivos do usuário) | `level: 'danger'` **e** `optIn: true` (o teste exige) |
| Seguro só em certas condições | `optIn: true` e, se der para checar, um `guard` em `src/cleaner/guards.ts` |
| Só é seguro com o comando do próprio programa (ex.: `uv cache clean`) | **não** apague por caminho; ainda não suportado (ver [ROADMAP](ROADMAP.md)) |

## O que o `npm test` confere

| Teste | O que barra |
|---|---|
| arquivo registrado | categoria criada e esquecida no `index.ts`, ou id diferente do nome do arquivo |
| ids e cores | id repetido ou mal escrito, cor repetida |
| textos e ícone | nome/hint vazios, ícone sem `currentColor` ou com script |
| perigo desmarcado | `danger` sem `optIn: true` |
| área permitida | pasta fora de AppData, `%TEMP%`, `Windows\Temp`, download do Windows Update e WER |
| pastas proibidas | raiz do disco, `C:\Windows`, `System32`, `WinSxS`, `Installer`, Documentos, Downloads, AppData inteira... |
| dados do usuário | caminho passando por `Cookies`, `Login Data`, `IndexedDB`, `Service Worker`, `Storage`, `packages`...; ou terminando num contêiner de perfis (`User Data`, `Profiles`, `Partitions`) |
| auditoria | categoria sem seção `### <nome>` em `docs/SAFETY-AUDIT.md` |
| motor | soma de tamanhos, limpeza, junção não seguida, idade mínima, filtro por nome, `*` no nome |

As regras moram em `src/cleaner/safety.ts` e valem também com o app rodando: o motor bloqueia
qualquer pasta que não passe nelas. Se uma regra precisar mudar (ex.: liberar uma área nova), mude
em `safety.ts`, acrescente um caso em `tests/safety.test.ts` **e** explique o porquê na auditoria.

## Outras mudanças comuns

| Quero... | Onde |
|---|---|
| mudar textos da tela | `src/renderer/views/*.ts` (e `index.html` para textos fixos) |
| mudar cores/medidas | `src/renderer/styles/tokens.css` |
| mudar a animação da barra | `src/renderer/bar/` (`cells.ts` pixels, `paint.ts` desenho, `layout.ts` tamanhos) |
| mudar o símbolo | `scripts/make-logo.mjs`, depois `npm run logo && npm run icon` |
| um canal novo entre tela e main | `src/shared/ipc.ts` (tipo **e** lista) + `src/main/ipc.ts` |
| uma trava nova (guard) | `src/cleaner/guards.ts` + o tipo `Guard` em `src/cleaner/types.ts` |

Depois de qualquer mudança: `npm run typecheck`, `npm test`, `npm start`.
