// ===== 猫小九历险记 - 游戏核心数据 =====
// 所有内容源自48页漫画与4集音频，以漫画画面为准

const GAME_DATA = {

  // ===== 角色名册 =====
  characters: {
    maoxiaojiu: {
      id: "maoxiaojiu",
      name: "猫小九",
      title: "主角",
      appearance: "金橘色蓬松刺猬短发，头顶金色猫耳（内侧粉色），金黄色/琥珀色竖瞳眼眸，身穿灰褐色交领短打修行服，束白色腰带，手腕与额头缠白色绷带，脚穿黑布鞋，颈戴黑色圆珠石珠吊坠。营养不良身形瘦小。",
      personality: "坚韧不拔，勤奋刻苦，内心温柔，被嘲笑时隐忍但不放弃，渴望变强见到爸爸。",
      cultivation: "不到一星武者 → 石珠打通经脉后能使用灵力",
      abilities: ["震风拳·风杀式", "灵力外放", "拳风"],
      items: ["神秘石珠吊坠", "绷带", "布鞋"],
      relations: {
        maobailing: "好友/青梅竹马，白灵鼓励保护小九",
        maomo: "敌对/霸凌者与被霸凌者，比武对手",
        mom: "母子，妈妈温柔支持",
        dad: "思念，爸爸失踪留下石珠"
      }
    },
    maomo: {
      id: "maomo",
      name: "猫墨",
      title: "天才少年/反派",
      appearance: "黑色凌乱短发，头顶黑色猫耳（内侧粉色带白纹），蓝色眼眸（暴怒时双眼发红光），身穿深蓝灰色中式对襟短褂，白色盘扣内衬，系腰带，深色长裤，白袜黑靴。嘴角邪笑露出虎牙。",
      personality: "骄傲自大，嫉妒心强，欺负弱者，喜欢白灵，被激怒后会失去冷静。",
      cultivation: "五星武者",
      abilities: ["震风拳", "震风拳一式", "震风拳二式", "震风拳三式", "震风拳四式", "风影残绝"],
      items: [],
      relations: {
        maoxiaojiu: "敌对，嫉妒小九与白灵亲近",
        maobailing: "暗恋，白灵拒绝他",
        followers: "猫乐乐、猫天天等跟班追随"
      }
    },
    maobailing: {
      id: "maobailing",
      name: "猫白灵",
      title: "天才少女",
      appearance: "银白色长直发，头顶白色猫耳（内侧粉色），青绿色眼眸，身穿蓝白配色衣裙，带黄色领结丝带与青色腰带，腕戴绿色手镯，气质温婉。",
      personality: "善良温柔，正直勇敢，不歧视弱者，公开鼓励保护猫小九，引用部落团结的道理反驳猫墨。",
      cultivation: "五星武者",
      abilities: [],
      items: ["绿色手镯"],
      relations: {
        maoxiaojiu: "好友，主动鼓励保护小九",
        maomo: "拒绝猫墨的亲近，公开与其对立"
      }
    },
    mom: {
      id: "mom",
      name: "猫小九妈妈",
      title: "母亲",
      appearance: "浅金色/金色长直发，头顶猫耳（内侧粉色），绿色眼眸，身穿浅绿配白色交领衣，绿色交领镶边，黄色腰带，气质温柔。",
      personality: "温柔慈爱，乐观坚强，在清贫中鼓励儿子，相信小九一定能做到。",
      cultivation: "不擅长修炼",
      abilities: [],
      items: ["红烧鱼"],
      relations: {
        maoxiaojiu: "母子情深"
      }
    },
    dad: {
      id: "dad",
      name: "猫小九爸爸",
      title: "前部落队长",
      appearance: "回忆中仅见金色长发猫耳的模糊轮廓与伸出的双手，面容不清。",
      personality: "（回忆中）温柔，在小九生日时赠送石珠吊坠并叮嘱珍惜。",
      cultivation: "实力很强，曾任部落队长",
      abilities: [],
      items: ["神秘石珠吊坠（赠予小九）"],
      relations: {
        maoxiaojiu: "父子，失踪/去了远方，留下石珠守护小九"
      }
    },
    elder: {
      id: "elder",
      name: "猫长老",
      title: "部落长老",
      appearance: "银灰色长发束低马尾，头顶猫耳，灰白长胡须与八字胡，蓝色眼眸，额头有皱纹，身穿深蓝色交领长袍配黑色镶边。",
      personality: "公正稳重，对晚辈修为满意，测试时以雷电灵气检测。",
      cultivation: "高深",
      abilities: ["雷电灵气测试"],
      items: [],
      relations: {}
    },
    madazhuang: {
      id: "madazhuang",
      name: "猫大壮",
      title: "学堂学生",
      appearance: "短深灰发，小个子猫耳少年。",
      personality: "",
      cultivation: "二星武者",
      abilities: [],
      items: [],
      relations: {}
    },
    maolele: {
      id: "maolele",
      name: "猫乐乐",
      title: "猫墨跟班",
      appearance: "灰棕色头发与猫耳，穿灰褐长袍/棕色外袍，胸前挂名牌。",
      personality: "追随猫墨，起哄嘲讽小九。",
      cultivation: "",
      abilities: [],
      items: [],
      relations: {
        maomo: "跟班"
      }
    },
    maotiantian: {
      id: "maotiantian",
      name: "猫天天",
      title: "猫墨跟班",
      appearance: "紫色头发与猫耳，穿灰蓝色衣，胸前挂名牌。",
      personality: "追随猫墨。",
      cultivation: "",
      abilities: [],
      items: [],
      relations: {
        maomo: "跟班"
      }
    }
  },

  // ===== 场景地点 =====
  locations: {
    forest: {
      id: "forest",
      name: "林间修炼地",
      description: "阳光斑驳、草木葱郁的林间空地，远处可见山峦，有大树与白色小雏菊，橙黑花纹蝴蝶飞舞。猫小九平日独自在此修炼。",
      comicPages: [3, 4],
      color: "#3a5f3a"
    },
    tribe_square: {
      id: "tribe_square",
      name: "部落测试广场",
      description: "部落议事/测试广场，木质格窗与木地板，台下聚集猫族族人。猫长老在此宣布弟子选拔测试并检测族人修为。",
      comicPages: [5, 6, 7, 8, 9, 10, 11, 12],
      color: "#8B7355"
    },
    home: {
      id: "home",
      name: "猫小九的家",
      description: "乡村两层木结构木屋，瓦片屋顶，清贫但温馨。室内有粉色柔光与蝴蝶光点。小九的卧室有窗户，月光可照入。",
      comicPages: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28],
      color: "#A0826D"
    },
    road_to_school: {
      id: "road_to_school",
      name: "上学路",
      description: "蓝天白云下的花树旁小路，远景俯瞰群山环抱中的学堂建筑。白灵常在此约小九同行。",
      comicPages: [29, 30],
      color: "#6B8E6B"
    },
    school_yard: {
      id: "school_yard",
      name: "学堂前空地",
      description: "学堂前的树下空地，围观学生聚集。猫墨在此拦路挑衅并向小九发出挑战。",
      comicPages: [30, 31, 32, 33, 34],
      color: "#7B6B5B"
    },
    arena: {
      id: "arena",
      name: "练武场比试台",
      description: "开阔的方形石板比试台，带红色立柱、四角亭式建筑，四周挤满围观学生。比武对决的场所。",
      comicPages: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
      color: "#9B8B7B"
    },
    pendant_dimension: {
      id: "pendant_dimension",
      name: "石珠内部异空间",
      description: "蓝色旋涡般的星空空间，蓝色圆珠吊坠悬浮在旋涡中央，周围浮现青色发光符文。蓝色灵气在此奔涌。",
      comicPages: [21, 22, 23],
      color: "#2a3a6a"
    }
  },

  // ===== 章节结构 =====
  chapters: [
    {
      id: 0,
      title: "序章：风暴前夕",
      subtitle: "冷开场·未来战斗",
      pages: [1, 2],
      summary: "金发少年向猫小九发动全力一击'风影残绝'，猫小九以'震风拳·风杀式'迎战。白灵与猫长老惊呼'小九危险'，猫小九胸前蓝色石珠骤然发出耀眼蓝光——神秘石珠伏笔登场。",
      unlocked: true
    },
    {
      id: 1,
      title: "第一章：被嘲笑的猫小九",
      subtitle: "灵力测试·跌入低谷",
      pages: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      summary: "时间回到一天前。猫小九在森林修炼过头，迟到赶往灵力测试。猫长老宣布猫族圣宗将来挑选入室弟子，猫墨与猫白灵皆为五星武者受万众追捧。猫小九赶到请求测试，结果公布'不到一星武者'，全族人哄笑羞辱，还揭出其父曾是部落队长却弃他而去。白灵握住小九的手鼓励他勤修追赶，猫墨妒火中烧当面羞辱小九，白灵引用部落团结公开力挺小九，三人对立成型。",
      unlocked: true
    },
    {
      id: 2,
      title: "第二章：发誓",
      subtitle: "受辱回家·苦修誓言",
      pages: [13, 14, 15, 16, 17],
      summary: "雨天练武场上猫小九被围观哄笑辱骂为'废物'，妈妈温柔赶来带他回家。回到清贫的两层木屋，妈妈安慰他测试失利没关系，说爸爸只是去了很远的地方，不放弃修炼很快就能见到爸爸。小九含泪答应，暗下决心'别人花一小时，我就花两小时'，并对父亲真实下落心存怀疑。妈妈说今晚做红烧鱼。",
      unlocked: true
    },
    {
      id: 3,
      title: "第三章：神秘石珠",
      subtitle: "月夜奇遇·经脉打通",
      pages: [18, 19, 20, 21, 22, 23, 24],
      summary: "月夜小九盘腿苦修，绿色灵气环绕却始终无法凝聚，力竭倒床。回忆起父亲在生日时赠送圆形石珠吊坠并叮嘱珍惜。现实中月光照射吊坠，石珠亮起蓝光、内部浮现星空，放大成巨大蓝色灵珠，将小九卷入蓝色旋涡异空间。蓝色灵气在体内奔涌，起初轻松随即暴涨逼近极限。醒来后小九掐自己确认不是梦，捡起吊坠攥在胸口，领悟到'爸爸，其实你一直在守护着我'。",
      unlocked: true
    },
    {
      id: 4,
      title: "第四章：灵力初成",
      subtitle: "清晨突破·接受战书",
      pages: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
      summary: "清晨小九起床洗漱用餐后出门练功，第一次成功催动灵力，一拳打裂地面。他兴奋地告诉妈妈，妈妈欣慰地表示一直相信他，小九握拳立誓要努力变强。白灵约他一起上学，路上猫墨带跟班拦下他，因嫉妒白灵袒护小九而当众发起挑战。围观同学起哄嘲讽小九不到一星武者，白灵劝他先隐忍修炼。小九谢过白灵表示不再退缩，当众接受挑战。猫墨得意大笑，众人转到练武场，比试台上小九短暂动摇后眼神转为锐利坚定——对决在即。",
      unlocked: true
    },
    {
      id: 5,
      title: "第五章：愤怒的猫墨",
      subtitle: "比武对决·悬念收尾",
      pages: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
      summary: "比试开始，猫墨红着眼从空中扑击，却被小九轻松躲过；连续追击全部落空，围观群众反以为猫墨在放水。小九抬手挑衅'放马过来吧'。猫墨怒喝使出绝学震风拳（绿色风劲），一拳轰出大爆炸，烟尘散去小九单臂硬接、脚下石板龟裂却一步不退。猫墨震惊。观众质疑猫墨没使出全力，激怒猫墨强调震风拳是武者五星拳法全学堂只有他会，随即连环打出一式至四式，然而所有拳头都从猫小九身侧擦过，小九纹丝不动，猫墨力竭跪倒。观众仍嘴硬说小九只会躲皮太厚，猫墨低头盯着拳头终于醒悟——'根本连猫小九的毛发都没有碰到！'他回忆起猫爷爷说小九连一星武者都不到，震惊于小九今日为何突然变强，画面在台下一声'真是胡闹！'中收束。故事戛然而止于悬念，留有后续。",
      unlocked: true
    }
  ],

  // ===== 任务系统 =====
  quests: {
    main: [
      {
        id: "m1",
        title: "参加灵力测试",
        description: "赶往部落测试广场，参加猫族圣宗弟子选拔测试。",
        condition: "进入部落广场",
        chapter: 1,
        status: "active",
        reward: "了解自身修为处境"
      },
      {
        id: "m2",
        title: "忍受嘲笑，立下誓言",
        description: "回到家中，面对妈妈的安慰，发誓加倍努力修炼，不再让妈妈失望。",
        condition: "回家与妈妈对话",
        chapter: 2,
        status: "locked",
        reward: "意志力+1"
      },
      {
        id: "m3",
        title: "查明神秘石珠的秘密",
        description: "月夜在屋外修炼时，爸爸留下的石珠吊坠发生异变，将你卷入蓝色异空间，打通经脉。",
        condition: "回家（夜间石珠异变）",
        chapter: 3,
        status: "locked",
        reward: "经脉畅通，可凝聚灵力"
      },
      {
        id: "m4",
        title: "掌握灵力运用",
        description: "清晨在屋外练习，第一次成功催动灵力外放，证明石珠改造有效。",
        condition: "回家（清晨催动灵力）",
        chapter: 4,
        status: "locked",
        reward: "灵力外放能力解锁"
      },
      {
        id: "m5",
        title: "接受猫墨的挑战",
        description: "在学堂前面对猫墨的挑衅与当众羞辱，不再退缩，当众接受比武挑战。",
        condition: "与猫墨对话（接受挑战）",
        chapter: 4,
        status: "locked",
        reward: "勇气+1"
      },
      {
        id: "m6",
        title: "在比武中证明自己",
        description: "在练武场比试台上，面对五星武者猫墨的全力攻击，以实力证明自己不是废物。",
        condition: "进入练武场",
        chapter: 5,
        status: "locked",
        reward: "全族震惊，猫墨认知崩塌"
      },
      {
        id: "m7",
        title: "寻找爸爸的下落",
        description: "爸爸只是去了很远的地方吗？变强之后，一定要找到爸爸。",
        chapter: 0,
        status: "active",
        reward: "???"
      }
    ],
    side: [
      {
        id: "s1",
        title: "帮妈妈做家务",
        description: "回家后帮妈妈分担家务，妈妈会做红烧鱼奖励你。",
        condition: "回到家",
        location: "home",
        status: "locked",
        reward: "红烧鱼×1"
      },
      {
        id: "s2",
        title: "和白灵一起上学",
        description: "白灵在花树旁等你，一起有说有笑地走向学堂。",
        condition: "与白灵对话",
        location: "road_to_school",
        status: "locked",
        reward: "白灵好感度+10"
      },
      {
        id: "s3",
        title: "夜间独自苦修",
        description: "别人花一小时修炼，你就花两小时。在月夜下坚持打坐苦修。",
        condition: "回家（夜间苦修）",
        location: "home",
        status: "locked",
        reward: "修炼经验+20"
      },
      {
        id: "s4",
        title: "探索石珠内部空间",
        description: "石珠将你卷入蓝色旋涡异空间，感受蓝色灵气在体内奔涌，经脉畅通。",
        condition: "石珠异变后自动触发",
        location: "pendant_dimension",
        status: "locked",
        reward: "经脉畅通"
      },
      {
        id: "s5",
        title: "在森林中修炼",
        description: "独自前往林间空地修炼，虽然总是无法凝聚灵气，但从不放弃。",
        condition: "进入林间修炼地",
        location: "forest",
        status: "active",
        reward: "修炼经验+10"
      }
    ],
    challenge: [
      {
        id: "c1",
        title: "武力测试",
        description: "在猫长老的雷电灵气测试下，测出真实修为——不到一星武者。",
        condition: "与猫长老对话（接受测试）",
        result: "不到一星武者",
        status: "locked"
      },
      {
        id: "c2",
        title: "忍受全族嘲笑",
        description: "测试结果公布后，面对全族人的哄笑羞辱，咬牙不崩溃。",
        condition: "测试结束后自动触发",
        status: "locked"
      },
      {
        id: "c3",
        title: "猫墨的当众羞辱",
        description: "猫墨当面骂你「也配和白灵站在一起」，忍住不发作。",
        condition: "与猫墨对话（m5之后）",
        status: "locked"
      },
      {
        id: "c4",
        title: "接受五星武者挑战",
        description: "面对五星武者猫墨的公开挑战，以不到一星武者的身份坦然接受。",
        condition: "与猫墨对话（c3之后）",
        status: "locked"
      },
      {
        id: "c5",
        title: "闪避猫墨全速攻击",
        description: "比武中猫墨连续全速扑击，全部被你轻松躲过，震惊全场。",
        condition: "进入练武场（m6之后）",
        status: "locked"
      },
      {
        id: "c6",
        title: "硬接震风拳",
        description: "猫墨使出绝学震风拳，你单臂硬接、脚下石板龟裂却一步不退。",
        condition: "进入练武场（c5之后）",
        status: "locked"
      },
      {
        id: "c7",
        title: "无视震风拳四式",
        description: "猫墨连环打出震风拳一式至四式，所有拳头从你身侧擦过，你纹丝不动。",
        condition: "进入练武场（c6之后）",
        status: "locked"
      }
    ]
  },

  // ===== 物品目录（背包） =====
  items: [
    {
      id: "stone_bead",
      name: "神秘石珠吊坠",
      icon: "🔮",
      description: "猫爸爸在小九生日时赠送的礼物，圆形深色圆珠配流苏挂绳。月光下会亮起蓝光、内部浮现星空，能放大为巨大蓝色灵珠，将人卷入异空间，释放蓝色灵气打通经脉。是爸爸留给小九的唯一东西，一直在守护着他。",
      type: "关键道具",
      obtained: "第三章·神秘石珠",
      rarity: "传说"
    },
    {
      id: "braised_fish",
      name: "红烧鱼",
      icon: "🐟",
      description: "妈妈做的红烧鱼，在小九发誓努力修炼后作为奖励。家的味道。",
      type: "消耗品",
      obtained: "第二章·发誓",
      rarity: "普通"
    },
    {
      id: "bandage",
      name: "白色绷带",
      icon: "🩹",
      description: "缠绕在手腕和额头上的白色绷带，苦修的证明。",
      type: "装备",
      obtained: "初始",
      rarity: "普通"
    },
    {
      id: "cloth_shoes",
      name: "黑布鞋",
      icon: "👟",
      description: "朴素的黑色布鞋，穿着它在部落中奔走修炼。",
      type: "装备",
      obtained: "初始",
      rarity: "普通"
    },
    {
      id: "backpack",
      name: "布制背包",
      icon: "🎒",
      description: "上学时背的布制背包，装着书本和干粮。",
      type: "装备",
      obtained: "初始",
      rarity: "普通"
    }
  ],

  // ===== 修行体系 =====
  cultivation: {
    realms: [
      { name: "武者", stages: ["一星武者", "二星武者", "三星武者", "四星武者", "五星武者", "六星武者", "七星武者", "八星武者", "九星武者"], description: "修炼的入门阶段，从1星到9星，星级越高实力越强。" },
      { name: "武师", stages: ["一星武师", "二星武师", "三星武师", "四星武师", "五星武师", "六星武师", "七星武师", "八星武师", "九星武师"], description: "达到九星武者后可修炼的下一阶段。猫墨的爸爸为五星武师，任部落大队长。" }
    ],
    playerStatus: {
      currentRealm: "武者",
      currentStage: "不到一星武者（石珠打通经脉后可使用灵力）",
      spiritualPower: "蓝色灵气（石珠赋予）",
      meridianStatus: "原经脉堵塞 → 石珠帮助下畅通",
      knownTechniques: ["震风拳·风杀式", "灵力外放"]
    },
    techniques: [
      { name: "震风拳", type: "拳法", level: "武者五星", user: "猫墨", description: "绿色风系真气拳法，全学堂只有猫墨会。共分一式至四式，连环打出威力巨大。" },
      { name: "震风拳·风杀式", type: "拳法", user: "猫小九（序章）", description: "震风拳的杀式变体，绿色风劲激荡。" },
      { name: "风影残绝", type: "招式", user: "金发少年（序章）", description: "绿色风系全力一击招式。" },
      { name: "灵力外放", type: "基础能力", user: "猫小九", description: "将体内灵力凝聚后从拳部外放，拳风可在地面留下深沟裂痕。" },
      { name: "雷电灵气测试", type: "检测术", user: "猫长老", description: "以蓝色雷电灵气检测族人修为等级。" }
    ]
  },

  // ===== 关系图谱 =====
  relationships: [
    { from: "猫小九", to: "猫白灵", type: "好友", level: 80, description: "白灵在小九最低谷时握住他的手鼓励他，主动约他一起上学，公开反驳猫墨维护小九。小九视白灵为重要的伙伴。" },
    { from: "猫小九", to: "猫墨", type: "敌对", level: -60, description: "猫墨长期欺负嘲笑小九，因嫉妒白灵亲近小九而当众羞辱并发起挑战。比武中小九以实力碾压猫墨，猫墨认知崩塌。" },
    { from: "猫小九", to: "妈妈", type: "母子", level: 100, description: "妈妈在清贫中温柔抚养小九，始终相信他能做到，做红烧鱼鼓励他。小九发誓不让妈妈失望。" },
    { from: "猫小九", to: "爸爸", type: "父子（思念）", level: 90, description: "爸爸曾任部落队长，在小九生日时赠送石珠吊坠后失踪。妈妈说爸爸去了很远的地方，小九怀疑爸爸并非只是远行。石珠一直在守护小九。" },
    { from: "猫墨", to: "猫白灵", type: "暗恋", level: 50, description: "猫墨以天才姿态与白灵并列五星武者，内心期待与白灵一起修炼。多次主动想跟白灵结伴上学被拒绝，因白灵亲近小九而妒火中烧。" },
    { from: "猫墨", to: "猫乐乐", type: "主从", level: 40, description: "猫乐乐是猫墨的跟班，追随猫墨起哄嘲讽小九，推搡催促小九前往练武场。" },
    { from: "猫墨", to: "猫天天", type: "主从", level: 40, description: "猫天天是猫墨的跟班，与猫乐乐一起追随猫墨。" },
    { from: "猫白灵", to: "猫长老", type: "祖孙/师徒", level: 70, description: "白灵引用'猫爷爷说过我们土猫部落一定要团结'来反驳猫墨，尊称长老为猫爷爷。" },
    { from: "猫小九", to: "猫长老", type: "祖孙/测试者", level: 50, description: "小九尊称长老为猫爷爷，长老为小九测试修为，测出不到一星武者。" }
  ],

  // ===== 玩家状态 =====
  player: {
    name: "猫小九",
    level: 1,
    exp: 0,
    maxExp: 100,
    hp: 100,
    maxHp: 100,
    spiritualPower: 30,
    maxSpiritualPower: 100,
    attack: 5,
    defense: 3,
    speed: 8,
    cultivation: "不到一星武者",
    location: "tribe_square",
    gold: 0
  }
};
