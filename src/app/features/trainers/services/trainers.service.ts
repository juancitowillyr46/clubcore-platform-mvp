import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { Trainer, TrainerInput } from '../models/trainer.model';

interface TrainerRow {
    id: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
    about: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class TrainersService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<Trainer[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('trainers')
            .select('id,first_name,last_name,middle_name,email,phone,photo_url,about,is_active,created_at,updated_at')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []).map((row) => this.mapRow(row as TrainerRow));
    }

    async create(input: TrainerInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { error } = await this.supabase.client.from('trainers').insert({
            club_id: clubId,
            first_name: input.firstName.trim(),
            last_name: input.lastName.trim(),
            middle_name: input.middleName.trim(),
            email: input.email.trim() || null,
            phone: input.phone.trim() || null,
            photo_url: input.photoUrl.trim() || null,
            about: input.about.trim() || null,
            is_active: true,
            created_at: now,
            updated_at: now
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async update(id: string, input: TrainerInput): Promise<void> {
        const clubId = await this.getCurrentClubId();

        const { error } = await this.supabase.client
            .from('trainers')
            .update({
                first_name: input.firstName.trim(),
                last_name: input.lastName.trim(),
                middle_name: input.middleName.trim(),
                email: input.email.trim() || null,
                phone: input.phone.trim() || null,
                photo_url: input.photoUrl.trim() || null,
                about: input.about.trim() || null,
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
            .from('trainers')
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

    private mapRow(row: TrainerRow): Trainer {
        return {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            middleName: row.middle_name,
            email: row.email ?? '',
            phone: row.phone ?? '',
            photoUrl: row.photo_url ?? '',
            about: row.about ?? '',
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

