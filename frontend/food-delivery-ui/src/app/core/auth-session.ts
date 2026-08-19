import { Injectable, computed, signal } from '@angular/core';
import { AuthenticationResponse, User } from './models';

interface StoredSession {
  accessToken: string;
  expiresAt: number;
  user: User;
}

const storageKey = 'food-delivery-session';

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly session = signal<StoredSession | null>(this.readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  start(response: AuthenticationResponse): void {
    const session: StoredSession = {
      accessToken: response.accessToken,
      expiresAt: Date.now() + response.expiresIn * 1000,
      user: response.user
    };
    this.session.set(session);
    localStorage.setItem(storageKey, JSON.stringify(session));
  }

  clear(): void {
    this.session.set(null);
    localStorage.removeItem(storageKey);
  }

  private readStoredSession(): StoredSession | null {
    try {
      const value = localStorage.getItem(storageKey);
      if (!value) return null;
      const session = JSON.parse(value) as StoredSession;
      if (!session.accessToken || !session.user || session.expiresAt <= Date.now()) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(storageKey);
      return null;
    }
  }
}
