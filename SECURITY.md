# Seguridad

- Repo privado.
- Sin secretos en el código. Token INEGI solo en env.
- Headers: nosniff, SAMEORIGIN, referrer estricto, geolocation solo self.
- Sin cookies de sesión ni cuentas.
- Entradas de API validadas (lat/lon finitos, radio acotado, query mínima).
- No se inventan reseñas. Datos ausentes quedan vacíos.
