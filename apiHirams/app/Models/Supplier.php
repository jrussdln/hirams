<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\SupplierBank;
use App\Models\SupplierContact;
use App\Models\PurchaseOptions;
class Supplier extends Model
{
    use HasFactory;
    // Specify the table name
    protected $table = 'tblsuppliers';
    // Optional: specify the primary key if not 'id'
    protected $primaryKey = 'nSupplierId';
    protected $fillable = [
        'strSupplierName',
        'strSupplierNickName', 
        'strAddress',
        'strTIN',
        'bVAT',
        'bEWT',
        'cStatus',
    ];
     // ❌ Disable timestamps
    public $timestamps = false;
     // One supplier can have many bank accounts
    public function banks()
    {
        return $this->hasMany(SupplierBank::class, 'nSupplierId', 'nSupplierId');
    }
    // One supplier can have many contacts
    public function contacts()
    {
        return $this->hasMany(SupplierContact::class, 'nSupplierId', 'nSupplierId');
    }
    // The purchase options (canvass results) that name this supplier.
    // A supplier that still carries options cannot simply be deleted —
    // it has to be TRANSFERRED to another supplier first.
    public function purchaseOptions()
    {
        return $this->hasMany(PurchaseOptions::class, 'nSupplierId', 'nSupplierId');
    }
}
