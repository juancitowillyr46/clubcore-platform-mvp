import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { Category, CategoryInput } from '../models/category.model';

interface CategoryRow {
    id: string;
    name: string;
    age_min: number;
    age_max: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<Category[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('categories')
            .select('id,name,age_min,age_max,is_active,created_at,updated_at')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []).map((row) => this.mapRow(row as CategoryRow));
    }

    async create(input: CategoryInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        await this.assertNoOverlap(clubId, input.ageMin, input.ageMax);

        const now = new Date().toISOString();
        const { error } = await this.supabase.client.from('categories').insert({
            club_id: clubId,
            name: input.name.trim(),
            age_min: input.ageMin,
            age_max: input.ageMax,
            is_active: true,
            created_at: now,
            updated_at: now
        });

        if (error) {
            throw new Error(this.normalizeDbError(error.message));
        }
    }

    async update(id: string, input: CategoryInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        await this.assertNoOverlap(clubId, input.ageMin, input.ageMax, id);

        const { error } = await this.supabase.client
            .from('categories')
            .update({
                name: input.name.trim(),
                age_min: input.ageMin,
                age_max: input.ageMax,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('club_id', clubId)
            .eq('is_active', true);

        if (error) {
            throw new Error(this.normalizeDbError(error.message));
        }
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) {
            return;
        }

        const clubId = await this.getCurrentClubId();
        const { error } = await this.supabase.client
            .from('categories')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('club_id', clubId)
            .in('id', ids);

        if (error) {
            throw new Error(this.normalizeDbError(error.message));
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

    private async assertNoOverlap(clubId: string, ageMin: number, ageMax: number, excludingId?: string): Promise<void> {
        let query = this.supabase.client
            .from('categories')
            .select('id,age_min,age_max')
            .eq('club_id', clubId)
            .eq('is_active', true);

        if (excludingId) {
            query = query.neq('id', excludingId);
        }

        const { data, error } = await query;
        if (error) {
            throw new Error(error.message);
        }

        const overlaps = (data ?? []).some((row: any) => ageMin <= Number(row.age_max) && ageMax >= Number(row.age_min));
        if (overlaps) {
            throw new Error('El rango de edad se solapa con otra categoría activa.');
        }
    }

    private normalizeDbError(message: string): string {
        const normalized = message.toLowerCase();
        if (normalized.includes('categories_no_overlap_active')) {
            return 'El rango de edad se solapa con otra categoría activa.';
        }
        return message;
    }

    private mapRow(row: CategoryRow): Category {
        return {
            id: row.id,
            name: row.name,
            ageMin: row.age_min,
            ageMax: row.age_max,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

