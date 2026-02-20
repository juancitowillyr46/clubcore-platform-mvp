import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TrainingSession, TrainingSessionInput } from '../models/training-session.model';
import { TrainingSessionsMockService } from '../services/training-sessions-mock.service';

type SortOption = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc';

interface SelectItem {
    label: string;
    value: string;
}

@Component({
    selector: 'app-training-sessions-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, MessageModule, ButtonModule, DialogModule, DatePickerModule, PaginatorModule, SelectModule, TagModule],
    template: `
        <div class="p-4 sm:p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div class="mb-5">
                <h1 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-surface-0">Sesiones de entrenamiento</h1>
                <p class="text-muted-color">Planifica sesiones por equipo, fecha y ubicación.</p>
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
                    <input pInputText [value]="searchTerm()" (input)="onSearchChange($event)" class="w-full lg:col-span-2" placeholder="Buscar por título..." />
                    <p-select [options]="sortOptions" optionLabel="label" optionValue="value" [ngModel]="sortBy()" (onChange)="onSortChange($event.value)" class="w-full"></p-select>
                    <p-button label="Nueva sesión" icon="pi pi-plus" [disabled]="loading()" (onClick)="openCreateDialog()"></p-button>
                </div>
                <p class="text-sm text-muted-color m-0">{{ filteredSessions().length }} sesiones</p>
            </div>

            @if (loading()) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">Cargando sesiones...</div>
            } @else if (pagedSessions().length === 0) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">No hay sesiones registradas.</div>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (session of pagedSessions(); track session.id) {
                        <article class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm flex flex-col">
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <p class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">{{ session.title }}</p>
                                    <p class="m-0 text-xs text-muted-color">{{ formatDate(session.startDate) }} {{ session.startTime }} - {{ session.endTime }}</p>
                                </div>
                                <p-tag value="Programada" severity="info"></p-tag>
                            </div>

                            <div class="text-sm text-muted-color space-y-1 mb-4">
                                <p class="m-0">Equipo: {{ optionLabel(teamOptions, session.teamId, 'Sin equipo') }}</p>
                                <p class="m-0">Ubicación: {{ optionLabel(locationOptions, session.locationId, 'Sin ubicación') }}</p>
                                <p class="m-0">Duración: {{ session.durationMinutes }} min</p>
                            </div>

                            <div class="mt-auto">
                                <p-button label="Editar" icon="pi pi-pencil" [outlined]="true" (onClick)="openEditDialog(session)"></p-button>
                            </div>
                        </article>
                    }
                </div>
            }

            <div class="mt-5">
                <p-paginator [first]="first()" [rows]="rows()" [totalRecords]="filteredSessions().length" [rowsPerPageOptions]="[6, 9, 12]" (onPageChange)="onPageChange($event)"></p-paginator>
            </div>
        </div>

        <p-dialog [header]="editingId() ? 'Editar sesión' : 'Nueva sesión'" [modal]="true" [(visible)]="showFormDialog" [style]="{ width: 'min(760px, 96vw)' }">
            <form [formGroup]="sessionForm" class="space-y-4" (ngSubmit)="saveSession()">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2">
                        <label class="block mb-2 text-sm font-medium">Título *</label>
                        <input pInputText formControlName="title" class="w-full" placeholder="Trabajo técnico de finalización" />
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Fecha inicio *</label>
                        <p-datepicker formControlName="startDate" [showIcon]="true" [appendTo]="'body'" dateFormat="dd/mm/yy" inputStyleClass="w-full" styleClass="w-full" (onSelect)="syncEndDate()"></p-datepicker>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Fecha fin *</label>
                        <p-datepicker formControlName="endDate" [showIcon]="true" [appendTo]="'body'" dateFormat="dd/mm/yy" inputStyleClass="w-full" styleClass="w-full"></p-datepicker>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Hora inicio *</label>
                        <p-datepicker
                            formControlName="startTime"
                            [timeOnly]="true"
                            hourFormat="24"
                            [showIcon]="true"
                            [appendTo]="'body'"
                            inputStyleClass="w-full"
                            styleClass="w-full"
                        ></p-datepicker>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Hora fin *</label>
                        <p-datepicker
                            formControlName="endTime"
                            [timeOnly]="true"
                            hourFormat="24"
                            [showIcon]="true"
                            [appendTo]="'body'"
                            inputStyleClass="w-full"
                            styleClass="w-full"
                        ></p-datepicker>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Equipo *</label>
                        <p-select [options]="teamOptions" optionLabel="label" optionValue="value" formControlName="teamId" [appendTo]="'body'" class="w-full"></p-select>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Ubicación *</label>
                        <p-select [options]="locationOptions" optionLabel="label" optionValue="value" formControlName="locationId" [appendTo]="'body'" class="w-full"></p-select>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Entrenador asignado</label>
                        <p-select [options]="coachOptions" optionLabel="label" optionValue="value" formControlName="coachId" [appendTo]="'body'" [showClear]="true" class="w-full"></p-select>
                    </div>
                    <div>
                        <label class="block mb-2 text-sm font-medium">Duración (min)</label>
                        <input pInputText [value]="computedDurationLabel()" class="w-full" readonly />
                    </div>
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
    `
})
export class TrainingSessionsPage {
    private readonly sessionsService = inject(TrainingSessionsMockService);
    private readonly fb = inject(FormBuilder);

