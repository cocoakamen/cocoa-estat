const axios = require('axios');

const API_BASE_URL = 'https://api.e-stat.go.jp/rest/3.0/app/json';

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
      cdTimeFrom: params.cdTimeFrom || ''
    }
  };
}

async function fetchApiData(requestInfo) {
  try {
    console.log(`APIリクエスト送信中...💌 URL: ${requestInfo.url}`);
    console.log('パラメータ:', requestInfo.params);
    const response = await axios.get(requestInfo.url, { params: requestInfo.params });
    if (response.data?.GET_STATS_DATA?.RESULT?.STATUS !== 0) {
      const msg = response.data.GET_STATS_DATA.RESULT.ERROR_MSG;
      throw new Error(`APIエラー: ${msg}`);
    }
    return response.data;
  } catch (e) {
    if (e.response) console.error('APIレスポンスエラー:', e.response.data);
    throw e;
  }
}

function extractLatestData(data) {
  const clone = JSON.parse(JSON.stringify(data));
  const values = clone.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
  if (!Array.isArray(values)) return clone;
  values.sort((a, b) => Number(b['@time']) - Number(a['@time']));
  clone.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE = [values[0]];
  const ri = clone.GET_STATS_DATA.STATISTICAL_DATA.RESULT_INF;
  if (ri) {
    ri.TOTAL_NUMBER = ri.FROM_NUMBER = ri.TO_NUMBER = 1;
  }
  return clone;
}

function extractCategoryInfo(data) {
  try {
    const classObjs = data.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ;
    if (!classObjs) return null;
    const catObj = Array.isArray(classObjs)
      ? classObjs.find(o => o['@id'] === 'cat01')
      : (classObjs['@id'] === 'cat01' ? classObjs : null);
    if (!catObj) return null;
    const info = { id: catObj['@id'], name: catObj['@name'] };
    const classData = catObj.CLASS;
    if (classData) {
      info.classes = Array.isArray(classData)
        ? classData.map(c => ({
            code: c['@code'],
            name: c['@name'],
            level: c['@level'],
            unit: c['@unit']
          }))
        : [{
            code: classData['@code'],
            name: classData['@name'],
            level: classData['@level'],
            unit: classData['@unit']
          }];
    }
    return info;
  } catch (e) {
    console.error('カテゴリー情報の抽出中にエラーが発生しました💦:', e.message);
    return null;
  }
}

module.exports = {
  API_BASE_URL,
  buildStatsDataRequest,
  fetchApiData,
  extractLatestData,
  extractCategoryInfo
};
