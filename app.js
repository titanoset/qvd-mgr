const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const modulesPath = path.join(__dirname, 'videos');
const { boxCreate } = require('./box');

const PORT = 3000;
const Debug = true;

const startMsg = [
  ` ██████╗ ██╗   ██╗██████╗ 
██╔═══██╗██║   ██║██╔══██╗
██║   ██║██║   ██║██║  ██║
██║▄▄ ██║╚██╗ ██╔╝██║  ██║
╚██████╔╝ ╚████╔╝ ██████╔╝
 ╚══▀▀═╝   ╚═══╝  ╚═════╝ `,
  `\nСервис для простого просмотра видео \nи текстовых файлов в заданом каталоге.`,
  `Сервер запущен на порту ${PORT}.`,
  `Локальная ссылка: http://localhost:${PORT}`,
  "Разработчик: Querror(titanoset)",
  "                                                                      ",
];

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptCommand() {
  rl.question('\x1b[34m  />\x1b[37m ', (command) => {      switch(command.toLowerCase()) {
      case 'help':
        console.log('\x1b[0mДоступные команды:\nclear - очистить консоль\nexit - выход');          
        break;
      case 'clear':
        console.clear();
        boxCreate(startMsg, colors, true, textColors, true);
        break;      
      case 'exit':
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('\x1b[0mНеизвестная команда. Введите "help" для списка команд');
    }
    promptCommand();
  });
}

const colors = ["#000080", "#00BFFF", "#000080"];
const textColors = ["#00BFFF", "#000080"];

let cachedModules = [];

const getModules = () => {
  if (cachedModules.length === 0) {
    const moduleDirs = fs.readdirSync(modulesPath);
    cachedModules = moduleDirs;
  }
  return cachedModules;
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(modulesPath));

app.get('/', (req, res) => {
  const moduleDirs = getModules();
  const searchQuery = req.query.search?.toLowerCase() || '';

  let modules = moduleDirs.map((moduleName) => {
    const modulePath = path.join(modulesPath, moduleName);
    const files = fs.readdirSync(modulePath)
      .filter((file) => ['.mp4', '.pdf'].includes(path.extname(file)))
      .filter((file) => {
        const normalizedModuleName = moduleName.replace(/[№]/g, '').toLowerCase();
        const normalizedSearchQuery = searchQuery.replace(/[№]/g, '').toLowerCase();
        const moduleNameMatch = normalizedModuleName.includes(normalizedSearchQuery);
        const fileMatch = file.toLowerCase().includes(searchQuery);
        const moduleNumberMatch = /модуль\s*(№?\d+)/i.test(moduleName) && normalizedModuleName.includes(normalizedSearchQuery);

        return moduleNameMatch || fileMatch || moduleNumberMatch;
      });

    return files.length > 0 ? { moduleName, files } : null;
  }).filter(Boolean);

  res.render('index', { modules, searchQuery });
});

app.get('/module/:moduleName', (req, res) => {
  const moduleName = req.params.moduleName;
  const modulePath = path.join(modulesPath, moduleName);
  const files = fs.readdirSync(modulePath);

  const videos = files.filter((file) => ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.3gp'].includes(path.extname(file)));  
  const audios = files.filter((file) => ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(path.extname(file)));
  const photos = files.filter((file) => ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg', '.webp'].includes(path.extname(file)));
  const textfiles = files.filter((file) => ['.txt', '.doc', '.docx', '.rtf', '.odt', '.md'].includes(path.extname(file)));
  const pdfs = files.filter((file) => path.extname(file) === '.pdf');

  const moduleDirs = getModules();
  const sortedModules = moduleDirs.sort((a, b) => {
    const aMatch = a.match(/\d+/);
    const bMatch = b.match(/\d+/);
    return (aMatch ? parseInt(aMatch[0]) : 0) - (bMatch ? parseInt(bMatch[0]) : 0);
  });

  const moduleIndex = sortedModules.indexOf(moduleName);
  const previousModule = moduleIndex > 0 ? sortedModules[moduleIndex - 1] : null;
  const nextModule = moduleIndex < sortedModules.length - 1 ? sortedModules[moduleIndex + 1] : null;

  res.render('module', { moduleName, videos, pdfs, previousModule, nextModule, audios, photos, textfiles });

  if (Debug === true) {
    console.clear();
    boxCreate(startMsg, colors, true, textColors, true);
    console.log(`\x1b[0m[DEBUG] Система`);
    console.log(`\x1b[0m[DEBUG] Запрошен модуль: ${moduleName}`);
    console.log(`\x1b[0m[DEBUG] Количество видео: ${videos.length}`);
    console.log(`\x1b[0m[DEBUG] Количество аудио: ${audios.length}`);
    console.log(`\x1b[0m[DEBUG] Количество фото: ${photos.length}`);
    console.log(`\x1b[0m[DEBUG] Количество текстовых файлов: ${textfiles.length}`);
    console.log(`\x1b[0m[DEBUG] Количество PDF-файлов: ${pdfs.length}`);
    promptCommand();
  }
});

app.get('/modules/:moduleName/:fileName', (req, res) => {
  const moduleName = req.params.moduleName;
  const fileName = req.params.fileName;
  const filePath = path.join(modulesPath, moduleName, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Файл не найден');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return res.status(416).send('Запрашиваемый диапазон недопустим');
    }

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(filePath).pipe(res);
  }

  if (Debug === true) {
    console.log(`\x1b[0m[DEBUG] Started streaming ${fileName}`);
    promptCommand();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.clear();
  boxCreate(startMsg, colors, true, textColors, true);
  promptCommand();
});
