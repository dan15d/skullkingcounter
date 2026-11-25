/* Esquirlas de la Creación (Shards of Creation) · calculadora de puntuación final. Parte de Tanteo.
   Fórmulas tomadas de la calculadora oficial en Excel (v1.0.0):
   - Cada Esquirla: n cartas valen n·(n+1)/2 puntos.
   - Resonancia: sets completos (una carta de cada Esquirla en juego) = el mínimo de cartas entre todas.
     Vale base · 2^(sets−1), con base 5 (2–3 jugadores) u 8 (4 jugadores).
   - Ajustes: puntos sueltos por poderes de cartas.
   - Desempate: número de cartas. */
(function () {
  'use strict';

  var KEY = 'tanteo-esquirlas-v1';
  var MIN_P = 2, MAX_P = 4, MAX_CARDS = 16;

  var SHARDS = [
    { id: 'autonomy', name: 'Autonomía', c: '#e6a23c' },
    { id: 'cultivation', name: 'Cultivación', c: '#3fa66b' },
    { id: 'devotion', name: 'Devoción', c: '#e36a8d' },
    { id: 'dominion', name: 'Dominio', c: '#8b5fd1' },
    { id: 'honor', name: 'Honor', c: '#4f8fe0' },
    { id: 'odium', name: 'Odium', c: '#d9483b' },
    { id: 'preservation', name: 'Conservación', c: '#9fb4cf' },
    { id: 'ruin', name: 'Ruina', c: '#a8582f' }
  ];
  function shard(id) { return SHARDS.filter(function (s) { return s.id === id; })[0]; }

  var state = load() || fresh();
  var app = document.getElementById('app');
  var sheet = document.getElementById('sheet');

  function fresh() { return { screen: 'setup', names: ['', ''], shards: [], players: [], sel: 0 }; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); return s && s.screen ? s : null; } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* se sigue jugando */ } }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }

  /* ---------- Reglas ---------- */

  function shardsNeeded(nPlayers) { return nPlayers >= 4 ? 5 : 4; }
  function resoBase(nPlayers) { return nPlayers >= 4 ? 8 : 5; }
  function shardPoints(n) { return n * (n + 1) / 2; }
  function resoPoints(sets, nPlayers) { return sets > 0 ? resoBase(nPlayers) * Math.pow(2, sets - 1) : 0; }

  function scoreOf(counts, adj, shardIds, nPlayers) {
    var per = {}, sum = 0, cards = 0, sets = Infinity;
    shardIds.forEach(function (id) {
      var n = counts[id] || 0;
      per[id] = shardPoints(n); sum += per[id]; cards += n; sets = Math.min(sets, n);
    });
    if (!shardIds.length) sets = 0;
    var reso = resoPoints(sets, nPlayers);
    return { per: per, sets: sets, reso: reso, adj: adj || 0, cards: cards, total: sum + reso + (adj || 0) };
  }
  function scorePlayer(p) { return scoreOf(p.counts, p.adj, state.shards, state.players.length); }

  /* ---------- Vistas ---------- */

  function render() {
    app.innerHTML = state.screen === 'setup' ? viewSetup() : state.screen === 'result' ? viewResult() : viewScore();
    save();
  }

  function viewSetup() {
    var n = state.names.length, need = shardsNeeded(n), have = state.shards.length;
    var rows = state.names.map(function (name, i) {
      return '<div class="prow"><span class="num">' + (i + 1) + '</span>' +
        '<input type="text" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="next" data-name="' + i + '" value="' + esc(name) +
        '" placeholder="Jugador ' + (i + 1) + '" aria-label="Nombre del jugador ' + (i + 1) + '">' +
        '<button class="icon-btn" data-a="del" data-i="' + i + '" aria-label="Quitar"' + (n <= MIN_P ? ' disabled' : '') + '>✕</button></div>';
    }).join('');

    var picks = SHARDS.map(function (s) {
      var on = state.shards.indexOf(s.id) >= 0;
      return '<button class="shard-pick" role="checkbox" aria-checked="' + on + '" data-a="pick" data-s="' + s.id + '" style="--c:' + s.c + '"' +
        (!on && have >= need ? ' disabled' : '') + '><span class="gem"></span><span class="nm">' + s.name + '</span></button>';
    }).join('');

    var ok = have === need;
    var note = ok ? 'Todo listo.' : have < need
      ? 'Elige ' + (need - have) + ' Esquirla' + (need - have === 1 ? '' : 's') + ' más.'
      : 'Sobra' + (have - need === 1 ? '' : 'n') + ' ' + (have - need) + ': con ' + n + ' jugadores se usan ' + need + '.';

    return '<a class="home" href="../../">‹ Juegos</a>' +
      '<header class="brand"><div class="orn">✦ ✧ ✦</div><h1>Esquirlas de la Creación</h1><p>Calculadora de puntuación final</p></header>' +
      '<div class="label">Jugadores</div>' +
      '<div class="panel">' + rows + (n < MAX_P ? '<button class="add-btn" data-a="add">＋ Añadir jugador</button>' : '') + '</div>' +
      '<div class="label">Esquirlas en juego · ' + have + ' de ' + need + '</div>' +
      '<div class="shards">' + picks + '</div>' +
      '<p class="muted small" style="margin:8px 4px 0">Marca las Esquirlas con las que habéis jugado: 4 con dos o tres jugadores, 5 con cuatro.</p>' +
      '<p style="text-align:center;margin-top:10px"><button class="link" data-a="rules">¿Cómo se puntúa?</button></p>' +
      '<div class="dock"><p class="note">' + note + '</p><div class="dock-in">' +
      '<button class="btn" data-a="start"' + (ok ? '' : ' disabled') + '>Contar puntos</button></div></div>';
  }

  function stepper(action, key, val, shown, min, max) {
    return '<div class="stepper">' +
      '<button data-a="' + action + '" data-k="' + key + '" data-d="-1"' + (val <= min ? ' disabled' : '') + ' aria-label="Menos">−</button>' +
      '<output>' + shown + '</output>' +
      '<button data-a="' + action + '" data-k="' + key + '" data-d="1"' + (val >= max ? ' disabled' : '') + ' aria-label="Más">+</button></div>';
  }

  function sumText(n) {
    if (n === 0) return 'Sin cartas';
    if (n === 1) return '1 carta = 1';
    var parts = []; for (var i = 1; i <= n; i++) parts.push(i);
    return n <= 6 ? parts.join('+') + ' = ' + shardPoints(n) : n + ' cartas: 1+2+…+' + n + ' = ' + shardPoints(n);
  }

  function viewScore() {
    var np = state.players.length;
    var p = state.players[state.sel] || state.players[0];
    var s = scorePlayer(p);

    var tabs = state.players.map(function (pl, i) {
      return '<button class="tab" role="tab" aria-selected="' + (i === state.sel) + '" data-a="sel" data-i="' + i + '">' +
        '<span class="n">' + esc(pl.name) + '</span><span class="t">' + scorePlayer(pl).total + '</span></button>';
    }).join('');

    var rows = state.shards.map(function (id) {
      var sh = shard(id), n = p.counts[id] || 0;
      return '<div class="row" style="--c:' + sh.c + '"><span class="gem"></span>' +
        '<div class="who"><div class="nm">' + sh.name + '</div><div class="why">' + sumText(n) + '</div></div>' +
        stepper('count', id, n, n, 0, MAX_CARDS) +
        '<div class="pts' + (s.per[id] ? '' : ' zero') + '">' + s.per[id] + '</div></div>';
    }).join('');

    var resoWhy = s.sets > 0
      ? s.sets + ' set' + (s.sets === 1 ? '' : 's') + ' completo' + (s.sets === 1 ? '' : 's') + ' (una carta de cada Esquirla)'
      : 'Necesitas al menos una carta de cada Esquirla';

    return '<div class="top"><div class="where"><div class="k">Puntuación final</div><h2>Esquirlas de la Creación</h2></div>' +
      '<button class="chip-btn" data-a="rules" aria-label="Reglas">?</button>' +
      '<button class="chip-btn" data-a="menu">Salir</button></div>' +
      '<div class="tabs" role="tablist">' + tabs + '</div>' +
      '<div class="sheet-card">' + rows +
      '<div class="row reso"><div class="who"><div class="nm">✦ Resonancia</div><div class="why">' + resoWhy + '</div></div>' +
      '<div class="pts' + (s.reso ? '' : ' zero') + '">' + s.reso + '</div></div>' +
      '<div class="row"><div class="who"><div class="nm">Ajustes</div><div class="why">Puntos de más o de menos por poderes de cartas</div></div>' +
      stepper('adj', 'adj', p.adj, signed(p.adj), -99, 99) +
      '<div class="pts' + (p.adj < 0 ? ' neg' : p.adj ? '' : ' zero') + '">' + signed(p.adj) + '</div></div>' +
      '<div class="row total"><div class="who"><div class="nm">Total de ' + esc(p.name) + '</div>' +
      '<div class="why">' + s.cards + ' carta' + (s.cards === 1 ? '' : 's') + ' en su zona</div></div>' +
      '<div class="pts">' + s.total + '</div></div></div>' +
      '<div class="dock"><div class="dock-in">' +
      (state.sel < np - 1
        ? '<button class="btn" data-a="next">Siguiente: ' + esc(state.players[state.sel + 1].name) + ' →</button>'
        : '<button class="btn" data-a="result">Ver quién gana</button>') +
      '</div></div>';
  }

  function viewResult() {
    var list = state.players.map(function (p) { return { p: p, s: scorePlayer(p) }; })
      .sort(function (a, b) { return b.s.total - a.s.total; });
    var best = list[0].s.total;
    var tied = list.filter(function (x) { return x.s.total === best; });

    var pos = 0, prev = null;
    var ranks = list.map(function (x, j) {
      if (x.s.total !== prev) { pos = j + 1; prev = x.s.total; }
      return '<div class="rank' + (pos === 1 ? ' first' : '') + '"><span class="place">' + pos + '</span>' +
        '<div class="who"><div class="nm">' + esc(x.p.name) + '</div><div class="sub">' +
        x.s.cards + (x.s.cards === 1 ? ' carta' : ' cartas') + ' · Resonancia ' + x.s.reso + (x.s.adj ? ' · ajustes ' + signed(x.s.adj) : '') + '</div></div>' +
        '<div class="tot">' + x.s.total + '</div></div>';
    }).join('');

    return '<a class="home" href="../../">‹ Juegos</a>' +
      '<div class="winner"><div class="orn">✦</div><h2>' +
      (tied.length > 1 ? 'Empate a ' + best + ' puntos' : esc(tied[0].p.name) + ' gana') + '</h2>' +
      (tied.length > 1 ? '' : '<p class="muted">con ' + best + ' puntos</p>') + '</div>' +
      (tied.length > 1
        ? '<div class="tie">El empate se resuelve por número de cartas: ' +
          tied.map(function (x) { return esc(x.p.name) + ' tiene ' + x.s.cards; }).join(', ') + '. Consultad el reglamento para ver quién se lo lleva.</div>'
        : '') +
      ranks +
      '<div class="dock"><div class="dock-in"><button class="btn ghost" data-a="back">Corregir</button>' +
      '<button class="btn" data-a="again">Otra partida</button></div></div>';
  }

  /* ---------- Hojas ---------- */

  function openSheet(html) {
    sheet.innerHTML = '<div class="sheet">' + html + '</div>';
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  function rulesSheet() {
    var n = Math.max(state.players.length, state.names.length), b = resoBase(n);
    openSheet('<h2>Cómo se puntúa</h2>' +
      '<p>Se cuenta una sola vez, al acabar la tercera ronda, con las cartas de tu zona de puntuación.</p>' +
      '<h3>Cartas de cada Esquirla</h3>' +
      '<p>Cada carta de la misma Esquirla vale una más que la anterior: la primera 1, la segunda 2, la tercera 3…</p>' +
      '<table><tr><th>Cartas</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr>' +
      '<tr><th>Puntos</th><td>1</td><td>3</td><td>6</td><td>10</td><td>15</td><td>21</td></tr></table>' +
      '<h3>✦ Resonancia</h3>' +
      '<p>Un set completo es una carta de <b>cada</b> Esquirla en juego. Cada set extra dobla el premio.</p>' +
      '<table><tr><th>Sets</th><td>1</td><td>2</td><td>3</td><td>4</td></tr>' +
      '<tr><th>2–3 jugadores</th><td>5</td><td>10</td><td>20</td><td>40</td></tr>' +
      '<tr><th>4 jugadores</th><td>8</td><td>16</td><td>32</td><td>64</td></tr></table>' +
      '<p class="small">En esta partida el primer set vale ' + b + '.</p>' +
      '<h3>Ajustes</h3><p>Algunas cartas suman o restan puntos al final. Apunta ahí el total de esos efectos.</p>' +
      '<h3>Empate</h3><p>Se desempata por el número de cartas.</p>' +
      '<div class="actions"><button class="btn" data-a="closeSheet">Entendido</button></div>');
  }

  /* ---------- Acciones ---------- */

  var focusLast = false, toTop = false;
  var actions = {
    add: function () { if (state.names.length < MAX_P) state.names.push(''); focusLast = true; },
    del: function (el) { if (state.names.length > MIN_P) state.names.splice(+el.dataset.i, 1); },
    pick: function (el) {
      var id = el.dataset.s, i = state.shards.indexOf(id);
      if (i >= 0) state.shards.splice(i, 1); else state.shards.push(id);
    },
    start: function () {
      // Mantener el orden habitual de las Esquirlas, no el de selección
      state.shards = SHARDS.map(function (s) { return s.id; }).filter(function (id) { return state.shards.indexOf(id) >= 0; });
      state.players = state.names.map(function (n, i) {
        return { id: 'p' + i, name: n.trim() || 'Jugador ' + (i + 1), counts: {}, adj: 0 };
      });
      state.sel = 0; state.screen = 'score'; toTop = true;
    },
    sel: function (el) { state.sel = +el.dataset.i; },
    next: function () { state.sel = Math.min(state.sel + 1, state.players.length - 1); toTop = true; },
    count: function (el) {
      var p = state.players[state.sel], k = el.dataset.k;
      p.counts[k] = clamp((p.counts[k] || 0) + +el.dataset.d, 0, MAX_CARDS);
    },
    adj: function (el) { var p = state.players[state.sel]; p.adj = clamp(p.adj + +el.dataset.d, -99, 99); },
    result: function () { state.screen = 'result'; toTop = true; },
    back: function () { state.screen = 'score'; toTop = true; },
    again: function () {
      var names = state.players.map(function (p) { return p.name; }), shards = state.shards;
      state = fresh(); state.names = names; state.shards = shards; toTop = true;
    },
    newGame: function () { actions.again(); sheet.close(); },
    rules: function () { rulesSheet(); return false; },
    menu: function () {
      openSheet('<h2>¿Salir?</h2><p>La puntuación queda guardada si vuelves a la lista de juegos.</p>' +
        '<div class="actions"><a class="btn" href="../../">Guardar y volver a Juegos</a>' +
        '<button class="btn danger" data-a="newGame">Borrar y empezar de nuevo</button>' +
        '<button class="link" data-a="closeSheet">Seguir contando</button></div>');
      return false;
    },
    closeSheet: function () { sheet.close(); return false; }
  };

  function handle(el) {
    var fn = actions[el.dataset.a];
    if (!fn || el.disabled) return;
    if (fn(el) === false) return;
    render();
    if (toTop) { window.scrollTo(0, 0); toTop = false; }
    if (focusLast) {
      var ins = app.querySelectorAll('input[data-name]');
      if (ins.length) ins[ins.length - 1].focus();
      focusLast = false;
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]');
    if (el) handle(el);
    else if (e.target === sheet) sheet.close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('input[data-name]')) {
      var ins = Array.prototype.slice.call(app.querySelectorAll('input[data-name]'));
      var next = ins[ins.indexOf(e.target) + 1];
      if (next) next.focus(); else e.target.blur();
    }
  });
  app.addEventListener('input', function (e) {
    if (e.target.dataset.name != null) { state.names[+e.target.dataset.name] = e.target.value; save(); }
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('../../sw.js').catch(function () {}); });
  }

  window.__esq = { scoreOf: scoreOf }; // para pruebas
  render();
})();
