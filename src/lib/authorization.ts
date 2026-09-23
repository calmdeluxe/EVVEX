/**
 * EVEX — Centralized Role Architecture & Authorization Hardening
 * 
 * Rules:
 * 1. ADMIN is a protected platform authority; never an unverified frontend selection.
 * 2. MPR (Marketing Partner Role) is a protected platform role for marketing & attribution.
 * 3. EVENT_CREATOR, PATRON, and VENDOR are Account Types (Identity Personas).
 * 4. VIP_PREMIUM is an Entitlement, never an elevated platform authority.
 * 5. EVENT_HOST, EVENT_STAFF, EVENT_SCANNER, EVENT_PARTICIPANT are strictly scoped
 *    to individual events and do NOT confer global platform authority.
 * 
 * Hierarchy & Authority Boundary:
 * ADMIN         -> Platform authority (oversight, operations, disputes, audits)
 * MPR           -> Marketing/partner authority (referrals, campaigns, commissions)
 * EVENT_CREATOR -> Event ownership & management
 * PATRON        -> Customer/attendee access
 * VENDOR        -> Business & event participation
 * 
 * Non-escalation invariants:
 * EVENT_CREATOR ≠ ADMIN
 * EVENT_CREATOR ≠ MPR
 * VENDOR        ≠ ADMIN
 * PATRON        ≠ MPR
 * VIP_PREMIUM   ≠ ADMIN
 * VIP_PREMIUM   ≠ MPR
 */

import { 
  EvexAccountType, 
  EvexPlatformRole, 
  EvexEntitlement, 
  EvexEventAccessRole, 
  ResolvedEvexUserContext,
  EvexUserAuthorization 
} from '../types/account';
import { 
  isPlatformAdminEmail, 
  resolveEvexUserContext 
} from './accountMapping';

export { isPlatformAdminEmail };

/**
 * Normalizes input (raw profile, user, or existing context) into a ResolvedEvexUserContext.
 */
export function getEvexContext(userOrProfileOrContext: any): ResolvedEvexUserContext | null {
  if (!userOrProfileOrContext) return null;

  // Already a resolved context
  if (
    typeof userOrProfileOrContext === 'object' &&
    'platformRole' in userOrProfileOrContext &&
    'accountType' in userOrProfileOrContext &&
    'entitlements' in userOrProfileOrContext
  ) {
    return userOrProfileOrContext as ResolvedEvexUserContext;
  }

  return resolveEvexUserContext(userOrProfileOrContext);
}

/**
 * Validates whether a user has Platform Administrator authority.
 * Checks email against protected whitelist, is_admin flags, or admin tier/role.
 * 
 * INVARIANT: Account types (EVENT_CREATOR, PATRON, VENDOR) and entitlements
 * (VIP_PREMIUM) CANNOT grant platform admin authority.
 */
export function isPlatformAdmin(userOrContext?: any): boolean {
  if (!userOrContext) return false;

  const ctx = getEvexContext(userOrContext);
  if (!ctx) return false;

  // Email check
  const email = (userOrContext.email || ctx.rawProfile?.email || '').toLowerCase();
  if (isPlatformAdminEmail(email)) {
    return true;
  }

  // Explicit platform role or profile flag
  if (ctx.platformRole === 'ADMIN' || ctx.isAdmin === true) {
    return true;
  }

  const raw = ctx.rawProfile || userOrContext;
  if (raw.is_admin === true || raw.account_tier === 'admin' || raw.app_role === 'admin') {
    return true;
  }

  return false;
}

/**
 * Validates whether a user has Marketing Partner Role (MPR) authority.
 * 
 * INVARIANT: Event creators, patrons, and vendors do NOT receive MPR authority
 * unless explicitly assigned the MPR platform role.
 * Admins retain supervisory access to MPR tooling.
 */
export function isMpr(userOrContext?: any): boolean {
  if (!userOrContext) return false;

  const ctx = getEvexContext(userOrContext);
  if (!ctx) return false;

  // Platform admin has supervisory access
  if (isPlatformAdmin(userOrContext)) {
    return true;
  }

  if (ctx.platformRole === 'MPR') {
    return true;
  }

  const raw = ctx.rawProfile || userOrContext;
  const tier = (raw.account_tier || raw.accountTier || '').toLowerCase();
  const role = (raw.app_role || raw.role || '').toLowerCase();

  return (
    tier === 'mpr' || 
    tier === 'marketing_partner' || 
    role === 'mpr' || 
    role === 'marketing_partner' ||
    Boolean(raw.mpr_code)
  );
}