    readonly allSessions = signal<TrainingSession[]>([]);
    readonly searchTerm = signal('');
    readonly sortBy = signal<SortOption>('created_desc');
    readonly first = signal(0);
    readonly rows = signal(6);
    readonly pageErrors = signal<string[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly formErrors = signal<string[]>([]);
    readonly editingId = signal<string | null>(null);

    showFormDialog = false;

    readonly sortOptions = [
        { label: 'Mas recientes', value: 'created_desc' as SortOption },
        { label: 'Mas antiguas', value: 'created_asc' as SortOption },
        { label: 'Título A-Z', value: 'title_asc' as SortOption },
        { label: 'Título Z-A', value: 'title_desc' as SortOption }
    ];
    readonly teamOptions: SelectItem[] = [
        { label: 'Sub-8', value: 'team-u8' },
        { label: 'Sub-10', value: 'team-u10' },
        { label: 'Sub-12', value: 'team-u12' }
    ];
    readonly locationOptions: SelectItem[] = [
        { label: 'Cancha Principal', value: 'field-1' },
        { label: 'Cancha Alterna', value: 'field-2' },
        { label: 'Cancha Sintética', value: 'field-3' }
    ];
    readonly coachOptions: SelectItem[] = [
        { label: 'Oscar Torres', value: 'coach-1' },
        { label: 'Andrea Perez', value: 'coach-2' },
        { label: 'Carlos Vega', value: 'coach-3' }
    ];

    readonly sessionForm = this.fb.nonNullable.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        startDate: [null as Date | null, [Validators.required]],
        endDate: [null as Date | null, [Validators.required]],
        startTime: [null as Date | null, [Validators.required]],
        endTime: [null as Date | null, [Validators.required]],
        teamId: ['', [Validators.required]],
        locationId: ['', [Validators.required]],
        coachId: ['']
    });

    readonly filteredSessions = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const sorted = [...this.allSessions()].sort((a, b) => this.compareSessions(a, b, this.sortBy()));
        if (!term) return sorted;
        return sorted.filter((session) => session.title.toLowerCase().includes(term));
    });

    readonly pagedSessions = computed(() => this.filteredSessions().slice(this.first(), this.first() + this.rows()));

    constructor() {
        this.loadSessions();
    }

    onSearchChange(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value ?? '');
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

    syncEndDate(): void {
        if (!this.sessionForm.controls.endDate.value && this.sessionForm.controls.startDate.value) {
            this.sessionForm.patchValue({ endDate: this.sessionForm.controls.startDate.value });
        }
    }

    computedDurationLabel(): string {
        const duration = this.computeDurationMinutes(
            this.sessionForm.controls.startDate.value,
            this.sessionForm.controls.endDate.value,
            this.sessionForm.controls.startTime.value,
            this.sessionForm.controls.endTime.value
        );
        return duration > 0 ? `${duration}` : '0';
    }

    openCreateDialog(): void {
        this.editingId.set(null);
        this.sessionForm.reset({
            title: '',
            startDate: null,
            endDate: null,
            startTime: null,
            endTime: null,
            teamId: '',
            locationId: '',
            coachId: ''
        });
        this.formErrors.set([]);
        this.showFormDialog = true;
    }

    openEditDialog(session: TrainingSession): void {
        this.editingId.set(session.id);
        this.sessionForm.reset({
            title: session.title,
            startDate: this.parseIsoDate(session.startDate),
            endDate: this.parseIsoDate(session.endDate),
            startTime: this.parseTime(session.startTime),
            endTime: this.parseTime(session.endTime),
            teamId: session.teamId,
            locationId: session.locationId,
            coachId: session.coachId
        });
        this.formErrors.set([]);
        this.showFormDialog = true;
    }

    closeFormDialog(): void {
        this.showFormDialog = false;
    }

    async saveSession(): Promise<void> {
        this.formErrors.set([]);
        if (this.sessionForm.invalid) {
            this.sessionForm.markAllAsTouched();
            this.formErrors.set(this.buildFormErrors());
            return;
        }

        const duration = this.computeDurationMinutes(
            this.sessionForm.controls.startDate.value,
            this.sessionForm.controls.endDate.value,
            this.sessionForm.controls.startTime.value,
            this.sessionForm.controls.endTime.value
        );
        if (duration <= 0) {
            this.formErrors.set(['La hora fin debe ser mayor que la hora inicio.']);
            return;
        }

        const payload: TrainingSessionInput = {
            title: this.sessionForm.controls.title.value.trim(),
            startDate: this.toIsoDate(this.sessionForm.controls.startDate.value),
            endDate: this.toIsoDate(this.sessionForm.controls.endDate.value),
            startTime: this.toTime(this.sessionForm.controls.startTime.value),
            endTime: this.toTime(this.sessionForm.controls.endTime.value),
            durationMinutes: duration,
            teamId: this.sessionForm.controls.teamId.value,
            locationId: this.sessionForm.controls.locationId.value,
            coachId: this.sessionForm.controls.coachId.value
        };

        this.saving.set(true);
        this.pageErrors.set([]);
        try {
            if (this.editingId()) {
                await this.sessionsService.update(this.editingId()!, payload);
            } else {
                await this.sessionsService.create(payload);
            }
            await this.loadSessions();
            this.showFormDialog = false;
        } catch (error) {
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.saving.set(false);
        }
    }

    optionLabel(options: SelectItem[], value: string, fallback: string): string {
        return options.find((item) => item.value === value)?.label ?? fallback;
    }

    formatDate(isoDate: string): string {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    }

    private async loadSessions(): Promise<void> {
        this.loading.set(true);
        this.pageErrors.set([]);
        try {
            this.allSessions.set(await this.sessionsService.list());
        } catch (error) {
            this.pageErrors.set([this.normalizeError(error)]);
            this.allSessions.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    private computeDurationMinutes(startDate: Date | null, endDate: Date | null, startTime: Date | null, endTime: Date | null): number {
        if (!startDate || !endDate || !startTime || !endTime) return 0;

        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();

        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startHour, startMinute, 0, 0);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endHour, endMinute, 0, 0);
        const diff = end.getTime() - start.getTime();
        return diff > 0 ? Math.round(diff / 60000) : 0;
    }

    private parseIsoDate(value: string): Date | null {
        if (!value) return null;
        const [year, month, day] = value.split('-').map((part) => Number(part));
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
    }

    private parseTime(value: string): Date | null {
        if (!value) return null;
        const [hour, minute] = value.split(':').map((part) => Number(part));
        if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        return date;
    }

    private toTime(value: Date | null): string {
        if (!value) return '';
        const hour = String(value.getHours()).padStart(2, '0');
        const minute = String(value.getMinutes()).padStart(2, '0');
        return `${hour}:${minute}`;
    }

    private toIsoDate(value: Date | null): string {
        if (!value) return '';
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private compareSessions(a: TrainingSession, b: TrainingSession, sort: SortOption): number {
        switch (sort) {
            case 'created_asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'title_asc':
                return a.title.localeCompare(b.title);
            case 'title_desc':
                return b.title.localeCompare(a.title);
            case 'created_desc':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    }

    private buildFormErrors(): string[] {
        const errors: string[] = [];
        if (this.sessionForm.controls.title.errors?.['required']) errors.push('El título es obligatorio.');
        if (this.sessionForm.controls.startDate.errors?.['required']) errors.push('La fecha inicio es obligatoria.');
        if (this.sessionForm.controls.endDate.errors?.['required']) errors.push('La fecha fin es obligatoria.');
        if (this.sessionForm.controls.startTime.errors?.['required']) errors.push('La hora inicio es obligatoria.');
        if (this.sessionForm.controls.endTime.errors?.['required']) errors.push('La hora fin es obligatoria.');
        if (this.sessionForm.controls.teamId.errors?.['required']) errors.push('El equipo es obligatorio.');
        if (this.sessionForm.controls.locationId.errors?.['required']) errors.push('La ubicación es obligatoria.');
        return errors;
    }

    private normalizeError(error: unknown): string {
        if (error instanceof Error && error.message.trim()) return error.message;
        return 'No fue posible completar la operación de sesiones.';
    }
}
