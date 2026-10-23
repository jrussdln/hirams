<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Company\StoreCompanyRequest;
use App\Http\Requests\Company\TransferCompanyLinksRequest;
use App\Http\Requests\Company\UpdateCompanyRequest;
use App\Services\Masters\CompanyService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends ApiController
{
    public function __construct(private readonly CompanyService $service)
    {
    }

    /**
     * Get all companies with optional filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $companies = $this->service->search($request->query('search', ''))->get();

            return response()->json([
                'message'   => __('messages.retrieve_success', ['name' => 'Companies']),
                'companies' => $companies,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Companies');
        }
    }

    /**
     * Create a new company
     */
    public function store(StoreCompanyRequest $request): JsonResponse
    {
        try {
            $company = $this->service->create($request->validated());

            return response()->json([
                'message' => __('messages.create_success', ['name' => 'Company']),
                'company' => $company,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Company');
        }
    }

    /**
     * Update an existing company
     */
    public function update(UpdateCompanyRequest $request, int $id): JsonResponse
    {
        try {
            $company = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Company']),
                'company' => $company,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Company');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Company');
        }
    }

    /**
     * Delete a company
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            // A company that still carries transactions or vouchers cannot
            // be removed — the records would be left pointing at nothing.
            // They have to be transferred to another company first.
            if ($this->service->hasLinks($id)) {
                return response()->json([
                    'message' => 'Cannot delete a company that has transactions or vouchers. Transfer them to another company first.',
                ], 422);
            }

            $company = $this->service->delete($id);

            return response()->json([
                'message'         => __('messages.delete_success', ['name' => 'Company']),
                'deleted_company' => $company,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Company');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Company');
        }
    }

    /**
     * GET /companies/{id}/links
     *
     * The transactions and vouchers that name this company — the list the
     * transfer modal shows before they are moved to another company.
     */
    public function links(int $id): JsonResponse
    {
        try {
            $links = $this->service->links($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Company records']),
                'links'   => $links,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Company');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Company records');
        }
    }

    /**
     * POST /companies/{id}/transfer
     *
     * Moves the company's transactions and vouchers to another company.
     */
    public function transfer(TransferCompanyLinksRequest $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validated();

            $moved = $this->service->transferLinks(
                $id,
                (int) $validated['nTargetCompanyId'],
                array_map('intval', $validated['transactionIds'] ?? []),
                array_map('intval', $validated['voucherIds'] ?? []),
            );

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Company records']),
                'moved'   => $moved,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Company');
        } catch (Exception $e) {
            return $this->fail($e->getMessage(), 422);
        }
    }

    /**
     * Upload company logo
     */
    public function uploadLogo(Request $request, int $id): JsonResponse
    {
        try {
            $request->validate([
                'strLogo'         => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
                'strLogoFilename' => 'required|string|max:30',
            ]);

            $file     = $request->file('strLogo');
            $filename = $request->input('strLogoFilename');

            $this->service->uploadLogo($id, $file, $filename);

            return response()->json([
                'message' => 'Logo uploaded successfully.',
                'strLogo' => $filename,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Company not found.'], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Company Logo');
        }
    }
}
