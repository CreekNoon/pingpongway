// 视频可分析性评估：这条视频值不值得分析（纯函数，可移植服务器）
// 是将来「提示用户重拍」闸门的雏形

// 动作分析最关心的 12 个关节：双肩、双肘、双腕、双髋、双膝、双踝
const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * @param {Array<{t, keypoints}>} frames
 * @param {number} minVisibility 高质量帧的置信度门槛
 */
export function assessQuality(frames, minVisibility) {
  const total = frames.length;
  let detected = 0;
  let good = 0;
  let visSum = 0;

  for (const f of frames) {
    if (!f.keypoints) continue;
    detected++;
    const mean = KEY_JOINTS.reduce((sum, i) => sum + (f.keypoints[i].v ?? 0), 0) / KEY_JOINTS.length;
    visSum += mean;
    if (mean >= minVisibility) good++;
  }

  const detectRate = total > 0 ? detected / total : 0;   // 姿态检出率
  const goodRate = detected > 0 ? good / detected : 0;   // 高质量帧占比
  const meanVis = detected > 0 ? visSum / detected : 0;  // 平均置信度

  // 加权总分：检出率最重要，其次是高质量占比
  const score = Math.round(100 * (0.4 * detectRate + 0.4 * goodRate + 0.2 * meanVis));

  let verdict;
  if (score >= 80) verdict = '视频质量很好，可以分析。';
  else if (score >= 60) verdict = '质量一般：部分结果置信度偏低，建议参考时留意。';
  else verdict = '质量较差，建议重拍：手机固定、侧面 45°、全身入镜、光线充足。';

  return { total, detected, detectRate, goodRate, meanVis, score, verdict };
}
