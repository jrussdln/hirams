<?php

namespace App\Helpers;

use App\Models\ItemPricings;
use App\Models\PurchaseOptions;
use App\Models\Supplier;
use App\Models\TransactionItems;

class FormulaHelper
{
    /**
     * Compute suggestive price: item unit ABC / sum of included (non-add-on) qty
     */
    public static function calculateSuggestivePrice(int $transactionItemId): float
    {
        $item = \App\Models\TransactionItems::find($transactionItemId);

        if (!$item) return 0;

        $sumIncludedQty = PurchaseOptions::where('nTransactionItemId', $transactionItemId)
            ->where('bIncluded', 1)
            ->where('bAddOn', 0)
            ->sum('nQuantity');

        if (!$sumIncludedQty) return 0;
        return round($item->dUnitABC / $sumIncludedQty, 4);
    }
    /**
     * Compute Item Tax: (total selling price - total purchase price) / 1.12 * (0.12 + 0.3)
     * total selling price = dUnitSellingPrice * nQuantity (from tblTransactionItems)
     * total purchase price = sum of (dUnitPrice * nQuantity) for bIncluded = 1 purchase options
     */
    // public static function calculateTax(int $transactionItemId, int $pricingSetId): float
    // {
    //     $transactionItem = TransactionItems::find($transactionItemId);
    //     if (!$transactionItem) return 0;

    //     $itemPricing = ItemPricings::where('nTransactionItemId', $transactionItemId)
    //         ->where('nPricingSetId', $pricingSetId)
    //         ->first();

    //     if (!$itemPricing || !$itemPricing->dUnitSellingPrice) return 0;

    //     $totalSellingPrice = $itemPricing->dUnitSellingPrice * $transactionItem->nQuantity;

    //     $purchaseOptions = PurchaseOptions::where('nTransactionItemId', $transactionItemId)
    //         ->where('bIncluded', 1)
    //         ->get();

    //     $totalPurchasePrice = $purchaseOptions->sum(fn($option) => $option->dUnitPrice * $option->nQuantity);

    //     return round(($totalSellingPrice - $totalPurchasePrice) / 1.12 * (0.12 + 0.3), 2);
    // }
    // public static function calculateTax(int $transactionItemId, int $pricingSetId, ?float $overrideUnitSellingPrice = null): float
    // {
    //     $transactionItem = TransactionItems::find($transactionItemId);
    //     if (!$transactionItem) return 0;

    //     // Use the override price if provided (e.g. live/unsaved price from frontend)
    //     // Otherwise fall back to the saved price in the database
    //     if ($overrideUnitSellingPrice !== null) {
    //         $unitSellingPrice = $overrideUnitSellingPrice;
    //     } else {
    //         $itemPricing = ItemPricings::where('nTransactionItemId', $transactionItemId)
    //             ->where('nPricingSetId', $pricingSetId)
    //             ->first();

    //         if (!$itemPricing || !$itemPricing->dUnitSellingPrice) return 0;

    //         $unitSellingPrice = (float) $itemPricing->dUnitSellingPrice;
    //     }

    //     $totalSellingPrice = $unitSellingPrice * $transactionItem->nQuantity;

    //     $purchaseOptions = PurchaseOptions::where('nTransactionItemId', $transactionItemId)
    //         ->where('bIncluded', 1)
    //         ->get();

    //     $totalPurchasePrice = $purchaseOptions->sum(fn($option) => $option->dUnitPrice * $option->nQuantity);

