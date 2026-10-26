<?php

namespace App\Http\Controllers\Api;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Serves the static media files that live in `public/` (company logos,
 * profile pictures) through real API routes.
 *
 * They used to be requested directly (e.g. http://host/logo/x.png), but
 * files that exist are served by the web server BEFORE Laravel runs, so
 * they never get CORS headers — which broke the frontend's html-to-image
 * PDF export (it must fetch the image bytes to inline them into the
 * canvas). Requests under `api/*` pass through the CORS middleware
 * (see config/cors.php), so serving them here fixes that in dev and
 * production alike.
 */
class MediaController extends ApiController
{
    /**
     * GET /api/media/logo/{filename}
     */
    public function logo(string $filename): \Illuminate\Http\Response
    {
        return $this->serveFile('logo', $filename);
    }

    /**
     * GET /api/media/profile/{filename}
     */
    public function profile(string $filename): \Illuminate\Http\Response
    {
        return $this->serveFile('profile', $filename);
    }

    /**
     * Returns `public/{directory}/{filename}` as an in-memory response
     * with a 404 when the file doesn't exist. The filename is reduced to
     * its base name so no traversal (`../`) can escape the directory.
     *
     * NOTE: deliberately NOT response()->file() (BinaryFileResponse) —
     * under PHP's built-in dev server (php artisan serve) it emits stray
     * bytes after `Connection: close`, which strict HTTP clients (Node's
     * proxy, Firefox fetch) reject with "Parse Error: Data after
     * `Connection: close`" / NS_ERROR_DOM_NETWORK_ERR. In-memory
     * responses (like every JSON endpoint) come through cleanly.
     */
    private function serveFile(string $directory, string $filename): \Illuminate\Http\Response
    {
        $filename = basename($filename);
        $path     = public_path($directory . '/' . $filename);

        if (!is_file($path)) {
            throw new NotFoundHttpException("Media file not found: {$directory}/{$filename}");
        }

        $content = file_get_contents($path);
        $mime    = mime_content_type($path) ?: 'application/octet-stream';

        return response($content, 200, [
            'Content-Type'  => $mime,
            'Content-Length' => (string) strlen($content),
        ]);
    }
}
