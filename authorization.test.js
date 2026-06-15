let expect = require('chai').expect
const Authorization = require('./authorization')

describe('Authorization', () => {
  beforeEach(() => {
    const permissions = [
      { role: 'superuser', name: 'lock user account', active: true },
      { role: 'superuser', name: 'unlock user account', active: true },
      { role: 'superuser', name: 'purchase widgets', active: false },
      { role: 'charger', name: 'view pick up locations', active: true },
      { role: 'rider', name: 'view my profile', active: true },
      { role: 'rider', name: 'scooters near me', active: true }
    ]

    const users = [
      { id: 1, name: 'Anna Administrator', roles: ['superuser'] },
      { id: 2, name: 'Charles N. Charge', roles: ['charger', 'rider'] },
      { id: 7, name: 'Ryder', roles: ['rider'] },
      { id: 11, name: 'Unregistered Ulysses', roles: [] },
      { id: 18, name: 'Tessa Tester', roles: ['beta tester'] }
    ]

    this.authorization = new Authorization(permissions, users)
  })

  it('listPermissions returns correct permission names when there is one role', () => {
    const result = this.authorization.listPermissions(7)
    expect(result, 'view my profile').to.include('view my profile')
    expect(result, 'scooters near me').to.include('scooters near me')
    expect(result.length).to.equal(2)
  })

  it('checkPermitted returns true for all of the permissions that exist for the user', () => {
    expect(this.authorization.checkPermitted('view pick up locations', 2), 'view pick up locations').to.equal(true)
    expect(this.authorization.checkPermitted('view my profile', 2), 'view my profile').to.equal(true)
    expect(this.authorization.checkPermitted('scooters near me', 2), 'scooters near me').to.equal(true)
  })

  it('listPermissions excludes inactive permissions', () => {
    const result = this.authorization.listPermissions(1)
    expect(result).to.include('lock user account')
    expect(result).to.include('unlock user account')
    expect(result).not.to.include('purchase widgets')
    expect(result.length).to.equal(2)
  })

  it('listPermissions returns empty array for user with no roles', () => {
    expect(this.authorization.listPermissions(11)).to.deep.equal([])
  })

  it('listPermissions returns empty array for unknown role with no matching permissions', () => {
    expect(this.authorization.listPermissions(18)).to.deep.equal([])
  })

  it('checkPermitted returns false when user lacks the role', () => {
    expect(this.authorization.checkPermitted('scooters near me', 1)).to.equal(false)
  })

  it('checkPermitted returns false for inactive permission', () => {
    expect(this.authorization.checkPermitted('purchase widgets', 1)).to.equal(false)
  })

  it('checkPermitted returns false for user with no roles', () => {
    expect(this.authorization.checkPermitted('view my profile', 11)).to.equal(false)
  })
})
