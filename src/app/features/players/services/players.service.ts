import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@/app/core/services/supabase.service';
import { Player, PlayerGuardian, PlayerInput } from '../models/player.model';

interface PlayerRow {
    id: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    birth_date: string | null;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    player_card_number: string | null;
    photo_url: string | null;
    position: string | null;
    dominant_foot: string | null;
    venue_id: string | null;
    team_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface GuardianRow {
    player_id: string;
    full_name: string;
    last_name: string;
    middle_name: string | null;
    email: string | null;
    phone: string;
    is_primary: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlayersService {
    private readonly supabase = inject(SupabaseService);

    async list(): Promise<Player[]> {
        const clubId = await this.getCurrentClubId();
        const { data, error } = await this.supabase.client
            .from('players')
            .select('id,first_name,last_name,middle_name,birth_date,email,phone,nationality,player_card_number,photo_url,position,dominant_foot,venue_id,team_id,is_active,created_at,updated_at')
            .eq('club_id', clubId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        const playerRows = (data ?? []) as PlayerRow[];
        const playerIds = playerRows.map((item) => item.id);

        let guardiansByPlayer = new Map<string, PlayerGuardian[]>();
        if (playerIds.length > 0) {
            const { data: guardiansData, error: guardiansError } = await this.supabase.client
                .from('player_guardians')
                .select('player_id,full_name,last_name,middle_name,email,phone,is_primary')
                .in('player_id', playerIds)
                .eq('is_active', true)
                .is('deleted_at', null);

            if (guardiansError) {
                throw new Error(guardiansError.message);
            }

            guardiansByPlayer = this.groupGuardians((guardiansData ?? []) as GuardianRow[]);
        }

        return playerRows.map((row) => ({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            middleName: row.middle_name,
            birthDate: row.birth_date ?? '',
            email: row.email ?? '',
            phone: row.phone ?? '',
            nationality: row.nationality ?? '',
            playerCardNumber: row.player_card_number ?? '',
            photoUrl: row.photo_url ?? '',
            position: row.position ?? '',
            dominantFoot: row.dominant_foot ?? '',
            venueId: row.venue_id ?? '',
            teamId: row.team_id ?? '',
            guardians: guardiansByPlayer.get(row.id) ?? [],
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    async create(input: PlayerInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { data, error } = await this.supabase.client
            .from('players')
            .insert({
                club_id: clubId,
                first_name: input.firstName.trim(),
                last_name: input.lastName.trim(),
                middle_name: input.middleName.trim() || '',
                birth_date: input.birthDate || null,
                email: input.email.trim() || null,
                phone: input.phone.trim() || null,
                nationality: input.nationality.trim() || null,
                player_card_number: input.playerCardNumber.trim() || null,
                photo_url: input.photoUrl.trim() || null,
                position: input.position.trim() || null,
                dominant_foot: input.dominantFoot.trim() || null,
                venue_id: input.venueId || null,
                team_id: input.teamId || null,
                is_active: true,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single();

        if (error || !data?.id) {
            throw new Error(error?.message ?? 'No se pudo crear el jugador.');
        }

        await this.replaceGuardians(String(data.id), clubId, input.guardians);
    }

    async update(id: string, input: PlayerInput): Promise<void> {
        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { error } = await this.supabase.client
            .from('players')
            .update({
                first_name: input.firstName.trim(),
                last_name: input.lastName.trim(),
                middle_name: input.middleName.trim() || '',
                birth_date: input.birthDate || null,
                email: input.email.trim() || null,
                phone: input.phone.trim() || null,
                nationality: input.nationality.trim() || null,
                player_card_number: input.playerCardNumber.trim() || null,
                photo_url: input.photoUrl.trim() || null,
                position: input.position.trim() || null,
                dominant_foot: input.dominantFoot.trim() || null,
                venue_id: input.venueId || null,
                team_id: input.teamId || null,
                updated_at: now
            })
            .eq('id', id)
            .eq('club_id', clubId)
            .is('deleted_at', null);

        if (error) {
            throw new Error(error.message);
        }

        await this.replaceGuardians(id, clubId, input.guardians);
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) return;

        const clubId = await this.getCurrentClubId();
        const now = new Date().toISOString();

        const { error } = await this.supabase.client
            .from('players')
            .update({
                is_active: false,
                deleted_at: now,
                updated_at: now
            })
            .eq('club_id', clubId)
            .in('id', ids)
            .is('deleted_at', null);

        if (error) {
            throw new Error(error.message);
        }

        const { error: guardianError } = await this.supabase.client
            .from('player_guardians')
            .update({
                is_active: false,
                deleted_at: now,
                updated_at: now
            })
            .in('player_id', ids)
            .is('deleted_at', null);

        if (guardianError) {
            throw new Error(guardianError.message);
        }
    }

    private async replaceGuardians(playerId: string, clubId: string, guardians: PlayerGuardian[]): Promise<void> {
        const now = new Date().toISOString();

        const { error: cleanupError } = await this.supabase.client
            .from('player_guardians')
            .update({
                is_active: false,
                deleted_at: now,
                updated_at: now
            })
            .eq('player_id', playerId)
            .is('deleted_at', null);

        if (cleanupError) {
            throw new Error(cleanupError.message);
        }

        if (!guardians.length) {
            return;
        }

        const rows = guardians.map((item) => ({
            club_id: clubId,
            player_id: playerId,
            full_name: item.fullName.trim(),
            last_name: item.lastName.trim(),
            middle_name: item.middleName.trim() || null,
            email: item.email.trim() || null,
            phone: item.phone.trim(),
            is_primary: item.isPrimary,
            is_active: true,
            created_at: now,
            updated_at: now
        }));

        const { error: insertError } = await this.supabase.client.from('player_guardians').insert(rows);
        if (insertError) {
            throw new Error(insertError.message);
        }
    }

    private groupGuardians(rows: GuardianRow[]): Map<string, PlayerGuardian[]> {
        const map = new Map<string, PlayerGuardian[]>();
        for (const row of rows) {
            const current = map.get(row.player_id) ?? [];
            current.push({
                fullName: row.full_name,
                lastName: row.last_name,
                middleName: row.middle_name ?? '',
                email: row.email ?? '',
                phone: row.phone,
                isPrimary: row.is_primary
            });
            map.set(row.player_id, current);
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
