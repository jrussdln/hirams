<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Api\ApiController;
use App\Services\Reports\ChatBotService;
use Illuminate\Http\Request;

class AIChatBotController extends ApiController
{
    public function __construct(private readonly ChatBotService $service)
    {
    }

    /**
     * Accepts the full message history from the client and forwards it to
     * Groq's Chat Completions API. The AI API is stateless, so the client must
     * resend the whole conversation each time (ChatWidget already does this).
     */

    public function send(Request $request)
    {
        return $this->service->send($request);
    }
}
