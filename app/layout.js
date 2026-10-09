import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "NocheCerca",
  description: "Bares, antros y música en vivo cerca de ti en México",
  manifest: "/manifest.json",
  applicationName: "NocheCerca",
  appleWebApp: {
    capable: true,
    title: "NocheCerca",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
    apple: "/apple-icon",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0714",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon" />
      </head>
      <body>{children}</body>
    </html>
  );
}
