# 🎶 Beat Builder — Sequenciador Eletrônico Interativo

Um **sequenciador web moderno e responsivo** para criar batidas, loops e grooves de forma intuitiva.
Desenvolvido em **React + Tailwind CSS + Web Audio API**, com recursos avançados para produção rítmica, personalização e exportação.

---

## ✨ Funcionalidades

* **Sequenciamento por Trilha**

  * Até 16 passos por trilha (Kick, Snare, Hats, Claps, Percussão, Bass, Teclas, etc.).
  * Ativação/desativação individual de cada passo.

* **🎚️ Controles por Trilha**

  * Volume dedicado.
  * Botões de **Mute** e **Solo**.
  * Slider estilizado com cores relacionadas ao instrumento.
  * **VU Meter Animado** em tempo real para cada trilha.

* **🎹 Teclado Virtual com Arpegiador**

  * Toque notas diretamente no navegador.
  * Padrões automáticos via arpegiador.

* **🎨 Personalização Visual**

  * Alternância entre **tema claro e escuro**.
  * Troca de cor de acento (ex.: turquesa, rosa).
  * UI minimalista, responsiva e otimizada para desktop e mobile.

* **🎵 Motor de Áudio Avançado**

  * Sons mapeados por instrumento.
  * Reprodução precisa com baixa latência usando `AudioContext`.

* **⏱️ Controle de BPM e Swing**

  * Ajuste global de tempo.
  * Swing para grooves mais orgânicos.

* **💾 Presets e Arquivos**

  * Salvar e carregar presets direto no navegador.
  * Importar/Exportar configurações como **JSON**.
  * Randomizador de padrões.

---

## 🚀 Como Usar

1. Escolha o **tema** (claro/escuro) e cor de acento.
2. Adicione ou remova passos nas trilhas para criar seu padrão rítmico.
3. Ajuste volumes, mute ou solo de instrumentos.
4. Use o teclado virtual e o arpegiador para criar melodias e variações.
5. Salve ou exporte o seu groove em JSON.
6. Pressione **Play** e curta sua batida!

---

## 🛠️ Rodando Localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/beatbox-eletronico.git
cd beatbox-eletronico
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Rodar em modo desenvolvimento

```bash
npm run dev
```

Acesse em: [http://localhost:5173](http://localhost:5173)

---

## 📦 Build de Produção

```bash
npm run build
```

Os arquivos finais estarão na pasta `dist/`.

Para testar o build:

```bash
npm run preview
```

---

## ⚙️ Configuração Tailwind CSS v4

Instalação:

```bash
npm install tailwindcss @tailwindcss/postcss postcss autoprefixer
```

Arquivo `postcss.config.cjs`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Arquivo `tailwind.config.cjs`:

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

Arquivo `src/index.css`:

```css
@import "tailwindcss";
```

---

## 💡 Melhorias Futuras (Brainstorm)

* **Efeitos de Áudio em Tempo Real**: Reverb, delay, equalizador por trilha.
* **Exportar Áudio**: Renderizar em WAV/MP3.
* **Automação de Parâmetros**: Volume, panorâmica e efeitos ao longo do tempo.
* **Humanização Avançada**: Variações sutis de tempo e intensidade.
* **MIDI e Microfone**: Entrada via controlador MIDI ou captura ao vivo.
* **Grade Expandida**: Mais compassos e modos de visualização.
* **Biblioteca de Samples Customizada**: Upload de áudios pelo usuário.
* **Compartilhamento Online**: Criar e enviar links do seu beat.
* **Assistente com IA**: Sugere padrões com base em estilos musicais.

---

## 📄 Licença

Este projeto é open-source sob a licença **MIT**. 