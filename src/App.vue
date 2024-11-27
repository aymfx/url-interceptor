<template>
  <div class="popup">
    <h3>URL拦截器</h3>
    <el-switch v-model="isEnabled" @change="saveSettings" active-text="开启拦截" inactive-text="关闭拦截" />
    <div class="actions">
      <el-button type="primary" @click="openOptions">打开设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isEnabled = ref(false)

const openOptions = () => {
  chrome.runtime.openOptionsPage()
}

const saveSettings = async () => {
  try {
    const data = await chrome.storage.local.get(['settings'])
    await chrome.storage.local.set({
      settings: {
        ...data.settings,
        isEnabled: isEnabled.value
      }
    });
    console.log('Settings saved:', isEnabled.value);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

onMounted(async () => {
  const data = await chrome.storage.local.get(['settings'])
  if (data.settings) {
    isEnabled.value = data.settings.isEnabled
  }
})
</script>

<style scoped>
.popup {
  width: 200px;
  padding: 20px;
}

.actions {
  margin-top: 20px;
  text-align: center;
}
</style>