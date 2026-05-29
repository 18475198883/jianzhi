// storage.js — localStorage 数据层，六张表 CRUD

const STORAGE_KEYS = {
  weight: 'jz_weight_records',
  diet: 'jz_diet_records',
  exercise: 'jz_exercise_records',
  config: 'jz_user_config',
  chat: 'jz_chat_history',
  reports: 'jz_weekly_reports'
};

const MAX_CHAT_HISTORY = 200;

/* === 通用读写 === */

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; }
  catch { return null; }
}

function write(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch (e) { console.error('localStorage write failed:', e); return false; }
}

/* === 体重体脂 === */

function getWeightRecords() { return read(STORAGE_KEYS.weight) || []; }

function addWeightRecord(record) {
  const records = getWeightRecords();
  const idx = records.findIndex(r => r.date === record.date);
  if (idx >= 0) records[idx] = { ...records[idx], ...record };
  else records.push(record);
  records.sort((a, b) => a.date.localeCompare(b.date));
  write(STORAGE_KEYS.weight, records);
  checkAchievements();
  return record;
}

function getLatestWeight() {
  const records = getWeightRecords();
  return records.length ? records[records.length - 1] : null;
}

function getWeightByDate(date) {
  return getWeightRecords().find(r => r.date === date) || null;
}

function getWeightTrend(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return getWeightRecords().filter(r => r.date >= formatLocalDate(cutoff));
}

/* === 饮食记录 === */

function getDietRecords() { return read(STORAGE_KEYS.diet) || []; }

function addDietRecord(record) {
  const records = getDietRecords();
  records.push(record);
  write(STORAGE_KEYS.diet, records);
  checkAchievements();
  return record;
}

function getTodayDiets() {
  const t = today();
  return getDietRecords().filter(r => r.date === t);
}

function getTodayTotalCalories() {
  return getTodayDiets().reduce((sum, r) => sum + (r.calories || 0), 0);
}

function getYesterdayDiets() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const y = formatLocalDate(d);
  return getDietRecords().filter(r => r.date === y);
}

function getDietByDateRange(start, end) {
  return getDietRecords().filter(r => r.date >= start && r.date <= end);
}

/* === 运动记录 === */

function getExerciseRecords() { return read(STORAGE_KEYS.exercise) || []; }

function addExerciseRecord(record) {
  const records = getExerciseRecords();
  records.push(record);
  write(STORAGE_KEYS.exercise, records);
  checkAchievements();
  return record;
}

function getTodayExercises() {
  const t = today();
  return getExerciseRecords().filter(r => r.date === t);
}

function getExerciseByDateRange(start, end) {
  return getExerciseRecords().filter(r => r.date >= start && r.date <= end);
}

function getExerciseStreak() {
  const records = getExerciseRecords();
  if (!records.length) return 0;
  const dates = [...new Set(records.map(r => r.date))].sort().reverse();
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(); expected.setDate(expected.getDate() - i);
    if (dates[i] === formatLocalDate(expected)) streak++;
    else break;
  }
  return streak;
}

/* === 用户配置 === */

function getDefaultConfig() {
  return {
    profile: { gender: '男', age: 30, height: 165, startWeight: 70, targetWeight: 55 },
    plan: { dailyCalories: 1600, proteinG: 110, workoutWeekday: '40-60min', workoutWeekend: '90min+' },
    privacy: { hideWeight: true, hideBodyFat: true, hideCalories: true, showTimeframe: true, showAchievements: true, showExercise: true, watermark: '减脂管家记录' },
    reminder: { maxGapDays: 3 },
    achievements: [],
    phase: '适应期',
    startDate: today(),
    deepseekKey: '',
    preferences: { dislikedExercises: [], preferredCuisine: [], responseStyle: 'data-driven', nickname: '', motivationStyle: 'gentle' }
  };
}

function getConfig() { return read(STORAGE_KEYS.config) || getDefaultConfig(); }

function saveConfig(config) {
  const existing = getConfig();
  const merged = { ...existing, ...config };
  if (!write(STORAGE_KEYS.config, merged)) {
    console.error('保存配置失败：localStorage写入错误');
    return false;
  }
  // 验证写入
  const verify = read(STORAGE_KEYS.config);
  if (!verify || !verify.deepseekKey) {
    console.error('保存配置失败：写入验证不通过，回退重试');
    write(STORAGE_KEYS.config, merged);
  }
  return true;
}

function updateConfigField(path, value) {
  const config = getConfig();
  const keys = path.split('.');
  let obj = config;
  for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
  obj[keys[keys.length - 1]] = value;
  write(STORAGE_KEYS.config, config);
}

function getDailyCalorieBudget() {
  const config = getConfig();
  return config.plan.dailyCalories || 1600;
}

function getTodayRemainingCalories() {
  return getDailyCalorieBudget() - getTodayTotalCalories();
}

