<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Api\ApiController;
use App\Services\Finance\JevService;
use Illuminate\Http\Request;

class JevController extends ApiController
{
    public function __construct(private readonly JevService $service)
    {
    }

    public function index()
    {
        return response()->json($this->service->index());
    }

    // Per-type totals for the sidebar (JevNav): one grouped COUNT instead of
    // shipping every JEV with its entries and voucher relations just to
    // render four numbers.
    public function counts()
    {
        return response()->json($this->service->counts());
    }

    public function show($id)
    {
        $res = $this->service->show($id);
        if (!$res) return response()->json(['message' => 'Not Found'], 404);
        return response()->json($res);
    }

    public function getByLink($link)
    {
        $res = $this->service->getByLink($link);
        if (!$res) return response()->json(['message' => 'Not Found'], 404);
        return response()->json($res);
    }

    public function store(Request $request)
    {
        return response()->json($this->service->store($request), 201);
    }

    public function update(Request $request, $id)
    {
        $res = $this->service->update($request, $id);
        if (!$res) return response()->json(['message' => 'Not Found'], 404);
        return response()->json($res);
    }

    public function destroy($id)
    {
        if (!$this->service->destroy($id)) return response()->json(['message' => 'Not Found'], 404);

        return response()->json(['message' => 'Deleted Successfully']);
    }
}
