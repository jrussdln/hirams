<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Jev extends Model
{
    protected $table = 'tbljevs';
    protected $primaryKey = 'nJEVId';
    public $timestamps = false;

    protected $fillable = [
        'strJEVNumber',
        'strTitle',
        'cJEVLinkType',
        'dtOccur',
        'cStatus',
        // The user who created the journal (tblusers.strNickName names the
        // "BY: …" line over the date in the Created column).
        'nUserId',
    ];

    // ── Relationships ──────────────────────────────────────
    /** The user who created this journal (Created column). */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nUserId', 'nUserId');
    }
    public function entries(): HasMany
    {
        return $this->hasMany(JevEntries::class, 'nJEVId', 'nJEVId');
    }
    public function vouchers()
    {
        return $this->hasMany(Voucher::class, 'nJEVId', 'nJEVId');
    }
    /**
     * The inventory batches booked on this JEV. Received / Delivered JEVs
     * are built from these (InventoryMovementService stamps nJEVId onto the
     * batches) rather than from a voucher, so this — not vouchers — is what
     * leads back to the purchase option, and through it the supplier and
     * the client the list names the row after.
     */
    public function inventories(): HasMany
    {
        return $this->hasMany(Inventory::class, 'nJEVId', 'nJEVId');
    }
    /**
     * The transactions this journal belongs to. A Collection (C) JEV is
     * raised against a transaction — the binding lives on tblcollections,
     * which pairs the two ids the same way tblvouchers does for vouchers.
     */
    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class, 'nJEVId', 'nJEVId');
    }
    public function transactions()
    {
        // Jev → Collection (nJEVId) → Transactions (nTransactionId).
        // Named `transactions` (not `collections`) because the readers —
        // JevService above all — want the TRANSACTION the journal was
        // raised against, e.g. for the client's name and the completed
        // status guard.
        return $this->hasManyThrough(
            Transactions::class,
            Collection::class,
            'nJEVId',      // Foreign key on tblcollections
            'nTransactionId', // Foreign key on tbltransactions
            'nJEVId',      // Local key on tbljevs
            'nTransactionId', // Local key on tblcollections
        );
    }
    public static function generateNumber(): string
    {
        // call inside DB::transaction so the lock works
        $year   = now()->format('Y');
        $prefix = "JV{$year}-";                 // e.g. JV2026-

        $last = static::where('strJEVNumber', 'like', $prefix . '%')
            ->orderByRaw('CAST(SUBSTRING(strJEVNumber, ?) AS UNSIGNED) DESC', [strlen($prefix) + 1])
            ->lockForUpdate()
            ->value('strJEVNumber');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);   // JV2026-0001
    }
}