/**
 * Validates whether a user is an Event Creator.
 * Matches legacy author/event_host or normalized EVENT_CREATOR persona.
 */
export function isEventCreator(userOrContext?: any): boolean {
  if (!userOrContext) return false;

  const ctx = getEvexContext(userOrContext);
  if (!ctx) return false;

  if (ctx.accountType === 'EVENT_CREATOR' || ctx.isEventCreator) {
    return true;
  }

  const raw = ctx.rawProfile || userOrContext;
  const tier = (raw.account_tier || raw.accountTier || '').toLowerCase();
  const role = (raw.app_role || raw.role || '').toLowerCase();

  return (
    tier === 'author' ||
    role === 'event_host' ||
    raw.is_approved_author === true ||
    raw.is_author === true
  );
}

/**
 * Validates whether a user is a Patron (regular attendee/reader).
 */
export function isPatron(userOrContext?: any): boolean {
  if (!userOrContext) return false;

  const ctx = getEvexContext(userOrContext);
  if (!ctx) return true; // Default persona is Patron

  return ctx.accountType === 'PATRON' || ctx.isPatron;
}

/**
 * Validates whether a user is a Vendor (restructured from Author).
 */
export function isVendor(userOrContext?: any): boolean {
  if (!userOrContext) return false;

  const ctx = getEvexContext(userOrContext);
  if (ctx && (ctx.accountType === 'VENDOR' || ctx.isVendor)) {
    return true;
  }

  const raw = ctx?.rawProfile || userOrContext;
  const tier = (raw.account_tier || raw.accountTier || '').toLowerCase();
  const role = (raw.app_role || raw.role || '').toLowerCase();

  return (
    tier === 'vendor' || 
    role === 'vendor' || 
    tier === 'author' || 
    raw.is_approved_author === true || 
    raw.is_author === true
  );
}

/**
 * Validates whether a user can access Trivia.
 * 
 * STRICT INVARIANT: Only ADMIN and MPR can access Trivia.
 * Vendors, Patrons, Event Participants/Staff/Scanners, and VIPs are strictly excluded.
 */
export function canAccessTrivia(userOrContext?: any): boolean {
  if (!userOrContext) return false;
  return isPlatformAdmin(userOrContext) || isMpr(userOrContext);
}

/**
 * Validates whether a user can create events.
 * 
 * INVARIANT: Event creation belongs strictly to ADMIN and MPR.
 * Vendors NEVER create events or tickets.
 */
export function canCreateEvents(userOrContext?: any): boolean {
  if (!userOrContext) return false;
  return isPlatformAdmin(userOrContext) || isMpr(userOrContext);
}

/**
 * Validates whether a user can create tickets.
 * 
 * INVARIANT: Ticket creation belongs strictly to ADMIN and MPR.
 * Vendors NEVER create tickets.
 */
export function canCreateTickets(userOrContext?: any): boolean {
  if (!userOrContext) return false;
  return isPlatformAdmin(userOrContext) || isMpr(userOrContext);
}

/**
 * Validates whether a user can approve events.
 * Only Platform Administrators can review & approve/reject submitted events.
 */
export function canApproveEvents(userOrContext?: any): boolean {
  if (!userOrContext) return false;
  return isPlatformAdmin(userOrContext);
}

/**
 * Validates whether a user can create vendor products/listings.
 * Vendors and platform admins with supervisory access can create products.
 */
export function canCreateProducts(userOrContext?: any): boolean {
  if (!userOrContext) return false;
  return isVendor(userOrContext) || isPlatformAdmin(userOrContext);
}

/**
 * Validates whether a user can access the Vendor shop portal.
 */
export function canAccessVendorPortal(userOrContext?: any): boolean {
  if (!userOrContext) return false;
  return isVendor(userOrContext) || isPlatformAdmin(userOrContext);
}

/**
 * Checks whether a user holds a specific entitlement (e.g. VIP_PREMIUM).
 */
export function hasEntitlement(userOrContext: any, entitlement: EvexEntitlement): boolean {
  if (!userOrContext) return entitlement === 'STANDARD';

  const ctx = getEvexContext(userOrContext);
  if (!ctx) return entitlement === 'STANDARD';

  return ctx.entitlements.includes(entitlement);
}

