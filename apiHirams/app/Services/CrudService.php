<?php

namespace App\Services;

use App\Models\SqlErrors;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Generic CRUD inheritance root.
 *
 * Concrete services declare the model, broadcast event and the columns the
 * generic search scans — everything else (create / read / update / delete /
 * status toggle, broadcasting and error logging) is inherited.
 *
 *     class SupplierService extends CrudService
 *     {
 *         protected string $entityName    = 'Supplier';
 *         protected string $primaryKey    = 'nSupplierId';
 *         protected array  $searchable    = ['strSupplierName', 'strAddress'];
 *         protected function modelClass(): string { return Supplier::class; }
 *         protected function eventClass(): string { return SupplierUpdated::class; }
 *     }
 */
abstract class CrudService
{
    /** Fully-qualified Eloquent model class. */
    abstract protected function modelClass(): string;

    /** Fully-qualified broadcast event class, or null to skip broadcasting. */
    protected function eventClass(): ?string
    {
        return null;
    }

    /** Human name used in translatable messages, e.g. 'Supplier'. */
    protected string $entityName = 'Record';

    /** Non-standard primary key exposed in the broadcast payload, e.g. 'nSupplierId'. */
    protected string $primaryKey = 'id';

    /** Columns scanned by the generic search(). */
    protected array $searchable = [];

    /** Column used by updateStatus(). */
    protected string $statusColumn = 'cStatus';

    /** Default sort for listing queries: [column, direction]. */
    protected array $defaultSort = [];

    /* --------------------------------------------------------------------- */
    /* Reading                                                                */
    /* --------------------------------------------------------------------- */

    public function newQuery(): Builder
    {
        return $this->modelClass()::query();
    }

    /**
     * Search + default ordering. Controllers layer extra scopes on top.
     */
    public function search(?string $term = null): Builder
    {
        $query = $this->newQuery();

        $term = trim((string) $term);
        if ($term !== '' && $this->searchable !== []) {
            $query->where(function (Builder $q) use ($term) {
                foreach (array_values($this->searchable) as $index => $column) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $q->{$method}($column, 'LIKE', "%{$term}%");
                }
            });
        }

        if ($this->defaultSort !== []) {
            [$column, $direction] = array_pad($this->defaultSort, 2, 'asc');
            $query->orderBy($column, $direction);
        }

        return $query;
    }

    /**
     * @return Collection<int, Model>
     */
    public function all(?string $term = null): Collection
    {
        return $this->search($term)->get();
    }

    public function find(int $id): Model
    {
        return $this->newQuery()->findOrFail($id);
    }

    /* --------------------------------------------------------------------- */
    /* Writing                                                                */
    /* --------------------------------------------------------------------- */

    public function create(array $data): Model
    {
        $model = $this->modelClass()::create($data);

        $this->broadcast('created', $model);

        return $model;
    }

    public function update(int $id, array $data): Model
    {
        $model = $this->find($id);
        $model->update($data);

        $this->broadcast('updated', $model);

        return $model;
    }

    public function delete(int $id): Model
    {
        $model = $this->find($id);
        $model->delete();

        $this->broadcast('deleted', $id);

        return $model;
    }

    public function updateStatus(int $id, string $status): Model
    {
        $model = $this->find($id);
        $model->update([$this->statusColumn => $status]);
        $model->refresh();

        $this->broadcast('status_changed', $model);

        return $model;
    }

    /* --------------------------------------------------------------------- */
    /* Broadcasting + logging                                                 */
    /* --------------------------------------------------------------------- */

    protected function broadcast(string $action, $reference): void
    {
        $eventClass = $this->eventClass();

        if ($eventClass === null) {
            return;
        }

        $id = $reference instanceof Model
            ? $reference->{$this->primaryKey}
            : $reference;

        broadcast(new $eventClass($action, $id))->toOthers();
    }

    public function logError(Exception $e): void
    {
        SqlErrors::create([
            'dtDate'   => now(),
            'strError' => $e->getMessage(),
        ]);
    }
}
