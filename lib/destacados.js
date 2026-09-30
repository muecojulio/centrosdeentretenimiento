import { distanciaMetros } from "./enriquecer";

function club(p) {
  return {
    tipo: "table",
    tipoEtiqueta: "Table dance / men's club",
    telefono: null,
    web: null,
    horario: null,
    musica: null,
    live: false,
    coverTexto: "Confirma cover en recepción",
    reservaTexto: "Suele convenir preguntar en puerta",
    precioTexto: null,
    terraza: null,
    tableDance: true,
    after: true,
    fuente: "Directorio / nota pública",
    ...p,
  };
}

export const DESTACADOS = [
  club({ id: "dest-el-closet", nombre: "El Clóset", lat: 19.4112, lon: -99.1731, direccion: "Saltillo 67, Hipódromo Condesa, CDMX", telefono: "+52 55 5211 6871", horario: "Mo-Sa 20:00-03:00", deQueTrata: "Club en Condesa listado como table dance. Confirma horario en el lugar." }),
  club({ id: "dest-queens", nombre: "Queen's México", lat: 19.4063, lon: -99.1664, direccion: "Av. Insurgentes Sur 210, Hipódromo, CDMX", telefono: "+52 55 4885 5690", web: "https://queensmx.com", horario: "Mo-Sa 20:00-04:00", deQueTrata: "Men's club / table dance en Insurgentes Sur, citado por medios locales." }),
  club({ id: "dest-the-club", nombre: "The Club", lat: 19.4274, lon: -99.1668, direccion: "Varsovia 54, Juárez (Zona Rosa), CDMX", horario: "Mo-Fr 18:00-02:00; Sa 21:00-02:00", deQueTrata: "Centro nocturno en Juárez mencionado en guías de CDMX como table dance." }),
  club({ id: "dest-pandora", nombre: "Pandora Tlalpan", lat: 19.2875, lon: -99.165, direccion: "Calzada de Tlalpan, Tlalpan, CDMX", deQueTrata: "Centro nocturno del sur de la ciudad citado en notas de vida nocturna." }),
  club({ id: "dest-toreo", nombre: "Zona Toreo / Periodista", lat: 19.4538, lon: -99.218, direccion: "Alrededor de Av. Rodolfo Gaona, Periodista / Toreo, CDMX-Edomex", deQueTrata: "Zona con centros nocturnos junto a Toreo. Busca el letrero del club; confirma el local exacto en puerta." }),
  club({ id: "dest-la10-aca", nombre: "La 10 Acapulco", lat: 16.8635, lon: -99.8815, direccion: "Los Deportes 3, Deportivo, 39690 Acapulco, Gro.", deQueTrata: "Table dance listado en directorios públicos de Acapulco." }),
  club({ id: "dest-la-cancun", nombre: "L'A Night Club VIP", lat: 21.1478, lon: -86.8512, direccion: "Av. Cancún 112, Cecilio Chi, 77534 Cancún, Q.R.", deQueTrata: "Night club / table dance publicado en directorios de Cancún." }),
  club({ id: "dest-nn-playa", nombre: "NN Men's Club Playa del Carmen", lat: 20.6284, lon: -87.0778, direccion: "Av. Benito Juárez y 50 Av. Norte, Centro, Playa del Carmen", deQueTrata: "Men's club en el centro de Playa del Carmen, con dirección pública." }),
  club({ id: "dest-babys-playa", nombre: "Baby's Hots", lat: 20.6348, lon: -87.0795, direccion: "50 Av. Norte, Ejidal, 77712 Playa del Carmen, Q.R.", deQueTrata: "Club nocturno listado en directorios de Playa del Carmen." }),
  club({ id: "dest-cabaret-zr", nombre: "Zona Rosa — Amberes / Génova", lat: 19.427, lon: -99.165, direccion: "Calles Amberes y Génova, Zona Rosa, CDMX", deQueTrata: "Corredor de antros y centros nocturnos. Varios table dance y clubs LGBTQ están en estas cuadras.", tipoEtiqueta: "Corredor nocturno / table dance" }),
];

export function destacarCerca(origen, radio) {
  const extra = Math.max(radio, 2500) + 12000;
  return DESTACADOS.map((l) => {
    const metros = distanciaMetros(origen.lat, origen.lon, l.lat, l.lon);
    return { ...l, metros, minPie: Math.max(1, Math.round(metros / 80)), minAuto: Math.max(1, Math.round(metros / 400)) };
  }).filter((l) => l.metros <= extra);
}
