<?php

namespace App\Policies;

use App\Models\SupplierContact;
use App\Models\User;

class SupplierContactPolicy
{
    // Only an active user (cStatus = A) is granted anything at all.
    private function isActive(User $user): bool
    {
        return $user->cStatus === 'A';
    }

    public function viewAny(User $user): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function view(User $user, SupplierContact $contact): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'A', 'F']);
    }

    public function create(User $user): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function update(User $user, SupplierContact $contact): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P']);
    }

    public function delete(User $user, SupplierContact $contact): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }
}
