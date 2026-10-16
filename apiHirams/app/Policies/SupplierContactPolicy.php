<?php

namespace App\Policies;

use App\Models\SupplierContact;
use App\Models\User;

class SupplierContactPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function view(User $user, SupplierContact $contact): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P', 'A', 'F']);
    }

    public function create(User $user): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function update(User $user, SupplierContact $contact): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function delete(User $user, SupplierContact $contact): bool
    {
        return $user->cUserType === 'M';
    }
}