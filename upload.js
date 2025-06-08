const PRESIGN_API      = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/presignedURL';
const YOUR_BUCKET_NAME = 'team163-bucket';
const dropZone         = document.getElementById('dropZone');
const fileInput        = document.getElementById('fileInput');
const progressContainer= document.getElementById('progressContainer');
const progressBar      = document.getElementById('progressBar');
const uploadResult     = document.getElementById('uploadResult');

// —— 从 URL hash 提取 Cognito ID Token —— 
function getIdToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});
dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) handleFile(files[0]);
});

async function handleFile(file) {
  // 1. 获取并校验 id_token
  const idToken = getIdToken();
  if (!idToken) {
    alert('⚠️ 未获得 id_token，请先登录！');
    return;
  }

  uploadResult.textContent           = '';
  progressBar.style.width            = '0%';
  progressContainer.style.visibility = 'visible';

  try {
    // 2. 获取 presigned URL 时带上 Authorization 头
    uploadResult.textContent = '获取上传链接中...';
    const query = `?filename=${encodeURIComponent(file.name)}`;
    const resp = await fetch(PRESIGN_API + query, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (!resp.ok) throw new Error(`无法获取 presigned URL，状态：${resp.status}`);
    const { uploadUrl, objectKey, contentType } = await resp.json();

    // 3. 上传文件到 S3（无需再带 Cognito 头，URL 自带签名）
    uploadResult.textContent = '开始上传文件...';
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + '%';
      }
    });
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          progressBar.style.width = '100%';
          uploadResult.innerHTML = `<p class="success">上传成功！</p>`;
        } else {
          throw new Error(`上传失败，状态：${xhr.status}`);
        }
      }
    };
    xhr.send(file);

  } catch (err) {
    progressContainer.style.visibility = 'hidden';
    uploadResult.innerHTML = `<p class="error">上传出错：${err.message}</p>`;
    console.error(err);
  }
}

const API_ENDPOINT_FIND_BY_SPECIES = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_by_species";
const searchBtn = document.getElementById("searchBtn");
const speciesInput = document.getElementById("speciesInput");
const linksList = document.getElementById("linksList");

// 从 window.location.hash 里提取 token
function getIdToken() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get("id_token");
}

searchBtn.addEventListener("click", () => {
  const idToken = getIdToken();
  if (!idToken) {
    alert("未获得 id_token，请先登录！");
    return;
  }

  const raw = speciesInput.value.trim();
  if (!raw) {
    alert("请先输入至少一个物种（英文小写，逗号分隔）。");
    return;
  }
  const arr = raw.split(",").map(s => s.trim()).filter(s => s);
  if (!arr.length) {
    alert("请输入合法的物种列表，比如：crow 或 crow,pigeon");
    return;
  }

  const qs = arr.map(sp => `species=${encodeURIComponent(sp)}`).join("&");
  const url = `${API_ENDPOINT_FIND_BY_SPECIES}?${qs}`;

  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // 根据你在 API Gateway Cognito Authorizer 中的配置，决定是否要加 “Bearer ” 前缀
      "Authorization": `Bearer ${idToken}`
    }
  })
    .then(resp => {
      if (!resp.ok) throw new Error("HTTP 错误：" + resp.status);
      return resp.json();
    })
    .then(data => {
      linksList.innerHTML = "";
      if (Array.isArray(data.links) && data.links.length) {
        data.links.forEach(link => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = link;
          a.target = "_blank";
          a.textContent = link;
          li.appendChild(a);
          linksList.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "没有匹配到任何文件。";
        linksList.appendChild(li);
      }
    })
    .catch(err => {
      console.error(err);
      linksList.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = "查询出错，请检查控制台日志。";
      linksList.appendChild(li);
    });
});

const API_ENDPOINT_FIND_BY_THUMB = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query";
const thumbBtn    = document.getElementById("thumbBtn");
const thumbInput  = document.getElementById("thumbInput");
const thumbResult = document.getElementById("thumbResult");

// —— 从 URL hash 提取 Cognito ID Token —— 
function getIdToken() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get("id_token");
}

