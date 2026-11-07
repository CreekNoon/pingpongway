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

  return {
    /** 对 video 当前画面推理，timestampMs 必须单调递增 */
    detect(video, timestampMs) {
      return landmarker.detectForVideo(video, timestampMs);
    },
    close() { landmarker.close(); },
  };
}
