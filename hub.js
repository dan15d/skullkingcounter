/* Tanteo · portada: pinta el catálogo de games.js */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    var html = (window.GAMES || []).map(function (g) {
      var c = g.colors, st = g.status ? g.status() : null;
      var vars = '--g-bg:' + c.bg + ';--g-bg2:' + c.bg2 + ';--g-title:' + c.title + ';--g-text:' + c.text + ';--g-soft:' + c.soft;
      return '<a class="game" href="' + esc(g.path) + '" style="' + vars + '">' +
        '<span class="emoji" aria-hidden="true">' + g.emoji + '</span>' +
        '<h2 class="name" style="font-family:' + esc(g.titleFont || 'inherit') + '">' + esc(g.name) + '</h2>' +
        '<p class="blurb">' + esc(g.blurb) + '</p>' +
        '<div class="row"><div>' +
        (st ? '<span class="status">' + esc(st) + '</span><br>' : '') +
        '<span class="meta">' + esc(g.players) + '</span></div>' +
        '<span class="go">' + (st ? 'Continuar' : 'Jugar') + ' →</span></div></a>';
    }).join('');

    html += '<div class="soon"><div class="dice" aria-hidden="true">🎲</div><b>Más juegos en camino</b>Pronto podrás llevar la cuenta de otros.</div>';
    document.getElementById('games').innerHTML = html;
  }

  render();
  // Al volver de un juego, refresca el estado de «partida en curso».
  window.addEventListener('pageshow', render);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
