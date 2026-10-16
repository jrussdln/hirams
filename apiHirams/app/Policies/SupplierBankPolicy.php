<?php

namespace App\Policies;

use App\Models\SupplierBank;
use App\Models\User;

class SupplierBankPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function view(User $user, SupplierBank $bank): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P', 'A', 'F']);
    }

    public function create(User $user): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function update(User $user, SupplierBank $bank): bool
    {
        return in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function delete(User $user, SupplierBank $bank): bool
    {
        return $user->cUserType === 'M';
    }
}