thumbBtn.addEventListener("click", async () => {
  thumbResult.innerHTML = "";

  // 1. 检查登录 token
  const idToken = getIdToken();
  if (!idToken) {
    thumbResult.innerHTML = `<p class="error">⚠️ 未获得 id_token，请先登录！</p>`;
    return;
  }

  // 2. 校验用户输入
  const thumbUrl = thumbInput.value.trim();
  if (!thumbUrl) {
    thumbResult.innerHTML = `<p class="error">⚠️ 请先输入一个缩略图 S3 URL。</p>`;
    return;
  }

  // 3. 禁用按钮并提示中
  thumbBtn.disabled = true;
  thumbBtn.textContent = "查询中...";

  try {
    // 4. 发起带鉴权的请求
    const resp = await fetch(API_ENDPOINT_FIND_BY_THUMB, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ thumbnail_url: thumbUrl })
    });
    if (!resp.ok) throw new Error("后端返回状态：" + resp.status);

    const data = await resp.json();
    if (!data.full_image_url) throw new Error("后端未返回 full_image_url");

    // 5. 显示结果
    thumbResult.innerHTML = `
      <p class="success">查询成功！原图 URL：</p>
      <a href="${data.full_image_url}" target="_blank">${data.full_image_url}</a>
    `;
  } catch (err) {
    console.error(err);
    thumbResult.innerHTML = `<p class="error">❌ 查询失败：${err.message}</p>`;
  } finally {
    // 6. 恢复按钮状态
    thumbBtn.disabled = false;
    thumbBtn.textContent = "查询原图";
  }
});

const API_ENDPOINT_GET_LABELS  = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/edittag";
const API_ENDPOINT_UPDATE_TAGS = "https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/edittag";

const urlsInput         = document.getElementById("urlsInput");
const fetchLabelsBtn    = document.getElementById("fetchLabelsBtn");
const currentLabelsArea = document.getElementById("currentLabelsArea");
const tagsInput         = document.getElementById("tagsInput");
const submitUpdateBtn   = document.getElementById("submitUpdateBtn");
const updateResultArea  = document.getElementById("updateResultArea");

function getIdToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

