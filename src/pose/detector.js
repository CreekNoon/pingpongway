// PoseLandmarker 加载与单帧推理封装（不碰 DOM）
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export async function createDetector(config) {
  const vision = await FilesetResolver.forVisionTasks(config.wasmBase);

  const options = (delegate) => ({
    baseOptions: { modelAssetPath: config.modelPath, delegate },
    runningMode: 'VIDEO',
    numPoses: config.numPoses,
  });

  // 优先 GPU，失败回退 CPU（部分老设备 WebGL 不可用）
  let landmarker;
  try {
    landmarker = await PoseLandmarker.createFromOptions(vision, options('GPU'));
  } catch {
    landmarker = await PoseLandmarker.createFromOptions(vision, options('CPU'));
  }

  // VIDEO 模式要求时间戳严格递增且跨调用持续有效；
  // 换视频/重复分析时业务侧 t 从 0 重新开始，这里兜底强制单调
  let lastTimestamp = -1;

  return {
    /** 对 video 当前画面推理，timestampMs 会被强制修正为单调递增 */
    detect(video, timestampMs) {
      const ts = Math.max(timestampMs, lastTimestamp + 1);
      lastTimestamp = ts;
      return landmarker.detectForVideo(video, ts);
    },
    close() { landmarker.close(); },
  };
}
