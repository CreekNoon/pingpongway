// 逐帧循环：定位视频帧 → 推理 → 收集关键点序列（不碰 DOM）

/**
 * @param {HTMLVideoElement} video 已加载元数据的视频
 * @param {{detect: Function}} detector 姿态检测器
 * @param {{fps?: number, onProgress?: Function}} opts
 * @returns {Promise<Array<{t: number, keypoints: Array<{x,y,z,v}>|null}>>}
 */
export async function extractKeypoints(video, detector, { fps = 30, onProgress } = {}) {
  const duration = video.duration;
  const total = Math.max(1, Math.floor(duration * fps));
  const frames = [];

  for (let i = 0; i <= total; i++) {
    const t = Math.min(i / fps, duration - 0.001);
    await seekTo(video, t);
    await settleFrame(); // 等待新帧真正上屏，否则推理会拿到上一帧（骨架延迟的成因）

    const result = detector.detect(video, Math.round(t * 1000));
    const pose = result.landmarks && result.landmarks.length > 0 ? result.landmarks[0] : null;

    frames.push({
      t,
      keypoints: pose
        ? pose.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0, v: p.visibility ?? 1 }))
        : null, // 该帧未检出人体
    });

    onProgress?.(i + 1, total + 1);
  }

  return frames;
}

/**
 * seeked 事件只保证帧解码完成，不保证已合成上屏；
 * 双 rAF 等到浏览器完成一次绘制，确保 detector 读到的是目标帧
 */
function settleFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function seekTo(video, time) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = (e) => { cleanup(); reject(e); };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.currentTime = time;
  });
}
