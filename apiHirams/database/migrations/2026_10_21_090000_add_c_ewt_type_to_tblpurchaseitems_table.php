<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The EWT TYPE of a purchase option — the formula the line's EWT is built
 * from. It replaces the hand-typed dEWT amount as the source of truth:
 *
 *   NULL  → DEFAULT — the supplier's own flags decide (bEWT gate, goods
 *           1% / service 2%, VAT gross-down when the supplier is vattable)
 *   'A'   → 0% of Q                                (bypass: no EWT)
 *   'B'   → 1% of Q                                (bypass: gross)
 *   'C'   → 1% of Q / 1.12 (VAT net)               (bypass: net of VAT)
 *
 * Q = nQuantity x dUnitPrice.
 *
 * The dEWT column stays for now as the denormalised copy of the computed
 * value (raw readers still sum it) — it goes away once every read path
 * derives the EWT from cEWTType.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tblpurchaseitems', function (Blueprint $table) {
            if (!Schema::hasColumn('tblpurchaseitems', 'cEWTType')) {
                $table->char('cEWTType', 1)->nullable()->default(null)->after('dEWT');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tblpurchaseitems', function (Blueprint $table) {
            if (Schema::hasColumn('tblpurchaseitems', 'cEWTType')) {
                $table->dropColumn('cEWTType');
            }
        });
    }
};
