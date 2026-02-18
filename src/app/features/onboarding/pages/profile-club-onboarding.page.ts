import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { OnboardingService } from '../services/onboarding.service';

@Component({
    selector: 'app-profile-club-onboarding-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputTextModule, TextareaModule, MessageModule, ButtonModule, DialogModule, FileUploadModule],
    template: `
        <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
            <p-dialog
                [visible]="true"
                [modal]="true"
                [closable]="false"
                [closeOnEscape]="false"
                [dismissableMask]="false"
                [draggable]="false"
                [resizable]="false"
                [style]="{ width: 'min(760px, 96vw)' }"
                [contentStyle]="{ overflow: 'auto', 'max-height': '85vh' }"
                header="Completa tu cuenta"
            >
                <p class="text-muted-color mb-6">Necesitamos estos datos para habilitar tu club y continuar al dashboard.</p>

                @if (errorMessages().length > 0) {
                    <div class="mb-5 space-y-2">
                        @for (error of errorMessages(); track error) {
                            <p-message severity="error" [text]="error"></p-message>
                        }
                    </div>
                }

                @if (successMessage()) {
                    <div class="mb-5">
                        <p-message severity="success" [text]="successMessage()"></p-message>
                    </div>
                }

                <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
                    <div>
                        <label for="fullName" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Nombre del administrador *</label>
                        <input id="fullName" pInputText formControlName="fullName" class="w-full" placeholder="Nombre completo" />
                    </div>

                    <div>
                        <label for="phone" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Teléfono del club *</label>
                        <input id="phone" pInputText formControlName="phone" class="w-full" placeholder="+57 300 000 0000" />
                    </div>

                    <div>
                        <label for="address" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Dirección principal *</label>
                        <textarea id="address" pTextarea formControlName="address" rows="3" class="w-full" placeholder="Dirección completa"></textarea>
                    </div>

                    <div>
                        <label for="description" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Descripción del club *</label>
                        <textarea id="description" pTextarea formControlName="description" rows="3" class="w-full" placeholder="Describe brevemente el club"></textarea>
                    </div>

                    <div>
                        <label for="slogan" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Slogan del club</label>
                        <input id="slogan" pInputText formControlName="slogan" class="w-full" placeholder="Ej: Formamos campeones con valores" />
                    </div>

                    <div>
                        <label for="mission" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Misión del club</label>
                        <textarea id="mission" pTextarea formControlName="mission" rows="3" class="w-full" placeholder="Describe la misión del club"></textarea>
                    </div>

                    <div>
                        <label for="vision" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Visión del club</label>
                        <textarea id="vision" pTextarea formControlName="vision" rows="3" class="w-full" placeholder="Describe la visión del club"></textarea>
                    </div>

                    <div>
                        <label for="photoFile" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Foto / logo del club *</label>
                        <p-fileupload
                            mode="basic"
                            chooseLabel="Seleccionar imagen"
                            chooseIcon="pi pi-image"
                            name="club-photo[]"
                            accept="image/*"
                            [maxFileSize]="2000000"
                            [auto]="false"
                            [customUpload]="true"
                            (onSelect)="onFileSelected($event)"
                        />
                        @if (photoPreviewUrl()) {
                            <img [src]="photoPreviewUrl()" alt="Preview" class="mt-3 h-24 w-24 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                        }
                    </div>

                    <p-button label="Guardar y continuar" type="submit" styleClass="w-full" [loading]="saving()"></p-button>
                </form>
            </p-dialog>
        </div>
    `
})
export class ProfileClubOnboardingPage implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly onboardingService = inject(OnboardingService);
    private readonly router = inject(Router);

    readonly form = this.fb.nonNullable.group({
        fullName: ['', [Validators.required, Validators.minLength(3)]],
        phone: ['', [Validators.required, Validators.minLength(7)]],
        address: ['', [Validators.required, Validators.minLength(8)]],
        description: ['', [Validators.required, Validators.minLength(12)]],
        slogan: [''],
        mission: [''],
        vision: ['']
    });

    readonly saving = signal(false);
    readonly successMessage = signal('');
    private readonly errors = signal<string[]>([]);
    readonly errorMessages = computed(() => this.errors());
    readonly photoPreviewUrl = signal('');

    private clubId = '';
    private selectedFile: File | null = null;
    private persistedPhotoUrl = '';

    async ngOnInit(): Promise<void> {
        try {
            const context = await this.onboardingService.getContext();
            this.clubId = context.clubId;
            this.persistedPhotoUrl = context.photoUrl;
            this.photoPreviewUrl.set(context.photoUrl);

            this.form.patchValue({
                fullName: context.fullName,
                phone: context.phone,
                address: context.address,
                description: context.description,
                slogan: context.slogan,
                mission: context.mission,
                vision: context.vision
            });

            if (context.isComplete) {
                await this.router.navigateByUrl('/');
            }
        } catch (error) {
            this.errors.set([error instanceof Error ? error.message : 'No fue posible cargar el onboarding.']);
        }
    }

    onFileSelected(event: any): void {
        const file = event?.files?.[0] ?? null;
        this.selectedFile = file;

        if (file) {
            this.photoPreviewUrl.set(URL.createObjectURL(file));
        }
    }

    async submit(): Promise<void> {
        this.successMessage.set('');
        this.errors.set([]);

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.errors.set(this.mapValidationErrors());
            return;
        }

        if (!this.selectedFile && !this.persistedPhotoUrl) {
            this.errors.set(['La foto o logo del club es obligatoria.']);
            return;
        }

        this.saving.set(true);

        try {
            const photoUrl = this.selectedFile ? await this.onboardingService.uploadClubPhoto(this.selectedFile, this.clubId) : this.persistedPhotoUrl;

            await this.onboardingService.completeOnboarding({
                fullName: this.form.controls.fullName.value,
                phone: this.form.controls.phone.value,
                address: this.form.controls.address.value,
                description: this.form.controls.description.value,
                slogan: this.form.controls.slogan.value,
                mission: this.form.controls.mission.value,
                vision: this.form.controls.vision.value,
                photoUrl
            });

            this.persistedPhotoUrl = photoUrl;
            this.successMessage.set('Datos guardados correctamente. Redirigiendo...');
            setTimeout(() => this.router.navigateByUrl('/'), 900);
        } catch (error) {
            this.errors.set([error instanceof Error ? error.message : 'No fue posible guardar el onboarding.']);
        } finally {
            this.saving.set(false);
        }
    }

    private mapValidationErrors(): string[] {
        const messages: string[] = [];
        if (this.form.controls.fullName.errors?.['required']) {
            messages.push('El nombre del administrador es obligatorio.');
        } else if (this.form.controls.fullName.errors?.['minlength']) {
            messages.push('El nombre del administrador debe tener al menos 3 caracteres.');
        }

        if (this.form.controls.phone.errors?.['required']) {
            messages.push('El teléfono del club es obligatorio.');
        } else if (this.form.controls.phone.errors?.['minlength']) {
            messages.push('El teléfono del club debe tener al menos 7 caracteres.');
        }

        if (this.form.controls.address.errors?.['required']) {
            messages.push('La dirección principal es obligatoria.');
        } else if (this.form.controls.address.errors?.['minlength']) {
            messages.push('La dirección principal debe tener al menos 8 caracteres.');
        }

        if (this.form.controls.description.errors?.['required']) {
            messages.push('La descripción del club es obligatoria.');
        } else if (this.form.controls.description.errors?.['minlength']) {
            messages.push('La descripción del club debe tener al menos 12 caracteres.');
        }

        return messages;
    }
}
