# 🖼️ Gerador de Post Instagram - IA Feed

Gere imagens profissionais para posts de Instagram automaticamente, com background customizado, logo, gradiente, categoria e título, tudo pronto para redes sociais!

![Exemplo de Post](./exemplo.png)

---

## ✨ Funcionalidades
- Upload de imagem de fundo **ou** link de imagem
- Adaptação automática para 1080x1080 (Instagram)
- Gradiente preto para destaque do texto
- Logo personalizada
- Caixa de categoria arredondada
- Título ajusta tamanho da fonte automaticamente para nunca sair da imagem
- Interface web simples e prática
- API pronta para automações

---

## 🚀 Tecnologias
- Node.js + Express
- Canvas (edição de imagem)
- Multer (upload)
- Axios (download de imagens via URL)
- Montserrat (Google Fonts)

---

## 🛠️ Como rodar localmente

```bash
# Clone o repositório
 git clone https://github.com/seuusuario/gerador-post-iafeed.git
 cd gerador-post-iafeed

# Instale as dependências
npm install

# Rode a aplicação
npm start

# Acesse em http://localhost:3000 (ou a porta configurada)
```

---

## 🖥️ Interface Web

- Faça upload de uma imagem OU cole o link de uma imagem
- Preencha a categoria e o título
- Clique em "Gerar Imagem"
- Veja a prévia e faça download do PNG pronto para postar!

![Interface](./screenshot-interface.png)

---

## 📲 API HTTP

### Endpoint
```
POST /generate
```

### Parâmetros (`multipart/form-data`)
- `background` (arquivo de imagem) **ou** `background_url` (URL da imagem)
- `category` (texto)
- `title` (texto)

### Exemplo com cURL
```sh
curl -X POST http://localhost:3000/generate \
  -F "background=@/caminho/para/imagem.jpg" \
  -F "category=INTELIGÊNCIA ARTIFICIAL" \
  -F "title=Seu título aqui"
```

Ou usando link de imagem:
```sh
curl -X POST http://localhost:3000/generate \
  -F "background_url=https://exemplo.com/imagem.jpg" \
  -F "category=INTELIGÊNCIA ARTIFICIAL" \
  -F "title=Seu título aqui"
```

A resposta será uma imagem PNG pronta para postar.

---

## 📝 Personalização
- Substitua `static/logo.png` pela sua logo
- Edite cores, fontes e layout em `server.js` e `static/style.css`

---

## 📸 Exemplo de resultado
![Exemplo de Post](./exemplo-resultado.png)

---

## 🧑‍💻 Autor
- Feito por [Filippe Sims](https://github.com/filippesims)

---

## ⚖️ Licença
MIT
