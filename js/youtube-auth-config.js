/*
 * Kelonio — Configuración del muro de acceso por suscripción YouTube
 *
 * El Client ID OAuth es público en una aplicación web.
 * NO pongas aquí un Client Secret.
 *
 * En Google Cloud, este cliente OAuth debe tener como origen JavaScript:
 *   https://kelonio-hub.github.io
 *
 * Activa YouTube Data API v3 en el mismo proyecto de Google Cloud.
 *
 * Este sistema comprueba suscripciones; NO suscribe automáticamente al usuario.
 */
window.KELONIO_YOUTUBE_CONFIG = Object.freeze({
  clientId: '316282527970-k8roorg133u98gcra57n8qe72bkkkbkk.apps.googleusercontent.com',
  channelId: 'UCJbYmHLNcrPUUA9oyBGtsKw',
  channelUrl: 'https://www.youtube.com/channel/UCJbYmHLNcrPUUA9oyBGtsKw',
  subscribeUrl: 'https://www.youtube.com/channel/UCJbYmHLNcrPUUA9oyBGtsKw?sub_confirmation=1',
  scope: 'https://www.googleapis.com/auth/youtube.readonly',
  allowedOrigins: [
    'https://kelonio-hub.github.io'
  ],
  requestTimeoutMs: 20000
});
