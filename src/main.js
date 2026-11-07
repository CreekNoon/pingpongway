// 入口：模块初始化与事件接线
import { CONFIG, SKELETON_CONNECTIONS } from './config.js';
import { createDetector } from './pose/detector.js';
import { extractKeypoints } from './pose/extractor.js';
import { smoothFrames } from './analysis/smooth.js';
import { normalizeFrames } from './analysis/normalize.js';
import { assessQuality } from './analysis/quality.js';
import { setupPicker } from './ui/picker.js';
import { createOverlay } from './ui/overlay.js';
import { createPlayer } from './ui/player.js';

const $ = (id) => document.getElementById(id);
const els = {
  input: $('video-input'),
  meta: $('video-meta'),
  playerSection: $('player-section'),
  video: $('video'),
  canvas: $('overlay'),
  btnPlay: $('btn-play'),
  btnPrev: $('btn-prev'),
  btnNext: $('btn-next'),
  seek: $('seek'),
  frameLabel: $('frame-label'),
  statusSection: $('status-section'),
  btnAnalyze: $('btn-analyze'),
  fpsSelect: $('fps-select'),
  progress: $('progress'),
  progressText: $('progress-text'),
  qualityReport: $('quality-report'),
  exportSection: $('export-section'),
  btnExport: $('btn-export'),
};

const state = {
  fileName: '',
  fps: 30,
  frames: null,      // 平滑后的关键点（0~1 图像坐标，用于显示）
  framesNorm: null,  // 躯干归一化坐标（用于将来的规则分析）
  quality: null,
};

let detector = null; // 懒加载，首次分析时初始化
let overlay = null;
let player = null;

// ── 选择视频 ──────────────────────────────────────────────
setupPicker(els.input, els.video, {
  onLoad(meta) {
    state.fileName = meta.name;
    state.frames = null;
    state.framesNorm = null;

    els.meta.textContent =
      `${meta.name} · ${meta.width}×${meta.height} · ${meta.duration.toFixed(1)}s` +
      (meta.duration > 60 ? '（较长，分析会慢，建议剪辑到 30 秒内）' : '');
    els.playerSection.hidden = false;
    els.statusSection.hidden = false;
    els.exportSection.hidden = true;
    els.qualityReport.innerHTML = '';
    els.progress.value = 0;
    els.progressText.textContent = '';

    if (!overlay) overlay = createOverlay(els.canvas, els.video, SKELETON_CONNECTIONS);
    overlay.resize();
    overlay.clear();

    if (!player) {
      player = createPlayer(els, {
        getFPS: () => state.fps,
        getFrameCount: () => (state.frames ? state.frames.length : 0),
        onFrameChange: showFrame,
      });
    }
    player.setFrameCount(0);
  },
});

// ── 开始分析 ──────────────────────────────────────────────
els.btnAnalyze.addEventListener('click', async () => {
  try {
    els.btnAnalyze.disabled = true;
    els.video.pause();
    els.btnPlay.textContent = '播放';

    setProgress(0, '正在加载模型（首次约需几秒）…');
    detector = detector || (await createDetector(CONFIG));

    state.fps = Number(els.fpsSelect.value);
    const raw = await extractKeypoints(els.video, detector, {
      fps: state.fps,
      onProgress: (done, total) => setProgress(done / total, `分析中 ${done}/${total} 帧`),
    });

    state.frames = smoothFrames(raw, CONFIG.smooth);
    state.framesNorm = normalizeFrames(state.frames);
    state.quality = assessQuality(state.frames, CONFIG.minVisibility);

    renderQuality(state.quality);
    setProgress(1, '完成');
    els.video.currentTime = 0;
    player.setFrameCount(state.frames.length);
    showFrame(0);
    els.exportSection.hidden = false;
  } catch (err) {
    console.error(err);
    setProgress(0, '分析失败：' + err.message);
  } finally {
    els.btnAnalyze.disabled = false;
  }
});

// ── 导出 JSON ─────────────────────────────────────────────
els.btnExport.addEventListener('click', () => {
  const data = {
    version: 1,
    source: state.fileName,
    fps: state.fps,
    width: els.video.videoWidth,
    height: els.video.videoHeight,
    duration: els.video.duration,
    quality: state.quality,
    frames: state.frames.map((f, i) => ({
      t: round(f.t),
      keypoints: f.keypoints ? f.keypoints.map(roundKp) : null,
      keypointsNorm: state.framesNorm[i]?.keypoints
        ? state.framesNorm[i].keypoints.map(roundKp)
        : null,
    })),
  };

  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.fileName.replace(/\.[^.]+$/, '') + '_keypoints.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── 工具 ──────────────────────────────────────────────────
function showFrame(i) {
  if (!state.frames || !state.frames.length) return;
  const f = state.frames[i];
  overlay.draw(f?.keypoints ?? null, CONFIG.minVisibility);
  els.seek.value = String(i);
  els.frameLabel.textContent = `第 ${i + 1}/${state.frames.length} 帧 · ${(f?.t ?? 0).toFixed(2)}s`;
}

function setProgress(value, text) {
  els.progress.value = value;
  els.progressText.textContent = text;
}

function renderQuality(q) {
  els.qualityReport.innerHTML = `
    <div>可分析性评分：<b>${q.score}</b> / 100</div>
    <ul>
      <li>姿态检出率：${(q.detectRate * 100).toFixed(0)}%（${q.detected}/${q.total} 帧）</li>
      <li>关键关节平均置信度：${q.meanVis.toFixed(2)}</li>
      <li>高质量帧占比：${(q.goodRate * 100).toFixed(0)}%（置信度 ≥ ${CONFIG.minVisibility}）</li>
    </ul>
    <p class="verdict">${q.verdict}</p>`;
}

const round = (n) => Math.round(n * 1000) / 1000;
const roundKp = (p) => ({ x: round(p.x), y: round(p.y), z: round(p.z), v: round(p.v) });
