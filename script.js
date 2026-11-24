const header = document.querySelector('.header');
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.slider-dot');
const lamps = document.querySelectorAll('.lamp');
const leftArrow = document.querySelector('.arrow-left');
const rightArrow = document.querySelector('.arrow-right');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
let currentSlide = 0;

function showSlide(index) {
  if (index < 0) index = slides.length - 1;
  if (index >= slides.length) index = 0;

  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === index));
  dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
  currentSlide = index;
}

leftArrow.addEventListener('click', () => showSlide(currentSlide - 1));
rightArrow.addEventListener('click', () => showSlide(currentSlide + 1));
dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));

setInterval(() => showSlide(currentSlide + 1), 3000);

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 20);
}

window.addEventListener('scroll', updateHeader);
header.addEventListener('mouseenter', () => header.classList.add('hovered'));
header.addEventListener('mouseleave', () => header.classList.remove('hovered'));

lamps.forEach(lamp => {
  lamp.dataset.x = '0';
  lamp.dataset.y = '0';
  lamp.dataset.targetX = '0';
  lamp.dataset.targetY = '0';

  lamp.addEventListener('pointerdown', () => {
    lamp.dataset.pressed = 'true';
    lamp.classList.add('pressed');
  });

  lamp.addEventListener('pointerup', () => {
    lamp.dataset.pressed = 'false';
    lamp.classList.remove('pressed');
  });

  lamp.addEventListener('pointercancel', () => {
    lamp.dataset.pressed = 'false';
    lamp.classList.remove('pressed');
  });
});

const hero = document.querySelector('.hero');

hero.addEventListener('pointermove', event => {
  lamps.forEach(lamp => {
    if (lamp.dataset.pressed === 'true') return;

    const rect = lamp.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - event.clientX;
    const dy = rect.top + rect.height / 2 - event.clientY;
    const distance = Math.hypot(dx, dy) || 1;
    const force = Math.max(0, 1 - distance / 260);

    lamp.dataset.targetX = String(Math.max(-100, Math.min(100, dx / distance * force * 100)));
    lamp.dataset.targetY = String(Math.max(-100, Math.min(100, dy / distance * force * 100)));
  });
});

hero.addEventListener('pointerleave', () => {
  lamps.forEach(lamp => {
    lamp.dataset.targetX = '0';
    lamp.dataset.targetY = '0';
  });
});

// Lamp animation speed: 0.09 controls smoothness; lower is slower, higher is faster.
function animateLamps() {
  lamps.forEach(lamp => {
    const x = Number(lamp.dataset.x);
    const y = Number(lamp.dataset.y);
    const targetX = lamp.dataset.pressed === 'true' ? 0 : Number(lamp.dataset.targetX);
    const targetY = lamp.dataset.pressed === 'true' ? 0 : Number(lamp.dataset.targetY);
    const nextX = x + (targetX - x) * 0.09;
    const nextY = y + (targetY - y) * 0.09;

    lamp.dataset.x = String(nextX);
    lamp.dataset.y = String(nextY);
    lamp.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
  });
  requestAnimationFrame(animateLamps);
}

requestAnimationFrame(animateLamps);

const canvas = document.querySelector('#gradient-canvas');

if (canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });

  if (gl) {
    const vertexSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

    const fragmentSource = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float t = time * 0.035;
        vec2 center = vec2(0.5 + sin(t * 0.7) * 0.025, -0.12);
        vec2 p = uv - center;
        float angle = atan(p.y, p.x);
        float radius = length(p);

        float ray1 = sin(angle * 13.0 + radius * 18.0 - t * 1.4);
        float ray2 = sin(angle * 21.0 - radius * 11.0 + t * 1.1);
        float ray3 = sin((angle + uv.x * 1.8) * 8.0 + radius * 24.0 - t * 0.8);
        float rays = (ray1 * 0.42 + ray2 * 0.32 + ray3 * 0.26);
        rays = smoothstep(-0.18, 0.72, rays);

        float lowerGold = smoothstep(0.72, 0.18, uv.y);
        float rayMask = rays * (0.28 + lowerGold * 0.72);

        vec3 deepBlack = vec3(0.018, 0.018, 0.028);
        vec3 warmBlack = vec3(0.105, 0.080, 0.035);
        vec3 gold = vec3(0.82, 0.61, 0.16);

        vec3 color = mix(deepBlack, warmBlack, smoothstep(0.08, 0.9, uv.y));
        color = mix(color, gold, rayMask * smoothstep(0.58, 0.05, uv.y));
        color += gold * pow(max(0.0, 1.0 - uv.y), 2.2) * 0.16;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');

    function render(timestamp) {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.floor(canvas.clientWidth * ratio);
      const height = Math.floor(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(time, timestamp * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }
}

updateHeader();
