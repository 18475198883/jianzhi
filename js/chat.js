// chat.js — 聊天页 UI 逻辑

let isProcessing = false;

/* === 初始化 === */
document.addEventListener('DOMContentLoaded', () => {
  if (isFirstVisit()) {
    openSetup();
  } else {
    initChat();
  }
});

function initChat() {
  updateHeader();
  updateCalorieCard();

  // 恢复最近聊天记录
  const history = getChatHistory();
  if (history.length) {
    history.slice(-30).forEach(m => appendBubble(m.role, m.content));
  }

  const gapAlert = getGapAlertMessage();
  if (gapAlert) {
    appendBubble('ai', gapAlert.reply, true);
    addChatMessage('ai', gapAlert.reply);
  }
  document.getElementById('msgInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}

function updateHeader() {
  const config = getConfig();
  const latest = getLatestWeight();
  const current = latest ? latest.weight : config.profile.startWeight;
  const remaining = +(current - config.profile.targetWeight).toFixed(1);
  const elapsed = daysBetween(config.startDate, today());
  document.getElementById('headerInfo').textContent =
    `🎯 还差${remaining}kg · 第${elapsed + 1}天`;
  document.getElementById('phaseLabel').textContent = config.phase || '减脂期';
}

function updateCalorieCard() {
  document.getElementById('remainingCal').textContent = fmtKcal(getTodayRemainingCalories());
}

/* === 消息发送 === */
async function sendMessage() {
  if (isProcessing) return;
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendBubble('user', text);
  addChatMessage('user', text);
  showTyping();

  isProcessing = true;
  document.getElementById('sendBtn').textContent = '...';

  try {
    const messages = buildMessages(text);
    const response = await callDeepSeek(messages);
    const parsed = parseAIResponse(response);

    if (parsed.action && parsed.action.type !== 'none' && parsed.action.type !== 'query' && parsed.action.type !== 'alert') {
      executeAction(parsed.action);
    }

    hideTyping();
    appendBubble('ai', parsed.reply, parsed.alerts.length > 0);
    addChatMessage('ai', parsed.reply);
    updateHeader();
    updateCalorieCard();

    const newAchievements = checkAchievements();
    if (newAchievements.length) {
      newAchievements.forEach(id => {
        const info = getAchievementInfo(id);
        if (info) appendBubble('ai', `${info.icon} 解锁成就：${info.name}！${info.desc}`, false);
      });
    }

  } catch (err) {
    hideTyping();
    appendBubble('ai', `抱歉，出了点问题：${err.message}。请稍后重试或检查 API Key 配置。`, true);
  } finally {
    isProcessing = false;
    document.getElementById('sendBtn').textContent = '➤';
  }
}

/* === 图片上传 === */
function triggerImageUpload() {
  document.getElementById('imageInput').click();
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  appendBubble('user', `[上传了图片: ${file.name}]`);

  isProcessing = true;
  showTyping();
  try {
    const base64 = await fileToBase64(file);
    const messages = buildMessages('请识别这张图片。如果是体脂秤/运动App截图，请提取其中的数据并记录；如果是食物照片，请估算食物种类和热量。', base64);
    const response = await callDeepSeekVision(messages, base64);
    const parsed = parseAIResponse(response);

    if (parsed.action && parsed.action.type !== 'none' && parsed.action.type !== 'query') {
      executeAction(parsed.action);
    }
    hideTyping();
    appendBubble('ai', parsed.reply, parsed.alerts.length > 0);
    addChatMessage('ai', parsed.reply);
    updateHeader();
    updateCalorieCard();
  } catch (err) {
    hideTyping();
    appendBubble('ai', `图片处理失败：${err.message}`, true);
  } finally {
    isProcessing = false;
  }
  event.target.value = '';
}

/* === 语音输入 === */
let recognition = null;
let isRecording = false;

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert('你的浏览器不支持语音输入'); return; }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      document.getElementById('msgInput').value = transcript;
    };
    recognition.onerror = (e) => {
      stopRecording();
      if (e.error === 'no-speech') {
        document.getElementById('msgInput').placeholder = '没有检测到语音，请重试';
      } else if (e.error === 'aborted') {
        document.getElementById('msgInput').placeholder = '说说今天吃了什么...';
      } else {
        document.getElementById('msgInput').placeholder = '语音识别失败，请手动输入';
      }
    };
    recognition.onend = () => {
      stopRecording();
    };
  }

  if (isRecording) {
    recognition.stop();
  } else {
    recognition.start();
    isRecording = true;
    document.getElementById('voiceBtn').textContent = '🔴点击停止';
    document.getElementById('voiceBtn').style.background = '#ef4444';
    document.getElementById('voiceBtn').style.color = '#fff';
    document.getElementById('msgInput').placeholder = '正在聆听...';
  }
}

function stopRecording() {
  isRecording = false;
  document.getElementById('voiceBtn').textContent = '🎤语音';
  document.getElementById('voiceBtn').style.background = '';
  document.getElementById('voiceBtn').style.color = '';
}

