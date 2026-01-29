import { mock } from "./mock";

export const api = {
  auth: {
    login: mock.login,
  },
  graph: {
    getRecommendations: mock.getRecommendations,
    getConnections: mock.getConnections,
    inviteFriend: mock.inviteFriend,
    acceptInvite: mock.acceptInvite,
    getGraph: mock.getGraph,
  },
  profile: {
    getMe: mock.getMe,
    updateMe: mock.updateMe,
  },
};
