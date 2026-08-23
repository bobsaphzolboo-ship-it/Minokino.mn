const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Кино мэдээллийн жагсаалт (жинхэнэ төсөлд өгөгдлийн сангаас авна)
const movies = [
  { id: '1', title: 'Тэнгэрийн адаг', year: 2026, duration: '2ц 14мин', file: 'sample1.mp4' },
  { id: '2', title: 'Хаврын цас', year: 2025, duration: '1ц 48мин', file: 'sample2.mp4' }
];

app.use(express.static('public'));

// 1. Кино жагсаалт авах API
app.get('/api/movies', (req, res) => {
  res.json(movies.map(({ file, ...rest }) => rest)); // file замыг ил гаргахгүй
});

// 2. Нэг киноны дэлгэрэнгүй мэдээлэл
app.get('/api/movies/:id', (req, res) => {
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ error: 'Кино олдсонгүй' });
  const { file, ...rest } = movie;
  res.json(rest);
});

// 3. ЭНД ХАМГИЙН ЧУХАЛ ХЭСЭГ: видео урсгалыг "range" хүсэлтээр дамжуулах
// Ингэснээр хэрэглэгч бүтэн файлыг татахгүйгээр шууд үзэж, дундаас нь
// шилжиж (seek) чадна — Netflix, YouTube бүгд ийм зарчмаар ажилладаг.
app.get('/stream/:id', (req, res) => {
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).send('Кино олдсонгүй');

  const videoPath = path.join(__dirname, 'videos', movie.file);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Видео файл сервер дээр байхгүй байна');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    // Range хүсэлтгүй бол бүхэлд нь буцаана (ховор тохиолдол)
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(videoPath).pipe(res);
    return;
  }

  // "bytes=1000-2000" гэх мэт header-ийг задлах
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  const fileStream = fs.createReadStream(videoPath, { start, end });

  res.writeHead(206, { // 206 = Partial Content
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': 'video/mp4'
  });

  fileStream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`Сервер ажиллаж байна: http://localhost:${PORT}`);
});
