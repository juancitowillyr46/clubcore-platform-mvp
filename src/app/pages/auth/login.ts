import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { OnboardingService } from '@/app/features/onboarding/services/onboarding.service';
import { SupabaseService } from '@/app/core/services/supabase.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, MessageModule, RouterModule],
    template: `
        <div class="min-h-screen flex items-start lg:items-center justify-center bg-surface-50 dark:bg-surface-950 px-2 py-2 sm:p-6">
            <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-800">
                <section class="hidden lg:block p-6 sm:p-8 lg:p-14 bg-gradient-to-br from-cyan-500 to-blue-700 text-white">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm bg-white/20 mb-5 sm:mb-6">ClubCore MVP</span>
                    <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3 sm:mb-4">Bienvenido de nuevo</h1>
                    <p class="text-white/90 text-base sm:text-lg mb-6 sm:mb-8">Inicia sesión para continuar con la administración de tu club.</p>
                    <div class="space-y-3 text-white/95">
                        <div class="flex items-start gap-3">
                            <i class="pi pi-check-circle mt-1"></i>
                            <span>Acceso seguro con Supabase Auth.</span>
                        </div>
                        <div class="flex items-start gap-3">
                            <i class="pi pi-check-circle mt-1"></i>
                            <span>Flujo preparado para onboarding obligatorio.</span>
                        </div>
                    </div>
                </section>

                <section class="p-4 sm:p-8 lg:p-14 bg-surface-0 dark:bg-surface-900">
                    <div class="lg:hidden mb-5 p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40">
                        <div class="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300 mb-2">ClubCore MVP</div>
                        <p class="text-sm text-surface-700 dark:text-surface-200">Inicia sesión para continuar.</p>
                    </div>

                    <h2 class="text-xl sm:text-2xl font-semibold mb-2 text-surface-900 dark:text-surface-0">Inicio de sesión</h2>
                    <p class="text-sm sm:text-base text-muted-color mb-5 sm:mb-8">Ingresa con tu correo y contraseña.</p>

                    @if (errorMessages().length > 0) {
                        <div class="mb-5 space-y-2">
                            @for (error of errorMessages(); track error) {
                                <p-message severity="error" [text]="error"></p-message>
                            }
                        </div>
                    }

                    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4 sm:space-y-6">
                        <div>
                            <label for="email" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Correo electrónico *</label>
                            <input id="email" pInputText formControlName="email" type="email" class="w-full" placeholder="admin@club.com" />
                        </div>
                        <div>
                            <label for="password" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">Contraseña *</label>
                            <p-password inputId="password" formControlName="password" [toggleMask]="true" [feedback]="false" [fluid]="true" placeholder="Mínimo 8 caracteres" />
                        </div>
                        <p-button label="Iniciar sesión" type="submit" styleClass="w-full" [loading]="loading()"></p-button>
                    </form>

                    <div class="mt-4 sm:mt-6 text-sm text-muted-color">
                        ¿No tienes cuenta?
                        <a routerLink="/auth/register" class="font-semibold text-primary hover:underline">Regístrate</a>
                    </div>
                </section>
            </div>
        </div>
    `
})
export class Login implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly supabase = inject(SupabaseService);
    private readonly onboardingService = inject(OnboardingService);
    private readonly router = inject(Router);

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]]
    });

    readonly loading = signal(false);
    private readonly localErrors = signal<string[]>([]);
    readonly errorMessages = computed(() => this.localErrors());

    async ngOnInit(): Promise<void> {
        const { data } = await this.supabase.client.auth.getSession();
        if (data.session?.user) {
            const isComplete = await this.onboardingService.isComplete();
            await this.router.navigateByUrl(isComplete ? '/' : '/onboarding/profile-club');
        }
    }

    async submit(): Promise<void> {
        this.localErrors.set([]);

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.localErrors.set(this.mapValidationErrors());
            return;
        }

        this.loading.set(true);
        const { email, password } = this.form.getRawValue();
        const { error } = await this.supabase.client.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        });
        this.loading.set(false);

        if (error) {
            const normalized = error.message.toLowerCase();
            if (normalized.includes('invalid login credentials')) {
                this.localErrors.set(['Correo o contraseña incorrectos.']);
            } else {
                this.localErrors.set([error.message]);
            }
            return;
        }

        const isComplete = await this.onboardingService.isComplete();
        await this.router.navigateByUrl(isComplete ? '/' : '/onboarding/profile-club');
    }

    private mapValidationErrors(): string[] {
        const messages: string[] = [];
        const emailErrors = this.form.controls.email.errors;
        const passwordErrors = this.form.controls.password.errors;

        if (emailErrors?.['required']) {
            messages.push('El correo electrónico es obligatorio.');
        } else if (emailErrors?.['email']) {
            messages.push('El correo electrónico no tiene un formato válido.');
        }
        if (passwordErrors?.['required']) {
            messages.push('La contraseña es obligatoria.');
        } else if (passwordErrors?.['minlength']) {
            messages.push('La contraseña debe tener al menos 8 caracteres.');
        }

        return messages;
    }
}
