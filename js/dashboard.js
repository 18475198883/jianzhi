// dashboard.js — 仪表盘图表渲染

let weightChartInst, calorieChartInst, exerciseChartInst;
let isPrivacyMode = false;

document.addEventListener('DOMContentLoaded', initDashboard);
window.addEventListener('resize', debounce(() => {
  weightChartInst?.resize();
  calorieChartInst?.resize();
  exerciseChartInst?.resize();
}, 200));

function initDashboard() {
  updateStats();
  renderWeightChart();
  renderCalorieChart();
  renderExerciseCalendar();
  renderAchievements();
  renderWeeklySummary();
  updateProgress();

  const config = getConfig();
  document.getElementById('dashSubtitle').textContent =
    `${config.profile.startWeight}kg → ${config.profile.targetWeight}kg · 已坚持${daysBetween(config.startDate, today())}天`;
}

function updateProgress() {
  const config = getConfig();
  const latest = getLatestWeight();
  const current = latest ? latest.weight : config.profile.startWeight;
  const total = config.profile.startWeight - config.profile.targetWeight;
  const lost = Math.max(0, config.profile.startWeight - current);
  const pct = total > 0 ? Math.min(100, Math.round((lost / total) * 100)) : 0;
  document.getElementById('progressPercent').textContent = pct + '%';
  document.getElementById('progressDetail').textContent =
    `${config.profile.startWeight}kg → ${current.toFixed(1)}kg → ${config.profile.targetWeight}kg`;
}

function updateStats() {
  const weightRecords = getWeightRecords();
  const exerciseRecords = getExerciseRecords();
  const dietRecords = getDietRecords();

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const thisWeek = exerciseRecords.filter(r => r.date >= formatLocalDate(weekStart));
  document.getElementById('statExercise').textContent = `${thisWeek.length}次`;

  const last7 = lastNDates(7);
  const recentDiets = dietRecords.filter(r => r.date >= last7[0]);
  const avgCals = recentDiets.length ? Math.round(recentDiets.reduce((s, r) => s + (r.calories || 0), 0) / 7) : 0;
  document.getElementById('statCalories').textContent = averageCalDisplay(avgCals);

  document.getElementById('statStreak').textContent = getExerciseStreak() + '天';

  const totalLoss = weightRecords.length >= 2 ? +(weightRecords[0].weight - weightRecords[weightRecords.length - 1].weight).toFixed(1) : 0;
  document.getElementById('statTotalLoss').textContent = totalLoss > 0 ? `↓${totalLoss}kg` : '0kg';
}

function averageCalDisplay(avgCals) {
  if (isPrivacyMode || !avgCals) return '—';
  return `${avgCals}`;
}

/* === 体重趋势图 === */
function renderWeightChart() {
  const container = document.getElementById('weightChart');
  if (weightChartInst) weightChartInst.dispose();
  weightChartInst = echarts.init(container);

  const records = getWeightTrend(60);
  if (!records.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary)">暂无体重数据<br><small>去聊天页录入吧</small></div>';
    return;
  }

  const dates = records.map(r => r.date.slice(5));
  const weights = records.map(r => r.weight);
  const config = getConfig();
  const targetLine = Array(records.length).fill(config.profile.targetWeight);

  weightChartInst.setOption({
    grid: { left: isPrivacyMode ? 16 : 50, right: 16, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10, rotate: 45 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: {
      type: 'value', name: isPrivacyMode ? '' : 'kg', axisLabel: { fontSize: 11, formatter: isPrivacyMode ? '' : '{value}' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }, min: 'dataMin', max: 'dataMax'
    },
    series: [
      {
        name: '体重', type: 'line', data: weights, smooth: true,
        lineStyle: { color: '#22c55e', width: 2 }, itemStyle: { color: '#22c55e' },
        symbol: 'circle', symbolSize: 4,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(34,197,94,0.2)' }, { offset: 1, color: 'rgba(34,197,94,0)' }]) }
      },
      {
        name: '目标', type: 'line', data: targetLine,
        lineStyle: { color: '#94a3b8', type: 'dashed', width: 1.5 }, symbol: 'none',
        label: { show: true, position: 'end', formatter: '目标', fontSize: 10, color: '#94a3b8' }
      }
    ],
    tooltip: { trigger: 'axis', formatter: p => isPrivacyMode ? '趋势' : `${p[0].axisValue}<br/>${p[0].value}kg` }
  });
}

