const fs = require('fs');
const path = require('path'); // <-- AGREGADO: Módulo para manejar rutas
const Parser = require('rss-parser');
const parser = new Parser();

async function updateRadar() {
  // 1. Leemos tu lista de programas apuntando a la carpeta radar
  const rutaRadares = path.join(__dirname, 'radares.json'); // <-- CAMBIO
  const rawData = fs.readFileSync(rutaRadares, 'utf8');
  const programas = JSON.parse(rawData);
  let allUpdates = [];

  console.log(`📡 Buscando actualizaciones para ${programas.length} programas...`);

  // 2. Leemos cada enlace .atom uno por uno
  for (const prog of programas) {
    try {
      // El parser convierte el .atom (XML) en algo fácil de leer
      const feed = await parser.parseURL(prog.url);
      
      // Si el programa tiene actualizaciones, cogemos la primera (la más nueva)
      if (feed.items && feed.items.length > 0) {
        const latest = feed.items[0]; 
        
        allUpdates.push({
          tag: prog.tag,
          title: latest.title,
          link: latest.link,
          // Guardamos la fecha para poder ordenarlas después
          date: latest.isoDate || latest.pubDate 
        });
        console.log(`✅ Éxito con ${prog.tag} -> ${latest.title}`);
      }
    } catch (err) {
      console.error(`❌ Error al leer ${prog.tag} (${prog.url}):`, err.message);
    }
  }

  // 3. Ordenamos TODAS las noticias (la más reciente arriba del todo)
  allUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 4. Guardamos ultimas_noticias.json dentro de la carpeta radar
  const rutaNoticias = path.join(__dirname, 'ultimas_noticias.json'); // <-- CAMBIO
  fs.writeFileSync(rutaNoticias, JSON.stringify(allUpdates, null, 2));
  console.log(`🎉 ¡Archivo ultimas_noticias.json creado con éxito con los ${allUpdates.length} repositorios!`);
}

updateRadar();