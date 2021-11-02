/* eslint-env jest */

const packageJson = require('./package.json')
const packageLockJson = require('./package-lock.json')

describe('because rollup 0.60 drops support for Internet Explorer 8', () => {
  describe('grollup', () => {
    it('should be pinned to 0.59.4 in package.json', () => {
      expect(packageJson.devDependencies['rollup']).toEqual('0.59.4')
    })
  })
})
