/**
 * Flow Calculations
 *
 * Pure functions that compute dropoff points, friction points, and
 * conversion funnel data from a UserFlow definition and a set of sessions.
 */

import type { UserFlow, UserSession } from './userFlowAnalyticsTypes';

/**
 * Calculate where users drop off in a flow.
 * For each step, compares users who reached the step vs those who completed it.
 */
export function calculateDropoffPoints(
  flow: UserFlow,
  sessions: UserSession[],
): Array<{ step: string; dropoffRate: number; userCount: number }> {
  const dropoffPoints: Array<{ step: string; dropoffRate: number; userCount: number }> = [];

  flow.steps.forEach((step, _index) => {
    const usersReachedStep = sessions.filter(session =>
      session.actions.some(action => action.screen === step.screen),
    ).length;

    const usersCompletedStep = sessions.filter(session =>
      session.actions.some(
        action => action.screen === step.screen && action.action === step.action,
      ),
    ).length;

    if (usersReachedStep > 0) {
      const dropoffRate = (usersReachedStep - usersCompletedStep) / usersReachedStep;
      dropoffPoints.push({
        step: `${step.screen}:${step.action}`,
        dropoffRate,
        userCount: usersReachedStep - usersCompletedStep,
      });
    }
  });

  return dropoffPoints.sort((a, b) => b.dropoffRate - a.dropoffRate);
}

/**
 * Calculate friction points — steps where users spend excessive time,
 * retry frequently, or encounter errors.
 */
export function calculateFrictionPoints(
  flow: UserFlow,
  sessions: UserSession[],
): Array<{
  step: string;
  averageTime: number;
  retryRate: number;
  errorRate: number;
}> {
  const frictionPoints: Array<{
    step: string;
    averageTime: number;
    retryRate: number;
    errorRate: number;
  }> = [];

  flow.steps.forEach(step => {
    const stepActions = sessions.flatMap(session =>
      session.actions.filter(
        action => action.screen === step.screen && action.action === step.action,
      ),
    );

    if (stepActions.length === 0) return;

    const durations = stepActions
      .map(action => action.duration)
      .filter(duration => duration !== undefined) as number[];

    const averageTime =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    // Calculate retry rate (multiple attempts at same action)
    const userRetries = sessions
      .map(session => {
        const userActions = session.actions.filter(
          action => action.screen === step.screen && action.action === step.action,
        );
        return userActions.length - 1; // -1 because first attempt is not a retry
      })
      .filter(retries => retries > 0);

    const retryRate = userRetries.length / sessions.length;

    // Calculate error rate (actions followed by error actions)
    const errorActions = stepActions.filter(
      action => action.metadata && action.metadata.error,
    );
    const errorRate = errorActions.length / stepActions.length;

    frictionPoints.push({
      step: `${step.screen}:${step.action}`,
      averageTime,
      retryRate,
      errorRate,
    });
  });

  return frictionPoints.sort(
    (a, b) =>
      b.averageTime +
      b.retryRate * 10000 +
      b.errorRate * 10000 -
      (a.averageTime + a.retryRate * 10000 + a.errorRate * 10000),
  );
}

/**
 * Calculate a conversion funnel showing how many users completed each
 * successive step of the flow.
 */
export function calculateConversionFunnel(
  flow: UserFlow,
  sessions: UserSession[],
): Array<{ step: string; userCount: number; conversionRate: number }> {
  const funnelData: Array<{ step: string; userCount: number; conversionRate: number }> = [];
  let previousUserCount = sessions.length;

  flow.steps.forEach((step, _index) => {
    const usersCompletedStep = sessions.filter(session =>
      session.actions.some(
        action => action.screen === step.screen && action.action === step.action,
      ),
    ).length;

    const conversionRate =
      previousUserCount > 0 ? usersCompletedStep / previousUserCount : 0;

    funnelData.push({
      step: `${step.screen}:${step.action}`,
      userCount: usersCompletedStep,
      conversionRate,
    });

    previousUserCount = usersCompletedStep;
  });

  return funnelData;
}
