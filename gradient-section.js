(function () {
  const gradientCanvas = document.querySelector('#gradient-canvas');
  if (!gradientCanvas) return;

  const gl =
    gradientCanvas.getContext('webgl', { alpha: false, antialias: false }) ||
    gradientCanvas.getContext('experimental-webgl', { alpha: false, antialias: false });

  if (!gl) return;

  const LOOP_DURATION = 24.0; // бесшовный цикл, секунды
  const TWO_PI = Math.PI * 2;

  const vertexSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    uniform vec2 resolution;
    uniform float phase;

    // ---------- НАСТРОЙКИ ----------
    // Верхняя граница золотой массы: две опорные точки в долях экрана (uv, y вверх)
    const vec2  EDGE_A       = vec2(0.218, 0.165); // где масса начинается внизу слева
    const vec2  EDGE_B       = vec2(0.900, 0.774); // где граница доходит справа вверху
    const float FADE_START   = -0.12;  // мягкость самой границы
    const float FADE_END     = 0.80;   // на каком расстоянии масса достигает полной яркости
    // Диагональные полосы (угол от вертикали, в пикселях; ~40 градусов как на референсе)
    const float STRIPE_ANGLE = 40.0;
    const float PERIOD_A     = 0.56;   // период основных полос (в высотах экрана)
    const float PERIOD_B     = 0.31;   // период тонкой добавки
    const float DEPTH_DIM    = 0.58;   // глубина тёмных провалов на краю массы
    const float DEPTH_BRIGHT = 0.28;   // глубина провалов там, где золото самое яркое
    // --------------------------------

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float triangleMask(vec2 p, vec2 a, vec2 b, vec2 c) {
      vec2 pa = p - a;
      vec2 v1 = b - a;
      vec2 v2 = c - a;
      float area = v1.x * v2.y - v1.y * v2.x;
      float wa = (pa.x * v2.y - v2.x * pa.y) / area;
      float wb = (v1.x * pa.y - pa.x * v1.y) / area;
      float wc = 1.0 - wa - wb;
      float inside = step(0.0, wa) * step(0.0, wb) * step(0.0, wc);
      float edge = min(min(wa, wb), wc);
      return inside * smoothstep(-0.01, 0.10, edge);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      float aspect = resolution.x / max(resolution.y, 1.0);

      // Изотропные координаты (единица = высота экрана)
      vec2 p = vec2(uv.x * aspect, uv.y);

      // Только sin/cos от phase => цикл бесшовный
      float s1 = sin(phase);
      float c1 = cos(phase);

      // 1) ЗОЛОТАЯ МАССА: широкий мягкий градиент от диагональной границы
      //    к правому нижнему углу
      vec2 a = EDGE_A + vec2(0.012 * s1, 0.010 * c1);
      vec2 edgeDir = normalize(vec2((EDGE_B.x - a.x) * aspect, EDGE_B.y - a.y));
      vec2 nrm = vec2(edgeDir.y, -edgeDir.x);               // нормаль в сторону золота
      vec2 d = vec2((uv.x - a.x) * aspect, uv.y - a.y);
      float cornerDist = (1.0 - a.x) * aspect * nrm.x - a.y * nrm.y;
      float t = dot(d, nrm) / cornerDist;
      float mass = smoothstep(FADE_START, FADE_END, t);
      mass = pow(mass, 0.9);

      // 2) ДИАГОНАЛЬНЫЕ ПОЛОСЫ "\" — мягкая модуляция яркости массы
      //    (cos с интегральным множителем при phase: полосы плавно ползут и цикл замкнут)
      float ang = radians(STRIPE_ANGLE);
      float sCoord = dot(p, vec2(sin(ang), cos(ang)));
      float waveA = cos(6.2831853 * sCoord / PERIOD_A - phase);
      float waveB = cos(6.2831853 * sCoord / PERIOD_B + phase);
      float stripe = 0.78 * smoothstep(-1.0, 1.0, waveA) + 0.22 * smoothstep(-1.0, 1.0, waveB);

      float depth = mix(DEPTH_DIM, DEPTH_BRIGHT, smoothstep(0.45, 1.0, mass));
      float density = mass * ((1.0 - depth) + depth * stripe);

      // 3) Лёгкий отблеск у нижнего края слева
      float leftGlow = exp(-pow((uv.x - 0.12) / 0.14, 2.0)) * pow(1.0 - uv.y, 10.0) * 0.20;
      density = clamp(density + leftGlow, 0.0, 1.0);

      // 4) Палитра: тёмный фон -> бронза -> олива -> золото
      vec3 darkVoid = vec3(0.067, 0.067, 0.071);
      vec3 bronze   = vec3(0.23, 0.185, 0.08);
      vec3 olive    = vec3(0.50, 0.39, 0.14);
      vec3 gold     = vec3(0.90, 0.72, 0.25);

      vec3 col = mix(darkVoid, bronze, smoothstep(0.03, 0.30, density));
      col = mix(col, olive, smoothstep(0.22, 0.60, density));
      col = mix(col, gold,  smoothstep(0.52, 1.00, density));

      // Дизеринг против бандинга
      col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const resolutionLoc = gl.getUniformLocation(program, 'resolution');
  const phaseLoc = gl.getUniformLocation(program, 'phase');

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let startTime = performance.now();
  let rafId = 0;
  let running = false;
  let inView = true;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5); // плавный градиент не требует высокого dpr
    const width = Math.max(1, Math.floor((gradientCanvas.clientWidth || window.innerWidth) * ratio));
    const height = Math.max(1, Math.floor((gradientCanvas.clientHeight || 680) * ratio));
    if (gradientCanvas.width !== width || gradientCanvas.height !== height) {
      gradientCanvas.width = width;
      gradientCanvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolutionLoc, width, height);
  }

  function draw(now) {
    const elapsedSec = Math.max(0, (now - startTime) * 0.001);
    const phase = ((elapsedSec % LOOP_DURATION) / LOOP_DURATION) * TWO_PI;
    gl.uniform1f(phaseLoc, phase);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function frame(now) {
    if (!running) return;
    draw(typeof now === 'number' ? now : performance.now());
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    if (!running) draw(performance.now());
  });

  if (reduceMotion) {
    // Без анимации — один статичный кадр
    startTime = performance.now() - LOOP_DURATION * 1000 * 0.1;
    draw(performance.now());
    return;
  }

  // Не жжём GPU, когда секция вне экрана или вкладка скрыта
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      inView && !document.hidden ? start() : stop();
    }).observe(gradientCanvas);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    document.hidden || !inView ? stop() : start();
  });
})();