/* === 快捷模板 === */
function quickTemplate() {
  const templates = [
    { label: '🍳 早餐', text: '早餐：' },
    { label: '🍱 午餐', text: '午餐：' },
    { label: '🍲 晚餐', text: '晚餐：' },
    { label: '🍎 加餐', text: '加餐：' },
    { label: '⚖️ 报体重', text: '今早空腹体重：' },
    { label: '🏃 跑步', text: '跑步 分钟，距离 公里，感觉' },
    { label: '🚶 快走', text: '快走 分钟，感觉' },
    { label: '💪 家庭HIIT', text: '家庭HIIT 分钟，感觉' },
    { label: '🔄 跟昨天一样', text: '今天跟昨天吃的一样' },
    { label: '😴 休息日', text: '今天休息，没运动' },
  ];
  const container = document.getElementById('quickTemplates');
  container.innerHTML = templates.map(t =>
    `<button class="btn btn-outline btn-sm" onclick="useTemplate('${t.text.replace(/'/g, "\\'")}')">${t.label}</button>`
  ).join('');
  document.getElementById('quickModal').classList.add('active');
}

function useTemplate(text) {
  document.getElementById('msgInput').value = text;
  document.getElementById('msgInput').focus();
  closeQuick();
}

function closeQuick() {
  document.getElementById('quickModal').classList.remove('active');
}

/* === 聊天气泡 === */
function appendBubble(role, text, isAlert) {
  const area = document.getElementById('chatArea');
  const div = document.createElement('div');
  div.className = `bubble bubble-${role} animate-in${isAlert ? ' alert' : ''}`;
  div.textContent = text;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function showTyping() {
  const area = document.getElementById('chatArea');
  const div = document.createElement('div');
  div.className = 'bubble bubble-ai animate-in';
  div.id = 'typingIndicator';
  div.textContent = '思考中...';
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

/* === 设置面板 === */
function openSetup() {
  const config = getConfig();
  if (config.deepseekKey) document.getElementById('apiKeyInput').value = config.deepseekKey;
  document.getElementById('setupHeight').value = config.profile.height;
  document.getElementById('setupAge').value = config.profile.age;
  document.getElementById('setupWeight').value = config.profile.startWeight;
  document.getElementById('setupTarget').value = config.profile.targetWeight;
  document.getElementById('setupModal').classList.add('active');
}

function closeSetup() {
  document.getElementById('setupModal').classList.remove('active');
  // 如果还没配置Key，在页面显示引导
  if (!getConfig().deepseekKey) {
    if (!document.getElementById('chatArea').innerHTML.includes('配置 API Key')) {
      appendBubble('ai', '点击右上角⚙️配置 API Key 和身体数据后，才能开始使用哦～');
    }
  }
}

function saveSetup() {
  const key = document.getElementById('apiKeyInput').value.trim();
  const gender = document.getElementById('setupGender').value;
  const height = +document.getElementById('setupHeight').value;
  const age = +document.getElementById('setupAge').value;
  const startWeight = +document.getElementById('setupWeight').value;
  const targetWeight = +document.getElementById('setupTarget').value;

  if (!key) { alert('请输入 API Key'); return; }
  if (!key.startsWith('sk-')) { alert('API Key 格式错误，DeepSeek Key 应以 sk- 开头'); return; }

  const bmr = calcBMR(startWeight, height, age, gender);
  const tdee = calcTDEE(bmr, 'sedentary');
  const dailyCals = Math.round(tdee - 400);

  const ok = saveConfig({
    deepseekKey: key,
    profile: { gender, age, height, startWeight, targetWeight },
    plan: { dailyCalories: dailyCals, proteinG: Math.round(startWeight * 1.6), workoutWeekday: '40-60min', workoutWeekend: '90min+' },
    startDate: today(),
    phase: '适应期'
  });

  // 验证保存成功
  if (!getConfig().deepseekKey) {
    alert('配置保存失败，请检查浏览器存储空间是否充足。');
    return;
  }

  addWeightRecord({ date: today(), weight: startWeight, bodyFat: null, bmi: calcBMI(startWeight, height), source: 'manual', note: '初始体重' });

  closeSetup();
  initChat();
  appendBubble('ai', `设置完成！你的每日热量预算为 ${dailyCals}kcal。现在开始记录吧～告诉我今天吃了什么？`);
}

async function testKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) { document.getElementById('testKeyResult').textContent = '请先输入Key'; return; }
  document.getElementById('testKeyBtn').disabled = true;
  document.getElementById('testKeyResult').textContent = '测试中...';
  const ok = await testApiKey(key);
  document.getElementById('testKeyResult').textContent = ok ? '✅ 连接成功' : '❌ 连接失败';
  document.getElementById('testKeyBtn').disabled = false;
}

/* === 反馈/升级 === */
function openFeedback() { document.getElementById('feedbackModal').classList.add('active'); }
function closeFeedback() { document.getElementById('feedbackModal').classList.remove('active'); }

function generateFeedback() {
  const type = document.getElementById('fbType').value;
  const desc = document.getElementById('fbDesc').value.trim();
  if (!desc) { alert('请描述你的想法'); return; }
  const config = getConfig();
  const text = `升级请求 — 减脂管家\n类型：${type}\n描述：${desc}\n当前阶段：${config.phase}\n已坚持天数：${daysBetween(config.startDate, today())}天`;
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制！请打开 claude.ai 粘贴发送给 Claude');
    closeFeedback();
  }).catch(() => alert('复制失败，请手动复制：\n' + text));
}

/* === 数据导入/导出 === */
function importDataPrompt() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      dataImport(json);
      alert('数据恢复成功！');
      location.reload();
    } catch { alert('文件格式错误'); }
  };
  input.click();
}

function openDashboard() {
  window.location.href = 'dashboard.html';
}
