import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { authGuard } from './app/core/guards/auth.guard';
import { onboardingCompleteGuard } from './app/core/guards/onboarding-complete.guard';
import { onboardingPageGuard } from './app/core/guards/onboarding-page.guard';
import { ProfileClubOnboardingPage } from './app/features/onboarding/pages/profile-club-onboarding.page';
import { CategoriesPage } from './app/features/categories/pages/categories.page';
import { TrainersPage } from './app/features/trainers/pages/trainers.page';
import { TeamsPage } from './app/features/teams/pages/teams.page';
import { VenuesPage } from './app/features/venues/pages/venues.page';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', component: Dashboard, canActivate: [onboardingCompleteGuard] },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes'), canActivate: [onboardingCompleteGuard] },
            { path: 'documentation', component: Documentation, canActivate: [onboardingCompleteGuard] },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes'), canActivate: [onboardingCompleteGuard] },
            { path: 'venues', component: VenuesPage, canActivate: [onboardingCompleteGuard] },
            { path: 'categories', component: CategoriesPage, canActivate: [onboardingCompleteGuard] },
            { path: 'trainers', component: TrainersPage, canActivate: [onboardingCompleteGuard] },
            { path: 'teams', component: TeamsPage, canActivate: [onboardingCompleteGuard] },
            { path: 'onboarding/profile-club', component: ProfileClubOnboardingPage, canActivate: [onboardingPageGuard] }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
