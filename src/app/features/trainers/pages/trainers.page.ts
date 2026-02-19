import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Trainer } from '../models/trainer.model';
import { TrainersService } from '../services/trainers.service';

type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

@Component({
    selector: 'app-trainers-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        InputTextModule,
        TextareaModule,
        MessageModule,
        ButtonModule,
        DialogModule,
        FileUploadModule,
        PaginatorModule,
        SliderModule,
        TagModule,
        CheckboxModule,
        SelectModule,
        TooltipModule
    ],
    styles: [
        `
            :host ::ng-deep .trainer-photo-upload .p-fileupload-file-name {
                display: none;
            }

            :host ::ng-deep .trainer-photo-upload .p-fileupload-file-label {
                display: none;
            }

            :host ::ng-deep .trainer-photo-upload .p-fileupload-basic-content {
                width: 3rem;
            }

            :host ::ng-deep .trainer-photo-upload .p-fileupload-choose-button {
                width: 3rem;
                height: 2.75rem;
                padding: 0;
            }

            :host ::ng-deep .photo-action-icon-btn {
                width: 3rem;
                height: 2.75rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            }

            :host ::ng-deep .photo-action-icon-btn .p-button-label {
                display: none;
            }
        `
    ],
    template: `
        <div class="p-4 sm:p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div class="mb-5">
                <h1 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-surface-0">Entrenadores</h1>
                <p class="text-muted-color">Administra el equipo técnico con una experiencia ágil para móvil y escritorio.</p>
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
                    <input pInputText [value]="searchTerm()" (input)="onSearchChange($event)" class="w-full lg:col-span-2" placeholder="Buscar por nombre o apellido..." />
                    <p-select [options]="sortOptions" optionLabel="label" optionValue="value" [ngModel]="sortBy()" (onChange)="onSortChange($event.value)" placeholder="Ordenar por" class="w-full" />
                    <p-button label="Nuevo entrenador" icon="pi pi-plus" [disabled]="loading()" (onClick)="openCreateDialog()"></p-button>
                </div>
                <p class="text-sm text-muted-color m-0">{{ filteredTrainers().length }} entrenadores</p>
            </div>

            <div class="flex flex-wrap gap-2 mb-4">
                <p-button
                    label="Dar de baja seleccionados"
                    icon="pi pi-trash"
                    severity="danger"
                    [outlined]="true"
                    [disabled]="selectedIds().length === 0 || loading()"
                    (onClick)="askBulkDeactivate()"
                ></p-button>
                <span class="text-sm text-muted-color self-center">Seleccionados: {{ selectedIds().length }}</span>
            </div>

            @if (loading()) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">
                    Cargando entrenadores...
                </div>
            } @else if (pagedTrainers().length === 0) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">
                    No hay entrenadores para mostrar con el filtro actual.
                </div>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (trainer of pagedTrainers(); track trainer.id) {
                        <article class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm flex flex-col">
                            <div class="flex items-start justify-between gap-2 mb-3">
                                <div class="flex items-start gap-2">
                                    <p-checkbox
                                        [binary]="true"
                                        [ngModel]="isSelected(trainer.id)"
                                        (onChange)="toggleSelection(trainer.id, !!$event.checked)"
                                    ></p-checkbox>
                                    @if (hasPhoto(trainer.photoUrl)) {
                                        <img [src]="trainer.photoUrl" [alt]="fullName(trainer)" class="w-12 h-12 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                                    } @else {
                                        <div class="w-12 h-12 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xs font-semibold text-surface-700 dark:text-surface-200">
                                            {{ trainerInitials(trainer) }}
                                        </div>
                                    }
                                    <div>
                                        <p class="text-base font-semibold text-surface-900 dark:text-surface-0 leading-tight m-0">{{ fullName(trainer) }}</p>
                                        <div class="mt-1 text-xs text-muted-color min-h-[2.5rem] flex flex-col justify-start">
                                            <p class="m-0 leading-5">{{ trainer.email || 'Sin correo' }}</p>
                                            <p class="m-0 leading-5">{{ trainer.phone || 'Sin teléfono' }}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    @if (trainer.isActive) {
                                        <p-tag value="Activo" severity="success"></p-tag>
                                    } @else {
                                        <p-tag value="Inactivo" severity="danger"></p-tag>
                                    }
                                </div>
                            </div>

                            <p class="text-sm text-surface-700 dark:text-surface-200 mb-4 line-clamp-3 min-h-[3.75rem]">{{ trainer.about }}</p>

                            <div class="flex gap-2">
                                <p-button label="Editar" icon="pi pi-pencil" [outlined]="true" [disabled]="!trainer.isActive || loading()" (onClick)="openEditDialog(trainer)"></p-button>
                                <p-button
                                    label="Dar de baja"
                                    icon="pi pi-trash"
                                    severity="danger"
                                    [outlined]="true"
                                    [disabled]="!trainer.isActive || loading()"
                                    (onClick)="askSingleDeactivate(trainer)"
                                ></p-button>
                            </div>
                        </article>
                    }
                </div>
            }

            <div class="mt-5">
                <p-paginator [first]="first()" [rows]="rows()" [totalRecords]="filteredTrainers().length" [rowsPerPageOptions]="[6, 9, 12]" (onPageChange)="onPageChange($event)"></p-paginator>
            </div>
        </div>

        <p-dialog [header]="editingTrainerId() ? 'Editar entrenador' : 'Nuevo entrenador'" [modal]="true" [(visible)]="showFormDialog" [style]="{ width: 'min(620px, 94vw)' }">
            <form [formGroup]="trainerForm" class="space-y-4" (ngSubmit)="saveTrainer()">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                        <label class="block mb-2 text-sm font-medium">Foto</label>
                        <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                            <div class="flex justify-center mb-3">
                                @if (hasPhoto(currentPhotoPreview())) {
                                    <img [src]="currentPhotoPreview()" alt="Vista previa entrenador" class="w-24 h-24 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                                } @else {
                                    <div class="w-24 h-24 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-lg font-semibold text-surface-700 dark:text-surface-200">
                                        {{ formInitials() }}
                                    </div>
                                }
                            </div>

                            <div class="flex items-center justify-center gap-2 w-full">
                                <p-button
                                    icon="pi pi-pencil"
                                    styleClass="photo-action-icon-btn p-button-outlined"
                                    [disabled]="!selectedPhotoDataUrl()"
                                    pTooltip="Editar / recortar"
                                    tooltipPosition="top"
                                    (onClick)="openCropDialog()"
                                ></p-button>
                                <p-fileUpload
                                    styleClass="trainer-photo-upload"
                                    mode="basic"
                                    name="photo"
                                    accept="image/*"
                                    chooseLabel=""
                                    chooseIcon="pi pi-camera"
                                    chooseStyleClass="photo-action-icon-btn p-button-outlined"
                                    [auto]="false"
                                    [customUpload]="true"
                                    pTooltip="Actualizar foto"
                                    tooltipPosition="top"
                                    (onSelect)="onPhotoSelect($event)"
                                >
                                    <ng-template pTemplate="filelabel"></ng-template>
                                </p-fileUpload>
                                <p-button
                                    icon="pi pi-trash"
                                    severity="secondary"
                                    styleClass="photo-action-icon-btn p-button-outlined"
                                    pTooltip="Quitar foto"
                                    tooltipPosition="top"
                                    (onClick)="clearPhoto()"
                                ></p-button>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-2 space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-2 text-sm font-medium">Nombre *</label>
                                <input pInputText formControlName="firstName" class="w-full" placeholder="Carlos" />
                            </div>
                            <div>
                                <label class="block mb-2 text-sm font-medium">Apellido paterno</label>
                                <input pInputText formControlName="lastName" class="w-full" placeholder="Mendoza" />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-2 text-sm font-medium">Apellido materno</label>
                                <input pInputText formControlName="middleName" class="w-full" placeholder="Ruiz" />
                            </div>
                            <div>
                                <label class="block mb-2 text-sm font-medium">Email</label>
                                <input pInputText formControlName="email" class="w-full" placeholder="entrenador@club.com" />
                            </div>
                        </div>

                        <div>
                            <label class="block mb-2 text-sm font-medium">Teléfono</label>
                            <input pInputText formControlName="phone" class="w-full" placeholder="+57 300 000 0000" />
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block mb-2 text-sm font-medium">Sobre el entrenador</label>
                    <textarea pTextarea formControlName="about" rows="4" class="w-full resize-none" maxlength="280" placeholder="Experiencia, estilo y objetivos del entrenador..."></textarea>
                    <div class="text-xs text-muted-color mt-1 text-right">{{ trainerForm.controls.about.value.length }}/280</div>
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

        <p-dialog header="Editar foto del entrenador" [modal]="true" [(visible)]="showCropDialog" [style]="{ width: 'min(760px, 96vw)' }">
            <div class="space-y-4">
                <canvas #cropCanvas width="280" height="280" class="mx-auto rounded-xl border border-surface-300 dark:border-surface-700"></canvas>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="text-sm font-medium block mb-2">Zoom</label>
                        <p-slider [min]="1" [max]="3" [step]="0.1" [ngModel]="cropZoom()" (ngModelChange)="onCropZoomChange($event)"></p-slider>
                    </div>
                    <div>
                        <label class="text-sm font-medium block mb-2">Mover X</label>
                        <p-slider [min]="-100" [max]="100" [step]="1" [ngModel]="cropOffsetX()" (ngModelChange)="onCropOffsetXChange($event)"></p-slider>
                    </div>
                    <div>
                        <label class="text-sm font-medium block mb-2">Mover Y</label>
                        <p-slider [min]="-100" [max]="100" [step]="1" [ngModel]="cropOffsetY()" (ngModelChange)="onCropOffsetYChange($event)"></p-slider>
                    </div>
                </div>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancelar" [text]="true" (onClick)="showCropDialog = false"></p-button>
                    <p-button label="Aplicar recorte" (onClick)="applyCrop()"></p-button>
                </div>
            </div>
        </p-dialog>
    `
})
export class TrainersPage implements OnInit {
    private readonly trainersService = inject(TrainersService);
    private readonly fb = inject(FormBuilder);
    @ViewChild('cropCanvas') cropCanvas?: ElementRef<HTMLCanvasElement>;

