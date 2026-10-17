<?php

namespace App\Policies;

use App\Models\Transactions;
use App\Models\User;

class TransactionPolicy
{
    // Only an active user (cStatus = A) is granted anything at all.
    private function isActive(User $user): bool
    {
        return $user->cStatus === 'A';
    }

    /**
     * Determine whether the user can view any transactions.
     */
    public function viewAny(User $user): bool
    {
        // Role codes: M=Management (admin), G=General Manager, P=Procurement Officer,
        // Y=Procurement Officer TL, A=Account Officer, X=Account Officer TL, F=Finance Officer
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can view the transaction.
     */
    public function view(User $user, Transactions $transaction): bool
    {
        if (!$this->isActive($user)) {
            return false;
        }
        // Users can view their own transactions or if they have appropriate role codes
        return in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']) ||
               $transaction->nCreatedBy === $user->nUserId;
    }

    /**
     * Determine whether the user can create transactions.
     */
    public function create(User $user): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can update the transaction.
     */
    public function update(User $user, Transactions $transaction): bool
    {
        if (!$this->isActive($user)) {
            return false;
        }

        // Only draft transactions can be updated
        // Role codes M, G, P, Y, A, X, F can update
        if ($transaction->status === 'finalized') {
            return false;
        }

        return in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']) ||
               $transaction->nCreatedBy === $user->nUserId;
    }

    /**
     * Determine whether the user can delete the transaction.
     */
    public function delete(User $user, Transactions $transaction): bool
    {
        if (!$this->isActive($user)) {
            return false;
        }
        return $user->cUserType === 'M' ||
               ($transaction->nCreatedBy === $user->nUserId && $transaction->status !== 'archived');
    }

    /**
     * Determine whether the user can approve pricing.
     */
    public function approvePricing(User $user, Transactions $transaction): bool
    {
        return $this->isActive($user)
            && ($user->cUserType === 'M' || in_array($user->cUserType, ['P', 'Y']));
    }

    /**
     * Determine whether the user can assign AO.
     */
    public function assignAO(User $user, Transactions $transaction): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y', 'A', 'X', 'F']);
    }

    /**
     * Determine whether the user can complete transaction.
     */
    public function complete(User $user, Transactions $transaction): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }

    /**
     * Determine whether the user can archive/unarchive.
     */
    public function archive(User $user, Transactions $transaction): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }
}
