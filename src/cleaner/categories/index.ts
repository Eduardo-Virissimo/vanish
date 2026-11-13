// Lista fechada do que o app pode limpar, na ordem em que aparece na tela.
// Cada categoria mora no seu próprio arquivo nesta pasta. Para adicionar uma: docs/MAINTENANCE.md
//
// O app só apaga o CONTEÚDO das pastas listadas, nunca a pasta em si, e nunca segue
// links/junções para fora delas. `npm test` confere as regras de segurança de cada categoria.
import type { Category } from '../types';
import apps from './apps';
import browsers from './browsers';
import dev from './dev';
import errors from './errors';
import games from './games';
import temp from './temp';
import thumbs from './thumbs';
import trash from './trash';
import update from './update';

export const categories: Category[] = [
  temp,
  browsers,
  apps,
  dev,
  games,
  thumbs,
  errors,
  update,
  trash,
];
