# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

<p align="center">
  <strong>モダンなストレージ容量視覚化・分析ツール</strong>
</p>

<p align="center">
  <a href="README.md">繁體中文</a> | <a href="README.en.md">English</a> | <a href="README.ja.md">日本語</a>
</p>

---

StorViz は、ストレージの使用状況を素早く把握できる強力なディスク容量分析ツールです。直感的なビジュアルインターフェースで、容量を占めているファイルやフォルダを簡単に特定し、ストレージ管理を最適化できます。

## 📥 ダウンロードとインストール

### クイックダウンロード

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)

</div>

### インストール手順

<table>
<tr>
<td width="50%" align="center">

### 🍎 macOS

</td>
<td width="50%" align="center">

### 🪟 Windows

</td>
</tr>
<tr>
<td width="50%" valign="top">

**インストール手順：**

1. **ファイルダウンロード**：上のボタンをクリックして `.app.tar.gz` ファイルをダウンロード
2. **展開**：ダウンロードしたファイルをダブルクリック、macOS が自動展開
3. **インストール**：`StorViz.app` を Applications フォルダにドラッグ
4. **起動**：Applications で StorViz アイコンをダブルクリックしてアプリを起動

> **💡 ヒント**：「開発元を確認できません」の警告が表示された場合、「システム環境設定」→「セキュリティとプライバシー」で実行を許可してください。

**システム要件：**
- macOS 10.13 以上
- Intel または Apple Silicon (M1/M2/M3)
- 最低 4GB RAM
- 最低 100MB の空き容量

</td>
<td width="50%" valign="top">

**インストール手順：**

1. **ファイルダウンロード**：上のボタンをクリックして `.exe` インストーラーをダウンロード
2. **インストーラー実行**：ダウンロードしたインストーラーをダブルクリック
3. **インストールウィザード**：インストールウィザードの指示に従う
4. **起動**：スタートメニューまたはデスクトップショートカットから StorViz を起動

> **💡 ヒント**：Windows Defender が警告を表示した場合、「詳細情報」→「実行」を選択してください。

**システム要件：**
- Windows 10 以上
- x64 (64-bit)
- 最低 4GB RAM
- 最低 100MB の空き容量

</td>
</tr>
</table>

## ✨ 主な機能

- 📊 **ビジュアルストレージ分析**：インタラクティブなチャートによる直感的なディスク使用状況の可視化
- ⚡ **高速スキャン**：並列処理を使用した Rust バックエンドによる高性能なディレクトリスキャン
- 📁 **ファイルタイプ統計**：ファイルタイプと拡張子による詳細なストレージ分析
- 🌍 **多言語対応**：英語、繁体字中国語、日本語に対応
- 🌓 **ダークモード**：美しいダーク/ライトテーマの切り替え
- 💻 **クロスプラットフォーム**：macOS と Windows で動作

## 📸 スクリーンショット

<div align="center">

<table>
  <tr>
    <td width="50%">
      <img src="images/zh/image1.png" alt="メインインターフェース" />
    </td>
    <td width="50%">
      <img src="images/zh/image2.png" alt="ファイルタイプ統計" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image3.png" alt="ディレクトリ構造" />
    </td>
    <td width="50%">
      <img src="images/zh/image4.png" alt="ダークモード" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image5.png" alt="多言語サポート" />
    </td>
    <td width="50%">
      <img src="images/zh/image6.png" alt="高度な分析" />
    </td>
  </tr>
</table>

</div>

## 📄 ライセンス

このプロジェクトはオープンソースであり、[AGPL-3.0](LICENSE) ライセンスの下で利用可能です。

## 🤝 コントリビューション

コントリビューションを歓迎します！このプロジェクトに貢献したい方は、プルリクエストの送信または Issue の作成をお気軽にどうぞ。

### コントリビューター

このプロジェクトに貢献してくださったすべての開発者に感謝します！

<a href="https://github.com/exptechtw/StorViz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=exptechtw/StorViz" alt="Contributors" />
</a>

---

<p align="center">
  このプロジェクトがお役に立ちましたら、⭐️ Star をお願いします！
</p>
