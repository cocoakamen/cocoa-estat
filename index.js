#!/usr/bin/env node

const axios = require('axios');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

// APIのベースURL
const API_BASE_URL = 'https://api.e-stat.go.jp/rest/3.0/app/json';

// コマンドラインインターフェースを設定
program
  .name('cocoa-estat')
  .description('指定された自治体のe-Stat APIから統計データを取得するコマンドラインツール')
  .version('1.0.0')
  .requiredOption('-a, --appId <id>', 'e-Stat API アプリケーションID')
  .requiredOption('-m, --municipalityId <id>', '自治体ID（地域コード）')
  .option('-s, --statsId <id>', '統計データID（複数指定する場合はカンマ区切り）')
  .option('-o, --output <file>', '出力ファイルパス（指定がなければコンソールに出力）')
  .option('-c, --config <file>', '設定ファイルのパス')
  .option('--latest <file>', '最新データのみを指定ファイルに出力')
  .parse(process.argv);

// オプションを取得
const cmdOptions = program.opts();

// 設定ファイルを読み込む関数
function loadConfig(configPath) {
  try {
    if (!configPath) {
      // デフォルトのパスをチェック
      const defaultPath = path.join(process.cwd(), 'cocoa-estat.config.js');
      
      if (fs.existsSync(defaultPath)) {
        configPath = defaultPath;
      }
    }

    if (!configPath || !fs.existsSync(configPath)) {
      return {};
    }

    console.log(`設定ファイルを読み込み中: ${configPath} ✨`);
    
    // JSファイルを直接requireする
    try {
      // パスが相対パスの場合、絶対パスに変換
      if (!path.isAbsolute(configPath)) {
        configPath = path.resolve(process.cwd(), configPath);
      }
      
      // キャッシュをクリアしてrequireする（開発中に何度も読み込む場合に便利）
      delete require.cache[require.resolve(configPath)];
      return require(configPath);
    } catch (requireError) {
      console.error(`設定ファイルのロード中にエラーが発生しました💦: ${requireError.message}`);
      return {};
    }
  } catch (error) {
    console.error(`設定ファイルの読み込み中にエラーが発生しました💦: ${error.message}`);
    return {};
  }
}

// デフォルト設定
const DEFAULT_CONFIG = {
  format: 'json',
  metaGetFlg: 'Y',
  cntGetFlg: 'N',
  lang: 'J'
};

// 設定をマージ
const fileConfig = loadConfig(cmdOptions.config);
const options = {
  ...DEFAULT_CONFIG,
  ...fileConfig,
  ...cmdOptions
};

// statsIdがカンマ区切りの文字列の場合、配列に変換
if (typeof options.statsId === 'string' && options.statsId.includes(',')) {
  options.statsId = options.statsId.split(',').map(id => id.trim());
}

/**
 * 統計データの設定を正規化して配列形式に変換
 * @returns {Array} 統計データ設定の配列
 */
function normalizeStatsData() {
  // statsDataが既に定義されている場合はそれを使用
  if (Array.isArray(options.statsData)) {
    return options.statsData;
  }
  
  // 単一または配列形式のstatsIdから統計データ設定を構築
  const statsIds = Array.isArray(options.statsId) ? options.statsId : [options.statsId];
  
  return statsIds.map(statsId => ({
    statsId,
    cdCat01: options.cdCat01,
    cdTimeFrom: options.cdTimeFrom
  }));
}

/**
 * getStatsDataのリクエストURLとパラメータを生成
 * @param {Object} params - APIリクエストパラメータ
 * @returns {Object} URL情報とクエリパラメータ
 */
function buildStatsDataRequest(params) {
  return {
    url: `${API_BASE_URL}/getStatsData`,
    params: {
      appId: params.appId,
      statsDataId: params.statsId,
      cdArea: params.municipalityId,
      metaGetFlg: params.metaGetFlg || 'Y',
      cntGetFlg: params.cntGetFlg || 'N',
      lang: params.lang || 'J',
      cdCat01: params.cdCat01 || '',
      cdTimeFrom: params.cdTimeFrom || '',
      // 他のオプションパラメータもここに追加可能
    }
  };
}

/**
 * APIからJSONデータを取得
 * @param {Object} requestInfo - リクエスト情報
 * @returns {Promise<Object>} レスポンスデータ
 */