    readonly allTrainers = signal<Trainer[]>([]);
    readonly searchTerm = signal('');
    readonly sortBy = signal<SortOption>('created_desc');
    readonly first = signal(0);
    readonly rows = signal(6);
    readonly selectedIds = signal<string[]>([]);
    readonly pageErrors = signal<string[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly deactivating = signal(false);
    readonly sortOptions = [
        { label: 'Más recientes', value: 'created_desc' as SortOption },
        { label: 'Más antiguas', value: 'created_asc' as SortOption },
        { label: 'Nombre A-Z', value: 'name_asc' as SortOption },
        { label: 'Nombre Z-A', value: 'name_desc' as SortOption }
    ];

    showFormDialog = false;
    showConfirmDialog = false;
    showCropDialog = false;
    readonly editingTrainerId = signal<string | null>(null);
    readonly formErrors = signal<string[]>([]);
    private idsToDeactivate: string[] = [];
    readonly confirmMessage = signal('¿Deseas dar de baja este entrenador?');
    readonly confirmImpactMessage = signal('El entrenador quedará inactivo y no se eliminará físicamente.');
    readonly currentPhotoPreview = signal('');
    readonly selectedPhotoDataUrl = signal<string | null>(null);
    readonly cropZoom = signal(1);
    readonly cropOffsetX = signal(0);
    readonly cropOffsetY = signal(0);
    private cropImage: HTMLImageElement | null = null;

    readonly trainerForm = this.fb.nonNullable.group({
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: [''],
        middleName: [''],
        email: ['', [Validators.email]],
        phone: [''],
        photoUrl: [''],
        about: ['']
    });

    readonly filteredTrainers = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const sorted = [...this.allTrainers()].sort((a, b) => this.compareTrainers(a, b, this.sortBy()));
        if (!term) return sorted;

        return sorted.filter((trainer) => {
            const name = `${trainer.firstName} ${trainer.lastName} ${trainer.middleName}`.toLowerCase();
            return name.includes(term);
        });
    });

    readonly pagedTrainers = computed(() => {
        const start = this.first();
        const end = start + this.rows();
        return this.filteredTrainers().slice(start, end);
    });

    async ngOnInit(): Promise<void> {
        await this.loadTrainers();
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
        this.editingTrainerId.set(null);
        this.trainerForm.reset({ firstName: '', lastName: '', middleName: '', email: '', phone: '', photoUrl: '', about: '' });
        this.currentPhotoPreview.set('');
        this.selectedPhotoDataUrl.set(null);
        this.formErrors.set([]);
        this.pageErrors.set([]);
        this.showFormDialog = true;
    }

    openEditDialog(trainer: Trainer): void {
        this.editingTrainerId.set(trainer.id);
        this.trainerForm.reset({
            firstName: trainer.firstName,
            lastName: trainer.lastName,
            middleName: trainer.middleName,
            email: trainer.email,
            phone: trainer.phone,
            photoUrl: trainer.photoUrl,
            about: trainer.about
        });
        this.currentPhotoPreview.set(trainer.photoUrl);
        this.selectedPhotoDataUrl.set(trainer.photoUrl);
        this.formErrors.set([]);
        this.pageErrors.set([]);
        this.showFormDialog = true;
    }

    closeFormDialog(): void {
        this.showFormDialog = false;
        this.showCropDialog = false;
    }

    onPhotoSelect(event: FileSelectEvent): void {
        const file = event.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.pageErrors.set(['El archivo seleccionado no es una imagen válida.']);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            this.selectedPhotoDataUrl.set(dataUrl);
            this.currentPhotoPreview.set(dataUrl);
            this.trainerForm.patchValue({ photoUrl: dataUrl });
        };
        reader.readAsDataURL(file);
    }

    openCropDialog(): void {
        const dataUrl = this.selectedPhotoDataUrl();
        if (!dataUrl) return;
        this.showCropDialog = true;
        this.cropZoom.set(1);
        this.cropOffsetX.set(0);
        this.cropOffsetY.set(0);
        this.loadCropImage(dataUrl);
    }

    onCropZoomChange(value: number): void {
        this.cropZoom.set(value);
        this.renderCropPreview();
    }

    onCropOffsetXChange(value: number): void {
        this.cropOffsetX.set(value);
        this.renderCropPreview();
    }

    onCropOffsetYChange(value: number): void {
        this.cropOffsetY.set(value);
        this.renderCropPreview();
    }

    applyCrop(): void {
        const canvas = this.cropCanvas?.nativeElement;
        if (!canvas) return;
        const cropped = canvas.toDataURL('image/png');
        this.currentPhotoPreview.set(cropped);
        this.selectedPhotoDataUrl.set(cropped);
        this.trainerForm.patchValue({ photoUrl: cropped });
        this.showCropDialog = false;
    }

    clearPhoto(): void {
        this.currentPhotoPreview.set('');
        this.selectedPhotoDataUrl.set(null);
        this.trainerForm.patchValue({ photoUrl: '' });
    }

    async saveTrainer(): Promise<void> {
        this.formErrors.set([]);
        this.pageErrors.set([]);
        if (this.trainerForm.invalid) {
            this.trainerForm.markAllAsTouched();
            this.formErrors.set(this.buildFormErrors());
            return;
        }

        this.saving.set(true);
        const payload = { ...this.trainerForm.getRawValue(), photoUrl: this.currentPhotoPreview() };
        const editingId = this.editingTrainerId();
        try {
            if (editingId) {
                await this.trainersService.update(editingId, payload);
            } else {
                await this.trainersService.create(payload);
            }

            await this.loadTrainers();
            this.showFormDialog = false;
        } catch (error) {
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.saving.set(false);
        }
    }

    askSingleDeactivate(trainer: Trainer): void {
        this.idsToDeactivate = [trainer.id];
        this.confirmMessage.set(`¿Deseas dar de baja al entrenador "${this.fullName(trainer)}"?`);
        this.confirmImpactMessage.set('El entrenador quedará inactivo y no podrá usarse en asignaciones nuevas.');
        this.showConfirmDialog = true;
    }

    askBulkDeactivate(): void {
        this.idsToDeactivate = [...this.selectedIds()];
        this.confirmMessage.set(`¿Deseas dar de baja ${this.idsToDeactivate.length} entrenadores seleccionados?`);
        this.confirmImpactMessage.set('Los entrenadores seleccionados quedarán inactivos y no se eliminarán físicamente.');
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
            await this.trainersService.softDelete(this.idsToDeactivate);
            await this.loadTrainers();
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

    fullName(trainer: Trainer): string {
        return `${trainer.firstName} ${trainer.lastName} ${trainer.middleName}`.replace(/\s+/g, ' ').trim();
    }

    hasPhoto(photoUrl: string): boolean {
        return Boolean(photoUrl && photoUrl.trim());
    }

    trainerInitials(trainer: Trainer): string {
        const seed = `${trainer.firstName} ${trainer.lastName} ${trainer.middleName}`.trim();
        return this.initialsFrom(seed || trainer.firstName);
    }

    formInitials(): string {
        const seed = `${this.trainerForm.controls.firstName.value} ${this.trainerForm.controls.lastName.value}`.trim();
        return this.initialsFrom(seed || 'Entrenador');
    }

    formatDate(isoDate: string): string {
        return new Date(isoDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    private compareTrainers(a: Trainer, b: Trainer, sort: SortOption): number {
        switch (sort) {
            case 'created_asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'name_asc':
                return this.fullName(a).localeCompare(this.fullName(b));
            case 'name_desc':
                return this.fullName(b).localeCompare(this.fullName(a));
            case 'created_desc':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    }

    private buildFormErrors(): string[] {
        const errors: string[] = [];
        if (this.trainerForm.controls.firstName.errors?.['required']) {
            errors.push('El nombre es obligatorio.');
        } else if (this.trainerForm.controls.firstName.errors?.['minlength']) {
            errors.push('El nombre debe tener al menos 2 caracteres.');
        }
        if (this.trainerForm.controls.email.errors?.['email']) {
            errors.push('El email no tiene un formato válido.');
        }
        return errors;
    }

    private normalizeError(error: unknown): string {
        if (error instanceof Error && error.message.trim()) {
            return error.message;
        }
        return 'No fue posible completar la operación de entrenadores.';
    }

    private async loadTrainers(): Promise<void> {
        this.loading.set(true);
        this.pageErrors.set([]);
        try {
            const trainers = await this.trainersService.list();
            this.allTrainers.set(trainers);
        } catch (error) {
            this.allTrainers.set([]);
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.loading.set(false);
        }
    }

    private loadCropImage(dataUrl: string): void {
        const image = new Image();
        image.onload = () => {
            this.cropImage = image;
            setTimeout(() => this.renderCropPreview());
        };
        image.src = dataUrl;
    }

    private renderCropPreview(): void {
        const image = this.cropImage;
        const canvas = this.cropCanvas?.nativeElement;
        if (!image || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const zoom = this.cropZoom();
        const srcWidth = image.width / zoom;
        const srcHeight = image.height / zoom;

        const centerX = (image.width - srcWidth) / 2;
        const centerY = (image.height - srcHeight) / 2;
        const maxShiftX = Math.max(0, (image.width - srcWidth) / 2);
        const maxShiftY = Math.max(0, (image.height - srcHeight) / 2);

        const srcX = centerX + (this.cropOffsetX() / 100) * maxShiftX;
        const srcY = centerY + (this.cropOffsetY() / 100) * maxShiftY;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
    }

    private initialsFrom(value: string): string {
        const parts = value
            .split(' ')
            .map((p) => p.trim())
            .filter(Boolean);
        const first = parts[0]?.charAt(0) ?? 'E';
        const second = parts[1]?.charAt(0) ?? '';
        return `${first}${second}`.toUpperCase();
    }
}
