'use strict';

const saveFlowAggregate = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.repository) {
    throw new Error('Repository is missing.');
  }

  const { repository } = options;

  return function (flowAggregate, done) {
    if (!flowAggregate) {
      throw new Error('Flow aggregate is missing.');
    }
    if (!done) {
      throw new Error('Callback is missing.');
    }

    repository.saveAggregate(flowAggregate, done);
  };
};

module.exports = saveFlowAggregate;
