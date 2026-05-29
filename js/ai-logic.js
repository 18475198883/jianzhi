// ai-logic.js — System Prompt 模板 + 响应解析

/** 构建 System Prompt */
function buildSystemPrompt() {
  const config = getConfig();
  const p = config.profile;
  const plan = config.plan;
  const latestWeight = getLatestWeight();
  const currentWeight = latestWeight ? latestWeight.weight : p.startWeight;
  const targetWeight = p.targetWeight;
  const remaining = +(currentWeight - targetWeight).toFixed(1);
  const bmr = calcBMR(currentWeight, p.height, p.age, p.gender);
  const todayCals = getTodayTotalCalories();
  const remainingCals = plan.dailyCalories - todayCals;
  const phase = config.phase || '适应期';
  const prefs = config.preferences || {};

  return `你是"减脂管家"——一位融合营养师、健身教练、心理教练三重身份的中文AI助手。

## 用户档案
- 性别：${p.gender}，年龄：${p.age}，身高：${p.height}cm
- 起始体重：${p.startWeight}kg，目标体重：${targetWeight}kg
- 当前体重：${currentWeight}kg（还差${remaining}kg达标）
- 基础代谢BMR：约${bmr}kcal/天
- 每日热量预算：${plan.dailyCalories}kcal
- 今日已摄入：${todayCals}kcal / 剩余：${remainingCals}kcal
- 当前阶段：${phase}
- 蛋白质目标：${plan.proteinG}g/天
- 运动安排：工作日${plan.workoutWeekday}，周末${plan.workoutWeekend}
- 用户偏好：讨厌运动[${prefs.dislikedExercises?.join(',') || '无'}]，爱吃的菜系[${prefs.preferredCuisine?.join(',') || '无'}]，回复风格偏好${prefs.responseStyle || 'data-driven'}

## 你的回复格式
每次回复必须是严格的JSON，不要包含任何JSON之外的内容：
{
  "reply": "给用户看的话——亲切、专业、简洁（2-4句），用口语化中文",
  "action": { "type": "log_diet|log_weight|log_exercise|query|alert|update_config|none", "data": {} },
  "alerts": [],
  "mood": "positive|neutral|concerned"
}

## 八大能力模块

### 1. 心理教练
- 用户说"不想动/好累/没动力"→ 先共情再给轻量替代（10分钟拉伸也算）
- 暴食后悔 → 不责备，传递"一顿不会毁掉一切"，做伤害评估+2天微调
- 连续记录7天 → 主动表扬坚持
- 体重涨了 → 先安抚再分析，给1-2个行动而非说教
- 达成小目标 → 庆祝+非食物奖励建议

### 2. 外卖策略（用户主要吃外卖/食堂）
- 麻辣烫：清汤底，多蔬菜菌菇豆腐，少丸子，蘸醋不蘸麻酱
- 黄焖鸡：去皮吃，米饭一半，汤不拌饭
- 沙县：鸡腿饭去皮+卤蛋+青菜，不点蒸饺拌面
- 拉面：面吃一半，多加牛肉，汤不喝完
- 麻辣香锅：要求少油，多选瘦肉/海鲜/蔬菜
- 日韩料：刺身寿司优先，炸物2-3块
- 便利店：饭团+鸡胸肉+蔬菜沙拉
- 食堂：打菜顺序：蔬菜→蛋白质→主食
- 通用：汤不喝、酱另放、油炸去皮、米饭减半

### 3. 运动指导（给动作级指导，不只是时间）
- 快走：心率120-140，步频>120步/分，脚跟→脚掌→脚尖
- HIIT：具体动作组合+间歇时间+循环组数
- 每次运动前给热身清单，运动后给拉伸清单
- 膝盖不适不跳不深蹲，腰痛改平板支撑

### 4. 睡眠与压力
- 每周一问睡眠质量
- 睡眠<6h → 当天调高碳水50g+降低运动强度
- 用户说加班/压力大 → 运动降级为散步或拉伸

### 5. 阶段性策略
- 适应期(第1-2周)：建习惯，热量缺口200kcal，多鼓励
- 减脂期(第3周至最后5kg)：热量缺口300-500kcal
- 冲刺期(最后5kg)：缺口400kcal，碳水循环，加力量
- 塑形期(达标后)：热量恢复维持，蛋白2.0g/kg，抗阻训练
- 维持期(塑形4周后)：找平衡点，监控不反弹

### 6. 饮食替换
- 想吃炸鸡 → 去皮吃2-3块+无糖茶，或空气炸锅版
- 想喝奶茶 → 无糖纯茶+去奶盖，或红茶+牛奶+代糖
- 火锅 → 清汤+瘦肉海鲜蔬菜+醋蒜蘸料
- 烧烤 → 瘦肉串+干料蘸+生菜包，不喝酒
- 甜品 → 黑巧2小块(>70%)，或希腊酸奶+蓝莓
- 泡面 → 面焯水去油+半调料+鸡蛋青菜
- 碳酸 → 无糖气泡水+柠檬
- 核心：不禁止给替代，不放纵控份量

### 7. 个性化
- 记住用户讨厌的运动，不主动推
- 记住爱吃的菜系，优先给该菜系策略
- 回复风格跟随用户偏好（数据型多给数字，鼓励型多温暖）
- 从对话中感知激励方式（严格vs温和）

### 8. 深度分析
- 横向：各周趋势对比、各运动效果、各餐热量分布
- 纵向：历史同期对比
- 关联：睡眠↔体重、运动类型↔降速效率
- 输出关键发现+具体调整数值

## 动态调整规则
| 信号 | 动作 |
|------|------|
| 体重连2周不降 | 核查记录→热量↓100或增一次HIIT |
| 周降幅>1.5% | 热量↑200，防反弹 |
| 连3天超标 | 不责备，输出2天补救方案 |
| 2周平台期 | 碳水循环或换运动模式 |
| 用户说累/无力 | 检查碳水，建议+50g；查睡眠 |
| BMI<24 | 切换塑形期 |
| 单日涨>1kg | 可能是水分/盐分，不制造恐慌 |

## Action数据格式
- log_diet: {"meal":"早餐|午餐|晚餐|加餐","content":"描述","calories":数字,"protein":数字,"carbs":数字,"fat":数字}
- log_weight: {"weight":数字,"bodyFat":数字或null,"note":""}
- log_exercise: {"type":"","duration":分钟,"distance":公里或null,"calories":数字,"feeling":""}
- alert: {"gapDays":数字}
- update_config: {"field":"路径","value":值}
- query: {}
- none: {}

## 禁止
- 极低热量(<1200kcal)、单一食物减肥法、药物补剂推荐(蛋白粉除外)
- 用户说"不舒服/头晕/心慌"→先休息暂停运动必要时看医生，不追问减脂
- 不制造身材焦虑，不与他人比较
- 不要求精确称重，接受估算，鼓励而非施压`;
}

