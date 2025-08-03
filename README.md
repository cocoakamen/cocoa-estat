# cocoa-estat

日本の統計データポータルe-StatのAPIを使って、自治体の統計データを取得するコマンドラインツールです。

## 基本的な使い方

```bash
# 必須パラメータだけで実行（設定ファイルから統計IDを取得）
cocoa-estat -a YOUR_APP_ID -m 13101

# 設定ファイルを明示的に指定
cocoa-estat -a YOUR_APP_ID -m 13101 -c ./my-config.js

# 出力先フォルダを明示的に指定（デフォルトは ./output）
cocoa-estat -a YOUR_APP_ID -m 13101 --output ./my-data
```

## 出力ファイル

実行すると、タイムスタンプ付きのフォルダが自動的に作成され、以下のファイルが生成されます：

- `result.json` - 取得した全データ
- `latest.json` - 各統計の最新データのみ
- `summary.txt` - 人間が読みやすい形式の最新データ要約

例: `./output/data-20250803-165258/`

## 設定ファイル

`cocoa-estat.config.js`ファイルに設定を記述できます。統計IDはこの設定ファイルで指定します。

```javascript
// cocoa-estat.config.js
module.exports = {
  // APIリクエストの基本設定
  metaGetFlg: "Y",
  cntGetFlg: "N", 
  lang: "J",
  
  // 統計データ設定（必須）- 複数指定可能
  statsData: [
    {
      // 社会・人口統計体系（総人口）
      statsId: "00200502",
      cdCat01: "A1101",
      cdTimeFrom: "2015100000"
    },
    {
      // 別の統計データを追加
      statsId: "0003348423", 
      cdCat01: "A1301"
    }
  ]
};
```

## オプション

- `-a, --appId <id>` - e-Stat API アプリケーションID（必須）
- `-m, --municipalityId <id>` - 自治体ID（地域コード）（必須）
- `-c, --config <file>` - 設定ファイルのパス（デフォルト: `./cocoa-estat.config.js`）
- `-o, --output <dir>` - 出力ディレクトリのベースパス（デフォルト: `./output`）
- `--latest <file>` - 最新データのみを指定ファイルに出力

## 出力例

```
e-Stat APIの準備をしています...✨
アプリID: YOUR_APP_ID
自治体ID: 13101
取得する統計データ数: 2件

統計データID「00200502」の取得を開始します...✨
APIリクエスト送信中...💌 URL: https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData
✅ カテゴリー「Ａ　人口・世帯」のデータを取得しました！
   データ項目: A1101_総人口
統計データID「00200502」の取得が完了しました！

統計データID「0003348423」の取得を開始します...✨
APIリクエスト送信中...💌 URL: https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData
✅ カテゴリー「住民基本台帳人口」のデータを取得しました！
   データ項目: 人口総数
統計データID「0003348423」の取得が完了しました！

📊 取得データ情報:
...

出力フォルダを作成しました✨: ./output/data-20250803-165258
データを ./output/data-20250803-165258/result.json に保存しました💾
データを ./output/data-20250803-165258/latest.json に保存しました💾
データを ./output/data-20250803-165258/summary.txt に保存しました💾

📊 最新データ情報:
...

✅ すべての処理が完了しました！出力フォルダ: ./output/data-20250803-165258
```
