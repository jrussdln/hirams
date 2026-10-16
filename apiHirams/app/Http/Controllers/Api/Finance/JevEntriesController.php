<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Api\ApiController;
use App\Services\Finance\JevEntriesService;
use Illuminate\Http\Request;

class JevEntriesController extends ApiController
{
    public function __construct(private readonly JevEntriesService $service)
    {
    }

    // List all Entries
    public function index()
    {
        return response()->json($this->service->index());
    }

    // Get single Entry by ID
    public function show($id)
    {
        $res = $this->service->show($id);
        if (!$res) return response()->json(['message' => 'Not Found'], 404);
        return response()->json($res);
    }

    // Get all Entries under a JEV
    public function getByJevId($jevId)
    {
        return response()->json($this->service->getByJevId($jevId));
    }

    // Create Entry
    public function store(Request $request)
    {
        return response()->json($this->service->store($request), 201);
    }

    // Update Entry
    public function update(Request $request, $id)
    {
        $res = $this->service->update($request, $id);
        if (!$res) return response()->json(['message' => 'Not Found'], 404);
        return response()->json($res);
    }

    // Delete Entry
    public function destroy($id)
    {
        if (!$this->service->destroy($id)) return response()->json(['message' => 'Not Found'], 404);

        return response()->json(['message' => 'Deleted Successfully']);
    }
}
