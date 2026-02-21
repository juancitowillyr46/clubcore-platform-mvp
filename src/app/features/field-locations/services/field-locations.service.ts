import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { FieldLocation, FieldLocationInput } from '../models/field-location.model';

interface FieldLocationRow {
    id: string;
    name: string;
    address: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class FieldLocationsService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<FieldLocation[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('field_locations')
            .select('id,name,address,is_active,created_at,updated_at')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []).map((row) => this.mapRow(row as FieldLocationRow));
    }

    async create(input: FieldLocationInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();
        const { error } = await this.supabase.client.from('field_locations').insert({
            club_id: clubId,
            name: input.name.trim(),
            address: input.address.trim(),
            is_active: true,
            created_at: now,
            updated_at: now
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async update(id: string, input: FieldLocationInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const { error } = await this.supabase.client
            .from('field_locations')
            .update({
                name: input.name.trim(),
                address: input.address.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('club_id', clubId)
            .eq('is_active', true);

        if (error) {
            throw new Error(error.message);
        }
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) return;
        const clubId = await this.getCurrentClubId();
        const { error } = await this.supabase.client
            .from('field_locations')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('club_id', clubId)
            .in('id', ids);

        if (error) {
            throw new Error(error.message);
        }
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

    private mapRow(row: FieldLocationRow): FieldLocation {
        return {
            id: row.id,
            name: row.name,
            address: row.address,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
