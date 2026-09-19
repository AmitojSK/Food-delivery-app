package com.fooddelivery.realtimeservice.sse;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Holds the live SSE connections, keyed by user id, and fans events out to them.
 * State is intentionally in-memory: on the single-instance free tier that is
 * sufficient, and a connection is cheap to re-establish. If this ever scales to
 * multiple instances, each instance would subscribe to Kafka and fan out to only
 * the connections it holds, so no shared store is required for correctness.
 */
@Component
public class SseHub {
    private static final Logger log = LoggerFactory.getLogger(SseHub.class);
    // Long timeout; the browser client reconnects, and a heartbeat keeps proxies from closing idle streams.
    private static final long STREAM_TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<Long, List<SseEmitter>> byUser = new ConcurrentHashMap<>();

    public SseEmitter register(long userId) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        byUser.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> { emitter.complete(); remove(userId, emitter); });
        emitter.onError(error -> remove(userId, emitter));
        try {
            emitter.send(SseEmitter.event().name("connected").data(Map.of("ok", true)));
        } catch (IOException e) {
            remove(userId, emitter);
        }
        return emitter;
    }

    public void publish(long userId, String eventName, Object payload) {
        List<SseEmitter> emitters = byUser.get(userId);
        if (emitters == null) return;
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            } catch (Exception e) {
                remove(userId, emitter);
            }
        }
    }

    // Comment frames keep the connection warm without the client treating them as events.
    @Scheduled(fixedRate = 20000)
    public void heartbeat() {
        byUser.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (Exception e) {
                    remove(userId, emitter);
                }
            }
        });
    }

    private void remove(long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = byUser.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) byUser.remove(userId);
        }
    }
}
