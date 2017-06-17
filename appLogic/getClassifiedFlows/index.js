'use strict';

const _ = require('lodash');

const getFlowType = require('./getFlowType');

const getClassifiedFlows = function (flows) {
  if (!flows) {
    throw new Error('Flows are missing.');
  }

  const classifiedFlows = {};

  classifiedFlows.stateful = {};
  classifiedFlows.stateless = {};

  _.forOwn(flows, (flow, flowName) => {
    flow.name = flowName;

    const flowType = getFlowType(flow);

    switch (flowType) {
      case 'stateful':
        _.forOwn(flow.transitions, state => {
          _.forOwn(state, (eventListener, eventName) => {
            classifiedFlows.stateful[eventName] = classifiedFlows.stateful[eventName] || [];
            classifiedFlows.stateful[eventName].push(flow);
          });
        });
        break;
      case 'stateless':
        _.forOwn(flow.when, (eventListener, eventName) => {
          classifiedFlows.stateless[eventName] = classifiedFlows.stateless[eventName] || [];
          classifiedFlows.stateless[eventName].push(flow);
        });
        break;
      default:
        throw new Error('Invalid operation.');
    }
  });

  return classifiedFlows;
};

module.exports = getClassifiedFlows;
