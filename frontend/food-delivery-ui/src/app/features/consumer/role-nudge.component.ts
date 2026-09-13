import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthSession } from '../../core/auth-session';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { PARTNER_APP_URL, DELIVERY_APP_URL } from '../../core/app-links';

/**
 * Owners and delivery partners can sign into the customer app, but their real
 * workspace is a separate app. Rather than a role view here, show a dismissible
 * banner pointing them to the right dashboard. Customers/admins see nothing.
 */
@Component({
  selector: 'app-role-nudge',
  template: `
    @if (show()) {
      <div class="role-nudge">
        <div class="role-nudge-text">
          <strong>{{ title() }}</strong>
          <span>{{ subtitle() }}</span>
        </div>
        <div class="role-nudge-actions">
          <a [href]="url()" target="_blank" rel="noopener">
            <button type="button">{{ cta() }}</button>
          </a>
          <button class="role-nudge-dismiss" type="button" (click)="dismiss()" aria-label="Dismiss">✕</button>
        </div>
      </div>
    }
  `
})
export class RoleNudgeComponent implements OnInit {
  private readonly auth = inject(AuthSession);
  private readonly api = inject(FoodDeliveryApi);

  private readonly dismissed = signal(false);
  private readonly ownedName = signal<string | null>(null);
  private readonly ownedCount = signal(0);

  private readonly role = computed(() => this.auth.user()?.role ?? null);
  protected readonly isOwner = computed(() => this.role() === 'RESTAURANT_OWNER');
  protected readonly isDriver = computed(() => this.role() === 'DELIVERY_PARTNER');

  protected readonly show = computed(() => (this.isOwner() || this.isDriver()) && !this.dismissed());
  protected readonly url = computed(() => (this.isOwner() ? PARTNER_APP_URL : DELIVERY_APP_URL));
  protected readonly cta = computed(() => (this.isOwner() ? 'Open Partner dashboard' : 'Open Delivery dashboard'));

  protected readonly title = computed(() => {
    if (this.isDriver()) return 'You’re signed in as a delivery partner';
    const count = this.ownedCount();
    if (count > 1) return `You manage ${count} restaurants`;
    const name = this.ownedName();
    return name ? `You manage ${name}` : 'You’re signed in as a restaurant owner';
  });

  protected readonly subtitle = computed(() =>
    this.isOwner()
      ? 'Head to the Partner dashboard to manage your menu and incoming orders.'
      : 'Head to the Delivery dashboard to see available jobs and track deliveries.'
  );

  ngOnInit(): void {
    const role = this.role();
    if (role) {
      try {
        this.dismissed.set(sessionStorage.getItem(this.dismissKey(role)) === '1');
      } catch {
        /* sessionStorage unavailable - just show the banner */
      }
    }

    // Only owners have a named restaurant to resolve; drivers don't need a lookup.
    if (this.isOwner()) {
      this.api.listMyRestaurants().subscribe({
        next: restaurants => {
          this.ownedCount.set(restaurants.length);
          this.ownedName.set(restaurants[0]?.name ?? null);
        },
        error: () => { /* leave the generic owner copy in place */ }
      });
    }
  }

  protected dismiss(): void {
    this.dismissed.set(true);
    const role = this.role();
    if (role) {
      try {
        sessionStorage.setItem(this.dismissKey(role), '1');
      } catch {
        /* ignore - dismissal simply won't persist */
      }
    }
  }

  private dismissKey(role: string): string {
    return `role-nudge-dismissed:${role}`;
  }
}
