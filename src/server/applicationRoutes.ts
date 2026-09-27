import type { Express, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { APPLICATION_TYPES, getApplicationFeeKobo, validateApplicationPayment } from '../lib/eventApplications';

interface ApplicationRouteDependencies {
  authenticateUser: RequestHandler;
  canReviewApplications: (request: any) => boolean;
  getAdminClient: () => any | null;
}

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const reviewerStatuses = new Set(['pending', 'under_review', 'approved', 'rejected', 'needs_revision']);

export function setupApplicationRoutes(app: Express, dependencies: ApplicationRouteDependencies) {
  const requireReviewer: RequestHandler = (request: any, response: any, next: any) => {
    if (!dependencies.canReviewApplications(request)) {
      return response.status(403).json({ error: 'Admin or MPR access is required' });
    }
    next();
  };

  app.post('/api/applications', dependencies.authenticateUser, async (request: any, response: any) => {
    const admin = dependencies.getAdminClient();
    if (!admin) return response.status(503).json({ error: 'Application service is not configured' });

    const body = request.body || {};
    const type = text(body.application_type, 80);
    const applicationFeeKobo = getApplicationFeeKobo(type);
    const applicantName = text(body.applicant_name, 160);
    const applicantPhone = text(body.applicant_phone, 40);
    const bio = text(body.bio, 5000);
    const portfolioUrl = text(body.portfolio_url, 2048);
    const requirements = text(body.requirements, 3000);
    const proposedFeeKobo = Number(body.proposed_fee_kobo || 0);
    const eventId = text(body.event_id, 100);

    if (!eventId || applicationFeeKobo === null) {
      return response.status(400).json({ error: 'A valid event and application type are required' });
    }
    if (!applicantName || !request.user?.email || !applicantPhone || !bio) {
      return response.status(400).json({ error: 'Name, authenticated email, phone, and application details are required' });
    }
    if (body.safety_rules_accepted !== true) {
      return response.status(400).json({ error: 'You must accept the event safety rules to apply' });
    }
    if (!Number.isSafeInteger(proposedFeeKobo) || proposedFeeKobo < 0) {
      return response.status(400).json({ error: 'Proposed compensation must be a non-negative whole amount in kobo' });
    }
    if (portfolioUrl) {
      try {
        const url = new URL(portfolioUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('invalid protocol');
      } catch {
        return response.status(400).json({ error: 'Portfolio URL must be a valid HTTP or HTTPS URL' });
      }
    }

    try {
      const { data: event, error: eventError } = await admin
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('status', 'published')
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) return response.status(404).json({ error: 'Published event not found' });

      const { data: existing, error: existingError } = await admin
        .from('event_applications')
        .select('*')
        .eq('event_id', eventId)
        .eq('applicant_id', request.user.id)
        .eq('application_type', type)
        .maybeSingle();
      if (existingError) throw existingError;

      const applicationFields = {
        event_id: eventId,
        applicant_id: request.user.id,
        application_type: type,
        applicant_name: applicantName,
        applicant_email: request.user.email,
        applicant_phone: applicantPhone,
        bio,
        portfolio_url: portfolioUrl || null,
        proposed_fee_kobo: proposedFeeKobo,
        requirements: requirements || null,
        safety_rules_accepted: true,
      };

      let application = existing;
      let reference = existing?.paystack_reference || null;
      if (existing) {
        if (
          existing.status !== 'pending' ||
          existing.application_fee_paid === true ||
          Number(existing.application_fee_kobo) !== applicationFeeKobo ||
          applicationFeeKobo === 0
        ) {
          return response.status(409).json({ error: 'An application for this event and type already exists' });
        }

        const { data, error } = await admin
          .from('event_applications')
          .update(applicationFields)
          .eq('id', existing.id)
          .eq('applicant_id', request.user.id)
          .eq('application_fee_paid', false)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (!data) return response.status(409).json({ error: 'Application is no longer eligible for payment' });
        application = data;
      } else {
        reference = applicationFeeKobo > 0 ? `EVAPP_${randomUUID()}` : null;
        const { data, error } = await admin
          .from('event_applications')
          .insert({
            ...applicationFields,
            application_fee_kobo: applicationFeeKobo,
            application_fee_paid: false,
            paystack_reference: reference,
            status: 'pending',
          })
          .select('*')
          .single();
        if (error) {
          if (error.code === '23505') {
            return response.status(409).json({ error: 'An application for this event and type already exists' });
          }
          throw error;
        }
        application = data;
      }

      return response.status(existing ? 200 : 201).json({
        application,
        payment: {
          required: applicationFeeKobo > 0,
          amount_kobo: applicationFeeKobo,
          reference,
        },
      });
    } catch (error: any) {
      console.error('[Applications] Creation failed:', error?.message || error);
      return response.status(500).json({ error: 'Application could not be created' });
    }
  });

  app.post('/api/applications/verify-payment', dependencies.authenticateUser, async (request: any, response: any) => {
    const admin = dependencies.getAdminClient();
    if (!admin) return response.status(503).json({ error: 'Application service is not configured' });

    const applicationId = text(request.body?.application_id, 100);
    const reference = text(request.body?.reference, 160);
    if (!applicationId || !reference) {
      return response.status(400).json({ error: 'Application ID and payment reference are required' });
    }

    try {
      const { data: application, error } = await admin
        .from('event_applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();
      if (error) throw error;
      if (!application) return response.status(404).json({ error: 'Application not found' });
      if (application.applicant_id !== request.user.id) {
        return response.status(403).json({ error: 'Application does not belong to this user' });
      }
      if (application.application_fee_paid === true) {
        return response.status(409).json({ error: 'Application fee has already been verified' });
      }
      if (
        application.status !== 'pending' ||
        !Number.isSafeInteger(Number(application.application_fee_kobo)) ||
        Number(application.application_fee_kobo) <= 0 ||
        application.paystack_reference !== reference
      ) {
        return response.status(409).json({ error: 'Application is not eligible for this payment' });
      }

      let secret = text(process.env.PAYSTACK_SECRET_KEY, 512);
      if (!secret) {
        const { data: config, error: configError } = await admin
          .from('config')
          .select('value')
          .eq('key', 'paystack_secret_key')
          .maybeSingle();
        if (configError) throw configError;
        secret = text(config?.value, 512);
      }
      if (!secret || secret === 'sk_test_mock_skipped') {
        return response.status(503).json({ error: 'Paystack server verification is not configured' });
      }

      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      const paystackResult = await paystackResponse.json().catch(() => null);
      if (!paystackResponse.ok || paystackResult?.status !== true) {
        return response.status(402).json({ error: 'Paystack could not verify a successful transaction' });
      }

      const paymentError = validateApplicationPayment(
        paystackResult.data,
        application,
        request.user.id,
        reference,
      );
      if (paymentError) return response.status(402).json({ error: paymentError });

      const { data: updated, error: updateError } = await admin
        .from('event_applications')
        .update({ application_fee_paid: true, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .eq('applicant_id', request.user.id)
        .eq('paystack_reference', reference)
        .eq('status', 'pending')
        .eq('application_fee_paid', false)
        .select('id, application_fee_paid, application_fee_kobo, status')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return response.status(409).json({ error: 'Application payment was already processed' });

      return response.json({ application: updated });
    } catch (error: any) {
      console.error('[Applications] Payment verification failed:', error?.message || error);
      return response.status(502).json({ error: 'Application payment verification failed' });
    }
  });

  app.get('/api/admin/applications', dependencies.authenticateUser, requireReviewer, async (_request: any, response: any) => {
    const admin = dependencies.getAdminClient();
    if (!admin) return response.status(503).json({ error: 'Application service is not configured' });

    const { data, error } = await admin
      .from('event_applications')
      .select('*, events:event_id (id, title, start_time, venue_name, city)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('[Applications] Review list failed:', error.message);
      return response.status(500).json({ error: 'Applications could not be loaded' });
    }
    return response.json({ applications: data || [] });
  });

  app.patch('/api/admin/applications/:id', dependencies.authenticateUser, requireReviewer, async (request: any, response: any) => {
    const admin = dependencies.getAdminClient();
    if (!admin) return response.status(503).json({ error: 'Application service is not configured' });

    const status = text(request.body?.status, 40);
    const reviewNotes = text(request.body?.review_notes, 3000) || null;
    const hasFinalFee = Object.prototype.hasOwnProperty.call(request.body || {}, 'final_fee_kobo');
    const finalFeeKobo = Number(request.body?.final_fee_kobo);
    if (!reviewerStatuses.has(status)) return response.status(400).json({ error: 'Invalid application status' });
    if (hasFinalFee && (!Number.isSafeInteger(finalFeeKobo) || finalFeeKobo < 0)) {
      return response.status(400).json({ error: 'Approved fee must be a non-negative whole amount in kobo' });
    }

    try {
      const { data: application, error: lookupError } = await admin
        .from('event_applications')
        .select('*')
        .eq('id', request.params.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!application) return response.status(404).json({ error: 'Application not found' });
      if (status === 'approved' && application.applicant_id === request.user.id) {
        return response.status(403).json({ error: 'Applicants cannot approve their own applications' });
      }
      if (status === 'approved' && Number(application.application_fee_kobo) > 0 && application.application_fee_paid !== true) {
        return response.status(409).json({ error: 'An unpaid application cannot be approved' });
      }

      const changes: Record<string, unknown> = {
        status,
        review_notes: reviewNotes,
        reviewed_by: request.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (hasFinalFee) changes.admin_fee_kobo = finalFeeKobo;

      const { data: updated, error: updateError } = await admin
        .from('event_applications')
        .update(changes)
        .eq('id', application.id)
        .select('*')
        .single();
      if (updateError) throw updateError;

      let fulfillmentWarning: string | null = null;
      const category = APPLICATION_TYPES.find((option) => option.value === application.application_type)?.category;
      if (status === 'approved' && (category === 'service_provider' || category === 'event_operations')) {
        const { data: fulfillment, error: fulfillmentError } = await admin.rpc('fulfill_application', {
          application_id: application.id,
          reviewer_id: request.user.id,
          final_fee_kobo: hasFinalFee ? finalFeeKobo : null,
          notes: reviewNotes,
        });
        const outcome = Array.isArray(fulfillment) ? fulfillment[0] : fulfillment;
        if (fulfillmentError || outcome?.success !== true) {
          fulfillmentWarning = fulfillmentError?.message || outcome?.message || 'Fulfillment could not be completed';
          console.error('[Applications] Approved application fulfillment warning:', fulfillmentWarning);
        }
      }

      return response.json({ application: updated, fulfillment_warning: fulfillmentWarning });
    } catch (error: any) {
      console.error('[Applications] Review update failed:', error?.message || error);
      return response.status(500).json({ error: 'Application review could not be saved' });
    }
  });
}