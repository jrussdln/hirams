<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The transacting office carried on the transaction itself —
     * strOfficeName is its full name, strOfficeNickName the short form
     * shown next to the client nickname in the list's Client cell
     * ("clientNick (OfficeNick)").
     */
    public function up(): void
    {
        Schema::table('tbltransactions', function (Blueprint $table) {
            $table->string('strOfficeName', 40)->nullable()->after('nTransactionId');
            $table->string('strOfficeNickName', 20)->nullable()->after('strOfficeName');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbltransactions', function (Blueprint $table) {
            $table->dropColumn(['strOfficeName', 'strOfficeNickName']);
        });
    }
};
