import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: () => import("@/pages/Login.vue") },
    {
      path: "/",
      component: () => import("@/layouts/MainLayout.vue"),
      children: [
        { path: "", redirect: "/explore" },
        { path: "explore", component: () => import("@/pages/Explore.vue") },
        { path: "graph", component: () => import("@/pages/Graph.vue") },
        { path: "invite", component: () => import("@/pages/Invite.vue") },
        { path: "connections", component: () => import("@/pages/Connections.vue") },
        { path: "profile", component: () => import("@/pages/Profile.vue") },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.path !== "/login" && !auth.isAuthed) return "/login";
});

export default router;
