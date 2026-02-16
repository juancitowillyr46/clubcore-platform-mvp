import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Error } from './error';
import { RegisterPage } from '../../features/registration/pages/register/register.page';
import { AuthCallbackPage } from './callback';
import { guestOnlyGuard } from '../../core/guards/guest-only.guard';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login, canActivate: [guestOnlyGuard] },
    { path: 'register', component: RegisterPage, canActivate: [guestOnlyGuard] },
    { path: 'callback', component: AuthCallbackPage }
] as Routes;
