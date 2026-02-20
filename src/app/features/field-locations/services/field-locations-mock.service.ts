import { Injectable } from '@angular/core';
import { FieldLocation, FieldLocationInput } from '../models/field-location.model';

@Injectable({ providedIn: 'root' })
export class FieldLocationsMockService {
    private locations: FieldLocation[] = [
        {
            id: 'loc-1',
            name: 'Cancha Municipal Norte',
            address: 'Av. Principal 123, Zona Norte',
            isActive: true,
            createdAt: new Date('2026-01-05T10:00:00.000Z').toISOString(),
            updatedAt: new Date('2026-01-05T10:00:00.000Z').toISOString()
        },
        {
            id: 'loc-2',
            name: 'Complejo Deportivo Sur',
            address: 'Calle 45 # 12-80, Barrio San José',
            isActive: true,
            createdAt: new Date('2026-01-11T16:30:00.000Z').toISOString(),
            updatedAt: new Date('2026-01-11T16:30:00.000Z').toISOString()
        },
        {
            id: 'loc-3',
            name: 'Polideportivo Central',
            address: 'Carrera 9 # 20-15, Centro',
            isActive: false,
            createdAt: new Date('2026-01-20T08:15:00.000Z').toISOString(),
            updatedAt: new Date('2026-02-02T08:15:00.000Z').toISOString()
        }
    ];

    async list(): Promise<FieldLocation[]> {
        return [...this.locations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async create(input: FieldLocationInput): Promise<void> {
        const now = new Date().toISOString();
        this.locations = [
            {
                id: this.generateId(),
                name: input.name.trim(),
                address: input.address.trim(),
                isActive: true,
                createdAt: now,
                updatedAt: now
            },
            ...this.locations
        ];
    }

    async update(id: string, input: FieldLocationInput): Promise<void> {
        const now = new Date().toISOString();
        this.locations = this.locations.map((item) =>
            item.id === id
                ? {
                      ...item,
                      name: input.name.trim(),
                      address: input.address.trim(),
                      updatedAt: now
                  }
                : item
        );
    }

    async softDelete(ids: string[]): Promise<void> {
        if (!ids.length) return;
        const idSet = new Set(ids);
        const now = new Date().toISOString();
        this.locations = this.locations.map((item) =>
            idSet.has(item.id)
                ? {
                      ...item,
                      isActive: false,
                      updatedAt: now
                  }
                : item
        );
    }

    private generateId(): string {
        return `loc-${Math.random().toString(36).slice(2, 10)}`;
    }
}
