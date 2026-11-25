/* Skull King · contador de puntos (reglamento 2021). Parte de Tanteo. */
(function () {
  'use strict';

  var KEY = 'bitacora-sk-v1';
  var MIN_P = 2, MAX_P = 8;

  var MODES = {
    classic: { name: 'Clásica', desc: '10 rondas: de 1 a 10 cartas', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    brawl: { name: 'Directo al abordaje', desc: '5 rondas: de 6 a 10 cartas', cards: [6, 7, 8, 9, 10] },
    quick: { name: 'Escaramuza rápida', desc: '5 rondas de 5 cartas', cards: [5, 5, 5, 5, 5] }
  };

  // Bonus: solo cuentan si el jugador acierta su apuesta.
  var BONUS = [
    { k: 'c14', icon: '🃏', t: '14 de color capturado', d: 'Verde, amarillo o morado', v: 10, max: 3 },
    { k: 'b14', icon: '🏴', t: '14 negro capturado', d: 'El 14 de la bandera pirata', v: 20, max: 1 },
    { k: 'mer', icon: '🧜', t: 'Sirena capturada por tu pirata', d: 'Por cada sirena', v: 20, max: 2 },
    { k: 'pir', icon: '⚔️', t: 'Pirata capturado por tu Skull King', d: 'Por cada pirata', v: 30, max: 6 },
    { k: 'sk', icon: '☠️', t: 'Skull King capturado por tu sirena', d: '', v: 40, max: 1 },
    { k: 'loot', icon: '💰', t: 'Alianza de Botín cumplida', d: 'Tú y tu aliado acertáis la apuesta', v: 20, max: 2, adv: true }
  ];

  var state = load() || fresh();
  var ui = { open: {} }; // paneles de bonus abiertos (no se guarda)
  var app = document.getElementById('app');
  var sheet = document.getElementById('sheet');

  function fresh() {
    return {
      screen: 'setup',
      names: ['', '', ''],
      mode: 'classic',
      adv: false,
      players: [],
      rounds: [],
      cur: 0,
      view: 'bid',
      edit: null
    };
  }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      return s && s.screen ? s : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento: se sigue jugando */ }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }
  function cls(n) { return n < 0 ? 'neg' : 'pos'; }

  /* ---------- Reglas ---------- */

  function cardsPerRound(mode, nPlayers, adv) {
    // Con muchos jugadores no hay cartas para todos: se repite el máximo posible.
    var deck = adv ? 74 : 70;
    var cap = Math.floor(deck / nPlayers);
    return MODES[mode].cards.map(function (c) { return Math.min(c, cap); });
  }

  function scoreOf(cards, bid, tricks, b, adv) {
    b = b || {};
    var hit = bid === tricks;
    var base, why;
    if (bid === 0) {
      base = (hit ? 10 : -10) * cards;
      why = hit
        ? 'Apostó 0 y no ganó ninguna: 10 × ' + cards + ' cartas'
        : 'Apostó 0 pero ganó ' + tricks + ': −10 × ' + cards + ' cartas';
    } else if (hit) {
      base = 20 * bid;
      why = 'Acertó: 20 × ' + bid + (bid === 1 ? ' baza' : ' bazas');
    } else {
      var off = Math.abs(bid - tricks);
      base = -10 * off;
      why = 'Falló por ' + off + ': −10 × ' + off;
    }
    var raw = 0;
    BONUS.forEach(function (x) {
      if (x.adv && !adv) return;
      raw += (b[x.k] || 0) * x.v;
    });
    var bonus = hit ? raw : 0;
    var rascal = adv ? (b.rascal || 0) : 0;
    var wager = hit ? rascal : -rascal;
    return { hit: hit, base: base, why: why, rawBonus: raw, bonus: bonus, wager: wager, total: base + bonus + wager };
  }

  function roundScore(r, pid) {
    return scoreOf(r.cards, r.bids[pid] || 0, r.tricks[pid] || 0, r.bonus[pid], state.adv);
  }
  function totals() {
    var t = {};
    state.players.forEach(function (p) { t[p.id] = 0; });
    state.rounds.forEach(function (r) {
      if (!r.done) return;
      state.players.forEach(function (p) { t[p.id] += roundScore(r, p.id).total; });
    });
    return t;
  }
  function activeIdx() { return state.edit != null ? state.edit : state.cur; }
  function finished() { return state.cur >= state.rounds.length; }
  function dealer(i) { return state.players[i % state.players.length]; }

  /* ---------- Vistas ---------- */

  function render() {
    var html;
    if (state.screen === 'setup') html = viewSetup();
    else if (state.view === 'board' || (finished() && state.edit == null)) html = viewBoard();
    else if (state.view === 'result') html = viewResult();
    else html = viewBid();
    app.innerHTML = html;
    save();
  }

  function viewSetup() {
    var n = state.names.length;
    var rows = state.names.map(function (name, i) {
      return '<div class="prow">' +
        '<span class="num">' + (i + 1) + '</span>' +
        '<input type="text" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="next" ' +
        'data-name="' + i + '" value="' + esc(name) + '" placeholder="Jugador ' + (i + 1) + '" aria-label="Nombre del jugador ' + (i + 1) + '">' +
        '<button class="icon-btn" data-a="up" data-i="' + i + '" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="icon-btn" data-a="del" data-i="' + i + '" aria-label="Quitar"' + (n <= MIN_P ? ' disabled' : '') + '>✕</button>' +
        '</div>';
    }).join('');

    var modes = Object.keys(MODES).map(function (k) {
      var m = MODES[k];
      return '<button class="opt" role="radio" aria-checked="' + (state.mode === k) + '" data-a="mode" data-m="' + k + '">' +
        '<span class="tick">✓</span><span><b>' + m.name + '</b><span class="d">' + m.desc + '</span></span></button>';
    }).join('');

    return '<a class="home" href="../../">‹ Juegos</a>' +
      '<header class="brand"><div class="mark">☠️</div><h1>Skull King</h1>' +
      '<p>Contador de puntos</p></header>' +
      '<div class="label">¿Quién juega?</div>' +
      '<div class="panel">' + rows +
      (n < MAX_P ? '<button class="add-btn" data-a="add">＋ Añadir jugador</button>' : '') +
      '</div>' +
      '<p class="muted small" style="margin:8px 4px 0">Ponedlos en el orden de la mesa. El primero reparte la ronda 1.</p>' +
      '<details class="more"' + (state.mode !== 'classic' || state.adv ? ' open' : '') + '><summary>Opciones de partida</summary>' +
      '<div class="label" style="margin-top:6px">Duración</div>' +
      '<div class="choice" role="radiogroup">' + modes + '</div>' +
      '<div class="label">Cartas</div>' +
      '<button class="opt sq" role="checkbox" aria-checked="' + state.adv + '" data-a="adv">' +
      '<span class="tick">✓</span><span><b>Cartas avanzadas</b>' +
      '<span class="d">Kraken, Ballena Blanca, Botín y la apuesta de Rascal</span></span></button>' +
      '</details>' +
      '<p style="text-align:center;margin-top:14px"><button class="link" data-a="rules">¿Cómo se puntúa?</button></p>' +
      '<div class="dock"><div class="dock-in"><button class="btn" data-a="start">Zarpar ⚓</button></div></div>';
  }

  function header(i, title) {
    var r = state.rounds[i];
    var dots = state.rounds.map(function (x, j) {
      return '<i class="' + (x.done && j !== i ? 'done' : j === i ? 'now' : '') + '"></i>';
    }).join('');
    return '<div class="top"><div class="where">' +
      '<div class="k">' + (state.edit != null ? 'Corrigiendo · ' : '') + 'Ronda ' + (i + 1) + ' de ' + state.rounds.length + '</div>' +
      '<h2>' + title + '</h2></div>' +
      '<button class="chip-btn" data-a="board">🏆 Marcador</button>' +
      '<button class="chip-btn" data-a="rules" aria-label="Reglas">?</button></div>' +
      '<div class="dots">' + dots + '</div>' +
      '<div class="steps"><span class="' + (state.view === 'bid' ? 'on' : '') + '">1 · Apuestas</span>' +
      '<span class="' + (state.view === 'result' ? 'on' : '') + '">2 · Bazas ganadas</span></div>';
  }

  function stepper(action, pid, val, min, max, extra, small) {
    return '<div class="stepper' + (small ? ' sm' : '') + '">' +
      '<button data-a="' + action + '" data-p="' + pid + '" data-d="-1"' + (extra || '') + (val <= min ? ' disabled' : '') + ' aria-label="Menos">−</button>' +
      '<output>' + val + '</output>' +
      '<button data-a="' + action + '" data-p="' + pid + '" data-d="1"' + (extra || '') + (val >= max ? ' disabled' : '') + ' aria-label="Más">+</button>' +
      '</div>';
  }

  function viewBid() {
    var i = activeIdx(), r = state.rounds[i], d = dealer(i);
    var sum = 0;
    var cards = state.players.map(function (p) {
      var v = r.bids[p.id] || 0; sum += v;
      return '<div class="card"><div class="head"><div class="who">' +
        '<div class="name">' + esc(p.name) + (p.id === d.id ? '<span class="tag">reparte</span>' : '') + '</div>' +
        '<div class="sub">' + (v === 0 ? 'No ganará ninguna' : 'Ganará ' + v + (v === 1 ? ' baza' : ' bazas')) + '</div></div>' +
        stepper('bid', p.id, v, 0, r.cards) + '</div></div>';
    }).join('');

    var note = sum === r.cards
      ? 'Apuestas: ' + sum + ' de ' + r.cards + ' · cuadran justas'
      : sum > r.cards
        ? 'Apuestas: ' + sum + ' de ' + r.cards + ' · sobran ' + (sum - r.cards) + ', alguien fallará 😈'
        : 'Apuestas: ' + sum + ' de ' + r.cards + ' · faltan ' + (r.cards - sum) + ', alguien fallará 😈';

    return header(i, r.cards + (r.cards === 1 ? ' carta' : ' cartas') + ' por jugador') +
      '<div class="hint">Mirad vuestras cartas y, a la de tres, enseñad todos a la vez con los dedos cuántas bazas creéis que ganaréis. Apuntadlo aquí.</div>' +
      cards +
      '<div class="dock"><p class="note">' + note + '</p><div class="dock-in">' +
      '<button class="btn" data-a="toResult">Apuestas hechas → jugar</button></div></div>';
  }

  function viewResult() {
    var i = activeIdx(), r = state.rounds[i];
    var sum = 0;
    var cards = state.players.map(function (p) {
      var bid = r.bids[p.id] || 0, tr = r.tricks[p.id] || 0, b = r.bonus[p.id] || {};
      sum += tr;
      var s = roundScore(r, p.id);
      var open = !!ui.open[p.id];
      var extraPts = s.rawBonus + (state.adv ? (b.rascal || 0) : 0);

      var why = s.why + ' = <b class="' + cls(s.base) + '">' + signed(s.base) + '</b>';
      if (s.bonus) why += ' · bonus <b class="pos">+' + s.bonus + '</b>';
      if (s.wager) why += ' · Rascal <b class="' + cls(s.wager) + '">' + signed(s.wager) + '</b>';

      var panel = '';
      if (open) {
        panel = '<div class="bonus">' +
          (!s.hit && s.rawBonus ? '<div class="void">No suma: los bonus solo cuentan si aciertas la apuesta.</div>' : '') +
          BONUS.filter(function (x) { return !x.adv || state.adv; }).map(function (x) {
            var v = b[x.k] || 0;
            return '<div class="line"><div class="t">' + x.icon + ' ' + x.t +
              '<small>' + (x.d ? x.d + ' · ' : '') + '<span class="v">+' + x.v + '</span></small></div>' +
              stepper('bonus', p.id, v, 0, x.max, ' data-k="' + x.k + '"', true) + '</div>';
          }).join('') +
          (state.adv
            ? '<div class="line"><div class="t">🎲 Apuesta de Rascal<small>Gana esos puntos si acierta; los pierde si falla</small></div>' +
              '<div class="seg">' + [0, 10, 20].map(function (w) {
                return '<button data-a="rascal" data-p="' + p.id + '" data-w="' + w + '" aria-pressed="' + ((b.rascal || 0) === w) + '">' + w + '</button>';
              }).join('') + '</div></div>'
            : '') +
          '</div>';
      }

      return '<div class="card"><div class="head"><div class="who">' +
        '<div class="name">' + esc(p.name) + '</div>' +
        '<div class="sub">Apostó ' + bid + '</div></div>' +
        '<div class="pts ' + cls(s.total) + '">' + signed(s.total) + '</div></div>' +
        '<div class="line"><div class="t">Bazas ganadas</div>' + stepper('tricks', p.id, tr, 0, r.cards) + '</div>' +
        '<div class="why">' + why + '</div>' +
        '<button class="bonus-toggle' + (extraPts ? ' has' : '') + '" data-a="toggle" data-p="' + p.id + '" aria-expanded="' + open + '">' +
        (open ? 'Ocultar bonus ▴' : extraPts ? 'Bonus anotados · editar ▾' : '＋ Añadir bonus (14, sirenas, piratas…)') + '</button>' +
        panel + '</div>';
    }).join('');

    var ok = true, note, noteCls = '';
    if (sum > r.cards) {
      ok = false; noteCls = 'err';
      note = 'Las bazas suman ' + sum + ' y en esta ronda solo hay ' + r.cards + '. Revisadlas.';
    } else if (sum < r.cards) {
      if (state.adv) {
        noteCls = 'warn';
        note = 'Bazas: ' + sum + ' de ' + r.cards + '. Correcto solo si el Kraken o la Ballena dejaron alguna sin dueño.';
      } else {
        ok = false; noteCls = 'err';
        note = 'Bazas: ' + sum + ' de ' + r.cards + '. Falta' + (r.cards - sum === 1 ? '' : 'n') + ' ' + (r.cards - sum) + ' por anotar.';
      }
    } else {
      note = 'Bazas: ' + sum + ' de ' + r.cards + ' · todo cuadra ✓';
    }

    return header(i, '¿Cuántas ganó cada uno?') +
      cards +
      '<p style="text-align:center"><button class="link" data-a="toBid">← Cambiar apuestas</button></p>' +
      '<div class="dock"><p class="note ' + noteCls + '">' + note + '</p><div class="dock-in">' +
      '<button class="btn" data-a="close"' + (ok ? '' : ' disabled') + '>' +
      (state.edit != null ? 'Guardar corrección' : 'Cerrar ronda ' + (i + 1)) + '</button></div></div>';
  }

  function viewBoard() {
    var t = totals(), fin = finished();
    var doneRounds = state.rounds.filter(function (r) { return r.done; });
    var last = doneRounds[doneRounds.length - 1];
    var order = state.players.slice().sort(function (a, b) { return t[b.id] - t[a.id]; });
    var best = order.length ? t[order[0].id] : 0;

    var top;
    if (fin) {
      var winners = order.filter(function (p) { return t[p.id] === best; });
      top = '<a class="home" href="../../">‹ Juegos</a>' +
        '<div class="winner"><div class="mark">👑</div><h2>' +
        (winners.length > 1
          ? 'Empate: ' + winners.map(function (p) { return esc(p.name); }).join(' y ')
          : esc(winners[0].name) + ' gana la partida') +
        '</h2><p class="muted">con ' + best + ' puntos</p></div>';
    } else {
      top = '<div class="top"><div class="where"><div class="k">' +
        (doneRounds.length ? 'Tras la ronda ' + doneRounds.length + ' de ' + state.rounds.length : 'Aún sin rondas cerradas') +
        '</div><h2>Marcador</h2></div>' +
        '<button class="chip-btn" data-a="rules" aria-label="Reglas">?</button>' +
        '<button class="chip-btn" data-a="askNew">Salir</button></div><div style="height:12px"></div>';
    }

    var pos = 0, prev = null;
    var ranks = order.map(function (p, j) {
      if (t[p.id] !== prev) { pos = j + 1; prev = t[p.id]; }
      var d = last ? roundScore(last, p.id).total : null;
      return '<div class="card' + (pos === 1 && doneRounds.length ? ' first' : '') + '"><div class="rank">' +
        '<span class="place">' + pos + '</span>' +
        '<div class="who"><div class="name">' + esc(p.name) + '</div>' +
        (d != null ? '<div class="delta ' + cls(d) + '">' + signed(d) + ' en la última ronda</div>' : '') + '</div>' +
        '<div class="total">' + t[p.id] + '</div></div></div>';
    }).join('');

    var table = '';
    if (doneRounds.length) {
      table = '<div class="label">Ronda a ronda · toca una fila para corregirla</div><div class="table-wrap"><table><thead><tr><th>Ronda</th>' +
        state.players.map(function (p) { return '<th>' + esc(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        state.rounds.map(function (r, i) {
          if (!r.done) return '';
          return '<tr data-a="edit" data-i="' + i + '" tabindex="0" role="button" aria-label="Corregir ronda ' + (i + 1) + '"><td>' + (i + 1) + ' ✎</td>' +
            state.players.map(function (p) {
              var s = roundScore(r, p.id);
              return '<td class="' + cls(s.total) + '"><b>' + signed(s.total) + '</b><small>' +
                (r.tricks[p.id] || 0) + ' de ' + (r.bids[p.id] || 0) + '</small></td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody><tfoot><tr><td>Total</td>' +
        state.players.map(function (p) { return '<td>' + t[p.id] + '</td>'; }).join('') + '</tr></tfoot></table></div>' +
        '<p class="muted small" style="margin:8px 4px">Bajo cada puntuación: bazas ganadas de las apostadas.</p>';
    }

    var dock = fin
      ? '<button class="btn ghost" data-a="newGame">Nueva partida</button><button class="btn" data-a="rematch">Revancha</button>'
      : '<button class="btn" data-a="play">' +
        (state.rounds[state.cur].started ? 'Volver a la ronda ' : 'Empezar la ronda ') + (state.cur + 1) + ' →</button>';

    return top + ranks + table + '<div class="dock"><div class="dock-in">' + dock + '</div></div>';
  }

  /* ---------- Hojas ---------- */

  function openSheet(html) {
    sheet.innerHTML = '<div class="sheet">' + html + '</div>';
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  function rulesSheet() {
    openSheet('<h2>Cómo se puntúa</h2>' +
      '<p>Antes de cada ronda apuestas cuántas bazas vas a ganar. Lo importante es <b>acertar exactamente</b>.</p>' +
      '<h3>Tu apuesta</h3><table class="rt">' +
      '<tr><td>Aciertas (apostando 1 o más)</td><td>+20 × baza</td></tr>' +
      '<tr><td>Fallas (apostando 1 o más)</td><td>−10 × diferencia</td></tr>' +
      '<tr><td>Apuestas 0 y no ganas ninguna</td><td>+10 × cartas</td></tr>' +
      '<tr><td>Apuestas 0 y ganas alguna</td><td>−10 × cartas</td></tr></table>' +
      '<h3>Bonus (solo si aciertas la apuesta)</h3><table class="rt">' +
      '<tr><td>🃏 Cada 14 de color en tus bazas</td><td>+10</td></tr>' +
      '<tr><td>🏴 El 14 negro en tus bazas</td><td>+20</td></tr>' +
      '<tr><td>🧜 Tu pirata captura una sirena</td><td>+20</td></tr>' +
      '<tr><td>⚔️ Tu Skull King captura un pirata</td><td>+30</td></tr>' +
      '<tr><td>☠️ Tu sirena captura al Skull King</td><td>+40</td></tr></table>' +
      '<h3>¿Quién gana la baza?</h3><ol>' +
      '<li><b>Skull King</b> gana a todos los piratas… pero pierde contra una <b>sirena</b>.</li>' +
      '<li><b>Piratas</b> ganan a sirenas y a todas las cartas numeradas.</li>' +
      '<li><b>Sirenas</b> ganan a todas las cartas numeradas.</li>' +
      '<li><b>Negro</b> (triunfo) gana a los otros colores.</li>' +
      '<li>Si no, gana la carta más alta del <b>color de salida</b>.</li></ol>' +
      '<p>La <b>huida</b> (bandera blanca) pierde siempre. La <b>Tigresa</b> vale como pirata o como huida, tú eliges.</p>' +
      '<h3>Cartas avanzadas</h3><ul>' +
      '<li><b>Kraken</b>: destruye la baza, nadie la gana.</li>' +
      '<li><b>Ballena Blanca</b>: anula las cartas especiales; gana el número más alto de cualquier color.</li>' +
      '<li><b>Botín</b>: te alías con quien gane esa baza. Si los dos acertáis la apuesta, +20 cada uno.</li>' +
      '<li><b>Rascal</b>: al ganar una baza con él puedes jugarte 0, 10 o 20 puntos a que aciertas tu apuesta.</li></ul>' +
      '<div class="actions"><button class="btn" data-a="closeSheet">Entendido</button></div>');
  }

  function confirmSheet(title, text, yesLabel, action) {
    openSheet('<h2>' + title + '</h2><p>' + text + '</p><div class="actions">' +
      '<button class="btn ghost" data-a="closeSheet">Cancelar</button>' +
      '<button class="btn danger" data-a="' + action + '">' + yesLabel + '</button></div>');
  }

  /* ---------- Acciones ---------- */

  function startGame() {
    var names = state.names.map(function (n, i) { return n.trim() || 'Jugador ' + (i + 1); });
    state.players = names.map(function (n, i) { return { id: 'p' + i, name: n }; });
    state.rounds = cardsPerRound(state.mode, names.length, state.adv).map(function (c) {
      return { cards: c, bids: {}, tricks: {}, bonus: {}, done: false, started: false };
    });
    state.cur = 0; state.view = 'bid'; state.edit = null; state.screen = 'game';
    state.rounds[0].started = true;
    ui.open = {};
    keepAwake();
  }

  var actions = {
    add: function () { if (state.names.length < MAX_P) state.names.push(''); focusLast = true; },
    del: function (el) { if (state.names.length > MIN_P) state.names.splice(+el.dataset.i, 1); },
    up: function (el) {
      var i = +el.dataset.i; if (i < 1) return;
      var x = state.names[i]; state.names[i] = state.names[i - 1]; state.names[i - 1] = x;
    },
    mode: function (el) { state.mode = el.dataset.m; },
    adv: function () { state.adv = !state.adv; },
    start: startGame,

    bid: function (el) {
      var r = state.rounds[activeIdx()], p = el.dataset.p;
      r.bids[p] = clamp((r.bids[p] || 0) + +el.dataset.d, 0, r.cards);
    },
    tricks: function (el) {
      var r = state.rounds[activeIdx()], p = el.dataset.p;
      r.tricks[p] = clamp((r.tricks[p] || 0) + +el.dataset.d, 0, r.cards);
    },
    bonus: function (el) {
      var r = state.rounds[activeIdx()], p = el.dataset.p, k = el.dataset.k;
      var def = BONUS.filter(function (x) { return x.k === k; })[0];
      r.bonus[p] = r.bonus[p] || {};
      r.bonus[p][k] = clamp((r.bonus[p][k] || 0) + +el.dataset.d, 0, def.max);
    },
    rascal: function (el) {
      var r = state.rounds[activeIdx()], p = el.dataset.p;
      r.bonus[p] = r.bonus[p] || {};
      r.bonus[p].rascal = +el.dataset.w;
    },
    toggle: function (el) { ui.open[el.dataset.p] = !ui.open[el.dataset.p]; },

    toResult: function () {
      var r = state.rounds[activeIdx()];
      // Punto de partida: cada uno ganó lo que apostó; solo hay que tocar a quien falló.
      state.players.forEach(function (p) {
        if (r.tricks[p.id] == null) r.tricks[p.id] = r.bids[p.id] || 0;
        if (r.bids[p.id] == null) r.bids[p.id] = 0;
      });
      state.view = 'result'; toTop = true;
    },
    toBid: function () { state.view = 'bid'; toTop = true; },
    close: function () {
      var r = state.rounds[activeIdx()];
      r.done = true;
      if (state.edit != null) state.edit = null;
      else state.cur += 1;
      ui.open = {};
      state.view = 'board'; toTop = true;
    },
    board: function () { state.edit = null; state.view = 'board'; toTop = true; },
    play: function () {
      state.rounds[state.cur].started = true;
      state.view = state.rounds[state.cur].tricks[state.players[0].id] != null ? 'result' : 'bid';
      toTop = true;
    },
    edit: function (el) { state.edit = +el.dataset.i; state.view = 'result'; ui.open = {}; toTop = true; },

    rules: function () { rulesSheet(); return false; },
    closeSheet: function () { sheet.close(); return false; },
    askNew: function () {
      openSheet('<h2>¿Salir de la partida?</h2>' +
        '<p>Puedes volver a la lista de juegos y seguir luego: la partida queda guardada.</p>' +
        '<div class="actions col">' +
        '<a class="btn" href="../../">Guardar y volver a Juegos</a>' +
        '<button class="btn danger" data-a="newGame">Abandonar la partida</button>' +
        '<button class="btn ghost" data-a="closeSheet">Seguir jugando</button></div>');
      return false;
    },
    newGame: function () {
      var keep = { names: state.players.map(function (p) { return p.name; }), mode: state.mode, adv: state.adv };
      state = fresh();
      if (keep.names.length) state.names = keep.names;
      state.mode = keep.mode; state.adv = keep.adv;
      if (sheet.open) sheet.close();
      toTop = true;
    },
    rematch: function () {
      state.names = state.players.map(function (p) { return p.name; });
      startGame(); toTop = true;
    }
  };

  var focusLast = false, toTop = false;
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

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
    else if (e.target === sheet) sheet.close(); // toque fuera de la hoja
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (e.target.matches('tr[data-a]')) handle(e.target);
    if (e.target.matches('input[data-name]')) {
      var ins = Array.prototype.slice.call(app.querySelectorAll('input[data-name]'));
      var next = ins[ins.indexOf(e.target) + 1];
      if (next) next.focus(); else e.target.blur();
    }
  });
  app.addEventListener('input', function (e) {
    if (e.target.dataset.name != null) {
      state.names[+e.target.dataset.name] = e.target.value;
      save();
    }
  });

  /* Mantener la pantalla encendida durante la partida (si el navegador lo permite). */
  var lock = null;
  function keepAwake() {
    if (!('wakeLock' in navigator) || state.screen !== 'game' || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {});
  }
  document.addEventListener('visibilitychange', keepAwake);

  /* Sin conexión: el service worker guarda la app en el dispositivo. */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('../../sw.js').catch(function () {}); });
  }

  // Para pruebas en consola
  window.__sk = { scoreOf: scoreOf, cardsPerRound: cardsPerRound };

  render();
  keepAwake();
})();
