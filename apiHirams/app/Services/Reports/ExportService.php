<?php

namespace App\Services\Reports;

use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PhpSpreadsheet builders behind the export endpoints.
 *
 * All cell addresses, template paths, row-offset arithmetic, styling and the
 * streamed-response headers are formatting-sensitive and were moved verbatim
 * from the original ExportController — do not "clean up" any of it.
 */
class ExportService
{
    public function downloadTransactionExcel(Request $request): StreamedResponse
    {
        if (ob_get_length()) {
            ob_end_clean();
        }

        $templatePath = base_path('resources/templates/transaction_temp.xlsx');
        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        // 1️⃣ Put the title in C5
        $title = $request->input('title', '');
        $sheet->setCellValue('C5', $title);

        // 2️⃣ Items
        $items = $request->input('items', []);

        $row = 6;
        $count = 1;

        // Totals
        $totalEWT = 0;
        $totalPurchasePrice = 0;

        foreach ($items as $item) {

            // Find included non-addOn option (for brand, supplier, unit price)
            $includedOption = null;
            // EWT = sum of dEWT from ALL included options (addOn or not)
            $ewt = 0;

            if (!empty($item['purchaseOptions'])) {
                foreach ($item['purchaseOptions'] as $option) {
                    if (!empty($option['bIncluded']) && $option['bIncluded'] == 1) {
                        // Sum EWT from all included options
                        $ewt += isset($option['dEWT']) ? floatval($option['dEWT']) : 0;

                        // Only use non-addOn option for brand/supplier/unit price
                        if (empty($option['bAddOn']) || $option['bAddOn'] == 0) {
                            $includedOption = $option;
                        }
                    }
                }
            }

            // Safe values
            $qty = isset($item['qty']) ? floatval($item['qty']) : 0;
            $unitPrice = isset($includedOption['dUnitPrice']) ? floatval($includedOption['dUnitPrice']) : 0;

            // Computed purchase price
            $purchasePrice = $qty * $unitPrice;

            // Track totals
            $totalEWT += $ewt;
            $totalPurchasePrice += $purchasePrice;

            // Insert row
            $sheet->insertNewRowBefore($row, 1);

            $sheet->setCellValue("A{$row}", $count);
            $sheet->setCellValue("C{$row}", $item['name'] ?? '');
            $sheet->setCellValue("D{$row}", $qty);
            $sheet->setCellValue("E{$row}", $item['uom'] ?? '');
            $sheet->setCellValue("F{$row}", $includedOption['strBrand'] ?? '');
            $sheet->setCellValue("G{$row}", $includedOption['supplierNickName'] ?? '');
            $sheet->setCellValue("H{$row}", $ewt);
            $sheet->setCellValue("I{$row}", $unitPrice);
            $sheet->setCellValue("J{$row}", $purchasePrice);

            $row++;
            $count++;
        }

        // 3️⃣ After all items → leave 1 empty row
        $row++;

        // 4️⃣ Insert summary row
        $sheet->setCellValue("D{$row}", $count - 1);          // total items
        $sheet->setCellValue("H{$row}", $totalEWT);           // total EWT
        $sheet->setCellValue("J{$row}", $totalPurchasePrice); // total purchase price

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="transaction_export.xlsx"',
        ]);
    }

    public function exportBreakdown(Request $request): StreamedResponse
    {
        if (ob_get_length()) {
            ob_end_clean();
        }

        $templatePath = base_path('resources/templates/transac-pricing.xlsx');
        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        // ✅ Get inputs from frontend
        $items             = $request->input('items', []);
        $unitSellingPrices = $request->input('unitSellingPrices', []);
        $transactionHasABC = $request->input('transactionHasABC', false);
        $transactionABC    = $request->input('transactionABC', 0);
        $directCosts       = $request->input('directCosts', []);
        $directCostOptions = $request->input('directCostOptions', []);
        $editableValues    = $request->input('editableValues', []);
        $deliveryDays      = $request->input('deliveryDays');
        $deliveryPlace     = $request->input('deliveryPlace');
        $createdBy     = $request->input('createdBy');

        // ✅ Build option name lookup map: optionId => strName
        $optionNameMap = [];
        foreach ($directCostOptions as $option) {
            $id   = $option['nDirectCostOptionID'] ?? $option['id'] ?? null;
            $name = $option['strName'] ?? $option['name'] ?? '';
            if ($id !== null) {
                $optionNameMap[$id] = $name;
            }
        }

        // ✅ Place TRANSACTION ABC into Excel cell P3 (above items, safe)
        $sheet->setCellValue('P3', $transactionABC);

        $row   = 4; // Start at row 4
        $count = 1;

        // Totals
        $totalEWT              = 0;
        $totalPurchasePrice    = 0;
        $totalUnitSellingPrice = 0;
        $totalItemABC          = 0;
        $totalDifference       = 0;
        $totalProfit           = 0;
        $totalTax              = 0;
        $hasAnyItemABC         = false;

        foreach ($items as $item) {
            $includedOption = null;
            $includedTotal  = 0;
            $ewt            = 0;

            if (!empty($item['purchaseOptions'])) {
                foreach ($item['purchaseOptions'] as $option) {
                    if (!empty($option['bIncluded']) && $option['bIncluded'] == 1) {
                        $optQty   = isset($option['nQuantity']) ? floatval($option['nQuantity']) : 0;
                        $optPrice = isset($option['dUnitPrice']) ? floatval($option['dUnitPrice']) : 0;
                        $includedTotal += $optQty * $optPrice;

                        $ewt += isset($option['dEWT']) ? floatval($option['dEWT']) : 0;

                        if (empty($option['bAddOn']) || $option['bAddOn'] == 0) {
                            $includedOption = $option;
                        }
                    }
                }
            }

            $qty           = isset($item['qty']) ? floatval($item['qty']) : 0;
            $capital       = $qty > 0 ? $includedTotal / $qty : 0;
            $purchasePrice = $includedTotal;

            $itemId            = $item['id'] ?? null;
            $unitSellingPrice  = isset($unitSellingPrices[$itemId]) ? floatval($unitSellingPrices[$itemId]) : 0;
            $totalSellingPrice = $unitSellingPrice * $qty;

            $itemABC    = isset($item['abc']) ? floatval($item['abc']) : 0;
            $hasItemABC = $itemABC > 0;

            if ($hasItemABC) {
                $hasAnyItemABC = true;
            }

            $tax    = (($totalSellingPrice - $includedTotal) / 1.12) * 0.42;
            $profit = (($unitSellingPrice - $capital) * $qty) - $tax;

            $profitMarginPercentage = $purchasePrice > 0
                ? round(($profit / $purchasePrice) * 100, 2)
                : 0;

            $totalEWT              += $ewt;
            $totalPurchasePrice    += $purchasePrice;
            $totalUnitSellingPrice += $totalSellingPrice;
            $totalProfit           += $profit;
            $totalTax              += $tax;

            if ($count > 1) {
                $sheet->insertNewRowBefore($row, 1);
            }

            $sheet->setCellValue("B{$row}", $count);
            $sheet->setCellValue("C{$row}", $item['name'] ?? '');
            $sheet->setCellValue("E{$row}", $qty);
            $sheet->setCellValue("F{$row}", $item['uom'] ?? '');
            $sheet->setCellValue("G{$row}", $includedOption['strBrand'] ?? '');
            $sheet->setCellValue("H{$row}", $includedOption['supplierNickName'] ?? '');
            $sheet->setCellValue("I{$row}", $ewt);
            $sheet->setCellValue("J{$row}", $capital);
            $sheet->setCellValue("K{$row}", $purchasePrice);
            $sheet->setCellValue("M{$row}", $unitSellingPrice);
            $sheet->setCellValue("N{$row}", $totalSellingPrice);

            if ($hasItemABC) {
                $difference = $itemABC - $totalSellingPrice;

                $sheet->setCellValue("O{$row}", $itemABC);
                $sheet->setCellValue("P{$row}", $qty > 0 ? $itemABC / $qty : 0);
                $sheet->setCellValue("Q{$row}", $difference);

                $totalItemABC    += $itemABC;
                $totalDifference += $difference;
            } else {
                $sheet->setCellValue("O{$row}", '');
                $sheet->setCellValue("P{$row}", '');
                $sheet->setCellValue("Q{$row}", -$totalSellingPrice);
                $totalDifference += -$totalSellingPrice;
            }

            $sheet->setCellValue("R{$row}", $profit);
            $sheet->setCellValue("S{$row}", $tax);
            $sheet->setCellValue("T{$row}", number_format($profitMarginPercentage, 2) . '%');

            $row++;
            $count++;
        }

        // ✅ Skip one row
        $row++;

        // ✅ How many extra rows were inserted (first item doesn't insert)
        $insertedRows = max(0, $count - 2);

        // ✅ Now write delivery info with offset
        $sheet->setCellValue('D' . (9  + $insertedRows), $deliveryDays);
        $sheet->setCellValue('D' . (10 + $insertedRows), $deliveryPlace);
        $sheet->setCellValue('D' . (12 + $insertedRows), $createdBy);
        // ✅ Keyword-to-cell mapping with offset applied
        $keywordCellMap = [
            'lat'  => 'K' . (17 + $insertedRows),
            'ret'  => 'K' . (24 + $insertedRows),
            'bid'  => 'K' . (30 + $insertedRows),
            'fee'  => 'K' . (31 + $insertedRows),
            'frei' => 'K' . (32 + $insertedRows),
            'del'  => 'K' . (33 + $insertedRows),
            'war'  => 'K' . (34 + $insertedRows),
            'man'  => 'K' . (35 + $insertedRows),
            'reb'  => 'K' . (36 + $insertedRows),
        ];

        // ✅ Accumulate amounts per keyword from directCosts
        $keywordTotals = array_fill_keys(array_keys($keywordCellMap), 0);

        foreach ($directCosts as $cost) {
            $optionId = $cost['nDirectCostOptionID'] ?? null;
            $strName  = strtolower(trim($optionNameMap[$optionId] ?? ''));
            $amount   = floatval($cost['dAmount'] ?? 0);

            foreach ($keywordCellMap as $keyword => $cell) {
                if (str_contains($strName, $keyword)) {
                    $keywordTotals[$keyword] += $amount;
                    break;
                }
            }
        }

        // ✅ Write all keyword totals to their offset cells
        foreach ($keywordCellMap as $keyword => $cell) {
            if ($keywordTotals[$keyword] > 0) {
                $sheet->setCellValue($cell, $keywordTotals[$keyword]);
            }
        }

        // ✅ Determine which ABC to display in totals
        $displayTotalABC = '';

        if ($hasAnyItemABC) {
            $displayTotalABC = $totalItemABC;
        } elseif ($transactionHasABC && $transactionABC > 0) {
            $displayTotalABC = $transactionABC;
            $totalDifference = $transactionABC - $totalUnitSellingPrice;
        }

        // ✅ Add totals row
        $sheet->setCellValue("B{$row}", 'TOTAL');
        $sheet->setCellValue("I{$row}", $totalEWT);
        $sheet->setCellValue("K{$row}", $totalPurchasePrice);
        $sheet->setCellValue("N{$row}", $totalUnitSellingPrice);

        if ($displayTotalABC !== '') {
            $sheet->setCellValue("P{$row}", $displayTotalABC);
        } else {
            $sheet->setCellValue("P{$row}", '');
        }

        $sheet->setCellValue("Q{$row}", $totalDifference);
        $sheet->setCellValue("R{$row}", $totalProfit);
        $sheet->setCellValue("S{$row}", $totalTax);

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' =>
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' =>
            'attachment; filename="breakdown_export.xlsx"',
        ]);
    }

    public function exportSellingPriceReport(Request $request): StreamedResponse
    {
        if (ob_get_length()) {
            ob_end_clean();
        }

        $templatePath = base_path('resources/templates/SellingPriceReportTemplate.xlsx');
        $spreadsheet  = IOFactory::load($templatePath);
        $sheet        = $spreadsheet->getActiveSheet();

        $transaction       = $request->input('transaction', []);
        $items             = $request->input('items', []);
        $unitSellingPrices = $request->input('unitSellingPrices', []);

        // ── Header ────────────────────────────────────────────────
        $sheet->setCellValue("C2", $transaction['client']['strClientName'] ?? '--');
        $sheet->setCellValue("C3", $transaction['strTitle']                ?? '--');
        $sheet->setCellValue("G2", $transaction['strCode']                 ?? '--');

        // ── Items ─────────────────────────────────────────────────
        $row        = 6;
        $count      = 1;
        $grandTotal = 0;

        foreach ($items as $item) {
            $includedOption = null;
            foreach ($item['purchaseOptions'] ?? [] as $option) {
                if (!empty($option['bIncluded']) && $option['bIncluded'] == 1) {
                    if (empty($option['bAddOn']) || $option['bAddOn'] == 0) {
                        $includedOption = $option;
                        break;
                    }
                }
            }

            $qty              = floatval($item['qty'] ?? 0);
            $itemId           = $item['id'] ?? null;
            $unitSellingPrice = floatval($unitSellingPrices[$itemId] ?? 0);
            $totalSelling     = $unitSellingPrice * $qty;
            $grandTotal      += $totalSelling;

            $brand      = $includedOption['strBrand'] ?? '';
            $model      = $includedOption['strModel'] ?? '';
            $brandModel = trim(implode(' - ', array_filter([$brand, $model])));

            if ($count > 1) {
                $sheet->insertNewRowBefore($row, 1);
            }

            $sheet->setCellValue("B{$row}", $count);
            $sheet->getStyle("B{$row}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            $sheet->setCellValue("C{$row}", $item['name'] ?? '');
            $sheet->getStyle("C{$row}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            $sheet->setCellValue("D{$row}", $brandModel);
            $sheet->getStyle("D{$row}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            $sheet->setCellValue("E{$row}", $qty);
            $sheet->getStyle("E{$row}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            $sheet->setCellValue("F{$row}", '₱ ' . number_format($unitSellingPrice, 2));
            $sheet->getStyle("F{$row}")->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_RIGHT)
                ->setVertical(Alignment::VERTICAL_CENTER);

            $sheet->setCellValue("G{$row}", '₱ ' . number_format($totalSelling, 2));
            $sheet->getStyle("G{$row}")->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_RIGHT)
                ->setVertical(Alignment::VERTICAL_CENTER);

            $row++;
            $count++;
        }

        // ── Grand total (skip one row) ────────────────────────────
        $row++;
        $sheet->setCellValue("G{$row}", '₱ ' . number_format($grandTotal, 2));
        $sheet->getStyle("G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="selling_price_report.xlsx"',
        ]);
    }
}
