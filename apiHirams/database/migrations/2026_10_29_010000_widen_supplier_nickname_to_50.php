<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Nickname cap moved from 20/25 to 50 — the form and the API validation
 * now allow up to 50 characters, so the column has to hold that too.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tblsuppliers', function (Blueprint $table) {
            $table->string('strSupplierNickName', 50)->change();
        });
    }

    public function down(): void
    {
        Schema::table('tblsuppliers', function (Blueprint $table) {
            $table->string('strSupplierNickName', 25)->change();
        });
    }
};
