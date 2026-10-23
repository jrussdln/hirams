<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Voucher;
use App\Models\VoucherAssignee;

class Assignee extends Model
{
    protected $table = 'tblassignees';
    protected $primaryKey = 'nAssigneeId';
    public $timestamps = false;

    protected $fillable = [
        'strAssigneeName',
        'strAssigneeNickName',
        'strAddress',
        'strTIN',
        'cStatus',
    ];

    public function voucherAssignees()
    {
        return $this->hasMany(VoucherAssignee::class, 'nAssigneeId', 'nAssigneeId');
    }

    // The vouchers this assignee is paid on. A voucher can hold SEVERAL
    // lines for the same assignee, so this relation is many-to-many over
    // the voucher-assignee lines.
    public function vouchers()
    {
        return $this->belongsToMany(
            Voucher::class,
            'tblvoucher_assignees',
            'nAssigneeId',
            'nVoucherId'
        );
    }
}
