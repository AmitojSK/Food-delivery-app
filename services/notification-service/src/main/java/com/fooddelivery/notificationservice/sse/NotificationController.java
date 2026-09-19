package com.fooddelivery.notificationservice.sse;

import com.fooddelivery.notificationservice.security.JwtPrincipal;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final SseHub hub;

    public NotificationController(SseHub hub) {
        this.hub = hub;
    }

    // Opens the authenticated user's live event stream. The user only ever receives
    // events tagged with their own id, so no per-resource authorization is needed here.
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal JwtPrincipal principal) {
        return hub.register(principal.userId());
    }
}
