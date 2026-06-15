// see graphic in instructions for visual explanation of the permission and user data structures

export type Permission = {
  role: string
  name: string
  active: boolean
}

export type User = {
  id: number
  name: string
  roles: string[]
}

export class Authorization {
  permissions: Permission[]
  users: User[]

  constructor(permissions: Permission[], users: User[]) {
    this.permissions = permissions
    this.users = users
  }

  // @returns: active permission names for the user (order unimportant)
  listPermissions(userId: number): string[] {
    const user = this.users.find(u => u.id === userId)
    if (!user || user.roles.length === 0) {
      return []
    }

    const roles = new Set(user.roles)

    return this.permissions.filter(p => p.active && roles.has(p.role)).map(p => p.name)
  }

  // @returns: true if user has an active permission with this name via one of their roles
  checkPermitted(permissionName: string, userId: number): boolean {
    const user = this.users.find(u => u.id === userId)
    if (!user || user.roles.length === 0) {
      return false
    }

    const roles = new Set(user.roles)

    return this.permissions.some(p => p.active && p.name === permissionName && roles.has(p.role))
  }
}