// —— 获取当前标签 —— 
fetchLabelsBtn.addEventListener("click", async () => {
  currentLabelsArea.innerHTML = "";
  updateResultArea.innerHTML  = "";

  const idToken = getIdToken();
  if (!idToken) {
    currentLabelsArea.innerHTML = `<div class="error">⚠️ 未获得 id_token，请先登录！</div>`;
    return;
  }

  const rawUrls = urlsInput.value.trim();
  if (!rawUrls) {
    currentLabelsArea.innerHTML = `<div class="error">⚠️ 请先输入至少一个 URL，每行一个。</div>`;
    return;
  }
  const urlList = rawUrls.split("\n").map(l => l.trim()).filter(l => l);
  if (!urlList.length) {
    currentLabelsArea.innerHTML = `<div class="error">⚠️ 无效的 URL 列表，请检查输入。</div>`;
    return;
  }

  fetchLabelsBtn.disabled = true;
  fetchLabelsBtn.textContent = "查询中...";

  try {
    const qs = urlList.map(u => "url=" + encodeURIComponent(u)).join("&");
    const resp = await fetch(`${API_ENDPOINT_GET_LABELS}?${qs}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      }
    });
    if (!resp.ok) throw new Error("后端返回状态：" + resp.status);
    const data = await resp.json();

    currentLabelsArea.innerHTML = "";
    const results = data.results || {};
    urlList.forEach(u => {
      const labels = results[u] || {};
      const section = document.createElement("div");
      section.style.marginBottom = "16px";

      const title = document.createElement("h3");
      title.textContent = `URL: ${u}`;
      title.style.fontSize = "0.95rem";
      title.style.color = "#1e40af";
      section.appendChild(title);

      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(labels, null, 2);
      section.appendChild(pre);

      currentLabelsArea.appendChild(section);
    });

  } catch (err) {
    console.error(err);
    currentLabelsArea.innerHTML = `<div class="error">❌ 查询失败：${err.message}</div>`;
  } finally {
    fetchLabelsBtn.disabled = false;
    fetchLabelsBtn.textContent = "获取当前标签";
  }
});

// —— 提交更新标签 —— 
submitUpdateBtn.addEventListener("click", async () => {
  updateResultArea.innerHTML = "";

  const idToken = getIdToken();
  if (!idToken) {
    updateResultArea.innerHTML = `<div class="error">⚠️ 未获得 id_token，请先登录！</div>`;
    return;
  }

  const rawUrls = urlsInput.value.trim();
  if (!rawUrls) {
    updateResultArea.innerHTML = `<div class="error">⚠️ 请先在上方输入 URL 列表并获取当前标签。</div>`;
    return;
  }
  const urlList = rawUrls.split("\n").map(l => l.trim()).filter(l => l);
  if (!urlList.length) {
    updateResultArea.innerHTML = `<div class="error">⚠️ 无效的 URL 列表，请检查输入。</div>`;
    return;
  }

  let tagsObj;
  try {
    tagsObj = JSON.parse(tagsInput.value.trim());
    if (typeof tagsObj !== "object" || Array.isArray(tagsObj)) {
      throw new Error("必须是一个 {\"tag\":number, ...} 对象");
    }
    Object.entries(tagsObj).forEach(([k, v]) => {
      if (typeof v !== "number") throw new Error(`标签 "${k}" 的值必须是数字`);
    });
  } catch (err) {
    updateResultArea.innerHTML = `<div class="error">⚠️ 标签字典 JSON 错误：${err.message}</div>`;
    return;
  }

  const opType   = document.querySelector('input[name="opType"]:checked').value;
  const operation = parseInt(opType, 10);  // 1=累加，0=减少

  submitUpdateBtn.disabled = true;
  submitUpdateBtn.textContent = "提交中...";

  const payload = { url: urlList, operation, tags: tagsObj };

  try {
    const resp = await fetch(API_ENDPOINT_UPDATE_TAGS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error("后端返回状态：" + resp.status);
    const text = await resp.text();
    updateResultArea.innerHTML = `<div class="result">✅ 操作成功，后端返回：<br>${text}</div>`;
  } catch (err) {
    console.error(err);
    updateResultArea.innerHTML = `<div class="error">❌ 更新失败：${err.message}</div>`;
  } finally {
    submitUpdateBtn.disabled = false;
    submitUpdateBtn.textContent = "提交更新标签";
  }
});

const API_ENDPOINT_DELETE_FILES = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_delete_files';
const deleteUrlsInput   = document.getElementById('deleteUrlsInput');
const deleteFilesBtn    = document.getElementById('deleteFilesBtn');
const deleteResultArea  = document.getElementById('deleteResultArea');

// —— 从 URL hash 提取 Cognito ID Token —— 
function getIdToken() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get("id_token");
}

deleteFilesBtn.addEventListener('click', async () => {
  // 清空旧结果
  deleteResultArea.innerHTML = '';

  // 1. 获取并校验 id_token
  const idToken = getIdToken();
  if (!idToken) {
    deleteResultArea.innerHTML = `<p class="error">⚠️ 未获得 id_token，请先登录！</p>`;
    return;
  }

  // 2. 读取并验证 URL 列表
  const raw = deleteUrlsInput.value.trim();
  if (!raw) {
    deleteResultArea.innerHTML = `<p class="error">⚠️ 请先输入至少一个 URL</p>`;
    return;
  }
  const urlList = raw
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length);
  if (!urlList.length) {
    deleteResultArea.innerHTML = `<p class="error">⚠️ 无效的 URL 列表</p>`;
    return;
  }

  // 3. 禁用按钮并提示中
  deleteFilesBtn.disabled = true;
  deleteFilesBtn.textContent = '删除中…';

  try {
    // 4. 发起带鉴权的删除请求
    const resp = await fetch(API_ENDPOINT_DELETE_FILES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ urls: urlList })
    });

    const data = await resp.json();
    if (resp.ok) {
      deleteResultArea.innerHTML =
        `<p class="success">✅ 删除成功：${data.message}</p>`;
    } else {
      deleteResultArea.innerHTML =
        `<p class="error">❌ 删除失败：${data.message || resp.status}</p>`;
    }
  } catch (err) {
    console.error(err);
    deleteResultArea.innerHTML =
      `<p class="error">🚨 异常：${err.message}</p>`;
  } finally {
    // 5. 恢复按钮状态
    deleteFilesBtn.disabled = false;
    deleteFilesBtn.textContent = '删除选中文件';
  }
});

// —— 按标签查询文件 —— 
const API_QUERY_ENDPOINT = 
  'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/Find_image_video'; 
const queryTagInput     = document.getElementById('queryTagInput');
const queryCountInput   = document.getElementById('queryCountInput');
const queryFilesBtn     = document.getElementById('queryFilesBtn');
const queryResultArea   = document.getElementById('queryResultArea');

function getIdToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

queryFilesBtn.addEventListener('click', async () => {
  // 1. 获取并校验 id_token
  const idToken = getIdToken();
  if (!idToken) {
    queryResultArea.innerHTML = `<p class="error">⚠️ 未获得 id_token，请先登录！</p>`;
    return;
  }

  // 2. 读取并验证输入
  const tag   = queryTagInput.value.trim();
  const count = parseInt(queryCountInput.value, 10);
  queryResultArea.innerHTML = '';
  if (!tag || isNaN(count) || count < 1) {
    queryResultArea.innerHTML = `<p class="error">⚠️ 请填写有效的标签名和最小次数</p>`;
    return;
  }

  queryFilesBtn.disabled = true;
  queryFilesBtn.textContent = '查询中…';

  try {
    // 3. 发起带鉴权请求
    const resp = await fetch(API_QUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ tags: { [tag]: count } })
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.message || resp.statusText);
    }

    // 4. 渲染结果
    if (!data.links || data.links.length === 0) {
      queryResultArea.innerHTML = `<p>ℹ️ 未找到满足条件的文件。</p>`;
    } else {
      const list = document.createElement('ul');
      data.links.forEach(url => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href        = url;
        a.target      = '_blank';
        a.textContent = url;
        li.appendChild(a);
        list.appendChild(li);
      });
      queryResultArea.appendChild(list);
    }
  } catch (err) {
    console.error(err);
    queryResultArea.innerHTML = `<p class="error">🚨 查询失败：${err.message}</p>`;
  } finally {
    // 5. 恢复按钮状态
    queryFilesBtn.disabled = false;
    queryFilesBtn.textContent = '查询文件';
  }
});

const API_ENDPOINT_DETECT = 
  'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/detect_and_query';

const detectInput      = document.getElementById('detectInput');
const detectBtn        = document.getElementById('detectBtn');
const detectResultArea = document.getElementById('detectResultArea');

function getIdToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

detectBtn.addEventListener('click', async () => {
  detectResultArea.innerHTML = '';

  // 1. 校验登录
  const idToken = getIdToken();
  if (!idToken) {
    detectResultArea.innerHTML = '<p class="error">⚠️ 未获得 id_token，请先登录！</p>';
    return;
  }

  // 2. 读取并校验输入
  const mediaUrl = detectInput.value.trim();
  if (!mediaUrl) {
    detectResultArea.innerHTML = '<p class="error">⚠️ 请输入 S3 URL</p>';
    return;
  }

  detectBtn.disabled   = true;
  detectBtn.textContent = '查询中…';

  try {
    // 3. 发送 POST 请求
    const resp = await fetch(API_ENDPOINT_DETECT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ media_url: mediaUrl })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const data = await resp.json();
    // data = { detected_labels: [...], query_by_species_result: { links: [...] }, thumbnail_url }

    // 4. 拼 HTML 展示
    let html = `<p class="result-title">检测到的标签：${data.detected_labels.join(', ')}</p>`;
    html += '<p class="result-title">同标签文件列表：</p><ul class="links-list">';
    data.query_by_species_result.links.forEach(url => {
      html += `<li><a href="${url}" target="_blank">${url}</a></li>`;
    });
    html += '</ul>';
    if (data.thumbnail_url) {
      html += `<p>缩略图 URL：<code>${data.thumbnail_url}</code></p>`;
    }
    detectResultArea.innerHTML = html;

  } catch (err) {
    console.error(err);
    detectResultArea.innerHTML = `<p class="error">查询失败：${err.message}</p>`;
  } finally {
    detectBtn.disabled   = false;
    detectBtn.textContent = '查询同标签文件';
  }
});
