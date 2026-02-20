export interface FieldLocation {
    id: string;
    name: string;
    address: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FieldLocationInput {
    name: string;
    address: string;
}