/* === 热量柱状图 === */
function renderCalorieChart() {
  const container = document.getElementById('calorieChart');
  if (calorieChartInst) calorieChartInst.dispose();
  calorieChartInst = echarts.init(container);

  const last14 = lastNDates(14);
  const dietRecords = getDietRecords();
  const exerciseRecords = getExerciseRecords();

  const intakeByDay = last14.map(d => dietRecords.filter(r => r.date === d).reduce((s, r) => s + (r.calories || 0), 0));
  const burnByDay = last14.map(d => exerciseRecords.filter(r => r.date === d).reduce((s, r) => s + (r.calories || 0), 0));

  calorieChartInst.setOption({
    grid: { left: isPrivacyMode ? 16 : 50, right: 16, top: 16, bottom: 30 },
    xAxis: { type: 'category', data: last14.map(d => d.slice(5)), axisLabel: { fontSize: 10, rotate: 45 } },
    yAxis: { type: 'value', name: isPrivacyMode ? '' : 'kcal', axisLabel: { fontSize: 11, formatter: isPrivacyMode ? '' : '{value}' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      { name: '摄入', type: 'bar', data: intakeByDay, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }, barGap: '10%' },
      { name: '运动消耗', type: 'bar', data: burnByDay, itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] } }
    ],
    tooltip: { trigger: 'axis' }
  });
}

/* === 运动日历热力图 === */
function renderExerciseCalendar() {
  const container = document.getElementById('exerciseCalendar');
  if (exerciseChartInst) exerciseChartInst.dispose();
  exerciseChartInst = echarts.init(container);

  const last90 = lastNDates(90);
  const exerciseRecords = getExerciseRecords();
  const data = last90.map(d => {
    const hasExercise = exerciseRecords.some(r => r.date === d);
    return [d, hasExercise ? 1 : 0];
  });

  exerciseChartInst.setOption({
    grid: { left: 30, right: 16, top: 20, bottom: 10 },
    tooltip: { formatter: p => `${p.value[0]}: ${p.value[1] ? '已运动' : '未运动'}` },
    visualMap: { min: 0, max: 1, show: false, inRange: { color: ['#f1f5f9', '#22c55e'] } },
    calendar: {
      range: last90[0],
      cellSize: [14, 14],
      splitLine: { lineStyle: { color: '#fff' } },
      itemStyle: { borderRadius: 2 },
      dayLabel: { fontSize: 10 }, monthLabel: { fontSize: 10 }
    },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }]
  });
}

/* === 成就墙 === */
function renderAchievements() {
  const config = getConfig();
  const earned = config.achievements || [];
  const allIds = ['first-3kg', 'first-6kg', 'first-9kg', 'first-12kg', 'goal-reached', 'streak-7', 'streak-14', 'streak-30', 'exercise-10', 'exercise-50'];
  const wall = document.getElementById('achievementWall');

  wall.innerHTML = allIds.map(id => {
    const info = getAchievementInfo(id);
    if (!info) return '';
    return `<span class="badge${earned.includes(id) ? '' : ' locked'}">${info.icon} ${info.name}</span>`;
  }).join('');
}

