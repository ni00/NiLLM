// Application copy only. User content and provider model identifiers remain unchanged.
export const messages = {
    'Previous page': { zh: '上一页', ja: '前のページ' },
    'Next page': { zh: '下一页', ja: '次のページ' },
    'Page {page} of {pages}': {
        zh: '第 {page} / {pages} 页',
        ja: '{page} / {pages} ページ'
    },
    'Delete Template': { zh: '删除提示词模板', ja: 'テンプレートを削除' },
    'DeepSeek pricing varies between peak and off-peak hours; actual billing may differ.':
        {
            zh: 'DeepSeek 区分高峰和非高峰价格，实际账单可能不同。',
            ja: 'DeepSeekの料金はピークとオフピークで異なり、実際の請求額は異なる場合があります。'
        },
    'Blank prices use the built-in reference prices for this model. Enter prices to override them.':
        {
            zh: '价格留空时自动使用此模型的内置参考价，填写价格可覆盖参考价。',
            ja: '価格が空欄の場合はモデルの内蔵参考価格を使います。入力すると上書きできます。'
        },
    'Auto: {price}': {
        zh: '自动：{price}',
        ja: '自動：{price}'
    },
    'DeepSeek reference prices use off-peak rates. Peak rates are twice as high; actual billing may differ.':
        {
            zh: 'DeepSeek 参考价采用非高峰价格，高峰价格为其两倍；实际账单可能不同。',
            ja: 'DeepSeekの参考価格はオフピーク料金です。ピーク料金はその2倍で、実際の請求額は異なる場合があります。'
        },
    'Estimated from model token prices (USD), using reference prices when none are configured. Historical prices, peak/off-peak rates and other charges may differ.':
        {
            zh: '按模型 Token 价格估算（美元），未配置价格时使用参考价。历史价格、高峰／非高峰价格及其他费用可能不同。',
            ja: 'モデルのトークン価格（米ドル）で推定し、未設定の場合は参考価格を使います。過去の価格、ピーク／オフピーク料金やその他の費用は異なる場合があります。'
        },
    Cost: { zh: '费用', ja: '費用' },
    Cache: { zh: '缓存', ja: 'キャッシュ' },
    Unknown: { zh: '未知', ja: '不明' },
    'Input price': { zh: '输入价格', ja: '入力料金' },
    'Output price': { zh: '输出价格', ja: '出力料金' },
    'Cache read price': { zh: '缓存读取价格', ja: 'キャッシュ読み取り料金' },
    'Cache write price': { zh: '缓存写入价格', ja: 'キャッシュ書き込み料金' },
    'Clear prices': { zh: '清除价格', ja: '料金をクリア' },
    'Token prices (USD / 1M tokens)': {
        zh: 'Token 价格（美元 / 百万 Token）',
        ja: 'トークン料金（USD / 100万トークン）'
    },
    'Used when the provider does not report cost. Leave optional cache prices blank to use the input price.':
        {
            zh: '供应商未返回费用时用于估算。缓存价格留空时使用普通输入价格。',
            ja: 'プロバイダーが費用を返さない場合の推計に使います。キャッシュ料金が空欄の場合は入力料金を使います。'
        },
    'Fill both input and output prices with nonnegative numbers to estimate cost.':
        {
            zh: '请填写有效的输入和输出价格（大于等于 0），才能估算费用。',
            ja: '費用の推計には、有効な入力料金と出力料金（0以上）が必要です。'
        },
    'Cost unavailable. Set token prices in model settings to estimate it.': {
        zh: '暂无费用数据。可在模型设置中填写 Token 价格以估算费用。',
        ja: '費用データがありません。モデル設定でトークン料金を入力すると推計できます。'
    },
    'Cost reported by the provider (USD).': {
        zh: '供应商返回的费用（美元）。',
        ja: 'プロバイダーが返した費用（USD）。'
    },
    'Estimated from configured token prices (USD); other charges may be excluded.':
        {
            zh: '按配置的 Token 价格估算（美元），可能不包含其他收费。',
            ja: '設定されたトークン料金による推計（USD）。その他の料金は含まれない場合があります。'
        },
    'Recorded cost (USD); source unavailable for this historical result.': {
        zh: '已记录费用（美元），这条历史记录未保存费用来源。',
        ja: '記録済みの費用（USD）。この履歴では費用の出典が不明です。'
    },
    'Data available for {known}/{total} requests.': {
        zh: '共 {total} 次请求，其中 {known} 次有数据。',
        ja: '{total} 件中 {known} 件にデータがあります。'
    },
    'The provider did not report usable cache data.': {
        zh: '供应商未返回可用的缓存数据。',
        ja: 'プロバイダーから有効なキャッシュデータが返されていません。'
    },
    'Cache read {read} / input {input} tokens. Cache hit rate is weighted by input tokens.':
        {
            zh: '缓存读取 {read} / 输入 {input} Token。缓存命中率按输入 Token 加权计算。',
            ja: 'キャッシュ読み取り {read} / 入力 {input} トークン。ヒット率は入力トークン数で加重計算します。'
        },
    'Cache write: {tokens} tokens.': {
        zh: '缓存写入：{tokens} Token。',
        ja: 'キャッシュ書き込み：{tokens} トークン。'
    },
    'Search options': { zh: '搜索选项', ja: '選択肢を検索' },
    'Model preset': { zh: '模型预设', ja: 'モデルプリセット' },
    'Initial output budget: {tokens} tokens': {
        zh: '初始输出预算：{tokens} Token',
        ja: '初期出力予算：{tokens} トークン'
    },
    'Choose a model preset (optional)': {
        zh: '选择模型预设（可选）',
        ja: 'モデルプリセットを選択（任意）'
    },
    'Presets fill the model ID, pricing and supported parameters. You can edit every field.':
        {
            zh: '预设会填入模型 ID、费用和参数能力，所有字段都可自行修改。',
            ja: 'プリセットからモデル ID、料金、対応パラメーターを入力します。各項目は変更できます。'
        },
    'Context: {context} · Output limit: {output} tokens': {
        zh: '上下文：{context} · 最大输出：{output} Token',
        ja: 'コンテキスト：{context} · 最大出力：{output} トークン'
    },
    'Preset data: {date}. Availability and pricing may change.': {
        zh: '预设资料日期：{date}。模型可用性和费用可能变化。',
        ja: 'プリセット更新日：{date}。提供状況と料金は変更される場合があります。'
    },
    'Choose built-in presets or fetch the provider’s latest models. Existing models are skipped.':
        {
            zh: '选择内置预设，或在线获取供应商的最新模型。已有模型会自动跳过。',
            ja: '内蔵プリセットを選ぶか、最新のモデルを取得します。登録済みのモデルはスキップします。'
        },
    'Use presets ({count})': {
        zh: '使用预设（{count}）',
        ja: 'プリセットを使用（{count}）'
    },
    'Local model presets require the model to be installed first.': {
        zh: '本地模型预设需要先在本地服务中安装对应模型。',
        ja: 'ローカルモデルは、対応するモデルをサービス側にインストールする必要があります。'
    },
    'Moonshot AI (International)': {
        zh: 'Moonshot AI（国际）',
        ja: 'Moonshot AI（国際）'
    },
    'Moonshot AI (China)': {
        zh: 'Moonshot AI（中国）',
        ja: 'Moonshot AI（中国）'
    },
    'Alibaba DashScope (China)': {
        zh: '阿里云百炼（中国）',
        ja: 'Alibaba DashScope（中国）'
    },
    'Alibaba DashScope (International)': {
        zh: '阿里云百炼（国际）',
        ja: 'Alibaba DashScope（国際）'
    },
    'SiliconFlow (China)': {
        zh: '硅基流动（中国）',
        ja: 'SiliconFlow（中国）'
    },
    'SiliconFlow (International)': {
        zh: '硅基流动（国际）',
        ja: 'SiliconFlow（国際）'
    },
    'Zhipu AI': { zh: '智谱 AI', ja: 'Zhipu AI' },
    'Zhipu AI Coding Plan': {
        zh: '智谱 AI Coding Plan',
        ja: 'Zhipu AI Coding Plan'
    },
    'MiniMax (International)': { zh: 'MiniMax（国际）', ja: 'MiniMax（国際）' },
    'MiniMax (China)': { zh: 'MiniMax（中国）', ja: 'MiniMax（中国）' },
    'Ollama (Local)': { zh: 'Ollama（本地）', ja: 'Ollama（ローカル）' },
    'LM Studio (Local)': {
        zh: 'LM Studio（本地）',
        ja: 'LM Studio（ローカル）'
    },
    'Decision API': { zh: '决策接口', ja: '意思決定 API' },
    Automatic: { zh: '自动', ja: '自動' },
    'Chat Completions (JSON)': {
        zh: 'Chat Completions（JSON）',
        ja: 'Chat Completions（JSON）'
    },
    'Automatic uses System One for Jev and structured output for language models. Responses uses the OpenAI Responses API.':
        {
            zh: '自动模式为 Jev 使用 System One，为语言模型使用结构化输出。Responses 使用 OpenAI Responses 接口。',
            ja: '自動モードは Jev に System One、言語モデルに構造化出力を使用します。Responses は OpenAI Responses API を使用します。'
        },
    Decision: { zh: '决策', ja: '意思決定' },
    'Decision values': { zh: '决策值', ja: '意思決定の値' },
    'Decision input': { zh: '决策输入', ja: '意思決定の入力' },
    'Edit decision input': { zh: '编辑决策输入', ja: '意思決定の入力を編集' },
    'Apply decision input': { zh: '应用决策输入', ja: '意思決定の入力を適用' },
    'Define the state and questions once. Every selected decision model receives the same independent task.':
        {
            zh: '统一定义状态和问题，所有选中的决策模型接收同一项独立任务。',
            ja: '状態と質問を定義すると、選択したすべての意思決定モデルに同じ独立したタスクが渡されます。'
        },
    State: { zh: '状态', ja: '状態' },
    'State format': { zh: '状态格式', ja: '状態の形式' },
    Text: { zh: '文本', ja: 'テキスト' },
    Questions: { zh: '问题', ja: '質問' },
    'Choice selects an option; Score rates ordered levels from zero; Noul returns the probability of yes. Questions use type, instructions and criteria.':
        {
            zh: 'Choice 选择选项；Score 按从 0 开始的有序等级评分；Noul 返回“是”的概率。问题由 type、instructions 和 criteria 定义。',
            ja: 'Choice は選択肢を選び、Score は 0 始まりの順序付き段階で評価し、Noul は「はい」の確率を返します。質問は type、instructions、criteria で定義します。'
        },
    'Check the state and question definitions. Choice needs options; Score needs 2–10 levels.':
        {
            zh: '请检查状态和问题定义。Choice 需要选项，Score 需要 2–10 个等级。',
            ja: '状態と質問の定義を確認してください。Choice には選択肢、Score には 2〜10 段階が必要です。'
        },
    'Decision requests are independent; conversation history is excluded.': {
        zh: '决策请求独立运行，不包含对话历史。',
        ja: '意思決定リクエストは独立して実行され、会話履歴は含まれません。'
    },
    'Set every selected model to Decision mode for a comparable task.': {
        zh: '请将所有选中的模型设为决策模式，以比较同一任务。',
        ja: '同じタスクを比較するには、選択したすべてのモデルを意思決定モードに設定してください。'
    },
    'Decision input must be valid JSON with state and typed questions.': {
        zh: '决策输入须为包含 state 和类型化 questions 的有效 JSON。',
        ja: '意思決定の入力は state と型付き questions を含む有効な JSON にしてください。'
    },
    'Decision input uses text or JSON state. Remove file attachments before sending.':
        {
            zh: '决策输入使用文本或 JSON 状态，请先移除文件附件。',
            ja: '意思決定の入力にはテキストまたは JSON の状態を使います。送信前に添付ファイルを削除してください。'
        },
    'Enter a decision task with state and questions, or use the decision editor.':
        {
            zh: '输入包含状态和问题的决策任务，或使用决策编辑器。',
            ja: '状態と質問を含む意思決定タスクを入力するか、エディターを使用してください。'
        },
    'Decision mode evaluates typed questions against a state. OpenAI and compatible models use structured output; Jev uses its native API.':
        {
            zh: '决策模式根据状态回答类型化问题。OpenAI 等兼容模型生成结构化输出，Jev 使用原生决策接口。',
            ja: '意思決定モードは状態に対して型付き質問を評価します。OpenAI 等の互換モデルは構造化出力、Jev は専用 API を使用します。'
        },
    'Expected values by question ID: Choice label, zero-based Score, or Noul boolean/probability.':
        {
            zh: '按问题 ID 填写预期值：Choice 选项名、从 0 开始的 Score 分数，或 Noul 布尔值／概率。',
            ja: '質問 ID ごとに期待値を指定します：Choice の選択肢名、0 始まりの Score、Noul の真偽値または確率。'
        },
    'Numeric tolerance': { zh: '数值容差', ja: '数値の許容誤差' },
    'Resolved model': { zh: '实际模型版本', ja: '実際のモデル' },
    'Probability distribution': { zh: '概率分布', ja: '確率分布' },
    Option: { zh: '选项', ja: '選択肢' },
    Probability: { zh: '概率', ja: '確率' },
    'Self-reported confidence': {
        zh: '模型自报置信度',
        ja: 'モデルの自己申告の確信度'
    },
    'Provider confidence': { zh: '供应商置信度', ja: 'プロバイダーの確信度' },
    'Raw decision JSON': { zh: '原始决策 JSON', ja: '意思決定の元 JSON' },
    'Decision scoring needs a valid decision prompt and expected values by question ID.':
        {
            zh: '决策评分需要有效的决策输入和按问题 ID 填写的预期值。',
            ja: '意思決定の採点には有効な入力と質問 ID ごとの期待値が必要です。'
        },
    'Response is not a valid decision answer.': {
        zh: '响应不是有效的决策答案。',
        ja: '応答は有効な意思決定の回答ではありません。'
    },
    'Decision test sets require models in Decision mode.': {
        zh: '决策测试集需要使用决策模式的模型。',
        ja: '意思決定のテストセットには意思決定モードのモデルが必要です。'
    },

    Settings: {
        zh: '设置',
        ja: '設定'
    },
    Language: {
        zh: '语言',
        ja: '言語'
    },
    'Interface language': {
        zh: '界面语言',
        ja: '表示言語'
    },
    'Built-in test language': {
        zh: '内置测试语言',
        ja: '内蔵テストの言語'
    },
    'Follow interface language': {
        zh: '跟随界面语言',
        ja: '表示言語に合わせる'
    },
    Appearance: {
        zh: '外观',
        ja: '外観'
    },
    Theme: {
        zh: '主题',
        ja: 'テーマ'
    },
    System: {
        zh: '跟随系统',
        ja: 'システム'
    },
    Light: {
        zh: '浅色',
        ja: 'ライト'
    },
    Dark: {
        zh: '深色',
        ja: 'ダーク'
    },
    Generation: {
        zh: '生成',
        ja: '生成'
    },
    Version: {
        zh: '版本',
        ja: 'バージョン'
    },
    Arena: {
        zh: '竞技场',
        ja: 'アリーナ'
    },
    Prompts: {
        zh: '提示词',
        ja: 'プロンプト'
    },
    Tests: {
        zh: '测试',
        ja: 'テスト'
    },
    Models: {
        zh: '模型',
        ja: 'モデル'
    },
    Stats: {
        zh: '统计',
        ja: '統計'
    },
    Experiments: {
        zh: '实验',
        ja: '実験'
    },
    Workspace: {
        zh: '工作区',
        ja: 'ワークスペース'
    },
    Assets: {
        zh: '资产',
        ja: 'アセット'
    },
    Preferences: {
        zh: '偏好',
        ja: '環境設定'
    },
    More: {
        zh: '更多',
        ja: 'その他'
    },
    Performance: {
        zh: '性能统计',
        ja: 'パフォーマンス'
    },
    'Prompt Templates': {
        zh: '提示词模板',
        ja: 'プロンプトテンプレート'
    },
    'Test Sets': {
        zh: '测试集',
        ja: 'テストセット'
    },
    Queue: {
        zh: '队列',
        ja: 'キュー'
    },
    Layout: {
        zh: '布局',
        ja: 'レイアウト'
    },
    Sort: {
        zh: '排序',
        ja: '並べ替え'
    },
    Export: {
        zh: '导出',
        ja: 'エクスポート'
    },
    Judge: {
        zh: '评审',
        ja: '評価'
    },
    Configure: {
        zh: '配置',
        ja: '構成'
    },
    Import: {
        zh: '导入',
        ja: 'インポート'
    },
    Add: {
        zh: '添加',
        ja: '追加'
    },
    Create: {
        zh: '创建',
        ja: '作成'
    },
    Edit: {
        zh: '编辑',
        ja: '編集'
    },
    Delete: {
        zh: '删除',
        ja: '削除'
    },
    Duplicate: {
        zh: '复制',
        ja: '複製'
    },
    Cancel: {
        zh: '取消',
        ja: 'キャンセル'
    },
    Save: {
        zh: '保存',
        ja: '保存'
    },
    Confirm: {
        zh: '确认',
        ja: '確認'
    },
    Reset: {
        zh: '重置',
        ja: 'リセット'
    },
    Done: {
        zh: '完成',
        ja: '完了'
    },
    Retry: {
        zh: '重试',
        ja: '再試行'
    },
    Remove: {
        zh: '移除',
        ja: '削除'
    },
    Use: {
        zh: '使用',
        ja: '使用'
    },
    Clear: {
        zh: '清除',
        ja: 'クリア'
    },
    Active: {
        zh: '已启用',
        ja: '有効'
    },
    Pending: {
        zh: '等待中',
        ja: '待機中'
    },
    Error: {
        zh: '错误',
        ja: 'エラー'
    },
    Success: {
        zh: '成功',
        ja: '成功'
    },
    Pause: {
        zh: '暂停',
        ja: '一時停止'
    },
    Paused: {
        zh: '已暂停',
        ja: '一時停止中'
    },
    Resume: {
        zh: '继续',
        ja: '再開'
    },
    'Processing...': {
        zh: '处理中…',
        ja: '処理中…'
    },
    'Importing...': {
        zh: '导入中…',
        ja: 'インポート中…'
    },
    'Restoring...': {
        zh: '恢复中…',
        ja: '復元中…'
    },
    Backup: {
        zh: '备份',
        ja: 'バックアップ'
    },
    Restore: {
        zh: '恢复',
        ja: '復元'
    },
    Actions: {
        zh: '操作',
        ja: '操作'
    },
    Default: {
        zh: '默认',
        ja: 'デフォルト'
    },
    Auto: {
        zh: '自动',
        ja: '自動'
    },
    '1 Column': {
        zh: '1 列',
        ja: '1 列'
    },
    '2 Columns': {
        zh: '2 列',
        ja: '2 列'
    },
    '3 Columns': {
        zh: '3 列',
        ja: '3 列'
    },
    '4 Columns': {
        zh: '4 列',
        ja: '4 列'
    },
    Slide: {
        zh: '滑动',
        ja: 'スライド'
    },
    'Model Name': {
        zh: '模型名称',
        ja: 'モデル名'
    },
    'Avg TTFT': {
        zh: '平均首字延迟',
        ja: '平均初回トークン時間'
    },
    'Avg TPS': {
        zh: '平均生成速度',
        ja: '平均生成速度'
    },
    'Avg Rating': {
        zh: '平均评分',
        ja: '平均評価'
    },
    Reorder: {
        zh: '调整顺序',
        ja: '並べ替え'
    },
    'Done reordering': {
        zh: '完成排序',
        ja: '並べ替えを完了'
    },
    'Drag to reorder': {
        zh: '拖动排序',
        ja: 'ドラッグで並べ替え'
    },
    'Add provider': {
        zh: '添加供应商',
        ja: 'プロバイダーを追加'
    },
    'Add provider models': {
        zh: '添加供应商模型',
        ja: 'プロバイダーのモデルを追加'
    },
    'Fetch the provider’s model list and add all models at once. Existing models are skipped.':
        {
            zh: '获取供应商的模型列表并批量添加，已添加的模型会自动跳过。',
            ja: 'プロバイダーのモデル一覧を取得して一括追加します。既存のモデルはスキップします。'
        },
    Provider: {
        zh: '供应商',
        ja: 'プロバイダー'
    },
    'Provider Type': {
        zh: '供应商类型',
        ja: 'プロバイダーの種類'
    },
    'Provider display name': {
        zh: '供应商显示名称',
        ja: 'プロバイダーの表示名'
    },
    'Provider Tag (Optional)': {
        zh: '供应商标签（可选）',
        ja: 'プロバイダータグ（任意）'
    },
    'Base URL': {
        zh: '接口地址',
        ja: 'ベース URL'
    },
    'Base URL (Optional)': {
        zh: '接口地址（可选）',
        ja: 'ベース URL（任意）'
    },
    'Base URL (Optional override)': {
        zh: '接口地址（可选覆盖）',
        ja: 'ベース URL（任意の上書き）'
    },
    'API key': {
        zh: 'API 密钥',
        ja: 'API キー'
    },
    'API Key (Optional)': {
        zh: 'API 密钥（可选）',
        ja: 'API キー（任意）'
    },
    'API Key (Optional override)': {
        zh: 'API 密钥（可选覆盖）',
        ja: 'API キー（任意の上書き）'
    },
    'Optional for public / local providers': {
        zh: '公开或本地供应商可留空',
        ja: '公開・ローカルのプロバイダーでは省略可能'
    },
    'Fetch models': {
        zh: '获取模型',
        ja: 'モデルを取得'
    },
    'Fetch all models': {
        zh: '获取全部模型',
        ja: 'すべてのモデルを取得'
    },
    'Fetching…': {
        zh: '获取中…',
        ja: '取得中…'
    },
    'Cancel request': {
        zh: '取消请求',
        ja: 'リクエストをキャンセル'
    },
    'Select all': {
        zh: '全选',
        ja: 'すべて選択'
    },
    'Select All': {
        zh: '全选',
        ja: 'すべて選択'
    },
    'Deselect All': {
        zh: '取消全选',
        ja: 'すべて選択解除'
    },
    'Select filtered': {
        zh: '选择搜索结果',
        ja: '検索結果を選択'
    },
    'Clear selection': {
        zh: '清除选择',
        ja: '選択をクリア'
    },
    'Select provider': {
        zh: '选择供应商',
        ja: 'プロバイダーを選択'
    },
    'Deselect provider': {
        zh: '取消选择供应商',
        ja: 'プロバイダーの選択を解除'
    },
    'Search configured models': {
        zh: '搜索已配置模型',
        ja: '設定済みモデルを検索'
    },
    'Search discovered models': {
        zh: '搜索供应商模型',
        ja: '取得したモデルを検索'
    },
    'Search models or providers…': {
        zh: '搜索模型或供应商…',
        ja: 'モデル・プロバイダーを検索…'
    },
    'Search models…': {
        zh: '搜索模型…',
        ja: 'モデルを検索…'
    },
    'No models match your search.': {
        zh: '没有匹配的模型。',
        ja: '一致するモデルがありません。'
    },
    'No models selected': {
        zh: '未选择模型',
        ja: 'モデルが未選択です'
    },
    'No models available. Add models in settings.': {
        zh: '暂无模型，请前往模型页面添加。',
        ja: 'モデルがありません。モデルページで追加してください。'
    },
    'Model list': {
        zh: '模型列表',
        ja: 'モデル一覧'
    },
    'Add New Model': {
        zh: '添加新模型',
        ja: '新しいモデルを追加'
    },
    'Edit Model': {
        zh: '编辑模型',
        ja: 'モデルを編集'
    },
    'Edit Model Details': {
        zh: '编辑模型信息',
        ja: 'モデル情報を編集'
    },
    'Save Model': {
        zh: '保存模型',
        ja: 'モデルを保存'
    },
    'Save Changes': {
        zh: '保存修改',
        ja: '変更を保存'
    },
    'Display Name': {
        zh: '显示名称',
        ja: '表示名'
    },
    'Display name on card': {
        zh: '卡片上显示的名称',
        ja: 'カードに表示する名前'
    },
    'Model ID': {
        zh: '模型 ID',
        ja: 'モデル ID'
    },
    Model: {
        zh: '模型',
        ja: 'モデル'
    },
    'Model Mode': {
        zh: '模型模式',
        ja: 'モデルモード'
    },
    Mode: {
        zh: '模式',
        ja: 'モード'
    },
    Chat: {
        zh: '对话',
        ja: 'チャット'
    },
    'Chat Completion': {
        zh: '对话生成',
        ja: 'チャット生成'
    },
    Image: {
        zh: '图像',
        ja: '画像'
    },
    'Image Generation': {
        zh: '图像生成',
        ja: '画像生成'
    },
    'Configuration Mode': {
        zh: '配置模式',
        ja: '設定モード'
    },
    'Update Configuration': {
        zh: '更新配置',
        ja: '設定を更新'
    },
    'Configure your': {
        zh: '配置',
        ja: '構成'
    },
    'adapter settings.': {
        zh: '接口设置。',
        ja: 'アダプター設定。'
    },
    'e.g. GPT-4 Turbo': {
        zh: '例如：GPT-4 Turbo',
        ja: '例：GPT-4 Turbo'
    },
    'e.g. DeepSeek': {
        zh: '例如：DeepSeek',
        ja: '例：DeepSeek'
    },
    'Arena Settings': {
        zh: '竞技场设置',
        ja: 'アリーナ設定'
    },
    'Model Selection': {
        zh: '模型选择',
        ja: 'モデル選択'
    },
    'Select the models to compare in the arena.': {
        zh: '选择参与竞技场比较的模型。',
        ja: 'アリーナで比較するモデルを選択してください。'
    },
    'Manage Models': {
        zh: '管理模型',
        ja: 'モデル管理'
    },
    Parameters: {
        zh: '参数',
        ja: 'パラメーター'
    },
    'Generation Parameters': {
        zh: '生成参数',
        ja: '生成パラメーター'
    },
    'Adjust sampling and length constraints globally.': {
        zh: '调整全局采样参数和输出长度。',
        ja: '全体のサンプリング設定と出力長を調整します。'
    },
    'Global System Prompt': {
        zh: '全局系统提示词',
        ja: '共通システムプロンプト'
    },
    'Define the base behavior for all models in this session.': {
        zh: '设置当前会话中所有模型的基本行为。',
        ja: 'このセッションの全モデルの基本動作を設定します。'
    },
    'System Prompt': {
        zh: '系统提示词',
        ja: 'システムプロンプト'
    },
    'Override global generation settings.': {
        zh: '覆盖全局生成设置。',
        ja: '共通の生成設定を上書きします。'
    },
    'Reset to inherited': {
        zh: '恢复继承',
        ja: '継承に戻す'
    },
    'Concurrent models': {
        zh: '并发模型数',
        ja: '同時実行モデル数'
    },
    'Run up to this many models at once; remaining models wait for a free slot.':
        {
            zh: '同时运行的模型数量上限，其余模型将排队等待。',
            ja: '同時に実行するモデルの上限です。残りは空きができるまで待機します。'
        },
    Sampling: {
        zh: '采样',
        ja: 'サンプリング'
    },
    Temperature: {
        zh: '温度',
        ja: '温度'
    },
    'Top P': {
        zh: 'Top P',
        ja: 'Top P'
    },
    'Top K': {
        zh: 'Top K',
        ja: 'Top K'
    },
    'Min P': {
        zh: 'Min P',
        ja: 'Min P'
    },
    Constraints: {
        zh: '约束',
        ja: '制約'
    },
    'Max Tokens': {
        zh: '最大 Token 数',
        ja: '最大トークン数'
    },
    Seed: {
        zh: '随机种子',
        ja: 'シード'
    },
    Random: {
        zh: '随机',
        ja: 'ランダム'
    },
    'Stop Sequences': {
        zh: '停止序列',
        ja: '停止シーケンス'
    },
    Penalties: {
        zh: '惩罚参数',
        ja: 'ペナルティ'
    },
    'Frequency Penalty': {
        zh: '频率惩罚',
        ja: '頻度ペナルティ'
    },
    'Presence Penalty': {
        zh: '存在惩罚',
        ja: '存在ペナルティ'
    },
    'Repetition Penalty': {
        zh: '重复惩罚',
        ja: '反復ペナルティ'
    },
    'Timeouts (ms)': {
        zh: '超时（毫秒）',
        ja: 'タイムアウト（ミリ秒）'
    },
    'AI SDK Timeouts': {
        zh: 'AI SDK 超时',
        ja: 'AI SDK タイムアウト'
    },
    'Legacy (Fallback)': {
        zh: '兼容设置（备用）',
        ja: '互換設定（フォールバック）'
    },
    Connect: {
        zh: '连接',
        ja: '接続'
    },
    Read: {
        zh: '读取',
        ja: '読み取り'
    },
    Total: {
        zh: '总计',
        ja: '合計'
    },
    Step: {
        zh: '单步',
        ja: 'ステップ'
    },
    Chunk: {
        zh: '数据块',
        ja: 'チャンク'
    },
    'Telemetry (OpenTelemetry)': {
        zh: '遥测（OpenTelemetry）',
        ja: 'テレメトリー（OpenTelemetry）'
    },
    'Enable Telemetry': {
        zh: '启用遥测',
        ja: 'テレメトリーを有効化'
    },
    'Track LLM calls with OpenTelemetry': {
        zh: '使用 OpenTelemetry 记录模型调用',
        ja: 'OpenTelemetry でモデル呼び出しを記録'
    },
    'Function ID': {
        zh: '函数 ID',
        ja: '関数 ID'
    },
    'Record Inputs': {
        zh: '记录输入',
        ja: '入力を記録'
    },
    'Record Outputs': {
        zh: '记录输出',
        ja: '出力を記録'
    },
    'Leave empty to use global': {
        zh: '留空使用全局设置',
        ja: '空欄で共通設定を使用'
    },
    'e.g. You are a helpful AI assistant specialized in coding...': {
        zh: '例如：你是一位擅长编程的 AI 助手…',
        ja: '例：あなたはプログラミングに詳しい AI アシスタントです…'
    },
    'Reset to default': {
        zh: '恢复默认',
        ja: 'デフォルトに戻す'
    },
    'AI Judge': {
        zh: 'AI 评审',
        ja: 'AI 評価'
    },
    'AI Judge Settings': {
        zh: 'AI 评审设置',
        ja: 'AI 評価設定'
    },
    'Human Judge': {
        zh: '人工评审',
        ja: '人による評価'
    },
    'Select Judge Model': {
        zh: '选择评审模型',
        ja: '評価モデルを選択'
    },
    'Select Model...': {
        zh: '选择模型…',
        ja: 'モデルを選択…'
    },
    'Judge System Prompt': {
        zh: '评审系统提示词',
        ja: '評価用システムプロンプト'
    },
    'Enter judge instructions...': {
        zh: '输入评审说明…',
        ja: '評価の指示を入力…'
    },
    'Judging Responses...': {
        zh: '正在评审回答…',
        ja: '回答を評価中…'
    },
    'Save & Close': {
        zh: '保存并关闭',
        ja: '保存して閉じる'
    },
    'Save Set': {
        zh: '保存测试集',
        ja: 'テストセットを保存'
    },
    'Processing Queue': {
        zh: '处理队列',
        ja: '処理キュー'
    },
    'Queue is empty': {
        zh: '队列为空',
        ja: 'キューは空です'
    },
    'Ready to compare': {
        zh: '准备开始比较',
        ja: '比較の準備ができました'
    },
    'Send a message to all models... (Use @ to mention models)': {
        zh: '向所有模型发送消息…（使用 @ 指定模型）',
        ja: '全モデルにメッセージを送信…（@ でモデルを指定）'
    },
    'Add a message...': {
        zh: '添加消息…',
        ja: 'メッセージを追加…'
    },
    'Attach files': {
        zh: '添加附件',
        ja: 'ファイルを添付'
    },
    'Clear Context': {
        zh: '清空上下文',
        ja: 'コンテキストをクリア'
    },
    'Drop files to attach': {
        zh: '拖入文件以添加附件',
        ja: 'ファイルをドロップして添付'
    },
    'Enter for new line, Shift+Enter to send': {
        zh: 'Enter 换行，Shift+Enter 发送',
        ja: 'Enter で改行、Shift+Enter で送信'
    },
    'Expand to full screen': {
        zh: '全屏输入',
        ja: '全画面入力'
    },
    'Full Screen Input': {
        zh: '全屏输入',
        ja: '全画面入力'
    },
    'Type your message with more space. Supports Markdown and drag & drop.': {
        zh: '在更大的空间中输入消息，支持 Markdown 和拖放文件。',
        ja: '広いスペースで入力できます。Markdown とファイルのドラッグ＆ドロップに対応。'
    },
    'Clear all attachments': {
        zh: '清空附件',
        ja: 'すべての添付ファイルを削除'
    },
    'Copy Text': {
        zh: '复制文本',
        ja: 'テキストをコピー'
    },
    Copied: {
        zh: '已复制',
        ja: 'コピーしました'
    },
    'Download Image': {
        zh: '下载图像',
        ja: '画像をダウンロード'
    },
    'Full size image': {
        zh: '原尺寸图像',
        ja: '原寸画像'
    },
    'View Full Size': {
        zh: '查看原图',
        ja: '原寸表示'
    },
    'Follow output': {
        zh: '跟随输出',
        ja: '出力を追従'
    },
    'Following (Click to stop)': {
        zh: '跟随中（点击停止）',
        ja: '追従中（クリックで停止）'
    },
    'Scroll to Top': {
        zh: '滚动到顶部',
        ja: '先頭に移動'
    },
    'Scroll to Bottom': {
        zh: '滚动到底部',
        ja: '末尾に移動'
    },
    'Generating…': {
        zh: '生成中…',
        ja: '生成中…'
    },
    'No text output': {
        zh: '无文本输出',
        ja: 'テキスト出力なし'
    },
    'Thinking...': {
        zh: '思考中…',
        ja: '思考中…'
    },
    'Thought Process': {
        zh: '思考过程',
        ja: '思考過程'
    },
    Speed: {
        zh: '速度',
        ja: '速度'
    },
    Latency: {
        zh: '延迟',
        ja: '遅延'
    },
    'Latency (TTFT)': {
        zh: '首字延迟',
        ja: '初回トークン時間'
    },
    Duration: {
        zh: '耗时',
        ja: '所要時間'
    },
    'Total Duration': {
        zh: '总耗时',
        ja: '総所要時間'
    },
    Tokens: {
        zh: 'Token 数',
        ja: 'トークン数'
    },
    'Total Tokens': {
        zh: '总 Token 数',
        ja: '総トークン数'
    },
    'Time to First Token': {
        zh: '首字延迟',
        ja: '初回トークン時間'
    },
    'Tokens Per Second': {
        zh: '每秒 Token 数',
        ja: 'トークン毎秒'
    },
    'Average TTFT': {
        zh: '平均首字延迟',
        ja: '平均初回トークン時間'
    },
    'Average Tokens/sec': {
        zh: '平均每秒 Token 数',
        ja: '平均トークン毎秒'
    },
    Score: {
        zh: '评分',
        ja: '評価'
    },
    Quality: {
        zh: '质量',
        ja: '品質'
    },
    Content: {
        zh: '内容',
        ja: '内容'
    },
    Title: {
        zh: '标题',
        ja: 'タイトル'
    },
    'New Template': {
        zh: '新建模板',
        ja: '新しいテンプレート'
    },
    'Edit Template': {
        zh: '编辑模板',
        ja: 'テンプレートを編集'
    },
    'Import JSON Template': {
        zh: '导入 JSON 模板',
        ja: 'JSON テンプレートをインポート'
    },
    'Import template': {
        zh: '导入模板',
        ja: 'テンプレートをインポート'
    },
    'Use Template': {
        zh: '使用模板',
        ja: 'テンプレートを使用'
    },
    'Fill & Use': {
        zh: '填写并使用',
        ja: '入力して使用'
    },
    'Fill Variables:': {
        zh: '填写变量：',
        ja: '変数を入力：'
    },
    'Variable Descriptions': {
        zh: '变量说明',
        ja: '変数の説明'
    },
    'Describe your variables to help the AI auto-fill them.': {
        zh: '填写变量说明，帮助 AI 自动填充。',
        ja: '変数を説明すると AI の自動入力に役立ちます。'
    },
    'Manually enter values or use AI to auto-fill.': {
        zh: '手动填写或使用 AI 自动填充。',
        ja: '手動で入力するか、AI で自動入力してください。'
    },
    'My Awesome Prompt': {
        zh: '我的提示词',
        ja: 'プロンプトのタイトル'
    },
    'Write a story about {{topic}} in the style of {{author}}...': {
        zh: '以 {{author}} 的风格写一个关于 {{topic}} 的故事…',
        ja: '{{author}} の作風で {{topic}} の物語を書いてください…'
    },
    'Edit the prompt template and its variables.': {
        zh: '编辑提示词模板与变量。',
        ja: 'プロンプトテンプレートと変数を編集します。'
    },
    'to define variables.': {
        zh: '来定义变量。',
        ja: 'で変数を定義します。'
    },
    'No templates yet. Create one to get started!': {
        zh: '暂无模板，创建一个开始使用！',
        ja: 'テンプレートがありません。作成して始めましょう！'
    },
    'Standard Benchmarks': {
        zh: '标准基准测试',
        ja: '標準ベンチマーク'
    },
    'Create Test Set': {
        zh: '创建测试集',
        ja: 'テストセットを作成'
    },
    'Edit Test Set': {
        zh: '编辑测试集',
        ja: 'テストセットを編集'
    },
    'Configure your test cases and prompts.': {
        zh: '配置测试用例和提示词。',
        ja: 'テストケースとプロンプトを設定します。'
    },
    'Set Name': {
        zh: '测试集名称',
        ja: 'テストセット名'
    },
    'Test Cases (': {
        zh: '测试用例（',
        ja: 'テストケース（'
    },
    'Add Case': {
        zh: '添加用例',
        ja: 'ケースを追加'
    },
    'Enter test prompt...': {
        zh: '输入测试提示词…',
        ja: 'テスト用プロンプトを入力…'
    },
    'e.g. Challenging Logic Puzzles': {
        zh: '例如：高难度逻辑题',
        ja: '例：難しい論理パズル'
    },
    'No test cases yet. Click “Add Case” to start.': {
        zh: '暂无测试用例，点击“添加用例”开始。',
        ja: 'テストケースがありません。「ケースを追加」をクリックしてください。'
    },
    'Run Batch Evaluation': {
        zh: '批量运行测试',
        ja: '一括評価を実行'
    },
    'Run this case': {
        zh: '运行此用例',
        ja: 'このケースを実行'
    },
    'Import Custom Tests': {
        zh: '导入自定义测试',
        ja: 'カスタムテストをインポート'
    },
    'Drag and drop your JSON benchmark files here to run custom evaluations.': {
        zh: '拖入 JSON 测试文件以运行自定义测试。',
        ja: 'JSON ベンチマークファイルをドロップしてカスタム評価を実行します。'
    },
    'All time': {
        zh: '全部时间',
        ja: '全期間'
    },
    'Last 7 days': {
        zh: '最近 7 天',
        ja: '過去 7 日間'
    },
    'Last 30 days': {
        zh: '最近 30 天',
        ja: '過去 30 日間'
    },
    'Time range': {
        zh: '时间范围',
        ja: '期間'
    },
    'All providers': {
        zh: '全部供应商',
        ja: 'すべてのプロバイダー'
    },
    'Provider filter': {
        zh: '供应商筛选',
        ja: 'プロバイダーフィルター'
    },
    'All modes': {
        zh: '全部模式',
        ja: 'すべてのモード'
    },
    'Model mode': {
        zh: '模型模式',
        ja: 'モデルモード'
    },
    'Success rate': {
        zh: '成功率',
        ja: '成功率'
    },
    'Known cost (USD)': {
        zh: '已知费用（美元）',
        ja: '既知の費用（USD）'
    },
    'Token measurements': {
        zh: 'Token 统计',
        ja: 'トークン計測'
    },
    'Provider usage takes precedence. Failed requests excluded from performance averages.':
        {
            zh: '优先采用供应商返回的用量，性能均值不包含失败请求。',
            ja: 'プロバイダーの使用量を優先します。性能平均には失敗したリクエストを含みません。'
        },
    'Total Sessions': {
        zh: '总会话数',
        ja: '総セッション数'
    },
    'Active conversation threads': {
        zh: '对话会话总数',
        ja: '会話セッション数'
    },
    'Generated Tokens': {
        zh: '已生成 Token 数',
        ja: '生成トークン数'
    },
    'Successful output; API counts or estimates': {
        zh: '成功输出的 API 用量或估算值',
        ja: '成功した出力の API 使用量または推定値'
    },
    'Avg. Request Speed': {
        zh: '平均请求速度',
        ja: '平均リクエスト速度'
    },
    'Sample-weighted mean generation speed': {
        zh: '按样本加权的平均生成速度',
        ja: 'サンプル数で重み付けした平均生成速度'
    },
    'Top Performer': {
        zh: '速度领先模型',
        ja: '最速モデル'
    },
    'Highest throughput (TPS)': {
        zh: '最高吞吐量（TPS）',
        ja: '最高スループット（TPS）'
    },
    'Generation Speed (t/s)': {
        zh: '生成速度（Token/秒）',
        ja: '生成速度（トークン/秒）'
    },
    'Throughput comparison per model.': {
        zh: '各模型的吞吐量比较。',
        ja: 'モデルごとのスループット比較。'
    },
    'Avg. Latency (ms)': {
        zh: '平均延迟（毫秒）',
        ja: '平均遅延（ミリ秒）'
    },
    'Time to first token (Lower is better).': {
        zh: '首字响应时间（越低越好）。',
        ja: '初回トークン時間（小さいほど良好）。'
    },
    'Insufficient Data': {
        zh: '暂无足够数据',
        ja: 'データ不足'
    },
    'Start some conversations in the Arena to populate these performance benchmarks.':
        {
            zh: '在竞技场开始对话以生成性能数据。',
            ja: 'アリーナで会話を始めると性能データが表示されます。'
        },
    'Capability Matrix': {
        zh: '能力对比',
        ja: '能力比較'
    },
    'Speed and responsiveness are relative to the best measured model; quality uses the 1–5 rating scale.':
        {
            zh: '速度和响应能力以最佳实测模型为参照，质量评分范围为 1–5。',
            ja: '速度と応答性は最良の計測モデルを基準とし、品質は 1〜5 の評価です。'
        },
    'Leading Responsiveness': {
        zh: '响应最快',
        ja: '最速の応答'
    },
    'Quality Leader': {
        zh: '质量领先',
        ja: '品質トップ'
    },
    'Message Volume': {
        zh: '消息数量',
        ja: 'メッセージ数'
    },
    'Total model interactions logged': {
        zh: '模型交互记录总数',
        ja: '記録されたモデル対話数'
    },
    'Evaluation Models': {
        zh: '参评模型',
        ja: '評価モデル'
    },
    'Models tracked': {
        zh: '已统计模型',
        ja: '集計対象モデル数'
    },
    Category: {
        zh: '类别',
        ja: 'カテゴリ'
    },
    Samples: {
        zh: '样本数',
        ja: 'サンプル数'
    },
    'Cost (USD)': {
        zh: '费用（美元）',
        ja: '費用（USD）'
    },
    'P95 latency': {
        zh: 'P95 延迟',
        ja: 'P95 遅延'
    },
    Reports: {
        zh: '报表',
        ja: 'レポート'
    },
    'Export Stats CSV': {
        zh: '导出统计 CSV',
        ja: '統計を CSV でエクスポート'
    },
    'Export Stats JSON': {
        zh: '导出统计 JSON',
        ja: '統計を JSON でエクスポート'
    },
    'Export to JSON': {
        zh: '导出 JSON',
        ja: 'JSON にエクスポート'
    },
    'Danger Zone': {
        zh: '危险操作',
        ja: '危険な操作'
    },
    'Clear Data': {
        zh: '清空数据',
        ja: 'データを削除'
    },
    'Clear data': {
        zh: '清空数据',
        ja: 'データを削除'
    },
    'Confirm Clear': {
        zh: '确认清空',
        ja: '削除を確認'
    },
    'Clear Model Statistics?': {
        zh: '清空模型统计？',
        ja: 'モデル統計を削除しますか？'
    },
    'Once confirmed, this data cannot be recovered. Please ensure you have backed up any critical reports.':
        {
            zh: '确认后无法恢复，请先备份重要报表。',
            ja: '確認後は復元できません。重要なレポートを先にバックアップしてください。'
        },
    'Page not found': {
        zh: '页面不存在',
        ja: 'ページが見つかりません'
    },
    'Sorry, we couldn’t find the page you’re looking for.': {
        zh: '找不到您要访问的页面。',
        ja: 'お探しのページが見つかりませんでした。'
    },
    'Go back': {
        zh: '返回',
        ja: '戻る'
    },
    'Contact support': {
        zh: '联系支持',
        ja: 'サポートに連絡'
    },
    'The app encountered an error and needs to be restarted.': {
        zh: '应用发生错误，需要重新启动。',
        ja: 'アプリでエラーが発生しました。再起動してください。'
    },
    'Relaunch app': {
        zh: '重启应用',
        ja: 'アプリを再起動'
    },
    "We know about it and we're working to fix it.": {
        zh: '我们正在处理此问题。',
        ja: '問題の修正に取り組んでいます。'
    },
    "We're fixing it": {
        zh: '正在修复',
        ja: '修正中です'
    },
    'No options found.': {
        zh: '暂无选项。',
        ja: '選択肢がありません。'
    },
    'Select...': {
        zh: '请选择…',
        ja: '選択してください…'
    },
    Off: {
        zh: '关闭',
        ja: 'オフ'
    },
    In: {
        zh: '输入',
        ja: '入力'
    },
    '/ Out': {
        zh: '/ 输出',
        ja: '/ 出力'
    },
    '/ 5.0 avg score': {
        zh: '/ 5.0 平均分',
        ja: '/ 5.0 平均評価'
    },
    'ms initial latency': {
        zh: '毫秒首字延迟',
        ja: 'ミリ秒 初回トークン時間'
    },
    'estimated samples': {
        zh: '个估算样本',
        ja: '推定サンプル'
    },
    estimated: {
        zh: '估算',
        ja: '推定'
    },
    cancelled: {
        zh: '已取消',
        ja: 'キャンセル済み'
    },
    pending: {
        zh: '等待中',
        ja: '待機中'
    },
    active: {
        zh: '已启用',
        ja: '有効'
    },
    models: {
        zh: '个模型',
        ja: 'モデル'
    },
    'models ·': {
        zh: '个模型 ·',
        ja: 'モデル ·'
    },
    selected: {
        zh: '已选择',
        ja: '選択済み'
    },
    'completed ·': {
        zh: '已完成 ·',
        ja: '完了 ·'
    },
    'failed ·': {
        zh: '失败 ·',
        ja: '失敗 ·'
    },
    'cancelled ·': {
        zh: '已取消 ·',
        ja: 'キャンセル済み ·'
    },
    'evaluation cases': {
        zh: '个测试用例',
        ja: 'テストケース'
    },
    'more cases': {
        zh: '个更多用例',
        ja: '件の追加ケース'
    },
    'variables •': {
        zh: '个变量 •',
        ja: '変数 •'
    },
    'Create new': {
        zh: '创建新模板',
        ja: '新規作成'
    },
    or: {
        zh: '或',
        ja: 'または'
    },
    'This action will': {
        zh: '此操作将',
        ja: 'この操作は'
    },
    'This will': {
        zh: '此操作将',
        ja: 'この操作は'
    },
    'permanently delete': {
        zh: '永久删除',
        ja: '完全に削除'
    },
    'all performance data for': {
        zh: '全部性能数据：',
        ja: 'すべての性能データ：'
    },
    'all session history, chat records, and benchmark performance results.': {
        zh: '全部会话历史、聊天记录和测试结果。',
        ja: 'すべてのセッション履歴、チャット記録、ベンチマーク結果。'
    },
    'Pricing available for': {
        zh: '已配置价格的请求数：',
        ja: '価格情報があるリクエスト数：'
    },
    'completed requests': {
        zh: '已完成请求',
        ja: '完了したリクエスト'
    },
    'Show more (': {
        zh: '显示更多（',
        ja: 'さらに表示（'
    },
    'remaining)': {
        zh: '个剩余）',
        ja: '件残り）'
    },
    'Added {count} models.': {
        zh: '已添加 {count} 个模型。',
        ja: '{count} 件のモデルを追加しました。'
    },
    'All selected models are already configured.': {
        zh: '所选模型均已添加。',
        ja: '選択したモデルはすべて設定済みです。'
    },
    'This provider returned no supported models.': {
        zh: '供应商未返回支持的模型。',
        ja: '対応するモデルが返されませんでした。'
    },
    'Could not read the model list. Check the provider settings.': {
        zh: '无法获取模型列表，请检查供应商设置。',
        ja: 'モデル一覧を取得できません。プロバイダー設定を確認してください。'
    },
    'Add {count} models': {
        zh: '添加 {count} 个模型',
        ja: '{count} 件のモデルを追加'
    },
    '{selected} / {total} selected': {
        zh: '已选择 {selected} / {total}',
        ja: '{selected} / {total} 件選択済み'
    },
    '{count} models · {active} active': {
        zh: '{count} 个模型 · {active} 个已启用',
        ja: '{count} モデル · {active} 有効'
    },
    'Show more ({count} remaining)': {
        zh: '显示更多（剩余 {count} 个）',
        ja: 'さらに表示（残り {count} 件）'
    },
    '{completed} completed · {failed} failed · {cancelled} cancelled': {
        zh: '{completed} 已完成 · {failed} 失败 · {cancelled} 已取消',
        ja: '{completed} 完了 · {failed} 失敗 · {cancelled} キャンセル'
    },
    'Pricing available for {priced} / {completed} completed requests': {
        zh: '{completed} 个已完成请求中，{priced} 个已配置价格',
        ja: '完了した {completed} 件中 {priced} 件に価格情報あり'
    },
    '{count} estimated': {
        zh: '{count} 个估算值',
        ja: '{count} 件の推定値'
    },
    '{count} evaluation cases': {
        zh: '{count} 个测试用例',
        ja: '{count} 件のテストケース'
    },
    'Test Cases ({count})': {
        zh: '测试用例（{count}）',
        ja: 'テストケース（{count}）'
    },
    '{count} more cases': {
        zh: '还有 {count} 个用例',
        ja: '他 {count} 件のケース'
    },
    'Please select at least one active model in the Arena first.': {
        zh: '请先在竞技场中选择至少一个模型。',
        ja: '先にアリーナでモデルを 1 つ以上選択してください。'
    },
    'Failed to parse file.': {
        zh: '文件解析失败。',
        ja: 'ファイルの解析に失敗しました。'
    },
    'Initializing app...': {
        zh: '正在初始化…',
        ja: '初期化中…'
    },
    'Loading your arena…': {
        zh: '正在加载竞技场…',
        ja: 'アリーナを読み込み中…'
    },
    'Loading...': {
        zh: '加载中…',
        ja: '読み込み中…'
    },
    Close: { zh: '关闭', ja: '閉じる' },
    Responsiveness: { zh: '响应能力', ja: '応答性' },
    'Switch to {name}': { zh: '切换到 {name}', ja: '{name} に切り替え' },
    'Drag {name}': { zh: '拖动 {name}', ja: '{name} をドラッグ' },
    'Select {name}': { zh: '选择 {name}', ja: '{name} を選択' },
    'Value for {name}…': { zh: '填写 {name}…', ja: '{name} の値…' },
    'Description for {name}': { zh: '{name} 的说明', ja: '{name} の説明' },
    'Invalid template format': {
        zh: '模板格式无效',
        ja: 'テンプレートの形式が無効です'
    },
    'Failed to read file': {
        zh: '文件读取失败',
        ja: 'ファイルの読み取りに失敗しました'
    },
    'Selected model not found.': {
        zh: '找不到所选模型。',
        ja: '選択したモデルが見つかりません。'
    },
    'Invalid model data format': {
        zh: '模型数据格式无效',
        ja: 'モデルデータの形式が無効です'
    },
    'Invalid model data. Check the JSON format.': {
        zh: '模型数据无效，请检查 JSON 格式。',
        ja: 'モデルデータが無効です。JSON の形式を確認してください。'
    },
    'Data restored successfully.': {
        zh: '数据已恢复。',
        ja: 'データを復元しました。'
    },
    'Failed to import data': {
        zh: '数据导入失败',
        ja: 'データのインポートに失敗しました'
    },
    'Failed to export data': {
        zh: '数据导出失败',
        ja: 'データのエクスポートに失敗しました'
    },
    'Permanently delete all performance data for “{name}”.': {
        zh: '永久删除“{name}”的全部性能数据。',
        ja: '「{name}」のすべての性能データを完全に削除します。'
    },
    'Are you sure you want to delete this template?': {
        zh: '确认删除此模板？',
        ja: 'このテンプレートを削除しますか？'
    },
    'Could not fill variables. Check provider settings and network access.': {
        zh: '无法填充变量，请检查供应商设置和网络连接。',
        ja: '変数を入力できません。プロバイダー設定とネットワークを確認してください。'
    },
    'Permanently delete all session history, chat records, and benchmark performance results.':
        {
            zh: '永久删除全部会话历史、聊天记录和测试结果。',
            ja: 'すべてのセッション履歴、チャット記録、ベンチマーク結果を完全に削除します。'
        },
    'Custom (OpenAI Compatible)': {
        zh: '自定义（兼容 OpenAI）',
        ja: 'カスタム（OpenAI 互換）'
    },
    'Custom (Legacy)': { zh: '自定义（旧版）', ja: 'カスタム（旧版）' },
    'Start Judging': { zh: '开始评审', ja: '評価を開始' },
    'Consulting {name}…': {
        zh: '正在向 {name} 请求评审…',
        ja: '{name} に評価を依頼中…'
    },
    'Error: {message}': { zh: '错误：{message}', ja: 'エラー：{message}' },
    'No judge model selected': {
        zh: '未选择评审模型',
        ja: '評価モデルが未選択です'
    },
    'Gathering model responses...': {
        zh: '正在收集模型回答…',
        ja: 'モデルの回答を収集中…'
    },
    'No completed responses to judge': {
        zh: '没有可评审的完整回答',
        ja: '評価できる完了した回答がありません'
    },
    'Success! Ratings applied.': {
        zh: '评分已更新。',
        ja: '評価を反映しました。'
    },
    'Could not match model IDs in judge response': {
        zh: '无法匹配评审结果中的模型 ID',
        ja: '評価結果のモデル ID を照合できません'
    },
    Cancelled: { zh: '已取消', ja: 'キャンセルしました' },
    '{count} chars': { zh: '{count} 个字符', ja: '{count} 文字' },
    Commands: { zh: '命令', ja: 'コマンド' },
    'Search commands...': {
        zh: '搜索命令…',
        ja: 'コマンドを検索…'
    },
    'No matching commands': {
        zh: '没有匹配的命令',
        ja: '一致するコマンドがありません'
    },
    'New Experiment': { zh: '新建实验', ja: '新規実験' },
    'Keyboard Shortcuts': {
        zh: '键盘快捷键',
        ja: 'キーボードショートカット'
    },
    'Open command menu': {
        zh: '打开命令菜单',
        ja: 'コマンドメニューを開く'
    },
    'Send message': { zh: '发送消息', ja: 'メッセージを送信' },
    'Close dialog': { zh: '关闭对话框', ja: 'ダイアログを閉じる' },
    'No experiments yet': { zh: '还没有实验', ja: '実験はまだありません' },
    'Create or import a test set first, then run it as an experiment.': {
        zh: '请先创建或导入测试集，再作为实验运行。',
        ja: 'まずテストセットを作成またはインポートしてから、実験として実行してください。'
    },
    'Pick a test set and compare models under identical, independent conditions.':
        {
            zh: '选择测试集，在完全相同的独立条件下对比模型。',
            ja: 'テストセットを選び、同一の独立した条件でモデルを比較します。'
        },
    tasks: { zh: '任务', ja: 'タスク' },
    executed: { zh: '已执行', ja: '実行済み' },
    'Delete this experiment?': {
        zh: '删除这个实验？',
        ja: 'この実験を削除しますか？'
    },
    'All recorded attempts and parameters will be removed. This cannot be undone.':
        {
            zh: '所有已记录的尝试和参数都会被删除，且无法恢复。',
            ja: '記録されたすべての試行とパラメータが削除され、元に戻せません。'
        },
    'Experiment not found': { zh: '实验不存在', ja: '実験が見つかりません' },
    'Back to experiments': { zh: '返回实验列表', ja: '実験一覧に戻る' },
    'Continue pending tasks': {
        zh: '继续待执行任务',
        ja: '未実行タスクを再開'
    },
    'Retry failed tasks': { zh: '重跑失败任务', ja: '失敗タスクを再実行' },
    'Deleting…': { zh: '删除中…', ja: '削除中…' },
    Executed: { zh: '已执行', ja: '実行済み' },
    'Disabling a model does not change this run; pause or cancel it first.': {
        zh: '禁用模型不会改变本实验；请先暂停或取消实验。',
        ja: 'モデルを無効化しても本実験は変更されません。先に一時停止またはキャンセルしてください。'
    },
    'Frozen parameters': { zh: '冻结参数', ja: '固定パラメータ' },
    'Case × Model': { zh: '用例 × 模型', ja: 'ケース × モデル' },
    Case: { zh: '用例', ja: 'ケース' },
    groups: { zh: '参数组', ja: 'グループ' },
    'All groups': { zh: '全部参数组', ja: 'すべてのグループ' },
    'Parameter group': { zh: '参数组', ja: 'パラメータグループ' },
    Repetition: { zh: '重复', ja: '繰り返し' },
    Repeat: { zh: '重复', ja: '繰り返し' },
    'Not run': { zh: '未执行', ja: '未実行' },
    attempts: { zh: '次尝试', ja: '回の試行' },
    'Configure Experiment': { zh: '配置实验', ja: '実験を設定' },
    'Each case runs independently per model; conversation history is never shared.':
        {
            zh: '每个用例对每个模型独立运行，绝不共享会话历史。',
            ja: '各ケースはモデルごとに独立して実行され、会話履歴は共有されません。'
        },
    'Experiment Name': { zh: '实验名称', ja: '実験名' },
    'e.g. Nightly regression': {
        zh: '例如：夜间回归',
        ja: '例：夜間リグレッション'
    },
    'Test Set': { zh: '测试集', ja: 'テストセット' },
    'No test sets yet': { zh: '还没有测试集', ja: 'テストセットがありません' },
    'No enabled chat models.': {
        zh: '没有已启用的对话模型。',
        ja: '有効なチャットモデルがありません。'
    },
    'Add a model': { zh: '添加模型', ja: 'モデルを追加' },
    Repetitions: { zh: '重复次数', ja: '繰り返し回数' },
    'Repeat each case with the same parameters to measure variance.': {
        zh: '以相同参数重复每个用例，用于测量波动。',
        ja: '同じパラメータで各ケースを繰り返し、ばらつきを測定します。'
    },
    'Planned calls': { zh: '计划调用数', ja: '予定呼び出し数' },
    'cases × models × groups × repeats': {
        zh: '用例 × 模型 × 参数组 × 重复',
        ja: 'ケース × モデル × グループ × 繰り返し'
    },
    'Could not create the experiment.': {
        zh: '无法创建实验。',
        ja: '実験を作成できませんでした。'
    },
    'Creating…': { zh: '创建中…', ja: '作成中…' },
    'Create Experiment': { zh: '创建实验', ja: '実験を作成' },
    'Download Full Backup': {
        zh: '下载完整备份',
        ja: '完全バックアップをダウンロード'
    },
    'A full backup contains every workspace domain: models, sessions, test sets, prompts and experiments.':
        {
            zh: '完整备份包含所有工作区数据：模型、会话、测试集、提示词和实验。',
            ja: '完全バックアップにはすべてのワークスペース領域が含まれます：モデル、セッション、テストセット、プロンプト、実験。'
        },
    'Include API keys and endpoints': {
        zh: '包含 API 密钥和端点',
        ja: 'APIキーとエンドポイントを含める'
    },
    'Secrets stay on this machine unless you explicitly include them. Share carefully.':
        {
            zh: '除非明确勾选，密钥不会离开本机。分享时请谨慎。',
            ja: '明示的に含めない限り、シークレットは本機から出ません。共有時はご注意ください。'
        },
    'Download Backup': { zh: '下载备份', ja: 'バックアップをダウンロード' },
    'Restore is unavailable while local storage is failing.': {
        zh: '本地存储故障期间无法恢复数据。',
        ja: 'ローカルストレージに障害がある間は復元できません。'
    },
    'Stop running requests before restoring data.': {
        zh: '恢复数据前请先停止运行中的请求。',
        ja: 'データを復元する前に実行中のリクエストを停止してください。'
    },
    'Restore a backup file': {
        zh: '恢复备份文件',
        ja: 'バックアップファイルを復元'
    },
    'Clearing is unavailable while local storage is failing.': {
        zh: '本地存储故障期间无法清理数据。',
        ja: 'ローカルストレージに障害がある間はクリアできません。'
    },
    'Stop running requests first.': {
        zh: '请先停止运行中的请求。',
        ja: '先に実行中のリクエストを停止してください。'
    },
    'Arena data only: experiments and prompts are kept. Experiments are managed on their own page.':
        {
            zh: '仅清理竞技场数据：实验与提示词保留，实验在其页面单独管理。',
            ja: 'アリーナデータのみ消去：実験とプロンプトは保持され、実験は専用ページで管理されます。'
        },
    'Local data could not be read.': {
        zh: '无法读取本地数据。',
        ja: 'ローカルデータを読み込めませんでした。'
    },
    'Changes are not being saved.': {
        zh: '更改未被保存。',
        ja: '変更が保存されていません。'
    },
    'Latest changes stay in memory and retry automatically.': {
        zh: '最新更改保留在内存中，会自动重试写入。',
        ja: '最新の変更はメモリに保持され、自動的に再試行されます。'
    },
    'Download raw storage': {
        zh: '下载原始存储',
        ja: '生ストレージをダウンロード'
    },
    Density: { zh: '信息密度', ja: '表示密度' },
    Comfortable: { zh: '宽松', ja: '標準' },
    Compact: { zh: '紧凑', ja: 'コンパクト' },
    Failed: { zh: '失败', ja: '失敗' },
    'Expected answer (optional)': {
        zh: '预期答案（可选）',
        ja: '期待する回答（任意）'
    },
    'Parameter presets': { zh: '参数预设', ja: 'パラメータープリセット' },
    'Select a parameter preset': {
        zh: '选择参数预设',
        ja: 'パラメータープリセットを選択'
    },
    'Preset name': { zh: '预设名称', ja: 'プリセット名' },
    'Preset name is required.': {
        zh: '请输入预设名称。',
        ja: 'プリセット名を入力してください。'
    },
    'Enter a non-empty preset name and valid parameter values.': {
        zh: '请输入非空预设名称和有效参数值。',
        ja: '空でないプリセット名と有効なパラメーター値を入力してください。'
    },
    'Save current patch': {
        zh: '保存当前覆盖参数',
        ja: '現在の上書き設定を保存'
    },
    'Rename preset': { zh: '重命名预设', ja: 'プリセット名を変更' },
    'Update from current patch': {
        zh: '用当前覆盖参数更新',
        ja: '現在の上書き設定で更新'
    },
    'Preview preset': { zh: '预览预设', ja: 'プリセットをプレビュー' },
    'Delete preset': { zh: '删除预设', ja: 'プリセットを削除' },
    'Presets copy parameter overrides; omitted fields remain unchanged.': {
        zh: '预设复制参数覆盖值；未包含的字段保持不变。',
        ja: 'プリセットはパラメーターの上書き値をコピーします。含まれない項目は変更されません。'
    },
    'Review changed fields before applying a copied patch.': {
        zh: '应用复制的覆盖参数前，请检查变更字段。',
        ja: 'コピーした上書き設定を適用する前に、変更項目を確認してください。'
    },
    Inherited: { zh: '继承', ja: '継承' },
    'No parameter values will change.': {
        zh: '不会更改任何参数值。',
        ja: '変更されるパラメーター値はありません。'
    },
    'Unable to apply parameter preset.': {
        zh: '无法应用参数预设。',
        ja: 'パラメータープリセットを適用できません。'
    },
    'Apply preset': { zh: '应用预设', ja: 'プリセットを適用' },
    'Parameters not sent': { zh: '不发送的参数', ja: '送信しないパラメーター' },
    'Undeclared capabilities are unknown; providers may ignore requested parameters.':
        {
            zh: '未声明的能力为未知；供应商可能忽略请求的参数。',
            ja: '未指定の機能は不明です。プロバイダーは要求されたパラメーターを無視する場合があります。'
        },
    Selection: { zh: '选择', ja: '選択' },
    'Confirm requests': { zh: '确认请求', ja: 'リクエストの確認' },
    'No enabled models.': {
        zh: '没有已启用的模型。',
        ja: '有効なモデルがありません。'
    },
    'Select at least one enabled model.': {
        zh: '请至少选择一个已启用的模型。',
        ja: '有効なモデルを少なくとも1つ選択してください。'
    },
    'A name is required.': {
        zh: '请输入名称。',
        ja: '名前を入力してください。'
    },
    'The test set needs at least one non-empty prompt.': {
        zh: '测试集至少需要一个非空提示词。',
        ja: 'テストセットには空でないプロンプトが少なくとも1つ必要です。'
    },
    'Repetitions must be an integer between 1 and 20.': {
        zh: '重复次数必须为 1–20 的整数。',
        ja: '繰り返し回数は1〜20の整数にしてください。'
    },
    'Parameter groups must be between 1 and 8.': {
        zh: '参数组数量必须为 1–8。',
        ja: 'パラメーターグループ数は1〜8にしてください。'
    },
    'Parameter group names must be unique.': {
        zh: '参数组名称必须唯一。',
        ja: 'パラメーターグループ名は重複できません。'
    },
    'Limit 50,000 calls. Reduce cases, models, groups or repetitions.': {
        zh: '最多 50,000 次调用。请减少用例、模型、参数组或重复次数。',
        ja: '上限は50,000回です。ケース、モデル、グループ、または繰り返し回数を減らしてください。'
    },
    'Common experiment parameters': {
        zh: '实验公共参数',
        ja: '実験の共通パラメーター'
    },
    'Parameter group name': { zh: '参数组名称', ja: 'パラメーターグループ名' },
    'Copy group': { zh: '复制参数组', ja: 'グループを複製' },
    'Delete group': { zh: '删除参数组', ja: 'グループを削除' },
    'Add group': { zh: '添加参数组', ja: 'グループを追加' },
    'Image generation remains available; text scoring and text TPS are not applicable.':
        {
            zh: '仍支持图像生成；文本评分和文本 TPS 不适用。',
            ja: '画像生成は引き続き利用できます。テキスト評価とテキストTPSは対象外です。'
        },
    'Confirming starts API requests. Review every model and parameter group below.':
        {
            zh: '确认后将开始 API 请求。请检查下方每个模型和参数组。',
            ja: '確認するとAPIリクエストが開始します。以下の各モデルとパラメーターグループを確認してください。'
        },
    'Unknown capabilities are not verified; providers may ignore requested parameters.':
        {
            zh: '未知能力尚未验证；供应商可能忽略请求参数。',
            ja: '不明な機能は検証されていません。プロバイダーがリクエストのパラメーターを無視する場合があります。'
        },
    'Not sent': { zh: '不发送', ja: '送信しない項目' },
    'NiLLM request configuration': {
        zh: 'NiLLM 请求配置',
        ja: 'NiLLMリクエスト設定'
    },
    Back: { zh: '上一步', ja: '戻る' },
    Next: { zh: '下一步', ja: '次へ' },
    'Model capabilities': { zh: '模型能力', ja: 'モデルの機能' },
    'Image input support': { zh: '图片输入支持', ja: '画像入力の対応' },
    'Unknown (unverified)': { zh: '未知（未经验证）', ja: '不明（未検証）' },
    Supported: { zh: '支持', ja: '対応' },
    'Not supported': { zh: '不支持', ja: '非対応' },
    'Unknown capabilities are unverified; parameters are sent and the provider may ignore them.':
        {
            zh: '未知能力未经验证；参数仍会发送，供应商可能忽略它们。',
            ja: '不明な機能は未検証です。パラメーターは送信されますが、プロバイダーが無視する場合があります。'
        },
    'Unsupported sampling parameters': {
        zh: '不支持的采样参数',
        ja: '非対応のサンプリングパラメーター'
    },
    'Declared unsupported parameters are omitted from requests; requested values remain recorded.':
        {
            zh: '已声明不支持的参数将从请求中省略；请求设置值仍会保留记录。',
            ja: '非対応と指定したパラメーターはリクエストから除外されます。要求した値は記録に残ります。'
        },
    'First-event wait': { zh: '首事件等待', ja: '最初のイベント待機' },
    'No-chunk wait': { zh: '无数据块等待', ja: 'チャンク未受信の待機' },
    'Worker waiting guards': {
        zh: 'Worker 等待保护',
        ja: 'Worker の待機ガード'
    },
    'SDK total, step and chunk limits are separate from worker waiting guards.':
        {
            zh: 'SDK 总时长、步骤和数据块限制与 Worker 等待保护相互独立。',
            ja: 'SDK の全体・ステップ・チャンクの制限は、Worker の待機ガードとは別です。'
        },
    'Not configured': { zh: '未配置', ja: '未設定' },
    'Clear override': { zh: '清除覆盖', ja: '上書きを解除' },
    'Telemetry uses the configured OpenTelemetry SDK; enabling it does not change input or output recording settings.':
        {
            zh: '遥测使用已配置的 OpenTelemetry SDK；启用遥测不会更改输入或输出记录设置。',
            ja: 'テレメトリーは設定済みの OpenTelemetry SDK を使用します。有効にしても入力・出力の記録設定は変わりません。'
        },
    'Telemetry is disabled; no inputs or outputs are recorded.': {
        zh: '遥测已禁用；不记录输入或输出。',
        ja: 'テレメトリーは無効です。入力・出力は記録されません。'
    },
    'SDK records inputs and outputs.': {
        zh: 'SDK 会记录输入和输出。',
        ja: 'SDK は入力と出力を記録します。'
    },
    'SDK records inputs only.': {
        zh: 'SDK 仅记录输入。',
        ja: 'SDK は入力のみ記録します。'
    },
    'SDK records outputs only.': {
        zh: 'SDK 仅记录输出。',
        ja: 'SDK は出力のみ記録します。'
    },
    'SDK records neither inputs nor outputs.': {
        zh: 'SDK 不记录输入或输出。',
        ja: 'SDK は入力も出力も記録しません。'
    },
    'No prompt templates yet': {
        zh: '还没有提示词模板',
        ja: 'プロンプトテンプレートはまだありません'
    },
    'Create a reusable prompt template or import a JSON template.': {
        zh: '创建可复用的提示词模板，或导入 JSON 模板。',
        ja: '再利用できるプロンプトテンプレートを作成するか、JSON テンプレートをインポートしてください。'
    },
    'Create your own test set': {
        zh: '创建自定义测试集',
        ja: '独自のテストセットを作成'
    },
    'Built-in test sets are available above. Create or import a custom set for your evaluations.':
        {
            zh: '上方可使用内置测试集。为你的评测创建或导入自定义测试集。',
            ja: '上に組み込みのテストセットがあります。評価用の独自セットを作成またはインポートしてください。'
        },
    'Template imported successfully.': {
        zh: '模板导入成功。',
        ja: 'テンプレートをインポートしました。'
    },
    'Failed to read a valid template file.': {
        zh: '无法读取有效的模板文件。',
        ja: '有効なテンプレートファイルを読み込めませんでした。'
    },
    Scoring: { zh: '评分', ja: '採点' },
    'No scoring': { zh: '不评分', ja: '採点なし' },
    'Exact match': { zh: '精确匹配', ja: '完全一致' },
    Contains: { zh: '包含', ja: '部分一致' },
    JSON: { zh: 'JSON', ja: 'JSON' },
    'Expected answer': { zh: '预期答案', ja: '期待する回答' },
    'Expected JSON value': { zh: '预期 JSON 值', ja: '期待する JSON 値' },
    Prompt: { zh: '提示词', ja: 'プロンプト' },
    'Move case up': { zh: '上移用例', ja: 'ケースを上へ移動' },
    'Move case down': { zh: '下移用例', ja: 'ケースを下へ移動' },
    'Remove case': { zh: '删除用例', ja: 'ケースを削除' },
    'An expected answer is required for the scoring rule.': {
        zh: '选择评分规则时必须提供预期答案。',
        ja: '採点ルールには期待する回答が必要です。'
    },
    'Contains scoring requires a non-empty expected answer.': {
        zh: '“包含”评分要求预期答案不能为空白。',
        ja: '「部分一致」の採点には空でない期待する回答が必要です。'
    },
    'The expected answer must be valid JSON.': {
        zh: '预期答案必须是合法的 JSON。',
        ja: '期待する回答は有効な JSON ではありません。'
    },
    'Please fix the highlighted cases before saving.': {
        zh: '保存前请先修正标出的问题用例。',
        ja: '保存する前に問題のあるケースを修正してください。'
    },
    'The file is not a valid test set.': {
        zh: '该文件不是有效的测试集。',
        ja: 'そのファイルは有効なテストセットではありません。'
    },
    Dismiss: { zh: '关闭', ja: '閉じる' },
    'Select responses to the same prompt before judging.': {
        zh: '请先选择同一提示词的回答再进行评审。',
        ja: '同じプロンプトへの回答を選択してから評価してください。'
    },
    'Judge returned invalid ratings.': {
        zh: '评审返回的评分无效。',
        ja: '評価モデルが無効な採点を返しました。'
    },
    'Judge request failed. Check provider settings and network access.': {
        zh: '评审请求失败，请检查供应商设置和网络连接。',
        ja: '評価リクエストに失敗しました。プロバイダー設定とネットワークを確認してください。'
    },
    'Judge request was cancelled': {
        zh: '评审请求已取消。',
        ja: '評価リクエストをキャンセルしました。'
    },
    Rule: { zh: '规则', ja: 'ルール' },
    Passed: { zh: '通过', ja: '合格' },
    'Rule evaluation: not evaluated': {
        zh: '规则评分：未评分',
        ja: 'ルール評価：未評価'
    },
    'AI judging': { zh: 'AI 评审', ja: 'AI 評価' },
    Accuracy: { zh: '准确性', ja: '正確性' },
    'Instruction following': { zh: '指令遵循', ja: '指示への適合' },
    Completeness: { zh: '完整性', ja: '完全性' },
    'Judging cost': { zh: '评审费用', ja: '評価費用' },
    'AI judging: not evaluated': {
        zh: 'AI 评审：未评分',
        ja: 'AI 評価：未評価'
    },
    'Time unknown': { zh: '时间未知', ja: '時刻不明' },
    'Scoring not applicable to this attempt': {
        zh: '本次尝试不适用评分',
        ja: 'この試行は採点対象外です'
    },
    'Rule scoring': { zh: '规则评分', ja: 'ルール採点' },
    'Known judging cost': { zh: '已知评审费用', ja: '既知の評価費用' },
    'priced calls': { zh: '费用已知的调用', ja: '費用が分かる呼び出し' },
    Scope: { zh: '范围', ja: '範囲' },
    'Estimated judge calls': { zh: '预计评审调用数', ja: '予定評価呼び出し数' },
    'Each group anonymously compares the latest completed answers of all chat models for one case, parameter group and repeat. Failed, cancelled and unfinished attempts are not scored; image models are excluded.':
        {
            zh: '每组匿名比较同一用例、参数组和重复轮次下所有文本模型的最新已完成回答。失败、取消和未完成的尝试不评分；图像模型不参与。',
            ja: '各グループでは、同じケース・パラメーターグループ・反復回の全チャットモデルの最新の完了回答を匿名で比較します。失敗・キャンセル・未完了の試行と画像モデルは対象外です。'
        },
    'Judge model': { zh: '评审模型', ja: '評価モデル' },
    'Select a chat model…': {
        zh: '选择文本模型…',
        ja: 'チャットモデルを選択…'
    },
    'Judge prompt': { zh: '评审提示词', ja: '評価プロンプト' },
    'Start scoring': { zh: '开始评分', ja: '採点を開始' },
    'Stop scoring': { zh: '停止评分', ja: '採点を停止' },
    'Another judging batch is running.': {
        zh: '另一个评审批次正在运行。',
        ja: '別の評価バッチが実行中です。'
    },
    'No completed answers in this scope yet.': {
        zh: '当前范围还没有已完成的回答。',
        ja: 'この範囲には完了した回答がまだありません。'
    },
    'Judging…': { zh: '评审中…', ja: '評価中…' },
    'Select an enabled chat model as the judge first.': {
        zh: '请先选择一个已启用的文本模型作为裁判。',
        ja: '有効なチャットモデルを評価モデルとして選択してください。'
    },
    'Judging stopped before group {index} of {total}: {reason}': {
        zh: '评审在第 {index}/{total} 组前停止：{reason}',
        ja: '全 {total} グループ中 {index} 番目の評価前に停止しました：{reason}'
    },
    'This experiment was deleted; judging stopped. Scores recorded so far were kept.':
        {
            zh: '此实验已删除，评审已停止。此前记录的评分已保留。',
            ja: '実験が削除されたため評価を停止しました。それまでの採点は保持されています。'
        },
    'Judging stopped. Scores recorded so far were kept.': {
        zh: '评审已停止，此前记录的评分已保留。',
        ja: '評価を停止しました。それまでの採点は保持されています。'
    },
    'Judging finished: {total} scored.': {
        zh: '评审完成：已评分 {total} 组。',
        ja: '評価完了：{total} グループを採点しました。'
    },
    'Text judging uses only completed chat responses.': {
        zh: '文本评审仅处理已完成的文本回答。',
        ja: 'テキスト評価は完了したチャット回答のみを対象にします。'
    },
    'Rule scoring is not applicable to image responses.': {
        zh: '图像回答不适用文本规则评分。',
        ja: '画像回答はテキストルール採点の対象外です。'
    },
    'AI judging is not applicable to image responses.': {
        zh: '图像回答不适用文本 AI 评审。',
        ja: '画像回答はテキスト AI 評価の対象外です。'
    },
    'Unknown rating source': { zh: '评分来源未知', ja: '採点元不明' },
    'Response is not valid JSON.': {
        zh: '回答不是合法的 JSON。',
        ja: '回答は有効な JSON ではありません。'
    },
    completed: { zh: '已完成', ja: '完了' },
    error: { zh: '失败', ja: '失敗' },
    'Rate {score} out of 5': {
        zh: '评为 {score}/5 分',
        ja: '5 点中 {score} 点を付ける'
    },
    'Stop All': { zh: '全部停止', ja: 'すべて停止' },
    'Running requests…': { zh: '请求运行中…', ja: 'リクエスト実行中…' },
    'Pending work': { zh: '待处理任务', ja: '保留中の処理' },
    'Summary JSON': { zh: '汇总 JSON', ja: '集計 JSON' },
    'Summary CSV': { zh: '汇总 CSV', ja: '集計 CSV' },
    'Raw requests JSON': { zh: '原始请求 JSON', ja: '生リクエスト JSON' },
    'Raw requests CSV': { zh: '原始请求 CSV', ja: '生リクエスト CSV' },
    'Markdown report': { zh: 'Markdown 报告', ja: 'Markdown レポート' },
    'Offline HTML report': {
        zh: '离线 HTML 报告',
        ja: 'オフライン HTML レポート'
    },
    'Shared reports omit prompts and responses by default.': {
        zh: '分享报告默认不包含提示词和回答正文。',
        ja: '共有レポートには、既定でプロンプトと回答本文を含めません。'
    },
    'Export raw requests': {
        zh: '导出原始请求',
        ja: '生リクエストをエクスポート'
    },
    'Raw requests contain user prompts and responses. API keys, private endpoint parts and telemetry metadata are never exported.':
        {
            zh: '原始请求包含用户提示词和回答。API 密钥、端点私密部分及遥测元数据始终不会导出。',
            ja: '生リクエストにはユーザーのプロンプトと回答が含まれます。API キー、非公開のエンドポイント部分、テレメトリのメタデータは常に除外されます。'
        },
    'The selection is captured when this confirmation opens.': {
        zh: '导出范围在打开此确认框时固定。',
        ja: 'この確認画面を開いた時点の選択範囲を使用します。'
    },
    'Include reasoning text': {
        zh: '包含思考文本',
        ja: '推論テキストを含める'
    },
    'Reasoning may contain additional sensitive content.': {
        zh: '思考文本可能包含额外敏感内容。',
        ja: '推論テキストには追加の機密情報が含まれる可能性があります。'
    },
    'Download raw requests': {
        zh: '下载原始请求',
        ja: '生リクエストをダウンロード'
    },
    'Statistics source': { zh: '统计来源', ja: '統計の対象' },
    'Arena statistics': { zh: '竞技场统计', ja: 'アリーナ統計' },
    'Experiment reports': { zh: '实验报告', ja: '実験レポート' },
    'Select experiment': { zh: '选择实验', ja: '実験を選択' },
    'Target parameter group': {
        zh: '目标参数组',
        ja: '対象パラメーターグループ'
    },
    'All parameter groups': {
        zh: '全部参数组',
        ja: 'すべてのパラメーターグループ'
    },
    'Baseline experiment': { zh: '基线实验', ja: 'ベースライン実験' },
    'No baseline': { zh: '不使用基线', ja: 'ベースラインなし' },
    'Baseline parameter group': {
        zh: '基线参数组',
        ja: 'ベースラインのパラメーターグループ'
    },
    'Choose baseline parameter group': {
        zh: '选择基线参数组',
        ja: 'ベースラインのグループを選択'
    },
    'This experiment is no longer available. Select another experiment.': {
        zh: '此实验已失效，请选择其他实验。',
        ja: 'この実験は利用できません。別の実験を選択してください。'
    },
    'Select an experiment to inspect frozen metrics, quality signals and request evidence.':
        {
            zh: '选择实验以查看冻结配置的指标、独立质量信号和请求证据。',
            ja: '実験を選択して、固定された設定の指標、品質評価、リクエストの根拠を確認してください。'
        },
    'This parameter group is no longer available. Select another group.': {
        zh: '此参数组已失效，请选择其他参数组。',
        ja: 'このパラメーターグループは利用できません。別のグループを選択してください。'
    },
    'The selected baseline is no longer available.': {
        zh: '所选基线实验已失效。',
        ja: '選択したベースライン実験は利用できません。'
    },
    'View experiment': { zh: '查看实验', ja: '実験を表示' },
    'View report': { zh: '查看报告', ja: 'レポートを表示' },
    'Frozen configuration': { zh: '冻结配置', ja: '固定された設定' },
    Concurrency: { zh: '并发数', ja: '同時実行数' },
    Cases: { zh: '用例数', ja: 'ケース数' },
    'TTFT distribution (ms)': {
        zh: '首字延迟分布（毫秒）',
        ja: '最初のトークンまでの時間分布（ms）'
    },
    'Duration distribution (ms)': {
        zh: '总时长分布（毫秒）',
        ja: '総所要時間の分布（ms）'
    },
    'View chart data': { zh: '查看图表数据', ja: 'グラフのデータを表示' },
    'Range (ms)': { zh: '区间（毫秒）', ja: '範囲（ms）' },
    'Quality versus known cost': {
        zh: '质量与已知费用',
        ja: '品質と既知の費用'
    },
    'Quality dimension': { zh: '质量维度', ja: '品質の評価軸' },
    'AI accuracy': { zh: 'AI 准确性', ja: 'AI の正確性' },
    'Human stars': { zh: '人工星级', ja: '人による星評価' },
    'Rule pass rate': { zh: '规则通过率', ja: 'ルール合格率' },
    'Only groups with the selected quality signal and known generation cost are plotted. Missing signals do not fall back to another score.':
        {
            zh: '仅绘制具有所选质量信号且生成费用已知的参数组。缺失信号不会自动改用其他评分。',
            ja: '選択した品質評価と既知の生成費用があるグループのみを表示します。評価がない場合、別のスコアで補いません。'
        },
    'Mean known generation cost (USD)': {
        zh: '已知生成费用均值（USD）',
        ja: '既知の生成費用の平均（USD）'
    },
    'Estimated TPS samples': { zh: '估算 TPS 样本', ja: '推定 TPS サンプル' },
    'Model / parameter group': {
        zh: '模型 / 参数组',
        ja: 'モデル / パラメーターグループ'
    },
    'Priced samples': { zh: '费用已知样本', ja: '費用が分かるサンプル' },
    'AI dimensions and human stars': {
        zh: 'AI 各维度与人工星级',
        ja: 'AI の評価軸と人による星評価'
    },
    'AI samples': { zh: 'AI 评分样本', ja: 'AI 評価サンプル' },
    'Human samples': { zh: '人工评分样本', ja: '人による評価サンプル' },
    'The metric table below contains the same quality values and sample counts. Signals are not combined into a capability score.':
        {
            zh: '下方指标表列出相同的质量数值和样本数。各信号不合并为综合能力分。',
            ja: '下の指標表に同じ品質値とサンプル数を示します。各評価を総合能力スコアにはまとめません。'
        },
    'Only evaluated completed text answers enter the rule denominator.': {
        zh: '规则通过率的分母仅包含已进行规则评分的已完成文本回答。',
        ja: 'ルール合格率の分母には、ルール評価済みの完了したテキスト回答のみを含めます。'
    },
    'Planned tasks (entire run)': {
        zh: '计划任务（全实验）',
        ja: '予定タスク（実験全体）'
    },
    'Selected tasks': { zh: '所选任务', ja: '選択したタスク' },
    'Executed tasks': { zh: '已执行任务', ja: '実行済みタスク' },
    'Recorded attempts': { zh: '已记录尝试', ja: '記録された試行' },
    'Historical failed attempts': { zh: '历史失败尝试', ja: '過去の失敗試行' },
    'Retried tasks': { zh: '已重试任务', ja: '再試行したタスク' },
    'Known generation cost (latest attempts)': {
        zh: '已知生成费用（最新尝试）',
        ja: '既知の生成費用（最新の試行）'
    },
    'Known cost (all attempts)': {
        zh: '已知费用（全部尝试）',
        ja: '既知の費用（すべての試行）'
    },
    'Retained judging cost': {
        zh: '保留评分的评审费用',
        ja: '保持されている評価の費用'
    },
    '{count} distinct priced judge calls': {
        zh: '{count} 次费用已知的独立评审调用',
        ja: '費用が分かる重複のない評価呼び出し {count} 回'
    },
    'Primary metrics use only the latest attempt of each trial. Failed and cancelled attempts do not enter performance or quality averages. Unknown cost is not zero; retained judging cost is not a lifetime bill.':
        {
            zh: '主指标仅使用每个试验的最新尝试。失败和取消不计入性能或质量均值。未知费用不等于零；保留评分的评审费用不代表累计账单。',
            ja: '主要指標には各評価単位の最新の試行のみを使用します。失敗・キャンセルは性能と品質の平均から除外します。不明な費用はゼロではなく、保持されている評価の費用は累計請求額ではありません。'
        },
    'Experiment metric comparison': {
        zh: '实验指标对比',
        ja: '実験指標の比較'
    },
    'Mixed TPS includes API, estimated and unknown-source samples. Quality signals retain separate denominators; missing samples are shown as unknown.':
        {
            zh: '混合 TPS 包含 API、估算和来源未知的样本。各质量信号保留独立分母；缺失样本显示为未知。',
            ja: '混合 TPS には API・推定・出所不明のサンプルが含まれます。品質評価の分母はそれぞれ独立し、サンプルがない値は不明として表示します。'
        },
    'Completed / executed': { zh: '完成 / 已执行', ja: '完了 / 実行済み' },
    'Mean TTFT (ms)': {
        zh: '首字延迟均值（毫秒）',
        ja: '最初のトークンまでの平均時間（ms）'
    },
    'Median / P95 TTFT (ms)': {
        zh: '首字延迟中位数 / P95（毫秒）',
        ja: '最初のトークンまでの時間の中央値 / P95（ms）'
    },
    'Mean duration (ms)': {
        zh: '总时长均值（毫秒）',
        ja: '平均総所要時間（ms）'
    },
    'Median / P95 duration (ms)': {
        zh: '总时长中位数 / P95（毫秒）',
        ja: '総所要時間の中央値 / P95（ms）'
    },
    'Mixed TPS': { zh: '混合 TPS', ja: '混合 TPS' },
    'API TPS': { zh: 'API TPS', ja: 'API TPS' },
    'Estimated TPS': { zh: '估算 TPS', ja: '推定 TPS' },
    'Unknown-source TPS samples': {
        zh: '来源未知的 TPS 样本',
        ja: '出所不明の TPS サンプル'
    },
    'Input / output tokens': {
        zh: '输入 / 输出 Token',
        ja: '入力 / 出力トークン'
    },
    'Known generation cost (USD)': {
        zh: '已知生成费用（USD）',
        ja: '既知の生成費用（USD）'
    },
    'AI instruction following': { zh: 'AI 指令遵循', ja: 'AI の指示への適合' },
    'AI completeness': { zh: 'AI 完整性', ja: 'AI の完全性' },
    'Repeated-trial stability': {
        zh: '重复试验稳定性',
        ja: '反復評価の安定性'
    },
    'Each row is one case, model and parameter group across repetitions. Standard deviation uses n−1 and is unknown for n<2. TPS stability uses API measurements only, not estimates or cross-question variation.':
        {
            zh: '每行对应同一用例、模型和参数组的多次重复。标准差使用 n−1，n<2 时未知。TPS 稳定性仅使用 API 实测，不混入估算或跨题目差异。',
            ja: '各行は同じケース・モデル・グループの反復評価です。標準偏差は n−1 を使用し、n<2 では不明です。TPS の安定性には API 実測のみを使用し、推定値や異なる問題のばらつきは含めません。'
        },
    'Case / model / parameter group': {
        zh: '用例 / 模型 / 参数组',
        ja: 'ケース / モデル / グループ'
    },
    Metric: { zh: '指标', ja: '指標' },
    Mean: { zh: '均值', ja: '平均' },
    'Sample standard deviation': { zh: '样本标准差', ja: '標本標準偏差' },
    'Duration (ms)': { zh: '总时长（毫秒）', ja: '総所要時間（ms）' },
    'Explicit baseline comparison': {
        zh: '显式基线对比',
        ja: '明示的なベースライン比較'
    },
    Baseline: { zh: '基线', ja: 'ベースライン' },
    Target: { zh: '目标', ja: '対象' },
    'Choose one parameter group on each side to compare.': {
        zh: '请选择两侧各一个参数组进行对比。',
        ja: '比較するには、両側でパラメーターグループを一つずつ選択してください。'
    },
    'Different test sets: results are shown side by side, without improvement claims.':
        {
            zh: '测试集不同：仅并列展示，不报告改善。',
            ja: 'テストセットが異なります。結果は並列表示し、改善とは解釈しません。'
        },
    'Ambiguous model identity: duplicate model identities cannot be aligned.': {
        zh: '模型身份有歧义：重复身份无法正确对齐。',
        ja: 'モデルの識別が曖昧です。重複する識別情報は対応付けできません。'
    },
    'No matching model identities and endpoints. Results cannot be directly compared.':
        {
            zh: '没有匹配的模型身份和端点，不能直接比较结果。',
            ja: '一致するモデル識別情報とエンドポイントがないため、結果を直接比較できません。'
        },
    'Differences are target minus baseline. Relative differences require a positive baseline. Repetition, concurrency and parameter changes are reported, not normalized or interpreted as causal effects.':
        {
            zh: '差值为目标减基线；相对差要求基线大于零。重复数、并发和参数变化逐项报告，不偷偷归一或宣称因果。',
            ja: '差分は対象値からベースライン値を引いたものです。相対差分には正のベースラインが必要です。反復数・同時実行数・設定の差を報告し、正規化や因果効果の解釈は行いません。'
        },
    'Baseline metric differences': {
        zh: '基线指标差异',
        ja: 'ベースラインとの差分'
    },
    'P95 TTFT (ms)': {
        zh: 'P95 首字延迟（毫秒）',
        ja: 'P95 最初のトークンまでの時間（ms）'
    },
    'Absolute difference': { zh: '绝对差值', ja: '絶対差分' },
    'Relative difference': { zh: '相对差值', ja: '相対差分' },
    'Baseline side-by-side metrics': {
        zh: '基线并列指标',
        ja: 'ベースラインの並列指標'
    },
    'Frozen experiment manifest': {
        zh: '冻结实验清单',
        ja: '固定された実験マニフェスト'
    },
    'Endpoint unknown': { zh: '端点未知', ja: 'エンドポイント不明' },
    'Clear arena history': { zh: '清空竞技场历史', ja: 'アリーナの履歴を消去' },
    queued: { zh: '排队中', ja: '待機中' },
    running: { zh: '运行中', ja: '実行中' },
    paused: { zh: '已暂停', ja: '一時停止' },
    interrupted: { zh: '已中断', ja: '中断' },
    'Parameter groups': { zh: '参数组', ja: 'パラメーターグループ' },
    'Estimated token measurements': {
        zh: '估算 Token 测量',
        ja: '推定トークン計測'
    }
} as const
