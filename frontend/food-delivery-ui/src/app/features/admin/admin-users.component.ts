import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="panel">
      <form class="form-grid" [formGroup]="form" (ngSubmit)="create()">
        <label>First name<input type="text" formControlName="firstName" autocomplete="given-name" /></label>
        <label>Last name<input type="text" formControlName="lastName" autocomplete="family-name" /></label>
        <label>Email<input type="email" formControlName="email" autocomplete="email" /></label>
        <label>Phone<input type="tel" formControlName="phoneNumber" autocomplete="tel" /></label>
        <label>Password<input type="password" formControlName="password" autocomplete="new-password" /></label>
        <button type="submit" [disabled]="notifications.saving()">Create User</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            @for (user of store.users(); track user.id) {
              <tr>
                <td>{{ user.id }}</td>
                <td>{{ user.firstName }} {{ user.lastName }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.phoneNumber }}</td>
                <td>{{ user.role }}</td>
                <td><span class="badge">{{ user.active ? 'Active' : 'Inactive' }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="6">No users yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class AdminUsersComponent {
  private readonly api = inject(FoodDeliveryApi);
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
  });

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.notifications.saving.set(true);
    this.notifications.clearMessages();
    this.api.createUser(this.form.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: user => {
          this.store.users.update(users => [user, ...users]);
          this.form.reset();
          this.notifications.notice.set('User created');
        },
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }
}
