export interface Trainer {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    phone: string;
    photoUrl: string;
    about: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TrainerInput {
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    phone: string;
    photoUrl: string;
    about: string;
}
