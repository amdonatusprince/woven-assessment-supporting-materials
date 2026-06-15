/**
 * Mock third-party social enrichment + DB layer (read-only in the real interview).
 * Bug: saveProfiles builds SQL with template literals instead of parameterized queries.
 */

export type ProfileFields = { display_name: string; bio: string }
export type ProfileMap = Record<string, ProfileFields>

const NETWORKS = ['facebook', 'twitter', 'linkedin', 'instagram', 'pinterest', 'snapchat'] as const

function names(displayName: string, bio: string): ProfileMap {
  return Object.fromEntries(NETWORKS.map(network => [network, { display_name: displayName, bio }]))
}

const PROFILE_DATA: Record<string, ProfileMap> = {
  'flowerchild@60s.com': names('Peace Flower', 'Summer of Love'),
  'programmer@gizmo.com': names('Code Ninja', 'Writes clean TypeScript'),
  // Failing cases: API returns apostrophes in display names / bios.
  'avocado@hipmail.com': names("Guac Lover's Club", 'Extra avocado toast'),
  'squadgoals@gmail.com': names("Squad Goals '22", 'Team vibes only'),
  'defaultdance@fortnitefan.com': names("Don't Stop Dancing", 'Fortnite fan account')
}

function defaultProfiles(email: string): ProfileMap {
  const local = email.split('@')[0]?.replace(/\./g, ' ') ?? email
  const title = local.replace(/\b\w/g, c => c.toUpperCase())
  return names(title, `Profile for ${email}`)
}

/** Simulates PostgreSQL rejecting malformed SQL from unescaped quotes in values. */
function executeVulnerableInsert(platform: string, displayName: string, bio: string): boolean {
  const sql = `INSERT INTO social_profiles (platform, display_name, bio) VALUES ('${platform}', '${displayName}', '${bio}')`
  // Valid only when each value is a single quoted literal (no embedded apostrophes).
  const pattern =
    /^INSERT INTO social_profiles \(platform, display_name, bio\) VALUES \('([^']*)', '([^']*)', '([^']*)'\)$/
  const match = sql.match(pattern)
  if (!match) {
    return false
  }
  const [, p, name, b] = match
  return p === platform && name === displayName && b === bio
}

export type SaveResult = { success: boolean }

export class SocialMediaProfiles {
  static fetchSocialProfiles(email: string): ProfileMap {
    return PROFILE_DATA[email] ?? defaultProfiles(email)
  }

  static saveProfiles(profiles: ProfileMap): SaveResult {
    let saved = 0
    for (const [platform, data] of Object.entries(profiles)) {
      const ok = executeVulnerableInsert(platform, data.display_name, data.bio)
      if (ok) {
        saved += 1
      }
    }
    return { success: saved === Object.keys(profiles).length }
  }
}
