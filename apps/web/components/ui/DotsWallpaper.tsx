"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = a_pos*0.5+0.5;
  gl_Position = vec4(a_pos,0.0,1.0);
}`;

const COMMON = `
precision highp float;
varying vec2 v_uv;
uniform vec2  u_res;
uniform vec2  u_mouse;
uniform float u_inside;
uniform float u_click;
uniform vec2  u_clickPos;
uniform float u_dark;
uniform float u_density;
uniform float u_reach;

const vec3 C_RED   = vec3(0.812, 0.149, 0.216);
const vec3 C_AMBER = vec3(1.000, 0.694, 0.000);

vec3 moodCol(vec2 uv) { return C_RED; }
float rk(float k) { return k / max(u_reach * u_reach, 0.04); }
vec3 bgCol()     { return mix(vec3(0.957), vec3(0.051), u_dark); }
vec3 borderCol() { return mix(vec3(0.894), vec3(0.165), u_dark); }
vec3 mutedCol()  { return mix(vec3(0.443), vec3(0.451), u_dark); }
`;

const FRAG_DOTS = COMMON + `
void main(){
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);

  float scale = 28.0 * u_density;
  vec2 cell = fract(uv * vec2(aspect, 1.0) * scale) - 0.5;
  vec2 cellId = floor(uv * vec2(aspect, 1.0) * scale);
  vec2 cellCenter = (cellId + 0.5) / scale;
  vec2 cc = (cellCenter - 0.5 * vec2(aspect, 1.0));
  float rm = length(cc - m);
  float hover = exp(-rm * rm * rk(16.0)) * u_inside;

  float radius = 0.10 + hover * 0.18;
  float dot = 1.0 - smoothstep(radius - 0.04, radius, length(cell));

  vec2 cp = (u_clickPos - 0.5) * vec2(aspect, 1.0);
  float cd = length(cc - cp);
  float ringPos = (1.0 - u_click) * 0.6;
  float ring = smoothstep(0.04, 0.0, abs(cd - ringPos)) * u_click;

  vec3 baseDot = mix(borderCol(), mutedCol(), 0.4);
  vec3 dotCol  = mix(baseDot, moodCol(uv), smoothstep(0.0, 0.7, hover));
  dotCol = mix(dotCol, C_AMBER, ring * 0.8);

  // Subtle resting state, gentle hover/click.
  // 0.18 base attenuation makes dots feel like glamour, not noise.
  // Hover/click peaks at ~0.55 so interactivity is felt without dominating the page.
  float subtlety = 0.18 + 0.37 * max(hover, ring);
  vec3 col = bgCol();
  col = mix(col, dotCol, dot * subtlety);
  gl_FragColor = vec4(col, 1.0);
}`;

export function DotsWallpaper() {
  const { theme } = useTheme();
  const darkRef = useRef(theme === "dark" ? 1.0 : 0.0);
  const dirtyRef = useRef(true);

  useEffect(() => {
    darkRef.current = theme === "dark" ? 1.0 : 0.0;
    dirtyRef.current = true;
  }, [theme]);

  useEffect(() => {
    const canvas = document.getElementById("dots-wallpaper") as HTMLCanvasElement | null;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    function makeShader(type: number, src: string) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      return sh;
    }

    const ext = gl.getExtension("OES_standard_derivatives");
    const fragSrc =
      (ext ? "#extension GL_OES_standard_derivatives : enable\n" : "") + FRAG_DOTS;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);

    const u = {
      res:      gl.getUniformLocation(prog, "u_res"),
      mouse:    gl.getUniformLocation(prog, "u_mouse"),
      inside:   gl.getUniformLocation(prog, "u_inside"),
      click:    gl.getUniformLocation(prog, "u_click"),
      clickPos: gl.getUniformLocation(prog, "u_clickPos"),
      dark:     gl.getUniformLocation(prog, "u_dark"),
      density:  gl.getUniformLocation(prog, "u_density"),
      reach:    gl.getUniformLocation(prog, "u_reach"),
    };
    const aPos = gl.getAttribLocation(prog, "a_pos");

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const s = {
      mouse:    [0.5, 0.5] as [number, number],
      smouse:   [0.5, 0.5] as [number, number],
      inside:   0,
      insideTarget: 0,
      click:    0,
      clickPos: [0.5, 0.5] as [number, number],
      lastFrame: performance.now(),
      dirty:    true,
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width  = Math.floor(window.innerWidth  * dpr);
      canvas!.height = Math.floor(window.innerHeight * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      s.dirty = true;
    }
    function onMove(e: MouseEvent) {
      s.mouse[0] = e.clientX / window.innerWidth;
      s.mouse[1] = 1.0 - e.clientY / window.innerHeight;
      s.insideTarget = 1;
      s.dirty = true;
    }
    function onLeave()  { s.insideTarget = 0; s.dirty = true; }
    function onEnter()  { s.insideTarget = 1; s.dirty = true; }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      s.mouse[0] = t.clientX / window.innerWidth;
      s.mouse[1] = 1.0 - t.clientY / window.innerHeight;
      s.insideTarget = 1;
      s.dirty = true;
    }
    function onDown(e: MouseEvent) {
      s.clickPos[0] = e.clientX / window.innerWidth;
      s.clickPos[1] = 1.0 - e.clientY / window.innerHeight;
      s.click = 1.0;
      s.dirty = true;
    }

    window.addEventListener("resize",    resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);
    window.addEventListener("touchmove",  onTouch, { passive: true });
    window.addEventListener("mousedown",  onDown);
    resize();

    let raf: number;
    function frame(now: number) {
      const dt = Math.min(0.05, (now - s.lastFrame) / 1000);
      s.lastFrame = now;

      // Smooth pointer
      const ks = 1 - Math.pow(0.0001, dt);
      const dx = s.mouse[0] - s.smouse[0];
      const dy = s.mouse[1] - s.smouse[1];
      s.smouse[0] += dx * ks;
      s.smouse[1] += dy * ks;
      if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) s.dirty = true;

      // Inside fade
      const ki = 1 - Math.pow(0.001, dt);
      const di = s.insideTarget - s.inside;
      s.inside += di * ki;
      if (Math.abs(di) > 1e-3) s.dirty = true;

      // Click decay
      if (s.click > 0) {
        s.click *= Math.pow(0.12, dt);
        if (s.click < 0.001) s.click = 0;
        s.dirty = true;
      }

      // Theme change signal
      if (dirtyRef.current) {
        s.dirty = true;
        dirtyRef.current = false;
      }

      if (s.dirty) {
        gl!.useProgram(prog);
        gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
        gl!.enableVertexAttribArray(aPos);
        gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);

        gl!.uniform2f(u.res,      canvas!.width, canvas!.height);
        gl!.uniform2f(u.mouse,    s.smouse[0], s.smouse[1]);
        gl!.uniform1f(u.inside,   s.inside);
        gl!.uniform1f(u.click,    s.click);
        gl!.uniform2f(u.clickPos, s.clickPos[0], s.clickPos[1]);
        gl!.uniform1f(u.dark,     darkRef.current);
        gl!.uniform1f(u.density,  2.0);
        gl!.uniform1f(u.reach,    0.85);

        gl!.drawArrays(gl!.TRIANGLES, 0, 6);
        s.dirty = false;
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize",     resize);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("touchmove",  onTouch);
      window.removeEventListener("mousedown",  onDown);
    };
  }, []);

  return (
    <canvas
      id="dots-wallpaper"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
