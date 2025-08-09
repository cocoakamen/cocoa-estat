const { extractCategoryInfo } = require('./api');

function printResults(results) {
  console.log('\n📊 取得データ情報:');
  results.forEach((data, i) => {
    const statsData = data.GET_STATS_DATA;
    if (!statsData) return;
    console.log(`\n📈 データセット ${i + 1}:`);
    const tableInfo = statsData.STATISTICAL_DATA?.TABLE_INF;
    if (tableInfo) {
      console.log(`- 統計ID: ${tableInfo['@id'] || 'N/A'}`);
      console.log(`- 統計名: ${tableInfo.STATISTICS_NAME || 'N/A'}`);
      console.log(`- タイトル: ${tableInfo.TITLE?.$ || 'N/A'}`);
      console.log(`- 主カテゴリー: ${tableInfo.MAIN_CATEGORY?.$ || 'N/A'}`);
      console.log(`- 副カテゴリー: ${tableInfo.SUB_CATEGORY?.$ || 'N/A'}`);
      if (tableInfo.STATISTICS_NAME_SPEC?.TABULATION_CATEGORY) {
        console.log(`- 集計カテゴリー: ${tableInfo.STATISTICS_NAME_SPEC.TABULATION_CATEGORY}`);
      }
    }
    const categoryInfo = extractCategoryInfo(data);
    if (categoryInfo) {
      console.log(`\n🏷️ カテゴリー情報:`);
      console.log(`- カテゴリーID: ${categoryInfo.id}`);
      console.log(`- カテゴリー名: ${categoryInfo.name}`);
      if (categoryInfo.classes?.length) {
        console.log('\n📋 カテゴリークラス:');
        categoryInfo.classes.forEach(cls => {
          console.log(`  • コード: ${cls.code}`);
          console.log(`    名前: ${cls.name}`);
          console.log(`    単位: ${cls.unit || '指定なし'}`);
        });
      }
    }
    const valueCount = statsData.STATISTICAL_DATA?.DATA_INF?.VALUE?.length || 0;
    console.log(`\n- データ件数: ${valueCount}件`);
  });
}

function printLatestData(latestDataList) {
  console.log('\n📊 最新データ情報:');
  latestDataList.forEach((latestData, idx) => {
    const value = latestData.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE?.[0];
    if (!value) return;
    const tableInfo = latestData.GET_STATS_DATA.STATISTICAL_DATA.TABLE_INF;
    const statId = tableInfo?.['@id'] || 'N/A';
    console.log(`\n📈 データセット ${idx + 1}:`);
    console.log(`- 統計ID: ${statId}`);
    console.log(`- 統計名: ${tableInfo?.STATISTICS_NAME || 'N/A'}`);
    console.log(`- 主カテゴリー: ${tableInfo?.MAIN_CATEGORY?.$ || 'N/A'}`);
    console.log(`- 副カテゴリー: ${tableInfo?.SUB_CATEGORY?.$ || 'N/A'}`);
    const catInfo = extractCategoryInfo(latestData);
    if (catInfo?.classes?.length) {
      const catClass = catInfo.classes[0];
      console.log(`- データ項目: ${catClass.name} (${catClass.unit || '単位なし'})`);
    }
    let timeName = value['@time'];
    const timeClasses = latestData.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ
      ?.find(o => o['@id'] === 'time')?.CLASS;
    if (timeClasses) {
      const timeClass = Array.isArray(timeClasses)
        ? timeClasses.find(c => c['@code'] === value['@time'])
        : (timeClasses['@code'] === value['@time'] ? timeClasses : null);
      if (timeClass) timeName = timeClass['@name'] || timeName;
    }
    console.log(`- 時点: ${timeName}`);
    console.log(`- 値: ${value['$']} ${value['@unit'] || ''}`);
  });
}

module.exports = {
  printResults,
  printLatestData
};
