/**
 * cocoa-estat の設定ファイル
 * 
 */

module.exports = {
  // ===== API設定 =====
  // 言語設定（J: 日本語, E: 英語）
  lang: 'J',
  
  // 解説情報取得フラグ（Y/N）
  explanationGetFlg: 'Y',
  
  // 注釈情報取得フラグ（Y/N）
  annotationGetFlg: 'Y',
  
  // セクションヘッダーフラグ（0/1）
  sectionHeaderFlg: '1',
  
  // 特殊文字置換フラグ（0/1）
  replaceSpChars: '0',
  
  // ===== 統計データ =====
  /**
   * 取得する統計データID（statsId）
   * 例: 0000020201 - 社会・人口統計体系
   * 複数指定する場合は statsData 配列を使用
   * その他パラメータは以下の通り
   * - cdCat01: カテゴリコード（例: A1101 - 総人口）
   * - cdTimeFrom: フィルター対象調査年（From）（例: 2022100000） 省略可
   */
  statsData: [
    { // 人口
      statsId: '0000020201',
      cdCat01: 'A1101',
      cdTimeFrom: '2000100000'
    },
    { // 世帯数
      statsId: '0000020201',
      cdCat01: 'A7101',
      cdTimeFrom: '2000100000'
    },
    { //　一戸建て
      statsId: '0000020208',
      cdCat01: 'H1401',
      cdTimeFrom: '2000100000'
    },
    {
      // 小学校数
      statsId: '0000020205',
      cdCat01: 'E2101',
    }
  ],
};
