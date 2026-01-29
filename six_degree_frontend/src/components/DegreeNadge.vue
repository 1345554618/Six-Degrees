<template>
  <el-tag :type="tagType">{{ degrees }} 度</el-tag>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ degrees: number }>();

const tagType = computed(() => {
  if (props.degrees <= 2) return "success";
  if (props.degrees <= 4) return "warning";
  return "danger";
});
</script>
