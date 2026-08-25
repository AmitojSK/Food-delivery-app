import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthSession);
  const router = inject(Router);
  return auth.isAdmin() || router.createUrlTree(['/restaurants']);
};
