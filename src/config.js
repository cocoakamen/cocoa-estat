const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  format: 'json',
  metaGetFlg: 'Y',
  cntGetFlg: 'N',
  lang: 'J'
};

function loadConfig(configPath) {
  try {
    if (!configPath) {
      const defaultPath = path.join(process.cwd(), 'cocoa-estat.config.js');
      if (fs.existsSync(defaultPath)) configPath = defaultPath;
    }
    if (!configPath || !fs.existsSync(configPath)) return {};
    console.log(`設定ファイルを読み込み中: ${configPath} ✨`);
    if (!path.isAbsolute(configPath)) {
      configPath = path.resolve(process.cwd(), configPath);
    }
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
  } catch (e) {
    console.error(`設定ファイルの読み込み中にエラーが発生しました💦: ${e.message}`);
    return {};
  }
}

function mergeOptions(defaults, fileConfig, cmdOptions) {
  const merged = {
    ...defaults,
    ...fileConfig,
    ...cmdOptions
  };
  if (typeof merged.statsId === 'string' && merged.statsId.includes(',')) {
    merged.statsId = merged.statsId.split(',').map(s => s.trim());
  }
  return merged;
}

function normalizeStatsData(options) {
  if (Array.isArray(options.statsData) && options.statsData.length > 0) return options.statsData;
  console.error('エラー: 統計データが指定されていません💦');
  console.error('設定ファイル（cocoa-estat.config.js）に、取得したい統計データIDを指定してください');
  console.error('例: module.exports = { statsData: [{ statsId: "00200502" }] }');
  process.exit(1);
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  mergeOptions,
  normalizeStatsData
};
