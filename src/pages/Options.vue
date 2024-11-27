<template>
  <div class="options-container">
    <el-container>
      <el-header>
        <h2>URL拦截器设置</h2>
        <div class="header-controls">
          <el-switch v-model="isEnabled" @change="saveSettings" active-text="开启拦截" inactive-text="关闭拦截" />
        </div>
      </el-header>

      <el-main>
        <el-form label-width="100px" class="form">
          <el-form-item>
            <el-button type="primary" @click="addRule">添加规则</el-button>
          </el-form-item>

          <div v-for="(rule, index) in rules" :key="index" class="rule-item">
            <el-form-item label="URL包含">
              <el-input v-model="rule.urlPattern" placeholder="输入URL匹配模式" @change="saveSettings" />
            </el-form-item>

            <el-form-item label="响应内容">
              <el-input type="textarea" v-model="rule.response" placeholder="输入响应内容(JSON格式)" :rows="4"
                @change="saveSettings" />
            </el-form-item>

            <div class="rule-controls">
              <el-button type="danger" @click="removeRule(index)">删除规则</el-button>
              <el-button type="primary" @click="testRule(rule)">测试规则</el-button>
            </div>
          </div>
        </el-form>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const isEnabled = ref(false)
const rules = ref([])

const addRule = () => {
  rules.value.push({
    urlPattern: '',
    response: '{}'
  })
  saveSettings()
}

const removeRule = (index) => {
  rules.value.splice(index, 1)
  saveSettings()
}

const testRule = (rule) => {
  try {
    JSON.parse(rule.response)
    ElMessage({
      message: 'JSON格式正确',
      type: 'success'
    })
  } catch (error) {
    ElMessage({
      message: 'JSON格式错误',
      type: 'error'
    })
  }
}

const saveSettings = async () => {
  try {
    // 验证所有响应的JSON格式
    rules.value.forEach(rule => {
      if (rule.response) {
        JSON.parse(rule.response);
      }
    });

    // 保存设置
    await chrome.storage.local.set({
      settings: {
        isEnabled: isEnabled.value,
        rules: rules.value.map(rule => ({
          urlPattern: rule.urlPattern,
          response: rule.response
        }))
      }
    });
    
    console.log('Settings saved successfully');
    ElMessage({
      message: '保存成功',
      type: 'success'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    ElMessage({
      message: '保存失败：' + error.message,
      type: 'error'
    });
  }
};

onMounted(async () => {
  const data = await chrome.storage.local.get(['settings'])
  if (data.settings) {
    isEnabled.value = data.settings.isEnabled
    rules.value = data.settings.rules || []
  }
})
</script>

<style scoped>
.options-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-controls {
  margin: 20px 0;
}

.rule-item {
  border: 1px solid #eee;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.rule-controls {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.el-header {
  padding: 0;
  height: auto;
}

.form {
  margin-top: 20px;
}
</style>