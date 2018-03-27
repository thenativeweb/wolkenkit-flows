'use strict';

const saveFlowAggregate = async function ({ flowAggregate, repository }) {
  if (!flowAggregate) {
    throw new Error('Flow aggregate is missing.');
  }
  if (!repository) {
    throw new Error('Repository is missing.');
  }

  await repository.saveAggregate(flowAggregate);
};

module.exports = saveFlowAggregate;
