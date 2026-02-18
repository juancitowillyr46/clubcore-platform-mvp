export interface Category {
    id: string;
    name: string;
    ageMin: number;
    ageMax: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CategoryInput {
    name: string;
    ageMin: number;
    ageMax: number;
}

