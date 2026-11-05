<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who created a JEV / voucher. tbljevs.nUserId and tblvouchers.nUserId —
 * the journals list prints the creating user's nickname ("BY: …") over the
 * date in its Created column.
 *
 * The columns were already added by hand on the live database, so the
 * Schema::hasColumn() guard keeps this migration a no-op there.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('tbljevs', 'nUserId')) {
            Schema::table('tbljevs', function (Blueprint $table) {
                $table->unsignedBigInteger('nUserId')
                    ->nullable()
                    ->after('strJEVNumber')
                    ->comment('tblusers who created the journal');
            });
        }

        if (!Schema::hasColumn('tblvouchers', 'nUserId')) {
            Schema::table('tblvouchers', function (Blueprint $table) {
                $table->unsignedBigInteger('nUserId')
                    ->nullable()
                    ->after('strNumber')
                    ->comment('tblusers who created the voucher');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tbljevs', 'nUserId')) {
            Schema::table('tbljevs', function (Blueprint $table) {
                $table->dropColumn('nUserId');
            });
        }

        if (Schema::hasColumn('tblvouchers', 'nUserId')) {
            Schema::table('tblvouchers', function (Blueprint $table) {
                $table->dropColumn('nUserId');
            });
        }
    }
};
