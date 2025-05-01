const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const NodeCache = require('node-cache');
const sharp = require('sharp');

// Cache de imagens por 1 hora
const imageCache = new NodeCache({ stdTTL: 3600 });

// Registra a fonte Montserrat
registerFont(path.join(__dirname, 'static', 'Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.static('static'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Função para baixar imagem
async function downloadImage(url) {
  const cacheKey = `img_${url}`;
  const cachedImage = imageCache.get(cacheKey);
  
  if (cachedImage) {
    return cachedImage;
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 50 * 1024 * 1024,
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Verifica se o conteúdo é realmente uma imagem
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL não retornou uma imagem válida');
    }

    imageCache.set(cacheKey, response.data);
    return response.data;

  } catch (error) {
    console.error('Erro ao baixar imagem:', error.message);
    throw new Error(`Erro ao baixar imagem: ${error.message}`);
  }
}

// Endpoint para gerar imagem
app.post('/generate', upload.single('background'), async (req, res) => {
  let tempFile = null;
  let backgroundPath = req.file && req.file.path;
  
  try {
    const { category, title, background_url } = req.body;
    const logoPath = path.join(__dirname, 'static', 'logo.png');

    // Se não houver arquivo, mas houver URL, baixa a imagem
    if (!backgroundPath && background_url) {
      try {
        const imageBuffer = await downloadImage(background_url);
        tempFile = path.join(__dirname, 'uploads', `${uuidv4()}.png`);
        fs.writeFileSync(tempFile, imageBuffer);
        backgroundPath = tempFile;
      } catch (error) {
        console.error('Erro ao baixar imagem:', error);
        return res.status(400).json({ error: 'Erro ao processar imagem de fundo' });
      }
    }

    const width = 1080;
    const height = 1350;

    // Cria canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Carrega a imagem de fundo
    const bgImg = await loadImage(backgroundPath);
    
    // Calcula as dimensões para manter a proporção
    const imgRatio = bgImg.width / bgImg.height;
    const canvasRatio = width / height;
    
    let drawWidth, drawHeight, x, y;
    
    if (imgRatio > canvasRatio) {
      // Imagem mais larga que o canvas
      drawHeight = height;
      drawWidth = height * imgRatio;
      x = (width - drawWidth) / 2;
      y = 0;
    } else {
      // Imagem mais alta que o canvas
      drawWidth = width;
      drawHeight = width / imgRatio;
      x = 0;
      y = (height - drawHeight) / 2;
    }
    
    // Desenha a imagem de fundo
    ctx.drawImage(bgImg, x, y, drawWidth, drawHeight);

    // Gradiente preto de baixo para cima
    const gradient = ctx.createLinearGradient(0, height, 0, height * 0.45);
    gradient.addColorStop(0, 'rgba(0,0,0,100)');
    gradient.addColorStop(0.2, 'rgba(0,0,0,90)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);

    // Carrega e desenha a logo
    if (fs.existsSync(logoPath)) {
      const logoImg = await loadImage(logoPath);
      const logoW = 220;
      const logoH = 220 * (logoImg.height / logoImg.width);
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.drawImage(logoImg, 56, 56, logoW, logoH);
      ctx.restore();
    }

    // Área da categoria e título
    const padding = 56;
    const boxHeight = 260;
    const verticalOffset = 80;
    const boxTop = height - boxHeight - verticalOffset;
  
    // Categoria
    ctx.font = 'bold 36px Montserrat';
    const catWidth = ctx.measureText(category).width + 60;
    ctx.save();
    ctx.fillStyle = '#1677ff';
    ctx.globalAlpha = 0.95;
    const catX = padding + 8;
    const catY = boxTop + 24;
    const catH = 54;
    const catR = 12;
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

    // Título
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxWidth = width - 2 * padding;
    const maxBoxHeight = boxHeight - 100;
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
      if (lines.length * (fontSize + 2) <= maxBoxHeight) {
        fits = true;
      } else {
        fontSize -= 2;
      }
    }
    let titleStartY = boxTop + 80;
    lines.forEach((l, idx) => {
      ctx.fillText(l, padding + 8, titleStartY + idx * (fontSize + 2), maxWidth);
    });
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // Verifica se é uma requisição da API (N8N) ou do navegador
    const isApiRequest = req.headers['accept']?.includes('application/json') || 
                        req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isApiRequest) {
      // Retorna base64 para API/N8N
      const buffer = canvas.toBuffer('image/png');
      const base64Image = buffer.toString('base64');
      
      // Salva a imagem gerada
      const fileName = `${uuidv4()}.png`;
      const finalPath = path.join(__dirname, 'uploads', fileName);
      fs.writeFileSync(finalPath, buffer);
      
      res.json({
        success: true,
        image: `data:image/png;base64,${base64Image}`,
        format: 'base64',
        url: `/uploads/${fileName}`
      });
    } else {
      // Retorna imagem direta para navegador
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline');
      canvas.pngStream().pipe(res);
    }

    // Remove arquivos temporários
    if (req.file && fs.existsSync(backgroundPath)) {
      fs.unlinkSync(backgroundPath);
    }
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

  } catch (e) {
    // Limpa arquivos temporários em caso de erro
    if (req.file && fs.existsSync(backgroundPath)) {
      fs.unlinkSync(backgroundPath);
    }
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    console.error('Erro na geração:', e);
    res.status(500).json({ 
      success: false,
      error: e.message 
    });
  }
});

// Endpoint para salvar imagem gerada
app.post('/save-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const finalPath = path.join(__dirname, 'uploads', fileName);

    // Move o arquivo para o diretório final
    fs.renameSync(req.file.path, finalPath);

    // Retorna a URL da imagem salva
    const imageUrl = `/uploads/${fileName}`;
    
    res.json({
      success: true,
      url: imageUrl,
      path: finalPath
    });
  } catch (error) {
    console.error('Erro ao salvar imagem:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
