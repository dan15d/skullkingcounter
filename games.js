/* Tanteo · catálogo de juegos.
   Para añadir un juego:
   1. Crea su carpeta en games/<id>/ con su propio index.html, estilos y código.
   2. Añade aquí una entrada.
   3. Añade sus archivos a la lista FILES de sw.js para que funcione sin conexión. */
window.GAMES = [
  {
    id: 'skull-king',
    name: 'Skull King',
    path: 'games/skull-king/',
    emoji: '☠️',
    blurb: 'Apuesta tus bazas y acierta de pleno',
    players: '2–8 jugadores',
    // Colores de la tarjeta en la portada (cada juego luce su propio estilo)
    colors: { bg: '#0d1826', bg2: '#1e3550', title: '#e0a93b', text: '#f4ead5', soft: '#9fb3c8' },
    titleFont: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    // Devuelve un texto si hay una partida a medias en este dispositivo, o null.
    status: function () {
      try {
        var s = JSON.parse(localStorage.getItem('bitacora-sk-v1'));
        if (!s || s.screen !== 'game' || !s.rounds) return null;
        if (s.cur >= s.rounds.length) return 'Partida terminada';
        return 'Partida en curso · ronda ' + (s.cur + 1) + ' de ' + s.rounds.length;
      } catch (e) { return null; }
    }
  },
  {
    id: 'munchkin',
    name: 'Munchkin',
    path: 'games/munchkin/',
    emoji: '🗡️',
    blurb: 'Sube de nivel antes que tus «amigos»',
    players: '2–8 jugadores',
    colors: { bg: '#2a140e', bg2: '#7a2e1d', title: '#ffd23f', text: '#fbeed3', soft: '#d9b48a' },
    titleFont: '"Marker Felt", "Chalkboard SE", "Comic Sans MS", ui-rounded, sans-serif',
    status: function () {
      try {
        var s = JSON.parse(localStorage.getItem('tanteo-munchkin-v1'));
        if (!s || s.screen !== 'game' || !s.players || !s.players.length) return null;
        var top = s.players.slice().sort(function (a, b) { return b.level - a.level; })[0];
        if (s.won) return 'Ganó ' + top.name;
        return top.level > 1 ? 'En curso · ' + top.name + ' va en nivel ' + top.level : 'Partida en curso';
      } catch (e) { return null; }
    }
  },
  {
    id: 'esquirlas',
    name: 'Esquirlas de la Creación',
    path: 'games/esquirlas/',
    emoji: '💎',
    blurb: 'Calcula la puntuación final de tus Esquirlas',
    players: '2–4 jugadores',
    colors: { bg: '#120c26', bg2: '#3a2a6b', title: '#e9c46a', text: '#f5efe0', soft: '#b3a8d6' },
    titleFont: '"Didot", "Bodoni 72", "Iowan Old Style", Palatino, Georgia, serif',
    status: function () {
      try {
        var s = JSON.parse(localStorage.getItem('tanteo-esquirlas-v1'));
        if (!s || s.screen === 'setup') return null;
        return s.screen === 'result' ? 'Puntuación calculada' : 'Recuento a medias';
      } catch (e) { return null; }
    }
  }
];
