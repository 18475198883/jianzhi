// utils.js — 公共工具函数

/** 获取本地日期字符串 YYYY-MM-DD（避免 UTC 时区偏移） */
function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 获取今天日期字符串 YYYY-MM-DD（本地时间） */
function today() {
  return formatLocalDate(new Date());
}

/** 获取当前时间 HH:MM */
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

/** 获取 ISO 周号，如 2026-W22 */
function getWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** 计算两个日期相差天数 */
function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

/** 获取最近 N 天的日期列表 */
function lastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}

/** 计算 BMI */
function calcBMI(weight, height) {
  const h = height / 100;
  return +(weight / (h * h)).toFixed(1);
}

/** 计算 BMR (Mifflin-St Jeor) */
function calcBMR(weight, height, age, gender) {
  if (gender === '男') return +(10 * weight + 6.25 * height - 5 * age + 5).toFixed(0);
  return +(10 * weight + 6.25 * height - 5 * age - 161).toFixed(0);
}

/** 估算每日总消耗 TDEE */
function calcTDEE(bmr, activityLevel) {
  const factors = { 'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725 };
  return Math.round(bmr * (factors[activityLevel] || 1.2));
}

/** 格式化千卡 */
function fmtKcal(n) { return n != null ? `${Math.round(n)} kcal` : '—'; }

/** 格式化公斤 */
function fmtKg(n) { return n != null ? `${n.toFixed(1)}kg` : '—'; }

/** 克隆对象（简单深拷贝） */
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

/** 防抖 */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** 日期转友好显示 */
function friendlyDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 食物热量估算表（离线降级用） */
const FOOD_CALORIE_MAP = {
  '米饭': { per: '100g', kcal: 116 },
  '馒头': { per: '1个', kcal: 220 },
  '面条': { per: '100g', kcal: 110 },
  '鸡胸肉': { per: '100g', kcal: 133 },
  '鸡腿': { per: '1个', kcal: 180 },
  '鸡蛋': { per: '1个', kcal: 70 },
  '牛肉': { per: '100g', kcal: 125 },
  '猪肉': { per: '100g', kcal: 395 },
  '鱼': { per: '100g', kcal: 120 },
  '虾': { per: '100g', kcal: 90 },
  '豆腐': { per: '100g', kcal: 80 },
  '青菜': { per: '100g', kcal: 20 },
  '西兰花': { per: '100g', kcal: 34 },
  '番茄': { per: '1个', kcal: 20 },
  '黄瓜': { per: '1根', kcal: 15 },
  '苹果': { per: '1个', kcal: 85 },
  '香蕉': { per: '1根', kcal: 105 },
  '牛奶': { per: '250ml', kcal: 135 },
  '酸奶': { per: '200ml', kcal: 140 },
  '咖啡': { per: '1杯', kcal: 5 },
  '奶茶': { per: '1杯', kcal: 350 },
  '可乐': { per: '330ml', kcal: 140 },
  '炸鸡': { per: '1块', kcal: 250 },
  '薯条': { per: '100g', kcal: 310 },
  '麻辣烫': { per: '1碗', kcal: 500 },
  '黄焖鸡': { per: '1份', kcal: 600 },
  '沙拉': { per: '1份', kcal: 150 },
};
