// Gera assets/icon.png (256×256, com transparência) a partir de assets/logo.svg.
// Roda com o próprio Electron: npm run icon
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const SIZE = Number(process.env.ICON_SIZE || 256);
const OUT = process.env.ICON_OUT || join(__dirname, '..', 'assets', 'icon.png');
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'assets', 'logo.svg'), 'utf8');
const html = `<html><body style="margin:0;background:transparent">
  <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${SIZE}" height="${SIZE}">
</body></html>`;

app.disableHardwareAcceleration();
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });
  let ready = false;
  let done = false;
  win.webContents.on('paint', (_e, _dirty, image) => {
    if (!ready || done || image.getSize().width < SIZE) return;
    done = true;
    writeFileSync(OUT, image.resize({ width: SIZE, height: SIZE }).toPNG());
    console.log(`${OUT} gerado`);
    app.quit();
  });
  // espera a imagem carregar antes de aceitar o quadro
  win.webContents.once('did-finish-load', () => setTimeout(() => {
    ready = true;
    win.webContents.invalidate();
  }, 300));
  win.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`);
});
