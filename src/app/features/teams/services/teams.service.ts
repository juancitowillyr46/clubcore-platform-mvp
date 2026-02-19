import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { Team, TeamInput, TeamStaffAssignment } from '../models/team.model';

interface TeamRow {
    id: string;
    name: string;
    venue_id: string;
    category_id: string;
    head_trainer_id: string;
    logo_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface TeamStaffRow {
    team_id: string;
    trainer_id: string;
    role: string;
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<Team[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('teams')
            .select('id,name,venue_id,category_id,head_trainer_id,logo_url,is_active,created_at,updated_at')
            .eq('club_id', clubId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        const teamRows = (data ?? []) as TeamRow[];
        const teamIds = teamRows.map((item) => item.id);

        let staffByTeam = new Map<string, TeamStaffAssignment[]>();
        if (teamIds.length > 0) {
            const { data: staffRows, error: staffError } = await this.supabase.client
                .from('team_staff_members')
                .select('team_id,trainer_id,role')
                .in('team_id', teamIds)
                .eq('is_active', true)
                .is('deleted_at', null);

            if (staffError) {
                throw new Error(staffError.message);
            }

            staffByTeam = this.groupStaffRows((staffRows ?? []) as TeamStaffRow[]);
        }

        return teamRows.map((row) => ({
            id: row.id,
            name: row.name,
            venueId: row.venue_id,
            categoryId: row.category_id,
            headTrainerId: row.head_trainer_id,
            logoUrl: row.logo_url ?? '',
            staff: staffByTeam.get(row.id) ?? [],
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    async create(input: TeamInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { data, error } = await this.supabase.client
            .from('teams')
            .insert({
                club_id: clubId,
                name: input.name.trim(),
                venue_id: input.venueId,
                category_id: input.categoryId,
                head_trainer_id: input.headTrainerId,
                logo_url: input.logoUrl.trim() || null,
                is_active: true,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single();

        if (error || !data?.id) {
            throw new Error(error?.message ?? 'No se pudo crear el equipo.');
        }

        await this.replaceStaffMembers(String(data.id), input.staff);
    }

    async update(id: string, input: TeamInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { error } = await this.supabase.client
            .from('teams')
            .update({
                name: input.name.trim(),
                venue_id: input.venueId,
                category_id: input.categoryId,
                head_trainer_id: input.headTrainerId,
                logo_url: input.logoUrl.trim() || null,
                updated_at: now
            })
            .eq('id', id)
            .eq('club_id', clubId)
            .is('deleted_at', null);

        if (error) {
            throw new Error(error.message);
        }

        await this.replaceStaffMembers(id, input.staff);
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) {
            return;
        }

        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { data: validTeams, error: validTeamsError } = await this.supabase.client
            .from('teams')
            .select('id')
            .eq('club_id', clubId)
            .in('id', ids)
            .is('deleted_at', null);

        if (validTeamsError) {
            throw new Error(validTeamsError.message);
        }

        const validIds = (validTeams ?? []).map((item: any) => String(item.id));
        if (!validIds.length) {
            return;
        }

        const { error } = await this.supabase.client
            .from('teams')
            .update({
                is_active: false,
                deleted_at: now,
                updated_at: now
            })
            .in('id', validIds)
            .eq('club_id', clubId);

        if (error) {
            throw new Error(error.message);
        }

        const { error: staffError } = await this.supabase.client
            .from('team_staff_members')
            .update({
                is_active: false,
                deleted_at: now,
                updated_at: now
            })
            .in('team_id', validIds)
            .is('deleted_at', null);

        if (staffError) {
            throw new Error(staffError.message);
        }
    }

    private async replaceStaffMembers(teamId: string, staff: TeamStaffAssignment[]): Promise<void> {
        const now = new Date().toISOString();
        const { error: cleanupError } = await this.supabase.client
            .from('team_staff_members')
            .update({
                is_active: false,
                deleted_at: now,
                updated_at: now
            })
            .eq('team_id', teamId)
            .is('deleted_at', null);

        if (cleanupError) {
            throw new Error(cleanupError.message);
        }

        if (!staff.length) {
            return;
        }

        const rows = staff.map((item) => ({
            team_id: teamId,
            trainer_id: item.trainerId,
            role: item.role,
            is_active: true,
            created_at: now,
            updated_at: now
        }));

        const { error: insertError } = await this.supabase.client.from('team_staff_members').insert(rows);
        if (insertError) {
            throw new Error(insertError.message);
        }
    }

    private groupStaffRows(rows: TeamStaffRow[]): Map<string, TeamStaffAssignment[]> {
        const map = new Map<string, TeamStaffAssignment[]>();
        for (const row of rows) {
            const current = map.get(row.team_id) ?? [];
            current.push({
                trainerId: row.trainer_id,
                role: row.role
            });
            map.set(row.team_id, current);
        }
        return map;
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
}
