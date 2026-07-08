/**
 * 轻量拼音首字母工具
 * 预设分类的拼音首字母映射 (避免引入完整的拼音库)
 */

const PINYIN_INITIAL_MAP: Record<string, string> = {
  // 支出二级分类
  '三餐正餐': 'sczc',
  '外卖外带': 'wmwd',
  '小吃零食': 'xcls',
  '奶茶咖啡': 'nckf',
  '水果饮品': 'sgyp',
  '生鲜买菜': 'sxmc',
  '聚餐宴请': 'jcyq',
  '公交地铁': 'gjdt',
  '出租车': 'czc',
  '网约车': 'wyc',
  '加油充电': 'jycd',
  '停车费': 'tcf',
  '共享单车': 'gxdc',
  '火车飞机': 'hcfj',
  '长途客运': 'ctky',
  '房租': 'fz',
  '房贷': 'fd',
  '水费': 'sf',
  '电费': 'df',
  '燃气费': 'rqf',
  '物业费': 'wyf',
  '网费话费': 'wfhf',
  '维修装修': 'wxzx',
  '家居家纺': 'jjjf',
  '日常杂货': 'rczh',
  '服饰鞋包': 'fsxb',
  '数码电子': 'smdz',
  '美妆护肤': 'mzhf',
  '个护清洁': 'ghqj',
  '文体办公': 'wtbg',
  '烟酒茶叶': 'yjcy',
  '宠物用品': 'cwyp',
  '电影演出': 'dyyc',
  '游戏充值': 'yxcz',
  '视频会员': 'sphy',
  '运动健身': 'ydjs',
  '旅游度假': 'lydj',
  'KTV酒吧': 'ktvjb',
  '书籍杂志': 'sjzz',
  '景点门票': 'jdmp',
  '摄影冲印': 'sycy',
  '门诊挂号': 'mzgh',
  '药品费': 'ypf',
  '住院医疗': 'zyyl',
  '体检保健': 'tjbj',
  '牙科眼科': 'ykyk',
  '健身补剂': 'jsbj',
  '学费培训': 'xfpx',
  '书籍教材': 'sjjc',
  '考试报名': 'ksbm',
  '知识付费': 'zsff',
  '文具用品': 'wjyp',
  '少儿教育': 'sejy',
  '红包礼金': 'hblj',
  '孝敬长辈': 'xjzb',
  '礼品赠送': 'lpzs',
  '慈善捐款': 'csjk',
  '聚会聚餐': 'jhjc',
  '婚丧嫁娶': 'hsjq',
  '信用卡还款': 'xykhk',
  '贷款还款': 'dkhk',
  '保险保费': 'bxbf',
  '投资亏损': 'tzks',
  '手续费利息': 'sxflx',
  '税费': 'sf',
  '快递物流': 'kdwl',
  '证件办理': 'zjbl',
  '丢失赔偿': 'dspc',
  '其他杂项': 'qtzx',
  // 一级分类
  '餐饮饮食': 'cyys',
  '交通出行': 'jtcx',
  '住房居家': 'zfjj',
  '购物消费': 'gwxf',
  '娱乐休闲': 'ylxx',
  '医疗健康': 'yljk',
  '教育培训': 'jypx',
  '人情往来': 'rqwl',
  '金融理财': 'jrlc',
  '其他支出': 'qtzc',
  // 收入
  '职业收入': 'zysr',
  '被动收入': 'bdsr',
  '其他收入': 'qtsr',
  '工资薪水': 'gzxs',
  '奖金绩效': 'jjjx',
  '兼职外快': 'jzwk',
  '自由职业': 'zyzy',
  '理财收益': 'lcsy',
  '房租收入': 'fzsr',
  '股息分红': 'gxfh',
  '版权收入': 'bqsr',
  '红包收入': 'hbsr',
  '报销退款': 'bxtk',
  '二手出售': 'escs',
  '礼金收入': 'ljsr',
};

/**
 * 检查分类名是否匹配搜索词
 * 支持: 中文名包含搜索、拼音首字母匹配
 * 例: "nc" → "奶茶咖啡"
 */
export function matchesPinyinSearch(categoryName: string, query: string): boolean {
  if (!query.trim()) return true;

  const q = query.toLowerCase().trim();

  // 1. 中文名直接包含
  if (categoryName.includes(q)) return true;

  // 2. 拼音首字母匹配
  const initials = PINYIN_INITIAL_MAP[categoryName];
  if (initials && initials.includes(q)) return true;

  // 3. 每个字的首字母连起来匹配
  // 简单处理: 取查询每个字符，看是否都能在拼音中找到
  const queryChars = q.split('');
  let initIdx = 0;
  if (initials) {
    for (const ch of queryChars) {
      const pos = initials.indexOf(ch, initIdx);
      if (pos === -1) return false;
      initIdx = pos + 1;
    }
    return true;
  }

  return false;
}
