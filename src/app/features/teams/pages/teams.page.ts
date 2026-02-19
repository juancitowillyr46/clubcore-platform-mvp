import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CategoriesService } from '../../categories/services/categories.service';
import { TrainersService } from '../../trainers/services/trainers.service';
import { VenuesService } from '../../venues/services/venues.service';
import { Team, TeamInput } from '../models/team.model';
import { TeamsService } from '../services/teams.service';

interface SelectItem {
    label: string;
    value: string;
}

@Component({
    selector: 'app-teams-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, MessageModule, ButtonModule, DialogModule, FileUploadModule, PaginatorModule, TagModule, CheckboxModule, SelectModule],
    styles: [
        `
            :host ::ng-deep .team-logo-upload .p-fileupload-file-name,
            :host ::ng-deep .team-logo-upload .p-fileupload-file-label {
                display: none;
            }
        `
    ],
    template: `
        <div class="p-4 sm:p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div class="mb-4">
                <h1 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-surface-0">Equipos</h1>
                <p class="text-muted-color">Crea y administra equipos de forma simple desde móvil o escritorio.</p>
            </div>

            @if (pageError()) {
                <p-message severity="error" [text]="pageError()"></p-message>
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
                <input pInputText [value]="searchTerm()" (input)="onSearch($event)" class="w-full lg:col-span-2" placeholder="Buscar equipo..." />
                <p-select [options]="sortOptions" optionLabel="label" optionValue="value" [ngModel]="sortBy()" (onChange)="sortBy.set($event.value)" class="w-full"></p-select>
                <p-button label="Nuevo equipo" icon="pi pi-plus" [disabled]="loading() || !canCreateTeam()" (onClick)="openCreate()"></p-button>
            </div>

            <div class="flex gap-2 mb-4">
                <p-button label="Dar de baja seleccionados" icon="pi pi-trash" severity="danger" [outlined]="true" [disabled]="selectedIds().length === 0 || loading()" (onClick)="askBulkDeactivate()"></p-button>
                <span class="text-sm text-muted-color self-center">Seleccionados: {{ selectedIds().length }}</span>
            </div>

            @if (loading()) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">Cargando...</div>
            } @else if (pagedTeams().length === 0) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">No hay equipos.</div>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (team of pagedTeams(); track team.id) {
                        <article class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm flex flex-col">
                            <div class="flex items-start justify-between gap-2 mb-3">
                                <div class="flex items-start gap-2">
                                    <p-checkbox [binary]="true" [ngModel]="selectedIds().includes(team.id)" (onChange)="toggleSelect(team.id, !!$event.checked)"></p-checkbox>
                                    @if (team.logoUrl) {
                                        <img [src]="team.logoUrl" [alt]="team.name" class="w-12 h-12 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                                    } @else {
                                        <div class="w-12 h-12 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xs font-semibold text-surface-700 dark:text-surface-200">{{ initials(team.name) }}</div>
                                    }
                                    <div>
                                        <p class="text-base font-semibold text-surface-900 dark:text-surface-0 leading-tight m-0">{{ team.name }}</p>
                                        <p class="m-0 text-xs text-muted-color">Sede: {{ labelByValue(venueOptions(), team.venueId, 'Sin sede') }}</p>
                                        <p class="m-0 text-xs text-muted-color">Categoría: {{ labelByValue(categoryOptions(), team.categoryId, 'Sin categoría') }}</p>
                                    </div>
                                </div>
                                <p-tag [value]="team.isActive ? 'Activo' : 'Inactivo'" [severity]="team.isActive ? 'success' : 'danger'"></p-tag>
                            </div>
                            <p class="text-sm text-muted-color mb-4">Entrenador principal: <span class="font-medium text-surface-800 dark:text-surface-100">{{ labelByValue(trainerOptions(), team.headTrainerId, 'Sin entrenador') }}</span></p>
                            <div class="flex gap-2 mt-auto">
                                <p-button label="Editar" icon="pi pi-pencil" [outlined]="true" [disabled]="!team.isActive" (onClick)="openEdit(team)"></p-button>
                                <p-button label="Dar de baja" icon="pi pi-trash" severity="danger" [outlined]="true" [disabled]="!team.isActive" (onClick)="askSingleDeactivate(team)"></p-button>
                            </div>
                        </article>
                    }
                </div>
            }

            <div class="mt-5">
                <p-paginator [first]="first()" [rows]="rows()" [totalRecords]="filteredTeams().length" [rowsPerPageOptions]="[6, 9, 12]" (onPageChange)="onPageChange($event)"></p-paginator>
            </div>
        </div>

        <p-dialog [header]="editingId() ? 'Editar equipo' : 'Nuevo equipo'" [modal]="true" [(visible)]="showForm" [style]="{ width: 'min(760px, 96vw)' }">
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="save()">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                        <label class="block mb-2 text-sm font-medium">Logo (opcional)</label>
                        <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                            <div class="flex justify-center mb-3">
                                @if (logoPreview()) {
                                    <img [src]="logoPreview()" alt="Logo del equipo" class="w-24 h-24 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                                } @else {
                                    <div class="w-24 h-24 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-lg font-semibold text-surface-700 dark:text-surface-200">{{ initials(form.controls.name.value || 'EQ') }}</div>
                                }
                            </div>
                            <div class="flex items-center justify-center gap-2">
                                <p-fileUpload mode="basic" styleClass="team-logo-upload" name="logo" accept="image/*" chooseLabel="Subir" chooseIcon="pi pi-upload" [auto]="false" [customUpload]="true" (onSelect)="onLogoSelect($event)">
                                    <ng-template pTemplate="filelabel"></ng-template>
                                </p-fileUpload>
                                <p-button icon="pi pi-trash" severity="secondary" [outlined]="true" (onClick)="clearLogo()"></p-button>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-2 space-y-3">
                        <div>
                            <label class="block mb-2 text-sm font-medium">Nombre *</label>
                            <input pInputText formControlName="name" class="w-full" placeholder="Sub-13 Femenino" />
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-2 text-sm font-medium">Sede *</label>
                                @if (venueOptions().length > 1) {
                                    <p-select [options]="venueOptions()" optionLabel="label" optionValue="value" formControlName="venueId" [appendTo]="'body'" class="w-full"></p-select>
                                } @else {
                                    <div class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm">{{ fallbackSingle(venueOptions(), 'Sin sedes activas') }}</div>
                                }
                            </div>
                            <div>
                                <label class="block mb-2 text-sm font-medium">Categoría *</label>
                                @if (categoryOptions().length > 1) {
                                    <p-select [options]="categoryOptions()" optionLabel="label" optionValue="value" formControlName="categoryId" [appendTo]="'body'" class="w-full"></p-select>
                                } @else {
                                    <div class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm">{{ fallbackSingle(categoryOptions(), 'Sin categorías activas') }}</div>
                                }
                            </div>
                        </div>
                        <div>
                            <label class="block mb-2 text-sm font-medium">Entrenador principal *</label>
                            @if (trainerOptions().length > 1) {
                                <p-select [options]="trainerOptions()" optionLabel="label" optionValue="value" formControlName="headTrainerId" [appendTo]="'body'" class="w-full" (onChange)="sanitizeStaff()"></p-select>
                            } @else {
                                <div class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm">{{ fallbackSingle(trainerOptions(), 'Sin entrenadores activos') }}</div>
                            }
                        </div>
                    </div>
                </div>

                <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4">
                    <div class="flex items-center justify-between mb-3">
                        <p class="m-0 font-medium text-surface-900 dark:text-surface-0">Cuerpo técnico (opcional)</p>
                        <p-button label="Agregar técnico" icon="pi pi-plus" [text]="true" (onClick)="addStaff()"></p-button>
                    </div>
                    @if (staffRows().length === 0) {
                        <p class="text-sm text-muted-color m-0">No hay técnicos adicionales.</p>
                    } @else {
                        <div class="space-y-3">
                            @for (row of staffRows(); track $index) {
                                <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                                    <p-select [options]="staffOptions(row.trainerId)" optionLabel="label" optionValue="value" [ngModel]="row.trainerId" (onChange)="updateStaffTrainer($index, $event.value)" [ngModelOptions]="{ standalone: true }" [appendTo]="'body'" class="w-full"></p-select>
                                    <p-select
                                        [options]="footballRoleOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        [ngModel]="row.role"
                                        (onChange)="updateStaffRole($index, $event.value)"
                                        [ngModelOptions]="{ standalone: true }"
                                        [appendTo]="'body'"
                                        placeholder="Selecciona rol"
                                        class="w-full"
                                    ></p-select>
                                    <p-button icon="pi pi-trash" severity="danger" [outlined]="true" (onClick)="removeStaff($index)"></p-button>
                                </div>
                            }
                        </div>
                    }
                </div>

                @if (formErrors().length > 0) {
                    <div class="space-y-2">
                        @for (error of formErrors(); track error) {
                            <p-message severity="error" [text]="error"></p-message>
                        }
                    </div>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancelar" [text]="true" [disabled]="saving()" (onClick)="showForm = false"></p-button>
                    <p-button label="Guardar" type="submit" [loading]="saving()"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-dialog header="Confirmar baja" [modal]="true" [(visible)]="showConfirm" [style]="{ width: 'min(460px, 92vw)' }">
            <p class="mb-4 text-surface-700 dark:text-surface-200">{{ confirmText() }}</p>
            <div class="flex justify-end gap-2">
                <p-button label="Cancelar" [text]="true" [disabled]="deactivating()" (onClick)="showConfirm = false"></p-button>
                <p-button label="Sí, dar de baja" severity="danger" [loading]="deactivating()" (onClick)="confirmDeactivate()"></p-button>
            </div>
        </p-dialog>
    `
})
export class TeamsPage implements OnInit {
    private readonly teamsService = inject(TeamsService);
    private readonly venuesService = inject(VenuesService);
    private readonly categoriesService = inject(CategoriesService);
    private readonly trainersService = inject(TrainersService);
    private readonly fb = inject(FormBuilder);

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly deactivating = signal(false);
    readonly pageError = signal('');
    readonly formErrors = signal<string[]>([]);

