import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { OnboardingService } from '../services/onboarding.service';

@Component({
    selector: 'app-profile-club-onboarding-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputTextModule, TextareaModule, MessageModule, ButtonModule],
    template: `
        <div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-3 py-6">
            <div class="w-full max-w-2xl rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-xl p-5 sm:p-8">
                <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-2">Completa tu cuenta</h1>
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
                        <label for="address" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Dirección del club *</label>
                        <textarea id="address" pTextarea formControlName="address" rows="3" class="w-full" placeholder="Dirección completa"></textarea>
                    </div>

                    <div>
                        <label for="photoFile" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Foto / logo del club *</label>
                        <input id="photoFile" type="file" accept="image/*" class="w-full text-sm" (change)="onFileSelected($event)" />
                        @if (photoPreviewUrl()) {
                            <img [src]="photoPreviewUrl()" alt="Preview" class="mt-3 h-24 w-24 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                        }
                    </div>

                    <p-button label="Guardar y continuar" type="submit" styleClass="w-full" [loading]="saving()"></p-button>
                </form>
            </div>
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
        address: ['', [Validators.required, Validators.minLength(8)]]
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
                address: context.address
            });

            if (context.isComplete) {
                await this.router.navigateByUrl('/');
            }
        } catch (error) {
            this.errors.set([error instanceof Error ? error.message : 'No fue posible cargar el onboarding.']);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
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
            messages.push('La dirección del club es obligatoria.');
        } else if (this.form.controls.address.errors?.['minlength']) {
            messages.push('La dirección del club debe tener al menos 8 caracteres.');
        }

        return messages;
    }
}
