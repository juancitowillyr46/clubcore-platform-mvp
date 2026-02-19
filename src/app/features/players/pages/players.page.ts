import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
import { Player, PlayerGuardian, PlayerInput } from '../models/player.model';
import { PlayersMockService } from '../services/players-mock.service';

type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

interface SelectItem {
    label: string;
    value: string;
}

@Component({
    selector: 'app-players-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, MessageModule, ButtonModule, DialogModule, FileUploadModule, PaginatorModule, TagModule, CheckboxModule, SelectModule],
    styles: [
        `
            :host ::ng-deep .player-photo-upload .p-fileupload-file-name,
            :host ::ng-deep .player-photo-upload .p-fileupload-file-label {
                display: none;
            }
        `
    ],
    template: `
        <div class="p-4 sm:p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div class="mb-5">
                <h1 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-surface-0">Jugadores</h1>
                <p class="text-muted-color">Administra jugadores y tutores legales con una experiencia mobile first.</p>
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
                    <input pInputText [value]="searchTerm()" (input)="onSearchChange($event)" class="w-full lg:col-span-2" placeholder="Buscar por nombre o apellidos..." />
                    <p-select [options]="sortOptions" optionLabel="label" optionValue="value" [ngModel]="sortBy()" (onChange)="onSortChange($event.value)" class="w-full"></p-select>
                    <p-button label="Nuevo jugador" icon="pi pi-plus" [disabled]="loading()" (onClick)="openCreateDialog()"></p-button>
                </div>
                <p class="text-sm text-muted-color m-0">{{ filteredPlayers().length }} jugadores</p>
            </div>

            <div class="flex flex-wrap gap-2 mb-4">
                <p-button label="Dar de baja seleccionados" icon="pi pi-trash" severity="danger" [outlined]="true" [disabled]="selectedIds().length === 0 || loading()" (onClick)="askBulkDeactivate()"></p-button>
                <span class="text-sm text-muted-color self-center">Seleccionados: {{ selectedIds().length }}</span>
            </div>

            @if (loading()) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">Cargando jugadores...</div>
            } @else if (pagedPlayers().length === 0) {
                <div class="p-5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-muted-color">No hay jugadores para mostrar.</div>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (player of pagedPlayers(); track player.id) {
                        <article class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm flex flex-col">
                            <div class="flex items-start justify-between gap-2 mb-3">
                                <div class="flex items-start gap-2">
                                    <p-checkbox [binary]="true" [ngModel]="isSelected(player.id)" (onChange)="toggleSelection(player.id, !!$event.checked)"></p-checkbox>
                                    @if (hasPhoto(player.photoUrl)) {
                                        <img [src]="player.photoUrl" [alt]="fullName(player)" class="w-12 h-12 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                                    } @else {
                                        <div class="w-12 h-12 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xs font-semibold text-surface-700 dark:text-surface-200">{{ initials(fullName(player)) }}</div>
                                    }
                                    <div>
                                        <p class="text-base font-semibold text-surface-900 dark:text-surface-0 leading-tight m-0">{{ fullName(player) }}</p>
                                        <div class="mt-1 text-xs text-muted-color min-h-[2.5rem] flex flex-col justify-start">
                                            <p class="m-0 leading-5">Sede: {{ optionLabel(venueOptions, player.venueId, 'Sin sede') }}</p>
                                            <p class="m-0 leading-5">Equipo: {{ optionLabel(teamOptions, player.teamId, 'Sin equipo') }}</p>
                                        </div>
                                    </div>
                                </div>
                                <p-tag [value]="player.isActive ? 'Activo' : 'Inactivo'" [severity]="player.isActive ? 'success' : 'danger'"></p-tag>
                            </div>

                            <p class="text-sm text-muted-color mb-4">Tutor principal: <span class="font-medium text-surface-800 dark:text-surface-100">{{ primaryGuardianSummary(player) }}</span></p>

                            <div class="flex gap-2 mt-auto">
                                <p-button label="Editar" icon="pi pi-pencil" [outlined]="true" [disabled]="!player.isActive || loading()" (onClick)="openEditDialog(player)"></p-button>
                                <p-button label="Dar de baja" icon="pi pi-trash" severity="danger" [outlined]="true" [disabled]="!player.isActive || loading()" (onClick)="askSingleDeactivate(player)"></p-button>
                            </div>
                        </article>
                    }
                </div>
            }

            <div class="mt-5">
                <p-paginator [first]="first()" [rows]="rows()" [totalRecords]="filteredPlayers().length" [rowsPerPageOptions]="[6, 9, 12]" (onPageChange)="onPageChange($event)"></p-paginator>
            </div>
        </div>

        <p-dialog [header]="editingPlayerId() ? 'Editar jugador' : 'Nuevo jugador'" [modal]="true" [(visible)]="showFormDialog" [style]="{ width: 'min(920px, 98vw)' }">
            <form [formGroup]="playerForm" class="space-y-4" (ngSubmit)="savePlayer()">
                <div class="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
                    <div>
                        <label class="block mb-2 text-sm font-medium">Foto</label>
                        <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                            <div class="flex justify-center mb-3">
                                @if (hasPhoto(currentPhotoPreview())) {
                                    <img [src]="currentPhotoPreview()" alt="Vista previa jugador" class="w-24 h-24 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                                } @else {
                                    <div class="w-24 h-24 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-lg font-semibold text-surface-700 dark:text-surface-200">{{ initials(playerForm.controls.firstName.value || 'JU') }}</div>
                                }
                            </div>
                            <div class="flex items-center justify-center gap-2">
                                <p-fileUpload styleClass="player-photo-upload" mode="basic" name="photo" accept="image/*" chooseLabel="Subir" chooseIcon="pi pi-camera" [auto]="false" [customUpload]="true" (onSelect)="onPhotoSelect($event)">
                                    <ng-template pTemplate="filelabel"></ng-template>
                                </p-fileUpload>
                                <p-button icon="pi pi-trash" severity="secondary" [outlined]="true" (onClick)="clearPhoto()"></p-button>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4">
                            <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">Informacion basica</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><label class="block mb-2 text-sm font-medium">Nombre completo *</label><input pInputText formControlName="firstName" class="w-full" placeholder="Mateo" /></div>
                                <div><label class="block mb-2 text-sm font-medium">Apellido paterno *</label><input pInputText formControlName="lastName" class="w-full" placeholder="Gomez" /></div>
                                <div><label class="block mb-2 text-sm font-medium">Apellido materno</label><input pInputText formControlName="middleName" class="w-full" placeholder="Lopez" /></div>
                                <div><label class="block mb-2 text-sm font-medium">Fecha de nacimiento</label><input pInputText type="date" formControlName="birthDate" class="w-full" /></div>
                                <div><label class="block mb-2 text-sm font-medium">Email</label><input pInputText formControlName="email" class="w-full" placeholder="jugador@club.com" /></div>
                                <div><label class="block mb-2 text-sm font-medium">Telefono</label><input pInputText formControlName="phone" class="w-full" placeholder="+57 300 000 0000" /></div>
                                <div><label class="block mb-2 text-sm font-medium">Nacionalidad</label><input pInputText formControlName="nationality" class="w-full" placeholder="Colombiana" /></div>
                                <div><label class="block mb-2 text-sm font-medium">N° carnet de jugador</label><input pInputText formControlName="playerCardNumber" class="w-full" placeholder="CCM-001" /></div>
                            </div>
                        </section>

                        <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4">
                            <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">Detalle del jugador</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><label class="block mb-2 text-sm font-medium">Posicion de juego</label><p-select [options]="positionOptions" optionLabel="label" optionValue="value" formControlName="position" [appendTo]="'body'" class="w-full"></p-select></div>
                                <div><label class="block mb-2 text-sm font-medium">Pie dominante</label><p-select [options]="dominantFootOptions" optionLabel="label" optionValue="value" formControlName="dominantFoot" [appendTo]="'body'" class="w-full"></p-select></div>
                                <div><label class="block mb-2 text-sm font-medium">Sede</label><p-select [options]="venueOptions" optionLabel="label" optionValue="value" formControlName="venueId" [appendTo]="'body'" class="w-full"></p-select></div>
                                <div><label class="block mb-2 text-sm font-medium">Equipo</label><p-select [options]="teamOptions" optionLabel="label" optionValue="value" formControlName="teamId" [appendTo]="'body'" class="w-full"></p-select></div>
                            </div>
                        </section>

                        <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4">
                            <div class="flex items-center justify-between mb-3">
                                <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 m-0">Tutores legales</p>
                                <p-button label="Agregar tutor" icon="pi pi-plus" [text]="true" (onClick)="addGuardian()"></p-button>
                            </div>
                            @if (guardians().length === 0) {
                                <p class="text-sm text-muted-color m-0">Agrega al menos un tutor.</p>
                            } @else {
                                <div class="space-y-3">
                                    @for (guardian of guardians(); track $index) {
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                                            <div><label class="block mb-2 text-sm font-medium">Nombre completo *</label><input pInputText [ngModel]="guardian.fullName" (ngModelChange)="updateGuardian($index, 'fullName', $event)" [ngModelOptions]="{ standalone: true }" class="w-full" /></div>
                                            <div><label class="block mb-2 text-sm font-medium">Apellido paterno *</label><input pInputText [ngModel]="guardian.lastName" (ngModelChange)="updateGuardian($index, 'lastName', $event)" [ngModelOptions]="{ standalone: true }" class="w-full" /></div>
                                            <div><label class="block mb-2 text-sm font-medium">Apellido materno</label><input pInputText [ngModel]="guardian.middleName" (ngModelChange)="updateGuardian($index, 'middleName', $event)" [ngModelOptions]="{ standalone: true }" class="w-full" /></div>
                                            <div><label class="block mb-2 text-sm font-medium">Email</label><input pInputText [ngModel]="guardian.email" (ngModelChange)="updateGuardian($index, 'email', $event)" [ngModelOptions]="{ standalone: true }" class="w-full" /></div>
                                            <div><label class="block mb-2 text-sm font-medium">Telefono *</label><input pInputText [ngModel]="guardian.phone" (ngModelChange)="updateGuardian($index, 'phone', $event)" [ngModelOptions]="{ standalone: true }" class="w-full" /></div>
                                            <div class="flex items-center justify-between">
                                                <p-checkbox [binary]="true" [ngModel]="guardian.isPrimary" (onChange)="setPrimaryGuardian($index, !!$event.checked)" [ngModelOptions]="{ standalone: true }" label="Tutor principal"></p-checkbox>
                                                <p-button icon="pi pi-trash" severity="danger" [outlined]="true" (onClick)="removeGuardian($index)"></p-button>
                                            </div>
                                        </div>
                                    }
                                </div>
                            }
                        </section>
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

        <p-dialog header="Confirmar baja" [modal]="true" [(visible)]="showConfirmDialog" [style]="{ width: 'min(460px, 92vw)' }">
            <p class="mb-4 text-surface-700 dark:text-surface-200">{{ confirmMessage() }}</p>
            <p class="mb-4 text-sm text-muted-color">{{ confirmImpactMessage() }}</p>
            <div class="flex justify-end gap-2">
                <p-button label="Cancelar" [text]="true" [disabled]="deactivating()" (onClick)="cancelConfirm()"></p-button>
                <p-button label="Si, dar de baja" severity="danger" [loading]="deactivating()" (onClick)="confirmDeactivate()"></p-button>
            </div>
        </p-dialog>
    `
})
export class PlayersPage {
    private readonly playersService = inject(PlayersMockService);
    private readonly fb = inject(FormBuilder);