function getLastRecordDate() {
  const diet = getDietRecords();
  const exercise = getExerciseRecords();
  const weight = getWeightRecords();
  const allDates = [
    ...diet.map(r => r.date),
    ...exercise.map(r => r.date),
    ...weight.map(r => r.date)
  ];
  if (!allDates.length) return null;
  return allDates.sort().reverse()[0];
}

function isFirstVisit() {
  const config = getConfig();
  return !config.deepseekKey;
}

function dataExport() {
  return {
    weight_records: getWeightRecords(),
    diet_records: getDietRecords(),
    exercise_records: getExerciseRecords(),
    user_config: getConfig(),
    weekly_reports: read(STORAGE_KEYS.reports) || [],
    exportedAt: new Date().toISOString()
  };
}

function dataImport(json) {
  if (json.weight_records) write(STORAGE_KEYS.weight, json.weight_records);
  if (json.diet_records) write(STORAGE_KEYS.diet, json.diet_records);
  if (json.exercise_records) write(STORAGE_KEYS.exercise, json.exercise_records);
  if (json.user_config) saveConfig(json.user_config);
  if (json.weekly_reports) write(STORAGE_KEYS.reports, json.weekly_reports);
  return true;
}

function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}

/* === 聊天记录 === */

function getChatHistory() { return read(STORAGE_KEYS.chat) || []; }

function addChatMessage(role, content) {
  const history = getChatHistory();
  history.push({ timestamp: new Date().toISOString(), role, content });
  if (history.length > MAX_CHAT_HISTORY) history.splice(0, history.length - MAX_CHAT_HISTORY);
  write(STORAGE_KEYS.chat, history);
}

function getRecentChats(n = 15) {
  return getChatHistory().slice(-n);
}

/* === 周报 === */

function getWeeklyReports() { return read(STORAGE_KEYS.reports) || []; }

function saveWeeklyReport(report) {
  const reports = getWeeklyReports();
  const idx = reports.findIndex(r => r.week === report.week);
  if (idx >= 0) reports[idx] = report;
  else reports.push(report);
  write(STORAGE_KEYS.reports, reports);
}

/* === 成就检测 === */

function checkAchievements() {
  const config = getConfig();
  const earned = config.achievements || [];
  const weight = getWeightRecords();
  const totalLoss = weight.length ? Math.max(0, weight[0].weight - weight[weight.length - 1].weight) : 0;
  const streak = getExerciseStreak();
  const exerciseCount = getExerciseRecords().length;

  const newAchievements = [];

  if (totalLoss >= 3 && !earned.includes('first-3kg')) newAchievements.push('first-3kg');
  if (totalLoss >= 6 && !earned.includes('first-6kg')) newAchievements.push('first-6kg');
  if (totalLoss >= 9 && !earned.includes('first-9kg')) newAchievements.push('first-9kg');
  if (totalLoss >= 12 && !earned.includes('first-12kg')) newAchievements.push('first-12kg');
  if (totalLoss >= 15 && !earned.includes('goal-reached')) newAchievements.push('goal-reached');
  if (streak >= 7 && !earned.includes('streak-7')) newAchievements.push('streak-7');
  if (streak >= 14 && !earned.includes('streak-14')) newAchievements.push('streak-14');
  if (streak >= 30 && !earned.includes('streak-30')) newAchievements.push('streak-30');
  if (exerciseCount >= 10 && !earned.includes('exercise-10')) newAchievements.push('exercise-10');
  if (exerciseCount >= 50 && !earned.includes('exercise-50')) newAchievements.push('exercise-50');

  if (newAchievements.length) {
    config.achievements = [...earned, ...newAchievements];
    write(STORAGE_KEYS.config, config);
  }
  return newAchievements;
}

function getAchievementInfo(id) {
  const map = {
    'first-3kg': { icon: '🥇', name: '首减3公斤', desc: '累计减重达到3kg' },
    'first-6kg': { icon: '🥈', name: '半年之约', desc: '累计减重达到6kg' },
    'first-9kg': { icon: '🥉', name: '突破自我', desc: '累计减重达到9kg' },
    'first-12kg': { icon: '🏆', name: '脱胎换骨', desc: '累计减重达到12kg' },
    'goal-reached': { icon: '👑', name: '目标达成', desc: '成功减至目标体重！' },
    'streak-7': { icon: '🔥', name: '连打卡7天', desc: '连续7天运动记录' },
    'streak-14': { icon: '💪', name: '连打卡14天', desc: '连续14天运动记录' },
    'streak-30': { icon: '⚡', name: '连打卡30天', desc: '连续30天运动记录' },
    'exercise-10': { icon: '🏃', name: '运动10次', desc: '累计完成10次运动' },
    'exercise-50': { icon: '🚀', name: '运动50次', desc: '累计完成50次运动' }
  };
  return map[id] || null;
}
