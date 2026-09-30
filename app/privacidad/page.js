export const metadata = {
  title: "Privacidad — NocheCerca",
  description: "Política de privacidad de NocheCerca / centros de entretenimiento",
};

export default function Privacidad() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", color: "#f6f1ff" }}>
      <h1>Política de privacidad</h1>
      <p>Última actualización: 29 de septiembre de 2026. Borrador informativo, no es asesoría legal.</p>
      <h2>Qué hace la app</h2>
      <p>
        NocheCerca muestra bares, antros y música en vivo cerca de ti usando mapas y directorios
        públicos. No crea cuentas ni pide registro.
      </p>
      <h2>Datos que se quedan en tu dispositivo</h2>
      <ul>
        <li>Favoritos, historial y preferencias en localStorage.</li>
        <li>Caché de la última búsqueda (ubicación aproximada + lista de lugares).</li>
        <li>La ubicación GPS solo se usa si tú la autorizas en el navegador.</li>
      </ul>
      <h2>Datos que salen del dispositivo</h2>
      <p>
        Las búsquedas van a APIs públicas (OpenStreetMap/Overpass, Nominatim, Photon, OSRM,
        Open-Meteo, RainViewer, Wikipedia/Wikidata, sunrise-sunset, Nager.Date) y, si configuraste
        el token, a INEGI DENUE. No enviamos tu lista de favoritos a un servidor propio.
      </p>
      <h2>Cookies y cuentas</h2>
      <p>No usamos cookies de seguimiento ni cuentas de usuario.</p>
      <h2>Menores</h2>
      <p>La app no está dirigida a menores de 18 años.</p>
      <h2>Tus controles</h2>
      <p>Puedes borrar datos del sitio en el navegador o desinstalar la PWA. Sin cuenta no hay baja que tramitar.</p>
      <p>
        <a href="/" style={{ color: "#c8ff4d" }}>
          Volver
        </a>
      </p>
    </main>
  );
}
