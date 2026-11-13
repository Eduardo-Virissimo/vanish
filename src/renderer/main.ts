// Ponto de entrada da tela: monta as views e liga os botões ao controller.
import { PixelBar } from './bar/pixel-bar';
import { createController } from './controller';
import { $ } from './dom';
import { createState } from './state';
import { mountCategories, renderCategories } from './views/categories';
import { bindConfirm, renderConfirm } from './views/confirm';
import { bindFooter, renderFooter } from './views/footer';
import { bindHeader, renderHeader } from './views/header';
import { bindPanel, panelOpen, renderPanel, setPanel } from './views/panel';
import { runSplash } from './views/splash';

async function main() {
  const state = createState(await window.cleaner.invoke('app:init'));
  const bar = new PixelBar($<HTMLCanvasElement>('bar'));

  const render = () => {
    renderHeader(state);
    renderCategories(state);
    renderFooter(state);
    renderPanel(state);
    renderConfirm(state);
  };
  const app = createController(state, bar, render);

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

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.phase === 'confirm') cancelConfirm();
    else if (panelOpen()) setPanel(false, state);
  });

  // a análise já começa por trás da tela de abertura
  void app.scan();
  void runSplash();
}

void main();
