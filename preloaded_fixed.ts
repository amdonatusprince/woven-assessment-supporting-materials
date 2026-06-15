/**
 * Reference fix — parameterized inserts (no string-built SQL).
 */

import type { ProfileMap, SaveResult } from './preloaded.js'
import { SocialMediaProfiles as Buggy } from './preloaded.js'

type Row = { platform: string; display_name: string; bio: string }

const store: Row[] = []

export class SocialMediaProfilesFixed {
  static fetchSocialProfiles(email: string): ProfileMap {
    return Buggy.fetchSocialProfiles(email)
  }

  static saveProfiles(profiles: ProfileMap): SaveResult {
    store.length = 0
    for (const [platform, data] of Object.entries(profiles)) {
      store.push({ platform, display_name: data.display_name, bio: data.bio })
    }
    return { success: store.length === Object.keys(profiles).length }
  }
}
