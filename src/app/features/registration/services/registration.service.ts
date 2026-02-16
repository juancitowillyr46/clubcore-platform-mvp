import { Injectable } from '@angular/core';
import { RegisterPayload, RegisterResult } from '../models/registration.model';

interface MockUser {
    id: string;
    email: string;
}

interface MockClub {
    id: string;
    name: string;
    adminUserId: string;
}

const MOCK_USERS: MockUser[] = [{ id: 'usr_001', email: 'owner@clubcore.dev' }];
const MOCK_CLUBS: MockClub[] = [{ id: 'club_001', name: 'Club Demo', adminUserId: 'usr_001' }];

@Injectable({ providedIn: 'root' })
export class RegistrationService {
    async registerAdminAndClub(payload: RegisterPayload): Promise<RegisterResult> {
        const validationErrors = this.validate(payload);
        if (validationErrors.length > 0) {
            return { success: false, errors: validationErrors };
        }

        await new Promise((resolve) => setTimeout(resolve, 450));

        const email = payload.email.trim().toLowerCase();
        const clubName = payload.clubName.trim().toLowerCase();

        if (MOCK_USERS.some((user) => user.email.toLowerCase() === email)) {
            return { success: false, errors: ['Ese email ya está registrado.'] };
        }

        if (MOCK_CLUBS.some((club) => club.name.toLowerCase() === clubName)) {
            return { success: false, errors: ['Ese nombre de club ya existe.'] };
        }

        const adminId = `usr_${Date.now()}`;
        const clubId = `club_${Date.now()}`;

        MOCK_USERS.push({ id: adminId, email: payload.email.trim() });
        MOCK_CLUBS.push({ id: clubId, name: payload.clubName.trim(), adminUserId: adminId });

        return {
            success: true,
            data: {
                adminId,
                clubId,
                message: 'Cuenta admin y club creados correctamente (mock).'
            }
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