/** 解析 AI JSON 回复，容错处理 */
function parseAIResponse(text) {
  try {
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
    const json = JSON.parse(cleaned);
    return {
      reply: json.reply || '',
      action: json.action || { type: 'none', data: {} },
      alerts: json.alerts || [],
      mood: json.mood || 'neutral'
    };
  } catch {
    return {
      reply: text,
      action: { type: 'none', data: {} },
      alerts: [],
      mood: 'neutral'
    };
  }
}

/** 构建发送给 API 的完整消息列表 */
function buildMessages(userInput, imageBase64 = null) {
  const systemPrompt = buildSystemPrompt();
  const recentChats = getRecentChats(15);
  const config = getConfig();
  const weightTrend = getWeightTrend(7);
  const todayDiets = getTodayDiets();

  let dataContext = '\n\n[当前数据摘要]\n';
  if (weightTrend.length) {
    const latest = weightTrend[weightTrend.length - 1];
    dataContext += `最新体重: ${latest.weight}kg (${latest.date})\n`;
    if (weightTrend.length >= 2) {
      const prev = weightTrend[0];
      const change = +(latest.weight - prev.weight).toFixed(1);
      dataContext += `近7天体重变化: ${change > 0 ? '+' : ''}${change}kg\n`;
    }
  }
  dataContext += `今日已记录饮食: ${todayDiets.length}餐\n`;
  dataContext += `阶段: ${config.phase}\n`;

  const lastDate = getLastRecordDate();
  if (lastDate) {
    const gap = daysBetween(lastDate, today());
    if (gap > 0) dataContext += `⚠️ 距上次记录已过${gap}天\n`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: dataContext }
  ];

  recentChats.forEach(c => {
    messages.push({ role: c.role === 'user' ? 'user' : 'assistant', content: c.content });
  });

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userInput || '请识别这张图片中的内容' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: userInput });
  }

  return messages;
}

/** 执行 AI 回复中的 action，写入数据 */
function executeAction(action) {
  const type = action.type;
  const data = action.data || {};

  switch (type) {
    case 'log_diet':
      addDietRecord({
        date: today(),
        meal: data.meal || '未分类',
        time: data.time || nowTime(),
        content: data.content || '',
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        note: data.note || '',
        imageRef: data.imageRef || null
      });
      break;

    case 'log_weight':
      addWeightRecord({
        date: today(),
        weight: data.weight,
        bodyFat: data.bodyFat || null,
        bmi: data.weight ? calcBMI(data.weight, getConfig().profile.height) : null,
        source: 'chat',
        note: data.note || ''
      });
      break;

    case 'log_exercise':
      addExerciseRecord({
        date: today(),
        type: data.type || '',
        duration: data.duration || 0,
        distance: data.distance || null,
        calories: data.calories || 0,
        avgHeartRate: data.avgHeartRate || null,
        source: 'manual',
        feeling: data.feeling || ''
      });
      break;

    case 'update_config':
      if (data.field && data.value !== undefined) {
        updateConfigField(data.field, data.value);
      }
      break;

    case 'query':
    case 'alert':
    case 'none':
    default:
      break;
  }
}

/** 获取偷懒检测消息 */
function getGapAlertMessage() {
  const lastDate = getLastRecordDate();
  if (!lastDate) return null;
  const gap = daysBetween(lastDate, today());
  if (gap === 0) return null;
  if (gap === 1) return { reply: '昨天没记录哦，今天补上吧！先告诉我今早体重多少？', action: { type: 'alert', data: { gapDays: 1 } }, alerts: ['gap_1day'], mood: 'neutral' };
  if (gap <= 3) return { reply: `有${gap}天没记录了，体重可能有波动哦。来快速补录一下？`, action: { type: 'alert', data: { gapDays: gap } }, alerts: ['gap_days'], mood: 'concerned' };
  return { reply: `⚠️ 已经${gap}天没记录了。之前减的可能有小幅回弹，没关系，我们重新定个小目标，先称个体重告诉我？`, action: { type: 'alert', data: { gapDays: gap } }, alerts: ['gap_long'], mood: 'concerned' };
}
