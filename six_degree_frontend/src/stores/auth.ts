import { defineStore } from "pinia";
import { api }  from "@/services/api";

type User = { id: string; name: string; avatar?: string };

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: "" as string,
    me: null as User | null,
  }),
  getters: {
    isAuthed: (s) => !!s.token,
  },
  actions: {
    async login(email: string, password: string) {
      const res = await api.auth.login(email, password);
      this.token = res.token;
      this.me = res.user;
    },
    logout() {
      this.token = "";
      this.me = null;
    },
  },
});
