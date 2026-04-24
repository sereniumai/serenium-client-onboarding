import { Building2, Megaphone, Target, MapPin, MessageSquare, Headphones, Globe, type LucideIcon } from 'lucide-react';
import type { ServiceKey } from '../types';

export const SERVICE_ICON: Record<ServiceKey, LucideIcon> = {
  business_profile: Building2,
  facebook_ads: Megaphone,
  google_ads: Target,
  google_business_profile: MapPin,
  ai_sms: MessageSquare,
  ai_receptionist: Headphones,
  website: Globe,
};
