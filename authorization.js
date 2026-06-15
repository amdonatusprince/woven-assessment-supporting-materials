// see graphic in instructions for visual explanation of the permission and user data structures
class Authorization {
  constructor(permissions, users) {
    this.permissions = permissions
    this.users = users
  }

  // @rtype: array of strings
  // @returns: an array of all the active permission names that the user with the corresponding user_id has
  listPermissions(userId) {
    const user = this.users.find(u => u.id === userId)
    if (!user || user.roles.length === 0) {
      return []
    }

    const roles = new Set(user.roles)

    return this.permissions.filter(p => p.active && roles.has(p.role)).map(p => p.name)
  }

  // @rtype: boolean value
  // @returns: true if the user has an active permission with this name via one of their roles
  checkPermitted(permissionName, userId) {
    const user = this.users.find(u => u.id === userId)
    if (!user || user.roles.length === 0) {
      return false
    }

    const roles = new Set(user.roles)

    return this.permissions.some(
      p => p.active && p.name === permissionName && roles.has(p.role)
    )
  }
}

module.exports = Authorization
