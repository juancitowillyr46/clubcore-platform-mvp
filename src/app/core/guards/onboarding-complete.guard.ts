import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from '@/app/features/onboarding/services/onboarding.service';

export const onboardingCompleteGuard: CanActivateFn = async () => {
    const onboardingService = inject(OnboardingService);
    const router = inject(Router);

    const isComplete = await onboardingService.isComplete();
    if (!isComplete) {
        return router.parseUrl('/onboarding/profile-club');
    }

    return true;
};
