/* Munchkin · contador de niveles. Parte de Tanteo. */
(function () {
  'use strict';

  var KEY = 'tanteo-munchkin-v1';
  var MIN_P = 2, MAX_P = 8;
  var COLORS = ['#d7263d', '#1b78c2', '#2a9d4b', '#8e44ad', '#e67e22', '#0f9b9b', '#c2185b', '#5d6d7e'];

  var state = load() || fresh();
  var ui = { bump: null };
  var app = document.getElementById('app');
  var sheet = document.getElementById('sheet');

  function fresh() {
    return { screen: 'setup', names: ['', '', ''], goal: 10, players: [], won: false };
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
  function byId(id) { return state.players.filter(function (p) { return p.id === id; })[0]; }

  /* ---------- Vistas ---------- */

  function render() {
    app.innerHTML = state.screen === 'setup' ? viewSetup() : viewGame();
    ui.bump = null;
    save();
  }

  function viewSetup() {
    var n = state.names.length;
    var rows = state.names.map(function (name, i) {
      return '<div class="prow"><span class="dot" style="background:' + COLORS[i] + '"></span>' +
        '<input type="text" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="next" data-name="' + i + '" value="' + esc(name) +
        '" placeholder="Munchkin ' + (i + 1) + '" aria-label="Nombre del jugador ' + (i + 1) + '">' +
        '<button class="icon-btn" data-a="del" data-i="' + i + '" aria-label="Quitar"' + (n <= MIN_P ? ' disabled' : '') + '>✕</button></div>';
    }).join('');

    return '<a class="home" href="../../">‹ Juegos</a>' +
      '<header class="brand"><div class="mark">🗡️</div><h1>Munchkin</h1><p>Contador de niveles</p></header>' +
      '<div class="label">¿Quién entra en la mazmorra?</div>' +
      '<div class="panel">' + rows +
      (n < MAX_P ? '<button class="add-btn" data-a="add">＋ Añadir jugador</button>' : '') + '</div>' +
      '<div class="label">¿Hasta qué nivel?</div>' +
      '<div class="seg2" role="radiogroup">' +
      '<button role="radio" aria-checked="' + (state.goal === 10) + '" data-a="goal" data-g="10"><b>Nivel 10</b><span>Partida normal</span></button>' +
      '<button role="radio" aria-checked="' + (state.goal === 20) + '" data-a="goal" data-g="20"><b>Nivel 20</b><span>Partida épica</span></button></div>' +
      '<p style="text-align:center;margin-top:14px"><button class="link" data-a="rules">¿Cómo va esto?</button></p>' +
      '<div class="dock"><div class="dock-in"><button class="btn" data-a="start">¡Patada a la puerta!</button></div></div>';
  }

  function stepper(action, id, val, shown, min, max, small) {
    return '<div class="stepper' + (small ? ' sm' : '') + '">' +
      '<button data-a="' + action + '" data-p="' + id + '" data-d="-1"' + (val <= min ? ' disabled' : '') + ' aria-label="Menos">−</button>' +
      '<output class="' + (ui.bump === action + id ? 'bump' : '') + '">' + shown + '</output>' +
      '<button class="plus" data-a="' + action + '" data-p="' + id + '" data-d="1"' + (val >= max ? ' disabled' : '') + ' aria-label="Más">+</button></div>';
  }

  function viewGame() {
    var top = Math.max.apply(null, state.players.map(function (p) { return p.level; }));
    var cards = state.players.map(function (p) {
      var lead = p.level === top && top > 1;
      var pips = '';
      for (var i = 1; i <= state.goal; i++) {
        pips += '<i class="' + (i <= p.level ? 'on' : '') + (i === state.goal ? ' goal' : '') + '"></i>';
      }
      return '<section class="hero' + (lead ? ' lead' : '') + '" style="--c:' + p.color + '">' +
        '<div class="head"><div class="name">' + (lead ? '👑 ' : '') + esc(p.name) + '</div>' +
        '<div class="power">Fuerza<b>' + (p.level + p.gear) + '</b></div></div>' +
        '<div class="stats"><div class="stat"><div class="cap">Nivel</div>' + stepper('level', p.id, p.level, p.level, 1, state.goal) + '</div>' +
        '<div class="stat gear"><div class="cap">Equipo</div>' +
        stepper('gear', p.id, p.gear, (p.gear > 0 ? '+' : '') + p.gear, -20, 99, true) + '</div></div>' +
        '<div class="pips" aria-hidden="true">' + pips + '</div></section>';
    }).join('');

    return '<div class="top"><h2>Munchkin</h2>' +
      '<button class="chip-btn" data-a="rules" aria-label="Reglas">?</button>' +
      '<button class="chip-btn" data-a="menu">Salir</button></div>' +
      cards +
      '<div class="dock"><div class="dock-in"><button class="btn alt" data-a="roll">🎲 Tirar dado</button></div></div>';
  }

  /* ---------- Hojas ---------- */

  function openSheet(html) {
    sheet.innerHTML = '<div class="sheet">' + html + '</div>';
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  function winSheet(p) {
    openSheet('<div class="win"><div class="mark">🏆</div><h2>¡' + esc(p.name) + ' gana!</h2>' +
      '<p>Ha llegado al nivel ' + state.goal + '. El resto, a llorar al cofre.</p></div>' +
      '<div class="actions"><button class="btn" data-a="rematch">Revancha</button>' +
      '<a class="btn alt" href="../../">Volver a Juegos</a>' +
      '<button class="link" data-a="undoWin" data-p="' + p.id + '">Ha sido un error, bajar un nivel</button></div>');
  }

  var sheets = {
    rules: function () {
      openSheet('<h2>Cómo va esto</h2>' +
        '<p>Todos empezáis en <b>nivel 1</b>. Gana quien llegue primero al <b>nivel ' + state.goal + '</b>.</p>' +
        '<h3>Subir de nivel</h3><ul>' +
        '<li>Matar un monstruo: +1 (o más si la carta lo dice).</li>' +
        '<li>Vender objetos por valor de 1.000 piezas de oro: +1.</li>' +
        '<li>Cartas de «Sube un nivel».</li>' +
        '<li>El <b>último nivel</b> solo se consigue matando un monstruo.</li></ul>' +
        '<h3>Fuerza de combate</h3>' +
        '<p><b>Nivel + equipo.</b> Apunta en «Equipo» la suma de bonificaciones de tus objetos. Ganas el combate si tu fuerza supera a la del monstruo.</p>' +
        '<h3>Huir</h3><p>Si no puedes ganar, tira el dado: escapas con un <b>5 o un 6</b>.</p>' +
        '<h3>Morir</h3><p>Pierdes tus cosas, pero conservas el nivel.</p>' +
        '<div class="actions"><button class="btn" data-a="closeSheet">¡A saquear!</button></div>');
    },
    menu: function () {
      openSheet('<h2>¿Salir de la mazmorra?</h2><p>La partida queda guardada si vuelves a la lista de juegos.</p>' +
        '<div class="actions"><a class="btn" href="../../">Guardar y volver a Juegos</a>' +
        '<button class="btn alt" data-a="reset">Reiniciar niveles</button>' +
        '<button class="btn danger" data-a="newGame">Terminar la partida</button>' +
        '<button class="link" data-a="closeSheet">Seguir jugando</button></div>');
    },
    roll: function () {
      var n = 1 + Math.floor(Math.random() * 6);
      openSheet('<div class="die-out"><div class="face roll">' + n + '</div>' +
        '<p>' + (n >= 5 ? '<b>¡Escapas!</b> Si estabas huyendo, te libras.' : 'Si estabas huyendo… <b>te pilla</b>.') + '</p></div>' +
        '<div class="actions"><button class="btn alt" data-a="roll">Tirar otra vez</button>' +
        '<button class="btn" data-a="closeSheet">Vale</button></div>');
    }
  };

  /* ---------- Acciones ---------- */

  function startGame() {
    state.players = state.names.map(function (n, i) {
      return { id: 'p' + i, name: n.trim() || 'Munchkin ' + (i + 1), color: COLORS[i], level: 1, gear: 0 };
    });
    state.won = false; state.screen = 'game';
    keepAwake();
  }

  var focusLast = false, toTop = false;
  var actions = {
    add: function () { if (state.names.length < MAX_P) state.names.push(''); focusLast = true; },
    del: function (el) { if (state.names.length > MIN_P) state.names.splice(+el.dataset.i, 1); },
    goal: function (el) { state.goal = +el.dataset.g; },
    start: function () { startGame(); toTop = true; },

    level: function (el) {
      var p = byId(el.dataset.p);
      p.level = clamp(p.level + +el.dataset.d, 1, state.goal);
      ui.bump = 'level' + p.id;
      if (p.level >= state.goal && +el.dataset.d > 0) { state.won = true; render(); winSheet(p); return false; }
      state.won = false;
    },
    gear: function (el) {
      var p = byId(el.dataset.p);
      p.gear = clamp(p.gear + +el.dataset.d, -20, 99);
      ui.bump = 'gear' + p.id;
    },
    undoWin: function (el) {
      var p = byId(el.dataset.p); p.level = state.goal - 1; state.won = false; sheet.close();
    },
    reset: function () {
      state.players.forEach(function (p) { p.level = 1; p.gear = 0; });
      state.won = false; sheet.close();
    },
    rematch: function () {
      state.players.forEach(function (p) { p.level = 1; p.gear = 0; });
      state.won = false; sheet.close(); toTop = true;
    },
    newGame: function () {
      var names = state.players.map(function (p) { return p.name; }), goal = state.goal;
      state = fresh(); state.names = names; state.goal = goal;
      sheet.close(); toTop = true;
    },
    closeSheet: function () { sheet.close(); return false; },
    rules: function () { sheets.rules(); return false; },
    menu: function () { sheets.menu(); return false; },
    roll: function () { sheets.roll(); return false; }
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

  function keepAwake() {
    if (!('wakeLock' in navigator) || state.screen !== 'game' || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').catch(function () {});
  }
  document.addEventListener('visibilitychange', keepAwake);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('../../sw.js').catch(function () {}); });
  }

  render();
  keepAwake();
})();
