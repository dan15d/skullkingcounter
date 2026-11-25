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
  }
];
