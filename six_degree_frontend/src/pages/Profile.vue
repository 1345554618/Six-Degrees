<template>
  <el-card>
    <template #header>
      <div style="font-weight: 600">我的個人檔案</div>
    </template>

    <div style="max-width: 620px; display: grid; gap: 12px">
      <el-form label-position="top">
        <el-form-item label="名字">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="form.city" />
        </el-form-item>
        <el-form-item label="自我介紹">
          <el-input v-model="form.bio" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="興趣（用逗號分隔）">
          <el-input v-model="interestsText" placeholder="Design, Startup, Coffee" />
        </el-form-item>

        <el-button type="primary" :loading="loading" @click="save">儲存</el-button>
      </el-form>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/services/api";

const loading = ref(false);
const form = reactive<any>({ name: "", city: "", bio: "", interests: [] });
const interestsText = ref("");

async function load() {
  const me = await api.profile.getMe();
  Object.assign(form, me);
  interestsText.value = (me.interests || []).join(", ");
}

async function save() {
  try {
    loading.value = true;
    const interests = interestsText.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await api.profile.updateMe({ ...form, interests });
    ElMessage.success("已儲存（mock）");
  } catch (e: any) {
    ElMessage.error(e?.message || "儲存失敗");
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
