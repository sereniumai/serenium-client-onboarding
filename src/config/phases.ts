import type { ServiceKey } from '../types';

/**
 * Three-phase grouping for the client dashboard. Presentation-only: the data
 * model stays service-based, but clients see a "journey with three stages"
 * rather than a flat list of seven services.
 *
 * Change this file alone to reshape the dashboard narrative without touching
 * routes, submissions, or admin views.
 */
export interface PhaseDef {
  key: 'business' | 'presence' | 'agents';
  number: 1 | 2 | 3;
  title: string;
  subtitle: string;
  services: ServiceKey[];
}

export const PHASES: PhaseDef[] = [
  {
    key: 'business',
    number: 1,
    title: 'Tell us about your business',
    subtitle: 'The foundation everything else is built on.',
    services: ['business_profile'],
  },
  {
    key: 'presence',
    number: 2,
    title: 'Connect your online presence',
    subtitle: 'Website, ads, and the platforms where prospects find you.',
    services: ['website', 'facebook_ads', 'google_ads', 'google_business_profile'],
  },
  {
    key: 'agents',
    number: 3,
    title: 'Train your AI team',
    subtitle: 'How your SMS and phone AIs handle every inbound lead.',
    services: ['ai_sms', 'ai_receptionist'],
  },
];

/** Return the phase that owns a given service. */
export function phaseForService(serviceKey: ServiceKey): PhaseDef | null {
  return PHASES.find(p => p.services.includes(serviceKey)) ?? null;
}
