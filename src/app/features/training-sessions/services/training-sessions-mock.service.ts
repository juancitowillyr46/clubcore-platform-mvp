import { Injectable } from '@angular/core';
import { TrainingSession, TrainingSessionInput } from '../models/training-session.model';

@Injectable({ providedIn: 'root' })
export class TrainingSessionsMockService {
    private sessions: TrainingSession[] = [
        {
            id: 'ts-1',
            title: 'Trabajo tecnico Sub-12',
            startDate: '2026-02-20',
            endDate: '2026-02-20',
            startTime: '16:00',
            endTime: '17:30',
            durationMinutes: 90,
            teamId: 'team-u12',
            locationId: 'field-1',
            coachId: 'coach-1',
            status: 'PROGRAMMED',
            createdAt: new Date().toISOString(),
            createdBy: 'mock-admin'
        }
    ];

    async list(): Promise<TrainingSession[]> {
        return [...this.sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async create(input: TrainingSessionInput): Promise<void> {
        const now = new Date().toISOString();
        this.sessions = [
            {
                id: this.generateId(),
                ...input,
                status: 'PROGRAMMED',
                createdAt: now,
                createdBy: 'mock-admin'
            },
            ...this.sessions
        ];
    }

    async update(id: string, input: TrainingSessionInput): Promise<void> {
        this.sessions = this.sessions.map((item) => (item.id === id ? { ...item, ...input } : item));
    }

    private generateId(): string {
        return `ts-${Math.random().toString(36).slice(2, 10)}`;
    }
}
