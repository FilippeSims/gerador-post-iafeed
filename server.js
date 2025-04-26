const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

// Registra a fonte Montserrat
registerFont(path.join(__dirname, 'static', 'Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.static('static'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Endpoint para gerar imagem
app.post('/generate', upload.single('background'), async (req, res) => {
  try {
    const { category, title, background_url } = req.body;
    let backgroundPath = req.file && req.file.path;
    const logoPath = path.join(__dirname, 'static', 'logo.png');

    // Se não houver arquivo, mas houver URL, baixa a imagem
    let tempFile = null;
    if (!backgroundPath && background_url) {
      const axios = require('axios');
      const { v4: uuidv4 } = require('uuid');
      const ext = background_url.split('.').pop().split('?')[0];
      tempFile = path.join(__dirname, 'uploads', uuidv4() + '.' + ext);
      const response = await axios.get(background_url, { responseType: 'arraybuffer' });
      require('fs').writeFileSync(tempFile, response.data);
      backgroundPath = tempFile;
    }
    const width = 1080;
    const height = 1350;

    // Cria canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Carrega e desenha o background
    const bgImg = await loadImage(backgroundPath);
    // Calcula o melhor fit
    let scale = Math.max(width / bgImg.width, height / bgImg.height);
    let x = (width - bgImg.width * scale) / 2;
    let y = (height - bgImg.height * scale) / 2;
    ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);

    // Gradiente preto de baixo para cima
    const gradient = ctx.createLinearGradient(0, height, 0, height * 0.45);
    gradient.addColorStop(0, 'rgba(0,0,0,100)');
    gradient.addColorStop(0.2, 'rgba(0,0,0,90)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);

    // Carrega e desenha a logo (maior, canto superior esquerdo)
    if (fs.existsSync(logoPath)) {
      const logoImg = await loadImage(logoPath);
      const logoW = 220;
      const logoH = 220 * (logoImg.height / logoImg.width);
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.drawImage(logoImg, 56, 56, logoW, logoH);
      ctx.restore();
    }

    // Área da categoria e título na parte de baixo
    const padding = 56;
    const boxHeight = 260;
    const verticalOffset = 80; // Quanto mais alto, menor o valor (subir tudo)
    const boxTop = height - boxHeight - verticalOffset;
  
    // Categoria (caixa azul, canto inferior esquerdo)
    ctx.font = 'bold 36px Montserrat';
    const catWidth = ctx.measureText(category).width + 60;
    // Caixa de categoria arredondada
    ctx.save();
    ctx.fillStyle = '#1677ff';
    ctx.globalAlpha = 0.95;
    const catX = padding + 8;
    const catY = boxTop + 24;
    const catH = 54;
    const catR = 12; // raio do canto
    ctx.beginPath();
    ctx.moveTo(catX + catR, catY);
    ctx.lineTo(catX + catWidth - catR, catY);
    ctx.quadraticCurveTo(catX + catWidth, catY, catX + catWidth, catY + catR);
    ctx.lineTo(catX + catWidth, catY + catH - catR);
    ctx.quadraticCurveTo(catX + catWidth, catY + catH, catX + catWidth - catR, catY + catH);
    ctx.lineTo(catX + catR, catY + catH);
    ctx.quadraticCurveTo(catX, catY + catH, catX, catY + catH - catR);
    ctx.lineTo(catX, catY + catR);
    ctx.quadraticCurveTo(catX, catY, catX + catR, catY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Montserrat';
    ctx.fillText(category, padding + 38, boxTop + 64);

    // Título (justificado à esquerda, várias linhas e fonte ajustável)
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxWidth = width - 2 * padding;
    const maxBoxHeight = boxHeight - 100; // espaço disponível para o título
    let fontSize = 54;
    let lines = [];
    let fits = false;
    while (!fits && fontSize >= 24) {
      ctx.font = `bold ${fontSize}px Montserrat`;
      lines = [];
      let words = title.split(' ');
      let line = '';
      for (let i = 0; i < words.length; i++) {
        let testLine = line + words[i] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          lines.push(line.trim());
          line = words[i] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      // Se couber no espaço, ok. Se não, diminui a fonte e tenta de novo
      if (lines.length * (fontSize + 2) <= maxBoxHeight) {
        fits = true;
      } else {
        fontSize -= 2;
      }
    }
    // Desenha as linhas do título justificado
    let titleStartY = boxTop + 80;
    lines.forEach((l, idx) => {
      ctx.fillText(l, padding + 8, titleStartY + idx * (fontSize + 2), maxWidth);
    });
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // Remove arquivo temporário
    if (req.file && fs.existsSync(backgroundPath)) fs.unlinkSync(backgroundPath);
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

    // Envia imagem
    res.setHeader('Content-Type', 'image/png');
    canvas.pngStream().pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
