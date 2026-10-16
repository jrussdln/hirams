<?php

namespace App\Services\Reports;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

/**
 * Groq Chat Completions bridge for the AI chatbot widget.
 *
 * Deliberately keeps the original (pre-refactor) response shapes — a 422
 * `{"message","errors"}` envelope on validation failure and a 502
 * `{"message","details"}` envelope when Groq rejects the call. Do NOT
 * normalise these to the ApiController conventions without coordinating
 * with the frontend.
 */
class ChatBotService
{
    /**
     * Validate the client-supplied history and forward it to Groq.
     * The AI API is stateless, so the client must resend the whole
     * conversation each time (ChatWidget already does this).
     */
    public function send(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'messages' => 'required|array|min:1',
            'messages.*.role' => 'required|string|in:user,assistant',
            'messages.*.content' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $response = Http::withToken(config('services.groq.api_key'))
            ->timeout(30)
            ->retry(2, 500) // retry up to 2 times, 500ms apart
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => 'openai/gpt-oss-120b',
                'messages' => $request->messages,
            ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'AI service request failed.',
                'details' => $response->json(), // remove in production; useful while debugging
            ], 502);
        }

        $data = $response->json();

        return response()->json([
            'reply' => $data['choices'][0]['message']['content'] ?? '',
        ]);
    }
}
