import { Injectable } from '@angular/core';
import { Player, PlayerInput } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlayersMockService {
    private players: Player[] = [
        {
            id: 'player-1',
            firstName: 'Mateo',
            lastName: 'Gomez',
            middleName: 'Lopez',
            birthDate: '2018-04-08',
            email: '',
            phone: '',
            nationality: 'Colombiana',
            playerCardNumber: 'CCM-001',
            photoUrl: '',
            position: 'Delantero',
            dominantFoot: 'Derecho',
            venueId: 'venue-central',
            teamId: 'team-u8',
            guardians: [
                {
                    fullName: 'Andrea',
                    lastName: 'Gomez',
                    middleName: 'Rojas',
                    email: '',
                    phone: '+57 301 111 2233',
                    isPrimary: true
                }
            ],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    async list(): Promise<Player[]> {
        return [...this.players].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async create(input: PlayerInput): Promise<void> {
        const now = new Date().toISOString();
        this.players = [
            {
                id: this.generateId(),
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                middleName: input.middleName.trim(),
                birthDate: input.birthDate,
                email: input.email.trim(),
                phone: input.phone.trim(),
                nationality: input.nationality.trim(),
                playerCardNumber: input.playerCardNumber.trim(),
                photoUrl: input.photoUrl.trim(),
                position: input.position.trim(),
                dominantFoot: input.dominantFoot.trim(),
                venueId: input.venueId,
                teamId: input.teamId,
                guardians: input.guardians,
                isActive: true,
                createdAt: now,
                updatedAt: now
            },
            ...this.players
        ];
    }

    async update(id: string, input: PlayerInput): Promise<void> {
        const now = new Date().toISOString();
        this.players = this.players.map((player) =>
            player.id === id
                ? {
                      ...player,
                      firstName: input.firstName.trim(),
                      lastName: input.lastName.trim(),
                      middleName: input.middleName.trim(),
                      birthDate: input.birthDate,
                      email: input.email.trim(),
                      phone: input.phone.trim(),
                      nationality: input.nationality.trim(),
                      playerCardNumber: input.playerCardNumber.trim(),
                      photoUrl: input.photoUrl.trim(),
                      position: input.position.trim(),
                      dominantFoot: input.dominantFoot.trim(),
                      venueId: input.venueId,
                      teamId: input.teamId,
                      guardians: input.guardians,
                      updatedAt: now
                  }
                : player
        );
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) return;

        const now = new Date().toISOString();
        const idsSet = new Set(ids);
        this.players = this.players.map((player) => (idsSet.has(player.id) ? { ...player, isActive: false, updatedAt: now } : player));
    }

    private generateId(): string {
        return `player-${Math.random().toString(36).slice(2, 10)}`;
    }
}
