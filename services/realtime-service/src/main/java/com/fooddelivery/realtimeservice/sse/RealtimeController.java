package com.fooddelivery.realtimeservice.sse;

import com.fooddelivery.realtimeservice.security.JwtPrincipal;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/stream")
public class RealtimeController {
    private final SseHub hub;

    public RealtimeController(SseHub hub) {
        this.hub = hub;
    }

    // Opens the authenticated user's live event stream. The user only ever receives
    // events tagged with their own id, so no per-resource authorization is needed here.
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal JwtPrincipal principal) {
        return hub.register(principal.userId());
    }
}