async function fetchApiData(requestInfo) {
  try {
    console.log(`APIリクエスト送信中...💌 URL: ${requestInfo.url}`);
    console.log('パラメータ:', requestInfo.params);
    
    const response = await axios.get(requestInfo.url, { params: requestInfo.params });
    
    // レスポンスのステータスチェック
    if (response.data && response.data.GET_STATS_DATA) {
      const result = response.data.GET_STATS_DATA.RESULT;
      if (result && result.STATUS !== 0) {
        throw new Error(`APIエラー: ${result.ERROR_MSG}`);
      }
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('APIレスポンスエラー:', error.response.data);
    }
    throw error;
  }
}

/**
 * 最新のデータ（timeが最大のもの）のみを抽出
 * @param {Object} data - e-Stat APIのレスポンスデータ
 * @returns {Object} 最新データのみを含むオブジェクト
 */
function extractLatestData(data) {
  // データの深いコピーを作成
  const latestData = JSON.parse(JSON.stringify(data));
  
  // DATA_INFがない場合は元のデータを返す
  if (!latestData.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE) {
    return latestData;
  }
  
  const values = latestData.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE;
  
  // 配列でない場合は処理不要
  if (!Array.isArray(values)) {
    return latestData;
  }
  
  // timeの値で降順ソート
  values.sort((a, b) => {
    return Number(b['@time']) - Number(a['@time']);
  });
  
  // 最初の要素（最新）のみを保持
  latestData.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE = [values[0]];
  
  // RESULT_INFの値も更新
  if (latestData.GET_STATS_DATA.STATISTICAL_DATA.RESULT_INF) {
    latestData.GET_STATS_DATA.STATISTICAL_DATA.RESULT_INF.TOTAL_NUMBER = 1;
    latestData.GET_STATS_DATA.STATISTICAL_DATA.RESULT_INF.FROM_NUMBER = 1;
    latestData.GET_STATS_DATA.STATISTICAL_DATA.RESULT_INF.TO_NUMBER = 1;
  }
  
  return latestData;
}

/**
 * データからカテゴリー名を抽出する
 * @param {Object} data - e-Stat APIのレスポンスデータ
 * @returns {Object} カテゴリー情報
 */
function extractCategoryInfo(data) {
  try {
    if (!data.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ) {
      return null;
    }
    
    const classObjs = data.GET_STATS_DATA.STATISTICAL_DATA.CLASS_INF.CLASS_OBJ;
    const catObj = Array.isArray(classObjs) 
      ? classObjs.find(obj => obj['@id'] === 'cat01')
      : classObjs['@id'] === 'cat01' ? classObjs : null;
    
    if (!catObj) return null;
    
    const categoryInfo = {
      id: catObj['@id'],
      name: catObj['@name']
    };
    
    // CLASSオブジェクトを取得
    const classData = catObj.CLASS;
    if (classData) {
      if (Array.isArray(classData)) {
        categoryInfo.classes = classData.map(cls => ({
          code: cls['@code'],
          name: cls['@name'],
          level: cls['@level'],
          unit: cls['@unit']
        }));
      } else {
        categoryInfo.classes = [{
          code: classData['@code'],
          name: classData['@name'],
          level: classData['@level'],
          unit: classData['@unit']
        }];
      }
    }
    
    return categoryInfo;
  } catch (error) {
    console.error('カテゴリー情報の抽出中にエラーが発生しました💦:', error.message);
    return null;
  }
}

/**
 * 結果をコンソールに表示
 * @param {Array} results - 取得したデータの配列
 */
