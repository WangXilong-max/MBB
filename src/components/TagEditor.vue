<template>
  <div>
    <h2>标签查询与编辑</h2>
    <textarea v-model="urls" placeholder="每行一个URL"></textarea>
    <button @click="fetchLabels" :disabled="fetching">{{ fetching ? "查询中..." : "获取标签" }}</button>
    <div v-html="labelsHtml"></div>
    <textarea v-model="tagsJson" placeholder='标签JSON，如{"pigeon":1}'></textarea>
    <div>
      <label><input type="radio" value="1" v-model="opType" />添加</label>
      <label><input type="radio" value="2" v-model="opType" />覆盖</label>
      <label><input type="radio" value="3" v-model="opType" />删除</label>
    </div>
    <button @click="updateTags" :disabled="updating">{{ updating ? "上传中..." : "更新标签" }}</button>
    <div v-html="updateResult"></div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/edittag"
const urls = ref('')
const tagsJson = ref('')
const opType = ref('1')
const labelsHtml = ref('')
const updateResult = ref('')
const fetching = ref(false)
const updating = ref(false)
function getIdToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get("id_token")
}
async function fetchLabels() {
  labelsHtml.value = ''
  fetching.value = true
  const idToken = getIdToken()
  if (!idToken) { labelsHtml.value = "请先登录！"; fetching.value = false; return }
  const urlList = urls.value.split("\n").map(l => l.trim()).filter(Boolean)
  if (!urlList.length) { labelsHtml.value = "请输入URL"; fetching.value = false; return }
  const qs = urlList.map(u => "url=" + encodeURIComponent(u)).join("&")
  try {
    const resp = await fetch(`${API}?${qs}`, { headers: { "Authorization": `Bearer ${idToken}` } })
    const data = await resp.json()
    labelsHtml.value = urlList.map(u => `<div><b>${u}</b><pre>${JSON.stringify((data.results||{})[u]||{}, null, 2)}</pre></div>`).join("")
  } catch (e) {
    labelsHtml.value = "查询失败"
  }
  fetching.value = false
}
async function updateTags() {
  updateResult.value = ''
  updating.value = true
  const idToken = getIdToken()
  if (!idToken) { updateResult.value = "请先登录！"; updating.value = false; return }
  const urlList = urls.value.split("\n").map(l => l.trim()).filter(Boolean)
  if (!urlList.length) { updateResult.value = "请输入URL"; updating.value = false; return }
  let tagsObj
  try {
    tagsObj = JSON.parse(tagsJson.value)
    if (typeof tagsObj !== "object" || Array.isArray(tagsObj)) throw new Error()
  } catch { updateResult.value = "标签JSON格式错误"; updating.value = false; return }
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ url: urlList, operation: parseInt(opType.value), tags: tagsObj })
    })
    if (!resp.ok) throw new Error("更新失败")
    updateResult.value = "✅ 更新成功"
  } catch (e) {
    updateResult.value = "❌ " + e.message
  }
  updating.value = false
}
</script> 