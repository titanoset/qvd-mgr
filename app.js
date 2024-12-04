const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const modulesPath = path.join(__dirname, 'videos');
const { boxCreate } = require('./box');

const PORT = 3000;

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

  const videos = files.filter((file) => path.extname(file) === '.mp4');
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

  res.render('module', { moduleName, videos, pdfs, previousModule, nextModule });
});

app.listen(PORT, '0.0.0.0', () => {
  console.clear();
  boxCreate(startMsg, colors, true, textColors, true);
});
