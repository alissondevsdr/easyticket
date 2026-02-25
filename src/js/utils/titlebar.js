// titlebar.js — injeta a barra de título customizada quando rodando no Electron
(function () {
  const isElectron = typeof window.electronAPI !== 'undefined';
  if (!isElectron) return;

  const bar = document.createElement('div');
  bar.id = 'et-titlebar';
  bar.innerHTML = `
    <div class="et-tb-drag">
      <img src="../../assets/easyticket2.png" class="et-tb-logo" alt="EasyTicket" />
      <span class="et-tb-title">EasyTicket</span>
    </div>
    <div class="et-tb-controls">
      <button id="et-min"  title="Minimizar">&#x2212;</button>
      <button id="et-max"  title="Maximizar">&#x25A1;</button>
      <button id="et-close" title="Fechar">&#x2715;</button>
    </div>
  `;
  document.body.prepend(bar);

  document.getElementById('et-min').addEventListener('click',   () => window.electronAPI.minimizeWindow());
  document.getElementById('et-max').addEventListener('click',   () => window.electronAPI.maximizeWindow());
  document.getElementById('et-close').addEventListener('click', () => window.electronAPI.closeWindow());

  // Adiciona classe no body para que o CSS empurre o conteúdo para baixo
  document.body.classList.add('has-electron-titlebar');
})();
