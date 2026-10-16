<?php

namespace App\Http\Controllers\Api\Reports;


use App\Http\Controllers\Api\ApiController;
use App\Models\SqlErrors;
use App\Services\Reports\DashboardService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends ApiController
{
    public function __construct(private readonly DashboardService $service)
    {
    }

    public function totalMetrics(Request $request)
    {
        try {
            return response()->json([
                'message' => 'Dashboard totals retrieved successfully',
                'totals' => $this->service->totalMetrics(),
            ], 200);
        } catch (Exception $e) {
            SqlErrors::create([
                'dtDate' => now(),
                'strError' => "Error retrieving dashboard totals: " . $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to retrieve dashboard totals',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function profitByMonth(Request $request)
    {
        $year = (int) $request->input('year', date('Y'));

        return response()->json(['monthly' => $this->service->profitByMonth($year)]);
    }
    public function employeePerformance(Request $request)
    {
        $year = (int) $request->input('year', date('Y'));

        return response()->json(['employees' => $this->service->employeePerformance($year)]);
    }
    /**
     * Get all NON-ARCHIVED transactions for the Dashboard.
     * Used by: Ongoing Transactions panel, Transactions-by-Month chart,
     * and the year dropdown — all of which should ignore archived transactions.
     */
    public function ongoingTransactions(): JsonResponse
    {
        try {
            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $this->service->ongoingTransactions(),
            ]);
        } catch (Exception $e) {
            SqlErrors::create([
                'dtDate'   => now(),
                'strError' => "Error retrieving ongoing transactions: " . $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to retrieve ongoing transactions',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
