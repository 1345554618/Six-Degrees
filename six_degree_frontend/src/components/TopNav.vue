<template>
  <el-menu mode="horizontal" :default-active="active" style="padding: 0 16px">
    <el-menu-item index="/explore" @click="go('/explore')">探索</el-menu-item>
    <el-menu-item index="/connections" @click="go('/connections')">關係</el-menu-item>
    <el-menu-item index="/invite" @click="go('/invite')">邀請</el-menu-item>
    <el-menu-item index="/profile" @click="go('/profile')">我的</el-menu-item>
    <el-menu-item index="/graph" @click="go('/graph')">社交球</el-menu-item>
    <div style="flex: 1"></div>

    <el-button text @click="logout">登出</el-button>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const active = computed(() => route.path);

function go(path: string) {
  router.push(path);
}
function logout() {
  auth.logout();
  router.push("/login");
}
</script>
