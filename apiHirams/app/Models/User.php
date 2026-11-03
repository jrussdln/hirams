<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'tblusers';
    protected $primaryKey = 'nUserId';

    protected $fillable = [
        'strFName',
        'strMName',
        'strLName',
        'strNickName',
        'cUserType',
        'cSex',
        'strPhoneNo',
        'strEmail',
        'strUserName',
        'strPassword',
        'strProfileImage',
        'bIsActive', // ✅ Fixed: Changed from 'bisActive' to 'bIsActive'
        'cStatus',
        'dtCreatedAt',
        'dtLoggedIn',
        'dtLastSeen', // presence heartbeat stamp
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'strPassword',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'bIsActive' => 'boolean',
        'dtCreatedAt' => 'datetime',
        'dtLastSeen' => 'datetime', // presence heartbeat stamp
    ];

    // Disable timestamps
    public $timestamps = false;
}
