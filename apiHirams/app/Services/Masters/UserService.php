<?php

namespace App\Services\Masters;

use App\Events\UserUpdated;
use App\Models\User;
use App\Services\CrudService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * User CRUD + the user-specific behaviour extracted from UserController:
 * password hashing, the duplicate username/email checks, profile image
 * handling and the two dropdown lists.
 */
class UserService extends CrudService
{
    protected string $entityName = 'User';
    protected string $primaryKey = 'nUserId';
    protected array  $searchable = ['strFName', 'strMName', 'strLName', 'strNickName'];
    protected array  $defaultSort = ['strLName', 'asc'];

    protected function modelClass(): string
    {
        return User::class;
    }

    protected function eventClass(): ?string
    {
        return UserUpdated::class;
    }

    /**
     * Create a user, hashing the plain password first.
     */
    public function create(array $data): User
    {
        if (!empty($data['strPassword'])) {
            $data['strPassword'] = bcrypt($data['strPassword']);
        }

        return parent::create($data);
    }

    /**
     * Update a user with the case-sensitive username / email uniqueness
     * checks; hashes the password when one is supplied, otherwise leaves
     * the stored hash untouched.
     *
     * @throws ValidationException when the username or email is already taken
     */
    public function update(int $id, array $data): User
    {
        $user = $this->find($id);

        if (!empty($data['strUserName'])) {
            $exists = User::whereRaw('BINARY strUserName = ?', [$data['strUserName']])
                ->where('nUserId', '!=', $user->nUserId)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'strUserName' => 'This username already exists.',
                ]);
            }
        }

        if (!empty($data['strEmail'])) {
            $exists = User::where('strEmail', $data['strEmail'])
                ->where('nUserId', '!=', $user->nUserId)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'strEmail' => 'This email already exists.',
                ]);
            }
        }

        if (!empty($data['strPassword'])) {
            $data['strPassword'] = bcrypt($data['strPassword']);
        } else {
            unset($data['strPassword']);
        }

        $user->update($data);
        $user->refresh();

        $this->broadcast('updated', $user);

        return $user;
    }

    /**
     * Deleting a user also removes its profile image.
     */
    public function delete(int $id): User
    {
        $user = $this->find($id);

        // Delete profile image
        if ($user->strProfileImage) {
            $imagePath = public_path('profile/' . $user->strProfileImage);

            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }

        // Revoke tokens first: the tokens() relation keys off the model's
        // id, so clear them while the row still exists.
        $user->tokens()->delete();

        $user->delete();

        $this->broadcast('deleted', $user->nUserId);

        return $user;
    }

    /**
     * Update the status and, when given, the user type.
     */
    public function updateStatus(int $id, string $status, ?string $userType = null): User
    {
        $user = $this->find($id);

        $updateData = ['cStatus' => $status];
        if ($userType !== null) {
            $updateData['cUserType'] = $userType;
        }

        $user->update($updateData);
        $user->refresh();

        // A Sanctum token stays valid on its own, so a deactivated user would
        // otherwise keep browsing. Revoke every token so they are logged out
        // immediately instead of on their next request.
        if ($status !== 'A') {
            $user->tokens()->delete();
        }

        $this->broadcast('status_changed', $user);

        return $user;
    }

    /**
     * Case-sensitive (BINARY) username lookup, falling back to the exact
     * email lookup, behind the checkExist() endpoint.
     */
    public function checkExist(array $validated): array
    {
        $exists = false;
        $field  = '';

        if (!empty($validated['strUserName'])) {
            $exists = User::whereRaw('BINARY strUserName = ?', [$validated['strUserName']])->exists();
            $field  = 'username';
        }

        if (!$exists && !empty($validated['strEmail'])) {
            $exists = User::where('strEmail', $validated['strEmail'])->exists();
            $field  = 'email';
        }

        return [
            'exists' => $exists,
            'field'  => $exists ? $field : null,
        ];
    }

    /**
     * Replace the user's password with the given plain one.
     */
    public function updatePassword(int $id, string $password): void
    {
        $user = $this->find($id);

        $user->update(['strPassword' => Hash::make($password)]);
        $this->broadcast('updated', $user->nUserId);
    }

    /**
     * Store the uploaded profile image in the React app's public/profile/
     * folder (only the filename is saved to the database) and return it.
     */
    public function uploadProfileImage(int $id, UploadedFile $file): string
    {
        $user = $this->find($id);

        $destination = public_path('profile');

        // Delete old image
        if ($user->strProfileImage) {
            $oldPath = $destination . '/' . $user->strProfileImage;

            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        $filename = $id . '_' . time() . '.' . $file->getClientOriginalExtension();

        if (!file_exists($destination)) {
            mkdir($destination, 0755, true);
        }

        $file->move($destination, $filename);

        $user->update([
            'strProfileImage' => $filename
        ]);

        $this->broadcast('updated', $user->nUserId);

        return $filename;
    }

    /**
     * Active Account Officers (for assignment dropdowns).
     * Uses user_types index 4 and 5 from mappings config.
     */
    public function activeAccountOfficers()
    {
        $userTypes = array_keys(config('mappings.user_types'));
        $allow     = array_filter([
            $userTypes[4] ?? null,
            $userTypes[5] ?? null,
        ]);

        $users = $this->newQuery()
            ->where('cStatus', 'A')
            ->whereIn('cUserType', $allow)
            ->orderBy('strLName')
            ->get(['nUserId', 'strFName', 'strLName']);

        return $users->map(fn($u) => [
            'value' => $u->nUserId,
            'label' => "{$u->strFName} {$u->strLName}",
        ]);
    }

    /**
     * Active procurement users (for assignment dropdowns).
     * Uses user_types index 2 and 3 from mappings config.
     */
    public function activeProcurement()
    {
        $userTypes = array_keys(config('mappings.user_types'));
        $allow     = array_filter([
            $userTypes[2] ?? null,
            $userTypes[3] ?? null,
        ]);

        $users = $this->newQuery()
            ->where('cStatus', 'A')
            ->whereIn('cUserType', $allow)
            ->orderBy('strLName')
            ->get(['nUserId', 'strFName', 'strLName']);

        return $users->map(fn($u) => [
            'value' => $u->nUserId,
            'label' => "{$u->strFName} {$u->strLName}",
        ]);
    }
}
