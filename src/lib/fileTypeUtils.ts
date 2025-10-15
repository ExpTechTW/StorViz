import {
  Folder,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  FileCode,
  Globe,
  FileText,
  Sheet,
  Database,
  Settings,
  Zap,
  File,
  HardDrive,
  Package,
  FileJson,
  FileType,
  Braces,
  Binary,
  Lock,
  FileKey,
  Blocks,
  Palette,
  BookOpen,
  FileSpreadsheet,
  Presentation,
  Mail,
  Server,
  FolderGit2,
  Box,
  Code2,
  Terminal,
  Cpu,
  Container,
  GitBranch,
  Workflow,
  Layers,
  Package2,
  PackageOpen,
  FileStack,
  Puzzle,
  Shapes,
  Pen,
  Image,
  Camera,
  Video,
  Music2,
  Mic,
  Film,
  Volume2,
  type LucideIcon
} from 'lucide-react'

export interface FileTypeInfo {
  icon: LucideIcon
  label: string
  color: string
}

export function getFileTypeInfo(fileName: string, isDirectory: boolean): FileTypeInfo {
  if (isDirectory) {
    // 特殊資料夾
    if (fileName === '.git') {
      return { icon: FolderGit2, label: 'Git Repository', color: '#f05033' }
    }
    if (['node_modules', 'vendor', 'packages', 'bower_components', '.venv', 'venv', '__pycache__'].includes(fileName)) {
      return { icon: Box, label: 'Dependencies', color: '#8b5cf6' }
    }
    if (['.vscode', '.idea', '.vs'].includes(fileName)) {
      return { icon: Settings, label: 'IDE Config', color: '#0078d7' }
    }
    if (['.github', '.gitlab', '.circleci'].includes(fileName)) {
      return { icon: Workflow, label: 'CI/CD', color: '#2088ff' }
    }
    if (['dist', 'build', 'out', 'target', 'bin'].includes(fileName)) {
      return { icon: Package2, label: 'Build Output', color: '#f59e0b' }
    }
    if (['src', 'source', 'app', 'lib', 'components'].includes(fileName)) {
      return { icon: Code2, label: 'Source', color: '#3b82f6' }
    }
    if (['test', 'tests', '__tests__', 'spec', 'specs'].includes(fileName)) {
      return { icon: FileStack, label: 'Tests', color: '#10b981' }
    }
    if (['docs', 'doc', 'documentation'].includes(fileName)) {
      return { icon: BookOpen, label: 'Documentation', color: '#6366f1' }
    }
    if (['assets', 'static', 'public', 'resources'].includes(fileName)) {
      return { icon: Image, label: 'Assets', color: '#ec4899' }
    }
    return { icon: Folder, label: 'Folder', color: '#60a5fa' }
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const fullName = fileName.toLowerCase()

  // 特殊檔案名稱 (無副檔名)
  if (['dockerfile', 'containerfile'].includes(fullName)) {
    return { icon: Container, label: 'Docker', color: '#2496ed' }
  }
  if (['makefile', 'rakefile', 'gemfile', 'podfile', 'vagrantfile', 'gruntfile', 'gulpfile'].includes(fullName)) {
    return { icon: Settings, label: 'Build Config', color: '#2496ed' }
  }
  if (['license', 'licence', 'readme', 'changelog', 'contributing', 'authors', 'notice'].includes(fullName)) {
    return { icon: FileText, label: 'Documentation', color: '#6b7280' }
  }
  if (['.gitignore', '.dockerignore', '.npmignore', '.eslintignore', '.prettierignore'].includes(fullName)) {
    return { icon: GitBranch, label: 'Ignore File', color: '#6b7280' }
  }
  if (['.env', '.env.local', '.env.development', '.env.production', '.env.test'].includes(fullName)) {
    return { icon: Lock, label: 'Environment', color: '#eab308' }
  }
  if (['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(fullName)) {
    return { icon: Package, label: 'Package Config', color: '#10b981' }
  }
  if (['tsconfig.json', 'jsconfig.json'].includes(fullName)) {
    return { icon: Settings, label: 'TS Config', color: '#3178c6' }
  }
  if (['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.prettierrc'].includes(fullName)) {
    return { icon: Settings, label: 'Linter Config', color: '#4b32c3' }
  }

  // 圖片 - 點陣圖
  if (['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'bmp', 'dib', 'webp', 'ico', 'cur', 'tiff', 'tif', 'ppm', 'pgm', 'pbm', 'pnm'].includes(ext)) {
    return { icon: Image, label: 'Image', color: '#f472b6' }
  }
  // 圖片 - 向量圖與設計
  if (['svg', 'svgz', 'ai', 'eps', 'ps', 'cdr', 'cgm', 'wmf', 'emf'].includes(ext)) {
    return { icon: Pen, label: 'Vector', color: '#ec4899' }
  }
  // 圖片 - 專業設計軟體
  if (['psd', 'psb', 'xcf', 'kra', 'sketch', 'xd', 'fig', 'figma', 'afdesign', 'afphoto', 'clip'].includes(ext)) {
    return { icon: Palette, label: 'Design', color: '#ec4899' }
  }
  // 圖片 - RAW 格式
  if (['raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'pef', 'raf', 'dcr', 'mrw', 'nrw', 'rwl', 'srw', 'x3f'].includes(ext)) {
    return { icon: Camera, label: 'RAW Image', color: '#f59e0b' }
  }

  // 影片 - 常見格式
  if (['mp4', 'm4v', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpg', 'mpeg', 'mpe', 'mpv', 'm2v', '3gp', '3g2', 'ogv', 'ogg', 'vob', 'divx'].includes(ext)) {
    return { icon: Video, label: 'Video', color: '#8b5cf6' }
  }
  // 影片 - 專業格式
  if (['mxf', 'ts', 'm2ts', 'mts', 'f4v', 'swf', 'rm', 'rmvb', 'asf', 'qt', 'yuv', 'y4m', 'amv'].includes(ext)) {
    return { icon: FileVideo, label: 'Video', color: '#8b5cf6' }
  }
  // 影片 - 專案檔
  if (['prproj', 'aep', 'veg', 'fcpx', 'motn', 'imovieproj', 'davinci'].includes(ext)) {
    return { icon: Film, label: 'Video Project', color: '#7c3aed' }
  }

  // 音訊 - 無損格式
  if (['flac', 'ape', 'alac', 'wav', 'aiff', 'aif', 'aifc', 'au', 'snd', 'pcm', 'dsd', 'dsf', 'dff'].includes(ext)) {
    return { icon: Volume2, label: 'Audio', color: '#a855f7' }
  }
  // 音訊 - 有損格式
  if (['mp3', 'aac', 'm4a', 'ogg', 'oga', 'opus', 'wma', 'mka', 'ra', 'ram', 'voc', 'amr', 'awb'].includes(ext)) {
    return { icon: Music2, label: 'Audio', color: '#a855f7' }
  }
  // 音訊 - MIDI 與合成
  if (['mid', 'midi', 'kar', 'rmi', 'mus', 'syx'].includes(ext)) {
    return { icon: Music2, label: 'MIDI', color: '#c084fc' }
  }
  // 音訊 - 專案檔
  if (['flp', 'als', 'ptx', 'logic', 'band', 'reason', 'cpr', 'cwp', 'sesx', 'aup', 'aup3'].includes(ext)) {
    return { icon: Mic, label: 'Audio Project', color: '#9333ea' }
  }

  // 壓縮檔 - 常見格式
  if (['zip', 'rar', '7z', 'tar', 'gz', 'gzip', 'bz2', 'bzip2', 'xz', 'lz', 'lzma', 'z', 'tgz', 'tbz', 'tbz2', 'txz', 'tlz'].includes(ext)) {
    return { icon: Archive, label: 'Archive', color: '#f59e0b' }
  }
  // 壓縮檔 - 光碟映像
  if (['iso', 'img', 'dmg', 'toast', 'vcd', 'cue', 'bin', 'mdf', 'mds', 'nrg', 'cdi', 'b5t', 'b6t', 'bwt', 'ccd', 'isz', 'uif'].includes(ext)) {
    return { icon: HardDrive, label: 'Disk Image', color: '#fb923c' }
  }
  // 壓縮檔 - 安裝包
  if (['pkg', 'deb', 'rpm', 'apk', 'msi', 'msix', 'appx', 'snap', 'flatpak', 'appimage'].includes(ext)) {
    return { icon: PackageOpen, label: 'Package', color: '#f59e0b' }
  }
  // 壓縮檔 - 其他
  if (['cab', 'arj', 'lzh', 'ace', 'zoo', 'arc', 'pak', 'sit', 'sitx', 'sea', 'uue', 'uu'].includes(ext)) {
    return { icon: Archive, label: 'Archive', color: '#f59e0b' }
  }

  // 程式碼 - JavaScript/TypeScript 生態系
  if (['js', 'jsx', 'mjs', 'cjs', 'es6', 'es'].includes(ext)) {
    return { icon: FileCode, label: 'JavaScript', color: '#f7df1e' }
  }
  if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) {
    return { icon: FileCode, label: 'TypeScript', color: '#3178c6' }
  }
  if (['vue', 'svelte', 'astro'].includes(ext)) {
    return { icon: Puzzle, label: 'Component', color: '#42b883' }
  }

  // 程式碼 - Web 前端
  if (['html', 'htm', 'xhtml', 'shtml', 'dhtml', 'hta'].includes(ext)) {
    return { icon: Globe, label: 'HTML', color: '#e34c26' }
  }
  if (['css', 'scss', 'sass', 'less', 'styl', 'stylus', 'pcss', 'postcss'].includes(ext)) {
    return { icon: Palette, label: 'Stylesheet', color: '#264de4' }
  }
  if (['wasm', 'wat'].includes(ext)) {
    return { icon: Cpu, label: 'WebAssembly', color: '#654ff0' }
  }

  // 程式碼 - Python
  if (['py', 'pyw', 'pyx', 'pyd', 'pyi', 'pyc', 'pyo', 'pyz', 'pyzw'].includes(ext)) {
    return { icon: FileCode, label: 'Python', color: '#3776ab' }
  }
  if (['ipynb', 'jupyter'].includes(ext)) {
    return { icon: FileStack, label: 'Jupyter', color: '#f37726' }
  }

  // 程式碼 - Java 系列
  if (['java', 'jsp', 'jspx'].includes(ext)) {
    return { icon: FileCode, label: 'Java', color: '#f89820' }
  }
  if (['class', 'jar', 'war', 'ear', 'jad'].includes(ext)) {
    return { icon: Archive, label: 'Java Binary', color: '#f89820' }
  }
  if (['kt', 'kts', 'ktm'].includes(ext)) {
    return { icon: FileCode, label: 'Kotlin', color: '#7f52ff' }
  }
  if (['scala', 'sc'].includes(ext)) {
    return { icon: FileCode, label: 'Scala', color: '#dc322f' }
  }
  if (['groovy', 'gvy', 'gradle'].includes(ext)) {
    return { icon: FileCode, label: 'Groovy', color: '#4298b8' }
  }

  // 程式碼 - C/C++
  if (['c', 'h', 'i'].includes(ext)) {
    return { icon: FileCode, label: 'C', color: '#555555' }
  }
  if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'ii', 'ipp', 'tcc', 'tpp'].includes(ext)) {
    return { icon: FileCode, label: 'C++', color: '#f34b7d' }
  }
  if (['m', 'mm'].includes(ext)) {
    return { icon: FileCode, label: 'Objective-C', color: '#438eff' }
  }

  // 程式碼 - .NET
  if (['cs', 'csx', 'cshtml', 'razor'].includes(ext)) {
    return { icon: FileCode, label: 'C#', color: '#239120' }
  }
  if (['vb', 'vbs', 'vba', 'bas'].includes(ext)) {
    return { icon: FileCode, label: 'Visual Basic', color: '#945db7' }
  }
  if (['fs', 'fsi', 'fsx', 'fsscript'].includes(ext)) {
    return { icon: FileCode, label: 'F#', color: '#b845fc' }
  }
  if (['dll', 'pdb', 'winmd'].includes(ext)) {
    return { icon: Binary, label: '.NET Binary', color: '#512bd4' }
  }

  // 程式碼 - 系統語言
  if (['rs', 'rlib'].includes(ext)) {
    return { icon: FileCode, label: 'Rust', color: '#ce422b' }
  }
  if (['go', 'mod', 'sum'].includes(ext)) {
    return { icon: FileCode, label: 'Go', color: '#00add8' }
  }
  if (['zig'].includes(ext)) {
    return { icon: FileCode, label: 'Zig', color: '#f7a41d' }
  }
  if (['v'].includes(ext)) {
    return { icon: FileCode, label: 'V', color: '#5d87bd' }
  }
  if (['nim', 'nims', 'nimble'].includes(ext)) {
    return { icon: FileCode, label: 'Nim', color: '#ffe953' }
  }

  // 程式碼 - 腳本語言
  if (['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'phar'].includes(ext)) {
    return { icon: FileCode, label: 'PHP', color: '#777bb4' }
  }
  if (['rb', 'rbw', 'rake', 'erb', 'gemspec', 'ru'].includes(ext)) {
    return { icon: FileCode, label: 'Ruby', color: '#cc342d' }
  }
  if (['pl', 'pm', 'pod', 'perl'].includes(ext)) {
    return { icon: FileCode, label: 'Perl', color: '#0298c3' }
  }
  if (['lua'].includes(ext)) {
    return { icon: FileCode, label: 'Lua', color: '#000080' }
  }
  if (['r', 'rdata', 'rds', 'rmd'].includes(ext)) {
    return { icon: FileCode, label: 'R', color: '#198ce7' }
  }

  // 程式碼 - Shell
  if (['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh'].includes(ext)) {
    return { icon: Terminal, label: 'Shell', color: '#4eaa25' }
  }
  if (['bat', 'cmd', 'btm'].includes(ext)) {
    return { icon: Terminal, label: 'Batch', color: '#c1f12e' }
  }
  if (['ps1', 'psm1', 'psd1', 'ps1xml'].includes(ext)) {
    return { icon: Terminal, label: 'PowerShell', color: '#012456' }
  }

  // 程式碼 - 函數式語言
  if (['hs', 'lhs'].includes(ext)) {
    return { icon: FileCode, label: 'Haskell', color: '#5e5086' }
  }
  if (['ml', 'mli', 'mll', 'mly'].includes(ext)) {
    return { icon: FileCode, label: 'OCaml', color: '#3be133' }
  }
  if (['ex', 'exs', 'eex', 'leex'].includes(ext)) {
    return { icon: FileCode, label: 'Elixir', color: '#6e4a7e' }
  }
  if (['erl', 'hrl'].includes(ext)) {
    return { icon: FileCode, label: 'Erlang', color: '#b83998' }
  }
  if (['clj', 'cljs', 'cljc', 'edn'].includes(ext)) {
    return { icon: FileCode, label: 'Clojure', color: '#db5855' }
  }
  if (['lisp', 'lsp', 'l', 'cl', 'el'].includes(ext)) {
    return { icon: FileCode, label: 'Lisp', color: '#3fb68b' }
  }
  if (['scm', 'ss', 'rkt'].includes(ext)) {
    return { icon: FileCode, label: 'Scheme', color: '#1e4aec' }
  }

  // 程式碼 - 其他語言
  if (['swift'].includes(ext)) {
    return { icon: FileCode, label: 'Swift', color: '#f05138' }
  }
  if (['dart'].includes(ext)) {
    return { icon: FileCode, label: 'Dart', color: '#00b4ab' }
  }
  if (['jl'].includes(ext)) {
    return { icon: FileCode, label: 'Julia', color: '#9558b2' }
  }
  if (['d', 'di'].includes(ext)) {
    return { icon: FileCode, label: 'D', color: '#ba595e' }
  }
  if (['pas', 'pp', 'dpr'].includes(ext)) {
    return { icon: FileCode, label: 'Pascal', color: '#e3f171' }
  }
  if (['f', 'f90', 'f95', 'f03', 'f08', 'for', 'ftn', 'fpp'].includes(ext)) {
    return { icon: FileCode, label: 'Fortran', color: '#734f96' }
  }
  if (['cob', 'cbl', 'cpy'].includes(ext)) {
    return { icon: FileCode, label: 'COBOL', color: '#555555' }
  }
  if (['ada', 'adb', 'ads'].includes(ext)) {
    return { icon: FileCode, label: 'Ada', color: '#02f88c' }
  }
  if (['asm', 's', 'nasm'].includes(ext)) {
    return { icon: Cpu, label: 'Assembly', color: '#6e4c13' }
  }

  // 資料格式 - 結構化資料
  if (['json', 'jsonc', 'json5', 'geojson', 'topojson'].includes(ext)) {
    return { icon: FileJson, label: 'JSON', color: '#10b981' }
  }
  if (['xml', 'xsl', 'xslt', 'xsd', 'dtd', 'rss', 'atom', 'plist', 'xaml', 'xul', 'xbl'].includes(ext)) {
    return { icon: Braces, label: 'XML', color: '#f97316' }
  }
  if (['yaml', 'yml'].includes(ext)) {
    return { icon: FileType, label: 'YAML', color: '#ef4444' }
  }
  if (['toml'].includes(ext)) {
    return { icon: Settings, label: 'TOML', color: '#9c4221' }
  }
  if (['ini', 'inf', 'conf', 'config', 'cfg', 'properties', 'prop'].includes(ext)) {
    return { icon: Settings, label: 'Config', color: '#6b7280' }
  }
  if (['csv', 'tsv', 'tab', 'psv'].includes(ext)) {
    return { icon: Sheet, label: 'Data', color: '#059669' }
  }
  if (['parquet', 'avro', 'orc', 'arrow'].includes(ext)) {
    return { icon: Database, label: 'Big Data', color: '#0891b2' }
  }

  // 文件 - 純文字
  if (['txt', 'text', 'log', 'out', 'err'].includes(ext)) {
    return { icon: FileText, label: 'Text', color: '#6b7280' }
  }
  if (['md', 'markdown', 'mdown', 'mkd', 'mdwn', 'mdtxt', 'mdtext', 'mdx'].includes(ext)) {
    return { icon: BookOpen, label: 'Markdown', color: '#083344' }
  }
  if (['rst', 'rest'].includes(ext)) {
    return { icon: BookOpen, label: 'reStructuredText', color: '#141414' }
  }
  if (['tex', 'latex', 'ltx', 'bib', 'sty', 'cls'].includes(ext)) {
    return { icon: FileText, label: 'LaTeX', color: '#008080' }
  }
  if (['adoc', 'asciidoc', 'asc'].includes(ext)) {
    return { icon: BookOpen, label: 'AsciiDoc', color: '#e40046' }
  }
  if (['org'].includes(ext)) {
    return { icon: BookOpen, label: 'Org Mode', color: '#77aa99' }
  }

  // 文件 - 辦公室文件
  if (['pdf'].includes(ext)) {
    return { icon: FileText, label: 'PDF', color: '#dc2626' }
  }
  if (['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'ott', 'rtf', 'wps'].includes(ext)) {
    return { icon: FileText, label: 'Document', color: '#2563eb' }
  }
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'xltm', 'ods', 'ots', 'numbers'].includes(ext)) {
    return { icon: FileSpreadsheet, label: 'Spreadsheet', color: '#16a34a' }
  }
  if (['ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'pps', 'ppsx', 'ppsm', 'odp', 'otp', 'key'].includes(ext)) {
    return { icon: Presentation, label: 'Presentation', color: '#ea580c' }
  }
  if (['epub', 'mobi', 'azw', 'azw3', 'fb2', 'djvu'].includes(ext)) {
    return { icon: BookOpen, label: 'eBook', color: '#7c3aed' }
  }

  // 資料庫
  if (['db', 'sqlite', 'sqlite3', 'db3', 's3db', 'sl3'].includes(ext)) {
    return { icon: Database, label: 'SQLite', color: '#0ea5e9' }
  }
  if (['sql', 'mysql', 'pgsql', 'psql', 'plsql'].includes(ext)) {
    return { icon: Database, label: 'SQL', color: '#0891b2' }
  }
  if (['mdb', 'accdb', 'accde', 'accdt', 'accdr'].includes(ext)) {
    return { icon: Database, label: 'Access', color: '#a50e0e' }
  }
  if (['dbf', 'dbc', 'fpt'].includes(ext)) {
    return { icon: Database, label: 'dBASE', color: '#0369a1' }
  }

  // 郵件與通訊
  if (['eml', 'msg', 'emlx', 'mbx', 'mbox'].includes(ext)) {
    return { icon: Mail, label: 'Email', color: '#3b82f6' }
  }
  if (['pst', 'ost', 'olm'].includes(ext)) {
    return { icon: Mail, label: 'Outlook', color: '#0078d4' }
  }
  if (['vcf', 'vcard'].includes(ext)) {
    return { icon: Mail, label: 'Contact', color: '#10b981' }
  }
  if (['ics', 'ical', 'ifb', 'icalendar'].includes(ext)) {
    return { icon: FileText, label: 'Calendar', color: '#f59e0b' }
  }

  // 執行檔與二進位
  if (['exe', 'msi', 'msix', 'appx', 'app', 'run', 'out', 'com'].includes(ext)) {
    return { icon: Zap, label: 'Executable', color: '#dc2626' }
  }
  if (['so', 'dylib', 'framework', 'lib', 'a', 'o', 'obj', 'ko'].includes(ext)) {
    return { icon: Binary, label: 'Library', color: '#9333ea' }
  }
  if (['sys', 'drv', 'vxd'].includes(ext)) {
    return { icon: Binary, label: 'Driver', color: '#7c3aed' }
  }
  if (['bin', 'dat', 'dump', 'core', 'dmp'].includes(ext)) {
    return { icon: Binary, label: 'Binary', color: '#6b7280' }
  }

  // 憑證、金鑰與安全
  if (['pem', 'crt', 'cer', 'ca-bundle', 'p7b', 'p7c', 'p7s', 'pfx', 'p12', 'der'].includes(ext)) {
    return { icon: Lock, label: 'Certificate', color: '#15803d' }
  }
  if (['key', 'pub', 'priv', 'private'].includes(ext)) {
    return { icon: FileKey, label: 'Key', color: '#b91c1c' }
  }
  if (['gpg', 'pgp', 'asc', 'sig', 'sign'].includes(ext)) {
    return { icon: Lock, label: 'Encryption', color: '#166534' }
  }
  if (['csr', 'crl', 'spc', 'keystore', 'jks', 'truststore'].includes(ext)) {
    return { icon: Lock, label: 'Security', color: '#15803d' }
  }

  // 套件管理
  if (['whl', 'egg', 'pyz', 'pex'].includes(ext)) {
    return { icon: Package, label: 'Python Package', color: '#3776ab' }
  }
  if (['gem', 'gemfile'].includes(ext)) {
    return { icon: Package, label: 'Ruby Gem', color: '#cc342d' }
  }
  if (['nupkg', 'snupkg'].includes(ext)) {
    return { icon: Package, label: 'NuGet', color: '#004880' }
  }
  if (['vsix'].includes(ext)) {
    return { icon: Package, label: 'VS Extension', color: '#68217a' }
  }
  if (['crx', 'xpi'].includes(ext)) {
    return { icon: Package, label: 'Browser Ext', color: '#4285f4' }
  }

  // 容器與虛擬化
  if (['dockerfile', 'containerfile', '.dockerignore'].includes(fullName)) {
    return { icon: Container, label: 'Docker', color: '#2496ed' }
  }
  if (['vmdk', 'vdi', 'vhd', 'vhdx', 'hdd', 'qcow', 'qcow2', 'vbox'].includes(ext)) {
    return { icon: HardDrive, label: 'Virtual Disk', color: '#7c3aed' }
  }
  if (['ova', 'ovf', 'vbox-extpack', 'vbox-prev'].includes(ext)) {
    return { icon: Server, label: 'VM', color: '#6366f1' }
  }

  // 3D 模型
  if (['obj', 'mtl', 'fbx', 'dae', 'collada', '3ds', 'max', 'blend', 'blend1', 'ma', 'mb', 'c4d'].includes(ext)) {
    return { icon: Shapes, label: '3D Model', color: '#f59e0b' }
  }
  if (['gltf', 'glb', 'usdz', 'usda', 'usdc', 'usd'].includes(ext)) {
    return { icon: Shapes, label: '3D Web', color: '#fb923c' }
  }
  if (['stl', 'ply', 'off', 'x3d', 'wrl', 'vrml'].includes(ext)) {
    return { icon: Blocks, label: '3D Print', color: '#f97316' }
  }

  // CAD 與工程
  if (['dwg', 'dxf', 'dwf', 'dwt'].includes(ext)) {
    return { icon: Blocks, label: 'AutoCAD', color: '#ef4444' }
  }
  if (['step', 'stp', 'iges', 'igs', 'sat', 'brep'].includes(ext)) {
    return { icon: Blocks, label: 'CAD', color: '#dc2626' }
  }
  if (['ipt', 'iam', 'idw'].includes(ext)) {
    return { icon: Blocks, label: 'Inventor', color: '#f87171' }
  }
  if (['prt', 'asm', 'drw', 'sldprt', 'sldasm', 'slddrw'].includes(ext)) {
    return { icon: Blocks, label: 'SolidWorks', color: '#f43f5e' }
  }

  // 字型
  if (['ttf', 'otf', 'woff', 'woff2', 'eot', 'fon', 'fnt', 'ttc', 'dfont'].includes(ext)) {
    return { icon: FileType, label: 'Font', color: '#4b5563' }
  }

  // 遊戲相關
  if (['unity', 'unitypackage', 'prefab', 'mat', 'asset'].includes(ext)) {
    return { icon: Puzzle, label: 'Unity', color: '#000000' }
  }
  if (['uasset', 'umap', 'upk'].includes(ext)) {
    return { icon: Puzzle, label: 'Unreal', color: '#313131' }
  }
  if (['pak', 'vpk', 'wad', 'bsp', 'pk3'].includes(ext)) {
    return { icon: Archive, label: 'Game Asset', color: '#7c3aed' }
  }

  // 區塊鏈與加密貨幣
  if (['sol'].includes(ext)) {
    return { icon: FileCode, label: 'Solidity', color: '#363636' }
  }
  if (['wallet', 'keystore'].includes(ext)) {
    return { icon: Lock, label: 'Wallet', color: '#f59e0b' }
  }

  return { icon: File, label: 'File', color: '#9ca3af' }
}