/**
 * Checks whether a user has VIP / Premium entitlement.
 * 
 * INVARIANT: VIP status is a paid / benefit entitlement.
 * It NEVER grants Admin, MPR, or Event Creator platform privileges.
 */
export function isVip(userOrContext?: any): boolean {
  if (!userOrContext) return false;

  const ctx = getEvexContext(userOrContext);
  if (!ctx) return false;

  return ctx.isVip || hasEntitlement(userOrContext, 'VIP_PREMIUM');
}

/**
 * Protected check for accessing administrative platform routes (/admin/*).
 */
export function canAccessAdmin(userOrContext?: any): boolean {
  return isPlatformAdmin(userOrContext);
}

/**
 * Protected check for accessing marketing partner platform routes (/mpr/*).
 */
export function canAccessMpr(userOrContext?: any): boolean {
  return isMpr(userOrContext);
}

/**
 * Protected check for accessing creator studio tools.
 */
export function canAccessCreatorStudio(userOrContext?: any): boolean {
  return isPlatformAdmin(userOrContext) || isEventCreator(userOrContext);
}

/**
 * Contextual event-specific permission: Can manage a specific event.
 * 
 * Boundary:
 * - Platform Admin has platform oversight over all events.
 * - Event Owner / Creator can manage their own event.
 * - Users assigned explicitly as EVENT_HOST or EVENT_STAFF for THIS event can manage.
 * - Global EVENT_CREATOR cannot manage someone else's event.
 * - EVENT_SCANNER or EVENT_PARTICIPANT cannot manage event configuration.
 */
export function canManageEvent(
  userOrContext: any,
  event?: { id?: string; user_id?: string; creator_id?: string; host_id?: string } | null,
  staffRole?: EvexEventAccessRole
): boolean {
  if (!userOrContext) return false;

  // Platform admin oversight
  if (isPlatformAdmin(userOrContext)) {
    return true;
  }

  const ctx = getEvexContext(userOrContext);
  const raw = ctx?.rawProfile || userOrContext;
  const userId = raw.id || userOrContext.id;

  // Event owner / host
  if (event && userId) {
    const ownerId = event.user_id || event.creator_id || event.host_id;
    if (ownerId && ownerId === userId) {
      return true;
    }
  }

  // Contextual event staff assignment
  if (staffRole === 'EVENT_HOST' || staffRole === 'EVENT_STAFF') {
    return true;
  }

  return false;
}

/**
 * Contextual event-specific permission: Can scan tickets at the gate for a specific event.
 * 
 * Boundary:
 * - Platform Admin can scan.
 * - Event Owner / Creator can scan.
 * - Staff assigned as EVENT_SCANNER, EVENT_STAFF, or EVENT_HOST for THIS event can scan.
 * - Normal patrons and participants CANNOT scan tickets.
 */
export function canScanEventTickets(
  userOrContext: any,
  event?: { id?: string; user_id?: string; host_id?: string } | null,
  staffRole?: EvexEventAccessRole
): boolean {
  if (!userOrContext) return false;

  if (isPlatformAdmin(userOrContext)) {
    return true;
  }

  const ctx = getEvexContext(userOrContext);
  const raw = ctx?.rawProfile || userOrContext;
  const userId = raw.id || userOrContext.id;

  if (event && userId) {
    const ownerId = event.user_id || (event as any).creator_id || event.host_id;
    if (ownerId && ownerId === userId) {
      return true;
    }
  }

  if (staffRole === 'EVENT_SCANNER' || staffRole === 'EVENT_STAFF' || staffRole === 'EVENT_HOST') {
    return true;
  }

  return false;
}

/**
 * Evaluates the full suite of centralized authorization capabilities for a user.
 */
export function evaluateAuthorization(userOrContext: any): EvexUserAuthorization {
  return {
    canAccessAdmin: canAccessAdmin(userOrContext),
    canAccessMpr: canAccessMpr(userOrContext),
    canAccessTrivia: canAccessTrivia(userOrContext),
    canCreateEvents: canCreateEvents(userOrContext),
    canCreateTickets: canCreateTickets(userOrContext),
    canApproveEvents: canApproveEvents(userOrContext),
    canCreateProducts: canCreateProducts(userOrContext),
    canAccessVendorPortal: canAccessVendorPortal(userOrContext),
    canManageEvent: (event, staffRole) => canManageEvent(userOrContext, event, staffRole),
    canScanEventTickets: (event, staffRole) => canScanEventTickets(userOrContext, event, staffRole)
  };
}
