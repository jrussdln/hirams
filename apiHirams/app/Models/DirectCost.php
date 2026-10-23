<?php

namespace App\Models;

use App\Models\DirectCostOptions;
use Illuminate\Database\Eloquent\Model;

class DirectCost extends Model
{
    protected $table = 'tbldirectcosts';
    protected $primaryKey = 'nDirectCostID';
    public $timestamps = false;

    protected $fillable = [
        'nTransactionID',
        'nDirectCostOptionID',
        'dAmount'
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function option()
    {
        return $this->belongsTo(
            DirectCostOptions::class,
            'nDirectCostOptionID',
            'nDirectCostOptionID'
        );
    }

    // The transaction this cost line is charged to.
    public function transaction()
    {
        return $this->belongsTo(
            Transactions::class,
            'nTransactionID',
            'nTransactionId'
        );
    }
}
