// share.js — 分享页海报生成

const TEMPLATES = {
  minimal: { bg: '#ffffff', text: '#1e293b', accent: '#22c55e', card: '#f8fafc' },
  dark: { bg: '#0f172a', text: '#f1f5f9', accent: '#22c55e', card: '#1e293b' },
  warm: { bg: '#fff7ed', text: '#431407', accent: '#f97316', card: '#ffffff' },
  nature: { bg: '#f0fdf4', text: '#14532d', accent: '#22c55e', card: '#ffffff' },
  cyber: { bg: '#0a0a2e', text: '#00ff88', accent: '#ff00ff', card: '#1a1a3e' },
  japan: { bg: '#faf9f6', text: '#2d3748', accent: '#e53e3e', card: '#ffffff' }
};

let currentMilestoneIndex = 0;
let milestones = [];
let currentTemplate = 'minimal';

document.addEventListener('DOMContentLoaded', () => {
  calcMilestones();
  switchTemplate();
});

function calcMilestones() {
  const weight = getWeightRecords();
  const config = getConfig();
  const startWeight = config.profile.startWeight;
  const targetWeight = config.profile.targetWeight;

  milestones = [];
  for (let w = startWeight - 3; w >= targetWeight; w -= 3) {
    const record = weight.find(r => r.weight <= w);
    milestones.push({
      kg: +(startWeight - w).toFixed(0),
      weight: w,
      date: record ? record.date : null,
      title: `已减${+(startWeight - w).toFixed(0)}kg`,
      achieved: !!record
    });
  }

  if (!milestones.length) {
    milestones.push({
      kg: 0, weight: startWeight, date: null,
      title: '减脂之旅开始', achieved: false
    });
  }

  // 默认展示最后一个已达成的
  const lastAchieved = milestones.filter(m => m.achieved).pop();
  currentMilestoneIndex = lastAchieved ? milestones.indexOf(lastAchieved) : 0;
}

function selectMilestone(dir) {
  if (dir === 'prev') currentMilestoneIndex = Math.max(0, currentMilestoneIndex - 1);
  else currentMilestoneIndex = Math.min(milestones.length - 1, currentMilestoneIndex + 1);
  switchTemplate();
}

function switchTemplate() {
  currentTemplate = document.getElementById('templateSelect').value;
  renderPoster();
}

function renderPoster() {
  const m = milestones[currentMilestoneIndex];
  if (!m) return;
  const t = TEMPLATES[currentTemplate];
  const config = getConfig();
  const exerciseRecords = getExerciseRecords();
  const totalExercise = exerciseRecords.length;
  const allDiets = getDietRecords();
  const avgCal = allDiets.length ? Math.round(allDiets.reduce((s, r) => s + (r.calories || 0), 0) / allDiets.length) : 0;
  const totalToLose = config.profile.startWeight - config.profile.targetWeight;
  const lost = Math.max(0, config.profile.startWeight - m.weight);
  const pct = totalToLose > 0 ? Math.round((lost / totalToLose) * 100) : 0;

  const quotes = [
    '对自己狠一点，结果不会骗人',
    '每一滴汗都是对过去的告别',
    '变好的过程都不太舒服',
    '你比想象中更强大',
    '坚持下去，剩下的交给时间',
    '今天的自律是明天的自由'
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  document.getElementById('posterContainer').innerHTML = `
    <div style="background:${t.bg};color:${t.text};border-radius:20px;padding:32px 24px;min-height:500px;text-align:center;font-family:sans-serif">
      <div style="font-size:48px;margin-bottom:16px">${m.achieved ? '🎉' : '🚩'}</div>
      <div style="font-size:28px;font-weight:700;margin-bottom:8px">${m.title}</div>
      <div style="font-size:14px;color:${t.accent};margin-bottom:24px">${m.date || '努力中...'}</div>

      <div style="background:${t.card};border-radius:16px;padding:20px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
          <span>${config.profile.startWeight}kg</span>
          <span>${m.weight}kg</span>
          <span>${config.profile.targetWeight}kg</span>
        </div>
        <div style="background:${t.text === '#1e293b' || t.text === '#431407' ? '#e2e8f0' : 'rgba(255,255,255,0.15)'};border-radius:8px;height:12px;overflow:hidden;margin-bottom:8px">
          <div style="background:${t.accent};height:100%;width:${pct}%;border-radius:8px;transition:width 0.5s"></div>
        </div>
        <div style="font-size:13px">完成 ${pct}%</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="background:${t.card};border-radius:12px;padding:12px">
          <div style="font-size:22px;font-weight:700">${totalExercise}</div>
          <div style="font-size:11px;opacity:0.7">累计运动/次</div>
        </div>
        <div style="background:${t.card};border-radius:12px;padding:12px">
          <div style="font-size:22px;font-weight:700">${avgCal}</div>
          <div style="font-size:11px;opacity:0.7">日均摄入/kcal</div>
        </div>
        <div style="background:${t.card};border-radius:12px;padding:12px">
          <div style="font-size:22px;font-weight:700">${daysBetween(config.startDate, today())}</div>
          <div style="font-size:11px;opacity:0.7">坚持/天</div>
        </div>
      </div>

      <div style="font-size:16px;font-weight:500;margin-bottom:8px">"${quote}"</div>
      <div style="font-size:12px;opacity:0.3">—— 减脂管家 记录 ——</div>
    </div>
  `;
}
