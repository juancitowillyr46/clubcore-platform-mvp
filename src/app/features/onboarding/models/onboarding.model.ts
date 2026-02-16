export interface OnboardingContext {
    userId: string;
    clubId: string;
    fullName: string;
    phone: string;
    address: string;
    photoUrl: string;
    isComplete: boolean;
}

export interface CompleteOnboardingPayload {
    fullName: string;
    phone: string;
    address: string;
    photoUrl: string;
}
