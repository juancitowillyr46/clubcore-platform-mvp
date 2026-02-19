export interface PlayerGuardian {
    fullName: string;
    lastName: string;
    middleName: string;
    email: string;
    phone: string;
    isPrimary: boolean;
}

export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string;
    birthDate: string;
    email: string;
    phone: string;
    nationality: string;
    playerCardNumber: string;
    photoUrl: string;
    position: string;
    dominantFoot: string;
    venueId: string;
    teamId: string;
    guardians: PlayerGuardian[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PlayerInput {
    firstName: string;
    lastName: string;
    middleName: string;
    birthDate: string;
    email: string;
    phone: string;
    nationality: string;
    playerCardNumber: string;
    photoUrl: string;
    position: string;
    dominantFoot: string;
    venueId: string;
    teamId: string;
    guardians: PlayerGuardian[];
}
