"use client";

export default function ContenidoPrivacidad({ headingLevel = 2 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <>
      <p className="privacy-updated">Última actualización: 29 de septiembre de 2026. Borrador informativo, no es asesoría legal.</p>

      <Heading>Qué hace la app</Heading>
      <p>
        NocheCerca muestra bares, antros y música en vivo cerca de ti usando mapas y directorios
        públicos. No crea cuentas ni pide registro.
      </p>

      <Heading>Datos que se quedan en tu dispositivo</Heading>
      <ul>
        <li>Favoritos, historial y preferencias en localStorage.</li>
        <li>Caché de la última búsqueda (ubicación aproximada + lista de lugares).</li>
        <li>La ubicación GPS solo se usa si tú la autorizas en el navegador.</li>
      </ul>

      <Heading>Datos que salen del dispositivo</Heading>
      <p>
        Las búsquedas van a APIs públicas (OpenStreetMap/Overpass, Nominatim, Photon, OSRM,
        Open-Meteo, RainViewer, Wikipedia/Wikidata, sunrise-sunset, Nager.Date) y, si configuraste
        el token, a INEGI DENUE. No enviamos tu lista de favoritos a un servidor propio.
      </p>

      <Heading>Cookies y cuentas</Heading>
      <p>No usamos cookies de seguimiento ni cuentas de usuario.</p>

      <Heading>Menores</Heading>
      <p>La app no está dirigida a menores de 18 años.</p>

      <Heading>Tus controles</Heading>
      <p>Puedes borrar datos del sitio en el navegador o desinstalar la PWA. Sin cuenta no hay baja que tramitar.</p>
    </>
  );
}
