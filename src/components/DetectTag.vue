<template>
  <div>
    <h2>检测标签并查同类</h2>
    <input v-model="mediaUrl" placeholder="输入S3 URL" />
    <button @click="detect" :disabled="detecting">{{ detecting ? "查询中..." : "查同类" }}</button>
    <div v-if="result">
      <p>检测标签: {{ result.detected_labels?.join(', ') }}</p>
      <p>同类文件:</p>
      <ul>
        <li v-for="url in result.query_by_species_result?.links || []" :key="url">
          <img v-if="url.includes('/thumbnail/')" :src="url" style="width:150px;object-fit:cover;display:block;margin-bottom:4px;" />
          <a :href="url" target="_blank" style="display:block;font-size:0.8rem;color:#0066cc;">{{ url }}</a>
        </li>
      </ul>
      <img v-if="result.thumbnail_url" :src="result.thumbnail_url" style="width:150px;object-fit:cover;display:block;margin-top:12px;" />
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_files'
const mediaUrl = ref('')
const result = ref(null)
const error = ref('')
const detecting = ref(false)
function getIdToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get("id_token")
}
async function detect() {
  result.value = null
  error.value = ''
  detecting.value = true
  const idToken = getIdToken()
  if (!idToken) { error.value = "请先登录！"; detecting.value = false; return }
  if (!mediaUrl.value) { error.value = "请输入S3 URL"; detecting.value = false; return }
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ media_url: mediaUrl.value })
    })
    result.value = await resp.json()
  } catch (e) { error.value = "查询失败" }
  detecting.value = false
}
</script> 