/* === 周总结 === */
function renderWeeklySummary() {
  const records = getWeightRecords();
  const exerciseRecords = getExerciseRecords();
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const startStr = formatLocalDate(weekStart);
  const endStr = today();
  const thisWeekExercise = exerciseRecords.filter(r => r.date >= startStr && r.date <= endStr);
  const dietRecords = getDietRecords();
  const thisWeekDiet = dietRecords.filter(r => r.date >= startStr && r.date <= endStr);
  const uniqueDietDays = [...new Set(thisWeekDiet.map(r => r.date))].length || 1;
  const avgCals = thisWeekDiet.length ? Math.round(thisWeekDiet.reduce((s, r) => s + (r.calories || 0), 0) / uniqueDietDays) : 0;

  let summary = '';
  if (records.length >= 2) {
    const weekRecords = records.filter(r => r.date >= startStr);
    if (weekRecords.length >= 2) {
      const change = +(weekRecords[weekRecords.length - 1].weight - weekRecords[0].weight).toFixed(1);
      summary += `本周体重${change > 0 ? '↑' : '↓'}${Math.abs(change)}kg。`;
    }
  }
  summary += `运动${thisWeekExercise.length}次，日均摄入约${avgCals}kcal。`;
  summary += '继续保持记录习惯，数据越多分析越准！';

  document.getElementById('weeklySummary').textContent = summary;
}

/* === 隐私模式 === */
function togglePrivacy() {
  isPrivacyMode = !isPrivacyMode;
  document.body.classList.toggle('privacy-mode', isPrivacyMode);
  document.getElementById('privacyToggle').textContent = isPrivacyMode ? '🔒 隐私开' : '👁 隐私';
  document.getElementById('watermarkEl').textContent = isPrivacyMode ? (getConfig().privacy.watermark || '') : '';
  renderWeightChart();
  renderCalorieChart();
  updateStats();
}

function openPrivacySettings() {
  const config = getConfig();
  const p = config.privacy;
  const optionDefs = [
    { key: 'hideWeight', label: '隐藏体重数字' },
    { key: 'hideBodyFat', label: '隐藏体脂率' },
    { key: 'hideCalories', label: '隐藏热量数值' },
    { key: 'showTimeframe', label: '显示时间段' },
    { key: 'showAchievements', label: '显示成就徽章' },
    { key: 'showExercise', label: '显示运动项目' }
  ];
  const watermarkVal = p.watermark || '';

  document.getElementById('privacyOptions').innerHTML = optionDefs.map(o =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0"><span style="font-size:14px">${o.label}</span><label class="toggle"><input type="checkbox" id="priv_${o.key}" ${p[o.key] ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`
  ).join('') + `<div style="margin-top:8px"><label style="font-size:13px">水印文字</label><input class="input" id="priv_watermark" value="${watermarkVal}" style="margin-top:4px"></div>`;

  document.getElementById('privacyModal').classList.add('active');
}

function savePrivacySettings() {
  const config = getConfig();
  const p = config.privacy;
  ['hideWeight', 'hideBodyFat', 'hideCalories', 'showTimeframe', 'showAchievements', 'showExercise'].forEach(k => {
    const el = document.getElementById('priv_' + k);
    if (el) p[k] = el.checked;
  });
  const wmEl = document.getElementById('priv_watermark');
  if (wmEl) p.watermark = wmEl.value;
  saveConfig({ privacy: p });
  document.getElementById('privacyModal').classList.remove('active');
  document.getElementById('watermarkEl').textContent = isPrivacyMode ? p.watermark : '';
}

/* === 导出 === */
function exportDataFile() {
  const json = dataExport();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `减脂数据_${today()}.json`; a.click();
  URL.revokeObjectURL(url);
}

/* === 手动体重记录 === */
function openWeightRecordForm() {
  document.getElementById('weightRecordDate').value = today();
  document.getElementById('weightRecordValue').value = '';
  document.getElementById('weightRecordModal').classList.add('active');
}

function closeWeightRecordForm() {
  document.getElementById('weightRecordModal').classList.remove('active');
}

function saveWeightRecord() {
  const date = document.getElementById('weightRecordDate').value;
  const weight = +document.getElementById('weightRecordValue').value;
  if (!date || !weight) { alert('请填写日期和体重'); return; }
  const config = getConfig();
  addWeightRecord({
    date, weight,
    bodyFat: null,
    bmi: calcBMI(weight, config.profile.height),
    source: 'manual',
    note: '手动补充'
  });
  closeWeightRecordForm();
  updateStats();
  renderWeightChart();
  updateProgress();
}