    //     return round(($totalSellingPrice - $totalPurchasePrice) / 1.12 * (0.12), 2);
    // }
    public static function calculateTax(int $transactionItemId, int $pricingSetId, ?float $overrideUnitSellingPrice = null): float
{
    $transactionItem = TransactionItems::find($transactionItemId);
    if (!$transactionItem) return 0;

    if ($overrideUnitSellingPrice !== null) {
        $unitSellingPrice = $overrideUnitSellingPrice;
    } else {
        $itemPricing = ItemPricings::where('nTransactionItemId', $transactionItemId)
            ->where('nPricingSetId', $pricingSetId)
            ->first();

        if (!$itemPricing || !$itemPricing->dUnitSellingPrice) return 0;

        $unitSellingPrice = (float) $itemPricing->dUnitSellingPrice;
    }

    $totalSellingPrice = $unitSellingPrice * $transactionItem->nQuantity;

    $purchaseOptions = PurchaseOptions::where('nTransactionItemId', $transactionItemId)
        ->where('bIncluded', 1)
        ->get();

    $totalPurchasePrice = $purchaseOptions->sum(fn($option) => $option->dUnitPrice * $option->nQuantity);

    // FIX: was `* (0.12)` — must be `* (0.12 + 0.3)` per the sheet formula
    return round(($totalSellingPrice - $totalPurchasePrice) / 1.12 * (0.12 + 0.3), 2);
}
    /**
     * Compute total selling price: sum of dUnitSellingPrice from tblitemPricings for a given pricing set
     */
    public static function calculateTotalSellingPrice(int $pricingSetId): float
    {
        return (float) ItemPricings::where('nPricingSetId', $pricingSetId)
            ->join('tbltransactionitems', 'tbltransactionitems.nTransactionItemId', '=', 'tblitempricings.nTransactionItemId')
            ->selectRaw('SUM(tblitempricings.dUnitSellingPrice * tbltransactionitems.nQuantity) as total')
            ->value('total') ?? 0.0;
    }
    /**
     * EWT (Expanded Withholding Tax) — the DEFAULT matrix.
     *
     *   #  Supplier           Item      Formula             Result
     *   1  EWT, NON-VAT       Goods     TC x 1%             TC x 0.01
     *   2  EWT, NON-VAT       Service   TC x 2%             TC x 0.02
     *   3  NON-EWT, VAT       Goods     -                   0.00
     *   4  NON-EWT, VAT       Service   -                   0.00
     *   5  EWT, VAT           Goods     (TC / 1.12) x 1%    TC x 0.008928...
     *   6  EWT, VAT           Service   (TC / 1.12) x 2%    TC x 0.017857...
     *   7  NON-EWT, NON-VAT   Goods     -                   0.00
     *   8  NON-EWT, NON-VAT   Service   -                   0.00
     *
     * TC = Total Cost (quantity x unitPrice).
     *
     * The three ingredients, in the order they are applied:
     *   1. bEWT  - the supplier's EWT flag. Not an EWT supplier → nothing
     *               to withhold, so the whole line is 0 (cases 3, 4, 7, 8).
     *   2. cItemType - 'G' goods → 1%, 'S' service → 2%. This is the
     *               TRANSACTION's item type (tbltransactions.cItemType),
     *               so every line of a PO carries the same rate.
     *   3. bVAT  - the supplier's VAT flag. A VAT-registered supplier bills
     *               VAT on top, and VAT is not the payee's income, so the
     *               base is the VAT-exclusive amount (TC / 1.12). A non-VAT
     *               supplier has no VAT to strip, so the base is TC itself.
     *
     * NOTE: the 1.12 gross-down assumes the price is VAT-INCLUSIVE. If the
     * price in the system is the VAT-exclusive amount (VAT added later by
     * the supplier's invoice), the base must be TC with no division - that
     * is a business decision, so it is kept in one place here.
     */
    public const EWT_RATE_GOODS   = 0.01;
    public const EWT_RATE_SERVICE = 0.02;
    public const EWT_VAT_FACTOR   = 1.12;

    /**
     * The EWT TYPES (the per-line override of the default matrix).
     *
     *   null → DEFAULT — the matrix above decides
     *   'A'  → 0% of TC
     *   'B'  → 1% of TC
     *   'C'  → 2% of TC
     *   'D'  → 1% of TC / 1.12 (VAT net)
     *   'E'  → 2% of TC / 1.12 (VAT net)
     *
     * A type OVERRIDES the supplier's bEWT / bVAT flags entirely: 'A' is
     * no EWT even for an EWT supplier, and 'B' / 'C' / 'D' / 'E' are the
     * bypass rates even for a non-EWT or non-vattable one.
     */
    public const EWT_TYPE_DEFAULT    = null;
    public const EWT_TYPE_BYPASS_0   = 'A';
    public const EWT_TYPE_BYPASS_1   = 'B';
    public const EWT_TYPE_BYPASS_2   = 'C';
    public const EWT_TYPE_BYPASS_VAT = 'D';
    public const EWT_TYPE_BYPASS_VAT_2 = 'E';

