import { assert } from 'chai'

import { Authorization } from './authorization.js'

describe('Authorization', function () {
  beforeEach(function () {
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

  it('listPermissions returns correct permission names when there is one role', function () {
    const result = this.authorization.listPermissions(7)
    assert.include(result, 'view my profile', 'view my profile')
    assert.include(result, 'scooters near me', 'scooters near me')
    assert.equal(result.length, 2)
  })

  it('checkPermitted returns true for all of the permissions that exist for the user', function () {
    assert.equal(this.authorization.checkPermitted('view pick up locations', 2), true, 'view pick up locations')
    assert.equal(this.authorization.checkPermitted('view my profile', 2), true, 'view my profile')
    assert.equal(this.authorization.checkPermitted('scooters near me', 2), true, 'scooters near me')
  })

  it('listPermissions excludes inactive permissions', function () {
    const result = this.authorization.listPermissions(1)
    assert.include(result, 'lock user account')
    assert.include(result, 'unlock user account')
    assert.notInclude(result, 'purchase widgets')
    assert.equal(result.length, 2)
  })

  it('listPermissions returns empty array for user with no roles', function () {
    assert.deepEqual(this.authorization.listPermissions(11), [])
  })

  it('listPermissions returns empty array for unknown role with no matching permissions', function () {
    assert.deepEqual(this.authorization.listPermissions(18), [])
  })

  it('checkPermitted returns false when user lacks the role', function () {
    assert.equal(this.authorization.checkPermitted('scooters near me', 1), false)
  })

  it('checkPermitted returns false for inactive permission', function () {
    assert.equal(this.authorization.checkPermitted('purchase widgets', 1), false)
  })

  it('checkPermitted returns false for user with no roles', function () {
    assert.equal(this.authorization.checkPermitted('view my profile', 11), false)
  })
})
