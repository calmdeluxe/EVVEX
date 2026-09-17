export function setupPublishingRoutes(
  app: any,
  getSupabase: any,
  getSupabaseAdmin: any,
  authenticateUser: any,
  authenticateAdmin: any
) {
  app.get('/api/publishing/status', (req: any, res: any) => {
    res.json({ status: 'active', publishing_enabled: true });
  });
}
