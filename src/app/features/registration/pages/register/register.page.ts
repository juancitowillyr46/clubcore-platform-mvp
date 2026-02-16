import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { RegistrationService } from '../../services/registration.service';

@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule, RouterLink],
    template: `
        <div class="min-h-screen flex items-start lg:items-center justify-center bg-surface-50 dark:bg-surface-950 px-2 py-2 sm:p-6">
            <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-800">
                <section class="hidden lg:block order-2 lg:order-1 p-6 sm:p-8 lg:p-14 bg-gradient-to-br from-cyan-500 to-blue-700 text-white">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm bg-white/20 mb-5 sm:mb-6">ClubCore MVP</span>
                    <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3 sm:mb-4">Crea tu club y empieza a operar en minutos</h1>
                    <p class="text-white/90 text-base sm:text-lg mb-6 sm:mb-8">Registra el administrador principal y deja listo el tenant inicial para tu operación.</p>
                    <div class="space-y-3 text-white/95">
                        <div class="flex items-start gap-3">
                            <i class="pi pi-check-circle mt-1"></i>
                            <span>Onboarding simplificado para el primer administrador.</span>
                        </div>
                        <div class="flex items-start gap-3">
                            <i class="pi pi-check-circle mt-1"></i>
                            <span>Datos mock para desarrollar frontend sin backend real.</span>
                        </div>
                        <div class="flex items-start gap-3">
                            <i class="pi pi-check-circle mt-1"></i>
                            <span>Listo para reemplazar por Supabase + Edge Function.</span>
                        </div>
                    </div>
                </section>
                <section class="order-1 lg:order-2 p-4 sm:p-8 lg:p-14 bg-surface-0 dark:bg-surface-900">
                    <div class="lg:hidden mb-5 p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40">
                        <div class="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300 mb-2">ClubCore MVP</div>
                        <p class="text-sm text-surface-700 dark:text-surface-200">
                            Registra el administrador y el nombre del club para iniciar el onboarding.
                        </p>
                    </div>

                    <h2 class="text-xl sm:text-2xl font-semibold mb-2 text-surface-900 dark:text-surface-0">Registro de Administrador</h2>
                    <p class="text-sm sm:text-base text-muted-color mb-5 sm:mb-8">Completa los datos obligatorios para crear usuario admin y club.</p>

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

                    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4 sm:space-y-6">
                        <div>
                            <label for="email" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Email *</label>
                            <input id="email" pInputText formControlName="email" type="email" class="w-full" placeholder="admin@club.com" />
                        </div>
                        <div>
                            <label for="password" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Contraseña *</label>
                            <p-password
                                inputId="password"
                                formControlName="password"
                                [toggleMask]="true"
                                [feedback]="false"
                                [fluid]="true"
                                placeholder="Mínimo 8 caracteres"
                            />
                        </div>
                        <div>
                            <label for="clubName" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Nombre del club *</label>
                            <input id="clubName" pInputText formControlName="clubName" type="text" class="w-full" placeholder="Club Deportivo Central" />
                        </div>
                        <p-button label="Crear administrador y club" type="submit" styleClass="w-full" [loading]="submitting()"></p-button>
                    </form>

                    <div class="mt-4 sm:mt-6 text-sm text-muted-color">
                        ¿Ya tienes una cuenta?
                        <a routerLink="/auth/login" class="font-semibold text-primary hover:underline">Inicia sesión</a>
                    </div>
                </section>
            </div>
        </div>
    `
})
export class RegisterPage {
    private readonly fb = inject(FormBuilder);
    private readonly registrationService = inject(RegistrationService);

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        clubName: ['', [Validators.required]]
    });

    readonly submitting = signal(false);
    private readonly localErrors = signal<string[]>([]);
    readonly successMessage = signal('');
    readonly errorMessages = computed(() => this.localErrors());

    async submit(): Promise<void> {
        this.successMessage.set('');

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.localErrors.set(this.mapValidationErrors());
            return;
        }

        this.submitting.set(true);
        this.localErrors.set([]);

        const result = await this.registrationService.registerAdminAndClub(this.form.getRawValue());
        this.submitting.set(false);

        if (!result.success || !result.data) {
            this.localErrors.set(result.errors ?? ['No fue posible completar el registro.']);
            return;
        }

        this.form.reset({ email: '', password: '', clubName: '' });
        this.successMessage.set(result.data.message);
    }

    private mapValidationErrors(): string[] {
        const errors: string[] = [];
        const emailErrors = this.form.controls.email.errors;
        const passwordErrors = this.form.controls.password.errors;
        const clubNameErrors = this.form.controls.clubName.errors;

        if (emailErrors?.['required']) {
            errors.push('El email es obligatorio.');
        } else if (emailErrors?.['email']) {
            errors.push('El email no tiene un formato válido.');
        }
        if (passwordErrors?.['required']) {
            errors.push('La contraseña es obligatoria.');
        } else if (passwordErrors?.['minlength']) {
            errors.push('La contraseña debe tener al menos 8 caracteres.');
        }
        if (clubNameErrors?.['required']) {
            errors.push('El nombre del club es obligatorio.');
        }

        return errors;
    }
}
