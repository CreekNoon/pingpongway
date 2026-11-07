// 坐标归一化：以髋部中点为原点、躯干长度为单位 1（纯函数，可移植服务器）
// 消除拍摄距离远近、身高差异的影响，使不同视频的数据可对比

const LEFT_SHOULDER = 11, RIGHT_SHOULDER = 12;
const LEFT_HIP = 23, RIGHT_HIP = 24;

/**
 * @param {Array<{t, keypoints}>} frames 平滑后的关键点序列
 * @returns {Array<{t, keypoints}>} 归一化后的序列（骨架尺寸约为 1）
 */
export function normalizeFrames(frames) {
  return frames.map((f) => {
    if (!f.keypoints) return f;
    const kp = f.keypoints;

    const hipX = (kp[LEFT_HIP].x + kp[RIGHT_HIP].x) / 2;
    const hipY = (kp[LEFT_HIP].y + kp[RIGHT_HIP].y) / 2;
    const shoulderX = (kp[LEFT_SHOULDER].x + kp[RIGHT_SHOULDER].x) / 2;
    const shoulderY = (kp[LEFT_SHOULDER].y + kp[RIGHT_SHOULDER].y) / 2;
    const torso = Math.hypot(shoulderX - hipX, shoulderY - hipY) || 1;

    return {
      t: f.t,
      keypoints: kp.map((p) => ({
        x: (p.x - hipX) / torso,
        y: (p.y - hipY) / torso,
        z: p.z / torso,
        v: p.v,
      })),
    };
  });
}
