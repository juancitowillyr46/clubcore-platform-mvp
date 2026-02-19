export interface TeamStaffAssignment {
    trainerId: string;
    role: string;
}

export interface Team {
    id: string;
    name: string;
    venueId: string;
    categoryId: string;
    headTrainerId: string;
    logoUrl: string;
    staff: TeamStaffAssignment[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TeamInput {
    name: string;
    venueId: string;
    categoryId: string;
    headTrainerId: string;
    logoUrl: string;
    staff: TeamStaffAssignment[];
}
