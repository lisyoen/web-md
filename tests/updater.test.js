'use strict';

const assert = require('assert');
const {
  encodeNativeMessage,
  decodeNativeMessage,
  isGitPullSuccessful,
  hasResponseSchema
} = require('../src/updater');

const ascii = { action: 'update' };
const asciiFrame = encodeNativeMessage(ascii);
assert.strictEqual(asciiFrame.readUInt32LE(0), asciiFrame.length - 4);
console.log('PASS native message length prefix');

assert.deepStrictEqual(decodeNativeMessage(asciiFrame), ascii);
console.log('PASS native message ASCII round trip');

const unicode = { message: '업데이트 완료 ✓' };
assert.deepStrictEqual(decodeNativeMessage(encodeNativeMessage(unicode)), unicode);
console.log('PASS native message UTF-8 round trip');

assert.throws(
  () => decodeNativeMessage(Buffer.from([10, 0, 0, 0, 123])),
  /frame length/
);
console.log('PASS invalid native message length rejected');

const response = {
  ok: true,
  upToDate: false,
  before: 'abc1234',
  after: 'def5678',
  message: 'Updated'
};
assert.strictEqual(hasResponseSchema(response), true);
console.log('PASS updater response schema');

assert.strictEqual(hasResponseSchema({ ok: true }), false);
console.log('PASS incomplete updater response schema rejected');

assert.strictEqual(isGitPullSuccessful(0, 'progress on stderr'), true);
console.log('PASS stderr with exit code zero is success');

assert.strictEqual(isGitPullSuccessful(1, ''), false);
console.log('PASS nonzero exit code is failure');

console.log('PASS all 8 updater checks');
