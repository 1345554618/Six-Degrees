<template>
  <div style="max-width: 420px; margin: 80px auto">
    <el-card>
      <template #header>
        <div style="font-weight: 600; font-size: 18px">Six Degrees • 登入</div>
      </template>

      <el-form label-position="top">
        <el-form-item label="Email">
          <el-input v-model="email" placeholder="you@example.com" />
        </el-form-item>
        <el-form-item label="密碼">
          <el-input v-model="password" type="password" show-password />
        </el-form-item>

        <el-button type="primary" style="width: 100%" :loading="loading" @click="onLogin">
          登入
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const loading = ref(false);

async function onLogin() {
  try {
    loading.value = true;
    await auth.login(email.value, password.value);
    router.push("/explore");
  } catch (e: any) {
    ElMessage.error(e?.message || "登入失敗");
  } finally {
    loading.value = false;
  }
}
</script>
