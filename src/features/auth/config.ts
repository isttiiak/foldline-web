/**
 * Sign-in methods shown on the login page.
 *
 * Magic links are off until custom SMTP is set up (see docs/ROADMAP.md): Supabase's
 * built-in mailer sends only a couple of emails per hour and only to project team
 * members, so invited friends would never receive their link.
 */
export const AUTH_METHODS = {
  google: true,
  magicLink: false,
} as const;
