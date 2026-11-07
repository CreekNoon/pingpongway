// 播放控制：播放/暂停、进度条、逐帧步进；播放时用 rAF 同步骨架

/**
 * @param {object} els {video, btnPlay, btnPrev, btnNext, seek}
 * @param {{getFPS: Function, getFrameCount: Function, onFrameChange: Function}} opts
 */
export function createPlayer(els, { getFPS, getFrameCount, onFrameChange }) {
  function indexNow() {
    const n = getFrameCount();
    if (!n) return 0;
    return Math.max(0, Math.min(n - 1, Math.round(els.video.currentTime * getFPS())));
  }

  function tick() {
    onFrameChange(indexNow());
    if (!els.video.paused && !els.video.ended) requestAnimationFrame(tick);
  }

  els.btnPlay.addEventListener('click', () => {
    if (els.video.paused || els.video.ended) {
      els.video.play();
      els.btnPlay.textContent = '暂停';
      requestAnimationFrame(tick);
    } else {
      els.video.pause();
      els.btnPlay.textContent = '播放';
    }
  });

  els.video.addEventListener('ended', () => {
    els.btnPlay.textContent = '播放';
  });

  // 拖动进度条：定位到对应帧
  els.seek.addEventListener('input', () => {
    const i = Number(els.seek.value);
    els.video.currentTime = i / getFPS();
    onFrameChange(i);
  });

  const step = (delta) => () => {
    if (!els.video.paused) {
      els.video.pause();
      els.btnPlay.textContent = '播放';
    }
    const n = getFrameCount();
    if (!n) return;
    const i = Math.max(0, Math.min(n - 1, indexNow() + delta));
    els.video.currentTime = i / getFPS();
    onFrameChange(i);
  };
  els.btnPrev.addEventListener('click', step(-1));
  els.btnNext.addEventListener('click', step(1));

  return {
    /** 分析完成后更新进度条范围 */
    setFrameCount(n) {
      els.seek.max = String(Math.max(0, n - 1));
      els.seek.disabled = n === 0;
    },
  };
}
