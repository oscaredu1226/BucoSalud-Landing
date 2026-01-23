import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const { data, error } = await auth.getSession();

  if (error) return router.parseUrl('/login');
  if (data.session) return true;

  return router.parseUrl('/login');
};
