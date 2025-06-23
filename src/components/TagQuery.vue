<template>
  <div>
    <h2>按标签查文件</h2>
    <div v-for="(row, i) in tagRows" :key="i" class="tag-row">
      <input v-model="row.tag" placeholder="标签名" />
      <input v-model.number="row.count" type="number" min="1" placeholder="最小数量" />
      <button @click="removeRow(i)">×</button>
    </div>
    <button @click="addRow">添加标签</button>
    <button @click="queryFiles" :disabled="querying">{{ querying ? "查询中..." : "查询文件" }}</button>
    <ul>
      <li v-for="link in links" :key="link">
        <img :src="link" style="width:150px;object-fit:cover;display:block;margin-bottom:4px;" />
        <a :href="link" target="_blank" style="display:block;font-size:0.8rem;color:#0066cc;">{{ link }}</a>
      </li>
      <li v-if="links.length === 0 && queried">未找到匹配文件</li>
    </ul>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/Find_image_video'
const tagRows = ref([{ tag: '', count: 1 }])
const links = ref([])
const querying = ref(false)
const queried = ref(false)
function getIdToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get("id_token")
}
function addRow() { tagRows.value.push({ tag: '', count: 1 }) }
function removeRow(i) { tagRows.value.splice(i, 1) }
async function queryFiles() {
  links.value = []
  queried.value = true
  querying.value = true
  const idToken = getIdToken()
  if (!idToken) { querying.value = false; return alert("请先登录！") }
  const tags = {}
  tagRows.value.forEach(row => { if (row.tag && row.count > 0) tags[row.tag] = row.count })
  if (Object.keys(tags).length === 0) { querying.value = false; return alert("请填写标签和数量") }
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ tags })
    })
    const data = await resp.json()
    links.value = Array.isArray(data.links) ? data.links : []
  } catch (e) { alert("查询失败") }
  querying.value = false
}
</script> 