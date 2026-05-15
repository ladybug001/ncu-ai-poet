/**
 * AI 妙笔生花 - 前端交互逻辑
 */

// ============ 创作模式配置 ============
const MODES = [
  { id: 'classical_poem', icon: '🎋', name: '古诗创作', desc: '五言/七言格律诗', placeholder: '如：秋天的月亮、离别、归乡' },
  { id: 'modern_poem',    icon: '✨', name: '现代诗',   desc: '自由体现代诗歌', placeholder: '如：城市的孤独、深夜的咖啡馆' },
  { id: 'social_copy',    icon: '📱', name: '朋友圈文案', desc: '三种风格一键生成', placeholder: '如：周末野餐、今天加班、旅行打卡' },
  { id: 'couplet',        icon: '🧧', name: '对联生成',  desc: '上下联+横批', placeholder: '如：新年、乔迁、开业、婚庆' },
  { id: 'acrostic',       icon: '🔤', name: '藏头诗',   desc: '指定首字成诗', placeholder: '如：我爱南昌、生日快乐、前程似锦' },
  { id: 'haiku',          icon: '🍃', name: '俳句短歌',  desc: '中日英三体俳句', placeholder: '如：樱花、雨后、落叶、星空' },
];

let currentMode = MODES[0].id;
let isGenerating = false;

// ============ DOM 元素 ============
const modeGrid     = document.getElementById('modeGrid');
const topicInput   = document.getElementById('topicInput');
const styleInput   = document.getElementById('styleInput');
const charCount    = document.getElementById('charCount');
const generateBtn  = document.getElementById('generateBtn');
const btnText      = document.getElementById('btnText');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const outputTitle   = document.getElementById('outputTitle');
const copyBtn       = document.getElementById('copyBtn');

// ============ 初始化模式卡片 ============
function initModeCards() {
  modeGrid.innerHTML = '';
  MODES.forEach(mode => {
    const card = document.createElement('div');
    card.className = `mode-card${mode.id === currentMode ? ' active' : ''}`;
    card.dataset.mode = mode.id;
    card.innerHTML = `
      <span class="mode-card__icon">${mode.icon}</span>
      <span class="mode-card__name">${mode.name}</span>
      <span class="mode-card__desc">${mode.desc}</span>
    `;
    card.addEventListener('click', () => selectMode(mode.id));
    modeGrid.appendChild(card);
  });
}

// ============ 切换模式 ============
function selectMode(modeId) {
  currentMode = modeId;
  const mode = MODES.find(m => m.id === modeId);

  // 更新卡片状态
  document.querySelectorAll('.mode-card').forEach(card => {
    card.classList.toggle('active', card.dataset.mode === modeId);
  });

  // 更新 placeholder
  topicInput.placeholder = mode.placeholder;

  // 清空输入
  topicInput.value = '';
  styleInput.value = '';
  updateCharCount();
}

// ============ 字符计数 ============
function updateCharCount() {
  const len = topicInput.value.length;
  charCount.textContent = `${len} / 200`;
}

topicInput.addEventListener('input', () => {
  if (topicInput.value.length > 200) {
    topicInput.value = topicInput.value.slice(0, 200);
  }
  updateCharCount();
});

// ============ 生成请求 ============
async function handleGenerate() {
  if (isGenerating) return;

  const topic = topicInput.value.trim();
  if (!topic) {
    showError('请先输入创作主题 ✍️');
    topicInput.focus();
    return;
  }

  isGenerating = true;
  generateBtn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span> AI 创作中…';

  // 隐藏之前的输出
  outputSection.classList.remove('visible');

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: currentMode,
        topic: topic,
        style: styleInput.value.trim(),
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      showError(data.error || '生成失败，请稍后重试');
      return;
    }

    // 展示结果
    displayResult(data.content);

  } catch (err) {
    showError('网络错误，请检查网络连接后重试');
    console.error(err);
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    const mode = MODES.find(m => m.id === currentMode);
    btnText.innerHTML = `${mode.icon} 开始创作`;
  }
}

generateBtn.addEventListener('click', handleGenerate);

// Enter 快捷键（Ctrl+Enter 提交）
topicInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    handleGenerate();
  }
});

// ============ 打字机效果展示结果 ============
function displayResult(text) {
  const mode = MODES.find(m => m.id === currentMode);
  outputTitle.innerHTML = `${mode.icon} ${mode.name}`;

  outputContent.innerHTML = '';
  outputSection.classList.add('visible');

  // 滚动到输出区域
  setTimeout(() => {
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // 打字机效果
  let index = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  outputContent.appendChild(cursor);

  const speed = Math.max(15, Math.min(40, 2000 / text.length)); // 动态速度

  function type() {
    if (index < text.length) {
      // 在 cursor 之前插入文本
      const char = text[index];
      const textNode = document.createTextNode(char);
      outputContent.insertBefore(textNode, cursor);
      index++;
      setTimeout(type, speed);
    } else {
      // 打字完成，移除光标
      setTimeout(() => cursor.remove(), 1500);
    }
  }

  type();

  // 重置复制按钮
  copyBtn.innerHTML = '📋 复制';
  copyBtn.classList.remove('copied');
}

// ============ 错误提示 ============
function showError(message) {
  outputSection.classList.add('visible');
  outputTitle.innerHTML = '⚠️ 提示';
  outputContent.innerHTML = `<div class="error-msg">❌ ${message}</div>`;
}

// ============ 复制到剪贴板 ============
copyBtn.addEventListener('click', async () => {
  const text = outputContent.innerText;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.innerHTML = '✅ 已复制';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.innerHTML = '📋 复制';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copyBtn.innerHTML = '✅ 已复制';
    copyBtn.classList.add('copied');
  }
});

// ============ 初始化 ============
initModeCards();
updateCharCount();

// 设置初始按钮文案
const initMode = MODES.find(m => m.id === currentMode);
btnText.innerHTML = `${initMode.icon} 开始创作`;
