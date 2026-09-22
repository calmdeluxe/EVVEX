/**
 * EVEX — Controlled Account-Type & Role Architecture
 * 
 * Conceptual Separation:
 * 1. Platform Roles: Privileged platform authority (ADMIN, MPR, NONE)
 * 2. Account Types / User Types: Primary platform persona (EVENT_CREATOR, PATRON, VENDOR)
 * 3. Entitlements: Paid or tier-based privileges (e.g. VIP_PREMIUM, STANDARD)
 * 4. Event-Specific Access: Contextual event permissions (EVENT_HOST, EVENT_STAFF, EVENT_SCANNER, EVENT_PARTICIPANT)
 */

/** Legacy CalmReader account tier strings preserved for backwards compatibility */
export type LegacyAccountTier = 
  | 'free' 
  | 'premium' 
  | 'author' 
  | 'admin' 
  | 'marketing_partner' 
  | 'mpr';

/** Legacy / database app_role values */
export type LegacyAppRole = 
  | 'admin' 
  | 'mpr' 
  | 'event_host' 
  | 'patron' 
  | 'guest' 
  | string;

/** EVEX Platform Roles: Privileged system-level authority */
export type EvexPlatformRole = 
  | 'ADMIN' 
  | 'MPR' 
  | 'NONE';

/** EVEX Account Types: The primary identity persona of a user */
export type EvexAccountType = 
  | 'EVENT_CREATOR' 
  | 'PATRON' 
  | 'VENDOR';

/** EVEX Entitlements: Tier or subscription-level privileges */
export type EvexEntitlement = 
  | 'STANDARD' 
  | 'VIP_PREMIUM';

/** EVEX Event-Specific Access: Contextual permissions within a specific event */
export type EvexEventAccessRole = 
  | 'EVENT_HOST' 
  | 'EVENT_STAFF' 
  | 'EVENT_SCANNER' 
  | 'EVENT_PARTICIPANT' 
  | 'NONE';

/** Fully resolved EVEX identity context */
export interface ResolvedEvexUserContext {
  /** The underlying database profile record */
  rawProfile: any;
  /** Primary identity persona */
  accountType: EvexAccountType;
  /** Platform-wide privileged authority */
  platformRole: EvexPlatformRole;
  /** Active user entitlements (VIP, Premium, etc.) */
  entitlements: EvexEntitlement[];
  /** Convenience flag: Has VIP or Premium entitlement */
  isVip: boolean;
  /** Convenience flag: Is Platform Administrator */
  isAdmin: boolean;
  /** Convenience flag: Is Marketing Partner (MPR) */
  isMpr: boolean;
  /** Convenience flag: Is Event Creator */
  isEventCreator: boolean;
  /** Convenience flag: Is Patron */
  isPatron: boolean;
  /** Convenience flag: Is Vendor */
  isVendor: boolean;
  /** Preserved legacy CalmReader tier for backwards compatibility */
  legacyTier: LegacyAccountTier;
}

/**
 * Event-Specific Permission Context:
 * Contextual access rules scoped strictly to a single event record.
 * These do NOT grant global platform authority.
 */
export interface EvexEventPermissionContext {
  eventId: string;
  eventHostId?: string;
  staffRole?: EvexEventAccessRole;
}

/**
 * High-level centralized authorization capabilities evaluation.
 */
export interface EvexUserAuthorization {
  canAccessAdmin: boolean;
  canAccessMpr: boolean;
  canCreateEvents: boolean;
  canManageEvent: (event?: { id?: string; user_id?: string; creator_id?: string; host_id?: string } | null, staffRole?: EvexEventAccessRole) => boolean;
  canScanEventTickets: (event?: { id?: string; user_id?: string; host_id?: string } | null, staffRole?: EvexEventAccessRole) => boolean;
}

