<?php

return [
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        // Static image files (logos, profile pictures) are fetched by the
        // frontend's html-to-image PDF export to inline them into the
        // canvas — those fetches need CORS headers too.
        'logo/*',
        'profile/*',
        'images/*',
    ],
    'allowed_methods' => ['*'],
    // 'allowed_origins' => [
    //     'http://localhost:5173',
    //     'http://127.0.0.1:5173',
    // ],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
