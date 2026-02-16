import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RegistrationService } from '@/app/features/registration/services/registration.service';

@Component({
    selector: 'app-auth-callback',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule, MessageModule, ButtonModule],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4 py-6">
            <div class="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-xl">
                <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-2">Casi listo</h1>
                <p class="text-sm text-muted-color mb-5">Estamos terminando la configuración inicial de tu cuenta.</p>

                @if (state() === 'loading') {
                    <div class="flex items-center gap-3 mb-4">
                        <p-progress-spinner styleClass="w-8 h-8" strokeWidth="7"></p-progress-spinner>
                        <p class="text-muted-color">Validando confirmación y creando tu club...</p>
                    </div>
                }

                @if (state() === 'error') {
                    <div class="space-y-2 mb-5">
                        @for (error of errors(); track error) {
                            <p-message severity="error" [text]="error"></p-message>
                        }
                    </div>
                    <p-button label="Ir a login" styleClass="w-full" (onClick)="goToLogin()"></p-button>
                }

                @if (state() === 'success') {
                    <div class="mb-5">
                        <p-message severity="success" [text]="successMessage()"></p-message>
                    </div>
                    <p-button label="Ir al inicio" styleClass="w-full" (onClick)="goToDashboard()"></p-button>
                }
            </div>
        </div>
    `
})
export class AuthCallbackPage implements OnInit {
    private readonly registrationService = inject(RegistrationService);
    private readonly router = inject(Router);

    readonly state = signal<'loading' | 'success' | 'error'>('loading');
    readonly errors = signal<string[]>([]);
    readonly successMessage = signal('Procesamiento completado.');

    async ngOnInit(): Promise<void> {
        const result = await this.registrationService.completeOnboardingAfterConfirmation();

        if (!result.success) {
            this.state.set('error');
            this.errors.set(result.errors ?? ['No fue posible completar el onboarding.']);
            return;
        }

        this.state.set('success');
        this.successMessage.set(result.message ?? 'Cuenta y club listos.');
        setTimeout(() => this.router.navigateByUrl('/'), 1200);
    }

    goToLogin(): void {
        void this.router.navigateByUrl('/auth/login');
    }

    goToDashboard(): void {
        void this.router.navigateByUrl('/');
    }
}