    readonly allPlayers = signal<Player[]>([]);
    readonly guardians = signal<PlayerGuardian[]>([]);
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
        { label: 'Mas recientes', value: 'created_desc' as SortOption },
        { label: 'Mas antiguos', value: 'created_asc' as SortOption },
        { label: 'Nombre A-Z', value: 'name_asc' as SortOption },
        { label: 'Nombre Z-A', value: 'name_desc' as SortOption }
    ];
    readonly venueOptions: SelectItem[] = [
        { label: 'Sede Central', value: 'venue-central' },
        { label: 'Sede Norte', value: 'venue-norte' }
    ];
    readonly teamOptions: SelectItem[] = [
        { label: 'Sub-8', value: 'team-u8' },
        { label: 'Sub-10', value: 'team-u10' },
        { label: 'Sub-12', value: 'team-u12' }
    ];
    readonly positionOptions: SelectItem[] = [
        { label: 'Portero', value: 'Portero' },
        { label: 'Defensa', value: 'Defensa' },
        { label: 'Volante', value: 'Volante' },
        { label: 'Delantero', value: 'Delantero' }
    ];
    readonly dominantFootOptions: SelectItem[] = [
        { label: 'Derecho', value: 'Derecho' },
        { label: 'Izquierdo', value: 'Izquierdo' },
        { label: 'Ambidiestro', value: 'Ambidiestro' }
    ];

    showFormDialog = false;
    showConfirmDialog = false;
    readonly editingPlayerId = signal<string | null>(null);
    readonly formErrors = signal<string[]>([]);
    readonly confirmMessage = signal('Deseas dar de baja este jugador?');
    readonly confirmImpactMessage = signal('El jugador quedara inactivo y no se eliminara fisicamente.');
    readonly currentPhotoPreview = signal('');
    private idsToDeactivate: string[] = [];

    readonly playerForm = this.fb.nonNullable.group({
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        middleName: [''],
        birthDate: [''],
        email: ['', [Validators.email]],
        phone: [''],
        nationality: [''],
        playerCardNumber: [''],
        photoUrl: [''],
        position: [''],
        dominantFoot: [''],
        venueId: [''],
        teamId: ['']
    });

    readonly filteredPlayers = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const sorted = [...this.allPlayers()].sort((a, b) => this.comparePlayers(a, b, this.sortBy()));
        if (!term) return sorted;
        return sorted.filter((player) => this.fullName(player).toLowerCase().includes(term));
    });

    readonly pagedPlayers = computed(() => {
        const start = this.first();
        const end = start + this.rows();
        return this.filteredPlayers().slice(start, end);
    });

    constructor() {
        this.loadPlayers();
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

    openCreateDialog(): void {
        this.editingPlayerId.set(null);
        this.playerForm.reset({ firstName: '', lastName: '', middleName: '', birthDate: '', email: '', phone: '', nationality: '', playerCardNumber: '', photoUrl: '', position: '', dominantFoot: '', venueId: '', teamId: '' });
        this.guardians.set([]);
        this.currentPhotoPreview.set('');
        this.formErrors.set([]);
        this.pageErrors.set([]);
        this.showFormDialog = true;
    }

    openEditDialog(player: Player): void {
        this.editingPlayerId.set(player.id);
        this.playerForm.reset({
            firstName: player.firstName,
            lastName: player.lastName,
            middleName: player.middleName,
            birthDate: player.birthDate,
            email: player.email,
            phone: player.phone,
            nationality: player.nationality,
            playerCardNumber: player.playerCardNumber,
            photoUrl: player.photoUrl,
            position: player.position,
            dominantFoot: player.dominantFoot,
            venueId: player.venueId,
            teamId: player.teamId
        });
        this.guardians.set(player.guardians.map((item) => ({ ...item })));
        this.currentPhotoPreview.set(player.photoUrl);
        this.formErrors.set([]);
        this.pageErrors.set([]);
        this.showFormDialog = true;
    }

    closeFormDialog(): void {
        this.showFormDialog = false;
    }

    onPhotoSelect(event: FileSelectEvent): void {
        const file = event.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.pageErrors.set(['El archivo seleccionado no es una imagen valida.']);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            this.currentPhotoPreview.set(dataUrl);
            this.playerForm.patchValue({ photoUrl: dataUrl });
        };
        reader.readAsDataURL(file);
    }

    clearPhoto(): void {
        this.currentPhotoPreview.set('');
        this.playerForm.patchValue({ photoUrl: '' });
    }

    addGuardian(): void {
        this.guardians.set([
            ...this.guardians(),
            {
                fullName: '',
                lastName: '',
                middleName: '',
                email: '',
                phone: '',
                isPrimary: this.guardians().length === 0
            }
        ]);
    }

    removeGuardian(index: number): void {
        const next = this.guardians().filter((_, i) => i !== index);
        if (next.length > 0 && !next.some((item) => item.isPrimary)) {
            next[0] = { ...next[0], isPrimary: true };
        }
        this.guardians.set(next);
    }

    updateGuardian(index: number, field: keyof PlayerGuardian, value: string): void {
        this.guardians.set(this.guardians().map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    }

    setPrimaryGuardian(index: number, checked: boolean): void {
        if (!checked) {
            this.guardians.set(this.guardians().map((item, i) => (i === index ? { ...item, isPrimary: false } : item)));
            return;
        }
        this.guardians.set(this.guardians().map((item, i) => ({ ...item, isPrimary: i === index })));
    }

    async savePlayer(): Promise<void> {
        this.formErrors.set([]);
        this.pageErrors.set([]);
        if (this.playerForm.invalid) {
            this.playerForm.markAllAsTouched();
            this.formErrors.set(this.buildFormErrors());
            return;
        }

        const guardianErrors = this.validateGuardians(this.guardians());
        if (guardianErrors.length) {
            this.formErrors.set(guardianErrors);
            return;
        }

        this.saving.set(true);
        const payload: PlayerInput = {
            ...this.playerForm.getRawValue(),
            photoUrl: this.currentPhotoPreview() || this.playerForm.controls.photoUrl.value,
            guardians: this.guardians().map((item) => ({ ...item, fullName: item.fullName.trim(), lastName: item.lastName.trim(), middleName: item.middleName.trim(), email: item.email.trim(), phone: item.phone.trim() }))
        };

        const editingId = this.editingPlayerId();
        try {
            if (editingId) {
                await this.playersService.update(editingId, payload);
            } else {
                await this.playersService.create(payload);
            }

            await this.loadPlayers();
            this.showFormDialog = false;
        } catch (error) {
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.saving.set(false);
        }
    }

    askSingleDeactivate(player: Player): void {
        this.idsToDeactivate = [player.id];
        this.confirmMessage.set(`Deseas dar de baja al jugador "${this.fullName(player)}"?`);
        this.confirmImpactMessage.set('El jugador quedara inactivo y no podra asignarse a procesos nuevos.');
        this.showConfirmDialog = true;
    }

    askBulkDeactivate(): void {
        this.idsToDeactivate = [...this.selectedIds()];
        this.confirmMessage.set(`Deseas dar de baja ${this.idsToDeactivate.length} jugadores seleccionados?`);
        this.confirmImpactMessage.set('Los jugadores seleccionados quedaran inactivos y no se eliminaran fisicamente.');
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
            await this.playersService.softDelete(this.idsToDeactivate);
            await this.loadPlayers();
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

    fullName(player: Player): string {
        return `${player.firstName} ${player.lastName} ${player.middleName}`.replace(/\s+/g, ' ').trim();
    }

    hasPhoto(photoUrl: string): boolean {
        return Boolean(photoUrl && photoUrl.trim());
    }

    initials(value: string): string {
        const parts = value
            .split(' ')
            .map((item) => item.trim())
            .filter(Boolean);
        const first = parts[0]?.charAt(0) ?? 'J';
        const second = parts[1]?.charAt(0) ?? '';
        return `${first}${second}`.toUpperCase();
    }

    optionLabel(options: SelectItem[], value: string, fallback: string): string {
        return options.find((item) => item.value === value)?.label ?? fallback;
    }

    primaryGuardianSummary(player: Player): string {
        const primary = player.guardians.find((item) => item.isPrimary) ?? player.guardians[0];
        if (!primary) return 'Sin tutor';
        return `${primary.fullName} ${primary.lastName}`.trim();
    }

    private comparePlayers(a: Player, b: Player, sort: SortOption): number {
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
        if (this.playerForm.controls.firstName.errors?.['required']) errors.push('El nombre completo es obligatorio.');
        if (this.playerForm.controls.lastName.errors?.['required']) errors.push('El apellido paterno es obligatorio.');
        if (this.playerForm.controls.email.errors?.['email']) errors.push('El email del jugador no tiene formato valido.');
        return errors;
    }

    private validateGuardians(guardians: PlayerGuardian[]): string[] {
        const errors: string[] = [];
        if (guardians.length === 0) {
            errors.push('Debes registrar al menos un tutor legal.');
            return errors;
        }

        if (!guardians.some((item) => item.isPrimary)) {
            errors.push('Debes marcar un tutor principal.');
        }

        guardians.forEach((guardian, index) => {
            const num = index + 1;
            if (!guardian.fullName.trim()) errors.push(`Tutor ${num}: el nombre completo es obligatorio.`);
            if (!guardian.lastName.trim()) errors.push(`Tutor ${num}: el apellido paterno es obligatorio.`);
            if (!guardian.phone.trim()) errors.push(`Tutor ${num}: el telefono es obligatorio.`);
            if (guardian.email.trim() && !/^\S+@\S+\.\S+$/.test(guardian.email.trim())) {
                errors.push(`Tutor ${num}: el email no tiene formato valido.`);
            }
        });

        return errors;
    }

    private normalizeError(error: unknown): string {
        if (error instanceof Error && error.message.trim()) return error.message;
        return 'No fue posible completar la operacion de jugadores.';
    }

    private async loadPlayers(): Promise<void> {
        this.loading.set(true);
        this.pageErrors.set([]);
        try {
            this.allPlayers.set(await this.playersService.list());
        } catch (error) {
            this.allPlayers.set([]);
            this.pageErrors.set([this.normalizeError(error)]);
        } finally {
            this.loading.set(false);
        }
    }
}
