package com.fooddelivery.realtimeservice.sse;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Holds the live SSE connections and fans events out to them, either to a single
 * user (an order's customer or owner) or to everyone in a role (the open delivery
 * job board, which every driver watches). State is intentionally in-memory: on the
 * single-instance free tier that is sufficient, and a connection is cheap to
 * re-establish. At multi-instance scale each instance would subscribe to Kafka and
 * fan out to only the connections it holds, so no shared store is needed.
 */
@Component
public class SseHub {
    private static final Logger log = LoggerFactory.getLogger(SseHub.class);
    // Long timeout; the browser client reconnects, and a heartbeat keeps proxies from closing idle streams.
    private static final long STREAM_TIMEOUT_MS = 30 * 60 * 1000L;

    private record Connection(long userId, String role, SseEmitter emitter) {}

    private final List<Connection> connections = new CopyOnWriteArrayList<>();

    public SseEmitter register(long userId, String role) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        Connection connection = new Connection(userId, role, emitter);
        connections.add(connection);
        emitter.onCompletion(() -> connections.remove(connection));
        emitter.onTimeout(() -> { emitter.complete(); connections.remove(connection); });
        emitter.onError(error -> connections.remove(connection));
        send(connection, SseEmitter.event().name("connected").data(Map.of("ok", true)));
        return emitter;
    }

    /** Deliver to every connection owned by one user. */
    public void publishToUser(long userId, String eventName, Object payload) {
        for (Connection connection : connections) {
            if (connection.userId() == userId) {
                send(connection, SseEmitter.event().name(eventName).data(payload));
            }
        }
    }

    /** Broadcast to every connection holding a given role (e.g. the driver job board). */
    public void publishToRole(String role, String eventName, Object payload) {
        for (Connection connection : connections) {
            if (role.equals(connection.role())) {
                send(connection, SseEmitter.event().name(eventName).data(payload));
            }
        }
    }

    // Comment frames keep the connection warm without the client treating them as events.
    @Scheduled(fixedRate = 20000)
    public void heartbeat() {
        for (Connection connection : connections) {
            send(connection, SseEmitter.event().comment("ping"));
        }
    }

    private void send(Connection connection, SseEmitter.SseEventBuilder event) {
        try {
            connection.emitter().send(event);
        } catch (Exception e) {
            connections.remove(connection);
        }
    }
}
