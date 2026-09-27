export const APPLICATION_CATEGORIES = [
  {
    value: 'service_provider',
    label: 'Service Providers',
    types: [
      ['catering', 'Catering', 'Food and beverage services'],
      ['decor', 'Decor', 'Event decoration and styling'],
      ['photography_videography', 'Photography / Videography', 'Photo and video coverage'],
      ['sound_lighting', 'Sound / Lighting', 'Audio, lighting, and technical services'],
      ['security', 'Security', 'Event security services'],
      ['dj', 'DJ', 'Music and DJ services'],
      ['mc', 'MC / Host', 'Event hosting and presentation'],
    ],
  },
  {
    value: 'event_operations',
    label: 'Event Operations Staff',
    types: [
      ['gate_scanner', 'Gate Scanner', 'Ticket scanning and check-in'],
      ['usher', 'Usher', 'Guest assistance and directions'],
      ['stage_manager', 'Stage Manager', 'Stage coordination and timing'],
    ],
  },
  {
    value: 'talent_contributor',
    label: 'Talent & Contributors',
    types: [
      ['artist_performer', 'Artist / Performer', 'Live performance, music, or dance'],
      ['speaker', 'Speaker', 'Talk, panel, or workshop contribution'],
    ],
  },
  {
    value: 'participant_competitor',
    label: 'Participants & Competitors',
    types: [
      ['contestant', 'Contestant', 'Competition entry'],
      ['volunteer', 'Volunteer', 'Event support'],
      ['participant', 'Participant', 'General event participation'],
    ],
  },
  {
    value: 'commercial_partner',
    label: 'Commercial & Strategic Partners',
    types: [
      ['sponsor', 'Sponsor', 'Financial or in-kind sponsorship'],
      ['event_partner', 'Event Partner', 'Strategic event partnership'],
      ['ambassador', 'Ambassador', 'Promote and represent the event'],
    ],
  },
] as const;

export type ApplicationType = (typeof APPLICATION_CATEGORIES)[number]['types'][number][0];
export type ApplicationCategory = (typeof APPLICATION_CATEGORIES)[number]['value'];

export interface ApplicationTypeOption {
  value: ApplicationType;
  label: string;
  description: string;
  category: ApplicationCategory;
}

export const APPLICATION_TYPES: ApplicationTypeOption[] = APPLICATION_CATEGORIES.flatMap((category) =>
  category.types.map(([value, label, description]) => ({
    value,
    label,
    description,
    category: category.value,
  })),
);

export const APPLICATION_PROCESSING_FEE_KOBO = 500_000;

const FEE_REQUIRED_TYPES = new Set<ApplicationType>([
  'catering',
  'decor',
  'photography_videography',
  'sound_lighting',
  'dj',
  'mc',
  'artist_performer',
]);

export function getApplicationFeeKobo(type: string): number | null {
  if (!APPLICATION_TYPES.some((option) => option.value === type)) return null;
  return FEE_REQUIRED_TYPES.has(type as ApplicationType) ? APPLICATION_PROCESSING_FEE_KOBO : 0;
}

export function validateApplicationPayment(
  transaction: any,
  application: any,
  userId: string,
  reference: string,
): string | null {
  if (!transaction || transaction.status !== 'success') return 'Paystack transaction is not successful';
  if (transaction.reference !== reference || application.paystack_reference !== reference) {
    return 'Payment reference does not match this application';
  }
  if (transaction.currency !== 'NGN') return 'Payment currency is not NGN';
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount !== Number(application.application_fee_kobo)) {
    return 'Payment amount does not match the application fee';
  }

  const metadata = transaction.metadata;
  if (
    metadata?.type !== 'event_application' ||
    String(metadata.application_id) !== String(application.id) ||
    String(metadata.user_id) !== String(userId)
  ) {
    return 'Payment metadata does not match this application';
  }

  return null;
}