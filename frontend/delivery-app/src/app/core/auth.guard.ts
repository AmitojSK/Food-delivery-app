import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

export const authGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  if (session.isAuthenticated() && session.isDeliveryPartner()) {
    return true;
  }
  return inject(Router).createUrlTree(['/auth']);
};
