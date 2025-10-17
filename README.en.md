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

<details>
<summary>🍎 macOS - View Installation Steps</summary>

<br>

1. **Download File** - Click the button above to download the `.app.tar.gz` file
2. **Extract** - Double-click the downloaded file, macOS will auto-extract it
3. **Install** - Drag `StorViz.app` to the Applications folder
4. **Launch** - Double-click the StorViz icon in Applications to start the app

> **💡 Tip**
> If you see a "Cannot verify developer" warning, go to "System Preferences" → "Security & Privacy" to allow execution.

</details>

<details>
<summary>🪟 Windows - View Installation Steps</summary>

<br>

1. **Download File** - Click the button above to download the `.exe` installer
2. **Run Installer** - Double-click the downloaded installer
3. **Installation Wizard** - Follow the installation wizard instructions
4. **Launch** - Start StorViz from the Start menu or desktop shortcut

> **💡 Tip**
> If Windows Defender shows a warning, select "More info" → "Run anyway".

</details>

<details>
<summary>🐧 Linux - View Installation Steps</summary>

<br>

1. **Download File** - Click the button above to download the `.AppImage` file
2. **Set Permission** - Open terminal and run:
   ```bash
   chmod +x storviz_*.AppImage
   ```
3. **Run** - Double-click to run or execute in terminal:
   ```bash
   ./storviz_*.AppImage
   ```

> **💡 Tip**
> AppImage is a portable application that runs without installation.

</details>

## 📋 Supported Operating System Versions

### 🍎 macOS

<details>
<summary>View supported versions</summary>

<br>

| OS Version                    | StorViz Version | Status |
| ----------------------------- | --------------- | ------ |
| **10.15 Catalina and below**  | `-`             | ❌     |
| **11 Big Sur**                | `-`             | ❔     |
| **12 Monterey**               | `-`             | ❔     |
| **13 Ventura**                | `-`             | ❔     |
| **14 Sonoma**                 | `-`             | ❔     |
| **15 Sequoia**                | `-`             | ❔     |
| **26 Tahoe**                  | `1.0.0-rc.3`    | ✅     |

**Architecture Support**: Intel (x86_64) / Apple Silicon (ARM64)

</details>

### 🪟 Windows

<details>
<summary>View supported versions</summary>

<br>

| OS Version       | StorViz Version | Status |
| ---------------- | --------------- | ------ |
| **8 and below**  | `-`             | ❌     |
| **8.1**          | `-`             | ❔     |
| **10**           | `1.0.0-rc.3`    | ✅     |
| **11**           | `1.0.0-rc.3`    | ✅     |

**Architecture Support**: x64 (64-bit)
**Additional Requirements**: WebView2 Runtime (automatically installed by the installer)

</details>

### 🐧 Linux

<details>
<summary>View supported versions</summary>

<br>

**Ubuntu**

| OS Version                      | StorViz Version | Status |
| ------------------------------- | --------------- | ------ |
| **20.04 LTS Focal and below**   | `-`             | ❌     |
| **22.04 LTS Jammy**             | `1.0.0-rc.3`    | ✅     |
| **23.10 Mantic**                | `1.0.0-rc.3`    | ✅     |
| **24.04 LTS Noble**             | `1.0.0-rc.3`    | ✅     |
| **24.10 Oracular**              | `1.0.0-rc.3`    | ✅     |

**Debian**

| OS Version                  | StorViz Version | Status |
| --------------------------- | --------------- | ------ |
| **11 Bullseye and below**   | `-`             | ❌     |
| **12 Bookworm**             | `1.0.0-rc.3`    | ✅     |
| **13 Trixie**               | `1.0.0-rc.3`    | ✅     |

**Fedora**

| OS Version       | StorViz Version | Status |
| ---------------- | --------------- | ------ |
| **35 and below** | `-`             | ❌     |
| **36**           | `-`             | ❔     |
| **37+**          | `-`             | ❔     |

**RHEL / Rocky Linux / AlmaLinux**

| OS Version      | StorViz Version | Status |
| --------------- | --------------- | ------ |
| **8 and below** | `-`             | ❌     |
| **9**           | `-`             | ❔     |

**Arch Linux**

| OS Version          | StorViz Version | Status |
| ------------------- | --------------- | ------ |
| **Rolling Release** | `-`             | ❌     |

**Architecture Support**: x64 (64-bit)
**Additional Requirements**: GLib >= 2.70, WebKitGTK 4.1

> **⚠️ Note**
>
> Linux version requires newer system libraries (GLIBC 2.35+).
> Users on Ubuntu 20.04 and Debian 11 are recommended to upgrade to newer versions.

</details>

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
