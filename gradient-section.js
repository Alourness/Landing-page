const canvas = document.querySelector('#gradient-canvas');

if (canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (gl) {
    const vertexSource = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}';
    const fragmentSource = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float t = time * 0.055;

        vec3 black = vec3(0.018, 0.018, 0.032);
        vec3 deepGold = vec3(0.50, 0.34, 0.075);
        vec3 gold = vec3(0.86, 0.61, 0.13);

        float waveLeft = sin(uv.x * 4.2 + uv.y * 1.8 - t * 1.1) * 0.055;
        float waveRight = sin(uv.x * 3.1 - uv.y * 2.4 + t * 0.8) * 0.045;
        float boundary = 0.54 + waveLeft + waveRight;
        float goldMix = smoothstep(boundary - 0.48, boundary + 0.35, 1.0 - uv.y);

        vec3 color = mix(black, deepGold, goldMix);
        color = mix(color, gold, smoothstep(0.72, 0.05, uv.y) * 0.38);

        float lineOne = abs(uv.x - (0.20 + sin(t * 0.72) * 0.12 + uv.y * 0.34));
        float beamOne = smoothstep(0.018, 0.0, lineOne);
        beamOne *= smoothstep(0.12, 0.38, uv.y) * smoothstep(0.82, 0.48, uv.y);

        float lineTwo = abs(uv.x - (0.78 + cos(t * 0.58) * 0.10 - uv.y * 0.28));
        float beamTwo = smoothstep(0.015, 0.0, lineTwo);
        beamTwo *= smoothstep(0.18, 0.44, uv.y) * smoothstep(0.92, 0.52, uv.y);

        float beamFade = 0.50 + sin(t * 0.9) * 0.22;
        color = mix(color, gold, (beamOne + beamTwo) * beamFade * 0.30);

        float darkWave = sin(uv.x * 5.0 - uv.y * 3.0 + t) * 0.5 + 0.5;
        color *= 1.0 - darkWave * smoothstep(0.82, 0.28, uv.y) * 0.10;

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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
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
