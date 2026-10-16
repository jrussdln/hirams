<?php

namespace App\Services\Masters;

/**
 * Read-only access to the mappings defined in config/mappings.php.
 */
class MappingService
{
    /**
     * One mapping group when $type matches a key, otherwise all mappings.
     *
     * @param  string|null  $type
     * @return mixed
     */
    public function resolve($type = null)
    {
        $mappings = config('mappings');

        if ($type && isset($mappings[$type])) {
            return $mappings[$type];
        }

        return $mappings;
    }
}
