// 骨架叠加绘制：把关键点画到覆盖在视频上的 Canvas

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {Array<[number, number]>} connections 骨架连线表
 */
export function createOverlay(canvas, video, connections) {
  const ctx = canvas.getContext('2d');

  /** Canvas 分辨率对齐视频原始分辨率（CSS 负责缩放显示） */
  function resize() {
    canvas.width = video.videoWidth || 0;
    canvas.height = video.videoHeight || 0;
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * @param {Array<{x,y,z,v}>|null} keypoints 归一化坐标（0~1）
   * @param {number} minVis 低于此置信度的点不画
   */
  function draw(keypoints, minVis) {
    clear();
    if (!keypoints) return;
    const w = canvas.width;
    const h = canvas.height;

    // 连线
    ctx.lineWidth = Math.max(2, w / 480);
    ctx.strokeStyle = 'rgba(15, 220, 120, 0.9)';
    for (const [a, b] of connections) {
      const pa = keypoints[a];
      const pb = keypoints[b];
      if (!pa || !pb || (pa.v ?? 1) < minVis || (pb.v ?? 1) < minVis) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }

    // 关节点
    ctx.fillStyle = '#ff5a5a';
    const r = Math.max(2.5, w / 360);
    for (const p of keypoints) {
      if ((p.v ?? 1) < minVis) continue;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { resize, draw, clear };
}
