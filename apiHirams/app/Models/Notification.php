<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * tblnotifications — the in-app notification feed.
 *
 * Rows are written by system flows (currently the auth events in
 * AuthController); strRoute, when set, is the frontend route a click
 * navigates to. strData carries the flexible payload (device, IP, etc.).
 *
 * There is no created_at/updated_at — dtNotifiedAt is written explicitly.
 */
class Notification extends Model
{
    protected $table = 'tblnotifications';
    protected $primaryKey = 'nNotificationId';

    protected $fillable = [
        'nUserId',
        'strTitle',
        'strNotification',
        'cNotificationType', // status_notif_type: I, W, S
        'cCategory',         // status_notif_category: A, B
        'strRoute',
        'strData',
        'bIsRead',
        'dtReadAt',
        'nCreatedBy',
        'dtNotifiedAt',
    ];

    protected $casts = [
        'bIsRead'      => 'boolean',
        'dtReadAt'     => 'datetime',
        'dtNotifiedAt' => 'datetime',
        'strData'      => 'array',
    ];

    public $timestamps = false;
}
