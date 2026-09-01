import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSession } from './auth-session';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthSession).accessToken();
  const isBackendRequest = /^\/(user|delivery|order)-api\//.test(request.url);

  return next(token && isBackendRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request);
};
