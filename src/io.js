const fs = require('fs');
const path = require('path');
const { extractCategoryInfo } = require('./api');

function createTimestampFolder(baseDir = './output') {
  try {
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    const timestamp = new Date().toISOString()
      .replace(/[:-]/g, '')
      .replace(/\..+$/, '')
      .replace('T', '-');
    const folderPath = path.join(baseDir, `data-${timestamp}`);
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`出力フォルダを作成しました✨: ${folderPath}`);
    return folderPath;
  } catch (e) {
    console.error(`フォルダ作成中にエラーが発生しました💦: ${e.message}`);
    return baseDir;
  }
}

function saveDataToFile(folderPath, fileName, data, isJson = true) {
  try {
    const filePath = path.join(folderPath, fileName);
    const content = isJson ? JSON.stringify(data, null, 2) : data;
    fs.writeFileSync(filePath, content);
    console.log(`データを ${filePath} に保存しました💾`);
    return filePath;
  } catch (e) {
    console.error(`ファイル保存中にエラーが発生しました💦: ${e.message}`);
    return null;
  }
}

function saveLatestDataSummary(latestDataList, folderPath) {
  try {
    let content = '📊 最新データ情報:\n';
    // area info
    if (latestDataList.length) {
      const classObjs = latestDataList[0].GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ;
      const areaObj = Array.isArray(classObjs)
        ? classObjs.find(o => o['@id'] === 'area')
        : (classObjs?.['@id'] === 'area' ? classObjs : null);
      if (areaObj?.CLASS) {
        const a = areaObj.CLASS;
        content += '\n🏙️ 地域情報:\n';
        content += `- コード: ${a['@code'] || 'N/A'}\n`;
        content += `- 名称: ${a['@name'] || 'N/A'}\n`;
        content += `- レベル: ${a['@level'] || 'N/A'}\n`;
        if (a['@parentCode']) content += `- 親コード: ${a['@parentCode']}\n`;
        content += '\n';
      }
    }
    latestDataList.forEach((ld, i) => {
      const val = ld.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE?.[0];
      if (!val) return;
      const tableInfo = ld.GET_STATS_DATA.STATISTICAL_DATA.TABLE_INF;
      content += `\n📈 データセット ${i + 1}:\n`;
      content += `- 統計ID: ${tableInfo?.['@id'] || 'N/A'}\n`;
      content += `- 統計名: ${tableInfo?.STATISTICS_NAME || 'N/A'}\n`;
      content += `- 主カテゴリー: ${tableInfo?.MAIN_CATEGORY?.$ || 'N/A'}\n`;
      content += `- 副カテゴリー: ${tableInfo?.SUB_CATEGORY?.$ || 'N/A'}\n`;
      const catInfo = extractCategoryInfo(ld);
      if (catInfo?.classes?.length) {
        const c = catInfo.classes[0];
        content += `- データ項目: ${c.name} (${c.unit || '単位なし'})\n`;
      }
      // time name
      let timeName = val['@time'];
      const timeClasses = ld.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ
        ?.find(o => o['@id'] === 'time')?.CLASS;
      if (timeClasses) {
        const timeClass = Array.isArray(timeClasses)
          ? timeClasses.find(c => c['@code'] === val['@time'])
          : (timeClasses['@code'] === val['@time'] ? timeClasses : null);
        if (timeClass) timeName = timeClass['@name'] || timeName;
      }
      content += `- 時点: ${timeName}\n`;
      content += `- 値: ${val['$']} ${val['@unit'] || ''}\n`;
    });
    return saveDataToFile(folderPath, 'summary.txt', content, false);
  } catch (e) {
    console.error(`最新データの要約保存中にエラーが発生しました💦: ${e.message}`);
    return null;
  }
}

module.exports = {
  createTimestampFolder,
  saveDataToFile,
  saveLatestDataSummary
};
