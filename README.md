# cocoa-estat

日本の統計データポータルe-StatのAPIを使って、自治体の統計データを取得するコマンドラインツールです。

## インストール

```bash
npm install -g cocoa-estat
```

## 基本的な使い方

```bash
# 必須パラメータだけで実行
cocoa-estat -a YOUR_APP_ID -m 13101 -s 00200502

# 複数の統計データIDを指定
cocoa-estat -a YOUR_APP_ID -m 13101 -s 00200502,0003348423

# 設定ファイルを使用
cocoa-estat -a YOUR_APP_ID -m 13101 -c ./my-config.js

# 結果をファイルに出力
cocoa-estat -a YOUR_APP_ID -m 13101 -s 00200502 -o result.json
```

## 設定ファイル

`cocoa-estat.config.js`ファイルに設定を記述できます。

```javascript
// cocoa-estat.config.js
module.exports = {
  format: "json",
  metaGetFlg: "Y",
  cntGetFlg: "N", 
  language: "J",
  
  // 複数の統計データを指定（推奨）
  statsData: [
    {
      statsId: "00200502",
      cdCat01: "A1101",
      cdTimeFrom: "2015100000"
    },
    {
      statsId: "0003348423", 
      cdCat01: "A1301"
    }
  ],
  
  // JavaScriptのロジックも使用可能！
  getYearRange() {
    const currentYear = new Date().getFullYear();
    return {
      startYear: currentYear - 5,
      endYear: currentYear
    };
  }
};
```

## オプション

- `-a, --appId` - e-Stat API アプリケーションID（必須）
- `-m, --municipalityId` - 自治体ID（地域コード）（必須）
- `-s, --statsId` - 統計データID（カンマ区切りで複数指定可能）
- `-o, --output` - 出力ファイルパス
- `-c, --config` - 設定ファイルのパス
