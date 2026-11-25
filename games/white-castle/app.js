/* The White Castle · calculadora de puntuación final. Parte de Tanteo.
   Puntuación final del juego base (reglamento, contrastado con la ayuda de Board Game Arena):
   1. Recursos: cada recurso con 3–6 unidades da 1 punto, con 7 da 2. Monedas + sellos: 1 punto por cada 5.
   2. Paso del Tiempo: 2.ª estación 3 puntos, 3.ª estación 6, 4.ª estación lo que marque la casilla (10–15).
   3. Miembros del clan:
      - Cortesanos: 1 en la puerta, 3 en el primer piso, 6 en el segundo, 10 en la sala del Daimio.
      - Guerreros: cada uno vale el valor de su patio × cortesanos DENTRO del castillo (la puerta no cuenta).
        El patio más caro vale doble.
      - Jardineros: los puntos impresos en su carta de jardín.
   Empate: gana quien vaya antes en el orden de turno. */
(function () {
  'use strict';

  var KEY = 'tanteo-whitecastle-v1';
  var MIN_P = 1, MAX_P = 4, CLAN = 5;

  var state = load() || fresh();
  var app = document.getElementById('app');
  var sheet = document.getElementById('sheet');

  function fresh() { return { screen: 'setup', names: ['', ''], players: [], sel: 0 }; }
  function newPlayer(id, name) {
    return { id: id, name: name, track: 0, food: 0, iron: 0, pearl: 0, coins: 0, seals: 0,
      season: 1, s4: 10, gate: 0, f1: 0, f2: 0, f3: 0, w1: 0, w2: 0, garden: 0 };
  }
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

  /* ---------- Reglas ---------- */

  function resPts(n) { return n >= 7 ? 2 : n >= 3 ? 1 : 0; }
  function scoreOf(p) {
    var res = resPts(p.food) + resPts(p.iron) + resPts(p.pearl);
    var money = Math.floor((p.coins + p.seals) / 5);
    var time = p.season === 2 ? 3 : p.season === 3 ? 6 : p.season === 4 ? p.s4 : 0;
    var court = p.gate + 3 * p.f1 + 6 * p.f2 + 10 * p.f3;
    var inside = p.f1 + p.f2 + p.f3;
    var wval = p.w1 + 2 * p.w2;
    var war = wval * inside;
    return {
      track: p.track, res: res, money: money, goods: res + money, time: time,
      court: court, inside: inside, wval: wval, war: war, garden: p.garden,
      total: p.track + res + money + time + court + war + p.garden
    };
  }

  // Límites de cada contador (los miembros del clan son 5 de cada tipo).
  var LIMITS = {
    food: function () { return 7; }, iron: function () { return 7; }, pearl: function () { return 7; },
    seals: function () { return 5; },
    gate: function (p) { return CLAN - p.f1 - p.f2 - p.f3; },
    f1: function (p) { return CLAN - p.gate - p.f2 - p.f3; },
    f2: function (p) { return CLAN - p.gate - p.f1 - p.f3; },
    f3: function (p) { return CLAN - p.gate - p.f1 - p.f2; },
    w1: function (p) { return CLAN - p.w2; },
    w2: function (p) { return CLAN - p.w1; },
    garden: function () { return 60; }
  };

  /* ---------- Vistas ---------- */

  function render() {
    app.innerHTML = state.screen === 'setup' ? viewSetup() : state.screen === 'result' ? viewResult() : viewScore();
    save();
  }

  function viewSetup() {
    var n = state.names.length;
    var rows = state.names.map(function (name, i) {
      return '<div class="prow"><span class="num">' + (i + 1) + '</span>' +
        '<input type="text" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="next" data-name="' + i + '" value="' + esc(name) +
        '" placeholder="Clan ' + (i + 1) + '" aria-label="Nombre del jugador ' + (i + 1) + '">' +
        '<button class="icon-btn" data-a="del" data-i="' + i + '" aria-label="Quitar"' + (n <= MIN_P ? ' disabled' : '') + '>✕</button></div>';
    }).join('');

    return '<a class="home" href="../../">‹ Juegos</a>' +
      '<header class="brand"><span class="seal">城</span><h1>The White Castle</h1>' +
      '<p>Calculadora de puntuación final</p><div class="rule"></div></header>' +
      '<div class="label">Clanes</div>' +
      '<div class="panel">' + rows + (n < MAX_P ? '<button class="add-btn" data-a="add">＋ Añadir jugador</button>' : '') + '</div>' +
      '<p class="muted small" style="margin:8px 2px 0">Ponedlos en el orden de turno final: sirve para deshacer empates.</p>' +
      '<p style="margin-top:10px"><button class="link" data-a="rules">¿Cómo se puntúa?</button></p>' +
      '<div class="dock"><div class="dock-in"><button class="btn" data-a="start">Contar puntos</button></div></div>';
  }

  function stepper(key, val, max) {
    return '<div class="stepper">' +
      '<button data-a="step" data-k="' + key + '" data-d="-1"' + (val <= 0 ? ' disabled' : '') + ' aria-label="Menos">−</button>' +
      '<output>' + val + '</output>' +
      '<button data-a="step" data-k="' + key + '" data-d="1"' + (val >= max ? ' disabled' : '') + ' aria-label="Más">+</button></div>';
  }
  function row(name, why, control) {
    return '<div class="row"><div class="who"><div class="nm">' + name + '</div>' +
      (why ? '<div class="why">' + why + '</div>' : '') + '</div>' + control + '</div>';
  }
  function sec(icon, title, pts, body) {
    return '<section class="sec"><header><span class="ic" aria-hidden="true">' + icon + '</span><h3>' + title + '</h3>' +
      '<span class="sub' + (pts ? '' : ' zero') + '">' + pts + '</span></header><div class="body">' + body + '</div></section>';
  }
  function numInput(key, val) {
    return '<input class="numin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" data-num="' + key +
      '" value="' + val + '" aria-label="' + key + '">';
  }
  function resWhy(n) { return n >= 7 ? '7 unidades: 2 puntos' : n >= 3 ? 'De 3 a 6: 1 punto' : 'Menos de 3: nada'; }

  function viewScore() {
    var np = state.players.length;
    var p = state.players[state.sel] || state.players[0];
    var s = scoreOf(p);

    var tabs = np > 1 ? '<div class="tabs" role="tablist">' + state.players.map(function (pl, i) {
      return '<button class="tab" role="tab" aria-selected="' + (i === state.sel) + '" data-a="sel" data-i="' + i + '">' +
        '<span class="n">' + esc(pl.name) + '</span><span class="t" data-out="tab' + i + '">' + scoreOf(pl).total + '</span></button>';
    }).join('') + '</div>' : '';

    var seasons = [[1, '1.ª', '0'], [2, '2.ª', '3'], [3, '3.ª', '6'], [4, '4.ª', '10–15']].map(function (x) {
      return '<button data-a="season" data-v="' + x[0] + '" aria-pressed="' + (p.season === x[0]) + '">' + x[1] + '<small>' + x[2] + ' pts</small></button>';
    }).join('');
    var s4 = p.season === 4
      ? '<div class="note">¿Qué número marca la casilla de tu ficha?</div><div class="seg">' + [10, 11, 12, 13, 14, 15].map(function (v) {
        return '<button data-a="s4" data-v="' + v + '" aria-pressed="' + (p.s4 === v) + '">' + v + '</button>';
      }).join('') + '</div>' : '';

    var warNote = s.wval === 0 ? 'Cada guerrero puntúa por cada cortesano que tengas dentro del castillo.'
      : s.inside === 0 ? '<b>Sin cortesanos dentro del castillo, tus guerreros no puntúan.</b>'
        : 'Valor de tus guerreros ' + s.wval + ' × ' + s.inside + ' cortesano' + (s.inside === 1 ? '' : 's') + ' dentro = <b>' + s.war + '</b>';

    return '<div class="top"><div class="where"><div class="k">Puntuación final</div><h2>The White Castle</h2></div>' +
      '<button class="chip-btn" data-a="rules" aria-label="Reglas">?</button>' +
      '<button class="chip-btn" data-a="menu">Salir</button></div>' + tabs +

      sec('🪭', 'Marcador de la partida', s.track,
        row('Puntos de clan', 'Lo que marca tu abanico en el tablero', numInput('track', p.track))) +

      sec('🍚', 'Recursos y dinero', s.goods,
        row('Comida', resWhy(p.food), stepper('food', p.food, 7)) +
        row('Hierro', resWhy(p.iron), stepper('iron', p.iron, 7)) +
        row('Nácar', resWhy(p.pearl), stepper('pearl', p.pearl, 7)) +
        row('Monedas', '', numInput('coins', p.coins)) +
        row('Sellos del Daimio', '', stepper('seals', p.seals, 5)) +
        '<div class="note" data-out="money">' + moneyText(p, s) + '</div>') +

      sec('🕊️', 'Paso del Tiempo', s.time,
        '<div class="note">¿En qué estación ha acabado tu marcador de influencia?</div><div class="seg">' + seasons + '</div>' + s4) +

      sec('🏯', 'Cortesanos', s.court,
        row('En la puerta', '1 punto cada uno', stepper('gate', p.gate, LIMITS.gate(p))) +
        row('Primer piso', '3 puntos cada uno', stepper('f1', p.f1, LIMITS.f1(p))) +
        row('Segundo piso', '6 puntos cada uno', stepper('f2', p.f2, LIMITS.f2(p))) +
        row('Sala del Daimio', '10 puntos cada uno', stepper('f3', p.f3, LIMITS.f3(p)))) +

      sec('⚔️', 'Guerreros', s.war,
        row('Patios normales', 'Valen 1 cada uno', stepper('w1', p.w1, LIMITS.w1(p))) +
        row('Patio más caro', 'Valen 2 cada uno', stepper('w2', p.w2, LIMITS.w2(p))) +
        '<div class="note">' + warNote + '</div>') +

      sec('🌿', 'Jardineros', s.garden,
        row('Puntos de tus cartas', 'Suma lo impreso en cada carta de jardín donde tengas un jardinero', stepper('garden', p.garden, 60))) +

      '<div class="total"><span class="nm">Total de ' + esc(p.name) + '</span><span class="pts" data-out="total">' + s.total + '</span></div>' +
      '<div class="dock"><div class="dock-in">' +
      (state.sel < np - 1
        ? '<button class="btn" data-a="next">Siguiente: ' + esc(state.players[state.sel + 1].name) + ' →</button>'
        : '<button class="btn" data-a="result">' + (np > 1 ? 'Ver quién gana' : 'Ver resultado') + '</button>') +
      '</div></div>';
  }

  function moneyText(p, s) {
    var sum = p.coins + p.seals;
    return 'Monedas + sellos: ' + sum + ' → <b>' + s.money + ' punto' + (s.money === 1 ? '' : 's') + '</b> (1 por cada 5)';
  }

  function viewResult() {
    // Orden: más puntos; en empate, quien va antes en el orden de turno (orden de la lista).
    var list = state.players.map(function (p, i) { return { p: p, s: scoreOf(p), i: i }; })
      .sort(function (a, b) { return b.s.total - a.s.total || a.i - b.i; });
    var best = list[0].s.total;
    var tied = list.filter(function (x) { return x.s.total === best; });

    var ranks = list.map(function (x, j) {
      return '<div class="rank' + (j === 0 ? ' first' : '') + '"><span class="place">' + (j + 1) + '</span>' +
        '<div class="who"><div class="nm">' + esc(x.p.name) + '</div><div class="sub">' +
        'Partida ' + x.s.track + ' · castillo ' + x.s.court + ' · guerreros ' + x.s.war + ' · jardín ' + x.s.garden +
        ' · tiempo ' + x.s.time + ' · recursos ' + x.s.goods + '</div></div>' +
        '<div class="tot">' + x.s.total + '</div></div>';
    }).join('');

    return '<a class="home" href="../../">‹ Juegos</a>' +
      '<div class="winner"><div class="k label" style="margin:14px 0 6px">' + (list.length > 1 ? 'Victoria' : 'Resultado') + '</div>' +
      '<h2>' + (list.length > 1 ? esc(list[0].p.name) + ' gana' : best + ' puntos de clan') + '</h2>' +
      (list.length > 1 ? '<p class="muted">con ' + best + ' puntos de clan</p>' : '') + '<div class="rule"></div></div>' +
      (tied.length > 1
        ? '<div class="tie">Empate a ' + best + ' puntos entre ' + tied.map(function (x) { return esc(x.p.name); }).join(' y ') +
          '. Gana quien va antes en el orden de turno; he usado el orden en que pusisteis los nombres.</div>'
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
    openSheet('<h2>Cómo se puntúa</h2>' +
      '<p>Al acabar la tercera ronda, a los puntos de clan que ya marque tu abanico se les suma todo esto:</p>' +
      '<h3>Recursos y dinero</h3><table>' +
      '<tr><td>Cada recurso con 3 a 6 unidades</td><td>1</td></tr>' +
      '<tr><td>Cada recurso con 7 unidades</td><td>2</td></tr>' +
      '<tr><td>Cada 5 monedas y sellos (juntos)</td><td>1</td></tr></table>' +
      '<h3>Paso del Tiempo</h3><table>' +
      '<tr><td>Marcador en la 2.ª estación</td><td>3</td></tr>' +
      '<tr><td>Marcador en la 3.ª estación</td><td>6</td></tr>' +
      '<tr><td>Marcador en la 4.ª estación</td><td>lo de su casilla (10–15)</td></tr></table>' +
      '<h3>Cortesanos</h3><table>' +
      '<tr><td>En la puerta</td><td>1</td></tr><tr><td>Primer piso</td><td>3</td></tr>' +
      '<tr><td>Segundo piso</td><td>6</td></tr><tr><td>Sala del Daimio</td><td>10</td></tr></table>' +
      '<h3>Guerreros</h3><p>Cada guerrero vale tantos puntos como cortesanos tengas <b>dentro</b> del castillo (los de la puerta no cuentan). Los del patio más caro valen doble.</p>' +
      '<h3>Jardineros</h3><p>Cada jardinero da los puntos impresos en su carta de jardín.</p>' +
      '<h3>Empate</h3><p>Gana quien vaya antes en el orden de turno.</p>' +
      '<div class="actions"><button class="btn" data-a="closeSheet">Entendido</button></div>');
  }

  /* ---------- Acciones ---------- */

  var focusLast = false, toTop = false;
  function cur() { return state.players[state.sel]; }
  var actions = {
    add: function () { if (state.names.length < MAX_P) state.names.push(''); focusLast = true; },
    del: function (el) { if (state.names.length > MIN_P) state.names.splice(+el.dataset.i, 1); },
    start: function () {
      state.players = state.names.map(function (n, i) { return newPlayer('p' + i, n.trim() || 'Clan ' + (i + 1)); });
      state.sel = 0; state.screen = 'score'; toTop = true;
    },
    sel: function (el) { state.sel = +el.dataset.i; },
    next: function () { state.sel = Math.min(state.sel + 1, state.players.length - 1); toTop = true; },
    step: function (el) {
      var p = cur(), k = el.dataset.k;
      p[k] = clamp(p[k] + +el.dataset.d, 0, LIMITS[k](p));
    },
    season: function (el) { cur().season = +el.dataset.v; },
    s4: function (el) { cur().s4 = +el.dataset.v; },
    result: function () { state.screen = 'result'; toTop = true; },
    back: function () { state.screen = 'score'; toTop = true; },
    again: function () {
      var names = state.players.map(function (p) { return p.name; });
      state = fresh(); state.names = names; toTop = true;
    },
    newGame: function () { actions.again(); sheet.close(); },
    rules: function () { rulesSheet(); return false; },
    menu: function () {
      openSheet('<h2>¿Salir?</h2><p>La puntuación queda guardada si vuelves a la lista de juegos.</p>' +
        '<div class="actions"><a class="btn" href="../../">Guardar y volver a Juegos</a>' +
        '<button class="btn dark" data-a="newGame">Borrar y empezar de nuevo</button>' +
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
    if (e.key !== 'Enter') return;
    if (e.target.matches('input[data-name]')) {
      var ins = Array.prototype.slice.call(app.querySelectorAll('input[data-name]'));
      var next = ins[ins.indexOf(e.target) + 1];
      if (next) next.focus(); else e.target.blur();
    } else if (e.target.matches('input[data-num]')) e.target.blur();
  });
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.name != null) { state.names[+t.dataset.name] = t.value; save(); return; }
    if (t.dataset.num) {
      // Campos numéricos: se actualiza sin repintar para no perder el foco.
      var clean = t.value.replace(/\D/g, '').slice(0, 3);
      if (clean !== t.value) t.value = clean;
      var p = cur();
      p[t.dataset.num] = clean === '' ? 0 : parseInt(clean, 10);
      save();
      var s = scoreOf(p), out = function (k, v) { var el = app.querySelector('[data-out="' + k + '"]'); if (el) el.innerHTML = v; };
      out('total', s.total); out('tab' + state.sel, s.total); out('money', moneyText(p, s));
    }
  });
  app.addEventListener('focusin', function (e) { if (e.target.dataset.num) e.target.select(); });
  app.addEventListener('focusout', function (e) { if (e.target.dataset.num) render(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('../../sw.js').catch(function () {}); });
  }

  window.__wc = { scoreOf: scoreOf, newPlayer: newPlayer }; // para pruebas
  render();
})();
