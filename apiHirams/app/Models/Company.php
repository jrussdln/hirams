<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Transactions;
use App\Models\Voucher;

class Company extends Model
{
    use HasFactory;

    // Specify the table name
    protected $table = 'tblcompanies';

    // Optional: specify the primary key if not 'id'
    protected $primaryKey = 'nCompanyId';

    protected $fillable = [

        'strCompanyName',
        'strCompanyNickName',
        'strTIN',
        'strAddress',
        'bVAT',
        'bEWT',
        'strEmail',
        'strLogo',  // ← ADD
        'strPhoneNo'
    ];

    // ❌ Disable timestamps
    public $timestamps = false;

    // The transactions raised under this company.
    public function transactions()
    {
        return $this->hasMany(Transactions::class, 'nCompanyId', 'nCompanyId');
    }

    // The vouchers issued under this company.
    public function vouchers()
    {
        return $this->hasMany(Voucher::class, 'nCompanyId', 'nCompanyId');
    }
}
