<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Collection pivot — binds each transaction to the Collection (C) JEV
 * raised against it. Carries the journal id that used to live on
 * tbltransactions.nJEVId (that column is retired).
 *
 * NOTE: if tblcollections was already created directly in the database,
 * skip this migration (`php artisan migrate` would fail attempting to
 * re-create an existing table).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tblcollections', function (Blueprint $table) {
            $table->integer('nCollectionId', true)->primary();
            $table->integer('nTransactionId');
            $table->integer('nJEVId');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tblcollections');
    }
};
