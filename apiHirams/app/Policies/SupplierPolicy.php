<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;

class SupplierPolicy
{
    // Only an active user (cStatus = A) is granted anything at all.
    private function isActive(User $user): bool
    {
        return $user->cStatus === 'A';
    }

    /**
     * Determine whether the user can view any suppliers.
     */
    public function viewAny(User $user): bool
    {
        // Role codes: M=Management, G=General Manager, P=Procurement Officer,
        // Y=Procurement Officer TL, A=Account Officer, X=Account Officer TL, F=Finance Officer
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can view the supplier.
     */
    public function view(User $user, Supplier $supplier): bool
    {
        // Users can view suppliers if they have appropriate role codes
        return $this->isActive($user)
            && in_array($user->cUserType, ['admin', 'M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can create suppliers.
     */
    public function create(User $user): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can update the supplier.
     */
    public function update(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['admin', 'M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can delete the supplier.
     */
    public function delete(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }

    /**
     * Determine whether the user can update supplier status.
     */
    public function updateStatus(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y']);
    }

    /**
     * Determine whether the user can view supplier banks.
     */
    public function viewBanks(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can manage supplier banks.
     */
    public function manageBanks(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y']);
    }

    /**
     * Determine whether the user can view supplier contacts.
     */
    public function viewContacts(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can manage supplier contacts.
     */
    public function manageContacts(User $user, Supplier $supplier): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y']);
    }
}
