<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\SupplierContact\StoreSupplierContactRequest;
use App\Http\Requests\SupplierContact\UpdateSupplierContactRequest;
use App\Services\Masters\SupplierContactService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;

class SupplierContactController extends ApiController
{
    public function __construct(private readonly SupplierContactService $service)
    {
    }

    public function index(): JsonResponse
    {
        try {
            $supplierContacts = $this->service->index();

            return response()->json([
                'message'           => __('messages.retrieve_success', ['name' => 'Supplier Contacts']),
                'supplier_contacts' => $supplierContacts,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Supplier Contacts');
        }
    }

    public function store(StoreSupplierContactRequest $request): JsonResponse
    {
        try {
            $supplierContact = $this->service->create($request->validated());

            return response()->json([
                'message'          => __('messages.create_success', ['name' => 'Supplier Contact']),
                'supplier_contact' => $supplierContact,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Supplier Contact');
        }
    }

    public function update(UpdateSupplierContactRequest $request, int $id): JsonResponse
    {
        try {
            $supplierContact = $this->service->update($id, $request->validated());

            return response()->json([
                'message'          => __('messages.update_success', ['name' => 'Supplier Contact']),
                'supplier_contact' => $supplierContact,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier Contact');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Supplier Contact');
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $supplierContact = $this->service->delete($id);

            return response()->json([
                'message'                  => __('messages.delete_success', ['name' => 'Supplier Contact']),
                'deleted_supplier_contact' => $supplierContact,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier Contact');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Supplier Contact');
        }
    }

    public function bySupplier(int $supplierId): JsonResponse
    {
        try {
            $contacts = $this->service->bySupplier($supplierId);

            return response()->json([
                'message'  => __('messages.retrieve_success', ['name' => 'Supplier Contacts']),
                'contacts' => $contacts,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Supplier Contacts');
        }
    }
}
