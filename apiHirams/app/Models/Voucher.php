<?php
// app/Models/Voucher.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    protected $table = 'tblvouchers';
    protected $primaryKey = 'nVoucherId';
    public $timestamps = false;
    protected $fillable = [
        'nCompanyId',
        'nJEVId',
        'cType',
        'cPaymentTerms',
        'nTypeId',
        'strNumber',
        'cStatus',
        'dtCreated',
        // The user who created the disbursement (Created column's "BY: …").
        'nUserId',
    ];

    /** The user who created this voucher (Created column). */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nUserId', 'nUserId');
    }

    // nTypeId = nSupplierId when cType = 'S'
    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'nTypeId', 'nSupplierId');
    }
    // Voucher.php — remove the nested with() from the relationship definition
    public function voucher_assignees()
    {
        return $this->hasMany(VoucherAssignee::class, 'nVoucherId', 'nVoucherId');
        // no ->with('assignee') here — let the controller handle it
    }
    public function voucher_suppliers()
    {
        return $this->hasMany(VoucherSupplier::class, 'nVoucherId', 'nVoucherId');
    }
    public function company()
    {
        return $this->belongsTo(Company::class, 'nCompanyId', 'nCompanyId');
    }
    public function jev()
    {
        return $this->belongsTo(Jev::class, 'nJEVId', 'nJEVId');
    }
}
