<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\User\CheckExistUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdatePasswordRequest;
use App\Http\Requests\User\UpdateStatusUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Requests\User\UploadProfileImageRequest;
use App\Services\Masters\UserService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends ApiController
{
    public function __construct(private readonly UserService $service)
    {
    }

    /**
     * Get all users with optional filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = $this->service->newQuery();

            if ($request->filled('cUserType')) {
                $query->where('cUserType', $request->cUserType);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('strFName', 'LIKE', "%{$search}%")
                        ->orWhere('strMName', 'LIKE', "%{$search}%")
                        ->orWhere('strLName', 'LIKE', "%{$search}%")
                        ->orWhere('strNickName', 'LIKE', "%{$search}%");
                });
            }

            $users = $query->orderBy('strLName')->get();

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Users']),
                'users'   => $users,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Users');
        }
    }

    /**
     * Get a single user by ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = $this->service->find($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'User']),
                'user'    => $user,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'User']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'User');
        }
    }

    /**
     * Create a new user
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            $user = $this->service->create($request->validated());

            return response()->json([
                'message' => __('messages.create_success', ['name' => 'User']),
                'user'    => $user,
            ], 201);
        } catch (QueryException $e) {
            return $this->handleDuplicateEntry($e);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'User');
        }
    }

    /**
     * Update an existing user
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        try {
            $user = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'User']),
                'user'    => $user,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'User']),
            ], 404);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 409);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'User');
        }
    }

    /**
     * Delete a user
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $user = $this->service->delete($id);

            return response()->json([
                'message'      => __('messages.delete_success', ['name' => 'User']),
                'deleted_user' => $user,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'User']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'User');
        }
    }

    /**
     * Update user status
     */
    public function updateStatus(UpdateStatusUserRequest $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validated();

            $user = $this->service->updateStatus(
                $id,
                $validated['cStatus'],
                $validated['cUserType'] ?? null
            );

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'User Status']),
                'user'    => $user,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'User']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'User Status');
        }
    }

    /**
     * Check if username or email already exists
     */
    public function checkExist(CheckExistUserRequest $request): JsonResponse
    {
        try {
            $exists = $this->service->checkExist($request->validated());

            return response()->json($exists);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'User existence check');
        }
    }

    /**
     * Update the user's password
     */
    public function updatePassword(UpdatePasswordRequest $request, int $id): JsonResponse
    {
        try {
            $this->service->updatePassword($id, $request->validated('strPassword'));

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Password']),
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'User']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Password');
        }
    }

    /**
     * Upload and update the user's profile image.
     * Stores the file in the React app's public/profile/ folder.
     * Only the filename is saved to the database.
     */
    public function uploadProfileImage(UploadProfileImageRequest $request, int $id): JsonResponse
    {
        try {
            $filename = $this->service->uploadProfileImage($id, $request->file('strProfileImage'));

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Profile Image']),
                'strProfileImage' => $filename,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'User']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Profile Image');
        }
    }

    /**
     * Get active Account Officers (for assignment dropdowns)
     * Uses user_types index 4 and 5 from mappings config
     */
    public function activeAccountOfficers(): JsonResponse
    {
        try {
            return response()->json([
                'message'         => __('messages.retrieve_success', ['name' => 'Account Officers']),
                'accountOfficers' => $this->service->activeAccountOfficers(),
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Account Officers');
        }
    }

    public function activeProcurement(): JsonResponse
    {
        try {
            return response()->json([
                'message'         => __('messages.retrieve_success', ['name' => 'Procurement']),
                'procurement' => $this->service->activeProcurement(),
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Procurement');
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function handleDuplicateEntry(QueryException $e): JsonResponse
    {
        if ($e->errorInfo[1] == 1062) {
            $message = $e->errorInfo[2];
            preg_match("/for key '([^']+)'/", $message, $matches);
            $key = $matches[1] ?? '';

            if (str_contains($key, 'strUserName')) {
                return response()->json(['message' => 'This username already exists.'], 409);
            }

            if (str_contains($key, 'strEmail')) {
                return response()->json(['message' => 'This email already exists.'], 409);
            }

            return response()->json(['message' => 'Duplicate record already exists.'], 409);
        }

        throw $e;
    }
}
