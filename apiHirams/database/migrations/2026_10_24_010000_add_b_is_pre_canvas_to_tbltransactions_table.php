<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * bIsPreCanvas marks a transaction as a PRE-CANVASS job — items are
     * gathered through canvassing BEFORE the procurement itself. The Add
     * modal asks "Pre-Canvass or Normal Transaction" up front and flips
     * this flag accordingly (editors can switch it later).
     */
    public function up(): void
    {
        Schema::table('tbltransactions', function (Blueprint $table) {
            $table->tinyInteger('bIsPreCanvas')->nullable()->after('strOfficeNickName');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbltransactions', function (Blueprint $table) {
            $table->dropColumn('bIsPreCanvas');
        });
    }
};
