<?php

namespace App\Services\Masters;

use App\Events\AssigneeUpdated;
use App\Models\Assignee;
use App\Services\CrudService;

/**
 * Assignee CRUD + the case-sensitive name lookup behind checkExist().
 */
class AssigneeService extends CrudService
{
    protected string $entityName   = 'Assignee';
    protected string $primaryKey   = 'nAssigneeId';
    protected array  $searchable   = ['strAssigneeName', 'strAssigneeNickName'];
    protected array  $defaultSort  = ['strAssigneeName', 'asc'];

    protected function modelClass(): string
    {
        return Assignee::class;
    }

    protected function eventClass(): ?string
    {
        return AssigneeUpdated::class;
    }

    /**
     * Case-sensitive (binary) name match used by the uniqueness check.
     */
    public function existsByName(string $name): bool
    {
        return $this->newQuery()
            ->whereRaw('BINARY strAssigneeName = ?', [$name])
            ->exists();
    }
}
