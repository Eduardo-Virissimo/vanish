// Ponto de entrada da tela: monta as views e liga os botões ao controller.
import { PixelBar } from './bar/pixel-bar';
import { createController } from './controller';
import { $ } from './dom';
import { loadHistory, loadUnchecked } from './memory';
import { createState } from './state';
import { mountCategories, renderCategories } from './views/categories';
import { mountMenuIcon } from './views/menu-icon';
import { bindConfirm, renderConfirm } from './views/confirm';
import { bindAdminHint, renderAdminHint } from './views/admin-hint';
import { bindFooter, renderFooter } from './views/footer';
import { bindHeader, renderHeader } from './views/header';
import { bindPanel, panelOpen, renderPanel, setPanel } from './views/panel';
import { runSplash } from './views/splash';
import { bindUpdate, renderUpdate } from './views/update';

async function main() {
  const state = createState(await window.cleaner.invoke('app:init'), { history: loadHistory(), unchecked: loadUnchecked() });
  const bar = new PixelBar($<HTMLCanvasElement>('bar'));

  const render = () => {
    renderHeader(state);
    renderUpdate(state);
    renderCategories(state);
    renderAdminHint(state);
    renderFooter(state);
    renderPanel(state);
    renderConfirm(state);
  };
  const app = createController(state, bar, render);

  mountMenuIcon(state.cats.map((c) => c.color));
  mountCategories(state, {
    onToggle: app.toggle,
    onHover: (cat) => bar.setHover(cat && (cat.bytes ?? 0) > 0 ? cat.id : null),
  });
  bindHeader(() => void app.scan());
  // "Limpar" abre o diálogo de confirmação; só o "Apagar" do diálogo apaga
  bindFooter(app.requestClean);
  const cancelConfirm = () => {
    app.cancel();
    $('clean').focus();
  };
  bindConfirm(state, { onConfirm: app.requestClean, onCancel: cancelConfirm });
  bindPanel(state, app.openFolder);

  bindAdminHint(app.relaunchAsAdmin);
  bindUpdate(app.installUpdate);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.phase === 'confirm') cancelConfirm();
      else if (panelOpen()) setPanel(false, state);
      return;
    }
    // atalhos só na tela principal (sem diálogo nem gaveta por cima)
    if (state.phase === 'confirm' || panelOpen()) return;
    const ctrl = e.ctrlKey && !e.altKey && !e.shiftKey;
    if ((ctrl && e.key.toLowerCase() === 'r') || e.key === 'F5') {
      e.preventDefault();
      void app.scan();
    } else if (ctrl && e.key === 'Enter') {
      // só ABRE a confirmação; o Ctrl+Enter não confirma (com o diálogo aberto ele nem chega aqui)
      e.preventDefault();
      app.requestClean();
    }
  });

  // a análise já começa por trás da tela de abertura
  void app.scan();
  void runSplash();
}

void main();
