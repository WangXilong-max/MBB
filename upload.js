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

          if (link.includes("/thumbnail/")) {
            const img = document.createElement("img");
            img.src = link;
            img.alt = "";
            img.style.width = "150px";
            img.style.margin = "4px";
            li.appendChild(img);
            
            const urlLink = document.createElement("a");
            urlLink.href = link;
            urlLink.target = "_blank";
            urlLink.textContent = link;
            urlLink.style.display = "block";
            urlLink.style.fontSize = "0.8rem";
            urlLink.style.marginTop = "4px";
            li.appendChild(urlLink);
            
          } else {
            const a = document.createElement("a");
            a.href = link;
            a.target = "_blank";
            a.textContent = link;
            li.appendChild(a);
          }

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
  // 清空上次结果
  while (thumbResult.firstChild) {
    thumbResult.removeChild(thumbResult.firstChild);
  }

  // 1. 检查登录 token
  const idToken = getIdToken();
  if (!idToken) {
    const errP = document.createElement("p");
    errP.className = "error";
    errP.textContent = "⚠️ 未获得 id_token，请先登录！";
    thumbResult.appendChild(errP);
    return;
  }

  // 2. 校验用户输入
  const thumbUrl = thumbInput.value.trim();
  if (!thumbUrl) {
    const errP = document.createElement("p");
    errP.className = "error";
    errP.textContent = "⚠️ 请先输入一个缩略图 S3 URL。";
    thumbResult.appendChild(errP);
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

    // 5. 用 DOM API 显示成功提示
    const successP = document.createElement("p");
    successP.className = "success";
    successP.textContent = "查询成功！";
    thumbResult.appendChild(successP);

    // 6. 创建“下载原图”链接
    const fullUrl = data.full_image_url;
    const filename = fullUrl.split("/").pop();
    const dlLink = document.createElement("a");
    dlLink.href = fullUrl;
    dlLink.textContent = "Check & download originnal picture.";
    dlLink.download = filename;       // 关键 ——  点击直接下载
    dlLink.target = "_blank";
    dlLink.style.display = "block";
    dlLink.style.marginTop = "8px";
    thumbResult.appendChild(dlLink);

  } catch (err) {
    console.error(err);
    const errP = document.createElement("p");
    errP.className = "error";
    errP.textContent = `❌ 查询失败：${err.message}`;
    thumbResult.appendChild(errP);
  } finally {
    // 7. 恢复按钮状态
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

const API_QUERY_ENDPOINT = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/Find_image_video';
const tagContainer      = document.getElementById('tagContainer');
const addTagBtn         = document.getElementById('addTagBtn');
const queryFilesBtn     = document.getElementById('queryFilesBtn');
const queryResultArea   = document.getElementById('queryResultArea');

// 从 URL hash 提取 Cognito ID Token
function getIdToken() {
  const hash = window.location.hash.startsWith('#') 
    ? window.location.hash.slice(1) 
    : window.location.hash;
  return new URLSearchParams(hash).get('id_token');
}

// 创建一行 tag + count + 删除 按钮
function createTagRow() {
  const row = document.createElement('div');
  row.className = 'form-row tag-row';

  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.className = 'form-control tag-input';
  tagInput.placeholder = 'Tag name (e.g. pigeon)';

  const countInput = document.createElement('input');
  countInput.type = 'number';
  countInput.className = 'form-control count-input';
  countInput.placeholder = 'Min count (e.g. 1)';
  countInput.min = '1';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-sm btn-danger remove-tag-btn';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    tagContainer.removeChild(row);
  });

  row.append(tagInput, countInput, removeBtn);
  tagContainer.appendChild(row);
}

// 收集所有 tag–count 对
function collectTags() {
  const tags = {};
  document.querySelectorAll('.tag-row').forEach(row => {
    const tag = row.querySelector('.tag-input').value.trim();
    const count = parseInt(row.querySelector('.count-input').value, 10);
    if (tag && !isNaN(count) && count > 0) {
      tags[tag] = count;
    }
  });
  return tags;
}

// 初始化：如果没有任何 tag-row，就加一行
if (tagContainer.querySelectorAll('.tag-row').length === 0) {
  createTagRow();
}

// 绑定“添加 Tag”按钮
addTagBtn.addEventListener('click', createTagRow);

// 绑定“查询文件”按钮
queryFilesBtn.addEventListener('click', async () => {
  // 清空上次结果
  queryResultArea.innerHTML = '';

  // 检验登录
  const idToken = getIdToken();
  if (!idToken) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = '⚠️ 未获得 id_token，请先登录！';
    queryResultArea.appendChild(p);
    return;
  }

  // 收集 tags
  const tags = collectTags();
  if (Object.keys(tags).length === 0) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = '⚠️ 请至少填写一个有效的 Tag 和 Count。';
    queryResultArea.appendChild(p);
    return;
  }

  // 发请求前禁用按钮
  queryFilesBtn.disabled = true;
  queryFilesBtn.textContent = '查询中…';

  try {
    const resp = await fetch(API_QUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ tags })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || resp.statusText);


    let ul = queryResultArea.querySelector('ul.links-list');
    if (!ul) {
      ul = document.createElement('ul');
      ul.className = 'links-list';
      queryResultArea.appendChild(ul);
    }

    ul.innerHTML = '';
    if (!Array.isArray(data.links) || data.links.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'ℹ️ 未找到满足条件的文件。';
      ul.appendChild(li);
    } else {
      data.links.forEach(link => {
        const li = document.createElement('li');

        const img = document.createElement('img');
        img.src = link;
        img.alt = '';
        img.style.width       = '150px';
        img.style.objectFit   = 'cover';
        img.style.display     = 'block';
        img.style.marginBottom= '4px';
        li.appendChild(img);

        const a = document.createElement('a');
        a.href        = link;
        a.textContent = link;
        a.target      = '_blank';
        a.style.display    = 'block';
        a.style.fontSize   = '0.8rem';
        a.style.color      = '#0066cc';
        li.appendChild(a);

        ul.appendChild(li);
      });
    }
    

  } catch (err) {
    console.error(err);
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = `🚨 查询失败：${err.message}`;
    queryResultArea.appendChild(p);
  } finally {
    // 恢复按钮状态
    queryFilesBtn.disabled = false;
    queryFilesBtn.textContent = '查询文件';
  }
});

const API_ENDPOINT_DETECT = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_files';

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
