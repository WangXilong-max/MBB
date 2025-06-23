<template>
  <div>
    <h2>按物种查询</h2>
    <input v-model="species" placeholder="输入物种，逗号分隔" />
    <button @click="search">查询</button>
    <ul>
      <li v-for="link in links" :key="link">
        <img v-if="link.includes('/thumbnail/')" :src="link" style="width:150px;margin:4px;" />
        <a :href="link" target="_blank" style="display:block;font-size:0.8rem;margin-top:4px;">{{ link }}</a>
      </li>
      <li v-if="links.length === 0 && searched">未匹配到文件</li>
    </ul>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_by_species"
const species = ref('')
const links = ref([])
const searched = ref(false)
function getIdToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get("id_token")
}
async function search() {
  searched.value = true
  links.value = []
  const idToken = getIdToken()
  if (!idToken) return alert("请先登录！")
  const arr = species.value.split(",").map(s => s.trim()).filter(Boolean)
  if (!arr.length) return alert("请输入有效物种")
  const qs = arr.map(sp => `species=${encodeURIComponent(sp)}`).join("&")
  const url = `${API}?${qs}`
  try {
    const resp = await fetch(url, { headers: { "Authorization": `Bearer ${idToken}` } })
    const data = await resp.json()
    links.value = Array.isArray(data.links) ? data.links : []
  } catch (e) {
    alert("查询失败")
  }
}
</script> 