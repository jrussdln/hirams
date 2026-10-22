<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderOption extends Model
{
    use HasFactory;

    protected $table = 'tblpurchaseorder_items';
    protected $primaryKey = 'nPurchaseOrder_ItemId';

    protected $fillable = [
        'nPurchaseOrderId',
        'nPurchaseItemId',
        'dtAddedToCart',
    ];

    protected $casts = [
        'dtAddedToCart' => 'datetime',
    ];

    public $timestamps = false;
    public function purchaseOption()
    {
        return $this->belongsTo(PurchaseOptions::class, 'nPurchaseItemId', 'nPurchaseItemId');
    }

    // NOTE: there is no `latestHistory()` relation here on purpose. The
    // PurchaseItemHistory model was removed — the history is read from the
    // `tblpurchaseitemhistories` table by
    // PurchaseOptionsService::latestHistories() (PurchaseOrderOptionsController).
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'nPurchaseOrderId', 'nPurchaseOrderId');
    }
    
}
