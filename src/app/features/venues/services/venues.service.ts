import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { Venue, VenueInput } from '../models/venue.model';

interface VenueRow {
    id: string;
    name: string;
    address: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class VenuesService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<Venue[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('venues')
            .select('id,name,address,is_default,is_active,created_at,updated_at')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []).map((row) => this.mapRow(row as VenueRow));
    }

    async create(input: VenueInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();
        const shouldBeDefault = input.isDefault || !(await this.hasDefaultActiveVenue(clubId));

        if (shouldBeDefault) {
            await this.clearDefaultFlag(clubId);
        }

        const { error } = await this.supabase.client.from('venues').insert({
            club_id: clubId,
            name: input.name.trim(),
            address: input.address.trim(),
            is_default: shouldBeDefault,
            is_active: true,
            created_at: now,
            updated_at: now
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async update(id: string, input: VenueInput): Promise<void> {
        const clubId = await this.getCurrentClubId();

        if (input.isDefault) {
            await this.clearDefaultFlag(clubId);
        }

        const { error } = await this.supabase.client
            .from('venues')
            .update({
                name: input.name.trim(),
                address: input.address.trim(),
                is_default: input.isDefault,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('club_id', clubId)
            .eq('is_active', true);

        if (error) {
            throw new Error(error.message);
        }

        await this.ensureOneDefaultActive(clubId);
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) {
            return;
        }

        const clubId = await this.getCurrentClubId();
        const { error } = await this.supabase.client
            .from('venues')
            .update({
                is_active: false,
                is_default: false,
                updated_at: new Date().toISOString()
            })
            .eq('club_id', clubId)
            .in('id', ids);

        if (error) {
            throw new Error(error.message);
        }

        await this.ensureOneDefaultActive(clubId);
    }

    private async getCurrentClubId(): Promise<string> {
        const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
        if (sessionError || !sessionData.session?.user?.id) {
            throw new Error('No se encontró una sesión activa.');
        }

        const userId = sessionData.session.user.id;
        const { data, error } = await this.supabase.client.from('club_members').select('club_id').eq('user_id', userId).single();

        if (error || !data?.club_id) {
            throw new Error('No se encontró membresía de club para este usuario.');
        }

        return String(data.club_id);
    }

    private async hasDefaultActiveVenue(clubId: string): Promise<boolean> {
        const { data, error } = await this.supabase.client
            .from('venues')
            .select('id')
            .eq('club_id', clubId)
            .eq('is_active', true)
            .eq('is_default', true)
            .limit(1);

        if (error) {
            throw new Error(error.message);
        }

        return Array.isArray(data) && data.length > 0;
    }

    private async clearDefaultFlag(clubId: string): Promise<void> {
        const { error } = await this.supabase.client
            .from('venues')
            .update({
                is_default: false,
                updated_at: new Date().toISOString()
            })
            .eq('club_id', clubId)
            .eq('is_active', true)
            .eq('is_default', true);

        if (error) {
            throw new Error(error.message);
        }
    }

    private async ensureOneDefaultActive(clubId: string): Promise<void> {
        const hasDefault = await this.hasDefaultActiveVenue(clubId);
        if (hasDefault) {
            return;
        }

        const { data, error } = await this.supabase.client
            .from('venues')
            .select('id')
            .eq('club_id', clubId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        if (!data?.id) {
            return;
        }

        const { error: updateError } = await this.supabase.client
            .from('venues')
            .update({
                is_default: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', String(data.id))
            .eq('club_id', clubId);

        if (updateError) {
            throw new Error(updateError.message);
        }
    }

    private mapRow(row: VenueRow): Venue {
        return {
            id: row.id,
            name: row.name,
            address: row.address,
            isDefault: row.is_default,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