    readonly teams = signal<Team[]>([]);
    readonly venues = signal<SelectItem[]>([]);
    readonly categories = signal<SelectItem[]>([]);
    readonly trainers = signal<SelectItem[]>([]);
    readonly staffRows = signal<{ trainerId: string; role: string }[]>([]);

    readonly searchTerm = signal('');
    readonly sortBy = signal<'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'>('created_desc');
    readonly selectedIds = signal<string[]>([]);
    readonly first = signal(0);
    readonly rows = signal(6);

    readonly editingId = signal<string | null>(null);
    readonly logoPreview = signal('');
    readonly confirmText = signal('¿Deseas dar de baja este equipo?');
    private idsToDeactivate: string[] = [];

    showForm = false;
    showConfirm = false;

    readonly sortOptions = [
        { label: 'Más recientes', value: 'created_desc' },
        { label: 'Más antiguas', value: 'created_asc' },
        { label: 'Nombre A-Z', value: 'name_asc' },
        { label: 'Nombre Z-A', value: 'name_desc' }
    ];
    readonly footballRoleOptions: SelectItem[] = [
        { label: 'Asistente técnico', value: 'ASISTENTE_TECNICO' },
        { label: 'Entrenador de porteros', value: 'ENTRENADOR_PORTEROS' },
        { label: 'Preparador físico', value: 'PREPARADOR_FISICO' },
        { label: 'Analista de video', value: 'ANALISTA_VIDEO' },
        { label: 'Fisioterapeuta', value: 'FISIOTERAPEUTA' },
        { label: 'Médico deportivo', value: 'MEDICO_DEPORTIVO' },
        { label: 'Utilero', value: 'UTILERO' }
    ];

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        venueId: ['', Validators.required],
        categoryId: ['', Validators.required],
        headTrainerId: ['', Validators.required],
        logoUrl: ['']
    });

    readonly filteredTeams = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const sorted = [...this.teams()].sort((a, b) => this.sortFn(a, b));
        return term ? sorted.filter((t) => t.name.toLowerCase().includes(term)) : sorted;
    });

    readonly pagedTeams = computed(() => this.filteredTeams().slice(this.first(), this.first() + this.rows()));

    ngOnInit(): Promise<void> {
        return this.loadAll();
    }

    venueOptions(): SelectItem[] {
        return this.venues();
    }
    categoryOptions(): SelectItem[] {
        return this.categories();
    }
    trainerOptions(): SelectItem[] {
        return this.trainers();
    }

    canCreateTeam(): boolean {
        return this.venues().length > 0 && this.categories().length > 0 && this.trainers().length > 0;
    }

    fallbackSingle(options: SelectItem[], empty: string): string {
        return options.length === 1 ? options[0].label : empty;
    }

    labelByValue(options: SelectItem[], value: string, fallback: string): string {
        return options.find((o) => o.value === value)?.label ?? fallback;
    }

    onSearch(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value ?? '');
        this.first.set(0);
    }

    onPageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 6);
    }

    initials(text: string): string {
        const parts = text
            .split(' ')
            .map((v) => v.trim())
            .filter(Boolean);
        return `${parts[0]?.[0] ?? 'E'}${parts[1]?.[0] ?? ''}`.toUpperCase();
    }

    openCreate(): void {
        this.editingId.set(null);
        this.form.reset({
            name: '',
            venueId: this.venues().length === 1 ? this.venues()[0].value : '',
            categoryId: this.categories().length === 1 ? this.categories()[0].value : '',
            headTrainerId: this.trainers().length === 1 ? this.trainers()[0].value : '',
            logoUrl: ''
        });
        this.staffRows.set([]);
        this.logoPreview.set('');
        this.formErrors.set([]);
        this.applySingleOptionDefaults();
        this.showForm = true;
    }

    openEdit(team: Team): void {
        this.editingId.set(team.id);
        this.form.reset({
            name: team.name,
            venueId: team.venueId,
            categoryId: team.categoryId,
            headTrainerId: team.headTrainerId,
            logoUrl: team.logoUrl
        });
        this.staffRows.set(team.staff.map((r) => ({ ...r })));
        this.logoPreview.set(team.logoUrl);
        this.formErrors.set([]);
        this.applySingleOptionDefaults();
        this.showForm = true;
    }

    onLogoSelect(event: FileSelectEvent): void {
        const file = event.files?.[0];
        if (!file?.type.startsWith('image/')) {
            this.formErrors.set(['El archivo seleccionado no es una imagen válida.']);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const value = String(reader.result ?? '');
            this.logoPreview.set(value);
            this.form.patchValue({ logoUrl: value });
        };
        reader.readAsDataURL(file);
    }

    clearLogo(): void {
        this.logoPreview.set('');
        this.form.patchValue({ logoUrl: '' });
    }

    addStaff(): void {
        this.staffRows.set([...this.staffRows(), { trainerId: '', role: '' }]);
    }

    removeStaff(index: number): void {
        this.staffRows.set(this.staffRows().filter((_, i) => i !== index));
    }

    updateStaffTrainer(index: number, trainerId: string): void {
        this.staffRows.set(this.staffRows().map((row, i) => (i === index ? { ...row, trainerId } : row)));
    }

    updateStaffRole(index: number, role: string): void {
        this.staffRows.set(this.staffRows().map((row, i) => (i === index ? { ...row, role } : row)));
    }

    sanitizeStaff(): void {
        const headTrainer = this.form.controls.headTrainerId.value;
        this.staffRows.set(this.staffRows().filter((row) => row.trainerId !== headTrainer));
    }

    staffOptions(currentTrainerId: string): SelectItem[] {
        const selected = new Set(this.staffRows().map((row) => row.trainerId).filter(Boolean));
        if (currentTrainerId) selected.delete(currentTrainerId);
        const headTrainer = this.form.controls.headTrainerId.value;
        return this.trainers().filter((trainer) => trainer.value !== headTrainer && !selected.has(trainer.value));
    }

    async save(): Promise<void> {
        this.formErrors.set([]);
        this.applySingleOptionDefaults();
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.formErrors.set(this.baseErrors());
            return;
        }

        const staff = this.staffRows().map((row) => ({ trainerId: row.trainerId.trim(), role: row.role.trim() })).filter((row) => row.trainerId || row.role);
        const staffErrors = this.validateStaff(staff);
        if (staffErrors.length) {
            this.formErrors.set(staffErrors);
            return;
        }

        this.saving.set(true);
        const payload: TeamInput = { ...this.form.getRawValue(), logoUrl: this.logoPreview() || this.form.controls.logoUrl.value, staff };
        try {
            if (this.editingId()) {
                await this.teamsService.update(this.editingId()!, payload);
            } else {
                await this.teamsService.create(payload);
            }
            await this.loadTeams();
            this.showForm = false;
        } catch (error) {
            this.pageError.set(this.toError(error));
        } finally {
            this.saving.set(false);
        }
    }

    askSingleDeactivate(team: Team): void {
        this.idsToDeactivate = [team.id];
        this.confirmText.set(`¿Deseas dar de baja el equipo "${team.name}"?`);
        this.showConfirm = true;
    }

    askBulkDeactivate(): void {
        this.idsToDeactivate = [...this.selectedIds()];
        this.confirmText.set(`¿Deseas dar de baja ${this.idsToDeactivate.length} equipos seleccionados?`);
        this.showConfirm = true;
    }

    async confirmDeactivate(): Promise<void> {
        if (this.idsToDeactivate.length === 0) return;
        this.deactivating.set(true);
        try {
            await this.teamsService.softDelete(this.idsToDeactivate);
            await this.loadTeams();
            const removed = new Set(this.idsToDeactivate);
            this.selectedIds.set(this.selectedIds().filter((id) => !removed.has(id)));
            this.idsToDeactivate = [];
            this.showConfirm = false;
        } catch (error) {
            this.pageError.set(this.toError(error));
        } finally {
            this.deactivating.set(false);
        }
    }

    toggleSelect(id: string, checked: boolean): void {
        if (checked) {
            this.selectedIds.set([...new Set([...this.selectedIds(), id])]);
            return;
        }
        this.selectedIds.set(this.selectedIds().filter((value) => value !== id));
    }

    private async loadAll(): Promise<void> {
        this.loading.set(true);
        this.pageError.set('');
        try {
            const [venues, categories, trainers] = await Promise.all([this.venuesService.list(), this.categoriesService.list(), this.trainersService.list()]);
            this.venues.set(venues.filter((v) => v.isActive).map((v) => ({ label: v.name, value: v.id })));
            this.categories.set(categories.filter((c) => c.isActive).map((c) => ({ label: `${c.name} (${c.ageMin}-${c.ageMax})`, value: c.id })));
            this.trainers.set(
                trainers.filter((t) => t.isActive).map((t) => ({ label: `${t.firstName} ${t.lastName} ${t.middleName}`.replace(/\s+/g, ' ').trim(), value: t.id }))
            );
            this.applySingleOptionDefaults();
            await this.loadTeams();
        } catch (error) {
            this.pageError.set(this.toError(error));
        } finally {
            this.loading.set(false);
        }
    }

    private async loadTeams(): Promise<void> {
        this.teams.set(await this.teamsService.list());
    }

    private sortFn(a: Team, b: Team): number {
        switch (this.sortBy()) {
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

    private baseErrors(): string[] {
        const errors: string[] = [];
        if (this.form.controls.name.errors?.['required']) errors.push('El nombre del equipo es obligatorio.');
        if (this.form.controls.venueId.errors?.['required']) errors.push('La sede es obligatoria.');
        if (this.form.controls.categoryId.errors?.['required']) errors.push('La categoría es obligatoria.');
        if (this.form.controls.headTrainerId.errors?.['required']) errors.push('El entrenador principal es obligatorio.');
        if (this.venues().length === 0) errors.push('No hay sedes activas disponibles.');
        if (this.categories().length === 0) errors.push('No hay categorías activas disponibles.');
        if (this.trainers().length === 0) errors.push('No hay entrenadores activos disponibles.');
        return errors;
    }

    private validateStaff(staff: { trainerId: string; role: string }[]): string[] {
        const errors: string[] = [];
        const headTrainer = this.form.controls.headTrainerId.value;
        const seen = new Set<string>();
        for (const row of staff) {
            if (!row.trainerId || !row.role) {
                errors.push('Cada técnico del cuerpo técnico debe tener técnico y rol.');
                break;
            }
            if (row.trainerId === headTrainer) {
                errors.push('El técnico principal no puede formar parte del cuerpo técnico.');
                break;
            }
            if (seen.has(row.trainerId)) {
                errors.push('No puedes repetir el mismo técnico en el cuerpo técnico.');
                break;
            }
            seen.add(row.trainerId);
        }
        return errors;
    }

    private toError(error: unknown): string {
        if (error instanceof Error && error.message.trim()) return error.message;
        return 'No fue posible completar la operación de equipos.';
    }

    private applySingleOptionDefaults(): void {
        if (this.venues().length === 1 && !this.form.controls.venueId.value) {
            this.form.patchValue({ venueId: this.venues()[0].value });
        }
        if (this.categories().length === 1 && !this.form.controls.categoryId.value) {
            this.form.patchValue({ categoryId: this.categories()[0].value });
        }
        if (this.trainers().length === 1 && !this.form.controls.headTrainerId.value) {
            this.form.patchValue({ headTrainerId: this.trainers()[0].value });
            this.sanitizeStaff();
        }
    }
}
