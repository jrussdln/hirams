<?php
// app/Models/JournalAccount.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalAccount extends Model
{
    protected $table = 'tbljournalaccounts';
    protected $primaryKey = 'nJournalAccountId';
    public $timestamps = false;

    protected $fillable = [
        'strAccountName',
        'nParentAccountId',
        'nRecordId',      // C = client id, S = supplier id
        'cAccountType',   // C = client, S = supplier, F = fund, E = ...
        'bAllowNegative', // 1 = the ledger row balance may go negative, 0 = a negative balance displays as its absolute value
    ];

    protected $casts = [
        'bIsFund' => 'boolean',
        'bAllowNegative' => 'boolean',
    ];

    protected $appends = ['display_name'];

public function getDisplayNameAttribute()
{
    return $this->strAccountName ?: '—';
}


    // nRecordId points to tblclients when cAccountType = 'C'
    public function client()
    {
        return $this->belongsTo(Client::class, 'nRecordId', 'nClientId');
    }

    // nRecordId points to tblsuppliers when cAccountType = 'S'
    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'nRecordId', 'nSupplierId');
    }

    public function parent()
    {
        return $this->belongsTo(JournalAccount::class, 'nParentAccountId', 'nJournalAccountId');
    }

    public function children()
    {
        return $this->hasMany(JournalAccount::class, 'nParentAccountId', 'nJournalAccountId');
    }

    /**
     * Both relations read the same nRecordId column, so blank out the one that
     * doesn't match the account type (a client account with nRecordId 5 must
     * not show supplier 5 in the JSON). Also covers nested loads like
     * parent.client, since each parent is a JournalAccount too.
     */
    public function relationsToArray()
    {
        $rel = parent::relationsToArray();

        if (array_key_exists('client', $rel) && $this->cAccountType !== 'C') {
            $rel['client'] = null;
        }
        if (array_key_exists('supplier', $rel) && $this->cAccountType !== 'S') {
            $rel['supplier'] = null;
        }

        return $rel;
    }
}