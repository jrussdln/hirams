<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * WHEN a purchase order was called off.
 *
 * The order itself only ever carried its creation date, so a cancelled card
 * could say THAT it was cancelled but never WHEN. This column stamps the
 * moment the order went down — it is written when the order is moved to the
 * Cancelled status and left alone afterwards (an order that is cancelled
 * stays cancelled, so the first stamp is the one that counts).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tblpurchaseorders', function (Blueprint $table) {
            if (!Schema::hasColumn('tblpurchaseorders', 'dtCancelled')) {
                $table->dateTime('dtCancelled')->nullable()->default(null)
                    ->after('dtPurchaseOrderCreated');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tblpurchaseorders', function (Blueprint $table) {
            if (Schema::hasColumn('tblpurchaseorders', 'dtCancelled')) {
                $table->dropColumn('dtCancelled');
            }
        });
    }
};