function printResults(results) {
  console.log('\n📊 取得データ情報:');
  
  results.forEach((data, index) => {
    const statsData = data.GET_STATS_DATA;
    if (!statsData) return;
    
    console.log(`\n📈 データセット ${index + 1}:`);
    
    // 統計表情報
    const tableInfo = statsData.STATISTICAL_DATA?.TABLE_INF;
    if (tableInfo) {
      console.log(`- 統計ID: ${tableInfo['@id'] || 'N/A'}`);
      console.log(`- 統計名: ${tableInfo.STATISTICS_NAME || 'N/A'}`);
      console.log(`- タイトル: ${tableInfo.TITLE?.$|| 'N/A'}`);
      
      // カテゴリー情報も表示
      const mainCategory = tableInfo.MAIN_CATEGORY?.$|| 'N/A';
      const subCategory = tableInfo.SUB_CATEGORY?.$|| 'N/A';
      console.log(`- 主カテゴリー: ${mainCategory}`);
      console.log(`- 副カテゴリー: ${subCategory}`);
      
      // 追加の詳細情報があれば表示
      if (tableInfo.STATISTICS_NAME_SPEC) {
        const tabulationCategory = tableInfo.STATISTICS_NAME_SPEC.TABULATION_CATEGORY || 'N/A';
        console.log(`- 集計カテゴリー: ${tabulationCategory}`);
      }
    }
    
    // カテゴリー情報を抽出して表示
    const categoryInfo = extractCategoryInfo(data);
    if (categoryInfo) {
      console.log(`\n🏷️ カテゴリー情報:`);
      console.log(`- カテゴリーID: ${categoryInfo.id}`);
      console.log(`- カテゴリー名: ${categoryInfo.name}`);
      
      if (categoryInfo.classes) {
        console.log('\n📋 カテゴリークラス:');
        categoryInfo.classes.forEach(cls => {
          console.log(`  • コード: ${cls.code}`);
          console.log(`    名前: ${cls.name}`);
          console.log(`    単位: ${cls.unit || '指定なし'}`);
        });
      }
    }
    
    // データの件数を表示
    const valueCount = statsData.STATISTICAL_DATA?.DATA_INF?.VALUE?.length || 0;
    console.log(`\n- データ件数: ${valueCount}件`);
  });
}

// 現在のタイムスタンプを含むファイル名を生成
function generateTimestampFilename(prefix = '', extension = 'txt') {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:-]/g, '')  // コロンとハイフンを削除
    .replace(/\..+$/, '')   // ミリ秒部分を削除
    .replace('T', '-');     // Tをハイフンに置換
  
  return `${prefix}${timestamp}.${extension}`;
}

/**
 * 最新データ情報をテキストファイルに出力
 * @param {Array} latestDataList - 最新データのリスト
 */
function saveLatestDataSummary(latestDataList) {
  try {
    // タイムスタンプを含むファイル名を生成
    const filename = generateTimestampFilename('dataset-', 'txt');
    
    let content = '📊 最新データ情報:\n';
    
    latestDataList.forEach((latestData, index) => {
      if (latestData.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE?.[0]) {
        const latestValue = latestData.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE[0];
        const tableInfo = latestData.GET_STATS_DATA?.STATISTICAL_DATA?.TABLE_INF;
        const statId = tableInfo?.['@id'] || 'N/A';
        
        content += `\n📈 データセット ${index + 1}:\n`;
        content += `- 統計ID: ${statId}\n`;
        content += `- 統計名: ${tableInfo?.STATISTICS_NAME || 'N/A'}\n`;
        
        // カテゴリー情報を追加
        if (tableInfo) {
          const mainCategory = tableInfo.MAIN_CATEGORY?.$|| 'N/A';
          const subCategory = tableInfo.SUB_CATEGORY?.$|| 'N/A';
          content += `- 主カテゴリー: ${mainCategory}\n`;
          content += `- 副カテゴリー: ${subCategory}\n`;
        }
        
        // 取得データのカテゴリー情報を表示
        const categoryInfo = extractCategoryInfo(latestData);
        if (categoryInfo && categoryInfo.classes && categoryInfo.classes.length > 0) {
          const catClass = categoryInfo.classes[0];
          content += `- データ項目: ${catClass.name} (${catClass.unit || '単位なし'})\n`;
        }
        
        // 時間情報の取得
        let timeName = latestValue['@time'];
        // CLASS_INFから時間名を取得
        const timeClasses = latestData.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ?.find(obj => obj['@id'] === 'time')?.CLASS;
        if (timeClasses) {
          const timeClass = Array.isArray(timeClasses) 
            ? timeClasses.find(c => c['@code'] === latestValue['@time']) 
            : timeClasses['@code'] === latestValue['@time'] ? timeClasses : null;
          
          if (timeClass) {
            timeName = timeClass['@name'] || timeName;
          }
        }
        
        content += `- 時点: ${timeName}\n`;
        content += `- 値: ${latestValue['$']} ${latestValue['@unit'] || ''}\n`;
      }
    });
    
    fs.writeFileSync(filename, content);
    console.log(`最新データの要約を ${filename} に保存しました📝✨`);
    return filename;
  } catch (error) {
    console.error(`最新データの要約保存中にエラーが発生しました💦: ${error.message}`);
    return null;
  }
}

