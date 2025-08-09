#!/usr/bin/env node

const { program } = require('commander');
const {
  loadConfig,
  DEFAULT_CONFIG,
  mergeOptions,
  normalizeStatsData
} = require('./src/config');
const {
  buildStatsDataRequest,
  fetchApiData,
  extractCategoryInfo,
  extractLatestData
} = require('./src/api');
const {
  createTimestampFolder,
  saveDataToFile,
  saveLatestDataSummary
} = require('./src/io');
const {
  printResults,
  printLatestData
} = require('./src/data');

// コマンドラインインターフェースを設定
program
  .name('cocoa-estat')
  .description('指定された自治体のe-Stat APIから統計データを取得するコマンドラインツール')
  .version('1.0.0')
  .requiredOption('-a, --appId <id>', 'e-Stat API アプリケーションID')
  .requiredOption('-m, --municipalityId <id>', '自治体ID（地域コード）')
  .option('-o, --output <dir>', '出力ディレクトリのベースパス（デフォルト: ./output）')
  .option('-c, --config <file>', '設定ファイルのパス')
  .option('--latest <file>', '最新データのみを指定ファイルに出力')
  .parse(process.argv);

// メイン関数
async function main() {
  try {
    const cmdOptions = program.opts();
    const fileConfig = loadConfig(cmdOptions.config);
    const options = mergeOptions(DEFAULT_CONFIG, fileConfig, cmdOptions);
    const statsDataList = normalizeStatsData(options);

    console.log('e-Stat APIの準備をしています...✨');
    console.log(`アプリID: ${options.appId}`);
    console.log(`自治体ID: ${options.municipalityId}`);
    console.log(`取得する統計データ数: ${statsDataList.length}件`);

    const results = [];
    for (const statsData of statsDataList) {
      console.log(`\n統計データID「${statsData.statsId}」の取得を開始します...✨`);
      const requestInfo = buildStatsDataRequest({ ...options, ...statsData });
      const data = await fetchApiData(requestInfo);
      results.push(data);

      const categoryInfo = extractCategoryInfo(data);
      if (categoryInfo) {
        console.log(`✅ カテゴリー「${categoryInfo.name}」のデータを取得しました！`);
        if (categoryInfo.classes?.length) {
          console.log(`   データ項目: ${categoryInfo.classes.map(c => c.name).join(', ')}`);
        }
      }
      console.log(`統計データID「${statsData.statsId}」の取得が完了しました！`);
    }

    printResults(results);

    const outputFolder = createTimestampFolder(options.output || './output');
    saveDataToFile(outputFolder, 'result.json', results); // auto JSON stringify inside helper

    const latestDataList = results.map(extractLatestData);
    saveDataToFile(outputFolder, 'latest.json', latestDataList);
    saveLatestDataSummary(latestDataList, outputFolder);

    printLatestData(latestDataList);

    console.log(`\n✅ すべての処理が完了しました！出力フォルダ: ${outputFolder}`);
  } catch (error) {
    console.error('エラー発生しちゃいました💦:', error.message);
    process.exit(1);
  }
}

// メイン関数を実行
main();
