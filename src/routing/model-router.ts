import { selectRoute, type RoutingSelectionOptions } from "./routing-policy.js";

export const resolveModelRoute = (taskType: string, options?: RoutingSelectionOptions) => {
  return selectRoute(taskType, options);
};
