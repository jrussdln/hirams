<?php

namespace App\Http\Controllers\Api\Reports;


use App\Http\Controllers\Api\ApiController;
use App\Services\Reports\ExportService;
use Illuminate\Http\Request;

class ExportController extends ApiController
{
    public function __construct(private readonly ExportService $service)
    {
    }

    public function downloadTransactionExcel(Request $request)
    {
        return $this->service->downloadTransactionExcel($request);
    }

    public function exportBreakdown(Request $request)
    {
        return $this->service->exportBreakdown($request);
    }
    public function exportSellingPriceReport(Request $request)
    {
        return $this->service->exportSellingPriceReport($request);
    }
}
