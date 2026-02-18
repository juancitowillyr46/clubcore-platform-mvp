export interface OnboardingContext {
    userId: string;
    clubId: string;
    fullName: string;
    phone: string;
    address: string;
    description: string;
    slogan: string;
    mission: string;
    vision: string;
    photoUrl: string;
    isComplete: boolean;
}

export interface CompleteOnboardingPayload {
    fullName: string;
    phone: string;
    address: string;
    description: string;
    slogan: string;
    mission: string;
    vision: string;
    photoUrl: string;
}
