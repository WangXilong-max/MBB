<template>
  <div>
    <h2>缩略图查原图</h2>
    <input v-model="thumbUrl" placeholder="输入缩略图S3 URL" />
    <button @click="search" :disabled="loading">{{ loading ? "查询中..." : "查询" }}</button>
    <div v-if="result">
      <p class="success">查询成功！</p>
      <a :href="result" target="_blank" download>查看并下载原图</a>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query"
const thumbUrl = ref('')
const result = ref('')
const error = ref('')
const loading = ref(false)
function getIdToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get("id_token")
}
async function search() {
  result.value = ''
  error.value = ''
  loading.value = true
  const idToken = getIdToken()
  if (!idToken) { error.value = "请先登录！"; loading.value = false; return }
  if (!thumbUrl.value) { error.value = "请输入缩略图URL"; loading.value = false; return }
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ thumbnail_url: thumbUrl.value })
    })
    const data = await resp.json()
    if (!data.full_image_url) throw new Error("未返回原图URL")
    result.value = data.full_image_url
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
</script> 