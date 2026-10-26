// Load all environment variables in one place
const isProduction = import.meta.env.PROD;

export const ENV = {
  API_BASE_URL: isProduction
    ? "https://lgu.net.ph/apiHirams/public/api/"
    : "http://127.0.0.1:8000/api/",

  API_MAPPINGS_BASE_URL: isProduction
    ? "https://lgu.net.ph/apiHirams/public/api/mappings"
    : "http://127.0.0.1:8000/api/mappings",

  // Images are served through the API (api/media/logo|profile/...) so
  // they always carry the api/* CORS headers — html-to-image's PDF
  // export must fetch them to inline them into the canvas, and direct
  // requests to /logo|profile/... are answered by the web server before
  // Laravel runs and come back without those headers.
  // In dev the URL is relative, so the browser never leaves the Vite
  // origin — the dev proxy forwards /api/media to the local backend,
  // which sidesteps every cross-origin fetch failure.
  API_IMAGES: isProduction
    ? "https://lgu.net.ph/apiHirams/public/api/media/"
    : "/api/media/",
  PUSHER_APP_KEY: import.meta.env.VITE_PUSHER_APP_KEY,
  PUSHER_APP_CLUSTER: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
};
