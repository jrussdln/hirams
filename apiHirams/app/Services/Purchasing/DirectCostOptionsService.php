<?php

namespace App\Services\Purchasing;

use App\Events\DirectCostUpdated;
use App\Models\DirectCostOptions;
use App\Services\CrudService;

/**
 * Direct cost option CRUD.
 *
 * DirectCostUpdated reproduces the controller's old hand-rolled broadcasts:
 * CrudService emits `new DirectCostUpdated($action, $id)->toOthers()` on
 * create / update, and on delete the route id (an int) — exactly matching
 * the original store(), update() and destroy() calls.
 */
class DirectCostOptionsService extends CrudService
{
    protected string $entityName = 'DirectCostOption';
    protected string $primaryKey = 'nDirectCostOptionID';

    protected function modelClass(): string
    {
        return DirectCostOptions::class;
    }

    protected function eventClass(): ?string
    {
        return DirectCostUpdated::class;
    }
}
