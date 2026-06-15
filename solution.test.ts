import { assert } from 'chai'

import { CreateUserProfile } from './solution.js'

describe('CreateUserProfile', function () {
  it('test some users that work', function () {
    assert.deepEqual(CreateUserProfile.beforeCreate('flowerchild@60s.com'), true)
    assert.deepEqual(CreateUserProfile.beforeCreate('programmer@gizmo.com'), true)
  })

  it('test some users that fail', function () {
    // These accounts should equal true, but something is wrong!
    // (We won't evaluate whether this test passes or not,
    // you can use it if it is helpful)
    assert.deepEqual(CreateUserProfile.beforeCreate('avocado@hipmail.com'), true)
    assert.deepEqual(CreateUserProfile.beforeCreate('squadgoals@gmail.com'), true)
    assert.deepEqual(CreateUserProfile.beforeCreate('defaultdance@fortnitefan.com'), true)
  })
})
