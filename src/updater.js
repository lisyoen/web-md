(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebMdUpdater = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function encodeNativeMessage(message) {
    var payload = Buffer.from(JSON.stringify(message), 'utf8');
    var frame = Buffer.alloc(4 + payload.length);
    frame.writeUInt32LE(payload.length, 0);
    payload.copy(frame, 4);
    return frame;
  }

  function decodeNativeMessage(frame) {
    var length = frame.readUInt32LE(0);
    if (frame.length !== length + 4) {
      throw new Error('Invalid native messaging frame length');
    }
    return JSON.parse(frame.subarray(4).toString('utf8'));
  }

  function isGitPullSuccessful(exitCode) {
    return exitCode === 0;
  }

  function hasResponseSchema(response) {
    return response !== null &&
      typeof response === 'object' &&
      typeof response.ok === 'boolean' &&
      typeof response.upToDate === 'boolean' &&
      typeof response.before === 'string' &&
      typeof response.after === 'string' &&
      typeof response.message === 'string';
  }

  return {
    encodeNativeMessage: encodeNativeMessage,
    decodeNativeMessage: decodeNativeMessage,
    isGitPullSuccessful: isGitPullSuccessful,
    hasResponseSchema: hasResponseSchema
  };
}));
