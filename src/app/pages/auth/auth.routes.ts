import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Error } from './error';
import { RegisterPage } from '../../features/registration/pages/register/register.page';
import { AuthCallbackPage } from './callback';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login },
    { path: 'register', component: RegisterPage },
    { path: 'callback', component: AuthCallbackPage }
] as Routes;
