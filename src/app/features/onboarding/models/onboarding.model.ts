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
    hasVenue: boolean;
    isClubProfileComplete: boolean;
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

export interface CreateInitialVenuePayload {
    name: string;
    address: string;
}
