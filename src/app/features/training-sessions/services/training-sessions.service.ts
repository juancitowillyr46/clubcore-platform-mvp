import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { TrainingSession, TrainingSessionInput } from '../models/training-session.model';

interface TrainingSessionRow {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    team_id: string;
    location_id: string;
    coach_id: string | null;
    status: 'PROGRAMMED';
    created_at: string;
    created_by: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingSessionsService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<TrainingSession[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('training_sessions')
            .select('id,title,start_date,end_date,start_time,end_time,duration_minutes,team_id,location_id,coach_id,status,created_at,created_by')
            .eq('club_id', clubId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []).map((row) => this.mapRow(row as TrainingSessionRow));
    }

    async create(input: TrainingSessionInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const userId = await this.getCurrentUserId();
        const now = new Date().toISOString();

        const { error } = await this.supabase.client.from('training_sessions').insert({
            club_id: clubId,
            title: input.title.trim(),
            start_date: input.startDate,
            end_date: input.endDate,
            start_time: input.startTime,
            end_time: input.endTime,
            duration_minutes: input.durationMinutes,
            team_id: input.teamId,
            location_id: input.locationId,
            coach_id: input.coachId || null,
            status: 'PROGRAMMED',
            created_at: now,
            updated_at: now,
            created_by: userId
        });

        if (error) {
            throw new Error(error.message);
        }
    }

    async update(id: string, input: TrainingSessionInput): Promise<void> {
        const clubId = await this.getCurrentClubId();

        const { error } = await this.supabase.client
            .from('training_sessions')
            .update({
                title: input.title.trim(),
                start_date: input.startDate,
                end_date: input.endDate,
                start_time: input.startTime,
                end_time: input.endTime,
                duration_minutes: input.durationMinutes,
                team_id: input.teamId,
                location_id: input.locationId,
                coach_id: input.coachId || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('club_id', clubId)
            .is('deleted_at', null);

        if (error) {
            throw new Error(error.message);
        }
    }

    private mapRow(row: TrainingSessionRow): TrainingSession {
        return {
            id: row.id,
            title: row.title,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time.slice(0, 5),
            endTime: row.end_time.slice(0, 5),
            durationMinutes: row.duration_minutes,
            teamId: row.team_id,
            locationId: row.location_id,
            coachId: row.coach_id ?? '',
            status: row.status,
            createdAt: row.created_at,
            createdBy: row.created_by
        };
    }

    private async getCurrentUserId(): Promise<string> {
        const { data, error } = await this.supabase.client.auth.getSession();
        if (error || !data.session?.user?.id) {
            throw new Error('No se encontró una sesión activa.');
        }
        return data.session.user.id;
    }

    private async getCurrentClubId(): Promise<string> {
        const userId = await this.getCurrentUserId();
        const { data, error } = await this.supabase.client.from('club_members').select('club_id').eq('user_id', userId).single();
        if (error || !data?.club_id) {
            throw new Error('No se encontró membresía de club para este usuario.');
        }
        return String(data.club_id);
    }
}
