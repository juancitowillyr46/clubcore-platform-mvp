import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { Venue } from '../models/venue.model';
import { VenuesService } from '../services/venues.service';

type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

@Component({
    selector: 'app-venues-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, MessageModule, ButtonModule, DialogModule, PaginatorModule, TagModule, CheckboxModule, SelectModule],
    template: `
        <div class="p-4 sm:p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div class="mb-5">
                <h1 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-surface-0">Sedes</h1>
                <p class="text-muted-color">Gestiona tus sedes de forma rápida desde móvil o escritorio.</p>
            </div>

            @if (pageErrors().length > 0) {
                <div class="mb-4 space-y-2">
                    @for (error of pageErrors(); track error) {
                        <p-message severity="error" [text]="error"></p-message>
                    }
                </div>
            }

            <div class="sticky top-0 z-10 bg-white dark:bg-surface-900 pb-3 mb-4 border-b border-surface-200 dark:border-surface-800">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <input pInputText [value]="searchTerm()" (input)="onSearchChange($event)" class="w-full lg:col-span-2" placeholder="Buscar por nombre..." />
                    <p-select [options]="sortOptions" optionLabel="label" optionValue="value" [ngModel]="sortBy()" (onChange)="onSortChange($event.value)" placeholder="Ordenar por" class="w-full" />
                    <p-button label="Nueva sede" icon="pi pi-plus" [disabled]="loading()" (onClick)="openCreateDialog()"></p-button>
                </div>
                <p class="text-sm text-muted-color m-0">{{ filteredVenues().length }} sedes</p>
            </div>

            <div class="flex flex-wrap gap-2 mb-4">
                <p-button
                    label="Dar de baja seleccionadas"
                    icon="pi pi-trash"
                    severity="danger"
                    [outlined]="true"
                    [disabled]="selectedIds().length === 0 || loading()"
                    (onClick)="askBulkDeactivate()"
                ></p-button>
                <span class="text-sm text-muted-color self-center">Seleccionadas: {{ selectedIds().length }}</span>
            </div>

            @if (loading()) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">
                    Cargando sedes...
                </div>
            } @else if (pagedVenues().length === 0) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">
                    No hay sedes para mostrar con el filtro actual.
                </div>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (venue of pagedVenues(); track venue.id) {
                        <article class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                            <div class="flex items-start justify-between gap-2 mb-3">
                                <div class="flex items-start gap-2">
                                    <p-checkbox
                                        [binary]="true"
                                        [ngModel]="isSelected(venue.id)"
                                        (onChange)="toggleSelection(venue.id, !!$event.checked)"
                                    ></p-checkbox>
                                    <div>
                                        <p class="text-base font-semibold text-surface-900 dark:text-surface-0 leading-tight m-0">{{ venue.name }}</p>
                                        <p class="text-xs text-muted-color mt-1">{{ formatDate(venue.createdAt) }}</p>
                                    </div>
                                </div>
                                <div class="flex gap-1">
                                    @if (venue.isDefault) {
                                        <p-tag value="Por defecto" severity="contrast"></p-tag>
                                    }
                                    @if (venue.isActive) {
                                        <p-tag value="Activa" severity="success"></p-tag>
                                    } @else {
                                        <p-tag value="Inactiva" severity="danger"></p-tag>
                                    }
                                </div>
                            </div>

                            <p class="text-sm text-surface-700 dark:text-surface-200 mb-4">{{ venue.address }}</p>

                            <div class="flex gap-2">
                                <p-button
                                    label="Editar"
                                    icon="pi pi-pencil"
                                    [outlined]="true"
                                    [disabled]="!venue.isActive || loading()"
                                    (onClick)="openEditDialog(venue)"
                                ></p-button>
                                <p-button
                                    label="Dar de baja"
                                    icon="pi pi-trash"
                                    severity="danger"
                                    [outlined]="true"
                                    [disabled]="!venue.isActive || loading()"
                                    (onClick)="askSingleDeactivate(venue)"
                                ></p-button>
                            </div>
                        </article>
                    }
                </div>
            }

            <div class="mt-5">
                <p-paginator [first]="first()" [rows]="rows()" [totalRecords]="filteredVenues().length" [rowsPerPageOptions]="[6, 9, 12]" (onPageChange)="onPageChange($event)"></p-paginator>
            </div>
        </div>

        <p-dialog [header]="editingVenueId() ? 'Editar sede' : 'Nueva sede'" [modal]="true" [(visible)]="showFormDialog" [style]="{ width: 'min(520px, 94vw)' }">
            <form [formGroup]="venueForm" class="space-y-4" (ngSubmit)="saveVenue()">
                <div>
                    <label class="block mb-2 text-sm font-medium">Nombre *</label>
                    <input pInputText formControlName="name" class="w-full" placeholder="Sede Principal" />
                </div>
                <div>
                    <label class="block mb-2 text-sm font-medium">Dirección *</label>
                    <input pInputText formControlName="address" class="w-full" placeholder="Calle 123 # 45-67" />
                </div>
                <div class="flex items-center gap-2">
                    <p-checkbox formControlName="isDefault" [binary]="true"></p-checkbox>
                    <label>Marcar como sede por defecto</label>
                </div>
                @if (formErrors().length > 0) {
                    <div class="space-y-2">
                        @for (error of formErrors(); track error) {
                            <p-message severity="error" [text]="error"></p-message>
                        }
                    </div>
                }
                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancelar" [text]="true" [disabled]="saving()" (onClick)="closeFormDialog()"></p-button>
                    <p-button label="Guardar" type="submit" [loading]="saving()"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-dialog header="Confirmar baja" [modal]="true" [(visible)]="showConfirmDialog" [style]="{ width: 'min(460px, 92vw)' }">
            <p class="mb-4 text-surface-700 dark:text-surface-200">
                {{ confirmMessage() }}
            </p>
            <p class="mb-4 text-sm text-muted-color">
                {{ confirmImpactMessage() }}
            </p>
            <div class="flex justify-end gap-2">
                <p-button label="Cancelar" [text]="true" [disabled]="deactivating()" (onClick)="cancelConfirm()"></p-button>
                <p-button label="Sí, dar de baja" severity="danger" [loading]="deactivating()" (onClick)="confirmDeactivate()"></p-button>
            </div>
        </p-dialog>
    `
})
export class VenuesPage implements OnInit {
    private readonly venuesService = inject(VenuesService);
    private readonly fb = inject(FormBuilder);

