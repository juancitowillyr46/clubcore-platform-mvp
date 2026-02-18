import { Injectable } from '@angular/core';
import { Category, CategoryInput } from '../models/category.model';

const MOCK_CATEGORIES: Category[] = [
    {
        id: 'cat_001',
        name: 'Sub-8',
        ageMin: 5,
        ageMax: 8,
        isActive: true,
        createdAt: '2026-02-10T10:30:00.000Z',
        updatedAt: '2026-02-10T10:30:00.000Z'
    },
    {
        id: 'cat_002',
        name: 'Sub-12',
        ageMin: 9,
        ageMax: 12,
        isActive: true,
        createdAt: '2026-02-11T09:00:00.000Z',
        updatedAt: '2026-02-11T09:00:00.000Z'
    },
    {
        id: 'cat_003',
        name: 'Sub-16',
        ageMin: 13,
        ageMax: 16,
        isActive: false,
        createdAt: '2026-01-25T14:45:00.000Z',
        updatedAt: '2026-02-01T08:15:00.000Z'
    }
];

@Injectable({ providedIn: 'root' })
export class CategoriesMockService {
    private categories: Category[] = [...MOCK_CATEGORIES];

    list(): Category[] {
        return [...this.categories];
    }

    create(input: CategoryInput): Category {
        this.ensureNoOverlap(input.ageMin, input.ageMax);

        const now = new Date().toISOString();
        const created: Category = {
            id: `cat_${Date.now()}`,
            name: input.name.trim(),
            ageMin: input.ageMin,
            ageMax: input.ageMax,
            isActive: true,
            createdAt: now,
            updatedAt: now
        };
        this.categories = [created, ...this.categories];
        return created;
    }

    update(id: string, input: CategoryInput): Category | null {
        this.ensureNoOverlap(input.ageMin, input.ageMax, id);

        let updatedCategory: Category | null = null;
        this.categories = this.categories.map((category) => {
            if (category.id !== id) {
                return category;
            }

            updatedCategory = {
                ...category,
                name: input.name.trim(),
                ageMin: input.ageMin,
                ageMax: input.ageMax,
                updatedAt: new Date().toISOString()
            };
            return updatedCategory;
        });

        return updatedCategory;
    }

    softDelete(ids: string[]): void {
        const now = new Date().toISOString();
        const set = new Set(ids);
        this.categories = this.categories.map((category) =>
            set.has(category.id)
                ? {
                      ...category,
                      isActive: false,
                      updatedAt: now
                  }
                : category
        );
    }

    private ensureNoOverlap(ageMin: number, ageMax: number, excludingId?: string): void {
        const overlaps = this.categories.some((category) => {
            if (!category.isActive) return false;
            if (excludingId && category.id === excludingId) return false;

            return ageMin <= category.ageMax && ageMax >= category.ageMin;
        });

        if (overlaps) {
            throw new Error('El rango de edad se solapa con otra categoría activa.');
        }
    }
}

