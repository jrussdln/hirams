<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Services\Masters\MappingService;

class MappingController extends ApiController
{
    public function __construct(private readonly MappingService $service)
    {
    }

    /**
     * Return one or all mappings defined in config/mappings.php
     */
    public function getMappings($type = null)
    {
        return response()->json($this->service->resolve($type));
    }
}
