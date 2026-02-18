export interface Venue {
    id: string;
    name: string;
    address: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VenueInput {
    name: string;
    address: string;
    isDefault: boolean;
}
