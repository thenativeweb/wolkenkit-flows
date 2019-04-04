'use strict';

const uuid = require('uuidv4');

const getFlowId = function ({ domainEvent, flow }) {
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }

  const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
        flowIdV5 = uuid.fromString(`${flow.name}-${flow.identity[eventName](domainEvent)}`);

  // The UUID standard defines that UUIDs that are generated from strings are
  // either version 3 or version 5 UUIDs. Since internally, we work with version
  // 4 UUIDs (and verify this!), we need to "convert" the version 5 UUID to a
  // version 4 one. For pragmatic reasons, we simply replace the version
  // character with a 4.
  const flowId = `${flowIdV5.substring(0, 14)}4${flowIdV5.substring(15)}`;

  return flowId;
};

module.exports = getFlowId;
