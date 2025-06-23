<template>
  <div>
    <h2>批量删除文件</h2>
    <textarea v-model="urls" placeholder="每行一个URL"></textarea>
    <button @click="deleteFiles" :disabled="deleting">{{ deleting ? "删除中..." : "删除选中文件" }}</button>
    <div v-html="result"></div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_delete_files'
const urls = ref('')
const result = ref('')
const deleting = ref(false)
function getIdToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get("id_token")
}
async function deleteFiles() {
  result.value = ''
  deleting.value = true
  const idToken = getIdToken()
  if (!idToken) { result.value = "请先登录！"; deleting.value = false; return }
  const urlList = urls.value.split("\n").map(u => u.trim()).filter(Boolean)
  if (!urlList.length) { result.value = "请输入URL"; deleting.value = false; return }
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ urls: urlList })
    })
    const data = await resp.json()
    result.value = resp.ok ? `✅ 删除成功: ${data.message}` : `❌ 删除失败: ${data.message||resp.status}`
  } catch (e) {
    result.value = "🚨 " + e.message
  }
  deleting.value = false
}
</script> 