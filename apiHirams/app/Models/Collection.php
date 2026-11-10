<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The Collection pivot — tblcollections links a transaction to the
 * Collection (C) JEV raised against it.
 *
 * The journal id lives HERE, not on tbltransactions: the transaction
 * table's nJEVId column is retired, and every lookup of "which journal
 * backs this transaction" goes through this table instead.
 */
class Collection extends Model
{
    protected $table = 'tblcollections';
    protected $primaryKey = 'nCollectionId';
    public $timestamps = false;

    protected $fillable = [
        'nTransactionId',
        'nJEVId',
    ];

    /** The transaction the journal was raised against. */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transactions::class, 'nTransactionId', 'nTransactionId');
    }

    /** The Collection (C) journal itself. */
    public function jev(): BelongsTo
    {
        return $this->belongsTo(Jev::class, 'nJEVId', 'nJEVId');
    }
}
