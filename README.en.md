# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

<p align="center">
  <strong>A modern storage space visualization and analysis tool</strong>
</p>

<p align="center">
  <a href="README.md">繁體中文</a> | <a href="README.en.md">English</a> | <a href="README.ja.md">日本語</a>
</p>

---

StorViz is a powerful disk space analysis tool that helps you quickly understand your storage usage. With an intuitive visual interface, easily identify files and folders taking up space to optimize your storage management.

## 📥 Download & Installation

### Quick Download

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-orange?style=for-the-badge&logo=linux)](https://github.com/ExpTechTW/StorViz/releases/latest/download/storviz_1.0.0-rc.3_amd64.AppImage)

</div>

### Installation Steps

<table>
<tr>
<td width="33%" align="center">

### 🍎 macOS

</td>
<td width="33%" align="center">

### 🪟 Windows

</td>
<td width="33%" align="center">

### 🐧 Linux

</td>
</tr>
<tr>
<td width="33%" valign="top">

**Installation Steps:**

1. **Download File**: Click the button above to download the `.app.tar.gz` file
2. **Extract**: Double-click the downloaded file, macOS will auto-extract it
3. **Install**: Drag `StorViz.app` to the Applications folder
4. **Launch**: Double-click the StorViz icon in Applications to start the app

> **💡 Tip**: If you see a "Cannot verify developer" warning, go to "System Preferences" → "Security & Privacy" to allow execution.

**Minimum Requirements:**
- macOS 10.13 or higher
- Intel or Apple Silicon (M1/M2/M3)

</td>
<td width="33%" valign="top">

**Installation Steps:**

1. **Download File**: Click the button above to download the `.exe` installer
2. **Run Installer**: Double-click the downloaded installer
3. **Installation Wizard**: Follow the installation wizard instructions
4. **Launch**: Start StorViz from the Start menu or desktop shortcut

> **💡 Tip**: If Windows Defender shows a warning, select "More info" → "Run anyway".

**Minimum Requirements:**
- Windows 7 SP1 or higher
- x64 (64-bit)
- WebView2 Runtime (auto-installed)

</td>
<td width="33%" valign="top">

**Installation Steps:**

1. **Download File**: Click the button above to download the `.AppImage` file
2. **Set Permission**: Open terminal and run:
   ```bash
   chmod +x storviz_*.AppImage
   ```
3. **Run**: Double-click to run or execute in terminal:
   ```bash
   ./storviz_*.AppImage
   ```

> **💡 Tip**: AppImage is a portable application that runs without installation.

**Minimum Requirements:**
- Ubuntu 22.04+ / Debian 12+
- Fedora 36+ / CentOS 9+
- Arch Linux (rolling)

</td>
</tr>
</table>

## 📋 Supported Operating System Versions

<div align="center">

| Operating System | Minimum Version | Recommended Version | Release Date |
|-----------------|-----------------|---------------------|--------------|
| **macOS** | 10.13 (High Sierra) | 12.0+ (Monterey) | Sep 2017 |
| **Windows** | Windows 7 SP1 | Windows 10/11 | Feb 2011 |
| **Ubuntu** | 22.04 LTS (Jammy) | 24.04 LTS (Noble) | Apr 2022 |
| **Debian** | 12 (Bookworm) | 13 (Trixie) | Jun 2023 |
| **Fedora** | 36 | Latest | May 2022 |
| **Rocky Linux / AlmaLinux** | 9 | 9 | Jul 2022 |
| **Arch Linux** | Rolling | Rolling | - |

</div>

> **⚠️ Note**: Linux version requires newer system libraries. Users on Ubuntu 20.04 and Debian 11 are recommended to upgrade to newer versions.

## ✨ Features

- 📊 **Visual Storage Analysis**: Intuitive visualization of disk space usage with interactive charts
- ⚡ **Fast Scanning**: High-performance directory scanning using Rust backend with parallel processing
- 📁 **File Type Statistics**: Detailed breakdown of storage by file types and extensions
- 🌍 **Multi-language Support**: Available in English, Traditional Chinese, and Japanese
- 🌓 **Dark Mode**: Beautiful dark/light theme support
- 💻 **Cross-platform**: Works on macOS, Windows, and Linux

## 📸 Screenshots

<div align="center">

<table>
  <tr>
    <td width="50%">
      <img src="images/zh/image1.png" alt="Main Interface" />
    </td>
    <td width="50%">
      <img src="images/zh/image2.png" alt="File Type Statistics" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image3.png" alt="Directory Structure" />
    </td>
    <td width="50%">
      <img src="images/zh/image4.png" alt="Dark Mode" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image5.png" alt="Multi-language Support" />
    </td>
    <td width="50%">
      <img src="images/zh/image6.png" alt="Advanced Analysis" />
    </td>
  </tr>
</table>

</div>

## 📄 License

This project is open source and available under the [AGPL-3.0](LICENSE) License.

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to this project, please feel free to submit a Pull Request or open an Issue.

### Contributors

Thanks to all the developers who have contributed to this project!

<a href="https://github.com/exptechtw/StorViz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=exptechtw/StorViz" alt="Contributors" />
</a>

---

<p align="center">
  If this project helps you, please give us a ⭐️ Star!
</p>
