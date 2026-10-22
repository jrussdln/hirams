<?php

namespace App\Models;

use App\Helpers\FormulaHelper;
use App\Models\TransactionItems;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOptions extends Model
{
    use HasFactory;
    // Correct table name
    protected $table = 'tblpurchaseitems';
    // Primary key
    protected $primaryKey = 'nPurchaseItemId';
    // No timestamps in your table
    public $timestamps = false;
    // The EWT TYPE of the line — the formula its EWT is built from:
    //   null → DEFAULT (the supplier's own flags decide)
    //   'A'  → 0% of Q
    //   'B'  → 1% of Q
    //   'C'  → 1% of Q / 1.12 (VAT net)
    // It replaces the hand-typed dEWT amount as the source of truth.
    protected $attributes = [
        'cEWTType' => null,
    ];
    // The EWT is derived, not stored — it is appended to the payload so
    // every API response still carries a dEWT key.
    protected $appends = ['dEWT'];
    // Fillable columns
    protected $fillable = [
        'nTransactionItemId',
        'nSupplierId',
        'nSupplierContactId',
        'nQuantity',
        'strUOM',
        'strBrand',
        'strModel',
        'strSpecs',
        'dUnitPrice',
        'cEWTType',
        'strProductCode',
        'bIncluded',
        'bAddOn',
        'dtCanvass',
        'dPurchaseUnitPrice',
        'bPurchaseIncluded',
        'cPurchaseUnitPriceStatus',

    ];

    /**
     * The EWT of the line — DERIVED, never stored.
     *
     * The column is gone; the amount is worked out from the line's EWT
     * type and, with no type, from the supplier's own flags and the
     * transaction's item type (see FormulaHelper::calculateEWT).
     *
     * The relations it needs (supplier, transactionItem.transaction) should
     * be eager loaded wherever a list of options is built — otherwise each
     * row costs two extra queries.
     *
     * NOTE: this is the legacy accessor style on purpose — Laravel's
     * $appends path calls get{Studly}Attribute(), which is what this is.
     */
    public function getDewtAttribute($value = null)
    {
        return FormulaHelper::calculateEWTForOption($this);
    }

    /**
     * The PURCHASE price status letters, read from config/mappings.php by
     * NAME — the same file the MappingController hands to the frontend —
     * so the API and the UI can never drift apart.
     *
     *   A → Active    the purchase price is APPROVED — it counts
     *   P → Pending   the purchase price is proposed — it does NOT count yet
     *   C → Cancelled the purchase price was thrown out — it does NOT count
     *
     * @return array{active: string, pending: string, cancelled: string}
     */
    public static function purchasePriceStatus(): array
    {
        $map = config('mappings.unit_price_status', []);

        return [
            'active'    => (string) (array_search('Active', $map, true) ?: ''),
            'pending'   => (string) (array_search('Pending', $map, true) ?: ''),
            'cancelled' => (string) (array_search('Cancelled', $map, true) ?: ''),
        ];
    }

    /**
     * The unit price that COUNTS.
     *
     * dUnitPrice is the CANVASSED price — the one the transaction was
     * priced with. A PURCHASE price (dPurchaseUnitPrice) is the price
     * agreed at the purchase stage, and it only counts once it is
     * APPROVED — that is, while its status is 'A' (Active). An empty
     * purchase price — or one still 'P' (Pending) or 'C' (Cancelled) —
     * falls back to the canvassed dUnitPrice.
     *
     * Every READ of dUnitPrice goes through here, so the API, the totals
     * and the EWT all price a line the same way. The raw canvassed price
     * stays available through getRawOriginal('dUnitPrice').
     */
    public function getDUnitPriceAttribute($value = null)
    {
        $purchasePrice = $this->attributes['dPurchaseUnitPrice'] ?? null;
        $status        = $this->attributes['cPurchaseUnitPriceStatus'] ?? null;

        if (
            $status === self::purchasePriceStatus()['active']
            && $purchasePrice !== null
            && $purchasePrice !== ''
        ) {
            return (float) $purchasePrice;
        }

        return $value === null ? null : (float) $value;
    }

    // ✅ A purchase option belongs to a transaction item
    public function transactionItem()
    {
        return $this->belongsTo(TransactionItems::class, 'nTransactionItemId', 'nTransactionItemId');
    }
    // Optional: a purchase option belongs to a supplier (if you have a Supplier model)
    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'nSupplierId', 'nSupplierId');
    }
    public function supplierContact()
    {
        return $this->belongsTo(SupplierContact::class, 'nSupplierContactId', 'nSupplierContactId');
    }
    public function inventories()
    {
        return $this->hasMany(Inventory::class, 'nPurchaseItemId', 'nPurchaseItemId');
    }
    public function purchaseOrderOption()
    {
        return $this->hasOne(PurchaseOrderOption::class, 'nPurchaseItemId', 'nPurchaseItemId');
    }
    // NOTE: there is no `histories()` relation here on purpose. The
    // PurchaseItemHistory model was removed — the purchase item history is
    // read straight from the `tblpurchaseitemhistories` table by
    // PurchaseOptionsService::latestHistories() / ::allOptionHistory()
    // (the endpoint lives in PurchaseOrderOptionsController).
}
