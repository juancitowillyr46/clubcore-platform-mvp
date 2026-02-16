import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { environment } from '@/environments/environment';
import { AuthCallbackResult, RegisterPayload, RegisterResult } from '../models/registration.model';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
    private readonly supabase = inject(SupabaseService);

    async registerAdminAndClub(payload: RegisterPayload): Promise<RegisterResult> {
        const validationErrors = this.validate(payload);
        if (validationErrors.length > 0) {
            return { success: false, errors: validationErrors };
        }

        const { data, error } = await this.supabase.client.auth.signUp({
            email: payload.email.trim().toLowerCase(),
            password: payload.password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    club_name: payload.clubName.trim()
                }
            }
        });

        if (error) {
            return { success: false, errors: [error.message] };
        }

        if (!data.user) {
            return { success: false, errors: ['No fue posible crear el usuario en Supabase Auth.'] };
        }

        return {
            success: true,
            data: {
                message: 'Registro exitoso. Revisa tu email y confirma la cuenta para terminar la creación del club.',
                requiresEmailConfirmation: true
            }
        };
    }

    async completeOnboardingAfterConfirmation(): Promise<AuthCallbackResult> {
        const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
        if (sessionError) {
            return { success: false, errors: [sessionError.message] };
        }

        const session = sessionData.session;
        if (!session?.user) {
            return { success: false, errors: ['No se encontró sesión activa. Inicia sesión nuevamente.'] };
        }

        if (!session.user.email_confirmed_at) {
            return { success: false, errors: ['Tu email aún no está confirmado. Verifica tu bandeja de entrada.'] };
        }

        const clubName = String(session.user.user_metadata?.['club_name'] ?? '').trim();
        if (!clubName) {
            return { success: false, errors: ['No se encontró el nombre del club en metadata de registro.'] };
        }

        const fullNameRaw = session.user.user_metadata?.['full_name'];
        const fullName = typeof fullNameRaw === 'string' && fullNameRaw.trim() ? fullNameRaw.trim() : null;

        const { error: rpcError } = await this.supabase.client.rpc(environment.createTenantRpc, {
            p_user_id: session.user.id,
            p_full_name: fullName,
            p_club_name: clubName
        });

        if (rpcError) {
            return { success: false, errors: [rpcError.message] };
        }

        return {
            success: true,
            message: 'Cuenta confirmada y club inicializado correctamente.'
        };
    }

    private validate(payload: RegisterPayload): string[] {
        const errors: string[] = [];
        const email = payload.email.trim();
        const password = payload.password.trim();
        const clubName = payload.clubName.trim();

        if (!email) {
            errors.push('El email es obligatorio.');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('El email no tiene un formato válido.');
        }

        if (!password) {
            errors.push('La contraseña es obligatoria.');
        } else if (password.length < 8) {
            errors.push('La contraseña debe tener al menos 8 caracteres.');
        }

        if (!clubName) {
            errors.push('El nombre del club es obligatorio.');
        }

        return errors;
    }
}
