import ContenidoPrivacidad from "./contenido";

export const metadata = {
  title: "Privacidad — NocheCerca",
  description: "Política de privacidad de NocheCerca / centros de entretenimiento",
};

export default function Privacidad() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", color: "#f6f1ff" }}>
      <h1>Política de privacidad</h1>
      <ContenidoPrivacidad />
      <p>
        <a href="/" style={{ color: "#c8ff4d" }}>
          Volver
        </a>
      </p>
    </main>
  );
}