    /**
     * The EWT types the API accepts on the wire.
     *
     * @return array<int, string>
     */
    public static function ewtTypes(): array
    {
        return [
            self::EWT_TYPE_BYPASS_0,
            self::EWT_TYPE_BYPASS_1,
            self::EWT_TYPE_BYPASS_2,
            self::EWT_TYPE_BYPASS_VAT,
            self::EWT_TYPE_BYPASS_VAT_2,
        ];
    }

    public static function calculateEWT(
        float $quantity,
        float $unitPrice,
        ?Supplier $supplier,
        string $cItemType,
        ?string $cEWTType = self::EWT_TYPE_DEFAULT
    ): float {
        $totalCost = $quantity * $unitPrice;

        // ── The EWT TYPE wins over everything else ──────────────────────
        // A bypass is the line's own instruction: it does not look at the
        // supplier's flags at all.
        switch ($cEWTType) {
            case self::EWT_TYPE_BYPASS_0:
                return 0.0;
            case self::EWT_TYPE_BYPASS_1:
                return round($totalCost * self::EWT_RATE_GOODS, 2);
            case self::EWT_TYPE_BYPASS_VAT:
                return round(
                    ($totalCost / self::EWT_VAT_FACTOR) * self::EWT_RATE_GOODS,
                    2
                );
            case self::EWT_TYPE_BYPASS_VAT_2:
                return round(
                    ($totalCost / self::EWT_VAT_FACTOR) * self::EWT_RATE_SERVICE,
                    2
                );
            case self::EWT_TYPE_BYPASS_2:
                return round($totalCost * self::EWT_RATE_SERVICE, 2);
        }

        // ── DEFAULT — the matrix above ────────────────────────────────
        // 1. Not an EWT supplier → no computation needed (cases 3, 4, 7, 8)
        if (!$supplier || (int) $supplier->bEWT !== 1) return 0;

        // 2. Rate from the item type: G = Goods → 1%, S = Service → 2%
        $rate = $cItemType === 'G' ? self::EWT_RATE_GOODS : self::EWT_RATE_SERVICE;

        // 3. Base: VAT-registered → net of VAT (cases 5, 6); otherwise gross
        $baseAmount = (int) $supplier->bVAT === 1
            ? $totalCost / self::EWT_VAT_FACTOR
            : $totalCost;

        // Final EWT calculation
        $calculatedEWT = $baseAmount * $rate;

        return round($calculatedEWT, 2);
    }

    /**
     * The EWT of a saved purchase option, derived from its EWT TYPE.
     *
     * The line's own type wins; with no type the supplier's flags and the
     * transaction's item type decide. A missing supplier (the line has
     * none yet) or a missing item type falls back to the same defaults
     * the rest of the app uses.
     */
    public static function calculateEWTForOption(
        PurchaseOptions $option,
        ?string $cItemType = null
    ): float {
        $supplier = null;
        if ($option->nSupplierId) {
            $supplier = $option->relationLoaded('supplier')
                ? $option->supplier
                : Supplier::find($option->nSupplierId);
        }

        // The item type lives on the TRANSACTION (tbltransactions.cItemType),
        // so every line of a PO carries the same rate.
        if ($cItemType === null) {
            $cItemType = 'G';
            if ($option->relationLoaded('transactionItem')) {
                $cItemType = $option->transactionItem?->transaction?->cItemType ?? 'G';
            } elseif ($option->nTransactionItemId) {
                $cItemType = TransactionItems::find($option->nTransactionItemId)
                    ?->transaction?->cItemType ?? 'G';
            }
        }

        return self::calculateEWT(
            (float) $option->nQuantity,
            (float) $option->dUnitPrice,
            $supplier,
            $cItemType,
            $option->cEWTType
        );
    }
}
