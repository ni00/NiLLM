import { TestSet } from '@/lib/types'

export const BUILTIN_TESTS_ZH: TestSet[] = [
    {
        id: 'builtin-logic',
        name: '逻辑推理',
        createdAt: 0,
        cases: [
            {
                id: 'l1',
                prompt: '如果所有的 bloop 都是 blip，且有些 blip 是 blop，那么所有的 bloop 一定是 blop 吗？'
            },
            {
                id: 'l2',
                prompt: '一个人有53只袜子，其中21只是完全相同的蓝色，15只是完全相同的黑色，17只是完全相同的红色。他必须拿出多少只袜子才能保证有一双？'
            },
            {
                id: 'l3',
                prompt: '莎莉有3个兄弟。每个兄弟都有2个姐妹。莎莉有多少个姐妹？'
            },
            {
                id: 'l4',
                prompt: '这就词中哪一个不属于同一类：苹果、香蕉、土豆、樱桃、橙子？'
            },
            {
                id: 'l5',
                prompt: '如果5台机器制造5个小部件需要5分钟，那么100台机器制造100个小部件需要多长时间？'
            }
        ]
    },
    {
        id: 'builtin-creative',
        name: '创意写作',
        createdAt: 0,
        cases: [
            {
                id: 'c1',
                prompt: '写一个短篇故事，讲述一个烤面包机发现自己可以穿越时空。'
            },
            {
                id: 'c2',
                prompt: '写一首关于赛博朋克未来中“风的颜色”的诗。'
            },
            {
                id: 'c3',
                prompt: '想象一种新的动物：描述它的外貌、栖息地以及一种独特的生存机制。'
            },
            {
                id: 'c4',
                prompt: '创作一段哲学家和智能冰箱之间关于“过期”含义的对话。'
            },
            {
                id: 'c5',
                prompt: '为一家销售“瓶装寂静”的公司写一句宣传语。'
            }
        ]
    },
    {
        id: 'builtin-coding',
        name: '代码与算法',
        createdAt: 0,
        cases: [
            {
                id: 'cd1',
                prompt: '编写一个Python函数来检查字符串是否为回文，但不能使用字符串切片或单词 "reverse"。'
            },
            {
                id: 'cd2',
                prompt: '用一个10岁孩子能听懂的比喻，解释 REST API 和 GraphQL API 之间的区别。'
            },
            {
                id: 'cd3',
                prompt: '编写一个仅使用 CSS 的解决方案，将 div 在垂直和水平方向上同时居中。'
            },
            {
                id: 'cd4',
                prompt: '优化此 SQL 查询的性能：SELECT * FROM users WHERE last_login > "2023-01-01" ORDER BY name ASC。'
            },
            {
                id: 'cd5',
                prompt: '用三个简单的句子解释 React 的虚拟 DOM 是如何工作的。'
            }
        ]
    },
    {
        id: 'builtin-roleplay',
        name: '专业场景',
        createdAt: 0,
        cases: [
            {
                id: 'r1',
                prompt: '你是一位资深人力资源经理。起草一封礼貌但坚定的拒绝信，发给一位非常有资格但缺乏“文化契合度”的候选人。'
            },
            {
                id: 'r2',
                prompt: '扮演客户支持代理。一位顾客因为包裹在到达时损坏而生气。解决这个问题。'
            },
            {
                id: 'r3',
                prompt: '你是一位风险投资人。给我做一个2分钟的电梯演讲，介绍一家用人工智能取代所有律师的初创公司。'
            },
            {
                id: 'r4',
                prompt: '为一家意外泄露客户电子邮件列表的小型企业写一份正式的道歉声明。'
            },
            {
                id: 'r5',
                prompt: '作为一名旅行社代理，为东京通过规划一个为期3天的“隐藏宝石”行程。'
            }
        ]
    },
    {
        id: 'builtin-image-gen',
        name: '文生图',
        createdAt: 0,
        cases: [
            {
                id: 'ig1',
                prompt: '一只金毛寻回犬幼犬坐在向日葵花田中，柔和的午后阳光，浅景深，专业摄影风格。'
            },
            {
                id: 'ig2',
                prompt: '雨夜中温馨的日式拉面店，暖色灯笼的光芒映照在湿润的鹅卵石街道上，宫崎骏吉卜力风格的动漫画面。'
            },
            {
                id: 'ig3',
                prompt: '日落时分的赛博朋克未来都市，霓虹灯牌上写着清晰可读的文字"营业中"和"拉面"，飞行汽车穿梭，云层壮观。'
            },
            {
                id: 'ig4',
                prompt: '一名宇航员骑马行走在火星表面，背景天空中可见地球，超写实数字艺术风格。'
            },
            {
                id: 'ig5',
                prompt: '一个可爱的机器人在厨房里制作咖啡，水彩画风格，柔和的粉彩色调，充满童趣和温馨的氛围。'
            },
            {
                id: 'ig6',
                prompt: '中国古典水墨画风格的云雾缭绕的群山，一位孤独的渔翁驾着竹筏在江面上，极简构图。'
            },
            {
                id: 'ig7',
                prompt: '木桌上的一颗玻璃球体，映射出一整片奇幻风景，有城堡和巨龙，微距摄影，晶莹剔透的细节。'
            },
            {
                id: 'ig8',
                prompt: '一幅超写实的猫咪肖像画，猫咪头戴小型皇冠，身披王室斗篷，端坐在天鹅绒王座上，文艺复兴油画风格。'
            }
        ]
    }
]
