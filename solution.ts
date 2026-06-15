import { SocialMediaProfiles } from './preloaded.js'

export class CreateUserProfile {
  static beforeCreate(email: string): boolean {
    var profiles = SocialMediaProfiles.fetchSocialProfiles(email)

    var result = SocialMediaProfiles.saveProfiles(profiles)

    return result.success
  }
}
