// api.js — DeepSeek API 调用封装

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEEPSEEK_CHAT = DEEPSEEK_BASE + '/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

/** 通用 fetch with timeout */
async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

/** 调用 DeepSeek Chat API */
async function callDeepSeek(messages, options = {}) {
  const config = getConfig();
  const key = config.deepseekKey;
  if (!key) throw new Error('请先配置 DeepSeek API Key');

  const { temperature = 0.7, maxTokens = 1500 } = options;

  const resp = await fetchWithTimeout(DEEPSEEK_CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 请求失败 (${resp.status})`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

/** 带图片的对话（截图识别） */
async function callDeepSeekVision(messages, imageBase64) {
  const config = getConfig();
  const key = config.deepseekKey;
  if (!key) throw new Error('请先配置 DeepSeek API Key');

  const lastMsg = messages[messages.length - 1];
  const content = [
    { type: 'text', text: lastMsg.content },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
  ];

  const msgs = [...messages.slice(0, -1), { role: 'user', content }];

  const resp = await fetchWithTimeout(DEEPSEEK_CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: msgs,
      temperature: 0.5,
      max_tokens: 1500
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `图片识别失败 (${resp.status})`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

/** 将图片文件转换为 base64 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 测试 API Key 是否有效 */
async function testApiKey(key) {
  try {
    const resp = await fetch(DEEPSEEK_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5
      })
    });
    return resp.ok;
  } catch {
    return false;
  }
}