// メイン関数
async function main() {
  try {
    console.log('e-Stat APIの準備をしています...✨');
    console.log(`アプリID: ${options.appId}`);
    console.log(`自治体ID: ${options.municipalityId}`);
    
    // 統計データの設定を取得
    const statsDataList = normalizeStatsData();
    
    if (statsDataList.length === 0) {
      console.log('統計データIDが指定されていません。統計データ一覧を取得する機能はこれから実装します💪');
      return;
    }
    
    console.log(`取得する統計データ数: ${statsDataList.length}件`);
    
    // すべての統計データを取得
    const results = [];
    for (const statsData of statsDataList) {
      console.log(`\n統計データID「${statsData.statsId}」の取得を開始します...✨`);
      
      // リクエスト情報を構築
      const requestInfo = buildStatsDataRequest({
        ...options,
        ...statsData
      });
      
      // APIからデータを取得
      const data = await fetchApiData(requestInfo);
      results.push(data);
      
      // カテゴリー情報を表示
      const categoryInfo = extractCategoryInfo(data);
      if (categoryInfo) {
        console.log(`✅ カテゴリー「${categoryInfo.name}」のデータを取得しました！`);
        if (categoryInfo.classes && categoryInfo.classes.length > 0) {
          console.log(`   データ項目: ${categoryInfo.classes.map(cls => cls.name).join(', ')}`);
        }
      }
      
      console.log(`統計データID「${statsData.statsId}」の取得が完了しました！`);
    }
    
    // 結果の詳細を表示
    printResults(results);
    
    // 結果を処理
    const formattedData = JSON.stringify(results, null, 2);
    
    // 出力処理
    if (options.output) {
      fs.writeFileSync(options.output, formattedData);
      console.log(`データを ${options.output} に保存しました💾`);
    } else {
      console.log('取得したデータ:');
      console.log(formattedData);
    }
    
    // 最新データのみを別ファイルに出力
    if (options.latest) {
      // 各統計データの最新情報を抽出
      const latestDataList = results.map(data => extractLatestData(data));
      const latestFormattedData = JSON.stringify(latestDataList, null, 2);
      fs.writeFileSync(options.latest, latestFormattedData);
      console.log(`最新データを ${options.latest} に保存しました✨`);
      
      // 各統計データの最新情報を表示
      console.log('\n📊 最新データ情報:');
      latestDataList.forEach((latestData, index) => {
        if (latestData.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE?.[0]) {
          const latestValue = latestData.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE[0];
          const tableInfo = latestData.GET_STATS_DATA?.STATISTICAL_DATA?.TABLE_INF;
          const statId = tableInfo?.['@id'] || 'N/A';
          
          console.log(`\n📈 データセット ${index + 1}:`);
          console.log(`- 統計ID: ${statId}`);
          console.log(`- 統計名: ${tableInfo?.STATISTICS_NAME || 'N/A'}`);
          
          // カテゴリー情報を追加
          if (tableInfo) {
            const mainCategory = tableInfo.MAIN_CATEGORY?.$|| 'N/A';
            const subCategory = tableInfo.SUB_CATEGORY?.$|| 'N/A';
            console.log(`- 主カテゴリー: ${mainCategory}`);
            console.log(`- 副カテゴリー: ${subCategory}`);
          }
          
          // 取得データのカテゴリー情報を表示
          const categoryInfo = extractCategoryInfo(latestData);
          if (categoryInfo && categoryInfo.classes && categoryInfo.classes.length > 0) {
            const catClass = categoryInfo.classes[0];
            console.log(`- データ項目: ${catClass.name} (${catClass.unit || '単位なし'})`);
          }
          
          // 時間情報の取得
          let timeName = latestValue['@time'];
          // CLASS_INFから時間名を取得
          const timeClasses = latestData.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ?.find(obj => obj['@id'] === 'time')?.CLASS;
          if (timeClasses) {
            const timeClass = Array.isArray(timeClasses) 
              ? timeClasses.find(c => c['@code'] === latestValue['@time']) 
              : timeClasses['@code'] === latestValue['@time'] ? timeClasses : null;
            
            if (timeClass) {
              timeName = timeClass['@name'] || timeName;
            }
          }
          
          console.log(`- 時点: ${timeName}`);
          console.log(`- 値: ${latestValue['$']} ${latestValue['@unit'] || ''}`);
        }
      });
      
      // 最新データの要約をテキストファイルに保存
      const summaryFilename = saveLatestDataSummary(latestDataList);
    }
    
  } catch (error) {
    console.error('エラー発生しちゃいました💦:', error.message);
    process.exit(1);
  }
}

// メイン関数を実行
main();
