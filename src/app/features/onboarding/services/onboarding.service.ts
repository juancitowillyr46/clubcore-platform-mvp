import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { CompleteOnboardingPayload, OnboardingContext } from '../models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
    private readonly supabase = inject(SupabaseService);

    async getContext(): Promise<OnboardingContext> {
        const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
        if (sessionError || !sessionData.session?.user) {
            throw new Error('No se encontró una sesión activa.');
        }

        const userId = sessionData.session.user.id;

        const { data: membership, error: membershipError } = await this.supabase.client
            .from('club_members')
            .select('club_id')
            .eq('user_id', userId)
            .single();

        if (membershipError || !membership?.club_id) {
            throw new Error('No se encontró membresía de club para este usuario.');
        }

        const clubId = String(membership.club_id);

        const [{ data: profile, error: profileError }, { data: club, error: clubError }] = await Promise.all([
            this.supabase.client.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
            this.supabase.client.from('clubs').select('phone,address,photo_url').eq('id', clubId).single()
        ]);

        if (profileError) {
            throw new Error(profileError.message);
        }
        if (clubError) {
            throw new Error(clubError.message);
        }

        const fullName = String(profile?.full_name ?? '').trim();
        const phone = String(club?.phone ?? '').trim();
        const address = String(club?.address ?? '').trim();
        const photoUrl = String(club?.photo_url ?? '').trim();

        return {
            userId,
            clubId,
            fullName,
            phone,
            address,
            photoUrl,
            isComplete: Boolean(fullName && phone && address && photoUrl)
        };
    }

    async isComplete(): Promise<boolean> {
        try {
            const context = await this.getContext();
            return context.isComplete;
        } catch {
            return false;
        }
    }

    async uploadClubPhoto(file: File, clubId: string): Promise<string> {
        const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
        const path = `clubs/${clubId}/logo-${Date.now()}.${extension}`;

        const { error: uploadError } = await this.supabase.client.storage.from('club-assets').upload(path, file, {
            upsert: true
        });

        if (uploadError) {
            throw new Error(uploadError.message);
        }

        const { data } = this.supabase.client.storage.from('club-assets').getPublicUrl(path);
        if (!data.publicUrl) {
            throw new Error('No fue posible obtener la URL pública de la imagen.');
        }

        return data.publicUrl;
    }

    async completeOnboarding(payload: CompleteOnboardingPayload): Promise<void> {
        const context = await this.getContext();

        const { error: profileError } = await this.supabase.client.from('profiles').upsert(
            {
                id: context.userId,
                full_name: payload.fullName.trim()
            },
            {
                onConflict: 'id'
            }
        );

        if (profileError) {
            throw new Error(profileError.message);
        }

        const { error: clubError } = await this.supabase.client
            .from('clubs')
            .update({
                phone: payload.phone.trim(),
                address: payload.address.trim(),
                photo_url: payload.photoUrl.trim()
            })
            .eq('id', context.clubId);

        if (clubError) {
            throw new Error(clubError.message);
        }
    }
}