    readonly allVenues = signal<Venue[]>([]);
    readonly searchTerm = signal('');
    readonly sortBy = signal<SortOption>('created_desc');
    readonly first = signal(0);
    readonly rows = signal(6);
    readonly selectedIds = signal<string[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly deactivating = signal(false);
    readonly pageErrors = signal<string[]>([]);
    readonly sortOptions = [
        { label: 'Más recientes', value: 'created_desc' as SortOption },
        { label: 'Más antiguas', value: 'created_asc' as SortOption },
        { label: 'Nombre A-Z', value: 'name_asc' as SortOption },
        { label: 'Nombre Z-A', value: 'name_desc' as SortOption }
    ];

    showFormDialog = false;
    showConfirmDialog = false;
    readonly editingVenueId = signal<string | null>(null);
    readonly formErrors = signal<string[]>([]);
    private idsToDeactivate: string[] = [];
    readonly confirmMessage = signal('¿Deseas dar de baja esta sede?');
    readonly confirmImpactMessage = signal('La sede se marcará como inactiva y no se borrará físicamente.');

    readonly venueForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(3)]],
        address: ['', [Validators.required, Validators.minLength(8)]],
        isDefault: [false]
    });

    readonly filteredVenues = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const sorted = [...this.allVenues()].sort((a, b) => this.compareVenues(a, b, this.sortBy()));
        if (!term) return sorted;
        return sorted.filter((venue) => venue.name.toLowerCase().includes(term));
    });

    readonly pagedVenues = computed(() => {
        const start = this.first();
        const end = start + this.rows();
        return this.filteredVenues().slice(start, end);
    });

    async ngOnInit(): Promise<void> {
        await this.loadVenues();
    }

    onSearchChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value ?? '';
        this.searchTerm.set(value);
        this.first.set(0);
    }

    onSortChange(value: SortOption): void {
        this.sortBy.set(value);
        this.first.set(0);
    }

    onPageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 6);
    }

    openCreateDialog(): void {
        this.editingVenueId.set(null);
        this.venueForm.reset({ name: '', address: '', isDefault: false });
        this.formErrors.set([]);
        this.showFormDialog = true;
    }

    openEditDialog(venue: Venue): void {
        this.editingVenueId.set(venue.id);
        this.venueForm.reset({
            name: venue.name,
            address: venue.address,
            isDefault: venue.isDefault
        });
        this.formErrors.set([]);
        this.showFormDialog = true;
    }

    closeFormDialog(): void {
        this.showFormDialog = false;
    }

    async saveVenue(): Promise<void> {
        this.formErrors.set([]);
        this.pageErrors.set([]);
        if (this.venueForm.invalid) {
            this.venueForm.markAllAsTouched();
            this.formErrors.set(this.buildFormErrors());
            return;
        }

        this.saving.set(true);
        const payload = this.venueForm.getRawValue();
        const editingId = this.editingVenueId();
        try {
            if (editingId) {
                await this.venuesService.update(editingId, payload);
            } else {
                await this.venuesService.create(payload);
            }
            await this.loadVenues();
            this.showFormDialog = false;
        } catch (error) {
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.saving.set(false);
        }
    }

    askSingleDeactivate(venue: Venue): void {
        this.idsToDeactivate = [venue.id];
        this.confirmMessage.set(`¿Deseas dar de baja la sede "${venue.name}"?`);
        this.confirmImpactMessage.set('La sede quedará inactiva y no podrá usarse en nuevos flujos operativos.');
        this.showConfirmDialog = true;
    }

    askBulkDeactivate(): void {
        this.idsToDeactivate = [...this.selectedIds()];
        this.confirmMessage.set(`¿Deseas dar de baja ${this.idsToDeactivate.length} sedes seleccionadas?`);
        this.confirmImpactMessage.set('Las sedes seleccionadas quedarán inactivas y no se borrarán físicamente.');
        this.showConfirmDialog = true;
    }

    cancelConfirm(): void {
        this.showConfirmDialog = false;
        this.idsToDeactivate = [];
    }

    async confirmDeactivate(): Promise<void> {
        if (this.idsToDeactivate.length === 0) {
            this.showConfirmDialog = false;
            return;
        }

        this.deactivating.set(true);
        this.pageErrors.set([]);
        try {
            await this.venuesService.softDelete(this.idsToDeactivate);
            await this.loadVenues();
            const selectedSet = new Set(this.idsToDeactivate);
            this.selectedIds.set(this.selectedIds().filter((id) => !selectedSet.has(id)));
            this.showConfirmDialog = false;
            this.idsToDeactivate = [];
        } catch (error) {
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.deactivating.set(false);
        }
    }

    isSelected(id: string): boolean {
        return this.selectedIds().includes(id);
    }

    toggleSelection(id: string, checked: boolean): void {
        if (checked) {
            this.selectedIds.set([...new Set([...this.selectedIds(), id])]);
            return;
        }
        this.selectedIds.set(this.selectedIds().filter((selectedId) => selectedId !== id));
    }

    formatDate(isoDate: string): string {
        return new Date(isoDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    private compareVenues(a: Venue, b: Venue, sort: SortOption): number {
        switch (sort) {
            case 'created_asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'created_desc':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    }

    private buildFormErrors(): string[] {
        const errors: string[] = [];
        if (this.venueForm.controls.name.errors?.['required']) {
            errors.push('El nombre es obligatorio.');
        } else if (this.venueForm.controls.name.errors?.['minlength']) {
            errors.push('El nombre debe tener al menos 3 caracteres.');
        }
        if (this.venueForm.controls.address.errors?.['required']) {
            errors.push('La dirección es obligatoria.');
        } else if (this.venueForm.controls.address.errors?.['minlength']) {
            errors.push('La dirección debe tener al menos 8 caracteres.');
        }
        return errors;
    }

    private async loadVenues(): Promise<void> {
        this.loading.set(true);
        this.pageErrors.set([]);
        try {
            const venues = await this.venuesService.list();
            this.allVenues.set(venues);
        } catch (error) {
            this.allVenues.set([]);
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.loading.set(false);
        }
    }

    private normalizeError(error: unknown): string {
        if (error instanceof Error && error.message.trim()) {
            return error.message;
        }
        return 'No fue posible completar la operación de sedes.';
    }
}
