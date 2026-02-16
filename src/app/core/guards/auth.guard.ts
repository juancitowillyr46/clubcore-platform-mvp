import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    const { data, error } = await supabase.client.auth.getSession();
    if (error || !data.session?.user) {
        return router.parseUrl('/auth/login');
    }

    return true;
};
