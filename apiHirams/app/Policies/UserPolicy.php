<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    // Only an active user (cStatus = A) is granted anything at all.
    private function isActive(User $user): bool
    {
        return $user->cStatus === 'A';
    }

    public function viewAny(User $user): bool
    {
        // Role codes: M=Management, G=General Manager, P=Procurement Officer,
        // Y=Procurement Officer TL, A=Account Officer, X=Account Officer TL, F=Finance Officer
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y']);
    }

    public function view(User $user, User $modelUser): bool
    {
        if (!$this->isActive($user)) {
            return false;
        }
        return $user === $modelUser || in_array($user->cUserType, ['M', 'G', 'P', 'Y']);
    }

    public function create(User $user): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }

    public function update(User $user, User $modelUser): bool
    {
        if (!$this->isActive($user)) {
            return false;
        }
        if ($user->cUserType !== 'M') {
            return $user === $modelUser;
        }
        return true;
    }

    public function changePassword(User $user, User $modelUser): bool
    {
        return $this->isActive($user)
            && ($user === $modelUser || $user->cUserType === 'M');
    }

    public function delete(User $user): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }

    public function manageRoles(User $user): bool
    {
        return $this->isActive($user) && $user->cUserType === 'M';
    }

    public function uploadProfileImage(User $user, User $modelUser): bool
    {
        return $this->isActive($user)
            && ($user === $modelUser || $user->cUserType === 'M');
    }

    public function viewActive(User $user): bool
    {
        return $this->isActive($user)
            && in_array($user->cUserType, ['M', 'G', 'P', 'Y']);
    }
}
