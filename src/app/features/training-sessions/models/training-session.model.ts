export type TrainingSessionStatus = 'PROGRAMMED';

export interface TrainingSession {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    teamId: string;
    locationId: string;
    coachId: string;
    status: TrainingSessionStatus;
    createdAt: string;
    createdBy: string;
}

export interface TrainingSessionInput {
    title: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    teamId: string;
    locationId: string;
    coachId: string;
}
