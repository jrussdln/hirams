<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Transactions;

class Client extends Model
{
    use HasFactory;

    // Specify the table name
    protected $table = 'tblclients';

    // Optional: specify the primary key if not 'id'
    protected $primaryKey = 'nClientId';

    protected $fillable = [
        'strClientName',
        'strClientNickName', 
        'strTIN',
        'strAddress',
        'strBusinessStyle',
        'strContactPerson',
        'strContactNumber',
        'cStatus'
    ];

     // ❌ Disable timestamps
    public $timestamps = false;

    // The transactions this client is the buyer on. A client that still
    // carries transactions cannot simply be deleted — it has to be
    // TRANSFERRED to another client first.
    public function transactions()
    {
        return $this->hasMany(Transactions::class, 'nClientId', 'nClientId');
    }
}
