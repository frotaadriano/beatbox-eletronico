# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


Segue um README.md atualizado para o seu projeto **Beatbox Eletrônico — Site Tocável**, já considerando o Tailwind 4 e o que você acabou de corrigir:

---

````markdown
# Beatbox Eletrônico — Site Tocável

Sequenciador eletrônico de 16 passos com teclado, arpejador, importação/exportação de templates em JSON, mute/solo por trilha, swing e controle de BPM.

## 🎹 Funcionalidades

- Sequenciador de 16 passos com múltiplos instrumentos
- Teclado virtual com arpegiador
- Mute/Solo e controle de volume por trilha
- Importar e exportar configurações como JSON
- Presets salvos no navegador
- Controle de BPM e swing
- Randomizador de padrões
- Suporte a múltiplos instrumentos (Kick, Snare, Hat, Clap, Shaker, Tom Low, Tom Mid, Tom High, Ride, Crash, Bass etc.)

---

## 🚀 Como rodar localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/beatbox-eletronico.git
cd beatbox-eletronico
````

### 2. Instalar dependências

```bash
npm install
```

### 3. Executar em modo desenvolvimento

```bash
npm run dev
```

O projeto estará disponível em:
[http://localhost:5173](http://localhost:5173)

---

## 📦 Build de produção

```bash
npm run build
```

Os arquivos prontos estarão na pasta `dist/`.

Para testar o build:

```bash
npm run preview
```

---

## 🛠️ Configuração Tailwind CSS v4

O projeto usa **Tailwind CSS 4** com Vite.

### Instalar dependências Tailwind

```bash
npm install tailwindcss @tailwindcss/postcss postcss autoprefixer
```

### Configuração do `postcss.config.cjs`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Configuração do `tailwind.config.cjs`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### Arquivo `src/index.css`

```css
@import "tailwindcss";
```

---

## 💾 Como importar/exportar presets

* **Exportar JSON:** clique no botão **Exportar JSON** para baixar o arquivo com o seu groove.
* **Importar JSON:** arraste e solte o arquivo no campo de importação ou clique em **Importar JSON**.

---

## 📄 Licença

Este projeto é open-source e distribuído sob a licença MIT.

```
 