<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $table = 'tblpurchaseorders';
    protected $primaryKey = 'nPurchaseOrderId';

    protected $fillable = [
        'strPurchaseOrderNo',
        'strShippingDetails',
        'cPaymentTerms',
        'dFreight',
        'nStatus',
        'dtProceedToPayment',//This should be removed
        'dtPurchaseOrderCreated',
        'dtCancelled'
    ];

    protected $casts = [
      
        'dtPurchaseOrderCreated' => 'datetime',
        'dtCancelled' => 'datetime',
        'dFreight' => 'float',
    ];

    public $timestamps = false;
    public function purchaseOrderOptions()
    {
        return $this->hasMany(PurchaseOrderOption::class, 'nPurchaseOrderId', 'nPurchaseOrderId');
    }

}
