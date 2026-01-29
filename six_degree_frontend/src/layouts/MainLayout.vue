<template>
  <div style="min-height: 100vh">
    <TopNav />
    <div style="max-width: 1100px; margin: 0 auto; padding: 16px">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import TopNav from "@/components/TopNav.vue";
</script>
